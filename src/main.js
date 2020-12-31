import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
//import { MenuManagerMain } from './util/MenuManagerMain';
// import 'regenerator-runtime/runtime';

const { app, Menu, BrowserWindow, ipcMain } = require('electron');
app.allowRendererProcessReuse = true;

const { session } = require('electron');

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
    };
});



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
// eslint-disable-next-line no-unused-vars
//let menuManager;
if (!isDevMode) {
    // Don't clear the menu bar in dev mode so we always have access to the debug menu
    Menu.setApplicationMenu(null);
}

const createWindow = () => {

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
        width: 1100,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            defaultFontSize: 14,
        }
    });

    // and load the index.html of the app.
    // eslint-disable-next-line no-undef
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    //menuManager = new MenuManagerMain();

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
        //menuManager = null;
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
