import * as T from './Transactions';
import * as ASTH from './AccountingSystemTestHelpers';
import * as A from './Accounts';
import { YMDDate } from '../util/YMDDate';
import { Ratio } from '../util/Ratios';

function testLotChangeDataItem(lotChange) {
    const dataItem = T.getLotChangeDataItems(lotChange);
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

    const back = T.getLotChanges(json);
    expect(back).toEqual(lotChange);

    expect(T.getLotChanges(lotChange) === lotChange).toBeTruthy();
    expect(T.getLotChangeDataItems(dataItem) === dataItem).toBeTruthy();

    expect(T.getLotChanges(lotChange, true) !== lotChange).toBeTruthy();
    expect(T.getLotChangeDataItems(dataItem, true) !== dataItem).toBeTruthy();
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
            { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
        ],
    ]);
    testLotChangeDataItem([
        [
            { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
            { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
        ],
    ]);
    testLotChangeDataItem([
        [
            undefined,
            { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
        ],
    ]);
    testLotChangeDataItem([
        [
            { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
        ],
        [
            undefined,
            { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
        ],
        [
            { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
            { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
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
                [
                    { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
                    { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
                ],
            ],
        },
        {
            reconcileState: T.ReconcileState.RECONCILED,
            accountId: 10,
            quantityBaseValue: -1234,
            lotChanges: [
                [
                    { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
                    { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
                ],
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
                    [
                        { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
                        { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
                    ],
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
                    [
                        { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 },
                        { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 },
                    ],
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
    expect(await handlerA.asyncGetTransactionDataItemssInDateRange(1, new YMDDate('2018-01-01'), new YMDDate('2018-01-01'))).toEqual([]);

    let result;

    const transaction1 = {
        id: 1,
        ymdDate: '2018-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', accountId: 11, quantityBaseValue: 1000, },
            { reconcileState: 'NOT_RECONCILED', accountId: 12, quantityBaseValue: -1000, },
        ]
    };
    const transaction2 = {
        id: 2,
        ymdDate: '2018-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', accountId: 11, quantityBaseValue: 1000, },
            { reconcileState: 'NOT_RECONCILED', accountId: 13, quantityBaseValue: -1000, },
        ]
    };
    const transaction3 = {
        id: 3,
        ymdDate: '2018-12-31',
        splits: [
            { reconcileState: 'NOT_RECONCILED', accountId: 11, quantityBaseValue: 2000, },
            { reconcileState: 'RECONCILED', accountId: 12, quantityBaseValue: -2000, },
        ]
    };
    const transaction4 = {
        id: 4,
        ymdDate: '2017-01-01',
        splits: [
            { reconcileState: 'NOT_RECONCILED', accountId: 11, quantityBaseValue: 3000, },
            { reconcileState: 'NOT_RECONCILED', accountId: 12, quantityBaseValue: -3000, },
        ]
    };
    const transaction5 = {
        id: 5,
        ymdDate: '2017-12-31',
        splits: [
            { reconcileState: 'PENDING', accountId: 12, quantityBaseValue: 4000, },
            { reconcileState: 'NOT_RECONCILED', accountId: 13, quantityBaseValue: -4000, },
        ]
    };

    result = await handlerA.asyncUpdateTransactionDataItems([
        [1, transaction1],
        [2, transaction2],
        [3, transaction3],
        [4, transaction4],
        [5, transaction5],
    ],
    {
        lastId: 123,
    });
    expect(result).toEqual([ transaction1, transaction2, transaction3, transaction4, transaction5]);

    expect(await handlerA.asyncGetTransactionDateRange()).toEqual([new YMDDate('2017-01-01'), new YMDDate('2018-12-31')]);
    expect(await handlerA.asyncGetTransactionDateRange(13)).toEqual([new YMDDate('2017-12-31'), new YMDDate('2018-01-01')]);

    result = await handlerA.asyncGetTransactionDataItemssInDateRange(0, new YMDDate('2017-12-31'), new YMDDate('2018-12-31'));
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
            { reconcileState: 'NOT_RECONCILED', accountId: 11, quantityBaseValue: 2000, },
            { reconcileState: 'RECONCILED', accountId: 13, quantityBaseValue: -2000, },
        ]
    };
    const transaction3A = Object.assign({}, transaction3, change3A);
    result = await handlerA.asyncUpdateTransactionDataItems([
        [3, change3A],
    ]);
    expect(result).toEqual([ transaction3A ]);

    result = await handlerA.asyncGetTransactionDataItemssInDateRange(13, new YMDDate('2018-01-01'), new YMDDate('2018-12-31'));
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

    expect(await handlerA.asyncGetTransactionDateRange()).toEqual([new YMDDate('2017-07-04'), new YMDDate('2018-12-31')]);

    result = await handlerA.asyncGetTransactionDataItemssInDateRange(12, new YMDDate('2017-01-01'), new YMDDate('2017-12-31'));
    expect(result).toEqual([transaction4A, transaction5]);


    //
    // Remove
    result = await handlerA.asyncUpdateTransactionDataItems([
        [1, ],
    ]);
    expect(result).toEqual([transaction1]);

    result = await handlerA.asyncGetTransactionDataItemssInDateRange(11, new YMDDate('2018-01-01'), new YMDDate('2018-01-01'));
    expect(result).toEqual([transaction2]);


    //
    // JSON
    const handlerB = new T.InMemoryTransactionsHandler();
    const jsonString = JSON.stringify(handlerA.toJSON());
    const json = JSON.parse(jsonString);

    handlerB.fromJSON(json);

    expect(await handlerB.asyncGetTransactionDateRange()).toEqual([new YMDDate('2017-07-04'), new YMDDate('2018-12-31')]);

    result = await handlerB.asyncGetTransactionDataItemssInDateRange(12, new YMDDate('2017-01-01'), new YMDDate('2017-12-31'));
    expect(result).toEqual([transaction4A, transaction5]);

    result = await handlerB.asyncGetTransactionDataItemssInDateRange(11, new YMDDate('2018-01-01'), new YMDDate('2018-01-01'));
    expect(result).toEqual([transaction2]);

    expect(handlerB.getIdGeneratorOptions()).toEqual({ lastId: 123, });

    expect(handlerB.getTransactionIds()).toEqual(handlerA.getTransactionIds());
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
    // Lots check.
    const lotA = { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    const lotB = { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 };

    const accountManager = accountingSystem.getAccountManager();
    await accountManager.asyncModifyAccount({
        id: sys.aaplBrokerageA,
        accountState: {
            ymdDate: new YMDDate('2019-10-01'),
            lots: [lotA, lotB],
        }
    });

    const lotC = { purchaseYMDDate: new YMDDate('2019-10-11'), quantityBaseValue: 555555, costBasisBaseValue: 5555 };
    const lotD = { purchaseYMDDate: new YMDDate('2019-10-12'), quantityBaseValue: 44444, costBasisBaseValue: 4444 };
    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageA, quantityBaseValue: 70000, lotChanges: [[lotC]], },
    ])).toBeUndefined();

    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageA, quantityBaseValue: 70000, lotChanges: [[lotC, lotA]], },
    ])).toBeUndefined();
    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageA, quantityBaseValue: 70000, lotChanges: [[lotD, lotC]], },
    ])).toBeInstanceOf(Error);

    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageA, quantityBaseValue: 70000, },
    ])).toBeInstanceOf(Error);


    //
    // Currency exchange.
    const pricedItemManager = accountingSystem.getPricedItemManager();
    const cadPricedItemDataItem = await pricedItemManager.asyncAddCurrencyPricedItem('CAD');
    const cadCashAccountDataItem = await accountManager.asyncAddAccount({
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.CASH,
        pricedItemId: cadPricedItemDataItem.id,
    });
    const jpyPricedItemDataItem = await pricedItemManager.asyncAddCurrencyPricedItem('JPY');
    const jpyCashAccountDataItem = await accountManager.asyncAddAccount({
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.CASH,
        pricedItemId: jpyPricedItemDataItem.id,
    });

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
        { accountId: cadCashAccountDataItem.id, quantityBaseValue: -1150000, currencyToUSDRatio: new Ratio(115, 100)},
        { accountId: sys.cashId, quantityBaseValue: 1000000, },
    ])).toBeUndefined();

    // OK with prices
    expect(manager.validateSplits([
        { accountId: cadCashAccountDataItem.id, quantityBaseValue: -1150000, currencyToUSDRatio: new Ratio(115, 100)},
        { accountId: sys.cashId, quantityBaseValue: 1000000 + 1000 * 2000 / 100, },
        { accountId: jpyCashAccountDataItem.id, quantityBaseValue: -1000, currencyToUSDRatio: new Ratio(100, 2000)},
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
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: -10000, },
        ]
    };
    const transactionA = await manager.asyncAddTransactions(settingsA);
    settingsA.id = transactionA.id;
    expect(transactionA).toEqual(settingsA);
    expect(await manager.asyncGetTransactionDataItemssInDateRange(0, '2019-10-05')).toEqual([settingsA]);
    expect(await manager.asyncGetTransactionDataItemssInDateRange(0, '2019-10-04')).toEqual([]);
    expect(await manager.asyncGetTransactionDataItemssInDateRange(0, '2019-10-06')).toEqual([]);
    expect(await manager.asyncGetTransactionDataItemssInDateRange(sys.cashId, '2019-10-05')).toEqual([settingsA]);
    expect(await manager.asyncGetTransactionDateRange(sys.cashId)).toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-05')]);
    expect(await manager.asyncGetTransactionDateRange(sys.checkingId)).toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-05')]);

    const settingsB = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.brokerageAId, reconcileState: T.ReconcileState.RECONCILED.name, quantityBaseValue: 1000000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -1000000, },
        ]
    };

    const lotC1 = { purchaseYMDDate: '2019-10-11', quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    const lotC2 = { purchaseYMDDate: '2019-10-12', quantityBaseValue: 98765, costBasisBaseValue: 44455 };
    const settingsC = {
        ymdDate: '2019-10-11',
        splits: [
            { accountId: sys.brokerageAId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -500000, },
            { accountId: sys.aaplBrokerageA, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 500000, lotChanges: [[lotC1], [lotC2]]},
        ]
    };
    const [ transactionB, transactionC ] = await manager.asyncAddTransactions([settingsB, settingsC]);
    settingsB.id = transactionB.id;
    settingsC.id = transactionC.id;
    expect(transactionB).toEqual(settingsB);
    expect(transactionC).toEqual(settingsC);


    const settingsD = {
        ymdDate: '2019-10-20',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 20000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: -20000, },
        ]
    };
    const transactionD = await manager.asyncAddTransactions(settingsD);
    settingsD.id = transactionD.id;
    expect(transactionD).toEqual(settingsD);


    const settingsE = {
        ymdDate: '2019-10-15',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 25000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: -25000, },
        ]
    };

    // Check validate only.
    const validateE = await manager.asyncAddTransactions(settingsE, true);
    expect(validateE).toEqual(settingsE);
    expect(await manager.asyncGetTransactionDataItemssInDateRange(sys.checkingId, '2019-10-15')).toEqual([]);

    await expect(manager.asyncAddTransactions({ splits: []})).rejects.toThrow();


    const transactionE = await manager.asyncAddTransactions(settingsE);
    settingsE.id = transactionE.id;
    expect(transactionE).toEqual(settingsE);

    expect(await manager.asyncGetTransactionDataItemssInDateRange(sys.checkingId, '2019-10-15', '2019-10-20')).toEqual([
        transactionE,
        transactionD,
    ]);
    expect(await manager.asyncGetTransactionDateRange(sys.checkingId)).toEqual([new YMDDate('2019-10-05'), new YMDDate('2019-10-20')]);


    const settingsF = Object.assign({}, settingsE);
    const transactionF = await manager.asyncAddTransactions(settingsF);
    settingsF.id = transactionF.id;
    expect(transactionF).toEqual(settingsF);

    const resultEF = await manager.asyncGetTransactionDataItemssInDateRange(sys.cashId, '2019-10-15');
    expect(resultEF).toEqual(expect.arrayContaining([settingsF, settingsE]));


    const changesF1 = { id: settingsF.id, description: 'This is description F1', memo: 'This is memo F1', };
    const settingsF1 = Object.assign({}, settingsF, changesF1);
    const transactionF1 = await manager.asyncModifyTransactions(changesF1);
    expect(transactionF1).toEqual(settingsF1);


    const changesD1 = {
        id: settingsD.id,
        ymdDate: '2019-04-05',
        splits: [
            { accountId: sys.brokerageAId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 50000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: -50000, },
        ]
    };
    const settingsD1 = Object.assign({}, settingsD, changesD1);
    
    const changesE1 = {
        id: settingsE.id,
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 25000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -25000, },
        ]
    };
    const settingsE1 = Object.assign({}, settingsE, changesE1);
    const resultDE1 = await manager.asyncModifyTransactions([changesD1, changesE1]);
    expect(resultDE1).toEqual(expect.arrayContaining([settingsD1, settingsE1]));

    expect(await manager.asyncGetTransactionDateRange(sys.checkingId)).toEqual([ new YMDDate('2019-04-05'), new YMDDate('2019-10-15')]);


    // Change validate:
    await expect(manager.asyncModifyTransactions({id: settingsD.id, splits: []})).rejects.toThrow();

    const changesE2 = {
        id: settingsE.id,
        ymdDate: '2019-10-25',
    };
    const settingsE2 = Object.assign({}, settingsE1, changesE2);
    const resultE2 = await manager.asyncModifyTransactions(changesE2, true);
    expect(resultE2).toEqual(settingsE2);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsE.id)).toEqual(settingsE1);


    const settingsG = {
        ymdDate: '2019-10-20',
        description: 'This is settings G',
        splits: [
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 55000, },
            { accountId: sys.salaryId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 100000, },
            { accountId: sys.federalTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 20000, },
            { accountId: sys.stateTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
            { accountId: sys.medicareTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
            { accountId: sys.healthInsuranceId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 5000, },
        ],
    };
    const transactionG = await manager.asyncAddTransactions(settingsG);
    settingsG.id = transactionG.id;
    expect(transactionG).toEqual(settingsG);

    expect(await manager.asyncGetTransactionDateRange(sys.checkingId)).toEqual([ new YMDDate('2019-04-05'), new YMDDate('2019-10-20')]);
});

