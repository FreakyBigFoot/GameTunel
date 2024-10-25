const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const PROGRAM_DATA_DIR = path.join('C:', 'ProgramData', 'GameForwarder');
const ICONS_DIR = path.join(PROGRAM_DATA_DIR, 'icons');
const CONFIG_FILE = path.join(PROGRAM_DATA_DIR, 'serverConfigs.json');
const ACTIVE_SERVER_FILE = path.join(PROGRAM_DATA_DIR, 'activeServer.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');
}

if (!fs.existsSync(PROGRAM_DATA_DIR)) fs.mkdirSync(PROGRAM_DATA_DIR, { recursive: true });
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

ipcMain.handle('selectServerFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('copyIconToProgramData', async (event, originalPath) => {
  try {
    const fileName = path.basename(originalPath);
    const newIconPath = path.join(ICONS_DIR, fileName);
    fs.copyFileSync(originalPath, newIconPath);
    return newIconPath;
  } catch (err) {
    console.error('Error copying icon:', err);
    return null;
  }
});

ipcMain.handle('saveActiveServerData', async (event, data) => {
  try {
    fs.writeFileSync(ACTIVE_SERVER_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving active server data:', err);
    return false;
  }
});

ipcMain.handle('getServerConfigs', async () => {
  if (fs.existsSync(CONFIG_FILE)) {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return {};
});

ipcMain.handle('saveAllServerConfigs', async (event, data) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving server configs:', err);
    return false;
  }
});

ipcMain.handle('readServerProperties', async (event, serverPath) => {
  const serverPropertiesPath = path.join(serverPath, 'server.properties');
  if (fs.existsSync(serverPropertiesPath)) {
    try {
      const propertiesContent = fs.readFileSync(serverPropertiesPath, 'utf-8');
      const portMatch = propertiesContent.match(/server-port\s*=\s*(\d+)/);
      if (portMatch) {
        return portMatch[1];
      }
    } catch (error) {
      console.error('Error reading server.properties:', error);
    }
  }
  return null;
});

ipcMain.handle('updateServerProperties', async (event, serverPath, properties) => {
  const serverPropertiesPath = path.join(serverPath, 'server.properties');
  try {
    let propertiesContent = fs.existsSync(serverPropertiesPath)
      ? fs.readFileSync(serverPropertiesPath, 'utf-8')
      : '';

    Object.entries(properties).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}\\s*=.*`, 'm');
      propertiesContent = propertiesContent.match(regex)
        ? propertiesContent.replace(regex, `${key}=${value}`)
        : `${propertiesContent}\n${key}=${value}`;
    });

    fs.writeFileSync(serverPropertiesPath, propertiesContent);
    return true;
  } catch (error) {
    console.error('Error updating server.properties:', error);
    return false;
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
