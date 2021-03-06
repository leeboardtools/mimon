import { AccountingFile, AccountingFileFactory } from './AccountingFile';
import { asyncAllFilesExist, asyncFileExists, 
    asyncDirExists, asyncCanCreateDir } from '../util/Files';
import { userMsg } from '../util/UserMessages';
import * as JGZ from '../util/JSONGzipFiles';
import * as FA from '../util/FileActions';
import { FileBackups } from '../util/FileBackups';
import { InMemoryAccountsHandler } from './Accounts';
import { InMemoryLotsHandler } from './Lots';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryPricesHandler } from './Prices';
import { TransactionsHandlerImplBase } from './Transactions';
import { InMemoryRemindersHandler } from './Reminders';
import { InMemoryAutoCompleteSplitsHandler } from './AutoCompleteSplits';
import { UndoHandler } from '../util/Undo';
import { ActionsHandler } from '../util/Actions';
import { AccountingSystem, InMemoryAccountingSystemHandler } from './AccountingSystem';
import { userError } from '../util/UserMessages';
import { GroupedItemManager, ItemGroups } from '../util/GroupedItemManager';
import { getYMDDateString } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import * as path from 'path';
import { promises as fsPromises } from 'fs';


const FILE_EXT = '.gz';
const FILE_SUFFIX = '.json';

const LEDGER_FILE_PREFIX = 'Ledger';
const LEDGER_FILE_NAME = LEDGER_FILE_PREFIX + FILE_SUFFIX + FILE_EXT;

const JOURNAL_FILES_PREFIX = 'Journal';
const JOURNAL_SUMMARY_FILE_NAME = JOURNAL_FILES_PREFIX + FILE_SUFFIX + FILE_EXT;

const PRICES_FILE_PREFIX = 'Prices';
const PRICES_FILE_NAME = PRICES_FILE_PREFIX + FILE_SUFFIX + FILE_EXT;

const HISTORY_FILES_PREFIX = 'History';
const HISTORY_SUMMARY_FILE_NAME = HISTORY_FILES_PREFIX + FILE_SUFFIX + FILE_EXT;


const FILE_EXT_UPPER_CASE = FILE_EXT.toUpperCase();

const LEDGER_TAG = 'mimon-ledger';
const JOURNAL_SUMMARY_TAG = 'mimon-journalSummary';
const JOURNAL_TRANSACTIONS_TAG = 'mimon-journalTransactions';
const PRICES_TAG = 'prices-ledger';
const HISTORY_SUMMARY_TAG = 'mimon-historySummary';
const HISTORY_GROUPS_TAG = 'mimon-historyGroups';

///
// The JSONGzip accounting file system design:
//
// Folder based.
// Has the following files:
//  - Ledger
//      - Holds the:
//          - accounts (manager)
//          - priced items (manager)
//          - lots (manager)
//
//  - Journal
//      - Two sets of files:
//          - Single summary file holds summary info for all the transactions.
//          - Transaction files hold transactions grouped by year or quarter.
//
//  - Prices
//      - Each priced item will have its own file holding the prices.
//
//  - History
//      - Need to think about this a bit more.



/**
 * The accounting system handler implementation.
 */
class JSONGzipAccountingSystemHandler extends InMemoryAccountingSystemHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}


/**
 * The accounts handler implementation.
 */
class JSONGzipAccountsHandler extends InMemoryAccountsHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}

/**
 * The lots handler implementation.
 */
class JSONGzipLotsHandler extends InMemoryLotsHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}

/**
 * The priced items handler implementation.
 */
class JSONGzipPricedItemsHandler extends InMemoryPricedItemsHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}

/**
 * The reminders handler implementation.
 */
class JSONGzipRemindersHandler extends InMemoryRemindersHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}

/**
 * The auto-complete splits handler implementation.
 */
class JSONGzipAutoCompleteSplitsHandler extends InMemoryAutoCompleteSplitsHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}


/**
 * The undo data items handler implementation.
 */
class JSONGzipUndoHandler extends UndoHandler {
    constructor(accountingFile, dataItemHandler) {
        super();

        this._accountingFile = accountingFile;

        this._sortedUndoIds = new SortedArray((a, b) => a - b);

        this._dataItemHandler = dataItemHandler;
    }

    itemTagFromItem(item) {
        const groupKey = Math.floor(item.id / this._idsPerGroup);
        return { id: item.id, groupKey: groupKey, };
    }


