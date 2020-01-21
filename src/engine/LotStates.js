import { getYMDDate, getYMDDateString } from '../util/YMDDate';


/**
 * @typedef {object}    LotStateDataItem
 * @property {number}   lotId   The id of the lot this state represents.
 * @property {string}   ymdDate The date represented by teh state.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 */

/**
 * @typedef {object}    LotState
 * @property {number}   lotId   The id of the lot this state represents.
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
            const lotState = Object.assign({}, lotStateDataItem);
            lotState.ymdDate = ymdDate;
            return lotState;
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
            const lotStateDataItem = Object.assign({}, lotState);
            lotStateDataItem.ymdDate = ymdDateString;
            return lotStateDataItem;
        }
    }
    return lotState;
}



/**
 * Array version of {@link getLotState}
 * @param {(LotState[]|LotStateDataItem[])} lotStateDataItems 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotState[]}
 */
export function getLotStates(lotStateDataItems, alwaysCopy) {
    if (lotStateDataItems && lotStateDataItems.length) {
        const lotStates = lotStateDataItems.map((lotStateDataItem) => getLotState(lotStateDataItem, alwaysCopy));
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
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotStateDataItem[]}
 */
export function getLotStateDataItems(lotStates, alwaysCopy) {
    if (lotStates && lotStates.length) {
        const lotStateDataItems = lotStates.map((lotState) => getLotStateDataItem(lotState, alwaysCopy));
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
 * @property {number}   quantityBaseValue
 * @property {number}   [costBasisBaseValue]    This is required for a lot change that represents adding a new lot
 * and for a lot change representing a sell all (ie the lot has been sold). This is so the initial cost basis
 * can be set when a lot is added, and the last cost basis can be set when the final sale is removed.
 * @property {boolean}  isSplitMerge
 */


/**
 * @typedef {object}    LotChange
 * @property {number}   lotId   The id of the lot this change applies to.
 * @property {number}   quantityBaseValue
 * @property {number}   [costBasisBaseValue]    This is required for a lot change that represents adding a new lot
 * and for a lot change representing a sell all (ie the lot has been sold). This is so the initial cost basis
 * can be set when a lot is added, and the last cost basis can be set when the final sale is removed.
 * @property {boolean}  isSplitMerge
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
        const lotChanges = lotChangeDataItems.map((lotChangeDataItem) => getLotChange(lotChangeDataItem, alwaysCopy));
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



function adjustLotStateDataItemForLotChange(lotState, lotChange, ymdDate, sign) {
    const lotStateDataItem = getLotStateDataItem(lotState, true);

    lotStateDataItem.ymdDate = getYMDDateString(ymdDate);

    const oldQuantityBaseValue = lotStateDataItem.quantityBaseValue;
    lotStateDataItem.quantityBaseValue += sign * lotChange.quantityBaseValue;
    if (!lotChange.isSplitMerge) {
        if (oldQuantityBaseValue) {
            lotStateDataItem.costBasisBaseValue = Math.round(lotStateDataItem.quantityBaseValue * lotStateDataItem.costBasisBaseValue / oldQuantityBaseValue);
        }
        else {
            lotStateDataItem.costBasisBaseValue = lotChange.costBasisBaseValue || 0;
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
 * @param {YMDDate|string}  ymdDate The date for the lot state, if <code>undefined</code> then
 * the state's date will be <code>undefined</code>.
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
 * @param {YMDDate|string}  ymdDate The date for the lot state, if <code>undefined</code> then
 * the state's date will be <code>undefined</code>.
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function removeLotChangeFromLotStateDataItem(lotState, lotChange, ymdDate) {
    return adjustLotStateDataItemForLotChange(lotState, lotChange, ymdDate, -1);
}
