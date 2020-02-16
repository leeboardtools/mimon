import * as T from './Transactions';
import * as LS from './LotStates';
import * as A from './Accounts';
import * as ASTH from './AccountingSystemTestHelpers';
import * as ACSTH from './AccountStateTestHelpers';
import { YMDDate } from '../util/YMDDate';
import { Ratio } from '../util/Ratios';

function testLotChangeDataItem(lotChange) {
    const dataItem = LS.getLotChangeDataItems(lotChange);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    for (let i = 0; i < json.length; ++i) {
        if (json[i] === null) {
            json[i] = undefined;
        }
        else {
            const array = json[i];
            for (let j = 0; j < array.length; ++j) {
                if (array[j] === null) {
                    array[j] = undefined;
                }
            }
        }
    }
    expect(json).toEqual(dataItem);

    const back = LS.getLotChanges(json);
    expect(back).toEqual(lotChange);

    expect(LS.getLotChanges(lotChange) === lotChange).toBeTruthy();
    expect(LS.getLotChangeDataItems(dataItem) === dataItem).toBeTruthy();

    expect(LS.getLotChanges(lotChange, true) !== lotChange).toBeTruthy();
    expect(LS.getLotChangeDataItems(dataItem, true) !== dataItem).toBeTruthy();
}



function testSplitsDataItem(splits) {
    const dataItem = T.getSplitDataItems(splits);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const back = T.getSplits(json);
    expect(back).toEqual(splits);

    expect(T.getSplits(splits) === splits).toBeTruthy();
    expect(T.getSplitDataItems(dataItem) === dataItem).toBeTruthy();

    expect(T.getSplits(splits, true) !== splits).toBeTruthy();
    expect(T.getSplitDataItems(dataItem, true) !== dataItem).toBeTruthy();
}


function testTransactionDataItems(transaction) {
    const dataItem = T.getTransactionDataItem(transaction);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const back = T.getTransaction(json);
    expect(back).toEqual(transaction);

    expect(T.getTransaction(transaction) === transaction).toBeTruthy();
    expect(T.getTransactionDataItem(dataItem) === dataItem).toBeTruthy();

    expect(T.getTransaction(transaction, true) !== transaction).toBeTruthy();
    expect(T.getTransactionDataItem(dataItem, true) !== dataItem).toBeTruthy();
}


//
//---------------------------------------------------------
//
test('Transaction-Data Items', () => {
    testLotChangeDataItem([
        [
            { lotId: 1, quantityBaseValue: 12345, costBasisBaseValue: 98765 },
        ],
    ]);
    testLotChangeDataItem([
        [
            { lotId: 2, quantityBaseValue: 12345, costBasisBaseValue: 98765 },
            { lotId: 3, quantityBaseValue: 98765, costBasisBaseValue: 44455 },
        ],
    ]);

    testSplitsDataItem([
        {
            reconcileState: T.ReconcileState.NOT_RECONCILED,
            accountId: 1,
            quantityBaseValue: 1234,
            description: 'Hello',
            memo: 'I am a memo'
        },
        {
            reconcileState: T.ReconcileState.PENDING,
            accountId: 1,
            quantityBaseValue: 1234,
            description: 'Hello',
            memo: 'I am a memo',
            currencyToUSDRatio: new Ratio(1234, 1),
            lotChanges: [
                { lotId: 123, quantityBaseValue: 12345, costBasisBaseValue: 98765, },
                { lotId: 33, quantityBaseValue: 444, isSplitMerge: true, },
            ],
        },
        {
            reconcileState: T.ReconcileState.RECONCILED,
            accountId: 10,
            quantityBaseValue: -1234,
            lotChanges: [
                { lotId: 123, quantityBaseValue: -12345, costBasisBaseValue: 98765, },
                { lotId: 33, quantityBaseValue: 444, isSplitMerge: true, },
            ],
        },
    ]);


    testTransactionDataItems({
        ymdDate: new YMDDate('2019-10-11'),
        splits: [
            {
                reconcileState: T.ReconcileState.NOT_RECONCILED,
                accountId: 1,
                quantityBaseValue: 1234,
                description: 'Hello',
                memo: 'I am a memo'
            },
            {
                reconcileState: T.ReconcileState.RECONCILED,
                accountId: 2,
                quantityBaseValue: -1234,
            },
        ],
        description: 'A description',
        memo: 'A memo',
    });


    testTransactionDataItems({
        ymdDate: new YMDDate('2019-10-11'),
        splits: [
            {
                reconcileState: T.ReconcileState.NOT_RECONCILED,
                accountId: 1,
                quantityBaseValue: 1234,
                description: 'Hello',
                memo: 'I am a memo'
            },
            {
                reconcileState: T.ReconcileState.RECONCILED,
                accountId: 2,
                quantityBaseValue: -1234,
            },
            {
                reconcileState: T.ReconcileState.PENDING,
                accountId: 10,
                quantityBaseValue: -1234,
                lotChanges: [
                    { lotId: 123, quantityBaseValue: 12345, costBasisBaseValue: 98765, },
                    { lotId: 33, quantityBaseValue: 444, isSplitMerge: true, },
                ],
            },
        ],
        description: 'A description',
        memo: 'A memo',
    });


    //
    // Test deepCopyTransaction()
    const settingsX = {
        ymdDate: new YMDDate('2019-10-11'),
        splits: [
            {
                reconcileState: T.ReconcileState.NOT_RECONCILED,
                accountId: 1,
                quantityBaseValue: 1234,
                description: 'Hello',
                memo: 'I am a memo'
            },
            {
                reconcileState: T.ReconcileState.RECONCILED,
                accountId: 2,
                currencyToUSDRatio: new Ratio(100, 200),
                quantityBaseValue: -1234,
            },
            {
                reconcileState: T.ReconcileState.PENDING,
                accountId: 10,
                quantityBaseValue: -1234,
                lotChanges: [
                    { lotId: 123, quantityBaseValue: 12345, costBasisBaseValue: 98765, },
                    { lotId: 33, quantityBaseValue: 444, isSplitMerge: true, },
                ],
            },
        ],
        description: 'A description',
        memo: 'A memo',
    };
    const settingsXDataItem = T.getTransactionDataItem(settingsX);
    const deepCopyDataItem = T.deepCopyTransaction(settingsXDataItem);
    expect(deepCopyDataItem).toEqual(settingsXDataItem);
    expect(deepCopyDataItem.splits).not.toBe(settingsXDataItem.splits);

    const testDataItemSplits2 = deepCopyDataItem.splits[2];
    const refDataItemSplits2 = settingsXDataItem.splits[2];
    expect(testDataItemSplits2.lotChanges).not.toBe(refDataItemSplits2.lotChanges);
    expect(testDataItemSplits2.lotChanges[0]).not.toBe(refDataItemSplits2.lotChanges[0]);

    const ref = T.getTransaction(settingsXDataItem);
    const deepCopy = T.deepCopyTransaction(ref);
    expect(deepCopy).toEqual(ref);
    expect(deepCopy.splits).not.toBe(ref.splits);

    const testSplits2 = deepCopy.splits[2];
    const refSplits2 = ref.splits[2];
    expect(testSplits2.lotChanges).not.toBe(refSplits2.lotChanges);
    expect(testSplits2.lotChanges[0]).not.toBe(refSplits2.lotChanges[0]);
});



