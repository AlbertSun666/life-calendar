// F-10：把当前人生表渲染成 PNG（canvas 手绘，零依赖）
// 读 theme.colors 原始 hex + alpha，复用 adjustGlassAlpha / hexToRgba，
// 不依赖 DOM 计算样式，避免毛玻璃半透明在 canvas 上的歧义。

import { LIFE_YEARS, YEAR_COLS } from './constants.js';
import { hexToRgba, adjustGlassAlpha } from './theme-css.js';
import { resolveTheme } from './theme-presets.js';
import { MILESTONE_SVGS } from './icons.js';
import { glyphSVG } from './glyphs.js';
import {
  daysInMonth,
  parseISODate,
  compareYMD,
  diffDays,
  isLeapYear,
  lifeStats,
} from './date.js';
import { monthName, t, currentLocale } from './i18n.js';

// 画布参数
const COL_W = 38;      // 日格列宽（px）
const YEAR_COL_W = COL_W * 2; // 年格跨 2 列
const YEAR_ROW_H = 52; // 年格行高
const DAY_ROW_H = 30;  // 日格行高
const LINE_W = 1;      // 网格线宽
const PAD = 24;        // 卡片内边距
const HEADER_H = 90;   // 顶部标题+统计区高度
const RADIUS = 14;     // 卡片圆角

const FONT_NUM = "Didot, 'Bodoni MT', 'Times New Roman', 'Songti SC', serif";
const FONT_UI = "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
const FONT_TITLE = "'Songti SC', 'Noto Serif CJK SC', serif";

/** hex → {r,g,b} 用于 canvas fillStyle（不含 alpha，alpha 单独用 globalAlpha 或 rgba） */
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** rgba 字符串（canvas fillStyle 兼容） */
function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 加载里程碑 SVG 为 Image（异步） */
function loadSvgImage(svgStr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // SVG 需要明确尺寸才能在 canvas 中绘制
    const sized = svgStr.replace('<svg ', '<svg width="24" height="24" ');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  });
}

/**
 * 渲染当前人生表为 PNG Blob
 * @param {object} settings 完整设置
 * @param {Date} todayDate 用于渲染的「今天」（{year,month,day}）
 * @returns {Promise<Blob>}
 */