    getItemGroups() {
        return this._itemGroups.getItemGroups();
    }

    
    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            undoIds: Array.from(this._sortedUndoIds.getValues()),
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._sortedUndoIds.clear();
        if (json.undoIds) {
            json.undoIds.forEach((id) => {
                this._sortedUndoIds.add(id);
            });
        }
    }


    getUndoIds() {
        return Array.from(this._sortedUndoIds.getValues());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncGetUndoDataItemWithId(undoId) {
        return await this._dataItemHandler.asyncGetUndoDataItemWithId(undoId);
    }

    async asyncAddUndoDataItem(undoDataItem, idGeneratorOptions) {
        this._idGeneratorOptions = idGeneratorOptions;

        this._sortedUndoIds.add(undoDataItem.id);
        await this._dataItemHandler.asyncUpdateUndoDataItem(undoDataItem);

    }

    async asyncDeleteUndoDataItems(undoIds) {
        if (undoIds && undoIds.length) {
            undoIds.forEach((id) => this._sortedUndoIds.delete(id));
            await this._dataItemHandler.asyncRemoveUndoDataItems(undoIds);
        }
    }
}



/**
 * The actions handler implementation.
 */
class JSONGzipActionsHandler extends ActionsHandler {
    constructor(accountingFile, dataItemHandler) {
        super();

        this._accountingFile = accountingFile;
        this._dataItemHandler = dataItemHandler;

        this._appliedActionItemIds = [];
        this._undoneActions = [];
    }

    toJSON() {
        return {
            appliedActionItemIds: Array.from(this._appliedActionItemIds),
        };
    }

    fromJSON(json) {
        this._appliedActionItemIds = json.appliedActionItemIds;
        this._undoneActions.length = 0;
    }


    getAppliedActionCount() {
        return this._appliedActionItemIds.length;
    }

    getUndoneActionCount() {
        return this._undoneActions.length;
    }


    async asyncGetAppliedActionEntryAtIndex(index) {
        const id = this._appliedActionItemIds[index];
        return this._dataItemHandler.asyncGetAppliedActionEntryWithId(id);
    }
    

    async asyncGetUndoneActionAtIndex(index) {
        return this._undoneActions[index];
    }
    

    async asyncAddAppliedActionEntry(actionEntry) {
        const id = await this._dataItemHandler.asyncAddAppliedActionEntry(actionEntry);
        this._appliedActionItemIds.push(id);
    }


    async asyncAddUndoneAction(action) {
        this._undoneActions.push(action);
    }


    async asyncRemoveLastAppliedActionEntries(count) {
        const { _appliedActionItemIds } = this;
        const newEndIndex = _appliedActionItemIds.length - count;
        const idsToRemove = _appliedActionItemIds.slice(newEndIndex - count + 1);
        await this._dataItemHandler.asyncRemoveAppliedActionEntries(idsToRemove);
        _appliedActionItemIds.splice(newEndIndex);
    }


    async asyncRemoveLastUndoneActions(count) {
        const { _undoneActions } = this;
        _undoneActions.splice(_undoneActions.length - count);
    }
}



/**
 * The manages the history handlers, which are {@link JSONGzipUndoHandler} and
 * {@link JSONGzipActionsHandler}.
 */
class JSONGzipHistoryHandlers {
    constructor(accountingFile, asyncLoadGroupHistories) {

        this._accountingFile = accountingFile;

        this._idsPerGroup = (accountingFile._isTest) ? 20 : 1000;
        this.itemTagFromItem = this.itemTagFromItem.bind(this);

        this._itemGroups = new ItemGroups({
            asyncLoadGroupItems: asyncLoadGroupHistories,
        });
        this._itemManager = new GroupedItemManager({
            itemTagFromItem: this.itemTagFromItem,
            asyncRetrieveItemsFromGroup: this._itemGroups.asyncRetrieveItemsFromGroup,
            asyncUpdateItemsInGroup: this._itemGroups.asyncUpdateItemsInGroup,
    
        });


        this._undoHandler = new JSONGzipUndoHandler(accountingFile, this);
        this._actionsHandler = new JSONGzipActionsHandler(accountingFile, this);

        this._lastChangeId = 0;
    }

    itemTagFromItem(item) {
        const groupKey = Math.floor(item.id.slice(1) / this._idsPerGroup);
        return { id: item.id, groupKey: groupKey, };
    }


    getItemGroups() {
        return this._itemGroups.getItemGroups();
    }


    toJSON() {
        return {
            itemTags: this._itemManager.itemTagsToJSON(),
            undoHandler: this._undoHandler.toJSON(),
            actionsHandler: this._actionsHandler.toJSON(),
        };
    }


