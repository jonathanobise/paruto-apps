"""Writes videos/<module>/index.html for the three modules from one template (header, player, notes),
so the pages stay identical apart from their words and files.   python3 tools/module-pages.py"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = open(os.path.join(ROOT, 'tools', 'theme-button.html')).read().strip()
MODS = [
  dict(id='international', slug='aicha', n='01', title_en='Aïcha’s Market', title_fr='Le marché d’Aïcha',
       tag_en='International standards · WTO, WOAH, FAO/Codex', tag_fr='Normes internationales · OMC, OMSA, FAO/Codex',
       desc='Sample interactive awareness video on international SPS standards (WTO SPS Agreement, Codex, WOAH, IPPC) for the meat trade, by Paruto Media.'),
  dict(id='ecowas', slug='moussa', n='02', title_en='Moussa’s Journey', title_fr='Le voyage de Moussa',
       tag_en='ECOWAS standards · C/REG.21/11/10', tag_fr='Normes CEDEAO · C/REG.21/11/10',
       desc='Sample interactive awareness video on animal health (SPS) rules for the livestock trade in West Africa, by Paruto Media.'),
  dict(id='waemu', slug='koffi', n='03', title_en='Koffi’s Butcher Shop', title_fr='La boucherie de Koffi',
       tag_en='WAEMU standards · Regulation 007/2007', tag_fr='Normes UEMOA · Règlement 007/2007',
       desc='Sample interactive awareness video on food safety rules in the WAEMU area (Regulation 007/2007/CM/UEMOA), by Paruto Media.'),
]
T = '''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title_fr} · Paruto Media</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#060608">
  <meta name="robots" content="noindex">
  <link rel="icon" href="../../shared/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="stylesheet" href="../../shared/kit.css">
  <link rel="stylesheet" href="../../shared/player.css">
  <script>try {{ if (localStorage.getItem("theme") === "light") document.documentElement.dataset.theme = "light"; }} catch {{}}</script>
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <header class="nav glass">
    <a class="brand" href="../../../" aria-label="Paruto Media · projects"><img class="only-dark" src="../../shared/paruto-media-logo-white.svg" alt="Paruto Media"><img class="only-light" src="../../shared/paruto-media-logo-black.svg" alt="" aria-hidden="true"></a>
    <nav class="nav-links" aria-label="Modules">
      <a href="../../#videos" class="crumb"><span class="l-fr">← Kit SPS</span><span class="l-en">← SPS kit</span></a>
      {modlinks}
    </nav>
    <div class="nav-end">
      <div class="seg" role="group" aria-label="Language"><button class="lang-btn" data-lang="fr">FR</button><button class="lang-btn" data-lang="en">EN</button><button class="lang-btn" data-lang="pt">PT</button><span class="seg-thumb" aria-hidden="true"></span></div>
      {theme}
    </div>
  </header>

  <main class="page">
    <section class="page-head mod-head">
      <p class="eyebrow-pill"><span class="pulse" aria-hidden="true"></span><span class="l-fr">Module {n} · {tag_fr}</span><span class="l-en">Module {n} · {tag_en}</span></p>
      <h1 data-ui="title" data-serif></h1>
      <p class="lead" data-ui="subtitle"></p>
    </section>

    <div class="player">
      <div class="frame" id="frame">
        <div id="stage">
          <svg id="svg" viewBox="0 0 1280 720" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" aria-label="Animated scene"></svg>

          <div id="caption" class="caption"><span></span></div>

          <div id="choice" class="choice">
            <div class="card">
              <div class="eyebrow"></div>
              <h2 class="q"></h2>
              <div class="opts">
                <button class="opt" data-i="0"><span class="num">1</span><span class="txt"></span><span class="mark"></span></button>
                <button class="opt" data-i="1"><span class="num">2</span><span class="txt"></span><span class="mark"></span></button>
              </div>
              <div class="hint"><span class="count"></span><span class="hint-text"></span></div>
              <div class="feedback"></div>
            </div>
          </div>

          <div id="quiz" class="quiz">
            <div class="card">
              <div class="eyebrow"><span class="eyebrow-label"></span> · <span class="qn"></span></div>
              <h2 class="q"></h2>
              <div class="opts">
                <button class="opt"><span class="num">A</span><span class="txt"></span><span class="mark"></span></button>
                <button class="opt"><span class="num">B</span><span class="txt"></span><span class="mark"></span></button>
                <button class="opt"><span class="num">C</span><span class="txt"></span><span class="mark"></span></button>
              </div>
              <p class="why"></p>
              <div class="actions"><button class="next pill" data-ui="next"></button></div>
            </div>
            <div class="card score">
              <div class="eyebrow" data-ui="score"></div>
              <div class="score-num"></div>
              <button class="score-go pill" data-ui="continue"></button>
            </div>
          </div>

          <div id="backbar" class="bar-overlay"><button id="back" class="pill" data-ui="back"></button></div>
          <div id="endbar" class="bar-overlay"><button id="replay" class="pill" data-ui="replay"></button></div>
        </div>
        <div id="start" class="start">
          <div class="start-card">
            <div class="eyebrow" data-ui="demo"></div>
            <h2 data-ui="title"></h2>
            <p data-ui="subtitle"></p>
            <button id="go" class="pill big"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg><span data-ui="start"></span></button>
          </div>
        </div>
      </div>
      <div id="dock" class="dock"></div>

      <div class="controls">
        <button id="play" class="ctl" data-state="paused"><svg class="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg><svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg><span class="lbl"></span></button>
        <button id="restart" class="ctl icon" aria-label="Restart"><svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/></svg></button>
        <div id="chapters" class="chapters"></div>
        <button id="vo" class="ctl icon cc" aria-label="Voice-over"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" fill="currentColor"/></svg></button>
        <button id="cc" class="ctl icon cc" aria-label="Captions">CC</button>
      </div>
    </div>

    <section class="notes">
      <div class="panel">
        <p class="label"><span class="l-fr">Ce que montre l’échantillon</span><span class="l-en">What this sample shows</span></p>
        <ul class="l-fr">
          <li>Animation 2D sans texte à l’écran : seules la voix et les sous-titres changent d’une langue à l’autre</li>
          <li>Deux choix à embranchements avec leurs conséquences, puis un quiz de trois questions avec score</li>
          <li>Fonctionne dans tout navigateur et sur téléphone, sans application</li>
        </ul>
        <ul class="l-en">
          <li>2D motion design built language-neutral: only the voice and captions change between versions</li>
          <li>Two branching choices with on-screen consequences, then a three-question quiz with a score</li>
          <li>Runs in any browser and on phones, with no app to install</li>
        </ul>
      </div>
      <div class="panel">
        <p class="label"><span class="l-fr">Versions légères WhatsApp</span><span class="l-en">WhatsApp light versions</span></p>
        <div class="dl-row"><span class="dl-k">16:9</span><a class="chip" href="{slug}-fr.mp4" download>FR</a><a class="chip" href="{slug}-en.mp4" download>EN</a><a class="chip" href="{slug}-pt.mp4" download>PT</a></div>
        <div class="dl-row"><span class="dl-k">9:16</span><a class="chip" href="{slug}-fr-vertical.mp4" download>FR</a><a class="chip" href="{slug}-en-vertical.mp4" download>EN</a><a class="chip" href="{slug}-pt-vertical.mp4" download>PT</a></div>
        <div class="dl-row"><span class="dl-k">SRT</span><a class="chip" href="{slug}-fr.srt">FR</a><a class="chip" href="{slug}-en.srt">EN</a><a class="chip" href="{slug}-pt.srt">PT</a></div>
        <p class="small"><span class="l-fr">Montages linéaires : pause numérotée au moment du choix, réponses du quiz révélées.</span><span class="l-en">Linear cuts with numbered pauses at the choice and the quiz answers revealed.</span> <a href="../../storyboards/{id}/"><span class="l-fr">Storyboard</span><span class="l-en">Storyboard</span> →</a></p>
      </div>
      <div class="panel">
        <p class="label"><span class="l-fr">Suite de la production</span><span class="l-en">Next in production</span></p>
        <p class="small l-fr">Voix off par des comédiens natifs au studio Paruto Music, versions en langues locales (haoussa, bambara, wolof, yoruba, peul) avec glossaires SPS validés. Contenu de démonstration, à valider par les experts techniques.</p>
        <p class="small l-en">Native-speaker voice-over recorded at Paruto Music, local-language versions (Hausa, Bambara, Wolof, Yoruba, Fulani) with validated SPS glossaries. Content is for demonstration and is to be validated by technical experts.</p>
        <p class="small faint l-fr">Narration provisoire de synthèse (Piper) : français « siwis » (CC BY 4.0), anglais « cori » (domaine public), portugais « tugão » (CC0).</p>
        <p class="small faint l-en">Temporary synthetic narration (Piper): French “siwis” (CC BY 4.0), English “cori” (public domain), Portuguese “tugão” (CC0).</p>
      </div>
    </section>
  </main>

  <script src="script.js"></script>
  <script src="timeline.js"></script>
  <script src="../../shared/art.js"></script>
  <script src="scenes.js"></script>
  <script src="../../shared/player.js"></script>
  <script src="../../shared/kit.js"></script>
</body>
</html>
'''
for m in MODS:
    links = ''.join(f'<a href="../{o["id"]}/"{" class=\"here\" aria-current=\"page\"" if o is m else ""}><span class="l-fr">{o["title_fr"]}</span><span class="l-en">{o["title_en"]}</span></a>' for o in MODS)
    html = T.format(modlinks=links, theme=THEME, **m)
    open(os.path.join(ROOT, 'videos', m['id'], 'index.html'), 'w').write(html)
    print('videos/%s/index.html' % m['id'])
