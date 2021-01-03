import { getCurrency } from '../util/Currency';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as PI from '../engine/PricedItems';
import * as QD from '../util/Quantities';
import { YMDDate } from '../util/YMDDate';
import { userMsg, userError } from '../util/UserMessages';

/**
 * @typedef {object}    NewFileContents_PricedItem
 * @property {string|number} [id]  The priced item's id.
 * @property {string}   type    name property of one of {@link PricedItemType}.
 * @property {string}   [currency]  The 3 letter currency name of the currency 
 * underlying the priced item. If <code>undefined</code> the base currency from 
 * the priced item manager is to be used. Required if type is 
 * {@link PrciedItemType~CURRENCY}
 * @property {string}   [quantityDefinition]  The name of the {@link QuantityDefinition} 
 * defining quantities of the priced item.
 * @property {string}   [priceQuantityDefinition]   If specified the
 * name of the {@link QuantityDefinition} defining the prices of the item, normally
 * used for securities.
 * @property {string}   [name]  The user supplied name of the priced item.
 * @property {string}   [description]   The user supplied description of the 
 * priced item.
 * @property {string}   [ticker]    The ticker symbol, only for priced item types
 * that have hasTickerSymbol.
 * @property {string}   [onlineUpdateType]  The online update type, only for 
 * priced item types that have hasTickerSymbol.
 * @property {string|number} [id]
 */

/**
 * @typedef {object}    NewFileContents_PricedItems
 * @property {NewFileContents_PricedItem} [pricedItems]
 */



/**
 * @typedef {object}    NewFileContents_Lot
 * @property {string|number} pricedItemId The id property from a 
 * NewFileContents_PricedItem
 * @property {string} [description]
 * @property {string|number} [id]
 * @property {string} [lotOriginType]
 */

/**
 * @typedef {object}    NewFileContents_Lots
 * The pricedItemId property is the string/number referring to the matching 
 * string/number id property of a NewFileContents_PricedItem.
 * @property {LotDataItem[]} [lots]
 */


/**
 * @typedef {object}    NewFileContents_PricesItem
 * @property {string|number} pricedItemId The id property from a 
 * NewFileContents_PricedItem
 * @property {PriceDataItem[]} [prices]
 */

/**
 * @typedef {object}    NewFileContents_Prices
 * The pricedItemId property is the string/number referring to the matching 
 * string/number id property of a NewFileContents_PricedItem.
 * @property {NewFileContents_PricesItem[]} [prices]
 */


/**
 * @typedef {object}    NewFileContents_Transactions
 * Account ids in the splits are strings/numbers referring to the matching 
 * string/number id property of a NewFileContents_Account.
 * @property {TransactionDataItem[]} [transactions]
 */


/**
 * @typedef {object}    NewFileContents_Reminders
 * Account ids in the splits are strings/numbers referring to the matching 
 * string/number id property of a NewFileContents_Account.
 * @property {ReminderDataItem[]} [reminders]
 */

/**
 * @typedef {object}    NewFileContents_Account
 * @property {string}   type
 * @property {string}   name
 * @property {string}   [id]
 * @property {string}   [refId]
 * @property {string}   [description]
 * @property {string[]} [tags]
 * @property {string|number} [pricedItemId] The id property from a 
 * NewFileContents_PricedItem, if <code>undefined</code> the account will use
 * the base currency priced item.
 * @property {NewFileContents_Account[]}    [childAccounts]
 * @property {string} [openingBalance]
 * @property {string} [lastReconcileYMDDate]
 * @property {string} [lastReconcileBalance]
 * @property {string} [pendingReconcileYMDDate]
 * @property {string} [pendingReconcileBalance]
 * @property {boolean} [isHidden]
 * @property {boolean} [isLocked]
 */

/**
 * @typedef {object}    NewFileContents_Accounts
 * @property {NewFileContents_Account[]}    ASSET
 * @property {NewFileContents_Account[]}    LIABILITY
 * @property {NewFileContents_Account[]}    INCOME
 * @property {NewFileContents_Account[]}    EXPENSE
 * @property {NewFileContents_Account[]}    EQUITY
 */

