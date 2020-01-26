import { YMDDate } from '../util/YMDDate';
import * as L from './Lots';
import * as ASTH from './AccountingSystemTestHelpers';

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
        id: 987,
        pricedItemId: 123,
        description: 'Abc',
    };
    testLotDataItems(lotA);

});


//
//---------------------------------------------------------
//
test('LotManager-other types', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const manager = accountingSystem.getLotManager();

    const settingsA = {
        pricedItemId: sys.aaplPricedItemId,
        description: 'Hello',
    };
    const lotA = (await manager.asyncAddLot(settingsA)).newLotDataItem;
    settingsA.id = lotA.id;
    expect(lotA).toEqual(settingsA);


    const settingsB = {
        pricedItemId: sys.aaplPricedItemId,
    };

    // Validate only...
    await manager.asyncAddLot(settingsB, true);
    expect(manager.getLotIds()).toEqual([ lotA.id ]);

    let addEventArgs;
    manager.on('lotAdd', (args) => {
        addEventArgs = args;
    });

    const lotB = (await manager.asyncAddLot(settingsB)).newLotDataItem;
    settingsB.id = lotB.id;
    expect(lotB).toEqual(settingsB);

    expect(manager.getLotIds()).toEqual([ lotA.id, lotB.id ]);

    expect(addEventArgs).toEqual({ newLotDataItem: lotB });

    
    const settingsC = {
        pricedItemId: sys.msftPricedItemId,
        description: 'Some MSFT',
    };
    const lotC = (await manager.asyncAddLot(settingsC)).newLotDataItem;
    settingsC.id = lotC.id;
    expect(lotC).toEqual(settingsC);


    // Validation test.
    await expect(manager.asyncAddLot({ pricedItemId: -1, })).rejects.toThrow();


    // Remove Lot
    let removeEventArgs;
    manager.on('lotRemove', (args) => {
        removeEventArgs = args;
    });
    expect(manager.getLotDataItemWithId(lotB.id)).toEqual(settingsB);
    const removedB = (await manager.asyncRemoveLot(lotB.id)).removedLotDataItem;
    expect(manager.getLotDataItemWithId(lotB.id)).toBeUndefined();
    expect(removedB).toEqual(settingsB);

    expect(removeEventArgs).toEqual({ removedLotDataItem: lotB });



    // Modify lot.
    let modifyEventArgs;
    manager.on('lotModify', (args) => {
        modifyEventArgs = args;
    });

    const settingsCa = {
        id: settingsC.id,
        pricedItemId: settingsC.pricedItemId,
        description: 'A new description',
    };
    await manager.asyncModifyLot({
        id: settingsC.id, 
        description: settingsCa.description, 
    }, true);
    expect(manager.getLotDataItemWithId(settingsC.id)).toEqual(settingsC);

    const resultCa = await manager.asyncModifyLot({
        id: settingsC.id, 
        description: settingsCa.description, 
    });
    const testCa = resultCa.newLotDataItem;
    const oldCa = resultCa.oldLotDataItem;
    expect(testCa).toEqual(settingsCa);
    expect(oldCa).toEqual(settingsC);

    expect(modifyEventArgs).toEqual({
        newLotDataItem: settingsCa,
        oldLotDataItem: settingsC,
    });

    await expect(manager.asyncModifyLot({ id: settingsC.id, pricedItemId: -1, })).rejects.toThrow();


    // Test JSON
    const handlerA = manager._handler;
    const jsonString = JSON.stringify(handlerA);
    const json = JSON.parse(jsonString);
    const handlerB = new L.InMemoryLotsHandler();
    handlerB.fromJSON(json);

    expect(handlerB.getIdGeneratorOptions()).toEqual(handlerA.getIdGeneratorOptions());

    const lotsA = Array.from(handlerA.getLotDataItems()).sort();
    const lotsB = Array.from(handlerB.getLotDataItems()).sort();
    expect(lotsB).toEqual(lotsA);
});
