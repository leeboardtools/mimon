import { EventEmitter } from 'events';
import { AccountManager } from './Accounts';
import { PricedItemManager } from './PricedItems';
import { LotManager } from './Lots';
import { TransactionManager } from './Transactions';
import { PriceManager } from './Prices';
import { ReminderManager } from './Reminders';
import { AutoCompleteSplitsManager } from './AutoCompleteSplits';
import { UndoManager } from '../util/Undo';
import { ActionManager } from '../util/Actions';
import { AccountingActions } from './AccountingActions';
import { dataDeepCopy } from '../util/DataDeepCopy';
import { dataChange } from '../util/DataChange';

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
        
        this._reminderManager = new ReminderManager(this, options.reminderManager);

        this._autoCompleteSplitsManager 
            = new AutoCompleteSplitsManager(this, options.autoCompleteSplitsManager);

        this._accountingActions = new AccountingActions(this);


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
        await this._reminderManager.asyncSetupForUse();
        await this._autoCompleteSplitsManager.asyncSetupForUse();
        await this._actionManager.asyncSetupForUse();
    }

    shutDownFromUse() {
        if (this._actionManager) {
            this._actionManager.shutDownFromUse();
            this._actionManager = undefined;
        }

        if (this.undoManager) {
            this._undoManager.shutDownFromUse();
            this._undoManager = undefined;
        }

        if (this._autoCompleteSplitsManager) {
            this._autoCompleteSplitsManager.shutdownFromUse();
            this._autoCompleteSplitsManager = undefined;
        }

        if (this._reminderManager) {
            this._reminderManager.shutDownFromUse();
            this._reminderManager = undefined;
        }

        if (this._transactionManager) {
            this._transactionManager.shutDownFromUse();
            this._transactionManager = undefined;
        }

        if (this._lotManager) {
            this._lotManager.shutDownFromUse();
            this._lotManager = undefined;
        }

        if (this._pricedItemManager) {
            this._pricedItemManager.shutDownFromUse();
            this._pricedItemManager = undefined;
        }

        if (this._priceManager) {
            this._priceManager.shutDownFromUse();
            this._priceManager = undefined;
        }

        if (this._accountManager) {
            this._accountManager.shutDownFromUse();
            this._accountManager = undefined;
        }
    }

    toJSON() {
        // Just so we can JSON.stringify() the various managers without
        // running into a circular reference...
        return 'AccountingSystem';
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
     * @returns {ReminderManager}
     */
    getReminderManager() { return this._reminderManager; }

    /**
     * @returns {AutoCompleteSplitsManager}
     */
    getAutoCompleteSplitsManager() { return this._autoCompleteSplitsManager; }

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
     * Returns a copy of the options for the accounting system.
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
     * </code></pre>
     * 
     * @param {object} optionChanges
     * @returns {AccountingSystem~ModifyOptionsResult}
     * @fires {AccountingSystem~optionsModify}
     */
    async asyncModifyOptions(optionChanges) {
        const oldOptions = this.getOptions();
        const result = dataChange(oldOptions, optionChanges);
        const newOptions = dataDeepCopy(result.newObject);
        
        await this._handler.asyncSetOptions(newOptions);

        const undoId = await this.getUndoManager()
            .asyncRegisterUndoDataItem('modifyOptions', 
                { oldChangedValues: result.oldChangedValues, });
        
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
        const { oldChangedValues } = undoDataItem;
        const previousOptions = dataDeepCopy(this._handler.getOptions());

        const result = dataChange(previousOptions, oldChangedValues);
        const oldOptions = result.newObject;

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
            options: this._options,
        };
    }

    fromJSON(json) {
        this._options = json.options;
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