/**
 * @typedef {object} NewFileContents
 * @property {string} [baseCurrency]
 * @property {string}   [openingBalancesDate]
 * @property {NewFileContents_PricedItems} [pricedItems]
 * @property {NewFileContents_Lots} [lots]
 * @property {NewFileContents_Prices} [prices]
 * @property {NewFileContents_Accounts} [accounts]
 * @property {NewFileContents_Transactions} [transactions]
 * @property {NewFileContents_Reminders} [reminders]
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
                priceQuantityDefinition: item.priceQuantityDefinition,
            };
            if (item.ticker) {
                settings.ticker = item.ticker;
            }
            if (item.onlineUpdateType) {
                settings.onlineUpdateType = item.onlineUpdateType;
            }

            const pricedItemDataItem = (await pricedItemManager.asyncAddPricedItem(
                settings)).newPricedItemDataItem;

            if (setupInfo.initialContents.pricedItems.isDebug) {
                console.log({
                    id: item.id,
                    pricedItemDataItem: pricedItemDataItem,
                });
            }

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


            if (setupInfo.initialContents.lots.isDebug) {
                console.log({
                    id: item.id,
                    pricedItemDataItem: lotDataItem,
                });
            }

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
        const accountSettings = Object.assign({}, item, {
            parentAccountId: parentAccountId,
        });
        delete accountSettings.childAccounts;

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


        const accountCategory = A.AccountType[item.type].category;

        // Reconcile balances...
        const { lastReconcileBalance, pendingReconcileBalance } = item;
        if (lastReconcileBalance !== undefined) {
            const quantityBaseValue = accessor.pricedItemQuantityTextToBaseValue(
                accountSettings.pricedItemId, lastReconcileBalance);
            accountSettings.lastReconcileBalanceBaseValue = quantityBaseValue
                * -accountCategory.creditSign;
        }
        if (pendingReconcileBalance !== undefined) {
            const quantityBaseValue = accessor.pricedItemQuantityTextToBaseValue(
                accountSettings.pricedItemId, pendingReconcileBalance);
            accountSettings.pendingReconcileBalanceBaseValue = quantityBaseValue
                * -accountCategory.creditSign;
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
    if (!setupInfo.initialContents.transactions) {
        return;
    }

    const { transactions } = setupInfo.initialContents.transactions;
    if (!transactions) {
        return;
    }

    const { warnings, accessor,
        accountNameMapping, accountMapping, lotNameMapping } = setupInfo;
    let item;
    let transaction;
    try {
        setupInfo.transactionManager.isDebugAccountStates 
            = setupInfo.initialContents.isDebugAccountStates;

        const transactionsToAdd = [];
        for (let i = 0; i < transactions.length; ++i) {
            item = transactions[i];

            const splits = [];
            item.splits.forEach((itemSplit) => {
                const split = Object.assign({}, itemSplit);
                let accountDataItem = accountNameMapping.get(itemSplit.accountId);
                if (!accountDataItem) {
                    accountDataItem = accountMapping.get(itemSplit.accountId);
                }
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

                if (split.quantity !== undefined) {
                    split.quantityBaseValue = accessor.pricedItemQuantityTextToBaseValue(
                        accountDataItem.pricedItemId, split.quantity);

                    const category = accessor.getCategoryOfAccountId(
                        accountDataItem.id);
                    if (item.isCredit) {
                        split.quantityBaseValue *= category.creditSign;
                    }
                    else {
                        split.quantityBaseValue *= -category.creditSign;
                    }

                    delete split.isCredit;
                    delete split.quantity;
                }

                splits.push(split);
            });

            transaction = Object.assign({}, item);
            transaction.splits = splits;

            if (setupInfo.skipFailedTransactions) {
                await setupInfo.transactionManager.asyncAddTransaction(transaction);
            }
            else {
                transactionsToAdd.push(transaction);
            }
        }

        if (!setupInfo.skipFailedTransactions) {
            await setupInfo.transactionManager.asyncAddTransaction(transactionsToAdd);
        }
    }
    catch (e) {
        if (setupInfo.initialContents.isDebug && e.transactionDataItem) {
            console.info({
                transactionDataItem: e.transactionDataItem,
                splits: e.transactionDataItem.splits,
            });
        }

        const description = item.description || item.ymdDate;
        warnings.push(userMsg('NewFileSetup-addTransaction_failed',
            description, e));
    }
    finally {
        setupInfo.transactionManager.isDebugAccountStates = false;
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadReminders(setupInfo) {
    if (!setupInfo.initialContents.reminders) {
        return;
    }

    const { reminders } = setupInfo.initialContents.reminders;
    if (!reminders) {
        return;
    }

    const { reminderManager, accountNameMapping, accountMapping, warnings } = setupInfo;
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
                    let accountDataItem = accountNameMapping.get(split.accountId);
                    if (!accountDataItem) {
                        accountDataItem = accountMapping.get(split.accountId);
                    }
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
export async function asyncSetupNewFile(accessor, accountingFile, initialContents, 
    options) {
    const accountingSystem = accountingFile.getAccountingSystem();

    const setupInfo = {
        accessor: accessor,
        initialContents: initialContents,
        options: options || {},

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

    if (!setupInfo.options.isStrictImport) {
        setupInfo.skipFailedTransactions = true;
    }

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
