import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { getWindowState, manageBrowserWindow } from './util/electron-WindowState';
import { app, Menu, BrowserWindow, ipcMain, dialog, session } from 'electron';

app.allowRendererProcessReuse = true;

const isDevMode = process.execPath.match(/[\\/]electron/);
if (isDevMode) {
    installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => {})
        .catch((err) => {});
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}



ipcMain.on('sync-get-main-setup', (event, arg) => {
    event.returnValue = {
        isDevMode: isDevMode,
        zoomFactor: mainWindow.webContents.getZoomFactor(),
        zoomLevel: mainWindow.webContents.getZoomLevel(),
    };
});

ipcMain.on('sync-isDevToolsOpened', (event, arg) => {
    event.returnValue = mainWindow.webContents.isDevToolsOpened();
});

ipcMain.handle('async-openDevTools', (event, arg) => {
    mainWindow.webContents.openDevTools(arg);
});

ipcMain.handle('async-closeDevTools', (event, arg) => {
    mainWindow.webContents.closeDevTools();
});

ipcMain.on('sync-getPath', (event, arg) => {
    event.returnValue = app.getPath(arg);
});

ipcMain.on('sync-appName', (event, arg) => {
    event.returnValue = app.name;
});

ipcMain.on('sync-getAppPath', (event, arg) => {
    event.returnValue = app.getAppPath();
});

ipcMain.on('sync-getLocale', (event, arg) => {
    event.returnValue = app.getLocale();
});


ipcMain.on('sync-getZoomFactor', (event, arg) => {
    event.returnValue = mainWindow.webContents.getZoomFactor();
});

ipcMain.handle('async-setZoomFactor', (event, arg) => {
    mainWindow.webContents.setZoomFactor(arg);
});

ipcMain.on('sync-getZoomLevel', (event, arg) => {
    event.returnValue = mainWindow.webContents.getZoomLevel();
});

ipcMain.handle('async-setZoomLevel', (event, arg) => {
    mainWindow.webContents.setZoomLevel(arg);
});

ipcMain.on('sync-isFullScreen', (event, arg) => {
    event.returnValue = mainWindow.isFullScreen();
});

ipcMain.handle('async-setFullScreen', (event, arg) => {
    mainWindow.setFullScreen(arg);
});

ipcMain.handle('async-setTitle', (event, arg) => {
    mainWindow.setTitle(arg);
});

ipcMain.handle('async-showOpenDialog', (event, arg) => {
    return dialog.showOpenDialog(mainWindow, arg);
});

ipcMain.handle('asycn-showSaveDialog', (event, arg) => {
    return dialog.showSaveDialog(mainWindow, arg);
});

ipcMain.on('sync-exit', (event, arg) => {
    app.exit();
});


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


Menu.setApplicationMenu(null);


const onReady = () => {

    const windowState = getWindowState({
        windowName: 'mainWindow',
    });

    createWindow(windowState);
};

const createWindow = (windowState) => {

    // TODO isDevMode test is a hack to get the devTools to show up, as it's
    // currently broken
    if (!isDevMode) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': ['default-src child-src \'self\''
                     + ' object-src \'none\''
                     + ' script-src \'self\';'
                     + ' frame-src \'self\';'
                     + ' style-src \'unsafe-inline\';'
                     + ' worker-src \'self\''
                    ]
                }
            });
        });
    }

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: Math.round(windowState.x),
        y: Math.round(windowState.y),
        webPreferences: {
            nodeIntegration: true,
            defaultFontSize: 14,
            enableRemoteModule: true,
            worldSafeExecuteJavaScript: true,

            // contextIsolation must be false to enable require() in the
            // renderer process...
            contextIsolation: false,
        }
    });
    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // and load the index.html of the app.
    // eslint-disable-next-line no-undef
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    if (isDevMode) {
    // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }

    manageBrowserWindow(mainWindow, windowState);

    // Handle the main window being closed.
    mainWindow.on('close', (e) => {
        if (mainWindow) {
            e.preventDefault();
            mainWindow.webContents.send('app-close');
        }
    });
    
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', onReady);

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
