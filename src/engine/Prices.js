import { EventEmitter } from 'events';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { bSearch } from '../util/BinarySearch';
import { getDecimalDefinition, getQuantityDefinition } from '../util/Quantities';
import { userError } from '../util/UserMessages';

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
 * @typedef {object} PriceMultiplier
 * A 4 for 1 split would have newCount = 4, oldCount = 1.
 * @property {YMDDate}  ymdDate
 * @property {number}   newCount
 * @property {number}   oldCount
 */


/**
 * @typedef {object} PriceMultiplierDataItem
 * A 4 for 1 split would have newCount = 4, oldCount = 1.
 * @property {string}  ymdDate
 * @property {number}   newCount
 * @property {number}   oldCount
 */


/**
 * Retrieves a {@link PriceMultiplier} representation of a 
 * {@link PriceMultiplierDataItem}, avoids copying if the arg is already
 * a {@link PriceMultiplier}
 * @param {(PriceMultiplierDataItem|PriceMultiplier)} priceMultiplierDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {PriceMultiplier}
 */
export function getPriceMultiplier(multiplierDataItem, alwaysCopy) {
    if (multiplierDataItem) {
        const ymdDate = getYMDDate(multiplierDataItem.ymdDate);
        if (alwaysCopy || (ymdDate !== multiplierDataItem.ymdDate)) {
            const multiplier = Object.assign({}, multiplierDataItem);
            if (ymdDate !== undefined) {
                multiplier.ymdDate = ymdDate;
            }
            return multiplier;
        }
    }
    return multiplierDataItem;
}

/**
 * Retrieves a {@link PriceMultiplierDataItem} representation of a 
 * {@link PriceMultiplier}, avoids copying if the arg is already a 
 * {@link PriceMultiplierDataItem}
 * @param {(PriceMultiplier|PriceMultiplierDataItem)} priceMultiplier 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 */
export function getPriceMultiplierDataItem(priceMultiplier, alwaysCopy) {
    if (priceMultiplier) {
        const ymdDate = getYMDDateString(priceMultiplier.ymdDate);
        if (alwaysCopy || (ymdDate !== priceMultiplier.ymdDate)) {
            const priceMultiplierDataItem = Object.assign({}, priceMultiplier);
            if (ymdDate !== undefined) {
                priceMultiplierDataItem.ymdDate = ymdDate;
            }
            return priceMultiplierDataItem;
        }
    }
    return priceMultiplier;
}

/**
 * Cleans up a price, makes sure that {@link isPrice} will return <code>true</code>
 * for the price if it is currently a valid price.
 * @param {PriceDataItem|Price|undefined} priceDataItem 
 * @returns {PriceDataItem|Price|undefined} priceDataItem
 */
export function cleanPriceDataItem(priceDataItem) {
    if (priceDataItem) {
        delete priceDataItem.newCount;
        delete priceDataItem.oldCount;
    }
    return priceDataItem;
}

/**
 * Cleans up a price multiplier, makes sure that {@link isMultiplier} will return 
 * <code>true</code> for the multiplier if it is currently a valid multiplier.
 * @param {PriceDataItem|Price|undefined} priceDataItem 
 * @returns {PriceDataItem|Price|undefined} priceDataItem
 */
export function cleanPriceMultiplierDataItem(priceMultiplierDataItem) {
    if (priceMultiplierDataItem) {
        delete priceMultiplierDataItem.close;
        delete priceMultiplierDataItem.open;
        delete priceMultiplierDataItem.low;
        delete priceMultiplierDataItem.high;
        delete priceMultiplierDataItem.volume;
    }
    return priceMultiplierDataItem;
}


/**
 * Determines if an item is a {@link Price}/{@link PriceDataItem} as opposed
 * to a {@link PriceMultiplier}/{@link PriceMultiplierDataItem}.
 * @param {Price|PriceItemDataItem|PriceMultiplier|PriceMultiplierDataItem} item 
 * @returns {boolean}
 */
export function isPrice(item) {
    if (!item) {
        return false;
    }
    return typeof item.close === 'number';
}


/**
 * Determines if an item is a {@link PriceMultiplier}/{@link PriceMultiplierDataItem}
 * as opposed to a {@link Price}/{@link PriceDataItem}.
 * @param {Price|PriceItemDataItem|PriceMultiplier|PriceMultiplierDataItem} item 
 * @returns {boolean}
 */
export function isMultiplier(item) {
    if (!item) {
        return false;
    }
    return typeof item.newCount === 'number';
}



