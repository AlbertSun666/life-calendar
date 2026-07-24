// 新标签页主逻辑：渲染人生日历（年网格 + 当年的月日网格）

import { LIFE_YEARS, YEAR_COLS } from './lib/constants.js';
import { getSettings, saveSettings, onSettingsChanged, getBgImage } from './lib/storage.js';
import { resolveTheme } from './lib/theme-presets.js';
import { buildThemeCSS } from './lib/theme-css.js';
import {
  todayInZone,
  daysInMonth,
  parseISODate,
  compareYMD,
  diffDays,
  isLeapYear,
  lifeStats,
  formatNumber,
} from './lib/date.js';
import { createMilestoneIcon } from './lib/icons.js';
import { QUOTES } from './lib/quotes.js';
import { HISTORY } from './lib/history.js';
import { mountSettings } from './settings-panel.js';
import { setLanguage, t, currentLocale } from './lib/i18n.js';

const $ = (id) => document.getElementById(id);

let settings = null;
let todayKey = ''; // 当前渲染所用的「今天」，用于跨天检测
let viewYear = null; // 月份网格当前查看的年份；null = 今年

init();

async function init() {
  settings = await getSettings();
  setLanguage(settings.language);
  applyTheme(settings.theme);

  if (!parseISODate(settings.birthdate)) {
    showOnboarding();
  } else {
    renderPage();
  }

  bindEvents();

  // 开发预览：?settings=open 直接打开设置弹窗；?year=2022 切换年份视图
  if (IS_DEV) {
    const params = new URLSearchParams(location.search);
    if (params.get('settings') === 'open') openSettingsModal();
    const devYear = Number(params.get('year'));
    if (devYear >= 1900 && devYear <= 2200) {
      viewYear = devYear;
      if (parseISODate(settings.birthdate)) renderPage();
    }
  }
}

// 开发预览（无扩展环境）下支持 ?today=YYYY-MM-DD 模拟任意日期
const IS_DEV = typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync;

function resolveToday() {
  if (IS_DEV) {
    const parsed = parseISODate(new URLSearchParams(location.search).get('today'));
    if (parsed) return parsed;
  }
  return todayInZone(settings.timezone);
}

/* ---------- 主题 ---------- */

async function applyTheme(themeId) {
  const theme = resolveTheme(themeId, settings);

  // 背景图：用户可配置关闭；builtin 用包内资源，upload 从 storage.local 读（缺失则回退纯色）
  let bgUrl = null;
  if (theme.bg && settings.showBgImage !== false) {
    bgUrl = theme.bg.type === 'builtin' ? theme.bg.src : await getBgImage(theme.bg.src);
  }

  $('theme-style').textContent = buildThemeCSS(theme, bgUrl, settings.glass ?? 50);
  document.body.dataset.theme = theme.builtin ? theme.id : 'custom';
  document.body.dataset.glyph = theme.glyph || 'none';
}

/* ---------- 渲染 ---------- */

function renderPage() {
  const birth = parseISODate(settings.birthdate);
  if (!birth) return showOnboarding();

  const today = resolveToday();
  todayKey = `${today.year}-${today.month}-${today.day}`;

  // 标题与统计
  const title = settings.nickname
    ? t('title.withNickname', { name: settings.nickname })
    : t('app.title');
  $('title').textContent = title;
  document.title = title;

  const stats = lifeStats(birth, today);
  $('stats').textContent = t('stats.line', {
    lived: formatNumber(stats.lived, currentLocale()),
    remaining: formatNumber(stats.remaining, currentLocale()),
    percent: stats.percent.toFixed(1),
  });

  // 设置按钮的无障碍标签随语言
  $('settings-btn').setAttribute('aria-label', t('settings.aria'));
  $('settings-btn').title = t('settings.aria');

  document.body.classList.toggle('no-numbers', !settings.showNumbers);
  document.body.classList.toggle('no-age', !settings.showAge);

  buildLifeProgress(birth, today);
  buildGrid(birth, today);
  renderDaily(today);

  $('onboarding').hidden = true;
  $('page').hidden = false;
}

/** 构建整张表：5 行年 + 12 行月日，共用一个 32 列网格保证上下对齐 */
function buildGrid(birth, today) {
  const grid = $('grid');
  grid.textContent = '';

  const year = viewYear ?? today.year; // 月份网格当前展示的年份
  buildYearCells(grid, birth, today, year);
  buildMonthRows(grid, today, year);
}

