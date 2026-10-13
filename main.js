// ============ Electron 主进程 ============
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { aiParse } = require('./lib/ai.js');

// 禁用 Chromium 悬浮滚动条，让自定义细滚动条常显（否则滚动条只在滚动时闪现）
app.commandLine.appendSwitch('disable-features', 'OverlayScrollbar');

// AI 解析读取配置时使用 userData 目录
process.env.TODO_DATA_DIR = app.getPath('userData');

// ---------- 本地存储 ----------
const DATA_DIR = app.getPath('userData');
const TODOS_FILE = path.join(DATA_DIR, 'todos.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) { /* 损坏则重置 */ }
  return fallback;
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- 窗口 ----------
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 430,
    height: 680,
    frame: false,                 // 无边框（自定义标题栏）
    transparent: true,            // 透明窗口：玻璃主题可透出桌面/下层软件
    backgroundColor: '#00000000',
    resizable: true,
    minWidth: 360,
    minHeight: 520,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // 截图模式：用于验证 UI（SCREENSHOT=1 npm run screenshot）
  if (process.env.SCREENSHOT) {
    win.webContents.on('did-finish-load', () => {
      // 模拟完整交互：点击 AI 解析 → 粘贴文本 → 开始解析 → 预览
      const notice = '@所有人 本学期形势与政策课的学习内容已在学习通发布，请各位同学及时完成线上学习的各个任务点，同时在截止时间之前完成在线考试。考试时间是10月12日-10月18日晚上11点（截止），每位同学允许重考2次，以最高分为考试成绩。线上学习占总成绩百分之二十、考试成绩占总成绩百分之八十。请同学们务必按照时间节点完成学习和考试，否则影响毕业。';
      setTimeout(async () => {
        try {
          // SCREENSHOT_PIN=1：点击图钉按钮验证置顶
          if (process.env.SCREENSHOT_PIN) {
            await win.webContents.executeJavaScript(`document.querySelector('.pin-btn').click();`);
            await new Promise(r => setTimeout(r, 300));
            console.log('PIN_STATE:', win.isAlwaysOnTop());
          }
          // SCREENSHOT_DELCLICK=1：点击第一条卡片的删除按钮，验证首页删除
          if (process.env.SCREENSHOT_DELCLICK) {
            await win.webContents.executeJavaScript(`(() => {
              const d = document.querySelector('.todo-item .del');
              if (d) d.click();
            })()`);
            await new Promise(r => setTimeout(r, 400));
          }
          // SCREENSHOT_SETTINGS / SCREENSHOT_HELLO：打开设置弹窗（可展开作者区）
          if (process.env.SCREENSHOT_SETTINGS || process.env.SCREENSHOT_HELLO) {
            await new Promise(r => setTimeout(r, 400));
            await win.webContents.executeJavaScript(`document.querySelector('.settings-btn').click();`);
            await new Promise(r => setTimeout(r, 300));
            await win.webContents.executeJavaScript(`
              const l = document.querySelector('.author-label');
              if (l) l.click();
            `);
            await new Promise(r => setTimeout(r, 300));
            // 滚动设置弹窗到底部，让作者区/赞助图进入可视区域（SCREENSHOT_SETTINGS_TOP=1 时停在顶部看主题区）
            if (!process.env.SCREENSHOT_SETTINGS_TOP) {
              await win.webContents.executeJavaScript(`
                const m = document.querySelector('.modal.settings');
                if (m) m.scrollTop = m.scrollHeight;
              `);
              await new Promise(r => setTimeout(r, 200));
            }
            if (process.env.SCREENSHOT_HELLO) {
              await win.webContents.executeJavaScript(`
                const p = document.querySelector('.penguin');
                if (p) p.click();
              `);
              await new Promise(r => setTimeout(r, 350));
            }
          }
          // SCREENSHOT_HIT=1：诊断详情页按钮热区（真实位置 + 点击命中）
          if (process.env.SCREENSHOT_HIT) {
            await new Promise(r => setTimeout(r, 400));
            await win.webContents.executeJavaScript(`document.querySelector('.todo-item').click()`);
            await new Promise(r => setTimeout(r, 400));
            const hit = await win.webContents.executeJavaScript(`(() => {
              const bk = document.querySelector('.dp-back');
              const cl = document.querySelector('.dp-close');
              const r = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
              const at = (x, y) => { const el = document.elementFromPoint(x, y); return el ? (el.className || el.tagName) : 'null'; };
              const info = {};
              if (bk) { const b = r(bk); info.back = { rect: b, center: at(b.x + b.w/2, b.y + b.h/2), icon: at(b.x + b.w/2, b.y + b.h/2 + 2) }; }
              if (cl) { const b = r(cl); info.close = { rect: b, center: at(b.x + b.w/2, b.y + b.h/2), icon: at(b.x + b.w/2, b.y + b.h/2 + 2) }; }
              return info;
            })()`);
            console.log('HIT_DIAG:', JSON.stringify(hit));
          }
          // SCREENSHOT_DETAIL=1：点击第一条待办打开详情弹窗
          if (process.env.SCREENSHOT_DETAIL) {
            await new Promise(r => setTimeout(r, 400));
            await win.webContents.executeJavaScript(`
              document.querySelector('.todo-item').click();
            `);
            await new Promise(r => setTimeout(r, 400));
            // SCREENSHOT_CAL=1：展开设定时间，模拟点两个日期（15日、18日）演示时间段选择
            if (process.env.SCREENSHOT_CAL) {
              await win.webContents.executeJavaScript(`
                const tg = document.querySelector('.time-toggle');
                if (tg && !tg.parentElement.querySelector('.cal-wrap').offsetParent) tg.click();
              `);
              await new Promise(r => setTimeout(r, 250));
              await win.webContents.executeJavaScript(`
                const days = [...document.querySelectorAll('.cal-day')];
                const byDay = n => days.find(b => b.textContent.trim() === String(n) && !b.classList.contains('dim'));
                const d15 = byDay(15), d18 = byDay(18);
                if (d15) d15.click();
                if (d18) d18.click();
              `);
              await new Promise(r => setTimeout(r, 300));
            }
          }
          // SCREENSHOT_SCROLL=1：滚动列表到中部，验证"滚动中滚动条出现"
          if (process.env.SCREENSHOT_SCROLL) {
            await win.webContents.executeJavaScript(`(() => new Promise(res => {
              const l = document.querySelector('.list');
              if (l) l.scrollTop = 300;
              setTimeout(() => {
                const l2 = document.querySelector('.list');
                res({ scrollTop: l2 && l2.scrollTop, scrollH: l2 && l2.scrollHeight, clientH: l2 && l2.clientHeight,
                    scrolling: document.body.classList.contains('scrolling') });
              }, 150);
            }))()`);
            await new Promise(r => setTimeout(r, 250));
          }
          // SCREENSHOT_NO_PANEL=1 时只截纯列表（便于观察滚动条），否则模拟点击展开面板
          if (!process.env.SCREENSHOT_NO_PANEL && !process.env.SCREENSHOT_DETAIL && !process.env.SCREENSHOT_SETTINGS && !process.env.SCREENSHOT_HELLO && !process.env.SCREENSHOT_SCROLL) {
            await win.webContents.executeJavaScript(`
              document.querySelector('.btn-ai').click();
              new Promise(r => setTimeout(r, 200)).then(() => {
                const ta = document.querySelector('.ai-panel .parse-input');
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, ${JSON.stringify(notice)});
                ta.dispatchEvent(new Event('input', { bubbles: true }));
              });
            `);
            await new Promise(r => setTimeout(r, 500));
            await win.webContents.executeJavaScript(`
              document.querySelector('.ai-panel .btn-parse').click();
            `);
            await new Promise(r => setTimeout(r, 1200));
          }

          if (process.env.SCREENSHOT_DRAG) {
            await win.webContents.executeJavaScript(`(() => new Promise(res => {
              const items = [...document.querySelectorAll('.todo-item')];
              if (items.length < 3) return res({ err: 'few' });
              const a = items[0], b = items[2];
              const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
              const cy = br.y + br.height / 2;
              a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1, clientX: ar.x + 30, clientY: ar.y + 20 }));
              setTimeout(() => {
                const active = !!document.querySelector('.todo-item.is-drag');
                window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 1, clientX: br.x + 30, clientY: cy }));
                setTimeout(() => {
                  const line = !!document.querySelector('.drop-line');
                  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: br.x + 30, clientY: cy }));
                  setTimeout(() => {
                    res({ active, line, order: [...document.querySelectorAll('.todo-item')].map(i => i.getAttribute('data-id')).join(',') });
                  }, 300);
                }, 300);
              }, 600);
            }))()`);
            await new Promise(r => setTimeout(r, 800));
          }
          const img = await win.webContents.capturePage();
          fs.writeFileSync(path.join(__dirname, 'screenshot.png'), img.toPNG());
          console.log('SCREENSHOT_SAVED');
          app.exit(0);
        } catch (e) {
          console.error('SCREENSHOT_FAIL', e);
          app.exit(1);
        }
      }, 900);
    });
  }
}

