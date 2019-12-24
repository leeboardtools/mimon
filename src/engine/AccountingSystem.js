import { AccountManager } from './Accounts';
import { PricedItemManager } from './PricedItems';
import { TransactionManager } from './Transactions';
import { PriceManager } from './Prices';


export class AccountingSystem {
    constructor(options) {
        options = options || {};

        this._baseCurrency = options.baseCurrency || 'USD';

        // Needs to come before the account manager...
        this._pricedItemManager = new PricedItemManager(this, options.pricedItemManager);

        this._accountManager = new AccountManager(this, options.accountManager);
        this._priceManager = new PriceManager(this, options.priceManager);
        this._transactionManager = new TransactionManager(this, options.transactionManager);
    }

    /**
     * This must be called before the accounting system can be used.
     */
    async asyncSetupForUse() {
        await this._pricedItemManager.asyncSetupForUse();
        await this._priceManager.asyncSetupForUse();
        await this._accountManager.asyncSetupForUse();
        await this._transactionManager.asyncSetupForUse();
    }

    getAccountManager() { return this._accountManager; }

    getPricedItemManager() { return this._pricedItemManager; }

    getPriceManager() { return this._priceManager; }

    getTransactionManager() { return this._transactionManager; }

    getBaseCurrency() { return this._baseCurrency; }


}
