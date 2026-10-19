#!/bin/zsh
cd -- "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  echo '请先安装 Node.js 22 或更新版本。'
  read '?按回车退出'
  exit 1
fi
echo '悦境 MALL · 在浏览器打开 http://127.0.0.1:5173/'
echo '按 Control+C 停止服务。'
node serve.mjs
