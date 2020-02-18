import { userError, userDateString } from '../util/UserMessages';
import { getYMDDate, YMDDate } from '../util/YMDDate';
import * as T from '../engine/Transactions';

/**
 * Manages reconciling an individual account.
 */
export class Reconciler {
    /**
     * Constructor. Reconcilers are normally only created by {@link EngineAccessors}.
     * @param {EngineAccessor} accessor 
     * @param {AccountDataItem}  accountDataItem
     * @param {function} shutDownCallback
     */
    constructor(accessor, accountDataItem, shutDownCallback) {
        this._accessor = accessor;

        this._accountId = accountDataItem.id;
        this._lastClosingInfo = {
            closingYMDDate: getYMDDate(accountDataItem.lastReconcileYMDDate),
            closingBalanceBaseValue: accountDataItem.lastReconcileBalanceBaseValue,
        };

        this._shutDownCallback = shutDownCallback;

        this.filterGetTransactionDataItems 
            = this.filterGetTransactionDataItems.bind(this);
        this._handleTransactionsAdd = this._handleTransactionsAdd.bind(this);
        this._handleTransactionsModify = this._handleTransactionsModify.bind(this);
        this._handleTransactionsRemove = this._handleTransactionsRemove.bind(this);

        this._accessor.on('transactionsAdd', this._handleTransactionsAdd);
        this._accessor.on('transactionsModify', this._handleTransactionsModify);
        this._accessor.on('transactionsRemove', this._handleTransactionsRemove);

        this._transactionEntriesByTransactionId = new Map();
    }


    /**
     * @typedef {object} Reconciler~SplitEntry
     * @property {number}   index
     * @property {boolean}  markReconciled
     */


    /**
     * @typedef {object} Reconciler~TransactionEntry
     * @property {Reconciler~SplitEntry[]}  splitEntries
     */


    /**
     * @returns {number}    The id of the account being reconciled.
     */
    getAccountId() {
        return this._accountId;
    }


    /**
     * @typedef {object} Reconciler~ClosingInfo
     * @property {YMDDate}  closingYMDDate  The closing date.
     * @property {number}   closingBalanceBaseValue  The closing balance in the
     * base value of the account's quantity definition.
     */


    /**
     * @returns {Reconciler~ClosingInfo}    The last closing info for the account
     * being reconciled.
     */
    getLastClosingInfo() {
        return this._lastClosingInfo;
    }


    /**
     * Starts the actual reconciliation.
     * @param {YMDDate} closingYMDDate The target closing date.
     * @param {number} closingBalanceBaseValue The target closing balance in the 
     * base value of the account's quantity definition.
     */
    async asyncStartReconcile(closingYMDDate, closingBalanceBaseValue) {
        closingYMDDate = getYMDDate(closingYMDDate);
        if (!closingYMDDate) {
            throw userError('Reconciler-invalid_closing_date');
        }

        const lastClosingYMDDate = this._lastClosingInfo.closingYMDDate;
        if (lastClosingYMDDate) {
            if (YMDDate.compare(closingYMDDate, lastClosingYMDDate) <= 0) {
                throw userError('Reconciler-closing_date_before_last',
                    userDateString(lastClosingYMDDate));
            }
        }


        this._transactionEntriesByTransactionId.clear();

        this._closingInfo = {
            closingYMDDate: getYMDDate(closingYMDDate),
            closingBalanceBaseValue: closingBalanceBaseValue,
        };


        const transactionIds = await this._accessor
            .asyncGetNonReconciledTransactionIdsForAccountId(this._accountId);
        const transactionDataItems 
            = await this._accessor.asyncGetTransactionDataItemsWithIds(
                transactionIds);
        for (let i = 0; i < transactionDataItems.length; ++i) {
            const transactionDataItem = transactionDataItems[i];

            const { splits } = transactionDataItem;
            for (let s = 0; s < splits.length; ++s) {
                this._addSplitIfNeeded(transactionDataItem, s);
            }
        }

    }

    _getTransactionEntry(id) {
        let transactionEntry = this._transactionEntriesByTransactionId.get(id);
        if (!transactionEntry) {
            transactionEntry = {
                splitEntries: [],
            };
            this._transactionEntriesByTransactionId.set(id,
                transactionEntry);
        }
        return transactionEntry;
    }

    _addSplitIfNeeded(transactionDataItem, splitIndex) {
        const split = transactionDataItem.splits[splitIndex];
        if (split.accountId !== this._accountId) {
            return;
        }
        if (split.reconcileState === T.ReconcileState.RECONCILED.name) {
            return;
        }

        if (YMDDate.compare(getYMDDate(transactionDataItem.ymdDate), 
            this._closingInfo.closingYMDDate) > 0) {
            return;
        }

        this._addSplitEntry(transactionDataItem.id, splitIndex, split.reconcileState);
    }

