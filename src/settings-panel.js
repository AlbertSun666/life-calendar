// 设置面板组件：newtab 悬浮弹窗与 options 页共用
// mountSettings(root, { onClose, onSaved, onReOnboard })

import { MILESTONE_ICONS, MAX_MILESTONES } from './lib/constants.js';
import {
  getSettings,
  saveSettings,
  getBgImage,
  saveBgImage,
  deleteBgImage,
  exportData,
  importData,
  downloadBlob,
} from './lib/storage.js';
import { parseISODate, todayInZone } from './lib/date.js';
import { MILESTONE_SVGS } from './lib/icons.js';
import { THEME_PRESETS, allThemes, resolveTheme } from './lib/theme-presets.js';
import { openThemeEditor } from './theme-editor.js';
import { renderGridPNG } from './lib/grid-to-png.js';
import { t } from './lib/i18n.js';

// 自定义主题数量上限（顶栏快速切换最多显示 5 预制 + 5 自定义）
const MAX_CUSTOM_THEMES = 5;

function template() {
  return `
  <div class="sp-header">
    <h1 class="sp-title">${t('sp.title')}</h1>
    <span class="sp-save-tip" data-sp="save-tip">${t('sp.saved')}</span>
  </div>

  <p class="sp-error" data-sp="error" role="alert" hidden></p>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.basic')}</h2>
    <div class="sp-row">
      <span class="sp-row-label">${t('sp.nickname')}</span>
      <span class="sp-row-control"><input class="sp-input" type="text" id="sp-nickname" data-sp="nickname" maxlength="20" autocomplete="off" placeholder="${t('sp.nicknamePh')}"></span>
    </div>
    <div class="sp-row">
      <span class="sp-row-label">${t('sp.birthdate')}</span>
      <span class="sp-row-control"><input class="sp-input" type="date" id="sp-birthdate" data-sp="birthdate" min="1949-01-01" max="${new Date().getFullYear()}-12-31"></span>
    </div>
    <div class="sp-row">
      <span class="sp-row-label">${t('sp.timezone')}</span>
      <span class="sp-row-control"><select class="sp-select" id="sp-timezone" data-sp="timezone"></select></span>
    </div>
    <div class="sp-row">
      <span class="sp-row-label">${t('sp.theme')}</span>
      <span class="sp-row-control">
        <span class="sp-swatches" data-sp="theme-swatches" aria-hidden="true"><i></i><i></i><i></i></span>
        <select class="sp-select" id="sp-theme" data-sp="theme-select"></select>
      </span>
    </div>
    <div class="sp-theme-actions">
      <button class="sp-btn sp-btn-ghost" data-sp="theme-edit">${t('sp.editCurrent')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="theme-save-as">${t('sp.saveAs')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="theme-new">${t('sp.newTheme')}</button>
      <button class="sp-btn sp-btn-ghost danger" data-sp="theme-delete" hidden>${t('sp.delete')}</button>
    </div>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.display')}</h2>
    <div class="sp-row sp-row-pair">
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-age"><span>${t('sp.showAge')}</span></label>
      <span class="sp-divider" aria-hidden="true"></span>
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-numbers"><span>${t('sp.showNumbers')}</span></label>
    </div>
    <div class="sp-row sp-row-pair">
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-quote"><span>${t('sp.showQuote')}</span></label>
      <span class="sp-divider" aria-hidden="true"></span>
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-history"><span>${t('sp.showHistory')}</span></label>
    </div>
    <div class="sp-row sp-row-pair">
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-bg"><span>${t('sp.showBg')}</span></label>
      <span class="sp-divider" aria-hidden="true"></span>
      <span class="sp-row-check sp-row-inline">
        <span class="sp-row-label-inline">${t('sp.glass')}</span>
        <input type="range" class="sp-range" min="0" max="100" step="1" id="sp-glass" data-sp="glass">
        <span class="sp-range-value" data-sp="glass-value"></span>
      </span>
    </div>
    <div class="sp-row sp-row-pair">
      <label class="sp-check sp-row-check"><input type="checkbox" data-sp="show-stages"><span>${t('sp.showStages')}</span></label>
      <span class="sp-divider" aria-hidden="true"></span>
      <span class="sp-row-check sp-row-inline">
        <label class="sp-row-label-inline" for="sp-stats-unit">${t('sp.statsUnit')}</label>
        <select class="sp-select" id="sp-stats-unit" data-sp="stats-unit">
          <option value="day">${t('sp.unitDay')}</option>
          <option value="week">${t('sp.unitWeek')}</option>
          <option value="month">${t('sp.unitMonth')}</option>
        </select>
      </span>
    </div>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.ms')}</h2>
    <ul class="sp-ms-list" data-sp="ms-list"></ul>
    <form class="sp-ms-form" data-sp="ms-form">
      <div class="sp-ms-templates" data-sp="ms-templates">
        <span class="sp-ms-templates-label">${t('sp.msTemplate')}</span>
        <button class="sp-ms-tpl" type="button" data-tpl="mom">${t('tpl.mom')}</button>
        <button class="sp-ms-tpl" type="button" data-tpl="dad">${t('tpl.dad')}</button>
        <button class="sp-ms-tpl" type="button" data-tpl="anniv">${t('tpl.anniv')}</button>
        <button class="sp-ms-tpl" type="button" data-tpl="baby">${t('tpl.baby')}</button>
        <button class="sp-ms-tpl" type="button" data-tpl="goal">${t('tpl.goal')}</button>
      </div>
      <div class="sp-ms-form-row">
        <input class="sp-input" type="date" data-sp="ms-date" min="1949-01-01" max="${new Date().getFullYear()}-12-31" required>
        <input class="sp-input sp-ms-label-input" type="text" data-sp="ms-label" maxlength="20" autocomplete="off" placeholder="${t('sp.msLabelPh')}" required>
        <label class="sp-check sp-ms-recur">
          <input type="checkbox" data-sp="ms-recurring" checked>
          <span>${t('sp.msRecurring')}</span>
        </label>
        <button class="sp-btn sp-btn-primary" type="submit">${t('sp.msAdd')}</button>
      </div>
      <div class="sp-icon-picker" data-sp="icon-picker"></div>
    </form>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.data')}</h2>
    <p class="sp-hint">${t('sp.dataHint')}</p>
    <div class="sp-theme-actions">
      <button class="sp-btn sp-btn-ghost" data-sp="export-json">${t('sp.exportData')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="import-json">${t('sp.importData')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="export-csv">${t('sp.exportCsv')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="export-image">${t('sp.exportImage')}</button>
      <button class="sp-btn sp-btn-ghost" data-sp="review-replay">${t('sp.reviewReplay')}</button>
      <input class="sp-import-file" type="file" accept="application/json,.json" data-sp="import-file" hidden>
    </div>
  </section>

  <div class="sp-actions">
    <button class="sp-btn sp-btn-ghost" data-sp="re-onboard">${t('sp.reOnboard')}</button>
    <button class="sp-btn sp-btn-primary" data-sp="done">${t('sp.done')}</button>
  </div>

  <p class="sp-version" id="sp-version" data-sp="version"></p>
`;
}

