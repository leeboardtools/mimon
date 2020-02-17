import { JSONGzipAccountingFileFactory } from '../engine/JSONGzipAccountingFile';
import { getQuantityDefinition } from '../util/Quantities';
import { userError } from '../util/UserMessages';
import deepEqual from 'deep-equal';


/**
 * This provides an almost single point of access to an accounting system
 * and underlying accounting file. It's almost single point because it
 * primarily provides the read access to the database and relies upon
 * {@link AccountingActions} to provide the actions for modifying the
 * database. It does however manage the application, undoing, and
 * application of undone actions.
 * <p>
 * One of the key features of the accessor is the ability to support
 * hooks for modifying data items returned from the database prior
 * to being returned by the accessor. The {@link Reconciler} is the primary
 * user of this feature, as it hooks the transaction data items returned
 * to temporarily update their reconcile state while the Reconciler
 * is active.
 */
export class EngineAccessor {
    constructor(options) {
        options = options || {};

        this._handleActionApply = this._handleActionApply.bind(this);

        // Some synonyms.
        this.asyncUndoLastAppliedAction = this.asyncUndoLastAppliedActions;
        this.asyncReapplyLastUndoneAction = this.asyncReapplyLastUndoneActions;
        this.asyncGetTransactionDataItemWithId = this.asyncGetTransactionDataItemsWithIds;


        this._fileFactories = [];

        this._fileFactories.push(new JSONGzipAccountingFileFactory());
        if (options.fileFactories) {
            options.fileFactories.forEach((factory) => {
                this._fileFactories.push(factory);
            });
        }

        this._fileNameFilterToFactoryIndices = [];
        this._fileNameFilters = [];
        for (let i = 0; i < this._fileFactories.length; ++i) {
            const filters = this._fileFactories[i].getFileNameFilters();
            filters.forEach((filter) => {
                this._fileNameFilterToFactoryIndices.push(i);
                this._fileNameFilters.push(i);
            });
        }
    }


    _setupForAccountingFile(accountingFile, fileFactoryIndex) {
        this._accountingFile = accountingFile;

        if (accountingFile) {
            this._fileFactoryIndex = fileFactoryIndex;

            this._accountingSystem = accountingFile.getAccountingSystem();
            const { _accountingSystem } = this;

            this._accountingActions = _accountingSystem.getAccountingActions();
            this._accountingActions.on('actionApply', this._handleActionApply);

            this._actionManager = _accountingSystem.getActionManager();
            this._accountManager = _accountingSystem.getAccountManager();
            this._pricedItemManager = _accountingSystem.getPricedItemManager();
            this._priceManager = _accountingSystem.getPriceManager();
            this._lotManager = _accountingSystem.getLotManager();
            this._transactionManager = _accountingSystem.getTransactionManager();
        }
        else {
            this._fileFactoryIndex = undefined;

            if (this._accountingActions) {
                this._accountingActions.off('actionApply', this._handleActionApply);
                this._accountingActions = undefined;
            }

            this._accountingSystem = undefined;
            this._actionManager = undefined;
            this._pricedItemManager = undefined;
            this._priceManager = undefined;
            this._lotManager = undefined;
            this._transactionManager = undefined;
        }
    }


    /**
     * @returns {number}    The number of file factories available.
     */
    getFileFactoryCount() {
        return this._fileFactories.length;
    }


    /**
     * Called to retrieve an array of Electron 
     * [FileFilter]{@link https://electronjs.org/docs/api/structures/file-filter} objects
     * for use with file open dialog boxes.
     * @returns {AccountingFileFactory~FileFilter[]|undefined}
     */
    getFileNameFilters() {
        return Array.from(this._fileNameFilters);
    }


    /**
     * Called to retrieve an array of Electron 
     * [FileFilter]{@link https://electronjs.org/docs/api/structures/file-filter} objects
     * for the file factory at a give index for use with file open dialog boxes.
     * @param {number} fileFactoryIndex
     * @returns {AccountingFileFactory~FileFilter[]|undefined}
     */
    getFileNameFiltersForFileFactoryIndex(fileFactoryIndex) {
        return this._fileFactories[fileFactoryIndex].getFileNameFilters();
    }


