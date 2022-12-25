import { YMDDate, getYMDDate } from '../util/YMDDate';
import { getPricedItem, PricedItemOnlineUpdateType } from './PricedItems';
import { getDecimalDefinition } from '../util/Quantities';
import { userError } from '../util/UserMessages';
import { asyncAxiosRequest } from './Engine';



function getSpanValue(span) {
    if (!span) {
        return;
    }
    const end = span.indexOf('</span>');
    if (end >= 0) {
        return span.slice(0, end);
    }
}

function getSpanNumber(span) {
    const value = getSpanValue(span);
    if (value) {
        return parseFloat(value);
    }
}

function parseSplit_2022_12(row, price) {
    /*
    <tr
        class="BdT Bdc($seperatorColor) Ta(end) Fz(s) Whs(nw)">
        <td class="Py(10px) Ta(start) Pend(5px)"><span>Aug
                31, 2020</span></td>
        <td class="Ta(start) Py(10px)" colSpan="6">
            <strong>4:1</strong> <span>Stock Split</span>
        </td>
    </tr>
    */
    const strong = '<strong>';
    const start = row.indexOf(strong);
    if (start < 0) {
        return;
    }
    const end = row.indexOf('</strong>');
    if (end < 0) {
        return;
    }
    const value = row.slice(start + strong.length, end);
    if (!value) {
        return;
    }

    const sep = value.indexOf(':');
    if (sep < 0) {
        return;
    }

    const numerator = parseFloat(value.slice(0, sep));
    const denominator = parseFloat(value.slice(sep + 1));
    if (isNaN(numerator) || isNaN(denominator)) {
        return;
    }
    price.numerator = numerator;
    price.denominator = denominator;
    return price;
}

function parseRow_2022_12(row) {
    const start = row.indexOf('<span>');
    if (start < 0) {
        return;
    }

    const spans = row.slice(start).split('<span>');
    if (spans.length <= 1) {
        return;
    }

    const price = {};

    var i = 0;
    if (!getSpanValue(spans[i])) {
        ++i;
    }
    
    // ymdDate 
    price.date = getSpanValue(spans[i]);
    ++i;

    // Need to handle splits and merges:
    if (parseSplit_2022_12(row, price)) {
        return price;
    }


    // open
    if (i < spans.length) {
        price.open = getSpanNumber(spans[i]);
    }
    ++i;

    // high
    if (i < spans.length) {
        price.high = getSpanNumber(spans[i]);
    }
    ++i;
    
    // low
    if (i < spans.length) {
        price.low = getSpanNumber(spans[i]);
    }
    ++i;
    
    // close
    if (i < spans.length) {
        price.close = getSpanNumber(spans[i]);
    }
    ++i;
    
    // adjClose
    if (i < spans.length) {
        price.adjClose = getSpanNumber(spans[i]);
    }
    ++i;
    
    // volume
    if (i < spans.length) {
        price.volume = getSpanNumber(spans[i]);
    }
    ++i;
    
    return price;
}


function parseBody_2022_12(body) {
    if (!body) {
        return;
    }
/*
symbol  "AAPL"
from    "2022-12-20T00:00:00.000Z"
to  "2022-12-24T20:00:00.000Z"

url https://finance.yahoo.com/quote/AAPL/history?period1=1671494400&period2=1671912000&interval=1d&filter=history&frequency=1d

Date    Open   High  Low    Close   Adj Close   Volume
ymdDate open    high    low close   adjClose    volume

    <tbody>
        <tr
            class="BdT Bdc($seperatorColor) Ta(end) Fz(s) Whs(nw)">
            <td class="Py(10px) Ta(start) Pend(10px)"><span>Dec 23, 2022</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>130.92</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.42</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>129.64</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>131.86</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>131.86</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>63,771,000</span></td>
        </tr>
        <tr
            class="BdT Bdc($seperatorColor) Ta(end) Fz(s) Whs(nw)">
            <td class="Py(10px) Ta(start) Pend(10px)"><span>Dec 22, 2022</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>134.35</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>134.56</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>130.30</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.23</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.23</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>77,852,100</span></td>
        </tr>
        <tr
            class="BdT Bdc($seperatorColor) Ta(end) Fz(s) Whs(nw)">
            <td class="Py(10px) Ta(start) Pend(10px)"><span>Dec 21, 2022</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.98</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>136.81</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.75</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>135.45</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>135.45</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>85,928,000</span></td>
        </tr>
        <tr
            class="BdT Bdc($seperatorColor) Ta(end) Fz(s) Whs(nw)">
            <td class="Py(10px) Ta(start) Pend(10px)"><span>Dec 20, 2022</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>131.39</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>133.25</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>129.89</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.30</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>132.30</span></td>
            <td class="Py(10px) Pstart(10px)">
                <span>77,432,800</span></td>
        </tr>
    </tbody>
*/
    let start = body.indexOf('<tbody');
    if (start < 0) {
        return;
    }
    const end = body.indexOf('</tbody>');
    if (end < 0) {
        return;
    }

    start = body.indexOf('<tr', start);
    if (start < 0) {
        return;
    }

    const rows = body.slice(start, end).split('<tr');
    if (!rows || !rows.length) {
        return;
    }

    const prices = [];
    for (const row of rows) {
        const price = parseRow_2022_12(row);
        if (price) {
            prices.push(price);
        }
    }

    if (prices.length) {
        return prices;
    }
}