    fromJSON(json) {
        this._itemManager.itemTagsFromJSON(json.itemTags);
        this._undoHandler.fromJSON(json.undoHandler);
        this._actionsHandler.fromJSON(json.actionsHandler);
    }


    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }


    undoIdToItemId(undoId) {
        return 'U' + undoId;
    }

    appliedActionIdToItemId(appliedActionId) {
        return 'A' + appliedActionId;
    }


    async asyncGetUndoDataItemWithId(undoId) {
        const item = await this._itemManager.asyncGetItemsWithIds(
            this.undoIdToItemId(undoId));
        return item.undoDataItem;
    }


    async asyncUpdateUndoDataItem(undoDataItem) {
        const item = {
            id: this.undoIdToItemId(undoDataItem.id),
            undoDataItem: undoDataItem,
        };
        await this._itemManager.asyncUpdateItems(item);
        this.markChanged();
    }


    async asyncRemoveUndoDataItems(undoIds) {
        const itemIds = undoIds.map((id) => this.undoIdToItemId(id));
        await this._itemManager.asyncRemoveItems(itemIds);
        this.markChanged();
    }


    async asyncGetAppliedActionEntryWithId(id) {
        this._itemGroups.isDebug = this._itemManager.isDebug = true;
        const item = await this._itemManager.asyncGetItemsWithIds(
            this.appliedActionIdToItemId(id));
        this._itemGroups.isDebug = this._itemManager.isDebug = false;
        return item.actionEntry;
    }

    async asyncAddAppliedActionEntry(actionEntry) {
        const item = {
            id: this.appliedActionIdToItemId(actionEntry.undoId),
            actionEntry: actionEntry,
        };
        this._itemManager.asyncUpdateItems(item);

        this.markChanged();
        return actionEntry.undoId;
    }

    async asyncRemoveAppliedActionEntries(ids) {
        const itemIds = ids.map((id) => this.appliedActionIdToItemId(id));
        await this._itemManager.asyncRemoveItems(itemIds);

        this.markChanged();
    }
}



function getYMDYearKey(ymdDate) {
    ymdDate = getYMDDateString(ymdDate);
    if (ymdDate) {
        const index = ymdDate.indexOf('-');
        if (index >= 0) {
            ymdDate = ymdDate.slice(0, index);
        }
        else {
            ymdDate = undefined;
        }
    }
    return ymdDate || '_X_';
}



/**
 * The prices handler implementation.
 */
class JSONGzipPricesHandler extends InMemoryPricesHandler {
    constructor(accountingFile) {
        super();
        this._accountingFile = accountingFile;
    }
}

/**
 * The transactions handler implementation.
 */
class JSONGzipTransactionsHandler extends TransactionsHandlerImplBase {
    constructor(accountingFile, asyncLoadGroupTransactions) {
        super();

        this._accountingFile = accountingFile;

        this.itemTagFromItem = this.itemTagFromItem.bind(this);

        this._itemGroups = new ItemGroups({
            asyncLoadGroupItems: asyncLoadGroupTransactions,
        });
        this._itemManager = new GroupedItemManager({
            itemTagFromItem: this.itemTagFromItem,
            asyncRetrieveItemsFromGroup: this._itemGroups.asyncRetrieveItemsFromGroup,
            asyncUpdateItemsInGroup: this._itemGroups.asyncUpdateItemsInGroup,
    
        });

        this._lastChangeId = 0;
    }

    itemTagFromItem(item) {
        const groupKey = getYMDYearKey(item.ymdDate);
        return { id: item.id, groupKey: groupKey, };
    }


    getItemGroups() {
        return this._itemGroups.getItemGroups();
    }


    toJSON() {
        return {
            entries: this.entriesToJSON(),
            idGeneratorOptions: this._idGeneratorOptions,
            itemTags: this._itemManager.itemTagsToJSON(),
        };
    }


    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;
        this._itemManager.itemTagsFromJSON(json.itemTags);
        this.entriesFromJSON(json.entries);
    }


    getLastChangeId() { 
        return this._lastChangeId; 
    }

    markChanged() { 
        ++this._lastChangeId; 
    }


    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncGetTransactionDataItemsWithIds(ids) {
        return await this._itemManager.asyncGetItemsWithIds(ids);
    }

    async asyncUpdateTransactionDataItemsAndEntries(
        entryDataItemUpdates, idGeneratorOptions) {

        this._idGeneratorOptions = idGeneratorOptions || this._idGeneratorOptions;
        const result = [];

        const updatedItems = [];

        const idsToRemove = [];
        const removeIndices = [];

        for (let i = 0; i < entryDataItemUpdates.length; ++i) {
            let [, oldEntry, dataItem] = entryDataItemUpdates[i];
            const id = (dataItem) ? dataItem.id : oldEntry.id;
            if (dataItem) {
                // New or remove.
                updatedItems.push(dataItem);
                result[i] = dataItem;
            }
            else {
                // Delete.
                idsToRemove.push(id);
                removeIndices.push(i);
            }
        }

        if (updatedItems.length) {
            await this._itemManager.asyncUpdateItems(updatedItems);
        }

        if (idsToRemove.length) {
            const removedItems = await this._itemManager.asyncGetItemsWithIds(
                idsToRemove);
            for (let i = 0; i < removeIndices.length; ++i) {
                result[removedItems[i]] = removedItems[i];
            }
            await this._itemManager.asyncRemoveItems(idsToRemove);

            this.markChanged();
        }

        return result;
    }
}


/**
 * Handles the ledger file. The ledger file stores data items for the following managers:
 * <li>{@link AccountManager}
 * <li>{@link PricedItemManager}
 * <li>{@link LotManager}
 */