test('TransactionManager~remove', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const manager = accountingSystem.getTransactionManager();

    const settingsA = {
        ymdDate: '2019-10-05',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: -10000, },
        ]
    };
    const settingsB = {
        ymdDate: '2019-10-15',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -1000, },
            { accountId: sys.groceriesId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: 1000, },
        ]
    };
    const settingsC = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -2000, },
            { accountId: sys.householdId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: 2000, },
        ]
    };
    const settingsD = {
        ymdDate: '2019-10-10',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -3000, },
            { accountId: sys.householdId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: 3000, },
        ]
    };
    const settingsE = {
        ymdDate: '2019-10-05',
        splits: [
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -4000, },
            { accountId: sys.miscId, reconcileState: T.ReconcileState.PENDING.name, quantityBaseValue: 4000, },
        ]
    };
    const resultABCDE = await manager.asyncAddTransactions([settingsA, settingsB, settingsC, settingsD, settingsE ]);
    settingsA.id = resultABCDE[0].id;
    settingsB.id = resultABCDE[1].id;
    settingsC.id = resultABCDE[2].id;
    settingsD.id = resultABCDE[3].id;
    settingsE.id = resultABCDE[4].id;
    expect(resultABCDE).toEqual([settingsA, settingsB, settingsC, settingsD, settingsE ]);


    expect(manager.getTransactionIds()).toEqual(expect.arrayContaining([settingsA.id, settingsB.id, settingsC.id, settingsD.id, settingsE.id]));
    expect(manager.getTransactionIds().length).toEqual(5);

    
    await expect(manager.asyncRemoveTransactions(-123)).rejects.toThrow();
    expect(await manager.asyncGetTransactionDateRange(sys.householdId)).toEqual([new YMDDate(settingsD.ymdDate), new YMDDate(settingsD.ymdDate)]);

    const removeD = await manager.asyncRemoveTransactions(settingsD.id);
    expect(removeD).toEqual(settingsD);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsD.id)).toBeUndefined();

    const removedAE = await manager.asyncRemoveTransactions([settingsA.id, settingsE.id]);
    expect(removedAE).toEqual([settingsA, settingsE]);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsA.id)).toBeUndefined();
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsE.id)).toBeUndefined();

    expect(await manager.asyncGetTransactionDateRange(sys.cashId)).toEqual([new YMDDate(settingsC.ymdDate), new YMDDate(settingsB.ymdDate)]);
    expect(await manager.asyncGetTransactionDateRange(sys.groceriesId)).toEqual([new YMDDate(settingsB.ymdDate), new YMDDate(settingsB.ymdDate)]);

    expect(manager.getTransactionIds()).toEqual(expect.arrayContaining([settingsC.id, settingsB.id]));
    expect(manager.getTransactionIds().length).toEqual(2);


    const addedAE = await manager.asyncAddTransactions(removedAE);
    settingsA.id = addedAE[0].id;
    settingsE.id = addedAE[1].id;
    expect(addedAE).toEqual([settingsA, settingsE]);
});
