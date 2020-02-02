/**
 * @typedef {object}    LotStateDataItem
 * @property {number}   lotId   The id of the lot this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 * @property {number[][]}   previousBaseValues  Array containing two element sub-arrays of the previous
 * lot states, the first element of each sub array is the quantityBaseValue, the second element
 * is the costBasisBaseValue. This simplifies the unwinding of {@link LotChange}s via
 * {@link removeLotChangeFromLotStateDataItem}.
 */

/**
 * @typedef {object}    LotState
 * @property {number}   lotId   The id of the lot this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot state.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot.
 * @property {number[][]}   previousBaseValues  Array containing two element sub-arrays of the previous
 * lot states, the first element of each sub array is the quantityBaseValue, the second element
 * is the costBasisBaseValue. This simplifies the unwinding of {@link LotChange}s via
 * {@link removeLotChangeFromLotStateDataItem}.
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
        if (alwaysCopy) {
            return Object.assign({}, lotStateDataItem);
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
export const getLotStateDataItem = getLotState;



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
 * @property {number}   [costBasisBaseValue]    If isSplitMerge is <code>true</code> and this is specified, it is the
 * new cost basis for the lot, if not specified then the cost basis is not changed. If isSplitMerge is <code>false</code>
 * if the previous quantityBaseValue is 0 (which normally indicates a new purchase) this is the initial cost basis.
 * @property {boolean}  [isSplitMerge]  Optional, if <code>true</code> then the lot change is a split or a merge.
 */


/**
 * @typedef {object}    LotChange
 * @property {number}   lotId   The id of the lot this change applies to.
 * @property {number}   quantityBaseValue   The change in the lot's quantityBaseValue.
 * @property {number}   [costBasisBaseValue]    If isSplitMerge is <code>true</code> and this is specified, it is the
 * new cost basis for the lot, if not specified then the cost basis is not changed. If isSplitMerge is <code>false</code>
 * if the previous quantityBaseValue is 0 (which normally indicates a new purchase) this is the initial cost basis.
 * @property {boolean}  [isSplitMerge]  Optional, if <code>true</code> then the lot change is a split or a merge.
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



function adjustLotStateDataItemForLotChange(lotState, lotChange, sign) {
    const lotStateDataItem = getLotStateDataItem(lotState, true);

    const { previousBaseValues } = lotStateDataItem;

    if (sign > 0) {
        // add
        lotStateDataItem.previousBaseValues = previousBaseValues.slice();
        lotStateDataItem.previousBaseValues.push([ lotStateDataItem.quantityBaseValue, lotStateDataItem.costBasisBaseValue ]);

        const oldQuantityBaseValue = lotStateDataItem.quantityBaseValue;
        lotStateDataItem.quantityBaseValue += lotChange.quantityBaseValue;
        if (!lotChange.isSplitMerge) {
            if (oldQuantityBaseValue) {
                lotStateDataItem.costBasisBaseValue = Math.round(lotStateDataItem.quantityBaseValue * lotStateDataItem.costBasisBaseValue / oldQuantityBaseValue);
            }
            else {
                lotStateDataItem.costBasisBaseValue = lotChange.costBasisBaseValue || 0;
            }
        }
        else {
            if (lotChange.costBasisBaseValue) {
                lotStateDataItem.costBasisBaseValue = lotChange.costBasisBaseValue;
            }
        }
    }
    else {
        // Just pop the last previous baseValues...
        if (previousBaseValues.length) {
            [ lotStateDataItem.quantityBaseValue, lotStateDataItem.costBasisBaseValue ] = previousBaseValues[previousBaseValues.length - 1];
            lotStateDataItem.previousBaseValues = previousBaseValues.slice(0, previousBaseValues.length - 1);
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
export function addLotChangeToLotStateDataItem(lotState, lotChange) {
    return adjustLotStateDataItemForLotChange(lotState, lotChange, 1);
}


/**
 * Returns a new lot state data item that reflects the removal of a {@link LotChange}
 * from the lot state. This is the opposite of {@link addLotChangeToLotStateDataItem}.
 * @param {LotState|LotStateDataItem} lotState 
 * @param {LotChange|LotChangeDataItem} lotChange 
 * @returns {LotStateDataItem}
 * @throws {Error}
 */
export function removeLotChangeFromLotStateDataItem(lotState, lotChange) {
    return adjustLotStateDataItemForLotChange(lotState, lotChange, -1);
}