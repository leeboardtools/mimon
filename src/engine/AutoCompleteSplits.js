import { StringTree } from '../util/StringTree';
import { cleanSpaces } from '../util/StringUtils';

/**
 * What's returned by {@link AutoCompleteSplitsManager#getSplitInfos}
 * @typedef {object}    AutoCompleteSplitsInfo
 * @property {string}   description
 * @property {number}   transactionId
 * @property {number}   splitIndex
 */

/**
 * @typedef {object}    AutoCompleteSplitsManagerEntry
 * @protected
 * @property {string}   description
 * @property {number}   transactionId
 * @property {number[]} accountIds
 */

function transactionDataItemToEntry(transactionDataItem) {
    if (!transactionDataItem.description) {
        return;
    }

    const result = {
        description: transactionDataItem.description,
        transactionId: transactionDataItem.id,
    };

    const { splits } = transactionDataItem;
    result.accountIds = splits.map((split) => split.accountId);

    return result;
}

function cleanupDescription(description) {
    if (description) {
        return cleanSpaces(description).toUpperCase();
    }
}

/**
 * Manager for auto-completing splits.
 */
export class AutoCompleteSplitsManager {
    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;

        this._onTransactionsAdd = this._onTransactionsAdd.bind(this);
        this._onTransactionsRemove = this._onTransactionsRemove.bind(this);
        this._onTransactionsModify = this._onTransactionsModify.bind(this);
        
        // There are two key collections, both ultimately holding 
        // AutoCompleteSplitsManagerEntry objects.
        //
        // this._entriesByTransactionId is the master database, the keys are
        // the transaction ids, the values are the AutoCompleteSplitsManagerEntry objects.
        // 
        // this._stringTree is the lookup index. Each item in the tree is an
        // object with a treeItems property, which is an array of the
        // AutoCompleteSplitsManagerEntry with the description of the item.
        this._entriesByTransactionId = new Map();

        // No need to make case insensitive, we condition the descriptions
        // before adding them to the tree...
        this._stringTree = new StringTree();
    }

    async asyncSetupForUse() {
        const transactionManager = this._accountingSystem.getTransactionManager();
        transactionManager.on('transactionsAdd', this._onTransactionsAdd);
        transactionManager.on('transactionsModify', this._onTransactionsModify);
        transactionManager.on('transactionsRemove', this._onTransactionsRemove);
    }

    shutdownFromUse() {
        const transactionManager = this._accountingSystem.getTransactionManager();
        transactionManager.off('transactionsAdd', this._onTransactionsAdd);
        transactionManager.off('transactionsModify', this._onTransactionsModify);
        transactionManager.off('transactionsRemove', this._onTransactionsRemove);
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


    _updateTransactionDataItems(oldTransactionDataItems, newTransactionDataItems) {
        const entriesToRemove = [];
        oldTransactionDataItems.forEach(
            (transactionDataItem) => {
                const entry = transactionDataItemToEntry(transactionDataItem);
                if (entry) {
                    entriesToRemove.push(entry);
                }
            }
        );

        const entriesToAdd = [];
        newTransactionDataItems.forEach(
            (transactionDataItem) => {
                const entry = transactionDataItemToEntry(transactionDataItem);
                if (entry) {
                    entriesToAdd.push(entry);
                }
            }
        );

        entriesToRemove.forEach((entry) => {
            const { transactionId } = entry;
            const treeEntry = this._stringTree.get(entry.description);
            if (treeEntry) {
                const { treeItems } = treeEntry;
                for (let i = 0; i < treeItems.length; ++i) {
                    if (treeItems[i].transactionId === transactionId) {
                        treeItems.splice(i, 1);
                        break;
                    }
                }
                if (!treeItems.length) {
                    this._stringTree.delete(entry.description);
                }
            }
            this._entriesByTransactionId.delete(transactionId);
        });

        entriesToAdd.forEach((entry) => {
            let { transactionId, description } = entry;
            description = cleanupDescription(description);
            let treeEntry = this._stringTree.get(description);
            if (!treeEntry) {
                treeEntry = {
                    treeItems: [],
                };
                this._stringTree.set(description, treeEntry);
            }
            const { treeItems } = treeEntry;
            treeItems.push(entry);
            this._entriesByTransactionId.set(transactionId, entry);
        });

        process.nextTick(async () => {
            await this._handler.asyncUpdateAutoCompleteEntries(
                entriesToRemove, entriesToAdd);
        });
    }


    getAccountingSystem() { return this._accountingSystem; }

    /*
    clearSplitInfos() {

    }
    */

    /**
     * Retrieves an array containing the {@link AutoCompleteSplitsInfo}s
     * for transactions with splits with the given account id and description
     * containing the partial description.
     * @param {number} accountId 
     * @param {string} partialDescription 
     * @returns {AutoCompleteSplitsInfo[]}
     */
    getSplitInfos(accountId, partialDescription) {
        let splitInfos = [];

        partialDescription = cleanupDescription(partialDescription);
        if (!partialDescription) {
            // Don't want to return everything!
            return splitInfos;
        }

        const entries = this._stringTree.entriesStartingWith(partialDescription);
        if (entries) {
            // Look for the entries with the accountId...
            for (let treeEntry of entries) {
                for (let treeItem of treeEntry.treeItems) {
                    const { accountIds } = treeItem;
                    for (let i = 0; i < accountIds.length; ++i) {
                        if (accountIds[i] === accountId) {
                            splitInfos.push({
                                description: treeItem.description,
                                transactionId: treeItem.transactionId,
                                splitIndex: i,
                            });
                        }
                    }
                }
            }
        }

        return splitInfos;
    }

}


export class AutoCompleteSplitsHandler {
    /**
     * Retrieves an array containing all the auto-complete split data items. 
     * The data items are presumed to already be loaded when the 
     * {@link AutoCompleteSplitsManager} is constructed.
     * @returns {ReminderDataItem[]}
     */
    getAutoCompleteDataItems() {
        throw Error(
            'AutoCompleteSplitsHandler.getAutoCompleteDataItems() abstract method!');
    }


    async asyncUpdateAutoCompleteEntries(removedEntries, addedSplitsEntries) {
        throw Error(
            // eslint-disable-next-line max-len
            'AutoCompleteSplitsHandler.asyncUpdateAutoCompleteEntries() abstract method!');
    }
}


export class InMemoryAutoCompleteSplitsHandler extends AutoCompleteSplitsHandler {
    constructor(autoCompleteSplitsIems) {
        super();

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


    toJSON() {

    }

    fromJSON(json) {

    }

    async asyncUpdateAutoCompleteEntries(removedEntries, addedEntries) {
        if (!removedEntries.length && !addedEntries.length) {
            return;
        }

        this.markChanged();
    }
}