//
//---------------------------------------------------------
//
test('TransactionHandlerImplBase', async () => {
    const handlerA = new T.InMemoryTransactionsHandler();

    expect(await handlerA.asyncGetTransactionDateRange()).toBeUndefined();
    expect(await handlerA.asyncGetTransactionDateRange(1)).toBeUndefined();
    expect(await handlerA.asyncGetTransactionDataItemsInDateRange(1, 
        new YMDDate('2018-01-01'), new YMDDate('2018-01-01'))).toEqual([]);

    let result;

    const transaction1 = {
        id: 1,
        ymdDate: '2018-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 11, 
                quantityBaseValue: 1000, 
            },
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 12, 
                quantityBaseValue: -1000, 
            },
        ]
    };
    const transaction2 = {
        id: 2,
        ymdDate: '2018-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 11, 
                quantityBaseValue: 1000, 
            },
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 13, 
                quantityBaseValue: -1000, 
            },
        ]
    };
    const transaction3 = {
        id: 3,
        ymdDate: '2018-12-31',
        splits: [
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 11, 
                quantityBaseValue: 2000, 
            },
            { reconcileState: 'RECONCILED', 
                accountId: 12, 
                quantityBaseValue: -2000, 
            },
        ]
    };
    const transaction4 = {
        id: 4,
        ymdDate: '2017-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 11, 
                quantityBaseValue: 3000, 
            },
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 12, 
                quantityBaseValue: -3000, 
            },
        ]
    };
    const transaction5 = {
        id: 5,
        ymdDate: '2017-12-31',
        splits: [
            { reconcileState: 'PENDING', 
                accountId: 12, 
                quantityBaseValue: 4000, 
            },
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 13, 
                quantityBaseValue: -4000, 
            },
        ]
    };

    result = await handlerA.asyncUpdateTransactionDataItems([
        [1, transaction1],
        [2, transaction2],
        [3, transaction3],
        [4, transaction4],
        [5, transaction5],
    ],
    undefined,
    {
        lastId: 123,
    });
    expect(result).toEqual(
        [ transaction1, transaction2, transaction3, transaction4, transaction5]);

    expect(await handlerA.asyncGetTransactionDateRange())
        .toEqual([new YMDDate('2017-01-01'), new YMDDate('2018-12-31')]);
    expect(await handlerA.asyncGetTransactionDateRange(13))
        .toEqual([new YMDDate('2017-12-31'), new YMDDate('2018-01-01')]);

    result = await handlerA.asyncGetTransactionDataItemsInDateRange(0, 
        new YMDDate('2017-12-31'), new YMDDate('2018-12-31'));
    expect(result).toEqual([
        transaction5,
        transaction1,
        transaction2,
        transaction3,
    ]);


    //
    // Change account id...
    const change3A = {
        id: 3,
        splits: [
            { reconcileState: 'NOT_RECONCILED', 
                accountId: 11, 
                quantityBaseValue: 2000, 
            },
            { reconcileState: 'RECONCILED', 
                accountId: 13, 
                quantityBaseValue: -2000, 
            },
        ]
    };
    const transaction3A = Object.assign({}, transaction3, change3A);
    result = await handlerA.asyncUpdateTransactionDataItems([
        [3, change3A],
    ]);
    expect(result).toEqual([ transaction3A ]);

    result = await handlerA.asyncGetTransactionDataItemsInDateRange(13, 
        new YMDDate('2018-01-01'), new YMDDate('2018-12-31'));
    expect(result).toEqual([transaction2, transaction3A]);


    //
    // Change date
    const change4A = {
        id: 4,
        ymdDate: '2017-07-04',
    };
    const transaction4A = Object.assign({}, transaction4, change4A);
    result = await handlerA.asyncUpdateTransactionDataItems([
        [4, change4A],
    ]);
    expect(result).toEqual([transaction4A]);

    expect(await handlerA.asyncGetTransactionDateRange()).toEqual(
        [new YMDDate('2017-07-04'), new YMDDate('2018-12-31')]);

    result = await handlerA.asyncGetTransactionDataItemsInDateRange(12, 
        new YMDDate('2017-01-01'), new YMDDate('2017-12-31'));
    expect(result).toEqual([transaction4A, transaction5]);


    //
    // Remove
    result = await handlerA.asyncUpdateTransactionDataItems([
        [1, ],
    ]);
    expect(result).toEqual([transaction1]);

    result = await handlerA.asyncGetTransactionDataItemsInDateRange(11, 
        new YMDDate('2018-01-01'), new YMDDate('2018-01-01'));
    expect(result).toEqual([transaction2]);


    //
    // JSON
    const handlerB = new T.InMemoryTransactionsHandler();
    const jsonString = JSON.stringify(handlerA.toJSON());
    const json = JSON.parse(jsonString);

    handlerB.fromJSON(json);

    expect(await handlerB.asyncGetTransactionDateRange()).toEqual(
        [new YMDDate('2017-07-04'), new YMDDate('2018-12-31')]);

    result = await handlerB.asyncGetTransactionDataItemsInDateRange(12, 
        new YMDDate('2017-01-01'), new YMDDate('2017-12-31'));
    expect(result).toEqual([transaction4A, transaction5]);

    result = await handlerB.asyncGetTransactionDataItemsInDateRange(11, 
        new YMDDate('2018-01-01'), new YMDDate('2018-01-01'));
    expect(result).toEqual([transaction2]);

    expect(handlerB.getIdGeneratorOptions()).toEqual({ lastId: 123, });
});


