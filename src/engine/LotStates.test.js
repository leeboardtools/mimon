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


    const lotChangeB = { lotId: 1, 
        quantityBaseValue: 20000 - stateA.quantityBaseValue, 
    };
    const testB = L.addLotChangeToLotStateDataItem(stateA, lotChangeB, true);
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


test('LotStates-FIFO-LIFO', () => {
    let result;

    const statesA = [
        {
            lotId: 1,
            quantityBaseValue: 100,
            costBasisBaseValue: 10000,
            ymdDateCreated: '2020-01-02',
        }
    ];
    result = L.createFIFOLotChangeDataItems(statesA, 100);
    expect(result).toEqual([
        { lotId: 1, quantityBaseValue: -100, },
    ]);

    result = L.createLIFOLotChangeDataItems(statesA, 100);
    expect(result).toEqual([
        { lotId: 1, quantityBaseValue: -100, },
    ]);


    result = L.createFIFOLotChangeDataItems(statesA, 10);
    expect(result).toEqual([
        { lotId: 1, quantityBaseValue: -10, },
    ]);

    result = L.createLIFOLotChangeDataItems(statesA, 10);
    expect(result).toEqual([
        { lotId: 1, quantityBaseValue: -10, },
    ]);

    expect(() => L.createLIFOLotChangeDataItems(statesA, 101)).toThrow(Error);


    // 2020-01-10: lot 2 2000
    // 2020-01-15: lot 1 1000
    // 2020-01-25: lot 3 3000
    const statesB = [
        { lotId: 1, 
            quantityBaseValue: 1000, 
            costBasisBaseValue: 10000, 
            ymdDateCreated: '2020-01-15', 
        },
        { lotId: 2, 
            quantityBaseValue: 2000, 
            costBasisBaseValue: 20000, 
            ymdDateCreated: '2020-01-10', 
        },
        { lotId: 3, 
            quantityBaseValue: 3000, 
            costBasisBaseValue: 30000, 
            ymdDateCreated: '2020-01-25', 
        },
    ];

    result = L.createFIFOLotChangeDataItems(statesB, 100);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -100, }
    ]);

    result = L.createFIFOLotChangeDataItems(statesB, 2000);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -2000, }
    ]);

    result = L.createFIFOLotChangeDataItems(statesB, 2001);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -2000, },
        { lotId: 1, quantityBaseValue: -1, },
    ]);

    result = L.createFIFOLotChangeDataItems(statesB, 3000);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -2000, },
        { lotId: 1, quantityBaseValue: -1000, },
    ]);

    result = L.createFIFOLotChangeDataItems(statesB, 3001);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -2000, },
        { lotId: 1, quantityBaseValue: -1000, },
        { lotId: 3, quantityBaseValue: -1, },
    ]);

    result = L.createFIFOLotChangeDataItems(statesB, 6000);
    expect(result).toEqual([
        { lotId: 2, quantityBaseValue: -2000, },
        { lotId: 1, quantityBaseValue: -1000, },
        { lotId: 3, quantityBaseValue: -3000, },
    ]);

    expect(() => L.createFIFOLotChangeDataItems(statesB, 6001)).toThrow(Error);


    // 2020-01-10: lot 2 2000
    // 2020-01-15: lot 1 1000
    // 2020-01-25: lot 3 3000
    result = L.createLIFOLotChangeDataItems(statesB, 100);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -100, }
    ]);

    result = L.createLIFOLotChangeDataItems(statesB, 3000);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -3000, }
    ]);

    result = L.createLIFOLotChangeDataItems(statesB, 3001);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -3000, },
        { lotId: 1, quantityBaseValue: -1, },
    ]);

    result = L.createLIFOLotChangeDataItems(statesB, 4000);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -3000, },
        { lotId: 1, quantityBaseValue: -1000, },
    ]);

    result = L.createLIFOLotChangeDataItems(statesB, 4001);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -3000, },
        { lotId: 1, quantityBaseValue: -1000, },
        { lotId: 2, quantityBaseValue: -1, },
    ]);

    result = L.createLIFOLotChangeDataItems(statesB, 6000);
    expect(result).toEqual([
        { lotId: 3, quantityBaseValue: -3000, },
        { lotId: 1, quantityBaseValue: -1000, },
        { lotId: 2, quantityBaseValue: -2000, },
    ]);

    expect(() => L.createLIFOLotChangeDataItems(statesB, 6001)).toThrow(Error);
});