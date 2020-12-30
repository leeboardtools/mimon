import { getCurrency } from '../util/Currency';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as PI from '../engine/PricedItems';
import * as QD from '../util/Quantities';
import { YMDDate } from '../util/YMDDate';
import { userMsg, userError } from '../util/UserMessages';

/**
 * @typedef {object}    NewFileContents_PricedItem
 * @property {string}   type
 * @property {string}   name
 * @property {string}   [id]
 * @property {string}   [ticker]
 */

/**
 * @typedef {object}    NewFileContents_PricedItems
 * @property {NewFileContents_PricedItem[]}    [pricedItems]
 */

/**
 * @typedef {object}    NewFileContents_Account
 * @property {string}   type
 * @property {string}   name
 * @property {string}   [id]
 * @property {NewFileContents_Account[]}    [childAccounts]
 */

/**
 * @typedef {object}    NewFileContents_Accounts
 * @property {NewFileContents_Account[]}    ASSETS
 * @property {NewFileContents_Account[]}    LIABILITIES
 * @property {NewFileContents_Account[]}    INCOME
 * @property {NewFileContents_Account[]}    EXPENSES
 * @property {NewFileContents_Account[]}    EQUITY
 */

/**
 * @typedef {object} NewFileContents
 * @property {string}   [openingBalancesDate]
 * @property {NewFileContents_PricedItems}    [pricedItems]
 * @property {NewFileContents_Accounts} [accounts]
 */

