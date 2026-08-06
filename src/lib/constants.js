// 全局常量与默认配置

export const LIFE_YEARS = 80;   // 一生按 80 年计
export const YEAR_ROWS = 5;     // 年网格 5 行
export const YEAR_COLS = 16;    // 年网格 16 列

// F-07：生命阶段定义（硬编码，按年龄划分；阶段名见 i18n stage.* 键）
export const LIFE_STAGES = [
  { id: 'childhood', start: 0, end: 6 },    // 童年
  { id: 'school',    start: 7, end: 18 },   // 求学
  { id: 'college',   start: 19, end: 22 },  // 大学
  { id: 'career',    start: 23, end: 60 },  // 事业
  { id: 'retire',    start: 61, end: 80 },  // 退休
];

export const DEFAULT_SETTINGS = {
  nickname: '',          // 昵称，用于标题「xxx 的人生日历」
  birthdate: '',         // 出生日期，ISO 格式 'YYYY-MM-DD'
  timezone: '',          // IANA 时区；空串 = 跟随浏览器
  language: '',          // 界面语言：'' = 跟随浏览器；或 zh-CN / zh-TW / ja / ko / en
  theme: 'default',      // 主题 id：预制主题（theme-presets.js）或自定义主题 id
  customThemes: [],      // 用户自定义主题（结构同 theme-presets.js 中的主题）
  showNumbers: true,     // 是否在日期格子上显示数字
  showAge: true,         // 是否在年份格子上显示年龄
  showQuote: true,       // 是否显示每日一句
  showHistory: true,     // 是否显示历史上的今天
  showBgImage: true,     // 是否显示主题背景图片
  glass: 50,             // 表格毛玻璃程度 0-100：50=主题原始，0=完全不透明，100=接近全透明磨砂
  milestones: [],        // [{ id, month, day, year|null(每年), icon, label, done, doneAt }]
  // A4：里程碑达成状态。doneAt 字段存在时按语义生效：
  //   - 一次性里程碑：doneAt = 'YYYY-MM-DD' 表示永久达成；null/'' 表示未达成
  //   - 每年重复里程碑：doneAt = 当年年份字符串（'2026'）表示本年度已达成，下一年自动重置
  //   设置面板勾选框只控制最近一次状态，跨年或用户可手动取消。
  showStages: false,     // F-07：是否显示生命阶段带
  statsUnit: 'day',      // G1：统计单位 'day' | 'week' | 'month'
  lastReviewYear: 0,     // F-08：上次展示跨年复盘的年份（0=从未）
  lastBirthdayReviewYear: 0, // F-08：上次展示生日复盘的年份（0=从未）
  reviewDisabled: { year: false, birthday: false }, // F-08：复盘卡不再提醒开关
  reviewSnoozeUntil: '', // F-08：跨年复盘推迟提醒的截止日期（YYYY-MM-DD）
};

// 里程碑图标枚举（内联 SVG 定义在 src/lib/icons.js，显示名见 src/lib/i18n.js 的 icon.* 键）
export const MILESTONE_ICONS = ['cake', 'rings', 'flag', 'star', 'heart'];

// storage.sync 单项上限 8KB，里程碑数量留个安全上限
export const MAX_MILESTONES = 60;

// 存储 key（整个 settings 对象存在一个 key 下，远低于 8KB 单项限额）
export const STORAGE_KEY = 'settings';
