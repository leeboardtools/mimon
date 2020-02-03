import { EventEmitter } from 'events';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as L from './Lots';
import * as P from './Prices';
import * as T from './Transactions';
import { getYMDDateString, YMDDate } from '../util/YMDDate';
import { userMsg } from '../util/UserMessages';

/**
 * @event AccountingActions#actionApply
 * @param {ActionDataItem}  actionDataItem  The action that was applied.
 * @param {object}  result  The result returned by the corresponding manager function.
 */

/**
 * Class that creates the various actions that apply to an {@link AccountingSystem}.
 * <p>
 * When an action created by {@link AccountingActions} is applied, an event that has the form
 * of {@link AccountingActions#event:actionApply} is fired. The event name is the type property
 * of the {@link ActionDataItem}.
 * <p>
 * Listening on events is necessary to obtain the results of an action, particularly the add actions.
 * For example, in order to obtain the account id of a newly added account via the action returned by
 * {@link AccountingActions#createAddAccountAction}, you would need to listen to the 'addAccount' event,
 * and obtain the id from result.newAccountDataItem.id.
 */
export class AccountingActions extends EventEmitter {
    constructor(accountingSystem) {
        super();

        this._accountingSystem = accountingSystem;

        const actionManager = accountingSystem.getActionManager();

        this._asyncActionCallbacksByType = new Map();

        this._asyncAddAccountApplier = this._asyncAddAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('addAccount', this._asyncAddAccountApplier);

        this._asyncRemoveAccountApplier = this._asyncRemoveAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeAccount', this._asyncRemoveAccountApplier);

        this._asyncModifyAccountApplier = this._asyncModifyAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyAccount', this._asyncModifyAccountApplier);


        this._asyncAddPricedItemApplier = this._asyncAddPricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('addPricedItem', this._asyncAddPricedItemApplier);

        this._asyncRemovePricedItemApplier = this._asyncRemovePricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('removePricedItem', this._asyncRemovePricedItemApplier);

        this._asyncModifyPricedItemApplier = this._asyncModifyPricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyPricedItem', this._asyncModifyPricedItemApplier);

        
        this._asyncAddLotApplier = this._asyncAddLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('addLot', this._asyncAddLotApplier);

        this._asyncRemoveLotApplier = this._asyncRemoveLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeLot', this._asyncRemoveLotApplier);

        this._asyncModifyLotApplier = this._asyncModifyLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyLot', this._asyncModifyLotApplier);


        this._asyncAddPricesApplier = this._asyncAddPricesApplier.bind(this);
        actionManager.registerAsyncActionApplier('addPrices', this._asyncAddPricesApplier);

        this._asyncRemovePricesInDateRangeApplier = this._asyncRemovePricesInDateRangeApplier.bind(this);
        actionManager.registerAsyncActionApplier('removePricesInDateRange', this._asyncRemovePricesInDateRangeApplier);

        
        this._asyncAddTransactionsApplier = this._asyncAddTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('addTransactions', this._asyncAddTransactionsApplier);

        this._asyncRemoveTransactionsApplier = this._asyncRemoveTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeTransactions', this._asyncRemoveTransactionsApplier);

        this._asyncModifyTransactionsApplier = this._asyncModifyTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyTransactions', this._asyncModifyTransactionsApplier);
        
    }

    async asyncSetupForUse() {
    }


    _emitActionEvent(isValidateOnly, action, result) {
        if (!isValidateOnly) {
            this.emit(action.type, action, result);
        }
    }


    /**
     * Creates an action for adding a new account.
     * @param {Account|AccountDataItem} account The information for the new account.
     * @returns {ActionDataItem}
     */
    createAddAccountAction(account) {
        const accountDataItem = A.getAccountDataItem(account, true);
        return { type: 'addAccount', accountDataItem: accountDataItem, name: userMsg('Actions-addAccount'), };
    }

