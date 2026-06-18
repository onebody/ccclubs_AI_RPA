const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  navigate: (url: string) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  refresh: () => ipcRenderer.invoke('refresh'),
  getTitle: () => ipcRenderer.invoke('get-title'),
  getUrl: () => ipcRenderer.invoke('get-url'),
  getContentLength: () => ipcRenderer.invoke('get-content-length'),
  screenshot: () => ipcRenderer.invoke('screenshot'),
  click: (selector: string) => ipcRenderer.invoke('click', selector),
  typeText: (selector: string, text: string) => ipcRenderer.invoke('type-text', selector, text),
  addBookmark: (bookmark: any) => ipcRenderer.invoke('add-bookmark', bookmark),
  stopChrome: () => ipcRenderer.invoke('stop-chrome'),
});