    /**
     * Returns the file factory index corresponding to a file name filter returned
     * by {@link EngineAccess#getFileNameFilters}. This index can be used to identify
     * specific file types in the various file access methods.
     * @param {AccountingFileFactory~FileFilter} fileNameFilter A file name filter from
     * {@link EngineAccess#getFileNameFilters}.
     * @returns {number|undefined}
     */
    getFileFactoryIndexFromFileNameFilter(fileNameFilter) {
        for (let i = 0; i < this._fileNameFilters.length; ++i) {
            if (deepEqual(fileNameFilter, this._fileNameFilters[i])) {
                return this._fileNameFilterToFactoryIndices[i];
            }
        }
    }


    /**
     * @param {number} fileFactoryIndex 
     * @returns {boolean}   <code>true</code> if the file factory at the given index
     * is directory based.
     */
    isFileFactoryAtIndexDirBased(fileFactoryIndex) {
        return this._fileFactories[fileFactoryIndex].isDirBased();
    }


    /**
     * Determines if a given directory/file name is a possible valid accounting file 
     * of this type.
     * @param {string} pathName The path name of interest. If 
     * {@link AccountingFile#isDirBased} returned <code>true</code> this
     * should be a directory, otherwise it should be a file name.
     * @param {number} [fileFactoryIndex]   Optional file factory index, if specified
     * only this particular file factory will be checked.
     * @returns {boolean}   <code>true</code> if it could be.
     */
    async asyncIsPossibleAccountingFile(pathName, fileFactoryIndex) {
        if ((fileFactoryIndex >= 0) && (fileFactoryIndex < this._fileFactories.length)) {
            return this._fileFactories[fileFactoryIndex].asyncIsPossibleAccountingFile(
                pathName);
        }

        for (let i = 0; i < this._fileFactories.length; ++i) {
            if (this._fileFactories[i].asyncIsPossibleAccountingFile(pathName)) {
                return true;
            }
        }
        return false;
    }


    /**
     * Determines if a path name is likely to succeed if passed to 
     * {@link AccountingFile#asyncCreateAccountingFile}.
     * @param {string} pathName The path name of interest.
     * @param {number} [fileFactoryIndex]   Optional file factory index, if specified
     * only this particular file factory will be checked.
     * @returns {true|Error}
     */
    async asyncCanCreateAccountingFile(pathName, fileFactoryIndex) {
        if ((fileFactoryIndex >= 0) && (fileFactoryIndex < this._fileFactories.length)) {
            return this._fileFactories[fileFactoryIndex].asyncCanCreateFile(
                pathName);
        }

        for (let i = 0; i < this._fileFactories.length; ++i) {
            if (this._fileFactories[i].asyncCanCreateFile(pathName)) {
                return true;
            }
        }
        return false;
    }


    /**
     * Creates a new accounting file system, replacing an existing one if necessary.
     * @param {string} pathName The path name for the new file system. If the file 
     * system already exists
     * it should be overwritten. If {@link AccountingFileFactor#isDirBased} returns 
     * <code>true</code> this should be a directory, otherwise it should be a file name.
     * @param {number} [fileFactoryIndex]   Optional file factory index, if specified
     * this particular file factory will be used, otherwise the first file factory
     * whose {@link AccountingFile#asyncCanCreateFile} returns <code>true</code>
     * will be used.
     * @throws {Error}
     */
    async asyncCreateAccountingFile(pathName, fileFactoryIndex) {
        let accountingFile;
        if ((fileFactoryIndex >= 0) && (fileFactoryIndex < this._fileFactories.length)) {
            accountingFile = await this._fileFactories[fileFactoryIndex].asyncCreateFile(
                pathName);
        }
        else {
            for (let i = 0; i < this._fileFactories.length; ++i) {
                if (this._fileFactories[i].asyncCanCreateFile(pathName)) {
                    accountingFile = await this._fileFactories[i].asyncCreateFile(
                        pathName);
                    fileFactoryIndex = i;
                    break;
                }
            }
        }

        if (!accountingFile) {
            throw userError('EngineAccess-create_file_not_found', pathName);
        }

        this._setupForAccountingFile(accountingFile, fileFactoryIndex);
    }


