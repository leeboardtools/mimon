import * as PI from './PricedItems';
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
