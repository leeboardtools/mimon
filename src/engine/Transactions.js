import { EventEmitter } from 'events';
import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getLotDataItems, getLots } from './Lots';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { doSetsHaveSameElements } from '../util/DoSetsHaveSameElements';
import * as A from './Accounts';
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


class AccountStatesUpdater {
    constructor(manager) {
        this.manager = manager;
        this.accountManager = manager._accountingSystem.getAccountManager();

        this._accountSplitsToProcess = new Map();   
        this._accountStatesByTransactionId = new Map();
    }


    async asyncGetAccountAndSplitsEntries(split) {
        const { accountId } = split;
        const accountEntry = await this.manager._asyncLoadAccountEntry(accountId);
        let splitsEntry = this._accountSplitsToProcess.get(accountId);
        if (!splitsEntry) {
            const accountDataItem = this.accountManager.getAccountDataItemWithId(accountId);
            const type = A.getAccountType(accountDataItem.type);
            splitsEntry = {
                accountEntry: accountEntry,
                sortedIndices: new SortedArray((a, b) => a - b, { duplicates: 'allow'}),
                hasLots: type.hasLots,
                accountState: accountDataItem.accountState,
                basicSplitsToAdd: [],
                basicSplitsToRemove: [],
            };
            this._accountSplitsToProcess.set(accountId, splitsEntry);
        }

        return [accountEntry, splitsEntry];
    }


    async asyncAddTransactionUpdate(existingTransactionDataItem, newTransactionDataItem) {
        const { splits } = existingTransactionDataItem;
        const transactionId = existingTransactionDataItem.id;
        for (let i = splits.length - 1; i >= 0; --i) {
            const split = splits[i];
            const [accountEntry, splitsEntry] = await this.asyncGetAccountAndSplitsEntries(split);

            const index = accountEntry.indicesByTransactionId.get(transactionId);
            splitsEntry.sortedIndices.add(index);

            if (!accountEntry.hasLots) {
                splitsEntry.basicSplitsToRemove.push(split);
            }
        }

        if (newTransactionDataItem) {
            const newYMDDate = getYMDDate(newTransactionDataItem.ymdDate);

            const { splits } = newTransactionDataItem;
            for (let i = 0; i < splits.length; ++i) {
                const split = splits[i];
                const [accountEntry, splitsEntry] = await this.asyncGetAccountAndSplitsEntries(split);
                const { transactionIdsAndYMDDates } = accountEntry;

                let index = bSearch(transactionIdsAndYMDDates, [0, newYMDDate], (value, arrayValue) => YMDDate.compare(value[1], arrayValue[1]));
                if (index >= 0) {
                    if (!YMDDate.compare(newYMDDate, transactionIdsAndYMDDates[index][1])) {
                        --index;
                    }
                }

                splitsEntry.sortedIndices.add(index);
                if (!accountEntry.hasLots) {
                    splitsEntry.basicSplitsToAdd.push(split);
                }
            }
        }
    }


