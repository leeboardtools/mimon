import { createDir, cleanupDir } from '../util/FileTestHelpers';
import { EngineAccessor } from './EngineAccess';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import * as T from '../engine/Transactions';
import * as RE from '../util/Repeats';
import { getDecimalDefinition } from '../util/Quantities';
import { getYMDDate } from '../util/YMDDate';

const path = require('path');


//
//---------------------------------------------------------
//
test('EngineAccessor-fileAccess', async () => {
    const baseDir = await createDir('EngineAccessor-fileAccess');

    try {
        await cleanupDir(baseDir, true);

        const accessor = new EngineAccessor();

        const fileNameFilters = accessor.getFileNameFilters();

        expect(accessor.getFileFactoryCount()).toBeGreaterThanOrEqual(1);
        expect(fileNameFilters.length).toBeGreaterThanOrEqual(1);
        expect(accessor.getFileNameFiltersForFileFactoryIndex(0).length)
            .toBeGreaterThanOrEqual(1);

        expect(accessor.getAccountingFilePathName()).toBeUndefined();

        expect(accessor.getFileFactoryIndexFromFileNameFilter(fileNameFilters[0]))
            .toEqual(0);
        
        expect(accessor.isFileFactoryAtIndexDirBased(0)).toBeTruthy();
        expect(await accessor.asyncIsPossibleAccountingFile('MissingDir', 0)).toBeFalsy();


        const pathName1 = path.join(baseDir, 'test1');
        expect(await accessor.asyncCanCreateAccountingFile(pathName1)).toBeTruthy();

        // Shouldn't exist, asyncOpenAccountingFile() should fail.
        await expect(accessor.asyncOpenAccountingFile(pathName1)).rejects.toThrow();

        await accessor.asyncCreateAccountingFile(pathName1);

        expect(accessor.getAccountingFilePathName()).toEqual(pathName1);
        expect(accessor.getAccountingFileFactoryIndex()).toEqual(0);

        await accessor.asyncCloseAccountingFile();
        expect(accessor.getAccountingFilePathName()).toBeUndefined();
        expect(accessor.getAccountingFileFactoryIndex()).toBeUndefined();



        // Now we can open the file.
        await accessor.asyncOpenAccountingFile(pathName1);

        expect(accessor.getAccountingFilePathName()).toEqual(pathName1);
        expect(accessor.getAccountingFileFactoryIndex()).toEqual(0);

        await accessor.asyncCloseAccountingFile();
        expect(accessor.getAccountingFilePathName()).toBeUndefined();
        expect(accessor.getAccountingFileFactoryIndex()).toBeUndefined();


        // Now try save as.
        /*
        Not yet implemented by JSONGzipAccountingFile...

        const pathName2 = path.join(baseDir, 'saveAs-test');
        await access.asyncSaveAccountingFileAs(pathName2);

        expect(access.getAccountingFilePathName()).toEqual(pathName2);
        expect(access.getAccountingFileFactoryIndex()).toEqual(0);

        await access.asyncCloseAccountingFile();
        */

    }
    finally {
        // await cleanupDir(baseDir);
    }

});


