// 预加载脚本：安全地暴露 IPC API 给渲染进程
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todoAPI', {
  loadTodos: () => ipcRenderer.invoke('todos:load'),
  saveTodos: (todos) => ipcRenderer.invoke('todos:save', todos),
  aiParse: (text) => ipcRenderer.invoke('ai:parse', text),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg) => ipcRenderer.invoke('config:set', cfg),
  minimize: () => ipcRenderer.invoke('window:min'),
  close: () => ipcRenderer.invoke('window:close'),
  setPin: (on) => ipcRenderer.invoke('window:pin', on),
  getAutostart: () => ipcRenderer.invoke('autostart:get'),
  setAutostart: (open) => ipcRenderer.invoke('autostart:set', open)
});
