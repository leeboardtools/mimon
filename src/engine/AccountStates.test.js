import * as A from './AccountStates';
import { YMDDate } from '../util/YMDDate';

function testAccountStateDataItem(accountState) {
    const dataItem = A.getAccountStateDataItem(accountState);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const accountStateBack = A.getAccountState(json);
    expect(accountStateBack).toEqual(accountState);

    expect(A.getAccountState(accountState) === accountState).toBeTruthy();
    expect(A.getAccountStateDataItem(dataItem) === dataItem).toBeTruthy();
}


//
//---------------------------------------------------------
//
test('AccountState-Data Items', () => {
    const stateA = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
    };
    testAccountStateDataItem(stateA);

    const stateB = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
        lots: [
            { purchaseYMDDate: new YMDDate(2000, 0, 1), quantityBaseValue: 123456, costBasisBaseValue: 7989, }, 
            { purchaseYMDDate: new YMDDate(2010, 10, 11), quantityBaseValue: 9876, costBasisBaseValue: 456, }, 
        ],
    };
    testAccountStateDataItem(stateB);
});


//
//---------------------------------------------------------
//
test('AccountState-add_remove_split', () => {
    const stateA = {
        ymdDate: new YMDDate('2019-10-12'),
        quantityBaseValue: 100000,
    };
    const splitA = { accountId: 1, quantityBaseValue: 100, };
    const testA = A.addSplitToAccountStateDataItem(stateA, splitA);
    expect(testA).toEqual({
        ymdDate: '2019-10-12',
        quantityBaseValue: 100100,
    });

    const revTestA = A.removeSplitFromAccountStateDataItem(testA, splitA);
    expect(revTestA).toEqual(A.getAccountStateDataItem(stateA));

    const lotA = { purchaseYMDDate: '2018-04-05', quantityBaseValue: 123, constBasisBaseValue: 9999, };
    const stateB = {
        ymdDate: '2019-01-02',
        quantityBaseValue: -100000,
        lots: []
    };

    const splitB = { accountId: 1, quantityBaseValue: 100, lotChanges: [ [lotA] ]};
    const testB = A.addSplitToAccountStateDataItem(stateB, splitB, new YMDDate('2019-03-31'));
    expect(testB).toEqual({
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100,
        lots: [ lotA ]
    });

    const lotB = { purchaseYMDDate: '2019-01-05', quantityBaseValue: 456, constBasisBaseValue: 876, };
    const lotA1 = { purchaseYMDDate: '2018-04-05', quantityBaseValue: 100, constBasisBaseValue: 999, };
    const splitC = { accountId: 2, quantityBaseValue: 300, lotChanges: [ [lotB], [lotA1, lotA]] };
    const testC = A.addSplitToAccountStateDataItem(testB, splitC);
    expect(testC).toEqual({
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100 + 300,
        lots: [ lotA1, lotB ]
    });

    const lotD = { purchaseYMDDate: '2017-09-12', quantityBaseValue: 123, constBasisBaseValue: 789, };
    const splitD = { accountId: 2, quantityBaseValue: 200, lotChanges: [ [lotD], [undefined, lotB]]};
    const testD = A.addSplitToAccountStateDataItem(testC, splitD);
    expect(testD).toEqual({
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100 + 300 + 200,
        lots: [ lotD, lotA1 ],
    });

    const revTestD = A.removeSplitFromAccountStateDataItem(testD, splitD);
    expect(revTestD).toEqual({
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100 + 300,
        lots: [ lotA1, lotB ]
    });

    const revTestC = A.removeSplitFromAccountStateDataItem(revTestD, splitC);
    expect(revTestC).toEqual({
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100,
        lots: [ lotA ]
    });

    const revTestB = A.removeSplitFromAccountStateDataItem(revTestC, splitB, '2019-01-02');
    expect(revTestB).toEqual({
        ymdDate: '2019-01-02',
        quantityBaseValue: -100000,
        lots: []
    });
});