//
//---------------------------------------------------------
//
test('TransactionManager-validateSplits', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const manager = accountingSystem.getTransactionManager();

    expect(manager.validateSplits()).toBeInstanceOf(Error);
    expect(manager.validateSplits([])).toBeInstanceOf(Error);
    expect(manager.validateSplits([
        {
            accountId: 1,
            quantityBaseValue: 1,
        }
    ])).toBeInstanceOf(Error);


    expect(manager.validateSplits([
        { accountId: sys.cashId, quantityBaseValue: -1000, },
        { accountId: sys.groceriesId, quantityBaseValue: 1000, },
    ])).toBeUndefined();

    expect(manager.validateSplits([
        { accountId: sys.cashId, quantityBaseValue: -1000, },
        { accountId: sys.groceriesId, quantityBaseValue: 1001, },
    ])).toBeInstanceOf(Error);

    
    expect(manager.validateSplits([
        { accountId: sys.checkingId, quantityBaseValue: -100000, },
        { accountId: sys.brokerageAId, quantityBaseValue: 70000, },
        { accountId: sys.otherIncomeId, quantityBaseValue: -30000, },
    ])).toBeUndefined();


    //
    // Currency exchange.
    const accountManager = accountingSystem.getAccountManager();
    const pricedItemManager = accountingSystem.getPricedItemManager();
    const cadPricedItemDataItem 
        = (await pricedItemManager.asyncAddCurrencyPricedItem('CAD'))
            .newPricedItemDataItem;
    const cadCashAccountDataItem = (await accountManager.asyncAddAccount({
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.CASH,
        pricedItemId: cadPricedItemDataItem.id,
    })).newAccountDataItem;
    const jpyPricedItemDataItem 
        = (await pricedItemManager.asyncAddCurrencyPricedItem('JPY'))
            .newPricedItemDataItem;
    const jpyCashAccountDataItem = (await accountManager.asyncAddAccount({
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.CASH,
        pricedItemId: jpyPricedItemDataItem.id,
    })).newAccountDataItem;

    // Same currency, OK.
    expect(manager.validateSplits([
        { accountId: cadCashAccountDataItem.id, quantityBaseValue: -70000, },
        { accountId: cadCashAccountDataItem.id, quantityBaseValue: 70000, },
    ])).toBeUndefined();

    // Differing currencies, need prices.
    expect(manager.validateSplits([
        { accountId: cadCashAccountDataItem.id, quantityBaseValue: -70000, },
        { accountId: sys.cashId, quantityBaseValue: 70000, },
    ])).toBeInstanceOf(Error);

    // OK with prices
    expect(manager.validateSplits([
        { accountId: cadCashAccountDataItem.id, 
            quantityBaseValue: -1150000, 
            currencyToUSDRatio: new Ratio(115, 100)
        },
        { accountId: sys.cashId, quantityBaseValue: 1000000, },
    ])).toBeUndefined();

    // OK with prices
    expect(manager.validateSplits([
        { accountId: cadCashAccountDataItem.id, 
            quantityBaseValue: -1150000, 
            currencyToUSDRatio: new Ratio(115, 100),
        },
        { accountId: sys.cashId, 
            quantityBaseValue: 1000000 + 1000 * 2000 / 100, 
        },
        { accountId: jpyCashAccountDataItem.id, 
            quantityBaseValue: -1000, 
            currencyToUSDRatio: new Ratio(100, 2000),
        },
    ])).toBeUndefined();
});



//
//---------------------------------------------------------
//
test('TransactionManager-add_modify', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const manager = accountingSystem.getTransactionManager();

    const settingsA = {
        ymdDate: '2019-10-05',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 10000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: -10000, 
            },
        ]
    };
    const transactionA = (await manager.asyncAddTransactions(settingsA))
        .newTransactionDataItem;
    settingsA.id = transactionA.id;
    expect(transactionA).toEqual(settingsA);
    expect(await manager.asyncGetTransactionDataItemsInDateRange(0, '2019-10-05'))
        .toEqual([settingsA]);
    expect(await manager.asyncGetTransactionDataItemsInDateRange(0, '2019-10-04'))
        .toEqual([]);
    expect(await manager.asyncGetTransactionDataItemsInDateRange(0, '2019-10-06'))
        .toEqual([]);
    expect(await manager.asyncGetTransactionDataItemsInDateRange(sys.cashId, 
        '2019-10-05')).toEqual([settingsA]);
    expect(await manager.asyncGetTransactionDateRange(sys.cashId))
        .toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-05')]);
    expect(await manager.asyncGetTransactionDateRange(sys.checkingId))
        .toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-05')]);
    
    const cashNonReconciledIds = [settingsA.id];
    const checkingNonReconciledIds = [settingsA.id];
    expect(await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .toEqual(cashNonReconciledIds);
    expect(await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .toEqual(checkingNonReconciledIds);


    const settingsB = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.brokerageAId, 
                reconcileState: T.ReconcileState.RECONCILED.name, 
                quantityBaseValue: 1000000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -1000000, 
            },
        ]
    };

    let addEventArgs;
    manager.on('transactionsAdd', (arg) => addEventArgs = arg);

    let removeEventArg;
    manager.on('transactionsRemove', (arg) => removeEventArg = arg);

    let result;
    result = await manager.asyncAddTransactions([settingsB]);
    const newTransactionDataItemsB = result.newTransactionDataItems;
    const [ transactionB ] = newTransactionDataItemsB;
    settingsB.id = transactionB.id;
    //settingsC.id = transactionC.id;
    expect(transactionB).toEqual(settingsB);
    //expect(transactionC).toEqual(settingsC);

    const brokerageANonReconciledIds = [];
    checkingNonReconciledIds.push(settingsB.id);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.brokerageAId))
        .sort((a, b) => a - b))
        .toEqual(brokerageANonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);
    
    
    // transactionsAdd event test
    expect(addEventArgs).toEqual({ newTransactionDataItems: newTransactionDataItemsB });
    expect(addEventArgs.newTransactionDataItems).toBe(newTransactionDataItemsB);


    // test undo add.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(removeEventArg).toEqual({
        removedTransactionDataItems: newTransactionDataItemsB
    });

    expect(await manager.asyncGetTransactionDataItemsInDateRange(0, '2019-10-05'))
        .toEqual([settingsA]);
    expect(await manager.asyncGetTransactionDataItemWithId(transactionB.id))
        .toBeUndefined();

    await manager.asyncAddTransactions([settingsB]);
    expect(await manager.asyncGetTransactionDataItemWithId(transactionB.id))
        .toEqual(settingsB);


    const settingsD = {
        ymdDate: '2019-10-20',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 20000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: -20000, 
            },
        ]
    };
    const transactionD = (await manager.asyncAddTransactions(settingsD))
        .newTransactionDataItem;
    settingsD.id = transactionD.id;
    expect(transactionD).toEqual(settingsD);

    cashNonReconciledIds.push(settingsD.id);
    checkingNonReconciledIds.push(settingsD.id);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);

    
    const settingsE = {
        ymdDate: '2019-10-15',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 25000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: -25000, 
            },
        ]
    };

    // Check validate only.
    const validateE = (await manager.asyncAddTransactions(settingsE, true))
        .newTransactionDataItem;
    expect(validateE).toEqual(settingsE);
    expect(await manager.asyncGetTransactionDataItemsInDateRange(sys.checkingId, 
        '2019-10-15')).toEqual([]);

    await expect(manager.asyncAddTransactions({ splits: []})).rejects.toThrow();



    const transactionE = (await manager.asyncAddTransactions(settingsE))
        .newTransactionDataItem;
    settingsE.id = transactionE.id;
    expect(transactionE).toEqual(settingsE);

    expect(await manager.asyncGetTransactionDataItemsInDateRange(sys.checkingId, 
        '2019-10-15', '2019-10-20')).toEqual([
        transactionE,
        transactionD,
    ]);
    expect(await manager.asyncGetTransactionDateRange(sys.checkingId))
        .toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-20')]);


    cashNonReconciledIds.push(settingsE.id);
    checkingNonReconciledIds.push(settingsE.id);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);        


    const settingsF = Object.assign({}, settingsE);
    const transactionF = (await manager.asyncAddTransactions(settingsF))
        .newTransactionDataItem;
    settingsF.id = transactionF.id;
    expect(transactionF).toEqual(settingsF);

    const resultEF = await manager.asyncGetTransactionDataItemsInDateRange(
        sys.cashId, '2019-10-15');
    expect(resultEF).toEqual(expect.arrayContaining([settingsF, settingsE]));


    cashNonReconciledIds.push(settingsF.id);
    checkingNonReconciledIds.push(settingsF.id);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);
    
    
    const changesF1 = { id: settingsF.id, 
        description: 'This is description F1', 
        memo: 'This is memo F1', 
    };
    const settingsF1 = Object.assign({}, settingsF, changesF1);
    const transactionF1 = (await manager.asyncModifyTransactions(changesF1))
        .newTransactionDataItem;
    expect(transactionF1).toEqual(settingsF1);

    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);
    


    const changesD1 = {
        id: settingsD.id,
        ymdDate: '2019-04-05',
        splits: [
            { accountId: sys.brokerageAId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 50000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.RECONCILED.name, 
                quantityBaseValue: -50000, 
            },
        ]
    };
    const settingsD1 = Object.assign({}, settingsD, changesD1);

    let modifyEventArg;
    manager.on('transactionsModify', (arg) => modifyEventArg = arg);

    const changesE1 = {
        id: settingsE.id,
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.RECONCILED.name, 
                quantityBaseValue: 25000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -25000, 
            },
        ]
    };

    const settingsE1 = Object.assign({}, settingsE, changesE1);
    result = await manager.asyncModifyTransactions([changesD1, changesE1]);
    const resultDE1 = result.newTransactionDataItems;
    expect(resultDE1).toEqual(expect.arrayContaining([settingsD1, settingsE1]));

    expect(await manager.asyncGetTransactionDateRange(sys.checkingId))
        .toEqual([ new YMDDate('2019-04-05'), new YMDDate('2019-10-15')]);

    // transactionsModify event test
    expect(modifyEventArg).toEqual({ newTransactionDataItems: resultDE1, 
        oldTransactionDataItems: [ settingsD, settingsE ]}
    );
    expect(modifyEventArg.newTransactionDataItems).toBe(resultDE1);

    brokerageANonReconciledIds.push(settingsD.id);
    cashNonReconciledIds.splice(cashNonReconciledIds.indexOf(settingsD.id), 1);
    cashNonReconciledIds.splice(cashNonReconciledIds.indexOf(settingsE.id), 1);
    checkingNonReconciledIds.splice(checkingNonReconciledIds.indexOf(settingsD.id), 1);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);


    // Test undo modify
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(modifyEventArg).toEqual({ oldTransactionDataItems: resultDE1, 
        newTransactionDataItems: [ settingsD, settingsE ]}
    );

    expect(await manager.asyncGetTransactionDataItemWithId(settingsD1.id))
        .toEqual(settingsD);
    expect(await manager.asyncGetTransactionDataItemWithId(settingsE1.id))
        .toEqual(settingsE);

    // Restore.
    await manager.asyncModifyTransactions([changesD1, changesE1]);
    expect(await manager.asyncGetTransactionDataItemWithId(settingsD1.id))
        .toEqual(settingsD1);
    expect(await manager.asyncGetTransactionDataItemWithId(settingsE1.id))
        .toEqual(settingsE1);

    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);


    // Change validate:
    await expect(manager.asyncModifyTransactions({id: settingsD.id, splits: []}))
        .rejects.toThrow();

    const changesE2 = {
        id: settingsE.id,
        ymdDate: '2019-10-25',
    };
    const settingsE2 = Object.assign({}, settingsE1, changesE2);
    const resultE2 = (await manager.asyncModifyTransactions(changesE2, true))
        .newTransactionDataItem;
    expect(resultE2).toEqual(settingsE2);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsE.id))
        .toEqual(settingsE1);


    const settingsG = {
        ymdDate: '2019-10-20',
        description: 'This is settings G',
        splits: [
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 55000, 
            },
            { accountId: sys.salaryId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 100000, 
            },
            { accountId: sys.federalTaxesId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 20000, 
            },
            { accountId: sys.stateTaxesId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 10000, 
            },
            { accountId: sys.medicareTaxesId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 10000, 
            },
            { accountId: sys.healthInsuranceId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 5000, 
            },
        ],
    };
    const transactionG = (await manager.asyncAddTransactions(settingsG))
        .newTransactionDataItem;
    settingsG.id = transactionG.id;
    expect(transactionG).toEqual(settingsG);

    expect(await manager.asyncGetTransactionDateRange(sys.checkingId))
        .toEqual([ new YMDDate('2019-04-05'), new YMDDate('2019-10-20')]);
});


