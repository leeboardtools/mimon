import { getYMDDate, getYMDDateString } from '../util/YMDDate';
import { getFullSplitDataItem, LotTransactionType } from './Transactions';
import * as LS from './LotStates';
import { userError } from '../util/UserMessages';
import { areSimilar } from '../util/AreSimilar';


/**
 * @typedef {object} AccountStateDataItem
 * @property {string}   ymdDate The date this state represented as a 
 * {@link YMDDate} string.
 * @property {number}   quantityBaseValue   The base value of the quantity of the 
 * state. The applicable quantity definition is found in the account's priced item's 
 * quantityDefinition. Note that for accounts with lots this is the sum of the 
 * quantityBaseValue properties of the lot states.
 * @property {LotStateDataItem[]}   [lotStates] For accounts that use lots, the array 
 * of the lot state data items.
 * @property {LotStateDataItem[]}   [removedLotStates] For accounts that use lots, 
 * this is created as needed to hold lot states whose quantity has been reduced to 0 
 * (i.e. fully sold). These are used to assist in removing splits from the account 
 * state, as they hold a lot state that can be unwound from by 
 * {@link removeLotChangeFromLotStateDataItem}.
 * The elements of the array are two element lot id/lot state pairs.
 */

/**
 * @typedef {object} AccountState
 * @property {YMDDate}  ymdDate The date this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the 
 * state. The applicable quantity definition is found in the account's priced 
 * item's quantityDefinition. Note that for accounts with lots this is the sum of 
 * the quantityBaseValue properties of the lot states.
 * @property {LotState[]}   [lotStates] For accounts that use lots, the array of 
 * the lot states.
 * @property {LotStateDataItem[]}   [removedLotStates] For accounts that use lots, 
 * this is created as needed to hold lot states whose quantity has been reduced to 0 
 * (i.e. fully sold). These are used to assist in removing splits from the account 
 * state, as they hold a lot state that can be unwound from by 
 * {@link removeLotChangeFromLotStateDataItem}.
 * The elements of the array are two element lot id/lot state pairs.
 */

/**
 * Retrieves an {@link AccountState} representation of a {@link AccountStateDataItem} 
 * object, avoids copying if the arg is already an {@link AccountState}
 * @param {(AccountStateDataItem|AccountState)} accountStateDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {AccountState}
 */
export function getAccountState(accountStateDataItem, alwaysCopy) {
    if (accountStateDataItem) {
        const ymdDate = getYMDDate(accountStateDataItem.ymdDate);
        const lotStates = LS.getLotStates(accountStateDataItem.lotStates, 
            alwaysCopy);
        const storedLotChanges = LS.getLotChanges(accountStateDataItem.storedLotChanges,
            alwaysCopy);
        if (alwaysCopy 
         || (ymdDate !== accountStateDataItem.ymdDate)
         || (lotStates !== accountStateDataItem.lotStates)
         || (storedLotChanges !== accountStateDataItem.storedLotChanges)) {
            const accountState = Object.assign({}, accountStateDataItem);
            if (ymdDate !== undefined) {
                accountState.ymdDate = ymdDate;
            }
            if (lotStates !== undefined) {
                accountState.lotStates = lotStates;
            }
            if (storedLotChanges !== undefined) {
                accountState.storedLotChanges = storedLotChanges;
            }
            return accountState;
        }
    }
    return accountStateDataItem;
}

/**
 * Retrieves an {@link AccountStateDataItem} representation of a 
 * {@link AccountState} object, avoids copying if the arg is already an 
 * {@link AccountStateDataItem}
 * @param {(AccountState|AccountStateDataItem)} accountState 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {AccountStateDataItem}
 */
