import { YMDDate } from '../util/YMDDate';
import * as L from './Lots';

function testLotDataItems(lot) {
    const dataItem = L.getLotDataItem(lot);

    const string = JSON.stringify(dataItem);
    const jsonDataItem = JSON.parse(string);
    expect(jsonDataItem).toEqual(dataItem);

    const lotBack = L.getLot(jsonDataItem);
    expect(lotBack).toEqual(lot);

    expect(L.getLotDataItem(dataItem) === dataItem).toBeTruthy();
    expect(L.getLot(lot) === lot).toBeTruthy();
}



//
//---------------------------------------------------------
//
test('Lot-Data Items', () => {
    const lotA = {
        purchaseYMDDate: new YMDDate(2019, 10, 11),
        quantityBaseValue: 12345,
        costBasisBaseValue: 45678,
    };
    testLotDataItems(lotA);

    const lotB = {
        purchaseYMDDate: new YMDDate(2019, 10, 11),
        quantityBaseValue: 12345,
        costBasisBaseValue: 45678,
        description: 'A description',
    };
    testLotDataItems(lotB);


    // Test Arrays
    const lots = [lotA, lotB];
    const lotDataItems = L.getLotDataItems(lots);
    const strings = JSON.stringify(lotDataItems);
    const jsonDataItems = JSON.parse(strings);
    expect(jsonDataItems).toEqual(lotDataItems);

    const lotsBack = L.getLots(jsonDataItems);
    expect(lotsBack).toEqual(lots);

    expect(L.getLotDataItems(lotDataItems) === lotDataItems).toBeTruthy();
    expect(L.getLots(lots) === lots).toBeTruthy();


    // Test alwaysCopy
    expect(L.getLotDataItems(lotDataItems, true) === lotDataItems).toBeFalsy();
    expect(L.getLotDataItems(lotDataItems, true)).toEqual(lotDataItems);

    expect(L.getLots(lots, true) === lots).toBeFalsy();
    expect(L.getLots(lots, true)).toEqual(lots);
});