//
//---------------------------------------------------------
//
test('TransactionManager~remove', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const manager = accountingSystem.getTransactionManager();


    let result;

    const settingsA = {
        ymdDate: '2019-10-05',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 10000, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: -10000, 
            },
        ]
    };
    const settingsB = {
        ymdDate: '2019-10-15',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.RECONCILED.name, 
                quantityBaseValue: -1000, 
            },
            { accountId: sys.groceriesId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: 1000, 
            },
        ]
    };
    const settingsC = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.RECONCILED.name, 
                quantityBaseValue: -2000, 
            },
            { accountId: sys.householdId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: 2000, 
            },
        ]
    };
    const settingsD = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -3000, 
            },
            { accountId: sys.householdId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: 3000, 
            },
        ]
    };
    const settingsE = {
        ymdDate: '2019-10-05',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -4000, 
            },
            { accountId: sys.miscId, 
                reconcileState: T.ReconcileState.PENDING.name, 
                quantityBaseValue: 4000, 
            },
        ]
    };
    const resultABCDE = (await manager.asyncAddTransactions([settingsA, 
        settingsB, settingsC, settingsD, settingsE ])).newTransactionDataItems;
    settingsA.id = resultABCDE[0].id;
    settingsB.id = resultABCDE[1].id;
    settingsC.id = resultABCDE[2].id;
    settingsD.id = resultABCDE[3].id;
    settingsE.id = resultABCDE[4].id;
    expect(resultABCDE).toEqual(
        [settingsA, settingsB, settingsC, settingsD, settingsE ]);

    const cashNonReconciledIds = [settingsA.id, settingsD.id, settingsE.id];
    const checkingNonReconciledIds = [settingsA.id];
    const householdNonReconciledIds = [settingsC.id, settingsD.id];
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.householdId))
        .sort((a, b) => a - b))
        .toEqual(householdNonReconciledIds);


    
    await expect(manager.asyncRemoveTransactions(-123)).rejects.toThrow();
    expect(await manager.asyncGetTransactionDateRange(sys.householdId))
        .toEqual([new YMDDate(settingsD.ymdDate), new YMDDate(settingsD.ymdDate)]);

    result = await manager.asyncRemoveTransactions(settingsD.id);
    const removeD = result.removedTransactionDataItem;
    expect(removeD).toEqual(settingsD);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsD.id))
        .toBeUndefined();

    cashNonReconciledIds.splice(cashNonReconciledIds.indexOf(settingsD.id), 1);
    householdNonReconciledIds.splice(householdNonReconciledIds.indexOf(settingsD.id), 1);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.cashId))
        .sort((a, b) => a - b))
        .toEqual(cashNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.checkingId))
        .sort((a, b) => a - b))
        .toEqual(checkingNonReconciledIds);
    expect((await manager.asyncGetNonReconciledIdsForAccountId(sys.householdId))
        .sort((a, b) => a - b))
        .toEqual(householdNonReconciledIds);

    
    let removeEventArg;
    manager.on('transactionsRemove', (arg) => removeEventArg = arg);

    let addEventArgs;
    manager.on('transactionsAdd', (arg) => addEventArgs = arg);

        
    // Test undo remove.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(addEventArgs).toEqual({ 
        newTransactionDataItems: [removeD]
    });

    expect(resultABCDE).toEqual(
        [settingsA, settingsB, settingsC, settingsD, settingsE ]);


    // Redo
    await manager.asyncRemoveTransactions(settingsD.id);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsD.id))
        .toBeUndefined();


    const removedAE = (await manager.asyncRemoveTransactions([settingsA.id, 
        settingsE.id])).removedTransactionDataItems;
    expect(removedAE).toEqual([settingsA, settingsE]);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsA.id))
        .toBeUndefined();
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsE.id))
        .toBeUndefined();

    // transactionsRemove event test
    expect(removeEventArg).toEqual({ removedTransactionDataItems: removedAE });
    expect(removeEventArg.removedTransactionDataItems).toBe(removedAE);

    expect(await manager.asyncGetTransactionDateRange(sys.cashId))
        .toEqual([new YMDDate(settingsC.ymdDate), new YMDDate(settingsB.ymdDate)]);
    expect(await manager.asyncGetTransactionDateRange(sys.groceriesId))
        .toEqual([new YMDDate(settingsB.ymdDate), new YMDDate(settingsB.ymdDate)]);


    const addedAE = (await manager.asyncAddTransactions(removedAE))
        .newTransactionDataItems;
    settingsA.id = addedAE[0].id;
    settingsE.id = addedAE[1].id;
    expect(addedAE).toEqual([settingsA, settingsE]);
});


