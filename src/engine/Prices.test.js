import * as P from './Prices';
import { YMDDate } from '../util/YMDDate';
import * as ASTH from './AccountingSystemTestHelpers';


function testPriceDataItem(price) {
    const dataItem = P.getPriceDataItem(price);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);

    expect(json).toEqual(dataItem);
    const currencyPricedItemB = P.getPrice(json);
    expect(currencyPricedItemB).toEqual(price);

    expect(P.getPriceDataItem(dataItem) === dataItem).toBeTruthy();
    expect(P.getPrice(price) === price).toBeTruthy();
}



//
//---------------------------------------------------------
//
test('Prices-DataItems', () => {
    testPriceDataItem({
        ymdDate: new YMDDate('2019-04-05'),
        close: 123.45,
        open: 100.23
    });
});


//
//---------------------------------------------------------
//
test('Prices-InMemoryPricesHandler', async () => {
    const handler = new P.InMemoryPricesHandler();

    expect(await handler.asyncGetPriceDateRange(1)).toBeUndefined();
    expect(await handler.asyncGetPriceDataItemsInDateRange(1)).toEqual([]);

    const refA = [{ ymdDate: '2018-03-04', close: 12.34, }];
    const pricesA = await handler.asyncAddPriceDataItems(1, refA);
    expect(pricesA).toEqual(refA);

    const refB = [
        { ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-11-22', close: 98.76, },
    ];
    const pricesB = await handler.asyncAddPriceDataItems(1, refB);
    expect(pricesB).toEqual(refB);

    const refC = [
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ];
    const pricesC = await handler.asyncAddPriceDataItems(1, refC);
    expect(pricesC).toEqual(refC);

    expect(await handler.asyncGetPriceDateRange(1)).toEqual([
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    ]);


    const refD2 = [
        { ymdDate: '2018-03-04', close: 9.87, },
        { ymdDate: '2018-12-21', close: 65.43, },
    ];
    const pricesD2 = await handler.asyncAddPriceDataItems(2, refD2);
    expect(pricesD2).toEqual(refD2);


    // PriceDataItem #1 prices are now:
    // { ymdDate: '2018-03-04', close: 45.67, },
    // { ymdDate: '2018-10-11', close: 23.45, },
    // { ymdDate: '2018-11-22', close: 98.76, },
    // { ymdDate: '2018-12-21', close: 11.11, },

    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-03'), new YMDDate('2018-03-03'))).toEqual([]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-03'), new YMDDate('2018-03-04'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
    ]);

    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-10-10'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
    ]);

    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-10-11'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-10-11', close: 23.45, },
    ]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-11-22', close: 98.76, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-12-21'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-12-22'), new YMDDate('2018-12-23'))).toEqual([]);

    // PricedDataItem #2 prices are now:
    // { ymdDate: '2018-03-04', close: 9.87, },
    // { ymdDate: '2018-12-21', close: 65.43, },
    expect(await handler.asyncGetPriceDataItemsInDateRange(2, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 9.87, },
        { ymdDate: '2018-12-21', close: 65.43, },
    ]);


    expect(await handler.asyncRemovePricesInDateRange(1, 
        new YMDDate('2018-11-22'), new YMDDate('2018-12-21'))).toEqual([
        { ymdDate: '2018-11-22', close: 98.76, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-10-11', close: 23.45, },
    ]);
});



