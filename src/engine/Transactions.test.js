import * as T from './Transactions';
import * as ASTH from './AccountingSystemTestHelpers';
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
    undefined,
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
/*    const lotA = { purchaseYMDDate: new YMDDate('2019-01-23'), quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    const lotB = { purchaseYMDDate: new YMDDate('2019-01-24'), quantityBaseValue: 98765, costBasisBaseValue: 44455 };

    const accountManager = accountingSystem.getAccountManager();

    // This doesn't work because we're not using Account.accountState anymore...
    await accountManager.asyncModifyAccount({
        id: sys.aaplBrokerageAId,
        accountState: {
            ymdDate: new YMDDate('2019-10-01'),
            lots: [lotA, lotB],
        }
    });

    const lotC = { purchaseYMDDate: new YMDDate('2019-10-11'), quantityBaseValue: 555555, costBasisBaseValue: 5555 };
    const lotD = { purchaseYMDDate: new YMDDate('2019-10-12'), quantityBaseValue: 44444, costBasisBaseValue: 4444 };
    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageAId, quantityBaseValue: 70000, lotChanges: [[lotC]], },
    ])).toBeUndefined();

    console.log('brokerageAId: ' + sys.brokerageAId);
    console.log('aaplBrokerageAId: ' + sys.aaplBrokerageAId);
    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageAId, quantityBaseValue: 70000, lotChanges: [[lotC, lotA]], },
    ])).toBeUndefined();
    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageAId, quantityBaseValue: 70000, lotChanges: [[lotD, lotC]], },
    ])).toBeInstanceOf(Error);

    expect(manager.validateSplits([
        { accountId: sys.brokerageAId, quantityBaseValue: -70000, },
        { accountId: sys.aaplBrokerageAId, quantityBaseValue: 70000, },
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
*/
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

    let addEventArgs;
    manager.on('transactionsAdd', (arg) => addEventArgs = arg);

    const lotC1 = { purchaseYMDDate: '2019-10-11', quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    const lotC2 = { purchaseYMDDate: '2019-10-12', quantityBaseValue: 98765, costBasisBaseValue: 44455 };
    const settingsC = {
        ymdDate: '2019-10-11',
        splits: [
            { accountId: sys.brokerageAId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -500000, },
            { accountId: sys.aaplBrokerageAId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 500000, lotChanges: [[lotC1], [lotC2]]},
        ]
    };

    const result = await manager.asyncAddTransactions([settingsB, settingsC]);
    const [ transactionB, transactionC ] = result;
    settingsB.id = transactionB.id;
    settingsC.id = transactionC.id;
    expect(transactionB).toEqual(settingsB);
    expect(transactionC).toEqual(settingsC);


    // transactionsAdd event test
    expect(addEventArgs).toEqual({ newTransactionDataItems: result });
    expect(addEventArgs.newTransactionDataItems).toBe(result);


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

    let modifyEventArg;
    manager.on('transactionsModify', (arg) => modifyEventArg = arg);

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

    // transactionsModify event test
    expect(modifyEventArg).toEqual({ newTransactionDataItems: resultDE1, oldTransactionDataItems: [ settingsD, settingsE ]});
    expect(modifyEventArg.newTransactionDataItems).toBe(resultDE1);


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


//
//---------------------------------------------------------
//
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


    
    await expect(manager.asyncRemoveTransactions(-123)).rejects.toThrow();
    expect(await manager.asyncGetTransactionDateRange(sys.householdId)).toEqual([new YMDDate(settingsD.ymdDate), new YMDDate(settingsD.ymdDate)]);

    const removeD = await manager.asyncRemoveTransactions(settingsD.id);
    expect(removeD).toEqual(settingsD);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsD.id)).toBeUndefined();

    let removeEventArg;
    manager.on('transactionsRemove', (arg) => removeEventArg = arg);

    const removedAE = await manager.asyncRemoveTransactions([settingsA.id, settingsE.id]);
    expect(removedAE).toEqual([settingsA, settingsE]);
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsA.id)).toBeUndefined();
    expect(await manager.asyncGetTransactionDataItemsWithIds(settingsE.id)).toBeUndefined();

    // transactionsRemove event test
    expect(removeEventArg).toEqual({ removedTransactionDataItems: removedAE });
    expect(removeEventArg.removedTransactionDataItems).toBe(removedAE);

    expect(await manager.asyncGetTransactionDateRange(sys.cashId)).toEqual([new YMDDate(settingsC.ymdDate), new YMDDate(settingsB.ymdDate)]);
    expect(await manager.asyncGetTransactionDateRange(sys.groceriesId)).toEqual([new YMDDate(settingsB.ymdDate), new YMDDate(settingsB.ymdDate)]);


    const addedAE = await manager.asyncAddTransactions(removedAE);
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
        { ymdDate: initialYMDDate, quantityBaseValue: sys.checkingOBQuantityBaseValue, });

    expect(manager.getCurrentAccountStateDataItem(sys.cashId)).toEqual(
        { ymdDate: initialYMDDate, quantityBaseValue: sys.cashOBQuantityBaseValue, });
});


