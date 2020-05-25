import { EventEmitter } from 'events';
import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { doSetsHaveSameElements } from '../util/DoSetsHaveSameElements';
import * as A from './Accounts';
import * as AS from './AccountStates';
import * as LS from './LotStates';
import * as PI from './PricedItems';
import { getCurrency } from '../util/Currency';
import { getRatio, getRatioJSON } from '../util/Ratios';
import { bSearch } from '../util/BinarySearch';


/**
 * @typedef {object} ReconcileStateDef
 * @property {string}   name    The identifying name of the reconcilation state.
 * @property {string}   description The user description of the reconcilation state.
 */

/**
 * Enumeration for the reconciliation states.
 * @readonly
 * @enum {ReconcileState}
 * @property {ReconcileStateDef}    NOT_RECONCILED
 * @property {ReconcileStateDef}    PENDING
 * @property {ReconcileStateDef}    RECONCILED
 */
export const ReconcileState = {
    NOT_RECONCILED: { name: 'NOT_RECONCILED', },
    PENDING: { name: 'PENDING', },
    RECONCILED: { name: 'RECONCILED', },
};

/**
 * 
 * @param {(string|ReconcileState|undefined)} ref 
 * @returns {(ReconcileState|undefined)}
 */
export function getReconcileState(ref) {
    return (typeof ref === 'string') ? ReconcileState[ref] : ref;
}


/**
 * 
 * @param {(string|ReconcileState|undefined)} ref 
 * @returns {(string|undefined)}
 */
export function getReconcileStateName(ref) {
    return ((ref === undefined) || (typeof ref === 'string')) ? ref : ref.name;
}


export function loadTransactionsUserMessages() {
    for (const reconcileState of Object.values(ReconcileState)) {
        reconcileState.description = userMsg('ReconcileState-' + reconcileState.name);
    }
/*    for (const type of Object.values(TransactionType)) {
        type.description = userMsg('TransactionType-' + type.name);
    }
*/
}


/**
 * @typedef {object}    SplitDataItem
 * @property {string}   reconcileState  The name property of the 
 * {@link ReconcileState} of the row.
 * @property {number}   accountId   The account to which the row applies.
 * @property {number}   quantityBaseValue   The base value for the amount 
 * to apply to the account.
 * @property {number|number[]} [currencyToUSDRatio]  Only required if there is a 
 * currency conversion between the items in the split and this split's currency is 
 * not USD, this is either the price, or a numerator/denominator pair for the price 
 * {@link Ratio}.
 * @property {LotChangeDataItem[]}  [lotChanges]    Array of changes to any lots.
 * @property {string}   [description]
 * @property {string}   [memo]  
 * @property {string}   [refNum]
 */


/**
 * @typedef {object}    Split
 * @property {ReconcileState}   reconcileState  The {@link ReconcileState} of the row.
 * @property {number}   accountId   The account to which the row applies.
 * @property {number}   quantityBaseValue   The base value for the amount 
 * to apply to the account.
 * @property {number|number[]} [currencyToUSDRatio]  Only required if there is a 
 * currency conversion between the items in the split and this split's currency is 
 * not USD, this is either the price, or a numerator/denominator pair for the price 
 * {@link Ratio}.
 * @property {LotChange[]}  [lotChanges]    Array of changes to any lots.
 * @property {string}   [description]
 * @property {string}   [memo]  
 * @property {string}   [refNum]
 */


/**
 * Retrieves a {@link SplitDataItem} representation of a {@link Split}, avoids copying 
 * if the arg is already a {@link SplitDataItem}
 * @param {(Split|SplitDataItem)} split
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(SplitDataItem|undefined)}
 */
export function getSplitDataItem(split, alwaysCopy) {
    if (split) {
        const reconcileStateName = getReconcileStateName(split.reconcileState);
        const lotChangeDataItems = LS.getLotChangeDataItems(split.lotChanges, alwaysCopy);
        const currencyToUSDRatioJSON = getRatioJSON(split.currencyToUSDRatio);
        if (alwaysCopy
         || (reconcileStateName !== split.reconcileState)
         || (lotChangeDataItems !== split.lotChanges)
         || (currencyToUSDRatioJSON !== split.currencyToUSDRatio)) {
            const splitDataItem = Object.assign({}, split);
            if (reconcileStateName !== undefined) {
                splitDataItem.reconcileState = reconcileStateName;
            }
            if (lotChangeDataItems !== undefined) {
                splitDataItem.lotChanges = lotChangeDataItems;
            }
            if (currencyToUSDRatioJSON !== undefined) {
                splitDataItem.currencyToUSDRatio = currencyToUSDRatioJSON;
            }
            return splitDataItem;
        }
    }
    return split;
}


/**
 * Retrieves a {@link Split} representation of a {@link SplitDataItem}, avoids 
 * copying if the arg is already a {@link Split}
 * @param {(Split|SplitDataItem)} splitDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {(Split|undefined)}
 */
export function getSplit(splitDataItem, alwaysCopy) {
    if (splitDataItem) {
        const reconcileState = getReconcileState(splitDataItem.reconcileState);
        const lotChanges = LS.getLotChanges(splitDataItem.lotChanges, alwaysCopy);
        const currencyToUSDRatio = getRatio(splitDataItem.currencyToUSDRatio);
        if (alwaysCopy
         || (reconcileState !== splitDataItem.reconcileState)
         || (lotChanges !== splitDataItem.lotChanges)
         || (currencyToUSDRatio !== splitDataItem.currencyToUSDRatio)) {
            const split = Object.assign({}, splitDataItem);
            if (reconcileState !== undefined) {
                split.reconcileState = reconcileState;
            }
            if (lotChanges !== undefined) {
                split.lotChanges = lotChanges;
            }
            if (currencyToUSDRatio !== undefined) {
                split.currencyToUSDRatio = currencyToUSDRatio;
            }
            return split;
        }
    }
    return splitDataItem;
}


/**
 * Retrieves a {@link SplitDataItem} that has missing properties set to defaults.
 * @param {Split|SplitDataItem} split 
 * @returns {SplitDataItem}
 */
export function getFullSplitDataItem(split) {
    split = getSplitDataItem(split, true);
    if (split) {
        if ((split.reconcileState === undefined) || (split.reconcileState === null)) {
            split.reconcileState = ReconcileState.NOT_RECONCILED.name;
        }
        if ((split.quantityBaseValue === undefined) 
            || (split.quantityBaseValue === null)) {
            split.quantityBaseValue = 0;
        }
    }
    return split;
}


/**
 * Retrieves a {@link Split} that has missing properties set to defaults.
 * @param {Split|SplitDataItem} split 
 * @returns {Split}
 */
export function getFullSplit(split) {
    split = getSplit(split, true);
    if (split) {
        if ((split.reconcileState === undefined) || (split.reconcileState === null)) {
            split.reconcileState = ReconcileState.NOT_RECONCILED;
        }
        if ((split.quantityBaseValue === undefined) 
            || (split.quantityBaseValue === null)) {
            split.quantityBaseValue = 0;
        }
    }
    return split;
}


/**
 * Array version of {@link getSplitDataItem}
 * @param {(Split[]|SplitDataItem[])} splits
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(SplitDataItem[]|undefined)}
 */
export function getSplitDataItems(splits, alwaysCopy) {
    if (splits) {
        if (alwaysCopy
         || (splits.length && (getSplitDataItem(splits[0]) !== splits[0]))) {
            return splits.map((split) => getSplitDataItem(split, alwaysCopy));
        }
    }
    return splits;
}


/**
 * Array version of {@link getSplit}
 * @param {(Split[]|SplitDataItem[])} splitDataItems
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(Split[]|undefined)}
 */
export function getSplits(splitDataItems, alwaysCopy) {
    if (splitDataItems) {
        if (alwaysCopy
         || (splitDataItems.length 
            && (getSplit(splitDataItems[0]) !== splitDataItems[0]))) {
            return splitDataItems.map(
                (splitDataItem) => getSplit(splitDataItem, alwaysCopy));
        }
    }
    return splitDataItems;
}


/**
 * @typedef {object}    TransactionDataItem
 * @property {number}   id
 * @property {string}   ymdDate The transaction's date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that 
 * fall on the same day, the lower the value the earlier in the day the transaction 
 * is ordered. If not given then it is treated as
 * -{@link Number#MAX_VALUE}.
 * @property {SplitDataItem[]}   splits
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * @typedef {object}    Transaction
 * @property {number}   id
 * @property {YMDDate}  ymdDate The transaction's date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that 
 * fall on the same day, the lower the value the earlier in the day the transaction 
 * is ordered. If not given then it is treated as 0.
 * @property {Split[]}  splits
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * Retrieves a {@link TransactionDataItem} representation of a {@link Transaction}, 
 * avoids copying if the arg is already a {@link TransactionDataItem}
 * @param {(Transaction|TransactionDataItem)} transaction
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(Transaction|undefined)}
 */
export function getTransactionDataItem(transaction, alwaysCopy) {
    if (transaction) {
        const ymdDateString = (transaction.ymdDate) 
            ? getYMDDateString(transaction.ymdDate)
            : undefined;
        const splitDataItems = getSplitDataItems(transaction.splits, alwaysCopy);
        if (alwaysCopy
         || (ymdDateString !== transaction.ymdDate)
         || (splitDataItems !== transaction.splits)) {
            const transactionDataItem = Object.assign({}, transaction);
            if (ymdDateString !== undefined) {
                transactionDataItem.ymdDate = ymdDateString;
            }
            if (splitDataItems !== undefined) {
                transactionDataItem.splits = splitDataItems;
            }
            return transactionDataItem;
        }
    }
    return transaction;
}


/**
 * Retrieves a {@link Transaction} representation of a {@link TransactionDataItem}, 
 * avoids copying if the arg is already a {@link Transaction}
 * @param {(Transaction|TransactionDataItem)} transactionDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(TransactionDataItem|undefined)}
 */
export function getTransaction(transactionDataItem, alwaysCopy) {
    if (transactionDataItem) {
        const ymdDate = (transactionDataItem.ymdDate) 
            ? getYMDDate(transactionDataItem.ymdDate)
            : undefined;
        const splits = getSplits(transactionDataItem.splits, alwaysCopy);
        if (alwaysCopy
         || (ymdDate !== transactionDataItem.ymdDate)
         || (splits !== transactionDataItem.splits)) {
            const transaction = Object.assign({}, transactionDataItem);
            if (ymdDate !== undefined) {
                transaction.ymdDate = ymdDate;
            }
            if (splits !== undefined) {
                transaction.splits = splits;
            }
            return transaction;
        }
    }
    return transactionDataItem;
}


