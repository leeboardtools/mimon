import { asyncImportXMLFile } from './XMLFileImporter';
import { getAppPathName } from '../engine/Engine';
import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as path from 'path';
import { EngineAccessor } from './EngineAccess';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import { YMDDate, getYMDDate } from '../util/YMDDate';


function getSecurityPricedItemDataItem(accessor, ticker) {
    const ids = accessor.getPricedItemIdsForType(PI.PricedItemType.SECURITY);
    for (let i = 0; i < ids.length; ++i) {
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(ids[i]);
        if (pricedItemDataItem.ticker === ticker) {
            return pricedItemDataItem;
        }
    }
}

async function asyncExpectSecurity(accessor, ticker, securityDataItem, prices) {
    let testPricedItemDataItem = getSecurityPricedItemDataItem(accessor, ticker);

    expect(testPricedItemDataItem).toEqual(expect.objectContaining(securityDataItem));

    if (prices) {
        // 
        let earliestYMDDate = getYMDDate(prices[0].ymdDate);
        let latestYMDDate = getYMDDate(prices[0].ymdDate);
        for (let i = 1; i < prices.length; ++i) {
            const ymdDate = getYMDDate(prices[i].ymdDate);
            if (YMDDate.compare(ymdDate, earliestYMDDate) < 0) {
                earliestYMDDate = ymdDate;
            }
            else if (YMDDate.compare(ymdDate, latestYMDDate) > 0) {
                latestYMDDate = ymdDate;
            }
        }

        let testPrices = await accessor.asyncGetPriceDataItemsInDateRange(
            testPricedItemDataItem.id,
            earliestYMDDate,
            latestYMDDate);
        
        const testMultipliers 
            = await accessor.asyncGetPriceMultiplierDataItemsInDateRange(
                testPricedItemDataItem.id,
                earliestYMDDate,
                latestYMDDate);
        
        testPrices = testPrices.concat(testMultipliers);
        
        expect(testPrices).toEqual(expect.arrayContaining(prices));
    }
}


function getAccountFromPath(accessor, rootAccountId, accountPath) {
    const rootAccountDataItem = accessor.getAccountDataItemWithId(rootAccountId);
    if (!Array.isArray(accountPath)) {
        accountPath = accountPath.split('>');
    }

    const { childAccountIds } = rootAccountDataItem;
    for (let i = 0; i < childAccountIds.length; ++i) {
        const childAccountDataItem 
            = accessor.getAccountDataItemWithId(childAccountIds[i]);
        if (childAccountDataItem.name === accountPath[0]) {
            if (accountPath.length > 1) {
                return getAccountFromPath(accessor, childAccountIds[i], 
                    accountPath.slice(1));
            }
            else {
                return childAccountDataItem;
            }
        }
    }
}


function expectAccount(accessor, rootAccountId, accountPath, refAccountDataItem) {
    const accountDataItem = getAccountFromPath(accessor, rootAccountId, accountPath);
    expect(accountDataItem).toEqual(expect.objectContaining(
        refAccountDataItem));
}



function scalePrice(price, newCount, oldCount) {
    return Math.round(price * newCount / oldCount * 10000) / 10000;
}

