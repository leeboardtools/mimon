import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { MenuManagerMain } from './util/MenuManagerMain';
// import 'regenerator-runtime/runtime';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const path = require('path');

const isDevMode = process.execPath.match(/[\\/]electron/);
if (isDevMode) {
    installExtension(REACT_DEVELOPER_TOOLS);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}



ipcMain.on('sync-get-main-setup', (event, arg) => {
    event.returnValue = {
        isDevMode: isDevMode,
    };
});


ipcMain.on('showOpenDialog', (event, options) => {
    try {
        const result = dialog.showOpenDialog(mainWindow, options);
        mainWindow.webContents.send('showOpenDialog-result', result);
    }
    catch (err) {
        mainWindow.webContents.send('showOpenDialog-result', err);
    }
});


ipcMain.on('setMainTitle', (event, title) => {
    title = title || app.getName();
    mainWindow.setTitle(title);
});



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
// eslint-disable-next-line no-unused-vars
let menuManager;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    menuManager = new MenuManagerMain();

    if (isDevMode) {
    // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
        mainWindow = null;
        menuManager = null;
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
