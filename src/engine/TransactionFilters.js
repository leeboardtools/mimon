import deepEqual from 'deep-equal';
import { comparePhrases, PhraseMap, 
    stringToPhrase } from '../util/Phrases';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';



/**
 * @typedef {object} TransactionFilter
 * @property {string} [description] The partial or complete description of interest, the
 * search is case-insensitive and by partial word phrases.
 * @property {YMDDate} [earliestYMDDate] If specifed only transactions after or on
 * this date are returned.
 * @property {YMDDate} [latestYMDDate] If specified only transactions before or on
 * this date are returned.
 * @property {number} [smallestQuantityBaseValue] If specified only transactions with a 
 * quantity base value &ge; this are returned. Note the sign matters.
 * @property {number} [largestQuantityBaseValue] If specified only transactions with a
 * quantity base &le; this are returned. Note the sign matters.
 * @property {number|number[]} [otherAccountId]  If specified only transactions with
 * one or more splits with this account id are returned. If an array is specified then
 * splits with any of the account ids are accepted. (Not yet implemented)
 */

/**
 * @typedef {object} TransactionFilterDataItem
 * @property {string} [description] The partial or complete description of interest, the
 * search is case-insensitive and by partial word phrases.
 * @property {string} [earliestYMDDate] If specifed only transactions after or on
 * this date are returned.
 * @property {string} [latestYMDDate] If specified only transactions before or on
 * this date are returned.
 * @property {number} [smallestQuantityBaseValue] If specified only transactions with a 
 * quantity base value &ge; this are returned. Note the sign matters.
 * @property {number} [largestQuantityBaseValue] If specified only transactions with a
 * quantity base &le; this are returned. Note the sign matters.
 * @property {number|number[]} [otherAccountId]  If specified only transactions with
 * one or more splits with this account id are returned. If an array is specified then
 * splits with any of the account ids are accepted. (Not yet implemented)
 */



/**
 * Retrieves a {@link TransactionFilter} representation of a 
 * {@link TransactionFilterDataItem}, avoids copying if the arg is already a 
 * {@link TransactionFilter}
 * @param {(TransactionFilter|TransactionFilterDataItem)} transactionFilterDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(TransactionFilter|undefined)}
 */
export function getTransactionFilter(transactionFilterDataItem, alwaysCopy) {
    if (transactionFilterDataItem) {
        const earliestYMDDate = getYMDDate(transactionFilterDataItem.earliestYMDDate);
        const latestYMDDate = getYMDDate(transactionFilterDataItem.latestYMDDate);
        if (alwaysCopy 
         || (earliestYMDDate !== transactionFilterDataItem.earliestYMDDate)
         || (latestYMDDate !== transactionFilterDataItem.latestYMDDate)) {
            const transactionFilter = Object.assign({}, transactionFilterDataItem);
            if (earliestYMDDate) {
                transactionFilter.earliestYMDDate = earliestYMDDate;
            }
            if (latestYMDDate) {
                transactionFilter.latestYMDDate = latestYMDDate;
            }
            return transactionFilter;
        }
    }

    return transactionFilterDataItem;
}


/**
 * Retrieves a {@link TransactionFilterDataItem} representation of a 
 * {@link TransactionFilter}, avoids copying if the arg is already a 
 * {@link TransactionFilterDataItem}
 * @param {(TransactionFilter|TransactionFilterDataItem)} transactionFilter
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {(TransactionFilterDataItem|undefined)}
 */
export function getTransactionFilterDataItem(transactionFilter, alwaysCopy) {
    if (transactionFilter) {
        const earliestYMDDate = getYMDDateString(transactionFilter.earliestYMDDate);
        const latestYMDDate = getYMDDateString(transactionFilter.latestYMDDate);
        if (alwaysCopy
         || (earliestYMDDate !== transactionFilter.earliestYMDDate)
         || (latestYMDDate !== transactionFilter.latestYMDDate)) {
            const transactionFilterDataItem = Object.assign({}, transactionFilter);
            if (earliestYMDDate) {
                transactionFilterDataItem.earliestYMDDate = earliestYMDDate;
            }
            if (latestYMDDate) {
                transactionFilterDataItem.latestYMDDate = latestYMDDate;
            }
            return transactionFilterDataItem;
        }
    }

    return transactionFilter;
}