function resolveDateRange(ymdDateA, ymdDateB) {
    ymdDateA = (ymdDateA !== undefined) ? getYMDDate(ymdDateA) : ymdDateA;
    ymdDateB = (ymdDateB !== undefined) ? getYMDDate(ymdDateB) : ymdDateB;
    return YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);
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

        this._defaultPriceQuantityDefinition = getDecimalDefinition({ decimalPlaces: 4});
    }

    async asyncSetupForUse() {
        
    }

    shutDownFromUse() {
        this._handler = undefined;
        this._accountingSystem = undefined;
    }

    getAccountingSystem() { return this._accountingSystem; }


    /**
     * @returns {QuantityDefinition} The quantity definition used for prices
     * if the priced item for a price does not have a priceQuantityDefinition property.
     */
    getDefaultPriceQuantityDefinition() {
        return this._defaultPriceQuantityDefinition;
    }

    /**
     * Sets the quantity definition to use for prices if the priced item for a price
     * does not have a priceQuantityDefinition property.
     * @param {QuantityDefinition} defaultPriceQuantityDefinition 
     */
    setDefaultPriceQuantityDefinition(defaultPriceQuantityDefinition) {
        this._defaultPriceQuantityDefinition 
            = getQuantityDefinition(defaultPriceQuantityDefinition);
    }

    /**
     * Retrieves the quantity definition to be used for prices for a given 
     * priced item.
     * @param {number} pricedItemId 
     * @returns {QuantityDefinition}
     */
    getPriceQuantityDefinitionForPricedItem(pricedItemId) {
        const pricedItemDataItem = this._accountingSystem.getPricedItemManager()
            .getPricedItemDataItemWithId(pricedItemId);
        let priceQuantityDefinition;
        if (pricedItemDataItem) {
            priceQuantityDefinition = pricedItemDataItem.priceQuantityDefinition;
        }
        return getQuantityDefinition(priceQuantityDefinition)
         || this._defaultPriceQuantityDefinition;
    }


    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices. If pricedItemId
     * is an array of priced item ids this is an array of YMDDate arrays or 
     * <code>undefined</code>s.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        return this._handler.asyncGetPriceDateRange(pricedItemId);
    }

    /**
     * @typedef {object} PriceManager~asyncGetPriceDataItemsInDateRangeArgs
     * @property {number} pricedItemId
     * @property {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @property {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @property {YMDDate|string}   [refYMDDate] If specified, the date to which
     * the prices are relative, otherwise the prices are raw prices.
     */

    /**
     * Retrieves the prices for a priced item within a date range.
     * <p>
     * If the first argument is a 
     * {@link PriceManager~asyncGetPriceDataItemsInDateRangeArgs} the remaining
     * arguments are ignored.
     * The prices returned are raw prices unless the first argument is a
     * {@link PriceManager~asyncGetPriceDataItemsInDateRangeArgs} and has the
     * refYMDDate property specified.
     * @param {number|PriceManager~asyncGetPriceDataItemsInDateRangeArgs|number[]}
     *      pricedItemId This may also be an array of priced item ids, in which case
     * the return will be an array whose elements correspond to what would be
     * the result of the individual priced item id being passed to this function.
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * If pricedItemId is an array this may also be an array whose elements are
     * one or two element sub-arrays, where the first element would be the ymdDateA
     * and the second element would be the ymdDateB for that priced item id.
     * If not an array then the same ymdDateA and ymdDateB values are used for
     * all the priced item ids.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive. Not used if ymdDateA is an array.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range,
     * an array of arrays if an array of priced item ids is passed in.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        if (!Array.isArray(pricedItemId) && (typeof pricedItemId === 'object')) {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            ymdDateA = args.ymdDateA;
            ymdDateB = args.ymdDateB;

            const result = await this.asyncGetPriceDataItemsInDateRange(
                pricedItemId, ymdDateA, ymdDateB);

            const { refYMDDate } = args;
            if (result && refYMDDate) {
                await this.asyncAdjustPriceDataItems(pricedItemId, result, refYMDDate);
            }
            return result;
        }

        if (!Array.isArray(ymdDateA)) {
            [ymdDateA, ymdDateB] = resolveDateRange(ymdDateA, ymdDateB);
        }

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result = await this._handler.asyncGetPriceDataItemsInDateRange(
            pricedItemIds, ymdDateA, ymdDateB);
        
        const finalResult = result.map((itemResult) => 
            itemResult.map((price) => getPriceDataItem(price, true)));
        return (pricedItemIds === pricedItemId)
            ? finalResult
            : finalResult[0];
    }


    /**
     * @typedef {object} PriceManager~asyncGetPriceDataItemOnOrClosestArgs
     * @property {number} pricedItemId 
     * @property {YMDDate|string} ymdDate 
     * @property {YMDDate|string} [refYMDDate] If specified, the date to which
     * the prices are relative, otherwise the prices are raw prices.
     */

    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but before a particular date.
     * <p>
     * If the first argument is a 
     * {@link PriceManager~asyncGetPriceDataItemOnOrClosestArgs} the remaining
     * arguments are ignored.
     * The prices returned are raw prices unless the first argument is a
     * {@link PriceManager~asyncGetPriceDataItemOnOrClosestArgs} and has the
     * refYMDDate property specified.
     * @param {number|PriceManager~asyncGetPriceDataItemOnOrClosestArgs} pricedItemId 
     * This may also be an array of priced item ids, in which case an array is
     * returned whose elements correspond to what the results would be for each 
     * priced item.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined|PriceDataItem[]} The price data item,
     * <code>undefined</code> if there is none,
     * an array of price data items and/or <code>undefined</code>s if an array 
     * of priced item ids is passed in.
     */
    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        if (!Array.isArray(pricedItemId) && (typeof pricedItemId === 'object')) {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            ymdDate = args.ymdDate;

            const result = await this.asyncGetPriceDataItemOnOrClosestBefore(
                pricedItemId, ymdDate);

            const { refYMDDate } = args;
            if (result && refYMDDate) {
                await this.asyncAdjustPriceDataItems(pricedItemId, result, refYMDDate);
            }
            return result;
        }
        
        ymdDate = getYMDDate(ymdDate);

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result = await this._handler.asyncGetPriceDataItemOnOrClosestBefore(
            pricedItemIds, 
            ymdDate);

        const finalResult = result.map((itemResult) =>
            getPriceDataItem(itemResult, true));
        return (pricedItemId === pricedItemIds)
            ? finalResult
            : finalResult[0];
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but after a particular date.
     * <p>
     * If the first argument is a 
     * {@link PriceManager~asyncGetPriceDataItemOnOrClosestArgs} the remaining
     * arguments are ignored.
     * The prices returned are raw prices unless the first argument is a
     * {@link PriceManager~asyncGetPriceDataItemOnOrClosestArgs} and has the
     * refYMDDate property specified.
     * @param {number|PriceManager~asyncGetPriceDataItemOnOrClosestArgs} pricedItemId 
     * This may also be an array of priced item ids, in which case an array is
     * returned whose elements correspond to what the results would be for each 
     * priced item.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined|PriceDataItem[]} The price data item,
     * <code>undefined</code> if there is none,
     * an array of price data items and/or <code>undefined</code>s if an array 
     * of priced item ids is passed in.
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        if (!Array.isArray(pricedItemId) && (typeof pricedItemId === 'object')) {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            ymdDate = args.ymdDate;

            const result = await this.asyncGetPriceDataItemOnOrClosestAfter(
                pricedItemId, ymdDate);
            
            const { refYMDDate } = args;
            if (result && refYMDDate) {
                await this.asyncAdjustPriceDataItems(pricedItemId, result, refYMDDate);
            }
            return result;
        }

        ymdDate = getYMDDate(ymdDate);

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result = await this._handler.asyncGetPriceDataItemOnOrClosestAfter(
            pricedItemIds, 
            ymdDate);

        const finalResult = result.map((itemResult) =>
            getPriceDataItem(itemResult, true));
        return (pricedItemId === pricedItemIds)
            ? finalResult
            : finalResult[0];
    }


    /**
     * Adjusts the closing price of one or more prices so they reflect the price
     * on a given date.
     * <p>
     * If priceDataItems is an array, it will be sorted in place.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which  If the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function. If this is an array then
     * priceDataItems should also be an array, and refYMDDate may optionally be an 
     * array.
     * @param {PriceDataItem|PriceDataItem[]} priceDataItems If pricedItemId is an
     * array of ids this should be an array whose elements correspond to what would
     * be the pricedDataItems argument if the function were called with the individual
     * priced item id.
     * @param {YMDDate|string} refYMDDate If pricedItemId this may also be an array
     * whose elements correspond to the reference date for the individual priced item
     * ids.
     * @param {boolean} [isReverse=false] If <code>true</code>, the prices in 
     * priceDataItems are in terms of the pricing on refYMDDate, and are converted to
     * the price relative to the date of the individual prices.
     * @returns {PriceDataItem|PriceDataItem[]} If pricedItemId is an array this is
     * an array whose elements correspond to what would be returned for the 
     * individual priced item ids.
     */
    async asyncAdjustPriceDataItems(pricedItemId, priceDataItems, refYMDDate, isReverse) {
        if (!priceDataItems || !refYMDDate) {
            return priceDataItems;
        }


        let pricedItemIds;
        let itemIdPriceDataItems;
        if (Array.isArray(pricedItemId)) {
            pricedItemIds = pricedItemId;
            itemIdPriceDataItems = priceDataItems;
        }
        else {
            pricedItemIds = [pricedItemId];
            itemIdPriceDataItems = [priceDataItems];
        }

        const itemIdPriceMultiplierDateRanges
            = await this.asyncGetPriceMultiplierDateRange(
                pricedItemIds
            );

        const itemIdAllPriceMultipliers 
            = await this.asyncGetPriceMultiplierDataItemsInDateRange(
                pricedItemIds,
                itemIdPriceMultiplierDateRanges);


        const result = [];

        for (let i = 0; i < pricedItemIds.length; ++i) {
            const originalPriceDataItems = itemIdPriceDataItems[i];
            result[i] = originalPriceDataItems;
            if (!originalPriceDataItems) {
                continue;
            }

            let priceDataItems = originalPriceDataItems;
            if (!Array.isArray(priceDataItems)) {
                priceDataItems = [priceDataItems];
            }
            else if (!priceDataItems.length) {
                continue;
            }

            const allPriceMultipliers = itemIdAllPriceMultipliers[i];
            if (!allPriceMultipliers || !allPriceMultipliers.length) {
                continue;
            }

            const ymdDate = Array.isArray(refYMDDate)
                ? refYMDDate[i]
                : refYMDDate;
            this._adjustPriceDataItems(pricedItemIds[i], priceDataItems,
                allPriceMultipliers, ymdDate, isReverse);

            result[i] = Array.isArray(originalPriceDataItems)
                ? priceDataItems
                : priceDataItems[0];
        }

        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }


    _adjustPriceDataItems(pricedItemId, priceDataItems, allPriceMultipliers, 
        refYMDDate, isReverse) {

        allPriceMultipliers.forEach((priceMultiplier) => {
            priceMultiplier.ymdDate = getYMDDate(priceMultiplier.ymdDate);
        });

        priceDataItems.forEach((priceDataItem) => {
            priceDataItem.ymdDate = getYMDDate(priceDataItem.ymdDate);
        });
        priceDataItems.sort((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate));

        refYMDDate = getYMDDate(refYMDDate);

        const refIndex = bSearch(allPriceMultipliers, { ymdDate: refYMDDate },
            (value, arrayValue) => YMDDate.compare(value.ymdDate, arrayValue.ymdDate)) 
            + 1;
        
        let newCount = 1;
        let oldCount = 1;
        for (let i = 0; i < refIndex; ++i) {
            const priceMultiplier = allPriceMultipliers[i];
            newCount *= priceMultiplier.newCount;
            oldCount *= priceMultiplier.oldCount;
        }

        if (this.isDebug) {
            console.log({
                newCount: newCount,
                oldCount: oldCount,
                refIndex: refIndex,
                allPriceMultipliers: allPriceMultipliers,
                priceDataItems: priceDataItems,
            });
        }


        const priceQuantityDefinition = this.getPriceQuantityDefinitionForPricedItem();

        let multiplierIndex = 0;
        let multiplierDateValue = allPriceMultipliers[0].ymdDate.valueOf();
        priceDataItems.forEach((priceDataItem) => {
            if (!isPrice(priceDataItem)) {
                // Most likely a price multiplier, just skip it.
                return;
            }

            const ymdDateValue = priceDataItem.ymdDate.valueOf();
            while ((multiplierDateValue <= ymdDateValue)
             && (multiplierIndex < allPriceMultipliers.length)) {

                const multiplier = allPriceMultipliers[multiplierIndex];
                if (multiplierIndex < refIndex) {
                    newCount /= multiplier.newCount;
                    oldCount /= multiplier.oldCount;
                }
                else {
                    newCount *= multiplier.oldCount;
                    oldCount *= multiplier.newCount;
                }

                ++multiplierIndex;
                if (multiplierIndex < allPriceMultipliers.length) {
                    multiplierDateValue 
                        = allPriceMultipliers[multiplierIndex].ymdDate.valueOf();
                }
                if (this.isDebug) {
                    console.log({
                        multiplierIndex: multiplierIndex,
                        multiplier: multiplier,
                        newCount: newCount,
                        oldCount: oldCount,
                    });
                }
            }

            if (this.isDebug) {
                console.log({
                    priceDataItem: priceDataItem,
                    newCount: newCount,
                    oldCount: oldCount,
                });
            }

            if (isReverse) {
                priceDataItem.close *= newCount / oldCount;
            }
            else {
                priceDataItem.close *= oldCount / newCount;
            }
            priceDataItem.close = priceQuantityDefinition.cleanupNumber(
                priceDataItem.close);

            priceDataItem.ymdDate = priceDataItem.ymdDate.toString();
        });

        return priceDataItems;
    }


    /**
     * Retrieves the date range of price multipliers available for a priced item.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price multiplier dates, or <code>undefined</code> if there are no prices. 
     * If pricedItemId is an array of priced item ids this is an array of YMDDate 
     * arrays or <code>undefined</code>s.
     */
    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        return this._handler.asyncGetPriceMultiplierDateRange(pricedItemId);
    }

    /**
     * Retrieves the price multipliers for a priced item within a date range.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * If pricedItemId is an array this may also be an array whose elements are
     * one or two element sub-arrays, where the first element would be the ymdDateA
     * and the second element would be the ymdDateB for that priced item id.
     * If not an array then the same ymdDateA and ymdDateB values are used for
     * all the priced item ids.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive. Not used if ymdDateA is an array.
     * @returns {PriceMultiplierDataItem[]}   Array containing the prices within 
     * the date range. If pricedItemId is an array of priced item ids this is an array
     * of the price arrays for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        if (!Array.isArray(pricedItemId) && (typeof pricedItemId === 'object')) {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            ymdDateA = args.ymdDateA;
            ymdDateB = args.ymdDateB;
        }

        if (!Array.isArray(ymdDateA)) {
            [ymdDateA, ymdDateB] = resolveDateRange(ymdDateA, ymdDateB);
        }

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result = await this._handler.asyncGetPriceMultiplierDataItemsInDateRange(
            pricedItemIds, ymdDateA, ymdDateB);

        const finalResult = result.map((itemResult) =>
            itemResult.map((price) => getPriceMultiplierDataItem(price, true)));
        
        return (pricedItemId === pricedItemIds)
            ? finalResult
            : finalResult[0];
    }


    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but before a particular date.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined} If pricedItemId is an array
     * this is an array whose elements correspond the result for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result 
            = await this._handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(
                pricedItemIds, 
                ymdDate);

        const finalResult = result.map((itemResult) =>
            getPriceMultiplierDataItem(itemResult, true));
        
        return (pricedItemId === pricedItemIds)
            ? finalResult
            : finalResult[0];
    }


    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but after a particular date.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined} If pricedItemId is an array
     * this is an array whose elements correspond the result for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);

        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        const result 
            = await this._handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(
                pricedItemIds, 
                ymdDate);

        const finalResult = result.map((itemResult) =>
            getPriceMultiplierDataItem(itemResult, true));
        
        return (pricedItemId === pricedItemIds)
            ? finalResult
            : finalResult[0];
    }

    /**
     * Retrieves both the prices and price multipliers for a priced item within a 
     * date range.
     * <p>
     * If the first argument is a 
     * {@link PriceManager~asyncGetPriceDataItemsInDateRangeArgs} the remaining
     * arguments are ignored.
     * The prices returned are raw prices unless the first argument is a
     * {@link PriceManager~asyncGetPriceDataItemsInDateRangeArgs} and has the
     * refYMDDate property specified.
     * @param {number|PriceManager~asyncGetPriceDataItemsInDateRangeArgs|number[]}
     *      pricedItemId This may also be an array of priced item ids, in which case
     * the return will be an array whose elements correspond to what would be
     * the result of the individual priced item id being passed to this function.
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @returns {PriceDataItem[]}   Array containing both the prices and the 
     * multipliers within the date range, sorted from oldest to newest date.
     * If pricedItemId is an array this is an array whose elements correspond
     * to the results for the individual priced item ids.
     */
    async asyncGetPriceAndMultiplierDataItemsInDateRange(
        pricedItemId, ymdDateA, ymdDateB) {

        if (!Array.isArray(pricedItemId) && (typeof pricedItemId === 'object')) {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            ymdDateA = args.ymdDateA;
            ymdDateB = args.ymdDateB;
        }
        
        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        
        const allPrices = await this.asyncGetPriceDataItemsInDateRange(
            pricedItemIds, ymdDateA, ymdDateB);
        const allMultipliers = await this.asyncGetPriceMultiplierDataItemsInDateRange(
            pricedItemIds, ymdDateA, ymdDateB);

        const allResults = [];
        for (let i = 0; i < allPrices.length; ++i) {
            allResults[i] = this._combinePricesAndMultipliers(
                allPrices[i], allMultipliers[i]);
        }

        return (pricedItemId === pricedItemIds)
            ? allResults
            : allResults[0];
    }


    _combinePricesAndMultipliers(prices, multipliers) {
        if (!multipliers.length) {
            return prices;
        }
        if (!prices.length) {
            return multipliers;
        }


        const result = [];
        let multiplierYMDDate = getYMDDate(multipliers[0].ymdDate);
        let priceYMDDate = getYMDDate(prices[0].ymdDate);

        let multiplierIndex = 0;
        let priceIndex = 0;

        while (priceYMDDate || multiplierYMDDate) {
            const compare = YMDDate.compare(multiplierYMDDate, priceYMDDate);
            if (((compare <= 0) || !priceYMDDate) && multiplierYMDDate) {
                result.push(multipliers[multiplierIndex]);
                ++multiplierIndex;
                if (multiplierIndex < multipliers.length) {
                    multiplierYMDDate = getYMDDate(multipliers[multiplierIndex].ymdDate);
                }
                else {
                    multiplierYMDDate = undefined;
                }
            }
            if (((compare >= 0) || !multiplierYMDDate) && priceYMDDate) {
                result.push(prices[priceIndex]);
                ++priceIndex;
                if (priceIndex < prices.length) {
                    priceYMDDate = getYMDDate(prices[priceIndex].ymdDate);
                }
                else {
                    priceYMDDate = undefined;
                }
            }
        }

        return result;
    }


    async _asyncApplyUndoAddPrices(undoDataItem) {
        const { pricedItemId, priceUpdates, priceMultiplierUpdates } = undoDataItem;

        let addedPrices = [];
        let addedPriceMultipliers = [];
        let removedPrices = [];
        let removedPriceMultipliers = [];
        const removedPriceYMDDates = [];
        const removedPriceMultiplierYMDDates = [];

        priceUpdates.forEach(([ymdDate, priceDataItem]) => {
            if (priceDataItem) {
                addedPrices.push(priceDataItem);
            }
            else {
                removedPriceYMDDates.push(getYMDDate(ymdDate));
            }
        });

        priceMultiplierUpdates.forEach(([ymdDate, priceMultiplierDataItem]) => {
            if (priceMultiplierDataItem) {
                addedPriceMultipliers.push(priceMultiplierDataItem);
            }
            else {
                removedPriceMultiplierYMDDates.push(getYMDDate(ymdDate));
            }
        });

        if (addedPrices.length || addedPriceMultipliers.length) {
            await this._handler.asyncAddPriceDataItems(
                pricedItemId, addedPrices, addedPriceMultipliers);
            addedPrices = addedPrices.map((price) => getPriceDataItem(price, true));
            addedPriceMultipliers = addedPriceMultipliers.map((price) => 
                getPriceMultiplierDataItem(price, true));
        }
        if (removedPriceYMDDates.length) {
            const result = await this._handler.asyncRemovePricesByDate(
                pricedItemId,
                removedPriceYMDDates
            );
            removedPrices = result.removedPriceDataItems;
        }
        if (removedPriceMultiplierYMDDates.length) {
            const result = await this._handler.asyncRemovePriceMultipliersByDate(
                pricedItemId,
                removedPriceMultiplierYMDDates
            );
            removedPriceMultipliers = result.removedPriceMultiplierDataItems;
        }

        if (addedPrices.length || addedPriceMultipliers.length) {
            this.emit('pricesAdd', { 
                pricedItemId: pricedItemId,
                newPriceDataItems: addedPrices,
                newPriceMultiplierDataItems: addedPriceMultipliers,
            });
        }
        if (removedPrices.length || removedPriceMultipliers.length) {
            this.emit('pricesRemove', { 
                pricedItemId: pricedItemId,
                removedPriceDataItems: removedPrices,
                removedPriceMultiplierDataItems: removedPriceMultipliers,
            });
        }
    }


    async _asyncApplyUndoRemovePrices(undoDataItem) {
        const { pricedItemId, removedPrices, removedPriceMultipliers } = undoDataItem;
        if (removedPrices.length || removedPriceMultipliers.length) {
            await this._handler.asyncAddPriceDataItems(pricedItemId, 
                removedPrices, 
                removedPriceMultipliers);

            this.emit('pricesAdd', { 
                pricedItemId: pricedItemId,
                newPriceDataItems: removedPrices,
                newPriceMulitplierDataItems: removedPriceMultipliers,
            });
        }
    }


    /**
     * Fired by {@link PriceManager#asyncAddPrices} after the prices have been added.
     * @event PriceManager~pricesAdd
     * @type {object}
     * @property {number} pricedItemId
     * @property {PriceDataItem[]}  newPriceDataItems   Array of the newly added 
     * price data items being returned
     * by the call to {@link PriceManager#asyncAddPrices}.
     * @property {PriceMultiplierDataItem[]} newPriceMultiplierDataItems
     */

    /**
     * @typedef {object}    PriceManager~asyncAddPricesArgs
     * @property {number} pricedItemId 
     * @property {(Price|PriceDataItem|Price[]|PriceDataItem[])} prices This may contain
     * both prices and price multipliers.
     * @property {PriceMultiplier|PriceMultiplierDataItem|
     *  PriceMultiplier[]|PriceMultiplierDataItem[]} [priceMultipliers]
     * @property {YMDDate|string} [refYMDDate] If specified, the date to which
     * the prices are relative, otherwise the prices are raw prices.
     */

    /**
     * @typedef {object}    PriceManager~asyncAddPricesResult
     * The prices returned are always raw prices.
     * @property {PriceDataItem[]}  newPriceDataItems
     * @property {PriceMultiplierDataItem[]} newPriceMultiplierDataItems
     */

    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * If the first argument is a {@link PriceManager~asyncAddPricesArgs} the remaining
     * arguments are ignored.
     * The prices specified are raw prices unless the first argument is a
     * {@link PriceManager~asyncAddPricesArgs} and has the
     * refYMDDate property specified.
     * @param {number|PriceManager~asyncAddPricesArgs} pricedItemId 
     * @param {(Price|PriceDataItem|Price[]|PriceDataItem[])} prices This may contain
     * both prices and price multipliers.
     * @param {PriceMultiplier|PriceMultiplierDataItem|
     *  PriceMultiplier[]|PriceMultiplierDataItem[]} [priceMultipliers]
     * @returns {PriceManager~asyncAddPricesResult}
     * @fires {PriceManager~pricesAdd}
     */
    async asyncAddPrices(pricedItemId, prices, priceMultipliers) {
        let refYMDDate;
        if (typeof pricedItemId === 'object') {
            const args = pricedItemId;
            pricedItemId = args.pricedItemId;
            prices = args.prices;
            priceMultipliers = args.priceMultipliers;
            refYMDDate = args.refYMDDate;
        }

        if (!Array.isArray(prices)) {
            prices = [prices];
        }

        if (priceMultipliers) {
            if (!Array.isArray(priceMultipliers)) {
                priceMultipliers = [
                    getPriceMultiplierDataItem(priceMultipliers, true)
                ];
            }
            else {
                priceMultipliers = priceMultipliers.map((priceMultiplier) =>
                    getPriceMultiplierDataItem(priceMultiplier, true));
            }
        }
        else {
            priceMultipliers = [];
        }

        const priceDataItems = [];
        prices.forEach((price) => {
            if (typeof price.close !== 'undefined') {
                if (typeof price.close !== 'number') {
                    throw userError('PriceManager-invalid_price_close');
                }
                if (!getYMDDate(price.ymdDate)) {
                    throw userError('PriceManager-invalid_price_date');
                }
                priceDataItems.push(getPriceDataItem(price, true));
            }
            else {
                priceMultipliers.push(getPriceMultiplierDataItem(price, true));
            }
        });

        priceMultipliers.forEach((priceMultiplier) => {
            if (!getYMDDate(priceMultiplier.ymdDate)) {
                throw userError('PriceManager-invalid_multiplier_date');
            }
            if ((typeof priceMultiplier.newCount !== 'number')
             || (typeof priceMultiplier.oldCount !== 'number')) {
                throw userError('PriceManager-invalid_multiplier_counts');
            }
            if ((priceMultiplier.newCount <= 0) || (priceMultiplier.oldCount <= 0)) {
                throw userError('PriceManager-invalid_multiplier_counts');
            }
        });


        if (refYMDDate) {
            const priceMultiplierDateRange = await this.asyncGetPriceMultiplierDateRange(
                pricedItemId
            );

            let allPriceMultipliers;
            if (!priceMultiplierDateRange) {
                // No existing multipliers...
                allPriceMultipliers = priceMultipliers;
            }
            else {
                allPriceMultipliers 
                    = await this.asyncGetPriceMultiplierDataItemsInDateRange(
                        pricedItemId,
                        priceMultiplierDateRange[0], priceMultiplierDateRange[1]);
                if (priceMultipliers.length) {
                    const uniquePriceMultipliers = new Map();
                    allPriceMultipliers.forEach((priceMultiplier) => {
                        const ymdDate = getYMDDate(priceMultiplier.ymdDate);
                        uniquePriceMultipliers.set(
                            ymdDate.valueOf(), priceMultiplier);
                    });
                    priceMultipliers.forEach((priceMultiplier) => {
                        const ymdDate = getYMDDate(priceMultiplier.ymdDate);
                        uniquePriceMultipliers.set(
                            ymdDate.valueOf(), priceMultiplier);
                    });

                    allPriceMultipliers = Array.from(uniquePriceMultipliers.values());
                    allPriceMultipliers.sort((a, b) => 
                        YMDDate.compare(a.ymdDate, b.ymdDate));
                }
            }

            if (allPriceMultipliers.length) {
                // Adjusting to raw prices...
                this._adjustPriceDataItems(pricedItemId, priceDataItems,
                    allPriceMultipliers, refYMDDate, true);
            }
        }


        const priceUpdates = await this._asyncGenerateItemUpdates(
            priceDataItems,
            async (ymdDate) =>
                this._handler.asyncGetPriceDataItemsInDateRange(pricedItemId, 
                    ymdDate, ymdDate),
            (dataItem) => getPriceDataItem(dataItem, true)
        );

        const priceMultiplierUpdates = await this._asyncGenerateItemUpdates(
            priceMultipliers,
            async (ymdDate) =>
                this._handler.asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, 
                    ymdDate, ymdDate),
            (dataItem) => getPriceMultiplierDataItem(dataItem, true)
        );

        const result = await this._handler.asyncAddPriceDataItems(
            pricedItemId, priceDataItems, priceMultipliers);

        const newPriceDataItems = result.newPriceDataItems.map(
            (priceDataItem) => getPriceDataItem(priceDataItem, true));
        const newPriceMultiplierDataItems = result.newPriceMultiplierDataItems.map(
            (priceMultiplierDataItem) => 
                getPriceMultiplierDataItem(priceMultiplierDataItem, true)
        );

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('addPrices', 
                { pricedItemId: pricedItemId, 
                    priceUpdates: priceUpdates, 
                    priceMultiplierUpdates: priceMultiplierUpdates,
                });

        this.emit('pricesAdd', { 
            pricedItemId: pricedItemId,
            newPriceDataItems: newPriceDataItems,
            newPriceMultiplierDataItems: newPriceMultiplierDataItems,
        });
        return { newPriceDataItems: newPriceDataItems, 
            newPriceMultiplierDataItems: newPriceMultiplierDataItems,
            undoId: undoId, 
        };
    }


    async _asyncGenerateItemUpdates(dataItems, 
        asyncGetItemForDate, copyDataItem) {
        const updates = [];
        for (let i = 0; i < dataItems.length; ++i) {
            const dataItem = dataItems[i];
            const update = [ dataItem.ymdDate, ];
            updates.push(update);

            const ymdDate = getYMDDate(dataItem.ymdDate);
            const existingPriceDataItems = await asyncGetItemForDate(
                ymdDate);
            if (existingPriceDataItems && existingPriceDataItems.length) {
                update.push(copyDataItem(existingPriceDataItems[0]));
            }
        }

        return updates;
    }


    /**
     * Fired by {@link PriceManager#asyncRemovePrices} after the prices have been removed.
     * @event PriceManager~pricesRemove
     * @type {object}
     * @property {number} pricedItemId
     * @property {PriceDataItem[]}  removedPriceDataItems   Array of the removed price 
     * data items being returned by the call to {@link PriceManager#asyncRemovePrices}.
     * @property {PriceMultiplierDataItem[]} removedPriceMultiplierDataItems
     */

    /**
     * @typedef {object} PriceManager~RemovePricesOptions
     * @property {boolean}  [noPrices=false]
     * @property {boolean}  [noMultipliers=false]
     */

    /**
     * @typedef {object}    PriceManager~RemovePricesResult
     * @property {PriceDataItem[]}  removedPriceDataItems
     * @property {PriceMultiplierDataItem[]}    removedPriceMultiplierDataItems
     */

    /**
     * Removes prices and/or price multipliers for a priced item that are 
     * within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA 
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]
     * @param {PriceManager~RemovePricesOptions} [options=undefined]
     * @returns {PriceManager~RemovePricesResult}
     * @fires {PriceManager~pricesRemove}
     */
    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB, options) {
        [ymdDateA, ymdDateB] = resolveDateRange(ymdDateA, ymdDateB);
        const result = await this._handler.asyncRemovePricesInDateRange(
            pricedItemId, ymdDateA, ymdDateB, options);

        const removedPriceDataItems = result.removedPriceDataItems.map(
            (price) => getPriceDataItem(price, true));
        const removedPriceMultiplierDataItems 
            = result.removedPriceMultiplierDataItems.map(
                (priceMultiplier) => getPriceMultiplierDataItem(priceMultiplier, true));

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('removePrices', 
                { pricedItemId: pricedItemId, 
                    removedPrices: result.removedPriceDataItems, 
                    removedPriceMultipliers: result.removedPriceMultiplierDataItems,
                });


        this.emit('pricesRemove', { 
            pricedItemId: pricedItemId,
            removedPriceDataItems: removedPriceDataItems,
            removedPriceMultiplierDataItems: removedPriceMultiplierDataItems,
        });
        return { 
            removedPriceDataItems: removedPriceDataItems, 
            removedPriceMultiplierDataItems: removedPriceMultiplierDataItems,
            undoId: undoId
        };
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
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices. If pricedItemId
     * is an array of priced item ids this is an array of YMDDate arrays or 
     * <code>undefined</code>s.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        throw Error('PricesHandler.asyncGetPricedDateRange() abstract method!');
    }

    /**
     * Retrieves the prices for a priced item within a date range.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * If pricedItemId is an array this may also be an array whose elements are
     * one or two element sub-arrays, where the first element would be the ymdDateA
     * and the second element would be the ymdDateB for that priced item id.
     * If not an array then the same ymdDateA and ymdDateB values are used for
     * all the priced item ids.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive. Not used if ymdDateA is an array.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range.
     * If pricedItemId is an array of priced item ids this is any array of 
     * PriceDataItem arrays.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        throw Error('PricesHandler.asyncGetPriceDataItemsInDateRange() abstract method!');
    }

    /**
     * Retrieves the price data item for a priced item that is on or closest to but 
     * before a particular date.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
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
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceDataItemOnOrClosestAfter() abstract method!');
    }


    /**
     * Retrieves the date range of price multipliers available for a priced item.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price multiplier dates, or <code>undefined</code> if there are no prices. 
     * If pricedItemId is an array of priced item ids this is an array of YMDDate 
     * arrays or <code>undefined</code>s.
     */
    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        throw Error('PricesHandler.asyncGetPriceMultiplierDateRange() abstract method!');
    }

    /**
     * Retrieves the price multipliers for a priced item within a date range.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * If pricedItemId is an array this may also be an array whose elements are
     * one or two element sub-arrays, where the first element would be the ymdDateA
     * and the second element would be the ymdDateB for that priced item id.
     * If not an array then the same ymdDateA and ymdDateB values are used for
     * all the priced item ids.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive. Not used if ymdDateA is an array.
     * @returns {PriceMultiplierDataItem[]}   Array containing the prices within 
     * the date range. If pricedItemId is an array of priced item ids this is an array
     * of the price arrays for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceMultiplierDataItemsInDateRange() abstract method!');
    }

    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but before a particular date.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined} If pricedItemId is an array
     * this is an array whose elements correspond the result for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceMultiplierDataItemOnOrClosestBefore() abstract method!');
    }

    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but after a particular date.
     * @param {number|number[]} pricedItemId The id of the priced item of interest, 
     * this may be an array of multiple priced items, in which case the result will 
     * be an array whose elements correspond to what would be the result of the 
     * individual priced item id passed to this function.
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined} If pricedItemId is an array
     * this is an array whose elements correspond the result for each priced item id.
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceMultiplierDataItemOnOrClosestAfter() abstract method!');
    }


    /**
     * Adds prices and/or price multipliers for a priced item. 
     * Existing prices/price multipliers with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {PriceDataItem[]} prices 
     * @param {PriceMultilierDataItem[]} priceMultipliers
     * @returns {PriceManager~AddPricesResult[]}   An array of the newly added prices and 
     * price multipliers.
     */
    async asyncAddPriceDataItems(pricedItemId, priceDataItems, priceMultiplierDataItems) {
        throw Error('PricesHandler.asyncAddPriceDataItems() abstract method!');
    }

    /**
     * Removes prices for a priced item that are within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA 
     * @param {(YMDDate|string)} ymdDateB
     * @param {PriceManager~RemovePricesOptions} options
     * @returns {PriceManager~RemovePricesResult}
     */
    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB, options) {
        throw Error('PricesHandler.asyncRemovePricesInDateRange() abstract method!');
    }

    /**
     * Removes prices by date.
     * @param {number} pricedItemId 
     * @param {YMDDate[]|string[]} ymdDates
     * @returns {PriceManager~RemovePricesResult}
     */
    async asyncRemovePricesByDate(pricedItemId, ymdDates) {
        throw Error('PricesHandler.asyncRemovePricesByDate() abstract method!');
    }

    /**
     * Removes price multipliers by date.
     * @param {number} pricedItemId 
     * @param {YMDDate[]|string[]} ymdDates
     * @returns {PriceManager~RemovePricesResult}
     */
    async asyncRemovePriceMultipliersByDate(pricedItemId, ymdDates) {
        throw Error('PricesHandler.asyncRemovePriceMultipliersByDate() abstract method!');
    }

}


