// 主题编辑器：新建 / 编辑 / 另存为自定义主题
// openThemeEditor({ draft, onSave, onCancel })
//   draft: 主题数据草稿（结构同 theme-presets.js）
//   onSave(theme): 保存回调（图片已在内部完成压缩与存储）
//   onCancel(): 取消回调

import { GLYPH_TYPES } from './lib/glyphs.js';
import { saveBgImage, getBgImage, deleteBgImage } from './lib/storage.js';
import { t } from './lib/i18n.js';

// 颜色字段：[数据键, i18n key]
const COLOR_FIELDS = [
  ['text', 'color.text'],
  ['muted', 'color.muted'],
  ['pageBg', 'color.pageBg'],
  ['cardBg', 'color.cardBg'],
  ['cellLine', 'color.cellLine'],
  ['cellPast', 'color.cellPast'],
  ['cellPastText', 'color.cellPastText'],
  ['cellFuture', 'color.cellFuture'],
  ['cellFutureText', 'color.cellFutureText'],
  ['cellToday', 'color.cellToday'],
  ['accent', 'color.accent'],
];

// 透明度字段：[数据键, i18n key]
const ALPHA_FIELDS = [
  ['cardAlpha', 'te.alphaCard'],
  ['pastAlpha', 'te.past'],
  ['futureAlpha', 'te.future'],
  ['todayAlpha', 'te.today'],
];

const OVERLAY_OPTIONS = [
  ['none', 'te.overlayNone'],
  ['light', 'te.overlayLight'],
  ['dark', 'te.overlayDark'],
];