/**
 * Manages the process of filtering transactions.
 */
export class TransactionFilteringManager {
    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;

        this._onTransactionsPreAdd = this._onTransactionsPreAdd.bind(this);
        this._onTransactionsPreRemove = this._onTransactionsPreRemove.bind(this);
        this._onTransactionsPreModify = this._onTransactionsPreModify.bind(this);

        this._onTransactionsAdd = this._onTransactionsAdd.bind(this);
        this._onTransactionsRemove = this._onTransactionsRemove.bind(this);
        this._onTransactionsModify = this._onTransactionsModify.bind(this);

        this._transactionEntriesById = new Map();
        this._accountEntriesById = new Map();

        this._phraseMap = new PhraseMap();

        const entries = this._handler.getEntries();
        if (entries) {
            const { transactionEntries, accountEntries } = entries;
            if (transactionEntries) {
                transactionEntries.forEach((transactionEntry) => 
                    this._addEntry(transactionEntry));
            }
            
            if (accountEntries) {
                accountEntries.forEach((accountEntryState) => {
                    const accountEntry 
                        = this._accountEntriesById.get(accountEntryState.accountId);
                    if (accountEntry) {
                        accountEntry.isUpToDate = accountEntryState.isUpToDate;
                        accountEntry.lastChangeId = accountEntryState.lastChangeId;
                    }
                });
            }
        }
    }


    async asyncSetupForUse() {
        const transactionManager = this._accountingSystem.getTransactionManager();
        
        transactionManager.on('transactionsPreAdd', this._onTransactionsPreAdd);
        transactionManager.on('transactionsPreModify', this._onTransactionsPreModify);
        transactionManager.on('transactionsPreRemove', this._onTransactionsPreRemove);

        transactionManager.on('transactionsAdd', this._onTransactionsAdd);
        transactionManager.on('transactionsModify', this._onTransactionsModify);
        transactionManager.on('transactionsRemove', this._onTransactionsRemove);
    }


    shutdownFromUse() {
        const transactionManager = this._accountingSystem.getTransactionManager();
        
        transactionManager.off('transactionsPreAdd', this._onTransactionsPreAdd);
        transactionManager.off('transactionsPreModify', this._onTransactionsPreModify);
        transactionManager.off('transactionsPreRemove', this._onTransactionsPreRemove);

        transactionManager.off('transactionsAdd', this._onTransactionsAdd);
        transactionManager.off('transactionsModify', this._onTransactionsModify);
        transactionManager.off('transactionsRemove', this._onTransactionsRemove);
    }


    _onTransactionsPreAdd(arg) {
        this._preUpdateTransactionDataItems([], arg.newTransactionDataItems);
    }

    _onTransactionsPreRemove(arg) {
        this._preUpdateTransactionDataItems(arg.removedTransactionDataItems, []);
    }

    _onTransactionsPreModify(arg) {
        this._preUpdateTransactionDataItems(
            arg.oldTransactionDataItems, arg.newTransactionDataItems);
    }


    _onTransactionsAdd(arg) {
        this._updateTransactionDataItems([], arg.newTransactionDataItems);
    }

    _onTransactionsRemove(arg) {
        this._updateTransactionDataItems(arg.removedTransactionDataItems, []);
    }

    _onTransactionsModify(arg) {
        this._updateTransactionDataItems(
            arg.oldTransactionDataItems, arg.newTransactionDataItems);
    }


    getAccountingSystem() { return this._accountingSystem; }


    _addEntry(entry, accountEntryUpdates) {
        this._transactionEntriesById.set(entry.transactionId, entry);

        this._addEntryToPhraseMap(entry);

        const { splitAccountIds } = entry;
        if (splitAccountIds) {
            for (let i = 0; i < splitAccountIds.length; ++i) {
                this._addEntryToAccountEntry(splitAccountIds[i], entry, 
                    accountEntryUpdates);
            }
        }
    }


    _getDescriptionPhrase(description) {
        if (description) {
            return stringToPhrase(description.toUpperCase());
        }
    }


    _createTransactionEntry(transactionDataItem) {
        const entry = {
            transactionId: transactionDataItem.id,
            ymdDate: getYMDDate(transactionDataItem.ymdDate),
            splitAccountIds: [],
            transactionDataItem: transactionDataItem,
        };

        const { description, splits } = transactionDataItem;
        if (description) {
            entry.description = description;
            entry.descriptionPhrase = this._getDescriptionPhrase(description);
        }

        if (splits) {
            splits.forEach((split) => {
                entry.splitAccountIds.push(split.accountId);
            });
        }

        return entry;
    }


    _addEntryToAccountEntry(accountId, entry) {
        let accountEntry = this._accountEntriesById.get(accountId);
        if (!accountEntry) {
            accountEntry = {
                transactionEntries: new Set(),
            };
            this._accountEntriesById.set(accountId, accountEntry);
        }

        accountEntry.transactionEntries.add(entry);
    }

    _removeEntryFromAccountEntry(accountId, entry, accountEntryUpdates) {
        const accountEntry = this._accountEntriesById.get(accountId);
        if (!accountEntry) {
            return;
        }

        const { transactionEntries } = accountEntry;
        transactionEntries.delete(entry);
        if (!transactionEntries.size) {
            this._accountEntriesById.delete(accountId);
        }

        if (accountEntryUpdates) {
            accountEntryUpdates.set(accountId, accountEntry);
        }
    }

    _accountEntryToUpdate(accountEntry) {
        return {
            lastChangeId: accountEntry.lastChangeId,
            isUpToDate: accountEntry.isUpToDate,
        };
    }


    _addEntryToPhraseMap(entry, descriptionPhrase) {
        descriptionPhrase = descriptionPhrase || entry.descriptionPhrase;
        if (!descriptionPhrase || !descriptionPhrase.length) {
            return;
        }

        let phraseMapEntry = this._phraseMap.get(descriptionPhrase);
        if (!phraseMapEntry) {
            phraseMapEntry = {
                transactionEntries: new Set(),
            };
            this._phraseMap.set(descriptionPhrase, phraseMapEntry);
        }

        const { transactionEntries } = phraseMapEntry;
        transactionEntries.add(entry);
    }


    _removeEntryFromPhraseMap(entry) {
        const phraseMapEntry = this._phraseMap.get(entry.descriptionPhrase);
        if (!phraseMapEntry) {
            return;
        }

        const { transactionEntries } = phraseMapEntry;
        transactionEntries.delete(entry);
        if (!transactionEntries.size) {
            this._phraseMap.delete(entry.descriptionPhrase);
        }
    }

    _preUpdateTransactionDataItems(oldTransactionDataItems, newTransactionDataItems) {
        const transactionManager = this._accountingSystem.getTransactionManager();

        const accountIds = new Set();
        if (oldTransactionDataItems) {
            oldTransactionDataItems.forEach((transactionDataItem) => {
                const { splits } = transactionDataItem;
                splits.forEach((split) => accountIds.add(split.accountId));
            });
        }
        if (newTransactionDataItems) {
            newTransactionDataItems.forEach((transactionDataItem) => {
                const { splits } = transactionDataItem;
                splits.forEach((split) => accountIds.add(split.accountId));
            });
        }

        accountIds.forEach((accountId) => {
            const accountEntry = this._accountEntriesById.get(accountId);
            if (accountEntry && accountEntry.isUpToDate) {
                if (accountEntry.lastChangeId 
                 !== transactionManager.getAccountLastChangeId(accountId)) {
                    accountEntry.isUpToDate = false;
                }
            }
        });
    }



    _updateTransactionDataItems(oldTransactionDataItems, newTransactionDataItems) {
        const transactionEntryUpdates = new Map();
        const accountEntryUpdates = new Map();

        const entriesToRemoveById = new Map();
        oldTransactionDataItems.forEach(
            (transactionDataItem) => {
                const entry = this._transactionEntriesById.get(transactionDataItem.id);
                if (entry) {
                    entriesToRemoveById.set(transactionDataItem.id, entry);
                    transactionEntryUpdates.set(transactionDataItem.id);
                }
            }
        );

        const accountIds = new Set();

        newTransactionDataItems.forEach(
            (transactionDataItem) => {
                const newEntry = this._createTransactionEntry(transactionDataItem);

                // If we already have an entry, we just want to update it, not replace it.
                let existingEntry = this._transactionEntriesById.get(
                    transactionDataItem.id);
                if (existingEntry) {
                    entriesToRemoveById.delete(transactionDataItem.id);

                    // If the description changed we need to update the phrase map.
                    if (comparePhrases(existingEntry.descriptionPhrase,
                        newEntry.descriptionPhrase)) {
                        this._removeEntryFromPhraseMap(existingEntry);

                        this._addEntryToPhraseMap(existingEntry, 
                            newEntry.descriptionPhrase);
                    }

                    // If the account ids changed we need to update the account ids.
                    if (!deepEqual(existingEntry.splitAccountIds,
                        newEntry.splitAccountIds)) {
                        // Just remove the old ones and add the new ones,
                        // easier than sorting through the lists...
                        existingEntry.splitAccountIds.forEach((accountId) => 
                            this._removeEntryFromAccountEntry(accountId, existingEntry)
                        );

                        // Note we still stick in existingEntry...
                        newEntry.splitAccountIds.forEach((accountId) => 
                            this._addEntryToAccountEntry(accountId, existingEntry,
                                accountEntryUpdates)
                        );
                    }

                    Object.assign(existingEntry, newEntry);
                }
                else {
                    this._addEntry(newEntry, accountEntryUpdates);
                    existingEntry = newEntry;
                }

                const entryUpdate = {
                    transactionId: existingEntry.transactionId,
                    ymdDate: existingEntry.ymdDate,
                    description: existingEntry.description,
                };
                if (existingEntry.descriptionPhrase) {
                    entryUpdate.descriptionPhrase 
                        = Array.from(existingEntry.descriptionPhrase);
                }
                if (existingEntry.splitAccountIds) {
                    entryUpdate.splitAccountIds 
                        = Array.from(existingEntry.splitAccountIds);
                }

                transactionEntryUpdates.set(transactionDataItem.id, entryUpdate);


                const { splits } = transactionDataItem;
                splits.forEach((split) => accountIds.add(split.accountId));
            }
        );

        entriesToRemoveById.forEach((entry) => {
            this._removeEntryFromPhraseMap(entry);

            entry.splitAccountIds.forEach((accountId) =>
                this._removeEntryFromAccountEntry(accountId, entry, accountEntryUpdates)
            );

            this._transactionEntriesById.delete(entry.transactionId);
        });

        const transactionManager = this._accountingSystem.getTransactionManager();
        accountIds.forEach((accountId) => {
            const accountEntry = this._accountEntriesById.get(accountId);
            if (accountEntry && accountEntry.isUpToDate) {
                const changeId = transactionManager.getAccountLastChangeId(accountId);
                if (changeId !== accountEntry.lastChangeId) {
                    accountEntry.lastChangeId = changeId;
                    accountEntryUpdates.set(accountId, 
                        this._accountEntryToUpdate(accountEntry));
                }
            }
        });

        process.nextTick(async () => {
            await this._handler.asyncUpdateEntries(
                Array.from(transactionEntryUpdates.entries()),
                Array.from(accountEntryUpdates.entries()));
        });
    }


    async _asyncGetAccountIdTransactionEntries(accountId) {
        let accountEntry = this._accountEntriesById.get(accountId);
        const transactionManager = this._accountingSystem.getTransactionManager();
        const accountLastChangeId = transactionManager.getAccountLastChangeId(accountId);
        if (!accountEntry || !accountEntry.isUpToDate
         || (accountEntry.lastChangeId !== accountLastChangeId)) {
            const transactionKeys 
                = await transactionManager.asyncGetSortedTransactionKeysForAccount(
                    accountId);
            if (transactionKeys.length) {
                const transactionIds = transactionKeys.map((transactionKey) =>
                    transactionKey.id);
                const transactionDataItems
                    = await transactionManager.asyncGetTransactionDataItemsWithIds(
                        transactionIds);
                
                this._updateTransactionDataItems([], transactionDataItems);

                // Now we should have an account entry...
                accountEntry = this._accountEntriesById.get(accountId);
                if (!accountEntry) {
                    return;
                }

                accountEntry.isUpToDate = true;
            }
            else {
                // Stick in an empty account entry...
                accountEntry = {
                    transactionEntries: new Set(),
                    isUpToDate: true,
                };
                this._accountEntriesById.set(accountId, accountEntry);
            }
            accountEntry.lastChangeId = accountLastChangeId;

            await this._handler.asyncUpdateEntries([], [[
                accountId, this._accountEntryToUpdate(accountEntry), ]]);
        }

        return accountEntry.transactionEntries;
    }


    async _asyncGetTransactionEntriesForDescription(accountTransactionEntries, filter) {
        const { description } = filter;
        const descriptionPhrase = this._getDescriptionPhrase(description);
        if (!descriptionPhrase) {
            return;
        }

        if (!accountTransactionEntries.size) {
            return [];
        }

        const phraseMapEntries = this._phraseMap.findPhrasesWith(descriptionPhrase);

        const { earliestYMDDate, latestYMDDate } = filter;

        const allTransactionEntries = new Set();
        phraseMapEntries.forEach((phraseMapEntry) =>
            phraseMapEntry.value.transactionEntries.forEach((transactionEntry) =>
                allTransactionEntries.add(transactionEntry))
        );

        const transactionEntries = [];
        allTransactionEntries.forEach((transactionEntry) => {
            if (accountTransactionEntries.has(transactionEntry)) {
                if (earliestYMDDate && YMDDate.compare(
                    earliestYMDDate, transactionEntry.ymdDate) > 0) {
                    return;
                }
                if (latestYMDDate && YMDDate.compare(
                    latestYMDDate, transactionEntry.ymdDate) < 0) {
                    return;
                }
                
                transactionEntries.push(transactionEntry);
            }
        });

        return transactionEntries;
    }


    /**
     * @typedef {object} TransactionFilteringManager~FilteredTransactionKey
     * A {@link TransactionKey} with the following added:
     * @property {TransactionDataItem} transactionDataItem
     */


    /**
     * Retrieves transactions for an account after applying a filter.
     * If there is no filter to be applied then <code>undefined</code> is returned
     * to indicate no filtering has been applied.
     * @param {number} accountId
     * @param {TransactionFilter|TransactionFilterDataItem} filter 
     * @returns {TransactionFilteringManager~FilteredTransactionKey[]|undefined}
     */
    async asyncGetFilteredTransactionKeysForAccount(accountId, filter) {
        filter = getTransactionFilter(filter);

        const accountTransactionEntries = await this._asyncGetAccountIdTransactionEntries(
            accountId
        );

        let transactionEntries = await this._asyncGetTransactionEntriesForDescription(
            accountTransactionEntries, filter
        );

        let { earliestYMDDate, latestYMDDate, 
            smallestQuantityBaseValue, largestQuantityBaseValue } = filter;
        
        if (!transactionEntries) {
            if (!earliestYMDDate && !latestYMDDate
             && (smallestQuantityBaseValue === undefined)
             && (largestQuantityBaseValue === undefined)) {
                // Nothing filtered...
                return;
            }

            if (earliestYMDDate || latestYMDDate) {
                transactionEntries = [];
                accountTransactionEntries.forEach((transactionEntry) => {
                    if (earliestYMDDate && YMDDate.compare(
                        earliestYMDDate, transactionEntry.ymdDate) > 0) {
                        return;
                    }
                    if (latestYMDDate && YMDDate.compare(
                        latestYMDDate, transactionEntry.ymdDate) < 0) {
                        return;
                    }

                    transactionEntries.push(transactionEntry);
                });
            }
            else {
                transactionEntries = Array.from(accountTransactionEntries.values());
            }
        }

        if ((smallestQuantityBaseValue !== undefined) 
         || (largestQuantityBaseValue !== undefined)) {
            // Need to load any missing transaction data items...
            const transactionIdsToLoad = [];
            const transactionEntriesToLoad = [];
            transactionEntries.forEach((transactionEntry) => {
                if (!transactionEntry.transactionDataItem) {
                    transactionIdsToLoad.push(transactionEntry.transactionId);
                    transactionEntriesToLoad.push(transactionEntry);
                }
            });

            if (transactionIdsToLoad.length) {
                const transactionManager = this._accountingSystem.getTransactionManager();
                const transactionDataItems 
                    = await transactionManager.asyncGetTransactionDataItemsWithIds(
                        transactionIdsToLoad
                    );
                for (let i = 0; i < transactionDataItems.length; ++i) {
                    transactionEntriesToLoad[i].transactionDataItem
                        = transactionDataItems[i];
                }
            }

            // Now we can filter out transaction entries...
            const rawTransactionEntries = transactionEntries;
            transactionEntries = [];

            if (smallestQuantityBaseValue === undefined) {
                smallestQuantityBaseValue = -Number.MAX_VALUE;
            }
            if (largestQuantityBaseValue === undefined) {
                largestQuantityBaseValue = Number.MAX_VALUE;
            }

            rawTransactionEntries.forEach((transactionEntry) => {
                const { transactionDataItem } = transactionEntry;
                const { splits } = transactionDataItem;

                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    if (split.accountId === accountId) {
                        const { quantityBaseValue } = split;
                        if ((quantityBaseValue >= smallestQuantityBaseValue)
                         && (quantityBaseValue <= largestQuantityBaseValue)) {
                            transactionEntries.push(transactionEntry);
                            break;
                        }
                    }
                }
            });
        }

        // Now construct the return values, which are transaction entries.
        const filteredTransactionKeys = transactionEntries.map((transactionEntry) => {
            return {
                id: transactionEntry.transactionId,
                ymdDate: getYMDDate(transactionEntry.ymdDate),
                transactionDataItem: transactionEntry.transactionDataItem,
            };
        });

        // And sort oldest to newest...
        filteredTransactionKeys.sort((a, b) => YMDDate.compare(a.ymdDate, b.ymdDate));
        return filteredTransactionKeys;
    }

}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to 
 * interact with the {@link TransactionFilteringManager}.
 * @interface
 */
