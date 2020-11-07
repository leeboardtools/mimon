import { JSONGzipAccountingFileFactory } from '../engine/JSONGzipAccountingFile';
import { EngineAccessor } from './EngineAccess';
import * as ASTH from '../engine/AccountingSystemTestHelpers';
import { asyncGetNewFileTemplates } from './Templates';
import { createTestTransactions } from './CreateTestTransactions';


export async function asyncSetupTestEngineAccess(pathName, options) {
    options = options || {};
    // Create a test JSONGzip file.
    const factory = new JSONGzipAccountingFileFactory();

    const originalFile = await factory.asyncCreateFile(pathName);
    const accountingSystem = originalFile.getAccountingSystem();
    const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem);

    if (!options.noOpeningBalances) {
        await ASTH.asyncAddOpeningBalances(sys);
        if (!options.noBasicTransactions) {
            await ASTH.asyncAddBasicTransactions(sys);
        }
    }

    await originalFile.asyncWriteFile();
    await originalFile.asyncCloseFile();

    const accessor = new EngineAccessor();
    await accessor.asyncOpenAccountingFile(pathName);

    return {
        accessor: accessor,
        sys: sys,
    };
}


function grabAccounts(accessor, sys, baseAccountId, accounts, baseName) {
    const baseAccountDataItem = accessor.getAccountDataItemWithId(baseAccountId);
    if (!baseAccountDataItem) {
        return;
    }

    sys[baseName + 'AccountId'] = baseAccountId;

    if (!accounts) {
        return;
    }

    const { childAccountIds } = baseAccountDataItem;
    if (!childAccountIds || (childAccountIds.length !== accounts.length)) {
        return;
    }

    for (let i = 0; i < accounts.length; ++i) {
        const account = accounts[i];
        const name = baseName + '-' + account.name;
        sys[name + 'AccountId'] = childAccountIds[i];

        const { childAccounts } = account;
        if (childAccounts) {
            grabAccounts(accessor, sys, childAccountIds[i],
                childAccounts, name);
        }
    }
}

function grabPricedItems(accessor, sys, pricedItems) {
    const pricedItemIdsByTypeAndName = new Map();
    const pricedItemIds = accessor.getPricedItemIds();
    for (let pricedItemId of pricedItemIds) {
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        pricedItemIdsByTypeAndName.set(
            pricedItemDataItem.type
                + ':' + (pricedItemDataItem.name || ''),
            pricedItemId);
    }

    for (let pricedItem of pricedItems) {
        const key = pricedItem.type + ':' + pricedItem.name;
        const pricedItemId = pricedItemIdsByTypeAndName.get(key);
        if (pricedItemId) {
            const id = pricedItem.id || pricedItem.ticker || pricedItem.name;
            sys[id + 'PricedItemId'] = pricedItemId;
        }
    }
}

function grabLots(accessor, sys, lots) {
    const lotIdsByTypeAndName = new Map();
    const lotIds = accessor.getLotIds();
    for (let lotId of lotIds) {
        const lotDataItem = accessor.getLotDataItemWithId(lotId);
        lotIdsByTypeAndName.set(lotDataItem.description, lotId);
    }

    for (let lot of lots) {
        const key = lot.description;
        const lotId = lotIdsByTypeAndName.get(key);
        if (lotId) {
            const id = lot.description;
            sys[id + 'LotId'] = lotId;
        }
    }
}

export async function asyncSetupWithTestTransactions(pathName, options) {
    options = options || {};

    const accessor = new EngineAccessor();
    const sys = {};

    const newFileTemplates = await asyncGetNewFileTemplates();
    const newFileContents = newFileTemplates[0];

    createTestTransactions(newFileContents);

    const warnings = await accessor.asyncCreateAccountingFile(
        pathName, 0, newFileContents);
    if (warnings.length) {
        console.log('Warnings: ' + JSON.stringify(warnings));
    }

    const { accounts } = newFileContents;
    grabAccounts(accessor, sys, 
        accessor.getRootAssetAccountId(), accounts.ASSET, 'ASSET');
    grabAccounts(accessor, sys, 
        accessor.getRootLiabilityAccountId(), accounts.LIABILITY, 'LIABILITY');
    grabAccounts(accessor, sys, 
        accessor.getRootIncomeAccountId(), accounts.INCOME, 'INCOME');
    grabAccounts(accessor, sys, 
        accessor.getRootExpenseAccountId(), accounts.EXPENSE, 'EXPENSE');
    grabAccounts(accessor, sys,
        accessor.getRootEquityAccountId(), accounts.EQUITY, 'EQUITY');

    const { pricedItems } = newFileContents;
    grabPricedItems(accessor, sys, pricedItems.pricedItems);

    const { lots } = newFileContents;
    grabLots(accessor, sys, lots.lots);

    return {
        accessor: accessor,
        sys: sys,
    };
}