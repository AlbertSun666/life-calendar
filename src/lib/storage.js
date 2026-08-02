// 存储层：优先 chrome.storage.sync（随浏览器账号同步）；
// 无扩展环境（直接以网页打开调试时）降级为 localStorage。

import { DEFAULT_SETTINGS, STORAGE_KEY } from './constants.js';

const hasChromeSync =
  typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync);

const LOCAL_PREFIX = 'life-calendar:';

async function loadRaw() {
  if (hasChromeSync) {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    return data[STORAGE_KEY] || {};
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFIX + STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/** 存储写入失败（配额超限等）时抛出；code: 'quota' | 'unknown'，文案由 UI 层按 i18n 翻译 */
export class StorageWriteError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StorageWriteError';
    this.code = code;
  }
}

/** 判定错误是否与配额/超限相关 */
function isQuotaError(err) {
  const msg = (err && (err.message || err.name)) || '';
  return /quota|exceed/i.test(msg);
}

async function saveRaw(settings) {
  try {
    if (hasChromeSync) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
      return;
    }
    localStorage.setItem(LOCAL_PREFIX + STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    // TD-03：配额超限等写入失败必须抛给 UI 层提示，禁止静默丢失用户数据
    throw new StorageWriteError(isQuotaError(err) ? 'quota' : 'unknown', '保存设置失败');
  }
}

/** 完整设置（与默认值合并；不含 dev URL 覆盖） */
async function mergedSettings() {
  const raw = await loadRaw();
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  if (!Array.isArray(settings.milestones)) settings.milestones = [];
  return settings;
}

/** 读取完整设置（与默认值合并）。仅在非扩展环境下支持 URL 参数覆盖，便于调试预览。 */
export async function getSettings() {
  const settings = await mergedSettings();
  if (!hasChromeSync) await applyDevOverrides(settings);
  return settings;
}

/** 保存部分设置，返回合并后的完整设置 */
export async function saveSettings(patch) {
  const current = { ...DEFAULT_SETTINGS, ...(await loadRaw()) };
  const next = { ...current, ...patch };
  await saveRaw(next);
  return next;
}

/** 监听设置变化（扩展环境监听 sync，网页调试环境监听 storage 事件） */
export function onSettingsChanged(callback) {
  if (hasChromeSync) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) {
        callback({ ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEY].newValue || {}) });
      }
    });
    return;
  }
  window.addEventListener('storage', async (e) => {
    if (e.key === LOCAL_PREFIX + STORAGE_KEY) callback(await getSettings());
  });
}

/* ---------- 自定义主题背景图：存 storage.local（图片体积远超 sync 限额，仅本机） ---------- */

const hasChromeLocal =
  typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);

const bgKey = (id) => `bgimg-${id}`;

export async function saveBgImage(id, dataURL) {
  try {
    if (hasChromeLocal) return await chrome.storage.local.set({ [bgKey(id)]: dataURL });
    localStorage.setItem(LOCAL_PREFIX + bgKey(id), dataURL);
  } catch (err) {
    throw new StorageWriteError(isQuotaError(err) ? 'quota' : 'unknown', '保存背景图失败');
  }
}

/** 读取背景图 dataURL；不存在（如换设备后未同步）返回 null */
export async function getBgImage(id) {
  if (hasChromeLocal) {
    const data = await chrome.storage.local.get(bgKey(id));
    return data[bgKey(id)] || null;
  }
  return localStorage.getItem(LOCAL_PREFIX + bgKey(id));
}

export async function deleteBgImage(id) {
  if (hasChromeLocal) return chrome.storage.local.remove(bgKey(id));
  localStorage.removeItem(LOCAL_PREFIX + bgKey(id));
}

/* ---------- 数据导出 / 导入（F-02 / F-03：换设备、重装、备份） ---------- */

const DATA_APP = 'life-calendar';

/** 导出：全部设置（含里程碑 / 自定义主题）+ 所有背景图（dataURL 内嵌），返回 JSON 字符串 */
export async function exportData() {
  const settings = await mergedSettings();
  const bgImages = {};

  if (hasChromeLocal) {
    // 读取 storage.local 中所有 bgimg-* 键
    const all = await chrome.storage.local.get(null);
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('bgimg-') && typeof value === 'string') bgImages[key.slice(6)] = value;
    }
  } else {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_PREFIX + 'bgimg-')) {
        bgImages[key.slice(LOCAL_PREFIX.length + 6)] = localStorage.getItem(key);
      }
    }
  }

  return JSON.stringify({
    app: DATA_APP,
    version: appVersion(),
    exportedAt: new Date().toISOString(),
    settings,
    bgImages,
  });
}

/** 取当前应用版本号作为备份格式元信息；扩展环境读 manifest，预览环境回退硬编码 */
function appVersion() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      return chrome.runtime.getManifest().version;
    }
  } catch {
    // 忽略，回退默认
  }
  return '0.6.0';
}

/** 导入：校验 JSON 结构与大小，覆盖式写入设置与背景图。
    失败抛 Error（message 为 code：'INVALID' | 'QUOTA'），由调用方映射 i18n 文案展示。
    成功返回 void。写入顺序：先存设置（权威数据），再存背景图（附属资源）；
    任一背景图写入失败时回滚已写入的图，避免残留孤儿数据，设置因已写入而保持自洽。 */
