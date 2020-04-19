import * as PI from './PricedItems';
import * as ASTH from './AccountingSystemTestHelpers';
import { Currencies } from '../util/Currency';
import { getDecimalDefinition } from '../util/Quantities';


function testPricedItemDataItem(pricedItem) {
    const dataItem = PI.getPricedItemDataItem(pricedItem);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);

    expect(json).toEqual(dataItem);
    const currencyPricedItemB = PI.getPricedItem(json);
    expect(currencyPricedItemB).toEqual(pricedItem);

    expect(PI.getPricedItemDataItem(dataItem) === dataItem).toBeTruthy();
    expect(PI.getPricedItem(pricedItem) === pricedItem).toBeTruthy();
}


//
//---------------------------------------------------------
//
test('PricedItem-Data Items', () => {
    const currencyPricedItem = {
        id: 123,
        type: PI.PricedItemType.CURRENCY,
        currency: Currencies['JPY'],
        quantityDefinition: getDecimalDefinition(-4),
    };
    testPricedItemDataItem(currencyPricedItem);

    const securityPricedItem = {
        id: 456,
        type: PI.PricedItemType.SECURITY,
        currency: Currencies['USD'],
        quantityDefinition: getDecimalDefinition(-3),
        name: 'Security A',
        description: 'The description of security A',
    };
    testPricedItemDataItem(securityPricedItem);

    const mutualFundPricedItem = {
        id: 456,
        type: PI.PricedItemType.MUTUAL_FUND,
        currency: Currencies['EUR'],
        quantityDefinition: getDecimalDefinition(-2),
        name: 'Mutual Fund A',
        description: 'The description of mutual fund A',
    };
    testPricedItemDataItem(mutualFundPricedItem);

    const realEstatePricedItem = {
        id: 456,
        type: PI.PricedItemType.REAL_ESTATE,
        currency: Currencies['USD'],
        quantityDefinition: getDecimalDefinition(0),
        name: 'Real Estate',
        description: 'The description of real estate',
    };
    testPricedItemDataItem(realEstatePricedItem);

    const propertyPricedItem = {
        id: 456,
        type: PI.PricedItemType.PROPERTY,
        currency: Currencies['USD'],
        quantityDefinition: getDecimalDefinition(0),
        name: 'Property',
        description: 'The description of property',
    };
    testPricedItemDataItem(propertyPricedItem);

});