test('XMLFileImporter-asyncImportXMLFile', async () => {
    const baseDir = await createDir('XMLFileImporter');

    try {
        await cleanupDir(baseDir, true);

        const mimonPathName = path.join(baseDir, 'asyncImportXMLFile');

        const accessor = new EngineAccessor();
        
        const xmlPathName = path.join(getAppPathName(), 'test.data', 'jGnash Test.xml');
        const result = await asyncImportXMLFile({
            accessor: accessor, 
            pathNameToImport: xmlPathName, 
            newProjectPathName: mimonPathName,
            verbose: false,
        });
        if (result) {
            //console.log(result);
        }

        await asyncExpectSecurity(accessor, 'PBW', {
            description: 'Powersource',
            onlineUpdateType: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
            currency: 'USD',
        });

        await asyncExpectSecurity(accessor, 'AAPL', {
            description: 'Apple Computer Inc',
            onlineUpdateType: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
            currency: 'USD',
        },
        [
            {
                ymdDate: '2020-08-27',
                close: scalePrice(125.010002, 4, 1),
                high: scalePrice(127.485001, 4, 1),
                low: scalePrice(123.832497, 4, 1),
                volume: 155552400,
            },
            {   
                ymdDate: '2020-08-28',
                close: scalePrice(124.807503, 4, 1),
                high: scalePrice(126.442497, 4, 1),
                low: scalePrice(124.577499, 4, 1),
                volume: 187630000,
            },
            {
                ymdDate: '2020-08-31',
                newCount: 4,
                oldCount: 1,
            },
            {   
                ymdDate: '2020-08-31',
                close: scalePrice(129.039993, 1, 1),
                high: scalePrice(131.000000, 1, 1),
                low: scalePrice(126.000000, 1, 1),
                volume: 225702700,
            },
            {
                ymdDate: '2020-09-01',
                close: scalePrice(134.179993, 1, 1),
                high: scalePrice(134.800003, 1, 1),
                low: scalePrice(130.529999, 1, 1),
                volume: 152470100,
            },
        ],
        );

        expectAccount(accessor, accessor.getRootAssetAccountId(), 
            'Current Assets', 
            { type: A.AccountType.ASSET.name, });

        expectAccount(accessor, accessor.getRootAssetAccountId(), 
            'Current Assets>Checking', 
            { type: A.AccountType.BANK.name, 
                description: 'Checking Account',
            });

        expectAccount(accessor, accessor.getRootAssetAccountId(), 
            'Investments>Brokerage>PBW', 
            { type: A.AccountType.SECURITY.name, 
                pricedItemId: getSecurityPricedItemDataItem(accessor, 'PBW').id,
            });

        expectAccount(accessor, accessor.getRootAssetAccountId(), 
            'Investments>IRA>Apple',
            { type: A.AccountType.SECURITY.name, 
                pricedItemId: getSecurityPricedItemDataItem(accessor, 'AAPL').id,
            });

        expectAccount(accessor, accessor.getRootExpenseAccountId(), 
            'Insurance>Health Insurance',
            { type: A.AccountType.EXPENSE.name, 
            });

        expectAccount(accessor, accessor.getRootIncomeAccountId(), 
            'Dividends>IRA>AAPL',
            { type: A.AccountType.INCOME.name, 
            });

        expectAccount(accessor, accessor.getRootLiabilityAccountId(), 
            'American Express',
            { type: A.AccountType.CREDIT_CARD.name, 
            });


        expectAccount(accessor, accessor.getRootEquityAccountId(), 
            'Retained Earnings', 
            { type: A.AccountType.EQUITY.name,
                isHidden: true,
                isLocked: true,
            });

        
        const savingsAccountDataItem = getAccountFromPath(accessor,
            accessor.getRootAssetAccountId(), 'Current Assets>Savings');
        expect(savingsAccountDataItem.lastReconcileBalanceBaseValue)
            .toEqual(100000);
        expect(savingsAccountDataItem.lastReconcileYMDDate)
            .toEqual(new YMDDate(1569816000000).toString());

        expect(savingsAccountDataItem.pendingReconcileBalanceBaseValue)
            .toEqual(85000);
        expect(savingsAccountDataItem.pendingReconcileYMDDate)
            .toBeUndefined();


        const checkingAccountDataItem = getAccountFromPath(accessor,
            accessor.getRootAssetAccountId(), 'Current Assets>Checking');
        expect(checkingAccountDataItem.lastReconcileBalanceBaseValue)
            .toEqual(150000);
        expect(checkingAccountDataItem.lastReconcileYMDDate)
            .toEqual(new YMDDate(1504152000000).toString());

        expect(checkingAccountDataItem.pendingReconcileBalanceBaseValue)
            .toEqual(50000);
        expect(checkingAccountDataItem.pendingReconcileYMDDate)
            .toEqual(new YMDDate(1506744000000).toString());


        //
        // All done...
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});
