import * as L from './LotStates';

function testLotStateDataItem(lotIState) {
    const dataItem = L.getLotStateDataItem(lotIState);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const lotIStateBack = L.getLotState(json);
    expect(lotIStateBack).toEqual(lotIState);

    expect(L.getLotState(lotIState) === lotIState).toBeTruthy();
    expect(L.getLotStateDataItem(dataItem) === dataItem).toBeTruthy();
}


//
//---------------------------------------------------------
//
test('LotState-Data Items', () => {
    const stateA = {
        quantityBaseValue: -4567,
        costBasisBaseValue: -1234,
        previousBaseValues: [[1, 2], [3, 4]],
    };
    testLotStateDataItem(stateA);
});


//
//---------------------------------------------------------
//
test('LotState-add_remove_lotChange', () => {
    const stateA = {
        quantityBaseValue: 100000,
        costBasisBaseValue: 10000,
        previousBaseValues: [],
    };
    const lotChangeA = { lotId: 1, quantityBaseValue: 100, };
    const testA = L.addLotChangeToLotStateDataItem(stateA, lotChangeA);
    expect(testA).toEqual({
        quantityBaseValue: 100100,
        costBasisBaseValue: 10010,
        previousBaseValues: [ [stateA.quantityBaseValue, stateA.costBasisBaseValue] ],
    });

    const revTestA = L.removeLotChangeFromLotStateDataItem(testA, lotChangeA);
    expect(revTestA).toEqual(L.getLotStateDataItem(stateA));


    const lotChangeB = { lotId: 1, quantityBaseValue: 20000 - stateA.quantityBaseValue, isSplitMerge: true };
    const testB = L.addLotChangeToLotStateDataItem(stateA, lotChangeB, '2019-11-03');
    expect(testB).toEqual({
        quantityBaseValue: 20000,
        costBasisBaseValue: 10000,
        previousBaseValues: [ [stateA.quantityBaseValue, stateA.costBasisBaseValue] ],
    });

    const revTestB = L.removeLotChangeFromLotStateDataItem(testB, lotChangeB);
    expect(revTestB).toEqual(L.getLotStateDataItem(stateA));


    const stateC = L.getEmptyLotState();
    const lotChangeC = { lotId: 1, quantityBaseValue: 10000, costBasisBaseValue: 1000, };
    const testC = L.addLotChangeToLotStateDataItem(stateC, lotChangeC, '2010-04-05');
    expect(testC).toEqual({
        quantityBaseValue: 10000,
        costBasisBaseValue: 1000,
        previousBaseValues: [ [0, 0] ],
    });

    const revTestC = L.removeLotChangeFromLotStateDataItem(testC, lotChangeC);
    expect(revTestC).toEqual({
        quantityBaseValue: 0,
        costBasisBaseValue: 0,
        previousBaseValues: [],
    });

});
