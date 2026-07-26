# 人生日历 Life Calendar · 设计契约

> Chrome/Edge MV3 新标签页扩展。把 80 年画成一张表：每过一天涂满一格，
> 让人看清已走过的路与剩下的时光。
> 配套文件：`tokens.css`（变量契约）、`life-calendar.html`（单文件高保真原型）。

---

## 1. 设计哲学

- **网格即签名元素。** 80 年 = 80 个年格、一年 = 最多 366 个日格。网格占据画面
  绝对中心，任何装饰（画作背景、SVG 图形、纹理）都必须退居其后，服务于
  「时间流逝」这一主题，绝不喧宾夺主。
- **东西方美学的融合。** 版面是东方的——留白、居中、书卷气的宋体标题与
  大写数字月名；底色是西方的——梵高、北斋、莫奈的经典画作作为氛围层。
- **克制。** 一个屏幕一个焦点；装饰图形只出现在标题下方一处；动效只有
  150–240ms 的状态过渡；无渐变滥用、无 emoji、无花哨投影。
- **耐看不花哨。** 用户每天打开数十次新标签页，设计必须在第一万次观看时
  依然安静得体。

## 2. 色彩系统

所有颜色经 `tokens.css` 中的语义变量驱动，组件代码不写死任何 hex。
五套主题通过 `:root[data-theme="…"]` 覆盖同一组变量。

| 语义变量 | 职责 |
| --- | --- |
| `--bg` / `--bg-image` / `--bg-scrim` | 页面底色 / 背景画作 / 画作上的压暗压亮遮罩 |
| `--surface` | 日历卡片、弹窗底色（经 `--glass-alpha` 调制） |
| `--fg` / `--muted` / `--border` | 主文字 / 次要文字 / 描边 |
| `--accent` / `--accent-on` | 主题强调色（进度、选中态、主按钮）/ 其上文字 |
| `--cell-past-*` / `--cell-future-*` / `--cell-today-*` | 日格与年格的过去 / 未来 / 今天三态 |
| `--today-ring` | 今天格描边与年度进度条 |
| `--ornament` / `--quote-fg` | 装饰图形色 / 每日一句文字色 |
| `--accent-danger`（暗色主题） | 里程碑标记、删除操作 |
| `--card-texture` | 卡片纹理（仅青春之歌：极淡五线谱） |

### 五主题配色板

**① 默认 Default —— 白纸灰格，朴素克制。无装饰图形。**

| 角色 | 值 |
| --- | --- |
| 背景 / 卡片 | `#ffffff` |
| 过去格 | `#c8c8c5` 暖灰 |
| 未来格 | `#ffffff` 纯白，文字 `#b9b9b4` |
| 今天格 | 白底 + 红字 / 红描边 `#c3272b` |
| 进度与选中 | 墨色 `#1a1a1a` |

默认主题的日格数字**居中放大**（`--fs-day-center`），其余主题数字缩在右下角。

**② 死亡日记 Death Diary —— 梵高《星月夜》。装饰：灯泡。**

| 角色 | 值 |
| --- | --- |
| 背景 | 夜空蓝黑 `#1a2330` + `assets/starry.jpg` + 深色遮罩 |
| 卡片 | `#232f42`（比夜空浅一阶） |
| 过去格（熄灭的灯） | 旋涡蓝 `#2c3a52` |
| 未来格（待点亮的灯） | `#223148` |
| 今天格（亮着的灯） | 星月金 `#e5c758` |
| accent | 星月金 `#e5c758`；暗红 `#e85f57` 用于里程碑 |

**③ 深水潜流 Deep Water —— 葛饰北斋《神奈川冲浪里》。装饰：浪花。**

| 角色 | 值 |
| --- | --- |
| 背景 | 米白纸浪沫 `#f4efe0` + `assets/wave.jpg` + 暖白遮罩 |
| 卡片 | `#faf6ea` |
| 过去格（沉入深水） | 普鲁士蓝 `#385973` |
| 未来格（纸浪沫） | `#faf6ea` |
| 今天格（一枚印） | 印章朱红 `#b03a32` |
| accent | 普鲁士蓝 `#385973` |

**④ 希望田野 Field of Hope —— 梵高《麦田与柏树》。装饰：禾苗。**

