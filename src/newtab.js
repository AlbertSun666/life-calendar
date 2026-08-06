// 新标签页主逻辑：渲染人生日历（年网格 + 当年的月日网格）

import { LIFE_YEARS, YEAR_COLS, LIFE_STAGES } from './lib/constants.js';
import { getSettings, saveSettings, onSettingsChanged, getBgImage, getCapsules, saveCapsules } from './lib/storage.js';
import { resolveTheme, allThemes, THEME_PRESETS } from './lib/theme-presets.js';
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
import { glyphDataURI } from './lib/glyphs.js';
import { QUOTES, quoteOfDay } from './lib/quotes.js';
import { HISTORY, historyForLang } from './lib/history.js';
import { notableOfDay } from './lib/notables.js';
import { mountSettings } from './settings-panel.js';
import { LANGUAGES, getLanguage, setLanguage, t, currentLocale, monthName, monthNameVertical } from './lib/i18n.js';

const $ = (id) => document.getElementById(id);

// 开发预览（无扩展环境）判定：?today= 模拟日期、?settings=open 开弹窗，服务截图验证工作流
const IS_DEV = typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync;

let settings = null;
let todayKey = ''; // 当前渲染所用的「今天」，用于跨天检测
let viewYear = null; // 月份网格当前查看的年份；null = 今年
let obPreviewTheme = 'default'; // F-11：引导卡预览中的选中主题
let realSettingsSnapshot = null; // H1：演示模式临时替换 settings 时的真实快照
let drillYear = null; // V1：钻取视图展示的年份；null = 未钻取
let drillMonth = null; // V1：钻取视图当前月份；null = 未选月（显示12月格概览）

init();

async function init() {
  settings = await getSettings();
  setLanguage(settings.language);
  applyTheme(settings.theme);
  buildLangMenu();

  if (!parseISODate(settings.birthdate)) {
    showOnboarding();
  } else {
    renderPage();
  }

  // 开发预览：?drill=YYYY-MM 直接进入钻取视图
  if (IS_DEV) applyDevDrillParam();

  bindEvents();

  // 开发预览：?settings=open 直接打开设置弹窗（无头截图无法点击，以此截取弹窗态）
  if (IS_DEV && new URLSearchParams(location.search).get('settings') === 'open') {
    openSettingsModal();
    // 截图验证辅助：自动滚动到指定区块（?scroll=data / ?scroll=cap）
    const scrollTarget = new URLSearchParams(location.search).get('scroll');
    const SCROLL_TITLES = {
      data: ['数据', '資料', 'データ', '데이터', 'Data'],
      cap: ['时间胶囊', '時間膠囊', 'タイムカプセル', '타임캡슐', 'Time capsule'],
    };
    if (SCROLL_TITLES[scrollTarget]) {
      setTimeout(() => {
        const titles = SCROLL_TITLES[scrollTarget];
        const sections = Array.from(document.querySelectorAll('.sp-section'));
        const sec = sections.find((s) => {
          const h = s.querySelector('.sp-section-title');
          return h && titles.includes(h.textContent.trim());
        });
        sec?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 300);
    }
  }
}

/** 保存设置；失败（配额超限等，TD-03）时保持当前设置不变并向用户告警 */
async function trySaveSettings(patch) {
  try {
    settings = await saveSettings(patch);
  } catch (err) {
    console.error('[life-calendar] 保存设置失败:', err);
    window.alert(t('sp.saveFailed'));
  }
  return settings;
}

function resolveToday() {
  // ?today=YYYY-MM-DD 模拟任意日期（仅开发预览生效）
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

  // 标题上方的主题图标三连：过去色 / 今天色 / 未来色
  const trio = $('title-glyphs');
  const hasGlyph = theme.glyph && theme.glyph !== 'none';
  trio.hidden = !hasGlyph;
  if (hasGlyph) {
    const [past, today, future] = trio.querySelectorAll('.tg');
    past.style.backgroundImage = glyphDataURI(theme.glyph, theme.colors.cellPast, false);
    today.style.backgroundImage = glyphDataURI(theme.glyph, theme.colors.accent, true);
    future.style.backgroundImage = glyphDataURI(theme.glyph, theme.colors.cellFuture, false);
  }
}

/* ---------- 渲染 ---------- */

function renderPage() {
  const birth = parseISODate(settings.birthdate);
  if (!birth) return showOnboarding();

  const today = resolveToday();
  todayKey = `${today.year}-${today.month}-${today.day}`;

  // F-08：跨年 / 生日复盘卡触发检查（生日优先）
  checkReviewTrigger(birth, today);

  // B1：时间胶囊解锁检查（与复盘卡互斥：同次加载只弹一张卡，复盘卡优先）
  checkCapsuleUnlock(today);

  // 标题与统计
  const title = settings.nickname
    ? t('title.withNickname', { name: settings.nickname })
    : t('app.title');
  $('title').textContent = title;
  document.title = title;

  const stats = lifeStats(birth, today);
  // 数字用 .num 包裹以便主题色凸显（值为自生成数字，无注入风险）
  const num = (v) => `<b class="num">${v}</b>`;
  // G1：统计单位切换——天/周/月，只动统计行不动网格签名
  const unit = settings.statsUnit || 'day';
  if (unit === 'week') {
    $('stats').innerHTML = t('stats.line.week', {
      lived: num(formatNumber(Math.floor(stats.lived / 7), currentLocale())),
      remaining: num(formatNumber(Math.floor(stats.remaining / 7), currentLocale())),
      percent: num(stats.percent.toFixed(1)),
    });
  } else if (unit === 'month') {
    $('stats').innerHTML = t('stats.line.month', {
      lived: num(formatNumber(Math.floor(stats.lived / 30.4375), currentLocale())),
      remaining: num(formatNumber(Math.floor(stats.remaining / 30.4375), currentLocale())),
      percent: num(stats.percent.toFixed(1)),
    });
  } else {
    $('stats').innerHTML = t('stats.line', {
      lived: num(formatNumber(stats.lived, currentLocale())),
      remaining: num(formatNumber(stats.remaining, currentLocale())),
      percent: num(stats.percent.toFixed(1)),
    });
  }

  // 设置按钮的无障碍标签随语言
  $('settings-btn').setAttribute('aria-label', t('settings.aria'));
  $('settings-btn').title = t('settings.aria');

  document.body.classList.toggle('no-numbers', !settings.showNumbers);
  document.body.classList.toggle('no-age', !settings.showAge);

  buildLifeProgress(birth, today);
  buildStageBar(birth, today);
  buildGrid(birth, today);
  updateDrillEntry();
  renderDaily(today);
  renderCountdown(birth, today);
  renderRitual(birth, today);
  renderNotable(birth, today);

  $('onboarding').hidden = true;
  $('page').hidden = false;

  renderThemeBar();
}

/** 顶栏主题切换：显示全部主题（预制 + 自定义），点击即切换 */
function renderThemeBar() {
  const bar = $('theme-bar');
  bar.textContent = '';

  for (const theme of allThemes(settings)) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'theme-pill' + (theme.id === settings.theme ? ' active' : '');
    pill.textContent = theme.builtin ? t(`theme.${theme.id}`) : theme.name;
    pill.setAttribute('aria-pressed', String(theme.id === settings.theme));
    pill.addEventListener('click', async () => {
      if (theme.id === settings.theme) return;
      settings = await trySaveSettings({ theme: theme.id });
      applyTheme(settings.theme);
      renderThemeBar();
    });
    bar.appendChild(pill);
  }
}

