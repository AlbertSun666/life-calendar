// 新标签页主逻辑：渲染人生日历（年网格 + 当年的月日网格）

import { LIFE_YEARS, YEAR_COLS, LIFE_STAGES } from './lib/constants.js';
import { getSettings, saveSettings, onSettingsChanged, getBgImage } from './lib/storage.js';
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
import { QUOTES } from './lib/quotes.js';
import { HISTORY } from './lib/history.js';
import { mountSettings } from './settings-panel.js';
import { LANGUAGES, getLanguage, setLanguage, t, currentLocale, monthName, monthNameVertical } from './lib/i18n.js';

const $ = (id) => document.getElementById(id);

// 开发预览（无扩展环境）判定：?today= 模拟日期、?settings=open 开弹窗，服务截图验证工作流
const IS_DEV = typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync;

let settings = null;
let todayKey = ''; // 当前渲染所用的「今天」，用于跨天检测
let viewYear = null; // 月份网格当前查看的年份；null = 今年
let obPreviewTheme = 'default'; // F-11：引导卡预览中的选中主题

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

  bindEvents();

  // 开发预览：?settings=open 直接打开设置弹窗（无头截图无法点击，以此截取弹窗态）
  if (IS_DEV && new URLSearchParams(location.search).get('settings') === 'open') {
    openSettingsModal();
    // 截图验证辅助：自动滚动到数据区
    if (new URLSearchParams(location.search).get('scroll') === 'data') {
      setTimeout(() => {
        const titles = ['数据', '資料', 'データ', '데이터', 'Data']; // 五语言的「数据」标题
        const sections = Array.from(document.querySelectorAll('.sp-section'));
        const dataSec = sections.find((s) => titles.some((t) => s.textContent.includes(t)));
        dataSec?.scrollIntoView({ behavior: 'instant', block: 'start' });
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

  // 标题与统计
  const title = settings.nickname
    ? t('title.withNickname', { name: settings.nickname })
    : t('app.title');
  $('title').textContent = title;
  document.title = title;

  const stats = lifeStats(birth, today);
  // 数字用 .num 包裹以便主题色凸显（值为自生成数字，无注入风险）
  const num = (v) => `<b class="num">${v}</b>`;
  $('stats').innerHTML = t('stats.line', {
    lived: num(formatNumber(stats.lived, currentLocale())),
    remaining: num(formatNumber(stats.remaining, currentLocale())),
    percent: num(stats.percent.toFixed(1)),
  });

  // 设置按钮的无障碍标签随语言
  $('settings-btn').setAttribute('aria-label', t('settings.aria'));
  $('settings-btn').title = t('settings.aria');

  document.body.classList.toggle('no-numbers', !settings.showNumbers);
  document.body.classList.toggle('no-age', !settings.showAge);

  buildLifeProgress(birth, today);
  buildStageBar(birth, today);
  buildGrid(birth, today);
  renderDaily(today);
  renderCountdown(birth, today);

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
  buildMonthRows(grid, today, year);
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

function buildMonthRows(grid, today, year) {
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

/* ---------- F-08：年度复盘卡 ---------- */

/** 检查是否需要弹出复盘卡：生日优先于跨年；展示后写回标记，同一次 render 只弹一张。
 *  跨年复盘只在 1 月触发（跨年时刻的仪式）；其余时间想看可点设置面板「查看年度复盘」。 */
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
  const isNewYear =
    today.month === 1 &&
    today.year > (settings.lastReviewYear || 0) &&
    !disabled.year;
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
      <label class="review-dont-remind"><input type="checkbox" data-review-disable="${disabledKey}"><span>${escapeHtml(t('review.dontRemind'))}</span></label>
    </div>
  `;

  overlay.hidden = false;

  // 关闭按钮
  card.querySelector('.review-close').addEventListener('click', () => closeReviewCard());
  // 不再提醒
  card.querySelector('[data-review-disable]').addEventListener('change', (e) => {
    const key = e.target.dataset.reviewDisable;
    const patch = { reviewDisabled: { ...(settings.reviewDisabled || {}), [key]: e.target.checked } };
    trySaveSettings(patch);
  });
}

function closeReviewCard() {
  $('review-overlay').hidden = true;
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
  input.max = `${now.getFullYear()}-12-31`;
  input.min = '1949-01-01';

  // F-11：主题预览——点击切换预制主题色样，提交时一并保存
  obPreviewTheme = 'default';
  buildObThemePreview();
  $('ob-preview-label').textContent = t('ob.themePreview');
  $('ob-theme-preview').hidden = false;

  // F-11：时区提示——检测浏览器时区，温和提醒可在设置中修改
  buildObTzHint();

  setTimeout(() => input.focus(), 50);
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

  // 设置入口：打开悬浮弹窗（遮罩点击关闭只在弹窗挂载时绑定一次，见 openSettingsModal）
  $('settings-btn').addEventListener('click', openSettingsModal);

  // F-08：复盘卡遮罩点击关闭 + Esc 关闭
  $('review-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeReviewCard();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
      closeReviewCard();
      closeLangMenu();
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