function copyTransactionDataItems(transactionDataItems) {
    if (transactionDataItems) {
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            transactionDataItems[i] 
            = getTransactionDataItem(transactionDataItems[i], true);
        }
    }
    return transactionDataItems;
}


/**
 * @typedef {object} TransactionKey
 * Primarily used for sorting transactions.
 * @property {number}   id  The transaction id.
 * @property {YMDDate}  ymdDate The transaction date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that 
 * fall on the same day, the lower the value the earlier in the day the transaction 
 * is ordered. If not given then it is treated as 0.
 */

export function getTransactionKey(transaction) {
    if (transaction) {
        if (typeof transaction.ymdDate === 'string') {
            const key = { id: transaction.id, 
                ymdDate: getYMDDate(transaction.ymdDate), 
            };
            if ((transaction.sameDayOrder !== undefined) 
             && (transaction.sameDayOrder !== null)) {
                key.sameDayOrder = transaction.sameDayOrder;
            }
            return key;
        }
        return transaction;
    }
}

export function getTransactionKeyData(transaction) {
    if (transaction) {
        if (typeof transaction.ymdDate === 'string') {
            return transaction;
        }
        const key = { id: transaction.id, 
            ymdDate: getYMDDateString(transaction.ymdDate), 
        };
        if ((transaction.sameDayOrder !== undefined) 
         && (transaction.sameDayOrder !== null)) {
            key.sameDayOrder = transaction.sameDayOrder;
        }
        return key;
    }
}


export function compareTransactionKeys(a, b) {
    let result;
    if (typeof a.ymdDate === 'string') {
        const bYMDDate = (typeof b.ymdDate !== 'string') 
            ? b.ymdDate.toString() : b.ymdDate;
        result = a.ymdDate.localeCompare(bYMDDate);
    }
    else {
        const bYMDDate = (typeof b.ymdDate === 'string') 
            ? new YMDDate(b.ymdDate) : b.ymdDate;
        result = YMDDate.compare(a.ymdDate, bYMDDate);
    }
    if (result) {
        return result;
    }

    const aSameDayOrder = a.sameDayOrder || 0;
    const bSameDayOrder = b.sameDayOrder || 0;
    if (aSameDayOrder !== bSameDayOrder) {
        return aSameDayOrder - bSameDayOrder;
    }

    return a.id - b.id;
}


/**
 * @typedef {object} AccountStateAndTransactionInfo
 * @property {AccountStateDataItem} accountStateDataItem
 * @property {TransactionDataItem}  transactionDataItem
 * @property {number}   splitIndex  The index of the {@link SplitDataItem} in the
 * {@link TransactionDataItem}'s split property.
 * @property {number}   splitOccurrance  Which split occurrance this respresents
 * for the account in the transaction data item.
 */


//
//---------------------------------------------------------
//
class AccountStatesUpdater {
    constructor(manager) {
        this._manager = manager;
        this._accountManager = manager._accountingSystem.getAccountManager();

        this._accountProcessorsByAccountIds = new Map();
    }


    async _asyncProcessTransactionDataItem(transactionDataItem, isNewDataItem, 
        replacementTransactionDataItem) {
        const { splits } = transactionDataItem;
        const newTransactionEntriesByAccountId = new Map();
        for (let i = 0; i < splits.length; ++i) {
            const split = splits[i];
            const { accountId } = split;
            let processor = this._accountProcessorsByAccountIds.get(accountId);
            if (!processor) {
                const accountEntry = await this._manager._asyncLoadAccountEntry(
                    accountId);
                const { sortedTransactionKeys, hasLots } = accountEntry;

                processor = {
                    accountId: accountId,
                    accountEntry: accountEntry,
                    updatedSortedTransctionEntries: new SortedArray(
                        (a, b) => compareTransactionKeys(a[0], b[0])),
                };

                sortedTransactionKeys.forEach((key) => {
                    processor.updatedSortedTransctionEntries.add([key]);
                });


                // If we have lots then we're going to have to work with a list of 
                // sorted transactions that's updated on the fly with modifications.
                processor.oldestIndex = Math.max(sortedTransactionKeys.length - 1, 0);
                if (!hasLots) {
                    processor.oldSplitDataItems = [];
                    processor.newSplitDataItems = [];
                }
                else {
                    processor.removedLotIds = new Set();
                }

                this._accountProcessorsByAccountIds.set(accountId, processor);
            }

            const { updatedSortedTransctionEntries } = processor;
            if (isNewDataItem) {
                // Stick the new data item into the list.
                let newTransactionEntry = newTransactionEntriesByAccountId.get(
                    accountId);
                if (!newTransactionEntry) {
                    newTransactionEntry = [transactionDataItem, []];
                    newTransactionEntriesByAccountId.set(accountId, 
                        newTransactionEntry);

                    updatedSortedTransctionEntries.add(newTransactionEntry);
                }
                newTransactionEntry[1].push(split);
            }
            else {
                updatedSortedTransctionEntries.delete([transactionDataItem, ]);
            }

            const { accountEntry } = processor;
            const { sortedTransactionKeys } = accountEntry;

            // We're rewinding the account state to be before index, so we want 
            // index to be where transactionDataItem would end up.
            let index = bSearch(sortedTransactionKeys, transactionDataItem, 
                compareTransactionKeys);
            if (index >= 0) {
                if (isNewDataItem) {
                    while ((index < sortedTransactionKeys.length)
                     && (compareTransactionKeys(transactionDataItem, 
                         sortedTransactionKeys[index]) > 0)) {
                        ++index;
                    }
                }
            }
            else {
                index = 0;
            }

            if (index < processor.oldestIndex) {
                processor.oldestIndex = index;
            }

            if (accountEntry.hasLots) {
                if (!isNewDataItem) {
                    const removedLotIds = new Set();
                    const oldLotChanges = split.lotChanges;
                    oldLotChanges.forEach((lotChange) => {
                        if (!lotChange.isSplitMerge 
                            && (lotChange.quantityBaseValue > 0)) {
                            removedLotIds.add(lotChange.lotId);
                        }
                    });

                    if (replacementTransactionDataItem) {
                        const newSplits = replacementTransactionDataItem.splits;
                        newSplits.forEach((newSplit) => {
                            if (newSplit.accountId === accountId) {
                                const newLotChanges = newSplit.lotChanges;
                                newLotChanges.forEach((lotChange) => {
                                    if (!lotChange.isSplitMerge 
                                        && (lotChange.quantityBaseValue > 0)) {
                                        removedLotIds.delete(lotChange.lotId);
                                    }
                                });
                            }
                        });
                    }
                    removedLotIds.forEach(
                        (lotId) => processor.removedLotIds.add(lotId));
                }
            }
            else {
                if (isNewDataItem) {
                    processor.newSplitDataItems.push(split);
                }
                else {
                    processor.oldSplitDataItems.push(split);
                }
            }
        }
    }


    async asyncAddTransactionUpdate(existingTransactionDataItem, 
        newTransactionDataItem) {
        if (existingTransactionDataItem) {
            await this._asyncProcessTransactionDataItem(
                existingTransactionDataItem, false, newTransactionDataItem);
        }

        if (newTransactionDataItem) {
            await this._asyncProcessTransactionDataItem(
                newTransactionDataItem, true);
        }
    }


    _validateLotSplit(transactionKey, accountState, split, newAccountStatesByOrder, 
        removedLotIds) {
        const { lotChanges } = split;
        if (!lotChanges) {
            throw userError('TransactionManager-lot_changes_missing');
        }

        let latestAccountState;
        if (newAccountStatesByOrder.length) {
            const latestAccountStates 
                = newAccountStatesByOrder[newAccountStatesByOrder.length - 1];
            if (latestAccountStates.length) {
                latestAccountState = latestAccountStates[latestAccountStates.length - 1];
            }
        }

        lotChanges.forEach((lotChange) => {
            const { lotId, quantityBaseValue, costBasisBaseValue, isSplitMerge } 
                = lotChange;
            const lotManager = this._manager._accountingSystem.getLotManager();
            if (!lotManager.getLotDataItemWithId(lotId)) {
                throw userError('TransactionManager-lot_change_invalid_lot_id', lotId);
            }

            // New lot?
            let existingLotState;
            if (latestAccountState) {
                const { lotStates } = latestAccountState;
                if (lotStates) {
                    for (let i = lotStates.length - 1; i >= 0; --i) {
                        const lotState = lotStates[i];
                        if (lotState.lotId === lotId) {
                            existingLotState = lotState;
                            break;
                        }
                    }
                }
            }

            if (!existingLotState) {
                // New lot...

                // Was the lot removed?
                if (removedLotIds.has(lotId)) {
                    throw userError('TransactionManager-lot_still_in_use', lotId);
                }

                // Can't have a split/merge on a new lot...
                if (isSplitMerge) {
                    throw userError('TransactionManager-no_split_merge_new_lot');
                }
                
                // We need a positive quantityBaseValue and a costBasisBaseValue.
                if (!quantityBaseValue || (quantityBaseValue <= 0)) {
                    if (this._manager.isDebug) {
                        console.log('lotId: ' + lotId);
                        console.log('removedLotIds: ' 
                            + JSON.stringify(Array.from(removedLotIds.values())));
                    }
                    throw userError('TransactionManager-new_lot_invalid_quantity');
                }

                // The costBasisBaseValue should also match the split's 
                // quantityBaseValue (should it?)
                if ((costBasisBaseValue === undefined) 
                    || (costBasisBaseValue === null) || (costBasisBaseValue < 0)) {
                    throw userError('TransactionManager-new_lot_invalid_cost_basis');
                }
            }
            else {
                // OK, the lot exists.
                // For now only allow selling or split/merge, don't allow buying more.
                if (isSplitMerge) {
                    if ((quantityBaseValue + existingLotState.quantityBaseValue) < 0) {
                        // eslint-disable-next-line max-len
                        throw userError('TransactionManager-lot_split_merge_quantity_too_big');
                    }
                }
                else {
                    if (quantityBaseValue > 0) {
                        throw userError('TransactionManager-modify_lot_quantity_invalid');
                    }
                    else if (
                        (existingLotState.quantityBaseValue + quantityBaseValue) < 0) {
                        throw userError('TransactionManager-modify_lot_quantity_too_big');
                    }
                }
            }
        });
    }


