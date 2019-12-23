import { loadLocaleMsgsFile, userError } from '../util/UserMessages';
import { setUserSettingsPathName } from '../util/UserSettings';
//import { JSONGzipAccountingFileFactory } from './JSONGzipAccountingFile';
//import { AccountingSystem } from './AccountingSystem';
import { loadAccountsUserMessages } from './Accounts';
import { loadPricedItemUserMessages } from './PricedItems';
//import { loadTransactionsUserMessages } from './Transactions';
//import { loadPricesUserMessages } from './Prices';

const path = require('path');

//const fileFactories = [];

/**
 * Main engine initialization function.
 * @param {string} settingsPathName The path name to the settings JSON file.
 */
export async function initializeEngine(settingsPathName) {
    const noElectron = (settingsPathName === undefined);

    const locale = (noElectron) ? undefined : require('electron').remote.app.getLocale();
    const userMsgsPathName = path.normalize(`${__dirname}/../locales/en-UserMessages.json`);
    const loadedUserMsgsPathName = await loadLocaleMsgsFile(locale, userMsgsPathName);
    if (loadedUserMsgsPathName && !noElectron) {
        console.log('Loaded user messages from ' + loadedUserMsgsPathName);
    }

    if (settingsPathName) {
        await setUserSettingsPathName(settingsPathName);
    }

    loadAccountsUserMessages();
    loadPricedItemUserMessages();
    //loadTransactionsUserMessages();
    //loadPricesUserMessages();

    //fileFactories.push(new JSONGzipAccountingFileFactory());
}