    /**
     * Opens an existing accounting file system.
     * @param {string} pathName The path name of the file system to open. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should 
     * be a directory, otherwise it should be a file name.
     * @param {number} [fileFactoryIndex]   Optional file factory index, if specified
     * this particular file factory will be used, otherwise the first file factory
     * whose {@link AccountingFile#asyncOpenFile} succeeds will be used.
     * @throws {Error}
     */
    async asyncOpenAccountingFile(pathName, fileFactoryIndex) {
        let accountingFile;
        if ((fileFactoryIndex >= 0) && (fileFactoryIndex < this._fileFactories.length)) {
            accountingFile = await this._fileFactories[fileFactoryIndex].asyncOpenFile(
                pathName);
        }
        else {
            let firstError;
            for (let i = 0; i < this._fileFactories.length; ++i) {
                try {
                    accountingFile = await this._fileFactories[i].asyncOpenFile(
                        pathName);
                    fileFactoryIndex = i;
                    break;
                }
                catch (e) {
                    firstError = firstError || e;
                    continue;
                }
            }

            if (!accountingFile) {
                if (firstError) {
                    throw firstError;
                }
            }        
        }

        this._setupForAccountingFile(accountingFile, fileFactoryIndex);
    }


    /**
     * Saves the accounting file under a new name/type. The accounting file represented
     * by the accessor is replaced.
     * @param {string} pathName The path name of the file system to open. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should 
     * be a directory, otherwise it should be a file name.
     * @param {number} [fileFactoryIndex]   Optional file factory index, if specified
     * this particular file factory will be used, otherwise the first file factory
     * whose {@link AccountingFile#asyncCanCreateFile} returns <code>true</code>
     * @throws {Error}
     */
    async asyncSaveAccountingFileAs(pathName, fileFactoryIndex) {
        let accountingFile;
        if ((fileFactoryIndex >= 0) && (fileFactoryIndex < this._fileFactories.length)) {
            accountingFile = await this._fileFactories[fileFactoryIndex]
                .asyncCopyAccountingFile(this._accountingFile, pathName);
        }
        else {
            let firstError;
            for (let i = 0; i < this._fileFactories.length; ++i) {
                try {
                    accountingFile = await this._fileFactories[i]
                        .asyncCopyAccountingFile(this._accountingFile, pathName);
                    fileFactoryIndex = i;
                    break;
                }
                catch (e) {
                    firstError = firstError || e;
                    continue;
                }
            }

            if (!accountingFile) {
                if (firstError) {
                    throw firstError;
                }
            }        
        }

        this._setupForAccountingFile(accountingFile, fileFactoryIndex);
    }


    /**
     * @returns {string|undefined}  The path name to the open accounting file,
     * <code>undefined</code> if an accounting file is not open.
     */
    getAccountingFilePathName() {
        return (this._accountingFile) ? this._accountingFile.getPathName() : undefined;
    }


    /**
     * @returns {number}    The file factory index of the file factory that created/opened
     * the current accounting file.
     */
    getAccountingFileFactoryIndex() {
        return this._fileFactoryIndex;
    }


    /**
     * @returns {boolean}   <code>true</code> if changes have been made to the 
     * accounting system that have not yet been saved.
     */
    isAccountingFileModified() {
        return (this._accountingFile) ? this._accountingFile.isModified() : false;
    }


    /**
     * Writes any changes that have been made to the accounting system.
     */
    async asyncWriteAccountingFile() {
        return this._accountingFile.asyncWriteFile();
    }


    /**
     * Closes the file, once called the accounting file object should not be used.
     * Any changes that have been made to the accounting system are lots.
     */
    async asyncCloseAccountingFile() {
        if (this._accountingFile) {
            await this._accountingFile.asyncCloseFile();
            this._setupForAccountingFile(undefined);
        }
    }




    /**
     * @returns {AccountingActions} The source for all the actions for modifying the
     * accounting database.
     */
    getAccountingActions() {
        return this._accountingSystem.getAccountingActions();
    }



    /**
     * @returns {number}    The number of actions that have been applied and are 
     * available for undoing.
     */
    getAppliedActionCount() {
        return this._actionManager.getAppliedActionCount();
    }

    /**
     * @returns {number}    The number of actions that have been undone and can be 
     * reapplied.
     */
    getUndoneActionCount() {
        return this._actionManager.getUndoneActionCount();
    }

    /**
     * Retrieves an applied action.
     * @param {number} index The index, 0 is the oldest applied action.
     * @returns {ActionDataItem}
     */
    async asyncGetAppliedActionAtIndex(index) {
        return this._actionManager.asyncGetAppliedActionAtIndex(index);
    }

    /**
     * Retrieves an undone action.
     * @param {number} index The index, 0 is the oldest undone action.
     */
    async asyncGetUndoneActionAtIndex(index) {
        return this._actionManager.asyncGetUndoneActionAtIndex(index);
    }


    /**
     * Removes all applied actions from the manager.
     */
    async asyncClearAppliedActions() {
        this._clearLastAppliedAction();
        return this._actionManager.asyncClearAppliedActions();
    }


