// 设置面板组件：newtab 悬浮弹窗与 options 页共用
// mountSettings(root, { showCloseButton, onClose, onSaved })

import { MILESTONE_ICONS, MAX_MILESTONES } from './lib/constants.js';
import { getSettings, saveSettings, getBgImage, saveBgImage, deleteBgImage } from './lib/storage.js';
import { parseISODate } from './lib/date.js';
import { MILESTONE_SVGS } from './lib/icons.js';
import { THEME_PRESETS, allThemes, resolveTheme } from './lib/theme-presets.js';
import { openThemeEditor } from './theme-editor.js';
import { LANGUAGES, setLanguage, t } from './lib/i18n.js';

function template() {
  return `
  <div class="sp-header">
    <h1 class="sp-title">${t('sp.title')}</h1>
    <span class="sp-save-tip" data-sp="save-tip">${t('sp.saved')}</span>
    <button class="sp-close" data-sp="close" title="${t('te.cancel')}" hidden>×</button>
  </div>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.basic')}</h2>
    <div class="sp-field">
      <label class="sp-field-label" for="sp-language">${t('sp.language')}</label>
      <select class="sp-input" id="sp-language" data-sp="language"></select>
    </div>
    <div class="sp-field">
      <label class="sp-field-label" for="sp-nickname">${t('sp.nickname')}</label>
      <input class="sp-input" type="text" id="sp-nickname" data-sp="nickname" maxlength="20" autocomplete="off" placeholder="${t('sp.nicknamePh')}">
    </div>
    <div class="sp-field">
      <label class="sp-field-label" for="sp-birthdate">${t('sp.birthdate')}</label>
      <input class="sp-input" type="date" id="sp-birthdate" data-sp="birthdate" min="1900-01-01">
    </div>
    <div class="sp-field">
      <label class="sp-field-label" for="sp-timezone">${t('sp.timezone')}</label>
      <select class="sp-input" id="sp-timezone" data-sp="timezone"></select>
      <p class="sp-hint">${t('sp.timezoneHint')}</p>
    </div>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.theme')}</h2>
    <div class="sp-theme-list" data-sp="theme-list"></div>
    <div class="sp-theme-actions">
      <button class="te-btn" data-sp="theme-save-as">${t('sp.saveAs')}</button>
      <button class="te-btn te-btn-ghost" data-sp="theme-new">${t('sp.newTheme')}</button>
    </div>
    <p class="sp-hint">${t('sp.themeHint')}</p>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.display')}</h2>
    <div class="sp-check-group">
      <label class="sp-check">
        <input type="checkbox" data-sp="show-numbers">
        <span>${t('sp.showNumbers')}</span>
      </label>
      <label class="sp-check">
        <input type="checkbox" data-sp="show-age">
        <span>${t('sp.showAge')}</span>
      </label>
      <label class="sp-check">
        <input type="checkbox" data-sp="show-quote">
        <span>${t('sp.showQuote')}</span>
      </label>
      <label class="sp-check">
        <input type="checkbox" data-sp="show-history">
        <span>${t('sp.showHistory')}</span>
      </label>
      <label class="sp-check">
        <input type="checkbox" data-sp="show-bg">
        <span>${t('sp.showBg')}</span>
      </label>
    </div>
    <div class="sp-glass">
      <label class="sp-glass-label" for="sp-glass">${t('sp.glass')}</label>
      <div class="sp-glass-row">
        <span class="sp-glass-end">${t('sp.glassSolid')}</span>
        <input type="range" min="0" max="100" step="1" id="sp-glass" data-sp="glass">
        <span class="sp-glass-end">${t('sp.glassClear')}</span>
        <span class="sp-glass-value" data-sp="glass-value"></span>
      </div>
      <p class="sp-hint">${t('sp.glassHint')}</p>
    </div>
  </section>

  <section class="sp-section">
    <h2 class="sp-section-title">${t('sp.ms')}</h2>
    <p class="sp-hint">${t('sp.msHint')}</p>
    <ul class="sp-ms-list" data-sp="ms-list"></ul>
    <form class="sp-ms-form" data-sp="ms-form">
      <input class="sp-input sp-ms-label-input" type="text" data-sp="ms-label" maxlength="20" autocomplete="off" placeholder="${t('sp.msLabelPh')}" required>
      <input class="sp-input" type="date" data-sp="ms-date" required>
      <div class="sp-icon-picker" data-sp="icon-picker"></div>
      <label class="sp-check sp-ms-recur">
        <input type="checkbox" data-sp="ms-recurring" checked>
        <span>${t('sp.msRecurring')}</span>
      </label>
      <button class="sp-ms-add" type="submit">${t('sp.msAdd')}</button>
    </form>
  </section>

  <p class="sp-version" id="sp-version" data-sp="version"></p>
`;
}