    async asyncGenerateCurrentAccountStates() {
        const accountStatesByAccountId = new Map();

        const accountProcessors 
            = Array.from(this._accountProcessorsByAccountIds.values());
        for (let i = accountProcessors.length - 1; i >= 0; --i) {
            const processor = accountProcessors[i];
            const { accountId } = processor;
            const { accountEntry, updatedSortedTransctionEntries } = processor;
            const { hasLots } = accountEntry;
            let accountState;

            let ymdDate;
            if (updatedSortedTransctionEntries.length) {
                const latestEntry = updatedSortedTransctionEntries.at(
                    updatedSortedTransctionEntries.length - 1);
                if (latestEntry) {
                    if (!latestEntry[0]) {
                        console.log('latestEntry: ' + JSON.stringify(latestEntry));
                        console.log(JSON.stringify(
                            updatedSortedTransctionEntries.getValues()));
                    }
                    ymdDate = latestEntry[0].ymdDate;
                }
            }

            if (hasLots) {
                // We want to unwind the account state all the way back to the 
                // oldest transaction Then we need to rewind back up but we need to 
                // use the updated splits.
                const { sortedTransactionKeys } = accountEntry;
                const { oldestIndex, removedLotIds } = processor;

                if (sortedTransactionKeys.length) {
                    const transactionId = sortedTransactionKeys[oldestIndex].id;
                    const accountStates = (await this._manager
                        .asyncGetAccountStateDataItemsBeforeTransaction(
                            accountId, transactionId));
                    accountState = accountStates[accountStates.length - 1];
                }
                else {
                    accountState = { lotStates: [] };
                }

                const newAccountStatesByOrder 
                    = accountEntry.accountStatesByOrder.slice(0, oldestIndex);
                processor.newAccountStatesByOrder = newAccountStatesByOrder;

                // index should also be valid in updatedSortedTransctionEntries, 
                // as it is the oldest index, which means it is closest to 0.
                for (let i = oldestIndex; 
                    i < updatedSortedTransctionEntries.length; ++i) {
                    const [transactionKey, newSplits] 
                        = updatedSortedTransctionEntries.at(i);

                    const accountStates = [ accountState ];
                    newAccountStatesByOrder.push(accountStates);

                    const { id, ymdDate } = transactionKey;
                    if (!newSplits) {
                        const transactionDataItem 
                            = await this._manager.asyncGetTransactionDataItemsWithIds(id);
                        const { splits, ymdDate } = transactionDataItem;
                        splits.forEach((split) => {
                            if (split.accountId === accountId) {
                                this._validateLotSplit(transactionKey, 
                                    accountState, split, newAccountStatesByOrder, 
                                    removedLotIds);
                                accountState = AS.addSplitToAccountStateDataItem(
                                    accountState, split, ymdDate);
                                accountStates.push(accountState);
                            }
                        });
                    }
                    else {
                        newSplits.forEach((newSplit) => {
                            this._validateLotSplit(transactionKey, accountState, 
                                newSplit, newAccountStatesByOrder, removedLotIds);
                            accountState = AS.addSplitToAccountStateDataItem(
                                accountState, newSplit, ymdDate);
                            accountStates.push(accountState);
                        });
                    }
                }
            }
            else {
                // We can just remove/add the splits since order doesn't matter.
                const { oldSplitDataItems, newSplitDataItems } = processor;

                accountState = this._manager.getCurrentAccountStateDataItem(accountId);

                oldSplitDataItems.forEach((splitDataItem) => {
                    accountState = AS.removeSplitFromAccountStateDataItem(
                        accountState, splitDataItem, ymdDate);
                });
                newSplitDataItems.forEach((splitDataItem) => {
                    accountState = AS.addSplitToAccountStateDataItem(
                        accountState, splitDataItem, ymdDate);
                });
            }

            accountStatesByAccountId.set(accountId, accountState);
        }

        return accountStatesByAccountId;
    }


    updateAccountEntries() {
        const accountProcessors 
            = Array.from(this._accountProcessorsByAccountIds.values());
        for (let i = accountProcessors.length - 1; i >= 0; --i) {
            const processor = accountProcessors[i];
            const { accountEntry, oldestIndex, newAccountStatesByOrder } = processor;
            const { sortedTransactionKeys, accountStatesByTransactionId } = accountEntry;

            if (oldestIndex <= 0) {
                accountEntry.accountStatesByOrder.length = 0;
                accountStatesByTransactionId.clear();
            }
            else {
                for (let i = oldestIndex; i < sortedTransactionKeys.length; ++i) {
                    accountStatesByTransactionId.delete(sortedTransactionKeys[i].id);
                }
                if (newAccountStatesByOrder) {
                    accountEntry.accountStatesByOrder = newAccountStatesByOrder;
                }
                else {
                    accountEntry.accountStatesByOrder.length 
                        = Math.max(processor.oldestIndex, 0);
                }
            }

            // Force reloading of the account entry the next time it's needed.
            accountEntry.sortedTransactionKeys = undefined;
            accountEntry.nonReconciledTransactionIds = undefined;

            //accountEntry.accountStatesByTransactionId.clear();
        }
    }
}



/**
 * Manager for {@link Transaction}s
 */
export class TransactionManager extends EventEmitter {

    constructor(accountingSystem, options) {
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator 
            || this._handler.getIdGeneratorOptions());

        const undoManager = accountingSystem.getUndoManager();
        this._asyncApplyUndoAddTransactions 
            = this._asyncApplyUndoAddTransactions.bind(this);
        undoManager.registerUndoApplier('addTransactions', 
            this._asyncApplyUndoAddTransactions);

        this._asyncApplyUndoRemoveTransactions 
            = this._asyncApplyUndoRemoveTransactions.bind(this);
        undoManager.registerUndoApplier('removeTransactions', 
            this._asyncApplyUndoRemoveTransactions);

        this._asyncApplyUndoModifyTransactions 
            = this._asyncApplyUndoModifyTransactions.bind(this);
        undoManager.registerUndoApplier('modifyTransactions', 
            this._asyncApplyUndoModifyTransactions);

        this.asyncGetTransactionDataItemWithId 
            = this.asyncGetTransactionDataItemsWithIds;
        this.asyncAddTransaction = this.asyncAddTransactions;
        this.asyncRemoveTransaction = this.asyncRemoveTransactions;
        this.asyncModifyTransaction = this.asyncModifyTransactions;