export async function renderGridPNG(settings, todayDate) {
  const birth = parseISODate(settings.birthdate);
  if (!birth) throw new Error('no birthdate');

  const theme = resolveTheme(settings.theme, settings);
  const c = theme.colors;
  const glass = settings.glass ?? 50;
  const today = todayDate;
  const year = today.year; // PNG 总是导出「今年」视图

  // 尺寸计算
  const gridCols = 32;
  const gridW = gridCols * COL_W;
  const yearRows = Math.ceil(LIFE_YEARS / YEAR_COLS); // 5
  const gridH = yearRows * YEAR_ROW_H + 12 * DAY_ROW_H;
  const cardW = gridW + PAD * 2;
  const cardH = HEADER_H + gridH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d');

  // ---- 卡片底色 ----
  const cardAlpha = adjustGlassAlpha(c.cardAlpha, glass);
  roundRect(ctx, 0, 0, cardW, cardH, RADIUS);
  ctx.fillStyle = rgba(c.cardBg, cardAlpha);
  ctx.fill();

  // 卡片内裁剪后续绘制
  ctx.save();
  roundRect(ctx, 0, 0, cardW, cardH, RADIUS);
  ctx.clip();

  // ---- 标题 + 统计 ----
  const titleText = settings.nickname
    ? t('title.withNickname', { name: settings.nickname })
    : t('app.title');
  ctx.fillStyle = c.text;
  ctx.font = `600 22px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxTitleW = cardW - PAD * 2; // 超宽昵称截断，避免画出卡片
  ctx.fillText(truncateText(ctx, titleText, maxTitleW), cardW / 2, PAD);

  const stats = lifeStats(birth, today);
  const statsText = t('stats.line', {
    lived: stats.lived.toLocaleString(currentLocale()),
    remaining: stats.remaining.toLocaleString(currentLocale()),
    percent: stats.percent.toFixed(1),
  });
  ctx.fillStyle = c.muted;
  ctx.font = `13px ${FONT_UI}`;
  ctx.fillText(statsText, cardW / 2, PAD + 32);

  // ---- 网格起点 ----
  const gridX = PAD;
  const gridY = PAD + HEADER_H;
  ctx.translate(gridX, gridY);

  // 主题 alpha 调整
  const pastAlpha = adjustGlassAlpha(c.pastAlpha, glass);
  const futureAlpha = adjustGlassAlpha(c.futureAlpha, glass);
  const todayAlpha = adjustGlassAlpha(c.todayAlpha, glass);
  const lineColor = c.cellLine;

  // ---- 年网格（5 行 × 16 列，每格跨 2 列） ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < LIFE_YEARS; i++) {
    const y = birth.year + i;
    const row = Math.floor(i / YEAR_COLS);
    const col = i % YEAR_COLS;
    const x0 = col * YEAR_COL_W;
    const y0 = row * YEAR_ROW_H;
    const w = YEAR_COL_W;
    const h = YEAR_ROW_H;

    // 底色
    let bgHex, bgAlpha, textHex;
    if (y < today.year) { bgHex = c.cellPast; bgAlpha = pastAlpha; textHex = c.cellPastText; }
    else if (y === today.year) { bgHex = c.cellToday; bgAlpha = todayAlpha; textHex = c.cellToday || c.cellFuture; }
    else { bgHex = c.cellFuture; bgAlpha = futureAlpha; textHex = c.cellFutureText; }

    ctx.fillStyle = rgba(bgHex, bgAlpha);
    ctx.fillRect(x0, y0, w, h);

    // 边框
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = LINE_W;
    ctx.strokeRect(x0, y0, w, h);

    // 选中年格描边
    if (y === year) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, y0 + 0.75, w - 1.5, h - 1.5);
      ctx.lineWidth = LINE_W;
    }

    // 年份数字
    const isCurrentYear = y === today.year;
    ctx.fillStyle = isCurrentYear ? c.accent : textHex;
    ctx.font = `${isCurrentYear ? '700' : '600'} 17px ${FONT_NUM}`;
    ctx.fillText(String(y), x0 + w / 2, y0 + h / 2 - 6);

    // 年龄小字
    if (settings.showAge !== false) {
      ctx.fillStyle = rgba(textHex, 0.62);
      ctx.font = `10px ${FONT_UI}`;
      ctx.fillText(t('age.short', { age: y - birth.year }), x0 + w / 2, y0 + h / 2 + 10);
    }

    // 今年进度条
    if (y === today.year) {
      const ratio = yearProgressRatio(today);
      ctx.fillStyle = lineColor;
      ctx.fillRect(x0, y0 + h - 3, w, 3);
      ctx.fillStyle = c.accent;
      ctx.fillRect(x0, y0 + h - 3, w * ratio, 3);
    }

    // 里程碑小圆点（A4：该年全部达成用实心 + 光晕，否则半透明）
    const yearMss = settings.milestones.filter((m) => m.year === y);
    if (yearMss.length > 0) {
      const allDone = yearMss.every((m) => m.done);
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = allDone ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(x0 + w - 7, y0 + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- 月日网格（12 行，每行 1 标签格 + N 日格） ----
  // 预加载本年用到的里程碑图标与主题 glyph（与页面 .cell 装饰规则一致）
  const iconCache = {};
  const iconIds = new Set();
  for (let month = 1; month <= 12; month++) {
    const days = daysInMonth(year, month);
    for (let day = 1; day <= days; day++) {
      const ms = findMs(settings.milestones, month, day, year);
      if (ms.length > 0) iconIds.add(ms[0].icon);
    }
  }
  await Promise.all([...iconIds].map(async (id) => {
    try { iconCache[id] = await loadSvgImage(MILESTONE_SVGS[id] || MILESTONE_SVGS.star); }
    catch { /* 图标加载失败则跳过绘制 */ }
  }));

  // 主题 glyph：灯泡/浪花/禾苗/音符，按格状态着色（与 CSS --glyph-* 一致）
  const glyphType = theme.glyph;
  const glyphCache = {};
  const glyphWanted = new Set(['past', 'future', 'today']);
  if (glyphType && glyphType !== 'none') {
    await Promise.all([...glyphWanted].map(async (st) => {
      const color = st === 'past' ? theme.glyphPast
        : st === 'today' ? theme.glyphToday
        : theme.glyphFuture;
      const svg = glyphSVG(glyphType, color, st === 'today');
      if (!svg) return;
      try { glyphCache[st] = await loadSvgImage(svg); }
      catch { /* 图形加载失败则跳过绘制 */ }
    }));
  }

  for (let month = 1; month <= 12; month++) {
    const row = yearRows + (month - 1);
    const y0 = row * DAY_ROW_H;
    const days = daysInMonth(year, month);

    // 月份标签格（第 1 列）
    const labelX = 0;
    ctx.fillStyle = rgba(c.cardBg, cardAlpha);
    ctx.fillRect(labelX, y0, COL_W, DAY_ROW_H);
    ctx.strokeStyle = lineColor;
    ctx.strokeRect(labelX, y0, COL_W, DAY_ROW_H);

    const isCurrentMonth = year === today.year && month === today.month;
    ctx.fillStyle = isCurrentMonth ? c.accent : c.text;
    ctx.font = `${isCurrentMonth ? '700' : '400'} 13px ${FONT_UI}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(monthName(month), labelX + COL_W / 2, y0 + DAY_ROW_H / 2);

    // 日格：日期数字按右下角绘制，需把 baseline 切回 alphabetic
    ctx.textBaseline = 'alphabetic';

    for (let day = 1; day <= days; day++) {
      const x0 = day * COL_W;
      const cellY = y0;
      const cmp = year < today.year ? -1
        : year > today.year ? 1
        : compareYMD({ year, month, day }, today);

      let bgHex, bgAlpha, textHex;
      if (cmp < 0) { bgHex = c.cellPast; bgAlpha = pastAlpha; textHex = c.cellPastText; }
      else if (cmp === 0) { bgHex = c.cellToday; bgAlpha = todayAlpha; textHex = c.accent; }
      else { bgHex = c.cellFuture; bgAlpha = futureAlpha; textHex = c.cellFutureText; }

      ctx.fillStyle = rgba(bgHex, bgAlpha);
      ctx.fillRect(x0, cellY, COL_W, DAY_ROW_H);
      ctx.strokeStyle = lineColor;
      ctx.strokeRect(x0, cellY, COL_W, DAY_ROW_H);

      // 主题 glyph 装饰：里程碑格与页面一致不绘制，居中占格宽 62%
      const ms = findMs(settings.milestones, month, day, year);
      const glyphKey = cmp === 0 ? 'today' : cmp < 0 ? 'past' : 'future';
      if (glyphCache[glyphKey] && ms.length === 0) {
        const size = COL_W * 0.62;
        ctx.drawImage(glyphCache[glyphKey], x0 + (COL_W - size) / 2, cellY + (DAY_ROW_H - size) / 2, size, size);
      }

      // 里程碑图标（优先）或日期数字；A4：达成态加 accent 描边，未达成半透明
      if (ms.length > 0 && iconCache[ms[0].icon]) {
        const m = ms[0];
        ctx.globalAlpha = m.done ? 1 : 0.6;
        const iconSize = 16;
        ctx.drawImage(iconCache[m.icon], x0 + (COL_W - iconSize) / 2, cellY + (DAY_ROW_H - iconSize) / 2, iconSize, iconSize);
        ctx.globalAlpha = 1;
        if (m.done) {
          ctx.strokeStyle = c.accent;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x0 + 0.75, cellY + 0.75, COL_W - 1.5, DAY_ROW_H - 1.5);
          ctx.lineWidth = LINE_W;
        }
      }

      if (settings.showNumbers !== false) {
        ctx.fillStyle = cmp === 0 ? c.accent : textHex;
        ctx.font = `${cmp === 0 ? '700' : '400'} 9px ${FONT_NUM}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(String(day), x0 + COL_W - 4, cellY + DAY_ROW_H - 4);
        ctx.textAlign = 'center';
      }
    }
  }

  ctx.restore(); // 解除裁剪

  // ---- 导出 ----
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob failed'));
    }, 'image/png');
  });
}

// ---- 辅助 ----

/** 按像素宽截断文本，超出加省略号（canvas 无自动省略） */
function truncateText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? text.slice(0, 1) : text.slice(0, lo) + '…';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function yearProgressRatio(today) {
  const daysTotal = isLeapYear(today.year) ? 366 : 365;
  const daysLived = diffDays({ year: today.year, month: 1, day: 1 }, today) + 1;
  return daysLived / daysTotal;
}

function findMs(milestones, month, day, year) {
  return milestones.filter(
    (m) => m.month === month && m.day === day && (m.year == null || m.year === year)
  );
}