class JSONGzipLedgerFile {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._pathName = JSONGzipLedgerFile.buildLedgerPathName(
            accountingFile.getPathName());

        this._accountingSystemHandler = accountingFile._accountingSystemHandler;
        this._accountsHandler = accountingFile._accountsHandler;
        this._pricedItemsHandler = accountingFile._pricedItemsHandler;
        this._remindersHandler = accountingFile._remindersHandler;
        this._autoCompleteSplitsHandler = accountingFile._autoCompleteSplitsHandler;
        this._lotsHandler = accountingFile._lotsHandler;
    }

    static buildLedgerPathName(pathName) {
        return path.join(pathName, LEDGER_FILE_NAME);
    }


    cleanIsModified() {
        this._accountingSystemChangeId = this._accountingSystemHandler.getLastChangeId();
        this._accountsChangeId = this._accountsHandler.getLastChangeId();
        this._pricedItemsChangeId = this._pricedItemsHandler.getLastChangeId();
        this._remindersChangeId = this._remindersHandler.getLastChangeId();
        this._autoCompleteSplitsChangeId 
            = this._autoCompleteSplitsHandler.getLastChangeId();
        this._lotsChangeId = this._lotsHandler.getLastChangeId();
    }

    isModified() {
        return (this._accountingSystemChangeId 
                !== this._accountingSystemHandler.getLastChangeId())
            || (this._accountsChangeId !== this._accountsHandler.getLastChangeId())
            || (this._pricedItemsChangeId !== this._pricedItemsHandler.getLastChangeId())
            || (this._remindersChangeId !== this._remindersHandler.getLastChangeId())
            || (this._autoCompleteSplitsChangeId 
                !== this._autoCompleteSplitsHandler.getLastChangeId())
            || (this._lotsChangeId !== this._lotsHandler.getLastChangeId());
    }


    async asyncRead() {
        const pathName = this._pathName;
        const json = await JGZ.readFromFile(pathName);
        if (json.tag !== LEDGER_TAG) {
            throw userError('JSONGzipAccountingFile-ledger_tag_missing', 
                pathName);
        }

        if (!json.accountsHandler) {
            throw userError('JSONGzipAccountingFile-accountsHandler_tag_missing', 
                pathName);
        }
        if (!json.pricedItemsHandler) {
            throw userError('JSONGzipAccountingFile-pricedItemsHandler_tag_missing', 
                pathName);
        }
        if (!json.lotsHandler) {
            throw userError('JSONGzipAccountingFile-lotsHandler_tag_missing', 
                pathName);
        }
        if (!json.remindersHandler) {
            throw userError('JSONGzipAccountingFile-remindersHandler_tag_missing', 
                pathName);
        }
        /*
        if (!json.autoCompleteSplitsHandlerHandler) {
            throw userError(
                'JSONGzipAccountingFile-autoCompleteSplitsHandler_tag_missing', 
                pathName);
        }
        */

        this._accountingSystemHandler.fromJSON(json.accountingSystemHandler);
        this._accountsHandler.fromJSON(json.accountsHandler);
        this._pricedItemsHandler.fromJSON(json.pricedItemsHandler);
        this._remindersHandler.fromJSON(json.remindersHandler);
        this._lotsHandler.fromJSON(json.lotsHandler);

        this._autoCompleteSplitsHandler.fromJSON(
            json.autoCompleteSplitsHandler || {});

        this.cleanIsModified();

        return json.stateId;
    }


    async _asyncWriteLedgerFile(stateId) {
        const json = {
            tag: LEDGER_TAG,
            fileVersion: '1.0',
            stateId: stateId,
            accountingSystemHandler: this._accountingSystemHandler.toJSON(),
            accountsHandler: this._accountsHandler.toJSON(),
            pricedItemsHandler: this._pricedItemsHandler.toJSON(),
            lotsHandler: this._lotsHandler.toJSON(),
            remindersHandler: this._remindersHandler.toJSON(),
            autoCompleteSplitsHandler: this._autoCompleteSplitsHandler.toJSON(),
        };

        // Write out the file...
        await JGZ.writeToFile(json, this._pathName);
    }


    async asyncCreateWriteFileActions(stateId) {
        return [
            new FA.ReplaceFileAction(this._pathName,
                {
                    applyCallback: (pathName) => this._asyncWriteLedgerFile(stateId),
                })
        ];
    }


    writeCompleted() {
        this.cleanIsModified();
    }

    async asyncClose() {
        this._accountingSystemHandler = undefined;
        this._accountsHandler = undefined;
        this._pricedItemsHandler = undefined;
        this._remindersHandler = undefined;
        this._autoCompleteSplitsHandler = undefined;
        this._lotsHandler = undefined;
        this._accountingFile = undefined;
    }
}


/**
 * Handles the journal files.
 */
class JSONGzipJournalFiles {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._journalSummaryPathName = JSONGzipJournalFiles.buildJournalSummaryPathName(
            accountingFile.getPathName());

