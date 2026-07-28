#!/usr/bin/env bash
# 打包扩展为 Chrome Web Store 提交用的 zip
# 仅包含运行时必需文件，排除开发文档与工具
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
OUT="life-calendar-v${VERSION}.zip"

# 生成文件列表（git 已有跟踪的运行时文件 + 显式排除开发文件）
FILES=(
  manifest.json
  newtab.html
  options.html
  privacy.html
  src/newtab.css
  src/newtab.js
  src/options.css
  src/options.js
  src/settings-panel.css
  src/settings-panel.js
  src/theme-editor.js
  src/lib/constants.js
  src/lib/date.js
  src/lib/glyphs.js
  src/lib/history.js
  src/lib/i18n.js
  src/lib/icons.js
  src/lib/quotes.js
  src/lib/storage.js
  src/lib/theme-css.js
  src/lib/theme-presets.js
  assets/parasol.jpg
  assets/starry.jpg
  assets/wave.jpg
  assets/wheat.jpg
  icons/icon-16.png
  icons/icon-48.png
  icons/icon-128.png
)

# 校验所有文件存在
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: missing file: $f" >&2
    exit 1
  fi
done

rm -f "$OUT"
zip "$OUT" "${FILES[@]}"

echo "✔ 打包完成: $OUT ($(du -h "$OUT" | cut -f1))"
echo "  包含 ${#FILES[@]} 个文件"