//
//---------------------------------------------------------
//
test('Transactions-lotTransactions', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();

    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();

    const brokerageId = sys.brokerageAId;
    const aaplId = sys.aaplBrokerageAId;

    expect(transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { quantityBaseValue: 0, lots: [] });

    const lotA = { purchaseYMDDate: '2010-09-21', quantityBaseValue: 12345, costBasisBaseValue: 98765 };

    const settingsA = {
        ymdDate: lotA.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -98765, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 98765, lotChanges: [[lotA, ]]},
        ],
    };
    const transA = await transactionManager.asyncAddTransaction(settingsA);
    settingsA.id = transA.id;
    expect(transA).toEqual(settingsA);

    let currentQuantityBaseValue = lotA.costBasisBaseValue;
    expect(transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsA.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA]});
    

    const lotB1 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 22222, costBasisBaseValue: 33333 };
    const lotB2 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 44444, costBasisBaseValue: 55555 };
    const settingsB = {
        ymdDate: lotB1.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -(lotB1.costBasisBaseValue + lotB2.costBasisBaseValue), },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotB1.costBasisBaseValue, lotChanges: [[lotB1, ]]},
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotB2.costBasisBaseValue, lotChanges: [[lotB2, ]]},
        ],
    };

    const lotC = { purchaseYMDDate: '2010-10-23', quantityBaseValue: 66666, costBasisBaseValue: 77777 };
    const settingsC = {
        ymdDate: lotC.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotC.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotC.costBasisBaseValue, lotChanges: [[lotC, ]]},
        ],
    };
    const [ transB, transC ] = await transactionManager.asyncAddTransactions([settingsB, settingsC]);
    settingsB.id = transB.id;
    settingsC.id = transC.id;

    currentQuantityBaseValue += lotB1.costBasisBaseValue + lotB2.costBasisBaseValue;
    currentQuantityBaseValue += lotC.costBasisBaseValue;
    expect(transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsC.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotB2, lotC]});
    // const lotA = { purchaseYMDDate: '2010-09-21', quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    // const lotB1 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 22222, costBasisBaseValue: 33333 };
    // const lotB2 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 44444, costBasisBaseValue: 55555 };
    // const lotC = { purchaseYMDDate: '2010-10-23', quantityBaseValue: 66666, costBasisBaseValue: 77777 };
    

    //
    // Test Add transaction with date between existing dates.
    const lotD = { purchaseYMDDate: '2010-10-01', quantityBaseValue: 8888, costBasisBaseValue: 9999, };
    const settingsD = {
        ymdDate: lotD.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotD.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotD.costBasisBaseValue, lotChanges: [[lotD, ]]},
        ],
    };

    const lotE = { purchaseYMDDate: '2010-11-12', quantityBaseValue: 232323, costBasisBaseValue: 232323, };
    const settingsE = {
        ymdDate: lotE.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotE.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotE.costBasisBaseValue, lotChanges: [[lotE, ]]},
        ],
    };
    const [ transE, transD ] = await transactionManager.asyncAddTransactions([settingsE, settingsD ]);
    settingsD.id = transD.id;
    settingsE.id = transE.id;

    currentQuantityBaseValue += lotD.costBasisBaseValue;
    currentQuantityBaseValue += lotE.costBasisBaseValue;
    expect(transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsE.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotB2, lotD, lotC, lotE]});

    // const lotA = { purchaseYMDDate: '2010-09-21', quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    // const lotB1 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 22222, costBasisBaseValue: 33333 };
    // const lotB2 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 44444, costBasisBaseValue: 55555 };
    // const lotC = { purchaseYMDDate: '2010-10-23', quantityBaseValue: 66666, costBasisBaseValue: 77777 };
    // const lotD = { purchaseYMDDate: '2010-10-01', quantityBaseValue: 8888, costBasisBaseValue: 9999, };
    // const lotE = { purchaseYMDDate: '2010-11-12', quantityBaseValue: 232323, costBasisBaseValue: 232323, };

    //
    // Test modify D and E
    const lotDa = { purchaseYMDDate: lotD.purchaseYMDDate, quantityBaseValue: 9999, costBasisBaseValue: 8888, };
    const settingsDa = {
        id: transD.id,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotDa.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotDa.costBasisBaseValue, lotChanges: [[lotDa, ]]},
        ]
    };
    await transactionManager.asyncModifyTransactions(settingsDa);

    currentQuantityBaseValue += lotDa.costBasisBaseValue - lotD.costBasisBaseValue;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsE.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotB2, lotDa, lotC, lotE]});


    const lotDb = { purchaseYMDDate: '2010-10-31', quantityBaseValue: 9999, costBasisBaseValue: 8888, };
    const settingsDb = {
        id: transD.id,
        ymdDate: lotDb.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotDb.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotDb.costBasisBaseValue, lotChanges: [[lotDb, ]]},
        ]
    };
    await transactionManager.asyncModifyTransactions(settingsDb);
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsE.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotB2, lotC, lotDb, lotE]});


    // Test remove Db
    await transactionManager.asyncRemoveTransactions(transD.id);

    currentQuantityBaseValue -= lotDb.costBasisBaseValue;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsE.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotB2, lotC, lotE]});
    

    //
    // Test lot modification transactions...

    // const lotA = { purchaseYMDDate: '2010-09-21', quantityBaseValue: 12345, costBasisBaseValue: 98765 };
    // const lotB1 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 22222, costBasisBaseValue: 33333 };
    // const lotB2 = { purchaseYMDDate: '2010-09-25', quantityBaseValue: 44444, costBasisBaseValue: 55555 };
    // const lotC = { purchaseYMDDate: '2010-10-23', quantityBaseValue: 66666, costBasisBaseValue: 77777 };
    // const lotE = { purchaseYMDDate: '2010-11-12', quantityBaseValue: 232323, costBasisBaseValue: 232323, };

    // Sell lotB2
    const sellB2QuantitytBaseValue = 123456;
    const settingsF = {
        ymdDate: '2010-12-11',
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: sellB2QuantitytBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -sellB2QuantitytBaseValue, lotChanges: [[undefined, lotB2]]},
        ],
    };
    const transF = await transactionManager.asyncAddTransactions(settingsF);
    settingsF.id = transF.id;

    currentQuantityBaseValue -= sellB2QuantitytBaseValue;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsF.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotC, lotE]});


    // Modify lotC
    const sellCaQuantityBaseValue = 54321;
    const lotCa = { purchaseYMDDate: '2010-10-23', quantityBaseValue: 33333, costBasisBaseValue: 44444 };
    const settingsG = {
        ymdDate: '2010-12-23',
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: sellCaQuantityBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -sellCaQuantityBaseValue, lotChanges: [[lotCa, lotC]]},
        ]
    };
    const transG = await transactionManager.asyncAddTransactions(settingsG);
    settingsG.id = transG.id;

    currentQuantityBaseValue -= sellCaQuantityBaseValue;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsG.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotCa, lotE]});

    //
    // Test sameDayOrder for multiple same day transactions affecting the same lots.
    // The buy
    const lotF = { purchaseYMDDate: '2010-12-23', quantityBaseValue: 22222, costBasisBaseValue: 11111 };
    const settingsH = {
        ymdDate: '2010-12-23',
        sameDayOrder: 0,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotF.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotF.costBasisBaseValue, lotChanges: [[lotF, ]]},
        ],
    };

    // The partial sell
    const sellFaQuantityBaseValue = 1234;
    const lotFa = { purchaseYMDDate: '2010-12-23', quantityBaseValue: 11111, costBasisBaseValue: 1212 };
    const settingsI = {
        ymdDate: '2010-12-23',
        sameDayOrder: 1,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: sellFaQuantityBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -sellFaQuantityBaseValue, lotChanges: [[lotFa, lotF ]]},
        ],
    };
    const [ transI, transH ] = await transactionManager.asyncAddTransactions([settingsI, settingsH]);
    settingsH.id = transH.id;
    settingsI.id = transI.id;

    currentQuantityBaseValue += lotF.costBasisBaseValue;
    currentQuantityBaseValue -= sellFaQuantityBaseValue;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual(
        { ymdDate: settingsI.ymdDate, quantityBaseValue: currentQuantityBaseValue, lots: [lotA, lotB1, lotCa, lotE, lotFa]});

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
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -100, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 100, },
        ]};
    const checkingQuantityBaseValueA = sys.checkingOBQuantityBaseValue + settingsA.splits[0].quantityBaseValue;

    const settingsB = { 
        ymdDate: '2010-01-05', 
        splits: [ 
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -200, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 200, },
        ]};
    const checkingQuantityBaseValueB = checkingQuantityBaseValueA + settingsB.splits[0].quantityBaseValue;

    const settingsC = { 
        ymdDate: '2010-01-10', 
        splits: [ 
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -300, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 300, },
        ]};
    const checkingQuantityBaseValueC = checkingQuantityBaseValueB + settingsC.splits[0].quantityBaseValue;

    const settingsD = { 
        ymdDate: '2010-01-15', 
        splits: [ 
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -400, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 400, },
        ]};
    const checkingQuantityBaseValueD = checkingQuantityBaseValueC + settingsD.splits[0].quantityBaseValue;

    const [transA, transB, transC, transD] = await transactionManager.asyncAddTransaction([settingsA, settingsB, settingsC, settingsD]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, quantityBaseValue: checkingQuantityBaseValueD }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsC.ymdDate, quantityBaseValue: checkingQuantityBaseValueC }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsC.ymdDate, quantityBaseValue: checkingQuantityBaseValueC }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueB }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueB }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: initialYMDDate, quantityBaseValue: sys.checkingOBQuantityBaseValue }]);
    

    //  a: '2010-01-01', -100
    //  b: '2010-01-05', -200
    //  c: '2010-01-10', -300
    //  d: '2010-01-15', -400

    // Move C before B
    const ymdDateCa = '2010-01-04';
    await transactionManager.asyncModifyTransaction({ id: transC.id, ymdDate: ymdDateCa});
    const checkingQuantityBaseValueCa = checkingQuantityBaseValueA + settingsC.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueBa = checkingQuantityBaseValueCa + settingsB.splits[0].quantityBaseValue;

    //  a: '2010-01-01', -100,  99900
    //  c: '2010-01-04', -300,  99600
    //  b: '2010-01-05', -200,  99400
    //  d: '2010-01-15', -400,  99000

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, quantityBaseValue: checkingQuantityBaseValueD }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transD.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueBa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: settingsB.ymdDate, quantityBaseValue: checkingQuantityBaseValueBa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transB.id)).toEqual(
        [{ ymdDate: ymdDateCa, quantityBaseValue: checkingQuantityBaseValueCa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: ymdDateCa, quantityBaseValue: checkingQuantityBaseValueCa }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transC.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: settingsA.ymdDate, quantityBaseValue: checkingQuantityBaseValueA }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transA.id)).toEqual(
        [{ ymdDate: initialYMDDate, quantityBaseValue: sys.checkingOBQuantityBaseValue }]);


    // TODO:
    // Test multiple splits to the same account...
    const settingsE = { 
        ymdDate: '2010-01-20', 
        splits: [ 
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -500, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 1100, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -600, },
        ]};
    const checkingQuantityBaseValueE0 = checkingQuantityBaseValueD + settingsE.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueE1 = checkingQuantityBaseValueE0 + settingsE.splits[2].quantityBaseValue;

    const settingsF = { 
        ymdDate: '2010-01-25', 
        splits: [ 
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -200, },
            { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 100, },
            { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 100, },
        ]};
    const checkingQuantityBaseValueF0 = checkingQuantityBaseValueE1 + settingsF.splits[0].quantityBaseValue;
    const checkingQuantityBaseValueF1 = checkingQuantityBaseValueF0 + settingsF.splits[1].quantityBaseValue;

    const [transE, transF] = await transactionManager.asyncAddTransaction([settingsE, settingsF]);

    //  a: '2010-01-01', -100,  99900
    //  c: '2010-01-04', -300,  99600
    //  b: '2010-01-05', -200,  99400
    //  d: '2010-01-15', -400,  99000
    //  e[0]: '2010-01-20', -500,
    //  e[2]: '2010-01-29', -600,
    //  f[0]: '2010-01-20', -200
    //  f[1]: '2010-01-20', 100
    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transE.id)).toEqual(
        [{ ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE0 },
            { ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE1 }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transE.id)).toEqual(
        [{ ymdDate: settingsD.ymdDate, quantityBaseValue: checkingQuantityBaseValueD },
            { ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE0 }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsAfterTransaction(sys.checkingId, transF.id)).toEqual(
        [{ ymdDate: settingsF.ymdDate, quantityBaseValue: checkingQuantityBaseValueF0 },
            { ymdDate: settingsF.ymdDate, quantityBaseValue: checkingQuantityBaseValueF1 }]);

    expect(await transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(sys.checkingId, transF.id)).toEqual(
        [{ ymdDate: settingsE.ymdDate, quantityBaseValue: checkingQuantityBaseValueE1 },
            { ymdDate: settingsF.ymdDate, quantityBaseValue: checkingQuantityBaseValueF0 }]);

});