export function getAccountStateDataItem(accountState, alwaysCopy) {
    if (accountState) {
        const ymdDateString = getYMDDateString(accountState.ymdDate);
        const lotStateDataItems = LS.getLotStateDataItems(accountState.lotStates, 
            alwaysCopy);
        const storedLotChangeDataItems = LS.getLotChangeDataItems(
            accountState.storedLotChanges, alwaysCopy);
        if (alwaysCopy 
         || (ymdDateString !== accountState.ymdDate)
         || (lotStateDataItems !== accountState.lotStates)
         || (storedLotChangeDataItems !== accountState.storedLotChanges)) {
            const accountStateDataItem = Object.assign({}, accountState);
            if (ymdDateString !== undefined) {
                accountStateDataItem.ymdDate = ymdDateString;
            }
            if (lotStateDataItems !== undefined) {
                accountStateDataItem.lotStates = lotStateDataItems;
            }
            if (storedLotChangeDataItems !== undefined) {
                accountStateDataItem.storedLotChanges = storedLotChangeDataItems;
            }
            return accountStateDataItem;
        }
    }
    return accountState;
}


/**
 * Retrieves an {@link AccountStateDataItem} that has any missing required properties 
 * filled in with default values.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {boolean} hasLots 
 * @returns {AccountStateDataItem}
 */
export function getFullAccountStateDataItem(accountState, hasLots) {
    accountState = getAccountStateDataItem(accountState, true);
    if (accountState) {
        accountState.quantityBaseValue = accountState.quantityBaseValue || 0;
        if (hasLots && !accountState.lotStates) {
            accountState.lotStates = [];
        }
    }

    return accountState;
}


/**
 * Retrieves an {@link AccountState} that has any missing required properties filled 
 * in with default values.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {boolean} hasLots 
 * @returns {AccountState}
 */
export function getFullAccountState(accountState, hasLots) {
    accountState = getAccountState(accountState, true);
    if (accountState) {
        accountState.quantityBaseValue = accountState.quantityBaseValue || 0;
        if (hasLots && !accountState.lotStates) {
            accountState.lotStates = [];
        }
    }

    return accountState;
}


/**
 * Determines if two account states represent the same thing.
 * @param {AccountState|AccountStateDataItem} a 
 * @param {AccountState|AccountStateDataItem} b 
 * @returns {boolean}
 */
export function areAccountStatesSimilar(a, b) {
    return areSimilar(a, b);
}