    /**
     * Removes all undone actions from the manager.
     */
    async asyncClearUndoneActions() {
        this._clearLastAppliedAction();
        return this._actionManager.asyncClearUndoneActions();
    }


    /**
     * Performs validation on an action. The action manager is not updated.
     * @param {ActionDataItem} action 
     * @returns {undefined|Error}   Returns <code>undefined</code> if the action 
     * passes validation, an Error object if invalid.
     */
    async asyncValidateApplyAction(action) {
        return this._actionManager.asyncValidateApplyAction(action);
    }


    /**
     * Applies an action. After application the action is in the applied actions list 
     * at index {@link ActionManager#getAppliedActionCount} - 1.
     * @param {ActionDataItem} action 
     * @returns {object}    The result of the action.
     */
    async asyncApplyAction(action) {
        this._clearLastAppliedAction();
        await this._actionManager.asyncApplyAction(action);
        return this._lastAppliedActionResult;
    }


    _clearLastAppliedAction() {
        this._lastAppliedAction = undefined;
        this._lastAppliedActionResult = undefined;
    }

    _handleActionApply(action, result) {
        this._lastAppliedAction = action;
        this._lastAppliedActionResult = result;
    }

    /**
     * @returns {ActionDataItem}    The action property from the 
     * {@link AccountingActions#event:actionApply} fired by the last applied action.
     * This also reflects the last reapplied action.
     */
    getLastAppliedAction() {
        return this._lastAppliedAction;
    }


    /**
     * @returns {object}    The result property from the 
     * {@link AccountingActions#event:actionApply} fired by the last applied action.
     * This also reflects the last reapplied action.
     */
    getLastAppliedActionResult() {
        return this._lastAppliedActionResult;
    }


    /**
     * Undoes a number of the last applied actions. The actions are moved to the 
     * undone action list.
     * @param {number} [actionCount=1]  The number of applied actions to undo, if 
     * greater than the number of applied actions then all applied actions are undone.
     */
    async asyncUndoLastAppliedActions(actionCount) {
        this._clearLastAppliedAction();
        return this._actionManager.asyncUndoLastAppliedActions(actionCount);
    }


    /**
     * Reapplies a number of the last undone actions. The actions are moved frmo the 
     * undone action list to the applied action list as they are reapplied.
     * @param {number} [actionCount=1]  The number of undone actions to reapply. 
     * If greater than the number of undone actions then all undone actions are reapplied.
     */
    async asyncReapplyLastUndoneActions(actionCount) {
        this._clearLastAppliedAction();
        return this._actionManager.asyncReapplyLastUndoneActions(actionCount);
    }


    /**
     * @returns {number}   The account id of the root asset account.
     */
    getRootAssetAccountId() {
        return this._accountManager.getRootAssetAccountId();
    }

    /**
     * @returns {number}   The account id of the root liability account.
     */
    getRootLiabilityAccountId() {
        return this._accountManager.getRootLiabilityAccountId();
    }

    /**
     * @returns {number}   The account id of the root income account.
     */
    getRootIncomeAccountId() {
        return this._accountManager.getRootIncomeAccountId();
    }

    /**
     * @returns {number}   The account id of the root expense account.
     */
    getRootExpenseAccountId() {
        return this._accountManager.getRootExpenseAccountId();
    }

    /**
     * @returns {number}   The account id of the root equity account.
     */
    getRootEquityAccountId() {
        return this._accountManager.getRootEquityAccountId();
    }

    /**
     * @returns {number}   The account id of the opening balances account.
     */
    getOpeningBalancesAccountId() {
        return this._accountManager.getOpeningBalancesAccountId();
    }

    /**
     * Retrieves the account data item with a given id.
     * @param {number} id 
     * @returns {AccountDataItem|undefined} <code>undefined</code> is returned if
     * there is no account with the id.
     */
    getAccountDataItemWithId(id) {
        return this._accountManager.getAccountDataItemWithId(id);
    }


    /**
     * Retrieves the account data item with a given reference id.
     * @param {string} refId 
     * @returns {AccountDataItem|undefined} <code>undefined</code> is returned if
     * there is no account with the reference id.
     */
    getAccountDataItemWithRefId(refId) {
        return this._accountManager.getAccountDataItemWithRefId(refId);
    }


