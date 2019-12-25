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
    const accountingSystem = await ASTH.asyncCreateAccountingSystem({ baseCurrency: 'JPY' });
    expect(accountingSystem.getBaseCurrency()).toEqual('JPY');

    const manager = accountingSystem.getPricedItemManager();
    expect(manager.getBaseCurrency()).toEqual(accountingSystem.getBaseCurrency());

    const baseCurrencyPricedItem = manager.getCurrencyBasePricedItem();
    expect(baseCurrencyPricedItem.currency).toEqual(manager.getBaseCurrency());
    
    expect(manager.getPricedItem(manager.getCurrencyBasePricedItemId())).toEqual(baseCurrencyPricedItem);
    expect(manager.getCurrencyPricedItem(manager.getBaseCurrency())).toEqual(baseCurrencyPricedItem);
    expect(baseCurrencyPricedItem.id).toEqual(manager.getCurrencyBasePricedItemId());

    
    const usdPricedItem = manager.getCurrencyPricedItem('USD');
    expect(usdPricedItem.currency).toEqual('USD');
    expect(usdPricedItem).toEqual(manager.getCurrencyUSDPricedItem());
    expect(usdPricedItem.id).toEqual(manager.getCurrencyUSDPricedItemId());

    const eurPricedItem = manager.getCurrencyPricedItem('EUR');
    expect(eurPricedItem.currency).toEqual('EUR');
    expect(eurPricedItem).toEqual(manager.getCurrencyEURPricedItem());
    expect(eurPricedItem.id).toEqual(manager.getCurrencyEURPricedItemId());


    // Can't remove the built-in currency priced items...
    await expect(manager.asyncRemovePricedItem(manager.getCurrencyBasePricedItemId())).rejects.toThrow();
    await expect(manager.asyncRemovePricedItem(manager.getCurrencyUSDPricedItemId())).rejects.toThrow();
    await expect(manager.asyncRemovePricedItem(manager.getCurrencyEURPricedItemId())).rejects.toThrow();


    // Add.
    const itemA = await manager.asyncAddCurrencyPricedItem('BMD');
    expect(manager.getCurrencyPricedItem('BMD')).toEqual(itemA);

    const quantityDefinitionB = getDecimalDefinition(-4);
    const itemB = await manager.asyncAddCurrencyPricedItem('BMD', false, { quantityDefinition: quantityDefinitionB });
    expect(manager.getCurrencyPricedItem('BMD', quantityDefinitionB)).toEqual(itemB);

    expect(manager.getCurrencyPricedItem('BMD')).toEqual(itemA);

    // Modify
    const quantityDefinitionC = getDecimalDefinition(-5);
    const itemC = await manager.asyncModifyPricedItem({ id: itemB.id, quantityDefinition: quantityDefinitionC });
    expect(manager.getCurrencyPricedItem('BMD', quantityDefinitionB)).toBeUndefined();
    expect(manager.getCurrencyPricedItem('BMD', quantityDefinitionC)).toEqual(itemC);

    // Remove.
    await manager.asyncRemovePricedItem(itemA.id);
    expect(manager.getCurrencyPricedItem('BMD')).toBeUndefined();

    await manager.asyncRemovePricedItem(itemC.id, true);
    expect(manager.getCurrencyPricedItem('BMD', quantityDefinitionC)).toEqual(itemC);

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
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const manager = accountingSystem.getPricedItemManager();
    
    // The adds....
    const optionsA = { 
        type: PI.PricedItemType.SECURITY, 
        currency: 'USD', 
        quantityDefinition: getDecimalDefinition(-4),
        name: 'A Security',
        description: 'This is a security\'s description',
        ticker: 'ABC',
    };
    const itemA = await manager.asyncAddPricedItem(optionsA);
    expectPricedItemToMatch(itemA, optionsA);

    
    const optionsB = { type: PI.PricedItemType.MUTUAL_FUND, currency: 'JPY', quantityDefinition: getDecimalDefinition(-3), };
    const itemB = await manager.asyncAddPricedItem(optionsB);
    expectPricedItemToMatch(itemB, optionsB);

    
    const optionsC = { type: PI.PricedItemType.REAL_ESTATE, currency: 'EUR', quantityDefinition: getDecimalDefinition(0), };
    const itemC = await manager.asyncAddPricedItem(optionsC);
    expectPricedItemToMatch(itemC, optionsC);

    
    const optionsD = { type: PI.PricedItemType.PROPERTY, currency: 'USD', quantityDefinition: getDecimalDefinition(0), };
    const itemD = await manager.asyncAddPricedItem(optionsD);
    expectPricedItemToMatch(itemD, optionsD);
    expect(manager.getPricedItem(itemD.id)).toEqual(itemD);

    // Validate only
    const itemE = await manager.asyncAddPricedItem({ type: PI.PricedItemType.PROPERTY, currency: 'USD', quantityDefinition: getDecimalDefinition(0), }, true);
    expect(itemE).toBeUndefined();


    // Modify
    // Can't change the type.
    await expect(manager.asyncModifyPricedItem({ id: itemA.id, type: PI.PricedItemType.PROPERTY })).rejects.toThrow();


    const optionsA1 = Object.assign({}, optionsA);
    delete optionsA1.description;
    const itemA1 = await manager.asyncModifyPricedItem({ id: itemA.id, description: undefined });
    expectPricedItemToMatch(itemA1, optionsA1);

    const changeB1 = { id: itemB.id, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'A name', description: 'A description', };
    const optionsB1 = Object.assign({}, optionsB, changeB1);
    const itemB1 = await manager.asyncModifyPricedItem(changeB1);
    expectPricedItemToMatch(itemB1, optionsB1);
});