// ---------- IPC ----------
ipcMain.handle('todos:load', () => readJson(TODOS_FILE, []));
ipcMain.handle('todos:save', (e, todos) => {
  writeJson(TODOS_FILE, Array.isArray(todos) ? todos : []);
  return true;
});
ipcMain.handle('ai:parse', async (e, text) => {
  if (!text || !text.trim()) return { source: 'local', items: [] };
  return await aiParse(String(text).slice(0, 4000));
});
ipcMain.handle('config:get', () => readJson(CONFIG_FILE, {}));
ipcMain.handle('config:set', (e, cfg) => {
  const cur = readJson(CONFIG_FILE, {});
  writeJson(CONFIG_FILE, { ...cur, ...cfg });
  return true;
});
ipcMain.handle('window:min', () => win && win.minimize());
ipcMain.handle('window:close', () => win && win.close());
ipcMain.handle('window:pin', (e, on) => {
  if (win) win.setAlwaysOnTop(!!on);
  return true;
});

// 开机自启动：查询 / 设置（Windows/macOS 原生注册表支持，Linux 写 XDG autostart 并兜底）
const AUTOSTART_DESKTOP = () => path.join(os.homedir(), '.config', 'autostart', 'todo-ai-app.desktop');

function writeLinuxAutostart(open) {
  if (!open) {
    if (fs.existsSync(AUTOSTART_DESKTOP())) fs.unlinkSync(AUTOSTART_DESKTOP());
    return;
  }
  const dir = path.dirname(AUTOSTART_DESKTOP());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTOSTART_DESKTOP(),
    `[Desktop Entry]\nType=Application\nName=WhatToDo\nExec="${process.execPath}"\nX-GNOME-Autostart-enabled=true\n`);
}

ipcMain.handle('autostart:get', () => {
  try {
    if (process.platform === 'linux') return fs.existsSync(AUTOSTART_DESKTOP());
    return !!app.getLoginItemSettings().openAtLogin;
  } catch (e) {
    return false;
  }
});
ipcMain.handle('autostart:set', (e, open) => {
  try {
    // Windows：写注册表 Run 键（开机启动）；Linux：XDG autostart 文件
    app.setLoginItemSettings({ openAtLogin: !!open, path: process.execPath });
    if (process.platform === 'linux') writeLinuxAutostart(!!open);
    return true;
  } catch (e) {
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