function adjustAccountStateDataItemForSplit(accountState, split, ymdDate, lotChanges,
    sign, storeLotChangesInAccountState) {

    split = getFullSplitDataItem(split);
    const { lotTransactionType } = split;
    lotChanges = lotChanges || split.lotChanges;

    const hasLots = lotChanges && lotChanges.length;
    const accountStateDataItem = getFullAccountStateDataItem(accountState, hasLots);

    ymdDate = getYMDDateString(ymdDate) || accountStateDataItem.ymdDate;
    accountStateDataItem.ymdDate = ymdDate;
    
    delete accountStateDataItem.storedLotChanges;

    if (lotChanges) {
        const { lotStates } = accountStateDataItem;
        const lotStateDataItemsByLotId = new Map();
        lotStates.forEach((lotState) => {
            lotStateDataItemsByLotId.set(lotState.lotId, lotState);
        });

        let removedLotStates;
        let removedLotStatesChanged;

        let start;
        let end;
        let lotStateFunc;
        if (sign > 0) {
            start = 0;
            end = lotChanges.length;
            lotStateFunc = LS.addLotChangeToLotStateDataItem;
        }
        else {
            // remove
            start = lotChanges.length - 1;
            end = -1;
            lotStateFunc = LS.removeLotChangeFromLotStateDataItem;
            removedLotStates = new Map(accountStateDataItem.removedLotStates);
        }

        const isCostBasisAdjustment 
            = (lotTransactionType === LotTransactionType.SPLIT.name)
            || (lotTransactionType === LotTransactionType.RETURN_OF_CAPITAL.name);

        for (let i = start; i !== end; i += sign) {
            const lotChange = lotChanges[i];
            const { lotId } = lotChange;
            let lotStateDataItem = lotStateDataItemsByLotId.get(lotId);
            
            if (!lotStateDataItem) {
                if (sign > 0) {
                    // Adding a new lot.
                    lotStateDataItem = LS.getEmptyLotStateDataItem();
                    lotStateDataItem.lotId = lotId;
                    lotStateDataItem.ymdDateCreated = ymdDate;
                }
                else {
                    // Must have been a lot that was removed.
                    lotStateDataItem = removedLotStates.get(lotId);
                    if (!lotStateDataItem) {
                        console.log('removedLotStates: ' + lotId + ' ' 
                            + JSON.stringify(Array.from(removedLotStates.entries())));
                        throw userError('AccountState-remove_lot_missing_lot_state');
                    }
                }
            }

            lotStateDataItem = lotStateFunc(lotStateDataItem, lotChange, 
                isCostBasisAdjustment);

            if (lotStateDataItem.quantityBaseValue) {
                lotStateDataItemsByLotId.set(lotId, lotStateDataItem);
                if (removedLotStates) {
                    // The lot's no longer 'removed'...
                    if (removedLotStates.delete(lotId)) {
                        removedLotStatesChanged = true;
                    }
                }
            }
            else {
                lotStateDataItemsByLotId.delete(lotId);
                if (sign > 0) {
                    // We only track removed lots going forward...
                    if (!removedLotStates) {
                        removedLotStates = new Map();
                    }
                    removedLotStates.set(lotId, lotStateDataItem);
                    removedLotStatesChanged = true;
                }
            }
        }

        accountStateDataItem.lotStates = Array.from(lotStateDataItemsByLotId.values());

        if (removedLotStatesChanged) {
            if (!removedLotStates || !removedLotStates.size) {
                delete accountStateDataItem.removedLotStates;
            }
            else {
                accountStateDataItem.removedLotStates 
                    = Array.from(removedLotStates.entries());
            }
        }
    }

    if (hasLots) {
        let quantityBaseValue = 0;
        accountStateDataItem.lotStates.forEach(
            (lotState) => { quantityBaseValue += lotState.quantityBaseValue; });
        accountStateDataItem.quantityBaseValue = quantityBaseValue;

        if (storeLotChangesInAccountState) {
            accountStateDataItem.storedLotChanges = lotChanges;
        }
    }
    else {
        accountStateDataItem.quantityBaseValue += sign * split.quantityBaseValue;
    }

    return accountStateDataItem;
}


/**
 * Returns a new account state data item that reflects the application of a {@link Split}
 * to the account state. The only validation performed is a check for lots being modified
 * or removed being in the account state.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {Split|SplitDataItem} split 
 * @param {YMDDate} [ymdDate]   Optional date for the new account state data item.
 * @param {LotChange[]|LotChangeDataItem[]} [lotChanges]    If <code>undefined</code>
 * the lot changes from the split will be used.
 * @param {boolean} [storeLotChangesInAccountState=false]   If <code>true</code> then
 * lot changes made will be stored in the storedLotChanges property of the account state.
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function addSplitToAccountStateDataItem(accountState, split, ymdDate, lotChanges,
    storeLotChangesInAccountState) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, lotChanges, 
        1, storeLotChangesInAccountState);
}


/**
 * Returns a new account state data item that reflects the removal of a {@link Split}
 * from the account state. This is the opposite of {@link addSplitToAccountStateDataItem}.
 * The only validation performed is a check for lots being modified or removed being in 
 * the account state.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {Split|SplitDataItem} split 
 * @param {YMDDate} [ymdDate]   Optional date for the new account state data item.
 * @param {LotChange[]|LotChangeDataItem[]} [lotChanges]    If <code>undefined</code>
 * the lot changes from the split will be used.
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function removeSplitFromAccountStateDataItem(accountState, split, ymdDate, 
    lotChanges) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, lotChanges,
        -1);
}
