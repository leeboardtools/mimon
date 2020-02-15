import { EventEmitter } from 'events';
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
 * Retrieves a {@link Price} representation of a {@link PriceDataItem}, avoids 
 * copying if the arg is already an {@link Price}
 * @param {(PriceDataItem|Price)} priceDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {Price}
 */
export function getPrice(priceDataItem, alwaysCopy) {
    if (priceDataItem) {
        const ymdDate = getYMDDate(priceDataItem.ymdDate);
        if (alwaysCopy || (ymdDate !== priceDataItem.ymdDate)) {
            const price = Object.assign({}, priceDataItem);
            if (ymdDate !== undefined) {
                price.ymdDate = ymdDate;
            }
            return price;
        }
    }
    return priceDataItem;
}

/**
 * Retrieves a {@link PriceDataItem} representation of an {@link Price}, avoids 
 * copying if the arg is already a {@link PriceDataItem}
 * @param {(Price|PriceDataItem)} price 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 */
export function getPriceDataItem(price, alwaysCopy) {
    if (price) {
        const ymdDate = getYMDDateString(price.ymdDate);
        if (alwaysCopy || (ymdDate !== price.ymdDate)) {
            const priceDataItem = Object.assign({}, price);
            if (ymdDate !== undefined) {
                priceDataItem.ymdDate = ymdDate;
            }
            return priceDataItem;
        }
    }
    return price;
}



/**
 * Manages {@link Price}s.
 */
export class PriceManager extends EventEmitter {
    constructor(accountingSystem, options) {
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;

        const undoManager = accountingSystem.getUndoManager();
        this._asyncApplyUndoAddPrices = this._asyncApplyUndoAddPrices.bind(this);
        undoManager.registerUndoApplier('addPrices', this._asyncApplyUndoAddPrices);

        this._asyncApplyUndoRemovePrices = this._asyncApplyUndoRemovePrices.bind(this);
        undoManager.registerUndoApplier('removePrices', this._asyncApplyUndoRemovePrices);
    }

    async asyncSetupForUse() {
        
    }

    shutDownFromUse() {
        this._handler = undefined;
        this._accountingSystem = undefined;
    }