/**
 * Simple in-memory implementation of {@link PricesHandler}
 */
export class InMemoryPricesHandler extends PricesHandler {
    constructor() {
        super();
        this._sortedPricesByPricedItemId = new Map();
        this._sortedPriceMultipliersByPricedItemId = new Map();

        this._lastChangeId = 0;
    }


    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


    toJSON() {
        return {
            pricedItemIdAndPrices: Array.from(this._sortedPricesByPricedItemId.entries()),
            pricedItemIdAndPriceMultipliers:
                Array.from(this._sortedPriceMultipliersByPricedItemId.entries())
        };
    }

    fromJSON(json) {
        this._sortedPricesByPricedItemId.clear();
        this._sortedPriceMultipliersByPricedItemId.clear();

        json.pricedItemIdAndPrices.forEach(([pricedItemId, priceDataItems]) => {
            this._asyncAddPriceDataItems(pricedItemId, priceDataItems);
        });

        if (json.pricedItemIdAndPriceMultipliers) {
            json.pricedItemIdAndPriceMultipliers.forEach(
                ([pricedItemId, priceMultiplierDataItems]) => {
                    this._asyncAddPriceDataItems(pricedItemId, 
                        [], priceMultiplierDataItems);
                });
        }

        this.markChanged();
    }


    _getItemDateRange(itemsByPricedItemId, pricedItemId) {
        const entry = itemsByPricedItemId.get(pricedItemId);
        if (entry && entry.length > 0) {
            return [ entry.at(0).ymdDate, entry.at(entry.length - 1).ymdDate, ];
        }
    }

