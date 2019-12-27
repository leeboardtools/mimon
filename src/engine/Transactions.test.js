import * as T from './Transactions';
import { YMDDate } from '../util/YMDDate';

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
});