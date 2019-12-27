//import { AddPricesAction } from './PriceActions'
import { YMDDate } from '../util/YMDDate';
import { PricedItemOnlineUpdateType } from './Prices';
//import * as PI from './PricedItems';

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
                    const prices = JSON.parse(body.split('HistoricalPriceStore":{"prices":')[1].split(',"isPending')[0]);
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
 * @typedef {object} PriceRetrieverSuccess
 * @property {string}   ticker
 * @property {Price~Option[]}   priceOptions
 */

/**
 * @typedef {object}    PriceRetrieverFailure
 * @property {string}   ticker
 * @property {Error}    err
 */

/**
 * @callback PriceRetrieverCallback
 * @param {number}  totalPricedItemsCount   The total number of priced items whose prices are being retrieved, this may be
 * different from the number of priced items passed to {@link resolveRefToPricedItem}.
 * @param {number}  processedPricedItemsCount   The number of priced items whose prices have been processed, this will be
 * equal to totalPricedItemsCount after the last priced item is processed.
 * @param {number}  pricedItemId   The local id of the priced item that was just processed.
 * @param {Price~Options[]} priceOptions    Array containing the options for the prices that were retrieved for the priced item.
 * @param {boolean} isCancel    Set this to <code>true</code> if further processing should be aborted.
 * @param {PriceRetrieverSuccess[]} successTickerSymbolsAndPrices   Array containing all the price retrievals that have been successful
 * so far.
 * @param {PriceRetrieverFailure[]} failedTickerSymbolsAndErrors    Array containing all the price retrievals that have failed so far.
 */

/**
 * @typedef {object}    PriceRetrieverOptions
 * @property {PriceManager} priceManager    The price manager, required.
 * @property {PricedItem[]|Id[]|number[]} pricedItemRefs    Array of references to the priced items whose prices are to be retrieved,
 * valid elements are similar to the pricedItemRef argument of {@link PriceManager#resolveRefToPricedItem}.
 * @property {YMDDate}    [ymdDateA]    One date of the date range.
 * @property {YMDDate}    [ymdDateB=ymdDateA] The other date of the date range. If both ymdDateA and ymdDateB are left out then the current
 * date is used.
 * @property {PriceRetrieverCallback}   [callback]  Optional callback function called after prices are retrieved for a priced item.
 * @property {boolean}  [isElectron=false]  Set to <code>true</code> if this is called from Electron.
 */

/**
 * @typedef {object}    PriceRetrieverResult
 * @property {boolean}  isCancelled
 * @property {Price~Options[]}  priceOptions  Array containing the options for all the prices retrieved.
 * @property {number[]} successPricedItemIds  Array containing the local ids of all the priced items whose prices were successfully retrieved.
 * @property {number[]} failedPricedItemIds    Array containing the local ids of all the priced items whose prices could not be retrieved.
 */

/**
 * The main price retrieval function.
 * @param {PriceRetrieverOptions} options
 * @returns {PriceRetrieverResult}
 */
