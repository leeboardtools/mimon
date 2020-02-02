import { getYMDDate, getYMDDateString } from '../util/YMDDate';
import { getFullSplitDataItem } from './Transactions';
import * as LS from './LotStates';
import { userError } from '../util/UserMessages';


/**
 * @typedef {object} AccountStateDataItem
 * @property {string}   ymdDate The date this state represented as a {@link YMDDate} string.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition. Note that for accounts
 * with lots this is the sum of the quantityBaseValue properties of the lot states.
 * @property {LotStateDataItem[]}   [lotStates] For accounts that use lots, the array of the lot state data items.
 * @property {LotStateDataItem[]}   [removedLotStates] For accounts that use lots, this is created as needed to hold
 * lot states whose quantity has been reduced to 0 (i.e. fully sold). These are used to assist in removing
 * splits from the account state, as they hold a lot state that can be unwound from by {@link removeLotChangeFromLotStateDataItem}.
 */

/**
 * @typedef {object} AccountState
 * @property {YMDDate}  ymdDate The date this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition. Note that for accounts
 * with lots this is the sum of the quantityBaseValue properties of the lot states.
 * @property {LotState[]}   [lotStates] For accounts that use lots, the array of the lot states.
 * @property {LotStateDataItem[]}   [removedLotStates] For accounts that use lots, this is created as needed to hold
 * lot states whose quantity has been reduced to 0 (i.e. fully sold). These are used to assist in removing
 * splits from the account state, as they hold a lot state that can be unwound from by {@link removeLotChangeFromLotStateDataItem}.
 */

/**
 * Retrieves an {@link AccountState} representation of a {@link AccountStateDataItem} object, avoids copying if the arg
 * is already an {@link AccountState}
 * @param {(AccountStateDataItem|AccountState)} accountStateDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {AccountState}
 */
export function getAccountState(accountStateDataItem, alwaysCopy) {
    if (accountStateDataItem) {
        const ymdDate = getYMDDate(accountStateDataItem.ymdDate);
        const lotStates = LS.getLotStates(accountStateDataItem.lotStates);
        if (alwaysCopy 
         || (ymdDate !== accountStateDataItem.ymdDate)
         || (lotStates !== accountStateDataItem.lotStates)) {
            const accountState = Object.assign({}, accountStateDataItem);
            if (ymdDate !== undefined) {
                accountState.ymdDate = ymdDate;
            }
            if (lotStates !== undefined) {
                accountState.lotStates = lotStates;
            }
            return accountState;
        }
    }
    return accountStateDataItem;
}

/**
 * Retrieves an {@link AccountStateDataItem} representation of a {@link AccountState} object, avoids copying if the arg
 * is already an {@link AccountStateDataItem}
 * @param {(AccountState|AccountStateDataItem)} accountState 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {AccountStateDataItem}
 */
export function getAccountStateDataItem(accountState, alwaysCopy) {
    if (accountState) {
        const ymdDateString = getYMDDateString(accountState.ymdDate);
        const lotStateDataItems = LS.getLotStateDataItems(accountState.lotStates);
        if (alwaysCopy 
         || (ymdDateString !== accountState.ymdDate)
         || (lotStateDataItems !== accountState.lotStates)) {
            const accountStateDataItem = Object.assign({}, accountState);
            if (ymdDateString !== undefined) {
                accountStateDataItem.ymdDate = ymdDateString;
            }
            if (lotStateDataItems !== undefined) {
                accountStateDataItem.lotStates = lotStateDataItems;
            }
            return accountStateDataItem;
        }
    }
    return accountState;
}


/**
 * Retrieves an {@link AccountStateDataItem} that has any missing required properties filled in with
 * default values.
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
 * Retrieves an {@link AccountState} that has any missing required properties filled in with
 * default values.
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


function adjustAccountStateDataItemForSplit(accountState, split, ymdDate, sign) {
    split = getFullSplitDataItem(split);
    const { lotChanges } = split;

    const hasLots = lotChanges && lotChanges.length;
    const accountStateDataItem = getFullAccountStateDataItem(accountState, hasLots);

    ymdDate = getYMDDateString(ymdDate) || accountStateDataItem.ymdDate;
    accountStateDataItem.ymdDate = ymdDate;

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

        for (let i = start; i !== end; i += sign) {
            const lotChange = lotChanges[i];
            const { lotId } = lotChange;
            let lotStateDataItem = lotStateDataItemsByLotId.get(lotId);
            
            if (!lotStateDataItem) {
                if (sign > 0) {
                    // Adding a new lot.
                    lotStateDataItem = LS.getEmptyLotStateDataItem();
                    lotStateDataItem.lotId = lotId;
                }
                else {
                    // Must have been a lot that was remove.
                    lotStateDataItem = removedLotStates.get(lotId);
                    if (!lotStateDataItem) {
                        console.log('removedLotStates: ' + lotId + ' ' + JSON.stringify(Array.from(removedLotStates.entries())));
                        throw userError('AccountState-remove_lot_missing_lot_state');
                    }
                }
            }

            lotStateDataItem = lotStateFunc(lotStateDataItem, lotChange);

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
                accountStateDataItem.removedLotStates = Array.from(removedLotStates.entries());
            }
        }
    }

    if (hasLots) {
        let quantityBaseValue = 0;
        accountStateDataItem.lotStates.forEach((lotState) => { quantityBaseValue += lotState.quantityBaseValue; });
        accountStateDataItem.quantityBaseValue = quantityBaseValue;
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
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function addSplitToAccountStateDataItem(accountState, split, ymdDate) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, 1);
}


/**
 * Returns a new account state data item that reflects the removal of a {@link Split}
 * from the account state. This is the opposite of {@link addSplitToAccountStateDataItem}.
 * The only validation performed is a check for lots being modified or removed being in 
 * the account state.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {Split|SplitDataItem} split 
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function removeSplitFromAccountStateDataItem(accountState, split, ymdDate) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, -1);
}