| 角色 | 值 |
| --- | --- |
| 背景 | 柏树墨绿 `#16281a` + `assets/wheat.jpg` + 深绿遮罩 |
| 卡片 | `#20361f` |
| 过去格（已长成的苗） | 橄榄绿 `#93b04c` |
| 未来格（未耕的田） | `#27402a` |
| 今天格（正在抽穗） | 麦金 `#d9a93f` |
| accent | 麦金 `#d9a93f` |

**⑤ 青春之歌 Song of Youth —— 莫奈《撑阳伞的女人》。装饰：音符。**

| 角色 | 值 |
| --- | --- |
| 背景 | 莫奈天蓝 `#dce4ea` + `assets/parasol.jpg` + 淡蓝遮罩 |
| 卡片 | 云白 `#f4f7f9`，叠加极淡五线谱纹理（每 11px 一条 4.5% 透明度横线） |
| 过去格（已唱过的音符） | `#b9c9d4` |
| 未来格（云白） | `#f4f7f9` |
| 今天格（正在唱响的一拍） | 领结朱红 `#c24b36` |
| accent | 领结朱红 `#c24b36` |

## 3. 字体系统

全部使用系统字体栈，零外部字体文件（满足扩展 CSP）。

| 用途 | 变量 | 字体栈 |
| --- | --- | --- |
| 数字（年份、日号、统计） | `--font-num` | Didot → Bodoni MT → Times New Roman → Songti SC → serif |
| 标题（页标题、月名、引用） | `--font-title` | Songti SC → Noto Serif CJK SC → SimSun → serif |
| UI（按钮、标签、设置） | `--font-ui` | -apple-system → BlinkMacSystemFont → PingFang SC → Microsoft YaHei |

字号阶梯（`--fs-*`）：hero `clamp(28,4vw,40)` · year `clamp(12,1.5vw,19)` ·
age `clamp(8,.9vw,11)` · day `clamp(7,.8vw,10)` · day-center `clamp(9,1.1vw,14)` ·
month `clamp(10,1.2vw,15)` · quote/stats 15 · label 13 · meta 11。

## 4. 间距 · 圆角 · 阴影 · 动效

- 间距 4px 基准：`--space-1…--space-16`（4/8/12/16/24/32/48/64）。
- 网格几何：`--grid-cols: 32`（月标签 1 + 31 天；年格 16 × 2 列）、
  `--cell-gap: clamp(1.5px,.35vw,4px)`、卡片最大宽 `--grid-max: 880px`、
  卡片内边距 `--card-pad: clamp(16px,3vw,36px)`。
- 圆角：格 2.5px · 按钮 9px · 卡片 14px · 弹窗 16px · 进度条全圆。
- 阴影仅两级：浮层 `--shadow-raised`、弹窗 `--shadow-pop`。
- 毛玻璃：`--glass-alpha`（0.55–1）与 `--glass-blur`（0–24px）由设置滑杆
  0–100 实时驱动；卡片 `backdrop-filter: blur()` + 半透明底色，类 macOS。
- 动效：`--dur-fast 150ms` / `--dur-base 240ms`，`cubic-bezier(.2,0,0,1)`；
  `prefers-reduced-motion` 下全部归零。
- 焦点：统一 `--focus-ring`（底色 2px + accent 4px 双层环），键盘可达。

## 5. 组件规范

### 5.1 顶部信息区（居中）
标题（昵称 +「的人生日历」）→ 统计行（衬线数字：已度过 X 天 · 剩余 Y 天 ·
生命进度 Z%）→ 每日一句（可开关）→ 历史上的今天（可开关，无事件自动隐藏）。
右上角齿轮按钮，悬停旋转 30°。标题下方为**装饰图形带**（见 §6）。

### 5.2 人生进度条
80 段 6px 高细条，一段一年：已过年份填 `--accent`，今年段内嵌
`yearProgress()` 比例填充，未来段为 `--cell-border` 色。

### 5.3 日历卡片
- **年份网格**：5 行 × 16 列 = 80 格，与月份网格共享 32 列轨道，年格
  `grid-column: span 2` —— 年格宽度恒为日格两倍，上下严格等宽对齐。
  格内：年份数字（大，`--font-num`）+ 年龄小字（可关）。过去年填
  `--cell-past-*`，今年格 `--today-ring` 描边 + 底部 3px 年度进度条。
  含一次性里程碑的年份右上角 5px 圆点。点击选中（内嵌 2px accent 框）
  切换月份网格年份，再点回到今年。
- **月份网格**：12 行 × 32 列（1 标签 + 31 天位，不足 31 天的行尾以
  隐藏格补齐，保证逐行对齐）。月标签格：右下角小号数字（1–12）+ 中部
  月名（中文大写数字 / 日文和风月名竖排 / 英韩三字母缩写）。
