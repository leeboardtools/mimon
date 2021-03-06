import * as A from './AccountStates';
import * as T from './Transactions';
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
        quantityBaseValue: 0,
        lotStates: [],
    };
    const lotStateA = { lotId: 1, 
        quantityBaseValue: 3000, 
        costBasisBaseValue: 300, 
        previousBaseValues: [ [0, 0] ],
    };

    const splitB = { accountId: 1, 
        quantityBaseValue: 100, 
        lotTransactionType: T.LotTransactionType.BUY_SELL.name,
        lotChanges: [lotChangeA], };
    const accountStateB = {
        ymdDate: '2019-03-31',
        quantityBaseValue: lotStateA.quantityBaseValue,
        lotStates: [ lotStateA ],
    };
    lotStateA.ymdDateCreated = accountStateB.ymdDate;
    const testB = A.addSplitToAccountStateDataItem(stateB, splitB, '2019-03-31');

    lotStateA.ymdDateCreated = accountStateB.ymdDate;
    expect(testB).toEqual(accountStateB);


    //
    // Test add another lot, modify first lost, ....
    const lotChangeB = { lotId: 2, quantityBaseValue: 456, costBasisBaseValue: 876, };
    const lotStateB = { 
        lotId: 2, 
        quantityBaseValue: 456, 
        costBasisBaseValue: 876, 
        previousBaseValues: [ [0, 0], ],
    };

    const lotChangeA1 = { lotId: 1, quantityBaseValue: -1000, };
    const lotStateA1 = { 
        lotId: 1, 
        quantityBaseValue : 2000, 
        costBasisBaseValue: 200, 
        previousBaseValues: [ 
            [0, 0],
            [lotStateA.quantityBaseValue, lotStateA.costBasisBaseValue], 
        ],
        ymdDateCreated: lotStateA.ymdDateCreated,
    };

    const splitC = { accountId: 2, 
        quantityBaseValue: 300, 
        lotTransactionType: T.LotTransactionType.BUY_SELL.name,
        lotChanges: [lotChangeB, lotChangeA1],
    };
    const accountStateC = {
        ymdDate: '2019-03-31',
        quantityBaseValue: lotStateA1.quantityBaseValue + lotStateB.quantityBaseValue,
        lotStates: [ lotStateA1, lotStateB, ],
    };
    lotStateB.ymdDateCreated = accountStateC.ymdDate;
    const testC = A.addSplitToAccountStateDataItem(testB, splitC);
    expect(testC).toEqual(accountStateC);


    // Test Sell All of B
    const lotChangeD = { lotId: 3, quantityBaseValue: 123, costBasisBaseValue: 789, };
    const lotStateD = { 
        lotId: 3, 
        quantityBaseValue: 123, 
        costBasisBaseValue: 789, 
        previousBaseValues: [ [0, 0], ],
    };

    const lotChangeB1 = { lotId: 2, 
        quantityBaseValue: -lotStateB.quantityBaseValue, 
        costBasisBaseValue: lotStateB.costBasisBaseValue, 
    };
    const splitD = { accountId: 2, 
        quantityBaseValue: 200, 
        lotTransactionType: T.LotTransactionType.BUY_SELL.name,
        lotChanges: [ lotChangeD, lotChangeB1, ],
    };
    const accountStateD = {
        ymdDate: '2019-03-31',
        quantityBaseValue: lotStateA1.quantityBaseValue + lotStateD.quantityBaseValue,
        lotStates: [ lotStateA1, lotStateD ],
    };
    lotStateD.ymdDateCreated = accountStateD.ymdDate;
    const testD = A.addSplitToAccountStateDataItem(testC, splitD);
    expect(testD).toMatchObject(accountStateD);


    // Basic split/merge
    const lotChangeD1 = { lotId: 3, quantityBaseValue: 123, };
    const lotStateD1 = {
        lotId: 3, 
        quantityBaseValue: 246, 
        costBasisBaseValue: 789, 
        previousBaseValues: [ 
            [0, 0], 
            [lotStateD.quantityBaseValue, lotStateD.costBasisBaseValue] 
        ],
        ymdDateCreated: lotStateD.ymdDateCreated,
    };
    const splitE = { accountId: 2, 
        quantityBaseValue: 0, 
        lotTransactionType: T.LotTransactionType.SPLIT.name,
        lotChanges: [ lotChangeD1, ]};
    const accountStateE = {
        ymdDate: '2019-03-31',
        quantityBaseValue: lotStateA1.quantityBaseValue + lotStateD1.quantityBaseValue,
        lotStates: [ lotStateA1, lotStateD1 ],
    };
    const testE = A.addSplitToAccountStateDataItem(testD, splitE);
    expect(testE).toMatchObject(accountStateE);


    // Split merge with cost basis
    const lotChangeD2 = { lotId: 3, 
        quantityBaseValue: 123, 
        costBasisBaseValue: -89, 
    };
    const lotStateD2 = {
        lotId: 3, 
        quantityBaseValue: 246 + 123, 
        costBasisBaseValue: 700, 
        previousBaseValues: [ 
            [0, 0], 
            [lotStateD.quantityBaseValue, lotStateD.costBasisBaseValue],
            [lotStateD1.quantityBaseValue, lotStateD1.costBasisBaseValue],
        ],
        ymdDateCreated: lotStateD.ymdDateCreated,
    };
    const splitF = { accountId: 2, 
        quantityBaseValue: 0, 
        lotTransactionType: T.LotTransactionType.SPLIT.name,
        lotChanges: [ lotChangeD2, ]};
    const accountStateF = {
        ymdDate: '2019-03-31',
        quantityBaseValue: lotStateA1.quantityBaseValue + lotStateD2.quantityBaseValue,
        lotStates: [ lotStateA1, lotStateD2 ],
    };
    const testF = A.addSplitToAccountStateDataItem(testE, splitF);
    expect(testF).toMatchObject(accountStateF);


    // Reverse...
    const revTestF = A.removeSplitFromAccountStateDataItem(testF, splitF);
    expect(revTestF).toMatchObject(accountStateE);

    const revTestE = A.removeSplitFromAccountStateDataItem(testE, splitE);
    expect(revTestE).toMatchObject(accountStateD);

    const revTestD = A.removeSplitFromAccountStateDataItem(testD, splitD);
    expect(revTestD).toMatchObject(accountStateC);

    const revTestC = A.removeSplitFromAccountStateDataItem(revTestD, splitC, 
        accountStateB.ymdDate);
    expect(revTestC).toMatchObject(accountStateB);

    const revTestB = A.removeSplitFromAccountStateDataItem(revTestC, splitB, 
        stateB.ymdDate);
    expect(revTestB).toMatchObject(stateB);
});
