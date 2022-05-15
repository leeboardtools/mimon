import { loadLocaleMsgsFile } from '../util/UserMessages';
import { setUserSettingsPathName } from '../util/UserSettings';
import { loadAccountsUserMessages } from './Accounts';
import { loadPricedItemUserMessages } from './PricedItems';
import { loadTransactionsUserMessages } from './Transactions';
import { loadStandardTags } from './StandardTags';
import defUserMessages from '../locales/en-userMessages.json';
import defUserMessagesUtil from '../util/locales/en-userMessages-util.json';
import defUserMessagesEngine from '../locales/en-userMessages-engine.json';
import * as path from 'path';
import * as axios from 'axios';
import { ipcRenderer } from 'electron';


let _isElectron;
let locale;
let _appPathName;


/**
 * 
 * @returns {boolean} Truthy if the engine has been initialized and is running
 * within Electron.
 */
export function isElectron() {
    return _isElectron;
}


/**
 * @returns {string}    Returns the locale currently being used by the engine.
 */
export function getEngineLocale() {
    return locale;
}


/**
 * Main engine initialization function.
 * @param {string} settingsPathName The path name to the settings JSON file.
 */
export async function asyncInitializeEngine(settingsPathName, appPathName) {
    const noElectron = (settingsPathName === undefined);
    _isElectron = !noElectron;

    locale = (noElectron) ? undefined : ipcRenderer.sendSync('sync-getLocale');
    appPathName = appPathName || `${__dirname}/..`;
    _appPathName = appPathName;

    const utilBasePathName = path.normalize(appPathName + '/util/locales');
    const basePathName = path.normalize(appPathName + '/locales');
    const userMsgsPathNames = [
        [ path.join(utilBasePathName, 'en-userMessages-util.json'),
            defUserMessagesUtil
        ],
        [ path.join(basePathName, 'en-userMessages-engine.json'),
            defUserMessagesEngine,
        ],
        [ path.join(basePathName, 'en-userMessages.json'),
            defUserMessages
        ],
    ];
    await loadLocaleMsgsFile(locale, userMsgsPathNames);

    if (settingsPathName) {
        await setUserSettingsPathName(settingsPathName);
    }

    loadAccountsUserMessages();
    loadPricedItemUserMessages();
    loadTransactionsUserMessages();

    loadStandardTags();
}

/**
 * @returns {string} Where the app is located, normally the src folder.
 */
export function getAppPathName() {
    return _appPathName;
}


/**
 * Performs an axios request. If the engine is running within Electron
 * this performs an IPC to the main process so the axios request can
 * be performed by the main process, which is a server. This way the
 * request ends up server-to-server and CORS is not in effect.
 * <p>
 * For the Electron case the response object returned by the promise
 * is limited to only the data, status, and statusText properties.
 * @param {*} config See {@link https://github.com/axios/axios#request-config}.
 * @returns {Promise} See {@link https://github.com/axios/axios#axios-api}.
 */
export async function asyncAxiosRequest(config) {
    if (_isElectron) {
        return ipcRenderer.invoke('async-axiosRequest', config);
    }
    return axios.request(config);
}