    /**
     * Helper that converts a quantity in an account's quantity definition
     * to a user-presentable string.
     * @param {*} quantityBaseValue 
     * @returns {string}
     */
    accountQuantityBaseValueToText(id, quantityBaseValue) {
        const accountDataItem = this._accountManager.getAccountDataItemWithId(id);
        return this.pricedItemQuantityBaseValueToText(
            accountDataItem.pricedItemId, quantityBaseValue);
    }

    /**
     * Helper that converts a user-presentable string into a base value for the
     * quantity definition of an account.
     * @param {number} id The id of the account.
     * @param {string} quantityText 
     * @returns {number|undefined}
     */
    accountQuantityTextToBaseValue(id, quantityText) {
        const accountDataItem = this._accountManager.getAccountDataItemWithId(id);
        return this.pricedItemQuantityTextToBaseValue(
            accountDataItem.pricedItemId, quantityText);
    }


    /**
     * @returns {Currency}  The base currency.
     */
    getBaseCurrencyCode() { 
        return this._pricedItemManager.getBaseCurrencyCode();
    }

    /**
     * @returns {number}    The id of the base currency priced item.
     */
    getBaseCurrencyPricedItemId() { 
        return this._pricedItemManager.getBaseCurrencyPricedItemId(); 
    }

    /**
     * @returns {PricedItemDataItem}    The priced item for the base currency.
     */
    getBaseCurrencyPricedItemDataItem() { 
        return this._pricedItemManager.getBaseCurrencyPricedItemDataItem();
    }


    /**
     * @returns {number}    The id of the priced item for the USD currency.
     */
    getCurrencyUSDPricedItemId() {
        return this._pricedItemManager.getCurrencyUSDPricedItemId();
    }

    /**
     * @returns {PricedItemDataItem}    The priced item for the USD currency.
     */
    getCurrencyUSDPricedItemDataItem() {
        return this._pricedItemManager.getCurrencyUSDPricedItemDataItem();
    }


    /**
     * @returns {number}    The id of the priced item for the EUR currency.
     */
    getCurrencyEURPricedItemDataItem() {
        return this._pricedItemManager.getCurrencyEURPricedItemDataItem();
    }

    /**
     * @returns {PricedItemDataItem}    The priced item for the EUR currency.
     */
    getCurrencyEURPricedItem() {
        return this._pricedItemManager.getCurrencyEURPricedItem();
    }


    /**
     * Retrieves the priced item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity 
     * definition, if <code>undefined</code> the currency's quantity definition is used.
     * @returns {number}
     */
    getCurrencyPricedItemId(currency, quantityDefinition) {
        return this._pricedItemManager.getCurrencyPricedItemId(currency, 
            quantityDefinition);
    }

    /**
     * Retrieves a copy of the priced item data item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity 
     * definition, if <code>undefined</code> the currency's quantity definition is used.
     * @returns {PricedItemDataItem}
     */
    getCurrencyPricedItemDataItem(currency, quantityDefinition) {
        return this._pricedItemManager.getCurrencyPricedItemDataItem(currency, 
            quantityDefinition);
    }


    /**
     * @returns {number[]}  Array containing the ids of all the priced items.
     */
    getPricedItemIds() {
        return this._pricedItemManager.getPricedItemIds();
    }


    /**
     * Retrieves a priced item data item with a given id.
     * @param {number} id The id of the priced item to retrieve.
     * @returns {(PricedItemDataItem|undefined)}    A copy of the priced item's data.
     */
    getPricedItemDataItemWithId(id) {
        return this._pricedItemManager.getPricedItemDataItemWithId(id);
    }


    /**
     * Helper that converts a quantity in a priced item's quantity definition
     * to a user-presentable string.
     * @param {nmber} id 
     * @param {number} quantityBaseValue 
     * @returns {string}
     */
    pricedItemQuantityBaseValueToText(id, quantityBaseValue) {
        const pricedItemDataItem 
            = this._pricedItemManager.getPricedItemDataItemWithId(id);
        const quantityDefinition 
            = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
        return quantityDefinition.baseValueToValueText(quantityBaseValue);
    }

    /**
     * Helper that converts a user-presentable string to a base value in a
     * priced item's quantity definition.
     * @param {nmber} id 
     * @param {string} quantityText 
     * @returns {number|undefined}
     */
    pricedItemQuantityTextToBaseValue(id, quantityText) {
        const pricedItemDataItem 
            = this._pricedItemManager.getPricedItemDataItemWithId(id);
        const quantityDefinition 
            = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
        const result = quantityDefinition.fromValueText(quantityText);
        if (!result || !result.quantity) {
            return;
        }
        return result.quantity.getBaseValue();
    }


