// 轻量多语言：语言包 + t() + 浏览器语言探测
// 名言与历史事件为内容数据，保持中文原文，不在本框架内翻译

export const LANGUAGES = [
  { id: 'zh-CN', name: '简体中文' },
  { id: 'zh-TW', name: '繁體中文' },
  { id: 'ja', name: '日本語' },
  { id: 'ko', name: '한국어' },
  { id: 'en', name: 'English' },
];

const SUPPORTED = LANGUAGES.map((l) => l.id);

/** 浏览器语言 → 支持的语言 id */
export function detectLanguage() {
  const nav = (navigator.language || 'zh-CN').toLowerCase();
  if (nav.startsWith('zh')) {
    // 简体：zh-CN / zh-Hans；繁体：zh-TW / zh-HK / zh-Hant
    return nav.includes('tw') || nav.includes('hk') || nav.includes('hant') ? 'zh-TW' : 'zh-CN';
  }
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  return 'en';
}

let currentLang = detectLanguage();

/** 设置当前语言（'' 表示跟随系统） */
export function setLanguage(lang) {
  currentLang = lang && SUPPORTED.includes(lang) ? lang : detectLanguage();
}

export function getLanguage() {
  return currentLang;
}

/** 数字格式化使用的 locale */
export function currentLocale() {
  return { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', ja: 'ja', ko: 'ko', en: 'en-US' }[currentLang];
}

/* ---------- 月名（月份标签格中部显示，随界面语言） ---------- */

const MONTH_NAMES = {
  // 中文大写数字
  'zh-CN': ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'],
  'zh-TW': ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'],
  // 和风月名
  ja: ['睦月', '如月', '弥生', '卯月', '皐月', '水無月', '文月', '葉月', '長月', '神無月', '霜月', '師走'],
  // 韩文传统月名多版本无共识、现代罕用，与英文保持一致
  ko: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** 月名（month 为 1-12） */
export function monthName(month) {
  const list = MONTH_NAMES[currentLang] || MONTH_NAMES['zh-CN'];
  return list[month - 1];
}

/** 月名是否需要竖排：日文全部两字，中文十一/十二两字 */
export function monthNameVertical(month) {
  if (currentLang === 'ja') return true;
  return monthName(month).length === 2;
}

/** 翻译：t('key') 或 t('key', { name: 'xxx' }) 替换 {name} 占位符 */
export function t(key, vars) {
  const entry = STRINGS[key];
  // TD-04：非扩展环境（开发预览）缺键时告警，便于发现漏译；生产环境静默返回 key
  if (!entry && typeof chrome === 'undefined') {
    console.warn('[i18n] missing key: ' + key);
  }
  let text = (entry && (entry[currentLang] || entry['zh-CN'])) || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/* ============================================================
   语言包
   ============================================================ */
const STRINGS = {
  'app.title': {
    'zh-CN': '人生日历', 'zh-TW': '人生日曆', ja: '人生カレンダー', ko: '인생 달력', en: 'Life Calendar',
  },
  'title.withNickname': {
    'zh-CN': '{name}的人生日历', 'zh-TW': '{name}的人生日曆', ja: '{name}の人生カレンダー', ko: '{name}의 인생 달력', en: "{name}'s Life Calendar",
  },
  'stats.line': {
    'zh-CN': '已度过 {lived} 天 · 剩余 {remaining} 天 · 生命进度 {percent}%',
    'zh-TW': '已度過 {lived} 天 · 剩餘 {remaining} 天 · 生命進度 {percent}%',
    ja: '{lived} 日を過ごしました · 残り {remaining} 日 · 人生の {percent}%',
    ko: '{lived}일 지남 · {remaining}일 남음 · 인생의 {percent}%',
    en: '{lived} days lived · {remaining} days left · {percent}% of life',
  },
  'age.short': {
    'zh-CN': '{age} 岁', 'zh-TW': '{age} 歲', ja: '{age}歳', ko: '{age}세', en: '{age} y/o',
  },
  'year.tip': {
    'zh-CN': '{year} · {age} 岁', 'zh-TW': '{year} · {age} 歲', ja: '{year} · {age}歳', ko: '{year} · {age}세', en: '{year} · age {age}',
  },
  'year.marked': {
    'zh-CN': ' · 有标记', 'zh-TW': ' · 有標記', ja: ' · マークあり', ko: ' · 표시 있음', en: ' · marked',
  },
  'day.milestone': {
    'zh-CN': '重要日期', 'zh-TW': '重要日期', ja: '大切な日', ko: '중요한 날', en: 'Important date',
  },
  'history.tag': {
    'zh-CN': '历史上的今天', 'zh-TW': '歷史上的今天', ja: '今日は何の日', ko: '오늘의 역사', en: 'On This Day',
  },
  'history.ce': {
    'zh-CN': '{y}年，', 'zh-TW': '{y}年，', ja: '{y}年、', ko: '{y}년, ', en: '{y}, ',
  },
  'history.bce': {
    'zh-CN': '公元前{y}年，', 'zh-TW': '公元前{y}年，', ja: '紀元前{y}年、', ko: '기원전 {y}년, ', en: '{y} BC, ',
  },

  // 首次使用引导
  'ob.desc': {
    'zh-CN': '把一生画成一张表。灰色的，是已经走过的日子；空白的，是还剩下的生命。',
    'zh-TW': '把一生畫成一張表。灰色的，是已經走過的日子；空白的，是還剩下的生命。',
    ja: '一生を一枚の表に。灰色は過ぎ去った日々、空白は残された命。',
    ko: '인생을 하나의 표로. 회색은 지나온 날, 빈칸은 남은 삶입니다.',
    en: 'Your whole life in one grid. Gray cells are days gone by; blank cells are the life you have left.',
  },
  'ob.birthdate': {
    'zh-CN': '你的出生日期', 'zh-TW': '你的出生日期', ja: '生年月日', ko: '생년월일', en: 'Your date of birth',
  },
  'ob.submit': {
    'zh-CN': '开始', 'zh-TW': '開始', ja: 'はじめる', ko: '시작', en: 'Begin',
  },
  'settings.aria': {
    'zh-CN': '设置', 'zh-TW': '設定', ja: '設定', ko: '설정', en: 'Settings',
  },

  // 设置面板
  'sp.title': {
    'zh-CN': '设置', 'zh-TW': '設定', ja: '設定', ko: '설정', en: 'Settings',
  },
  'sp.saved': {
    'zh-CN': '已保存', 'zh-TW': '已儲存', ja: '保存しました', ko: '저장됨', en: 'Saved',
  },
  'sp.version': {
    'zh-CN': '人生日历 v{version} · Manifest V3',
    'zh-TW': '人生日曆 v{version} · Manifest V3',
    ja: '人生カレンダー v{version} · Manifest V3',
    ko: '인생 달력 v{version} · Manifest V3',
    en: 'Life Calendar v{version} · Manifest V3',
  },
  'sp.basic': {
    'zh-CN': '基本', 'zh-TW': '基本', ja: '基本', ko: '기본', en: 'Basic',
  },
  'sp.language': {
    'zh-CN': '语言', 'zh-TW': '語言', ja: '言語', ko: '언어', en: 'Language',
  },
  'lang.system': {
    'zh-CN': '跟随系统', 'zh-TW': '跟隨系統', ja: 'システムに従う', ko: '시스템 따름', en: 'System',
  },
  'sp.nickname': {
    'zh-CN': '昵称', 'zh-TW': '暱稱', ja: 'ニックネーム', ko: '닉네임', en: 'Nickname',
  },
  'sp.nicknamePh': {
    'zh-CN': '用于标题「xxx 的人生日历」，可留空',
    'zh-TW': '用於標題「xxx 的人生日曆」，可留空',
    ja: 'タイトル「xxx の人生カレンダー」に使用、空欄可',
    ko: '제목 「xxx의 인생 달력」에 사용, 비워 둘 수 있음',
    en: "Used in the title \"xxx's Life Calendar\"; optional",
  },
  'sp.birthdate': {
    'zh-CN': '生日', 'zh-TW': '生日', ja: '誕生日', ko: '생일', en: 'Birthday',
  },
  'sp.timezone': {
    'zh-CN': '时区', 'zh-TW': '時區', ja: 'タイムゾーン', ko: '시간대', en: 'Time zone',
  },
  'sp.timezoneAuto': {
    'zh-CN': '跟随系统（{zone}）', 'zh-TW': '跟隨系統（{zone}）', ja: 'システムに従う（{zone}）', ko: '시스템 따름（{zone}）', en: 'System ({zone})',
  },
  'sp.timezoneHint': {
    'zh-CN': '用于计算「今天」是哪一天，默认跟随系统。',
    'zh-TW': '用於計算「今天」是哪一天，預設跟隨系統。',
    ja: '「今日」の判定に使用します。既定はシステムに従います。',
    ko: "'오늘'을 계산하는 데 사용하며, 기본값은 시스템 설정을 따릅니다.",
    en: 'Used to decide which day "today" is. Defaults to system.',
  },
  'sp.theme': {
    'zh-CN': '主题', 'zh-TW': '主題', ja: 'テーマ', ko: '테마', en: 'Themes',
  },
  'sp.saveAs': {
    'zh-CN': '另存为自定义主题',
    'zh-TW': '另存為自訂主題',
    ja: 'カスタムテーマとして保存',
    ko: '사용자 지정 테마로 저장',
    en: 'Save as custom theme',
  },
  'sp.reOnboard': {
    'zh-CN': '重新引导', 'zh-TW': '重新引導', ja: '再オンボーディング', ko: '다시 안내', en: 'Re-onboard',
  },
  'sp.done': {
    'zh-CN': '完成', 'zh-TW': '完成', ja: '完了', ko: '완료', en: 'Done',
  },
  'sp.data': {
    'zh-CN': '数据', 'zh-TW': '資料', ja: 'データ', ko: '데이터', en: 'Data',
  },
  'sp.exportData': {
    'zh-CN': '导出数据', 'zh-TW': '匯出資料', ja: 'データをエクスポート', ko: '데이터 내보내기', en: 'Export data',
  },
  'sp.importData': {
    'zh-CN': '导入数据', 'zh-TW': '匯入資料', ja: 'データをインポート', ko: '데이터 가져오기', en: 'Import data',
  },
  'sp.exportCsv': {
    'zh-CN': '导出重要日期（CSV）', 'zh-TW': '匯出重要日期（CSV）', ja: '大切な日をエクスポート（CSV）', ko: '중요한 날 내보내기(CSV)', en: 'Export important dates (CSV)',
  },
  'sp.exportImage': {
    'zh-CN': '导出为图片', 'zh-TW': '匯出為圖片', ja: '画像としてエクスポート', ko: '이미지로 내보내기', en: 'Export as image',
  },
  'sp.imageExportFailed': {
    'zh-CN': '图片导出失败，请重试。',
    'zh-TW': '圖片匯出失敗，請重試。',
    ja: '画像のエクスポートに失敗しました。もう一度お試しください。',
    ko: '이미지 내보내기에 실패했습니다. 다시 시도하세요.',
    en: 'Image export failed. Please try again.',
  },
  'sp.reviewReplay': {
    'zh-CN': '查看年度复盘', 'zh-TW': '查看年度復盤', ja: '年間レビューを見る', ko: '연간 리뷰 보기', en: 'View year-in-review',
  },
  'sp.dataHint': {
    'zh-CN': '导出会把设置、重要日期、自定义主题与背景图打包为一个 JSON 文件；换设备或重装后可用导入还原。',
    'zh-TW': '匯出會把設定、重要日期、自訂主題與背景圖打包為一個 JSON 檔案；換裝置或重裝後可用匯入還原。',
    ja: 'エクスポートは設定・大切な日・カスタムテーマ・背景画像を 1 つの JSON ファイルにまとめます。端末変更や再インストール後はインポートで復元できます。',
    ko: '내보내기는 설정, 중요한 날, 사용자 지정 테마, 배경 이미지를 하나의 JSON 파일로 묶습니다. 기기 변경이나 재설치 후 가져오기로 복원할 수 있습니다.',
    en: 'Export packs settings, important dates, custom themes, and background images into one JSON file. Import restores them after switching devices or reinstalling.',
  },
  'sp.saveFailed': {
    'zh-CN': '保存失败：存储空间不足，请删除部分自定义主题或背景图。',
    'zh-TW': '儲存失敗：儲存空間不足，請刪除部分自訂主題或背景圖。',
    ja: '保存に失敗しました：ストレージ容量が不足しています。カスタムテーマや背景画像を削除してください。',
    ko: '저장 실패: 저장 공간이 부족합니다. 사용자 지정 테마나 배경 이미지를 일부 삭제하세요.',
    en: 'Save failed: storage is full. Delete some custom themes or background images.',
  },
  'sp.importInvalid': {
    'zh-CN': '导入失败：文件不是有效的人生日历备份。',
    'zh-TW': '匯入失敗：檔案不是有效的人生日曆備份。',
    ja: 'インポート失敗：有効な人生カレンダーのバックアップではありません。',
    ko: '가져오기 실패: 유효한 인생 달력 백업 파일이 아닙니다.',
    en: 'Import failed: not a valid Life Calendar backup.',
  },
  'sp.exportFailed': {
    'zh-CN': '导出失败，请重试。',
    'zh-TW': '匯出失敗，請重試。',
    ja: 'エクスポートに失敗しました。もう一度お試しください。',
    ko: '내보내기 실패했습니다. 다시 시도하세요.',
    en: 'Export failed. Please try again.',
  },
  'csv.date': {
    'zh-CN': '日期', 'zh-TW': '日期', ja: '日付', ko: '날짜', en: 'Date',
  },
  'csv.label': {
    'zh-CN': '名称', 'zh-TW': '名稱', ja: '名称', ko: '이름', en: 'Label',
  },
  'csv.icon': {
    'zh-CN': '图标', 'zh-TW': '圖示', ja: 'アイコン', ko: '아이콘', en: 'Icon',
  },
  'csv.recurring': {
    'zh-CN': '每年重复', 'zh-TW': '每年重複', ja: '毎年繰り返す', ko: '매년 반복', en: 'Repeat yearly',
  },
  'csv.yearly': {
    'zh-CN': '是', 'zh-TW': '是', ja: '毎年', ko: '예', en: 'Yes',
  },
  'sp.newTheme': {
    'zh-CN': '+ 新建主题', 'zh-TW': '+ 新增主題', ja: '＋ 新規テーマ', ko: '+ 새 테마', en: '+ New theme',
  },
  'sp.themeHint': {
    'zh-CN': '预制主题不可修改；另存为自定义主题后，配色、图形、背景图都可以自由调整。',
    'zh-TW': '預設主題無法修改；另存為自訂主題後，配色、圖形、背景圖都可以自由調整。',
    ja: 'プリセットテーマは変更できません。カスタムテーマとして保存すれば、配色・図形・背景画像を自由に調整できます。',
    ko: '기본 테마는 수정할 수 없습니다. 사용자 지정 테마로 저장하면 색상, 도형, 배경 이미지를 자유롭게 바꿀 수 있습니다.',
    en: 'Built-in themes are read-only. Save a copy as a custom theme to adjust colors, glyphs, and background image.',
  },
  'sp.themeLimit': {
    'zh-CN': '自定义主题最多 5 个，请先删除一个不用的主题。',
    'zh-TW': '自訂主題最多 5 個，請先刪除一個不用的主題。',
    ja: 'カスタムテーマは最大 5 つまでです。使っていないテーマを先に削除してください。',
    ko: '사용자 지정 테마는 최대 5개까지 가능합니다. 사용하지 않는 테마를 먼저 삭제하세요.',
    en: 'Up to 5 custom themes. Delete one you no longer use first.',
  },
  'sp.custom': {
    'zh-CN': '自定义', 'zh-TW': '自訂', ja: 'カスタム', ko: '사용자 지정', en: 'Custom',
  },
  'sp.customTheme': {
    'zh-CN': '自定义主题', 'zh-TW': '自訂主題', ja: 'カスタムテーマ', ko: '사용자 지정 테마', en: 'Custom theme',
  },
  'sp.edit': {
    'zh-CN': '编辑', 'zh-TW': '編輯', ja: '編集', ko: '편집', en: 'Edit',
  },
  'sp.editCurrent': {
    'zh-CN': '编辑主题', 'zh-TW': '編輯主題', ja: 'テーマを編集', ko: '테마 편집', en: 'Edit theme',
  },
  'sp.delete': {
    'zh-CN': '删除', 'zh-TW': '刪除', ja: '削除', ko: '삭제', en: 'Delete',
  },
  'sp.deleteConfirm': {
    'zh-CN': '删除自定义主题「{name}」？',
    'zh-TW': '刪除自訂主題「{name}」？',
    ja: 'カスタムテーマ「{name}」を削除しますか？',
    ko: '사용자 지정 테마 「{name}」을(를) 삭제하시겠습니까?',
    en: 'Delete custom theme "{name}"?',
  },
  'theme.copy': {
    'zh-CN': '{name} 副本', 'zh-TW': '{name} 副本', ja: '{name} のコピー', ko: '{name} 사본', en: '{name} Copy',
  },
  'sp.display': {
    'zh-CN': '显示', 'zh-TW': '顯示', ja: '表示', ko: '표시', en: 'Display',
  },
  'sp.showNumbers': {
    'zh-CN': '显示日期数字', 'zh-TW': '顯示日期數字', ja: '日付を表示', ko: '날짜 표시', en: 'Show date numbers',
  },
  'sp.showAge': {
    'zh-CN': '显示年龄', 'zh-TW': '顯示年齡', ja: '年齢を表示', ko: '나이 표시', en: 'Show age',
  },
  'sp.showQuote': {
    'zh-CN': '每日一句', 'zh-TW': '每日一句', ja: '今日の一言', ko: '오늘의 한마디', en: 'Daily quote',
  },
  'sp.showHistory': {
    'zh-CN': '历史上的今天', 'zh-TW': '歷史上的今天', ja: '今日は何の日', ko: '오늘의 역사', en: 'On this day in history',
  },
  'sp.showBg': {
    'zh-CN': '背景图片', 'zh-TW': '背景圖片', ja: '背景画像', ko: '배경 이미지', en: 'Background image',
  },
  'sp.glass': {
    'zh-CN': '毛玻璃', 'zh-TW': '毛玻璃', ja: 'すりガラス', ko: '유리 효과', en: 'Glassmorphism',
  },
  'sp.glassHint': {
    'zh-CN': '向左卡片更实，向右逐渐透明并带磨砂模糊（类 macOS 毛玻璃），拖动时页面实时预览。',
    'zh-TW': '向左卡片更實，向右逐漸透明並帶磨砂模糊（類 macOS 毛玻璃），拖動時頁面即時預覽。',
    ja: '左で実色、右で透明＋ブラー（macOS 風）。ドラッグ中リアルタイムでプレビューされます。',
    ko: '왼쪽은 불투명, 오른쪽은 투명+블러(macOS 스타일). 드래그하는 동안 실시간으로 미리 볼 수 있습니다.',
    en: 'Left for a solid card, right for transparency with frosted blur (macOS-style). Preview applies live.',
  },
  'sp.glassSolid': {
    'zh-CN': '实底', 'zh-TW': '實底', ja: '実色', ko: '불투명', en: 'Solid',
  },
  'sp.glassClear': {
    'zh-CN': '透明', 'zh-TW': '透明', ja: '透明', ko: '투명', en: 'Clear',
  },
  'sp.glassOriginal': {
    'zh-CN': '原始', 'zh-TW': '原始', ja: '既定', ko: '기본', en: 'Original',
  },
  'sp.showStages': {
    'zh-CN': '生命阶段带', 'zh-TW': '生命階段帶', ja: 'ライフステージ帯', ko: '생애 단계 띠', en: 'Life stage band',
  },
  'sp.ms': {
    'zh-CN': '重要日期', 'zh-TW': '重要日期', ja: '大切な日', ko: '중요한 날', en: 'Important dates',
  },
  'sp.msHint': {
    'zh-CN': '标记生日、纪念日、目标日等重要日期，对应格子会显示图标。勾选「每年重复」适合生日与纪念日。',
    'zh-TW': '標記生日、紀念日、目標日等重要日期，對應格子會顯示圖示。勾選「每年重複」適合生日與紀念日。',
    ja: '誕生日・記念日・目標日などの大切な日を登録すると、その日のセルにアイコンが表示されます。「毎年繰り返す」は誕生日や記念日に。',
    ko: '생일, 기념일, 목표일 등 중요한 날을 등록하면 해당 칸에 아이콘이 표시됩니다. 「매년 반복」은 생일과 기념일에 적합합니다.',
    en: 'Mark important dates like birthdays, anniversaries, and goals — the cell shows an icon. "Repeat yearly" suits birthdays and anniversaries.',
  },
  'sp.msEmpty': {
    'zh-CN': '还没有重要日期。', 'zh-TW': '還沒有重要日期。', ja: 'まだ大切な日がありません。', ko: '아직 중요한 날이 없습니다.', en: 'No important dates yet.',
  },
  'sp.msLabelPh': {
    'zh-CN': '事件名称', 'zh-TW': '事件名稱', ja: 'イベント名', ko: '이벤트 이름', en: 'Event name',
  },
  'sp.msRecurring': {
    'zh-CN': '每年重复', 'zh-TW': '每年重複', ja: '毎年繰り返す', ko: '매년 반복', en: 'Repeat yearly',
  },
  'sp.msAdd': {
    'zh-CN': '添加', 'zh-TW': '新增', ja: '追加', ko: '추가', en: 'Add',
  },
  'ms.yearly': {
    'zh-CN': '每年 {month}月{day}日', 'zh-TW': '每年 {month}月{day}日', ja: '毎年 {month}月{day}日', ko: '매년 {month}월 {day}일', en: 'Every year, {month}/{day}',
  },
  'ms.onceday': {
    'zh-CN': '{year}年{month}月{day}日', 'zh-TW': '{year}年{month}月{day}日', ja: '{year}年{month}月{day}日', ko: '{year}년 {month}월 {day}일', en: '{year}/{month}/{day}',
  },

  // 主题编辑器
  'te.title': {
    'zh-CN': '编辑主题', 'zh-TW': '編輯主題', ja: 'テーマを編集', ko: '테마 편집', en: 'Edit theme',
  },
  'te.name': {
    'zh-CN': '主题名称', 'zh-TW': '主題名稱', ja: 'テーマ名', ko: '테마 이름', en: 'Theme name',
  },
  'te.glyph': {
    'zh-CN': '格子图形', 'zh-TW': '格子圖形', ja: 'セル図形', ko: '칸 도형', en: 'Cell glyph',
  },
  'te.glyphColors': {
    'zh-CN': '图形颜色（过去 / 未来 / 今天）',
    'zh-TW': '圖形顏色（過去 / 未來 / 今天）',
    ja: '図形の色（過去 / 未来 / 今日）',
    ko: '도형 색상 (과거 / 미래 / 오늘)',
    en: 'Glyph colors (past / future / today)',
  },
  'te.past': {
    'zh-CN': '过去', 'zh-TW': '過去', ja: '過去', ko: '과거', en: 'Past',
  },
  'te.future': {
    'zh-CN': '未来', 'zh-TW': '未來', ja: '未来', ko: '미래', en: 'Future',
  },
  'te.today': {
    'zh-CN': '今天', 'zh-TW': '今天', ja: '今日', ko: '오늘', en: 'Today',
  },
  'te.bg': {
    'zh-CN': '背景图', 'zh-TW': '背景圖', ja: '背景画像', ko: '배경 이미지', en: 'Background image',
  },
  'te.bgEmpty': {
    'zh-CN': '无背景图', 'zh-TW': '無背景圖', ja: '背景画像なし', ko: '배경 이미지 없음', en: 'No image',
  },
  'te.upload': {
    'zh-CN': '上传图片', 'zh-TW': '上傳圖片', ja: '画像をアップロード', ko: '이미지 업로드', en: 'Upload',
  },
  'te.clear': {
    'zh-CN': '清除', 'zh-TW': '清除', ja: 'クリア', ko: '지우기', en: 'Clear',
  },
  'te.bgHint': {
    'zh-CN': '图片压缩后仅保存在本机（浏览器存储限制，不随账号同步）；换设备后需重新上传。',
    'zh-TW': '圖片壓縮後僅儲存在本機（瀏覽器儲存限制，不隨帳號同步）；換裝置後需重新上傳。',
    ja: '画像は圧縮されこの端末にのみ保存されます（ブラウザの保存容量の都合で同期されません）。他の端末では再度アップロードしてください。',
    ko: '이미지는 압축되어 이 기기에만 저장됩니다 (브라우저 저장소 제한으로 동기화되지 않음). 다른 기기에서는 다시 업로드하세요.',
    en: 'Images are compressed and stored on this device only (browser storage limits prevent sync). Re-upload on other devices.',
  },
  'te.overlay': {
    'zh-CN': '顶部遮罩（让标题在背景图上可读）',
    'zh-TW': '頂部遮罩（讓標題在背景圖上可讀）',
    ja: '上部オーバーレイ（背景画像の上でタイトルを読みやすく）',
    ko: '상단 오버레이 (배경 이미지 위에서 제목을 읽기 쉽게)',
    en: 'Top overlay (keeps the title readable over the image)',
  },
  'te.overlayNone': {
    'zh-CN': '无', 'zh-TW': '無', ja: 'なし', ko: '없음', en: 'None',
  },
  'te.overlayLight': {
    'zh-CN': '浅色（适用于深色文字）', 'zh-TW': '淺色（適用於深色文字）', ja: '浅色（濃い文字向け）', ko: '밝게 (어두운 글자용)', en: 'Light (for dark text)',
  },
  'te.overlayDark': {
    'zh-CN': '深色（适用于浅色文字）', 'zh-TW': '深色（適用於淺色文字）', ja: '深色（薄い文字向け）', ko: '어둡게 (밝은 글자용)', en: 'Dark (for light text)',
  },
  'te.colors': {
    'zh-CN': '配色', 'zh-TW': '配色', ja: '配色', ko: '색상', en: 'Colors',
  },
  'te.glow': {
    'zh-CN': '今天格光晕', 'zh-TW': '今天格光暈', ja: '今日セルの光彩', ko: '오늘 칸 광원 효과', en: 'Today cell glow',
  },
  'te.glowColor': {
    'zh-CN': '光晕色', 'zh-TW': '光暈色', ja: '光彩の色', ko: '광원 색상', en: 'Glow color',
  },
  'te.alphas': {
    'zh-CN': '不透明度', 'zh-TW': '不透明度', ja: '不透明度', ko: '불투명도', en: 'Opacity',
  },
  'te.cancel': {
    'zh-CN': '取消', 'zh-TW': '取消', ja: 'キャンセル', ko: '취소', en: 'Cancel',
  },
  'te.save': {
    'zh-CN': '保存主题', 'zh-TW': '儲存主題', ja: 'テーマを保存', ko: '테마 저장', en: 'Save theme',
  },
  'te.alphaCard': {
    'zh-CN': '卡片', 'zh-TW': '卡片', ja: 'カード', ko: '카드', en: 'Card',
  },
  'te.bgSaveFailed': {
    'zh-CN': '保存失败：存储空间不足，请删除部分自定义主题或背景图。',
    'zh-TW': '儲存失敗：儲存空間不足，請刪除部分自訂主題或背景圖。',
    ja: '保存に失敗しました：ストレージ容量が不足しています。カスタムテーマや背景画像を削除してください。',
    ko: '저장 실패: 저장 공간이 부족합니다. 사용자 지정 테마나 배경 이미지를 일부 삭제하세요.',
    en: 'Save failed: storage is full. Delete some custom themes or background images.',
  },

  // 配色字段名
  'color.text': {
    'zh-CN': '文字', 'zh-TW': '文字', ja: '文字', ko: '글자', en: 'Text',
  },
  'color.muted': {
    'zh-CN': '辅助文字', 'zh-TW': '輔助文字', ja: '補助文字', ko: '보조 글자', en: 'Muted text',
  },
  'color.pageBg': {
    'zh-CN': '页面底色', 'zh-TW': '頁面底色', ja: 'ページ背景', ko: '페이지 배경', en: 'Page background',
  },
  'color.cardBg': {
    'zh-CN': '卡片底色', 'zh-TW': '卡片底色', ja: 'カード背景', ko: '카드 배경', en: 'Card background',
  },
  'color.cellLine': {
    'zh-CN': '网格线', 'zh-TW': '格線', ja: 'グリッド線', ko: '격자선', en: 'Grid lines',
  },
  'color.cellPast': {
    'zh-CN': '过去格底色', 'zh-TW': '過去格底色', ja: '過去セル背景', ko: '과거 칸 배경', en: 'Past cell bg',
  },
  'color.cellPastText': {
    'zh-CN': '过去格文字', 'zh-TW': '過去格文字', ja: '過去セル文字', ko: '과거 칸 글자', en: 'Past cell text',
  },
  'color.cellFuture': {
    'zh-CN': '未来格底色', 'zh-TW': '未來格底色', ja: '未来セル背景', ko: '미래 칸 배경', en: 'Future cell bg',
  },
  'color.cellFutureText': {
    'zh-CN': '未来格文字', 'zh-TW': '未來格文字', ja: '未来セル文字', ko: '미래 칸 글자', en: 'Future cell text',
  },
  'color.cellToday': {
    'zh-CN': '今天格底色', 'zh-TW': '今天格底色', ja: '今日セル背景', ko: '오늘 칸 배경', en: 'Today cell bg',
  },
  'color.accent': {
    'zh-CN': '强调色', 'zh-TW': '強調色', ja: 'アクセント', ko: '강조색', en: 'Accent',
  },

  // 图形名
  'glyph.none': {
    'zh-CN': '无', 'zh-TW': '無', ja: 'なし', ko: '없음', en: 'None',
  },
  'glyph.bulb': {
    'zh-CN': '灯泡', 'zh-TW': '燈泡', ja: '電球', ko: '전구', en: 'Light bulb',
  },
  'glyph.wave': {
    'zh-CN': '浪花', 'zh-TW': '浪花', ja: '波', ko: '파도', en: 'Wave',
  },
  'glyph.sprout': {
    'zh-CN': '禾苗', 'zh-TW': '禾苗', ja: '若苗', ko: '새싹', en: 'Sprout',
  },
  'glyph.note': {
    'zh-CN': '音符', 'zh-TW': '音符', ja: '音符', ko: '음표', en: 'Note',
  },

  // 里程碑图标名
  'icon.cake': {
    'zh-CN': '蛋糕', 'zh-TW': '蛋糕', ja: 'ケーキ', ko: '케이크', en: 'Cake',
  },
  'icon.rings': {
    'zh-CN': '戒指', 'zh-TW': '戒指', ja: '指輪', ko: '반지', en: 'Rings',
  },
  'icon.flag': {
    'zh-CN': '旗帜', 'zh-TW': '旗幟', ja: '旗', ko: '깃발', en: 'Flag',
  },
  'icon.star': {
    'zh-CN': '星星', 'zh-TW': '星星', ja: '星', ko: '별', en: 'Star',
  },
  'icon.heart': {
    'zh-CN': '爱心', 'zh-TW': '愛心', ja: 'ハート', ko: '하트', en: 'Heart',
  },

  // 预制主题名与描述
  'theme.default': {
    'zh-CN': '默认', 'zh-TW': '預設', ja: '既定', ko: '기본', en: 'Default',
  },
  'theme.default.desc': {
    'zh-CN': '白纸灰格，朴素克制',
    'zh-TW': '白紙灰格，樸素克制',
    ja: '白紙に灰色の格子、質素で控えめ',
    ko: '하얀 종이에 회색 격자, 담담하고 절제됨',
    en: 'Gray cells on white — quiet and restrained',
  },
  'theme.death-diary': {
    'zh-CN': '死亡日记', 'zh-TW': '死亡日記', ja: '死の日記', ko: '죽음의 일기', en: 'Death Diary',
  },
  'theme.death-diary.desc': {
    'zh-CN': '星月夜下，剩下的日子是一盏盏待点亮的灯',
    'zh-TW': '星月夜下，剩下的日子是一盞盞待點亮的燈',
    ja: '星月夜の下、残りの日々は灯をともすのを待つランプ',
    ko: '별이 빛나는 밤 아래, 남은 날은 켜지길 기다리는 등불',
    en: 'Under The Starry Night, the days left are lamps waiting to be lit',
  },
  'theme.deep-water': {
    'zh-CN': '深水潜流', 'zh-TW': '深水潛流', ja: '深水潜流', ko: '깊은 물의 흐름', en: 'Deep Water',
  },
  'theme.deep-water.desc': {
    'zh-CN': '神奈川冲浪里，每一天都是一朵浪花',
    'zh-TW': '神奈川沖浪裡，每一天都是一朵浪花',
    ja: '神奈川沖浪裏、毎日がひとつの波',
    ko: '가나가와 파도 아래, 매일이 하나의 파도',
    en: 'The Great Wave off Kanagawa — every day a wave',
  },
  'theme.hope-field': {
    'zh-CN': '希望田野', 'zh-TW': '希望田野', ja: '希望の野原', ko: '희망의 들판', en: 'Field of Hope',
  },
  'theme.hope-field.desc': {
    'zh-CN': '麦田与柏树下，每一天都是一株禾苗',
    'zh-TW': '麥田與柏樹下，每一天都是一株禾苗',
    ja: '麦畑と糸杉の下、毎日が一本の若苗',
    ko: '밀밭과 사이프러스 아래, 매일이 하나의 새싹',
    en: 'Under cypresses in the wheat field — every day a seedling',
  },
  'theme.youth-song': {
    'zh-CN': '青春之歌', 'zh-TW': '青春之歌', ja: '青春の歌', ko: '청춘의 노래', en: 'Song of Youth',
  },
  'theme.youth-song.desc': {
    'zh-CN': '莫奈的天空下，每一天都是一个音符',
    'zh-TW': '莫內的天空下，每一天都是一個音符',
    ja: 'モネの空の下、毎日がひとつの音符',
    ko: '모네의 하늘 아래, 매일이 하나의 음표',
    en: "Under Monet's sky — every day a note",
  },

  // F-09：纪念日倒计时
  'countdown.days': {
    'zh-CN': '距「{label}」还有 {n} 天', 'zh-TW': '距「{label}」還有 {n} 天', ja: '「{label}」まであと {n} 日', ko: '「{label}」까지 {n}일 남음', en: '{n} days until "{label}"',
  },
  'countdown.soon': {
    'zh-CN': '即将到来', 'zh-TW': '即將到來', ja: 'もうすぐ', ko: '곧 다가옴', en: 'coming up',
  },
  'countdown.today': {
    'zh-CN': '今天是「{label}」', 'zh-TW': '今天是「{label}」', ja: '今日は「{label}」', ko: '오늘은 「{label}」', en: 'Today is "{label}"',
  },

  // F-07：生命阶段名
  'stage.childhood': {
    'zh-CN': '童年', 'zh-TW': '童年', ja: '幼少期', ko: '유년기', en: 'Childhood',
  },
  'stage.school': {
    'zh-CN': '求学', 'zh-TW': '求學', ja: '学生時代', ko: '학생 시절', en: 'School',
  },
  'stage.college': {
    'zh-CN': '大学', 'zh-TW': '大學', ja: '大学', ko: '대학', en: 'College',
  },
  'stage.career': {
    'zh-CN': '事业', 'zh-TW': '事業', ja: '仕事', ko: '경력', en: 'Career',
  },
  'stage.retire': {
    'zh-CN': '退休', 'zh-TW': '退休', ja: '引退', ko: '은퇴', en: 'Retirement',
  },
  'stage.tip': {
    'zh-CN': '{name} · {start}–{end} 岁', 'zh-TW': '{name} · {start}–{end} 歲', ja: '{name} · {start}–{end}歳', ko: '{name} · {start}–{end}세', en: '{name} · ages {start}–{end}',
  },

  // F-08：年度复盘卡
  'review.yearTitle': {
    'zh-CN': '{year} 年度复盘', 'zh-TW': '{year} 年度復盤', ja: '{year}年 年間レビュー', ko: '{year}년 연간 리뷰', en: '{year} Year in Review',
  },
  'review.birthdayTitle': {
    'zh-CN': '生日快乐 · {age} 岁', 'zh-TW': '生日快樂 · {age} 歲', ja: 'お誕生日おめでとう · {age}歳', ko: '생일 축하 · {age}세', en: 'Happy Birthday · age {age}',
  },
  'review.progressLine': {
    'zh-CN': '这是你人生的第 {age} 年，已度过 {percent}%',
    'zh-TW': '這是你人生的第 {age} 年，已度過 {percent}%',
    ja: '人生の第 {age} 年、{percent}% を過ごしました',
    ko: '인생의 {age}번째 해, {percent}%를 지났습니다',
    en: 'Year {age} of your life — {percent}% lived',
  },
  'review.milestonesHead': {
    'zh-CN': '这一年的重要日期', 'zh-TW': '這一年的重要日期', ja: 'この年の大切な日', ko: '올해의 중요한 날', en: 'Important dates this year',
  },
  'review.noMilestones': {
    'zh-CN': '这一年没有标记重要日期', 'zh-TW': '這一年沒有標記重要日期', ja: 'この年に大切な日のマークはありません', ko: '올해 표시된 중요한 날이 없습니다', en: 'No important dates marked this year',
  },
  'review.close': {
    'zh-CN': '关闭', 'zh-TW': '關閉', ja: '閉じる', ko: '닫기', en: 'Close',
  },
  'review.dontRemind': {
    'zh-CN': '不再自动提醒', 'zh-TW': '不再自動提醒', ja: '自動で通知しない', ko: '자동 알림 안 함', en: "Don't remind me again",
  },

  // F-11：首日体验
  'ob.themePreview': {
    'zh-CN': '先选一个喜欢的风格', 'zh-TW': '先選一個喜歡的風格', ja: 'お好みのスタイルを', ko: '마음에 드는 스타일을', en: 'Pick a style you like',
  },
  'ob.tzHint': {
    'zh-CN': '检测到时区：{tz}', 'zh-TW': '偵測到時區：{tz}', ja: '検出されたタイムゾーン：{tz}', ko: '감지된 시간대: {tz}', en: 'Detected timezone: {tz}',
  },
  'ob.tzMismatch': {
    'zh-CN': '（如出生时不在此时区，可稍后在设置中修改）', 'zh-TW': '（如出生時不在此時區，可稍後在設定中修改）', ja: '（出生時と異なる場合は、設定で後から変更できます）', ko: '（출생지와 다르면 나중에 설정에서 변경할 수 있습니다）', en: '(If different from your birthplace, you can change it later in settings)',
  },
};
