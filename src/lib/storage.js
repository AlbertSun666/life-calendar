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

async function saveRaw(settings) {
  if (hasChromeSync) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    return;
  }
  localStorage.setItem(LOCAL_PREFIX + STORAGE_KEY, JSON.stringify(settings));
}

/** 读取完整设置（与默认值合并）。仅在非扩展环境下支持 URL 参数覆盖，便于调试预览。 */
export async function getSettings() {
  const raw = await loadRaw();
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  if (!Array.isArray(settings.milestones)) settings.milestones = [];
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
  if (hasChromeLocal) return chrome.storage.local.set({ [bgKey(id)]: dataURL });
  localStorage.setItem(LOCAL_PREFIX + bgKey(id), dataURL);
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