//
//---------------------------------------------------------
//
test('Transactions-openingBalances', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    await ASTH.asyncAddOpeningBalances(sys);

    const { accountingSystem, initialYMDDate } = sys;
    const manager = accountingSystem.getTransactionManager();

    expect(manager.getCurrentAccountStateDataItem(sys.checkingId)).toEqual(
        { ymdDate: initialYMDDate, 
            quantityBaseValue: sys.checkingOBQuantityBaseValue, 
        });

    expect(manager.getCurrentAccountStateDataItem(sys.cashId)).toEqual(
        { ymdDate: initialYMDDate, 
            quantityBaseValue: sys.cashOBQuantityBaseValue, 
        });
});


//
//---------------------------------------------------------
//
test('Transactions-accountStateUpdates', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    await ASTH.asyncAddOpeningBalances(sys);

    const { accountingSystem, initialYMDDate } = sys;
    const transactionManager = accountingSystem.getTransactionManager();

    const settingsA = { 
        ymdDate: '2010-01-01', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -100, 
            },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 100, 
            },
        ]};
    const checkingQuantityBaseValueA 
        = sys.checkingOBQuantityBaseValue + settingsA.splits[0].quantityBaseValue;

    const settingsB = { 
        ymdDate: '2010-01-05', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -200, 
            },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 200, 
            },
        ]};
    const checkingQuantityBaseValueB 
        = checkingQuantityBaseValueA + settingsB.splits[0].quantityBaseValue;

    const settingsC = { 
        ymdDate: '2010-01-10', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -300, },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 300, 
            },
        ]};
    const checkingQuantityBaseValueC 
        = checkingQuantityBaseValueB + settingsC.splits[0].quantityBaseValue;

    const settingsD = { 
        ymdDate: '2010-01-15', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -400, 
            },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 400, 
            },
        ]};
    const checkingQuantityBaseValueD 
        = checkingQuantityBaseValueC + settingsD.splits[0].quantityBaseValue;

    const [transA, transB, transC, transD] 
        = (await transactionManager.asyncAddTransaction(
            [settingsA, settingsB, settingsC, settingsD])).newTransactionDataItems;

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, 
            quantityBaseValue: checkingQuantityBaseValueD 
        }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsC.ymdDate, quantityBaseValue: checkingQuantityBaseValueC }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsC.ymdDate, quantityBaseValue: checkingQuantityBaseValueC }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueB }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueB }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: initialYMDDate, 
            quantityBaseValue: sys.checkingOBQuantityBaseValue 
        }]);
    

    //  a: '2010-01-01', -100
    //  b: '2010-01-05', -200
    //  c: '2010-01-10', -300
    //  d: '2010-01-15', -400

    // Move C before B
    const ymdDateCa = '2010-01-04';
    (await transactionManager.asyncModifyTransaction(
        { id: transC.id, ymdDate: ymdDateCa})).newTransactionDataItem;
    const checkingQuantityBaseValueCa 
        = checkingQuantityBaseValueA + settingsC.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueBa 
        = checkingQuantityBaseValueCa + settingsB.splits[0].quantityBaseValue;

    //  a: '2010-01-01', -100,  99900
    //  c: '2010-01-04', -300,  99600
    //  b: '2010-01-05', -200,  99400
    //  d: '2010-01-15', -400,  99000

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, quantityBaseValue: checkingQuantityBaseValueD }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueBa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueBa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: ymdDateCa, quantityBaseValue: checkingQuantityBaseValueCa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: ymdDateCa, quantityBaseValue: checkingQuantityBaseValueCa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: initialYMDDate, 
            quantityBaseValue: sys.checkingOBQuantityBaseValue 
        }]);



    // Test multiple splits to the same account...
    const settingsE = { 
        ymdDate: '2010-01-20', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -500, 
            },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 1100, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -600, 
            },
        ]};
    const checkingQuantityBaseValueE0 
        = checkingQuantityBaseValueD + settingsE.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueE1 
        = checkingQuantityBaseValueE0 + settingsE.splits[2].quantityBaseValue;

    const settingsF = { 
        ymdDate: '2010-01-25', 
        splits: [ 
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -200, 
            },
            { accountId: sys.checkingId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 100, 
            },
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 100, 
            },
        ]};
    const checkingQuantityBaseValueF0 
        = checkingQuantityBaseValueE1 + settingsF.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueF1 
        = checkingQuantityBaseValueF0 + settingsF.splits[1].quantityBaseValue;

    const [transE, transF] = (await transactionManager.asyncAddTransaction(
        [settingsE, settingsF])).newTransactionDataItems;

    //  a: '2010-01-01', -100,  99900
    //  c: '2010-01-04', -300,  99600
    //  b: '2010-01-05', -200,  99400
    //  d: '2010-01-15', -400,  99000
    //  e[0]: '2010-01-20', -500,
    //  e[2]: '2010-01-29', -600,
    //  f[0]: '2010-01-20', -200
    //  f[1]: '2010-01-20', 100
    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transE.id)).toEqual(
        [{ ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE0 },
            { ymdDate: settingsE.ymdDate, 
                quantityBaseValue: checkingQuantityBaseValueE1 
            }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transE.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, quantityBaseValue: checkingQuantityBaseValueD },
            { ymdDate: settingsE.ymdDate, 
                quantityBaseValue: checkingQuantityBaseValueE0 
            }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        sys.checkingId, transF.id)).toEqual(
        [{ ymdDate: settingsF.ymdDate, quantityBaseValue: checkingQuantityBaseValueF0 },
            { ymdDate: settingsF.ymdDate, 
                quantityBaseValue: checkingQuantityBaseValueF1 
            }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
        sys.checkingId, transF.id)).toEqual(
        [{ ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE1 },
            { ymdDate: settingsF.ymdDate, 
                quantityBaseValue: checkingQuantityBaseValueF0 
            }]);

});


