import { EventEmitter } from 'events';
import { AccountManager } from './Accounts';
import { PricedItemManager } from './PricedItems';
import { LotManager } from './Lots';
import { TransactionManager } from './Transactions';
import { PriceManager } from './Prices';
import { UndoManager } from '../util/Undo';
import { ActionManager } from '../util/Actions';
import { AccountingActions } from './AccountingActions';
import { getCurrency, getCurrencyCode } from '../util/Currency';
import { dataDeepCopy } from '../util/DataDeepCopy';
import { userError } from '../util/UserMessages';

/**
 * The main interface object from the engine, this provides access to the 
 * various managers.
 */
export class AccountingSystem extends EventEmitter {
    constructor(options) {
        super(options);

        options = options || {};

        this._handler = options.handler;

        this._options = this._handler.getOptions();
        this._baseCurrencyCode = options.baseCurrency 
            || this._handler.getBaseCurrencyCode()
            || 'USD';

        // This should come first.
        this._undoManager = new UndoManager(options.undoManager);
        const undoManager = this._undoManager;

        const actionManagerOptions = Object.assign({}, options.actionManager, 
            { undoManager: this._undoManager, });
        this._actionManager = new ActionManager(actionManagerOptions);

        // Needs to come before the account manager...
        this._pricedItemManager = new PricedItemManager(this, options.pricedItemManager);

        this._accountManager = new AccountManager(this, options.accountManager);
        this._lotManager = new LotManager(this, options.lotManager);

        this._priceManager = new PriceManager(this, options.priceManager);
        this._transactionManager 
            = new TransactionManager(this, options.transactionManager);

        this._accountingActions = new AccountingActions(this);


        this._asyncApplyUndoSetBaseCurrency
            = this._asyncApplyUndoSetBaseCurrency.bind(this);
        undoManager.registerUndoApplier('setBaseCurrency', 
            this._asyncApplyUndoSetBaseCurrency);

        this._asyncApplyUndoModifyOptions
            = this._asyncApplyUndoModifyOptions.bind(this);
        undoManager.registerUndoApplier('modifyOptions', 
            this._asyncApplyUndoModifyOptions);
    }


    /**
     * This must be called before the accounting system can be used.
     */
    async asyncSetupForUse() {
        await this._undoManager.asyncSetupForUse();
        await this._pricedItemManager.asyncSetupForUse();
        await this._priceManager.asyncSetupForUse();
        await this._accountManager.asyncSetupForUse();
        await this._lotManager.asyncSetupForUse();
        await this._transactionManager.asyncSetupForUse();
        await this._actionManager.asyncSetupForUse();
    }

    /**
     * @returns {AccountManager}
     */
    getAccountManager() { return this._accountManager; }

    /**
     * @returns {PricedItemManager}
     */
    getPricedItemManager() { return this._pricedItemManager; }

    /**
     * @returns {PriceManager}
     */
    getPriceManager() { return this._priceManager; }

    /**
     * @returns {LotManager}
     */
    getLotManager() { return this._lotManager; }

    /**
     * @returns {TransactionManager}
     */
    getTransactionManager() { return this._transactionManager; }

    /**
     * @returns {UndoManager}
     */
    getUndoManager() { return this._undoManager; }

    /**
     * @returns {ActionManager}
     */
    getActionManager() { return this._actionManager; }

    /**
     * @returns {AccountingActions}
     */
    getAccountingActions() { return this._accountingActions; }


    /**
     * @return {string} The 3 letter currency code for the base currency. 
     * The base currency is used whenever an exchange rate is needed.
     */
    getBaseCurrencyCode() { return this._baseCurrencyCode; }


    /**
     * @returns {Currency}  The currency object for 
     * {@link AccountingSystem#getBaseCurrencyCode}.
     */
    getBaseCurrencyObject() { return getCurrency(this._baseCurrencyCode); }


    /**
     * Fired by {@link AccountingSystem#asyncSetBaseCurrency} after the base
     * currency has been modified.
     * @event AccountingSystem~baseCurrencyChange
     * @type {object}
     * @property {string}   newCurrencyCode
     * @property {string}   oldCurrencyCode
     */

    /**
     * @typedef {object}    AccountingSystem~SetBaseCurrencyResult
     * @property {string}   newCurrencyCode
     * @property {string}   oldCurrencyCode
     * @property {number}   undoId
     */