        this._accountEntriesByAccountId = new Map();
    }

    async asyncSetupForUse() {
    }


    shutDownFromUse() {
        this._accountEntriesByAccountId.clear();
        this._handler = undefined;
        this._accountingSystem = undefined;        
    }
    
    getAccountingSystem() { return this._accountingSystem; }


    _resolveDateRange(ymdDateA, ymdDateB) {
        if (Array.isArray(ymdDateA)) {
            ymdDateB = ymdDateA[1];
            ymdDateA = ymdDateA[0];
        }
        ymdDateA = (ymdDateA !== undefined) ? getYMDDate(ymdDateA) : ymdDateA;
        ymdDateB = (ymdDateB !== undefined) ? getYMDDate(ymdDateB) : ymdDateB;
        return YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);
    }


    /**
     * Retrieves the dates of the earliest and latest transactions, optionally 
     * restricted to only the transactions that refer to a specified account.
     * @param {(number|undefined)} accountId If defined only transactions that 
     * refer to this account id are considered.
     * @returns {(YMDDate[]|undefined)} An array whose first element is the 
     * earliest date and whose second element is the latest date, 
     * <code>undefined</code> if there are no transactions.
     */
    async asyncGetTransactionDateRange(accountId) {
        return this._handler.asyncGetTransactionDateRange(accountId);
    }


    /**
     * Retrieves the transactions within a date range, optionally restricted to 
     * only the transactions that refer to a specified account.
     * @param {(number|undefined)} accountId If defined only transactions that 
     * refer to this account id are considered.
     * @param {(YMDDate|string)} ymdDateA   One end of the data range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @returns {TransactionDataItem[]} An array containing the transaction data 
     * items, sorted from earliest to latest date.
     */
    async asyncGetTransactionDataItemsInDateRange(accountId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        const result = await this._handler.asyncGetTransactionDataItemsInDateRange(
            accountId, ymdDateA, ymdDateB);
        return copyTransactionDataItems(result);
    }


    /**
     * Retrieves transaction data items by id number.
     * @param {(number|number[])} ids Either a single id or an array of ids of interest.
     * @returns {(TransactionDataItem|undefined|TransactionDataItem[])}   If ids 
     * is a single number a single transaction data item is returned, or 
     * <code>undefined</code> if there was no transaction with that id. If ids is 
     * an array, then an array is returned, any ids that did not have a transaction 
     * have their corresponding element set to <code>undefined</code>.
     */
    async asyncGetTransactionDataItemsWithIds(ids) {
        if (!Array.isArray(ids)) {
            const result = await this.asyncGetTransactionDataItemsWithIds([ids]);
            return (result) ? result[0] : result;
        }

        return this._asyncGetTransactionDataItemsCopiesWithIds(ids);
    }

    async _asyncGetTransactionDataItemsCopiesWithIds(ids) {
        const result = await this._handler.asyncGetTransactionDataItemsWithIds(ids);
        return copyTransactionDataItems(result);
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for an account, sorted from 
     * oldest to newest.
     * @param {number} accountId 
     * @param {boolean} [includeSplitCounts=false]  If <code>true</code> then the
     * transaction keys have a splitCount property added that is the number of
     * splits in the transaction that refer to the account.
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForAccount(accountId, includeSplitCounts) {
        return this._handler.asyncGetSortedTransactionKeysForAccount(accountId, 
            includeSplitCounts);
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for a lot, sorted from 
     * oldest to newest.
     * @param {number} lotId 
     * @param {boolean} [includeSplitCounts=false]  If <code>true</code> then the
     * transaction keys have a splitCount property added that is the number of
     * splits in the transaction that refer to the lot.
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForLot(lotId, includeSplitCounts) {
        return this._handler.asyncGetSortedTransactionKeysForLot(lotId, 
            includeSplitCounts);
    }


    /**
     * @typedef {object}    TransactionManager~AccountEntry
     * accountStatesByTransactionId is the primary account state cache, it 
     * contains for each transaction an array with an account state
     * entry for each split in the transaction that references the account.
     * <p>
     * accountStatesByOrder is a secondary cache. It is an array that contains 
     * the account state arrays in accountStatesByTransactionId, except these 
     * are ordered to match the ordering of the transaction
     * keys in {@link TransactionHandler#asyncGetSortedTransactionKeysForAccount}.
     * <p>
     * The point behind accountStatesByOrder is that it caches account states that 
     * have been computed from the newest transaction down to the last transaction. 
     * So if the next older transaction is requested, those account states have already
     * been computed.
     * @private
     * @property {boolean}  hasLots
     * @property {Map<number, AccountStateDataItem>} accountStatesByTransactionId
     * @property {AccountStateDataItem[]}   accountStatesByOrder    The ordering 
     * here matches the ordering of the arrays returned by 
     * {@link TransactionHandler#asyncGetSortedTransactionKeysForAccount}.
     * @property {TransactionKey[]} sortedTransactionKeys   The result from 
     * {@link TransactionHandler#asyncGetSortedTransactionKeysForAccount}.
     * @property {number[]} nonReconciledTransactionIds The result from
     * {@link TransactionHandler#asyncGetNonReconciledIdsForAccountId}.
     */
    

    async _asyncLoadAccountEntry(accountId) {
        const accountDataItem = this._accountingSystem.getAccountManager()
            .getAccountDataItemWithId(accountId);
        if (!accountDataItem) {
            throw userError('TransactionManager-account_state_update_account_invalid', 
                accountId);
        }

        let accountEntry = this._accountEntriesByAccountId.get(accountId);
        if (!accountEntry) {
            const type = A.getAccountType(accountDataItem.type);
            accountEntry = {
                hasLots: type.hasLots,
                accountStatesByTransactionId: new Map(),
                accountStatesByOrder: [],
            };
            this._accountEntriesByAccountId.set(accountId, accountEntry);
        }

        if (!accountEntry.sortedTransactionKeys) {
            const sortedTransactionKeys 
                = await this._handler.asyncGetSortedTransactionKeysForAccount(accountId);
            accountEntry.sortedTransactionKeys = sortedTransactionKeys;
            const indicesByTransactionId = new Map();
            for (let i = sortedTransactionKeys.length - 1; i >= 0; --i) {
                indicesByTransactionId.set(sortedTransactionKeys[i].id, i);
            }
            accountEntry.indicesByTransactionId = indicesByTransactionId;
        }

        if (!accountEntry.nonReconciledTransactionIds) {
            accountEntry.nonReconciledTransactionIds 
                = Array.from(await this._handler.asyncGetNonReconciledIdsForAccountId(
                    accountId));
        }

        return accountEntry;
    }


    async _asyncLoadAccountStateDataItemsForTransactionId(accountId, transactionId) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);
        let accountStateDataItems 
            = accountEntry.accountStatesByTransactionId.get(transactionId);

        if (!accountStateDataItems) {
            let workingAccountState = this.getCurrentAccountStateDataItem(accountId);

            const { sortedTransactionKeys, accountStatesByOrder, 
                accountStatesByTransactionId } = accountEntry;

            for (let i = sortedTransactionKeys.length - 1; i >= 0; --i) {
                const { id } = sortedTransactionKeys[i];
                if (accountStatesByOrder[i]) {                    
                    accountStateDataItems = accountStatesByOrder[i];
                    workingAccountState = accountStateDataItems[0];
                }
                else {
                    let ymdDate = getYMDDateString(sortedTransactionKeys[i].ymdDate);
                    const transaction 
                        = await this.asyncGetTransactionDataItemsWithIds(id);
                    const { splits } = transaction;

                    const newAccountStateDataItems = [ workingAccountState ];
                    for (let s = splits.length - 1; s >= 0; --s) {
                        const split = splits[s];
                        if (split.accountId === accountId) {
                            workingAccountState 
                                = AS.removeSplitFromAccountStateDataItem(
                                    workingAccountState, split, ymdDate);
                            newAccountStateDataItems.push(workingAccountState);
                        }
                    }

                    newAccountStateDataItems.reverse();

                    if (i > 0) {
                        newAccountStateDataItems[0].ymdDate 
                            = getYMDDateString(sortedTransactionKeys[i - 1].ymdDate);
                    }
                    else {
                        delete newAccountStateDataItems[0].ymdDate;
                    }

                    accountStatesByOrder[i] = newAccountStateDataItems;
                    accountStateDataItems = newAccountStateDataItems;
                    accountStatesByTransactionId.set(id, newAccountStateDataItems);
                }

                if (id === transactionId) {
                    break;
                }
            }
        }

        return accountStateDataItems;
    }


    /**
     * Returns the current account state data item for an account. This is the 
     * account state after the newest transaction has been applied.
     * @param {number} accountId 
     * @returns {AccountStateDataItem}
     */
    getCurrentAccountStateDataItem(accountId) {
        let accountStateDataItem = this._handler.getCurrentAccountStateDataItem(
            accountId);
        if (!accountStateDataItem) {
            // No transactions, let's create an empty account state.
            const accountDataItem = this._accountingSystem.getAccountManager()
                .getAccountDataItemWithId(accountId);
            if (accountDataItem) {
                const type = A.getAccountType(accountDataItem.type);
                return AS.getFullAccountStateDataItem(
                    { quantityBaseValue: 0 }, type.hasLots);
            }
        }
        return AS.getAccountStateDataItem(accountStateDataItem, true);
    }


    /**
     * Retrieves the account state data item immediately after a transaction has 
     * been applied to the account.
     * @param {number} accountId 
     * @param {number} transactionId 
     * @returns {AccountStateDataItem[]}    An array containing the account states 
     * immediately after a transaction has been applied. Multiple account states are 
     * returned if there are multiple splits referring to the account. The referring 
     * split at index closest to zero is at the first index, the last account state 
     * is the account state after the transaction has been fully applied.
     */
    async asyncGetAccountStateDataItemsAfterTransaction(accountId, transactionId) {
        const accountStateDataItems 
            = await this._asyncLoadAccountStateDataItemsForTransactionId(
                accountId, transactionId);
        return accountStateDataItems.slice(1);
    }


    /**
     * Retrieves the account state data item(s) immediately before a transaction has 
     * been applied to the account.
     * @param {number} accountId 
     * @param {number} transactionId 
     * @returns {AccountStateDataItem[]}    An array containing the account states 
     * immediately before a transaction is applied. Multiple account states are 
     * returned if there are multiple splits referring to the account. The referring 
     * split at index closest to zero is at the first index.
     */
    async asyncGetAccountStateDataItemsBeforeTransaction(accountId, transactionId) {
        const accountStateDataItems 
            = await this._asyncLoadAccountStateDataItemsForTransactionId(
                accountId, transactionId);
        return accountStateDataItems.slice(0, accountStateDataItems.length - 1);
    }


    /**
     * Retrieves the account state data item and corresponding transaction data items
     * for all the transactions between two transactions. The account states are after
     * the transactions have been applied.
     * @param {number} accountId 
     * @param {number} transactionIdA 
     * @param {number} transactionIdB 
     * @returns {AccountStateAndTransactionInfo[]}
     */
    async asyncGetAccountStateAndTransactionDataItems(accountId, 
        transactionIdA, transactionIdB) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);

        // Figure out the older of the two ids...
        const transactionIds = [transactionIdA, transactionIdB];
        let transactionDataItems = await this.asyncGetTransactionDataItemsWithIds(
            transactionIds
        );

        let olderIndex = (compareTransactionKeys(transactionDataItems[0],
            transactionDataItems[1]) <= 0)
            ? 0 : 1;
        const newerTransactionId = transactionIds[1 - olderIndex];
        
        const olderTransactionDataItem = transactionDataItems[olderIndex];

        const sortedTransactionKeys 
            = await this.asyncGetSortedTransactionKeysForAccount(accountId);

        let index = bSearch(sortedTransactionKeys, olderTransactionDataItem, 
            compareTransactionKeys);
        transactionIds.length = 0;
        while (index < sortedTransactionKeys.length) {
            const transactionId = sortedTransactionKeys[index].id;
            transactionIds.push(transactionId);

            if (transactionId === newerTransactionId) {
                break;
            }
            ++index;
        }

        transactionDataItems = await this.asyncGetTransactionDataItemsWithIds(
            transactionIds);

        // Loading the older of the transactions loads all the account states
        // up to the newest transaction.

        const result = [];
        for (let i = 0; i < transactionDataItems.length; ++i) {
            const transactionDataItem = transactionDataItems[i];
            const { id } = transactionDataItem;
            let accountStateDataItems
                = accountEntry.accountStatesByTransactionId.get(id);
            if (!accountStateDataItems) {
                accountStateDataItems 
                    = await this._asyncLoadAccountStateDataItemsForTransactionId(
                        accountId, id);
                if (!accountStateDataItems) {
                    continue;
                }
            }

            // We start at 1 because the first account state is the same as the
            // last account state of the previous transaction.
            let splitIndex = 0;
            let splitOccurrance = 0;
            const { splits } = transactionDataItem;
            for (let i = 1; i < accountStateDataItems.length; ++i) {
                for (; splitIndex < splits.length; ++splitIndex) {
                    if (splits[splitIndex].accountId === accountId) {
                        break;
                    }
                }
                result.push({
                    accountStateDataItem: accountStateDataItems[i],
                    transactionDataItem: transactionDataItem,
                    splitIndex: splitIndex,
                    splitOccurrance: splitOccurrance,
                });

                ++splitIndex;
                ++splitOccurrance;
            }
        }
        return result;
    }


    /**
     * Retrieves an array of the ids of transactions that have splits that refer
     * to a given account whose reconcileState is not {@link ReconcileState.RECONCILED}.
     * @param {number} accountId 
     * @returns {number[]}
     */
    async asyncGetNonReconciledIdsForAccountId(accountId) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);
        return Array.from(accountEntry.nonReconciledTransactionIds);
    }


    /**
     * Validates an array of splits.
     * @param {Split[]|SplitDataItem[]} splits 
     * @param {boolean} isModify    If <code>true</code> the splits are for a 
     * transaction modify, and any lot changes will not be verified against the 
     * account's currenty state.
     * @returns {Error|undefined}   Returns an Error if invalid, 
     * <code>undefined</code> if valid.
     */
    validateSplits(splits, isModify) {
        if (!splits) {
            return userError('TransactionManager~need_at_least_2_splits');
        }

        // We need to ensure that the sum of the values of the splits add up.

        const accountManager = this._accountingSystem.getAccountManager();
        const pricedItemManager = this._accountingSystem.getPricedItemManager();

        let creditSumBaseValue = 0;
        let activeCurrency;

        const splitCurrencies = [];
        const splitCreditBaseValues = [];
        let isCurrencyExchange = false;
        let splitMergeLotCount = 0;

        for (let i = 0; i < splits.length; ++i) {
            const split = splits[i];

            const accountDataItem = accountManager.getAccountDataItemWithId(
                split.accountId);
            const account = A.getAccount(accountDataItem);
            if (!account) {
                return userError('TransactionManager~split_account_not_found', 
                    split.accountId);
            }

            const pricedItem = PI.getPricedItem(
                pricedItemManager.getPricedItemDataItemWithId(account.pricedItemId));
            if (!pricedItem) {
                return userError('TransactionManager~split_priced_item_not_found', 
                    account.pricedItemId, account.id);
            }

            const currency = getCurrency(pricedItem.currency);
            if (!activeCurrency) {
                activeCurrency = currency;
            }

            const { creditSign } = account.type.category;
            const creditBaseValue = creditSign * split.quantityBaseValue;

            splitCurrencies.push(currency);
            splitCreditBaseValues.push(creditBaseValue);

            isCurrencyExchange = isCurrencyExchange || (currency !== activeCurrency);


            if (account.type.hasLots) {
                const { lotChanges } = split;
                if (!lotChanges && creditBaseValue) {
                    return userError('TransactionManager~split_needs_lots', 
                        account.type.name);
                }

                if (lotChanges) {
                    for (let j = lotChanges.length - 1; j >= 0; --j) {
                        if (lotChanges[j].isSplitMerge) {
                            ++splitMergeLotCount;
                            break;
                        }
                    }
                }

                // Lot validation is performed by AccountStateUpdater.
            }

            creditSumBaseValue += creditBaseValue;
        }

        if (splitMergeLotCount !== 1) {
            if (splits.length < 2) {
                return userError('TransactionManager~need_at_least_2_splits');
            }
        }

        if (isCurrencyExchange) {
            // Gotta do this all over, validating the currency prices...
            const usdCurrency = getCurrency('USD');
            creditSumBaseValue = 0;

            for (let i = 0; i < splits.length; ++i) {
                const split = getSplit(splits[i]);
                const currency = splitCurrencies[i];
                let creditBaseValue = splitCreditBaseValues[i];

                if (currency !== usdCurrency) {
                    if (!split.currencyToUSDRatio) {
                        return userError(
                            'TransactionManager~split_needs_currency_price', currency);
                    }
                    creditBaseValue = split.currencyToUSDRatio.inverse()
                        .applyToNumber(creditBaseValue);
                }

                creditSumBaseValue += creditBaseValue;
            }
        }

        if (creditSumBaseValue !== 0) {
            if (!activeCurrency) {
                const pricedItemManager = this._accountingSystem.getPricedItemManager();
                activeCurrency = pricedItemManager.getBaseCurrencyPricedItemDataItem()
                    .currency;
            }
            const excessAmount = activeCurrency.baseValueToString(creditSumBaseValue);
            return userError('TransactionManager~splits_dont_add_up', excessAmount);
        }
    }


    _validateTransactionBasics(transactionDataItem, isModify) {
        if (!transactionDataItem.ymdDate) {
            return userError('TransactionManager-date_required');
        }

        const splitsError = this.validateSplits(transactionDataItem.splits, isModify);
        if (splitsError) {
            return splitsError;
        }
    }

    async _asyncApplyUndoAddTransactions(undoDataItem) {
        const { transactionIds, idGeneratorOptions } = undoDataItem;

        const stateUpdater = new AccountStatesUpdater(this);

        const transactionIdAndDataItemPairs = [];
        const transactionDataItems 
            = await this._handler.asyncGetTransactionDataItemsWithIds(transactionIds);
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            const transactionDataItem = transactionDataItems[i];
            transactionIdAndDataItemPairs.push([transactionDataItem.id]);

            await stateUpdater.asyncAddTransactionUpdate(transactionDataItem);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        await this._handler.asyncUpdateTransactionDataItems(
            transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        this._idGenerator.fromJSON(idGeneratorOptions);

        this.emit('transactionsRemove', 
            { removedTransactionDataItems: transactionDataItems });
    }


    async _asyncApplyUndoRemoveTransactions(undoDataItem) {
        const { removedTransactionDataItems } = undoDataItem;

        const stateUpdater = new AccountStatesUpdater(this);

        const transactionIdAndDataItemPairs = [];
        for (let i = removedTransactionDataItems.length - 1; i >= 0; --i) {
            const transactionDataItem = removedTransactionDataItems[i];
            transactionIdAndDataItemPairs.push(
                [transactionDataItem.id, transactionDataItem]);

            await stateUpdater.asyncAddTransactionUpdate(undefined, transactionDataItem);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        await this._handler.asyncUpdateTransactionDataItems(
            transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        const transactionDataItems = removedTransactionDataItems.map(
            (dataItem) => getTransactionDataItem(dataItem, true));
        this.emit('transactionsAdd', { newTransactionDataItems: transactionDataItems });
    }


    async _asyncApplyUndoModifyTransactions(undoDataItem) {
        let { oldTransactionDataItems } = undoDataItem;

        const stateUpdater = new AccountStatesUpdater(this);

        const transactionIds = oldTransactionDataItems.map((dataItem) => dataItem.id);
        const currentTransactionDataItems 
            = await this.asyncGetTransactionDataItemsWithIds(transactionIds);

        const transactionIdAndDataItemPairs = [];
        for (let i = oldTransactionDataItems.length - 1; i >= 0; --i) {
            const transactionDataItem = oldTransactionDataItems[i];
            transactionIdAndDataItemPairs.push(
                [transactionDataItem.id, transactionDataItem]);

            await stateUpdater.asyncAddTransactionUpdate(
                currentTransactionDataItems[i], transactionDataItem);
            transactionIds.push(transactionDataItem.id);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        await this._handler.asyncUpdateTransactionDataItems(
            transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        oldTransactionDataItems = oldTransactionDataItems.map(
            (dataItem) => getTransactionDataItem(dataItem, true));
        this.emit('transactionsModify', 
            { newTransactionDataItems: oldTransactionDataItems, 
                oldTransactionDataItems: currentTransactionDataItems, 
            });
    }


    /**
     * Fired by {@link TransactionManager#asyncAddTransactions} after the
     * transactions have been added.
     * @event TransactionManager~transactionsAdd
     * @type {object}
     * @property {TransactionDataItem[]}    newTransactionDataItems The array of 
     * newly added transaction data items being returned from the call to 
     * {@link TransactionManager#asyncAddTransactions}.
     */

    /**
     * @typedef {object} TransactionManager~AddTransactionResult
     * @property {TransactionDataItem}  [newTransactionDataItem]    Used if a 
     * single transaction was passed to {@link TransactionManager#asyncAddTransactions}
     * @property {TransactionDataItem[]}    [newTransactionDataItems]   Used if 
     * an array was passed to {@link TransactionManager#asyncAddTransactions}
     * @property {number}   undoId
     */

    /**
     * Adds one or more transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} 
     * transactions 
     * @param {boolean} validateOnly
     * @returns {TransactionManager~AddTransactionResult}
     * @throws Error
     * @fires {TransactionManager~transactionsAdd}
     */
    async asyncAddTransactions(transactions, validateOnly) {
        if (!Array.isArray(transactions)) {
            const result = await this.asyncAddTransactions([transactions], validateOnly);
            return { newTransactionDataItem: result.newTransactionDataItems[0], 
                undoId: result.undoId 
            };
        }

        this._handler.isDebug = this.isDebug;

        const idGeneratorOriginal = this._idGenerator.toJSON();

        let transactionDataItems = transactions.map(
            (transaction) => getTransactionDataItem(transaction, true));

        const stateUpdater = new AccountStatesUpdater(this);

        // Sort the transactions.
        const sortedTransactionIndices = new SortedArray(compareTransactionKeys, 
            { duplicates: 'allow'});
        for (let i = 0; i < transactionDataItems.length; ++i) {
            const transactionDataItem = transactionDataItems[i];
            transactionDataItem.id = this._idGenerator.generateId();
            const key = { id: transactionDataItem.id, 
                ymdDate: getYMDDate(transactionDataItem.ymdDate), 
                index: i,
            };
            if ((transactionDataItem.sameDayOrder !== undefined)
             && (transactionDataItem.sameDayOrder !== null)) {
                key.sameDayOrder = transactionDataItem.sameDayOrder;
            }
            sortedTransactionIndices.add(key);
            
            const { splits } = transactionDataItem;
            splits.forEach((split) => {
                split.reconcileState = split.reconcileState 
                    || ReconcileState.NOT_RECONCILED.name;
            });
        }

        const sortedIndices = [];
        const sortedTransactionDataItems = [];
        sortedTransactionIndices.forEach((entry) => {
            sortedIndices.push(entry.index);
            sortedTransactionDataItems.push(transactionDataItems[entry.index]);
        });

        for (let i = 0; i < sortedTransactionDataItems.length; ++i) {
            const error = this._validateTransactionBasics(
                sortedTransactionDataItems[i], false);
            if (error) {
                throw error;
            }

            await stateUpdater.asyncAddTransactionUpdate(undefined, 
                sortedTransactionDataItems[i]);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            this._idGenerator.fromJSON(idGeneratorOriginal);
            transactionDataItems.forEach((dataItem) => { delete dataItem.id; });
            return { newTransactionDataItems: transactionDataItems, };
        }

        try {

            const transactionIdAndDataItemPairs = [];
            sortedTransactionDataItems.forEach((transactionDataItem) => {                
                transactionIdAndDataItemPairs.push(
                    [transactionDataItem.id, transactionDataItem]);
            });

            await this._handler.asyncUpdateTransactionDataItems(
                transactionIdAndDataItemPairs, currentAccountStateUpdates.entries(), 
                this._idGenerator.toJSON());

            stateUpdater.updateAccountEntries();

            transactionDataItems = transactionDataItems.map(
                (dataItem) => getTransactionDataItem(dataItem, true));
            const transactionIds = transactionDataItems.map(
                (dataItem) => dataItem.id);

            const undoId = await this._accountingSystem.getUndoManager()
                .asyncRegisterUndoDataItem('addTransactions', 
                    { transactionIds: transactionIds, 
                        idGeneratorOptions: idGeneratorOriginal, 
                    });


            this.emit('transactionsAdd', 
                { newTransactionDataItems: transactionDataItems });
            return { newTransactionDataItems: transactionDataItems, undoId: undoId };
        }
        catch (e) {
            this._idGenerator.fromJSON(idGeneratorOriginal);
            throw e;
        }
    }
    


    /**
     * Fired by {@link TransactionManager#asyncRemoveTransactions} after the 
     * transactions have been removed.
     * @event TransactionManager~transactionsRemove
     * @type {object}
     * @property {TransactionDataItem[]}    removedTransactionDataItems The array of 
     * removed transaction data items being returned by the call to 
     * {@link TransactionManager#asyncRemoveTransactions}.
     */

    /**
     * @typedef {object} TransactionManager~RemoveTransactionResult
     * @property {TransactionDataItem}  [removedTransactionDataItem]    Used if a 
     * single transaction was passed to 
     * {@link TransactionManager#asyncRemoveTransactions}
     * @property {TransactionDataItem[]}    [removedTransactionDataItems]   Used if 
     * an array was passed to {@link TransactionManager#asyncRemoveTransactions}
     * @property {number}   undoId
     */

    /**
     * Removes one or more transactions.
     * @param {number|number[]} transactionIds 
     * @param {boolean} validateOnly 
     * @returns {TransactionManager~RemoveTransactionResult}
     * @throws Error
     * @fires {TransactionManager~transactionsRemove}
     */
    async asyncRemoveTransactions(transactionIds, validateOnly) {
        if (!Array.isArray(transactionIds)) {
            const result = await this.asyncRemoveTransactions([transactionIds], 
                validateOnly);
            return { removedTransactionDataItem: result.removedTransactionDataItems[0], 
                undoId: result.undoId,
            };
        }

        const stateUpdater = new AccountStatesUpdater(this);

        const transactionDataItems 
            = await this._handler.asyncGetTransactionDataItemsWithIds(transactionIds);
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            if (!transactionDataItems[i]) {
                throw userError('TransactionManager-remove_invalid_id', 
                    transactionIds[i]);
            }
            transactionDataItems[i] = getTransactionDataItem(
                transactionDataItems[i], true);

            await stateUpdater.asyncAddTransactionUpdate(transactionDataItems[i]);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            return { removedTransactionDataItems: transactionDataItems, };
        }

        const transactionIdAndDataItemPairs = [];

        for (let t = 0; t < transactionDataItems.length; ++t) {
            const dataItem = transactionDataItems[t];

            transactionIdAndDataItemPairs.push([dataItem.id]);
        }

        await this._handler.asyncUpdateTransactionDataItems(
            transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('removeTransactions', 
                { removedTransactionDataItems: transactionDataItems.map(
                    (dataItem) => getTransactionDataItem(dataItem, true)), 
                });

        this.emit('transactionsRemove', 
            { removedTransactionDataItems: transactionDataItems });
        return { removedTransactionDataItems: transactionDataItems, undoId: undoId, };
    }


    /**
     * Fired by {@link TransactionManager#asyncModifyTransactions} after all the 
     * submitted transactions have been modified.
     * @event TransactionManager~transactionsModify
     * @type {object}
     * @property {TransactionDataItem[]}    newTransactionDataItems Array of the 
     * updated transaction data items.
     * @property {TransactionDataItem[]}    oldTransactionDataItems Array fo the 
     * old transaction data items.
     */


    /**
     * @typedef {object} TransactionManager~ModifyTransactionResult
     * @property {TransactionDataItem}  [newTransactionDataItem]    Used if a single 
     * transaction was passed to {@link TransactionManager#asyncModifyTransactions}
     * @property {TransactionDataItem[]}    [newTransactionDataItems]   Used if an 
     * array was passed to {@link TransactionManager#asyncModifyTransactions}
     * @property {TransactionDataItem}  [oldTransactionDataItem]    Used if a single 
     * transaction was passed to {@link TransactionManager#asyncModifyTransactions}
     * @property {TransactionDataItem[]}    [oldTransactionDataItems]   Used if an 
     * array was passed to {@link TransactionManager#asyncModifyTransactions}
     * @property {number}   undoId
     */

    /**
     * Modifies one or more transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} 
     * transactions 
     * @param {boolean} validateOnly
     * @returns {TransactionManager~ModifyTransactionResult}
     * @throws Error
     * @fires {TransactionManager~modifyTransaction}
     */
    async asyncModifyTransactions(transactions, validateOnly) {
        if (!Array.isArray(transactions)) {
            const result = await this.asyncModifyTransactions([transactions], 
                validateOnly);
            return { 
                newTransactionDataItem: result.newTransactionDataItems[0], 
                oldTransactionDataItem: result.oldTransactionDataItems[0], 
                undoId: result.undoId,
            };
        }

        this._handler.isDebug = this.isDebug;

        const transactionIds = transactions.map((transaction) => transaction.id);
        const oldDataItems = await this._handler.asyncGetTransactionDataItemsWithIds(
            transactionIds);

        const accountManager = this._accountingSystem.getAccountManager();

        let hasLots;
        let newDataItems = [];
        for (let i = 0; i < transactionIds.length; ++i) {
            const id = transactionIds[i];
            if (!oldDataItems[i]) {
                throw userError('TransactionManager~modify_id_not_found', id);
            }

            const newDataItem = Object.assign({}, oldDataItems[i], 
                getTransactionDataItem(transactions[i]));
            newDataItems.push(newDataItem);

            if (!hasLots) {
                newDataItem.splits.forEach((split) => {
                    const account = accountManager.getAccountDataItemWithId(
                        split.accountId);
                    if (account) {
                        const type = A.getAccountType(account.type);
                        if (type && type.hasLots) {
                            hasLots = true;
                        }
                    }
                });
            }
        }

        const stateUpdater = new AccountStatesUpdater(this);

        for (let i = 0; i < transactionIds.length; ++i) {
            const newDataItem = newDataItems[i];
            const error = this._validateTransactionBasics(newDataItem, true);
            if (error) {
                throw error;
            }

            await stateUpdater.asyncAddTransactionUpdate(oldDataItems[i], newDataItem);
        }

        const currentAccountStateUpdates 
            = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            return { newTransactionDataItems: newDataItems, 
                oldTransactionDataItems: oldDataItems, 
            };
        }

        const transactionIdAndDataItemPairs = [];

        for (let i = 0; i < transactionIds.length; ++i) {
            transactionIdAndDataItemPairs.push([transactionIds[i], newDataItems[i]]);
        }

        await this._handler.asyncUpdateTransactionDataItems(
            transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        newDataItems = newDataItems.map(
            (dataItem) => getTransactionDataItem(dataItem, true));

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('modifyTransactions', 
                { oldTransactionDataItems: oldDataItems.map(
                    (dataItem) => getTransactionDataItem(dataItem, true)), 
                });


        this.emit('transactionsModify', {
            newTransactionDataItems: newDataItems,
            oldTransactionDataItems: oldDataItems,
        });
        return { newTransactionDataItems: newDataItems, 
            oldTransactionDataItems: oldDataItems, 
            undoId: undoId, 
        };
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to 
 * interact with the {@link TransactionManager}.
 * @interface
 */
export class TransactionsHandler {

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for 
     * initializing the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('TransactionsHandler.getIdGeneratorOptions() abstract method!');
    }


    /**
     * Retrieves the account state after the most recent transaction has been applied.
     * @param {number} accountId 
     * @returns {AccountStateDataItem|undefined}
     */
    getCurrentAccountStateDataItem(accountId) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.getCurrentAccountStateDataItem() abstract method!');
    }

    
    /**
     * Retrieves the earliest and latest date of either all the transactions or all 
     * the transactions that refer to a given account id.
     * @param {(number|undefined)} accountId The account id, if <code>undefined</code> 
     * the range of all the transactions is retrieved.
     * @returns {(YMDDate[]|undefined)} Either a two element array with the first 
     * element the earliest date and the second element the latest date or 
     * <code>undefined</code> if there are no transactions.
     */
    async asyncGetTransactionDateRange(accountId) {
        throw Error('TransactionHandler.asyncGetTransactionDateRange() abstract method!');
    }

    /**
     * Retrieves the transactions within a date range, optionally only those 
     * referring to a given account.
     * @param {(number|undefined)} accountId    If defined only transactions that 
     * refer to the account with this id are retrieved.
     * @param {YMDDate} ymdDateA    The earlier date of the date range, inclusive.
     * @param {YMDDate} ymdDateB    The later date of the date range, inclusive.
     * @returns {TransactionDataItem[]} An array containing the transaction data items, 
     * sorted from earliest to latest date.
     */
    async asyncGetTransactionDataItemsInDateRange(accountId, ymdDateA, ymdDateB) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncGetTransactionDataItemsInDateRange() asbtract method!');
    }

    /**
     * Retrieves one or more transactions by id.
     * @param {number[]} ids 
     * @returns {TransactionDataItem[]}
     */
    async asyncGetTransactionDataItemsWithIds(ids) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncGetTransactionDataItemsWithIds() abstract method!');
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for an account, sorted from 
     * oldest to newest.
     * @param {number} accountId 
     * @param {boolean} [includeSplitCounts=false]  If <code>true</code> then the
     * transaction keys have a splitCount property added that is the number of
     * splits in the transaction that refer to the account.
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForAccount(accountId, includeSplitCounts) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncGetSortedTransactionKeysForAccount() abstract method!');
    }


    /**
     * Retrieves an array of the ids of the transactions with a split referring to the 
     * account that is not marked as reconciled.
     * @param {number} accountId 
     * @return {number[]}
     */
    async asyncGetNonReconciledIdsForAccountId(accountId) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncGetNonReconciledIdsForAccountId() abstract method!');
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for a lot, sorted from 
     * oldest to newest.
     * @param {number} lotId 
     * @param {boolean} [includeSplitCounts=false]  If <code>true</code> then the
     * transaction keys have a splitCount property added that is the number of
     * splits in the transaction that refer to the account.
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForLot(lotId, includeSplitCounts) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncGetSortedTransactionKeysForLot() abstract method!');
    }


    /**
     * Main function for updating the transaction data items.
     * @param {*} transactionIdAndDataItemPairs Array of one or two element sub-arrays. 
     * The first element of each sub-array is the transaction id. For new or modified 
     * transactions, the second element is the new data item. For accounts to be deleted, 
     * this is <code>undefined</code>.
     * @param {Iterator}    accountStateUpdates Iterator returning two element arrays 
     * whose first element is an account id and whose second element is the current 
     * {@link AccountStateDataItem} for the account.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The 
     * current state of the id generator, if <code>undefined</code> the generator state 
     * hasn't changed.
     * @returns {TransactionDataItem[]} Array containing the updated data items for 
     * new and modified transactions, or the old data items for removed transactions.
     */    
    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, 
        accountStateUpdates, idGeneratorOptions) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandler.asyncUpdateTransactionDataItems() abstract method!');
    }
}