    getAccountingSystem() { return this._accountingSystem; }

    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices.
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
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        const result = await this._handler.asyncGetPriceDataItemsInDateRange(
            pricedItemId, ymdDateA, ymdDateB);
        return result.map((price) => getPriceDataItem(price, true));
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but before a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, 
            ymdDate);
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but after a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, 
            ymdDate);
    }


    async _asyncApplyUndoAddPrices(undoDataItem) {
        const { pricedItemId, updates } = undoDataItem;

        let addedPrices = [];
        let removedPrices = [];
        for (let i = updates.length - 1; i >= 0; --i) {
            const [ymdDate, priceDataItem] = updates[i];
            if (priceDataItem) {
                const result = await this._handler.asyncAddPriceDataItems(
                    pricedItemId, [priceDataItem]);
                addedPrices = addedPrices.concat(result.map(
                    (priceDataItem) => getPriceDataItem(priceDataItem, true)));
            }
            else {
                const ymdDateObject = getYMDDate(ymdDate);
                const result = await this._handler.asyncRemovePricesInDateRange(
                    pricedItemId, ymdDateObject, ymdDateObject);
                removedPrices = removedPrices.concat(result.map(
                    (priceDataItem) => getPriceDataItem(priceDataItem, true)));
            }
        }

        if (addedPrices.length) {
            this.emit('pricesAdd', { newPriceDataItems: addedPrices });
        }
        if (removedPrices.length) {
            this.emit('pricesRemove', { removedPriceDataItems: removedPrices });
        }
    }


    async _asyncApplyUndoRemovePrices(undoDataItem) {
        const { pricedItemId, removedPrices } = undoDataItem;
        if (removedPrices.length) {
            await this._handler.asyncAddPriceDataItems(pricedItemId, removedPrices);

            this.emit('pricesAdd', { newPriceDataItems: removedPrices });
        }
    }


    /**
     * Fired by {@link PriceManager#asyncAddPrices} after the prices have been added.
     * @event PriceManager~pricesAdd
     * @type {object}
     * @property {PriceDataItem[]}  newPriceDataItems   Array of the newly added 
     * price data items being returned
     * by the call to {@link PriceManager#asyncAddPrices}.
     */

    /**
     * @typedef {object}    PriceManager~AddPricesResult
     * @property {PriceDataItem[]}  newPriceDataItems
     */

    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {(Price|PriceDataItem|Price[]|PriceDataItem[])} prices 
     * @returns {PriceManager~AddPricesResult}
     * @fires {PriceManager~pricesAdd}
     */
    async asyncAddPrices(pricedItemId, prices) {
        if (!Array.isArray(prices)) {
            prices = [prices];
        }
        //const priceDataItems = prices.map((price) => getPriceDataItem(price, true));
        const priceDataItems = [];
        const updates = [];
        for (let i = 0; i < prices.length; ++i) {
            const priceDataItem = getPriceDataItem(prices[i]);
            priceDataItems.push(priceDataItem);

            const update = [ priceDataItem.ymdDate, ];
            updates.push(update);

            const ymdDate = getYMDDate(priceDataItem.ymdDate);
            const existingPriceDataItems = await this._handler
                .asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDate, ymdDate);
            if (existingPriceDataItems && existingPriceDataItems.length) {
                update.push(getPriceDataItem(existingPriceDataItems[0], true));
            }
        }

        const result = (await this._handler.asyncAddPriceDataItems(
            pricedItemId, priceDataItems)).map(
            (priceDataItem) => getPriceDataItem(priceDataItem, true));

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('addPrices', 
                { pricedItemId: pricedItemId, updates: updates, });

        this.emit('pricesAdd', { newPriceDataItems: result });
        return { newPriceDataItems: result, undoId: undoId, };
    }

    /**
     * Fired by {@link PriceManager#asyncRemovePrices} after the prices have been removed.
     * @event PriceManager~pricesRemove
     * @type {object}
     * @property {PriceDataItem[]}  removedPriceDataItems   Array of the removed price 
     * data items being returned by the call to {@link PriceManager#asyncRemovePrices}.
     */

    /**
     * @typedef {object}    PriceManager~RemovePricesResult
     * @property {PriceDataItem[]}  removedPriceDataItems
     */

    /**
     * Removes prices for a priced item that are within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA 
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]
     * @returns {PriceManager~RemovePricesResult}
     * @fires {PriceManager~pricesRemove}
     */
    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        const prices = await this._handler.asyncRemovePricesInDateRange(
            pricedItemId, ymdDateA, ymdDateB);

        const removedPrices = prices.map(
            (price) => getPriceDataItem(price, true));
        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('removePrices', 
                { pricedItemId: pricedItemId, removedPrices: removedPrices, });


        this.emit('pricesRemove', { removedPriceDataItems: prices });
        return { removedPriceDataItems: prices, undoId: undoId};
    }


}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to 
 * interact with the {@link PriceManager}.
 * @interface
 */

export class PricesHandler {
    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices.
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
     * Retrieves the price data item for a priced item that is on or closest to but 
     * before a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceDataItemOnOrClosestBefore() abstract method!');
    }

    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but after a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceDataItemOnOrClosestAfter() abstract method!');
    }


    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {PriceDataItem[]} prices 
     * @returns {PriceDataItem[]}   An array of the newly added prices.
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

        this._lastChangeId = 0;
    }


    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


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

        this.markChanged();
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
            return entry.getValues().slice(indexA, indexB + 1).map(
                (value) => getPriceDataItem(value));
        }
        return [];
    }

    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        const entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            const index = entry.indexLE({ ymdDate: ymdDate });
            return getPriceDataItem(entry.at(index));
        }
    }

    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        const entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            const index = entry.indexGE({ ymdDate: ymdDate });
            return getPriceDataItem(entry.at(index));
        }
    }

    _asyncAddPriceDataItems(pricedItemId, priceDataItems) {
        let entry = this._sortedPricesByPricedItemId.get(pricedItemId);
        if (!entry) {
            entry = new SortedArray((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate), 
                { duplicates: 'replace' });
            this._sortedPricesByPricedItemId.set(pricedItemId, entry);
        }

        priceDataItems.forEach((priceDataItem) => {
            // We store Price, not PriceDataItem so we can sort directly with 
            // YMDDate.compare().
            entry.add(getPrice(priceDataItem, true));
        });

        this.markChanged();

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

            this.markChanged();
            
            return removedPrices.map((value) => getPriceDataItem(value));
        }

        return [];
    }

}

