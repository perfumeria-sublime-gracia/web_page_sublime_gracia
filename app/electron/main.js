const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { getApiBaseUrl } = require('./config');

const isDev = !app.isPackaged;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

async function registerDesktopProtocol() {
  const distDirectory = path.resolve(__dirname, '../dist');
  await protocol.handle('app', (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'sublime-gracia') return new Response('Not found', { status: 404 });

    const relativePath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.resolve(distDirectory, `.${relativePath}`);
    if (!filePath.startsWith(`${distDirectory}${path.sep}`) && filePath !== path.join(distDirectory, 'index.html')) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: 'Sublime Gracia Admin',
    width: 1500,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#FAF6EF',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL('app://sublime-gracia/');
  }

  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  if (!isDev) await registerDesktopProtocol();
  ipcMain.handle('get-config', () => ({
    apiBaseUrl: getApiBaseUrl(),
  }));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
