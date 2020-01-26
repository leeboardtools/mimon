// TEMP!!!
/* eslint-disable no-unused-vars */

import { asyncUpdatePricedItemPrices, setIsElectron, asyncGetUpdatedPricedItemPrices } from './PriceRetriever';
import { PricedItemType } from './Prices';
//import * as PTH from './PricesTestHelpers';
//import { AccountingSystem, USStockPriceDefinition } from './AccountingSystem';
import { YMDDate } from '../util/YMDDate';
import { getDecimalDefinition } from '../util/Quantities';
import * as ASTH from './AccountingSystemTestHelpers';

//
//
// NOTE: THIS DOES NOT YET TEST PriceRetriever.js!!!
//
//

export const USStockPriceDefinition = getDecimalDefinition({ decimalPlaces: 4 });
export const USStockQuantityDefinition = getDecimalDefinition({ decimalPlaces: 4 });

setIsElectron(false);


function cleanupPrice(price) {
    if (price !== undefined) {
        return USStockPriceDefinition.cleanupNumber(price);
    }
}

function cleanupPrices(prices) {
    prices.forEach((entry) => {
        entry.open = cleanupPrice(entry.open);
        entry.high = cleanupPrice(entry.high);
        entry.low = cleanupPrice(entry.low);
        entry.close = cleanupPrice(entry.close);
        entry.adjClose = cleanupPrice(entry.adjClose);
    });
}

const AAPL = [
    {
        ymdDate: new YMDDate('2019-10-02T04:00:00.000Z'),
        open: 223.059998,
        high: 223.580002,
        low: 217.929993,
        close: 218.960007,
        // adjClose: 218.960007,
        volume: 34612300,
    },
    {
        ymdDate: new YMDDate('2019-10-01T04:00:00.000Z'),
        open: 225.070007,
        high: 228.220001,
        low: 224.199997,
        close: 224.589996,
        // adjClose: 224.589996,
        volume: 34805800,
    },
    {
        ymdDate: new YMDDate('2019-09-30T04:00:00.000Z'),
        open: 220.899994,
        high: 224.580002,
        low: 220.789993,
        close: 223.970001,
        // adjClose: 223.970001,
        volume: 25977400,
    },
    {
        ymdDate: new YMDDate('2019-09-27T04:00:00.000Z'),
        open: 220.539993,
        high: 220.960007,
        low: 217.279999,
        close: 218.820007,
        // adjClose: 218.820007,
        volume: 25352000,
    },
    {
        ymdDate: new YMDDate('2019-09-26T04:00:00.000Z'),
        open: 220,
        high: 220.940002,
        low: 218.830002,
        close: 219.889999,
        // adjClose: 219.889999,
        volume: 18833500,
    },
    {
        ymdDate: new YMDDate('2019-09-25T04:00:00.000Z'),
        open: 218.550003,
        high: 221.5,
        low: 217.139999,
        close: 221.029999,
        // adjClose: 221.029999,
        volume: 21903400,
    },
    {
        ymdDate: new YMDDate('2019-09-24T04:00:00.000Z'),
        open: 221.029999,
        high: 222.490005,
        low: 217.190002,
        close: 217.679993,
        // adjClose: 217.679993,
        volume: 31190800,
    },
    {
        ymdDate: new YMDDate('2019-09-23T04:00:00.000Z'),
        open: 218.949997,
        high: 219.839996,
        low: 217.649994,
        close: 218.720001,
        // adjClose: 218.720001,
        volume: 19165500,
    }
];
AAPL.sort((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate));
cleanupPrices(AAPL);

const VOO = [
    {
        ymdDate: new YMDDate('2019-10-02T04:00:00.000Z'),
        open: 267.730011,
        high: 267.730011,
        low: 263.25,
        close: 264.570007,
        // adjClose: 264.570007,
        volume: 4463500,
    },
    {
        ymdDate: new YMDDate('2019-10-01T04:00:00.000Z'),
        open: 273.440002,
        high: 274.079987,
        low: 269.089996,
        close: 269.320007,
        // adjClose: 269.320007,
        volume: 3696000,
    },
    {
        ymdDate: new YMDDate('2019-09-30T04:00:00.000Z'),
        open: 271.820007,
        high: 273.269989,
        low: 271.790009,
        close: 272.600006,
        // adjClose: 272.600006,
        volume: 2735200,
    },
    {
        ymdDate: new YMDDate('2019-09-27T04:00:00.000Z'),
        open: 273.559998,
        high: 273.589996,
        low: 269.720001,
        close: 271.26001,
        // adjClose: 271.26001,
        volume: 2836500,
    },
    {
        ymdDate: new YMDDate('2019-09-26T04:00:00.000Z'),
        open: 273.339996,
        high: 273.549988,
        low: 271.350006,
        close: 272.790009,
        // adjClose: 272.790009,
        volume: 2355000,
    },
    {
        ymdDate: new YMDDate('2019-09-25T04:00:00.000Z'),
        open: 273.079987,
        high: 275.079987,
        low: 271.600006,
        close: 274.630005,
        adjClose: 273.32901,
        volume: 2649200,
    },
    {
        ymdDate: new YMDDate('2019-09-24T04:00:00.000Z'),
        open: 276.309998,
        high: 276.679993,
        low: 272.059998,
        close: 272.959991,
        adjClose: 271.666901,
        volume: 5124900,
    },
    {
        ymdDate: new YMDDate('2019-09-23T04:00:00.000Z'),
        open: 274.589996,
        high: 275.899994,
        low: 274.329987,
        close: 275.23999,
        adjClose: 273.936096,
        volume: 1286400,
    }
];
VOO.sort((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate));
cleanupPrices(VOO);

