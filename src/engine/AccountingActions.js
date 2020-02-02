import * as A from './Accounts';
import * as PI from './PricedItems';

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

    }

    async asyncSetupForUse() {
    }


    registerAsyncActionCallback(actionType, asyncCallback) {
        this._asyncActionCallbacksByType.set(actionType, asyncCallback);
    }

    async _asyncCallActionCallback(action, result) {
        const asyncCallback = this._asyncActionCallbacksByType.get(action.type);
        if (asyncCallback) {
            await asyncCallback(action, result);
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
        await this._asyncCallActionCallback(action, result);
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
        await this._asyncCallActionCallback(action, result);
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
        await this._asyncCallActionCallback(action, result);
    }


    /**
     * Creates an action for adding a new priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItem The information for the new priced item.
     * @returns {ActionDataItem}
     */
    createAddPricedItemAction(pricedItem) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItem, true);
        return { type: 'addPricedItem', accountDataItem: pricedItemDataItem, };
    }

    async _asyncAddPricedItemApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getPricedItemManager().asyncAddPricedItem(action.accountDataItem, isValidateOnly);
        await this._asyncCallActionCallback(action, result);
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
        await this._asyncCallActionCallback(action, result);
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
        await this._asyncCallActionCallback(action, result);
    }


}