        this._transactionsHandler = accountingFile._transactionsHandler;

        this._groupKeysLastChangeIds = new Map();
    }

    
    static buildJournalSummaryPathName(pathName) {
        return path.join(pathName, JOURNAL_SUMMARY_FILE_NAME);
    }

    static buildJournalGroupPathName(pathName, groupKey) {
        return path.join(pathName, 
            JOURNAL_FILES_PREFIX + groupKey + FILE_SUFFIX + FILE_EXT);
    }
    
    cleanIsModified() {
        this._transactionsChangeId = this._transactionsHandler.getLastChangeId();
    }

    
    isModified() {
        return (this._transactionsChangeId 
            !== this._transactionsHandler.getLastChangeId());
    }


    async asyncLoadGroupTransactions(groupKey, groupItems) {
        const pathName = JSONGzipJournalFiles.buildJournalGroupPathName(
            this._accountingFile.getPathName(), groupKey);
        let json;
        try {
            json = await JGZ.readFromFile(pathName);
        }
        catch (e) {
            // For now don't do anything.
            return;
        }

        if (json.tag !== JOURNAL_TRANSACTIONS_TAG) {
            throw userError('JSONGzipAccountingFile-journal_transactions_tag_missing', 
                pathName);
        }
        if (!json.transactions) {
            throw userError('JSONGzipAccountingFile-journal_transactions_missing', 
                pathName);
        }

        const { itemsById } = groupItems;
        json.transactions.forEach((transaction) => {
            itemsById.set(transaction.id, transaction);
        });

        this._groupKeysLastChangeIds.set(groupKey, groupItems.lastChangeId);
    }


    async _asyncWriteGroupItems(pathName, groupKey, groupItems) {
        const json = {
            tag: JOURNAL_TRANSACTIONS_TAG,
            fileVersion: '1.0',
            transactions: Array.from(groupItems.itemsById.values()),
        };

        // Write out the file...
        await JGZ.writeToFile(json, pathName);

        this._groupKeysLastChangeIds.set(groupKey, groupItems.lastChangeId);
    }

    
    async asyncRead() {
        const pathName = this._journalSummaryPathName;
        const json = await JGZ.readFromFile(pathName);
        if (json.tag !== JOURNAL_SUMMARY_TAG) {
            throw userError('JSONGzipAccountingFile-journal_summary_tag_missing', 
                pathName);
        }

        if (!json.transactionsHandler) {
            throw userError('JSONGzipAccountingFile-transactionsHandler_tag_missing', 
                pathName);
        }

        this._transactionsHandler.fromJSON(json.transactionsHandler);

        this.cleanIsModified();

        return json.stateId;
    }


    async _asyncWriteJournalSummaryFile(stateId) {
        const json = {
            tag: JOURNAL_SUMMARY_TAG,
            fileVersion: '1.0',
            stateId: stateId,
            transactionsHandler: this._transactionsHandler.toJSON(),
        };

        // Write out the file...
        await JGZ.writeToFile(json, this._journalSummaryPathName);
    }


    async asyncCreateWriteFileActions(stateId) {
        const fileActions = [
            new FA.ReplaceFileAction(this._journalSummaryPathName,
                {
                    applyCallback: (pathName) => 
                        this._asyncWriteJournalSummaryFile(stateId),
                })
        ];

        const itemGroups = this._transactionsHandler.getItemGroups();

        itemGroups.forEach((groupItems, groupKey) => {
            const lastChangeId = this._groupKeysLastChangeIds.get(groupKey);
            if (lastChangeId !== groupItems.lastChangeId) {
                const pathName = JSONGzipJournalFiles.buildJournalGroupPathName(
                    this._accountingFile.getPathName(), groupKey);
                fileActions.push(
                    new FA.ReplaceFileAction(pathName,
                        {
                            applyCallback: (pathName) => 
                                this._asyncWriteGroupItems(pathName, groupKey, 
                                    groupItems),
                        })
                );
            }
        });

        return fileActions;
    }


    writeCompleted() {
        this.cleanIsModified();
    }


    async asyncClose() {
        this._transactionsHandler = undefined;
        this._accountingFile = undefined;
    }
}


/**
 * Handles the prices file
 */
class JSONGzipPricesFile {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._pathName = JSONGzipPricesFile.buildPricesPathName(
            accountingFile.getPathName());

