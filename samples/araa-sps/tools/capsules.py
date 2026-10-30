"""Builds the radio / podcast capsules from audio/capsules.js.

    python tools/capsules.py <piper-voices-dir> [episode-id ...]

For each episode and language: a short synthesised kalimba jingle, the host and veterinarian
lines (Piper text-to-speech scratch voices, or studio recordings in
audio/<episode>/rec/<lang>/NN-<role>.wav, which also add a local language), a sting before the closing line, the credit and
an outro jingle. Writes audio/<episode>/capsule-<n>-<episode>-<lang>.mp3 (podcast, -16 LUFS,
128 kb/s) and .wav (broadcast, mono 16-bit 44.1 kHz, EBU R128 -23 LUFS; .flac, the same audio
losslessly compressed, when the WAV would pass 24 MiB), plus audio/cues.js
(durations and in/out cues for the cue sheet).

Voices (huggingface.co/rhasspy/piper-voices): fr_FR-siwis-medium (CC BY 4.0), fr_FR-mls-medium
speaker 6 (CC BY 4.0), en_GB-cori-high and en_US-john-medium (public domain), pt_PT-tugão-medium
and pt_BR-cadu-medium (CC0). Studio recordings replace them line for line.
"""
import io, json, os, subprocess, sys, tempfile, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
CAST = {
    'fr': {'host': ('fr_FR-siwis-medium', None), 'vet': ('fr_FR-mls-medium', 6)},
    'en': {'host': ('en_GB-cori-high', None), 'vet': ('en_US-john-medium', None)},
    'pt': {'host': ('pt_PT-tugão-medium', None), 'vet': ('pt_BR-cadu-medium', None)},
}

def load():
    js = "const window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(JSON.stringify(window.SPS_CAPSULES))"
    return json.loads(subprocess.check_output(['node', '-e', js, os.path.join(ROOT, 'audio', 'capsules.js')]))

# ---------- music: a kalimba motif, a sting and a soft bed ----------
def note(freq, dur, amp=1.0):
    t = np.arange(int(SR * dur)) / SR
    env = lambda tau: np.exp(-t / tau) * np.minimum(1, t / 0.004)
    tone = env(0.45) * np.sin(2 * np.pi * freq * t) + 0.35 * env(0.12) * np.sin(2 * np.pi * freq * 3.9 * t) + 0.12 * env(0.05) * np.sin(2 * np.pi * freq * 9.2 * t)
    return amp * tone

def place(buf, sig, at):
    i = int(at * SR); j = min(len(buf), i + len(sig)); buf[i:j] += sig[: j - i]

def shaker(dur, every=0.25, amp=0.05, seed=3):
    rng = np.random.default_rng(seed); out = np.zeros(int(SR * dur)); n = int(SR * 0.06)
    hit = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * 0.015))
    hit = np.convolve(hit, [1, -0.9], 'same')  # brighten
    for k in range(int(dur / every)):
        place(out, hit * (amp * (1.0 if k % 2 else 0.6)), k * every)
    return out

def pad(dur, amp=0.05):
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 1.0).clip(0)
    sig = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(130.81, 0), (196.0, 1), (261.63, 2), (329.63, .5)])
    return amp * env * sig / 4

N = {'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.0, 'C6': 1046.5, 'G4': 392.0, 'C4': 261.63}
def jingle():
    out = np.zeros(int(SR * 3.6))
    for at, n in [(0, 'E5'), (.25, 'G5'), (.5, 'A5'), (.75, 'G5'), (1.0, 'C6'), (1.5, 'A5'), (1.75, 'G5'), (2.0, 'E5')]:
        place(out, note(N[n], 1.4, .5), at)
    for n in ['C4', 'G4', 'C5']: place(out, note(N[n], 1.6, .28), 2.0)
    place(out, shaker(2.25), 0); place(out, pad(3.6, .06), 0)
    return out
def sting():
    out = np.zeros(int(SR * 1.3))
    place(out, note(N['G5'], 1.0, .45), 0); place(out, note(N['C6'], 1.1, .5), .18); place(out, note(N['C5'], 1.1, .25), .18)
    return out

# ---------- voices ----------
_voices = {}
def recorded(path):
    with tempfile.NamedTemporaryFile(suffix='.raw') as dst:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2:LRA=7', '-ar', str(SR), '-ac', '1', '-f', 'f32le', dst.name], check=True)
        return np.fromfile(dst.name, dtype=np.float32).astype(np.float64)

def speak(lang, who, text, rec=None):
    if rec and os.path.exists(rec): return recorded(rec)  # studio recording, if delivered
    if lang not in CAST: raise SystemExit(f'{lang}: missing recording {rec}')
    name, sid = CAST[lang][who]
    if name not in _voices: _voices[name] = PiperVoice.load(os.path.join(VDIR, name + '.onnx'))
    b = io.BytesIO()
    with wave.open(b, 'wb') as w:
        _voices[name].synthesize_wav(text, w, syn_config=SynthesisConfig(speaker_id=sid) if sid is not None else None)
    b.seek(0)
    with tempfile.NamedTemporaryFile(suffix='.wav') as src, tempfile.NamedTemporaryFile(suffix='.raw') as dst:
        src.write(b.read()); src.flush()
        # resample to 44.1 kHz and level each line, so voices of different models match
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src.name, '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', str(SR), '-ac', '1', '-f', 'f32le', dst.name], check=True)
        return np.fromfile(dst.name, dtype=np.float32).astype(np.float64)