export async function mountSettings(root, { showCloseButton = false, onClose, onSaved } = {}) {
  let settings = await getSettings();
  setLanguage(settings.language);
  let selectedIcon = MILESTONE_ICONS[0];
  let saveTipTimer = null;

  root.classList.add('sp-root');

  const $ = (name) => root.querySelector(`[data-sp="${name}"]`);

  renderAll();

  // 开发预览：?editor=new 直接打开主题编辑器
  if (typeof chrome === 'undefined' || !chrome.storage) {
    if (new URLSearchParams(location.search).get('editor') === 'new') newBlankTheme();
  }

  /** 整体渲染（语言切换后重建 UI） */
  function renderAll() {
    document.documentElement.style.setProperty('--custom-tag', `"${t('sp.custom')}"`);
    root.innerHTML = template();
    buildLanguageOptions();
    buildTimezoneOptions();
    buildIconPicker();
    fillForm();
    renderThemeList();
    renderMilestoneList();
    bindEvents();
    fillVersion();
  }

  /** 显示当前版本号（扩展环境读 manifest，开发预览读 manifest.json 文件） */
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

  function buildLanguageOptions() {
    const select = $('language');
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = t('lang.system');
    select.appendChild(auto);
    for (const lang of LANGUAGES) {
      const opt = document.createElement('option');
      opt.value = lang.id;
      opt.textContent = lang.name;
      select.appendChild(opt);
    }
  }

  /* ---------- 表单填充 ---------- */

  function fillForm() {
    $('language').value = settings.language;
    $('nickname').value = settings.nickname;
    $('birthdate').value = settings.birthdate;
    $('timezone').value = settings.timezone;
    $('show-numbers').checked = settings.showNumbers;
    $('show-age').checked = settings.showAge;
    $('show-quote').checked = settings.showQuote;
    $('show-history').checked = settings.showHistory;
    $('show-bg').checked = settings.showBgImage !== false;
    $('glass').value = settings.glass ?? 50;
    updateGlassLabel();
    if (showCloseButton) {
      $('close').hidden = false;
      $('close').addEventListener('click', () => onClose && onClose());
    }
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

  /* ---------- 主题列表（预制 + 自定义） ---------- */

  function renderThemeList() {
    const list = $('theme-list');
    list.textContent = '';

    for (const theme of allThemes(settings)) {
      const { cellPast, cellFuture, accent } = theme.colors;
      const card = document.createElement('div');
      card.className = 'sp-theme-card' + (theme.builtin ? '' : ' custom');
      card.dataset.theme = theme.id;
      card.classList.toggle('selected', theme.id === settings.theme);

      card.innerHTML = `
        <div class="sp-theme-preview">
          <i style="background:${cellPast}"></i>
          <i style="background:${cellFuture}"></i>
          <i style="background:${accent}"></i>
        </div>
        <div class="sp-theme-name"></div>
        <div class="sp-theme-desc"></div>
      `;
      card.querySelector('.sp-theme-name').textContent = theme.builtin
        ? t(`theme.${theme.id}`)
        : theme.name;
      card.querySelector('.sp-theme-desc').textContent = theme.builtin
        ? t(`theme.${theme.id}.desc`)
        : t('sp.customTheme');
      card.addEventListener('click', () => save({ theme: theme.id }));

      // 键盘可达：Enter / Space 选中主题
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', String(theme.id === settings.theme));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          save({ theme: theme.id });
        }
      });

      // 自定义主题：编辑 / 删除操作
      if (!theme.builtin) {
        const ops = document.createElement('div');
        ops.className = 'sp-theme-ops';

        const edit = document.createElement('button');
        edit.textContent = t('sp.edit');
        edit.addEventListener('click', (e) => {
          e.stopPropagation();
          editCustomTheme(theme.id);
        });

        const del = document.createElement('button');
        del.textContent = t('sp.delete');
        del.className = 'danger';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteCustomTheme(theme.id);
        });

        ops.append(edit, del);
        card.appendChild(ops);
      }

      list.appendChild(card);
    }
  }

  /* ---------- 自定义主题：另存为 / 新建 / 编辑 / 删除 ---------- */

  function saveAsCurrentTheme() {
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
      item.className = 'sp-ms-item';

      const icon = document.createElement('span');
      icon.className = 'sp-ms-item-icon';
      icon.innerHTML = MILESTONE_SVGS[ms.icon] || MILESTONE_SVGS.star;

      const label = document.createElement('span');
      label.className = 'sp-ms-item-label';
      label.textContent = ms.label || t('day.milestone');

      const date = document.createElement('span');
      date.className = 'sp-ms-item-date';
      date.textContent = ms.year == null
        ? t('ms.yearly', { month: ms.month, day: ms.day })
        : t('ms.onceday', { year: ms.year, month: ms.month, day: ms.day });

      const del = document.createElement('button');
      del.className = 'sp-ms-del';
      del.type = 'button';
      del.textContent = '×';
      del.title = t('sp.delete');
      del.addEventListener('click', () => {
        save({ milestones: settings.milestones.filter((m) => m.id !== ms.id) });
      });

      item.append(icon, label, date, del);
      list.appendChild(item);
    }
  }

  /* ---------- 事件 ---------- */

  function bindEvents() {
    // 主题操作
    $('theme-save-as').addEventListener('click', saveAsCurrentTheme);
    $('theme-new').addEventListener('click', newBlankTheme);

    // 语言：保存并整体重建面板
    $('language').addEventListener('change', async (e) => {
      setLanguage(e.target.value);
      document.documentElement.style.setProperty('--custom-tag', `"${t('sp.custom')}"`);
      await save({ language: e.target.value });
      renderAll();
    });

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
      };

      save({ milestones: [...settings.milestones, milestone] });
      $('ms-label').value = '';
      $('ms-date').value = '';
      $('ms-label').focus();
    });
  }

  /* ---------- 保存 ---------- */

  async function save(patch) {
    settings = await saveSettings(patch);
    renderThemeList();
    renderMilestoneList();
    showSaveTip();
    if (onSaved) onSaved(settings);
  }

  function showSaveTip() {
    const tip = $('save-tip');
    tip.classList.add('show');
    clearTimeout(saveTipTimer);
    saveTipTimer = setTimeout(() => tip.classList.remove('show'), 1500);
  }
}
