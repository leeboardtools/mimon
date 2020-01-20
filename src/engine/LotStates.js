import { getYMDDate, getYMDDateString } from '../util/YMDDate';


/**
 * @typedef {object}    LotStateDataItem
 * @property {string}   ymdDate The date represented by teh state.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 */

/**
 * @typedef {object}    LotState
 * @property {YMDDate}  ymdDate The date represented by the state.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 */

/**
 * Retrieves an {@link LotState} representation of a {@link LotStateDataItem} object, avoids copying if the arg
 * is already an {@link LotState}
 * @param {(LotStateDataItem|LotState)} lotStateDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotState}
 */
export function getLotState(lotStateDataItem, alwaysCopy) {
    if (lotStateDataItem) {
        const ymdDate = getYMDDate(lotStateDataItem.ymdDate);
        if (alwaysCopy 
         || (ymdDate !== lotStateDataItem.ymdDate)) {
            return {
                ymdDate: ymdDate,
                quantityBaseValue: lotStateDataItem.quantityBaseValue,
                costBasisBaseValue: lotStateDataItem.costBasisBaseValue,
            };
        }
    }
    return lotStateDataItem;
}

/**
 * Retrieves an {@link LotStateDataItem} representation of a {@link LotState} object, avoids copying if the arg
 * is already an {@link LotStateDataItem}
 * @param {(LotState|LotStateDataItem)} lotState 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotStateDataItem}
 */
export function getLotStateDataItem(lotState, alwaysCopy) {
    if (lotState) {
        const ymdDateString = getYMDDateString(lotState.ymdDate);
        if (alwaysCopy 
         || (ymdDateString !== lotState.ymdDate)) {
            return {
                ymdDate: ymdDateString,
                quantityBaseValue: lotState.quantityBaseValue,
                costBasisBaseValue: lotState.costBasisBaseValue,
            };
        }
    }
    return lotState;
}


/**
 * @typedef {object}    LotChangeDataItem
 * @property {number}   quantityBaseValue
 * @property {boolean}  isSplitMerge
 */


/**
 * @typedef {object}    LotChange
 * @property {number}   quantityBaseValue
 * @property {boolean}  isSplitMerge
 */

export function getLotChange(lotChangeDataItem, alwaysCopy) {
    if (lotChangeDataItem) {
        if (alwaysCopy) {
            return Object.assign({}, lotChangeDataItem);
        }
    }
    return lotChangeDataItem;
}

export const getLotChangeDataItem = getLotChange;


function adjustLotStateDataItemForLotChange(lotState, lotChange, ymdDate, sign) {
    const lotStateDataItem = getLotStateDataItem(lotState, true);

    lotStateDataItem.ymdDate = getYMDDateString(ymdDate) || lotStateDataItem.ymdDate;

    const oldQuantityBaseValue = lotStateDataItem.quantityBaseValue;
    lotStateDataItem.quantityBaseValue += sign * lotChange.quantityBaseValue;
    if (!lotChange.isSplitMerge) {
        if (oldQuantityBaseValue) {
            lotStateDataItem.costBasisBaseValue = Math.round(lotStateDataItem.quantityBaseValue * lotStateDataItem.costBasisBaseValue / oldQuantityBaseValue);
        }
        else {
            lotStateDataItem.costBasisBaseValue = lotChange.costBasisBaseValue;
        }
    }

    return lotStateDataItem;
}


/**
 * Returns a new lot state data item that reflects the application of a {@link LotChange}
 * to the lot state. The only validation performed is a check for lots being modified
 * or removed being in the lot state.
 * @param {LotState|LotStateDataItem} lotState 
 * @param {LotChange|LotChangeDataItem} lotChange 
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function addLotChangeToLotStateDataItem(lotState, lotChange, ymdDate) {
    return adjustLotStateDataItemForLotChange(lotState, lotChange, ymdDate, 1);
}


/**
 * Returns a new lot state data item that reflects the removal of a {@link LotChange}
 * from the lot state. This is the opposite of {@link addLotChangeToLotStateDataItem}.
 * @param {LotState|LotStateDataItem} lotState 
 * @param {LotChange|LotChangeDataItem} lotChange 
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function removeLotChangeFromLotStateDataItem(lotState, lotChange, ymdDate) {
    return adjustLotStateDataItemForLotChange(lotState, lotChange, ymdDate, -1);
}