//
//---------------------------------------------------------
//
test('Transactions-lotValidation', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();

    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();

    const brokerageId = sys.brokerageAId;
    const aaplId = sys.aaplBrokerageAId;
    expect(await transactionManager.getCurrentAccountStateDataItem(aaplId)).toEqual({ ymdDate: undefined, quantityBaseValue: 0, lots: [] });

    const lotA = { purchaseYMDDate: '2010-09-21', quantityBaseValue: 11111, costBasisBaseValue: 22222 };
    const lotB = { purchaseYMDDate: '2010-10-21', quantityBaseValue: 33333, costBasisBaseValue: 44444 };
    const lotC = { purchaseYMDDate: '2010-11-21', quantityBaseValue: 55555, costBasisBaseValue: 66666 };
    const lotD = { purchaseYMDDate: '2010-12-21', quantityBaseValue: 77777, costBasisBaseValue: 88888 };
    const lotCa = { purchaseYMDDate: '2011-01-21', quantityBaseValue: 1212, costBasisBaseValue: 3434 };

    const settingsA = {
        ymdDate: lotA.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotA.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotA.costBasisBaseValue, lotChanges: [[lotA, ]]},
        ],
    };

    const settingsB = {
        ymdDate: lotB.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotB.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotB.costBasisBaseValue, lotChanges: [[lotB, ]]},
        ],
    };

    const settingsC = {
        ymdDate: lotC.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotC.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotC.costBasisBaseValue, lotChanges: [[lotC, ]]},
        ],
    };

    const settingsD = {
        ymdDate: lotD.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotD.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotD.costBasisBaseValue, lotChanges: [[lotD, ]]},
        ],
    };

    const settingsCa = {
        ymdDate: lotCa.purchaseYMDDate,
        splits: [
            { accountId: brokerageId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -lotCa.costBasisBaseValue, },
            { accountId: aaplId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: lotCa.costBasisBaseValue, lotChanges: [[lotCa, lotC]]},
        ],
    };

    const [ transA, transB, transC, transD, transCa ] = await transactionManager.asyncAddTransaction([settingsA, settingsB, settingsC, settingsD, settingsCa]);
    settingsA.id = transA.id;
    expect(transA).toEqual(settingsA);
    settingsB.id = transB.id;
    expect(transB).toEqual(settingsB);
    settingsC.id = transC.id;
    expect(transC).toEqual(settingsC);
    settingsD.id = transD.id;
    expect(transD).toEqual(settingsD);
    settingsCa.id = transCa.id;
    expect(transCa).toEqual(settingsCa);
});