function entryToJSON(entry) {
    const json = {
        ymdDate: getYMDDateString(entry.ymdDate),
        id: entry.id,
    };
    if (entry.accountIds) {
        json.accountIds = Array.from(entry.accountIds.values());
    }
    if (entry.accountSplitCounts) {
        json.accountSplitCounts = Array.from(entry.accountSplitCounts.entries());
    }
    if (entry.lotIds) {
        json.lotIds = Array.from(entry.lotIds.values());
    }
    if (entry.lotSplitCounts) {
        json.lotSplitCounts = Array.from(entry.lotSplitCounts.entries());
    }
    if ((entry.sameDayOrder !== undefined)
     && (entry.sameDayOrder !== null)) {
        json.sameDayOrder = entry.sameDayOrder;
    }
    
    return json;
}

function entryFromJSON(json) {
    const entry = {
        ymdDate: getYMDDate(json.ymdDate),
        id: json.id,
    };

    if (json.accountIds) {
        entry.accountIds = new Set(json.accountIds);
    }
    if (json.accountSplitCounts) {
        entry.accountSplitCounts = new Map(json.accountSplitCounts);
    }
    if (json.lotIds) {
        entry.lotIds = new Set(json.lotIds);
    }
    if (json.lotSplitCounts) {
        entry.lotSplitCounts = new Map(json.lotSplitCounts);
    }
    if ((json.sameDayOrder !== undefined)
     && (json.sameDayOrder !== null)) {
        entry.sameDayOrder = json.sameDayOrder;
    }

    return entry;
}