export async function asyncGetUpdatedPricedItemPrices(options) {
    let { priceManager, pricedItemRefs, ymdDateA, ymdDateB, callback, msecDelay, isElectron } = options;

    setIsElectron(isElectron);

    if (ymdDateB === undefined) {
        ymdDateB = ymdDateA;
    }
    if (ymdDateA === undefined) {
        ymdDateA = ymdDateB;
    }
    if (ymdDateA === undefined) {
        ymdDateA = new YMDDate();
        ymdDateB = ymdDateA;
    }
    if (YMDDate.compare(ymdDateA, ymdDateB) > 0) {
        [ymdDateA, ymdDateB] = [ymdDateB, ymdDateA];
    }

    if (ymdDateA === ymdDateB) {
        ymdDateA = YMDDate.fromOptions(ymdDateA);
        ymdDateB = ymdDateA;
    }
    else {
        ymdDateA = YMDDate.fromOptions(ymdDateA);
        ymdDateB = YMDDate.fromOptions(ymdDateB);
    }

    // Our little hack to work around weekends and holidays.
    // There should never be more than 3 days of weekend/holiday.
    let fromYMDDate = ymdDateA;
    const toYMDDate = ymdDateB;
    if (fromYMDDate.daysAfterMe(toYMDDate) < 4) {
        fromYMDDate = toYMDDate.addDays(-4);
    }

    const to = new Date(toYMDDate.valueOf() + 1000 * 60 * 60 * 12);
    const from = fromYMDDate.toDate();

    if (!Array.isArray(pricedItemRefs)) {
        pricedItemRefs = [pricedItemRefs];
    }

    const pricedItems = [];
    pricedItemRefs.forEach((pricedItem) => {
        pricedItem = priceManager.resolveRefToPricedItem(pricedItem);
        if (!pricedItem) {
            return;
        }
        if (!pricedItem.type.category.hasTickerSymbol) {
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

    const successPricedItemIds = [];
    const failedPricedItemIds = [];
    const successSymbolsAndPrices = [];
    const failedSymbols = [];
    const callbackArgs = {
        totalPricedItemsCount: pricedItems.length,
        successTickerSymbolsAndPrices: successSymbolsAndPrices,
        failedTickerSymbolsAndErrors: failedSymbols,
    };

    const retrieveArgs = {
        from: from,
        to: to,
        timeout: options.timeout,
    };

    let isCancelled = false;

    let prices = [];

    for (let i = 0; i < pricedItems.length; ++i) {
        const isLast = (i + 1) >= pricedItems.length;
        const pricedItem = pricedItems[i];
        const symbol = pricedItem.ticker;

        const priceOptions = [];

        try {
            retrieveArgs.symbol = symbol;
            const results = await retrieverFunc(retrieveArgs);

            if (msecDelay && (msecDelay > 0) && !isLast) {
                await new Promise((resolve, reject) => {
                    setTimeout(() => resolve(), msecDelay);
                });
            }

            // The results from historical() are from newest to oldest, but our default
            // price handler works best if the prices are from oldes to newest, so we reverse
            // their insertion.
            let optionsCount = 0;
            let i = results.length - 1;
            for (const result of results) {
                const ymdDate = new YMDDate(result.date);
                if ((optionsCount > 0) && (YMDDate.compare(ymdDate, ymdDateA) < 0)) {
                    // This test is for the case where we stuffed in extra days before to work
                    // around weekends and holidays.
                    continue;
                }

                const { quantityDefinition } = pricedItem;
                const options = {
                    pricedItemId: pricedItem.id,
                    ymdDate: ymdDate,
                    close: quantityDefinition.cleanupNumber(result.close),
                };

                if ((result.open !== result.close) || (result.high !== result.close) || (result.low !== result.close)) {
                    if (result.open !== undefined) {
                        options.open = quantityDefinition.cleanupNumber(result.open);
                    }
                    if (result.high !== undefined) {
                        options.high = quantityDefinition.cleanupNumber(result.high);
                    }
                    if (result.low !== undefined) {
                        options.low = quantityDefinition.cleanupNumber(result.low);
                    }
                }
                if ((result.adjClose !== undefined) && (result.adjClose !== result.close)) {
                    options.adjClose = quantityDefinition.cleanupNumber(result.adjClose);
                }
                if (result.volume) {
                    options.volume = result.volume;
                }

                priceOptions[i] = options;
                --i;
                ++optionsCount;
            }
            if (i >= 0) {
                priceOptions.splice(0, i + 1);
            }

            prices = prices.concat(priceOptions);

            successPricedItemIds.push(pricedItem.id);
            successSymbolsAndPrices.push({ ticker: symbol, priceOptions: priceOptions });
        }
        catch (e) {
            failedPricedItemIds.push(pricedItem.id);
            failedSymbols.push({ ticker: symbol, err: e });
        }

        if (callback) {
            callbackArgs.processedPricedItemsCount = i + 1;
            callbackArgs.pricedItemId = pricedItem.id;
            callbackArgs.priceOptions = priceOptions;
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
        priceOptions: prices,
        successPricedItemIds: successPricedItemIds,
        failedPricedItemIds: failedPricedItemIds,
    };
}

/*
export async function asyncUpdatePricedItemPrices(priceManager, pricedItems, dateA, dateB, description) {
    const result = await asyncGetUpdatedPricedItemPrices({
        priceManager: priceManager, pricedItemRefs: pricedItems, ymdDateA: dateA, ymdDateB: dateB, description: description,
    });

    const accountingSystem = priceManager.getAccountingSystem();
    const actionManager = accountingSystem.getActionManager();
    const addPricesAction = new AddPricesAction(accountingSystem, { newPriceOptions: result.priceOptions, description: description });
    await actionManager.applyAction(addPricesAction);

    return result;
}
*/