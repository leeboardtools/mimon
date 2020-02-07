import { YMDDate, getYMDDate } from '../util/YMDDate';
import { getPricedItem, PricedItemOnlineUpdateType } from './PricedItems';
import { getDecimalDefinition } from '../util/Quantities';

const request = require('request');
const yf = require('yahoo-finance');

let retrieverFunc = yf.historical;

export function setIsElectron(isElectron) {
    if (isElectron) {
        retrieverFunc = directRetrieveQuote;
    }
    else {
        retrieverFunc = yf.historical;
    }
}


async function directRetrieveQuote(options) {
    return new Promise((resolve, reject) => {
        const { symbol, from, to } = options;
        const fromSecs = Math.round(from.valueOf() / 1000);
        const toSecs = Math.round(to.valueOf() / 1000);
        const frequency = '1d';

        //
        // eslint-disable-next-line max-len
        // Adapted from https://github.com/darthbatman/yahoo-stock-prices/blob/master/yahoo-stock-prices.js
        //
        const url = 'https://finance.yahoo.com/quote/' + symbol
            + '/history?period1=' + fromSecs + '&period2=' + toSecs
            + '&interval=' + frequency + '&filter=history&frequency=' + frequency;
        console.log('retrieveQuote url: ' + url);

        request(
            {
                url: url,
                timeout: options.timeout || 5000,
            },
            (err, res, body) => {
                if (err) {
                    reject(err);
                }
                else {
                    const prices = JSON.parse(
                        body.split('HistoricalPriceStore":{"prices":')[1]
                            .split(',"isPending')[0]);
                    prices.forEach((price) => {
                        if (price.date) {
                            price.date = new Date(price.date * 1000);
                        }
                    });
                    resolve(prices);
                }
            }
        );
    });
}


/**
 * @typedef {object} PriceRetrieverOptions
 * @param {number} [timeout]    Optional timeout in msec.
 * @param {QuantityDefinition}  [quantityDefinition]    Optional quantity definition 
 * to use for defining the price values, if not given then 4 decimal places will be used.
 */

/**
 * Retrieves {@link PriceDataItem} prices for a given ticker.
 * @param {string} ticker 
 * @param {string|YMDDate} ymdDateA 
 * @param {string|YMDDate} ymdDateB 
 * @param {PriceRetrieverOptions} options 
 */
export async function asyncGetPricesForTicker(ticker, ymdDateA, ymdDateB, options) {
    options = options || {};

    if (!ymdDateB) {
        ymdDateB = ymdDateA;
    }
    else if (!ymdDateA) {
        ymdDateA = ymdDateB;
    }

    ymdDateA = getYMDDate(ymdDateA);
    ymdDateB = getYMDDate(ymdDateB);
    [ ymdDateA, ymdDateB ] = YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);

    // Our little hack to work around weekends and holidays.
    // There normally should never be more than 3 days of weekend/holiday.
    let fromYMDDate = ymdDateA;
    const toYMDDate = ymdDateB;
    if (fromYMDDate.daysAfterMe(toYMDDate) < 4) {
        fromYMDDate = toYMDDate.addDays(-4);
    }

    const to = new Date(toYMDDate.valueOf() + 1000 * 60 * 60 * 12);
    const from = fromYMDDate.toDate();

    const retrieveArgs = {
        from: from,
        to: to,
        timeout: options.timeout,
        symbol: ticker,
    };

    const results = await retrieverFunc(retrieveArgs);

    const quantityDefinition = options.quantityDefinition || getDecimalDefinition(4);

    // The results from historical() are from newest to oldest, but our default
    // price handler works best if the prices are from oldest to newest, so we reverse
    // their insertion.
    let priceDataItemCount = 0;
    let index = results.length - 1;
    const priceDataItems = [];
    for (let i = 0; i < results.length; ++i) {
        const result = results[i];
    
        const ymdDate = new YMDDate(result.date);
        if ((priceDataItemCount > 0) && (YMDDate.compare(ymdDate, ymdDateA) < 0)) {
            // This test is for the case where we stuffed in extra days before to work
            // around weekends and holidays.
            break;
        }

        const priceDataItem = {
            ymdDate: ymdDate,
            close: quantityDefinition.cleanupNumber(result.close),
        };

        if ((result.open !== result.close) 
            || (result.high !== result.close) 
            || (result.low !== result.close)) {

            if (result.open !== undefined) {
                priceDataItem.open = quantityDefinition.cleanupNumber(result.open);
            }
            if (result.high !== undefined) {
                priceDataItem.high = quantityDefinition.cleanupNumber(result.high);
            }
            if (result.low !== undefined) {
                priceDataItem.low = quantityDefinition.cleanupNumber(result.low);
            }
        }
        if ((result.adjClose !== undefined) && (result.adjClose !== result.close)) {
            priceDataItem.adjClose = quantityDefinition.cleanupNumber(result.adjClose);
        }
        if (result.volume) {
            priceDataItem.volume = result.volume;
        }

        priceDataItems[index] = priceDataItem;
        --index;
        ++priceDataItemCount;
    }

    if (index >= 0) {
        priceDataItems.splice(0, index + 1);
    }

    return priceDataItems;
}

