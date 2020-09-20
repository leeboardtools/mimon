import { loadLocaleMsgsFile } from '../util/UserMessages';
import { setUserSettingsPathName } from '../util/UserSettings';
import { loadAccountsUserMessages } from './Accounts';
import { loadPricedItemUserMessages } from './PricedItems';
import { loadTransactionsUserMessages } from './Transactions';
import { loadStandardTags } from './StandardTags';
import defUserMessages from '../locales/en-userMessages.json';
import defUserMessagesUtil from '../locales/en-userMessages-util.json';
import defUserMessagesEngine from '../locales/en-userMessages-engine.json';

const path = require('path');

let locale;


/**
 * @returns {string}    Returns the locale currently being used by the engine.
 */
export function getEngineLocal() {
    return locale;
}


/**
 * Main engine initialization function.
 * @param {string} settingsPathName The path name to the settings JSON file.
 */
export async function initializeEngine(settingsPathName, appPathName) {
    const noElectron = (settingsPathName === undefined);

    locale = (noElectron) ? undefined : require('electron').remote.app.getLocale();
    appPathName = appPathName || `${__dirname}/..`;
    const basePathName = path.normalize(appPathName + '/locales');
    const userMsgsPathNames = [
        [ path.join(basePathName, 'en-userMessages-util.json'),
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
