import { YMDDate } from '../util/YMDDate';

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
 * @returns {Lot}
 */
export function getLot(lotDataItem) {
    if (lotDataItem) {
        if (typeof lotDataItem.purchaseYMDDate === 'string') {
            const lot = Object.assign({}, lotDataItem);
            lot.purchaseYMDDate = new YMDDate(lotDataItem.purchaseYMDDate);
            return lot;
        }
    }
    return lotDataItem;
}

/**
 * Array version of {@link getLot}.
 * @param {(LotDataItem[]|Lot[])} lotDataItems 
 * @returns {Lot[]}
 */
export function getLots(lotDataItems) {
    if (lotDataItems && lotDataItems.length) {
        if (typeof lotDataItems[0].purchaseYMDDate === 'string') {
            return lotDataItems.map((lotDataItem) => getLot(lotDataItem));
        }
    }
    return lotDataItems;
}

/**
 * Retrieves a {@link LotDataItem} representation of a {@link Lot}.
 * @param {(Lot|LotDataItem)} lot 
 * @returns {LotDataItem}
 */
export function getLotDataItem(lot) {
    if (lot) {
        if (typeof lot.purchaseYMDDate !== 'string') {
            const lotDataItem = Object.assign({}, lot);
            lotDataItem.purchaseYMDDate = lot.purchaseYMDDate.toString();
            return lotDataItem;
        }
    }
    return lot;
}

/**
 * Array version of {@link getLotDataItem}
 * @param {(Lot[]|LotDataItem[])} lots 
 * @returns {LotDataItem[]}
 */
export function getLotDataItems(lots) {
    if (lots && lots.length) {
        if (typeof lots[0].purchaseYMDDate !== 'string') {
            return lots.map((lot) => getLotDataItem(lot));
        }
    }
    return lots;
}