async function asyncRetrieveQuote(options) {
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
        
        if (options.logOutput) {
            console.log('retrieveQuote url: ' + url);
        }

        asyncAxiosRequest({
            url: url,
            timeout: options.timeout,
            responseType: 'text',
        })
            .then(response => {
                if (response.statusText !== 'OK') {
                    reject(response.statusText);
                }
                else {
                    const test = url;
                    if (test) {}
                    const body = response.data;
                    const historicalPricesStart 
                        = body.split('HistoricalPriceStore":{"prices":')[1];
                    if (historicalPricesStart) {
                        const prices = JSON.parse(
                            historicalPricesStart.split(',"isPending')[0]);
                        prices.forEach((price) => {
                            if (price.date) {
                                price.date = new Date(price.date * 1000);
                            }
                        });
                        resolve(prices);
                    }
                    else {
                        const prices = parseBody_2022_12(body);
                        if (prices) {
                            resolve(prices);
                        }

                        reject(userError('PriceRetriever-ticker_not_found', symbol));
                    }
                }
            })
            .catch(error => {
                reject(error);
            });
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

    // Adding 20 hours to make sure the market is closed...
    const to = new Date(toYMDDate.valueOf() + 1000 * 60 * 60 * 20);
    const from = fromYMDDate.toDate();

    const retrieveArgs = {
        from: from,
        to: to,
        timeout: options.timeout,
        symbol: ticker,
    };

    const results = await asyncRetrieveQuote(retrieveArgs);

    const quantityDefinition = options.quantityDefinition || getDecimalDefinition(4);

    // The results from historical() are from newest to oldest, but our default
    // price handler works best if the prices are from oldest to newest, so we reverse
    // their insertion.
    let index = results.length - 1;
    const priceDataItems = [];
    for (let i = 0; i < results.length; ++i) {
        const result = results[i];
    
        const ymdDate = new YMDDate(result.date);
        if ((i > 0) && (YMDDate.compare(ymdDate, ymdDateA) < 0)) {
            // This test is for the case where we stuffed in extra days before to work
            // around weekends and holidays.
            break;
        }

        const priceDataItem = {
            ymdDate: ymdDate,
        };

        if (typeof result.close === 'number') {
            priceDataItem.close = quantityDefinition.cleanupNumber(result.close);

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
                priceDataItem.adjClose 
                    = quantityDefinition.cleanupNumber(result.adjClose);
            }
            if (result.volume) {
                priceDataItem.volume = result.volume;
            }
        }
        else if ((typeof result.numerator === 'number')
         && (typeof result.denominator === 'number')) {
            priceDataItem.newCount = result.numerator;
            priceDataItem.oldCount = result.denominator;
        }
        else {
            continue;
        }

        priceDataItems[index] = priceDataItem;
        --index;
    }

    if (index >= 0) {
        priceDataItems.splice(0, index + 1);
    }

    return priceDataItems;
}

/**
 * @typedef {object} PriceRetrieverSuccessfulEntry
 * @property {number}   [pricedItemId] Only used if 
 * {@link asyncGetUpdatedPricedItemPrices} was called.
 * @property {string}   ticker
 * @property {PriceDataItem[]}  prices
 */

/**
 * @typedef {object} PriceRetrieverFailedEntry
 * @property {number}   [pricedItemId] Only used if 
 * {@link asyncGetUpdatedPricedItemPrices} was called.
 * @property {string}   ticker
 * @property {Error}    err
 */


