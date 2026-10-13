# WhatToDo

> 粘贴一大段文字，AI 自动变成待办清单 —— 一款本地运行的桌面待办小工具（Electron + Vue3）。

把群通知、长消息直接粘贴进来，AI 自动识别出**任务、截止时间、地点、所需物品、链接**，一键生成待办清单。数据全部保存在本地，不收集、不上传你的任何文字。

## ✨ 功能

- **AI 解析**：粘贴任意长文本 → 大模型自动提取任务/截止时间/地点/物品/链接 → 预览可修改 → 确认进列表
- **待办列表**：勾选完成、右上角悬停删除、长按拖拽排序（自动保存）
- **任务详情**：结构化展示地点/物品/链接，原始通知原文可编辑，日历设定开始/截止时间（单点=当天开始，两点=时间段）
- **样式主题**：深色 / 浅色 / 玻璃半透明（可调透明度，透出桌面）
- **窗口置顶**：一键钉在桌面最上层
- **开机自启**：设置里可开关
- **24 小时制时钟**：标题栏实时显示

## 🚀 快速开始

需要 Node.js 18+。

```bash
npm install
npm start          # 构建并启动
```

使用前先配置 AI 接口：点右上角 ⚙ 设置 → AI 解析 → 选择服务商（豆包 / DeepSeek / Kimi / 千问）→ 填入 API Key → 选模型。

> 无 API Key 时无法解析（会提示去设置）。本项目**不内置任何模型服务**，所有请求由你配置的服务商处理。

## 📦 打包

```bash
npm run build      # 构建前端到 dist/
```

绿色版打包（Windows）：将 `main.js / preload.js / package.json / lib / dist` 放入 Electron 解压目录的 `resources/app/` 即可。

## 🗂 目录结构

```
├── main.js              # Electron 主进程：窗口、本地存储、IPC、置顶、开机自启
├── preload.js           # 安全桥接（contextBridge）
├── lib/ai.js            # AI 解析：多服务商调用 + 时间/年份修正
├── src/
│   ├── App.vue          # 主界面：列表 + 添加栏 + 时间
│   ├── theme.js         # 主题应用（深色/浅色/玻璃）
│   └── components/
│       ├── TodoItem.vue      # 列表单条待办
│       ├── AiParsePanel.vue  # AI 解析面板
│       ├── DetailModal.vue   # 任务详情页
│       └── SettingsModal.vue # 设置（主题/AI/作者）
└── style.css           # 主题变量 + 样式
```

## 🔒 数据隐私

- 任务列表、API Key、样式配置**全部保存在你的本地电脑**（应用数据目录），不会上传任何服务器
- 本项目不收集、不中转你的任何文本；AI 解析请求仅由你填写的模型服务商处理
- 删除软件数据：关闭软件后删除 `%APPDATA%/todo-ai-app`（应用名 WhatToDo 时数据目录）（Windows）

## 🧠 技术栈

Electron 31 · Vue 3.4 · Vite 5 · 纯前端本地持久化（JSON）

## 📄 许可证

MIT

---

Made by penguin 🐧

- 小红书：26790182778
- GitHub：https://github.com/KuzeMAX117/Text2Todo
- 邮箱：1563215141@qq.com（有任何更好的建议，或者想和我做朋友，欢迎来信）
