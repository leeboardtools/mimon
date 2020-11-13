import { userError } from '../util/UserMessages';
import { YMDDate, getYMDDate, getYMDDateString } from '../util/YMDDate';

/**
 * @typedef {object}    LotStateDataItem
 * @property {number}   lotId   The id of the lot this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity 
 * of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 * @property {string}   ymdDateCreated    The date the lot was created.
 * @property {number[][]}   previousBaseValues  Array containing two element 
 * sub-arrays of the previous lot states, the first element of each sub array 
 * is the quantityBaseValue, the second element
 * is the costBasisBaseValue. This simplifies the unwinding of {@link LotChange}s via
 * {@link removeLotChangeFromLotStateDataItem}.
 */

/**
 * @typedef {object}    LotState
 * @property {number}   lotId   The id of the lot this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of 
 * the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 * @property {YMDDate}  ymdDateCreated The date the lot was created.
 * @property {number[][]}   previousBaseValues  Array containing two element 
 * sub-arrays of the previous lot states, the first element of each sub array 
 * is the quantityBaseValue, the second element
 * is the costBasisBaseValue. This simplifies the unwinding of {@link LotChange}s via
 * {@link removeLotChangeFromLotStateDataItem}.
 */

/**
 * Retrieves an {@link LotState} representation of a {@link LotStateDataItem} object, 
 * avoids copying if the arg is already an {@link LotState}
 * @param {(LotStateDataItem|LotState)} lotStateDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {LotState}
 */
export function getLotState(lotStateDataItem, alwaysCopy) {
    if (lotStateDataItem) {
        const ymdDateCreated = getYMDDate(lotStateDataItem.ymdDateCreated);
        if (alwaysCopy
         || (ymdDateCreated !== lotStateDataItem.ymdDateCreated)) {
            const lotState = Object.assign({}, lotStateDataItem);
            if (ymdDateCreated !== undefined) {
                lotState.ymdDateCreated = ymdDateCreated;
            }
            return lotState;
        }
    }
    return lotStateDataItem;
}


/**
 * Retrieves an {@link LotStateDataItem} representation of a {@link LotState} object, 
 * avoids copying if the arg
 * is already an {@link LotStateDataItem}
 * @param {(LotState|LotStateDataItem)} lotState 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {LotStateDataItem}
 */
export function getLotStateDataItem(lotState, alwaysCopy) {
    if (lotState) {
        const ymdDateString = getYMDDateString(lotState.ymdDateCreated);
        if (alwaysCopy
            || (ymdDateString !== lotState.ymdDateCreated)) {
            const lotStateDataItem = Object.assign({}, lotState);
            if (ymdDateString !== undefined) {
                lotStateDataItem.ymdDateCreated = ymdDateString;
            }
            return lotStateDataItem;
        }
    }
    return lotState;
}



/**
 * Array version of {@link getLotState}
 * @param {(LotState[]|LotStateDataItem[])} lotStateDataItems 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {LotState[]}
 */
export function getLotStates(lotStateDataItems, alwaysCopy) {
    if (lotStateDataItems && lotStateDataItems.length) {
        const lotStates = lotStateDataItems.map(
            (lotStateDataItem) => getLotState(lotStateDataItem, alwaysCopy));
        if (alwaysCopy) {
            return lotStates;
        }
        for (let i = lotStates.length - 1; i >= 0; --i) {
            if (lotStates[i] !== lotStateDataItems[i]) {
                return lotStates;
            }
        }
    }
    return lotStateDataItems;
}


/**
 * Array version of {@link getLotStateDataItem}
 * @param {(LotState[]|LotStateDataItem[])} lotStates 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {LotStateDataItem[]}
 */
export function getLotStateDataItems(lotStates, alwaysCopy) {
    if (lotStates && lotStates.length) {
        const lotStateDataItems = lotStates.map(
            (lotState) => getLotStateDataItem(lotState, alwaysCopy));
        if (alwaysCopy) {
            return lotStateDataItems;
        }
        for (let i = lotStateDataItems.length - 1; i >= 0; --i) {
            if (lotStateDataItems[i] !== lotStates[i]) {
                return lotStateDataItems;
            }
        }
    }
    return lotStates;
}


