import { getCurrency } from '../util/Currency';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import { YMDDate } from '../util/YMDDate';
import { userMsg, userError } from '../util/UserMessages';


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
    const { pricedItems } = setupInfo.initialContents;
    if (!pricedItems) {
        return;
    }

    const { pricedItemManager, pricedItemMapping, warnings } = setupInfo;
    const baseCurrency = pricedItemManager.getBaseCurrencyCode();
    for (let i = 0; i < pricedItems.length; ++i) {
        const item = pricedItems[i];

        const currency = getCurrency(item.currency || baseCurrency);
        if (!currency) {
            warnings.push('NewFileSetup-invalid_currency', item.name, currency);
            continue;
        }

        try {
            const quantityDefinition = item.quantityDefinition 
                || currency.getQuantityDefinition();
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
        }
        catch (e) {
            warnings.push(userMsg('NewFileSetup-addPricedItem_failed', item.name, e));
        }
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadAccounts(setupInfo) {
    const { accountManager } = setupInfo;
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
        await asyncLoadAccount(setupInfo, rootAccountId, accounts[i]);
    }
}


//
//---------------------------------------------------------
//
async function asyncLoadAccount(setupInfo, parentAccountId, item) {
    const { accountManager, accountMapping, pricedItemManager,
        accessor, warnings } = setupInfo;

    try {
        const accountSettings = {
            parentAccountId: parentAccountId,
            refId: item.refId,
            type: item.type,
            name: item.name,
            description: item.description,
        };
        if (item.pricedItemId) {
            const { pricedItemMapping } = setupInfo;
            const pricedItemId = pricedItemMapping.get(item.pricedItemId);
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

        const { childAccounts, openingBalance } = item;
        if (childAccounts) {
            for (let i = 0; i < childAccounts.length; ++i) {
                await asyncLoadAccount(setupInfo, accountDataItem.id, childAccounts[i]);
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


/**
 * Sets up a blank accounting file from JSON template data.
 * @param {EngineAccessor} accessor
 * @param {AccountingFile} accountingFile 
 * @param {object} initialContents 
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

        pricedItemMapping: new Map(),
        accountMapping: new Map(),

        openingBalancesDate: initialContents.openingBalancesDate 
            || (new YMDDate()).toString(),

        warnings: [],
    };

    await asyncSetBaseCurrency(setupInfo);
    await asyncLoadPricedItems(setupInfo);
    await asyncLoadAccounts(setupInfo);

    await accountingSystem.getUndoManager().asyncClearUndos();

    return setupInfo.warnings;
}
