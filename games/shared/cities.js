/* Shared city data and settings for both Anansi games (3D and the light 2D version).
   Every city themes the same four route types: island streets, a long bridge, canals with a
   cable-stayed crossing, and glass towers by the water. Add a city here and it appears in both menus.

   Phrase pools (all optional except where noted; the games fall back to EN):
   cheers  perfect releases        hype    combo milestones       speed   hitting top speed
   thanks  rescued people          smashes drone smashes          ouch    taking a hit
   wet     falling in the water    shouts  bus conductors         help    rooftop sign (≤ 7 chars)
   surge / off  power back on / power cut again */
(function () {
  'use strict';

  const EN = {
    cheers: ['Nice!', 'Sharp!', 'Yes!', 'Smooth!', 'Boom!'], hype: ['On fire!', 'Unstoppable!', 'Keep going!'], speed: ['Zoom!', 'Full speed!'],
    thanks: ['Thank you!', 'My hero!', 'Thanks!'], smashes: ['Smashed!', 'Boom!', 'Gone!'], ouch: ['Ouch!', 'Hey!', 'Argh!'], wet: ['Splash!', 'Soaked!'],
    shouts: ['Downtown! Downtown!', 'All aboard!', 'Next stop: the bridge!'], help: 'HELP!', surge: 'LIGHTS ON!', off: 'Blackout again!',
  };
  // Nigerian Pidgin and street slang, shared by Lagos and Abuja
  const NG = {
    cheers: ['Gbam!', 'Oya!', 'Correct!', 'Ehen!', 'Na so!', 'Sharp guy!', 'Omo!', 'No shaking!'],
    hype: ['E choke!', 'Odogwu!', 'We move!', 'Soft life!', 'Chop life!', 'Na you be the main character!'],
    speed: ['Japa!', 'Express road!', 'Sapa no fit catch me!', 'Zoom zoom!'],
    thanks: ['Thank you o!', 'E se gan!', 'Daalụ!', 'Na gode!', 'My guy!', 'God bless you!', 'You too much!'],
    smashes: ['Gbosa!', 'Scatter am!', 'Kpatakpata!', 'Finish am!', 'E don cast!'],
    ouch: ['Wahala!', 'Haba!', 'Ouch o!', 'Chai!', 'Ah ah!', 'Na wa o!'],
    help: 'HELP O!', surge: 'UP NEPA!', off: 'NEPA don take light!',
  };
  const PAL = {
    tower: ['#9aa1ad', '#b5a58e', '#7f96a3', '#cdbda3', '#8790aa', '#a39ab0', '#c4c1b8'],
    low: ['#e2a65b', '#d9735a', '#86bf98', '#e9d57f', '#a9c0e0', '#d39abb', '#efe8d6', '#e88a6a'],
    glass: ['#6d8fa6', '#7aa0b6', '#5f7f96', '#8aa9bb', '#b8c4cc'],
  };
  const DR_BLACKOUT = ['DR. BLACKOUT', 'GENERATORS FOR SALE', '#2c2140'];

  const CITIES = {
    lagos: { label: 'Lagos, Nigeria', name: 'Lagos', cur: '₦', coin: 50, ...NG,
      wet: ['Chai!', 'Na lagoon o!', 'Lagoon don catch me!', 'Splash!'],
      shouts: ['Obalende! Obalende!', 'CMS! Enter with your change!', 'Oshodi! Oshodi!', 'Wole! Wole!', 'Ojuelegba! Last seat!', 'Owa! Owa!'],
      bus: { name: 'Danfo', color: '#ffbf18', slogans: ['NO FOOD FOR LAZY MAN', "GOD'S TIME IS THE BEST", 'NO CONDITION IS PERMANENT', 'SHINE YOUR EYE', 'OBALENDE · CMS', 'EXCUSE ME, YOUR CHANGE'] },
      districts: [['Lagos Island', 'Marina · Broad Street'], ['Third Mainland Bridge', '11.8 km over the lagoon'], ['Ikoyi–Lekki Link', 'Cable-stayed over Five Cowrie Creek'], ['Eko Atlantic', 'A new city on the Atlantic']],
      billboards: [['SUYA', 'HOT & SPICY · OPEN LATE', '#c0392b'], ['PURE WATER', '₦50 · ICE COLD', '#2e86c1'], ['JOLLOF CHAMPS', 'WE DON WIN AGAIN', '#e67e22'], ['NEPA', 'LIGHT DEY COME... SOON', '#16a085'], DR_BLACKOUT, ['AFROBEATS', 'LIVE TONIGHT · TBS', '#8e44ad']] },
    abuja: { label: 'Abuja, Nigeria', name: 'Abuja', cur: '₦', coin: 50, ...NG,
      cheers: [...NG.cheers, 'Yauwa!'], ouch: [...NG.ouch, 'Sannu o!', 'Kai!'],
      wet: ['Chai!', 'Na lake o!', 'Jabi Lake don catch me!', 'Splash!'],
      shouts: ['Wuse! Wuse!', 'Area One! Area One!', 'Berger! Berger!', 'Kubwa! Kubwa!', 'Garki! Enter with change!'],
      bus: { name: 'Bus', color: '#14935a', slogans: ['WUSE · GARKI · MAITAMA', 'NO CONDITION IS PERMANENT', 'CENTRE OF UNITY', 'SHINE YOUR EYE'] },
      districts: [['Central Business District', 'Towers by the Federal Secretariat'], ['Jabi Lake Crossing', 'Bridges over the lake'], ['Wuse · Maitama', 'Avenues, canals and a cable-stayed link'], ['Centenary City', 'The new district by Aso Rock']],
      billboards: [['SUYA', 'AREA ONE · OPEN LATE', '#c0392b'], ['KILISHI', 'SPICY · DRIED · SWEET', '#9a4a1a'], ['JOLLOF CHAMPS', 'WE DON WIN AGAIN', '#e67e22'], ['NEPA', 'LIGHT DEY COME... SOON', '#16a085'], DR_BLACKOUT, ['AFROBEATS', 'LIVE TONIGHT · JABI', '#8e44ad']] },
    accra: { label: 'Accra, Ghana', name: 'Accra', cur: '₵', coin: 2,
      cheers: ['Chale!', 'Ayekoo!', 'Eiii!', 'Charley wow!', 'Ɛyɛ!', 'Saa!'], hype: ['Chale, you dey feel!', 'Bra, you do am!', 'Herh, this one!', 'Chale, levels!'],
      speed: ['Chale, I dey go!', 'Like trotro without brakes!', 'Zoom!'],
      thanks: ['Medaase!', 'Oyiwaladon!', 'Chale, thanks!', 'Ayekoo, my guy!', 'God bless you!'], smashes: ['Boom!', 'Chale!', 'Finish!', 'Gone!'],
      ouch: ['Ei!', 'Herh!', 'Chale, why?', 'Ebei!', 'Wahala!'], wet: ['Ei, water!', 'Chale, I wet!', 'Splash!'],
      shouts: ['Circle! Circle!', 'Kaneshie! Kaneshie!', 'Madina! Madina!', 'Accra! Accra!', 'Lapaz! Lapaz!'],
      help: 'HELP!', surge: 'DUMSOR DONE!', off: 'Dumsor is back!',
      bus: { name: 'Trotro', color: '#f1efe6', slogans: ['NYAME NE HENE', 'GOD IS KING', 'SWEET MOTHER', 'NO TIME TO DIE'] },
      districts: [['Osu · Oxford Street', "Accra's busiest strip"], ['Korle Lagoon Crossing', 'Over the lagoon to Jamestown'], ['Ridge · Airport City', 'Offices, canals and a cable-stayed link'], ['Marine Drive', 'Towers along the Atlantic']],
      billboards: [['WAAKYE', 'HOT & FRESH · OSU', '#b03a2e'], ['KELEWELE', 'SPICY PLANTAIN BITES', '#d35400'], ['JOLLOF CHAMPS', 'GHANA JOLLOF NO. 1', '#e67e22'], ['DUMSOR', 'TIMETABLE OUT SOON', '#16a085'], DR_BLACKOUT, ['HIGHLIFE', 'LIVE TONIGHT · OSU', '#8e44ad']] },
    capetown: { label: 'Cape Town, South Africa', name: 'Cape Town', cur: 'R', coin: 5,
      cheers: ['Sharp sharp!', 'Lekker!', 'Aweh!', 'Shot!', 'Sho!'], hype: ['Jislaaik!', 'Lekker, bru!', 'Now now, champion!', 'Hayibo, look at you!'],
      speed: ['Faster than a taxi at a robot!', 'Sharp sharp!', 'Zoom!'],
      thanks: ['Enkosi!', 'Dankie!', 'Shot, bru!', 'Ngiyabonga!', 'Aweh, thanks!'], smashes: ['Boom!', 'Lekker!', 'Jislaaik!', 'Gone!'],
      ouch: ['Eish!', 'Yoh!', 'Ag no!', 'Hayibo!'], wet: ['Ice cold, bru!', 'Eish, wet!', 'Splash!'],
      shouts: ['Cape Town! Cape Town!', 'Bellville! Bellville!', 'Mowbray! Mowbray!', 'Wynberg! Wynberg!'],
      help: 'HELP!', surge: 'LOAD-SHEDDING OVER!', off: 'Stage 6 again!',
      bus: { name: 'Taxi', color: '#f3f3ef', slogans: ['SHARP SHARP', 'CAPE TOWN · BELLVILLE', 'NO CHANGE NO ENTRY', 'SHOSHOLOZA'] },
      districts: [['City Bowl', 'Adderley Street under the mountain'], ['Foreshore Freeway', 'The famous unfinished bridge'], ['V&A Waterfront', 'Canals and a cable-stayed link'], ['Century City', 'Glass towers by the canals']],
      billboards: [['BUNNY CHOW', 'DURBAN STYLE · HOT', '#c0392b'], ['GATSBY', 'ONE ROLL FEEDS FOUR', '#d35400'], ['BRAAI SPOT', 'OPEN SUNDAYS', '#7a4a1a'], ['LOAD-SHEDDING', 'STAGE 2 TONIGHT', '#16a085'], DR_BLACKOUT, ['AMAPIANO', 'LIVE TONIGHT', '#8e44ad']],
      pal: { low: ['#e94f6a', '#4fb0e0', '#f6d04d', '#7ccf8a', '#b58ad8', '#f39a4a', '#f2efe6'] } },
    london: { label: 'London, UK', name: 'London', cur: '£', coin: 1,
      cheers: ['Brilliant!', 'Smashing!', 'Proper!', 'Calm!', 'Peng!', 'Sorted!'], hype: ['Bare quick!', 'Gassed!', 'Top drawer!', 'Different level, innit!'],
      speed: ['Faster than the Tube!', 'Bare fast!', 'Zoom!'],
      thanks: ['Cheers, mate!', 'Ta!', 'Safe, bruv!', 'Bless you, fam!', 'Lovely, thanks!'], smashes: ['Smashed it!', 'Get in!', 'Bare easy!', 'Sorted!'],
      ouch: ['Blimey!', 'Oi!', 'Allow it!', 'Gutted!'], wet: ['Into the Thames!', 'Soaked, innit!', 'Splash!'],
      shouts: ['Next stop: Peckham!', 'Move down inside, please!', 'Hold on tight!', 'Mind the gap!'],
      help: 'HELP!', surge: 'LIGHTS ON, LONDON!', off: 'Blackout again, innit.',
      bus: { name: 'Bus', color: '#d71920', slogans: ['NEXT STOP: PECKHAM', 'MIND THE GAP', 'OXFORD CIRCUS', 'HOLD ON TIGHT'] },
      districts: [['The City', 'Bank to Liverpool Street'], ['Thames Crossing', 'Over the river'], ['Docklands', 'Canals and a cable-stayed link'], ['Nine Elms', 'Glass towers on the South Bank']],
      billboards: [['PIE & MASH', 'PROPER LONDON GRUB', '#2e5e3a'], ['FISH & CHIPS', 'OPEN TILL LATE', '#2e86c1'], ['JOLLOF', 'PECKHAM · SINCE FOREVER', '#e67e22'], ['MIND THE GAP', 'PLEASE', '#c0392b'], DR_BLACKOUT, ['GRIME NIGHT', 'LIVE TONIGHT', '#8e44ad']],
      pal: { low: ['#8b4a3a', '#a0583f', '#7a3e32', '#b8a48a', '#c9b79c', '#6e4b3a', '#e6e0d2'], tower: ['#c9c2b2', '#b5ada0', '#9aa1ad', '#d6cfc0', '#8790aa'] } },
    newyork: { label: 'New York, USA', name: 'New York', cur: '$', coin: 1,
      cheers: ["Let's go!", 'Bet!', 'Deadass!', 'No cap!', 'Say less!'], hype: ["That's fire!", 'Big moves!', 'Mad fast, deadass!', 'Fuhgeddaboudit!'],
      speed: ['Faster than the express train!', 'Mad fast!', 'Zoom!'],
      thanks: ['Thanks, pal!', "Good lookin' out!", "You're a lifesaver!", 'Respect!'], smashes: ['Outta here!', 'Boom!', 'Deadass gone!', 'Bye!'],
      ouch: ['Hey!', 'Yo, chill!', 'Watch it!', "I'm walkin' here!"], wet: ['Into the river!', 'Splash!', 'Yo, that water is brick!'],
      shouts: ['Uptown! Uptown!', 'Next stop: Brooklyn!', 'Watch the doors!', 'Stand clear!'],
      help: 'HELP!', surge: 'LIGHTS ON, NEW YORK!', off: 'Blackout again!',
      bus: { name: 'Cab', color: '#ffc21a', slogans: ['BROOKLYN · QUEENS', 'HONK IF YOU SWING', 'BODEGA RUN', 'NO STANDING'] },
      districts: [['Midtown', 'Avenues of glass and stone'], ['East River Crossing', 'Bridges toward Brooklyn'], ['Hudson Yards', 'Piers and a cable-stayed link'], ['Lower Manhattan', 'Towers by the harbour']],
      billboards: [['DOLLAR SLICE', 'HOT PIZZA 24/7', '#c0392b'], ['BAGELS', 'EVERYTHING · FRESH', '#d35400'], ['BODEGA', 'OPEN ALL NIGHT', '#2e86c1'], ['WEST AFRICAN EATS', 'LITTLE SENEGAL · HARLEM', '#e67e22'], DR_BLACKOUT, ['AFROBEATS', 'LIVE IN BROOKLYN', '#8e44ad']],
      pal: { low: ['#6e4436', '#8a5a44', '#a87b5e', '#5d3a2e', '#c2a487', '#9a6b52'], tower: ['#a8a39a', '#8f949c', '#c4bdb0', '#7a828c', '#b3a58f'] } },
    dubai: { label: 'Dubai, UAE', name: 'Dubai', cur: 'AED ', coin: 2,
      cheers: ['Yalla!', 'Habibi!', 'Zain!', 'Tamam!', 'Ahsant!'], hype: ['Yalla, habibi!', 'Wallah, fast!', 'Too good, habibi!'],
      speed: ['Yalla yalla!', 'Faster than the Metro!', 'Zoom!'],
      thanks: ['Shukran!', 'Shukran, habibi!', 'Thank you, my friend!'], smashes: ['Khalas!', 'Boom!', 'Yalla, gone!'],
      ouch: ['Ya salam!', 'Shu hada?', 'Ouch!'], wet: ['Into the creek!', 'Khalas, wet!', 'Splash!'],
      shouts: ['Deira! Deira!', 'Marina! Marina!', 'Yalla, yalla!', 'Karama! Karama!'],
      help: 'HELP!', surge: 'LIGHTS ON, YALLA!', off: 'Blackout again!',
      bus: { name: 'Taxi', color: '#e8dcc0', slogans: ['DEIRA · MARINA', 'YALLA YALLA', 'KARAMA · BUR DUBAI', 'WELCOME'] },
      districts: [['Downtown Dubai', 'Towers along Sheikh Zayed Road'], ['Dubai Creek Crossing', 'Over the old creek'], ['Dubai Marina', 'Canals and a cable-stayed link'], ['Business Bay', 'Glass towers on the canal']],
      billboards: [['SHAWARMA', 'OPEN 24 HOURS', '#c0392b'], ['KARAK CHAI', 'HOT · SWEET · STRONG', '#b9770e'], ['GOLD SOUK', 'THIS WAY', '#8a6d1a'], ['DESERT SAFARI', 'BOOK TONIGHT', '#d35400'], DR_BLACKOUT, ['AFROBEATS', 'LIVE AT THE MARINA', '#8e44ad']],
      pal: { low: ['#e3cfa5', '#d8bf8f', '#efe2c4', '#cdb387', '#f2ead8', '#c9a878'], glass: ['#7fa6c0', '#9fb9cc', '#6d8fa6', '#b8c8d4', '#c9d3da'] } },
  };
  const ORDER = Object.keys(CITIES);
  for (const id of ORDER) CITIES[id] = { ...EN, id, ...CITIES[id] };

  function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pickR = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
  const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24);

  // Any typed city gets a consistent look from its name: bus colour and low-rise palette.
  function customCity(name) {
    name = cleanName(name);
    const r = rng(hashStr(name.toLowerCase())), up = name.toUpperCase();
    const lows = [PAL.low, CITIES.capetown.pal.low, CITIES.london.pal.low, CITIES.newyork.pal.low, CITIES.dubai.pal.low];
    return { ...EN, id: 'custom', name, custom: true, cur: '', coin: 1,
      shouts: [`${name} central!`, 'Downtown! Downtown!', 'All aboard!', 'Next stop: the bridge!'],
      bus: { name: 'Bus', color: pickR(['#ffbf18', '#d71920', '#1f6fd1', '#14935a', '#f1efe6', '#ff7a1a'], r()), slogans: [`${up} CITY`, 'NEXT STOP: DOWNTOWN', 'HOLD ON TIGHT', 'ALL ABOARD'] },
      districts: [['Downtown', `${name} city centre`], ['River Crossing', 'Bridges over the water'], ['Harbour Link', 'Canals and a cable-stayed bridge'], ['New Town', 'Glass towers by the water']],
      billboards: [[up.length > 12 ? 'WELCOME' : up, up.length > 12 ? `TO ${up}` : 'WELCOME TO THE CITY', '#2e86c1'], ['STREET FOOD', 'OPEN LATE', '#c0392b'], ['POWER CUTS?', 'CALL ANANSI', '#16a085'], ['LIVE MUSIC', 'TONIGHT', '#8e44ad'], DR_BLACKOUT, ['ANANSI', `SPOTTED IN ${up}`.slice(0, 26), '#e67e22']],
      pal: { low: pickR(lows, r()) } };
  }

  // The chosen city is shared by both games (same site, same browser storage).
  const KEY = 'anansi.city';
  function loadChoice() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('anansi3d.city') || 'null'); } catch (e) { c = null; }
    if (!c || !(CITIES[c.id] || (c.id === 'custom' && cleanName(c.custom)))) c = { id: 'lagos', custom: '' };
    return { id: c.id, custom: c.id === 'custom' ? cleanName(c.custom) : '' };
  }
  function saveChoice(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage unavailable */ } }
  function resolve(c) { return c.id === 'custom' ? customCity(c.custom) : CITIES[c.id]; }
  function fillSelect(sel) {
    sel.textContent = '';
    for (const id of ORDER) sel.add(new Option(CITIES[id].label, id));
    sel.add(new Option('Your city…', 'custom'));
  }

  // Settings both games read and write: sound, coach progress ('coached3d' / 'coached2d') and best scores ('best3d' / 'best2d').
  const prefs = {
    get(k, d) { try { const v = localStorage.getItem('anansi.shared.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('anansi.shared.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  window.AnansiCities = { CITIES, ORDER, PAL, customCity, cleanName, loadChoice, saveChoice, resolve, fillSelect, prefs };
})();