//
//---------------------------------------------------------
//
test('PricedItemManager-currencies', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem(
        { baseCurrencyCode: 'JPY' });

    const manager = accountingSystem.getPricedItemManager();

    const baseCurrencyPricedItem = manager.getBaseCurrencyPricedItemDataItem();
    expect(baseCurrencyPricedItem.currency).toEqual('JPY');
    expect(baseCurrencyPricedItem.id).toEqual(manager.getBaseCurrencyPricedItemId());
    
    const usdPricedItem = manager.getCurrencyPricedItemDataItem('USD');
    expect(usdPricedItem.currency).toEqual('USD');

    const eurPricedItem = manager.getCurrencyPricedItemDataItem('EUR');
    expect(eurPricedItem.currency).toEqual('EUR');


    // Can't remove the built-in currency priced items...
    await expect(manager.asyncRemovePricedItem(manager.getBaseCurrencyPricedItemId()))
        .rejects.toThrow();
    await expect(manager.asyncRemovePricedItem(usdPricedItem.id))
        .rejects.toThrow();

    // Can't modify standard currency priced items...
    await expect(manager.asyncModifyPricedItem({
        id: eurPricedItem.id,
        currency: 'JPY',
    }))
        .rejects.toThrow();
    
    
    let addEventArg;
    let modifyEventArg;
    let removeEventArg;
    manager.on('pricedItemAdd', (arg) => addEventArg = arg);
    manager.on('pricedItemModify', (arg) => modifyEventArg = arg);
    manager.on('pricedItemRemove', (arg) => removeEventArg = arg);

    // Add.
    let result;
    const quantityDefinitionA = getDecimalDefinition(-3);
    result = await manager.asyncAddCurrencyPricedItem('BMD', 
        { quantityDefinition: quantityDefinitionA });
    let itemA = result.newPricedItemDataItem;
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toEqual(itemA);

    // pricedItemAdd event test
    expect(addEventArg).toEqual({ newPricedItemDataItem: itemA });
    expect(addEventArg.newPricedItemDataItem).toBe(itemA);

    // Make sure the data item returned is a copy.
    itemA = PI.getPricedItemDataItem(itemA, true);
    result.newPricedItemDataItem.type = 'abc';
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toEqual(itemA);

    manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA).type = 1234;
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toEqual(itemA);


    // Undo Add
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(removeEventArg).toEqual(
        { removedPricedItemDataItem: itemA }
    );
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toBeUndefined();

    await manager.asyncAddCurrencyPricedItem('BMD',
        { quantityDefinition: quantityDefinitionA });
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toEqual(itemA);


    const quantityDefinitionB = getDecimalDefinition(-4);
    const itemB = (await manager.asyncAddCurrencyPricedItem('BMD',
        { quantityDefinition: quantityDefinitionB },
        false)).newPricedItemDataItem;
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionB))
        .toEqual(itemB);

    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toEqual(itemA);


    // Modify
    const quantityDefinitionC = getDecimalDefinition(-5);
    result = await manager.asyncModifyPricedItem(
        { id: itemB.id, quantityDefinition: quantityDefinitionC });
    let itemC = result.newPricedItemDataItem;
    let oldItemC = result.oldPricedItemDataItem;
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionB))
        .toBeUndefined();
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toEqual(itemC);

    // pricedItemModify event test
    expect(modifyEventArg).toEqual(
        { newPricedItemDataItem: itemC, oldPricedItemDataItem: oldItemC });
    expect(modifyEventArg.newPricedItemDataItem).toBe(itemC);
    expect(modifyEventArg.oldPricedItemDataItem).toBe(oldItemC);


    itemC = PI.getPricedItemDataItem(itemC, true);
    oldItemC = PI.getPricedItemDataItem(oldItemC, true);

    // Make sure the data items returned are copies.
    result.newPricedItemDataItem.type = 'abc';
    result.oldPricedItemDataItem.type = 'def';
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toEqual(itemC);



    // Undo modify
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(modifyEventArg).toEqual(
        { newPricedItemDataItem: oldItemC, oldPricedItemDataItem: itemC });
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionB))
        .toEqual(itemB);
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toBeUndefined();

    await manager.asyncModifyPricedItem(
        { id: itemB.id, quantityDefinition: quantityDefinitionC });
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionB))
        .toBeUndefined();
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toEqual(itemC);


    // Remove.
    result = await manager.asyncRemovePricedItem(itemA.id);
    let removedA = result.removedPricedItemDataItem;
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toBeUndefined();

    // pricedItemRemove event test
    expect(removeEventArg).toEqual({ removedPricedItemDataItem: removedA });
    expect(removeEventArg.removedPricedItemDataItem).toBe(removedA);

    // Make sure the data item returned is a copy.
    removedA = PI.getPricedItemDataItem(removedA, true);
    result.removedPricedItemDataItem.type = 'zzz';

    // Undo remove
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(addEventArg).toEqual({ newPricedItemDataItem: removedA });
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toEqual(itemC);

    await manager.asyncRemovePricedItem(itemA.id);
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionA))
        .toBeUndefined();


    // Validate remove
    result = await manager.asyncRemovePricedItem(itemC.id, true);
    expect(manager.getCurrencyPricedItemDataItem('BMD', quantityDefinitionC))
        .toEqual(itemC);

});


function expectPricedItemToMatch(pricedItem, ref) {
    pricedItem = PI.getPricedItemDataItem(pricedItem);
    ref = Object.assign({}, PI.getPricedItemDataItem(ref));
    ref.id = pricedItem.id;
    expect(pricedItem).toEqual(ref);
}

