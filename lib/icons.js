// 里程碑图标：内联 SVG（字符串），注入格子中显示
// 每个图标自带配色，保证在任何主题底色上都清晰可辨

const svg = (body, viewBox = '0 0 24 24') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${body}</svg>`;

export const MILESTONE_SVGS = {
  // 蛋糕：生日
  cake: svg(`
    <path d="M4 13h16v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6z" fill="#f4a7c3" stroke="#c05f8a" stroke-width="1.2"/>
    <path d="M6 13v-2.5A1.5 1.5 0 0 1 7.5 9h9a1.5 1.5 0 0 1 1.5 1.5V13" fill="#fbd3e2" stroke="#c05f8a" stroke-width="1.2"/>
    <path d="M12 9V6.5" stroke="#c05f8a" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="12" cy="5" r="1.2" fill="#f2b950" stroke="#d18a1f" stroke-width="0.8"/>
    <path d="M8.5 9v4M12 9v4M15.5 9v4" stroke="#c05f8a" stroke-width="1" stroke-linecap="round" opacity="0.55"/>
  `),
  // 戒指：婚礼 / 纪念日
  rings: svg(`
    <circle cx="9" cy="14" r="5" stroke="#d4a017" stroke-width="1.6"/>
    <circle cx="15" cy="10" r="5" stroke="#e3b93f" stroke-width="1.6"/>
  `),
  // 旗帜：目标日
  flag: svg(`
    <path d="M6 21V4" stroke="#8a8f98" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6 5h11l-2.5 3.5L17 12H6z" fill="#e05252" stroke="#c13a3a" stroke-width="1"/>
  `),
  // 星星：重要 / 其他
  star: svg(`
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
      fill="#f2b950" stroke="#d18a1f" stroke-width="1.2" stroke-linejoin="round"/>
  `),
  // 爱心
  heart: svg(`
    <path d="M12 20s-7-4.6-9.2-8.9C1.3 8.2 3.2 5 6.4 5c2 0 3.6 1.1 4.6 2.8l1 1.7 1-1.7C14 6.1 15.6 5 17.6 5c3.2 0 5.1 3.2 3.6 6.1C19 15.4 12 20 12 20z"
      fill="#e0527a" stroke="#c13a60" stroke-width="1.2" stroke-linejoin="round"/>
  `),
};

/** 生成一个里程碑图标元素（span.ms-icon > svg） */
export function createMilestoneIcon(iconId) {
  const span = document.createElement('span');
  span.className = 'ms-icon';
  span.innerHTML = MILESTONE_SVGS[iconId] || MILESTONE_SVGS.star;
  return span;
}