//
//---------------------------------------------------------
//
test('EngineAccessor-actions', async () => {
    const baseDir = await createDir('EngineAccessor-actions');

    try {
        await cleanupDir(baseDir, true);

        const accessor = new EngineAccessor();


        const pathName1 = path.join(baseDir, 'test1');
        await accessor.asyncCreateAccountingFile(pathName1);

        const accountingActions = accessor.getAccountingActions();

        expect(accessor.isAccountingFileModified()).toBeFalsy();


        const settingsA = { type: A.AccountType.BANK.name, 
            parentAccountId: accessor.getRootAssetAccountId(),
            pricedItemId: accessor.getBaseCurrencyPricedItemId(),
            name: 'Checking',
        };
        const actionA = accountingActions.createAddAccountAction(settingsA);
        const resultA = await accessor.asyncApplyAction(actionA);
        expect(accessor.getAppliedActionCount()).toEqual(1);
        expect(accessor.getLastAppliedAction()).toEqual(actionA);
        expect(accessor.getLastAppliedActionResult()).toEqual(resultA);

        const accountA = resultA.newAccountDataItem;
        expect(accountA).toBeDefined();

        settingsA.id = accountA.id;
        expect(accountA).toEqual(expect.objectContaining(settingsA));

        expect(accessor.isAccountingFileModified()).toBeTruthy();

        const checkingId = accountA.id;


        // Test quantity conversion.
        result = accessor.accountQuantityBaseValueToText(checkingId, -1234);
        expect(result).toEqual('-12.34');
        result = accessor.accountQuantityTextToBaseValue(checkingId, '-10,987.65');
        expect(result).toEqual(-1098765);


        const settingsB = { type: A.AccountType.EXPENSE.name,
            parentAccountId: accessor.getRootExpenseAccountId(),
            pricedItemId: accessor.getBaseCurrencyPricedItemId(),
            name: 'Groceries',
            refId: 'Groceries',
        };
        const actionB = accountingActions.createAddAccountAction(settingsB);
        const resultB = await accessor.asyncApplyAction(actionB);
        expect(accessor.getAppliedActionCount()).toEqual(2);

        const accountB = resultB.newAccountDataItem;
        settingsB.id = accountB.id;
        expect(accountB).toEqual(expect.objectContaining(settingsB));

        let result;
        result = accessor.getAccountDataItemWithId(accountB.id);
        expect(result).toEqual(expect.objectContaining(settingsB));

        const groceriesId = accountB.id;


        const settingsC = { type: A.AccountType.BROKERAGE.name,
            parentAccountId: accessor.getRootAssetAccountId(),
            pricedItemId: accessor.getBaseCurrencyPricedItemId(),
            name: 'Brokerage',
        };
        const actionC = accountingActions.createAddAccountAction(settingsC);
        result = await accessor.asyncApplyAction(actionC);
        expect(accessor.getAppliedActionCount()).toEqual(3);

        const accountC = result.newAccountDataItem;
        settingsC.id = accountC.id;
        expect(accountC).toEqual(expect.objectContaining(settingsC));


        const brokerageId = accountC.id;


        result = accessor.getAccountDataItemWithRefId('Groceries');
        expect(result).toEqual(accountB);


        await accessor.asyncUndoLastAppliedAction();
        expect(accessor.getAppliedActionCount()).toEqual(2);
        expect(accessor.getUndoneActionCount()).toEqual(1);


        await accessor.asyncWriteAccountingFile();

        await accessor.asyncCloseAccountingFile();
        expect(accessor.getAccountingFilePathName()).toBeUndefined();
        expect(accessor.getAccountingFileFactoryIndex()).toBeUndefined();



        // Reopen...
        await accessor.asyncOpenAccountingFile(pathName1);

        expect(accessor.getAppliedActionCount()).toEqual(2);
        expect(accessor.getUndoneActionCount()).toEqual(0);

        expect(accessor.getAccountDataItemWithId(settingsC.id)).toBeUndefined();
        expect(accessor.getAccountDataItemWithId(settingsB.id)).toEqual(accountB);

        // Make sure undo still works.
        await accessor.asyncUndoLastAppliedAction();
        expect(accessor.getAppliedActionCount()).toEqual(1);
        expect(accessor.getUndoneActionCount()).toEqual(1);

        expect(accessor.getAccountDataItemWithId(settingsB.id)).toBeUndefined();

        // Redo.
        await accessor.asyncReapplyLastUndoneAction();
        expect(accessor.getAccountDataItemWithId(settingsB.id)).toEqual(accountB);
        

        // Since we undid actionC previously and didn't add any new accounts, the
        // next account id should be the same as the old accountC.
        result = await accessor.asyncApplyAction(actionC);
        settingsC.id = result.newAccountDataItem.id;
        expect(accessor.getAccountDataItemWithId(settingsC.id)).toEqual(accountC);



        //
        // Priced Items
        //
        const settingsD = { 
            type: PI.PricedItemType.SECURITY.name,
            currency: 'USD',
            quantityDefinition: getDecimalDefinition(4).getName(),
            name: 'Apple Computer',
            ticker: 'AAPL',
        };
        const actionD = accountingActions.createAddPricedItemAction(settingsD);
        result = await accessor.asyncApplyAction(actionD);
        const aaplPricedItem = result.newPricedItemDataItem;
        settingsD.id = aaplPricedItem.id;
        expect(aaplPricedItem).toEqual(expect.objectContaining(settingsD));

        result = accessor.getPricedItemDataItemWithId(settingsD.id);
        expect(result).toEqual(aaplPricedItem);

        expect(accessor.getPricedItemIds()).toEqual(
            expect.arrayContaining([aaplPricedItem.id]));


        const settingsD1 = { type: A.AccountType.SECURITY.name,
            parentAccountId: brokerageId,
            pricedItemId: aaplPricedItem.id,
            name: 'AAPL Stock',
        };
        const actionD1 = accountingActions.createAddAccountAction(settingsD1);
        result = await accessor.asyncApplyAction(actionD1);
        expect(accessor.getAppliedActionCount()).toEqual(5);

        const accountD1 = result.newAccountDataItem;
        settingsD1.id = accountD1.id;
        expect(accountD1).toEqual(expect.objectContaining(settingsD1));

        const aaplId = accountD1.id;

    
        //
        // Lots
        //
        const settingsE = {
            pricedItemId: aaplPricedItem.id,
            description: 'Lot 1',
        };
        const actionE = accountingActions.createAddLotAction(settingsE);
        result = await accessor.asyncApplyAction(actionE);
        const lot1 = result.newLotDataItem;
        settingsE.id = lot1.id;
        expect(lot1).toEqual(expect.objectContaining(settingsE));

        result = accessor.getLotDataItemWithId(lot1.id);
        expect(result).toEqual(lot1);

        expect(accessor.getLotIds()).toEqual([lot1.id]);



        //
        // Transactions
        //
        const settingsF = {
            ymdDate: '2018-01-23',
            description: 'Transaction F',
            splits: [
                { accountId: checkingId,
                    reconcileState: T.ReconcileState.RECONCILED.name,
                    quantityBaseValue: 100000,
                },
                { accountId: accessor.getOpeningBalancesAccountId(),
                    reconcileState: T.ReconcileState.RECONCILED.name,
                    quantityBaseValue: 100000,
                },
            ],
        };
        const actionF = accountingActions.createAddTransactionAction(settingsF);
        result = await accessor.asyncApplyAction(actionF);
        const transF = result.newTransactionDataItem;
        settingsF.id = transF.id;
        expect(transF).toEqual(expect.objectContaining(settingsF));
        expect(await accessor.asyncGetTransactionDataItemWithId(transF.id))
            .toEqual(transF);
        
        let checkingBalance = settingsF.splits[0].quantityBaseValue;
        const checkingOpeningBalance = checkingBalance;

        const settingsG = {
            ymdDate: '2019-02-03',
            description: 'Transaction G',
            splits: [
                { accountId: checkingId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    quantityBaseValue: -5000,
                },
                { accountId: groceriesId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    quantityBaseValue: 5000,
                }
            ]
        };
        const actionG = accountingActions.createAddTransactionAction(settingsG);
        result = await accessor.asyncApplyAction(actionG);
        const transG = result.newTransactionDataItem;
        settingsG.id = transG.id;
        expect(transG).toEqual(expect.objectContaining(settingsG));
        expect(await accessor.asyncGetTransactionDataItemWithId(transG.id))
            .toEqual(transG);

        checkingBalance += settingsG.splits[0].quantityBaseValue;


        const settingsH = {
            ymdDate: '2018-06-20',
            description: 'Transaction H',
            splits: [
                { accountId: brokerageId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    quantityBaseValue: 1000000,
                },
                { accountId: accessor.getOpeningBalancesAccountId(),
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    quantityBaseValue: 1000000,
                },
            ],
        };
        const actionH = accountingActions.createAddTransactionAction(settingsH);
        result = await accessor.asyncApplyAction(actionH);
        const transH = result.newTransactionDataItem;
        settingsH.id = transH.id;
        expect(transH).toEqual(expect.objectContaining(settingsH));
        expect(await accessor.asyncGetTransactionDataItemWithId(transH.id))
            .toEqual(transH);


        const changeI = { lotId: lot1.id, 
            quantityBaseValue: 10000, 
            costBasisBaseValue: 200000, 
        };
        const settingsI = {
            ymdDate: '2019-10-14',
            description: 'Transaction I',
            splits: [
                { accountId: brokerageId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    quantityBaseValue: -changeI.costBasisBaseValue, 
                },
                { 
                    accountId: aaplId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: changeI.costBasisBaseValue, 
                    lotChanges: [ changeI ],
                },
            ]
        };
        const actionI = accountingActions.createAddTransactionAction(settingsI);
        result = await accessor.asyncApplyAction(actionI);
        const transI = result.newTransactionDataItem;
        settingsI.id = transI.id;
        expect(transI).toEqual(expect.objectContaining(settingsI));
        expect(await accessor.asyncGetTransactionDataItemWithId(transI.id))
            .toEqual(transI);


        result = await accessor.asyncGetTransactionDateRange();
        expect(result).toEqual([ getYMDDate('2018-01-23'), getYMDDate('2019-10-14') ]);

        result = await accessor.asyncGetTransactionDateRange(checkingId);
        expect(result).toEqual([ getYMDDate('2018-01-23'), getYMDDate('2019-02-03') ]);


        result = await accessor.asyncGetTransactionDataItemsInDateRange(
            brokerageId, '2018-06-20', '2019-02-03');
        expect(result).toEqual([ transH ]);


        result = await accessor.asyncGetSortedTransactionKeysForAccount(checkingId);
        expect(result).toEqual([
            { id: transF.id, ymdDate: getYMDDate('2018-01-23'), },
            { id: transG.id, ymdDate: getYMDDate('2019-02-03'), },
        ]);

        result = await accessor.asyncGetSortedTransactionKeysForLot(lot1.id);
        expect(result).toEqual([
            { id: transI.id, ymdDate: getYMDDate('2019-10-14'), },
        ]);

        result = await accessor.getCurrentAccountStateDataItem(checkingId);
        expect(result).toEqual({ ymdDate: '2019-02-03', 
            quantityBaseValue: checkingBalance,
        });

        result = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            checkingId, transF.id);
        expect(result).toEqual([
            { ymdDate: '2018-01-23', quantityBaseValue: checkingOpeningBalance, }
        ]);

        result = await accessor.asyncGetAccountStateDataItemsBeforeTransaction(
            checkingId, transG.id);
        expect(result).toEqual([
            { ymdDate: '2018-01-23', quantityBaseValue: checkingOpeningBalance, }
        ]);

        result = await accessor.asyncGetNonReconciledTransactionIdsForAccountId(
            checkingId);
        expect(result).toEqual([ transG.id, ]);


        const testSplitsA = [
            { accountId: checkingId,
                reconcileState: T.ReconcileState.RECONCILED.name,
                quantityBaseValue: 100000,
            },
            { accountId: accessor.getOpeningBalancesAccountId(),
                reconcileState: T.ReconcileState.RECONCILED.name,
                quantityBaseValue: 100001,
            },
        ];
        result = await accessor.validateSplits(testSplitsA);
        expect(result).toBeInstanceOf(Error);


        //
        // Prices
        //
        const priceSettingsA = [
            { ymdDate: '2014-06-09', close: 93.70, },
            { ymdDate: '2014-06-10', close: 94.25, },
            { ymdDate: '2014-06-13', close: 91.28, },
            { ymdDate: '2014-06-20', close: 90.91, },
        ];
        const priceActionA = accountingActions.createAddPricesAction(
            aaplPricedItem.id, priceSettingsA);
        result = await accessor.asyncApplyAction(priceActionA);

        result = await accessor.asyncGetPriceDateRange(aaplPricedItem.id);
        expect(result).toEqual([
            getYMDDate('2014-06-09'),
            getYMDDate('2014-06-20'),
        ]);

        result = await accessor.asyncGetPriceDataItemsInDateRange(
            aaplPricedItem.id, priceSettingsA[1].ymdDate, priceSettingsA[2].ymdDate);
        expect(result).toEqual([
            priceSettingsA[1], 
            priceSettingsA[2],
        ]);

        result = await accessor.asyncGetPriceDataItemOnOrClosestBefore(
            aaplPricedItem.id, '2014-06-12');
        expect(result).toEqual(priceSettingsA[1]);


        //
        // Reminders
        //
        const reminderSettingsA = {
            repeatDefinition: {
                type: RE.RepeatType.YEARLY.name,
                period: 12,
                offset: {
                    type: RE.YearOffsetType.NTH_WEEK.name,
                    offset: 2,
                    dayOfWeek: 1,
                },
                startYMDDate: '2010-01-01',
            },
            description: 'Hello',
            transactionTemplate: {
                splits: [
                    { accountId: 123, },
                    { accountId: 234, },
                ]
            },
            isEnabled: true,
            lastAppliedDate: '2010-06-01',
        };
    
        // New Reminder
        const reminderActionA = accountingActions.createAddReminderAction(
            reminderSettingsA);
        result = await accessor.asyncApplyAction(reminderActionA);
        const reminderA = result.newReminderDataItem;
        reminderSettingsA.id = reminderA.id;
        expect(reminderA).toEqual(reminderSettingsA);
        expect(accessor.getReminderIds()).toEqual([reminderA.id]);
        expect(accessor.getReminderDataItemWithId(reminderA.id)).toEqual(reminderA);

        //
        // All done...
        //
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }

});


