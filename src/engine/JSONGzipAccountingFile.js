import { AccountingFile, AccountingFileFactory } from './AccountingFile';
import { allFilesExist } from '../util/Files';
import * as JGZ from '../util/JSONGzipFiles';
import * as FA from '../util/FileActions';
import { FileBackups } from '../util/FileBackups';
import { InMemoryAccountsHandler } from './Accounts';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { PricesHandler } from './Prices';
import { TransactionsHandlerImplBase } from './Transactions';
import { AccountingSystem } from './AccountingSystem';
import { userError } from '../util/UserMessages';
import { GroupedItemManager, ItemGroups } from '../util/GroupedItemManager';
import { getYMDDateString } from '../util/YMDDate';

const path = require('path');
const fsPromises = require('fs').promises;

const FILE_EXT = '.gz';
const FILE_SUFFIX = '.json';

const LEDGER_FILE_PREFIX = 'Ledger';
const LEDGER_FILE_NAME = LEDGER_FILE_PREFIX + FILE_SUFFIX + FILE_EXT;

const JOURNAL_FILES_PREFIX = 'Journal';
const JOURNAL_SUMMARY_FILE_NAME = JOURNAL_FILES_PREFIX + FILE_SUFFIX + FILE_EXT;

// const HISTORY_FILES_PREFIX = 'History';
// const PRICE_FILES_PREFIX = 'Prices';

const FILE_EXT_UPPER_CASE = FILE_EXT.toUpperCase();

const LEDGER_TAG = 'mimon-ledger';
const JOURNAL_SUMMARY_TAG = 'mimon-journalSummary';
const JOURNAL_TRANSACTIONS_TAG = 'mimon-journalTransactions';

///
// The JSONGzip accounting file system design:
//
// Folder based.
// Has the following files:
//  - Ledger
//      - Holds the:
//          - accounts (manager)
//          - priced items (manager)
//          - 
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
 * The accounts handler implementation.
 */
