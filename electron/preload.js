const { contextBridge } = require('electron');

// Exposer une API minimale côté renderer si besoin
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
});
