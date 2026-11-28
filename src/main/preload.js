'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const ALLOWED_ON = new Set(['license:changed', 'notify', 'scan', 'diag:open', 'update:ready', 'call:incoming']);
contextBridge.exposeInMainWorld('cd', {
  call: (method, args) => ipcRenderer.invoke('cd:call', method, args),
  cloud: (action, args) => ipcRenderer.invoke('cd:cloud', action, args),
  sys: (name, args) => ipcRenderer.invoke('cd:sys', name, args),
  on: (ch, cb) => { if (!ALLOWED_ON.has(ch)) return () => {}; const l = (_e, ...a) => cb(...a); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l); }
});