class JSONGzipAccountsHandler extends InMemoryAccountsHandler {
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


function getYMDYearKey(ymdDate) {
    ymdDate = getYMDDateString(ymdDate);
    if (ymdDate) {
        const index = ymdDate.indexOf('-');
        if (index >= 0) {
            ymdDate = ymdDate.slicee(0, index);
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
class JSONGzipPricesHandler extends PricesHandler {
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
            _asyncLoadGroupItems: asyncLoadGroupTransactions,
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
        const json = this.entriesToJSON();
        json.idGeneratorOptions = this._idGeneratorOptions;
        return json;
    }


    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;
        this.entriesFromJSON(json);
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

    async asyncUpdateTransactionDataItemsAndEntries(entryDataItemUpdates, idGeneratorOptions) {
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
            const removedItems = await this._itemManager.asyncGetItemsWithIds(idsToRemove);
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
 * Handles the ledger file.
 */
class JSONGzipLedgerFile {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._pathName = JSONGzipLedgerFile.buildLedgerPathName(accountingFile.getPathName());

        this._accountsHandler = accountingFile._accountsHandler;
        this._pricedItemsHandler = accountingFile._pricedItemsHandler;

        this._accountingSystemOptions = {};
    }

    static buildLedgerPathName(pathName) {
        return path.join(pathName, LEDGER_FILE_NAME);
    }


    cleanIsModified() {
        this._accountsChangeId = this._accountsHandler.getLastChangeId();
        this._pricedItemsChangeId = this._pricedItemsHandler.getLastChangeId();
    }

    isModified() {
        return (this._accountsChangeId !== this._accountsHandler.getLastChangeId())
            || (this._pricedItemsChangeId !== this._pricedItemsHandler.getLastChangeId());
    }


    getAccountingSystemOptions() {
        return this._accountingSystemOptions;
    }

    async asyncRead() {
        const pathName = this._pathName;
        const json = await JGZ.readFromFile(pathName);
        if (json.tag !== LEDGER_TAG) {
            throw userError('JSONGzipAccountingFile-ledger_tag_missing', pathName);
        }

        if (!json.accountsHandler) {
            throw userError('JSONGzipAccountingFile-accountsHandler_tag_missing', pathName);
        }
        if (!json.pricedItemsHandler) {
            throw userError('JSONGzipAccountingFile-pricedItemsHandler_tag_missing', pathName);
        }

        this._accountsHandler.fromJSON(json.accountsHandler);
        this._pricedItemsHandler.fromJSON(json.pricedItemsHandler);

        this._accountingSystemOptions = json.accountingSystemOptions;

        this.cleanIsModified();

        return json.stateId;
    }


    async _asyncWriteLedgerFile(stateId) {
        const json = {
            tag: LEDGER_TAG,
            fileVersion: '1.0',
            stateId: stateId,
            accountsHandler: this._accountsHandler.toJSON(),
            pricedItemsHandler: this._pricedItemsHandler.toJSON(),
            accountingSystemOptions: this._accountingFile.getAccountingSystem().getOptions(),
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
        this._accountsHandler = undefined;
        this._pricedItemsHandler = undefined;
        this._accountingFile = undefined;
    }
}


/**
 * Handles the journal files.
 */
class JSONGzipJournalFiles {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;

        this._journalSummaryPathName = JSONGzipJournalFiles.buildJournalSummaryPathName(accountingFile.getPathName());

        this._transactionsHandler = accountingFile._transactionsHandler;

        this._groupKeysLastChangeIds = new Map();
    }

    
    static buildJournalSummaryPathName(pathName) {
        return path.join(pathName, JOURNAL_SUMMARY_FILE_NAME);
    }

    static buildJournalGroupPathName(pathName, groupKey) {
        return path.join(pathName, JOURNAL_FILES_PREFIX, groupKey, FILE_SUFFIX, FILE_EXT);
    }
    
    cleanIsModified() {
        this._transactionsChangeId = this._transactionsHandler.getLastChangeId();
    }

    
    isModified() {
        return (this._transactionsChangeId !== this._transactionsHandler.getLastChangeId());
    }


    async asyncLoadGroupTransactions(groupKey, groupItems) {
        const pathName = JSONGzipJournalFiles.buildJournalGroupPathName(this._accountingFile.getPathName(), groupKey);
        let json;
        try {
            json = await JGZ.readFromFile(pathName);
        }
        catch (e) {
            // For now don't do anything.
            return;
        }

        if (json.tag !== JOURNAL_TRANSACTIONS_TAG) {
            throw userError('JSONGzipAccountingFile-journal_transactions_tag_missing', pathName);
        }
        if (!json.transactions) {
            throw userError('JSONGzipAccountingFile-journal_transactions_missing', pathName);
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
            throw userError('JSONGzipAccountingFile-journal_summary_tag_missing', pathName);
        }

        if (!json.transactionsHandler) {
            throw userError('JSONGzipAccountingFile-transactionsHandler_tag_missing', pathName);
        }

        this._transactionsHandler.entriesFromJSON(json.transactionsHandler);

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
                    applyCallback: (pathName) => this._asyncWriteJournalSummaryFile(stateId),
                })
        ];

        const itemGroups = this._transactionsHandler.getItemGroups();
        itemGroups.forEach(([groupItems, groupKey]) => {
            const lastChangeId = this._groupKeysLastChangeIds.get(groupKey);
            if (lastChangeId !== groupItems.lastChangeId) {
                const pathName = JSONGzipJournalFiles.buildJournalGroupPathName(this._accountingFile.getPathName(), groupKey);
                fileActions.push(
                    new FA.ReplaceFileAction(pathName,
                        {
                            applyCallback: (pathName) => this._asyncWriteGroupItems(pathName, groupKey, groupItems),
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
 * Handles the price files
 */
class JSONGzipPriceFiles {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;
    }

    cleanIsModified() {

    }

    isModified() {
        return false;
    }

    async asyncRead() {

        this.cleanIsModified();
    }

    async asyncCreateWriteFileActions(stateId) {
        return [];
    }

    writeCompleted() {
        this.cleanIsModified();
    }

    async asyncClose() {
        this._accountingFile = undefined;
    }
}


/**
 * Handles the history files.
 */
class JSONGzipHistoryFiles {
    constructor(accountingFile) {
        this._accountingFile = accountingFile;
    }

    cleanIsModified() {

    }

    isModified() {
        return false;
    }

    async asyncRead() {

        this.cleanIsModified();
    }

    async asyncCreateWriteFileActions(stateId) {
        return [];
    }

    writeCompleted() {
        this.cleanIsModified();
    }

    async asyncClose() {
        this._accountingFile = undefined;
    }
}


/**
 * Gzipped JSON based accounting file system implementation.
 */
class JSONGzipAccountingFile extends AccountingFile {
    constructor(options) {
        super(options);

        // Set up the accounting system.
        this._accountsHandler = new JSONGzipAccountsHandler(this);
        this._pricedItemsHandler = new JSONGzipPricedItemsHandler(this);
        this._pricesHandler = new JSONGzipPricesHandler(this);
        this._transactionsHandler = new JSONGzipTransactionsHandler(this, 
            async (groupKey, groupItems) => this._journalFiles.asyncLoadGroupTransactions(groupKey, groupItems));

        this._ledgerFile = new JSONGzipLedgerFile(this);
        this._journalFiles = new JSONGzipJournalFiles(this);
        this._priceFiles = new JSONGzipPriceFiles(this);
        this._historyFiles = new JSONGzipHistoryFiles(this);
    }


    async _asyncSetupAccountingSystem() {
        const options = Object.assign({}, 
            this._ledgerFile.getAccountingSystemOptions(), 
            {
                accountManager: { handler: this._accountsHandler },
                pricedItemManager: { handler: this._pricedItemsHandler },
                priceManager: { handler: this._pricesHandler },
                transactionManager: { handler: this._transactionsHandler },
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



    async _asyncWriteFileImpl(stateId) {
        const ledgerFileActions = await this._ledgerFile.asyncCreateWriteFileActions();
        const journalFilesActions = await this._journalFiles.asyncCreateWriteFileActions();
        const priceFilesActions = await this._priceFiles.asyncCreateWriteFileActions();
        const historyFilesActions = await this._historyFiles.asyncCreateWriteFileActions();

        const fileActions = ledgerFileActions.concat(journalFilesActions, priceFilesActions, historyFilesActions);

        // Apply the backup mechanism.
        const fileBackups = new FileBackups();
        await fileBackups.applyToFileActions(fileActions);

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
        this._accountsHandler = undefined;
        this._pricedItemsHandler = undefined;
        this._pricesHandler = undefined;
        this._transactionsHandler = undefined;
    }
}


/**
 * Factory for {@link JSONGzipAccountingFile}s.
 */
export class JSONGzipAccountingFileFactory extends AccountingFileFactory {
    constructor(options) {
        super(options);
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
     * Called to retrieve an array of Electron [FileFilter]{@link https://electronjs.org/docs/api/structures/file-filter} objects
     * for use with file open dialog boxes.
     * @returns {AccountingFileFactory~FileFilter[]|undefined}
     */
    getFileNameFilters() {
        return [
            { name: 'MiMon JSON Gzip', extensions: ['gz'] }
        ];
    }


    /**
     * Determines if a given directory/file name is a possible valid accounting file of this type.
     * @param {string} pathName The path name of interest. If {@link AccountingFile#isDirBased} returned <code>true</code> this
     * should be a directory, otherwise it should be a file name.
     * @returns {boolean}   <code>true</code> if it could be.
     */
    async asyncIsPossibleAccountingFile(pathName) {
        pathName = this.cleanupPathName(pathName);

        const requiredFileNames = [
            path.join(pathName, LEDGER_FILE_NAME),
            path.join(pathName, JOURNAL_SUMMARY_FILE_NAME),
        ];
        return allFilesExist(requiredFileNames);
    }


    /**
     * Determines if a path name is likely to succeed if passed to {@link AccountingFile#createFile}.
     * @param {string} pathName The path name of interest.
     * @returns {true|Error}
     */
    async asyncCanCreateFile(pathName) {
        // We need the directory to be empty.
        try {
            const itemsInDir = await fsPromises.readdir(pathName);
            if (itemsInDir || itemsInDir.length > 0) {
                return userError('JSONGzipAccountingFile-dir_not_empty', pathName);
            }
        }
        catch (err) {
            const parts = path.parse(pathName);
            if (!parts.dir) {
                return true;
            }
            return this.asyncCanCreateFile(parts.dir);
        }
        return true;
    }


    /**
     * Creates a new accounting file system, replacing an existing one if necessary.
     * @param {string} pathName The path name for the new file system. If the file system already exists
     * it should be overwritten. If {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should be a directory,
     * otherwise it should be a file name.
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
     * @param {string} pathName The path name of the file system to open. If {@link AccountingFileFactor#isDirBased} returns
     * <code>true</code> this should be a directory, otherwise it should be a file name.
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
     * Copies an existing accounting file into a new accounting system, replacing an existing one if necessary.
     * Note that an {@link AccountingFile} is returned, if not needed it should be closed.
     * @param {AccountingFile} accountingFile The accounting file to be copied.
     * @param {string} pathName The path name for the new file system. If the file system already exists
     * it should be overwritten. If {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should be a directory,
     * otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was created.
     */
    async asyncCopyAccountingFile(accountingFile, pathName) {
        if (accountingFile instanceof JSONGzipAccountingFile) {
            // We can just copy all the files (though we need to write everything out somehow...)
        }
        throw Error('JSONGzipAccountingFileFactory.asyncSaveAsFile() abstract method!');
    }
}
