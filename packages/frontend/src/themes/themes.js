// packages/frontend/src/themes/themes.js
// 15 fully unique BioCube UI themes.
// Each theme defines CSS variables AND a themeClass applied to <body>
// so global.css can add per-theme visual effects and animations.

const themes = {

  // ── 1. BioCube (Default) ── Bioluminescent lab, pulsing green glow
  biocube: {
    name: 'BioCube',
    themeClass: 'theme-biocube',
    '--bc-bg':'#0a0f0d','--bc-bg2':'#111a14','--bc-bg3':'#162019',
    '--bc-card':'#1a2b1e','--bc-card2':'#1f3324',
    '--bc-border':'#2a4030','--bc-border2':'#3a5545',
    '--bc-accent':'#3dff7a','--bc-accent2':'#25c45a','--bc-accent3':'#1a8f40',
    '--bc-dim':'rgba(61,255,122,.12)','--bc-glow':'rgba(61,255,122,.25)',
    '--bc-secondary':'#2effdc','--bc-warn':'#ffb340','--bc-danger':'#ff4d6a','--bc-info':'#4db8ff',
    '--bc-text':'#e8f5ec','--bc-text2':'#9dbfa8','--bc-text3':'#5a7a64',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'10px',
    dot:'#3dff7a',
  },

  // ── 2. Arctic ── Crisp white/mint, clean, frost edges
  arctic: {
    name: 'Arctic',
    themeClass: 'theme-arctic',
    '--bc-bg':'#f0f6f2','--bc-bg2':'#ffffff','--bc-bg3':'#e4efe7',
    '--bc-card':'#ffffff','--bc-card2':'#f5fbf7',
    '--bc-border':'#c8dfd0','--bc-border2':'#a8ccb6',
    '--bc-accent':'#00875a','--bc-accent2':'#006644','--bc-accent3':'#004d33',
    '--bc-dim':'rgba(0,135,90,.1)','--bc-glow':'rgba(0,135,90,.2)',
    '--bc-secondary':'#0077cc','--bc-warn':'#e07b00','--bc-danger':'#cc2244','--bc-info':'#0077cc',
    '--bc-text':'#0d2b1a','--bc-text2':'#3a6650','--bc-text3':'#7aaa90',
    '--bc-font-display':"'Space Grotesk', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'14px',
    dot:'#00875a',
  },

  // ── 3. Solar ── Amber/orange desert heat, shimmer animation
  solar: {
    name: 'Solar',
    themeClass: 'theme-solar',
    '--bc-bg':'#0e0c00','--bc-bg2':'#1a1400','--bc-bg3':'#221b00',
    '--bc-card':'#2b2200','--bc-card2':'#332900',
    '--bc-border':'#4a3a00','--bc-border2':'#665200',
    '--bc-accent':'#ffaa00','--bc-accent2':'#e09500','--bc-accent3':'#b87a00',
    '--bc-dim':'rgba(255,170,0,.12)','--bc-glow':'rgba(255,170,0,.3)',
    '--bc-secondary':'#ff6622','--bc-warn':'#ff4400','--bc-danger':'#ff2244','--bc-info':'#44aaff',
    '--bc-text':'#fff8e6','--bc-text2':'#ccaa66','--bc-text3':'#7a6633',
    '--bc-font-display':"'Oxanium', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'6px',
    dot:'#ffaa00',
  },

  // ── 4. Ocean ── Deep blue, wave ripple, bubble float
  ocean: {
    name: 'Ocean',
    themeClass: 'theme-ocean',
    '--bc-bg':'#020a12','--bc-bg2':'#041424','--bc-bg3':'#061a2e',
    '--bc-card':'#082236','--bc-card2':'#0a2a42',
    '--bc-border':'#0e3a5a','--bc-border2':'#145080',
    '--bc-accent':'#00c8ff','--bc-accent2':'#0099cc','--bc-accent3':'#007799',
    '--bc-dim':'rgba(0,200,255,.1)','--bc-glow':'rgba(0,200,255,.25)',
    '--bc-secondary':'#00ffcc','--bc-warn':'#ffaa00','--bc-danger':'#ff4466','--bc-info':'#66ccff',
    '--bc-text':'#e0f4ff','--bc-text2':'#7ab8d4','--bc-text3':'#336688',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'16px',
    dot:'#00c8ff',
  },

  // ── 5. Crimson ── Dark red, pulse heartbeat
  crimson: {
    name: 'Crimson',
    themeClass: 'theme-crimson',
    '--bc-bg':'#080004','--bc-bg2':'#10000a','--bc-bg3':'#160010',
    '--bc-card':'#200018','--bc-card2':'#2a0020',
    '--bc-border':'#440030','--bc-border2':'#660044',
    '--bc-accent':'#ff2255','--bc-accent2':'#cc1a44','--bc-accent3':'#991133',
    '--bc-dim':'rgba(255,34,85,.12)','--bc-glow':'rgba(255,34,85,.3)',
    '--bc-secondary':'#ff6688','--bc-warn':'#ff8800','--bc-danger':'#ff0000','--bc-info':'#cc88ff',
    '--bc-text':'#ffeef4','--bc-text2':'#cc8899','--bc-text3':'#774455',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'8px',
    dot:'#ff2255',
  },

  // ── 6. CRT ── Phosphor green, scanlines overlay, screen flicker
  crt: {
    name: 'CRT',
    themeClass: 'theme-crt',
    '--bc-bg':'#000800','--bc-bg2':'#010e01','--bc-bg3':'#011401',
    '--bc-card':'#011a01','--bc-card2':'#012001',
    '--bc-border':'#024a02','--bc-border2':'#036603',
    '--bc-accent':'#33ff33','--bc-accent2':'#22cc22','--bc-accent3':'#119911',
    '--bc-dim':'rgba(51,255,51,.1)','--bc-glow':'rgba(51,255,51,.4)',
    '--bc-secondary':'#66ffaa','--bc-warn':'#aaff00','--bc-danger':'#ff3300','--bc-info':'#33ffcc',
    '--bc-text':'#aaffaa','--bc-text2':'#66cc66','--bc-text3':'#338833',
    '--bc-font-display':"'Courier Prime', monospace",'--bc-font-mono':"'Courier Prime', monospace",
    '--bc-radius':'2px',
    dot:'#33ff33',
  },

  // ── 7. Synthwave ── Retrowave neon grid, purple/pink sunset
  synthwave: {
    name: 'Synthwave',
    themeClass: 'theme-synthwave',
    '--bc-bg':'#0d0015','--bc-bg2':'#130022','--bc-bg3':'#180030',
    '--bc-card':'#1e0040','--bc-card2':'#260050',
    '--bc-border':'#440088','--bc-border2':'#6600cc',
    '--bc-accent':'#ff44ff','--bc-accent2':'#cc22cc','--bc-accent3':'#881199',
    '--bc-dim':'rgba(255,68,255,.12)','--bc-glow':'rgba(255,68,255,.3)',
    '--bc-secondary':'#00eeff','--bc-warn':'#ffee00','--bc-danger':'#ff2200','--bc-info':'#44aaff',
    '--bc-text':'#ffddff','--bc-text2':'#cc88cc','--bc-text3':'#884488',
    '--bc-font-display':"'Oxanium', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'4px',
    dot:'#ff44ff',
  },

  // ── 8. Sandstone ── Warm parchment, serif, ink feel
  sandstone: {
    name: 'Sandstone',
    themeClass: 'theme-sandstone',
    '--bc-bg':'#f2ede4','--bc-bg2':'#fffdf8','--bc-bg3':'#ece5d8',
    '--bc-card':'#ffffff','--bc-card2':'#faf6ee',
    '--bc-border':'#d4c4a8','--bc-border2':'#b8a488',
    '--bc-accent':'#8b5e1a','--bc-accent2':'#6e4a14','--bc-accent3':'#52380e',
    '--bc-dim':'rgba(139,94,26,.1)','--bc-glow':'rgba(139,94,26,.2)',
    '--bc-secondary':'#aa7733','--bc-warn':'#cc6600','--bc-danger':'#cc2200','--bc-info':'#336699',
    '--bc-text':'#2a1e0e','--bc-text2':'#6a5030','--bc-text3':'#aa9070',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'12px',
    dot:'#8b5e1a',
  },

  // ── 9. Slate ── Cool blue-grey, sharp corporate
  slate: {
    name: 'Slate',
    themeClass: 'theme-slate',
    '--bc-bg':'#0c0e12','--bc-bg2':'#141820','--bc-bg3':'#1c2230',
    '--bc-card':'#222a3a','--bc-card2':'#283244',
    '--bc-border':'#3a4660','--bc-border2':'#4a5a7a',
    '--bc-accent':'#4a9eff','--bc-accent2':'#2277dd','--bc-accent3':'#1155bb',
    '--bc-dim':'rgba(74,158,255,.12)','--bc-glow':'rgba(74,158,255,.22)',
    '--bc-secondary':'#66ddff','--bc-warn':'#ffaa44','--bc-danger':'#ff5566','--bc-info':'#88ccff',
    '--bc-text':'#e8eeff','--bc-text2':'#8899bb','--bc-text3':'#4a5577',
    '--bc-font-display':"'Space Grotesk', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'8px',
    dot:'#4a9eff',
  },

  // ── 10. Interstellar ── Deep space, star field, nebula drift
  interstellar: {
    name: 'Interstellar',
    themeClass: 'theme-interstellar',
    '--bc-bg':'#01020a','--bc-bg2':'#02041a','--bc-bg3':'#030620',
    '--bc-card':'#04092a','--bc-card2':'#060c35',
    '--bc-border':'#101866','--bc-border2':'#1a2488',
    '--bc-accent':'#aabbff','--bc-accent2':'#7788ee','--bc-accent3':'#4455cc',
    '--bc-dim':'rgba(170,187,255,.1)','--bc-glow':'rgba(170,187,255,.22)',
    '--bc-secondary':'#ff88cc','--bc-warn':'#ffcc44','--bc-danger':'#ff4466','--bc-info':'#88aaff',
    '--bc-text':'#eeeeff','--bc-text2':'#8888cc','--bc-text3':'#4444aa',
    '--bc-font-display':"'Unbounded', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'12px',
    dot:'#aabbff',
  },

  // ── 11. Retro Game ── 8-bit pixel aesthetic, chunky borders
  retrogame: {
    name: 'Retro Game',
    themeClass: 'theme-retrogame',
    '--bc-bg':'#1a0a2e','--bc-bg2':'#2d1b4e','--bc-bg3':'#3d2a5e',
    '--bc-card':'#4a3570','--bc-card2':'#573f7e',
    '--bc-border':'#7755aa','--bc-border2':'#9966cc',
    '--bc-accent':'#ffee00','--bc-accent2':'#ccbb00','--bc-accent3':'#998800',
    '--bc-dim':'rgba(255,238,0,.12)','--bc-glow':'rgba(255,238,0,.3)',
    '--bc-secondary':'#00ff88','--bc-warn':'#ff8800','--bc-danger':'#ff2244','--bc-info':'#44ddff',
    '--bc-text':'#ffffff','--bc-text2':'#ccaaff','--bc-text3':'#886699',
    '--bc-font-display':"'Oxanium', sans-serif",'--bc-font-mono':"'Courier Prime', monospace",
    '--bc-radius':'0px',
    dot:'#ffee00',
  },

  // ── 12. Windows XP ── Luna theme, classic OS aesthetic
  windowsxp: {
    name: 'Windows XP',
    themeClass: 'theme-windowsxp',
    '--bc-bg':'#3a6ea5','--bc-bg2':'#d4e4f7','--bc-bg3':'#c4d4e7',
    '--bc-card':'#ece9d8','--bc-card2':'#f5f3eb',
    '--bc-border':'#8fafc8','--bc-border2':'#6b8eb5',
    '--bc-accent':'#2b5797','--bc-accent2':'#1f4080','--bc-accent3':'#153060',
    '--bc-dim':'rgba(43,87,151,.12)','--bc-glow':'rgba(43,87,151,.25)',
    '--bc-secondary':'#008080','--bc-warn':'#c87000','--bc-danger':'#cc0000','--bc-info':'#0055bb',
    '--bc-text':'#000000','--bc-text2':'#333333','--bc-text3':'#666666',
    '--bc-font-display':"'Tahoma', 'Space Grotesk', sans-serif",'--bc-font-mono':"'Courier New', monospace",
    '--bc-radius':'4px',
    dot:'#2b5797',
  },

  // ── 13. Analog ── Warm sepia, vintage VU meters, film grain
  analog: {
    name: 'Analog',
    themeClass: 'theme-analog',
    '--bc-bg':'#1a1208','--bc-bg2':'#221908','--bc-bg3':'#2a2010',
    '--bc-card':'#342818','--bc-card2':'#3e3020',
    '--bc-border':'#6a5030','--bc-border2':'#8a6a40',
    '--bc-accent':'#d4aa44','--bc-accent2':'#aa8833','--bc-accent3':'#886622',
    '--bc-dim':'rgba(212,170,68,.12)','--bc-glow':'rgba(212,170,68,.25)',
    '--bc-secondary':'#cc8844','--bc-warn':'#dd6600','--bc-danger':'#cc3300','--bc-info':'#4488aa',
    '--bc-text':'#f0e8cc','--bc-text2':'#c8a868','--bc-text3':'#8a7040',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'Courier Prime', monospace",
    '--bc-radius':'6px',
    dot:'#d4aa44',
  },

  // ── 14. Rose ── Soft pink light theme
  rose: {
    name: 'Rose',
    themeClass: 'theme-rose',
    '--bc-bg':'#fff5f7','--bc-bg2':'#ffffff','--bc-bg3':'#ffe8ed',
    '--bc-card':'#ffffff','--bc-card2':'#fff0f4',
    '--bc-border':'#f4c0cc','--bc-border2':'#e890a4',
    '--bc-accent':'#c0395a','--bc-accent2':'#992d48','--bc-accent3':'#772236',
    '--bc-dim':'rgba(192,57,90,.1)','--bc-glow':'rgba(192,57,90,.2)',
    '--bc-secondary':'#e05588','--bc-warn':'#dd7700','--bc-danger':'#cc1100','--bc-info':'#4466cc',
    '--bc-text':'#2a0a14','--bc-text2':'#884455','--bc-text3':'#cc9aaa',
    '--bc-font-display':"'Syne', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'16px',
    dot:'#c0395a',
  },

  // ── 15. Violet ── Purple ethereal glow, sparkle particles
  violet: {
    name: 'Violet',
    themeClass: 'theme-violet',
    '--bc-bg':'#05000e','--bc-bg2':'#0a001e','--bc-bg3':'#0e0028',
    '--bc-card':'#140032','--bc-card2':'#1a0040',
    '--bc-border':'#2e0066','--bc-border2':'#440099',
    '--bc-accent':'#bb44ff','--bc-accent2':'#9922ee','--bc-accent3':'#7700cc',
    '--bc-dim':'rgba(187,68,255,.12)','--bc-glow':'rgba(187,68,255,.3)',
    '--bc-secondary':'#ff44cc','--bc-warn':'#ffaa22','--bc-danger':'#ff4466','--bc-info':'#44aaff',
    '--bc-text':'#f0e8ff','--bc-text2':'#aa88cc','--bc-text3':'#664488',
    '--bc-font-display':"'Unbounded', sans-serif",'--bc-font-mono':"'JetBrains Mono', monospace",
    '--bc-radius':'20px',
    dot:'#bb44ff',
  },
};

export default themes;