//
//---------------------------------------------------------
//
async function asyncSetBaseCurrency(setupInfo) {
    const { baseCurrency } = setupInfo.initialContents;
    if (!baseCurrency) {
        return;
    }

    const { pricedItemManager } = setupInfo;
    if (baseCurrency === pricedItemManager.getBaseCurrencyCode()) {
        return;
    }

    try {
        await pricedItemManager.asyncModifyPricedItem({
            id: pricedItemManager.getBaseCurrencyPricedItemId(),
            currency: baseCurrency,
        });
    }
    catch (e) {
        setupInfo.warnings.push(userMsg('NewFileSetup-setBaseCurrency_failed',
            baseCurrency, e));
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadPricedItems(setupInfo) {
    if (!setupInfo.initialContents.pricedItems) {
        return;
    }

    const { pricedItems } = setupInfo.initialContents.pricedItems;
    if (!pricedItems) {
        return;
    }

    const { pricedItemManager, pricedItemMapping, pricedItemNameMapping,
        warnings } = setupInfo;
    const baseCurrency = pricedItemManager.getBaseCurrencyCode();
    for (let i = 0; i < pricedItems.length; ++i) {
        const item = pricedItems[i];

        const currency = getCurrency(item.currency || baseCurrency);
        if (!currency) {
            warnings.push('NewFileSetup-invalid_currency', item.name, currency);
            continue;
        }

        try {
            let quantityDefinition = item.quantityDefinition;
            if (!quantityDefinition) {
                if (item.type === PI.PricedItemType.SECURITY.name) {
                    quantityDefinition = QD.getDecimalDefinition(4);
                }
                else {
                    quantityDefinition = currency.getQuantityDefinition();
                }
                quantityDefinition = QD.getQuantityDefinitionName(quantityDefinition);
            }
            
            const settings = {
                type: item.type,
                name: item.name,
                description: item.description,
                currency: item.currency || baseCurrency,
                quantityDefinition: quantityDefinition,
            };
            if (item.ticker) {
                settings.ticker = item.ticker;
            }
            if (item.onlineUpdateType) {
                settings.onlineUpdateType = item.onlineUpdateType;
            }
            const pricedItemDataItem = (await pricedItemManager.asyncAddPricedItem(
                settings)).newPricedItemDataItem;

            pricedItemMapping.set(item.id, pricedItemDataItem);

            const name = item.id || item.ticker || item.name;
            pricedItemNameMapping.set(name, pricedItemDataItem);
        }
        catch (e) {
            warnings.push(userMsg('NewFileSetup-addPricedItem_failed', item.name, e));
        }
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadLots(setupInfo) {
    if (!setupInfo.initialContents.lots) {
        return;
    }

    const { lots } = setupInfo.initialContents.lots;
    if (!lots) {
        return;
    }

    const { lotManager, lotMapping, lotNameMapping,
        pricedItemNameMapping, warnings } = setupInfo;
    for (let i = 0; i < lots.length; ++i) {
        const item = lots[i];

        const pricedItem = pricedItemNameMapping.get(item.pricedItemId);
        if (!pricedItem) {
            warnings.push('NewFileSetup-lot_pricedItem_not_found', 
                item.description, item.pricedItemId);
            continue;
        }

        try {
            const settings = {
                description: item.description,
                pricedItemId: pricedItem.id,
                lotOriginType: item.lotOriginType,
            };
            const lotDataItem = (await lotManager.asyncAddLot(
                settings)).newLotDataItem;

            lotMapping.set(item.id, lotDataItem);
            lotNameMapping.set(item.description, lotDataItem);
        }
        catch (e) {
            warnings.push(userMsg('NewFileSetup-addLot_failed', item.description, e));
        }
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadPrices(setupInfo) {
    if (!setupInfo.initialContents.prices) {
        return;
    }

    const { prices } = setupInfo.initialContents.prices;
    if (!prices) {
        return;
    }

    const { priceManager, pricedItemNameMapping, warnings } = setupInfo;
    for (let i = 0; i < prices.length; ++i) {
        const item = prices[i];

        const pricedItem = pricedItemNameMapping.get(item.pricedItemId);
        if (!pricedItem) {
            warnings.push(userMsg('NewFileSetup-price_pricedItem_not_found', 
                item.pricedItemId));
            continue;
        }

        try {
            await priceManager.asyncAddPrices(pricedItem.id, item.prices);
        }
        catch (e) {
            warnings.push(userMsg('NewFileSetup-price_add_failed',
                item.pricedItemId, e));
        }
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadAccounts(setupInfo) {
    const { accountManager, accountNameMapping } = setupInfo;
    accountNameMapping.set('ASSET', accountManager.getAccountDataItemWithId(
        accountManager.getRootAssetAccountId()));
    accountNameMapping.set('LIABILITY', accountManager.getAccountDataItemWithId(
        accountManager.getRootLiabilityAccountId()));
    accountNameMapping.set('INCOME', accountManager.getAccountDataItemWithId(
        accountManager.getRootIncomeAccountId()));
    accountNameMapping.set('EXPENSE', accountManager.getAccountDataItemWithId(
        accountManager.getRootExpenseAccountId()));
    accountNameMapping.set('EQUITY', accountManager.getAccountDataItemWithId(
        accountManager.getRootEquityAccountId()));
    accountNameMapping.set('EQUITY-Opening Balances', 
        accountManager.getAccountDataItemWithId(
            accountManager.getOpeningBalancesAccountId()));
                    
    await asyncLoadAccountsForRoot(setupInfo, accountManager.getRootAssetAccountId());
    await asyncLoadAccountsForRoot(setupInfo, accountManager.getRootLiabilityAccountId());
    await asyncLoadAccountsForRoot(setupInfo, accountManager.getRootIncomeAccountId());
    await asyncLoadAccountsForRoot(setupInfo, accountManager.getRootExpenseAccountId());
    await asyncLoadAccountsForRoot(setupInfo, accountManager.getRootEquityAccountId());
}


//
//---------------------------------------------------------
//
async function asyncLoadAccountsForRoot(setupInfo, rootAccountId) {
    let { accounts } = setupInfo.initialContents;
    if (!accounts) {
        return;
    }

    const { accountManager } = setupInfo;
    const rootAccountDataItem = accountManager.getAccountDataItemWithId(rootAccountId);
    const rootType = A.AccountType[rootAccountDataItem.type];
    const rootCategory = rootType.category;

    accounts = accounts[rootCategory.name];
    if (!accounts) {
        return;
    }

    for (let i = 0; i < accounts.length; ++i) {
        await asyncLoadAccount(setupInfo, rootAccountId, accounts[i], rootCategory.name);
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadAccount(setupInfo, parentAccountId, item, parentName) {
    const { accountManager, accountMapping, accountNameMapping, pricedItemManager,
        accessor, warnings } = setupInfo;

    try {
        const accountSettings = {
            parentAccountId: parentAccountId,
            refId: item.refId,
            type: item.type,
            name: item.name,
            description: item.description,
        };
        if (item.tags) {
            accountSettings.tags = item.tags;
        }
        if (item.pricedItemId) {
            const { pricedItemNameMapping } = setupInfo;
            const pricedItemId = pricedItemNameMapping.get(item.pricedItemId);
            if (!pricedItemId) {
                throw userError('NewFileSetup-pricedItem_not_found', item.pricedItemId);
            }
            accountSettings.pricedItemId = pricedItemId.id;
        }
        else {
            accountSettings.pricedItemId 
                = pricedItemManager.getBaseCurrencyPricedItemId();
        }

        const accountDataItem = (await accountManager.asyncAddAccount(accountSettings))
            .newAccountDataItem;

        accountMapping.set(item.id, accountDataItem);

        const name = parentName + '-' + accountDataItem.name;
        accountNameMapping.set(name, accountDataItem);

        const { childAccounts, openingBalance } = item;
        if (childAccounts) {
            for (let i = 0; i < childAccounts.length; ++i) {
                await asyncLoadAccount(setupInfo, accountDataItem.id, childAccounts[i],
                    name);
            }
        }

        if (openingBalance) {
            try {
                // Add the opening balance transaction...
                let quantityBaseValue = accessor.pricedItemQuantityTextToBaseValue(
                    accountDataItem.pricedItemId, openingBalance);
                const accountCategory = A.AccountType[item.type].category;
                const obQuantityBaseValue = quantityBaseValue 
                    * -accountCategory.creditSign;
                
                const transaction = {
                    ymdDate: setupInfo.openingBalancesDate,
                    description: userMsg('NewFileSetup-openingBalance_Description'),
                    splits: [
                        { reconcileState: T.ReconcileState.RECONCILED,
                            accountId: accountDataItem.id,
                            quantityBaseValue: quantityBaseValue,
                        },
                        { reconcileState: T.ReconcileState.RECONCILED,
                            accountId: accountManager.getOpeningBalancesAccountId(),
                            quantityBaseValue: obQuantityBaseValue,
                        }
                    ],
                };
                await setupInfo.transactionManager.asyncAddTransaction(transaction);
            }
            catch (e) {
                warnings.push(userMsg('NewFileSetup-addOpeningBalance_failed', 
                    item.name, openingBalance, e));
            }            
        }
    }
    catch (e) {
        warnings.push(userMsg('NewFileSetup-addAccount_failed',
            item.name, e));
    }
}

//
//---------------------------------------------------------
//
async function asyncLoadTransactions(setupInfo) {
    const { transactions } = setupInfo.initialContents;
    if (!transactions) {
        return;
    }

    const { warnings, accountNameMapping, lotNameMapping } = setupInfo;
    let item;
    try {
        setupInfo.transactionManager.isDebugAccountStates 
            = setupInfo.initialContents.isDebugAccountStates;

        for (let i = 0; i < transactions.length; ++i) {
            item = transactions[i];

            const splits = [];
            item.splits.forEach((itemSplit) => {
                const split = Object.assign({}, itemSplit);
                const accountDataItem = accountNameMapping.get(itemSplit.accountId);
                if (!accountDataItem) {
                    throw userError('NewFileSetup-addTransaction_invalid_accountId', 
                        itemSplit.accountId);
                }
                split.accountId = accountDataItem.id;

                if (split.lotChanges) {
                    split.lotChanges = Array.from(split.lotChanges);
                    const { lotChanges } = split;
                    for (let i = 0; i < lotChanges.length; ++i) {
                        lotChanges[i] = Object.assign({}, lotChanges[i]);
                        if (lotChanges[i].lotId) {
                            const lotDataItem = lotNameMapping.get(lotChanges[i].lotId);
                            if (!lotDataItem) {
                                throw userError(
                                    'NewFileSetup-addTransaction_invalid_lotId',
                                    lotChanges[i].lotId);
                            }
                            lotChanges[i].lotId = lotDataItem.id;
                        }
                    }
                }

                splits.push(split);
            });

            const transaction = Object.assign({}, item);
            transaction.splits = splits;

            await setupInfo.transactionManager.asyncAddTransaction(transaction);
        }
    }
    catch (e) {
        warnings.push(userMsg('NewFileSetup-addTransaction_failed',
            item.name, e));
    }
    finally {
        setupInfo.transactionManager.isDebugAccountStates = false;
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadReminders(setupInfo) {
    const { reminders } = setupInfo.initialContents;
    if (!reminders) {
        return;
    }

    const { reminderManager, accountNameMapping, warnings } = setupInfo;
    for (let i = 0; i < reminders.length; ++i) {
        const item = reminders[i];

        try {
            const reminder = Object.assign({}, item);
            let { transactionTemplate } = reminder;
            if (transactionTemplate) {
                transactionTemplate = T.getTransactionDataItem(transactionTemplate, true);
                reminder.transactionTemplate = transactionTemplate;

                const { splits } = transactionTemplate;
                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    const accountDataItem = accountNameMapping.get(split.accountId);
                    if (!accountDataItem) {
                        throw userError('NewFileSetup-addReminder_invalid_accountId', 
                            split.accountId);
                    }
                    split.accountId = accountDataItem.id;
                }
            }

            await reminderManager.asyncAddReminder(reminder);
        }
        catch (e) {
            warnings.push(userMsg('NewFileSetup-addReminder_failed', 
                item.description, e));
        }
    }
}


/**
 * Sets up a blank accounting file from JSON template data.
 * @param {EngineAccessor} accessor
 * @param {AccountingFile} accountingFile 
 * @param {NewFileContents} initialContents 
 * @returns {string[]}  An array containing any warning messages.
 */
export async function asyncSetupNewFile(accessor, accountingFile, initialContents) {
    const accountingSystem = accountingFile.getAccountingSystem();

    const setupInfo = {
        accessor: accessor,
        initialContents: initialContents,
        accountingFile: accountingFile,
        accountingSystem: accountingSystem,
        pricedItemManager: accountingSystem.getPricedItemManager(),
        accountManager: accountingSystem.getAccountManager(),
        transactionManager: accountingSystem.getTransactionManager(),
        lotManager: accountingSystem.getLotManager(),
        priceManager: accountingSystem.getPriceManager(),
        reminderManager: accountingSystem.getReminderManager(),

        pricedItemMapping: new Map(),
        pricedItemNameMapping: new Map(),

        accountMapping: new Map(),
        accountNameMapping: new Map(),

        lotMapping: new Map(),
        lotNameMapping: new Map(),

        openingBalancesDate: initialContents.openingBalancesDate 
            || (new YMDDate()).toString(),

        warnings: [],
    };

    await asyncSetBaseCurrency(setupInfo);
    await asyncLoadPricedItems(setupInfo);
    await asyncLoadPrices(setupInfo);
    await asyncLoadAccounts(setupInfo);
    await asyncLoadLots(setupInfo);
    await asyncLoadTransactions(setupInfo);
    await asyncLoadReminders(setupInfo);

    await accountingSystem.getUndoManager().asyncClearUndos();

    return setupInfo.warnings;
}
