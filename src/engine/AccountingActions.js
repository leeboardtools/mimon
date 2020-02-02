import * as A from './Accounts';

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


}