export async function mountSettings(root, { onClose, onSaved, onReOnboard, onReviewReplay } = {}) {
  let settings = await getSettings();
  let selectedIcon = MILESTONE_ICONS[0];
  let saveTipTimer = null;
  let errorTimer = null;

  root.classList.add('sp-root');

  const $ = (name) => root.querySelector(`[data-sp="${name}"]`);

  renderAll();

  // 开发预览：?editor=new 直接打开主题编辑器
  if (typeof chrome === 'undefined' || !chrome.storage) {
    if (new URLSearchParams(location.search).get('editor') === 'new') newBlankTheme();
  }

  /** 整体渲染 */
  function renderAll() {
    document.documentElement.style.setProperty('--custom-tag', `"${t('sp.custom')}"`);
    root.innerHTML = template();
    buildTimezoneOptions();
    buildThemeOptions();
    buildIconPicker();
    fillForm();
    renderMilestoneList();
    bindEvents();
    fillVersion();
  }

  async function fillVersion() {
    let version = '';
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        version = chrome.runtime.getManifest().version;
      } else {
        const manifest = await fetch('manifest.json').then((r) => r.json());
        version = manifest.version;
      }
    } catch { /* 版本号获取失败则留空 */ }
    if (version) $('version').textContent = t('sp.version', { version });
  }

  /* ---------- 表单填充 ---------- */

  function fillForm() {
    $('nickname').value = settings.nickname;
    $('birthdate').value = settings.birthdate;
    $('timezone').value = settings.timezone;
    $('theme-select').value = settings.theme;
    $('show-numbers').checked = settings.showNumbers;
    $('show-age').checked = settings.showAge;
    $('show-quote').checked = settings.showQuote;
    $('show-history').checked = settings.showHistory;
    $('show-bg').checked = settings.showBgImage !== false;
    $('show-stages').checked = settings.showStages === true;
    $('stats-unit').value = settings.statsUnit || 'day';
    $('glass').value = settings.glass ?? 50;
    updateGlassLabel();
    updateThemeCustomOps();
  }

  function buildTimezoneOptions() {
    const select = $('timezone');
    let zones = [];
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch {
      zones = [
        'Asia/Shanghai', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Singapore',
        'Europe/London', 'Europe/Paris', 'America/New_York',
        'America/Los_Angeles', 'Australia/Sydney',
      ];
    }
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = t('sp.timezoneAuto', { zone: detected });
    select.appendChild(auto);

    for (const zone of zones) {
      const opt = document.createElement('option');
      opt.value = zone;
      opt.textContent = zone;
      select.appendChild(opt);
    }
  }

  /* ---------- 主题下拉与自定义主题操作 ---------- */

  function buildThemeOptions() {
    const select = $('theme-select');
    select.textContent = '';
    for (const theme of allThemes(settings)) {
      const opt = document.createElement('option');
      opt.value = theme.id;
      opt.textContent = theme.builtin ? t(`theme.${theme.id}`) : theme.name;
      select.appendChild(opt);
    }
    select.value = settings.theme;
  }

  /** 主题操作区状态：预制主题只读（禁用编辑、隐藏删除）；同步主题色块（过去 / 今天 / 未来） */
  function updateThemeCustomOps() {
    const theme = resolveTheme(settings.theme, settings);
    $('theme-edit').disabled = theme.builtin;
    $('theme-delete').hidden = theme.builtin;

    const [past, today, future] = $('theme-swatches').children;
    past.style.background = theme.colors.cellPast;
    today.style.background = theme.colors.accent;
    future.style.background = theme.colors.cellFuture;
  }

  /* ---------- 自定义主题：另存为 / 新建 / 编辑 / 删除 ---------- */

  function saveAsCurrentTheme() {
    if ((settings.customThemes || []).length >= MAX_CUSTOM_THEMES) {
      window.alert(t('sp.themeLimit'));
      return;
    }
    const current = resolveTheme(settings.theme, settings);
    const currentName = current.builtin ? t(`theme.${current.id}`) : current.name;
    const draft = structuredClone(current);
    draft.id = `ct-${Date.now().toString(36)}`;
    draft.name = t('theme.copy', { name: currentName });
    draft.builtin = false;
    draft.desc = '';

    openThemeEditor({
      draft,
      onSave: async (theme) => {
        // 原主题若用的是上传图，复制一份给新主题（避免删除时互相影响）
        if (theme.bg && theme.bg.type === 'upload' && theme.bg.src !== theme.id) {
          const data = await getBgImage(theme.bg.src);
          if (data) await saveBgImage(theme.id, data);
          theme.bg = { type: 'upload', src: theme.id };
        }
        saveCustomTheme(theme);
      },
    });
  }

  function newBlankTheme() {
    if ((settings.customThemes || []).length >= MAX_CUSTOM_THEMES) {
      window.alert(t('sp.themeLimit'));
      return;
    }
    const draft = structuredClone(THEME_PRESETS[0]);
    draft.id = `ct-${Date.now().toString(36)}`;
    draft.name = t('sp.customTheme');
    draft.builtin = false;
    draft.desc = '';

    openThemeEditor({ draft, onSave: saveCustomTheme });
  }

  function editCustomTheme(id) {
    const source = (settings.customThemes || []).find((t) => t.id === id);
    if (!source) return;
    openThemeEditor({ draft: structuredClone(source), onSave: saveCustomTheme });
  }

  async function deleteCustomTheme(id) {
    const theme = (settings.customThemes || []).find((t) => t.id === id);
    if (!theme) return;
    if (!window.confirm(t('sp.deleteConfirm', { name: theme.name }))) return;

    if (theme.bg && theme.bg.type === 'upload') await deleteBgImage(theme.bg.src);

    const patch = { customThemes: settings.customThemes.filter((t) => t.id !== id) };
    if (settings.theme === id) patch.theme = 'default';
    save(patch);
  }

  function saveCustomTheme(theme) {
    const list = (settings.customThemes || []).filter((t) => t.id !== theme.id);
    list.push(theme);
    save({ customThemes: list, theme: theme.id });
  }

  function buildIconPicker() {
    const picker = $('icon-picker');
    MILESTONE_ICONS.forEach((iconId, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sp-icon-btn' + (i === 0 ? ' selected' : '');
      btn.title = t(`icon.${iconId}`);
      btn.dataset.icon = iconId;
      btn.innerHTML = MILESTONE_SVGS[iconId];
      btn.addEventListener('click', () => {
        selectedIcon = iconId;
        picker.querySelectorAll('.sp-icon-btn').forEach((b) =>
          b.classList.toggle('selected', b.dataset.icon === iconId)
        );
      });
      picker.appendChild(btn);
    });
  }

  function updateGlassLabel() {
    const v = Number($('glass').value);
    $('glass-value').textContent = v === 50 ? t('sp.glassOriginal') : `${v}%`;
    // 滑杆已划过部分用主题色填充
    $('glass').style.background =
      `linear-gradient(90deg, var(--accent) ${v}%, var(--panel-line, #d5d5d2) ${v}%)`;
  }

  /* ---------- 里程碑列表 ---------- */

  function renderMilestoneList() {
    const list = $('ms-list');
    list.textContent = '';

    if (settings.milestones.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sp-ms-empty';
      empty.textContent = t('sp.msEmpty');
      list.appendChild(empty);
      return;
    }

    const sorted = [...settings.milestones].sort(
      (a, b) => a.month - b.month || a.day - b.day || (a.year || 0) - (b.year || 0)
    );

    for (const ms of sorted) {
      const item = document.createElement('li');
      const currentYear = new Date().getFullYear();
      const isDone = ms.year != null ? !!ms.doneAt : String(ms.doneAt) === String(currentYear);
      item.className = 'sp-ms-row' + (isDone ? ' done' : '');

      // A4：达成标记勾选框
      const done = document.createElement('label');
      done.className = 'sp-ms-done';
      done.title = t('sp.msDone');
      const doneInput = document.createElement('input');
      doneInput.type = 'checkbox';
      doneInput.checked = isDone;
      doneInput.addEventListener('change', () => {
        const today = new Date();
        const doneAt = doneInput.checked
          ? (ms.year != null
            ? `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
            : String(today.getFullYear()))
          : '';
        save({
          milestones: settings.milestones.map((m) =>
            m.id === ms.id ? { ...m, doneAt, done: !!doneAt } : m
          ),
        });
      });
      done.append(doneInput);

      const date = document.createElement('span');
      date.className = 'sp-ms-date';
      date.textContent = ms.year == null
        ? t('ms.yearly', { month: ms.month, day: ms.day })
        : t('ms.onceday', { year: ms.year, month: ms.month, day: ms.day });

      const icon = document.createElement('span');
      icon.className = 'sp-ms-icon';
      icon.innerHTML = MILESTONE_SVGS[ms.icon] || MILESTONE_SVGS.star;

      const label = document.createElement('span');
      label.className = 'sp-ms-label';
      label.textContent = ms.label || t('day.milestone');

      const del = document.createElement('button');
      del.className = 'sp-ms-del';
      del.type = 'button';
      del.textContent = t('sp.delete');
      del.title = t('sp.delete');
      del.addEventListener('click', () => {
        save({ milestones: settings.milestones.filter((m) => m.id !== ms.id) });
      });

      item.append(done, date, icon, label, del);
      list.appendChild(item);
    }
  }

  /* ---------- 事件 ---------- */

  function bindEvents() {
    // 主题操作
    $('theme-save-as').addEventListener('click', saveAsCurrentTheme);
    $('theme-new').addEventListener('click', newBlankTheme);
    $('theme-select').addEventListener('change', (e) => save({ theme: e.target.value }));
    $('theme-edit').addEventListener('click', () => editCustomTheme(settings.theme));
    $('theme-delete').addEventListener('click', () => deleteCustomTheme(settings.theme));

    // 昵称：输入防抖保存
    let nicknameTimer = null;
    $('nickname').addEventListener('input', (e) => {
      clearTimeout(nicknameTimer);
      nicknameTimer = setTimeout(() => save({ nickname: e.target.value.trim() }), 400);
    });

    $('birthdate').addEventListener('change', (e) => {
      if (parseISODate(e.target.value)) save({ birthdate: e.target.value });
    });

    $('timezone').addEventListener('change', (e) => save({ timezone: e.target.value }));

    $('show-numbers').addEventListener('change', (e) =>
      save({ showNumbers: e.target.checked })
    );
    $('show-age').addEventListener('change', (e) =>
      save({ showAge: e.target.checked })
    );
    $('show-quote').addEventListener('change', (e) =>
      save({ showQuote: e.target.checked })
    );
    $('show-history').addEventListener('change', (e) =>
      save({ showHistory: e.target.checked })
    );

    $('show-bg').addEventListener('change', (e) =>
      save({ showBgImage: e.target.checked })
    );

    $('show-stages').addEventListener('change', (e) =>
      save({ showStages: e.target.checked })
    );

    // G1：统计单位切换（天/周/月）
    $('stats-unit').addEventListener('change', (e) =>
      save({ statsUnit: e.target.value })
    );

    // 毛玻璃滑杆：拖动实时更新读数，防抖保存（保存后主页面实时预览）
    let glassTimer = null;
    $('glass').addEventListener('input', (e) => {
      updateGlassLabel();
      clearTimeout(glassTimer);
      glassTimer = setTimeout(() => save({ glass: Number(e.target.value) }), 250);
    });

    // 添加里程碑
    $('ms-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (settings.milestones.length >= MAX_MILESTONES) return;

      const label = $('ms-label').value.trim();
      const parsed = parseISODate($('ms-date').value);
      if (!label || !parsed) return;

      const milestone = {
        id: Date.now().toString(36),
        month: parsed.month,
        day: parsed.day,
        year: $('ms-recurring').checked ? null : parsed.year,
        icon: selectedIcon,
        label,
        done: false,
        doneAt: '', // A4：默认未达成
      };

      save({ milestones: [...settings.milestones, milestone] });
      $('ms-label').value = '';
      $('ms-date').value = '';
      $('ms-label').focus();
    });

    // A5：里程碑模板包——点击模板填入草稿（日期留空待填，图标+标签预填）
    const TPL_MAP = {
      mom:    { label: t('tpl.mom'),    icon: 'cake',  recurring: true },
      dad:    { label: t('tpl.dad'),    icon: 'cake',  recurring: true },
      anniv:  { label: t('tpl.anniv'), icon: 'rings', recurring: true },
      baby:   { label: t('tpl.baby'),  icon: 'heart', recurring: false },
      goal:   { label: t('tpl.goal'),  icon: 'flag',  recurring: false },
    };
    document.querySelectorAll('.sp-ms-tpl').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = TPL_MAP[btn.dataset.tpl];
        if (!tpl) return;
        $('ms-label').value = tpl.label;
        $('ms-recurring').checked = tpl.recurring;
        selectedIcon = tpl.icon;
        // 同步图标选择器高亮
        $('icon-picker').querySelectorAll('.sp-icon-btn').forEach((b) =>
          b.classList.toggle('selected', b.dataset.icon === tpl.icon)
        );
        $('ms-date').focus();
      });
    });

    // 底部按钮
    $('re-onboard').addEventListener('click', () => {
      if (onReOnboard) onReOnboard();
    });
    $('done').addEventListener('click', () => {
      if (onClose) onClose();
    });

    // 数据导出 / 导入 / CSV / 图片 / 复盘重看
    $('export-json').addEventListener('click', exportJson);
    $('export-csv').addEventListener('click', exportCsv);
    $('export-image').addEventListener('click', exportImage);
    $('import-json').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', importFile);
    if (onReviewReplay) $('review-replay').addEventListener('click', onReviewReplay);
  }

  /* ---------- 保存 ---------- */

  async function save(patch) {
    try {
      settings = await saveSettings(patch);
      buildThemeOptions();
      updateThemeCustomOps();
      renderMilestoneList();
      showSaveTip();
      if (onSaved) onSaved(settings);
    } catch (err) {
      // TD-03：写入失败（配额超限等）时在面板顶部给出明确提示，而非静默失败
      showError(t('sp.saveFailed'));
    }
  }

  /* ---------- 数据导出 / 导入 / CSV ---------- */

  function showError(message) {
    const el = $('error');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => (el.hidden = true), 8000);
  }

  async function exportJson() {
    try {
      const json = await exportData();
      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      downloadBlob(new Blob([json], { type: 'application/json' }), `life-calendar-backup-${stamp}.json`);
    } catch (err) {
      showError(t('sp.exportFailed'));
    }
  }

  async function importFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      location.reload();
    } catch (err) {
      // 区分：配额不足（文件合法但空间不够）vs 文件非法
      const code = err && err.message;
      if (code === 'QUOTA') showError(t('sp.saveFailed'));
      else showError(t('sp.importInvalid'));
    }
  }

  function exportCsv() {
    const BOM = '\uFEFF'; // UTF-8 BOM：让 Excel 正确识别中文
    const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = [[t('csv.date'), t('csv.label'), t('csv.icon'), t('csv.recurring'), t('csv.done')]];
    for (const ms of settings.milestones) {
      const date = ms.year == null
        ? `${ms.month}-${ms.day}`
        : `${ms.year}-${ms.month}-${ms.day}`;
      rows.push([date, ms.label || t('day.milestone'), t(`icon.${ms.icon}`), ms.year == null ? t('csv.yearly') : '', ms.done ? t('csv.yes') : t('csv.no')]);
    }
    const csv = BOM + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'milestones.csv');
  }

  // F-10：导出当前人生表为 PNG
  async function exportImage() {
    try {
      const today = todayInZone(settings.timezone);
      const blob = await renderGridPNG(settings, today);
      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      downloadBlob(blob, `life-calendar-${stamp}.png`);
    } catch (err) {
      showError(t('sp.imageExportFailed'));
    }
  }

  function showSaveTip() {
    const tip = $('save-tip');
    tip.classList.add('show');
    clearTimeout(saveTipTimer);
    saveTipTimer = setTimeout(() => tip.classList.remove('show'), 1500);
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }
}
