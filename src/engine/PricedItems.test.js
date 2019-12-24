import * as PI from './PricedItems';
import { AccountingSystem } from './AccountingSystem';
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
test('PricedItemManager-currencies', () => {
    const accountingSystem = new AccountingSystem({ baseCurrency: 'JPY' });
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
});