function buildYearCells(grid, birth, today, year) {
  for (let i = 0; i < LIFE_YEARS; i++) {
    const y = birth.year + i;
    const cell = document.createElement('div');
    cell.className = 'cell year';
    cell.style.gridRow = String(1 + Math.floor(i / YEAR_COLS));
    cell.style.gridColumn = `${1 + (i % YEAR_COLS) * 2} / span 2`;

    if (y < today.year) cell.classList.add('past');
    else if (y === today.year) cell.classList.add('current');
    if (y === year) cell.classList.add('selected'); // 下方正在展示该年

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(y);
    cell.appendChild(num);

    // 年份下的年龄小字
    const age = document.createElement('span');
    age.className = 'age';
    age.textContent = t('age.short', { age: y - birth.year });
    cell.appendChild(age);

    // 今年格底部的年度进度条（今年已走过的比例）
    if (y === today.year) {
      const bar = document.createElement('span');
      bar.className = 'year-progress';
      const fill = document.createElement('i');
      fill.style.width = `${(yearProgressRatio(today) * 100).toFixed(1)}%`;
      bar.appendChild(fill);
      cell.appendChild(bar);
    }

    // 该年含一次性里程碑时，在角落标一个小点
    const hasMilestone = settings.milestones.some((m) => m.year === y);
    if (hasMilestone) {
      const dot = document.createElement('span');
      dot.className = 'ms-dot';
      cell.appendChild(dot);
    }
    cell.title =
      t('year.tip', { year: y, age: y - birth.year }) + (hasMilestone ? t('year.marked') : '');

    // 点击切换下方月份网格展示的年份；再次点击（或点今年）回到今年
    cell.addEventListener('click', () => {
      viewYear = y === year || y === today.year ? null : y;
      buildGrid(parseISODate(settings.birthdate), resolveToday());
    });

    grid.appendChild(cell);
  }
}

function buildMonthRows(grid, today, year) {
  for (let month = 1; month <= 12; month++) {
    const row = 5 + month; // 年网格占第 1-5 行

    // 月份标签格
    const label = document.createElement('div');
    label.className = 'cell label';
    label.style.gridRow = String(row);
    label.style.gridColumn = '1';
    if (year === today.year && month === today.month) label.classList.add('current');
    const labelNum = document.createElement('span');
    labelNum.className = 'num';
    labelNum.textContent = String(month);
    label.appendChild(labelNum);
    grid.appendChild(label);

    // 当月的每一天（天数随展示年份的闰平变化）
    const days = daysInMonth(year, month);
    for (let day = 1; day <= days; day++) {
      const cell = document.createElement('div');
      cell.className = 'cell day';
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(1 + day);

      // 展示非今年时整年统一置为过去/未来；今年则按今天推进
      if (year < today.year) cell.classList.add('past');
      else if (year > today.year) { /* future，默认样式 */ }
      else {
        const cmp = compareYMD({ year, month, day }, today);
        if (cmp < 0) cell.classList.add('past');
        else if (cmp === 0) cell.classList.add('today');
      }

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(day);
      cell.appendChild(num);

      cell.title = buildDayTitle(year, month, day);

      const milestones = findMilestones(month, day, year);
      if (milestones.length > 0) {
        cell.classList.add('milestone');
        cell.appendChild(createMilestoneIcon(milestones[0].icon));
      }

      grid.appendChild(cell);
    }
  }
}

/** 今年已走过的比例（含今天，0~1） */
function yearProgressRatio(today) {
  const daysTotal = isLeapYear(today.year) ? 366 : 365;
  const daysLived = diffDays({ year: today.year, month: 1, day: 1 }, today) + 1;
  return daysLived / daysTotal;
}

/** 人生进度条：80 段对应 80 个年格；已活的年份填满，今年按天部分填充 */
function buildLifeProgress(birth, today) {
  const el = $('life-progress');
  el.textContent = '';

  for (let i = 0; i < LIFE_YEARS; i++) {
    const y = birth.year + i;
    const seg = document.createElement('span');
    seg.className = 'seg';

    if (y < today.year) {
      seg.classList.add('lived');
    } else if (y === today.year) {
      const fill = document.createElement('i');
      fill.style.width = `${(yearProgressRatio(today) * 100).toFixed(1)}%`;
      seg.appendChild(fill);
    }

    el.appendChild(seg);
  }
}

