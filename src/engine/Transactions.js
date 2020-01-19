import { EventEmitter } from 'events';
import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getLotDataItems, getLots } from './Lots';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { doSetsHaveSameElements } from '../util/DoSetsHaveSameElements';
import * as A from './Accounts';
import * as AS from './AccountStates';
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
 * Retrieves a {@link LotDataItem} representation of a lot change array of {@link Lot}s, avoids copying if the arg
 * is already an {@link LotDataItem}.
 * @param {(Lot[][]|LotDataItem[][])} lotChanges 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotDataItem[][]}
 */
export function getLotChangeDataItems(lotChanges, alwaysCopy) {
    if (lotChanges) {
        if (alwaysCopy 
         || (lotChanges.length && (getLotDataItems(lotChanges[0]) !== lotChanges[0]))) {
            return lotChanges.map((lotChange) => getLotDataItems(lotChange, alwaysCopy));
        }
    }
    return lotChanges;
}


/**
 * Retrieves a {@link Lot} representation of a lot change array of {@link LotDataItem}s, avoids copying if the arg
 * is already an {@link Lot}.
 * @param {(Lot[][]|LotDataItem[][])} account 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Lot[][]}
 */
export function getLotChanges(lotChangeDataItems, alwaysCopy) {
    if (lotChangeDataItems) {
        if (alwaysCopy
         || (lotChangeDataItems.length && (getLots(lotChangeDataItems[0]) !== lotChangeDataItems[0]))) {
            return lotChangeDataItems.map((lotChangeDataItem) => getLots(lotChangeDataItem, alwaysCopy));
        }
    }
    return lotChangeDataItems;
}

/**
 * @typedef {object}    SplitDataItem
 * @property {string}   reconcileState  The name property of the {@link ReconcileState} of the row.
 * @property {number}   accountId   The account to which the row applies.
 * @property {number}   quantityBaseValue   The base value for the amount to apply to the account.
 * @property {number|number[]} [currencyToUSDRatio]  Only required if there is a currency conversion between the items in the split
 * and this split's currency is not USD, this is either the price, or a numerator/denominator pair for the price {@link Ratio}.
 * @property {LotDataItem[][]}    [lotChanges]    Array of two element sub-arrays. The first element of each sub-array
 * represents the new state of the lot, the second element is the existing state of the lot. If a new lot is
 * being added the second element will be <code>undefined</code>. If a lot is being removed, the first
 * element will be <code>undefined</code>
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * @typedef {object}    Split
 * @property {ReconcileState}   reconcileState  The {@link ReconcileState} of the row.
 * @property {number}   accountId   The account to which the row applies.
 * @property {number}   quantityBaseValue   The base value for the amount to apply to the account.
 * @property {Ratio}    [currencyToUSDRatio]  Only required if there is a currency conversion between the items in the split
 * and this split's currency is not USD, this is the {@Ratio} representing the currency price in USD.
 * @property {Lot[][]}    [lotChanges]    Array of two element sub-arrays. The first element of each sub-array
 * represents the new state of the lot, the second element is the existing state of the lot. If a new lot is
 * being added the second element will be <code>undefined</code>. If a lot is being removed, the first
 * element will be <code>undefined</code>
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * Retrieves a {@link SplitDataItem} representation of a {@link Split}, avoids copying if the arg
 * is already a {@link SplitDataItem}
 * @param {(Split|SplitDataItem)} split
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {(SplitDataItem|undefined)}
 */
export function getSplitDataItem(split, alwaysCopy) {
    if (split) {
        const reconcileStateName = getReconcileStateName(split.reconcileState);
        const lotChangeDataItems = getLotChangeDataItems(split.lotChanges, alwaysCopy);
        const currencyToUSDRatioJSON = getRatioJSON(split.currencyToUSDRatio);
        if (alwaysCopy
         || (reconcileStateName !== split.reconcileState)
         || (lotChangeDataItems !== split.lotChanges)
         || (currencyToUSDRatioJSON !== split.currencyToUSDRatio)) {
            const splitDataItem = Object.assign({}, split);
            splitDataItem.reconcileState = reconcileStateName;
            if (lotChangeDataItems) {
                splitDataItem.lotChanges = lotChangeDataItems;
            }
            if (currencyToUSDRatioJSON) {
                splitDataItem.currencyToUSDRatio = currencyToUSDRatioJSON;
            }
            return splitDataItem;
        }
    }
    return split;
}


/**
 * Retrieves a {@link Split} representation of a {@link SplitDataItem}, avoids copying if the arg
 * is already a {@link Split}
 * @param {(Split|SplitDataItem)} splitDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {(Split|undefined)}
 */
