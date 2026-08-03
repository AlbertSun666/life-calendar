#!/usr/bin/env bash
# 发布前验证：语法检查 + 单元测试 + 扩展打包文件校验 + 本地 HTTP 服务截图（可选）
# 用法：
#   scripts/verify.sh              # 仅静态检查
#   scripts/verify.sh --screenshot # 额外截取 5 张关键界面截图（需 Chrome）
set -euo pipefail

cd "$(dirname "$0")/.."

JS_FILES=(
  src/newtab.js
  src/options.js
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
  src/lib/grid-to-png.js
  src/lib/notables.js
)

echo "==> 语法检查 (node --input-type=module --check)"
for f in "${JS_FILES[@]}"; do
  node --input-type=module --check < "$f"
done
echo "   ✔ 所有 JS 文件语法通过"

echo "==> 单元测试 (node:test)"
node --test test/*.test.js
echo "   ✔ 测试通过"

echo "==> 扩展打包与文件完整性"
scripts/package.sh > /dev/null
echo "   ✔ 打包完成"

SCREENSHOT=0
for arg in "$@"; do
  if [ "$arg" = "--screenshot" ]; then SCREENSHOT=1; fi
done

if [ "$SCREENSHOT" -eq 1 ]; then
  echo "==> 启动本地 HTTP 服务"
  python3 -m http.server 8123 --bind 127.0.0.1 &
  HTTP_PID=$!
  trap 'kill $HTTP_PID 2>/dev/null || true' EXIT
  sleep 1

  USER_DATA=$(mktemp -d)
  trap 'rm -rf "$USER_DATA"; kill $HTTP_PID 2>/dev/null || true' EXIT

  mkdir -p docs/screenshots/verify

  shots=(
    "newtab.html?birthdate=1990-06-15&lang=zh-CN&today=2026-08-02&theme=default|main"
    "newtab.html?birthdate=1990-06-15&lang=zh-CN&today=2026-01-02&review=1|review"
    "newtab.html?birthdate=1990-06-15&lang=zh-CN&today=2026-08-02&drill=2026-08|drill"
    "newtab.html?birthdate=1990-06-15&lang=en&today=2026-08-02&theme=deep-water|theme-en"
    "newtab.html?settings=open&scroll=data&birthdate=1990-06-15|settings"
  )

  for shot in "${shots[@]}"; do
    IFS='|' read -r url name <<< "$shot"
    echo "   截图: $name"
    google-chrome --headless=new --disable-gpu --disable-cache \
      --user-data-dir="$USER_DATA" \
      --window-size=1440,900 \
      --screenshot=docs/screenshots/verify/${name}.png \
      --virtual-time-budget=3000 \
      "http://127.0.0.1:8123/$url" >/dev/null 2>&1 || true
  done

  echo "   ✔ 截图已保存到 docs/screenshots/verify/"
fi

echo "==> 全部验证通过"
