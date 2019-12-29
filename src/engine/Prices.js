import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';

/**
 * @typedef {object}    Price
 * All price values are in decimal number format, that is, $12.34 is 12.34.
 * 
 * @property {YMDDate}  ymdDate
 * @property {number}   close   The closing price
 * @property {number}   [open=undefined]
 * @property {number}   [high=undefined]
 * @property {number}   [low=undefined]
 * @property {number}   [volume=undefined]
 */

/**
 * @typedef {object}    PriceDataItem
 * All price values are in decimal number format, that is, $12.34 is 12.34.
 * 
 * @property {string}  ymdDate
 * @property {number}   close   The closing price
 * @property {number}   [open=undefined]
 * @property {number}   [high=undefined]
 * @property {number}   [low=undefined]
 * @property {number}   [volume=undefined]
 */


/**
 * Retrieves a {@link Price} representation of a {@link PriceDataItem}, avoids copying if the arg
 * is already an {@link Price}
 * @param {(PriceDataItem|Price)} priceDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Price}
 */
export function getPrice(priceDataItem, alwaysCopy) {
    if (priceDataItem) {
        const ymdDate = getYMDDate(priceDataItem.ymdDate);
        if (alwaysCopy || (ymdDate !== priceDataItem.ymdDate)) {
            const price = Object.assign({}, priceDataItem);
            price.ymdDate = ymdDate;
            return price;
        }
    }
    return priceDataItem;
}

/**
 * Retrieves a {@link PriceDataItem} representation of an {@link Price}, avoids copying if the arg
 * is already a {@link PriceDataItem}
 * @param {(Price|PriceDataItem)} price 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 */
export function getPriceDataItem(price, alwaysCopy) {
    if (price) {
        const ymdDate = getYMDDateString(price.ymdDate);
        if (alwaysCopy || (ymdDate !== price.ymdDate)) {
            const priceDataItem = Object.assign({}, price);
            priceDataItem.ymdDate = ymdDate;
            return priceDataItem;
        }
    }
    return price;
}



/**
 * Manages {@link Price}s.
 */
export class PriceManager {
    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
    }

    async asyncSetupForUse() {
        
    }

    getAccountingSystem() { return this._accountingSystem; }

    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest price dates, or <code>undefined</code> if there are no prices.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        return this._handler.asyncGetPriceDateRange(pricedItemId);
    }

    _resolveDateRange(ymdDateA, ymdDateB) {
        ymdDateA = (ymdDateA !== undefined) ? getYMDDate(ymdDateA) : ymdDateA;
        ymdDateB = (ymdDateB !== undefined) ? getYMDDate(ymdDateB) : ymdDateB;
        return YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);
    }

    /**
     * Retrieves the prices for a priced item within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date range, inclusive.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        const result = await this._handler.asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB);
        return result.map((price) => getPriceDataItem(price, true));
    }

    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {(Price|PriceDataItem|Price[]|PriceDataItem[])} prices 
     */
    async asyncAddPrices(pricedItemId, prices) {
        if (!Array.isArray(prices)) {
            prices = [prices];
        }
        const priceDataItems = prices.map((price) => getPriceDataItem(price, true));

        return this._handler.asyncAddPriceDataItems(pricedItemId, priceDataItems);
    }

    /**
     * Removes prices for a priced item that are within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA 
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]
     * @returns {PriceDataItem[]}   The prices that were removed.
     */
    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        return this._handler.asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB);
    }


}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link PriceManager}.
 * @interface
 */

export class PricesHandler {
    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest price dates, or <code>undefined</code> if there are no prices.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        throw Error('PricesHandler.asyncGetPricedDateRange() abstract method!');
    }

    /**
     * Retrieves the prices for a priced item within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} ymdDateB   The other end of the date range, inclusive.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        throw Error('PricesHandler.asyncGetPriceDataItemsInDateRange() abstract method!');
    }


    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {PriceDataItem[]} prices 
     */
    async asyncAddPriceDataItems(pricedItemId, priceDataItems) {
        throw Error('PricesHandler.asyncAddPriceDataItems() abstract method!');
    }

    /**
     * Removes prices for a priced item that are within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA 
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]
     * @returns {PriceDataItem[]}   The prices that were removed.
     */
    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        throw Error('PricesHandler.asyncRemovePricesInDateRange() abstract method!');
    }

}


/**
 * Simple in-memory implementation of {@link PricesHandler}
 */
export class InMemoryPricesHandler extends PricesHandler {
    constructor() {
        super();
        this._sortedPricesByPricedItemId = new Map();
    }

    toJSON() {
        return {
            pricedItemIdAndPrices: Array.from(this._sortedPricesByPricedItemId.entries()),
        };
    }

    fromJSON(json) {
        this._sortedPricesByPricedItemId.clear();
        json.pricedItemIdAndPrices.forEach(([pricedItemId, priceDataItems]) => {
            this._asyncAddPriceDataItems(pricedItemId, priceDataItems);
        });
    }

    async asyncGetPriceDateRange(pricedItemId) {
        const entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            return [ entry.at(0).ymdDate, entry.at(entry.length - 1).ymdDate, ];
        }
    }

    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        const entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            const indexA = entry.indexGE({ ymdDate: ymdDateA });
            const indexB = entry.indexLE({ ymdDate: ymdDateB });
            return entry.getValues().slice(indexA, indexB + 1).map((value) => getPriceDataItem(value));
        }
        return [];
    }

    _asyncAddPriceDataItems(pricedItemId, priceDataItems) {
        let entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (!entry) {
            entry = new SortedArray((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate), { duplicates: 'replace' });
            this._sortedPricesByPricedItemId.set(pricedItemId, entry);
        }

        priceDataItems.forEach((priceDataItem) => {
            // We store Price, not PriceDataItem so we can sort directly with YMDDate.compare().
            entry.add(getPrice(priceDataItem, true));
        });

        return priceDataItems;
    }


    async asyncAddPriceDataItems(pricedItemId, priceDataItems) {
        return this._asyncAddPriceDataItems(pricedItemId, priceDataItems);
    }

    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        const entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            const indexA = entry.indexGE({ ymdDate: ymdDateA });
            const indexB = entry.indexLE({ ymdDate: ymdDateB });
            
            const removedPrices = entry.getValues().slice(indexA, indexB + 1);
            entry.deleteIndexRange(indexA, indexB - indexA + 1);
            
            if (!entry.length) {
                this._sortedPricesByPricedItemId.delete(pricedItemId);
            }
            return removedPrices.map((value) => getPriceDataItem(value));
        }

        return [];
    }

}

