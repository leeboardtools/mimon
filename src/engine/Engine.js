import { loadLocaleMsgsFile, setMsgs } from '../util/UserMessages';
import { setUserSettingsPathName } from '../util/UserSettings';
import { loadAccountsUserMessages } from './Accounts';
import { loadPricedItemUserMessages } from './PricedItems';
import { loadTransactionsUserMessages } from './Transactions';
import defUserMessages from '../locales/en-userMessages.json';

const path = require('path');


/**
 * Main engine initialization function.
 * @param {string} settingsPathName The path name to the settings JSON file.
 */
export async function initializeEngine(settingsPathName, appPathName) {
    const noElectron = (settingsPathName === undefined);

    const locale = (noElectron) ? undefined : require('electron').remote.app.getLocale();
    appPathName = appPathName || `${__dirname}/..`;
    const userMsgsPathName 
        = path.normalize(appPathName + '/locales/en-userMessages.json');
    let loadedUserMsgsPathName = await loadLocaleMsgsFile(locale, userMsgsPathName);
    if (!loadedUserMsgsPathName) {
        setMsgs(defUserMessages);
    }

    if (settingsPathName) {
        await setUserSettingsPathName(settingsPathName);
    }

    loadAccountsUserMessages();
    loadPricedItemUserMessages();
    loadTransactionsUserMessages();
}
