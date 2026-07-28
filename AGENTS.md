# AGENTS 协作指南

给 AI 协作者的项目说明：架构、约定、工作流。修改代码前请先读完。

## 项目速览

「人生日历」浏览器扩展（Chrome/Edge MV3）：把一生画成一张表。零依赖、零构建、无后端，原生 HTML/CSS/JS（ES Modules）。

## 硬约束

- **不引入框架与构建工具**（React/Vue/Vite 等一律不要），零依赖是刻意的设计决策
- **不引入后端**：配置存 `chrome.storage.sync`，图片存 `chrome.storage.local`
- 最小改动原则：不顺手重构、不扩大 diff

## 架构关键点

### 主题系统（数据驱动，勿回退到静态 CSS 文件）

```
主题数据（src/lib/theme-presets.js 预设 / settings.customThemes 自定义）
  → src/lib/theme-css.js buildThemeCSS(theme, bgUrl, glass) 生成 CSS 文本
  → newtab.js 注入 <style id="theme-style">
```

- 格子装饰图形（灯泡/浪花/禾苗/音符）是 `src/lib/glyphs.js` 的参数化 SVG，按颜色生成 data-URI
- 预制主题只读；「另存为」= 深拷贝数据为自定义主题
- 上传背景图：canvas 压缩（1920px/JPEG 0.72）→ `chrome.storage.local`（sync 单项 8KB 放不下）；主题定义里只存引用 id
- 毛玻璃：`settings.glass`（0-100，50=原始）在 buildThemeCSS 内调整各 alpha + `.card` 的 backdrop-filter
- 背景图纱罩：有背景图时 buildThemeCSS 输出全页 `body::before` 纱罩（主题 `pageBg` 色），浓度取 `theme.bgVeil`（0~1），缺省按底色明暗推导（深 0.6 / 浅 0.8），上传图同管线自动生效；`overlay` 仅为可选的顶部渐变（`body::after`）
- **配色约定：从主题背景画作中取色**，用 `xcrun swift tools/extract-colors.swift` 提取，不要从通用色卡找近似色

### 存储

- 单一 key `settings` 存整个配置对象（见 `src/lib/constants.js` DEFAULT_SETTINGS）
- `src/lib/storage.js` 在无扩展环境降级 localStorage，因此可以用普通 HTTP 服务预览调试
- dev URL 参数（仅非扩展环境生效）：`?birthdate= &nickname= &theme= &today= &year= &settings=open &editor=new &lang= &glass= &bg=0 &ct=1 &bgtest=1 &ms=`

### i18n

- `src/lib/i18n.js` 集中语言包（简中/繁中/日/韩/英），UI 文本一律 `t('key')`，禁止在页面/组件里写死文本
- 新增 UI 文本 = 在 STRINGS 加 5 语言条目
- 例外：名言（src/lib/quotes.js）与历史事件（src/lib/history.js）是内容数据，保持中文原文

## 工作流

1. 改动后 `node --input-type=module --check < file` 语法检查所有 JS
2. 视觉改动必须截图验证：
   - `python3 -m http.server 8123 --bind 127.0.0.1` 起本地服务
   - 无头 Chrome 截图：`--headless=new --screenshot=... --virtual-time-budget=3000 "http://127.0.0.1:8123/newtab.html?..."`（Chrome 截图后不退出，需 kill）
   - 用 ReadMediaFile 逐张检查，不满意就迭代
3. manifest.json 的 version 在发布前递增

## 代码约定

- 注释用中文，风格简洁克制（与现有代码一致）
- 界面风格：简洁大气素雅，耐看不花哨；装饰元素必须有主题语义
- 新增设置项：DEFAULT_SETTINGS 加默认值 + 设置面板加控件 + i18n 五语言