const FSRPX = [
    {
        ymdDate: new YMDDate('2019-10-02T04:00:00.000Z'),
        // open: 15.9,
        // high: 15.9,
        // low: 15.9,
        close: 15.9,
        // adjClose: 15.9,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-10-01T04:00:00.000Z'),
        // open: 16.23,
        // high: 16.23,
        // low: 16.23,
        close: 16.23,
        // adjClose: 16.23,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-30T04:00:00.000Z'),
        // open: 16.290001,
        // high: 16.290001,
        // low: 16.290001,
        close: 16.290001,
        // adjClose: 16.290001,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-27T04:00:00.000Z'),
        // open: 16.18,
        // high: 16.18,
        // low: 16.18,
        close: 16.18,
        // adjClose: 16.18,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-26T04:00:00.000Z'),
        // open: 16.23,
        // high: 16.23,
        // low: 16.23,
        close: 16.23,
        // adjClose: 16.23,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-25T04:00:00.000Z'),
        // open: 16.309999,
        // high: 16.309999,
        // low: 16.309999,
        close: 16.309999,
        // adjClose: 16.309999,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-24T04:00:00.000Z'),
        // open: 16.200001,
        // high: 16.200001,
        // low: 16.200001,
        close: 16.200001,
        // adjClose: 16.200001,
        // volume: 0,
    },
    {
        ymdDate: new YMDDate('2019-09-23T04:00:00.000Z'),
        // open: 16.35,
        // high: 16.35,
        // low: 16.35,
        close: 16.35,
        // adjClose: 16.35,
        // volume: 0,
    }
];
FSRPX.sort((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate));
cleanupPrices(FSRPX);


function getItemsInRange(items, dateA, dateB) {
    const inRange = [];
    for (const item of items) {
        if ((YMDDate.compare(item.ymdDate, dateA) >= 0) && (YMDDate.compare(item.ymdDate, dateB) <= 0)) {
            inRange.push(item);
        }
    }
    return inRange;
}

test('asyncUpdatePricedItemPrices', async () => {

    // const results = await yf.historical({ symbol: 'FSRPX', from: new Date(2019, 8, 22), to: new Date(2019, 9, 2) });
    // console.log(JSON.stringify(results));


    let isTestEnabled;
    // isTestEnabled = true;
    if (!isTestEnabled) {
        return;
    }


    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const priceManager = accountingSystem.getPriceManager();


    const optionsAAPL = {
        name: 'Apple Computer Inc.',
        description: 'A computer company',
        type: PricedItemType.SECURITY,
        currency: 'USD',
        ticker: 'AAPL',
    };
    const pricedItemAAPL = (await priceManager.asyncAddPricedItem(optionsAAPL)).newPricedItemDataItem;
    const localIdAAPL = pricedItemAAPL.id;


    const optionsVOO = {
        name: 'Vanguard S&P 500 ETF',
        description: 'An ETF',
        type: PricedItemType.SECURITY,
        currency: 'USD',
        ticker: 'VOO',
    };
    const pricedItemVOO = (await priceManager.asyncAddPricedItem(optionsVOO)).newPricedItemDataItem;
    const localIdVOO = pricedItemVOO.id;


    const optionsFSRPX = {
        name: 'Fidelity Select Retailing Portfolio',
        description: 'A Mutual Fund',
        type: PricedItemType.SECURITY,
        currency: 'USD',
        ticker: 'FSRPX',
    };
    const pricedItemFSRPX = (await priceManager.asyncAddPricedItem(optionsFSRPX)).newPricedItemDataItem;
    const localIdFSRPX = pricedItemFSRPX.id;

    const date1 = new YMDDate(2019, 8, 22);
    const date2 = new YMDDate(2019, 8, 26);
    //await asyncUpdatePricedItemPrices(priceManager, [localIdAAPL, localIdVOO], date1, date2);
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdAAPL, date1, date2), getItemsInRange(AAPL, date1, date2));
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdVOO, date1, date2), getItemsInRange(VOO, date1, date2));
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdFSRPX, date1, date2), []);

    const date3 = new YMDDate(2019, 8, 25);
    const date4 = new YMDDate(2019, 9, 2);
    //await asyncUpdatePricedItemPrices(priceManager, [localIdAAPL, localIdVOO, localIdFSRPX], date3, date4);
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdAAPL, date1, date4), getItemsInRange(AAPL, date1, date4));
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdVOO, date1, date4), getItemsInRange(VOO, date1, date4));
    //PTH.expectPricesToMatchOptions(accountingSystem, await priceManager.asyncGetPricesForPricedItem(localIdFSRPX, date3, date4), getItemsInRange(FSRPX, date3, date4));

    const resultA = await asyncGetUpdatedPricedItemPrices({
        priceManager: priceManager,
        pricedItemRefs: [localIdAAPL],
        oDateA: new YMDDate(2019, 0, 21), // MLK Day 2019
    });
    expect(resultA.priceOptions.length).toEqual(1);
    expect(resultA.priceOptions[0].ymdDate).toEqual(new YMDDate(2019, 0, 18));

    // console.log(JSON.stringify(getItemsInRange(FSRPX, date3, date4)));
    // console.log(JSON.stringify(FSRPX));
    // const results = await yf.historical({ symbol: 'FSRPX', from: date3, to: date4 });
    // console.log(JSON.stringify(results));
});
