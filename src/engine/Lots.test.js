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
        lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND,
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
        lotOriginType: L.LotOriginType.CASH_PURCHASE.name,
    };
    let result;
    result = await manager.asyncAddLot(settingsA);
    const lotA = result.newLotDataItem;
    settingsA.id = lotA.id;
    expect(lotA).toEqual(settingsA);


    const settingsB = {
        pricedItemId: sys.aaplPricedItemId,
        lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND.name,
    };

    // Validate only...
    await manager.asyncAddLot(settingsB, true);
    expect(manager.getLotIds()).toEqual([ lotA.id ]);

    let addEventArgs;
    manager.on('lotAdd', (args) => {
        addEventArgs = args;
    });

    result = await manager.asyncAddLot(settingsB);
    const lotB = result.newLotDataItem;
    settingsB.id = lotB.id;
    expect(lotB).toEqual(settingsB);

    expect(manager.getLotIds()).toEqual([ lotA.id, lotB.id ]);

    expect(addEventArgs).toEqual({ newLotDataItem: lotB });

    // Make sure the lot returned is a copy.
    lotB.description = 'abc';
    expect(manager.getLotDataItemWithId(lotB.id)).toEqual(settingsB);


    // Undo add
    let removeEventArgs;
    manager.on('lotRemove', (args) => { removeEventArgs = args; });
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(removeEventArgs).toEqual(
        { removedLotDataItem: settingsB, }
    );

    expect(manager.getLotIds()).toEqual([ lotA.id, ]);
    expect(manager.getLotDataItemWithId(lotB.id)).toBeUndefined();

    result = await manager.asyncAddLot(settingsB);
    expect(result.newLotDataItem).toEqual(settingsB);

    

    const settingsC = {
        pricedItemId: sys.msftPricedItemId,
        description: 'Some MSFT',
        lotOriginType: L.LotOriginType.CASH_PURCHASE.name,
    };
    const lotC = (await manager.asyncAddLot(settingsC)).newLotDataItem;
    settingsC.id = lotC.id;
    expect(lotC).toEqual(settingsC);


    // Validation test.
    await expect(manager.asyncAddLot({ pricedItemId: -1, })).rejects.toThrow();

    // Remove Lot
    expect(manager.getLotDataItemWithId(lotB.id)).toEqual(settingsB);
    result = await manager.asyncRemoveLot(lotB.id);
    const removedB = result.removedLotDataItem;
    expect(manager.getLotDataItemWithId(lotB.id)).toBeUndefined();
    expect(removedB).toEqual(settingsB);

    expect(removeEventArgs).toEqual({ removedLotDataItem: settingsB });

    // Make sure returned lot data item is a copy.
    removedB.description = 'Bleh';

    
    // Undo remove
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(addEventArgs).toEqual(
        { newLotDataItem: settingsB, }
    );
    expect(manager.getLotDataItemWithId(lotB.id)).toEqual(settingsB);

    await manager.asyncRemoveLot(lotB.id);

    
    // Modify lot.
    let modifyEventArgs;
    manager.on('lotModify', (args) => {
        modifyEventArgs = args;
    });

    const settingsCa = {
        id: settingsC.id,
        pricedItemId: settingsC.pricedItemId,
        description: 'A new description',
        lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND.name,
    };
    await manager.asyncModifyLot({
        id: settingsC.id, 
        description: settingsCa.description, 
        lotOriginType: settingsCa.lotOriginType,
    }, true);
    expect(manager.getLotDataItemWithId(settingsC.id)).toEqual(settingsC);

    const resultCa = await manager.asyncModifyLot({
        id: settingsC.id, 
        description: settingsCa.description, 
        lotOriginType: settingsCa.lotOriginType,
    });
    const testCa = resultCa.newLotDataItem;
    const oldCa = resultCa.oldLotDataItem;
    expect(testCa).toEqual(settingsCa);
    expect(oldCa).toEqual(settingsC);

    expect(modifyEventArgs).toEqual({
        newLotDataItem: settingsCa,
        oldLotDataItem: settingsC,
    });

    // Make sure lot data items returned are copies.
    testCa.description = 'Blah';
    oldCa.description = 'Egk';
    expect(manager.getLotDataItemWithId(settingsC.id)).toEqual(settingsCa);

    // Test undo modify
    await accountingSystem.getUndoManager().asyncUndoToId(resultCa);
    expect(modifyEventArgs).toEqual({
        newLotDataItem: settingsC,
        oldLotDataItem: settingsCa,
    });
    
    expect(manager.getLotDataItemWithId(settingsC.id)).toEqual(settingsC);

    result = await manager.asyncModifyLot({
        id: settingsC.id, 
        description: settingsCa.description, 
        lotOriginType: settingsCa.lotOriginType,
    });
    expect(result.newLotDataItem).toEqual(settingsCa);
    expect(result.oldLotDataItem).toEqual(settingsC);


    await expect(manager.asyncModifyLot(
        { id: settingsC.id, pricedItemId: -1, })).rejects.toThrow();


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