/**
 * @typedef {object} PriceRetrieverCallbackArgs
 * @property {number} index
 * @property {number} processedPricedItemsCount
 * @property {number}   [pricedItemId] Only used if 
 * {@link asyncGetUpdatedPricedItemPrices} was called.
 * @property {string} ticker
 * @property {Price[]} prices
 * @property {Error} [err]
 * @property {boolean} isCancel    Set this to <code>true</code> if further processing 
 * should be aborted.
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
 * @typedef {object}    PriceRetrieverPricedItemOptions
 * @property {PricedItemManager} pricedItemManager    The price item manager, required.
 * @property {number[]} pricedItemIds    Array of ids of the priced items whose 
 * prices are to be retrieved,
 * @property {YMDDate}    [ymdDateA]    One date of the date range.
 * @property {YMDDate}    [ymdDateB=ymdDateA] The other date of the date range. If 
 * both ymdDateA and ymdDateB are left out then the current date is used.
 * @property {PriceRetrieverCallback}   [callback]  Optional callback function called 
 * after prices are retrieved for a priced item.
 * @property {number}   [msecDelay] Optional number of milliseconds to delay between 
 * calls to the price retriever.
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
 * The main price retrieval function for priced item based retrieval.
 * @param {PriceRetrieverPricedItemOptions} options
 * @returns {PriceRetrieverResult}
 */
export async function asyncGetUpdatedPricedItemPrices(options) {
    let { pricedItemManager, pricedItemIds, } = options;

    if (!Array.isArray(pricedItemIds)) {
        pricedItemIds = [pricedItemIds];
    }

    const pricedItems = [];
    const tickers = [];
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
        tickers.push(symbol);
    });

    let { callback } = options;
    if (callback) {
        callback = (callbackArgs) => {
            const myCallbackArgs = Object.assign({}, callbackArgs, {
                pricedItemId: pricedItems[callbackArgs.index].id,
            });
            options.callback(myCallbackArgs);
            callbackArgs.isCancel = myCallbackArgs.isCancel;
        };
    }

    const tickerOptions = Object.assign({}, options, {
        tickers: tickers,
        entryCallback: (i, entry) => {
            entry.pricedItemId = pricedItems[i].id;
        },
        callback: callback,
    });

    return asyncGetUpdatedTickerPrices(tickerOptions);
}


/**
 * @typedef {object}    PriceRetrieverTickerOptions
 * @property {string[]} tickers    The tickers to be retrieved.
 * @property {YMDDate}    [ymdDateA]    One date of the date range.
 * @property {YMDDate}    [ymdDateB=ymdDateA] The other date of the date range. If 
 * both ymdDateA and ymdDateB are left out then the current date is used.
 * @property {PriceRetrieverCallback}   [callback]  Optional callback function called 
 * after prices are retrieved for a priced item.
 * @property {number}   [msecDelay] Optional number of milliseconds to delay between 
 * calls to the price retriever.
 */

/**
 * The main price retrieval function for arrays of ticker retrieval.
 * @param {PriceRetrieverTickerOptions} options
 * @returns {PriceRetrieverResult}
 */
export async function asyncGetUpdatedTickerPrices(options) {
    let { tickers, ymdDateA, ymdDateB, entryCallback,
        callback, msecDelay } = options;

    if (!Array.isArray(tickers)) {
        tickers = [tickers];
    }

    const successfulEntries = [];
    const failedEntries = [];
    const callbackArgs = {
        totalPricedItemsCount: tickers.length,
        successfulEntries: successfulEntries,
        failedEntries: failedEntries,
    };

    let isCancelled = false;

    for (let i = 0; i < tickers.length; ++i) {
        const ticker = tickers[i];

        let prices;
        let err;
        try {
            prices = await asyncGetPricesForTicker(ticker, ymdDateA, ymdDateB, 
                options);
            if (msecDelay && (msecDelay > 0) && (i + 1 < tickers.length)) {
                await new Promise((resolve, reject) => {
                    setTimeout(() => resolve(), msecDelay);
                });
            }

            const entry = { ticker: ticker, prices: prices, };
            if (entryCallback) {
                entryCallback(i, entry);
            }

            successfulEntries.push(entry);
        }
        catch (e) {
            const entry = { ticker: ticker, prices: prices, };
            if (entryCallback) {
                entryCallback(i, entry);
            }
            failedEntries.push(entry);
            err = e;
        }

        if (callback) {
            callbackArgs.index = i;
            callbackArgs.processedPricedItemsCount = i + 1;
            callbackArgs.ticker = ticker;
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

