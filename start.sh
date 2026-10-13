#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[提示] 未检测到 Node.js，请先安装：https://nodejs.org/zh-cn/download"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖（约几分钟）..."
  ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
fi
echo "正在启动 AI 待办助手..."
npm start