    async asyncGetPriceDateRange(pricedItemId) {
        const pricedItemIds = Array.isArray(pricedItemId) 
            ? pricedItemId 
            : [pricedItemId];
        
        const result = pricedItemIds.map((pricedItemId) => 
            this._getItemDateRange(
                this._sortedPricesByPricedItemId,
                pricedItemId
            ));
        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }

    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];

        const result = pricedItemIds.map((pricedItemId) => 
            this._getItemDateRange(
                this._sortedPriceMultipliersByPricedItemId,
                pricedItemId
            ));
        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }


    _getDataItemsInDateRange(itemsByPricedItemIds, pricedItemId, ymdDateA, ymdDateB) {
        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        
        const result = [];
        const ymdDateArray = Array.isArray(ymdDateA) ? ymdDateA : undefined;

        for (let i = 0; i < pricedItemIds.length; ++i) {
            const pricedItemId = pricedItemIds[i];

            let answer;
            const entry = itemsByPricedItemIds.get(pricedItemId);
            if (entry && entry.length > 0) {
                if (ymdDateArray) {
                    const row = ymdDateArray[i];
                    [ ymdDateA, ymdDateB ] = resolveDateRange(row[0], row[1]);
                }

                const indexA = entry.indexGE({ ymdDate: ymdDateA });
                const indexB = entry.indexLE({ ymdDate: ymdDateB });
                answer = entry.getValues().slice(indexA, indexB + 1).map(
                    (value) => getPriceDataItem(value));
            }
            else {
                answer = [];
            }
            result.push(answer);
        }

        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }

    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        return this._getDataItemsInDateRange(
            this._sortedPricesByPricedItemId, pricedItemId, ymdDateA, ymdDateB);
    }

    async asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        return this._getDataItemsInDateRange(
            this._sortedPriceMultipliersByPricedItemId, pricedItemId, ymdDateA, ymdDateB);
    }


    _getItemOnOrClosestBefore(itemsByPricedItemIds, pricedItemId, ymdDate) {
        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];
        
        const result = pricedItemIds.map((pricedItemId) => {
            const entry = itemsByPricedItemIds.get(pricedItemId);
            if (entry && entry.length > 0) {
                const index = entry.indexLE({ ymdDate: ymdDate });
                return entry.at(index);
            }
        });

        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }

    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        return this._getItemOnOrClosestBefore(
            this._sortedPricesByPricedItemId, pricedItemId, ymdDate);
    }
    
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        return this._getItemOnOrClosestBefore(
            this._sortedPriceMultipliersByPricedItemId, pricedItemId, ymdDate);
    }


    _getPriceDataItemOnOrClosestAfter(itemsByPricedItemIds, pricedItemId, ymdDate) {
        const pricedItemIds = Array.isArray(pricedItemId)
            ? pricedItemId
            : [pricedItemId];

        const result = pricedItemIds.map((pricedItemId) => {
            const entry = itemsByPricedItemIds.get(pricedItemId);
            if (entry && entry.length > 0) {
                const index = entry.indexGE({ ymdDate: ymdDate });
                return entry.at(index);
            }
        });

        return (pricedItemId === pricedItemIds)
            ? result
            : result[0];
    }

    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        return this._getPriceDataItemOnOrClosestAfter(
            this._sortedPricesByPricedItemId, pricedItemId, ymdDate);
    }

    async asyncGetPriceMultiplierDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        return this._getPriceDataItemOnOrClosestAfter(
            this._sortedPriceMultipliersByPricedItemId, pricedItemId, ymdDate);
    }


    _addDataItems(pricedItemId, dataItems, itemsByPricedItemIds, copyItem) {
        if (dataItems.length) {
            let entry = itemsByPricedItemIds.get(pricedItemId);
            if (!entry) {
                entry = new SortedArray((a, b) => 
                    YMDDate.compare(a.ymdDate, b.ymdDate), 
                { duplicates: 'replace' });
                itemsByPricedItemIds.set(pricedItemId, entry);
            }

            dataItems.forEach((dataItem) => {
                // We store Price, not PriceDataItem so we can sort directly with 
                // YMDDate.compare().
                entry.add(copyItem(dataItem));
            });
        }
    }

    _asyncAddPriceDataItems(pricedItemId, priceDataItems, priceMultiplierDataItems) {
        this._addDataItems(pricedItemId, priceDataItems,
            this._sortedPricesByPricedItemId, 
            (item) => getPrice(item, true));

        priceMultiplierDataItems = priceMultiplierDataItems || [];
        this._addDataItems(pricedItemId, priceMultiplierDataItems,
            this._sortedPriceMultipliersByPricedItemId, 
            (item) => getPriceMultiplier(item, true));

        this.markChanged();

        return {
            newPriceDataItems: priceDataItems,
            newPriceMultiplierDataItems: priceMultiplierDataItems,
        };
    }


    async asyncAddPriceDataItems(pricedItemId, priceDataItems, priceMultiplierDataItems) {
        return this._asyncAddPriceDataItems(
            pricedItemId, priceDataItems, priceMultiplierDataItems);
    }


    _removeItemsInRange(pricedItemId, ymdDateA, ymdDateB, 
        itemsByPricedItemIds, copyDataItem) {
        const entry = itemsByPricedItemIds.get(pricedItemId);
        if (entry && entry.length > 0) {
            const indexA = entry.indexGE({ ymdDate: ymdDateA });
            const indexB = entry.indexLE({ ymdDate: ymdDateB });
            
            const removedPrices = entry.getValues().slice(indexA, indexB + 1);
            entry.deleteIndexRange(indexA, indexB - indexA + 1);
            
            if (!entry.length) {
                itemsByPricedItemIds.delete(pricedItemId);
            }

            return removedPrices.map((value) =>
                copyDataItem(value));
        }
        return [];
    }

    async asyncRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB, options) {
        options = options || {};

        let removedPriceDataItems = [];
        let removedPriceMultiplierDataItems = [];

        if (!options.noPrices) {
            removedPriceDataItems
                = this._removeItemsInRange(pricedItemId, ymdDateA, ymdDateB, 
                    this._sortedPricesByPricedItemId, 
                    (dataItem) => getPriceDataItem(dataItem, true));
        }

        if (!options.noMultipliers) {
            removedPriceMultiplierDataItems
                = this._removeItemsInRange(pricedItemId, ymdDateA, ymdDateB, 
                    this._sortedPriceMultipliersByPricedItemId, 
                    (dataItem) => getPriceMultiplierDataItem(dataItem, true));
        }


        if (removedPriceDataItems.length || removedPriceMultiplierDataItems.length) {
            this.markChanged();
        }

        return {
            removedPriceDataItems: removedPriceDataItems,
            removedPriceMultiplierDataItems: removedPriceMultiplierDataItems,
        };
    }


    _removeItemsByDate(pricedItemId, ymdDates, itemsByPricedItemIds, copyDataItem) {
        const entry = itemsByPricedItemIds.get(pricedItemId);
        if (entry && entry.length > 0) {
            const removedItems = [];

            ymdDates.forEach((ymdDate) => {
                const index = entry.indexOf({
                    ymdDate: getYMDDate(ymdDate),
                });
                if (index >= 0) {
                    const removedPrice = entry.getValues().slice(index, index + 1)[0];
                    removedItems.push(removedPrice);
                    entry.deleteIndexRange(index, 1);
                }
            });
            
            if (!entry.length) {
                itemsByPricedItemIds.delete(pricedItemId);
            }

            this.markChanged();
            
            return removedItems.map((value) => 
                copyDataItem(value));
        }
        return [];
    }

    async asyncRemovePricesByDate(pricedItemId, ymdDates) {
        return {
            removedPriceDataItems: this._removeItemsByDate(
                pricedItemId, ymdDates, 
                this._sortedPricesByPricedItemId, 
                (dataItem) => getPriceDataItem(dataItem, true)),
            removedPriceMultiplierDataItems: []
        };
    }


    async asyncRemovePriceMultipliersByDate(pricedItemId, ymdDates) {
        return {
            removedPriceDataItems: [],
            removedPriceMultiplierDataItems: this._removeItemsByDate(
                pricedItemId, ymdDates, 
                this._sortedPriceMultipliersByPricedItemId, 
                (dataItem) => getPriceMultiplierDataItem(dataItem, true)),
        };
    }

}