//
// Want a TransactionsHandler implementatino that keeps track of:
//  - The transaction ids that belong to each accountId
//  - Master sorted transaction id list
//  - Has abstract methods for retrieving, updating transactions.
export class TransactionsHandlerImplBase extends TransactionsHandler {
    /**
     * @typedef {object}    TransactionsHandlerImplBase~Entry
     * @property {YMDDate}  ymdDate The transaction date.
     * @property {number}   id  The transaction id.
     * @property {number}   [sameDayOrder]    Optional, used to order transactions 
     * that fall on the same day, the lower the value the earlier in the day the 
     * transaction is ordered. If not given then it is treated as
     * @property {Set<number>}  [accountIds]  Set containing the account ids of all 
     * the accounts referred to by the transaction's splits.
     * @property {Map<number,number>}   [accountSplitCounts]    Only present if there 
     * are multiple splits referring to the same account, key is accountId, value is the 
     * number of splits.
     * @property {Set<number>}  [lotIds]  Set containing the lot ids of all the lots 
     * referred to by the transaction's splits.
     * @property {Map<number,number>}   [lotSplitCounts]    Only present if there 
     * are multiple splits referring to the same lot, key is lotId, value is the 
     * number of splits.
     */

    /**
     * @typedef {object}    TransactionsHandlerImplBase~Options
     * @property {TransactionsHandlerImplBase~Entry[]} entries
     */