- **日格**：1:1 方格，过去 / 未来 / 今天三态配色；右下角小号日号
  （可关；默认主题改为居中放大）；里程碑日左上角 7px ◆。
- **Tooltip**：悬停日格浮现，内容 = 日期 + 里程碑 + 历史上的今天；
  自动防溢出（贴边回退、上方无空间改下方）。

### 5.4 首次使用引导
极简居中弹窗：标题 + 一句描述 + 出生日期输入 +「开始」。淡入淡出，
Esc 可关；设置中可重新打开。

### 5.5 设置弹窗
悬浮页（不开新页），分组：基本（语言 / 昵称 / 出生日期 / 时区 / 主题）、
显示（年龄 / 日号 / 每日一句 / 历史上的今天 开关 + 毛玻璃滑杆实时预览）、
里程碑管理（列表 + 添加 + 删除，即时反映在年格圆点与日格 ◆ 上）、版本号。

## 6. 装饰图形（SVG 示意）

装饰图形只出现在标题下方的装饰带，每主题一组，颜色取 `--ornament`；
默认主题无装饰。

**灯泡（死亡日记）** —— 熄灭（空心）/ 亮着（实心星月金）/ 待点亮（虚线）：

```html
<svg width="18" height="24" viewBox="0 0 16 22">
  <path d="M8 1a5.5 5.5 0 0 0-3 10.1c.8.6 1 1.3 1 2.1v.8h4v-.8c0-.8.2-1.5 1-2.1A5.5 5.5 0 0 0 8 1z"
        fill="currentColor"/>
  <path d="M6 17h4M6.5 19.5h3" stroke="currentColor" stroke-width="1.3"/>
</svg>
```

**浪花（深水潜流）** —— 一条主浪线 + 一条淡浪线 + 两滴水珠：

```html
<svg width="96" height="20" viewBox="0 0 96 20" fill="none" stroke="currentColor" stroke-width="1.4">
  <path d="M2 12c6-8 12-8 16-2 3 4 8 4 12 0 4-5 10-6 14-1"/>
  <path d="M52 14c6-6 12-6 16-1 3 3 8 3 12-1 3-3 8-4 12 0" stroke-width="1.1" opacity=".38"/>
  <circle cx="18" cy="4" r="1.2" fill="currentColor" stroke="none"/>
</svg>
```

**禾苗（希望田野）** —— 双叶一茎，中间实心、两侧一虚一实：

```html
<svg width="16" height="26" viewBox="0 0 14 24" fill="none" stroke="currentColor" stroke-width="1.3">
  <path d="M7 23V8"/>
  <path d="M7 12C7 8 4.5 6 1.5 6c0 3.5 2.5 6 5.5 6z" fill="currentColor" stroke="none"/>
  <path d="M7 8c0-4 2.5-6 5.5-6 0 3.5-2.5 6-5.5 6z" fill="currentColor" stroke="none"/>
</svg>
```

**音符（青春之歌）** —— 中央双符头实心，两侧空心渐淡：

```html
<svg width="18" height="24" viewBox="0 0 16 22">
  <ellipse cx="4.5" cy="18" rx="3.4" ry="2.5" fill="currentColor"/>
  <ellipse cx="12" cy="15.5" rx="3.4" ry="2.5" fill="currentColor"/>
  <path d="M8 18V4l7.5-2v13.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
</svg>
```

## 7. 主题切换演示逻辑

原型以最简方式演示：顶栏五个主题按钮，点击即切换根元素属性——

```js
document.documentElement.dataset.theme =
  'default' | 'death-diary' | 'deep-water' | 'field-of-hope' | 'song-of-youth';
```

所有颜色、背景画、遮罩、纹理、装饰图形随之经 `tokens.css` 的
`:root[data-theme="…"]` 覆盖自动切换；设置弹窗中的主题下拉与按钮组双向同步。
扩展落地时将该值持久化到 `chrome.storage.sync` 即可。

## 8. 响应式与可访问性

- 网格最小宽 640px（移动端 560px），卡片内横向滚动，页面本身无横向滚动。
- 触控目标：主题按钮、齿轮、年格均可点；日格密度高，属只读信息格。
- 键盘：所有可交互元素 `:focus-visible` 显示双层焦点环；Esc 关闭弹窗。
- `prefers-reduced-motion`：全部过渡时长归零。