    _addSplitEntry(transactionId, splitIndex, reconcileState) {
        const splitEntries = this._getTransactionEntry(transactionId).splitEntries;
        const markReconciled = (reconcileState !== T.ReconcileState.NOT_RECONCILED.name);
        for (let s = 0; s < splitEntries.length; ++s) {
            if (splitEntries[s].index === splitIndex) {
                splitEntries[s].markReconciled = markReconciled;
                return;
            }
        }

        splitEntries.push({
            index: splitIndex,
            markReconciled: markReconciled,
        });
    }

    _removeSplitEntry(transactionId, splitIndex) {
        const transactionEntry 
            = this._transactionEntriesByTransactionId.get(transactionId);
        if (transactionEntry) {
            const { splitEntries } = transactionEntry;
            for (let s = 0; s < splitEntries.length; ++s) {
                if (splitEntries[s].index === splitIndex) {
                    splitEntries.splice(s, 1);
                    break;
                }
            }

            if (!splitEntries.length) {
                this._transactionEntriesByTransactionId.delete(transactionId);
            }
        }
    }

    _getSplitEntry(transactionId, splitIndex) {
        const transactionEntry
            = this._transactionEntriesByTransactionId.get(transactionId);
        if (transactionEntry) {
            const { splitEntries } = transactionEntry;
            for (let s = 0; s < splitEntries.length; ++s) {
                if (splitEntries[s].index === splitIndex) {
                    return splitEntries[s];
                }
            }
        }
    }


    /**
     * @returns {boolean}   <code>true</code> if {@link Reconciler#asyncStartReconcile}
     * has been called.
     */
    isReconcileStarted() {
        return this._closingInfo !== undefined;
    }


    /**
     * Determines if the account is now reconciled and 
     * {@link Reconciler#asyncApplyReconcile} can be called.
     * @returns {boolean}
     */
    async asyncCanApplyReconcile() {
        const currentBalanceBaseValue 
            = await this.asyncGetNonReconciledBalanceBaseValue();
        return currentBalanceBaseValue === this._closingInfo.closingBalanceBaseValue;
    }


    /**
     * Applies the reconciliation changes. The reconcilation is then complete
     * and this {@link Reconciler} should no longer be used.
     * <p>
     * If {@link Reconciler#asyncCanApplyReconcile} returns false this throws an Error.
     */
    async asyncApplyReconcile() {
        if (!await this.asyncCanApplyReconcile()) {
            const currentBalance = this._accessor.accountQuantityBaseValueToText(
                this._accountId,
                await this.asyncGetNonReconciledBalanceBaseValue());
            const closingBalance = this._accessor.accountQuantityBaseValueToText(
                this._accountId,
                this._closingBalanceInfo.closingBalanceBaseValue);
            throw userError('Reconciler-account_not_balanced', 
                currentBalance, closingBalance);
        }

        // Create a composite action for updating the transactions and the
        // account reconciliation info.

        // Appy the action.

        this._shutDown();
    }


    /**
     * Cancels the reconciliation, no changes are made.
     * This {@link Reconciler} is shut down and should no longer be used.
     */
    cancelReconcile() {
        this._shutDown();
    }

    _shutDown() {
        if (this._shutDownCallback) {
            this._shutDownCallback(this);
        }

        this._accessor.off('transactionsAdd', this._handleTransactionsAdd);
        this._accessor.off('transactionsModify', this._handleTransactionsModify);
        this._accessor.off('transactionsRemove', this._handleTransactionsRemove);

        this._transactionEntriesByTransactionId.clear();
        this._closingInfo = undefined;
        this._lastClosingInfo = undefined;
        this._accountId = undefined;
    }


    /**
     * @typedef {object} Reconciler~SplitInfo
     * @property {number}   transactionId   The id of the transaction.
     * @property {number}   splitIndex  The index of the split in the transaction.
     * @property {boolean}  markReconciled  If <code>true</code> the split has been
     * marked as reconciled (i.e. it's pending).
     */

    /**
     * Retrieves an array of the transaction ids of the transactions referring 
     * to the account being reconciled that are not marked as reconciled.
     * @returns {Reconciler~SplitInfo[]}
     */
    async asyncGetNonReconciledSplitInfos() {
        const splitInfos = [];
        this._transactionEntriesByTransactionId.forEach((transactionEntry, id) => {
            const { splitEntries } = transactionEntry;
            splitEntries.forEach((splitEntry) => {
                splitInfos.push({
                    transactionId: id,
                    splitIndex: splitEntry.index,
                    markReconciled: splitEntry.markReconciled,
                });
            });
        });
        return splitInfos;
    }


