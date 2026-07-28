// 主题数据 → CSS 文本生成器（预制与自定义主题共用同一渲染管线）

import { glyphDataURI } from './glyphs.js';

/** '#rrggbb' + alpha → rgba() */
export function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex || 'transparent';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const OVERLAY_COLORS = {
  light: 'rgba(244, 240, 232, 0.72)',
  dark: 'rgba(12, 16, 28, 0.55)',
};

/** 页面底色亮度（0~1），用于判断是否输出 dark color-scheme */
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/**
 * 生成主题完整 CSS
 * @param theme 主题数据（见 theme-presets.js）
 * @param bgUrl 背景图地址（builtin 相对路径 / dataURL）；null 表示无图
 * @param glass 毛玻璃程度 0-100：50=主题原始；<50 趋向实底；>50 趋向透明磨砂
 */
export function buildThemeCSS(theme, bgUrl, glass = 50) {
  const c = theme.colors;
  const hasGlyph = theme.glyph && theme.glyph !== 'none';

  // 毛玻璃模型：50 为原始设计；左半向 1 插值（变实），右半按比例压透并增强模糊
  let adjustAlpha = (a) => a;
  let blur = 0;
  let saturate = 1;
  const g = Math.max(0, Math.min(100, glass));
  if (g < 50) {
    const k = (50 - g) / 50; // 0→1 变实
    adjustAlpha = (a) => a + (1 - a) * k;
  } else if (g > 50) {
    const k = (g - 50) / 50; // 0→1 变透
    adjustAlpha = (a) => a * (1 - k * 0.92);
    blur = 20 * k;
    saturate = 1 + k * 0.35;
  }

  const todayGlow = c.todayGlow
    ? `inset 0 0 12px ${hexToRgba(c.todayGlow, 0.3)}, inset 0 0 3px ${hexToRgba(c.todayGlow, 0.55)}`
    : 'none';

  let css = `:root {
  --text: ${c.text};
  --muted: ${c.muted};
  --card-bg: ${hexToRgba(c.cardBg, adjustAlpha(c.cardAlpha))};
  --cell-line: ${c.cellLine};
  --cell-past: ${hexToRgba(c.cellPast, adjustAlpha(c.pastAlpha))};
  --cell-past-text: ${c.cellPastText};
  --cell-future: ${hexToRgba(c.cellFuture, adjustAlpha(c.futureAlpha))};
  --cell-future-text: ${c.cellFutureText};
  --cell-today: ${hexToRgba(c.cellToday, adjustAlpha(c.todayAlpha))};
  --today-glow: ${todayGlow};
  --accent: ${c.accent};
  --accent-on: ${c.accentOn || '#ffffff'};
  --accent-soft: ${hexToRgba(c.accent, 0.72)};
  /* 设置面板：底色取未来格色（实色），边框取格线色 */
  --panel-bg: ${c.cellFuture};
  --panel-line: ${c.cellLine};
  --glyph-past: ${hasGlyph ? glyphDataURI(theme.glyph, theme.glyphPast) : 'none'};
  --glyph-future: ${hasGlyph ? glyphDataURI(theme.glyph, theme.glyphFuture) : 'none'};
  --glyph-today: ${hasGlyph ? glyphDataURI(theme.glyph, theme.glyphToday, true) : 'none'};
  --card-shadow: 0 2px 18px ${hexToRgba('#000000', 0.15)};
}\n`;

  // 毛玻璃：整卡一次模糊，作用于所有半透明格子透出的背景
  if (blur > 0) {
    css += `.card {
  -webkit-backdrop-filter: blur(${blur.toFixed(1)}px) saturate(${saturate.toFixed(2)});
  backdrop-filter: blur(${blur.toFixed(1)}px) saturate(${saturate.toFixed(2)});
}\n`;
  }

  // 暗色主题：声明 color-scheme，让滚动条与原生控件匹配
  if (luminance(c.pageBg) < 0.35) {
    css += `html { color-scheme: dark; }\n`;
  }

  // 页面背景：底色 + 可选背景图
  const bgLayer = bgUrl
    ? `${c.pageBg} url("${bgUrl}") ${theme.bgPos || 'center'} / cover no-repeat fixed`
    : c.pageBg;
  css += `body { background: ${bgLayer}; }\n`;

  if (bgUrl) {
    // 统一纱罩：用页面底色压住整张背景图，降低存在感、不抢视觉焦点。
    // 预制主题可用 bgVeil 微调；未指定时按底色明暗取默认值（上传图同样生效）。
    const veil = theme.bgVeil ?? (luminance(c.pageBg) < 0.35 ? 0.6 : 0.8);
    css += `body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: ${hexToRgba(c.pageBg, veil)};
}
.page { position: relative; z-index: 1; }\n`;

    // 顶部渐变遮罩（可选，自定义主题用于进一步保证标题可读）
    if (theme.overlay && theme.overlay !== 'none') {
      const color = OVERLAY_COLORS[theme.overlay] || OVERLAY_COLORS.light;
      css += `body::after {
  content: '';
  position: fixed;
  inset: 0 0 auto;
  height: 40vh;
  pointer-events: none;
  background: linear-gradient(180deg, ${color}, ${hexToRgba('#ffffff', 0)});
}\n`;
    }
  }

  // 卡片附加纹理（乐谱线）
  if (theme.cardPattern === 'staff' && hasGlyph) {
    const line = hexToRgba(theme.glyphFuture, 0.14);
    css += `.card {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 11px,
    ${line} 11px,
    ${line} 12px
  );
}\n`;
  }

  return css;
}