//
//---------------------------------------------------------
//
test('PricedItemManager-other types', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem(
        { baseCurrencyCode: 'JPY' });
    const manager = accountingSystem.getPricedItemManager();

    let result;
    
    // The adds....
    const optionsA = { 
        type: PI.PricedItemType.SECURITY, 
        currency: 'USD', 
        quantityDefinition: getDecimalDefinition(-4),
        name: 'A Security',
        description: 'This is a security\'s description',
        ticker: 'ABC',
    };
    const itemA = (await manager.asyncAddPricedItem(optionsA)).newPricedItemDataItem;
    expectPricedItemToMatch(itemA, optionsA);

    
    const optionsB = { type: PI.PricedItemType.MUTUAL_FUND, 
        currency: 'JPY', 
        quantityDefinition: getDecimalDefinition(-3), 
    };
    let itemB = (await manager.asyncAddPricedItem(optionsB)).newPricedItemDataItem;
    expectPricedItemToMatch(itemB, optionsB);

    // Make sure the item returned is a copy.
    result = itemB;
    itemB = PI.getPricedItemDataItem(itemB, true);
    result.type = 'abc';
    expect(manager.getPricedItemDataItemWithId(itemB.id)).toEqual(itemB);

    manager.getPricedItemDataItemWithId(itemB.id).type = 123;
    expect(manager.getPricedItemDataItemWithId(itemB.id)).toEqual(itemB);

    
    const optionsC = { type: PI.PricedItemType.REAL_ESTATE, 
        currency: 'EUR', 
        quantityDefinition: getDecimalDefinition(0), 
    };
    result = await manager.asyncAddPricedItem(optionsC);
    const itemC = result.newPricedItemDataItem;
    expectPricedItemToMatch(itemC, optionsC);

    // Test Undo Add
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(manager.getPricedItemDataItemWithId(itemC.id)).toBeUndefined();

    await manager.asyncAddPricedItem(optionsC);
    expectPricedItemToMatch(manager.getPricedItemDataItemWithId(itemC.id), optionsC);

    
    const optionsD = { type: PI.PricedItemType.PROPERTY, 
        currency: 'USD', 
        quantityDefinition: getDecimalDefinition(0), 
    };
    const itemD = (await manager.asyncAddPricedItem(optionsD)).newPricedItemDataItem;
    expectPricedItemToMatch(itemD, optionsD);
    expect(manager.getPricedItemDataItemWithId(itemD.id)).toEqual(itemD);

    // Validate only
    const itemE = await manager.asyncAddPricedItem(
        { type: PI.PricedItemType.PROPERTY, 
            currency: 'USD', 
            quantityDefinition: getDecimalDefinition(0), 
        }, 
        true);
    expect(itemE).toBeUndefined();


    // Modify
    // Can't change the type.
    await expect(manager.asyncModifyPricedItem(
        { id: itemA.id, type: PI.PricedItemType.PROPERTY })).rejects.toThrow();


    const optionsA1 = Object.assign({}, optionsA);
    delete optionsA1.description;
    const itemA1 = (await manager.asyncModifyPricedItem(
        { id: itemA.id, description: undefined })).newPricedItemDataItem;
    expectPricedItemToMatch(itemA1, optionsA1);

    const changeB1 = { id: itemB.id, 
        currency: 'USD', 
        quantityDefinition: getDecimalDefinition(-4), 
        name: 'A name', 
        description: 'A description', 
    };
    const optionsB1 = Object.assign({}, optionsB, changeB1);
    result = await manager.asyncModifyPricedItem(changeB1);
    const itemB1 = result.newPricedItemDataItem;
    expectPricedItemToMatch(itemB1, optionsB1);

    // We already tested asynModifyPricedItem() returning copies in the currency tests.

    // Undo modify
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expectPricedItemToMatch(manager.getPricedItemDataItemWithId(itemB.id), optionsB);

    await manager.asyncModifyPricedItem(changeB1);
    expectPricedItemToMatch(manager.getPricedItemDataItemWithId(itemB.id), optionsB1);


    // Test JSON
    const handlerA = manager._handler;
    const jsonString = JSON.stringify(handlerA);
    const json = JSON.parse(jsonString);
    const handlerB = new PI.InMemoryPricedItemsHandler();
    handlerB.fromJSON(json);

    expect(handlerB.getIdGeneratorOptions()).toEqual(handlerA.getIdGeneratorOptions());
    expect(handlerB.getBaseOptions()).toEqual(handlerA.getBaseOptions());

    const pricedItemsA = Array.from(handlerA.getPricedItemDataItems()).sort();
    const pricedItemsB = Array.from(handlerB.getPricedItemDataItems()).sort();
    expect(pricedItemsB).toEqual(pricedItemsA);
});