/**
 * @returns {LotStateDataItem}  An empty lot state data item.
 */
export function getEmptyLotStateDataItem() {
    return {
        quantityBaseValue: 0,
        costBasisBaseValue: 0,
        previousBaseValues: [],
    };
}

/**
 * @function
 * @returns {LotState}  An empty lot state.
 */
export const getEmptyLotState = getEmptyLotStateDataItem;



/**
 * @typedef {object}    LotChangeDataItem
 * @property {number}   lotId   The id of the lot this change applies to.
 * @property {number}   quantityBaseValue   The change in the lot's quantityBaseValue.
 * @property {number}   [costBasisBaseValue]    The change in the lot's 
 * costBasisBaseValue, only used if the lot is new or the isCostBasisAdjustment
 * arg to {@link addLotChangeToLotStateDataItem} is truthy.
 */


/**
 * @typedef {object}    LotChange
 * @property {number}   lotId   The id of the lot this change applies to.
 * @property {number}   quantityBaseValue   The change in the lot's quantityBaseValue.
 * @property {number}   [costBasisBaseValue]    The change in the lot's 
 * costBasisBaseValue, only used if the lot is new or the isCostBasisAdjustment
 * arg to {@link addLotChangeToLotStateDataItem} is truthy.
 */

/**
 * 
 * @param {LotChange|LotChangeDataItem} lotChangeDataItem 
 * @param {boolean} alwaysCopy 
 * @returns {LotChange}
 */
export function getLotChange(lotChangeDataItem, alwaysCopy) {
    if (lotChangeDataItem) {
        if (alwaysCopy) {
            return Object.assign({}, lotChangeDataItem);
        }
    }
    return lotChangeDataItem;
}

/**
 * @function
 * @param {LotChange|LotChangeDataItem} lotChangeDataItem 
 * @param {boolean} alwaysCopy 
 * @returns {LotChangeDataItem}
 */
export const getLotChangeDataItem = getLotChange;


/**
 * Array version of {@link getLotChange}.
 * @param {LotChange[]|LotChangeDataItem[]} lotChangeDataItems
 * @param {boolean} alwaysCopy 
 * @returns {LotChange[]}
 */
export function getLotChanges(lotChangeDataItems, alwaysCopy) {
    if (lotChangeDataItems && lotChangeDataItems.length) {
        const lotChanges = lotChangeDataItems.map(
            (lotChangeDataItem) => getLotChange(lotChangeDataItem, alwaysCopy));
        if (alwaysCopy) {
            return lotChanges;
        }
        for (let i = lotChanges.length - 1; i >= 0; --i) {
            if (lotChanges[i] !== lotChangeDataItems[i]) {
                return lotChanges;
            }
        }
    }
    return lotChangeDataItems;
}


/**
 * Array version of {@link getLotChangeDataItem}.
 * @function
 * @param {LotChange[]|LotChangeDataItem[]} lotChangeDataItems
 * @param {boolean} alwaysCopy 
 * @returns {LotChangeDataItem[]}
 */
export const getLotChangeDataItems = getLotChanges;


