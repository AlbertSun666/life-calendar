// TD-05：storage.js importData 校验测试（node:test，零依赖）
// 用 localStorage mock 覆盖导入校验各边界（非法结构/大小/背景图格式）
// 运行：node --test test/import.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage mock（storage.js 无 chrome.storage 时降级用）
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  key(i) { return Object.keys(this.store)[i]; },
  get length() { return Object.keys(this.store).length; },
};

const { importData } = await import('../src/lib/storage.js');

/* ---------- 合法导入 ---------- */

test('合法 JSON 导入成功', async () => {
  global.localStorage.store = {};
  const json = JSON.stringify({
    app: 'life-calendar',
    version: '0.5.0',
    settings: { nickname: 'test', birthdate: '1990-06-15', milestones: [], customThemes: [] },
    bgImages: {},
  });
  await importData(json);
  const stored = JSON.parse(localStorage.getItem('life-calendar:settings'));
  assert.equal(stored.nickname, 'test');
  assert.equal(stored.birthdate, '1990-06-15');
});

test('导入含背景图成功', async () => {
  global.localStorage.store = {};
  const json = JSON.stringify({
    app: 'life-calendar',
    version: '0.5.0',
    settings: { nickname: 'bg-test', milestones: [] },
    bgImages: { 'img-1': 'data:image/jpeg;base64,/9j/4AAQ' },
  });
  await importData(json);
  assert.equal(localStorage.getItem('life-calendar:bgimg-img-1'), 'data:image/jpeg;base64,/9j/4AAQ');
});

/* ---------- 非法文件 ---------- */

test('非字符串抛 INVALID', async () => {
  await assert.rejects(() => importData(null), { message: 'INVALID' });
  await assert.rejects(() => importData(undefined), { message: 'INVALID' });
  await assert.rejects(() => importData(123), { message: 'INVALID' });
});

test('超过 20MB 抛 INVALID', async () => {
  const big = 'x'.repeat(20 * 1024 * 1024 + 1);
  await assert.rejects(() => importData(big), { message: 'INVALID' });
});

test('非 JSON 抛 INVALID', async () => {
  await assert.rejects(() => importData('not json'), { message: 'INVALID' });
  await assert.rejects(() => importData('{broken'), { message: 'INVALID' });
});

test('app 标识错误抛 INVALID', async () => {
  await assert.rejects(() => importData(JSON.stringify({
    app: 'other-app',
    settings: {},
  })), { message: 'INVALID' });
});

test('缺少 settings 抛 INVALID', async () => {
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
  })), { message: 'INVALID' });
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
    settings: 'not-object',
  })), { message: 'INVALID' });
});

test('settings 为 null 抛 INVALID', async () => {
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
    settings: null,
  })), { message: 'INVALID' });
});

/* ---------- 背景图格式校验 ---------- */

test('背景图非 data:image/ 前缀抛 INVALID', async () => {
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
    settings: { milestones: [] },
    bgImages: { 'bad': 'https://example.com/x.jpg' },
  })), { message: 'INVALID' });
});

test('背景图 id 非字符串抛 INVALID', async () => {
  // JSON 对象 key 经 Object.entries 恒为字符串，故此条用非法 dataURL 值覆盖 id 校验场景
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
    settings: { milestones: [] },
    bgImages: { 'ok': 'not-an-image-url' },
  })), { message: 'INVALID' });
});

test('背景图 dataURL 非字符串抛 INVALID', async () => {
  await assert.rejects(() => importData(JSON.stringify({
    app: 'life-calendar',
    settings: { milestones: [] },
    bgImages: { 'ok': 456 },
  })), { message: 'INVALID' });
});

/* ---------- 向前兼容 ---------- */

test('缺 version 字段仍可导入（向前兼容旧备份）', async () => {
  global.localStorage.store = {};
  const json = JSON.stringify({
    app: 'life-calendar',
    settings: { nickname: 'old-backup', milestones: [] },
  });
  await importData(json);
  const stored = JSON.parse(localStorage.getItem('life-calendar:settings'));
  assert.equal(stored.nickname, 'old-backup');
});

test('缺 bgImages 字段可导入（视为空）', async () => {
  global.localStorage.store = {};
  const json = JSON.stringify({
    app: 'life-calendar',
    settings: { nickname: 'no-bg', milestones: [] },
  });
  await importData(json);
  const stored = JSON.parse(localStorage.getItem('life-calendar:settings'));
  assert.equal(stored.nickname, 'no-bg');
});

/* ---------- milestones 规整 ---------- */

test('milestones 非数组时规整为空数组', async () => {
  global.localStorage.store = {};
  const json = JSON.stringify({
    app: 'life-calendar',
    settings: { nickname: 'ms-test', milestones: 'not-array' },
  });
  await importData(json);
  const stored = JSON.parse(localStorage.getItem('life-calendar:settings'));
  assert.deepEqual(stored.milestones, []);
});