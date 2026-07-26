// 预制主题（只读）与主题解析
// 自定义主题（settings.customThemes）与本文件数据同构：
// { id, name, desc, builtin, glyph, glyphPast/Future/Today,
//   colors: { text, muted, pageBg, cardBg, cardAlpha, cellLine,
//             cellPast, cellPastText, pastAlpha,
//             cellFuture, cellFutureText, futureAlpha,
//             cellToday, todayAlpha, todayGlow, accent, accentOn },
//   bg: { type:'builtin', src } | { type:'upload', src:图片id } | null,
//   bgPos, bgVeil: 背景图纱罩浓度 0~1（缺省按底色明暗推导）,
//   overlay: 'none'|'light'|'dark'（顶部渐变遮罩，可选）, cardPattern: 'staff'|undefined }

export const THEME_PRESETS = [
  {
    id: 'default',
    name: '默认',
    desc: '白纸灰格，朴素克制',
    builtin: true,
    glyph: 'none',
    colors: {
      text: '#1a1a1a', muted: '#8a8a86', pageBg: '#ffffff',
      cardBg: '#ffffff', cardAlpha: 1,
      cellLine: '#e8e8e4',
      cellPast: '#c8c8c5', cellPastText: '#262626', pastAlpha: 1,
      cellFuture: '#ffffff', cellFutureText: '#6d6d68', futureAlpha: 1,
      cellToday: '#ffffff', todayAlpha: 1, todayGlow: null,
      accent: '#1a1a1a', accentOn: '#ffffff',
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
      text: '#e8e4d8', muted: '#8b94a6', pageBg: '#1a2330',
      cardBg: '#232f42', cardAlpha: 0.86,
      cellLine: '#35415a',
      cellPast: '#161d28', cellPastText: '#5d6b84', pastAlpha: 0.78,
      cellFuture: '#223148', cellFutureText: '#8b94a6', futureAlpha: 0.72,
      cellToday: '#33445e', todayAlpha: 0.85, todayGlow: '#e5c758',
      accent: '#e5c758', accentOn: '#1a2330',
    },
    bg: { type: 'builtin', src: 'assets/starry.jpg' },
    bgPos: 'center',
    bgVeil: 0.72,
    overlay: 'none',
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
      text: '#2b3a47', muted: '#7d8a93', pageBg: '#e8e2d0',
      cardBg: '#eae4d0', cardAlpha: 0.92,
      cellLine: '#ddd5c0',
      cellPast: '#8fa9b4', cellPastText: '#3d5a68', pastAlpha: 0.78,
      cellFuture: '#f4efe0', cellFutureText: '#607582', futureAlpha: 0.62,
      cellToday: '#f4efe0', todayAlpha: 0.85, todayGlow: '#385973',
      accent: '#385973', accentOn: '#f4efe0',
    },
    bg: { type: 'builtin', src: 'assets/wave.jpg' },
    bgPos: 'center',
    bgVeil: 0.84,
    overlay: 'none',
  },
  {
    id: 'hope-field',
    name: '希望田野',
    desc: '麦田与柏树下，每一天都是一株禾苗',
    builtin: true,
    glyph: 'sprout',
    // 取色自《麦田与柏树》：柏树墨绿 / 橄榄绿苗 / 麦金
    glyphFuture: '#93b04c', glyphPast: '#47604a', glyphToday: '#8fb844',
    colors: {
      text: '#ede8d2', muted: '#93a08a', pageBg: '#16281a',
      cardBg: '#20361f', cardAlpha: 0.86,
      cellLine: '#33482f',
      cellPast: '#1a2e20', cellPastText: '#6f8261', pastAlpha: 0.78,
      cellFuture: '#27402a', cellFutureText: '#93a08a', futureAlpha: 0.72,
      cellToday: '#8fb844', todayAlpha: 0.9, todayGlow: '#8fb844',
      accent: '#8fb844', accentOn: '#16281a',
    },
    bg: { type: 'builtin', src: 'assets/wheat.jpg' },
    bgPos: 'center',
    bgVeil: 0.7,
    overlay: 'none',
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
      text: '#2e3a44', muted: '#8395a1', pageBg: '#dce4ea',
      cardBg: '#f4f7f9', cardAlpha: 0.92,
      cellLine: '#d3dde3',
      cellPast: '#c3d2de', cellPastText: '#5f7285', pastAlpha: 0.72,
      cellFuture: '#ffffff', cellFutureText: '#5f7590', futureAlpha: 0.5,
      cellToday: '#ffffff', todayAlpha: 0.85, todayGlow: '#c24b36',
      accent: '#c24b36', accentOn: '#f4f7f9',
    },
    bg: { type: 'builtin', src: 'assets/parasol.jpg' },
    bgPos: 'center 22%',
    bgVeil: 0.78,
    overlay: 'none',
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
