const { contextBridge, ipcRenderer } = require('electron');
const { getApiBaseUrl } = require('./config');

contextBridge.exposeInMainWorld('electronAPI', {
  apiBaseUrl: getApiBaseUrl(),
  getBaseUrl: async () => {
    const config = await ipcRenderer.invoke('get-config');
    return config.apiBaseUrl;
  },
});
