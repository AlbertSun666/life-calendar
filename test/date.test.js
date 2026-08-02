// TD-05：date.js 最小单元测试（node:test，零依赖）
// 覆盖闰年、月份天数、跨年、生命统计、ISO 解析、日期比较等边界
// 运行：node --test test/date.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysInMonth,
  isLeapYear,
  parseISODate,
  compareYMD,
  addYears,
  diffDays,
  lifeStats,
  formatNumber,
} from '../src/lib/date.js';

/* ---------- isLeapYear ---------- */

test('isLeapYear：4 的倍数闰，100 的倍数不闰，400 的倍数闰', () => {
  assert.equal(isLeapYear(2000), true);   // 400 闰
  assert.equal(isLeapYear(1900), false);  // 100 不闰
  assert.equal(isLeapYear(2024), true);   // 4 闰
  assert.equal(isLeapYear(2023), false);  // 非闰
  assert.equal(isLeapYear(1996), true);   // 4 闰
  assert.equal(isLeapYear(2100), false);  // 100 不闰
});

/* ---------- daysInMonth ---------- */

test('daysInMonth：平年 2 月 28，闰年 2 月 29', () => {
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);  // 非闰
  assert.equal(daysInMonth(2000, 2), 29);  // 闰
});

test('daysInMonth：大小月一致', () => {
  assert.equal(daysInMonth(2024, 1), 31);
  assert.equal(daysInMonth(2024, 4), 30);
  assert.equal(daysInMonth(2024, 7), 31);
  assert.equal(daysInMonth(2024, 12), 31);
});

/* ---------- parseISODate ---------- */

test('parseISODate：合法 ISO 解析', () => {
  assert.deepEqual(parseISODate('1990-06-15'), { year: 1990, month: 6, day: 15 });
  assert.deepEqual(parseISODate('2024-02-29'), { year: 2024, month: 2, day: 29 });
});

test('parseISODate：非法返回 null', () => {
  assert.equal(parseISODate(''), null);
  assert.equal(parseISODate('1990-6-15'), null);     // 非补零
  assert.equal(parseISODate('1990/06/15'), null);    // 分隔符错
  assert.equal(parseISODate('1990-13-01'), null);    // 月超界
  assert.equal(parseISODate('1990-00-01'), null);    // 月为 0
  assert.equal(parseISODate('1990-01-00'), null);    // 日为 0
  assert.equal(parseISODate('1990-01-32'), null);    // 日超界
  assert.equal(parseISODate('2023-02-29'), null);    // 平年 2/29 非法
  assert.equal(parseISODate('abcd-01-01'), null);   // 非数字
  assert.equal(parseISODate(null), null);
  assert.equal(parseISODate(undefined), null);
});

/* ---------- compareYMD ---------- */

test('compareYMD：a<b → -1，a=b → 0，a>b → 1', () => {
  assert.equal(compareYMD({ year: 2020, month: 1, day: 1 }, { year: 2021, month: 1, day: 1 }), -1);
  assert.equal(compareYMD({ year: 2020, month: 1, day: 1 }, { year: 2020, month: 2, day: 1 }), -1);
  assert.equal(compareYMD({ year: 2020, month: 1, day: 1 }, { year: 2020, month: 1, day: 2 }), -1);
  assert.equal(compareYMD({ year: 2020, month: 1, day: 1 }, { year: 2020, month: 1, day: 1 }), 0);
  assert.equal(compareYMD({ year: 2021, month: 1, day: 1 }, { year: 2020, month: 1, day: 1 }), 1);
  assert.equal(compareYMD({ year: 2020, month: 2, day: 1 }, { year: 2020, month: 1, day: 1 }), 1);
  assert.equal(compareYMD({ year: 2020, month: 1, day: 2 }, { year: 2020, month: 1, day: 1 }), 1);
});

/* ---------- addYears ---------- */

test('addYears：正常加年', () => {
  assert.deepEqual(addYears({ year: 1990, month: 6, day: 15 }, 10), { year: 2000, month: 6, day: 15 });
  assert.deepEqual(addYears({ year: 1990, month: 6, day: 15 }, 80), { year: 2070, month: 6, day: 15 });
});