    /**
     * Retrieves the date range of prices available for a priced item.
     * @param {number} pricedItemId 
     * @returns {YMDDate[]|undefined}   An array containing the oldest and newest 
     * price dates, or <code>undefined</code> if there are no prices.
     */
    async asyncGetPriceDateRange(pricedItemId) {
        return this._priceManager.asyncGetPriceDateRange(pricedItemId);
    }

    /**
     * Retrieves the prices for a priced item within a date range.
     * @param {number} pricedItemId 
     * @param {(YMDDate|string)} ymdDateA   One end of the date range, inclusive.
     * @param {(YMDDate|string)} [ymdDateB=ymdDateA]   The other end of the date 
     * range, inclusive.
     * @returns {PriceDataItem[]}   Array containing the prices within the date range.
     */
    async asyncGetPriceDataItemsInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        return this._priceManager.asyncGetPriceDataItemsInDateRange(pricedItemId, 
            ymdDateA, ymdDateB);
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but before a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, ymdDate) {
        return this._priceManager.asyncGetPriceDataItemOnOrClosestBefore(pricedItemId, 
            ymdDate);
    }


    /**
     * Retrieves the price data item for a priced item that is on or closest to 
     * but after a particular date.
     * @param {number} pricedItemId 
     * @param {YMDDate|string} ymdDate 
     * @returns {PriceDataItem|undefined}
     */
    async asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, ymdDate) {
        return this._priceManager.asyncGetPriceDataItemOnOrClosestAfter(pricedItemId, 
            ymdDate);
    }


    /**
     * @returns {number[]}  Array containing the ids of all the lots.
     */
    getLotIds() {
        return this._lotManager.getLotIds();
    }


    /**
     * 
     * @param {number} id The id of the lot to retrieve.
     * @returns {(LotDataItem|undefined)}    A copy of the lot's data.
     */
    getLotDataItemWithId(id) {
        return this._lotManager.getLotDataItemWithId(id);
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
        return this._transactionManager.asyncGetTransactionDateRange(accountId);
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
        return this._transactionManager.asyncGetTransactionDataItemsInDateRange(
            accountId, ymdDateA, ymdDateB);
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
        return this._transactionManager.asyncGetTransactionDataItemsWithIds(ids);
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for an account, sorted from 
     * oldest to newest.
     * @param {number} accountId 
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForAccount(accountId) {
        return this._transactionManager.asyncGetSortedTransactionKeysForAccount(
            accountId);
    }


    /**
     * Retrieves an array of the {@link TransactionKey}s for a lot, sorted from 
     * oldest to newest.
     * @param {number} lotId 
     * @return {TransactionKey[]}
     */
    async asyncGetSortedTransactionKeysForLot(lotId) {
        return this._transactionManager.asyncGetSortedTransactionKeysForLot(lotId);
    }


    /**
     * Returns the current account state data item for an account. This is the 
     * account state after the newest transaction has been applied.
     * @param {number} accountId 
     * @returns {AccountStateDataItem}
     */
    getCurrentAccountStateDataItem(accountId) {
        return this._transactionManager.getCurrentAccountStateDataItem(accountId);
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
        return this._transactionManager.asyncGetAccountStateDataItemsAfterTransaction(
            accountId, transactionId);
    }


    /**
     * Retrieves the account state data item immediately before a transaction has 
     * been applied to the account.
     * @param {number} accountId 
     * @param {number} transactionId 
     * @returns {AccountStateDataItem[]}    An array containing the account states 
     * immediately before a transaction is applied. Multiple account states are 
     * returned if there are multiple splits referring to the account. The referring 
     * split at index closest to zero is at the first index.
     */
    async asyncGetAccountStateDataItemsBeforeTransaction(accountId, transactionId) {
        return this._transactionManager.asyncGetAccountStateDataItemsBeforeTransaction(
            accountId, transactionId);
    }


    /**
     * Retrieves an array of the ids of transactions that have splits that refer
     * to a given account whose reconcileState is not {@link ReconcileState.RECONCILED}.
     * @param {number} accountId 
     * @returns {number[]}
     */
    async asyncGetNonReconciledIdsForAccountId(accountId) {
        return this._transactionManager.asyncGetNonReconciledIdsForAccountId(accountId);
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
        return this._transactionManager.validateSplits(splits, isModify);
    }


    //
    // Reminders
    //


    //
    // Auto Complete
    //
}