def build(ep, lang, data):
    J, ST = jingle(), sting()
    parts = []  # (signal, start)
    t = 0.0
    parts.append((J * 0.55, t)); t += 2.6
    bed_from = t
    prev = None
    for i, line in enumerate(ep['lines']):
        if line.get('sting'):
            t += 0.3; parts.append((ST * 0.5, t)); t += 1.1
        elif prev is not None:
            t += 0.75 if line['who'] != prev else 0.45
        v = speak(lang, line['who'], line.get(lang, ''), os.path.join(ROOT, 'audio', ep['id'], 'rec', lang, f"{i + 1:02d}-{line['who']}.wav"))
        parts.append((v, t)); t += len(v) / SR
        if i == 0: bed_to = t
        prev = line['who']
    t += 0.5
    credit = speak(lang, 'host', data['credit'].get(lang, ''), os.path.join(ROOT, 'audio', ep['id'], 'rec', lang, f"{len(ep['lines']) + 1:02d}-credit.wav")); parts.append((credit, t)); t += len(credit) / SR + 0.2
    parts.append((J * 0.5, t)); t += len(J) / SR
    out = np.zeros(int(SR * (t + 0.3)))
    for sig, at in parts: place(out, sig, at)
    # a soft shaker-and-pad bed under the opening line, faded in and out
    bl = bed_to - bed_from + 1.2; bed = (shaker(bl, amp=.035, seed=7) + pad(bl, .045)); place(out, bed, bed_from)
    return out

def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(r.rsplit('I:', 1)[1].split('LUFS')[0])

def write(out, base):
    """Podcast MP3 at -16 LUFS and broadcast WAV at -23 LUFS: a first loudness pass, then an exact gain trim."""
    peak = np.max(np.abs(out)) or 1; pcm = (out / peak * 0.9 * 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as tmpd:
        src = os.path.join(tmpd, 'mix.wav')
        with wave.open(src, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        # the broadcast master is a WAV; a long episode's WAV would pass the 25 MiB a static file may weigh
        # on the site, so it becomes a FLAC: the same lossless 44.1 kHz 16-bit audio at about a third of the size
        bc = ('.flac', ['-ac', '1', '-sample_fmt', 's16', '-c:a', 'flac', '-compression_level', '8']) if len(out) * 2 > 24 * 2**20 else ('.wav', ['-ac', '1', '-c:a', 'pcm_s16le'])
        for stale in ['.wav', '.flac']:
            if stale != bc[0] and os.path.exists(base + stale): os.remove(base + stale)
        for target, ext, codec in [(-16, '.mp3', ['-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', '-metadata', 'artist=Paruto Media']),
                                   (-23, *bc)]:
            first = os.path.join(tmpd, 'pass1.wav')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', f'loudnorm=I={target}:TP=-2:LRA=11', '-ar', str(SR), '-c:a', 'pcm_s16le', first], check=True)
            trim = target - loudness(first)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', first, '-af', f'volume={trim:.2f}dB,alimiter=limit=0.89:level=false', '-ar', str(SR), *codec, base + ext], check=True)

def main():
    global VDIR
    VDIR = sys.argv[1]; only = sys.argv[2:]
    data = load(); cues = {}
    for ep in data['episodes']:
        if only and ep['id'] not in only: continue
        d = os.path.join(ROOT, 'audio', ep['id']); os.makedirs(d, exist_ok=True)
        recs = os.path.join(ROOT, 'audio', ep['id'], 'rec')
        for lang in list(CAST) + sorted(l for l in (os.listdir(recs) if os.path.isdir(recs) else []) if l not in CAST):
            out = build(ep, lang, data)
            base = os.path.join(d, f"capsule-{ep['n']}-{ep['id']}-{lang}")
            write(out, base)
            secs = len(out) / SR
            cues.setdefault(ep['id'], {})[lang] = {'duration': round(secs, 1), 'in': ' '.join(ep['lines'][0].get(lang, '').split()[:6]), 'out': data['credit'].get(lang, '')}
            print(f"{ep['id']} {lang} {secs:5.1f}s")
    path = os.path.join(ROOT, 'audio', 'cues.js')
    old = {}
    if os.path.exists(path):
        old = json.loads(open(path).read().split('=', 1)[1].rstrip().rstrip(';'))
    old.update(cues)
    open(path, 'w').write('// Written by tools/capsules.py: capsule durations and in/out cues.\nwindow.SPS_CUES = ' + json.dumps(old, ensure_ascii=False, indent=1) + ';\n')

main()