    /**
     * Retrieves the current non-reconciled balance base value, reflecting
     * any reconciler changes. 
     * @returns {number}
     */
    async asyncGetNonReconciledBalanceBaseValue() {

    }


    /**
     * Marks a transaction split as reconciled for the reconciler's purposes.
     * This basically means the transaction split is temporarily marked as pending.
     * An error is thrown if the split is not one returnable by 
     * {@link Reconciler#asyncGetNonReconciledSplitInfos}
     * @param {Reconciler~SplitInfo|Reconciler~SplitInfo[]}    splitInfo
     */
    async asyncSetTransactionSplitMarkedReconciled(splitInfos, markReconciled) {
        if (!Array.isArray(splitInfos)) {
            splitInfos = [splitInfos];
        }

        const transactionIdsToModify = new Set();
        splitInfos.forEach((splitInfo) => {
            const splitEntry = this._getSplitEntry(splitInfo.transactionId, 
                splitInfo.splitIndex);
            if (splitEntry) {
                if (markReconciled) {
                    if (!splitEntry.markReconciled) {
                        splitEntry.markReconciled = true;
                        transactionIdsToModify.add(splitInfo.transactionId);
                    }
                }
                else {
                    if (splitEntry.markReconciled) {
                        splitEntry.markReconciled = false;
                        transactionIdsToModify.add(splitInfo.transactionId);
                    }
                }
            }
        });

        if (transactionIdsToModify.size) {
            const savedIgnoreTransactionsModified = this._ignoreTransactionsModified;
            try {
                this._ignoreTransactionsModified = true;
                await this._accessor.asyncFireTransactionsModified(
                    Array.from(transactionIdsToModify.values()));
            }
            finally {
                this._ignoreTransactionsModified = savedIgnoreTransactionsModified;
            }
        }
    }



    /**
     * Determines if a transaction split is marked as reconciled.
     * An error is thrown if the split is not one returnable by 
     * {@link Reconciler#asyncGetNonReconciledSplitInfos}
     * @param {Reconciler~SplitInfo}    splitInfo
     */
    async asyncIsTransactionSplitMarkedReconciled(splitInfo) {
        const splitEntry = this._getSplitEntry(splitInfo.transactionId, 
            splitInfo.splitIndex);
        if (splitEntry) {
            return splitEntry.markReconciled;
        }
    }


    /**
     * Called by {@link EngineAccessor} to let the reconciler filter a transaction
     * data item on {@link EngineAccessor#asyncGetTransactionDataItemWithId}. 
     * This is used to mark split reconcile states as pending or not reconciled.
     * @param {TransactionDataItem[]} transactionDataItems
     */
    filterGetTransactionDataItems(transactionDataItems) {
        for (let i = 0; i < transactionDataItems.length; ++i) {
            transactionDataItems[i]
                = this._filterGetTransactionDataItem(
                    transactionDataItems[i]
                );
        }
        return transactionDataItems;
    }

    _filterGetTransactionDataItem(transactionDataItem) {
        const transactionEntry = this._transactionEntriesByTransactionId.get(
            transactionDataItem.id);
        if (transactionEntry) {
            const { splits } = transactionDataItem;
            const { splitEntries } = transactionEntry;
            for (let i = 0; i < splitEntries.length; ++i) {
                const splitEntry = splitEntries[i];
                splits[splitEntry.index].reconcileState
                    = (splitEntry.markReconciled)
                        ? T.ReconcileState.PENDING.name
                        : T.ReconcileState.NOT_RECONCILED.name;
            }
        }

        return transactionDataItem;
    }


    _handleTransactionsAdd(result) {
        const { newTransactionDataItems } = result;

        // Look for transactions that have our account id.
        newTransactionDataItems.forEach((transactionDataItem) => {
            const { splits } = transactionDataItem;
            for (let s = 0; s < splits.length; ++s) {
                this._addSplitIfNeeded(transactionDataItem, s);
            }
        });
    }


    _handleTransactionsModify(result) {
        if (this._ignoreTransactionsModified) {
            return;
        }
    }


    _handleTransactionsRemove(result) {
        const { removedTransactionDataItems } = result;
        const accountId = this._accountId;

        // Look for transactions that have our account id.
        removedTransactionDataItems.forEach((transactionDataItem) => {
            const { splits } = transactionDataItem;
            for (let s = 0; s < splits.length; ++s) {
                const split = splits[s];
                if ((split.accountId === accountId)
                 && (split.reconcleState !== T.ReconcileState.RECONCILED.name)) {
                    this._removeSplitEntry(transactionDataItem.id, s);
                }
            }
        });
    }
}