        this._pricesHandler = accountingFile._pricesHandler;
    }

    static buildPricesPathName(pathName) {
        return path.join(pathName, PRICES_FILE_NAME);
    }

    cleanIsModified() {
        this._pricesChangeId = this._pricesHandler.getLastChangeId();
    }

    isModified() {
        return this._pricesChangeId !== this._pricesHandler.getLastChangeId();
    }

    async asyncRead() {
        const pathName = this._pathName;
        const json = await JGZ.readFromFile(pathName);
        if (json.tag !== PRICES_TAG) {
            throw userError('JSONGzipAccountingFile-prices_tag_missing', 
                pathName);
        }

        if (!json.pricesHandler) {
            throw userError('JSONGzipAccountingFile-pricesHandler_tag_missing', 
                pathName);
        }

        this._pricesHandler.fromJSON(json.pricesHandler);

        this.cleanIsModified();

        return json.stateId;
    }


    async _asyncWritePricesFile(stateId) {
        const json = {
            tag: PRICES_TAG,
            fileVersion: '1.0',
            stateId: stateId,
            pricesHandler: this._pricesHandler.toJSON(),
        };

        // Write out the file...
        await JGZ.writeToFile(json, this._pathName);
    }

    async asyncCreateWriteFileActions(stateId) {
        return [
            new FA.ReplaceFileAction(this._pathName,
                {
                    applyCallback: (pathName) => this._asyncWritePricesFile(stateId),
                })
        ];
    }

    writeCompleted() {
        this.cleanIsModified();
    }

    async asyncClose() {
        this._accountingFile = undefined;
        this._pricesHandler = undefined;
    }
}


/**
 * Handles the history files. The history consists of the {@link UndoDataItem}s from the
 * {@link UndoHandler} and the {@link ActionDataItem}s from the {@link ActionsHandler}.
 */
class JSONGzipHistoryFiles {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._historySummaryPathName = JSONGzipHistoryFiles.buildHistorySummaryPathName(
            accountingFile.getPathName());

        this._historiesHandler = accountingFile._historiesHandler;
        this._undoHandler = accountingFile._undoHandler;
        this._actionsHandler = accountingFile._actionsHandler;

        this._groupKeysLastChangeIds = new Map();
    }

    
    static buildHistorySummaryPathName(pathName) {
        return path.join(pathName, HISTORY_SUMMARY_FILE_NAME);
    }

    static buildHistoryGroupPathName(pathName, groupKey) {
        return path.join(pathName, 
            HISTORY_FILES_PREFIX + groupKey + FILE_SUFFIX + FILE_EXT);
    }
    
    cleanIsModified() {
        this._lastChangeId = this._historiesHandler.getLastChangeId();
    }

    
    isModified() {
        return (this._lastChangeId !== this._historiesHandler.getLastChangeId());
    }

    
    async asyncLoadGroupHistories(groupKey, groupItems) {
        const pathName = JSONGzipHistoryFiles.buildHistoryGroupPathName(
            this._accountingFile.getPathName(), groupKey);
        let json;
        try {
            json = await JGZ.readFromFile(pathName);
        }
        catch (e) {
            // For now don't do anything.
            return;
        }

        if (json.tag !== HISTORY_GROUPS_TAG) {
            throw userError('JSONGzipAccountingFile-history_groups_tag_missing', 
                pathName);
        }
        if (!json.historyDataItems) {
            throw userError('JSONGzipAccountingFile-history_data_items_missing', 
                pathName);
        }

        const { itemsById } = groupItems;
        json.historyDataItems.forEach((dataItem) => {
            itemsById.set(dataItem.id, dataItem);
        });

        this._groupKeysLastChangeIds.set(groupKey, groupItems.lastChangeId);
    }


    async _asyncWriteGroupItems(pathName, groupKey, groupItems) {
        const json = {
            tag: HISTORY_GROUPS_TAG,
            fileVersion: '1.0',
            historyDataItems: Array.from(groupItems.itemsById.values()),
        };

        // Write out the file...
        await JGZ.writeToFile(json, pathName);

        this._groupKeysLastChangeIds.set(groupKey, groupItems.lastChangeId);
    }


    async asyncRead() {
        const pathName = this._historySummaryPathName;
        const json = await JGZ.readFromFile(pathName);
        if (json.tag !== HISTORY_SUMMARY_TAG) {
            throw userError('JSONGzipAccountingFile-history_summary_tag_missing', 
                pathName);
        }

        if (!json.historiesHandler) {
            throw userError('JSONGzipAccountingFile-historiesHandler_tag_missing', 
                pathName);
        }
        this._historiesHandler.fromJSON(json.historiesHandler);

        this.cleanIsModified();

        return json.stateId;
    }


    async _asyncWriteHistorySummaryFile(stateId) {
        const json = {
            tag: HISTORY_SUMMARY_TAG,
            fileVersion: '1.0',
            stateId: stateId,
            historiesHandler: this._historiesHandler.toJSON(),
        };

        // Write out the file...
        await JGZ.writeToFile(json, this._historySummaryPathName);
    }


    async asyncCreateWriteFileActions(stateId) {
        const fileActions = [
            new FA.ReplaceFileAction(this._historySummaryPathName,
                {
                    applyCallback: (pathName) => 
                        this._asyncWriteHistorySummaryFile(stateId),
                })
        ];

        const itemGroups = this._historiesHandler.getItemGroups();

        itemGroups.forEach((groupItems, groupKey) => {
            const lastChangeId = this._groupKeysLastChangeIds.get(groupKey);
            if (lastChangeId !== groupItems.lastChangeId) {
                const pathName = JSONGzipHistoryFiles.buildHistoryGroupPathName(
                    this._accountingFile.getPathName(), groupKey);
                fileActions.push(
                    new FA.ReplaceFileAction(pathName,
                        {
                            applyCallback: (pathName) => 
                                this._asyncWriteGroupItems(pathName, groupKey, 
                                    groupItems),
                        })
                );
            }
        });

        return fileActions;
    }

    writeCompleted() {
        this.cleanIsModified();
    }

    async asyncClose() {
        this._undoHandler = undefined;
        this._actionsHandler = undefined;
        this._historiesHandler = undefined;
        this._accountingFile = undefined;
    }
}


