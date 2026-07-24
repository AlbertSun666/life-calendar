// 格子装饰图形：参数化 SVG 模板，按颜色生成 data-URI
// today 状态可使用填充变体（如灯泡点亮）

export const GLYPH_TYPES = ['none', 'bulb', 'wave', 'sprout', 'note'];

const GLYPHS = {
  bulb: (c, filled) => filled
    ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 3a6 6 0 0 0-3.6 10.8c.9.7 1.6 1.7 1.6 3.2h4c0-1.5.7-2.5 1.6-3.2A6 6 0 0 0 12 3z' fill='${c}' stroke='${c}' stroke-width='1.2'/><path d='M9.8 19h4.4M10.6 21.4h2.8' stroke='${c}' stroke-width='1.4' stroke-linecap='round'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 3a6 6 0 0 0-3.6 10.8c.9.7 1.6 1.7 1.6 3.2h4c0-1.5.7-2.5 1.6-3.2A6 6 0 0 0 12 3z' fill='none' stroke='${c}' stroke-width='1.4'/><path d='M9.8 19h4.4M10.6 21.4h2.8' stroke='${c}' stroke-width='1.4' stroke-linecap='round'/></svg>`,

  wave: (c) =>
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M2 12.5c2-3.5 4-3.5 6 0s4 3.5 6 0 4-3.5 6 0' fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'/><path d='M4.5 17.5c1.8-2.5 3.6-2.5 5.4 0s3.6 2.5 5.4 0' fill='none' stroke='${c}' stroke-width='1.3' stroke-linecap='round' opacity='0.55'/></svg>`,

  sprout: (c) =>
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 21v-8' stroke='${c}' stroke-width='1.5' stroke-linecap='round'/><path d='M12 13c-4.2 0-6.5-2.3-6.5-6.5 4.2 0 6.5 2.3 6.5 6.5z' fill='${c}'/><path d='M12 11c0-4.2 2.3-6.5 6.5-6.5 0 4.2-2.3 6.5-6.5 6.5z' fill='${c}'/></svg>`,

  note: (c) =>
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><ellipse cx='9' cy='17' rx='3.6' ry='2.8' fill='${c}'/><path d='M12.6 17V5.5h4.8' fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'/></svg>`,
};

function encodeSVG(svg) {
  return svg
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
}

/** 生成图形背景的 data-URI；type 为 none/未知时返回 'none' */
export function glyphDataURI(type, color, filled = false) {
  const make = GLYPHS[type];
  if (!make) return 'none';
  return `url("data:image/svg+xml,${encodeSVG(make(color, filled))}")`;
}
