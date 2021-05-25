import * as path from 'path';
import * as fs from 'fs';

const { app, screen } = require('electron');

/**
 * @module electron-WindowState
 *
 * @description
 * Simple saving/restoring of the electron browser windows in a 
 * configuration file. By default the configration is stored as
 * part of a JSON file in app.getPath('appData')/app.name/user.json.
 * <p>
 * There are two parts to this. The first is to call 
 * {@link module:electron-WindowState#getWindowState} prior to instantiating
 * an electron BrowserWindow, then passing the position and size information
 * to the BrowserWindow constructor.
 * <p>
 * The second part is to pass the newly instantiated browser window and
 * the window state that was returned in the first part to
 * {@link module:electron-WindowState#manageBrowserWindow}. This sets things
 * up for saving the browser window position when the window is closed.
 * <p>
 * States for multiple browser windows are supported via the windowName
 * property passed to {@link module:electron-WindowState#getWindowState}.
 * <p>
 * Additionally, window states are maintained for different display configurations,
 * with display configurations identified by the positions and sizes of the
 * displays returned by Electron's screen.getAllDisplays()
 */

let mainSettingsJSONPath;
let mainReadSettingsCallback = readJSONSettings;
let mainWriteSettingsCallback = writeJSONSettings;


function getDisplayConfiguration() {
    const allDisplays = screen.getAllDisplays();
    let displayConfiguration = allDisplays.length + ':';
    allDisplays.forEach((display) => {
        const { bounds } = display;
        displayConfiguration += '_x' + bounds.x + '_y' + bounds.y
            + '_w' + bounds.width + '_h' + bounds.height;
    });

    return displayConfiguration;
}


export function setup({
    settingsJSONPath,
    readSettingsCallback,
    writeSettingsCallback,
}) {
    mainSettingsJSONPath = settingsJSONPath;
    mainReadSettingsCallback = readSettingsCallback;
    mainWriteSettingsCallback = writeSettingsCallback;
}


function getDefaultJSONSettingsPath() {
    return mainSettingsJSONPath 
        || path.join(app.getPath('appData'), app.name, 'user.json');
}


function readJSONSettings() {
    const filePath = getDefaultJSONSettingsPath();

    try {
        const contents = fs.readFileSync(filePath, { encoding: 'utf8' });
        return JSON.parse(contents);
    }
    catch (e) {
        console.error('readJSONSettings failed: ' + filePath + ' ' + e);
    }
}


function writeJSONSettings(settings) {
    const filePath = getDefaultJSONSettingsPath();

    try {
        fs.writeFileSync(filePath, JSON.stringify(settings), { encoding: 'utf8' });
    }
    catch (e) {
        console.error('writeJSONSettings failed: ' + filePath + ' ' + e);
    }
}


function resolveWindowSettings(settings, windowState) {
    settings = settings || {};
    const { windowStates} = settings;
    if (!windowStates) {
        return windowState;
    }

    const displayConfiguration = getDisplayConfiguration();
    const windowSettings = windowStates[displayConfiguration];
    if (!windowSettings) {
        return windowState;
    }

    return Object.assign(windowState, windowSettings[windowState.windowName]);
}


function saveWindowState(windowState) {
    try {
        const settings = mainReadSettingsCallback() || {};

        const displayConfiguration = getDisplayConfiguration();
        windowState = Object.assign({}, windowState);
        const { windowName } = windowState;
        delete windowState.windowName;

        const { bounds, boundsAdjust } = windowState;
        if (bounds) {
            windowState.x = bounds.x;
            windowState.y = bounds.y;
            windowState.width = bounds.width;
            windowState.height = bounds.height;

            if (boundsAdjust) {
                windowState.x += boundsAdjust.x;
                windowState.y += boundsAdjust.y;
                windowState.width += boundsAdjust.width;
                windowState.height += boundsAdjust.height;
            }
        }
        delete windowState.bounds;
        delete windowState.boundsAdjust;

        if (!settings.windowStates) {
            settings.windowStates = {};
        }

        let windowSettings = settings.windowStates[displayConfiguration];
        if (!windowSettings) {
            windowSettings = {};
            settings.windowStates[displayConfiguration] = windowSettings;
        }

        windowSettings[windowName] = windowState;
        
        mainWriteSettingsCallback(settings);
    }
    catch (e) {
        console.error('saveWindowState failed: ' + e);
    }
}


/**
 * @typedef {object} module:electron-WindowState~WindowState
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} [isMaximized]
 */

/**
 * @typedef {object} module:electron-WindowState~getWindowStateArgs
 * @property {string} [windowName='']
 * @property {Size} [defaultSize]
 */

/**
 * Retrieves the window state containing the position and size information to
 * pass to <code>new BrowserWindow()</code>.
 * <p>
 * The browser is normally passed along with the window state to
 * {@link manageBrowserWindow} right after the window is instantiated.
 * @param {module:electron-WindowState~getWindowStateArgs} args
 * @returns {module:electron-WindowState~WindowState}
 */
export function getWindowState({
    windowName, defaultSize, }) {

    windowName = windowName || '';

    let windowState = {
        windowName: windowName,
        width: 1000,
        height: 600,
    };
    if (defaultSize) {
        if (typeof defaultSize.width === 'number') {
            windowState.width = defaultSize.width;
        }
        if (typeof defaultSize.height === 'number') {
            windowState.height = defaultSize.height;
        }
    }

    // Default to center in the primary display.
    const primaryDisplay = screen.getPrimaryDisplay();
    const { bounds } = primaryDisplay;
    windowState.x = bounds.x + (bounds.width - windowState.width) / 2;
    windowState.y = bounds.y + (bounds.height - windowState.height) / 2;

    try {
        const settings = mainReadSettingsCallback();
        return resolveWindowSettings(settings, windowState);
    }
    catch (e) {
        console.error('mainReadSettingsCallback failed: ' + e);
    }

    return windowState;
}


/**
 * Call soon after the browser window is instantiated, this installs one time
 * event listeners for determining the adjustment needed between the window bounds
 * and the specified window bounds, and then the call to saving the window state
 * when the browser window is closed.
 * @param {BrowserWindow} browserWindow 
 * @param {module:electron-WindowState~WindowState} windowState This should be the
 * same object returned by {@link getWindowState}.
 */
export function manageBrowserWindow(browserWindow, windowState) {
    browserWindow.once('move', () => {
        const bounds = browserWindow.getNormalBounds();
        windowState.boundsAdjust = {
            x: windowState.x - bounds.x,
            y: windowState.y - bounds.y,
            width: windowState.width - bounds.width,
            height: windowState.height - bounds.height,
        };
    });

    browserWindow.once('close', () => {
        windowState.bounds = browserWindow.getNormalBounds(),
        windowState.isMaximized = browserWindow.isMaximized();
        saveWindowState(windowState);
    });
}
