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
test('Prices-InMemoryPricesHandler Prices', async () => {
    const handler = new P.InMemoryPricesHandler();

    expect(await handler.asyncGetPriceDateRange(1)).toBeUndefined();
    expect(await handler.asyncGetPriceDataItemsInDateRange(1)).toEqual([]);

    const refA = [{ ymdDate: '2018-03-04', close: 12.34, }];
    const pricesA = await handler.asyncAddPriceDataItems(1, refA);
    expect(pricesA.newPriceDataItems).toEqual(refA);

    const refB = [
        { ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-11-22', close: 98.76, },
    ];
    const pricesB = await handler.asyncAddPriceDataItems(1, refB);
    expect(pricesB.newPriceDataItems).toEqual(refB);

    const refC = [
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ];
    const pricesC = await handler.asyncAddPriceDataItems(1, refC);
    expect(pricesC.newPriceDataItems).toEqual(refC);

    expect(await handler.asyncGetPriceDateRange(1)).toEqual([
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    ]);


    const refD2 = [
        { ymdDate: '2018-03-04', close: 9.87, },
        { ymdDate: '2018-12-21', close: 65.43, },
    ];
    const pricesD2 = await handler.asyncAddPriceDataItems(2, refD2);
    expect(pricesD2.newPriceDataItems).toEqual(refD2);


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


    let result;
    result = await handler.asyncRemovePricesInDateRange(1, 
        new YMDDate('2018-11-22'), new YMDDate('2018-12-21'));
    expect(result.removedPriceDataItems).toEqual([
        { ymdDate: '2018-11-22', close: 98.76, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);
    const removeResultA = result;

    result = await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true);
    expect(result).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-10-11', close: 23.45, },
    ]);

    // Undo above
    await handler.asyncAddPriceDataItems(1,
        removeResultA.removedPriceDataItems,
        removeResultA.removedPriceMultiplierDataItems,
    );
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        { ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-11-22', close: 98.76, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);

    result = await handler.asyncRemovePricesByDate(1,
        ['2018=10-11', '2018-12-21', '2018-12-22']);
    expect(result.removedPriceDataItems).toEqual([
        { ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-12-21', close: 11.11, },
    ]);
    expect(await handler.asyncGetPriceDataItemsInDateRange(1, 
        new YMDDate('2018-03-04'), new YMDDate('2018-12-21'), true)).toEqual([
        { ymdDate: '2018-03-04', close: 45.67, },
        //{ ymdDate: '2018-10-11', close: 23.45, },
        { ymdDate: '2018-11-22', close: 98.76, },
        //{ ymdDate: '2018-12-21', close: 11.11, },
    ]);
});


//
//---------------------------------------------------------
//
test('Prices-InMemoryPricesHandler PriceMultipliers', async () => {
    const handler = new P.InMemoryPricesHandler();

    let result;

    expect(await handler.asyncGetPriceMultiplierDateRange(1)).toBeUndefined();
    expect(await handler.asyncGetPriceMultiplierDataItemsInDateRange(1)).toEqual([]);


    const refA = [{ ymdDate: '2018-03-04', sharesIn: 1, sharesOut: 2, }];
    const multipliersA = await handler.asyncAddPriceDataItems(1, [], refA);
    expect(multipliersA.newPriceMultiplierDataItems).toEqual(refA);

    expect(await handler.asyncGetPriceMultiplierDateRange(1)).toEqual([
        new YMDDate('2018-03-04'),
        new YMDDate('2018-03-04'),
    ]);

    result = await handler.asyncGetPriceMultiplierDataItemsInDateRange(1, 
        new YMDDate('2018-03-02'), new YMDDate('2018-03-02'));
    expect(result).toEqual([]);

    result = await handler.asyncGetPriceMultiplierDataItemsInDateRange(1, 
        new YMDDate('2018-03-05'), new YMDDate('2018-03-05'));
    expect(result).toEqual([]);

    result = await handler.asyncGetPriceMultiplierDataItemsInDateRange(1, 
        new YMDDate('2018-03-02'), new YMDDate('2018-03-04'));
    expect(result).toEqual(refA);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-03-03'));
    expect(result).toBeUndefined();

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-03-04'));
    expect(result).toEqual(refA[0]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-03-05'));
    expect(result).toBeUndefined();

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-03-04'));
    expect(result).toEqual(refA[0]);



    const refB = [
        { ymdDate: '2018-10-11', sharesIn: 2, sharesOut: 3, },
        { ymdDate: '2018-11-22', sharesIn: 3, sharesOut: 4, },
    ];
    const multipliersB = await handler.asyncAddPriceDataItems(1, [], refB);
    expect(multipliersB.newPriceMultiplierDataItems).toEqual(refB);

    const refC = [
        { ymdDate: '2018-03-04', sharesIn: 4, sharesOut: 5, },
        { ymdDate: '2018-12-21', sharesIn: 5, sharesOut: 6, },
    ];
    const multipliersC = await handler.asyncAddPriceDataItems(1, [], refC);
    expect(multipliersC.newPriceDataItems).toEqual([]);
    expect(multipliersC.newPriceMultiplierDataItems).toEqual(refC);


    // Different priced item id...
    const refD_2 = [
        { ymdDate: '2018-10-11', sharesIn: 7, sharesOut: 8, },
        { ymdDate: '2018-11-22', sharesIn: 9, sharesOut: 10, },
    ];
    const multipliersD_2 = await handler.asyncAddPriceDataItems(2, [], refD_2);
    expect(multipliersD_2.newPriceDataItems).toEqual([]);
    expect(multipliersD_2.newPriceMultiplierDataItems).toEqual(refD_2);

    expect(await handler.asyncGetPriceMultiplierDateRange(1)).toEqual([
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    ]);

    expect(await handler.asyncGetPriceMultiplierDateRange(2)).toEqual([
        new YMDDate('2018-10-11'),
        new YMDDate('2018-11-22'),
    ]);

    result = await handler.asyncGetPriceMultiplierDataItemsInDateRange(2,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'));
    expect(result.length).toEqual(2);
    expect(result).toEqual(
        expect.arrayContaining(refD_2)
    );


    // Now have:
    // Priced Item Id #1
    //  { ymdDate: '2018-03-04', sharesIn: 4, sharesOut: 5, }, refC[0]
    //  { ymdDate: '2018-10-11', sharesIn: 2, sharesOut: 3, }, refB[0]
    //  { ymdDate: '2018-11-22', sharesIn: 3, sharesOut: 4, }, refB[1]
    //  { ymdDate: '2018-12-21', sharesIn: 5, sharesOut: 6, }, refC[1]
    //
    // Priced item id #2
    //  { ymdDate: '2018-10-11', sharesIn: 7, sharesOut: 8, }, refD_2[0]
    //  { ymdDate: '2018-11-22', sharesIn: 9, sharesOut: 10, }, refD_2[1]
    expect(await handler.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-03-04'),
    )).toEqual([ refC[0] ]);

    result = await handler.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-03-05'),
        new YMDDate('2018-12-20')
    );
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        refB[0],
        refB[1],
    ]));

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-03-03'));
    expect(result).toBeUndefined();

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-03-04'));
    expect(result).toEqual(refC[0]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-10-10'));
    expect(result).toEqual(refC[0]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        new YMDDate('2018-10-11'));
    expect(result).toEqual(refB[0]);


    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-12-22'));
    expect(result).toBeUndefined();

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-12-21'));
    expect(result).toEqual(refC[1]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-12-20'));
    expect(result).toEqual(refC[1]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-11-23'));
    expect(result).toEqual(refC[1]);

    result = await handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        new YMDDate('2018-11-22'));
    expect(result).toEqual(refB[1]);


    //  { ymdDate: '2018-03-04', sharesIn: 4, sharesOut: 5, }, refC[0]
    //  { ymdDate: '2018-10-11', sharesIn: 2, sharesOut: 3, }, refB[0]
    //  { ymdDate: '2018-11-22', sharesIn: 3, sharesOut: 4, }, refB[1]
    //  { ymdDate: '2018-12-21', sharesIn: 5, sharesOut: 6, }, refC[1]
    result = await handler.asyncRemovePriceMultipliersByDate(1, [
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    ]);
    expect(result.removedPriceMultiplierDataItems).toEqual(
        expect.arrayContaining([
            refC[0],
            refC[1]
        ])
    );

    expect(await handler.asyncGetPriceMultiplierDateRange(1)).toEqual([
        new YMDDate('2018-10-11'),
        new YMDDate('2018-11-22'),
    ]);
    expect(await handler.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-03-04'),
    )).toEqual([]);

    expect(await handler.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-12-21'),
        new YMDDate('2018-12-21'),
    )).toEqual([]);

    expect(await handler.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    )).toEqual([ refB[0], refB[1]]);


    const json = handler.toJSON();
    const handler2 = new P.InMemoryPricesHandler();
    handler2.fromJSON(json);

    expect(await handler2.asyncGetPriceMultiplierDateRange(1)).toEqual([
        new YMDDate('2018-10-11'),
        new YMDDate('2018-11-22'),
    ]);
    expect(await handler2.asyncGetPriceMultiplierDataItemsInDateRange(1,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'),
    )).toEqual([ refB[0], refB[1]]);

    expect(await handler2.asyncGetPriceMultiplierDateRange(2)).toEqual([
        new YMDDate('2018-10-11'),
        new YMDDate('2018-11-22'),
    ]);

    result = await handler2.asyncGetPriceMultiplierDataItemsInDateRange(2,
        new YMDDate('2018-03-04'),
        new YMDDate('2018-12-21'));
    expect(result.length).toEqual(2);
    expect(result).toEqual(
        expect.arrayContaining(refD_2)
    );
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
    result = await manager.asyncAddPrices(1, priceDataItemA);
    expect(result.newPriceDataItems).toEqual([priceDataItemA]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-01-23'))
        .toEqual([priceDataItemA]);
    
    // Make sure data item returned is a copy.
    result.newPriceDataItems[0].ymdDate = 'abc';
    expect(await manager.asyncGetPriceDataItemsInDateRange(1, '2018-01-23'))
        .toEqual([priceDataItemA]);

    result = await manager.asyncGetPriceDataItemsInDateRange(1, '2018-01-23');
    result[0].ymdDate = 'abc';
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
    expect(addEventArg).toEqual({ 
        newPriceDataItems: pricesB, 
        newPriceMultiplierDataItems: [],
    });


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
    
    // Test data item returned is a copy.
    result.newPriceDataItems[0].ymdDate = 1234;
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
    let removeResult = result.removedPriceDataItems;
    expect(removeResult).toEqual([
        { ymdDate: '2018-01-23', close: 123.45 },
        { ymdDate: '2018-01-24', close: 124.45 },
    ]);
    expect(await manager.asyncGetPriceDataItemsInDateRange(2, 
        '2018-01-24', '2018-01-22')).toEqual([]);

    // pricesRemove event test
    expect(removeEventArg).toEqual({ 
        removedPriceDataItems: removeResult,
        removedPriceMultiplierDataItems: [],
    });

    const oldRemoveResult = removeResult;
    removeResult = removeResult.map(
        (priceDataItem) => P.getPriceDataItem(priceDataItem, true));
    oldRemoveResult[0].ymdDate = 'abc';
    oldRemoveResult[1].close = 'xyz';

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


//
//---------------------------------------------------------
//
test('PriceManager-PriceMultipliers', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const manager = accountingSystem.getPriceManager();

    let result;
    result = await manager.asyncGetPriceMultiplierDateRange(1);
    expect(result).toBeUndefined();

    const split_2_1_2005_02_28 = { ymdDate: '2005-02-28', newCount: 2, oldCount: 1, };
    const pricesA = [
        { ymdDate: '2005-02-04', close: 1.41 * 2 * 7 * 4, },
        { ymdDate: '2005-02-11', close: 1.45 * 2 * 7 * 4, },
        { ymdDate: '2005-02-18', close: 1.55 * 2 * 7 * 4, },
        { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
        // 2 for 1 split...
        split_2_1_2005_02_28,

        { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
        { ymdDate: '2005-03-04', close: 1.53 * 7 * 4, },
        { ymdDate: '2005-03-11', close: 1.44 * 7 * 4, },
    ];

    result = await manager.asyncAddPrices(1, pricesA);

    expect(result.newPriceDataItems).toEqual(expect.arrayContaining([
        { ymdDate: '2005-02-04', close: 1.41 * 2 * 7 * 4, },
        { ymdDate: '2005-02-11', close: 1.45 * 2 * 7 * 4, },
        { ymdDate: '2005-02-18', close: 1.55 * 2 * 7 * 4, },
        { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },

        { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
        { ymdDate: '2005-03-04', close: 1.53 * 7 * 4, },
        { ymdDate: '2005-03-11', close: 1.44 * 7 * 4, },
    ]));

    expect(result.newPriceMultiplierDataItems).toEqual(expect.arrayContaining([
        split_2_1_2005_02_28,
    ]));

    result = await manager.asyncGetPriceMultiplierDateRange(1);
    expect(result).toEqual([
        new YMDDate('2005-02-28'),
        new YMDDate('2005-02-28'),
    ]);

    result = await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2005-02-28');
    expect(result).toEqual([
        split_2_1_2005_02_28,
    ]);

    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        '2005-02-27');
    expect(result).toBeUndefined();

    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        '2005-02-28');
    expect(result).toEqual(split_2_1_2005_02_28);

    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestBefore(1,
        '2005-03-01');
    expect(result).toEqual(split_2_1_2005_02_28);
    


    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        '2005-02-27');
    expect(result).toEqual(split_2_1_2005_02_28);

    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        '2005-02-28');
    expect(result).toEqual(split_2_1_2005_02_28);

    result = await manager.asyncGetPriceMultiplierDataItemOnOrClosestAfter(1,
        '2005-03-01');
    expect(result).toBeUndefined();


    const split_7_1_2014_06_09 = { ymdDate: '2014-06-09', newCount: 7, oldCount: 1};
    const split_4_1_2020_08_31 = { ymdDate: '2020-08-31', newCount: 4, oldCount: 1};

    const pricesB = [
        { ymdDate: '2014-06-04', close: 23.03 * 7 * 4, },
        { ymdDate: '2014-06-05', close: 23.12 * 7 * 4, },
        { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },

        // 7 for 1 split...
        split_7_1_2014_06_09,

        { ymdDate: '2014-06-09', close: 23.42 * 4, },
        { ymdDate: '2014-06-10', close: 23.56 * 4, },
        { ymdDate: '2014-06-13', close: 22.82 * 4, },
        { ymdDate: '2014-06-20', close: 22.73 * 4, },

        { ymdDate: '2020-01-24', close: 79.58 * 4, },
        { ymdDate: '2020-01-31', close: 77.38 * 4, },
        { ymdDate: '2020-02-04', close: 79.71 * 4, },

        // 4 for 1 split...
        split_4_1_2020_08_31,

        { ymdDate: '2020-08-31', close: 129.04, },
    ];

    result = await manager.asyncAddPrices(1, pricesB);
    expect(result.newPriceMultiplierDataItems).toEqual([
        split_7_1_2014_06_09,
        split_4_1_2020_08_31
    ]);

    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2014-06-09', '2020-08-31')).toEqual([
        split_7_1_2014_06_09,
        split_4_1_2020_08_31
    ]);

    // Check add undo...
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);

    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2014-06-09', '2020-08-31')).toEqual([
    ]);

    // Repeat...
    result = await manager.asyncAddPrices(1, pricesB);
    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2014-06-09', '2020-08-31')).toEqual([
        split_7_1_2014_06_09,
        split_4_1_2020_08_31
    ]);


    // Check remove
    result = await manager.asyncRemovePricesInDateRange(1,
        '2020-08-31', '2020-08-31', {
            noPrices: true,
        });
    expect(result.removedPriceDataItems).toEqual([]);
    expect(result.removedPriceMultiplierDataItems).toEqual([
        split_4_1_2020_08_31
    ]);
    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2020-08-31')).toEqual([]);
    
    // Check remove undo...
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2020-08-31')).toEqual([
        split_4_1_2020_08_31
    ]);

    // Repeat...
    result = await manager.asyncRemovePricesInDateRange(1,
        '2020-08-31', '2020-08-31', {
            noPrices: true,
        });
    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2020-08-31')).toEqual([]);


    // Add price multipliers separately from prices...
    result = await manager.asyncAddPrices(1, [], [split_4_1_2020_08_31]);
    expect(result.newPriceDataItems).toEqual([]);
    expect(result.newPriceMultiplierDataItems).toEqual([split_4_1_2020_08_31]);

    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2020-08-31')).toEqual([split_4_1_2020_08_31]);

    expect(await manager.asyncGetPriceMultiplierDataItemsInDateRange(1,
        '2014-06-09', '2020-08-31')).toEqual([
        split_7_1_2014_06_09,
        split_4_1_2020_08_31,
    ]);



    //
    // Test price adjustments...

    // We now have:
    /*
        { ymdDate: '2005-02-04', close: 1.41 * 2 * 7 * 4, },
        { ymdDate: '2005-02-11', close: 1.45 * 2 * 7 * 4, },
        { ymdDate: '2005-02-18', close: 1.55 * 2 * 7 * 4, },
        { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
        // 2 for 1 split...
        split_2_1_2005_02_28,

        { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
        { ymdDate: '2005-03-04', close: 1.53 * 7 * 4, },
        { ymdDate: '2005-03-11', close: 1.44 * 7 * 4, },
        { ymdDate: '2014-06-04', close: 23.03 * 7 * 4, },
        { ymdDate: '2014-06-05', close: 23.12 * 7 * 4, },
        { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },

        // 7 for 1 split...
        split_7_1_2014_06_09,

        { ymdDate: '2014-06-09', close: 23.42 * 4, },
        { ymdDate: '2014-06-10', close: 23.56 * 4, },
        { ymdDate: '2014-06-13', close: 22.82 * 4, },
        { ymdDate: '2014-06-20', close: 22.73 * 4, },

        { ymdDate: '2020-01-24', close: 79.58 * 4, },
        { ymdDate: '2020-01-31', close: 77.38 * 4, },
        { ymdDate: '2020-02-04', close: 79.71 * 4, },

        // 4 for 1 split...
        split_4_1_2020_08_31,

        { ymdDate: '2020-08-31', close: 129.04, },
    */    
    
    result = await manager.asyncAdjustPriceDataItems(1,
        [],
        '2020-08-31');
    expect(result).toEqual([]);

    result = await manager.asyncAdjustPriceDataItems(1,
        { ymdDate: '2020-08-31', close: 129.04, },
        '2020-08-31');
    expect(result).toEqual({ ymdDate: '2020-08-31', close: 129.04, });

    result = await manager.asyncAdjustPriceDataItems(1,
        { ymdDate: '2020-02-04', close: 79.71 * 4, },
        '2020-08-31');
    expect(result).toEqual( 
        { ymdDate: '2020-02-04', close: 79.71, }
    );


    result = await manager.asyncAdjustPriceDataItems(1,
        [
            { ymdDate: '2020-08-31', close: 129.04, },
            { ymdDate: '2014-06-09', close: 23.42 * 4, },
            { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },
            { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
            { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
        ],
        '2020-08-31');
    expect(result).toEqual([
        { ymdDate: '2005-02-25', close: 1.59, },
        { ymdDate: '2005-02-28', close: 1.60, },
        { ymdDate: '2014-06-06', close: 23.06, },
        { ymdDate: '2014-06-09', close: 23.42, },
        { ymdDate: '2020-08-31', close: 129.04, },
    ]);


    // Check dates between splits
    // The prices passed to asyncAdjustPriceDataItems() are the
    // prices at the price date.
    result = await manager.asyncAdjustPriceDataItems(1,
        [
            { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
            { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
            { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },
            { ymdDate: '2014-06-09', close: 23.42 * 4, },
            { ymdDate: '2020-08-31', close: 129.04, },
        ],
        '2020-08-30');

    // The base prices are all relative to 2020-08-31...
    expect(result).toEqual([
        { ymdDate: '2005-02-25', close: round(1.59 * 4), },
        { ymdDate: '2005-02-28', close: round(1.60 * 4), },
        { ymdDate: '2014-06-06', close: round(23.06 * 4), },
        { ymdDate: '2014-06-09', close: round(23.42 * 4), },
        { ymdDate: '2020-08-31', close: round(129.04 * 4), },
    ]);

    //
    // Before earliest split
    result = await manager.asyncAdjustPriceDataItems(1,
        [
            { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
            { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
            { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },
            { ymdDate: '2014-06-09', close: 23.42 * 4, },
            { ymdDate: '2020-08-31', close: 129.04, },
        ],
        '2005-02-25');

    // The base prices are all relative to 2020-08-31...
    expect(result).toEqual([
        { ymdDate: '2005-02-25', close: round(1.59 * 4 * 7 * 2), },
        { ymdDate: '2005-02-28', close: round(1.60 * 4 * 7 * 2), },
        { ymdDate: '2014-06-06', close: round(23.06 * 4 * 7 * 2), },
        { ymdDate: '2014-06-09', close: round(23.42 * 4 * 7 * 2), },
        { ymdDate: '2020-08-31', close: round(129.04 * 4 * 7 * 2), },
    ]);


    //
    // Check reversing...
    result = await manager.asyncAdjustPriceDataItems(1,
        [
            { ymdDate: '2005-02-25', close: round(1.59 * 4), },
            { ymdDate: '2005-02-28', close: round(1.60 * 4), },
            { ymdDate: '2014-06-06', close: round(23.06 * 4), },
            { ymdDate: '2014-06-09', close: round(23.42 * 4), },
            { ymdDate: '2020-08-31', close: round(129.04 * 4), },
        ],
        '2020-08-30',
        true);

    // The base prices are all relative to 2020-08-31...
    expect(result).toEqual([
        { ymdDate: '2005-02-25', close: round(1.59 * 2 * 7 * 4), },
        { ymdDate: '2005-02-28', close: round(1.60 * 7 * 4), },
        { ymdDate: '2014-06-06', close: round(23.06 * 7 * 4), },
        { ymdDate: '2014-06-09', close: round(23.42 * 4), },
        { ymdDate: '2020-08-31', close: round(129.04), },
    ]);


    //
    // Test adjusted price versions of the get price methods
    /*
        { ymdDate: '2005-03-11', close: 1.44 * 7 * 4, },
        { ymdDate: '2014-06-04', close: 23.03 * 7 * 4, },
        { ymdDate: '2014-06-05', close: 23.12 * 7 * 4, },
        { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },

        // 7 for 1 split...
        split_7_1_2014_06_09,

        { ymdDate: '2014-06-09', close: 23.42 * 4, },
        { ymdDate: '2014-06-10', close: 23.56 * 4, },
    */
    result = await manager.asyncGetPriceDataItemsInDateRange({
        pricedItemId: 1,
        ymdDateA: '2014-06-06',
        ymdDateB: '2014-06-10',
        refYMDDate: '2014-06-09',
    });

    // The base prices are all relative to 2020-08-31...
    expect(result).toEqual([
        { ymdDate: '2014-06-06', close: round(23.06 * 4), },
        { ymdDate: '2014-06-09', close: round(23.42 * 4), },
        { ymdDate: '2014-06-10', close: round(23.56 * 4), },
    ]);


    result = await manager.asyncGetPriceDataItemOnOrClosestBefore({
        pricedItemId: 1,
        ymdDate: '2014-06-06',
        refYMDDate: '2020-08-31',
    });

    expect(result).toEqual({ ymdDate: '2014-06-06', close: round(23.06), });


    result = await manager.asyncGetPriceDataItemOnOrClosestAfter({
        pricedItemId: 1,
        ymdDate: '2014-06-03',
        refYMDDate: '2020-06-10',
    });

    expect(result).toEqual({ ymdDate: '2014-06-04', close: round(23.03 * 4), });
});

function round(x) {
    return Math.round(x * 10000) / 10000;
}