//
//---------------------------------------------------------
//
test('Transactions-lotTransactions', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();

    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();
    const lotManager = accountingSystem.getLotManager();

    const brokerageId = sys.brokerageAId;
    const aaplId = sys.aaplBrokerageAId;
    const { aaplPricedItemId } = sys;

    expect(transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { quantityBaseValue: 0, lotStates: [] });


    let result;
    
    const lot1 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 1'})).newLotDataItem;
    const changeA = { lotId: lot1.id, 
        quantityBaseValue: 10000, 
        costBasisBaseValue: 200000, 
    };

    const settingsA = {
        ymdDate: '2010-05-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeA.costBasisBaseValue, 
            },
            { accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeA.costBasisBaseValue, 
                lotChanges: [ changeA ]
            },
        ]
    };
    const lot1StateA = { lotId: lot1.id, 
        quantityBaseValue: changeA.quantityBaseValue, 
        costBasisBaseValue: changeA.costBasisBaseValue 
    };
    const aaplStateA = { ymdDate: settingsA.ymdDate, 
        quantityBaseValue: lot1StateA.quantityBaseValue, 
        lotStates: [lot1StateA]
    };

    const transA = (await transactionManager.asyncAddTransaction(settingsA))
        .newTransactionDataItem;
    settingsA.id = transA.id;
    expect(transA).toEqual(settingsA);

    expect(ACSTH.cleanAccountState(transactionManager.getCurrentAccountStateDataItem(
        aaplId))).toEqual(aaplStateA);


    //
    // Multiple lots in single split.
    const lot2 = (await lotManager.asyncAddLot({ pricedItemId: aaplPricedItemId, 
        description: 'Lot 2'})).newLotDataItem;
    const lot3 = (await lotManager.asyncAddLot({ pricedItemId: aaplPricedItemId, 
        description: 'Lot 3'})).newLotDataItem;
    const changeB1 = { lotId: lot2.id, 
        quantityBaseValue: 20000, 
        costBasisBaseValue: 60 * 20000,
    };
    const changeB2 = { lotId: lot3.id, 
        quantityBaseValue: 30000, 
        costBasisBaseValue: 50 * 30000,
    };
    const settingsB = {
        ymdDate: '2010-06-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -(changeB1.costBasisBaseValue 
                    + changeB2.costBasisBaseValue), },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeB1.costBasisBaseValue 
                    + changeB2.costBasisBaseValue, 
                lotChanges: [ changeB1, changeB2 ],
            },
        ],
    };

    const lot1StateB = lot1StateA;
    const lot2StateB = { lotId: lot2.id, 
        quantityBaseValue: changeB1.quantityBaseValue, 
        costBasisBaseValue: changeB1.costBasisBaseValue, 
    };
    const lot3StateB = { lotId: lot3.id, 
        quantityBaseValue: changeB2.quantityBaseValue, 
        costBasisBaseValue: changeB2.costBasisBaseValue, 
    };

    const aaplStateB = { 
        ymdDate: settingsB.ymdDate, 
        quantityBaseValue: lot1StateB.quantityBaseValue 
            + lot2StateB.quantityBaseValue + lot3StateB.quantityBaseValue, 
        lotStates: [ lot1StateB, lot2StateB, lot3StateB, ],
    };


    const lot4 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 4'})).newLotDataItem;
    const changeC = { lotId: lot4.id, 
        quantityBaseValue: 40000, 
        costBasisBaseValue: 40 * 40000,
    };
    const settingsC = {
        ymdDate: '2010-06-20',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeC.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeC.costBasisBaseValue, 
                lotChanges: [ changeC ],
            },
        ]
    };

    const lot1StateC = lot1StateB;
    const lot2StateC = lot2StateB;
    const lot3StateC = lot3StateB;
    const lot4StateC = { lotId: lot4.id, 
        quantityBaseValue: changeC.quantityBaseValue, 
        costBasisBaseValue: changeC.costBasisBaseValue, 
    };
    
    const aaplStateC = { 
        ymdDate: settingsC.ymdDate, 
        quantityBaseValue: lot1StateC.quantityBaseValue 
            + lot2StateC.quantityBaseValue 
            + lot3StateC.quantityBaseValue 
            + lot4StateC.quantityBaseValue,
        lotStates: [ lot1StateC, lot2StateC, lot3StateC, lot4StateC, ],
    };

    result = await transactionManager.asyncAddTransactions([settingsB, settingsC]);
    const [transB, transC] = result.newTransactionDataItems;
    settingsB.id = transB.id;
    settingsC.id = transC.id;
    expect(transB).toEqual(settingsB);
    expect(transC).toEqual(settingsC);

    expect(ACSTH.cleanAccountState(transactionManager.getCurrentAccountStateDataItem(
        aaplId))).toEqual(aaplStateC);

    const [ accountStateBTransB ] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transB.id);
    expect(ACSTH.cleanAccountState(accountStateBTransB)).toEqual(aaplStateB);


    // Test mutliple add transaction undo.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(ACSTH.cleanAccountState(transactionManager
        .getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateA);

    await transactionManager.asyncAddTransactions([settingsB, settingsC]);
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateC);

    let trans;
    let accountState;
    [ accountState ] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transB.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateB);


    const lot5 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 4'})).newLotDataItem;
    const changeD = { lotId: lot5.id, 
        quantityBaseValue: 50000, 
        costBasisBaseValue: 30 * 50000,
    };
    const settingsD = {
        ymdDate: '2010-06-05',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeD.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeD.costBasisBaseValue, 
                lotChanges: [ changeD ],
            },
        ]
    };

    const lot1StateD = lot1StateC;
    const lot2StateD = lot2StateC;
    const lot3StateD = lot3StateC;
    const lot4StateD = lot4StateC;
    const lot5StateD = { lotId: lot5.id, 
        quantityBaseValue: changeD.quantityBaseValue, 
        costBasisBaseValue: changeD.costBasisBaseValue, 
    };

    const aaplStateD = { 
        ymdDate: settingsC.ymdDate, 
        quantityBaseValue: lot1StateD.quantityBaseValue 
            + lot5StateD.quantityBaseValue + lot2StateD.quantityBaseValue 
            + lot3StateD.quantityBaseValue + lot4StateD.quantityBaseValue,
        lotStates: [ lot1StateD, lot5StateD, lot2StateD, lot3StateD, lot4StateD, ],
    };

    result = await transactionManager.asyncAddTransaction(settingsD);
    const transD = result.newTransactionDataItem;
    settingsD.id = transD.id;
    expect(transD).toEqual(settingsD);

    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateD);
    

    // Now let's check the account states for the transactions.
    const [accountStateDTransC] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transC.id);
    expect(ACSTH.cleanAccountState(accountStateDTransC)).toEqual(aaplStateD);


    // Let's check the caching while we're at it.
    const lot1StateDTransD = lot1StateA;
    const lot5StateDTransD = lot5StateD;
    const aaplStateDTransD = {
        ymdDate: settingsD.ymdDate,
        quantityBaseValue: lot1StateDTransD.quantityBaseValue 
            + lot5StateDTransD.quantityBaseValue,
        lotStates: [ lot1StateDTransD, lot5StateDTransD ],
    };

    const [accountStateDTransD] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transD.id);
    expect(ACSTH.cleanAccountState(accountStateDTransD)).toEqual(aaplStateDTransD);


    const aaplStateDTransB = { 
        ymdDate: settingsB.ymdDate, 
        quantityBaseValue: lot1StateB.quantityBaseValue 
            + lot5StateDTransD.quantityBaseValue 
            + lot2StateB.quantityBaseValue 
            + lot3StateB.quantityBaseValue, 
        lotStates: [ lot1StateB, lot5StateDTransD, lot2StateB, lot3StateB, ],
    };
    const [accountStateDTransB] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transB.id);
    expect(ACSTH.cleanAccountState(accountStateDTransB)).toEqual(aaplStateDTransB);


    const [accountStateDTransDBefore] 
        = await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
            aaplId, transD.id);
    expect(ACSTH.cleanAccountState(accountStateDTransDBefore)).toEqual(aaplStateA);

    const [accountStateDTransA] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transA.id);
    expect(ACSTH.cleanAccountState(accountStateDTransA)).toEqual(aaplStateA);


    // Test add single transaction undo.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);

    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateC);

    [ accountState ] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transB.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateB);

    // Redo
    await transactionManager.asyncAddTransaction(settingsD);
    await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
        aaplId, transC.id);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsBeforeTransaction(aaplId, transD.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateA);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transA.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateA);


    //
    // Test Modify
    //
    expect(ACSTH.cleanAccountState(transactionManager
        .getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateD);

    // Modify lot 5.
    const changeE = { lotId: lot5.id, 
        quantityBaseValue: 60000, 
        costBasisBaseValue: 30 * 60000,
    };
    const settingsE = {
        id: transD.id,
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeE.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeE.costBasisBaseValue, 
                lotChanges: [ changeE ],
            },
        ]
    };
    result = await transactionManager.asyncModifyTransaction(settingsE);
    const transE = result.newTransactionDataItem;
    settingsE.id = transE.id;
    settingsE.ymdDate = transD.ymdDate;
    expect(transE).toEqual(settingsE);

    const lot1StateE = lot1StateD;
    const lot2StateE = lot2StateD;
    const lot3StateE = lot3StateD;
    const lot4StateE = lot4StateD;
    const lot5StateE = { lotId: lot5.id, 
        quantityBaseValue: changeE.quantityBaseValue, 
        costBasisBaseValue: changeE.costBasisBaseValue, 
    };

    const aaplStateE = { 
        ymdDate: settingsC.ymdDate, 
        quantityBaseValue: lot1StateE.quantityBaseValue + lot5StateE.quantityBaseValue 
            + lot2StateE.quantityBaseValue + lot3StateE.quantityBaseValue 
            + lot4StateE.quantityBaseValue, 
        lotStates: [ lot1StateE, lot5StateE, lot2StateE, lot3StateE, lot4StateE, ],
    };
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId)))
        .toEqual(aaplStateE);

    const lot1StateETransD = lot1StateA;
    const lot5StateETransD = lot5StateE;
    const aaplStateETransD = {
        ymdDate: settingsD.ymdDate,
        quantityBaseValue: lot1StateETransD.quantityBaseValue 
            + lot5StateETransD.quantityBaseValue,
        lotStates: [ lot1StateETransD, lot5StateETransD ],
    };

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transD.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateETransD);


    // Test undo modify
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateD);

    // Redo
    await transactionManager.asyncModifyTransaction(settingsE);
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateE);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transD.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateETransD);


    // Sell part of lot 5
    const changeF = { lotId: lot5.id, quantityBaseValue: -20000, };
    const changeFPrice = 45;
    const settingsF = {
        ymdDate: '2010-06-25',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeF.quantityBaseValue * changeFPrice, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeF.quantityBaseValue * changeFPrice, 
                lotChanges: [ changeF ],
            },
        ]
    };

    const lot1StateF = lot1StateE;
    const lot2StateF = lot2StateE;
    const lot3StateF = lot3StateE;
    const lot4StateF = lot4StateE;
    const lot5StateF = { 
        lotId: lot5.id, 
        quantityBaseValue: lot5StateE.quantityBaseValue + changeF.quantityBaseValue, 
        costBasisBaseValue: Math.round((lot5StateE.quantityBaseValue 
            + changeF.quantityBaseValue) 
            * lot5StateD.costBasisBaseValue / lot5StateD.quantityBaseValue), 
    };

    const aaplStateF = { 
        ymdDate: settingsF.ymdDate, 
        quantityBaseValue: lot1StateF.quantityBaseValue + lot5StateF.quantityBaseValue 
            + lot2StateF.quantityBaseValue + lot3StateF.quantityBaseValue 
            + lot4StateF.quantityBaseValue,
        lotStates: [ lot1StateF, lot5StateF, lot2StateF, lot3StateF, lot4StateF, ],
    };

    const transF = (await transactionManager.asyncAddTransaction(settingsF))
        .newTransactionDataItem;
    settingsF.id = transF.id;
    expect(transF).toEqual(settingsF);

    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateF);

    const [accountStateFTransC] 
        = await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            aaplId, transC.id);
    expect(ACSTH.cleanAccountState(accountStateFTransC)).toEqual(aaplStateE);


    // Sell all of lot 5
    const changeG = { lotId: lot5.id, quantityBaseValue: -lot5StateF.quantityBaseValue, };
    const changeGPrice = 50;
    const settingsG = {
        ymdDate: '2010-06-30',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeG.quantityBaseValue * changeGPrice, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeG.quantityBaseValue * changeGPrice, 
                lotChanges: [ changeG ],
            },
        ]
    };

    const lot1StateG = lot1StateF;
    const lot2StateG = lot2StateF;
    const lot3StateG = lot3StateF;
    const lot4StateG = lot4StateF;

    const aaplStateG = { 
        ymdDate: settingsG.ymdDate, 
        quantityBaseValue: lot1StateG.quantityBaseValue
            + lot2StateG.quantityBaseValue 
            + lot3StateG.quantityBaseValue 
            + lot4StateG.quantityBaseValue,
        lotStates: [ lot1StateG, lot2StateG, lot3StateG, lot4StateG, ],
    };

    const transG = (await transactionManager.asyncAddTransaction(settingsG))
        .newTransactionDataItem;
    settingsG.id = transG.id;
    expect(transG).toEqual(settingsG);

    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateG);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transC.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateE);


    //
    // Remove
    result = await transactionManager.asyncRemoveTransactions(transB.id);
    const transBRemove = result.removedTransactionDataItem;
    expect(transBRemove).toEqual(transB);

    
    const lot1StateH = lot1StateG;
    const lot4StateH = lot4StateG;

    const aaplStateH = { 
        ymdDate: settingsG.ymdDate, 
        quantityBaseValue: lot1StateH.quantityBaseValue + lot4StateH.quantityBaseValue,
        lotStates: [ lot1StateH, lot4StateH, ],
    };
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateH);

    const aaplStateHTransF = {
        ymdDate: settingsF.ymdDate, 
        quantityBaseValue: lot1StateF.quantityBaseValue + lot5StateF.quantityBaseValue 
            + lot4StateF.quantityBaseValue,
        lotStates: [ lot1StateF, lot5StateF, lot4StateF, ],
    };
    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transF.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateHTransF);


    // Test Undo remove
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    trans = await transactionManager.asyncGetTransactionDataItemsWithIds(transB.id);
    expect(trans).toEqual(transB);

    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateG);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transC.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateE);

    // Redo.
    await transactionManager.asyncRemoveTransactions(transB.id);
    trans = await transactionManager.asyncGetTransactionDataItemsWithIds(transB.id);
    expect(trans).toBeUndefined();
    expect(ACSTH.cleanAccountState(
        transactionManager.getCurrentAccountStateDataItem(aaplId))).toEqual(aaplStateH);

    [accountState] = await transactionManager
        .asyncGetAccountStateDataItemsAfterTransaction(aaplId, transF.id);
    expect(ACSTH.cleanAccountState(accountState)).toEqual(aaplStateHTransF);
});