    async asyncRemoveTransactions() {
        const toProcess = Array.from(this._accountSplitsToProcess.entries());
        for (let i = 0; i < toProcess.length; ++i) {
            const [ accountId, splitsEntry ] = toProcess[i];
            const { accountEntry, sortedIndices, hasLots } = splitsEntry;
            const { transactionIdsAndYMDDates } = accountEntry;
            let { accountState } = splitsEntry;
            const index = sortedIndices.at(0);

            if (hasLots) {
                // We rewind to the oldest transaction being removed/modified, we'll add back everything once the
                // transactions are updated.
                const transactionId = transactionIdsAndYMDDates[index][0];
                const accountStates = (await this.manager._asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId));
                accountState = accountStates[accountStates.length - 1];
            }
            else {
                // No lots, we can just subtract/add the splits from the current state.
                const { basicSplitsToRemove } = splitsEntry;
                basicSplitsToRemove.forEach((split) => {
                    accountState = A.removeSplitFromAccountStateDataItem(accountState, split, accountState.ymdDate);
                });
            }

            // We need to flush the accountEntry up to the removed transaction...
            if (index >= 0) {
                for (let i = transactionIdsAndYMDDates.length - 1; i >= index; --i) {
                    const transactionId = transactionIdsAndYMDDates[i][0];
                    accountEntry.accountStatesByTransactionId.delete(transactionId);
                }
                accountEntry.accountStatesByOrder.length = index;
            }
            else {
                accountEntry.accountStatesByOrder.length = 0;
            }
            accountEntry.transactionIdsAndYMDDates = undefined;

            this._accountStatesByTransactionId.set(accountId, accountState);
        }
    }
    

    async asyncUpdateAccountStates() {
        // Now update the account states from the current transactions.
        const toProcess = Array.from(this._accountSplitsToProcess.entries());
        for (let i = 0; i < toProcess.length; ++i) {
            const [ accountId, splitsEntry ] = toProcess[i];

            const { sortedIndices, hasLots } = splitsEntry;
            let accountState = this._accountStatesByTransactionId.get(accountId);

            const accountEntry = await this.manager._asyncLoadAccountEntry(accountId);
            const { transactionIdsAndYMDDates } = accountEntry;

            if (hasLots) {
                // index was the position of the oldest deleted/modified transaction, it's now
                // the position of the first transaction to start with.
                const index = sortedIndices.at(0);

                for (let i = index; i < transactionIdsAndYMDDates.length; ++i) {
                    const [ transactionId, ] = transactionIdsAndYMDDates[i];
                
                    const transactionDataItem = await this.manager.asyncGetTransactionDataItemsWithIds(transactionId);
                    transactionDataItem.splits.forEach((split) => {
                        if (split.accountId === accountId) {
                            accountState = A.addSplitToAccountStateDataItem(accountState, split, transactionDataItem.ymdDate);
                        }
                    });
                }

                this._accountStatesByTransactionId.set(accountId, accountState);
            }
            else {
                if (transactionIdsAndYMDDates.length) {
                    const { basicSplitsToAdd } = splitsEntry;
                    const [, ymdDate] = transactionIdsAndYMDDates[transactionIdsAndYMDDates.length - 1];
                    basicSplitsToAdd.forEach((split) => {
                        accountState = A.addSplitToAccountStateDataItem(accountState, split, ymdDate);
                    });

                    this._accountStatesByTransactionId.set(accountId, accountState);
                }
            }
        }

        // We need to clear out the cached account states and also update the account states.
        const accountIdAccountStates = Array.from(this._accountStatesByTransactionId.entries());
        await this.accountManager.asyncUpdateAccountStates(accountIdAccountStates);
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

        this._entriesByAccountId = new Map();
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
     * @property {Map<number, AccountStateDataItem>} accountStatesByTransactionId
     * @property {AccountStateDataItem[]}   accountStatesByOrder    The ordering here matches the ordering of 
     * the arrays returned by {@link TransactionHandler#asyncGetSortedIdsAndDatesForAccount}.
     */
    async _asyncLoadAccountEntry(accountId) {
        const accountDataItem = this._accountingSystem.getAccountManager().getAccountDataItemWithId(accountId);
        if (!accountDataItem) {
            throw userError('TransactionManager-account_state_update_account_invalid', accountId);
        }

        let accountEntry = this._entriesByAccountId.get(accountId);
        if (!accountEntry) {
            accountEntry = {
                accountStatesByTransactionId: new Map(),
                accountStatesByOrder: [],
            };
            this._entriesByAccountId.set(accountId, accountEntry);
        }

        if (!accountEntry.transactionIdsAndYMDDates) {
            const transactionIdsAndYMDDates = await this._handler.asyncGetSortedIdsAndDatesForAccount(accountId);
            const indicesByTransactionId = new Map();
            for (let i = transactionIdsAndYMDDates.length - 1; i >= 0; --i) {
                indicesByTransactionId.set(transactionIdsAndYMDDates[i][0], i);
            }
            accountEntry.transactionIdsAndYMDDates = transactionIdsAndYMDDates;
            accountEntry.indicesByTransactionId = indicesByTransactionId;
        }

        return accountEntry;
    }

    async _asyncLoadAccountStateDataItemsToBeforeTransactionId(accountId, transactionId) {
        const accountEntry = await this._asyncLoadAccountEntry(accountId);
        let accountStateDataItems = accountEntry.accountStatesByTransactionId.get(transactionId);

        if (!accountStateDataItems) {
            const accountDataItem = this._accountingSystem.getAccountManager().getAccountDataItemWithId(accountId);
            let workingAccountState = accountDataItem.accountState;

            const { transactionIdsAndYMDDates, accountStatesByOrder, accountStatesByTransactionId } = accountEntry;
            for (let i = transactionIdsAndYMDDates.length - 1; i >= 0; --i) {
                const id = transactionIdsAndYMDDates[i][0];
                if (accountStatesByOrder[i]) {                    
                    accountStateDataItems = accountStatesByOrder[i];
                    workingAccountState = accountStateDataItems[accountStateDataItems.length - 1];
                }
                else {
                    let ymdDate = getYMDDateString(transactionIdsAndYMDDates[i][1]);
                    const transaction = await this.asyncGetTransactionDataItemsWithIds(id);
                    const { splits } = transaction;

                    const newAccountStateDataItems = [];
                    for (let s = splits.length - 1; s >= 0; --s) {
                        const split = splits[s];
                        if (split.accountId === accountId) {
                            workingAccountState = A.removeSplitFromAccountStateDataItem(workingAccountState, split, ymdDate);
                            newAccountStateDataItems.push(workingAccountState);
                        }
                    }

                    if (i > 0) {
                        newAccountStateDataItems[0].ymdDate = getYMDDateString(transactionIdsAndYMDDates[i - 1][1]);
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
        const { transactionIdsAndYMDDates, indicesByTransactionId } = accountEntry;
        if (transactionIdsAndYMDDates.length) {
            const index = indicesByTransactionId.get(transactionId);
            if (index === transactionIdsAndYMDDates.length - 1) {
                const account = this._accountingSystem.getAccountManager().getAccountDataItemWithId(accountId);
                return [account.accountState];
            }

            transactionId = transactionIdsAndYMDDates[index + 1][0]; 
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
                        accountStateDataItem = accountDataItem.accountState;
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
                        accountStatesByTransactionId.set(account.id, A.addSplitToAccountStateDataItem(accountStateDataItem, split));
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

        let transactionDataItems = transactions.map((transaction) => getTransactionDataItem(transaction, true));

        // Sort the transactions.
        const sortedTransactionIndices = new SortedArray(compareEntryByYMDDateThenId, { duplicates: 'allow'});
        for (let i = 0; i < transactionDataItems.length; ++i) {
            const transaction = transactionDataItems[i];
            sortedTransactionIndices.add({ ymdDate: getYMDDate(transaction.ymdDate), sameDayOrder: transaction.sameDayOrder, index: i});
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
        }

        if (validateOnly) {
            return transactionDataItems;
        }

        const idGeneratorOriginal = this._idGenerator.toJSON();
        try {

            const accountStatesByAccountId = new Map();
            const accountManager = this._accountingSystem.getAccountManager();

            const transactionIdAndDataItemPairs = [];
            sortedTransactionDataItems.forEach((transactionDataItem) => {
                const id = this._idGenerator.generateId();
                transactionDataItem.id = id;
                transactionIdAndDataItemPairs.push([id, transactionDataItem]);

                transactionDataItem.splits.forEach((split) => {
                    if (!accountStatesByAccountId.has(split.accountId)) {
                        const accountDataItem = accountManager.getAccountDataItemWithId(split.accountId);
                        accountStatesByAccountId.set(split.accountId, accountDataItem.accountState);
                    }
                });
            });

            await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, this._idGenerator.toJSON());

            transactionDataItems = transactionDataItems.map((dataItem) => getTransactionDataItem(dataItem, true));

            try {
                // Now apply the transactions to the account states.
                sortedTransactionDataItems.forEach((transactionDataItem) => {
                    transactionDataItem.splits.forEach((split) => {
                        let accountState = accountStatesByAccountId.get(split.accountId);
                        accountState = A.addSplitToAccountStateDataItem(accountState, split, transactionDataItem.ymdDate);
                        accountStatesByAccountId.set(split.accountId, accountState);
                    });
                });

                const accountIdAccountStates = Array.from(accountStatesByAccountId.entries());

                await accountManager.asyncUpdateAccountStates(accountIdAccountStates);
            }
            catch (e) {
                // Gotta remove the items we just added.
                console.log('Account state updating from adding transactions failed, reverting transaction changes.');
                const transactionIdAndDataItemPairs = [];
                sortedTransactionDataItems.forEach((dataItem) => transactionIdAndDataItemPairs.push([dataItem.id]));
        
                await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs);
        
                throw e;
            }

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

        const transactionDataItems = await this._handler.asyncGetTransactionDataItemsWithIds(transactionIds);
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            if (!transactionDataItems[i]) {
                throw userError('TransactionManager-remove_invalid_id', transactionIds[i]);
            }
            transactionDataItems[i] = getTransactionDataItem(transactionDataItems[i], true);
        }

        if (validateOnly) {
            return transactionDataItems;
        }

        const transactionIdAndDataItemPairs = [];

        const stateUpdater = new AccountStatesUpdater(this);

        for (let t = 0; t < transactionDataItems.length; ++t) {
            const dataItem = transactionDataItems[t];

            transactionIdAndDataItemPairs.push([dataItem.id]);

            await stateUpdater.asyncAddTransactionUpdate(dataItem);
        }

        await stateUpdater.asyncRemoveTransactions();

        await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs);

        try {
            await stateUpdater.asyncUpdateAccountStates();
        }
        catch (e) {
            console.error('Account state updating from removing transactions failed, reverting transaction changes.');

            // Gotta add back all the data items we removed.
            const restoreIdAndDataItemPairs = [];
            for (let i = transactionDataItems.length - 1; i >= 0; --i) {
                const dataItem = transactionDataItems[i];
                restoreIdAndDataItemPairs.push([dataItem.id, dataItem]);
            }
            await this._handler.asyncUpdateTransactionDataItems(restoreIdAndDataItemPairs);
            throw e;
        }

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

        for (let i = 0; i < transactionIds.length; ++i) {
            const newDataItem = newDataItems[i];
            const error = this._validateTransactionBasics(newDataItem, true);
            if (error) {
                throw error;
            }
        }

        if (validateOnly) {
            return newDataItems;
        }

        const transactionIdAndDataItemPairs = [];

        const stateUpdater = new AccountStatesUpdater(this);

        for (let i = 0; i < transactionIds.length; ++i) {
            transactionIdAndDataItemPairs.push([transactionIds[i], newDataItems[i]]);

            await stateUpdater.asyncAddTransactionUpdate(oldDataItems[i], newDataItems[i]);
        }

        await stateUpdater.asyncRemoveTransactions();

        await this._handler.asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs);

        newDataItems = newDataItems.map((dataItem) => getTransactionDataItem(dataItem, true));

        try {
            await stateUpdater.asyncUpdateAccountStates();
        }
        catch (e) {
            console.log('Account state updating from modifying transactions failed, reverting transaction changes.');
            const restoreIdAndDataItemPairs = [];
            for (let i = oldDataItems.length - 1; i >= 0; --i) {
                const dataItem = oldDataItems[i];
                restoreIdAndDataItemPairs.push([ dataItem.id, dataItem]);
            }
            await this._handler.asyncUpdateTransactionDataItems(restoreIdAndDataItemPairs);

            throw e;
        }

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
     * Retrieves an array containing two element sub-arrays, the first element being the transaction id
     * and the second element the date.
     * @param {number} accountId If defined only transactions that refer to the account with this id are retrieved.
     * @returns {Array} The array of two element sub-arrays. The array is sorted by date from oldest to newest.
     */
    async asyncGetSortedIdsAndDatesForAccount(accountId) {
        throw Error('TransactionHandler.asyncGetSortedIdsAndDatesForAccount() abstract method!');
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
    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, idGeneratorOptions) {
        throw Error('TransactionHandler.asyncUpdateTransactionDataItems() abstract method!');
    }
}


function compareEntryByYMDDateThenId(a, b) {
    const result = YMDDate.compare(a.ymdDate, b.ymdDate);
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

function entryToJSON(entry) {
    return {
        ymdDate: getYMDDateString(entry.ymdDate),
        id: entry.id,
        accountIds: Array.from(entry.accountIds.values()),
    };
}

function entryFromJSON(json) {
    return {
        ymdDate: getYMDDate(json.ymdDate),
        id: json.id,
        accountIds: new Set(json.accountIds),
    };
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
        this._ymdDateSortedEntries = new SortedArray(compareEntryByYMDDateThenId);
    }


    entriesToJSON() {
        const entries = [];
        this._entriesById.forEach((entry, id) => {
            entries.push(entryToJSON(entry));
        });
        return {
            entries: entries,
        };
    }

    entriesFromJSON(json) {
        const { entries } = json;

        this._entriesById.clear();
        this._ymdDateSortedEntries.clear();
        this._sortedEntriesByAccountId.clear();

        entries.forEach((entry) => {
            this._addEntry(entryFromJSON(entry));
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
            accountEntry = new SortedArray(compareEntryByYMDDateThenId);
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

    async asyncGetSortedIdsAndDatesForAccount(accountId) {
        const result = [];
        const sortedEntries = (accountId) ? this._sortedEntriesByAccountId.get(accountId) : this._ymdDateSortedEntries;
        if (sortedEntries) {
            sortedEntries.forEach((entry) => {
                result.push([ entry.id, entry.ymdDate ]);
            });
        }

        return result;
    }

    async asyncUpdateTransactionDataItems(transactionIdAndDataItemPairs, idGeneratorOptions) {
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
