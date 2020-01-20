import * as L from './LotStates';
import { YMDDate } from '../util/YMDDate';

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
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
        costBasisBaseValue: -1234,
    };
    testLotStateDataItem(stateA);
});


//
//---------------------------------------------------------
//
test('LotState-add_remove_lotChange', () => {
    const stateA = {
        ymdDate: new YMDDate('2019-10-12'),
        quantityBaseValue: 100000,
        costBasisBaseValue: 10000,
    };
    const lotChangeA = { lotId: 1, quantityBaseValue: 100, };
    const testA = L.addLotChangeToLotStateDataItem(stateA, lotChangeA, stateA.ymdDate);
    expect(testA).toEqual({
        ymdDate: '2019-10-12',
        quantityBaseValue: 100100,
        costBasisBaseValue: 10010,
    });

    const revTestA = L.removeLotChangeFromLotStateDataItem(testA, lotChangeA, stateA.ymdDate);
    expect(revTestA).toEqual(L.getLotStateDataItem(stateA));


    const lotChangeB = { lotId: 1, quantityBaseValue: 20000 - stateA.quantityBaseValue, isSplitMerge: true };
    const testB = L.addLotChangeToLotStateDataItem(stateA, lotChangeB, '2019-11-03');
    expect(testB).toEqual({
        ymdDate: '2019-11-03',
        quantityBaseValue: 20000,
        costBasisBaseValue: 10000,
    });

    const revTestB = L.removeLotChangeFromLotStateDataItem(testB, lotChangeB, stateA.ymdDate);
    expect(revTestB).toEqual(L.getLotStateDataItem(stateA));


    const stateC = L.getEmptyLotState();
    const lotChangeC = { lotId: 1, quantityBaseValue: 10000, costBasisBaseValue: 1000, };
    const testC = L.addLotChangeToLotStateDataItem(stateC, lotChangeC, '2010-04-05');
    expect(testC).toEqual({
        ymdDate: '2010-04-05',
        quantityBaseValue: 10000,
        costBasisBaseValue: 1000,
    });

    const revTestC = L.removeLotChangeFromLotStateDataItem(testC, lotChangeC);
    expect(revTestC).toEqual({
        quantityBaseValue: 0,
        costBasisBaseValue: 0,
    });

});