export function getSplit(splitDataItem, alwaysCopy) {
    if (splitDataItem) {
        const reconcileState = getReconcileState(splitDataItem.reconcileState);
        const lotChanges = getLotChanges(splitDataItem.lotChanges, alwaysCopy);
        const currencyToUSDRatio = getRatio(splitDataItem.currencyToUSDRatio);
        if (alwaysCopy
         || (reconcileState !== splitDataItem.reconcileState)
         || (lotChanges !== splitDataItem.lotChanges)
         || (currencyToUSDRatio !== splitDataItem.currencyToUSDRatio)) {
            const split = Object.assign({}, splitDataItem);
            split.reconcileState = reconcileState;
            if (lotChanges) {
                split.lotChanges = lotChanges;
            }
            if (currencyToUSDRatio) {
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
        if ((split.quantityBaseValue === undefined) || (split.quantityBaseValue === null)) {
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
        if ((split.quantityBaseValue === undefined) || (split.quantityBaseValue === null)) {
            split.quantityBaseValue = 0;
        }
    }
    return split;
}


/**
 * Array version of {@link getSplitDataItem}
 * @param {(Split[]|SplitDataItem[])} splits
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
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
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {(Split[]|undefined)}
 */
export function getSplits(splitDataItems, alwaysCopy) {
    if (splitDataItems) {
        if (alwaysCopy
         || (splitDataItems.length && (getSplit(splitDataItems[0]) !== splitDataItems[0]))) {
            return splitDataItems.map((splitDataItem) => getSplit(splitDataItem, alwaysCopy));
        }
    }
    return splitDataItems;
}


/**
 * @typedef {object}    TransactionDataItem
 * @property {number}   id
 * @property {string}   ymdDate The transaction's date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that fall on the same day,
 * the lower the value the earlier in the day the transaction is ordered. If not given then it is treated as
 * -{@link Number#MAX_VALUE}.
 * @property {SplitDataItem[]}   splits
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * @typedef {object}    Transaction
 * @property {number}   id
 * @property {YMDDate}  ymdDate The transaction's date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that fall on the same day,
 * the lower the value the earlier in the day the transaction is ordered. If not given then it is treated as
 * -{@link Number#MAX_VALUE}.
 * @property {Split[]}  splits
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * Retrieves a {@link TransactionDataItem} representation of a {@link Transaction}, avoids copying if the arg
 * is already a {@link TransactionDataItem}
 * @param {(Transaction|TransactionDataItem)} transaction
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {(Transaction|undefined)}
 */
export function getTransactionDataItem(transaction, alwaysCopy) {
    if (transaction) {
        const ymdDateString = getYMDDateString(transaction.ymdDate);
        const splitDataItems = getSplitDataItems(transaction.splits, alwaysCopy);
        if (alwaysCopy
         || (ymdDateString !== transaction.ymdDate)
         || (splitDataItems !== transaction.splits)) {
            const transactionDataItem = Object.assign({}, transaction);
            transactionDataItem.ymdDate = ymdDateString;
            transactionDataItem.splits = splitDataItems;
            return transactionDataItem;
        }
    }
    return transaction;
}


/**
 * Retrieves a {@link Transaction} representation of a {@link TransactionDataItem}, avoids copying if the arg
 * is already a {@link Transaction}
 * @param {(Transaction|TransactionDataItem)} transactionDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {(TransactionDataItem|undefined)}
 */
export function getTransaction(transactionDataItem, alwaysCopy) {
    if (transactionDataItem) {
        const ymdDate = getYMDDate(transactionDataItem.ymdDate);
        const splits = getSplits(transactionDataItem.splits, alwaysCopy);
        if (alwaysCopy
         || (ymdDate !== transactionDataItem.ymdDate)
         || (splits !== transactionDataItem.splits)) {
            const transaction = Object.assign({}, transactionDataItem);
            transaction.ymdDate = ymdDate;
            transaction.splits = splits;
            return transaction;
        }
    }
    return transactionDataItem;
}


/**
 * Performs a deep copy of either an {@link Transaction} or an {@link TransactionDataItem}.
 * @param {(Transaction|TransactionDataItem)} transaction 
 * @returns {(Transaction|TransactionDataItem)} The type returned is the same as the arg.
 */
export function deepCopyTransaction(transaction) {
    const transactionDataItem = getTransactionDataItem(transaction);
    if (transactionDataItem === transaction) {
        transaction = getTransaction(transactionDataItem, true);
        return getTransactionDataItem(transaction, true);
    }
    else {
        return getTransaction(transactionDataItem, true);
    }
}


/**
 * @typedef {object} TransactionKey
 * Primarily used for sorting transactions.
 * @property {number}   id  The transaction id.
 * @property {YMDDate}  ymdDate The transaction date.
 * @property {number}   [sameDayOrder]    Optional, used to order transactions that fall on the same day,
 * the lower the value the earlier in the day the transaction is ordered. If not given then it is treated as
 */

export function getTransactionKey(transaction) {
    if (transaction) {
        if (typeof transaction.ymdDate === 'string') {
            return { id: transaction.id, ymdDate: getYMDDate(transaction.ymdDate), sameDayOrder: transaction.sameDayOrder, };
        }
        return transaction;
    }
}

export function getTransactionKeyData(transaction) {
    if (transaction) {
        if (typeof transaction.ymdDate === 'string') {
            return transaction;
        }
        return { id: transaction.id, ymdDate: getYMDDateString(transaction.ymdDate), sameDayOrder: transaction.sameDayOrder, };
    }
}

export function compareTransactionKeys(a, b) {
    let result;
    if (typeof a.ymdDate === 'string') {
        result = a.ymdDate.localeCompare(b.ymdDate);
    }
    else {
        result = YMDDate.compare(a.ymdDate, b.ymdDate);
    }
    if (result) {
        return result;
    }

    const aSameDayOrder = ((a.sameDayOrder !== undefined) && (a.sameDayOrder !== null)) ? a.sameDayOrder : -Number.MAX_VALUE;
    const bSameDayOrder = ((b.sameDayOrder !== undefined) && (b.sameDayOrder !== null)) ? b.sameDayOrder : -Number.MAX_VALUE;
    if (aSameDayOrder !== bSameDayOrder) {
        return aSameDayOrder - bSameDayOrder;
    }

    return a.id - b.id;
}


//
//---------------------------------------------------------
//
class AccountStatesUpdater {
    constructor(manager) {
        this._manager = manager;
        this._accountManager = manager._accountingSystem.getAccountManager();

        this._accountProcessorsByAccountIds = new Map();
    }


    async _asyncProcessTransactionDataItem(transactionDataItem, isNewDataItem) {
        const { splits } = transactionDataItem;
        const newTransactionEntriesByAccountId = new Map();
        for (let i = 0; i < splits.length; ++i) {
            const split = splits[i];
            const { accountId } = split;
            let processor = this._accountProcessorsByAccountIds.get(accountId);
            if (!processor) {
                const accountEntry = await this._manager._asyncLoadAccountEntry(accountId);
                const { sortedTransactionKeys, hasLots } = accountEntry;

                processor = {
                    accountId: accountId,
                    accountEntry: accountEntry,
                    updatedSortedTransctionEntries: new SortedArray((a, b) => compareTransactionKeys(a[0], b[0])),
                };

                sortedTransactionKeys.forEach((key) => {
                    processor.updatedSortedTransctionEntries.add([key]);
                });


                // If we have lots then we're going to have to work with a list of sorted transactions
                // that's updated on the fly with modifications.
                processor.oldestIndex = Math.max(sortedTransactionKeys.length - 1, 0);
                if (!hasLots) {
                    processor.oldSplitDataItems = [];
                    processor.newSplitDataItems = [];
                }

                this._accountProcessorsByAccountIds.set(accountId, processor);
            }

            const { updatedSortedTransctionEntries } = processor;
            if (isNewDataItem) {
                // Stick the new data item into the list.
                let newTransactionEntry = newTransactionEntriesByAccountId.get(accountId);
                if (!newTransactionEntry) {
                    newTransactionEntry = [transactionDataItem, []];
                    newTransactionEntriesByAccountId.set(accountId, newTransactionEntry);

                    updatedSortedTransctionEntries.add(newTransactionEntry);
                }
                newTransactionEntry[1].push(split);
            }
            else {
                updatedSortedTransctionEntries.delete([transactionDataItem, ]);
            }

            const { accountEntry } = processor;
            const { sortedTransactionKeys } = accountEntry;

            // We're rewinding the account state to be before index, so we want index to be
            // where transactionDataItem would end up.
            let index = bSearch(sortedTransactionKeys, transactionDataItem, compareTransactionKeys);
            if (index >= 0) {
                if (isNewDataItem) {
                    while ((index < sortedTransactionKeys.length)
                     && (compareTransactionKeys(transactionDataItem, sortedTransactionKeys[index]) > 0)) {
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

            if (!accountEntry.hasLots) {
                if (isNewDataItem) {
                    processor.newSplitDataItems.push(split);
                }
                else {
                    processor.oldSplitDataItems.push(split);
                }
            }
        }
    }


    async asyncAddTransactionUpdate(existingTransactionDataItem, newTransactionDataItem) {
        if (existingTransactionDataItem) {
            await this._asyncProcessTransactionDataItem(existingTransactionDataItem, false);
        }

        if (newTransactionDataItem) {
            await this._asyncProcessTransactionDataItem(newTransactionDataItem, true);
        }
    }


    async asyncGenerateCurrentAccountStates() {
        const accountStatesByAccountId = new Map();

        const accountProcessors = Array.from(this._accountProcessorsByAccountIds.values());
        for (let i = accountProcessors.length - 1; i >= 0; --i) {
            const processor = accountProcessors[i];
            const { accountId } = processor;
            const { accountEntry, updatedSortedTransctionEntries } = processor;
            const { hasLots } = accountEntry;
            let accountState;

            let ymdDate;
            if (updatedSortedTransctionEntries.length) {
                const latestEntry = updatedSortedTransctionEntries.at(updatedSortedTransctionEntries.length - 1);
                if (latestEntry) {
                    if (!latestEntry[0]) {
                        console.log('latestEntry: ' + JSON.stringify(latestEntry));
                        console.log(JSON.stringify(updatedSortedTransctionEntries.getValues()));
                    }
                    ymdDate = latestEntry[0].ymdDate;
                }
            }

            if (hasLots) {
                // We want to unwind the account state all the way back to the oldest transaction
                // Then we need to rewind back up but we need to use the updated splits.
                const { sortedTransactionKeys } = accountEntry;
                const { oldestIndex } = processor;

                if (sortedTransactionKeys.length) {
                    const transactionId = sortedTransactionKeys[oldestIndex].id;
                    const accountStates = (await this._manager._asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId));
                    accountState = accountStates[accountStates.length - 1];
                }
                else {
                    accountState = { lots: [] };
                }

                // index should also be valid in updatedSortedTransctionEntries, as it is the oldest index, which means it is closest to 0.
                for (let i = oldestIndex; i < updatedSortedTransctionEntries.length; ++i) {
                    const [transactionKey, newSplits] = updatedSortedTransctionEntries.at(i);

                    const { id } = transactionKey;
                    if (!newSplits) {
                        const transactionDataItem = await this._manager.asyncGetTransactionDataItemsWithIds(id);
                        const { splits } = transactionDataItem;
                        splits.forEach((split) => {
                            if (split.accountId === accountId) {
                                accountState = AS.addSplitToAccountStateDataItem(accountState, split, ymdDate);                                
                            }
                        });
                    }
                    else {
                        newSplits.forEach((newSplit) => {
                            accountState = AS.addSplitToAccountStateDataItem(accountState, newSplit, ymdDate);                                
                        });
                    }
                }
            }
            else {
                // We can just remove/add the splits since order doesn't matter.
                const { oldSplitDataItems, newSplitDataItems } = processor;

                accountState = this._manager.getCurrentAccountStateDataItem(accountId);

                oldSplitDataItems.forEach((splitDataItem) => {
                    accountState = AS.removeSplitFromAccountStateDataItem(accountState, splitDataItem, ymdDate);
                });
                newSplitDataItems.forEach((splitDataItem) => {
                    accountState = AS.addSplitToAccountStateDataItem(accountState, splitDataItem, ymdDate);
                });
            }

            accountStatesByAccountId.set(accountId, accountState);

            accountEntry.sortedTransactionKeys = undefined;
        }

        return accountStatesByAccountId;
    }


    updateAccountEntries() {
        const accountProcessors = Array.from(this._accountProcessorsByAccountIds.values());
        for (let i = accountProcessors.length - 1; i >= 0; --i) {
            const processor = accountProcessors[i];
            const { accountEntry } = processor;

            accountEntry.sortedTransactionKeys = undefined;

            // TODO: We can do better than just flushing these caches...
            accountEntry.accountStatesByOrder.length = Math.max(processor.oldestIndex, 0);
            accountEntry.accountStatesByTransactionId.clear();
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
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator || this._handler.getIdGeneratorOptions());

        this.asyncAddTransaction = this.asyncAddTransactions;
        this.asyncRemoveTransaction = this.asyncRemoveTransactions;
        this.asyncModifyTransaction = this.asyncModifyTransactions;

        this._accountEntriesByAccountId = new Map();
    }

    async asyncSetupForUse() {
        
    }
    
    getAccountingSystem() { return this._accountingSystem; }


    _resolveDateRange(ymdDateA, ymdDateB) {
        ymdDateA = (ymdDateA !== undefined) ? getYMDDate(ymdDateA) : ymdDateA;
        ymdDateB = (ymdDateB !== undefined) ? getYMDDate(ymdDateB) : ymdDateB;
        return YMDDate.orderYMDDatePair(ymdDateA, ymdDateB);
    }


    /**
     * Retrieves the dates of the earliest and latest transactions, optionally restricted to only the transactions
     * that refer to a specified account.
     * @param {(number|undefined)} accountId If defined only transactions that refer to this account id are considered.
     * @returns {(YMDDate[]|undefined)} An array whose first element is the earliest date and whose second element is
     * the latest date, <code>undefined</code> if there are no transactions.
     */
    async asyncGetTransactionDateRange(accountId) {
        return this._handler.asyncGetTransactionDateRange(accountId);
    }


    /**
     * Retrieves the transactions within a date range, optionally restricted to only the transactions that refer to
     * a specified account.
     * @param {(number|undefined)} accountId If defined only transactions that refer to this account id are considered.
     * @param {(YMDDate|string)} ymdDateA   One end of the data range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date range, inclusive.
     * @returns {TransactionDataItem[]} An array containing the transaction data items, sorted from earliest to latest date.
     */
    async asyncGetTransactionDataItemssInDateRange(accountId, ymdDateA, ymdDateB) {
        [ymdDateA, ymdDateB] = this._resolveDateRange(ymdDateA, ymdDateB);
        return this._handler.asyncGetTransactionDataItemssInDateRange(accountId, ymdDateA, ymdDateB);
    }


    /**
     * Retrieves transaction data items by id number.
     * @param {(number|number[])} ids Either a single id or an array of ids of interest.
     * @returns {(TransactionDataItem|undefined|TransactionDataItem[])}   If ids is a single number a single transaction
     * data item is returned, or <code>undefined</code> if there was no transaction with that id. If ids is an array,
     * then an array is returned, any ids that did not have a transaction have their corresponding element set to
     * <code>undefined</code>.
     */
    async asyncGetTransactionDataItemsWithIds(ids) {
        if (!Array.isArray(ids)) {
            const result = await this.asyncGetTransactionDataItemsWithIds([ids]);
            return (result) ? result[0] : result;
        }

        return this._handler.asyncGetTransactionDataItemsWithIds(ids);
    }


    /**
     * @typedef {object}    TransactionManager~AccountEntry
     * @private
     * @property {boolean}  hasLots
     * @property {Map<number, AccountStateDataItem>} accountStatesByTransactionId
     * @property {AccountStateDataItem[]}   accountStatesByOrder    The ordering here matches the ordering of 
     * the arrays returned by {@link TransactionHandler#asyncGetAccountSortedTransactionKeys}.
     * @property {TransactionKey[]} sortedTransactionKeys   The result from {@link TransactionHandler#asyncGetAccountSortedTransactionKeys}.
     */
    

    async _asyncLoadAccountEntry(accountId) {
        const accountDataItem = this._accountingSystem.getAccountManager().getAccountDataItemWithId(accountId);
        if (!accountDataItem) {
            throw userError('TransactionManager-account_state_update_account_invalid', accountId);
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
            const sortedTransactionKeys = await this._handler.asyncGetAccountSortedTransactionKeys(accountId);
            accountEntry.sortedTransactionKeys = sortedTransactionKeys;
            const indicesByTransactionId = new Map();
            for (let i = sortedTransactionKeys.length - 1; i >= 0; --i) {
                indicesByTransactionId.set(sortedTransactionKeys[i].id, i);
            }
            accountEntry.indicesByTransactionId = indicesByTransactionId;
        }

        return accountEntry;
    }


    async _asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);
        let accountStateDataItems = accountEntry.accountStatesByTransactionId.get(transactionId);

        if (!accountStateDataItems) {
            let workingAccountState = this.getCurrentAccountStateDataItem(accountId);

            const { sortedTransactionKeys, accountStatesByOrder, accountStatesByTransactionId } = accountEntry;
            for (let i = sortedTransactionKeys.length - 1; i >= 0; --i) {
                const { id } = sortedTransactionKeys[i];
                if (accountStatesByOrder[i]) {                    
                    accountStateDataItems = accountStatesByOrder[i];
                    workingAccountState = accountStateDataItems[accountStateDataItems.length - 1];
                }
                else {
                    let ymdDate = getYMDDateString(sortedTransactionKeys[i].ymdDate);
                    const transaction = await this.asyncGetTransactionDataItemsWithIds(id);
                    const { splits } = transaction;

                    const newAccountStateDataItems = [];
                    for (let s = splits.length - 1; s >= 0; --s) {
                        const split = splits[s];
                        if (split.accountId === accountId) {
                            workingAccountState = AS.removeSplitFromAccountStateDataItem(workingAccountState, split, ymdDate);
                            newAccountStateDataItems.push(workingAccountState);
                        }
                    }

                    if (i > 0) {
                        newAccountStateDataItems[0].ymdDate = getYMDDateString(sortedTransactionKeys[i - 1].ymdDate);
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
     * Returns the current account state data item for an account. This is the account state after the newest
     * transaction has been applied.
     * @param {number} accountId 
     * @returns {AccountStateDataItem}
     */
    getCurrentAccountStateDataItem(accountId) {
        let accountStateDataItem = this._handler.getCurrentAccountStateDataItem(accountId);
        if (!accountStateDataItem) {
            const accountDataItem = this._accountingSystem.getAccountManager().getAccountDataItemWithId(accountId);
            if (accountDataItem) {
                const type = A.getAccountType(accountDataItem.type);
                return AS.getFullAccountStateDataItem({ quantityBaseValue: 0 }, type.hasLots);
            }
        }
        return accountStateDataItem;
    }

    /**
     * Retrieves the account state data item immediately after a transaction has been applied
     * to the account.
     * @param {number} accountId 
     * @param {number} transactionId 
     * @returns {AccountStateDataItem[]}    An array containing the account states immediately after
     * a transaction has been applied. Multiple account states are returned if there are multiple
     * splits referring to the account. The referring split at index closest to zero is at the first index.
     */
    async asyncGetAccountStateDataItemsAfterTransaction(accountId, transactionId) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);
        const { sortedTransactionKeys, indicesByTransactionId } = accountEntry;
        if (sortedTransactionKeys.length) {
            const index = indicesByTransactionId.get(transactionId);
            if (index === sortedTransactionKeys.length - 1) {
                return [this.getCurrentAccountStateDataItem(accountId)];
            }

            transactionId = sortedTransactionKeys[index + 1].id; 
        }

        return this._asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId);
    }


    /**
     * Retrieves the account state data item immediately before a transaction has been applied
     * to the account.
     * @param {number} accountId 
     * @param {number} transactionId 
     * @returns {AccountStateDataItem[]}    An array containing the account states immediately before
     * a transaction is applied. Multiple account states are returned if there are multiple
     * splits referring to the account. The referring split at index closest to zero is at the first index.
     */
    async asyncGetAccountStateDataItemsBeforeTransaction(accountId, transactionId) {
        return this._asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId);
    }


    /**
     * Validates an array of splits.
     * @param {Split[]|SplitDataItem[]} splits 
     * @param {boolean} isModify    If <code>true</code> the splits are for a transaction modify, and any lot changes
     * will not be verified against the account's currenty state.
     * @param {Map<number,AccountState>|Map<number,AccountStateDataItem>}   [accountStatesByTransactionId] If specified, the account states
     * to use for validating the individual splits, in particular the lot changes. The account states are updated
     * with the lot changes.
     * @returns {Error|undefined}   Returns an Error if invalid, <code>undefined</code> if valid.
     */
    validateSplits(splits, isModify, accountStatesByTransactionId) {
        if (!splits || (splits.length < 2)) {
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

        for (let i = 0; i < splits.length; ++i) {
            const split = splits[i];

            const accountDataItem = accountManager.getAccountDataItemWithId(split.accountId);
            const account = A.getAccount(accountDataItem);
            if (!account) {
                return userError('TransactionManager~split_account_not_found', split.accountId);
            }

            const pricedItem = PI.getPricedItem(pricedItemManager.getPricedItemDataItemWithId(account.pricedItemId));
            if (!pricedItem) {
                return userError('TransactionManager~split_priced_item_not_found', account.pricedItemId, account.id);
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
                if (!split.lotChanges && creditBaseValue) {
                    return userError('TransactionManager~split_needs_lots', account.type.name);
                }

                let accountStateDataItem;
                if (accountStatesByTransactionId) {
                    accountStateDataItem = accountStatesByTransactionId.get(account.id);
                }
                if (!accountStateDataItem) {
                    if (!isModify) {
                        accountStateDataItem = this.getCurrentAccountStateDataItem(account.id);
                    }
                }

                if (accountStateDataItem) {
                    // Make sure any lots to be changed are in fact in the account.
                    const accountLotStrings = [];
                    accountStateDataItem.lots.forEach((lotDataItem) => {
                        accountLotStrings.push(JSON.stringify(lotDataItem));
                    });

                    const { lotChanges } = getSplitDataItem(split);
                    for (let i = 0; i < lotChanges.length; ++i) {
                        const lotToChange = lotChanges[i][1];
                        if (lotToChange) {
                            const lotString = JSON.stringify(lotToChange);
                            if (!accountLotStrings.includes(lotString)) {
                                return userError('TransactionManager-split_lot_not_in_account', lotString);
                            }
                        }
                    }

                    if (accountStatesByTransactionId) {
                        accountStatesByTransactionId.set(account.id, AS.addSplitToAccountStateDataItem(accountStateDataItem, split));
                    }
                }
            }

            creditSumBaseValue += creditBaseValue;
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
                        return userError('TransactionManager~split_needs_currency_price', currency);
                    }
                    creditBaseValue = split.currencyToUSDRatio.inverse().applyToNumber(creditBaseValue);
                }

                creditSumBaseValue += creditBaseValue;
            }
        }

        if (creditSumBaseValue !== 0) {
            activeCurrency = activeCurrency || getCurrency(this._accountingSystem.getBaseCurrency());
            const excessAmount = activeCurrency.baseValueToString(creditSumBaseValue);
            return userError('TransactionManager~splits_dont_add_up', excessAmount);
        }
    }


    _validateTransactionBasics(transactionDataItem, isModify, accountStatesByTransactionId) {
        if (!transactionDataItem.ymdDate) {
            return userError('TransactionManager-date_required');
        }

        const splitsError = this.validateSplits(transactionDataItem.splits, isModify, accountStatesByTransactionId);
        if (splitsError) {
            return splitsError;
        }
    }

    /**
     * Fired by {@link TransactionManager#asyncAddTransactions} after the transactions have been added.
     * @event TransactionManager~transactionsAdd
     * @type {object}
     * @property {TransactionDataItem[]}    newTransactionDataItems The array of newly added transaction data items
     * being returned from the call to {@link TransactionManager#asyncAddTransactions}.
     */


    /**
     * Adds one or more transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} transactions 
     * @param {boolean} validateOnly
     * @returns {TransactionDataItem|TransactionDataItem[]} If transactions is an array then an array containing the 
     * added data items is returned, otherwise a single data item is returned.
     * @throws Error
     * @fires {TransactionManager~transactionsAdd}
     */
    async asyncAddTransactions(transactions, validateOnly) {
        if (!Array.isArray(transactions)) {
            const result = await this.asyncAddTransactions([transactions], validateOnly);
            return result[0];
        }

        this._handler.isDebug = this.isDebug;

        const idGeneratorOriginal = this._idGenerator.toJSON();

        let transactionDataItems = transactions.map((transaction) => getTransactionDataItem(transaction, true));

        const stateUpdater = new AccountStatesUpdater(this);

        // Sort the transactions.
        const sortedTransactionIndices = new SortedArray(compareTransactionKeys, { duplicates: 'allow'});
        for (let i = 0; i < transactionDataItems.length; ++i) {
            const transactionDataItem = transactionDataItems[i];
            transactionDataItem.id = this._idGenerator.generateId();
            sortedTransactionIndices.add(
                { id: transactionDataItem.id, ymdDate: getYMDDate(transactionDataItem.ymdDate), sameDayOrder: transactionDataItem.sameDayOrder, index: i});
        }

        const sortedIndices = [];
        const sortedTransactionDataItems = [];
        sortedTransactionIndices.forEach((entry) => {
            sortedIndices.push(entry.index);
            sortedTransactionDataItems.push(transactionDataItems[entry.index]);
        });

        const accountStatesByTransactionId = new Map();
        for (let i = 0; i < sortedTransactionDataItems.length; ++i) {
            const error = this._validateTransactionBasics(sortedTransactionDataItems[i], false, accountStatesByTransactionId);
            if (error) {
                throw error;
            }

            await stateUpdater.asyncAddTransactionUpdate(undefined, sortedTransactionDataItems[i]);
        }

        const currentAccountStateUpdates = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            this._idGenerator.fromJSON(idGeneratorOriginal);
            transactionDataItems.forEach((dataItem) => { delete dataItem.id; });
            return transactionDataItems;
        }

        try {

            const transactionIdAndDataItemPairs = [];
            sortedTransactionDataItems.forEach((transactionDataItem) => {                
                transactionIdAndDataItemPairs.push([transactionDataItem.id, transactionDataItem]);
            });

            await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, currentAccountStateUpdates.entries(), this._idGenerator.toJSON());

            stateUpdater.updateAccountEntries();

            transactionDataItems = transactionDataItems.map((dataItem) => getTransactionDataItem(dataItem, true));

            this.emit('transactionsAdd', { newTransactionDataItems: transactionDataItems });
            return transactionDataItems;
        }
        catch (e) {
            this._idGenerator.fromJSON(idGeneratorOriginal);
            throw e;
        }
    }
    


    /**
     * Fired by {@link TransactionManager#asyncRemoveTransactions} after the transactions have been removed.
     * @event TransactionManager~transactionsRemove
     * @type {object}
     * @property {TransactionDataItem[]}    removedTransactionDataItems The array of removed transaction data items
     * being returned by the call to {@link TransactionManager#asyncRemoveTransactions}.
     */

    /**
     * Removes one or more transactions.
     * @param {number|number[]} transactionIds 
     * @param {boolean} validateOnly 
     * @returns {TransactionDataItem|TransactionDataItem[]} If transactions is an array then an array containing the 
     * removed data items is returned, otherwise a single data item is returned.
     * @throws Error
     * @fires {TransactionManager~transactionsRemove}
     */
    async asyncRemoveTransactions(transactionIds, validateOnly) {
        if (!Array.isArray(transactionIds)) {
            const result = await this.asyncRemoveTransactions([transactionIds], validateOnly);
            return result[0];
        }

        const stateUpdater = new AccountStatesUpdater(this);

        const transactionDataItems = await this._handler.asyncGetTransactionDataItemsWithIds(transactionIds);
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            if (!transactionDataItems[i]) {
                throw userError('TransactionManager-remove_invalid_id', transactionIds[i]);
            }
            transactionDataItems[i] = getTransactionDataItem(transactionDataItems[i], true);

            await stateUpdater.asyncAddTransactionUpdate(transactionDataItems[i]);
        }

        const currentAccountStateUpdates = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            return transactionDataItems;
        }

        const transactionIdAndDataItemPairs = [];

        for (let t = 0; t < transactionDataItems.length; ++t) {
            const dataItem = transactionDataItems[t];

            transactionIdAndDataItemPairs.push([dataItem.id]);
        }

        await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        this.emit('transactionsRemove', { removedTransactionDataItems: transactionDataItems });
        return transactionDataItems;
    }


    /**
     * Fired by {@link TransactionManager#asyncModifyTransactions} after all the submitted transactions have
     * been modified.
     * @event TransactionManager~transactionsModify
     * @type {object}
     * @property {TransactionDataItem[]}    newTransactionDataItems Array of the updated transaction data items.
     * @property {TransactionDataItem[]}    oldTransactionDataItems Array fo the old transaction data items.
     */


    /**
     * Modifies one or more transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} transactions 
     * @param {boolean} validateOnly
     * @returns {TransactionDataItem|TransactionDataItem[]} If transactions is an array then an array containing the 
     * modified data items is returned, otherwise a single data item is returned.
     * @throws Error
     * @fires {TransactionManager~modifyTransaction}
     */
    async asyncModifyTransactions(transactions, validateOnly) {
        if (!Array.isArray(transactions)) {
            const result = await this.asyncModifyTransactions([transactions], validateOnly);
            return result[0];
        }

        this._handler.isDebug = this.isDebug;

        const transactionIds = transactions.map((transaction) => transaction.id);
        const oldDataItems = await this._handler.asyncGetTransactionDataItemsWithIds(transactionIds);

        const accountManager = this._accountingSystem.getAccountManager();

        let hasLots;
        let newDataItems = [];
        for (let i = 0; i < transactionIds.length; ++i) {
            const id = transactionIds[i];
            if (!oldDataItems[i]) {
                throw userError('TransactionManager~modify_id_not_found', id);
            }

            const newDataItem = Object.assign({}, oldDataItems[i], getTransactionDataItem(transactions[i]));
            newDataItems.push(newDataItem);

            if (!hasLots) {
                newDataItem.splits.forEach((split) => {
                    const account = accountManager.getAccountDataItemWithId(split.accountId);
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

        const currentAccountStateUpdates = await stateUpdater.asyncGenerateCurrentAccountStates();

        if (validateOnly) {
            return newDataItems;
        }

        const transactionIdAndDataItemPairs = [];

        for (let i = 0; i < transactionIds.length; ++i) {
            transactionIdAndDataItemPairs.push([transactionIds[i], newDataItems[i]]);
        }

        await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, currentAccountStateUpdates.entries());

        stateUpdater.updateAccountEntries();

        newDataItems = newDataItems.map((dataItem) => getTransactionDataItem(dataItem, true));

        this.emit('transactionsModify', {
            newTransactionDataItems: newDataItems,
            oldTransactionDataItems: oldDataItems,
        });
        return newDataItems;
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link TransactionManager}.
 * @interface
 */
export class TransactionsHandler {

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for initializing the id generator.
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
        throw Error('TransactionHandler.getCurrentAccountStateDataItem() abstract method!');
    }

    
    /**
     * Retrieves the earliest and latest date of either all the transactions or all the transactions that
     * refer to a given account id.
     * @param {(number|undefined)} accountId The account id, if <code>undefined</code> the range of all the transactions
     * is retrieved.
     * @returns {(YMDDate[]|undefined)} Either a two element array with the first element the earliest date
     * and the second element the latest date or <code>undefined</code> if there are no transactions.
     */
    async asyncGetTransactionDateRange(accountId) {
        throw Error('TransactionHandler.asyncGetTransactionDateRange() abstract method!');
    }

    /**
     * Retrieves the transactions within a date range, optionally only those referring to a given account.
     * @param {(number|undefined)} accountId    If defined only transactions that refer to the account with this id are retrieved.
     * @param {YMDDate} ymdDateA    The earlier date of the date range, inclusive.
     * @param {YMDDate} ymdDateB    The later date of the date range, inclusive.
     * @returns {TransactionDataItem[]} An array containing the transaction data items, sorted from earliest to latest date.
     */
    async asyncGetTransactionDataItemssInDateRange(accountId, ymdDateA, ymdDateB) {
        throw Error('TransactionHandler.asyncGetTransactionDataItemssInDateRange() asbtract method!');
    }

    /**
     * Retrieves one or more transactions by id.
     * @param {number[]} ids 
     * @returns {TransactionDataItem[]}
     */
    async asyncGetTransactionDataItemsWithIds(ids) {
        throw Error('TransactionHandler.asyncGetTransactionDataItemsWithIds() abstract method!');
    }


    /**
     * Retrieves a array of the {@link TransactionKey}s for an account, sorted from oldest to newest.
     * @param {number} accountId 
     * @return {TransactionKey[]}
     */
    async asyncGetAccountSortedTransactionKeys(accountId) {
        throw Error('TransactionHandler.asyncGetAccountSortedTransactionKeys() abstract method!');
    }


    /**
     * Main function for updating the transaction data items.
     * @param {*} transactionIdAndDataItemPairs Array of one or two element sub-arrays. The first element of each sub-array is the transaction id.
     * For new or modified transactions, the second element is the new data item. For accounts to be deleted, this is <code>undefined</code>.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The current state of the id generator, if <code>undefined</code>
     * the generator state hasn't changed.
     * @returns {TransactionDataItem[]} Array containing the updated data items for new and modified transactions,
     * or the old data items for removed transactions.
     */    
    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, accountStateUpdates, idGeneratorOptions) {
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
    if (entry.sameDayOrder) {
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
    if (json.sameDayOrder !== undefined) {
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
     * @property {number}   [sameDayOrder]    Optional, used to order transactions that fall on the same day,
     * the lower the value the earlier in the day the transaction is ordered. If not given then it is treated as
     * @property {Set<number>}  accountIds  Set containing the account ids of all the accounts referred to
     * by the transaction's splits.
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

        // Sorted array of entries sorted by ymdDate then id.
        this._ymdDateSortedEntries = new SortedArray(compareTransactionKeys);

        this._currentAccountStatesById = new Map();
    }


    entriesToJSON() {
        const entries = [];
        this._entriesById.forEach((entry, id) => {
            entries.push(entryToJSON(entry));
        });
        return {
            entries: entries,
            currentAccountStatesById: Array.from(this._currentAccountStatesById.entries()),
        };
    }

    entriesFromJSON(json) {
        const { entries, currentAccountStatesById } = json;

        this._entriesById.clear();
        this._ymdDateSortedEntries.clear();
        this._sortedEntriesByAccountId.clear();
        this._currentAccountStatesById.clear();

        entries.forEach((entry) => {
            this._addEntry(entryFromJSON(entry));
        });

        currentAccountStatesById.forEach(([accountId, accountStateDataItem]) => {
            this._currentAccountStatesById.set(accountId, accountStateDataItem);
        });
    }


    _addEntry(entry) {
        entry.ymdDate = getYMDDate(entry.ymdDate);

        this._entriesById.set(entry.id, entry);
        this._ymdDateSortedEntries.add(entry);

        entry.accountIds.forEach((accountId) => {
            this._addEntryToSortedEntriesByAccountId(accountId, entry);
        });
    }

    _addEntryToSortedEntriesByAccountId(accountId, entry) {
        let accountEntry = this._sortedEntriesByAccountId.get(accountId);
        if (!accountEntry) {
            accountEntry = new SortedArray(compareTransactionKeys);
            this._sortedEntriesByAccountId.set(accountId, accountEntry);
        }
        accountEntry.add(entry);
    }

    _removeEntryFromSortedEntriesByAccountId(oldEntry) {
        oldEntry.accountIds.forEach((accountId) => {
            const sortedEntries = this._sortedEntriesByAccountId.get(accountId);
            if (sortedEntries) {
                const wasDeleted = sortedEntries.delete(oldEntry);
                if (!wasDeleted) {
                    console.log('uh-oh: ' + JSON.stringify(oldEntry));
                    console.log('sortedEntries: ' + JSON.stringify(sortedEntries.getValues()));
                    console.log('entriesById: ' + JSON.stringify(Array.from(this._entriesById.entries())));
                    throw Error('Stop!');
                }
            }
        });
    }


    getCurrentAccountStateDataItem(accountId) {
        return this._currentAccountStatesById.get(accountId);
    }


    async asyncGetTransactionDateRange(accountId) {
        const sortedEntries = (accountId) ? this._sortedEntriesByAccountId.get(accountId) : this._ymdDateSortedEntries;
        if (sortedEntries && sortedEntries.length) {
            return [ sortedEntries.at(0).ymdDate, sortedEntries.at(sortedEntries.length - 1).ymdDate ];
        }
    }

    async asyncGetTransactionDataItemssInDateRange(accountId, ymdDateA, ymdDateB) {
        const sortedEntries = (accountId) ? this._sortedEntriesByAccountId.get(accountId) : this._ymdDateSortedEntries;
        if (sortedEntries && sortedEntries.length) {
            const indexA = sortedEntries.indexGE({ ymdDate: ymdDateA, id: 0 });
            const indexB = sortedEntries.indexLE({ ymdDate: ymdDateB, id: Number.MAX_VALUE });
            const ids = sortedEntries.getValues().slice(indexA, indexB + 1).map((entry) => entry.id);
            return this.asyncGetTransactionDataItemsWithIds(ids);
        }

        return [];
    }


    async asyncGetAccountSortedTransactionKeys(accountId) {
        const sortedEntries = this._sortedEntriesByAccountId.get(accountId);
        if (sortedEntries) {
            return sortedEntries.getValues().map((entry) => { return { id: entry.id, ymdDate: entry.ymdDate, sameDayOrder: entry.sameDayOrder, }; });
        }
        else {
            return [];
        }
    }

    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, accountStateUpdates, idGeneratorOptions) {

        const entryChanges = [];
        transactionIdAndDataItemPairs.forEach(([id, dataItem]) => {
            const oldEntry = this._entriesById.get(id);
            if (!dataItem) {
                // A remove...
                entryChanges.push([undefined, oldEntry]);
            }
            else {
                // Modify or add.
                const newEntry = { id: id, };

                let newAccountIds;
                if (dataItem.splits) {
                    newAccountIds = new Set();
                    dataItem.splits.forEach((split) => newAccountIds.add(split.accountId));
                }

                if (oldEntry) {
                    // Modify entry
                    newEntry.ymdDate = dataItem.ymdDate || oldEntry.ymdDate;

                    if (newAccountIds) {
                        let accountIdsModified = !doSetsHaveSameElements(newAccountIds, oldEntry.accountIds);
                        newEntry.accountIds = (accountIdsModified) ? newAccountIds : oldEntry.accountIds;
                    }
                    else {
                        newEntry.accountIds = oldEntry.accountIds;
                    }
                }
                else {
                    // New entry
                    newEntry.ymdDate = dataItem.ymdDate;
                    newEntry.accountIds = newAccountIds;
                }

                newEntry.ymdDate = getYMDDate(newEntry.ymdDate);
                entryChanges.push([newEntry, oldEntry, dataItem]);
            }
        });

        // Update the underlying storage.
        const result = await this.asyncUpdateTransactionDataItemsAndEntries(entryChanges, idGeneratorOptions);

        // Update our collections.
        entryChanges.forEach(([newEntry, oldEntry]) => {
            if (!newEntry) {
                // Delete
                this._ymdDateSortedEntries.delete(oldEntry);
                this._removeEntryFromSortedEntriesByAccountId(oldEntry);
                this._entriesById.delete(oldEntry.id);
            }
            else {
                let accountIdsUnchanged;
                if (oldEntry) {
                    // Modify
                    let isDateChange;
                    if (YMDDate.compare(oldEntry.ymdDate, newEntry.ymdDate)) {
                        this._ymdDateSortedEntries.delete(oldEntry);
                        isDateChange = true;
                    }

                    // This test is safe, earlier we checked for account id changes...
                    if ((newEntry.accountIds !== oldEntry.accountIds) || isDateChange) {
                        this._removeEntryFromSortedEntriesByAccountId(oldEntry);
                    }
                    else {
                        accountIdsUnchanged = true;
                    }
                }

                this._entriesById.set(newEntry.id, newEntry);
                this._ymdDateSortedEntries.add(newEntry);

                if (!accountIdsUnchanged) {
                    newEntry.accountIds.forEach((accountId) => {
                        this._addEntryToSortedEntriesByAccountId(accountId, newEntry);
                    });
                }
            }
        });

        if (accountStateUpdates) {
            for (let [accountId, accountStateDataItem] of accountStateUpdates) {
            //accountStateUpdates.forEach(([accountId, accountStateDataItem]) => {
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
     * @param {Array} entryDataItemUpdates  Array of three element sub-arrays, the first element of the sub-array
     * is the new {@link TransactionsHandlerImplBase~Entry}, the second element the old {@link TransactionsHandlerImplBase~Entry},
     * the last element the data item.
     * @param {*} idGeneratorOptions 
     * @returns {TransactionDataItem[]} Array containing the updated data items for new and modified transactions,
     * or the old data items for removed transactions.
     */
    async asyncUpdateTransactionDataItemsAndEntries(entryDataItemUpdates, idGeneratorOptions) {
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
     * Loads the handler from a JSON object that was previously created by {@link InMemoryTransactionsHandler#toJSON}.
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

    async asyncUpdateTransactionDataItemsAndEntries(entryDataItemUpdates, idGeneratorOptions) {
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