export async function importData(json) {
  if (typeof json !== 'string' || json.length > 20 * 1024 * 1024) {
    throw new Error('INVALID'); // 大小超限或非字符串，统一按非法文件处理
  }

  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('INVALID');
  }

  // 结构校验：app 标识 + settings 对象（version 不校验，向前兼容旧备份）
  if (!data || data.app !== DATA_APP || !data.settings || typeof data.settings !== 'object') {
    throw new Error('INVALID');
  }

  const imported = { ...DEFAULT_SETTINGS, ...data.settings };
  if (!Array.isArray(imported.milestones)) imported.milestones = [];
  if (!Array.isArray(imported.customThemes)) imported.customThemes = [];

  // 背景图：先校验全部格式，再逐张写入；格式非法直接拒收，不进入写入阶段
  const bgImages = data.bgImages && typeof data.bgImages === 'object' ? data.bgImages : {};
  const entries = Object.entries(bgImages);
  for (const [id, dataURL] of entries) {
    if (typeof id !== 'string' || typeof dataURL !== 'string' || !dataURL.startsWith('data:image/')) {
      throw new Error('INVALID');
    }
  }

  // 先写设置：成功后主题/里程碑等权威数据已落地，即使图写入失败设置也自洽
  await saveRaw(imported);

  // 再写背景图：记录已写入的 id，失败时回滚，避免孤儿数据无人引用
  const written = [];
  try {
    for (const [id, dataURL] of entries) {
      await saveBgImage(id, dataURL);
      written.push(id);
    }
  } catch (err) {
    // 回滚本轮已写入的背景图
    await Promise.all(written.map((id) => deleteBgImage(id).catch(() => {})));
    throw err instanceof StorageWriteError ? new Error('QUOTA') : err;
  }
}

/** 将 Blob 保存为本地文件下载（浏览器 API 封装） */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- 开发预览用的 URL 参数覆盖（只在无 chrome.storage 时生效）----
// 例：newtab.html?birthdate=1992-06-15&nickname=小明&theme=hope-field&numbers=0
//     &ms=06-15:cake:生日,2026-12-31:flag:年度目标
async function applyDevOverrides(settings) {
  const p = new URLSearchParams(location.search);
  if (p.get('birthdate')) settings.birthdate = p.get('birthdate');
  if (p.get('nickname')) settings.nickname = p.get('nickname');
  if (p.get('theme')) settings.theme = p.get('theme');
  if (p.get('lang')) settings.language = p.get('lang');
  if (p.get('tz') !== null && p.has('tz')) settings.timezone = p.get('tz');
  if (p.has('numbers')) settings.showNumbers = p.get('numbers') !== '0';
  if (p.has('bg')) settings.showBgImage = p.get('bg') !== '0';
  if (p.has('glass')) settings.glass = Number(p.get('glass'));
  // 截图验证辅助：开启生命阶段带 / 触发复盘卡（F-07 / F-08）
  if (p.has('stage')) settings.showStages = p.get('stage') !== '0';
  if (p.has('review')) {
    settings.lastReviewYear = 0; // 让跨年复盘立即触发（需配合 ?today=1月）
    settings.lastBirthdayReviewYear = 0;
  }
  // 注入一个演示用自定义主题并选中（验证自定义主题渲染链路）
  if (p.has('ct')) {
    settings.customThemes = [
      {
        id: 'ct-demo',
        name: '落日熔金',
        desc: '',
        builtin: false,
        glyph: 'wave',
        glyphFuture: '#e0793a',
        glyphPast: '#c9a68a',
        glyphToday: '#c3272b',
        colors: {
          text: '#4a2c1a', muted: '#a08070', pageBg: '#f7ead9',
          cardBg: '#fdf3e3', cardAlpha: 0.88, cellLine: '#e8d5bd',
          cellPast: '#e8c9a8', cellPastText: '#8a6244', pastAlpha: 0.8,
          cellFuture: '#fff8ee', cellFutureText: '#6b4426', futureAlpha: 0.66,
          cellToday: '#fff8ee', todayAlpha: 0.85, todayGlow: '#e0793a',
          accent: '#d3542a',
        },
        bg: null,
        overlay: 'none',
      },
    ];
    settings.theme = 'ct-demo';
  }
  // 注入一个使用上传图的演示主题（验证 upload 背景图存取与渲染链路）
  if (p.has('bgtest')) {
    try {
      const resp = await fetch('assets/wave.jpg');
      const blob = await resp.blob();
      const dataURL = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      await saveBgImage('ct-demo2', dataURL);
      settings.customThemes = [
        {
          id: 'ct-demo2',
          name: '上传图测试',
          desc: '',
          builtin: false,
          glyph: 'wave',
          glyphFuture: '#2f6e8e',
          glyphPast: '#7f9ea9',
          glyphToday: '#c3272b',
          colors: {
            text: '#1e3a4a', muted: '#5a7284', pageBg: '#e9f1f2',
            cardBg: '#faf7ee', cardAlpha: 0.86, cellLine: '#ddd2bc',
            cellPast: '#b2cdd6', cellPastText: '#47646f', pastAlpha: 0.78,
            cellFuture: '#ffffff', cellFutureText: '#2e5a70', futureAlpha: 0.62,
            cellToday: '#ffffff', todayAlpha: 0.85, todayGlow: '#2f6e8e',
            accent: '#c3272b',
          },
          bg: { type: 'upload', src: 'ct-demo2' },
          bgPos: 'center',
          overlay: 'light',
        },
      ];
      settings.theme = 'ct-demo2';
    } catch { /* 注入失败则忽略，按默认主题渲染 */ }
  }
  if (p.get('ms')) {
    settings.milestones = p
      .get('ms')
      .split(',')
      .map((item, i) => {
        const [date, icon = 'star', label = ''] = item.split(':');
        const segs = date.split('-').map(Number);
        const oneTime = segs.length === 3;
        const [year, month, day] = oneTime ? segs : [null, segs[0], segs[1]];
        return { id: `dev-${i}`, month, day, year, icon, label };
      })
      .filter((m) => m.month >= 1 && m.month <= 12 && m.day >= 1 && m.day <= 31);
  }
}
