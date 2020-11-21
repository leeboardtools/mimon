/* eslint-disable no-unused-vars */
import { createDir, cleanupDir } from '../util/FileTestHelpers';
import { JSONGzipAccountingFileFactory } from './JSONGzipAccountingFile';
import * as A from './Accounts';
import * as T from './Transactions';
import * as L from './Lots';
import * as PI from './PricedItems';
import * as ASTH from './AccountingSystemTestHelpers';
import * as RE from '../util/Repeats';
import { getQuantityDefinition, getDecimalDefinition } from '../util/Quantities';

const path = require('path');



//
//---------------------------------------------------------
//
test('JSONGzipAccountingFile-simple', async () => {
    const baseDir = await createDir('JSONGzipAccountingFile-simple');

    try {
        await cleanupDir(baseDir, true);

        const factory = new JSONGzipAccountingFileFactory();
        
        const pathName1 = path.join(baseDir, 'test1');
        const file1 = await factory.asyncCreateFile(pathName1);
        const accountingSystem1 = file1.getAccountingSystem();

        expect(file1.isModified()).toBeFalsy();

        const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem1);

        expect(file1.isModified()).toBeTruthy();

        const accountManager1 = accountingSystem1.getAccountManager();

        let result;

        // Assets
        const checking = accountManager1.getAccountDataItemWithId(sys.checkingId);

        const brokerageA = accountManager1.getAccountDataItemWithId(sys.brokerageAId);
        const aaplBrokerageA = accountManager1.getAccountDataItemWithId(
            sys.aaplBrokerageAId);

        // Liabilities
        const autoLoan = accountManager1.getAccountDataItemWithId(sys.autoLoanId);

        // Income
        const salary = accountManager1.getAccountDataItemWithId(sys.salaryId);

        // Expense
        const groceries = accountManager1.getAccountDataItemWithId(sys.groceriesId);
        const federalTaxes = accountManager1.getAccountDataItemWithId(sys.federalTaxesId);

        // Gonna remove this later to make sure remove works fine.
        const newAccountA = (await accountManager1.asyncAddAccount({
            parentAccountId: sys.currentAssetsId, 
            type: A.AccountType.BANK, 
            pricedItemId: checking.pricedItemId, 
            name: 'New Account A',
        })).newAccountDataItem;


        // Priced items
        const pricedItemManager1 = accountingSystem1.getPricedItemManager();

        const aaplPricedItem = pricedItemManager1.getPricedItemDataItemWithId(
            sys.aaplPricedItemId);
        const housePricedItem = pricedItemManager1.getPricedItemDataItemWithId(
            sys.housePricedItemId);

        const newPricedItemA = (await pricedItemManager1.asyncAddPricedItem({
            type: PI.PricedItemType.PROPERTY, 
            currency: 'USD', 
            name: 'PricedItemA', 
            quantityDefinition: getDecimalDefinition(-4),
        })).newPricedItemDataItem;


        // Reminders
        const reminderManager1 = accountingSystem1.getReminderManager();
        const reminderA = {
            repeatDefinition: {
                type: RE.RepeatType.DAILY.name,
                period: 12,
                offset: 10,
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
        result = await reminderManager1.asyncAddReminder(reminderA);
        reminderA.id = result.newReminderDataItem.id;

        const reminderB = {
            repeatDefinition: {
                type: RE.RepeatType.MONTHLY.name,
                period: 12,
                offset: { 
                    type: RE.MonthOffsetType.NTH_DAY.name,
                    offset: 1,
                },
                startYMDDate: '2010-01-10',
            },
            description: 'Good-bye',
            transactionTemplate: {
                splits: [
                    { accountId: 1, },
                    { accountId: 2, },
                ]
            },
            isEnabled: true,
            lastAppliedDate: '2015-01-21',    
        };
        result = await reminderManager1.asyncAddReminder(reminderB);
        reminderB.id = result.newReminderDataItem.id;


        await file1.asyncWriteFile();
        expect(file1.isModified()).toBeFalsy();

        await file1.asyncCloseFile();


        const file2 = await factory.asyncOpenFile(pathName1);
        expect(file2.isModified()).toBeFalsy();

        const accountingSystem2 = file2.getAccountingSystem();
        const accountManager2 = accountingSystem2.getAccountManager();

        expect(accountManager2.getAccountDataItemWithId(sys.checkingId))
            .toEqual(checking);
        expect(accountManager2.getAccountDataItemWithId(sys.brokerageAId))
            .toEqual(brokerageA);
        expect(accountManager2.getAccountDataItemWithId(sys.aaplBrokerageAId))
            .toEqual(aaplBrokerageA);

        expect(accountManager2.getAccountDataItemWithId(sys.autoLoanId))
            .toEqual(autoLoan);

        expect(accountManager2.getAccountDataItemWithId(sys.salaryId))
            .toEqual(salary);

        expect(accountManager2.getAccountDataItemWithId(sys.groceriesId))
            .toEqual(groceries);
        expect(accountManager2.getAccountDataItemWithId(sys.federalTaxesId))
            .toEqual(federalTaxes);

        const pricedItemManager2 = accountingSystem2.getPricedItemManager();
        expect(pricedItemManager2.getPricedItemDataItemWithId(sys.aaplPricedItemId))
            .toEqual(aaplPricedItem);
        expect(pricedItemManager2.getPricedItemDataItemWithId(sys.housePricedItemId))
            .toEqual(housePricedItem);

        expect(accountManager2.getAccountDataItemWithId(newAccountA.id))
            .toEqual(newAccountA);
        await accountManager2.asyncRemoveAccount(newAccountA.id);
        expect(accountManager2.getAccountDataItemWithId(newAccountA.id))
            .toBeUndefined();

        expect(pricedItemManager2.getPricedItemDataItemWithId(newPricedItemA.id))
            .toEqual(newPricedItemA);
        await pricedItemManager2.asyncRemovePricedItem(newPricedItemA.id);
        expect(pricedItemManager2.getPricedItemDataItemWithId(newPricedItemA.id))
            .toBeUndefined();
        
        
        const reminderManager2 = accountingSystem2.getReminderManager();
        expect(reminderManager2.getReminderDataItemWithId(reminderA.id))
            .toEqual(reminderA);
        expect(reminderManager2.getReminderDataItemWithId(reminderB.id))
            .toEqual(reminderB);
        await reminderManager2.asyncRemoveReminder(reminderA.id);
        expect(reminderManager2.getReminderDataItemWithId(reminderA.id))
            .toBeUndefined();
        

        expect(file2.isModified()).toBeTruthy();

        await file2.asyncWriteFile();
        expect(file2.isModified()).toBeFalsy();
        
        await file2.asyncCloseFile();


        //
        // Read back in modified file...
        const file3 = await factory.asyncOpenFile(pathName1);
        const accountingSystem3 = file3.getAccountingSystem();
        const accountManager3 = accountingSystem3.getAccountManager();
        expect(accountManager3.getAccountDataItemWithId(newAccountA.id))
            .toBeUndefined();

        const pricedItemManager3 = accountingSystem3.getPricedItemManager();
        expect(pricedItemManager3.getPricedItemDataItemWithId(newPricedItemA.id))
            .toBeUndefined();
        
        const reminderManager3 = accountingSystem3.getReminderManager();
        expect(reminderManager3.getReminderDataItemWithId(reminderA.id))
            .toBeUndefined();
        expect(reminderManager3.getReminderDataItemWithId(reminderB.id))
            .toEqual(reminderB);

        await file3.asyncCloseFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }
});


//
//---------------------------------------------------------
//
test('JSONGzipAccountingFile-transactions', async () => {
    const baseDir = await createDir('JSONGzipAccountingFile-transactions');

    try {
        await cleanupDir(baseDir, true);

        const factory = new JSONGzipAccountingFileFactory();
        
        const pathName1 = path.join(baseDir, 'test1');
        const file1 = await factory.asyncCreateFile(pathName1);
        const accountingSystem1 = file1.getAccountingSystem();

        expect(file1.isModified()).toBeFalsy();

        const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem1);
        await ASTH.asyncAddBasicTransactions(sys);

        expect(file1.isModified()).toBeTruthy();

        const transactionManager1 = accountingSystem1.getTransactionManager();

        const [ checkingYMDDateFirst1, checkingYMDDateLast1 ] 
            = await transactionManager1.asyncGetTransactionDateRange(sys.checkingId);
        const checkingTransactionDataItems1 
            = await transactionManager1.asyncGetTransactionDataItemsInDateRange(
                checkingYMDDateFirst1, checkingYMDDateLast1);

        const checkingAccountState1 
            = transactionManager1.getCurrentAccountStateDataItem(sys.checkingId);

        const [ aaplIRAYMDDateFirst1, aaplIRAYMDDateLast1 ] 
            = await transactionManager1.asyncGetTransactionDateRange(sys.aaplIRAId);
        const aaplIRATransactionDataItems1 
            = await transactionManager1.asyncGetTransactionDataItemsInDateRange(
                aaplIRAYMDDateFirst1, aaplIRAYMDDateLast1);

        const aaplIRAAccountStates1 = [];
        for (let i = 0; i < aaplIRATransactionDataItems1.length; ++i) {
            aaplIRAAccountStates1.push(
                await transactionManager1.asyncGetAccountStateDataItemsAfterTransaction(
                    sys.aaplIRAId, aaplIRATransactionDataItems1[i]));
        }

        const priceManager1 = accountingSystem1.getPriceManager();
        const aaplPrices1 = await priceManager1.asyncGetPriceDataItemsInDateRange(
            sys.aaplPricedItemId, '2005-02-28', '2014-12-31');
        const msftPrices1 = await priceManager1.asyncGetPriceDataItemsInDateRange(
            sys.msftPricedItemId, '2014-12-31', '2014-01-01');
        
        await file1.asyncWriteFile();
        expect(file1.isModified()).toBeFalsy();

        await file1.asyncCloseFile();


        //
        // Read back in...
        //
        const file2 = await factory.asyncOpenFile(pathName1);
        expect(file2.isModified()).toBeFalsy();

        const accountingSystem2 = file2.getAccountingSystem();
        const transactionManager2 = accountingSystem2.getTransactionManager();

        const [ checkingYMDDateFirst2, checkingYMDDateLast2 ] 
            = await transactionManager2.asyncGetTransactionDateRange(sys.checkingId);
        expect(checkingYMDDateFirst2).toEqual(checkingYMDDateFirst1);
        expect(checkingYMDDateLast2).toEqual(checkingYMDDateLast1);

        const checkingTransactionDataItems2 
            = await transactionManager2.asyncGetTransactionDataItemsInDateRange(
                checkingYMDDateFirst2, checkingYMDDateLast2);
        expect(checkingTransactionDataItems2).toEqual(checkingTransactionDataItems1);

        const checkingAccountState2 = transactionManager2.getCurrentAccountStateDataItem(
            sys.checkingId);
        expect(checkingAccountState2).toEqual(checkingAccountState1);

        const [ aaplIRAYMDDateFirst2, aaplIRAYMDDateLast2 ] 
            = await transactionManager2.asyncGetTransactionDateRange(sys.aaplIRAId);
        const aaplIRATransactionDataItems2 
            = await transactionManager2.asyncGetTransactionDataItemsInDateRange(
                aaplIRAYMDDateFirst2, aaplIRAYMDDateLast2);

        const aaplIRAAccountStates2 = [];
        for (let i = 0; i < aaplIRATransactionDataItems2.length; ++i) {
            aaplIRAAccountStates2.push(
                await transactionManager2.asyncGetAccountStateDataItemsAfterTransaction(
                    sys.aaplIRAId, aaplIRATransactionDataItems2[i]));
        }
        expect(aaplIRAAccountStates2).toEqual(aaplIRAAccountStates1);


        const priceManager2 = accountingSystem2.getPriceManager();
        const aaplPrices2 = await priceManager2.asyncGetPriceDataItemsInDateRange(
            sys.aaplPricedItemId, '2005-02-28', '2014-12-31');
        expect(aaplPrices2).toEqual(aaplPrices1);

        const msftPrices2 = await priceManager2.asyncGetPriceDataItemsInDateRange(
            sys.msftPricedItemId, '2014-12-31', '2014-01-01');
        expect(msftPrices2).toEqual(msftPrices1);
        
        expect(file2.isModified()).toBeFalsy();
        
        await file2.asyncCloseFile();


    }
    finally {
        // await cleanupDir(baseDir);
    }
});


