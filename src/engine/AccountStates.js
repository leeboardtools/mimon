import { userError } from '../util/UserMessages';
import { getYMDDate, getYMDDateString } from '../util/YMDDate';
import { getFullSplitDataItem } from './Transactions';
import { getLots, getLotDataItems, getLotString } from './Lots';
import { SortedArray } from '../util/SortedArray';


/**
 * @typedef {object} AccountStateDataItem
 * @property {string}   ymdDate The date this state represented as a {@link YMDDate} string.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition.
 * @property {LotDataItem[]}    [lots]    For accounts that use lots, the array of the lot data items.
 */

/**
 * @typedef {object} AccountState
 * @property {YMDDate}  ymdDate The date this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition.
 * @property {Lot[]}    [lots]  For accounts that use lots, the array of the lots.
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
        const lots = getLots(accountStateDataItem.lots, alwaysCopy);
        if (alwaysCopy 
         || (ymdDate !== accountStateDataItem.ymdDate)
         || (lots !== accountStateDataItem.lots)) {
            return {
                ymdDate: ymdDate,
                quantityBaseValue: accountStateDataItem.quantityBaseValue,
                lots: lots,
            };
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
        const lotDataItems = getLotDataItems(accountState.lots, alwaysCopy);
        if (alwaysCopy 
         || (ymdDateString !== accountState.ymdDate)
         || (lotDataItems !== accountState.lots)) {
            return {
                ymdDate: ymdDateString,
                quantityBaseValue: accountState.quantityBaseValue,
                lots: lotDataItems,
            };
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
        if (hasLots && !accountState.lots) {
            accountState.lots = [];
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
        if (hasLots && !accountState.lots) {
            accountState.lots = [];
        }
    }

    return accountState;
}



function adjustAccountStateDataItemForSplit(accountState, split, ymdDate, sign) {
    const accountStateDataItem = getFullAccountStateDataItem(accountState, split.lotChanges && split.lotChanges.length);
    split = getFullSplitDataItem(split);

    accountStateDataItem.ymdDate = getYMDDateString(ymdDate) || accountStateDataItem.ymdDate;
    accountStateDataItem.quantityBaseValue += sign * split.quantityBaseValue;

    if (split.lotChanges) {
        const { lots } = accountStateDataItem;
        const sortedLots = new SortedArray((a, b) => a[0].localeCompare(b[0]), { duplicates: 'allow' });
        lots.forEach((lot) => {
            sortedLots.add([getLotString(lot), lot]);
        });

        split.lotChanges.forEach(([newLot, oldLot]) => {
            if (sign < 0) {
                [ newLot, oldLot ] = [ oldLot, newLot ];
            }

            if (oldLot) {
                // Look for the old lot.
                const lotString = getLotString(oldLot);
                const index = sortedLots.indexOf([lotString, oldLot]);
                if (index < 0) {
                    throw userError('AccountState-add_split_lot_not_found', lotString);
                }
                sortedLots.deleteIndex(index);
            }
            if (newLot) {
                sortedLots.add([getLotString(newLot), newLot]);
            }
        });

        lots.length = 0;
        sortedLots.forEach(([, lot]) => {
            lots.push(lot);
        });
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
