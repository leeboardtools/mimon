import { userError, userDateString, userMsg } from '../util/UserMessages';
import { getYMDDate, YMDDate } from '../util/YMDDate';
import * as T from '../engine/Transactions';
import * as AS from '../engine/AccountStates';
import { createCompositeAction } from '../util/Actions';
import { EventEmitter } from 'events';

/**
 * Manages reconciling an individual account.
 */
export class Reconciler extends EventEmitter {
    /**
     * Constructor. Reconcilers are normally only created by {@link EngineAccessors}.
     * @param {EngineAccessor} accessor 
     * @param {AccountDataItem}  accountDataItem
     * @param {function} shutDownCallback
     */
    constructor(accessor, accountDataItem, shutDownCallback) {
        super();

        this._accessor = accessor;

        this._accountId = accountDataItem.id;
        this._lastClosingInfo = {
            closingYMDDate: getYMDDate(accountDataItem.lastReconcileYMDDate),
            closingBalanceBaseValue: accountDataItem.lastReconcileBalanceBaseValue,
        };
        this._pendingClosingInfo = {
            closingYMDDate: getYMDDate(accountDataItem.pendingReconcileYMDDate),
            closingBalanceBaseValue: accountDataItem.pendingReconcileBalanceBaseValue,
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

        this._splitInfosUpdated = false;
    }


    /**
     * Fired whenever any transactions affect the reconciler's account.
     * @event Reconciler~splitInfosUpdate
     * @type {object}
     * @property {Reconciler} reconciler
     */


    /**
     * @typedef {object} Reconciler~SplitEntry
     * @property {number}   splitIndex
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
        return Object.assign({}, this._lastClosingInfo);
    }


    /**
     * @returns {Reconciler~ClosingInfo}    The pending closing info for the account
     * being reconciled.
     */
    getPendingClosingInfo() {
        return Object.assign({}, this._pendingClosingInfo);
    }


    /**
     * Retrieves an estimate of what the next reconciliation will involve.
     * @param {YMDDate} [newClosingYMDDate] If <code>undefined</code> then this
     * will be estimated from the date from {@link Reconciler#getLastClosingInfo},
     * and if there wasn't a previous closing it will be set to today.
     * @returns {Reconciler~ClosingInfo} If there are no transactions at all the
     * closingYMDDate property will be <code>undefined</code>. The 
     * closingBalanceBaseValue property is set to the account balance at the end
     * of the new closing date.
     */
    async asyncEstimateNextClosingInfo(newClosingYMDDate) {
        if (!newClosingYMDDate) {
            if (this._pendingClosingInfo.closingYMDDate) {
                return Object.assign({}, this._pendingClosingInfo);
            }
        }

        newClosingYMDDate = getYMDDate(newClosingYMDDate);

        let oldClosingYMDDate = this._lastClosingInfo.closingYMDDate;
        if (!oldClosingYMDDate) {
            // Use the date of the first transaction.
            const range = await this._accessor.asyncGetTransactionDateRange(
                this._accountId);
            if (!range) {
                return {
                    closingYMDDate: undefined,
                };
            }

            oldClosingYMDDate = range[0];

            if (!newClosingYMDDate) {
                newClosingYMDDate = new YMDDate();
            }
        }
        else if (!newClosingYMDDate) {
            newClosingYMDDate = oldClosingYMDDate.addMonths(1);
        }

        const accountState = await this._accessor.asyncGetAccountStateForDate(
            this._accountId, newClosingYMDDate);
        if (!accountState) {
            return;
        }

        return {
            closingYMDDate: newClosingYMDDate,
            closingBalanceBaseValue: accountState.quantityBaseValue,
        };
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
        this._splitInfosUpdated = true;
    }

    _addSplitEntry(transactionId, splitIndex, reconcileState) {
        const splitEntries = this._getTransactionEntry(transactionId).splitEntries;
        const markReconciled = (reconcileState !== T.ReconcileState.NOT_RECONCILED.name);
        for (let s = 0; s < splitEntries.length; ++s) {
            if (splitEntries[s].splitIndex === splitIndex) {
                splitEntries[s].markReconciled = markReconciled;
                return;
            }
        }

        splitEntries.push({
            splitIndex: splitIndex,
            markReconciled: markReconciled,
        });
    }

    _removeSplitEntry(transactionId, splitIndex) {
        const transactionEntry 
            = this._transactionEntriesByTransactionId.get(transactionId);
        if (transactionEntry) {
            const { splitEntries } = transactionEntry;
            for (let s = 0; s < splitEntries.length; ++s) {
                if (splitEntries[s].splitIndex === splitIndex) {
                    splitEntries.splice(s, 1);
                    this._splitInfosUpdated = true;
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
                if (splitEntries[s].splitIndex === splitIndex) {
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
        if (!this.isReconcileStarted()) {
            return false;
        }
        
        const currentBalanceBaseValue 
            = await this.asyncGetMarkedReconciledBalanceBaseValue();
        return currentBalanceBaseValue === this._closingInfo.closingBalanceBaseValue;
    }


    /**
     * Applies the reconciliation changes. The reconcilation is then complete
     * and this {@link Reconciler} should no longer be used.
     * <p>
     * If {@link Reconciler#asyncCanApplyReconcile} returns false this throws an Error.
     * @param {boolean} [applyPending=false]    If true the transaction splits are marked 
     * as pending instead of reconciled.
     */
    async asyncApplyReconcile(applyPending) {
        if (!applyPending && !await this.asyncCanApplyReconcile()) {
            const currentBalance = this._accessor.accountQuantityBaseValueToText(
                this._accountId,
                await this.asyncGetMarkedReconciledBalanceBaseValue());
            const closingBalance = this._accessor.accountQuantityBaseValueToText(
                this._accountId,
                this._closingInfo.closingBalanceBaseValue);
            throw userError('Reconciler-account_not_balanced', 
                currentBalance, closingBalance);
        }

        // Create a composite action for updating the transactions and the
        // account reconciliation info.
        const allTransactionDataItems 
            = await this._accessor.asyncGetTransactionDataItemsWithIds(
                Array.from(this._transactionEntriesByTransactionId.keys())
            );
        const allTransactionDataItemsById = new Map();
        allTransactionDataItems.forEach((dataItem) => {
            allTransactionDataItemsById.set(dataItem.id, dataItem);
        });

        const reconcileState = (applyPending)
            ? T.ReconcileState.PENDING
            : T.ReconcileState.RECONCILED;

        const transactionDataItemsToChange = [];
        this._transactionEntriesByTransactionId.forEach((transactionEntry, id) => {
            const { splitEntries } = transactionEntry;
            let transactionDataItem;
            splitEntries.forEach((splitEntry) => {
                if (!splitEntry.markReconciled) {
                    return;
                }

                if (!transactionDataItem) {
                    transactionDataItem = allTransactionDataItemsById.get(id);
                    transactionDataItemsToChange.push(transactionDataItem);
                }

                transactionDataItem.splits[splitEntry.splitIndex].reconcileState
                    = reconcileState;
            });
        });

        const accountingActions = this._accessor.getAccountingActions();
        const transactionModifyAction 
            = await accountingActions.asyncCreateModifyTransactionAction(
                transactionDataItemsToChange
            );

        const accountDataItem = this._accessor.getAccountDataItemWithId(this._accountId);
        if (applyPending) {
            accountDataItem.pendingReconcileBalanceBaseValue 
                = this._closingInfo.closingBalanceBaseValue;
            accountDataItem.pendingReconcileYMDDate = this._closingInfo.closingYMDDate;
        }
        else {
            accountDataItem.lastReconcileBalanceBaseValue 
                = this._closingInfo.closingBalanceBaseValue;
            accountDataItem.lastReconcileYMDDate = this._closingInfo.closingYMDDate;
            
            accountDataItem.pendingReconcileBalanceBaseValue = undefined;
            accountDataItem.pendingReconcileYMDDate = undefined;
        }

        const accountModifyAction = accountingActions.createModifyAccountAction(
            accountDataItem
        );

        const mainAction = createCompositeAction(
            {
                name: userMsg('Reconciler-reconcile_action_name', accountDataItem.name 
                    | ''),
            },
            [
                transactionModifyAction,
                accountModifyAction,
            ]
        );

        // Appy the action.
        await this._accessor.asyncApplyAction(mainAction);

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
        this._pendingClosingInfo = undefined;
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
                    splitIndex: splitEntry.splitIndex,
                    markReconciled: splitEntry.markReconciled,
                });
            });
        });
        return splitInfos;
    }


    /**
     * Retrieves the balance representing all transaction splits that are marked
     * reconciled.
     * @returns {number}
     */
    async asyncGetMarkedReconciledBalanceBaseValue() {
        // Start with the current account state, remove all splits not marked as
        // reconciled up to the oldest split we have that's not marked as reconciled.
        let oldestDateValue = Number.MAX_VALUE;
        let transactionDataItems 
            = await this._accessor.asyncGetTransactionDataItemsWithIds(
                Array.from(this._transactionEntriesByTransactionId.keys())
            );
        transactionDataItems.forEach((transactionDataItem) => {
            const ymdDate = getYMDDate(transactionDataItem.ymdDate);
            const dateValue = ymdDate.valueOf();
            if (dateValue < oldestDateValue) {
                oldestDateValue = dateValue;
            }
        });

        let accountState = this._accessor.getCurrentAccountStateDataItem(this._accountId);
        if (!accountState) {
            return 0;
        }

        const dateRange = await this._accessor.asyncGetTransactionDateRange(
            this._accountId);
        dateRange[0] = new YMDDate(oldestDateValue);

        transactionDataItems 
            = await this._accessor.asyncGetTransactionDataItemsInDateRange(
                this._accountId, dateRange);
        
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            const { splits } = transactionDataItems[i];
            splits.forEach((split) => {
                if ((split.accountId === this._accountId)
                 && (split.reconcileState === T.ReconcileState.NOT_RECONCILED.name)) {
                    accountState = AS.removeSplitFromAccountStateDataItem(
                        accountState, split, dateRange[0]);
                }
            });
        }

        return accountState.quantityBaseValue;
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

                this._splitInfosUpdated = false;
                this.emit('splitInfosUpdate', { reconciler: this });
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
    isTransactionSplitMarkedReconciled(splitInfo) {
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
                splits[splitEntry.splitIndex].reconcileState
                    = (splitEntry.markReconciled)
                        ? T.ReconcileState.PENDING.name
                        : T.ReconcileState.NOT_RECONCILED.name;
            }
        }

        return transactionDataItem;
    }


    _handleTransactionsAdd(result) {
        this._doTransactionsAdd(result.newTransactionDataItems);
        this._fireUpdateEventIfNeeded();
    }

    _doTransactionsAdd(newTransactionDataItems) {
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

        const { oldTransactionDataItems, newTransactionDataItems } = result;
        this._doTransactionsRemove(oldTransactionDataItems);
        this._doTransactionsAdd(newTransactionDataItems);
        this._fireUpdateEventIfNeeded();
    }


    _handleTransactionsRemove(result) {
        this._doTransactionsRemove(result.removedTransactionDataItems);
        this._fireUpdateEventIfNeeded();
    }
     
    _doTransactionsRemove(removedTransactionDataItems) {
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

    _fireUpdateEventIfNeeded() {
        if (this._splitInfosUpdated) {
            this._splitInfosUpdated = false;
            this.emit('splitInfosUpdate', { reconciler: this });
        }
    }
}