/**
 * Returns a new lot state data item that reflects the application of a {@link LotChange}
 * to the lot state. The only validation performed is a check for lots being modified
 * or removed being in the lot state.
 * @param {LotState|LotStateDataItem} lotState 
 * @param {LotChange|LotChangeDataItem} lotChange 
 * @param {boolean} isCostBasisAdjustment   If <code>true</code> and the lot change
 * has a costBasisBaseValue specified, it is added to the lot's cost basis, otherwise
 * if the lot did not have a previous quantityBaseValue it is assumed to be a new
 * lot and the cost basis is set to the lot change's costBasisBaseValue. Otherwise
 * if isCostBasisAdjustment is false the lot's cost basis is adjusted by the change
 * in quantityBaseValue.
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function addLotChangeToLotStateDataItem(lotState, lotChange, 
    isCostBasisAdjustment) {

    const lotStateDataItem = getLotStateDataItem(lotState, true);
    const { previousBaseValues } = lotStateDataItem;

    // add
    lotStateDataItem.previousBaseValues = previousBaseValues.slice();
    lotStateDataItem.previousBaseValues.push(
        [ lotStateDataItem.quantityBaseValue, lotStateDataItem.costBasisBaseValue ]);

    const oldQuantityBaseValue = lotStateDataItem.quantityBaseValue;
    
    if (lotChange.quantityBaseValue) {
        lotStateDataItem.quantityBaseValue += lotChange.quantityBaseValue;
    }

    if (!isCostBasisAdjustment) {
        if (oldQuantityBaseValue) {
            lotStateDataItem.costBasisBaseValue 
                = Math.round(lotStateDataItem.quantityBaseValue 
                    * lotStateDataItem.costBasisBaseValue / oldQuantityBaseValue);
        }
        else {
            lotStateDataItem.costBasisBaseValue = lotChange.costBasisBaseValue || 0;
        }
    }
    else {
        if (lotChange.costBasisBaseValue) {
            lotStateDataItem.costBasisBaseValue += lotChange.costBasisBaseValue;
        }
    }
    return lotStateDataItem;
}


/**
 * Returns a new lot state data item that reflects the removal of a {@link LotChange}
 * from the lot state. This is the opposite of {@link addLotChangeToLotStateDataItem}.
 * @param {LotState|LotStateDataItem} lotState 
 * @param {LotChange|LotChangeDataItem} lotChange 
 * @param {boolean} isCostBasisAdjustment
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function removeLotChangeFromLotStateDataItem(lotState, lotChange, 
    isCostBasisAdjustment) {

    const lotStateDataItem = getLotStateDataItem(lotState, true);
    const { previousBaseValues } = lotStateDataItem;

    // Just pop the last previous baseValues...
    if (previousBaseValues.length) {
        [ lotStateDataItem.quantityBaseValue, lotStateDataItem.costBasisBaseValue ] 
            = previousBaseValues[previousBaseValues.length - 1];
        lotStateDataItem.previousBaseValues 
            = previousBaseValues.slice(0, previousBaseValues.length - 1);
    }
    return lotStateDataItem;
}


//
//---------------------------------------------------------
//
function createLotChangeDataItems(sortedLotStates, requiredQuantityBaseValue) {
    const lotChanges = [];
    if (requiredQuantityBaseValue < 0) {
        throw userError('LotState-XIFO_invalid_quantity');
    }

    for (let lotState of sortedLotStates) {
        const { quantityBaseValue } = lotState;
        if (quantityBaseValue < requiredQuantityBaseValue) {
            lotChanges.push({
                lotId: lotState.lotId,
                quantityBaseValue: -quantityBaseValue,
            });
            requiredQuantityBaseValue -= quantityBaseValue;
        }
        else {
            lotChanges.push({
                lotId: lotState.lotId,
                quantityBaseValue: -requiredQuantityBaseValue,
            });
            return lotChanges;
        }
    }

    throw userError('LotState-XIFO_not_enough_lots');
}


function sortLotStates(lotStates, compare) {
    const sortedLotStates = lotStates.map((lotState) => getLotState(lotState));
    sortedLotStates.sort(compare);
    return sortedLotStates;
}


/**
 * Creates an array of {@link LotChangeDataItem}s for a number of shares based on
 * first-in first-out.
 * @param {LotState[]|LotStateDataItem[]} lotStates 
 * @param {number} quantityBaseValue Must be >= 0.
 * @returns {LotChangeDataItem[]}
 * @throws {Error}
 */
export function createFIFOLotChangeDataItems(lotStates, quantityBaseValue) {
    const sortedLotStates = sortLotStates(lotStates, (a, b) => 
        YMDDate.compare(a.ymdDateCreated, b.ymdDateCreated));
    return createLotChangeDataItems(sortedLotStates, quantityBaseValue);
}


/**
 * Creates an array of {@link LotChangeDataItem}s for a number of shares based on
 * last-in first-out.
 * @param {LotState[]|LotStateDataItem[]} lotStates 
 * @param {number} quantityBaseValue Must be >= 0.
 * @returns {LotChangeDataItem[]}
 * @throws {Error}
 */
export function createLIFOLotChangeDataItems(lotStates, quantityBaseValue) {
    const sortedLotStates = sortLotStates(lotStates, (a, b) => 
        YMDDate.compare(b.ymdDateCreated, a.ymdDateCreated));
    return createLotChangeDataItems(sortedLotStates, quantityBaseValue);
}