/**
 * @typedef {object} PriceRetrieverSuccessfulEntry
 * @property {number}   pricedItemId
 * @property {string}   ticker
 * @property {PriceDataItem[]}  prices
 */

/**
 * @typedef {object} PriceRetrieverFailedEntry
 * @property {number}   pricedItemId
 * @property {string}   ticker
 * @property {Error}    err
 */


/**
 * @callback PriceRetrieverCallback
 * @param {number}  totalPricedItemsCount   The total number of priced items whose 
 * prices are being retrieved.
 * @param {number}  processedPricedItemsCount   The number of priced items whose 
 * prices have been processed, this will be equal to totalPricedItemsCount after 
 * the last priced item is processed.
 * @param {number}  pricedItemId   The local id of the priced item that was just 
 * processed.
 * @param {Price[]} [prices]    Array containing the options for the prices that 
 * were retrieved for the priced item, will be <code>undefined</code> if retrieval failed.
 * @param {Error} [err] If the last retrieval failed this is the error.
 * @param {boolean} isCancel    Set this to <code>true</code> if further processing 
 * should be aborted.
 * @param {PriceRetrieverSuccessfulEntry[]} successfulEntries   Array containing 
 * the entries for priced items whose retrieval succeeded.
 * @param {PriceRetrieverFailedEntry[]} failedEntries   Array containing the 
 * entries for priced items whose retrieval failed.
 */


/**
 * @typedef {object}    PriceRetrieverOptions
 * @property {PriceManager} priceManager    The price manager, required.
 * @property {number[]} pricedItemIds    Array of ids of the priced items whose 
 * prices are to be retrieved,
 * @property {YMDDate}    [ymdDateA]    One date of the date range.
 * @property {YMDDate}    [ymdDateB=ymdDateA] The other date of the date range. If 
 * both ymdDateA and ymdDateB are left out then the current date is used.
 * @property {PriceRetrieverCallback}   [callback]  Optional callback function called 
 * after prices are retrieved for a priced item.
 * @property {number}   [msecDelay] Optional number of milliseconds to delay between 
 * calls to the price retriever.
 * @property {boolean}  [isElectron=false]  Set to <code>true</code> if this is 
 * called from Electron.
 */

/**
 * @typedef {object}    PriceRetrieverResult
 * @property {boolean}  isCancelled
 * @param {PriceRetrieverSuccessfulEntry[]} successfulEntries   Array containing the 
 * entries for priced items whose retrieval succeeded.
 * @param {PriceRetrieverFailedEntry[]} failedEntries   Array containing the entries 
 * for priced items whose retrieval failed.
 */

/**
 * The main price retrieval function.
 * @param {PriceRetrieverOptions} options
 * @returns {PriceRetrieverResult}
 */
export async function asyncGetUpdatedPricedItemPrices(options) {
    let { pricedItemManager, pricedItemIds, ymdDateA, 
        ymdDateB, callback, msecDelay, isElectron } = options;

    setIsElectron(isElectron);

    if (!Array.isArray(pricedItemIds)) {
        pricedItemIds = [pricedItemIds];
    }

    const pricedItems = [];
    pricedItemIds.forEach((pricedItemId) => {
        const pricedItemDataItem 
            = pricedItemManager.getPricedItemDataItemWithId(pricedItemId);
        const pricedItem = getPricedItem(pricedItemDataItem);
        if (!pricedItem) {
            return;
        }
        if (!pricedItem.type.hasTickerSymbol) {
            return;
        }

        const onlineUpdateType = pricedItem.onlineUpdateType;
        if (onlineUpdateType !== PricedItemOnlineUpdateType.YAHOO_FINANCE) {
            return;
        }

        const symbol = pricedItem.ticker;
        if (!symbol) {
            return;
        }

        pricedItems.push(pricedItem);
    });

    const successfulEntries = [];
    const failedEntries = [];
    const callbackArgs = {
        totalPricedItemsCount: pricedItems.length,
        successfulEntries: successfulEntries,
        failedEntries: failedEntries,
    };

    let isCancelled = false;

    for (let i = 0; i < pricedItems.length; ++i) {
        const pricedItem = pricedItems[i];
        const { ticker } = pricedItem;

        let prices;
        let err;
        try {
            prices = await asyncGetPricesForTicker(pricedItem.ticker, ymdDateA, ymdDateB, 
                options);
            if (msecDelay && (msecDelay > 0) && (i + 1 < pricedItems.length)) {
                await new Promise((resolve, reject) => {
                    setTimeout(() => resolve(), msecDelay);
                });
            }

            successfulEntries.push(
                { pricedItemId: pricedItem.id, ticker: ticker, prices: prices, });
        }
        catch (e) {
            failedEntries.push({ pricedItemId: pricedItem.id, ticker: ticker, err: e, });
            err = e;
        }

        if (callback) {
            callbackArgs.processedPricedItemsCount = i + 1;
            callbackArgs.pricedItemId = pricedItem.id;
            callbackArgs.prices = prices;
            callbackArgs.err = err;
            callbackArgs.isCancel = false;

            callback(callbackArgs);
            if (callbackArgs.isCancel) {
                isCancelled = true;
                break;
            }
        }
    }

    return {
        isCancelled: isCancelled,
        successfulEntries: successfulEntries,
        failedEntries: failedEntries,
    };
}

