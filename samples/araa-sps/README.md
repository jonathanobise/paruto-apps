# Paruto Media: SPS awareness kit (media.paruto.com/araa-sps/)

Project 01 on media.paruto.com. Samples of every deliverable in ARAA's call AMI028-2026 (interactive videos and audio on
sanitary and phytosanitary standards for the livestock trade in West Africa). Served as static
files by the Cloudflare Worker `paruto-media-samples` (`wrangler.jsonc`); `.assetsignore` keeps
tools, notes, raw recordings and internal prompts off the site.

| Path | What it is |
| --- | --- |
| `index.html`, `hub/` | The kit page: the teaser on a lit stage, the kit in numbers, then one section per deliverable, FR/EN. `hub/media.js` is generated; `hub/img/` holds the module cards' stills (`tools/hub-stills.mjs`). |
| `videos/<module>/` | Interactive video per framework (`international`, `ecowas`, `waemu`): `script.js` (every word, FR/EN/PT), `timeline.js` (segments, branching, linear order), `scenes.js` (animation), `vo/` (voice clips), MP4s 16:9 and 9:16, SRTs, posters |
| `shared/` | `kit.css`/`kit.js` (the page chrome in the Paruto apps style: glass nav, FR/EN segmented control, light/dark toggle, panels), the player, its styles and the illustration kit shared by the modules |
| `audio/` | Radio/podcast capsules: `capsules.js` (scripts), one folder per episode with an MP3 and a lossless radio file per language (FLAC instead of WAV whenever the WAV would pass the site's 25 MiB file limit, as every full-length episode's does), `cues.js` |
| `storyboards/<module>/` | Generated storyboards (frames, direction, narration, interactions, branching map) |
| `guide/` | Deployment guide (web, WhatsApp, community radio, updating) |
| `recording/` | Local-language recording kit: instructions, glossary, one CSV of lines per module |
| `downloads/` | Zip of the editable sources |
| `tools/` | Everything that generates the above |

## Rebuilding

Needs Node 20+, Playwright's Chromium, ffmpeg, and Python with `piper-tts` and the Piper voices
listed in `tools/voice.py` and `tools/capsules.py`.

    python tools/voice.py <module> <voices-dir>          # voice clips (studio recordings in videos/<module>/rec/<lang>/ win)
    node tools/render.mjs <module>                        # 16:9 MP4s, posters, SRTs
    node tools/render.mjs <module> --vertical             # 9:16 MP4s
    python tools/capsules.py <voices-dir>                 # capsules (studio recordings in audio/<episode>/rec/<lang>/ win)
    node tools/storyboard.mjs international ecowas waemu  # storyboards
    node tools/recording.mjs                              # recording kit
    node tools/hyperframes-prompts.mjs <module>           # HeyGen HyperFrames prompts for the linear cut
    node tools/teaser.mjs [fr]                            # teaser.mp4/.jpg for the projects page and the kit's hero (teaser-fr.* in French)
    node tools/hub-stills.mjs                             # the kit page's module-card stills, without captions (hub/img/)
    python3 tools/module-pages.py                         # the three module pages, from one template
    node tools/kit.mjs                                    # hub/media.js and the sources zip (run last)
    node tools/snap.mjs <module> <outdir> fr 12 choice2@3 # stills, to check frames

## Voices

The narration is a synthetic scratch voice (Piper TTS): French "siwis" and "mls" (CC BY 4.0),
English "cori", "john" (public domain), Portuguese "tugão" and "cadu" (CC0). Final versions are
recorded by native speakers; the five local languages come from the recording kit.

Content is for demonstration and is to be validated by ARAA's technical experts.
