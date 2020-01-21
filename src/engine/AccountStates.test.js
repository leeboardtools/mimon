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
        lotStates: [

        ],
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
    const accountStateA = {
        ymdDate: '2019-10-12',
        quantityBaseValue: 100100,
    };
    expect(testA).toEqual(accountStateA);

    const revTestA = A.removeSplitFromAccountStateDataItem(testA, splitA);
    expect(revTestA).toEqual(A.getAccountStateDataItem(stateA));


    const lotChangeA = { lotId: 1, quantityBaseValue: 3000, costBasisBaseValue: 300, };
    const stateB = {
        ymdDate: '2019-01-02',
        quantityBaseValue: -100000,
        lotStates: [],
    };

    const splitB = { accountId: 1, quantityBaseValue: 100, lotChanges: [lotChangeA], };
    const accountStateB = {
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100,
        lotStates: [ { lotId: 1, ymdDate: '2019-03-31', quantityBaseValue: 3000, costBasisBaseValue: 300, }],
    };
    const testB = A.addSplitToAccountStateDataItem(stateB, splitB, new YMDDate('2019-03-31'));
    expect(testB).toEqual(accountStateB);


    //
    // Test add another lot, modify first lost, ymdDate arg undefined....
    const lotChangeB = { lotId: 2, quantityBaseValue: 456, costBasisBaseValue: 876, };
    const lotStateB = { lotId: 2, quantityBaseValue: 456, costBasisBaseValue: 876, ymdDate: '2019-03-31', };

    const lotChangeA1 = { lotId: 1, quantityBaseValue: -1000, };
    const lotStateA1 = { lotId: 1, quantityBaseValue : 2000, costBasisBaseValue: 200, ymdDate: '2019-03-31', };

    const splitC = { accountId: 2, quantityBaseValue: 300, lotChanges: [lotChangeB, lotChangeA1] };
    const accountStateC = {
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100 + 300,
        lotStates: [ lotStateA1, lotStateB, ],
    };
    const testC = A.addSplitToAccountStateDataItem(testB, splitC);
    expect(testC).toEqual(accountStateC);


    // Test Sell All of B
    const lotChangeD = { lotId: 3, quantityBaseValue: 123, costBasisBaseValue: 789, };
    const lotStateD = { lotId: 3, quantityBaseValue: 123, costBasisBaseValue: 789, ymdDate: '2019-03-31', };

    const lotChangeB1 = { lotId: 2, quantityBaseValue: -lotStateB.quantityBaseValue, costBasisBaseValue: lotStateB.costBasisBaseValue, };
    const splitD = { accountId: 2, quantityBaseValue: 200, lotChanges: [ lotChangeD, lotChangeB1, ]};
    const accountStateD = {
        ymdDate: '2019-03-31',
        quantityBaseValue: -100000 + 100 + 300 + 200,
        lotStates: [ lotStateA1, lotStateD ],
    };
    const testD = A.addSplitToAccountStateDataItem(testC, splitD);
    expect(testD).toEqual(accountStateD);
    

    // Reverse...
    const revTestD = A.removeSplitFromAccountStateDataItem(testD, splitD);
    expect(revTestD).toEqual(accountStateC);

    const revTestC = A.removeSplitFromAccountStateDataItem(revTestD, splitC, accountStateB.ymdDate);
    expect(revTestC).toEqual(accountStateB);

    const revTestB = A.removeSplitFromAccountStateDataItem(revTestC, splitB, stateB.ymdDate);
    expect(revTestB).toEqual(stateB);
});