export function openThemeEditor({ draft, onSave, onCancel }) {
  // 编辑器内暂存的背景图状态
  let pendingBg = null;   // 新上传的 dataURL（尚未保存）
  let removeBg = false;   // 标记清除背景

  const overlay = document.createElement('div');
  overlay.className = 'te-overlay';
  overlay.innerHTML = `
    <div class="te-modal" role="dialog" aria-modal="true" aria-label="${t('te.title')}">
      <div class="te-header">
        <h2 class="te-title">${t('te.title')}</h2>
        <button class="te-close" data-te="cancel" title="${t('te.cancel')}">×</button>
      </div>

      <div class="te-body">
        <div class="te-field">
          <label class="te-label">${t('te.name')}</label>
          <input class="sp-input" type="text" data-te="name" maxlength="6">
        </div>

        <div class="te-field">
          <label class="te-label">${t('te.glyph')}</label>
          <select class="sp-input" data-te="glyph"></select>
        </div>

        <div class="te-field" data-te="glyph-colors">
          <label class="te-label">${t('te.glyphColors')}</label>
          <div class="te-colors te-colors-3">
            <label class="te-color"><input type="color" data-te="glyphPast"><span>${t('te.past')}</span></label>
            <label class="te-color"><input type="color" data-te="glyphFuture"><span>${t('te.future')}</span></label>
            <label class="te-color"><input type="color" data-te="glyphToday"><span>${t('te.today')}</span></label>
          </div>
        </div>

        <div class="te-field">
          <label class="te-label">${t('te.bg')}</label>
          <div class="te-bg">
            <div class="te-bg-preview" data-te="bg-preview"><span class="te-bg-empty">${t('te.bgEmpty')}</span></div>
            <div class="te-bg-actions">
              <label class="te-btn">
                ${t('te.upload')}
                <input type="file" accept="image/*" data-te="bg-file" hidden>
              </label>
              <button class="te-btn te-btn-ghost" data-te="bg-clear">${t('te.clear')}</button>
            </div>
          </div>
          <p class="sp-hint">${t('te.bgHint')}</p>
        </div>

        <div class="te-field" data-te="overlay-field">
          <label class="te-label">${t('te.overlay')}</label>
          <select class="sp-input" data-te="overlay"></select>
        </div>

        <div class="te-field">
          <label class="te-label">${t('te.colors')}</label>
          <div class="te-colors" data-te="colors"></div>
        </div>

        <div class="te-field">
          <label class="te-check">
            <input type="checkbox" data-te="glow-on">
            <span>${t('te.glow')}</span>
          </label>
          <label class="te-color te-glow-color"><input type="color" data-te="todayGlow"><span>${t('te.glowColor')}</span></label>
        </div>

        <div class="te-field">
          <label class="te-label">${t('te.alphas')}</label>
          <div class="te-alphas" data-te="alphas"></div>
        </div>
      </div>

      <div class="te-footer">
        <button class="te-btn te-btn-ghost" data-te="cancel">${t('te.cancel')}</button>
        <button class="te-btn te-btn-primary" data-te="save">${t('te.save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const $ = (name) => overlay.querySelector(`[data-te="${name}"]`);

  buildGlyphSelect();
  buildOverlaySelect();
  buildColorInputs();
  buildAlphaInputs();
  fillForm();
  bindEvents();

  /* ---------- 表单构建 ---------- */

  function buildGlyphSelect() {
    const select = $('glyph');
    for (const type of GLYPH_TYPES) {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = t(`glyph.${type}`);
      select.appendChild(opt);
    }
  }

  function buildOverlaySelect() {
    const select = $('overlay');
    for (const [value, key] of OVERLAY_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = t(key);
      select.appendChild(opt);
    }
  }

  function buildColorInputs() {
    const wrap = $('colors');
    for (const [key, labelKey] of COLOR_FIELDS) {
      const item = document.createElement('label');
      item.className = 'te-color';
      item.innerHTML = `<input type="color" data-te-color="${key}"><span>${t(labelKey)}</span>`;
      wrap.appendChild(item);
    }
  }

  function buildAlphaInputs() {
    const wrap = $('alphas');
    for (const [key, labelKey] of ALPHA_FIELDS) {
      const item = document.createElement('div');
      item.className = 'te-alpha';
      item.innerHTML = `
        <span class="te-alpha-name">${t(labelKey)}</span>
        <input type="range" min="0.4" max="1" step="0.02" data-te-alpha="${key}">
        <span class="te-alpha-value" data-te-alpha-value="${key}"></span>
      `;
      wrap.appendChild(item);
    }
  }

  function fillForm() {
    $('name').value = draft.name || '';
    $('glyph').value = draft.glyph || 'none';
    $('glyphPast').value = draft.glyphPast || '#888888';
    $('glyphFuture').value = draft.glyphFuture || '#4c8dae';
    $('glyphToday').value = draft.glyphToday || '#c3272b';
    $('overlay').value = draft.overlay || 'none';

    for (const [key] of COLOR_FIELDS) {
      overlay.querySelector(`[data-te-color="${key}"]`).value = draft.colors[key] || '#000000';
    }
    for (const [key] of ALPHA_FIELDS) {
      const input = overlay.querySelector(`[data-te-alpha="${key}"]`);
      input.value = draft.colors[key] ?? 1;
      updateAlphaLabel(key);
    }

    const hasGlow = !!draft.colors.todayGlow;
    $('glow-on').checked = hasGlow;
    $('todayGlow').value = draft.colors.todayGlow || '#f2be45';
    overlay.querySelector('.te-glow-color').hidden = !hasGlow;

    toggleGlyphColors();
    updateBgPreview();
  }

  /* ---------- 背景图 ---------- */

  async function updateBgPreview() {
    const preview = $('bg-preview');
    preview.textContent = '';

    let url = null;
    if (pendingBg) url = pendingBg;
    else if (!removeBg && draft.bg) {
      url = draft.bg.type === 'builtin' ? draft.bg.src : await getBgImage(draft.bg.src);
    }

    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = t('te.bg');
      preview.appendChild(img);
    } else {
      const empty = document.createElement('span');
      empty.className = 'te-bg-empty';
      empty.textContent = t('te.bgEmpty');
      preview.appendChild(empty);
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 1920;
          const scale = Math.min(1, MAX / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 事件 ---------- */

  function toggleGlyphColors() {
    $('glyph-colors').hidden = $('glyph').value === 'none';
  }

  function updateAlphaLabel(key) {
    const input = overlay.querySelector(`[data-te-alpha="${key}"]`);
    overlay.querySelector(`[data-te-alpha-value="${key}"]`).textContent =
      `${Math.round(input.value * 100)}%`;
  }

  function bindEvents() {
    $('glyph').addEventListener('change', toggleGlyphColors);

    for (const [key] of ALPHA_FIELDS) {
      overlay.querySelector(`[data-te-alpha="${key}"]`).addEventListener('input', () =>
        updateAlphaLabel(key)
      );
    }

    $('glow-on').addEventListener('change', (e) => {
      overlay.querySelector('.te-glow-color').hidden = !e.target.checked;
    });

    $('bg-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      pendingBg = await compressImage(file);
      removeBg = false;
      updateBgPreview();
      e.target.value = '';
    });

    $('bg-clear').addEventListener('click', () => {
      pendingBg = null;
      removeBg = true;
      updateBgPreview();
    });

    overlay.querySelectorAll('[data-te="cancel"]').forEach((btn) =>
      btn.addEventListener('click', () => close(false))
    );

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKeydown);

    $('save').addEventListener('click', () => close(true));
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close(false);
  }

  /* ---------- 关闭（保存 / 取消） ---------- */

  async function close(shouldSave) {
    document.removeEventListener('keydown', onKeydown);

    if (shouldSave) {
      const name = $('name').value.trim();
      if (!name) {
        $('name').focus();
        return; // 名称为空不关闭
      }

      const theme = structuredClone(draft);
      theme.name = name;
      theme.builtin = false;
      theme.glyph = $('glyph').value;
      theme.glyphPast = $('glyphPast').value;
      theme.glyphFuture = $('glyphFuture').value;
      theme.glyphToday = $('glyphToday').value;
      theme.overlay = $('overlay').value;

      for (const [key] of COLOR_FIELDS) {
        theme.colors[key] = overlay.querySelector(`[data-te-color="${key}"]`).value;
      }
      for (const [key] of ALPHA_FIELDS) {
        theme.colors[key] = Number(overlay.querySelector(`[data-te-alpha="${key}"]`).value);
      }
      theme.colors.todayGlow = $('glow-on').checked ? $('todayGlow').value : null;

      // 背景图：新上传 / 清除 / 保留
      if (pendingBg) {
        await saveBgImage(theme.id, pendingBg);
        theme.bg = { type: 'upload', src: theme.id };
        theme.bgPos = 'center';
      } else if (removeBg) {
        if (draft.bg && draft.bg.type === 'upload') await deleteBgImage(draft.bg.src);
        theme.bg = null;
        theme.overlay = 'none';
      }

      overlay.remove();
      onSave && onSave(theme);
      return;
    }

    overlay.remove();
    onCancel && onCancel();
  }
}
