import { AccountManager } from './Accounts';
import { PricedItemManager } from './PricedItems';
import { TransactionManager } from './Transactions';
import { PriceManager } from './Prices';


export class AccountingSystem {
    constructor(options) {
        options = options || {};
        
        this._baseCurrency = options.baseCurrency || 'USD';

        // Needs to come before the account manager...
        this._pricedItemManager = new PricedItemManager(this);

        this._accountManager = new AccountManager(this);
        this._priceManager = new PriceManager(this);
        this._transactionManager = new TransactionManager(this);
    }

    getAccountManager() { return this._accountManager; }

    getPricedItemManager() { return this._pricedItemManager; }

    getPriceManager() { return this._priceManager; }

    getTransactionManager() { return this._transactionManager; }

    getBaseCurrency() { return this._baseCurrency; }
}