export class TransactionFilteringHandler {
    /**
     * Retrieves an array containing all the auto-complete split data items. 
     * The data items are presumed to already be loaded when the 
     * {@link TransactionFilteringManager} is constructed.
     * @returns {ReminderDataItem[]}
     */
    getEntries() {
        throw Error(
            'TransactionFilteringHandler.getEntries()'
                + ' abstract method!');
    }


    // transactionIdAndEntryPairs, accountIdAndEntryPairs
    async asyncUpdateEntries(transactionIdAndEntryPairs, accountIdAndEntryPairs) {
        throw Error(
            // eslint-disable-next-line max-len
            'TransactionFilteringHandler.asyncUpdateEntries()' 
                + ' abstract method!');
    }

}


export class InMemoryTransactionFilteringHandler extends TransactionFilteringHandler {
    constructor() {
        super();

        this._transactionEntriesById = new Map();
        this._accountEntriesById = new Map();

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


    toJSON() {
        return {
            transactionEntries: Array.from(this._transactionEntriesById.values()),
            accountEntries: Array.from(this._accountEntriesById.values()),
        };
    }

    fromJSON(json) {
        this._transactionEntriesById.clear();
        this._accountEntriesById.clear();

        const { transactionEntries, accountEntries } = json;
        if (transactionEntries) {
            transactionEntries.forEach((entry) => {
                this._entriesByTransactionId.set(entry.transactionId, entry);
            });
        }
        if (accountEntries) {
            accountEntries.forEach((entry) => {
                this._entriesByTransactionId.set(entry.accountId, entry);
            });
        }

        this.markChanged();
    }


    getEntries() {
        return {
            transactionEntries: Array.from(this._transactionEntriesById.values()),
            accountEntries: Array.from(this._accountEntriesById.values()),
        };
    }


    async asyncUpdateEntries(transactionIdAndEntryPairs, accountIdAndEntryPairs) {
        transactionIdAndEntryPairs.forEach(([transactionId, transactionEntry]) => {
            if (!transactionEntry) {
                this._transactionEntriesById.delete(transactionId);
            }
            else {
                this._transactionEntriesById.set(transactionId, transactionEntry);
            }
        });

        accountIdAndEntryPairs.forEach(([accountId, accountEntry]) => {
            if (!accountEntry) {
                this._accountEntriesById.delete(accountId);
            }
            else {
                this._accountEntriesById.set(accountId, accountEntry);
                accountEntry.accountId = accountId;
            }
        });

        this.markChanged();
    }
}