/**
 * Gzipped JSON based accounting file system implementation.
 */
class JSONGzipAccountingFile extends AccountingFile {
    constructor(options) {
        super(options);

        this._isTest = options.fileFactory._isTest;


        // Set up the accounting system.
        this._accountingSystemHandler = new JSONGzipAccountingSystemHandler(this);

        this._accountsHandler = new JSONGzipAccountsHandler(this);
        this._pricedItemsHandler = new JSONGzipPricedItemsHandler(this);
        this._lotsHandler = new JSONGzipLotsHandler(this);
        this._remindersHandler = new JSONGzipRemindersHandler(this);
        this._autoCompleteSplitsHandler = new JSONGzipAutoCompleteSplitsHandler(this);

        this._historiesHandler = new JSONGzipHistoryHandlers(this,
            async (groupKey, groupItems) =>
                this._historyFiles.asyncLoadGroupHistories(groupKey, groupItems));

        this._undoHandler = this._historiesHandler._undoHandler;
        this._actionsHandler = this._historiesHandler._actionsHandler;

        this._pricesHandler = new JSONGzipPricesHandler(this);
        this._transactionsHandler = new JSONGzipTransactionsHandler(this, 
            async (groupKey, groupItems) => 
                this._journalFiles.asyncLoadGroupTransactions(groupKey, groupItems));

        this._ledgerFile = new JSONGzipLedgerFile(this);
        this._journalFiles = new JSONGzipJournalFiles(this);
        this._priceFiles = new JSONGzipPricesFile(this);
        this._historyFiles = new JSONGzipHistoryFiles(this);
    }


    async _asyncSetupAccountingSystem() {
        const options = Object.assign({}, 
            {
                handler: this._accountingSystemHandler,

                accountManager: { handler: this._accountsHandler },
                pricedItemManager: { handler: this._pricedItemsHandler },
                lotManager: { handler: this._lotsHandler },
                priceManager: { handler: this._pricesHandler },
                reminderManager: { handler: this._remindersHandler },
                autoCompleteSplitsManager: { handler: this._autoCompleteSplitsHandler },
                transactionManager: { handler: this._transactionsHandler },
                undoManager: { handler: this._undoHandler },
                actionManager: { handler: this._actionsHandler },
            });

        this._accountingSystem = new AccountingSystem(options);

        this._accountingSystem.getAccountManager().isDebug = this.isDebug;

        await this._accountingSystem.asyncSetupForUse();
    }

    async asyncSetupNewFile() {
        await this._asyncSetupAccountingSystem();
    }

    async asyncReadFile() {
        this._stateId = await this._ledgerFile.asyncRead();
        await this._journalFiles.asyncRead();
        await this._priceFiles.asyncRead();
        await this._historyFiles.asyncRead();

        await this._asyncSetupAccountingSystem();

        this._ledgerFile.cleanIsModified();
        this._journalFiles.cleanIsModified();
        this._priceFiles.cleanIsModified();
        this._historyFiles.cleanIsModified();
    }


    isModified() {
        return this._ledgerFile.isModified()
            || this._journalFiles.isModified()
            || this._priceFiles.isModified()
            || this._historyFiles.isModified();
    }



    async _asyncWriteFileImpl(stateId, noBackup) {
        const ledgerFileActions = await this._ledgerFile.asyncCreateWriteFileActions();
        const journalFilesActions 
            = await this._journalFiles.asyncCreateWriteFileActions();
        const priceFilesActions = await this._priceFiles.asyncCreateWriteFileActions();
        const historyFilesActions 
            = await this._historyFiles.asyncCreateWriteFileActions();

        const fileActions = ledgerFileActions.concat(journalFilesActions, 
            priceFilesActions, historyFilesActions);

        // Apply the backup mechanism.
        if (!noBackup) {
            const fileBackups = new FileBackups();
            await fileBackups.applyToFileActions(fileActions);
        }

        await FA.performFileActions(fileActions);

        this._ledgerFile.writeCompleted();
        this._journalFiles.writeCompleted();
        this._priceFiles.writeCompleted();
        this._historyFiles.writeCompleted();
    }
    
