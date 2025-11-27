const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Charger la page principale du projet
  const indexPath = path.join(__dirname, '..', 'index.html');
  win.loadFile(indexPath).catch(err => {
    console.error('Erreur chargement index.html:', err);
    dialog.showErrorBox('Erreur', `Impossible de charger index.html\n${err.message}`);
  });

  // Ouvrir les outils de dev si on le souhaite (commenter en prod)
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
