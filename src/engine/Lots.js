import { getYMDDate, getYMDDateString } from '../util/YMDDate';

/**
 * @typedef {object} LotDataItem
 * @property {string}   purchaseYMDDate The purchase date of this lot represented as a {@link YMDDate} string.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot. The {@link QuantityDefinition} is the quantity
 * definition of the priced item of the account the lot belongs to.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot. The {@link QuantityDefinition} and
 * {@link Currency} are from the priced item of the account the lot belongs to.
 * @property {string}   [description]   The description of the lot.
 */


/**
 * @typedef {object} Lot
 * @property {YMDDate}  purchaseYMDDate The purchase date of the lot.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot. The {@link QuantityDefinition} is the quantity
 * definition of the priced item of the account the lot belongs to.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot. The {@link QuantityDefinition} and
 * {@link Currency} are from the priced item of the account the lot belongs to.
 * @property {string}   [description]   The description of the lot.
 */

/**
 * Retrieves a {@link Lot} representation of a {@link LotDataItem}
 * @param {(LotDataItem|Lot)} lotDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Lot}
 */
export function getLot(lotDataItem, alwaysCopy) {
    if (lotDataItem) {
        const purchaseYMDDate = getYMDDate(lotDataItem.purchaseYMDDate);
        if (alwaysCopy || (purchaseYMDDate !== lotDataItem.purchaseYMDDate)) {
            const lot = Object.assign({}, lotDataItem);
            lot.purchaseYMDDate = purchaseYMDDate;
            return lot;
        }
    }
    return lotDataItem;
}


function checkFirstDefinedEntry(array, callback) {
    for (let i = 0; i < array.length; ++i) {
        if ((array[i] !== undefined) && (array[i] !== null)) {
            return callback(i);
        }
    }
}

/**
 * Array version of {@link getLot}.
 * @param {(LotDataItem[]|Lot[])} lotDataItems 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new array with new object will always be created.
 * @returns {Lot[]}
 */
export function getLots(lotDataItems, alwaysCopy) {
    if (lotDataItems) {
        if (alwaysCopy
         || checkFirstDefinedEntry(lotDataItems, (i) => (getLot(lotDataItems[i]) !== lotDataItems[i]))) {
            return lotDataItems.map((lotDataItem) => getLot(lotDataItem, alwaysCopy));
        }
    }
    return lotDataItems;
}

/**
 * Retrieves a {@link LotDataItem} representation of a {@link Lot}.
 * @param {(Lot|LotDataItem)} lot 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotDataItem}
 */
export function getLotDataItem(lot, alwaysCopy) {
    if (lot) {
        const purchaseYMDDateString = getYMDDateString(lot.purchaseYMDDate);
        if (alwaysCopy || (purchaseYMDDateString !== lot.purchaseYMDDate)) {
            const lotDataItem = Object.assign({}, lot);
            lotDataItem.purchaseYMDDate = purchaseYMDDateString;
            return lotDataItem;
        }
    }
    return lot;
}

/**
 * Array version of {@link getLotDataItem}
 * @param {(Lot[]|LotDataItem[])} lots 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new array with new objects will always be created.
 * @returns {LotDataItem[]}
 */
export function getLotDataItems(lots, alwaysCopy) {
    if (lots) {
        if (alwaysCopy
         || checkFirstDefinedEntry(lots, (i) => (getLotDataItem(lots[i]) !== lots[i]))) {
            return lots.map((lot) => getLotDataItem(lot, alwaysCopy));
        }
    }
    return lots;
}

/**
 * Returns a string representation of a {@link Lot} or {@link LotDataItem}. The string representation has
 * the properties in a fixed order, unlike JSON.stringify().
 * @param {Lot|LotDataItem} lot 
 * @returns {string}
 */
export function getLotString(lot) {
    const lotDataItem = getLotDataItem(lot);
    let string = lotDataItem.purchaseYMDDate + '_' + lotDataItem.quantityBaseValue + '_' + lotDataItem.costBasisBaseValue;
    if (lotDataItem.description) {
        string += '_' + lotDataItem.description;
    }
    return string;
}
