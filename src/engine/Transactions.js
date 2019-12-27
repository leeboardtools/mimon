import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getLotDataItems, getLots } from './Lots';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';



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
            return lotChanges.map((lotChange) => getLotDataItems(lotChange));
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
            return lotChangeDataItems.map((lotChangeDataItem) => getLots(lotChangeDataItem));
        }
    }
    return lotChangeDataItems;
}

/**
 * @typedef {object}    SplitDataItem
 * @property {string}   reconcileState  The name property of the {@link ReconcileState} of the row.
 * @property {number}   accountId   The account to which the row applies.
 * @property {number}   quantityBaseValue   The base value for the amount to apply to the account.
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
 * @property {Lot[][]}    [lots]    Array of two element sub-arrays. The first element of each sub-array
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
        if (alwaysCopy
         || (reconcileStateName !== split.reconcileState)
         || (lotChangeDataItems !== split.lotChanges)) {
            const splitDataItem = Object.assign({}, split);
            splitDataItem.reconcileState = reconcileStateName;
            splitDataItem.lotChanges = lotChangeDataItems;
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
        if (alwaysCopy
         || (reconcileState !== splitDataItem.reconcileState)
         || (lotChanges !== splitDataItem.lotChanges)) {
            const split = Object.assign({}, splitDataItem);
            split.reconcileState = reconcileState;
            split.lotChanges = lotChanges;
            return split;
        }
    }
    return splitDataItem;
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
 * @property {string}   ymdDate The transaction's date.
 * @property {SplitDataItem[]}   splits
 * @property {string}   [description]
 * @property {string}   [memo]  
 */


/**
 * @typedef {object}    Transaction
 * @property {YMDDate}  ymdDate The transaction's date.
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
 * Manager for {@link Transaction}s
 */
export class TransactionManager {
    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator || this._handler.getIdGeneratorState());
    }

    async asyncSetupForUse() {
        
    }
    
    getAccountingSystem() { return this._accountingSystem; }
    
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link TransactionManager}.
 * @interface
 */
export class TransactionsHandler {
    getIdGeneratorState() {
        throw Error('TransactionsHandler.getIdGeneratorState() abstract method!');
    }
    
}


/**
 * Simple in-memory implementation of {@link TransactionsHandler}
 */
export class InMemoryTransactionsHandler extends TransactionsHandler {
    getIdGeneratorState() {
        return this._idGeneratorState;
    }

}