//
//---------------------------------------------------------
//
test('JSONGzipAccountingFile-history', async () => {
    const baseDir = await createDir('JSONGzipAccountingFile-history');

    try {
        await cleanupDir(baseDir, true);

        const factory = new JSONGzipAccountingFileFactory({ isTest: true, });
        
        const pathName1 = path.join(baseDir, 'test1');
        const file1 = await factory.asyncCreateFile(pathName1);
        const accountingSystem1 = file1.getAccountingSystem();

        expect(file1.isModified()).toBeFalsy();

        const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem1);
        await ASTH.asyncAddBasicTransactions(sys);

        expect(file1.isModified()).toBeTruthy();


        const pricedItemManager1 = accountingSystem1.getPricedItemManager();
        const aaplPricedItem1 = pricedItemManager1.getPricedItemDataItemWithId(
            sys.aaplPricedItemId);
        const lotQuantityDefinition = getQuantityDefinition(
            aaplPricedItem1.quantityDefinition);
        const priceQuantityDefinition = pricedItemManager1
            .getBaseCurrency().getQuantityDefinition();
    
        const actionManager1 = accountingSystem1.getActionManager();
        const accountingActions1 = accountingSystem1.getAccountingActions();

        let lastResult;
        accountingActions1.on('addTransactions', (action, result) => {
            lastResult = result;
        });
        accountingActions1.on('addLot', (action, result) => {
            lastResult = result;
        });

        const transactionManager1 = accountingSystem1.getTransactionManager();
        const priceManager1 = accountingSystem1.getPriceManager();

        // Index 0
        const actionA1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2010-01-05',
            splits: [
                { accountId: sys.checkingId, quantityBaseValue: -10000, },
                { accountId: sys.cashId, quantityBaseValue: 10000, },
            ]
        });
        await actionManager1.asyncApplyAction(actionA1);
        const transAId = lastResult.newTransactionDataItem.id;
        const checkingStateA1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.checkingId);
        const cashStateA1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.cashId);
            

        // Index 1
        const actionB1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2010-01-05',
            splits: [
                { accountId: sys.groceriesId, quantityBaseValue: 1000, },
                { accountId: sys.cashId, quantityBaseValue: -1000, },
            ]
        });
        await actionManager1.asyncApplyAction(actionB1);
        const transBId = lastResult.newTransactionDataItem.id;
        const cashStateB1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.cashId);
            

        // Index 2
        const actionC1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2010-01-10',
            splits: [
                { accountId: sys.entertainmentId, quantityBaseValue: 3000, },
                { accountId: sys.cashId, quantityBaseValue: -3000, },
            ]
        });
        await actionManager1.asyncApplyAction(actionC1);
        const transCId = lastResult.newTransactionDataItem.id;
        const cashStateC1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.cashId);
        

        // Index 3
        const actionD1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2010-01-15',
            splits: [
                { accountId: sys.phoneId, quantityBaseValue: 4000, },
                { accountId: sys.cashId, quantityBaseValue: -4000, },
            ]
        });
        await actionManager1.asyncApplyAction(actionD1);
        const transDId = lastResult.newTransactionDataItem.id;
        const cashStateD1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.cashId);
        const phoneStateD1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.phoneId);
            

        // Index 4
        const actionE1 = accountingActions1.createAddLotAction({
            pricedItemId: sys.aaplPricedItemId,
            description: 'lot actionE1',
            lotOriginType: L.LotOriginType.CASH_PURCHASE,
        });
        await actionManager1.asyncApplyAction(actionE1);
        const aaplLotEId = lastResult.newLotDataItem.id;


        // Index 5
        const aaplPriceF1 = { close: 200 };
        const aaplQuantityF1 = 100;
        const aaplCostBasisF1 = aaplQuantityF1 * aaplPriceF1.close;
        const aaplQuantityBaseValueF1 
            = lotQuantityDefinition.numberToBaseValue(aaplQuantityF1);
        const aaplCostBasisBaseValueF1 
            = priceQuantityDefinition.numberToBaseValue(aaplCostBasisF1);
        const aaplLotChangeF1 = { lotId: aaplLotEId, 
            quantityBaseValue: aaplQuantityBaseValueF1, 
            costBasisBaseValue: aaplCostBasisBaseValueF1, 
        };
        const actionF1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2010-02-01',
            splits: [
                { accountId: sys.brokerageAId, 
                    quantityBaseValue: -aaplCostBasisBaseValueF1, 
                },
                { 
                    accountId: sys.aaplBrokerageAId, 
                    quantityBaseValue: aaplCostBasisBaseValueF1, 
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [ aaplLotChangeF1 ],
                },
            ]
        });
        await actionManager1.asyncApplyAction(actionF1);
        const transFId = lastResult.newTransactionDataItem.id;
        const aaplBrokerageAStateF1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.aaplBrokerageAId);
        const brokerageAStateF1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.brokerageAId);
    

        // Index 6
        const aaplPriceG1 = { close: 300, };
        const aaplQuantityG1 = -10;
        const aaplCostBasisG1 = aaplQuantityG1 * aaplPriceG1.close;
        const aaplQuantityBaseValueG1 = lotQuantityDefinition.numberToBaseValue(
            aaplQuantityG1);
        const aaplCostBasisBaseValueG1 = priceQuantityDefinition.numberToBaseValue(
            aaplCostBasisG1);
        const aaplLotChangeG1 = { lotId: aaplLotEId, 
            quantityBaseValue: aaplQuantityBaseValueG1, 
            costBasisBaseValue: aaplCostBasisBaseValueG1, 
        };
        const actionG1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2019-01-10',
            splits: [
                { accountId: sys.brokerageAId, 
                    quantityBaseValue: aaplCostBasisBaseValueG1, 
                },
                { 
                    accountId: sys.aaplBrokerageAId, 
                    quantityBaseValue: aaplCostBasisBaseValueG1,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [ aaplLotChangeG1 ],
                },
                
            ]
        });
        const transGId = lastResult.newTransactionDataItem.id;
        const aaplBrokerageAStateG1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.aaplBrokerageAId);
        const brokerageAStateG1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.brokerageAId);
        

        // Index 7
        const actionH1 = accountingActions1.createAddTransactionsAction({
            ymdDate: '2019-01-15',
            splits: [
                { accountId: sys.brokerageAId, quantityBaseValue: -300000, },
                { accountId: sys.checkingId, quantityBaseValue: 300000, },
            ]
        });
        await actionManager1.asyncApplyAction(actionH1);
        const transHId = lastResult.newTransactionDataItem.id;
        const brokerageAStateH1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.brokerageAId);
        const checkingStateH1 = transactionManager1.getCurrentAccountStateDataItem(
            sys.checkingAId);
        
        const appliedActionsCount1 = actionManager1.getAppliedActionCount();
        const undoneActionCount1 = actionManager1.getUndoneActionCount();

        
        await actionManager1.asyncUndoLastAppliedAction();

        expect(transactionManager1.getCurrentAccountStateDataItem(
            sys.aaplBrokerageAId)).toEqual(aaplBrokerageAStateG1);
        expect(transactionManager1.getCurrentAccountStateDataItem(
            sys.brokerageAId)).toEqual(brokerageAStateG1);

        await actionManager1.asyncReapplyLastUndoneAction();


        await file1.asyncWriteFile();
        expect(file1.isModified()).toBeFalsy();

        await file1.asyncCloseFile();


        //
        // Read back in...
        //
        const file2 = await factory.asyncOpenFile(pathName1);
        expect(file2.isModified()).toBeFalsy();

        const accountingSystem2 = file2.getAccountingSystem();

        const actionManager2 = accountingSystem2.getActionManager();
        const accountingActions2 = accountingSystem2.getAccountingActions();
        const transactionManager2 = accountingSystem2.getTransactionManager();
        const lotManager2 = accountingSystem2.getLotManager();

        expect(actionManager2.getAppliedActionCount()).toEqual(appliedActionsCount1);
        expect(actionManager2.getUndoneActionCount()).toEqual(0);

        expect(transactionManager2.getCurrentAccountStateDataItem(
            sys.brokerageAId)).toEqual(brokerageAStateH1);
        
        expect(await transactionManager2.asyncGetTransactionDataItemWithId(transHId))
            .toBeDefined();
        
        await actionManager2.asyncUndoLastAppliedAction();

        expect(await transactionManager2.asyncGetTransactionDataItemWithId(transHId))
            .toBeUndefined();
        
        expect(transactionManager2.getCurrentAccountStateDataItem(
            sys.aaplBrokerageAId)).toEqual(aaplBrokerageAStateG1);
        expect(transactionManager2.getCurrentAccountStateDataItem(
            sys.brokerageAId)).toEqual(brokerageAStateG1);
        
        expect(lotManager2.getLotDataItemWithId(aaplLotEId)).toBeDefined();


        // Undo several actions.
        await actionManager2.asyncUndoLastAppliedAction(2);

        expect(await transactionManager2.getCurrentAccountStateDataItem(
            sys.cashId)).toEqual(cashStateD1);
        expect(await transactionManager2.getCurrentAccountStateDataItem(
            sys.phoneId)).toEqual(phoneStateD1);

        // The lot should be gone.
        expect(lotManager2.getLotDataItemWithId(aaplLotEId)).toBeUndefined();

        // And reapply them.
        await actionManager2.asyncReapplyLastUndoneActions(2);

        expect(transactionManager2.getCurrentAccountStateDataItem(
            sys.aaplBrokerageAId)).toEqual(aaplBrokerageAStateG1);
        expect(transactionManager2.getCurrentAccountStateDataItem(
            sys.brokerageAId)).toEqual(brokerageAStateG1);
        
        expect(lotManager2.getLotDataItemWithId(aaplLotEId)).toBeDefined();

        
        const appliedActionsCount2 = actionManager2.getAppliedActionCount();
        
        expect(file2.isModified()).toBeTruthy();


        await file2.asyncWriteFile();
        expect(file2.isModified()).toBeFalsy();
        
        await file2.asyncCloseFile();


        //
        // Read back in...
        const file3 = await factory.asyncOpenFile(pathName1);
        expect(file3.isModified()).toBeFalsy();

        const accountingSystem3 = file3.getAccountingSystem();

        const actionManager3 = accountingSystem3.getActionManager();
        const accountingActions3 = accountingSystem3.getAccountingActions();
        const transactionManager3 = accountingSystem3.getTransactionManager();
        const lotManager3 = accountingSystem3.getLotManager();

        expect(actionManager3.getAppliedActionCount()).toEqual(appliedActionsCount2);
        expect(actionManager3.getUndoneActionCount()).toEqual(0);


        // Back up 2 more actions -> F, E, D
        await actionManager3.asyncUndoLastAppliedAction(2);

        expect(await transactionManager3.getCurrentAccountStateDataItem(
            sys.cashId)).toEqual(cashStateD1);
        expect(await transactionManager3.getCurrentAccountStateDataItem(
            sys.phoneId)).toEqual(phoneStateD1);

        // The lot should be gone.
        expect(lotManager3.getLotDataItemWithId(aaplLotEId)).toBeUndefined();


        // Clear all applied actions.
        await actionManager3.asyncClearAppliedActions();
        await actionManager3.asyncClearUndoneActions();


        expect(file3.isModified()).toBeTruthy();
        
        await file3.asyncWriteFile();
        expect(file3.isModified()).toBeFalsy();

        await file3.asyncCloseFile();


        //
        // Finally make sure we're clean...
        const file4 = await factory.asyncOpenFile(pathName1);
        expect(file4.isModified()).toBeFalsy();

        const accountingSystem4 = file4.getAccountingSystem();

        const actionManager4 = accountingSystem4.getActionManager();
        const accountingActions4 = accountingSystem4.getAccountingActions();
        const transactionManager4 = accountingSystem4.getTransactionManager();
        const lotManager4 = accountingSystem4.getLotManager();

        expect(actionManager4.getAppliedActionCount()).toEqual(0);
        expect(actionManager4.getUndoneActionCount()).toEqual(0);

        expect(file4.isModified()).toBeFalsy();        
        await file4.asyncCloseFile();

    }
    finally {
        // await cleanupDir(baseDir);
    }
});
