// 预制主题（只读）与主题解析
// 自定义主题（settings.customThemes）与本文件数据同构：
// { id, name, desc, builtin, glyph, glyphPast/Future/Today,
//   colors: { text, muted, pageBg, cardBg, cardAlpha, cellLine,
//             cellPast, cellPastText, pastAlpha,
//             cellFuture, cellFutureText, futureAlpha,
//             cellToday, todayAlpha, todayGlow, accent },
//   bg: { type:'builtin', src } | { type:'upload', src:图片id } | null,
//   bgPos, overlay: 'none'|'light'|'dark', cardPattern: 'staff'|undefined }

export const THEME_PRESETS = [
  {
    id: 'default',
    name: '默认',
    desc: '白纸灰格，朴素克制',
    builtin: true,
    glyph: 'none',
    colors: {
      text: '#1f1f1f', muted: '#8b8b8b', pageBg: '#ffffff',
      cardBg: '#ffffff', cardAlpha: 1,
      cellLine: '#d9d9d6',
      cellPast: '#c8c8c5', cellPastText: '#262626', pastAlpha: 1,
      cellFuture: '#ffffff', cellFutureText: '#333333', futureAlpha: 1,
      cellToday: '#ffffff', todayAlpha: 1, todayGlow: null,
      accent: '#c3272b',
    },
    bg: null,
    overlay: 'none',
  },
  {
    id: 'death-diary',
    name: '死亡日记',
    desc: '星月夜下，剩下的日子是一盏盏待点亮的灯',
    builtin: true,
    glyph: 'bulb',
    // 取色自《星月夜》：夜空蓝黑 / 旋涡蓝 / 星月金
    glyphFuture: '#7a8db0', glyphPast: '#39435a', glyphToday: '#e5c758',
    colors: {
      text: '#d5dae6', muted: '#8a92a8', pageBg: '#1a2330',
      cardBg: '#232f42', cardAlpha: 0.86,
      cellLine: '#35425c',
      cellPast: '#161d28', cellPastText: '#4a5266', pastAlpha: 0.78,
      cellFuture: '#2c3a52', cellFutureText: '#9aa8c0', futureAlpha: 0.72,
      cellToday: '#33445e', todayAlpha: 0.85, todayGlow: '#e5c758',
      accent: '#e85f57',
    },
    bg: { type: 'builtin', src: 'assets/starry.jpg' },
    bgPos: 'center',
    overlay: 'dark',
  },
  {
    id: 'deep-water',
    name: '深水潜流',
    desc: '神奈川冲浪里，每一天都是一朵浪花',
    builtin: true,
    glyph: 'wave',
    // 取色自《神奈川冲浪里》：普鲁士蓝浪 / 米白纸浪沫 / 印章朱红
    glyphFuture: '#385973', glyphPast: '#7d97a3', glyphToday: '#b03a32',
    colors: {
      text: '#244561', muted: '#607582', pageBg: '#e0dcc7',
      cardBg: '#eae4d0', cardAlpha: 0.86,
      cellLine: '#cfc4a8',
      cellPast: '#8fa9b4', cellPastText: '#3d5a68', pastAlpha: 0.78,
      cellFuture: '#f4efe0', cellFutureText: '#244561', futureAlpha: 0.62,
      cellToday: '#f4efe0', todayAlpha: 0.85, todayGlow: '#385973',
      accent: '#b03a32',
    },
    bg: { type: 'builtin', src: 'assets/wave.jpg' },
    bgPos: 'center',
    overlay: 'light',
  },
  {
    id: 'hope-field',
    name: '希望田野',
    desc: '麦田与柏树下，每一天都是一株禾苗',
    builtin: true,
    glyph: 'sprout',
    // 取色自《麦田与柏树》：柏树墨绿 / 橄榄绿苗 / 麦金
    glyphFuture: '#93b04c', glyphPast: '#47604a', glyphToday: '#d9a93f',
    colors: {
      text: '#e8ecd8', muted: '#9db08c', pageBg: '#16281a',
      cardBg: '#1d3524', cardAlpha: 0.86,
      cellLine: '#31543c',
      cellPast: '#1a2e20', cellPastText: '#567a5f', pastAlpha: 0.78,
      cellFuture: '#274631', cellFutureText: '#a9c8a0', futureAlpha: 0.72,
      cellToday: '#2e5238', todayAlpha: 0.85, todayGlow: '#d9a93f',
      accent: '#d9a93f',
    },
    bg: { type: 'builtin', src: 'assets/wheat.jpg' },
    bgPos: 'center',
    overlay: 'dark',
  },
  {
    id: 'youth-song',
    name: '青春之歌',
    desc: '莫奈的天空下，每一天都是一个音符',
    builtin: true,
    glyph: 'note',
    // 取色自《撑阳伞的女人》：莫奈天蓝 / 云白 / 领结朱红
    glyphFuture: '#5c7c9a', glyphPast: '#a3b5c4', glyphToday: '#c24b36',
    colors: {
      text: '#2e4460', muted: '#5f7590', pageBg: '#dce4ea',
      cardBg: '#f4f7f9', cardAlpha: 0.84,
      cellLine: '#d5dfe8',
      cellPast: '#c3d2de', cellPastText: '#5f7285', pastAlpha: 0.72,
      cellFuture: '#ffffff', cellFutureText: '#3d5a80', futureAlpha: 0.5,
      cellToday: '#ffffff', todayAlpha: 0.85, todayGlow: '#c24b36',
      accent: '#c24b36',
    },
    bg: { type: 'builtin', src: 'assets/parasol.jpg' },
    bgPos: 'center 22%',
    overlay: 'light',
    cardPattern: 'staff',
  },
];

/** 按 id 解析主题：先查自定义，再查预制，兜底默认 */
export function resolveTheme(id, settings) {
  const custom = (settings.customThemes || []).find((t) => t.id === id);
  if (custom) return custom;
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}

/** 全部主题列表（预制在前，自定义在后） */
export function allThemes(settings) {
  return [...THEME_PRESETS, ...(settings.customThemes || [])];
}
