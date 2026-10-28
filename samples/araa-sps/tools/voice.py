"""Synthetic voice-over (scratch track) for the sample, made with Piper text-to-speech.

    python tools/voice.py <module> <voices-dir> [lang ...]

A studio recording at videos/<module>/rec/<lang>/<clip>.wav (see the recording kit) is used
instead of the synthetic voice, trimmed of leading and trailing silence; languages with no
synthetic voice (the local languages) need a recording for every line.

Writes vo/<lang>/<clip>.mp3 for every caption and quiz line, loudness-normalised,
and fails if a clip is longer than the time the timeline gives it. Needs `pip install
piper-tts`, ffmpeg, node, and these Piper voices (from huggingface.co/rhasspy/piper-voices)
in <voices-dir>:
  fr_FR-siwis-medium (CC BY 4.0), en_GB-cori-high (public domain), pt_PT-tugão-medium (CC0).
Replace the clips with studio recordings using the same file names.
"""
import json, os, subprocess, sys, tempfile, wave
from piper import PiperVoice

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {'fr': 'fr_FR-siwis-medium', 'en': 'en_GB-cori-high', 'pt': 'pt_PT-tugão-medium'}

def load(name):
    js = "const window={};const fs=require('fs');for(const f of ['script.js','timeline.js'])eval(fs.readFileSync(process.argv[1]+'/'+f,'utf8'));process.stdout.write(JSON.stringify({s:window.SPS_SCRIPT,t:window.SPS_TIMELINE}))"
    return json.loads(subprocess.check_output(['node', '-e', js, HERE]))

def main():
    global HERE
    HERE = os.path.join(ROOT, 'videos', sys.argv[1])
    vdir, langs = sys.argv[2], sys.argv[3:] or list(VOICES)
    d = load(HERE); S, T = d['s'], d['t']
    qeach, qrev = T['quizLinear']['each'], T['quizLinear']['reveal']
    problems = []
    for lang in langs:
        voice = PiperVoice.load(os.path.join(vdir, VOICES[lang] + '.onnx')) if lang in VOICES else None
        out = os.path.join(HERE, 'vo', lang); os.makedirs(out, exist_ok=True)
        clips = []  # (name, text, seconds available)
        for seg, caps in S['captions'].items():
            for i, c in enumerate(caps):
                clips.append((f'{seg}-{i}', c[lang], min(c['b'], T['segments'][seg]['dur']) - c['a']))
        for qi, q in enumerate(S['quiz']):
            clips.append((f'quiz-{qi}-q', q['q'][lang], qrev - 0.4))
            clips.append((f'quiz-{qi}-why', q['why'][lang], qeach - qrev - 0.5))
        for name, text, room in clips:
            rec = os.path.join(HERE, 'rec', lang, name + '.wav')  # studio recording, if delivered
            if not os.path.exists(rec) and voice is None:
                problems.append(f'{lang} {name}: no recording and no synthetic voice'); continue
            with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
                if os.path.exists(rec):
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', rec, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '22050', '-ac', '1', tmp.name], check=True)
                else:
                    with wave.open(tmp.name, 'wb') as w:
                        voice.synthesize_wav(text, w)
                with wave.open(tmp.name) as w:
                    secs = w.getnframes() / w.getframerate()
                # a line that runs slightly over its slot is sped up (up to 15%, barely audible)
                tempo = max(1.0, secs / (room - 0.15))
                af = (f'atempo={tempo:.3f},' if tempo > 1 else '') + 'loudnorm=I=-16:TP=-1.5:LRA=7,aresample=44100'
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', af,
                                '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', os.path.join(out, name + '.mp3')], check=True)
            flag = '  TOO LONG' if tempo > 1.15 else f'  sped up x{tempo:.2f}' if tempo > 1 else ''
            if tempo > 1.15: problems.append(f'{lang} {name}: {secs:.2f}s for a {room:.2f}s slot')
            print(f'{lang} {name:16} {secs:5.2f}s / {room:5.2f}s{flag}')
    if problems:
        sys.exit('Clips longer than their slot:\n' + '\n'.join(problems))

main()