    async _asyncCloseFileImpl() {
        await this._ledgerFile.asyncClose();
        await this._journalFiles.asyncClose();
        await this._priceFiles.asyncClose();
        await this._historyFiles.asyncClose();

        this._ledgerFile = undefined;
        this._journalFiles = undefined;
        this._priceFiles = undefined;
        this._historyFiles = undefined;
        
        this._accountingSystem = undefined;
        this._accountingSystemHandler = undefined;
        this._accountsHandler = undefined;
        this._pricedItemsHandler = undefined;
        this._remindersHandler = undefined;
        this._autoCompleteSplitsHandler = undefined;
        this._lotsHandler = undefined;
        this._pricesHandler = undefined;
        this._transactionsHandler = undefined;
        this._actionsHandler = undefined;
        this._undoHandler = undefined;
        this._historiesHandler = undefined;
    }
}


/**
 * Factory for {@link JSONGzipAccountingFile}s.
 */
export class JSONGzipAccountingFileFactory extends AccountingFileFactory {
    constructor(options) {
        options = options || {};
        super(options);

        this._isTest = options.isTest;
    }


    isDirBased() {
        return true;
    }

    cleanupPathName(pathName) {
        const parts = path.parse(pathName);
        if (parts.ext.toUpperCase() === FILE_EXT_UPPER_CASE) {
            return parts.dir;
        }
        return pathName;
    }


    /**
     * Called to retrieve an array of Electron 
     * [FileFilter]{@link https://electronjs.org/docs/api/structures/file-filter} objects
     * for use with file open dialog boxes.
     * @returns {AccountingFileFactory~FileFilter[]|undefined}
     */
    getFileNameFilters() {
        return [
            { name: userMsg('JSONGzipAccountingFile-filter_name'), extensions: ['gz'] }
        ];
    }


    /**
     * Determines if a given directory/file name is a possible valid accounting file of 
     * this type.
     * @param {string} pathName The path name of interest. If 
     * {@link AccountingFile#isDirBased} returned <code>true</code> this should be a 
     * directory, otherwise it should be a file name.
     * @returns {boolean}   <code>true</code> if it could be.
     */
    async asyncIsPossibleAccountingFile(pathName) {
        pathName = this.cleanupPathName(pathName);

        const requiredFileNames = [
            path.join(pathName, LEDGER_FILE_NAME),
            path.join(pathName, JOURNAL_SUMMARY_FILE_NAME),
        ];
        return asyncAllFilesExist(requiredFileNames);
    }


    /**
     * Determines if a path name is likely to succeed if passed to 
     * {@link AccountingFile#createFile}.
     * @param {string} pathName The path name of interest.
     * @returns {true|Error}
     */
    async asyncCanCreateFile(pathName) {
        // We need the directory to be empty.
        if (await asyncFileExists(pathName)) {
            return userError('JSONGzipAccountingFile-not_dir', pathName);
        }
        if (await asyncDirExists(pathName)) {
            const itemsInDir = await fsPromises.readdir(pathName);
            if (itemsInDir || itemsInDir.length > 0) {
                return userError('JSONGzipAccountingFile-dir_not_empty', pathName);
            }
        }

        if (!await asyncCanCreateDir(pathName)) {
            return userError('JSONGzipAccountingFile-dir_name_invalid', pathName);
        }

        return true;
    }


    /**
     * Creates a new accounting file system, replacing an existing one if necessary.
     * @param {string} pathName The path name for the new file system. If the file 
     * system already exists it should be overwritten. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this 
     * should be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was created.
     */
    async asyncCreateFile(pathName) {
        pathName = this.cleanupPathName(pathName);

        await fsPromises.mkdir(pathName, { recursive: true });

        const file = new JSONGzipAccountingFile({
            fileFactory: this,
            pathName: pathName,
        });

        await file.asyncSetupNewFile();

        await file.asyncWriteFile();

        return file;
    }


    /**
     * Opens an existing accounting file system.
     * @param {string} pathName The path name of the file system to open. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this 
     * should be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was opened.
     */
    async asyncOpenFile(pathName) {
        pathName = this.cleanupPathName(pathName);

        const file = new JSONGzipAccountingFile({
            fileFactory: this,
            pathName: pathName,
        });

        await file.asyncReadFile();

        return file;
    }


    /**
     * Copies an existing accounting file into a new accounting system, replacing an 
     * existing one if necessary. Note that an {@link AccountingFile} is returned, 
     * if not needed it should be closed.
     * @param {AccountingFile} accountingFile The accounting file to be copied.
     * @param {string} pathName The path name for the new file system. If the file 
     * system  already exists it should be overwritten. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should 
     * be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was created.
     */
    async asyncCopyAccountingFile(accountingFile, pathName) {
        if (accountingFile instanceof JSONGzipAccountingFile) {
            // We can just copy all the files (though we need to write everything 
            // out somehow...)
        }
        throw Error('JSONGzipAccountingFileFactory.asyncSaveAsFile() abstract method!');
    }
}