/** 日格悬停提示：日期 + 里程碑 + 历史上的今天（多行） */
function buildDayTitle(year, month, day) {
  const lines = [`${year}-${pad(month)}-${pad(day)}`];

  const milestones = findMilestones(month, day, year);
  if (milestones.length > 0) {
    lines.push(milestones.map((m) => m.label || t('day.milestone')).join('、'));
  }

  const events = HISTORY.filter((e) => e.m === month && e.d === day);
  for (const e of events) {
    lines.push(yearLabel(e.y) + e.t);
  }

  return lines.join('\n');
}

/* ---------- 每日一句 / 历史上的今天 ---------- */

function renderDaily(today) {
  // 每日一句：按「一年中的第几天」取模轮换
  const quoteEl = $('quote');
  if (settings.showQuote) {
    const dayOfYear = diffDays({ year: today.year, month: 1, day: 1 }, today);
    const quote = QUOTES[dayOfYear % QUOTES.length];
    $('quote-text').textContent = quote.text;
    $('quote-author').textContent = `—— ${quote.author}`;
    quoteEl.hidden = false;
  } else {
    quoteEl.hidden = true;
  }

  // 历史上的今天：无事件的日期自动隐藏；标签文字随界面语言
  const historyEl = $('history');
  document.documentElement.style.setProperty('--history-tag', `"${t('history.tag')}"`);
  if (settings.showHistory) {
    const events = HISTORY.filter((e) => e.m === today.month && e.d === today.day);
    if (events.length > 0) {
      historyEl.textContent = events.map((e) => yearLabel(e.y) + e.t).join('；');
      historyEl.hidden = false;
    } else {
      historyEl.hidden = true;
    }
  } else {
    historyEl.hidden = true;
  }
}

function yearLabel(year) {
  if (year == null) return '';
  return year < 0 ? t('history.bce', { y: -year }) : t('history.ce', { y: year });
}

/** 匹配某月某日的里程碑：year 为 null 表示每年重复 */
function findMilestones(month, day, year) {
  return settings.milestones.filter(
    (m) => m.month === month && m.day === day && (m.year == null || m.year === year)
  );
}

/* ---------- 首次使用引导 ---------- */

function showOnboarding() {
  $('page').hidden = true;
  $('onboarding').hidden = false;
  // 引导文案随界面语言
  $('ob-title').textContent = t('app.title');
  document.title = t('app.title');
  $('ob-desc').textContent = t('ob.desc');
  $('ob-label').textContent = t('ob.birthdate');
  $('ob-submit').textContent = t('ob.submit');
  const input = $('ob-birthdate');
  const now = new Date();
  input.max = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  input.min = '1900-01-01';
  setTimeout(() => input.focus(), 50);
}

/* ---------- 事件 ---------- */

function bindEvents() {
  // 引导表单：保存出生日期后即渲染
  $('ob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = $('ob-birthdate').value;
    if (!parseISODate(value)) return;
    settings = await saveSettings({ birthdate: value });
    renderPage();
  });

  // 设置入口：打开悬浮弹窗
  $('settings-btn').addEventListener('click', openSettingsModal);
  $('settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettingsModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsModal();
  });

  // 设置页修改后实时套用
  onSettingsChanged((next) => {
    settings = next;
    setLanguage(settings.language);
    applyTheme(settings.theme);
    if (parseISODate(settings.birthdate)) renderPage();
    else showOnboarding();
  });

  // 跨天检测：轮询 + 切回标签页时立即检查
  setInterval(refreshIfNewDay, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshIfNewDay();
  });
}

/* ---------- 设置悬浮弹窗 ---------- */

let settingsMounted = false;

function openSettingsModal() {
  $('settings-overlay').hidden = false;
  if (!settingsMounted) {
    settingsMounted = true;
    mountSettings($('settings-root'), {
      showCloseButton: true,
      onClose: closeSettingsModal,
      onSaved: (next) => {
        // 保存后实时套用（扩展环境下 storage.onChanged 也会触发，二者幂等）
        settings = next;
        setLanguage(settings.language);
        applyTheme(settings.theme);
        if (parseISODate(settings.birthdate)) renderPage();
      },
    });
  }
}

function closeSettingsModal() {
  $('settings-overlay').hidden = true;
}

function refreshIfNewDay() {
  if (!settings || !parseISODate(settings.birthdate)) return;
  const today = resolveToday();
  const key = `${today.year}-${today.month}-${today.day}`;
  if (key !== todayKey) {
    viewYear = null; // 跨天后回到今年视图
    renderPage();
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}
