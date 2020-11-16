import { EventEmitter } from 'events';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { bSearch } from '../util/BinarySearch';
import { getDecimalDefinition, getQuantityDefinition } from '../util/Quantities';

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

    _resolveDateRange(ymdDateA, ymdDateB) {
        ymdDateA = (ymdDateA !== undefined) ? getYMDDate(ymdDateA) : ymdDateA;
        ymdDateB = (ymdDateB !== undefined) ? getYMDDate(ymdDateB) : ymdDateB;
        return YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);
    }


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
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        return this._handler.asyncGetPriceDateRange(pricedItemId);
    }

    /**
     * Retrieves the prices for a priced item within a date range.
     * The price data is raw price data and has not been adjusted by any 
     * price multipliers.
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
     * The price data is raw price data and has not been adjusted by any 
     * price multipliers.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, 
            ymdDate);
    }


    async asyncAdjustPriceDataItems(pricedItemId, priceDataItems, refYMDDate, isReverse) {
        if (!priceDataItems || !refYMDDate) {
            return priceDataItems;
        }

        const originalPriceDataItems = priceDataItems;
        if (!Array.isArray(priceDataItems)) {
            priceDataItems = [priceDataItems];
        }
        else if (!priceDataItems.length) {
            return priceDataItems;
        }


        const priceMultiplierDateRange = await this.asyncGetPriceMultiplierDateRange(
            pricedItemId
        );
        if (!priceMultiplierDateRange) {
            // No multipliers...
            return originalPriceDataItems;
        }

        
        const allPriceMultipliers 
            = await this.asyncGetPriceMultiplierDataItemsInDateRange(
                pricedItemId,
                priceMultiplierDateRange[0], priceMultiplierDateRange[1]);
        if (!allPriceMultipliers.length) {
            return originalPriceDataItems;
        }

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
            priceDataItem.close = priceQuantityDefinition.baseValueToNumber(
                priceQuantityDefinition.numberToBaseValue(priceDataItem.close)
            );

            priceDataItem.ymdDate = priceDataItem.ymdDate.toString();
        });

        if (!Array.isArray(originalPriceDataItems)) {
            return priceDataItems[0];
        }
        return priceDataItems;
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but after a particular date.
     * The price data is raw price data and has not been adjusted by any 
     * price multipliers.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, 
            ymdDate);
    }


    /**
     * Retrieves the date range of price multipliers available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price multiplier dates, or <code>undefined</code> if there are no prices.
     */
    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        return this._handler.asyncGetPriceMultiplierDateRange(pricedItemId);
    }

    /**
     * Retrieves the price multipliers for a priced item within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @returns {PriceMultiplierDataItem[]}   Array containing the prices within 
     * the date range.
     */
    async asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        const result = await this._handler.asyncGetPriceMultiplierDataItemsInDateRange(
            pricedItemId, ymdDateA, ymdDateB);
        return result.map((price) => getPriceMultiplierDataItem(price, true));
    }


    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but before a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined}
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceMultiplierDataItemOnOrClosestBefore(
            pricedItemId, 
            ymdDate);
    }


    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but after a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined}
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        ymdDate = getYMDDate(ymdDate);
        return this._handler.asyncGetPriceMultiplierDataItemOnOrClosestAfter(
            pricedItemId, 
            ymdDate);
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
                newPriceDataItems: addedPrices,
                newPriceMultiplierDataItems: addedPriceMultipliers,
            });
        }
        if (removedPrices.length || removedPriceMultipliers.length) {
            this.emit('pricesRemove', { 
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
                newPriceDataItems: removedPrices,
                newPriceMulitplierDataItems: removedPriceMultipliers,
            });
        }
    }


    /**
     * Fired by {@link PriceManager#asyncAddPrices} after the prices have been added.
     * @event PriceManager~pricesAdd
     * @type {object}
     * @property {PriceDataItem[]}  newPriceDataItems   Array of the newly added 
     * price data items being returned
     * by the call to {@link PriceManager#asyncAddPrices}.
     * @property {PriceMultiplierDataItem[]} newPriceMultiplierDataItems
     */

    /**
     * @typedef {object}    PriceManager~AddPricesResult
     * @property {PriceDataItem[]}  newPriceDataItems
     * @property {PriceMultiplierDataItem[]} newPriceMultiplierDataItems
     */

    /**
     * Adds prices for a priced item. Existing prices with the same dates are replaced.
     * @param {number} pricedItemId 
     * @param {(Price|PriceDataItem|Price[]|PriceDataItem[])} prices This may contain
     * both prices and price multipliers.
     * @param {PriceMultiplier|PriceMultiplierDataItem|
     *  PriceMultiplier[]|PriceMultiplierDataItem[]} [priceMultipliers]
     * @returns {PriceManager~AddPricesResult}
     * @fires {PriceManager~pricesAdd}
     */
    async asyncAddPrices(pricedItemId, prices, priceMultipliers) {
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
            if (typeof price.newCount === 'number') {
                priceMultipliers.push(getPriceMultiplierDataItem(price, true));
            }
            else {
                priceDataItems.push(getPriceDataItem(price, true));
            }
        });


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

        this.emit('pricesAdd', { newPriceDataItems: newPriceDataItems,
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
     * @property {PriceDataItem[]}  removedPriceDataItems   Array of the removed price 
     * data items being returned by the call to {@link PriceManager#asyncRemovePrices}.
     * @property {PriceMultiplierDataItem[]} removedPriceMultiplierDataItems
     */

    /**
     * @typedef {object} PriceManager~RemovePricesOptions
     * @property {boolean}  [noPrices=false]
     * @property {boolean}  [noPriceMultipliers=false]
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
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
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
     * Retrieves the date range of price multipliers available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price multiplier dates, or <code>undefined</code> if there are no price 
     * multipliers.
     */
    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        throw Error('PricesHandler.asyncGetPriceMultiplierDateRange() abstract method!');
    }

    /**
     * Retrieves the price multipliers for a priced item within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} ymdDateB   The other end of the date range, inclusive.
     * @returns {PriceMultiplierDataItem[]}   Array containing the price multipliers 
     * within the date range.
     */
    async asyncGetPriceMultiplierDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceMultiplierDataItemsInDateRange() abstract method!');
    }

    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but before a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined}
     */
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        // eslint-disable-next-line max-len
        throw Error('PricesHandler.asyncGetPriceMultiplierDataItemOnOrClosestBefore() abstract method!');
    }

    /**
     * Retrieves the price multiplier data item for a priced item that is on or 
     * closest to but after a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceMultiplierDataItem|undefined}
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
     * @param {(YMDDate|string)[]} ymdDates
     * @returns {PriceManager~RemovePricesResult}
     */
    async asyncRemovePricesByDate(pricedItemId, ymdDates) {
        throw Error('PricesHandler.asyncRemovePricesByDate() abstract method!');
    }

    /**
     * Removes price multipliers by date.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)[]} ymdDates
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
        return this._getItemDateRange(
            this._sortedPricesByPricedItemId,
            pricedItemId
        );
    }

    async asyncGetPriceMultiplierDateRange(pricedItemId) {
        return this._getItemDateRange(
            this._sortedPriceMultipliersByPricedItemId,
            pricedItemId
        );
    }


    _getDataItemsInDateRange(itemsByPricedItemIds, pricedItemId, ymdDateA, ymdDateB) {
        const entry = itemsByPricedItemIds.get(pricedItemId);
        if (entry && entry.length > 0) {
            const indexA = entry.indexGE({ ymdDate: ymdDateA });
            const indexB = entry.indexLE({ ymdDate: ymdDateB });
            return entry.getValues().slice(indexA, indexB + 1).map(
                (value) => getPriceDataItem(value));
        }
        return [];
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
        const entry = itemsByPricedItemIds.get(pricedItemId);
        if (entry && entry.length > 0) {
            const index = entry.indexLE({ ymdDate: ymdDate });
            return entry.at(index);
        }
    }

    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        return getPriceDataItem(this._getItemOnOrClosestBefore(
            this._sortedPricesByPricedItemId, pricedItemId, ymdDate));
    }
    
    async asyncGetPriceMultiplierDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        return getPriceMultiplierDataItem(this._getItemOnOrClosestBefore(
            this._sortedPriceMultipliersByPricedItemId, pricedItemId, ymdDate));
    }


    _getPriceDataItemOnOrClosestAfter(itemsByPricedItemIds, pricedItemId, ymdDate) {
        const entry = itemsByPricedItemIds.get(pricedItemId);
        if (entry && entry.length > 0) {
            const index = entry.indexGE({ ymdDate: ymdDate });
            return entry.at(index);
        }
    }

    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        return getPriceDataItem(this._getPriceDataItemOnOrClosestAfter(
            this._sortedPricesByPricedItemId, pricedItemId, ymdDate));
    }

    async asyncGetPriceMultiplierDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        return getPriceMultiplierDataItem(this._getPriceDataItemOnOrClosestAfter(
            this._sortedPriceMultipliersByPricedItemId, pricedItemId, ymdDate));
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

        if (!options.noPriceMultipliers) {
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