//
//---------------------------------------------------------
//
test('Transactions-lotValidation', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();

    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();
    const lotManager = accountingSystem.getLotManager();

    const brokerageId = sys.brokerageAId;
    const aaplId = sys.aaplBrokerageAId;
    const { aaplPricedItemId } = sys;


    // Lot must exist.
    const changeA = { quantityBaseValue: 10000, costBasisBaseValue: 200000, };
    const settingsA = {
        ymdDate: '2010-05-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeA.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeA.costBasisBaseValue, 
                lotChanges: [ changeA ]
            },
        ]
    };
    await expect(transactionManager.asyncAddTransaction(settingsA)).rejects.toThrow();

    const lot1 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 1'})).newLotDataItem;
    changeA.lotId = lot1.id;

    // valid quantityBaseValue
    changeA.quantityBaseValue = 0;
    await expect(transactionManager.asyncAddTransaction(settingsA)).rejects.toThrow();
    changeA.quantityBaseValue = 10000;

    // valid costBasisBaseValue.
    changeA.costBasisBaseValue = -1;
    await expect(transactionManager.asyncAddTransaction(settingsA)).rejects.toThrow();
    changeA.costBasisBaseValue = 200000;

    const transA = (await transactionManager.asyncAddTransaction(settingsA))
        .newTransactionDataItem;


    // Can't add another of the same lot.
    const changeB = { lotId: lot1.id, 
        quantityBaseValue: 20000, 
        costBasisBaseValue: 20 * 20000, 
    };
    const settingsB = {
        ymdDate: '2010-05-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeB.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeB.costBasisBaseValue, 
                lotChanges: [ changeB ]
            },
        ]
    };
    await expect(transactionManager.asyncAddTransaction(settingsB)).rejects.toThrow();


    const lot2 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 2'})).newLotDataItem;
    changeB.lotId = lot2.id;
    const transB = (await transactionManager.asyncAddTransaction(settingsB))
        .newTransactionDataItem;


    const changeC = { lotId: lot2.id, quantityBaseValue: -20001, };
    const settingsC = {
        ymdDate: '2010-05-20',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 10000, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -10000, 
                lotChanges: [ changeC ]
            },
        ]
    };

    // Can't decrease more than the available lot quantity.
    await expect(transactionManager.asyncAddTransaction(settingsC)).rejects.toThrow();
    
    changeC.quantityBaseValue = -5000;
    const costBasisBaseValueC = changeC.quantityBaseValue * 25;
    settingsC.splits[0].quantityBaseValue = -costBasisBaseValueC;
    settingsC.splits[1].quantityBaseValue = costBasisBaseValueC;
    const transC = (await transactionManager.asyncAddTransaction(settingsC))
        .newTransactionDataItem;
    settingsC.id = transC.id;
    expect(transC).toEqual(settingsC);


    // Can't modify the quantity of lot2 in transB so transC becomes invalid.
    const changeD = { lotId: lot2.id, 
        quantityBaseValue: 4900, 
        costBasisBaseValue: 4900 * 20, 
    };
    const settingsD = {
        id: transB.id,
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeD.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeD.costBasisBaseValue, 
                lotChanges: [ changeD ]
            },
        ]
    };
    await expect(transactionManager.asyncModifyTransaction(settingsD)).rejects.toThrow();

    changeD.quantityBaseValue = 30000;
    changeD.costBasisBaseValue = 30000 * 20;
    const transD = (await transactionManager.asyncModifyTransaction(settingsD))
        .newTransactionDataItem;
    settingsD.ymdDate = transB.ymdDate;
    expect(transD).toEqual(settingsD);


    // Can't remove transaction of lot is still in use.
    await expect(transactionManager.asyncRemoveTransactions(transB.id))
        .rejects.toThrow(new Error('TransactionManager-lot_still_in_use'));


    // Can't change lot id if lot is still in use.
    const lot3 = (await lotManager.asyncAddLot(
        { pricedItemId: aaplPricedItemId, description: 'Lot 3'})).newLotDataItem;
    const changeE = Object.assign({}, changeD);
    changeE.lotId = lot3.id;
    const settingsE = {
        id: transB.id,
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeE.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeE.costBasisBaseValue, 
                lotChanges: [ changeE ]
            },
        ]
    };
    await expect(transactionManager.asyncModifyTransaction(settingsE))
        .rejects.toThrow(new Error('TransactionManager-lot_still_in_use'));


    // But can change lot that's not in use.
    const changeF = { lotId: lot3.id, 
        quantityBaseValue: 10000, 
        costBasisBaseValue: 200000, 
    };
    const settingsF = {
        id: transA.id,
        ymdDate: '2010-05-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeF.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeF.costBasisBaseValue, 
                lotChanges: [ changeF ]
            },
        ]
    };
    const transF = (await transactionManager.asyncModifyTransaction(settingsF))
        .newTransactionDataItem;
    expect(transF).toEqual(settingsF);


    // Can't change to lot that's already in use.
    const changeG = { lotId: lot2.id, 
        quantityBaseValue: 10000, 
        costBasisBaseValue: 200000, 
    };
    const settingsG = {
        id: transA.id,
        ymdDate: '2010-05-10',
        splits: [
            { accountId: brokerageId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -changeG.costBasisBaseValue, 
            },
            { 
                accountId: aaplId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: changeG.costBasisBaseValue, 
                lotChanges: [ changeG ]
            },
        ]
    };
    await expect(transactionManager.asyncModifyTransaction(settingsG)).rejects.toThrow();


    // Lot can only appear in one account at a time.
});