//
//---------------------------------------------------------
//
test('PriceManager', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const manager = accountingSystem.getPriceManager();

    expect(await manager.asyncGetPriceDateRange(1, '2019-01-02')).toBeUndefined();
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2019-01-02', '2019-01-03')).toEqual([]);

    let result;

    // Single price passed in.
    const priceDataItemA = { ymdDate: '2018-01-23', close: 123.456 };
    expect((await manager.asyncAddPrices(1, priceDataItemA))
        .newPriceDataItems).toEqual([priceDataItemA]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-01-23'))
        .toEqual([priceDataItemA]);


    let addEventArg;
    let removeEventArg;
    manager.on('pricesAdd', (arg) => addEventArg = arg);
    manager.on('pricesRemove', (arg) => removeEventArg = arg);

    // Mixed array of price data items.
    const priceDataItemsB = [
        { ymdDate: '2018-12-23', close: 1234.56 },
        { ymdDate: '2018-12-21', close: 12.21 },
        { ymdDate: '2018-12-24', close: 123.32},
    ];
    result = await manager.asyncAddPrices(1, priceDataItemsB);
    const pricesB = result.newPriceDataItems;
    expect(pricesB).toEqual(priceDataItemsB);

    // Test pricesAdd event
    expect(addEventArg).toEqual({ newPriceDataItems: pricesB });
    expect(addEventArg.newPriceDataItems).toEqual(pricesB);

    // Test undo add
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(removeEventArg.removedPriceDataItems).toEqual(
        expect.arrayContaining(pricesB));

    expect(await manager.asyncGetPriceDataItemsInDateRange('2018-12-21', '2018-12-24'))
        .toEqual([]);

    await manager.asyncAddPrices(1, priceDataItemsB);
    for (let i = 0; i < priceDataItemsB.length; ++i) {
        expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
            priceDataItemsB[i].ymdDate, priceDataItemsB[i].ymdDate))
            .toEqual([priceDataItemsB[i]]);
    }


    // Mixed array of price items.
    const pricesC = [
        P.getPrice({ ymdDate: '2017-04-05', close: 98.75, open: 87.65, }),
        P.getPrice({ ymdDate: '2018-04-05', close: 89.98, open: 98.89, }),
        P.getPrice({ ymdDate: '2018-04-06', close: 91.09, open: 89.98, }),
        P.getPrice({ ymdDate: '2018-04-07', close: 91.19, open: 89.91, }),
    ];
    const priceDataItemsC = pricesC.map((price) => P.getPriceDataItem(price));
    expect((await manager.asyncAddPrices(1, pricesC)).newPriceDataItems)
        .toEqual(priceDataItemsC);

    // Replace a price.
    const priceDataItemD = { ymdDate: '2018-12-21', close: 123.45 };
    result = await manager.asyncAddPrices(1, priceDataItemD);
    expect(result.newPriceDataItems).toEqual([priceDataItemD]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-12-21'))
        .toEqual([priceDataItemD]);

    // Undo price replacement.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-12-21'))
        .toEqual([priceDataItemsB[1]]);

    await manager.asyncAddPrices(1, priceDataItemD);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-12-21'))
        .toEqual([priceDataItemD]);


    // Add some prices for another priced item.
    const priceDataItemsE2 = [
        { ymdDate: '2018-12-23', close: 98.76 },
        { ymdDate: '2018-12-21', close: 87.65 },
        { ymdDate: '2018-12-24', close: 76.54 },
        { ymdDate: '2018-01-23', close: 123.45 },
        { ymdDate: '2018-01-24', close: 124.45 },
        { ymdDate: '2018-01-25', close: 125.45 },
        { ymdDate: '2018-01-26', close: 126.45 },
    ];
    expect((await manager.asyncAddPrices(2, priceDataItemsE2)).newPriceDataItems)
        .toEqual(priceDataItemsE2);


    // Prices for priced item 1 are:
    //  { ymdDate: '2017-04-05', close: 98.75, open: 87.65, },
    //  { ymdDate: '2018-01-23', close: 123.456 }
    //  { ymdDate: '2018-04-05', close: 89.98, open: 98.89, },
    //  { ymdDate: '2018-04-06', close: 91.09, open: 89.98, },
    //  { ymdDate: '2018-04-07', close: 91.19, open: 89.91, },
    //  { ymdDate: '2018-12-21', close: 123.45 }
    //  { ymdDate: '2018-12-23', close: 1234.56 },
    //  { ymdDate: '2018-12-24', close: 123.32},
    expect(await manager.asyncGetPriceDateRange(1))
        .toEqual([ new YMDDate('2017-04-05'), new YMDDate('2018-12-24')]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2017-04-04', '2017-04-03')).toEqual([]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2017-04-05')).toEqual([{ ymdDate: '2017-04-05', close: 98.75, open: 87.65, }]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2017-04-06', '2018-01-22')).toEqual([]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2018-01-24', '2018-01-22'))
        .toEqual([ { ymdDate: '2018-01-23', close: 123.456 } ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2018-04-07', '2018-04-08'))
        .toEqual([ { ymdDate: '2018-04-07', close: 91.19, open: 89.91, } ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, 
        '2018-12-21', '2018-12-24')).toEqual([
        { ymdDate: '2018-12-21', close: 123.45 },
        { ymdDate: '2018-12-23', close: 1234.56 },
        { ymdDate: '2018-12-24', close: 123.32},
    ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-12-25')).toEqual([]);

    //
    // On or before
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2017-04-04')).toBeUndefined();
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2017-04-05')).toEqual({ ymdDate: '2017-04-05', close: 98.75, open: 87.65, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2018-04-06')).toEqual({ ymdDate: '2018-04-06', close: 91.09, open: 89.98, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2018-04-07')).toEqual({ ymdDate: '2018-04-07', close: 91.19, open: 89.91, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2018-04-08')).toEqual({ ymdDate: '2018-04-07', close: 91.19, open: 89.91, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2018-12-24')).toEqual({ ymdDate: '2018-12-24', close: 123.32});
    expect(await manager.asyncGetPriceDataItemOnOrClosestBefore(1, 
        '2018-12-25')).toEqual({ ymdDate: '2018-12-24', close: 123.32});


    //
    // On or after
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2017-04-04')).toEqual({ ymdDate: '2017-04-05', close: 98.75, open: 87.65, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2017-04-05')).toEqual({ ymdDate: '2017-04-05', close: 98.75, open: 87.65, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2018-04-06')).toEqual({ ymdDate: '2018-04-06', close: 91.09, open: 89.98, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2018-04-07')).toEqual({ ymdDate: '2018-04-07', close: 91.19, open: 89.91, });
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2018-04-08')).toEqual({ ymdDate: '2018-12-21', close: 123.45 });
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2018-12-24')).toEqual({ ymdDate: '2018-12-24', close: 123.32});
    expect(await manager.asyncGetPriceDataItemOnOrClosestAfter(1, 
        '2018-12-25')).toBeUndefined();


    // Prices for priced item 2 are:
    //  { ymdDate: '2018-01-23', close: 123.45 },
    //  { ymdDate: '2018-01-24', close: 124.45 },
    //  { ymdDate: '2018-01-25', close: 125.45 },
    //  { ymdDate: '2018-01-26', close: 126.45 },
    //  { ymdDate: '2018-12-21', close: 87.65 },
    //  { ymdDate: '2018-12-23', close: 98.76 },
    //  { ymdDate: '2018-12-24', close: 76.54 },
    expect(await manager.asyncGetPriceDataItemsInDateRange(2, 
        '2018-01-26', '2018-12-21')).toEqual([
        { ymdDate: '2018-01-26', close: 126.45 },
        { ymdDate: '2018-12-21', close: 87.65 },
    ]);


    // Delete:
    result = await manager.asyncRemovePricesInDateRange(1, '2018-12-23'); 
    expect(result.removedPriceDataItems)
        .toEqual([{ ymdDate: '2018-12-23', close: 1234.56 }, ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-12-23')).toEqual([]);

    result = await manager.asyncRemovePricesInDateRange(2, '2018-01-24', '2018-01-22');
    const removeResult = result.removedPriceDataItems;
    expect(removeResult).toEqual([
        { ymdDate: '2018-01-23', close: 123.45 },
        { ymdDate: '2018-01-24', close: 124.45 },
    ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(2, 
        '2018-01-24', '2018-01-22')).toEqual([]);

    // pricesRemove event test
    expect(removeEventArg).toEqual({ removedPriceDataItems: removeResult });
    expect(removeEventArg.removedPriceDataItems).toBe(removeResult);

    // Undo delete.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(addEventArg.newPriceDataItems)
        .toEqual(expect.arrayContaining(removeResult));
    expect(await manager.asyncGetPriceDataItemsInDateRange(2, 
        '2018-01-24', '2018-01-22')).toEqual([
        { ymdDate: '2018-01-23', close: 123.45 },
        { ymdDate: '2018-01-24', close: 124.45 },
    ]);

    await manager.asyncRemovePricesInDateRange(2, '2018-01-24', '2018-01-22');
    expect(await manager.asyncGetPriceDataItemsInDateRange(2, 
        '2018-01-24', '2018-01-22')).toEqual([]);


    expect((await manager.asyncRemovePricesInDateRange(2, '2018-12-24'))
        .removedPriceDataItems).toEqual([ { ymdDate: '2018-12-24', close: 76.54 }, ]);
    expect((await manager.asyncRemovePricesInDateRange(2, '2018-12-24'))
        .removedPriceDataItems).toEqual([]);

    expect(await manager.asyncGetPriceDateRange(2))
        .toEqual([new YMDDate('2018-01-25'), new YMDDate('2018-12-23')]);


    //
    // Test JSON:
    const handlerA = manager._handler;
    const jsonString = JSON.stringify(handlerA);
    const json = JSON.parse(jsonString);

    const handlerB = new P.InMemoryPricesHandler();
    expect(handlerB._sortedPricesByPricedItemId)
        .not.toEqual(handlerA._sortedPricesByPricedItemId);

    handlerB.fromJSON(json);

    const itemsA = Array.from(handlerA._sortedPricesByPricedItemId.entries())
        .sort((a, b) => a[0] - b[0]);
    const itemsB = Array.from(handlerB._sortedPricesByPricedItemId.entries())
        .sort((a, b) => a[0] - b[0]);

    // expect.toEqual() doesn't like comparing SortedArrays...
    itemsA.forEach((pair) => {
        pair[1] = pair[1].toJSON();
    });
    itemsB.forEach((pair) => {
        pair[1] = pair[1].toJSON();
    });

    expect(itemsB).toEqual(itemsA);
});
