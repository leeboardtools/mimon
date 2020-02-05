import { EventEmitter } from 'events';
import { AccountManager } from './Accounts';
import { PricedItemManager } from './PricedItems';
import { LotManager } from './Lots';
import { TransactionManager } from './Transactions';
import { PriceManager } from './Prices';
import { UndoManager } from '../util/Undo';
import { ActionManager } from '../util/Actions';
import { AccountingActions } from './AccountingActions';
import { getCurrency } from '../util/Currency';

/**
 * The main interface object from the engine, this provides access to the various managers.
 */
export class AccountingSystem extends EventEmitter {
    constructor(options) {
        super(options);

        options = options || {};

        this._baseCurrency = options.baseCurrency || 'USD';

        // This should come first.
        this._undoManager = new UndoManager(options.undoManager);

        const actionManagerOptions = Object.assign({}, options.actionManager, { undoManager: this._undoManager, });
        this._actionManager = new ActionManager(actionManagerOptions);

        // Needs to come before the account manager...
        this._pricedItemManager = new PricedItemManager(this, options.pricedItemManager);

        this._accountManager = new AccountManager(this, options.accountManager);
        this._lotManager = new LotManager(this, options.lotManager);

        this._priceManager = new PriceManager(this, options.priceManager);
        this._transactionManager = new TransactionManager(this, options.transactionManager);

        this._accountingActions = new AccountingActions(this);
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
     * @return {string} The 3 letter currency code for the base currency. The base currency is used whenever an
     * exchange rate is needed.
     */
    getBaseCurrency() { return this._baseCurrency; }


    /**
     * @returns {Currency}  The currency object for {@link AccountingSystem#getBaseCurrency}.
     */
    getBaseCurrencyObject() { return getCurrency(this._baseCurrency); }


    /**
     * Returns an data object that can be JSON.stringify()'d out that contains options for the accounting system.
     * The object can be passed to the constructor (the handlers must still be set) to restore
     * the options.
     * @returns {object}
     */
    getOptions() {
        return {
            baseCurrency: this._baseCurrency,
        };
    }

}