/** 构建整张表：5 行年 + 12 行月日，共用一个 32 列网格保证上下对齐 */
function buildGrid(birth, today) {
  const grid = $('grid');
  grid.textContent = '';

  const year = viewYear ?? today.year; // 月份网格当前展示的年份
  buildYearCells(grid, birth, today, year);
  buildMonthRows(grid, birth, today, year);
}

function buildYearCells(grid, birth, today, year) {
  for (let i = 0; i < LIFE_YEARS; i++) {
    const y = birth.year + i;
    const cell = document.createElement('div');
    cell.className = 'cell year';
    cell.style.gridRow = String(1 + Math.floor(i / YEAR_COLS));
    cell.style.gridColumn = `${1 + (i % YEAR_COLS) * 2} / span 2`;
    // F-05：年格可聚焦，配合方向键键盘导航
    cell.tabIndex = 0;
    cell.dataset.year = String(y);

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

    // 该年含一次性里程碑时，在角落标一个小点（A4：该年全部达成用实心点）
    const yearMss = settings.milestones.filter((m) => m.year === y);
    if (yearMss.length > 0) {
      const allDone = yearMss.every((m) => m.done);
      const dot = document.createElement('span');
      dot.className = 'ms-dot' + (allDone ? ' done' : '');
      cell.appendChild(dot);
    }
    cell.title =
      t('year.tip', { year: y, age: y - birth.year }) + (yearMss.length > 0 ? t('year.marked') : '');

    // 点击切换下方月份网格展示的年份；再次点击（或点今年）回到今年
    cell.addEventListener('click', () => switchYear(y, year, birth, today));

    grid.appendChild(cell);
  }
}

/** 切换下方月份网格展示的年份；再次点同一格（或今年）回到今年 */
function switchYear(y, year, birth, today) {
  viewYear = y === year || y === today.year ? null : y;
  buildGrid(birth, today);
  // 焦点还给当前展示年份的年格，键盘操作可以连续进行
  const focusYear = viewYear ?? today.year;
  const target = $('grid').querySelector(`.cell.year[data-year="${focusYear}"]`);
  if (target) target.focus();
  updateDrillEntry();
  updateDrillUrl();
}

/* ---------- V1：层级钻取 ---------- */

/** 钻取入口按钮：viewYear 不为 null（正在看某年）时显示「查看月历」 */
function updateDrillEntry() {
  const entry = $('drill-entry');
  if (viewYear !== null && drillYear === null) {
    entry.textContent = t('drill.viewCalendar');
    entry.hidden = false;
  } else {
    entry.hidden = true;
  }
}