    constructor(options) {
        super(options);

        options = options || {};

        this._entriesById = new Map();

        // Map of accountId, SortedArray of entries sorted by ymdDate then id.
        this._sortedEntriesByAccountId = new Map();

        // Map of lotId, SortedArray of entries sorted by ymdDate then id.
        this._sortedEntriesByLotId = new Map();

        // Sorted array of entries sorted by ymdDate then id.
        this._ymdDateSortedEntries = new SortedArray(compareTransactionKeys);

        this._currentAccountStatesById = new Map();

        this._sortedNonReconciledIdsByAccountId = new Map();
    }


    entriesToJSON() {
        const entries = [];
        this._entriesById.forEach((entry, id) => {
            entries.push(entryToJSON(entry));
        });

        const nonReconciledTransactionIdsByAccount = [];
        this._sortedNonReconciledIdsByAccountId.forEach((sortedIds, accountId) => {
            if (sortedIds.length) {
                nonReconciledTransactionIdsByAccount.push(
                    [accountId, sortedIds.getValues()]);
            }
        });

        return {
            entries: entries,
            currentAccountStatesById: 
                Array.from(this._currentAccountStatesById.entries()),
            nonReconciledTransactionIdsByAccount:
                nonReconciledTransactionIdsByAccount,
        };
    }

    entriesFromJSON(json) {
        const { entries, currentAccountStatesById,
            nonReconciledTransactionIdsByAccount } = json;

        this._entriesById.clear();
        this._ymdDateSortedEntries.clear();
        this._sortedEntriesByAccountId.clear();
        this._sortedEntriesByLotId.clear();
        this._currentAccountStatesById.clear();
        this._sortedNonReconciledIdsByAccountId.clear();

        entries.forEach((entry) => {
            this._addEntry(entryFromJSON(entry));
        });

        currentAccountStatesById.forEach(([accountId, accountStateDataItem]) => {
            this._currentAccountStatesById.set(accountId, accountStateDataItem);
        });

        nonReconciledTransactionIdsByAccount.forEach(
            ([accountId, sortedTransactionIds]) => {
                this._sortedNonReconciledIdsByAccountId.set(accountId,
                    new SortedArray((a, b) => a - b, {
                        initialValues: sortedTransactionIds
                    }));
            });
    } 


    _addEntry(entry) {
        entry.ymdDate = getYMDDate(entry.ymdDate);

        this._entriesById.set(entry.id, entry);
        this._ymdDateSortedEntries.add(entry);

        if (entry.accountIds) {
            entry.accountIds.forEach((accountId) => {
                this._addEntryToSortedEntriesById(accountId, entry, 
                    this._sortedEntriesByAccountId);
            });
        }
        if (entry.lotIds) {
            entry.lotIds.forEach((lotId) => {
                this._addEntryToSortedEntriesById(lotId, entry, 
                    this._sortedEntriesByLotId);
            });
        }
    }

    _addEntryToSortedEntriesById(id, entry, sortedEntriesById) {
        let accountEntry = sortedEntriesById.get(id);
        if (!accountEntry) {
            accountEntry = new SortedArray(compareTransactionKeys);
            sortedEntriesById.set(id, accountEntry);
        }
        accountEntry.add(entry);
    }

    _removeEntryFromSortedEntriesById(oldEntry, ids, sortedEntriesById) {
        if (ids) {
            ids.forEach((id) => {
                const sortedEntries = sortedEntriesById.get(id);
                if (sortedEntries) {
                    const wasDeleted = sortedEntries.delete(oldEntry);
                    if (!wasDeleted) {
                        console.log('uh-oh: ' + JSON.stringify(oldEntry));
                        console.log('sortedEntries: ' 
                            + JSON.stringify(sortedEntries.getValues()));
                        console.log('entriesById: ' 
                            + JSON.stringify(Array.from(this._entriesById.entries())));
                        throw Error('Stop!');
                    }
                }
            });
        }
    }


    getCurrentAccountStateDataItem(accountId) {
        return this._currentAccountStatesById.get(accountId);
    }


    async asyncGetTransactionDateRange(accountId) {
        const sortedEntries = (accountId) 
            ? this._sortedEntriesByAccountId.get(accountId) 
            : this._ymdDateSortedEntries;
        if (sortedEntries && sortedEntries.length) {
            return [ sortedEntries.at(0).ymdDate, 
                sortedEntries.at(sortedEntries.length - 1).ymdDate 
            ];
        }
    }

    async asyncGetTransactionDataItemsInDateRange(accountId, ymdDateA, ymdDateB) {
        const sortedEntries = (accountId) 
            ? this._sortedEntriesByAccountId.get(accountId) 
            : this._ymdDateSortedEntries;
        if (sortedEntries && sortedEntries.length) {
            const indexA = sortedEntries.indexGE({ ymdDate: ymdDateA, id: 0 });
            const indexB = sortedEntries.indexLE({ ymdDate: ymdDateB, 
                id: Number.MAX_VALUE });
            const ids = sortedEntries.getValues().slice(indexA, indexB + 1).map(
                (entry) => entry.id);
            
            return this.asyncGetTransactionDataItemsWithIds(ids);
        }

        return [];
    }


    _getSortedTransactionKeysForId(id, sortedEntriesById, splitCounter) {
        const sortedEntries = sortedEntriesById.get(id);
        if (sortedEntries) {
            return sortedEntries.getValues().map(
                (entry) => {
                    const key = { id: entry.id, 
                        ymdDate: entry.ymdDate, 
                    };
                    if ((entry.sameDayOrder !== undefined)
                     && (entry.sameDayOrder !== null)) {
                        key.sameDayOrder = entry.sameDayOrder;
                    }
                    if (splitCounter) {
                        splitCounter(key, entry);
                    }
                    return key; 
                });
        }
        else {
            return [];
        }
    }


    async asyncGetSortedTransactionKeysForAccount(accountId, includeSplitCounts) {
        const splitCounter = (includeSplitCounts)
            ? (key, entry) => {
                const { accountSplitCounts } = entry;
                let splitCount;
                if (accountSplitCounts) {
                    splitCount = accountSplitCounts.get(accountId);
                }
                key.splitCount = splitCount || 1;
            }
            : undefined;
        return this._getSortedTransactionKeysForId(accountId, 
            this._sortedEntriesByAccountId,
            splitCounter);
    }

    async asyncGetNonReconciledIdsForAccountId(accountId) {
        const sortedIds = this._sortedNonReconciledIdsByAccountId.get(accountId);
        return (sortedIds) ? sortedIds.getValues() : [];
    }