    async _asyncAddAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncAddAccount(action.accountDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing an account.
     * @param {number} accountId 
     * @returns {ActionDataItem}
     */
    createRemoveAccountAction(accountId) {
        return { type: 'removeAccount', accountId: accountId, name: userMsg('Actions-removeAccount'), };
    }

    async _asyncRemoveAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncRemoveAccount(action.accountId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying an account.
     * @param {Account|AccountDataItem} accountUpdates The updates to the account, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyAccountAction(accountUpdates) {
        const accountDataItem = A.getAccountDataItem(accountUpdates, true);
        return { type: 'modifyAccount', accountDataItem: accountDataItem, name: userMsg('Actions-modifyAccount'), };
    }

    async _asyncModifyAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncModifyAccount(action.accountDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItem The information for the new priced item.
     * @returns {ActionDataItem}
     */
    createAddPricedItemAction(pricedItem) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItem, true);
        return { type: 'addPricedItem', pricedItemDataItem: pricedItemDataItem, name: userMsg('Actions-addPricedItem'), };
    }

    async _asyncAddPricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncAddPricedItem(action.pricedItemDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a priced item.
     * @param {number} pricedItemId 
     * @returns {ActionDataItem}
     */
    createRemovePricedItemAction(pricedItemId) {
        return { type: 'removePricedItem', pricedItemId: pricedItemId, name: userMsg('Actions-removePricedItem'), };
    }

    async _asyncRemovePricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncRemovePricedItem(action.pricedItemId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItemUpdates The updates to the priced item, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyPricedItemAction(pricedItemUpdates) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItemUpdates, true);
        return { type: 'modifyPricedItem', pricedItemDataItem: pricedItemDataItem, name: userMsg('Actions-modifyPricedItem'), };
    }

    async _asyncModifyPricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncModifyPricedItem(action.pricedItemDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new lot.
     * @param {Lot|LotDataItem} lot The information for the new lot.
     * @returns {ActionDataItem}
     */
    createAddLotAction(lot) {
        const lotDataItem = L.getLotDataItem(lot, true);
        return { type: 'addLot', accountDataItem: lotDataItem, name: userMsg('Actions-addLot'), };
    }

    async _asyncAddLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncAddLot(action.accountDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a lot.
     * @param {number} lotId 
     * @returns {ActionDataItem}
     */
    createRemoveLotAction(lotId) {
        return { type: 'removeLot', lotId: lotId, name: userMsg('Actions-removeLot'), };
    }

    async _asyncRemoveLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncRemoveLot(action.lotId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a lot.
     * @param {Lot|LotDataItem} lotUpdates The updates to the lot, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyLotAction(lotUpdates) {
        const lotDataItem = L.getLotDataItem(lotUpdates, true);
        return { type: 'modifyLot', lotDataItem: lotDataItem, name: userMsg('Actions-modifyLot'), };
    }

    async _asyncModifyLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncModifyLot(action.lotDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding prices.
     * @param {number} pricedItemId 
     * @param {Price|PriceDataItem|Price[]|PriceDataItem[]} prices 
     * @returns {ActionDataItem}
     */
    createAddPricesAction(pricedItemId, prices) {
        if (!Array.isArray(prices)) {
            prices = [prices];
        }
        const priceDataItems = prices.map((price) => P.getPriceDataItem(price, true));
        return { type: 'addPrices', pricedItemId: pricedItemId, priceDataItems: priceDataItems, name: userMsg('Actions-addPrices'), };
    }

    async _asyncAddPricesApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPriceManager().asyncAddPrices(action.pricedItemId, action.priceDataItems, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing prices in a date range.
     * @param {number} pricedItemId 
     * @param {YMDDate|string|undefined} ymdDateA 
     * @param {YMDDate|string|undefined} ymdDateB 
     * @returns {ActionDataItem}
     */
    createRemovePricesInDateRange(pricedItemId, ymdDateA, ymdDateB) {
        if (!ymdDateA && !ymdDateB) {
            ymdDateA = new YMDDate();
        }

        ymdDateA = getYMDDateString(ymdDateA);
        ymdDateB = getYMDDateString(ymdDateB);

        return { type: 'removePricesInDateRange', pricedItemId: pricedItemId, ymdDateA: ymdDateA, ymdDateB, name: userMsg('Actions-removePrices'), };
    }

    async _asyncRemovePricesInDateRangeApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPriceManager().asyncRemovePricesInDateRange(action.pricedItemId, 
            action.ymdDateA, action.ymdDateB, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);        
    }

    
    /**
     * Creates an action for adding transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} transactions 
     * @returns {ActionDataItem}
     */
    createAddTransactionsAction(transactions) {
        let transactionDataItems;
        if (!Array.isArray(transactions)) {
            transactionDataItems = T.getTransactionDataItem(transactions, true);
        }
        else {
            transactionDataItems = transactions.map((transaction) => T.getTransactionDataItem(transaction, true));
        }
        return { type: 'addTransactions', transactionDataItems: transactionDataItems, name: userMsg('Actions-addTransactions'), };
    }

    async _asyncAddTransactionsApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getTransactionManager().asyncAddTransactions(action.transactionDataItems, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing transactions.
     * @param {number|number[]} transactionIds 
     * @returns {ActionDataItem}
     */
    createRemoveTransactionsAction(transactionIds) {
        if (Array.isArray(transactionIds)) {
            transactionIds = Array.from(transactionIds);
        }

        return { type: 'removeTransactions', transactionIds: transactionIds, name: userMsg('Actions-removeTransactions'), };
    }

    async _asyncRemoveTransactionsApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getTransactionManager().asyncRemoveTransactions(action.transactionIds, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }

    
    /**
     * Creates an action for modifying transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]|TransactionDataItem[]} transactions The transaction modifications, an id property is required.
     * @returns {ActionDataItem}
     */
    createModifyTransactionsAction(transactions) {
        let transactionDataItems;
        if (!Array.isArray(transactions)) {
            transactionDataItems = T.getTransactionDataItem(transactions, true);
        }
        else {
            transactionDataItems = transactions.map((transaction) => T.getTransactionDataItem(transaction, true));
        }
        return { type: 'modifyTransactions', transactionDataItems: transactionDataItems, name: userMsg('Actions-modifyTransactions'), };
    }

    async _asyncModifyTransactionsApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getTransactionManager().asyncModifyTransactions(action.transactionDataItems, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    // Special transaction actions:
    // - Buy Transactions
    // - Merge/Split Transaction?
    // - Reconcile Transactions?
}