/** 进入钻取视图：上方年份数字+12月格，下方经典周历 */
function openDrill(year, today) {
  drillYear = year;
  drillMonth = null;
  $('grid').closest('.card').hidden = true;
  $('drill-view').hidden = false;
  $('drill-back').focus();
  renderDrill(today);
  updateDrillUrl();
}

/** 退出钻取视图，回层级 0 */
function closeDrill(birth, today) {
  drillYear = null;
  drillMonth = null;
  $('drill-view').hidden = true;
  $('grid').closest('.card').hidden = false;
  buildGrid(birth, today);
  updateDrillEntry();
  updateDrillUrl();
  const focusYear = viewYear ?? today.year;
  const target = $('grid').querySelector(`.cell.year[data-year="${focusYear}"]`);
  if (target) target.focus();
  else $('settings-btn').focus();
}

/** 渲染钻取视图：年份标题 + 12 月格 + 当前月周历 */
function renderDrill(today) {
  const year = drillYear;
  $('drill-year').textContent = String(year);
  $('drill-back').textContent = t('drill.back');

  // 12 月格（4×3）
  const monthsEl = $('drill-months');
  monthsEl.textContent = '';
  for (let m = 1; m <= 12; m++) {
    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'drill-month' + (drillMonth === m ? ' active' : '');
    if (year === today.year && m === today.month) seg.classList.add('current');
    seg.dataset.month = String(m);
    seg.setAttribute('aria-label', t('ms.yearly', { month: m, day: 1 }).replace('1日', ''));
    seg.innerHTML = `<span class="dm-num">${m}</span><span class="dm-name">${monthName(m)}</span>`;
    seg.addEventListener('click', () => {
      drillMonth = m;
      renderDrill(today);
      updateDrillUrl();
    });
    monthsEl.appendChild(seg);
  }

  // 下方周历（钻取当前选中月，无则默认当月或 1 月）
  const showMonth = drillMonth ?? (year === today.year ? today.month : 1);
  if (!drillMonth) drillMonth = showMonth;
  renderDrillCalendar(year, showMonth, today);
}

/** 经典月历：7 列周一起始，本周整行 accent 描边 */
function renderDrillCalendar(year, month, today) {
  const cal = $('drill-calendar');
  cal.textContent = '';
  cal.dataset.year = String(year);
  cal.dataset.month = String(month);

  // 星期表头（周一起始）
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  for (const wd of weekdays) {
    const h = document.createElement('div');
    h.className = 'dc-head';
    h.textContent = t(`weekday.${wd}`);
    cal.appendChild(h);
  }

  // 计算该月第一天是星期几（0=周日，转成周一起始：1=周一...7=周日）
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // 周一起始的偏移
  const days = daysInMonth(year, month);

  // 本周的起止日期（用于整行描边）
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day);
  const weekStart = new Date(todayUTC - ((todayUTC - Date.UTC(1970, 0, 5)) % 7) * 86400000); // 周一为起
  const weekEnd = weekStart.getTime() + 6 * 86400000;

  // 空白格
  for (let i = 0; i < offset; i++) {
    const blank = document.createElement('div');
    blank.className = 'dc-day blank';
    cal.appendChild(blank);
  }

  // 日期格
  for (let day = 1; day <= days; day++) {
    const cell = document.createElement('div');
    cell.className = 'dc-day';
    const cellUTC = Date.UTC(year, month - 1, day);
    const cmp = year < today.year ? -1 : year > today.year ? 1 : compareYMD({ year, month, day }, today);

    if (cmp < 0) cell.classList.add('past');
    else if (cmp === 0) cell.classList.add('today');
    if (year === today.year && month === today.month && cellUTC >= weekStart.getTime() && cellUTC <= weekEnd) {
      cell.classList.add('this-week'); // 本周整行 accent
    }

    // 里程碑
    const ms = findMilestones(month, day, year);
    if (ms.length > 0) {
      cell.classList.add('milestone');
      if (ms[0].done) cell.classList.add('milestone-done');
      cell.appendChild(createMilestoneIcon(ms[0].icon));
    }

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(day);
    if (cmp === 0) num.classList.add('today-num');
    cell.appendChild(num);

    cell.title = buildDayTitle(year, month, day);
    cal.appendChild(cell);
  }
}

/** F-05：键盘导航年格（方向键移动选中，Enter 切月表，Esc 回今年）。
    委托绑定一次，避免 buildGrid 重建时重复挂监听。 */
function bindGridKeydown() {
  const grid = $('grid');
  grid.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.classList.contains('cell') || !el.classList.contains('year')) return;

    const birth = parseISODate(settings.birthdate);
    const today = resolveToday();
    const year = viewYear ?? today.year; // 当前下方展示的年份
    const years = Array.from({ length: LIFE_YEARS }, (_, i) => birth.year + i);
    const idx = years.indexOf(Number(el.dataset.year));
    if (idx < 0) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      switchYear(years[idx], year, birth, today);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // 阻止冒泡到 document 级 Esc（关闭设置弹窗/语言菜单）
      if (viewYear !== null) switchYear(years[idx], year, birth, today); // 切回今年
      return;
    }

    let next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + YEAR_COLS;
    else if (e.key === 'ArrowUp') next = idx - YEAR_COLS;
    else return;
    e.preventDefault();
    if (next < 0 || next >= LIFE_YEARS) return;
    grid.querySelector(`.cell.year[data-year="${years[next]}"]`).focus();
  });
}