test('addYears：2/29 加到平年顺延 2/28', () => {
  assert.deepEqual(addYears({ year: 2000, month: 2, day: 29 }, 1), { year: 2001, month: 2, day: 28 });
  assert.deepEqual(addYears({ year: 2000, month: 2, day: 29 }, 4), { year: 2004, month: 2, day: 29 }); // 仍闰
  assert.deepEqual(addYears({ year: 2000, month: 2, day: 29 }, 100), { year: 2100, month: 2, day: 28 }); // 2100 非闰
});

test('addYears：负数年（向前推）', () => {
  assert.deepEqual(addYears({ year: 2000, month: 2, day: 29 }, -1), { year: 1999, month: 2, day: 28 });
});

/* ---------- diffDays ---------- */

test('diffDays：相邻一天差 1', () => {
  assert.equal(diffDays({ year: 2024, month: 1, day: 1 }, { year: 2024, month: 1, day: 2 }), 1);
});

test('diffDays：跨月、跨年正确', () => {
  assert.equal(diffDays({ year: 2024, month: 1, day: 1 }, { year: 2024, month: 2, day: 1 }), 31);
  assert.equal(diffDays({ year: 2023, month: 12, day: 31 }, { year: 2024, month: 1, day: 1 }), 1);
  assert.equal(diffDays({ year: 2024, month: 1, day: 1 }, { year: 2025, month: 1, day: 1 }), 366); // 闰年
  assert.equal(diffDays({ year: 2023, month: 1, day: 1 }, { year: 2024, month: 1, day: 1 }), 365); // 平年
});

test('diffDays：a>b 返回负数', () => {
  assert.equal(diffDays({ year: 2024, month: 1, day: 2 }, { year: 2024, month: 1, day: 1 }), -1);
});

test('diffDays：不受夏令时影响（按 UTC 日历日）', () => {
  // 3 月 10 日夏令时切换，但按 UTC 日历日计算应仍为 1 天
  assert.equal(diffDays({ year: 2024, month: 3, day: 9 }, { year: 2024, month: 3, day: 10 }), 1);
});

/* ---------- lifeStats ---------- */

test('lifeStats：出生当天 lived=0', () => {
  const s = lifeStats({ year: 1990, month: 6, day: 15 }, { year: 1990, month: 6, day: 15 });
  assert.equal(s.lived, 0);
  assert.equal(s.percent, 0);
  assert.ok(s.total > 0);
});

test('lifeStats：总天数约 80 年（29200-29220，含闰年波动）', () => {
  const s = lifeStats({ year: 1990, month: 1, day: 1 }, { year: 1990, month: 1, day: 1 });
  // 1990-2070 共 80 年，含约 20 个闰年 → 365*80 + 20 = 29220
  assert.ok(s.total >= 29219 && s.total <= 29221, `total=${s.total}`);
});

test('lifeStats：未来日期不超过总天数', () => {
  const s = lifeStats({ year: 1990, month: 1, day: 1 }, { year: 2200, month: 1, day: 1 });
  assert.equal(s.lived, s.total);
  assert.equal(s.remaining, 0);
  assert.ok(s.percent <= 100.0001);
});

test('lifeStats：remaining = total - lived', () => {
  const s = lifeStats({ year: 1990, month: 1, day: 1 }, { year: 2024, month: 1, day: 1 });
  assert.equal(s.remaining, s.total - s.lived);
  assert.equal(s.lived, 12418); // 1990-2024，含 8 个闰年（92/96/00/04/08/12/16/20）
});

test('lifeStats：百分比 = lived/total*100', () => {
  const s = lifeStats({ year: 1990, month: 1, day: 1 }, { year: 2030, month: 1, day: 1 });
  assert.ok(Math.abs(s.percent - (s.lived / s.total) * 100) < 0.0001);
});

/* ---------- formatNumber ---------- */

test('formatNumber：千分位', () => {
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(formatNumber(1234567, 'en-US'), '1,234,567');
  assert.equal(formatNumber(0), '0');
});

test('formatNumber：日文不千分位（en-US 兜底有逗号）', () => {
  // 不强测 ja/ja-JP 的具体格式（随 V8 版本），只确保返回字符串
  assert.equal(typeof formatNumber(1234567, 'ja-JP'), 'string');
});