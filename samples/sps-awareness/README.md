# Moussa's Journey: SPS awareness sample (Paruto Media)

A capability sample for ARAA's call AMI028-2026 (interactive videos and audio on SPS standards).
Open `index.html` in a browser (or serve the folder): an interactive animated story with two
branching choices, a three-question quiz and FR / EN / PT versions.

| File | What it is |
| --- | --- |
| `script.js` | Every word in the sample, per language (UI, narration, choices, quiz). Add a language here. |
| `timeline.js` | Story segments, durations, branching and the linear (WhatsApp) order |
| `scenes.js` | The illustrations and animation, drawn as SVG from scene time |
| `player.js` | Interactive player; `?render&lang=xx` turns it into the frame-exact linear player |
| `moussa-xx.mp4` | Linear "WhatsApp light" cut per language, with burned-in captions |
| `moussa-xx.srt` | The same narration as subtitles, and the timed voice-over script for the studio |
| `vo/xx/*.mp3` | Voice-over clips, one per caption or quiz line |

Re-render after changing words or art (needs Node, Playwright's Chromium and ffmpeg):

    node tools/render.mjs fr en pt      # MP4s, posters and SRTs
    node tools/snap.mjs /tmp/out fr 12 choice2@3   # stills, to check a frame

The narration in `vo/<lang>/` is a synthetic scratch voice (Piper TTS: French "siwis" CC BY 4.0,
English "cori" public domain, Portuguese "tugão" CC0), one MP3 per caption or quiz line. The
interactive player plays them as each line comes up; the renderer mixes them into the MP4s.
To regenerate them, or after changing words: `python tools/voice.py <piper-voices-dir>` (it checks
every line fits its slot). For studio voices, record each line from the `.srt` timings and
replace the MP3s with the same file names, then re-run the renderer.
Content is for demonstration and is to be validated by ARAA's technical experts.