function buildMonthRows(grid, birth, today, year) {
  for (let month = 1; month <= 12; month++) {
    const row = 5 + month; // 年网格占第 1-5 行

    // 月份标签格：角标数字（右下角）+ 中部月名（随界面语言）
    const label = document.createElement('div');
    label.className = 'cell label';
    label.style.gridRow = String(row);
    label.style.gridColumn = '1';
    if (year === today.year && month === today.month) label.classList.add('current');

    const labelNum = document.createElement('span');
    labelNum.className = 'num';
    labelNum.textContent = String(month);
    label.appendChild(labelNum);

    const labelName = document.createElement('span');
    labelName.className = 'name';
    const name = monthName(month);
    labelName.textContent = name;
    if (monthNameVertical(month)) {
      labelName.classList.add('vertical');
      if (name.length >= 3) labelName.classList.add('compact'); // 三字名收紧防折行
    }
    label.appendChild(labelName);

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
        else if (cmp === 0) {
          cell.classList.add('today');
          // B7：生日当天今天格增强 accent 光晕
          if (birth.month === month && birth.day === day) cell.classList.add('birthday');
          // B7：1 月 1 日「这一年的第一格」
          if (month === 1 && day === 1) cell.classList.add('newyear');
        }
      }

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(day);
      cell.appendChild(num);

      cell.title = buildDayTitle(year, month, day);

      const milestones = findMilestones(month, day, year);
      if (milestones.length > 0) {
        const ms = milestones[0];
        cell.classList.add('milestone');
        // A4：达成态——达成格不再着色为未完成空色，而是亮 accent 描边
        if (ms.done) cell.classList.add('milestone-done');
        cell.appendChild(createMilestoneIcon(ms.icon));
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

/* ---------- F-07：生命阶段带 ---------- */

/** 渲染生命阶段带：5 段按年龄跨度比例占宽，当前阶段高亮 */
function buildStageBar(birth, today) {
  const el = $('stage-bar');
  if (!settings.showStages) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = '';

  const currentAge = today.year - birth.year;
  const totalYears = LIFE_YEARS; // 80

  for (const stage of LIFE_STAGES) {
    const span = stage.end - stage.start + 1;
    const seg = document.createElement('span');
    seg.className = 'stage-seg';
    // 按年龄跨度占整带精确比例（与年格 80 段等宽对齐，gap 由 flex-basis 内消化）
    seg.style.flexBasis = ((span / LIFE_YEARS) * 100).toFixed(3) + '%';
    seg.style.flexGrow = '0';
    seg.style.flexShrink = '0';
    seg.dataset.stage = stage.id;

    if (currentAge >= stage.start && currentAge <= stage.end) {
      seg.classList.add('current');
    }

    const name = document.createElement('span');
    name.className = 'stage-name';
    name.textContent = t(`stage.${stage.id}`);
    seg.appendChild(name);

    seg.title = t('stage.tip', { name: t(`stage.${stage.id}`), start: stage.start, end: stage.end });
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

  const events = historyForLang(getLanguage()).filter((e) => e.m === month && e.d === day);
  for (const e of events) {
    lines.push(yearLabel(e.y) + e.t);
  }

  return lines.join('\n');
}

/* ---------- 每日一句 / 历史上的今天 ---------- */

function renderDaily(today) {
  // 每日一句：按「一年中的第几天」取模轮换（B4：按当前语言取当地名言池）
  const quoteEl = $('quote');
  if (settings.showQuote) {
    const dayOfYear = diffDays({ year: today.year, month: 1, day: 1 }, today);
    const quote = quoteOfDay(getLanguage(), dayOfYear);
    $('quote-text').textContent = quote.text;
    $('quote-author').textContent = `—— ${quote.author}`;
    quoteEl.hidden = false;
  } else {
    quoteEl.hidden = true;
  }

  // 历史上的今天：无事件的日期自动隐藏；B5 按当前语言取当地事件池
  const historyEl = $('history');
  document.documentElement.style.setProperty('--history-tag', `"${t('history.tag')}"`);
  if (settings.showHistory) {
    const events = historyForLang(getLanguage()).filter((e) => e.m === today.month && e.d === today.day);
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

/** 判定里程碑在当前展示年份下是否已达成。
 *  一次性里程碑：doneAt 有值即达成；
 *  每年重复里程碑：doneAt 等于展示年份才视为本年度已达成（跨年自动重置）。 */
function isMilestoneDone(m, year) {
  if (!m.done && !m.doneAt) return false;
  if (m.year != null) return !!m.doneAt;
  return String(m.doneAt) === String(year);
}

/** 匹配某月某日的里程碑：year 为 null 表示每年重复 */
function findMilestones(month, day, year) {
  return settings.milestones
    .filter((m) => m.month === month && m.day === day && (m.year == null || m.year === year))
    .map((m) => ({ ...m, done: isMilestoneDone(m, year) }));
}

/* ---------- F-09：纪念日倒计时 ---------- */

/** 算某个里程碑「下一次到来」的日期；已永久过去的返回 null。
 *  每年重复：取今年该月该日，已过则取明年；2/29 在平年顺延到 2/28。
 *  一次性：该日期 >= 今天才返回，否则 null。 */
function nextMilestoneDate(m, today) {
  if (m.year == null) {
    // 每年重复
    for (const yr of [today.year, today.year + 1]) {
      const day = Math.min(m.day, daysInMonth(yr, m.month)); // 2/29 平年→2/28
      const date = { year: yr, month: m.month, day };
      if (compareYMD(date, today) >= 0) return date;
    }
    return null;
  }
  // 一次性
  const date = { year: m.year, month: m.month, day: m.day };
  return compareYMD(date, today) >= 0 ? date : null;
}

/** 渲染倒计时：距下一个里程碑的天数，无则隐藏 */
function renderCountdown(birth, today) {
  const el = $('countdown');
  const candidates = settings.milestones
    .map((m) => ({ m, date: nextMilestoneDate(m, today) }))
    .filter((c) => c.date);

  if (candidates.length === 0) {
    el.hidden = true;
    return;
  }

  // 取最近的
  candidates.sort((a, b) => compareYMD(a.date, b.date));
  const { m, date } = candidates[0];
  const n = diffDays(today, date);
  const label = m.label || t('day.milestone');

  if (n === 0) {
    el.textContent = t('countdown.today', { label });
  } else {
    const base = t('countdown.days', { label, n });
    if (n <= 7) {
      el.innerHTML = escapeHtml(base) + ` <span class="soon">${escapeHtml(t('countdown.soon'))}</span>`;
    } else {
      el.textContent = base;
    }
  }
  el.hidden = false;
}

/* ---------- B7：生日 / 新年特别呈现 ---------- */

/** 生日当天与 1 月 1 日在统计行下方显示专属文案，每年一次的安静仪式 */
function renderRitual(birth, today) {
  const el = $('ritual');
  const isBirthday = birth.month === today.month && birth.day === today.day;
  const isNewYear = today.month === 1 && today.day === 1;
  if (isBirthday) {
    const age = today.year - birth.year;
    el.textContent = t('ritual.birthday', { age });
    el.hidden = false;
  } else if (isNewYear) {
    el.textContent = t('ritual.newyear');
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

/* ---------- B6：同龄人名人对照 ---------- */

/** 统计行下方一行：按用户当前年龄匹配名人当年事件，每日轮换 */
function renderNotable(birth, today) {
  const el = $('notable');
  const age = today.year - birth.year;
  const dayOfYear = diffDays({ year: today.year, month: 1, day: 1 }, today);
  const notable = notableOfDay(getLanguage(), age, dayOfYear);
  if (notable) {
    el.textContent = t('notable.line', { age: notable.age, name: notable.name, event: notable.event });
    el.title = notable.source ? `${notable.name} · ${notable.year} · 来源：${notable.source}` : '';
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

/* ---------- F-08：年度复盘卡 ---------- */

/** 检查是否需要弹出复盘卡：生日优先于跨年；展示后写回标记，同一次 render 只弹一张。
 *  跨年复盘只在 1 月触发（跨年时刻的仪式）；其余时间想看可点设置面板「查看年度复盘」。
 *  推迟提醒：用户点「7 天后再提醒」后，lastReviewYear 先设为推迟前的年份，并把 snoozeUntil
 *  设为 7 天后；snooze 期间不再弹出。 */
function checkReviewTrigger(birth, today) {
  const disabled = settings.reviewDisabled || {};
  const isBirthday =
    today.month === birth.month && today.day === birth.day &&
    today.year > (settings.lastBirthdayReviewYear || 0) &&
    !disabled.birthday;
  if (isBirthday) {
    showReviewCard('birthday', today.year, birth);
    trySaveSettings({ lastBirthdayReviewYear: today.year });
    return;
  }
  const snoozeUntil = settings.reviewSnoozeUntil ? parseISODate(settings.reviewSnoozeUntil) : null;
  const isSnoozed = snoozeUntil && compareYMD(today, snoozeUntil) < 0;
  const isNewYear =
    today.month === 1 &&
    today.year > (settings.lastReviewYear || 0) &&
    !disabled.year &&
    !isSnoozed;
  if (isNewYear) {
    showReviewCard('year', today.year - 1, birth);
    trySaveSettings({ lastReviewYear: today.year });
  }
}

/** 渲染并展示复盘卡
 *  type: 'year'（跨年复盘 lastYear）| 'birthday'（生日复盘今年）
 *  year: 复盘的目标年份；birth 用于算年龄 */
function showReviewCard(type, year, birth) {
  const overlay = $('review-overlay');
  const card = $('review-card');

  const age = year - birth.year;
  const stats = lifeStats(birth, { year, month: 12, day: 31 });
  const titleText = type === 'birthday'
    ? t('review.birthdayTitle', { age })
    : t('review.yearTitle', { year });

  // 该年的里程碑：一次性（year 匹配）+ 每年重复
  const yearMilestones = settings.milestones.filter(
    (m) => m.year == null || m.year === year
  );
  const sorted = [...yearMilestones].sort(
    (a, b) => a.month - b.month || a.day - b.day || (a.year || 0) - (b.year || 0)
  );

  let msHtml;
  if (sorted.length === 0) {
    msHtml = `<p class="review-ms-empty">${escapeHtml(t('review.noMilestones'))}</p>`;
  } else {
    msHtml = `<ul class="review-ms-list">` + sorted.map((m) => {
      const dateStr = m.year == null
        ? t('ms.yearly', { month: m.month, day: m.day })
        : t('ms.onceday', { year: m.year, month: m.month, day: m.day });
      return `<li class="review-ms-item"><span class="review-ms-date">${escapeHtml(dateStr)}</span><span class="review-ms-label">${escapeHtml(m.label || t('day.milestone'))}</span></li>`;
    }).join('') + `</ul>`;
  }

  const disabledKey = type === 'birthday' ? 'birthday' : 'year';
  // 进度百分比数字单独高亮：t() 只传纯文本，外层再拆分（HTML 一律由 escapeHtml 生成）
  const progressText = t('review.progressLine', { age, percent: stats.percent.toFixed(1) });
  const percentMark = stats.percent.toFixed(1) + '%';
  const progressHtml = escapeHtml(progressText).replace(
    percentMark,
    `<span class="num">${escapeHtml(percentMark)}</span>`
  );
  card.innerHTML = `
    <h2 class="review-title">${escapeHtml(titleText)}</h2>
    <p class="review-progress">${progressHtml}</p>
    <p class="review-ms-head">${escapeHtml(t('review.milestonesHead'))}</p>
    ${msHtml}
    <div class="review-actions">
      <button class="review-close" type="button">${escapeHtml(t('review.close'))}</button>
      ${type === 'year' ? `<button class="review-snooze" type="button">${escapeHtml(t('review.snooze'))}</button>` : ''}
      <label class="review-dont-remind"><input type="checkbox" data-review-disable="${disabledKey}"><span>${escapeHtml(t('review.dontRemind'))}</span></label>
    </div>
  `;

  overlay.hidden = false;

  // 关闭按钮
  card.querySelector('.review-close').addEventListener('click', () => closeReviewCard());
  // 7 天后提醒（仅跨年复盘）
  const snoozeBtn = card.querySelector('.review-snooze');
  if (snoozeBtn) {
    snoozeBtn.addEventListener('click', () => {
      // 推迟：lastReviewYear 回退一年（让下一年仍可触发），并设置 snoozeUntil 为 7 天后
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const snoozeUntil = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      trySaveSettings({ lastReviewYear: year, reviewSnoozeUntil: snoozeUntil });
      closeReviewCard();
    });
  }
  // 不再提醒
  card.querySelector('[data-review-disable]').addEventListener('change', (e) => {
    const key = e.target.dataset.reviewDisable;
    const patch = { reviewDisabled: { ...(settings.reviewDisabled || {}), [key]: e.target.checked } };
    // 用户主动选择「不再提醒」时清空 snooze
    if (e.target.checked) patch.reviewSnoozeUntil = '';
    trySaveSettings(patch);
  });
}

function closeReviewCard() {
  $('review-overlay').hidden = true;
}

/* ---------- B1：时间胶囊 ---------- */

/** 到期检测：今天 >= 解锁日期且未开启的最早一枚；复盘卡已弹时不再叠加 */
async function checkCapsuleUnlock(today) {
  if (!$('review-overlay').hidden) return; // 复盘卡优先，胶囊下次再遇
  const capsules = await getCapsules();
  const due = capsules
    .filter((c) => !c.opened && compareYMD(parseISODate(c.unlockDate) || { year: 9999, month: 12, day: 31 }, today) <= 0)
    .sort((a, b) => a.unlockDate < b.unlockDate ? -1 : 1);
  if (due.length === 0) return;
  showCapsuleCard(due[0]);
}

let openCapsuleId = null; // 当前展示中的胶囊 id（关闭时标记 opened 用）

/** 展示解锁卡：过去写下的原文 + 封存日期；关闭后标记已开启 */
function showCapsuleCard(capsule) {
  const overlay = $('capsule-overlay');
  const card = $('capsule-card');
  openCapsuleId = capsule.id;
  card.innerHTML = `
    <h2 class="capsule-title">${escapeHtml(t('cap.unlockTitle'))}</h2>
    <p class="capsule-from">${escapeHtml(t('cap.fromPast', { date: capsule.createdAt.slice(0, 10) }))}</p>
    <p class="capsule-text">${escapeHtml(capsule.text)}</p>
    <div class="capsule-actions">
      <button class="capsule-close" type="button">${escapeHtml(t('cap.close'))}</button>
    </div>
  `;
  overlay.hidden = false;

  card.querySelector('.capsule-close').addEventListener('click', closeCapsuleCard);
  overlay.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCapsuleCard();
  });
}

/** 关闭解锁卡并标记该胶囊已开启（开启日期即今天遇见的日子） */
async function closeCapsuleCard() {
  if (!openCapsuleId) return;
  const id = openCapsuleId;
  openCapsuleId = null;
  $('capsule-overlay').hidden = true;
  const capsules = await getCapsules();
  await saveCapsules(capsules.map((c) => (c.id === id ? { ...c, opened: true } : c)));
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
  $('ob-demo-btn').textContent = t('ob.demo');
  const input = $('ob-birthdate');
  const now = new Date();
  input.max = `${now.getFullYear()}-12-31`;
  input.min = '1949-01-01';

  // F-11：主题预览——点击切换预制主题色样，提交时一并保存
  obPreviewTheme = 'default';
  buildObThemePreview();
  $('ob-preview-label').textContent = t('ob.themePreview');
  $('ob-theme-preview').hidden = false;

  // F-11：时区提示——检测浏览器时区，温和提醒可在设置中修改
  buildObTzHint();

  // H1：演示模式——点击「先看看效果」渲染示例网格，不写入存储
  $('ob-preview').hidden = true;
  $('ob-form').hidden = false;

  setTimeout(() => input.focus(), 50);
}

/* ---------- H1：演示模式 ---------- */

/** 用示例生日（1990-06-15）渲染一张静态人生表预览，不写入存储，点返回回引导表单。
 *  借用主页 #page 渲染链路（主题/网格/统计），但用临时 settings，返回后恢复——零存储副作用。 */
function showDemoPreview() {
  $('onboarding').hidden = true;
  $('ob-preview-back-wrap')?.remove();
  // 返回按钮浮在页面底部
  const backWrap = document.createElement('div');
  backWrap.id = 'ob-preview-back-wrap';
  backWrap.className = 'ob-preview-back-wrap';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'ob-preview-back';
  backBtn.textContent = t('ob.demoBack');
  backBtn.addEventListener('click', () => {
    backWrap.remove();
    // 恢复真实 settings 与主题
    settings = realSettingsSnapshot;
    if (parseISODate(settings.birthdate)) renderPage();
    else showOnboarding();
  });
  backWrap.appendChild(backBtn);
  document.body.appendChild(backWrap);

  // 快照真实 settings，临时替换为演示 settings（不写入存储）
  const demoSettings = {
    ...settings,
    birthdate: '1990-06-15',
    nickname: '',
    theme: obPreviewTheme || 'default',
    showNumbers: true,
    showAge: true,
    showStages: true,
    showQuote: false,
    showHistory: false,
    milestones: [],
  };
  realSettingsSnapshot = settings;
  settings = demoSettings;
  applyTheme(demoSettings.theme);
  renderPage();
}

/** 渲染引导卡主题色样三连（过去色 / 强调色 / 未来色），点击循环选中 */
function buildObThemePreview() {
  const container = $('ob-swatches');
  container.textContent = '';
  for (const theme of THEME_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ob-swatch' + (theme.id === obPreviewTheme ? ' active' : '');
    btn.dataset.theme = theme.id;

    const dots = document.createElement('span');
    dots.className = 'dots';
    const c = theme.colors;
    for (const color of [c.cellPast, c.accent, c.cellFuture]) {
      const dot = document.createElement('i');
      dot.style.background = color;
      dots.appendChild(dot);
    }
    btn.appendChild(dots);

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t(`theme.${theme.id}`);
    btn.appendChild(name);

    btn.addEventListener('click', () => {
      obPreviewTheme = theme.id;
      buildObThemePreview();
    });
    container.appendChild(btn);
  }
}

/** 渲染时区提示：检测浏览器时区并显示 */
function buildObTzHint() {
  const el = $('ob-tz-hint');
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      el.textContent = t('ob.tzHint', { tz }) + ' ' + t('ob.tzMismatch');
      el.hidden = false;
      return;
    }
  } catch {
    // 部分环境无 Intl，静默隐藏
  }
  el.hidden = true;
}

/* ---------- 事件 ---------- */

function bindEvents() {
  // 引导表单：保存出生日期 + 预览选中的主题后即渲染
  $('ob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = $('ob-birthdate').value;
    if (!parseISODate(value)) return;
    settings = await trySaveSettings({ birthdate: value, theme: obPreviewTheme });
    if (parseISODate(settings.birthdate)) renderPage();
  });

  // H1：演示模式——先看看效果（不写入存储）
  $('ob-demo-btn').addEventListener('click', showDemoPreview);

  // 语言切换
  $('lang-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLangMenu();
  });
  document.addEventListener('click', (e) => {
    if (!$('lang-menu').contains(e.target) && e.target !== $('lang-btn')) {
      closeLangMenu();
    }
  });

  // F-05：年格键盘导航（委托绑定，仅一次）
  bindGridKeydown();

  // V1：钻取入口与退出
  $('drill-entry').addEventListener('click', () => {
    if (viewYear !== null) openDrill(viewYear, resolveToday());
  });
  $('drill-back').addEventListener('click', () => {
    closeDrill(parseISODate(settings.birthdate), resolveToday());
  });

  // 设置入口：打开悬浮弹窗（遮罩点击关闭只在弹窗挂载时绑定一次，见 openSettingsModal）
  $('settings-btn').addEventListener('click', openSettingsModal);

  // F-08：复盘卡遮罩点击关闭 + Esc 关闭
  $('review-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeReviewCard();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // B1：胶囊卡打开时 Esc 关闭并标记已开启
      if (openCapsuleId) {
        closeCapsuleCard();
        return;
      }
      // V1：钻取视图打开时，Esc 优先退出钻取
      if (drillYear !== null) {
        closeDrill(parseISODate(settings.birthdate), resolveToday());
        return;
      }
      closeSettingsModal();
      closeReviewCard();
      closeLangMenu();
    }
  });

  // V1：钻取视图键盘导航（月份选择 + 月历内方向键移动焦点）
  $('drill-view').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const active = document.activeElement;
      if (active?.classList.contains('drill-month')) {
        e.preventDefault();
        const months = Array.from($('drill-months').children);
        const idx = months.indexOf(active);
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        if (next >= 0 && next < months.length) months[next].focus();
      }
    }
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

/* ---------- 语言切换 ---------- */

function buildLangMenu() {
  const menu = $('lang-menu');
  const active = getLanguage();
  menu.innerHTML = '';
  for (const lang of LANGUAGES) {
    const btn = document.createElement('button');
    btn.className = 'lang-option';
    btn.setAttribute('role', 'menuitemradio');
    btn.setAttribute('aria-checked', lang.id === active ? 'true' : 'false');
    btn.dataset.lang = lang.id;
    btn.innerHTML = `<span>${escapeHtml(lang.name)}</span><svg class="check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    btn.addEventListener('click', () => changeLanguage(lang.id));
    menu.appendChild(btn);
  }
}

function toggleLangMenu() {
  const menu = $('lang-menu');
  const expanded = menu.hidden;
  menu.hidden = !expanded;
  $('lang-btn').setAttribute('aria-expanded', String(expanded));
}

function closeLangMenu() {
  $('lang-menu').hidden = true;
  $('lang-btn').setAttribute('aria-expanded', 'false');
}

async function changeLanguage(lang) {
  if (lang === settings.language) {
    closeLangMenu();
    return;
  }
  settings = await trySaveSettings({ language: lang });
  if (lang !== settings.language) {
    closeLangMenu();
    return;
  }
  setLanguage(lang);
  buildLangMenu();
  applyTheme(settings.theme);
  if (parseISODate(settings.birthdate)) renderPage();
  else showOnboarding();
  closeLangMenu();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- V1：钻取视图 URL 同步 ---------- */

/** 开发预览：把当前钻取状态同步到 URL query，便于截图与分享。
 *  仅在无扩展环境下改写 ?drill=YYYY-MM，不污染真实用户的历史记录。 */
function updateDrillUrl() {
  if (!IS_DEV) return;
  const url = new URL(location.href);
  if (drillYear == null) {
    url.searchParams.delete('drill');
  } else {
    const m = drillMonth ? String(drillMonth).padStart(2, '0') : '';
    url.searchParams.set('drill', m ? `${drillYear}-${m}` : String(drillYear));
  }
  history.replaceState(null, '', url.toString());
}

/** 开发预览：初始化时读取 ?drill=YYYY-MM 并直接进入钻取视图 */
function applyDevDrillParam() {
  const raw = new URLSearchParams(location.search).get('drill');
  if (!raw) return;
  const [yearStr, monthStr] = raw.split('-');
  const year = Number(yearStr);
  const month = monthStr ? Number(monthStr) : 0;
  if (!year || year < 1949 || year > 2100) return;
  if (month && (month < 1 || month > 12)) return;
  const birth = parseISODate(settings.birthdate);
  const today = resolveToday();
  viewYear = year;
  drillYear = year;
  drillMonth = month || null;
  $('grid').closest('.card').hidden = true;
  $('drill-view').hidden = false;
  renderDrill(today);
}

/* ---------- 设置悬浮弹窗 ---------- */

let settingsMounted = false;

function openSettingsModal() {
  $('settings-overlay').hidden = false;
  if (!settingsMounted) {
    settingsMounted = true;
    mountSettings($('settings-root'), {
      onClose: closeSettingsModal,
      onReOnboard: () => {
        closeSettingsModal();
        showOnboarding();
      },
      onReviewReplay: () => {
        // F-08：手动重看最近一次复盘卡（跨年优先，无则生日）
        closeSettingsModal();
        const birth = parseISODate(settings.birthdate);
        if (!birth) return;
        const today = resolveToday();
        if (settings.lastReviewYear && today.year > settings.lastReviewYear) {
          showReviewCard('year', today.year - 1, birth);
        } else if (settings.lastBirthdayReviewYear) {
          showReviewCard('birthday', settings.lastBirthdayReviewYear, birth);
        } else {
          // 从未触发过复盘 → 展示去年的
          showReviewCard('year', today.year - 1, birth);
        }
      },
      onSaved: (next) => {
        // 保存后实时套用（扩展环境下 storage.onChanged 也会触发，二者幂等）
        settings = next;
        setLanguage(settings.language);
        applyTheme(settings.theme);
        if (parseISODate(settings.birthdate)) renderPage();
      },
    });
    // 点击遮罩（弹窗之外的区域）关闭
    $('settings-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSettingsModal();
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