    async asyncGetSortedTransactionKeysForLot(lotId, includeSplitCounts) {
        const splitCounter = (includeSplitCounts)
            ? (key, entry) => {
                const { lotSplitCounts } = entry;
                let splitCount;
                if (lotSplitCounts) {
                    splitCount = lotSplitCounts.get(lotId);
                }
                key.splitCount = splitCount || 1;
            }
            : undefined;
        return this._getSortedTransactionKeysForId(lotId, 
            this._sortedEntriesByLotId,
            splitCounter);
    }


    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, 
        accountStateUpdates, idGeneratorOptions) {
        
        // When to update nonReconciled transactions?
        // - Delete
        //      - oldEntry has list of accounts, just go through that list.
        // - New
        //
        //

        const entryChanges = [];
        const originalDataItems = [];
        for (let i = 0; i < transactionIdAndDataItemPairs.length; ++i) {
            const [id, dataItem] = transactionIdAndDataItemPairs[i];
            const oldEntry = this._entriesById.get(id);

            if (!dataItem) {
                // A remove...
                entryChanges.push([undefined, oldEntry]);
            }
            else {
                // Modify or add.
                const newEntry = { id: id, };

                let newAccountIds;
                let newLotIds;
                let newAccountSplitCounts;
                let newLotSplitCounts;
                if (dataItem.splits) {
                    newAccountIds = new Set();
                    newLotIds = new Set();
                    dataItem.splits.forEach((split) => {
                        const { accountId } = split;
                        if (newAccountIds.has(accountId)) {
                            let count = 1;
                            if (!newAccountSplitCounts) {
                                newAccountSplitCounts = new Map();
                            }
                            else {
                                count = newAccountSplitCounts.get(accountId) || 1;
                            }
                            newAccountSplitCounts.set(accountId, count + 1);
                        }
                        else {
                            newAccountIds.add(accountId);
                        }

                        if (split.lotChanges) {
                            split.lotChanges.forEach(
                                (lotChange) => {
                                    const { lotId } = lotChange;
                                    if (newLotIds.has(lotId)) {
                                        let count = 1;
                                        if (!newLotSplitCounts) {
                                            newLotSplitCounts = new Map();
                                        }
                                        else {
                                            count = newLotSplitCounts.get(lotId) || 1;
                                        }
                                        newLotSplitCounts.set(lotId, count + 1);
                                    }
                                    else {
                                        newLotIds.add(lotId);
                                    }
                                });
                        }
                    });
                }

                if (oldEntry) {
                    // Modify entry
                    newEntry.ymdDate = dataItem.ymdDate || oldEntry.ymdDate;

                    if (Object.keys(dataItem).indexOf('sameDayOrder') >= 0) {
                        newEntry.sameDayOrder = dataItem.sameDayOrder;
                    }
                    else if (Object.keys(oldEntry).indexOf('sameDayOrder') >= 0) {
                        newEntry.sameDayOrder = oldEntry.sameDayOrder;
                    }

                    if (newAccountIds) {
                        let accountIdsModified = !doSetsHaveSameElements(newAccountIds, 
                            oldEntry.accountIds);
                        newEntry.accountIds = (accountIdsModified) 
                            ? newAccountIds : oldEntry.accountIds;
                    }
                    else {
                        newEntry.accountIds = oldEntry.accountIds;
                    }

                    if (newLotIds) {
                        let lotIdsModified = !doSetsHaveSameElements(newLotIds, 
                            oldEntry.lotIds);
                        newEntry.lotIds = (lotIdsModified) ? newLotIds : oldEntry.lotIds;
                    }
                    else if (oldEntry.lotIds) {
                        newEntry.lotIds = oldEntry.lotIds;
                    }

                    originalDataItems[i] 
                        = (await this.asyncGetTransactionDataItemsWithIds([id]))[0];
                }
                else {
                    // New entry
                    newEntry.ymdDate = dataItem.ymdDate;
                    if (Object.keys(dataItem).indexOf('sameDayOrder') >= 0) {
                        newEntry.sameDayOrder = dataItem.sameDayOrder;
                    }

                    newEntry.accountIds = newAccountIds;
                    if (newLotIds) {
                        newEntry.lotIds = newLotIds;
                    }
                }

                newEntry.ymdDate = getYMDDate(newEntry.ymdDate);
                if (newAccountSplitCounts) {
                    newEntry.accountSplitCounts = newAccountSplitCounts;
                }
                if (newLotSplitCounts) {
                    newEntry.lotSplitCounts = newLotSplitCounts;
                }
                entryChanges.push([newEntry, oldEntry, dataItem]);
            }
        }


        // Update the underlying storage.
        const result = await this.asyncUpdateTransactionDataItemsAndEntries(
            entryChanges, idGeneratorOptions);

        // Update our collections.
        for (let i = 0; i < entryChanges.length; ++i) {
            const [newEntry, oldEntry, newDataItem] = entryChanges[i];

            if (!newEntry) {
                // Delete
                this._ymdDateSortedEntries.delete(oldEntry);
                this._removeEntryFromSortedEntriesById(oldEntry, 
                    oldEntry.accountIds, this._sortedEntriesByAccountId);
                this._removeEntryFromSortedEntriesById(oldEntry, 
                    oldEntry.lotIds, this._sortedEntriesByLotId);
                this._entriesById.delete(oldEntry.id);

                oldEntry.accountIds.forEach((accountId) => {
                    const nonReconciledIds 
                        = this._sortedNonReconciledIdsByAccountId.get(accountId);
                    if (nonReconciledIds) {
                        nonReconciledIds.delete(oldEntry.id);
                    }
                });
            }
            else {
                let accountIdsUnchanged;
                let lotIdsUnchanged;
                let nonReconciledChanged;
                if (oldEntry) {
                    // Modify
                    let isDateChange;
                    if (YMDDate.compare(oldEntry.ymdDate, newEntry.ymdDate)
                     || (oldEntry.sameDayOrder !== newEntry.sameDayOrder)) {
                        this._ymdDateSortedEntries.delete(oldEntry);
                        isDateChange = true;
                    }

                    // This test is safe, earlier we checked for account id changes...
                    if ((newEntry.accountIds !== oldEntry.accountIds) || isDateChange) {
                        this._removeEntryFromSortedEntriesById(oldEntry, 
                            oldEntry.accountIds, this._sortedEntriesByAccountId);
                    }
                    else {
                        accountIdsUnchanged = true;
                    }

                    // This test is safe, earlier we checked for lot id changes...
                    if ((newEntry.lotIds !== oldEntry.lotIds) || isDateChange) {
                        this._removeEntryFromSortedEntriesById(oldEntry, 
                            oldEntry.lotIds, this._sortedEntriesByAccountId);
                    }
                    else {
                        lotIdsUnchanged = true;
                    }

                    const oldNonReconciledIds = new Set();
                    const newNonReconciledIds = [];
                    const oldDataItem = originalDataItems[i];
                    oldDataItem.splits.forEach((split) => {
                        if (split.reconcileState !== ReconcileState.RECONCILED.name) {
                            oldNonReconciledIds.add(split.accountId);
                        }
                    });

                    if (newDataItem.splits) {
                        newDataItem.splits.forEach((split) => {
                            if (split.reconcileState !== ReconcileState.RECONCILED.name) {
                                newNonReconciledIds.push(split.accountId);
                            }
                        });
    
                        if (newNonReconciledIds.length !== oldNonReconciledIds.size) {
                            nonReconciledChanged = true;
                        }
                        else {
                            for (let j = newNonReconciledIds.length - 1; j >= 0; --j) {
                                if (!oldNonReconciledIds.has(newNonReconciledIds[j])) {
                                    nonReconciledChanged = true;
                                    break;
                                }
                            }
                        }
    
                        if (nonReconciledChanged) {
                            oldNonReconciledIds.forEach((accountId) => {
                                const nonReconciledIds 
                                    = this._sortedNonReconciledIdsByAccountId.get(
                                        accountId);
                                if (nonReconciledIds) {
                                    nonReconciledIds.delete(oldEntry.id);
                                }
                            });
                        }
                    }
                }
                else {
                    nonReconciledChanged = true;
                }

                this._entriesById.set(newEntry.id, newEntry);
                this._ymdDateSortedEntries.add(newEntry);

                if (!accountIdsUnchanged) {
                    newEntry.accountIds.forEach((accountId) => {
                        this._addEntryToSortedEntriesById(accountId, 
                            newEntry, this._sortedEntriesByAccountId);
                    });
                }

                if (!lotIdsUnchanged) {
                    if (newEntry.lotIds) {
                        newEntry.lotIds.forEach((lotId) => {
                            this._addEntryToSortedEntriesById(lotId, 
                                newEntry, this._sortedEntriesByLotId);
                        });
                    }
                }

                if (nonReconciledChanged) {
                    newDataItem.splits.forEach((split) => {
                        if (split.reconcileState !== ReconcileState.RECONCILED.name) {
                            let nonReconciledTransactionIds 
                                = this._sortedNonReconciledIdsByAccountId
                                    .get(split.accountId);
                            if (!nonReconciledTransactionIds) {
                                nonReconciledTransactionIds = new SortedArray(
                                    (a, b) => a - b
                                );
                                this._sortedNonReconciledIdsByAccountId.set(
                                    split.accountId,
                                    nonReconciledTransactionIds);
                            }
                            nonReconciledTransactionIds.add(newEntry.id);
                        }
                    });
                }
            }
        }

        if (accountStateUpdates) {
            for (let [accountId, accountStateDataItem] of accountStateUpdates) {
                if (!accountStateDataItem) {
                    this._currentAccountStatesById.delete(accountId);
                }
                else {
                    this._currentAccountStatesById.set(accountId, accountStateDataItem);
                }
            }
        }

        return result;
    }

    /**
     * 
     * @param {Array} entryDataItemUpdates  Array of three element sub-arrays, the 
     * first element of the sub-array is the new 
     * {@link TransactionsHandlerImplBase~Entry}, the second element the old 
     * {@link TransactionsHandlerImplBase~Entry}, the last element the data item.
     * @param {*} idGeneratorOptions 
     * @returns {TransactionDataItem[]} Array containing the updated data items for 
     * new and modified transactions, or the old data items for removed transactions.
     */
    async asyncUpdateTransactionDataItemsAndEntries(entryDataItemUpdates, 
        idGeneratorOptions) {
        // eslint-disable-next-line max-len
        throw Error('TransactionHandlerImplBase.asyncUpdateTransactionDataItemsAndEntries() abstract method!');
    }
}


/**
 * Simple in-memory implementation of {@link TransactionsHandler}
 */
export class InMemoryTransactionsHandler extends TransactionsHandlerImplBase {
    constructor(options) {
        super(options);

        this._dataItemEntryPairsById = new Map();

        options = options || {};
        this._idGeneratorOptions = options.idGeneratorOptions;

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


    /**
     * 
     * @returns {object}
     */
    toJSON() {
        const json = this.entriesToJSON();

        const dataItems = [];
        this._dataItemEntryPairsById.forEach(([dataItem]) => {
            dataItems.push(dataItem);
        });

        json.idGeneratorOptions = this._idGeneratorOptions;
        json.dataItems = dataItems;

        return json;
    }

    /**
     * Loads the handler from a JSON object that was previously created by 
     * {@link InMemoryTransactionsHandler#toJSON}.
     * @param {object} json 
     */
    fromJSON(json) {
        this._dataItemEntryPairsById.clear();

        this._idGeneratorOptions = json.idGeneratorOptions;
        this.entriesFromJSON(json);

        const { dataItems } = json;
        dataItems.forEach((dataItem) => {
            const { id } = dataItem;
            const entry = this._entriesById.get(id);
            this._dataItemEntryPairsById.set(id, [dataItem, entry]);
        });

        this.markChanged();
    }


    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncGetTransactionDataItemsWithIds(ids) {
        const result = [];
        ids.forEach((id) => {
            const pair = this._dataItemEntryPairsById.get(id);
            result.push((pair) ? pair[0] : undefined);
        });
        return result;
    }

    async asyncUpdateTransactionDataItemsAndEntries(entryDataItemUpdates, 
        idGeneratorOptions) {
        this._idGeneratorOptions = idGeneratorOptions || this._idGeneratorOptions;
        const result = [];

        entryDataItemUpdates.forEach(([newEntry, oldEntry, dataItem]) => {
            const id = (dataItem) ? dataItem.id : oldEntry.id;
            const pair = this._dataItemEntryPairsById.get(id);
            if (dataItem) {
                if (pair) {
                    dataItem = Object.assign({}, pair[0], dataItem);
                }
                this._dataItemEntryPairsById.set(id, [ dataItem, newEntry ]);

                result.push(dataItem);
            }
            else {
                // Delete.
                this._dataItemEntryPairsById.delete(id);
                result.push(getTransactionDataItem(pair[0]));
            }
        });

        this.markChanged();

        return result;
    }
}