    /**
     * Changes the base currency.
     * @param {Currency|string} currency 
     * @returns {AccountingSystem~SetBaseCurrencyResult}
     * @fires {AccountingSystem~baseCurrencyChange}
     */
    async asyncSetBaseCurrency(currency, validateOnly) {
        const oldCurrencyCode = this._baseCurrencyCode;
        const currencyCode = getCurrencyCode(currency);
        if (!getCurrency(currencyCode)) {
            throw userError('AccountingSystem-invalid_currency_code', currencyCode);
        }
        if (validateOnly) {
            return;
        }

        await this._handler.asyncSetBaseCurrencyCode(currencyCode);
 
        this._baseCurrencyCode = currency;

        const undoId = await this.getUndoManager()
            .asyncRegisterUndoDataItem('setBaseCurrency', 
                { oldCurrencyCode: oldCurrencyCode, });
            
        this.emit('baseCurrencySet', {
            newCurrencyCode: currencyCode,
            oldCurrencyCode: oldCurrencyCode,
        });
        
        return {
            newCurrencyCode: currencyCode,
            oldCurrencyCode: oldCurrencyCode,
            undoId: undoId,
        };
    }

    async _asyncApplyUndoSetBaseCurrency(undoDataItem) {
        const { oldCurrencyCode } = undoDataItem;
        const previousCurrencyCode = this._baseCurrencyCode;
        await this._handler.asyncSetBaseCurrencyCode(oldCurrencyCode);
        this._baseCurrencyCode = oldCurrencyCode;

        this.emit('baseCurrencySet', 
            { newCurrencyCode: oldCurrencyCode, 
                oldCurrencyCode: previousCurrencyCode, 
            });
    }


    /**
     * Returns the options for the accounting system.
     * @returns {object}
     */
    getOptions() {
        return dataDeepCopy(this._handler.getOptions());
    }


    /**
     * Fired by {@link AccountingSystem#asyncModifyOptions} after the options have
     * been modified.
     * @event AccountingSystem~optionsModify
     * @type {object}
     * @property {object}   newOptions
     * @property {object}   oldOptions
     */

    /**
     * @typedef {object}    AccountingSystem~ModifyOptionsResult
     * @property {object}   newOptions
     * @property {object}   oldOptions
     * @property {number}   undoId
     */

    /**
     * Modifies the options. Options are modified similar to:
     * <pre><code>
     *  newOptions = Object.assign({}, getOptions(), optionChanges);
     * </code</pre>
     * 
     * @param {object} optionChanges
     * @returns {AccountingSystem~ModifyOptionsResult}
     * @fires {AccountingSystem~baseCurrencyChange}
     */
    async asyncModifyOptions(optionChanges) {
        const oldOptions = this.getOptions();
        const newOptions = dataDeepCopy(Object.assign({}, oldOptions, optionChanges));
        
        await this._handler.asyncSetOptions(newOptions);

        const undoId = await this.getUndoManager()
            .asyncRegisterUndoDataItem('modifyOptions', 
                { oldOptions: dataDeepCopy(oldOptions), });
        
        this.emit('optionsModify', {
            newOptions: newOptions,
            oldOptions: oldOptions,
        });
        
        return {
            newOptions: newOptions,
            oldOptions: oldOptions,
            undoId: undoId,
        };
    }

    async _asyncApplyUndoModifyOptions(undoDataItem) {
        const { oldOptions } = undoDataItem;
        const previousOptions = dataDeepCopy(this._handler.getOptions());
        await this._handler.asyncSetOptions(oldOptions);

        this.emit('optionsModify', 
            { newOptions: oldOptions, 
                oldOptions: previousOptions, 
            });
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact 
 * with the {@link AccountingSystem}.
 * @interface
 */
export class AccountingSystemHandler {
    /**
     * @returns {string}    The base currency code.
     */
    getBaseCurrencyCode() {
        throw Error('AccountingSystemHandler.getBaseCurrencyCode() abstract method!');
    }

    /**
     * Changes the base currency.
     * @param {string} currency
     */
    async asyncSetBaseCurrencyCode(currency) {
        throw Error('AccountingSystemHandler.setBaseCurrencyCode() abstract method!');
    }

    /**
     * @returns {object}    The options object.
     */
    getOptions() {
        throw Error('AccountingSystemHandler.getOptions() abstract method!');
    }

    /**
     * Updates the options.
     * @param {object} newOptions
     */
    async asyncSetOptions(newOptions) {
        throw Error('AccountingSystemHandler.asyncSetOptions abstract method!');
    }
}


/**
 * Simple in-memory implementation of {@link AccountingSystemHandler}.
 */
export class InMemoryAccountingSystemHandler extends AccountingSystemHandler {
    constructor(options) {
        super(options);

        this._options = options || {};

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            baseCurrencyCode: this._baseCurrencyCode,
            options: this._options,
        };
    }

    fromJSON(json) {
        this._baseCurrencyCode = json.baseCurrencyCode || 'USD';
        this._options = json.options;
        this.markChanged();
    }

    getBaseCurrencyCode() {
        return this._baseCurrencyCode;
    }

    async asyncSetBaseCurrencyCode(currency) {
        this._baseCurrencyCode = currency;
        this.markChanged();
    }

    getOptions() {
        return this._options;
    }

    async asyncSetOptions(options) {
        this._options = options;

        this.markChanged();
    }

}
