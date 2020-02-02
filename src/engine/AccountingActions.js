import * as A from './Accounts';
import * as PI from './PricedItems';
import * as L from './Lots';
import * as P from './Prices';
import { getYMDDateString, YMDDate } from '../util/YMDDate';

/**
 * Class that creates the various actions that apply to an {@link AccountingSystem}.
 */
export class AccountingActions {
    constructor(accountingSystem) {
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
        
    }

    async asyncSetupForUse() {
    }


    registerAsyncActionCallback(actionType, asyncCallback) {
        this._asyncActionCallbacksByType.set(actionType, asyncCallback);
    }

    async _asyncCallActionCallback(isValidateOnly, action, result) {
        if (!isValidateOnly) {
            const asyncCallback = this._asyncActionCallbacksByType.get(action.type);
            if (asyncCallback) {
                await asyncCallback(action, result);
            }
        }
    }


    /**
     * Creates an action for adding a new account.
     * @param {Account|AccountDataItem} account The information for the new account.
     * @returns {ActionDataItem}
     */
    createAddAccountAction(account) {
        const accountDataItem = A.getAccountDataItem(account, true);
        return { type: 'addAccount', accountDataItem: accountDataItem, };
    }

    async _asyncAddAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncAddAccount(action.accountDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing an account.
     * @param {number} accountId 
     * @returns {ActionDataItem}
     */
    createRemoveAccountAction(accountId) {
        return { type: 'removeAccount', accountId: accountId, };
    }

    async _asyncRemoveAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncRemoveAccount(action.accountId, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying an account.
     * @param {Account|AccountDataItem} accountUpdates The updates to the account, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyAccountAction(accountUpdates) {
        const accountDataItem = A.getAccountDataItem(accountUpdates, true);
        return { type: 'modifyAccount', accountDataItem: accountDataItem, };
    }

    async _asyncModifyAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncModifyAccount(action.accountDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItem The information for the new priced item.
     * @returns {ActionDataItem}
     */
    createAddPricedItemAction(pricedItem) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItem, true);
        return { type: 'addPricedItem', pricedItemDataItem: pricedItemDataItem, };
    }

    async _asyncAddPricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncAddPricedItem(action.pricedItemDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a priced item.
     * @param {number} pricedItemId 
     * @returns {ActionDataItem}
     */
    createRemovePricedItemAction(pricedItemId) {
        return { type: 'removePricedItem', pricedItemId: pricedItemId, };
    }

    async _asyncRemovePricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncRemovePricedItem(action.pricedItemId, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItemUpdates The updates to the priced item, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyPricedItemAction(pricedItemUpdates) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItemUpdates, true);
        return { type: 'modifyPricedItem', pricedItemDataItem: pricedItemDataItem, };
    }

    async _asyncModifyPricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncModifyPricedItem(action.pricedItemDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new lot.
     * @param {Lot|LotDataItem} lot The information for the new lot.
     * @returns {ActionDataItem}
     */
    createAddLotAction(lot) {
        const lotDataItem = L.getLotDataItem(lot, true);
        return { type: 'addLot', accountDataItem: lotDataItem, };
    }

    async _asyncAddLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncAddLot(action.accountDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a lot.
     * @param {number} lotId 
     * @returns {ActionDataItem}
     */
    createRemoveLotAction(lotId) {
        return { type: 'removeLot', lotId: lotId, };
    }

    async _asyncRemoveLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncRemoveLot(action.lotId, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a lot.
     * @param {Lot|LotDataItem} lotUpdates The updates to the lot, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyLotAction(lotUpdates) {
        const lotDataItem = L.getLotDataItem(lotUpdates, true);
        return { type: 'modifyLot', lotDataItem: lotDataItem, };
    }

    async _asyncModifyLotApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getLotManager().asyncModifyLot(action.lotDataItem, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
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
        return { type: 'addPrices', pricedItemId: pricedItemId, priceDataItems: priceDataItems, };
    }

    async _asyncAddPricesApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPriceManager().asyncAddPrices(action.pricedItemId, action.priceDataItems, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
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

        return { type: 'removePricesInDateRange', pricedItemId: pricedItemId, ymdDateA: ymdDateA, ymdDateB, };
    }

    async _asyncRemovePricesInDateRangeApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPriceManager().asyncRemovePricesInDateRange(action.pricedItemId, 
            action.ymdDateA, action.ymdDateB, isValidateOnly);
        await this._asyncCallActionCallback(isValidateOnly, action, result);
        
    }

    
    // Transaction actions

    // Special transaction actions:
    // - Buy Transactions
    // - Merge/Split Transaction?
    // - Reconcile Transactions?
}
