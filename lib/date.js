// 日期相关纯函数：时区感知的「今天」、月份天数、生命统计

const DAY_MS = 86400000;

/** 在指定时区下取「今天」的年月日；timezone 为空则跟随浏览器 */
export function todayInZone(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || undefined,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(new Date());
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return { year: get('year'), month: get('month'), day: get('day') };
  } catch {
    // 非法时区等异常时退回本地时间
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
}

/** 某年某月的天数（month 为 1-12，闰年 2 月自动 29） */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 解析 'YYYY-MM-DD' → { year, month, day }，非法返回 null */
export function parseISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** 两个 {year,month,day} 比较：a<b → -1，a=b → 0，a>b → 1 */
export function compareYMD(a, b) {
  return (
    Math.sign(a.year - b.year) ||
    Math.sign(a.month - b.month) ||
    Math.sign(a.day - b.day)
  );
}

/** 出生 n 周年后的日期（处理 2 月 29 日落在平年的情况 → 2 月 28 日） */
export function addYears({ year, month, day }, n) {
  const y = year + n;
  const d = Math.min(day, daysInMonth(y, month));
  return { year: y, month, day: d };
}

/** 两个日期之间相差的整天数（按 UTC 日历日算，不受时区/夏令时影响） */
export function diffDays(a, b) {
  const ua = Date.UTC(a.year, a.month - 1, a.day);
  const ub = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((ub - ua) / DAY_MS);
}

/** 生命统计：已度过天数 / 总天数（80 年，含闰年）/ 百分比 */
export function lifeStats(birth, today) {
  const end = addYears(birth, 80);
  const total = diffDays(birth, end);
  const lived = Math.min(Math.max(diffDays(birth, today), 0), total);
  return {
    lived,
    remaining: total - lived,
    total,
    percent: total > 0 ? (lived / total) * 100 : 0,
  };
}

/** 格式化数字为千分位（locale 可选，默认 en-US） */
export function formatNumber(n, locale) {
  return n.toLocaleString(locale || 'en-US');
}
