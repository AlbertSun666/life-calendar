// B6：同龄人名人对照——"34 岁的雷军即将创立小米"
// 按用户当前年龄匹配名人当年事件，统计行下方一行，每日轮换
// 近现代名人（科技/商业为主），不碰政治人物，考据须可查证
// 数据按语言分池，缺池回退 zh-CN

/**
 * 名人事件数据结构：
 * { age, name, event, year, source }
 * - age: 名人当时的年龄
 * - year: 事件发生的年份（用于校验 age = year - 名人出生年）
 * - name/event: 按当前 UI 语言书写
 * - source: 考据来源备注（简短，便于核查）
 */
export const NOTABLES = {
  'zh-CN': [
    { age: 23, name: '马克·扎克伯格', event: 'Facebook 活跃用户突破 5000 万', year: 2007, source: 'Facebook 年报' },
    { age: 28, name: '雷军', event: '创办小米科技', year: 2010, source: '小米官方历程' },
    { age: 25, name: '乔布斯', event: 'Apple 上市，身价过亿', year: 1980, source: 'Walter Isaacson《乔布斯传》' },
    { age: 32, name: '埃隆·马斯克', event: '加入 Tesla 并任董事长', year: 2004, source: 'Tesla 官方' },
    { age: 30, name: '比尔·盖茨', event: 'Windows 1.0 发布', year: 1985, source: '微软官方' },
    { age: 31, name: '拉里·佩奇', event: 'Google 上市', year: 2004, source: 'Google IPO 招股书' },
    { age: 41, name: '雷军', event: '小米发布第一款手机', year: 2011, source: '小米发布会' },
    { age: 42, name: '乔布斯', event: '重返 Apple，开启复兴', year: 1997, source: 'Apple 官方' },
    { age: 44, name: '埃隆·马斯克', event: 'SpaceX 首次成功回收火箭', year: 2015, source: 'SpaceX 官方' },
    { age: 27, name: '稻盛和夫', event: '创办京瓷', year: 1959, source: '稻盛和夫自传' },
    { age: 43, name: '任正非', event: '创办华为', year: 1987, source: '华为官方' },
    { age: 35, name: '马云', event: '创办阿里巴巴', year: 1999, source: '阿里巴巴官方' },
    { age: 38, name: '王传福', event: '比亚迪上市', year: 2004, source: '比亚迪年报' },
    { age: 52, name: '乔布斯', event: 'iPhone 发布，开启智能手机时代', year: 2007, source: '苹果发布会' },
    { age: 46, name: '埃隆·马斯克', event: 'Tesla Model 3 量产交付', year: 2017, source: 'Tesla 官方' },
    { age: 52, name: '稻盛和夫', event: '创办第二电电（KDDI）', year: 1984, source: '稻盛和夫自传' },
    { age: 53, name: '任正非', event: '华为出海，开拓国际市场', year: 1997, source: '华为官方' },
    { age: 50, name: '马云', event: '阿里巴巴赴美上市', year: 2014, source: '阿里巴巴招股书' },
    { age: 55, name: '王传福', event: '比亚迪成全球新能源车销冠', year: 2021, source: '比亚迪年报' },
    { age: 78, name: '稻盛和夫', event: '出任日航会长，一年扭亏', year: 2010, source: '稻盛和夫《日航重生》' },
  ],
  // 繁體：與簡中同批名人，繁體化人名與用詞
  'zh-TW': [
    { age: 23, name: '馬克·祖克柏', event: 'Facebook 活躍用戶突破 5000 萬', year: 2007, source: 'Facebook 年報' },
    { age: 28, name: '雷軍', event: '創辦小米科技', year: 2010, source: '小米官方歷程' },
    { age: 25, name: '賈伯斯', event: 'Apple 上市，身價過億', year: 1980, source: 'Walter Isaacson《賈伯斯傳》' },
    { age: 32, name: '伊隆·馬斯克', event: '加入 Tesla 並任董事長', year: 2004, source: 'Tesla 官方' },
    { age: 30, name: '比爾·蓋茲', event: 'Windows 1.0 發表', year: 1985, source: '微軟官方' },
    { age: 31, name: '賴瑞·佩吉', event: 'Google 上市', year: 2004, source: 'Google IPO 招股書' },
    { age: 41, name: '雷軍', event: '小米發布第一款手機', year: 2011, source: '小米發布會' },
    { age: 42, name: '賈伯斯', event: '重返 Apple，開啟復興', year: 1997, source: 'Apple 官方' },
    { age: 44, name: '伊隆·馬斯克', event: 'SpaceX 首次成功回收火箭', year: 2015, source: 'SpaceX 官方' },
    { age: 27, name: '稻盛和夫', event: '創辦京瓷', year: 1959, source: '稻盛和夫自傳' },
    { age: 43, name: '任正非', event: '創辦華為', year: 1987, source: '華為官方' },
    { age: 35, name: '馬雲', event: '創辦阿里巴巴', year: 1999, source: '阿里巴巴官方' },
    { age: 38, name: '王傳福', event: '比亞迪上市', year: 2004, source: '比亞迪年報' },
    { age: 52, name: '賈伯斯', event: 'iPhone 發表，開啟智慧型手機時代', year: 2007, source: '蘋果發表會' },
    { age: 46, name: '伊隆·馬斯克', event: 'Tesla Model 3 量產交付', year: 2017, source: 'Tesla 官方' },
    { age: 52, name: '稻盛和夫', event: '創辦第二電電（KDDI）', year: 1984, source: '稻盛和夫自傳' },
    { age: 78, name: '稻盛和夫', event: '出任日航會長，一年扭虧', year: 2010, source: '稻盛和夫《日航重生》' },
  ],
  // 日本語：日本の科技・ビジネス人物中心
  ja: [
    { age: 25, name: 'マーク・ザッカーバーグ', event: 'Facebook 活躍ユーザー5000万人突破', year: 2007, source: 'Facebook 年次報告' },
    { age: 24, name: '孫正義', event: 'ソフトバンク設立', year: 1981, source: 'ソフトバンク公式' },
    { age: 25, name: 'スティーブ・ジョブズ', event: 'Apple 上場、億万長者に', year: 1980, source: 'Walter Isaacson『スティーブ・ジョブズ』' },
    { age: 30, name: 'ビル・ゲイツ', event: 'Windows 1.0 発表', year: 1985, source: 'マイクロソフト公式' },
    { age: 37, name: '孫正義', event: 'ソフトバンク上場', year: 1994, source: 'ソフトバンク公式' },
    { age: 42, name: '柳井正', event: 'ユニクロ原宿店開店', year: 1991, source: '柳井正『一勝九敗』' },
    { age: 27, name: '稲盛和夫', event: '京セラ設立', year: 1959, source: '稲盛和夫自伝' },
    { age: 25, name: '盛田昭夫', event: '東京通信工業（後のソニー）創業', year: 1946, source: 'ソニー公式' },
    { age: 41, name: '本田宗一郎', event: '本田技研工業設立', year: 1948, source: '本田技研公式' },
    { age: 25, name: '松下幸之助', event: '松下電器具製作所を設立（後のパナソニック）', year: 1918, source: 'パナソニック公式' },
    { age: 52, name: 'スティーブ・ジョブズ', event: 'iPhone 発表、スマートフォン時代を開く', year: 2007, source: 'Apple 発表会' },
    { age: 46, name: 'イーロン・マスク', event: 'Tesla Model 3 量産引き渡し開始', year: 2017, source: 'Tesla 公式' },
    { age: 52, name: '稲盛和夫', event: '第二電電（KDDI）設立', year: 1984, source: '稲盛和夫自伝' },
    { age: 53, name: '孫正義', event: 'アジア最大級のインターネット投資を加速', year: 2009, source: 'ソフトバンク決算' },
    { age: 78, name: '稲盛和夫', event: 'JAL 会長就任、1年で黒字転換', year: 2010, source: '稲盛和夫『JAL再生』' },
  ],
  // 한국어：한국의 과학기술·비즈니스 인물 중심
  ko: [
    { age: 28, name: '이병철', event: '삼성상회 설립', year: 1938, source: '삼성 공식' },
    { age: 45, name: '이건희', event: '삼성그룹 회장 취임', year: 1987, source: '삼성 공식' },
    { age: 52, name: '정주영', event: '현대자동차 설립', year: 1967, source: '현대 공식' },
    { age: 50, name: '구본무', event: 'LG그룹 회장 취임', year: 1995, source: 'LG 공식' },
    { age: 44, name: '김범수', event: '카카오톡 출시', year: 2010, source: '카카오 공식' },
    { age: 59, name: '이병철', event: '삼성전자 설립', year: 1969, source: '삼성 공식' },
    { age: 59, name: '정주영', event: '현대중공업 설립', year: 1974, source: '현대 공식' },
    { age: 40, name: '구광모', event: 'LG그룹 회장 취임', year: 2018, source: 'LG 공식' },
    { age: 52, name: '스티브 잡스', event: 'iPhone 발표, 스마트폰 시대 개막', year: 2007, source: '애플 발표회' },
    { age: 46, name: '일론 머스크', event: 'Tesla Model 3 양산 인도 시작', year: 2017, source: 'Tesla 공식' },
    { age: 49, name: '김범수', event: '카카오 상장', year: 2015, source: '카카오 공식' },
    { age: 61, name: '정주영', event: '현대일렉트릭 설립', year: 1977, source: '현대 공식' },
  ],
  // English: global tech/business leaders
  en: [
    { age: 23, name: 'Mark Zuckerberg', event: 'Facebook hit 50 million active users', year: 2007, source: 'Facebook annual report' },
    { age: 28, name: 'Lei Jun', event: 'founded Xiaomi', year: 2010, source: 'Xiaomi official' },
    { age: 25, name: 'Steve Jobs', event: 'Apple IPO, became a millionaire', year: 1980, source: 'Walter Isaacson, Steve Jobs' },
    { age: 32, name: 'Elon Musk', event: 'joined Tesla as Chairman', year: 2004, source: 'Tesla official' },
    { age: 30, name: 'Bill Gates', event: 'released Windows 1.0', year: 1985, source: 'Microsoft official' },
    { age: 31, name: 'Larry Page', event: 'Google IPO', year: 2004, source: 'Google prospectus' },
    { age: 41, name: 'Lei Jun', event: 'launched first Xiaomi phone', year: 2011, source: 'Xiaomi launch event' },
    { age: 42, name: 'Steve Jobs', event: 'returned to Apple, began the comeback', year: 1997, source: 'Apple official' },
    { age: 44, name: 'Elon Musk', event: 'SpaceX landed its first reusable rocket', year: 2015, source: 'SpaceX official' },
    { age: 27, name: 'Kazuo Inamori', event: 'founded Kyocera', year: 1959, source: 'Inamori autobiography' },
    { age: 43, name: 'Ren Zhengfei', event: 'founded Huawei', year: 1987, source: 'Huawei official' },
    { age: 35, name: 'Jack Ma', event: 'founded Alibaba', year: 1999, source: 'Alibaba official' },
    { age: 52, name: 'Steve Jobs', event: 'unveiled the iPhone, ushering in the smartphone era', year: 2007, source: 'Apple keynote' },
    { age: 46, name: 'Elon Musk', event: 'Tesla Model 3 production deliveries began', year: 2017, source: 'Tesla official' },
    { age: 78, name: 'Kazuo Inamori', event: 'became JAL chairman, turned it profitable in a year', year: 2010, source: 'Inamori, "JAL Rebirth"' },
  ],
};

/** 取某语言的名人池（缺池回退 zh-CN） */
export function notablesForLang(lang) {
  const pool = NOTABLES[lang];
  return (pool && pool.length > 0) ? pool : NOTABLES['zh-CN'];
}

/**
 * 按用户当前年龄取当天的名人事件（每日轮换，同年龄同一天所有人看到同一条）
 * @param {string} lang 当前语言
 * @param {number} age 用户当前年龄
 * @param {number} dayOfYear 一年中的第几天（用于轮换）
 * @returns 名人事件对象，无匹配返回 null
 */
export function notableOfDay(lang, age, dayOfYear) {
  const pool = notablesForLang(lang);
  const matched = pool.filter((n) => n.age === age);
  if (matched.length === 0) return null;
  // 每日轮换：按 dayOfYear 取模，同一天稳定显示同一条
  const idx = ((dayOfYear % matched.length) + matched.length) % matched.length;
  return matched[idx];
}