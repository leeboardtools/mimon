import { EventEmitter } from 'events';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as R from './Reminders';
import * as L from './Lots';
import * as P from './Prices';
import * as T from './Transactions';
import { getYMDDateString, YMDDate } from '../util/YMDDate';
import { userMsg } from '../util/UserMessages';
import { createCompositeAction } from '../util/Actions';

/**
 * @event AccountingActions#actionApply
 * @param {ActionDataItem}  actionDataItem  The action that was applied.
 * @param {object}  result  The result returned by the corresponding manager function.
 */



/**
 * Class that creates the various actions that apply to an {@link AccountingSystem}.
 * <p>
 * When an action created by {@link AccountingActions} is applied, an event that has 
 * the form of {@link AccountingActions#event:actionApply} is fired. The event name 
 * is the type property of the {@link ActionDataItem}. Following that event is
 * the firing of an actual {@link AccountingActions#event:actionApply}.
 * <p>
 * Listening on events is necessary to obtain the results of an action, particularly 
 * the add actions. For example, in order to obtain the account id of a newly added 
 * account via the action returned by {@link AccountingActions#createAddAccountAction}, 
 * you would need to listen to the 'addAccount' event, and obtain the id from 
 * result.newAccountDataItem.id.
 */
export class AccountingActions extends EventEmitter {
    constructor(accountingSystem) {
        super();

        this._accountingSystem = accountingSystem;

        const actionManager = accountingSystem.getActionManager();

        this._asyncActionCallbacksByType = new Map();

        this._asyncModifyOptionsApplier = this._asyncModifyOptionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyOptions',
            this._asyncModifyOptionsApplier);

        this._asyncAddAccountApplier = this._asyncAddAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('addAccount', 
            this._asyncAddAccountApplier);

        this._asyncRemoveAccountApplier = this._asyncRemoveAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeAccount', 
            this._asyncRemoveAccountApplier);

        this._asyncModifyAccountApplier = this._asyncModifyAccountApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyAccount', 
            this._asyncModifyAccountApplier);


        this._asyncAddPricedItemApplier = this._asyncAddPricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('addPricedItem', 
            this._asyncAddPricedItemApplier);

        this._asyncRemovePricedItemApplier 
            = this._asyncRemovePricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('removePricedItem', 
            this._asyncRemovePricedItemApplier);

        this._asyncModifyPricedItemApplier 
            = this._asyncModifyPricedItemApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyPricedItem', 
            this._asyncModifyPricedItemApplier);

        
        this._asyncAddLotApplier = this._asyncAddLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('addLot', 
            this._asyncAddLotApplier);

        this._asyncRemoveLotApplier = this._asyncRemoveLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeLot', 
            this._asyncRemoveLotApplier);

        this._asyncModifyLotApplier = this._asyncModifyLotApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyLot', 
            this._asyncModifyLotApplier);


        this._asyncAddPricesApplier = this._asyncAddPricesApplier.bind(this);
        actionManager.registerAsyncActionApplier('addPrices', 
            this._asyncAddPricesApplier);

        this._asyncRemovePricesInDateRangeApplier 
            = this._asyncRemovePricesInDateRangeApplier.bind(this);
        actionManager.registerAsyncActionApplier('removePricesInDateRange', 
            this._asyncRemovePricesInDateRangeApplier);

        
        this._asyncAddTransactionsApplier = this._asyncAddTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('addTransactions', 
            this._asyncAddTransactionsApplier);

        this._asyncRemoveTransactionsApplier 
            = this._asyncRemoveTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeTransactions', 
            this._asyncRemoveTransactionsApplier);

        this._asyncModifyTransactionsApplier 
            = this._asyncModifyTransactionsApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyTransactions', 
            this._asyncModifyTransactionsApplier);


        this._asyncAddReminderApplier = this._asyncAddReminderApplier.bind(this);
        actionManager.registerAsyncActionApplier('addReminder', 
            this._asyncAddReminderApplier);

        this._asyncRemoveReminderApplier 
            = this._asyncRemoveReminderApplier.bind(this);
        actionManager.registerAsyncActionApplier('removeReminder', 
            this._asyncRemoveReminderApplier);

        this._asyncModifyReminderApplier 
            = this._asyncModifyReminderApplier.bind(this);
        actionManager.registerAsyncActionApplier('modifyReminder', 
            this._asyncModifyReminderApplier);
    
        
        // Some synonyms
        this.createAddTransactionAction = this.createAddTransactionsAction;
        this.asyncCreateRemoveTransactionAction 
            = this.asyncCreateRemoveTransactionsAction;
        this.asyncCreateModifyTransactionAction 
            = this.asyncCreateModifyTransactionsAction;
        
    }

    async asyncSetupForUse() {
    }


    _emitActionEvent(isValidateOnly, action, result) {
        if (!isValidateOnly) {
            this.emit(action.type, action, result);
            this.emit('actionApply', action, result);
        }
    }


    /**
     * Creates an action for modifying the accounting system options.
     * @param {object} optionChanges
     * @returns {ActionDataItem}
     */
    createModifyOptionsAction(optionChanges) {
        return { 
            type: 'modifyOptions',
            optionChanges: optionChanges,
            name: userMsg('Actions-modifyOptions'), 
        };
    }

    async _asyncModifyOptionsApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.asyncModifyOptions(
            action.optionChanges, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new account.
     * @param {Account|AccountDataItem} account The information for the new account.
     * @param {number}  [childListIndex]  If specified, the index in the parent's
     * childAccountIds where the account should be placed.
     * @returns {ActionDataItem}
     */
    createAddAccountAction(account, childListIndex) {
        const accountDataItem = A.getAccountDataItem(account, true, childListIndex);
        return { 
            type: 'addAccount', 
            accountDataItem: accountDataItem, 
            childListIndex: childListIndex,
            name: userMsg('Actions-addAccount', accountDataItem.name), 
        };
    }

    async _asyncAddAccountApplier(isValidateOnly, action) {
        const result = await this._accountingSystem.getAccountManager().asyncAddAccount(
            action.accountDataItem, isValidateOnly, action.childListIndex);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing an account.
     * <p>If the account has dependees, the action will have a
     * dependees property set to an array containing the types of dependees.
     * @param {number} accountId 
     * @returns {ActionDataItem}
     */
    async asyncCreateRemoveAccountAction(accountId) {
        const accountDataItem = this._accountingSystem.getAccountManager()
            .getAccountDataItemWithId(accountId);
        let action = { 
            type: 'removeAccount', 
            accountId: accountId, 
            name: userMsg('Actions-removeAccount', accountDataItem.name), 
        };

        const transactionManager = this._accountingSystem.getTransactionManager();
        const transactionKeys 
            = await transactionManager.asyncGetSortedTransactionKeysForAccount(
                accountId) || [];
        
        if (transactionKeys.length) {
            const transactionIds = transactionKeys.map((key) => key.id);
            const transactionsAction 
                = await this.asyncCreateRemoveTransactionsAction(transactionIds);
            action = createCompositeAction(
                {
                    name: userMsg('Actions-remove_transactions_and_account',
                        accountDataItem.name)
                },
                [
                    transactionsAction,
                    action,
                ]);
            action.dependees = [ 'TRANSACTION' ];
        }

        return action;
    }

    async _asyncRemoveAccountApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getAccountManager().asyncRemoveAccount(
                action.accountId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying an account.
     * @param {Account|AccountDataItem} accountUpdates The updates to the account, 
     * the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyAccountAction(accountUpdates) {
        const accountDataItem = A.getAccountDataItem(accountUpdates, true);
        return { 
            type: 'modifyAccount', 
            accountDataItem: accountDataItem, 
            name: userMsg('Actions-modifyAccount'), 
        };
    }

    async _asyncModifyAccountApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getAccountManager().asyncModifyAccount(
                action.accountDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for adding a new priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItem The information for the new 
     * priced item.
     * @returns {ActionDataItem}
     */
    createAddPricedItemAction(pricedItem) {
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItem, true);
        const typeDescription = PI.getPricedItemType(pricedItemDataItem.type)
            .description;
        const name = pricedItemDataItem.name || pricedItemDataItem.ticker;
        return { 
            type: 'addPricedItem', 
            pricedItemDataItem: pricedItemDataItem, 
            name: userMsg('Actions-addPricedItem', 
                typeDescription, name), 
        };
    }

    async _asyncAddPricedItemApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getPricedItemManager().asyncAddPricedItem(
                action.pricedItemDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a priced item.
     * <p>
     * If the priced item has dependees, the action will have a dependees
     * property that's an array containing the types of dependees.
     * @param {number} pricedItemId 
     * @returns {ActionDataItem}
     */
    async asyncCreateRemovePricedItemAction(pricedItemId) {
        const pricedItemDataItem = this._accountingSystem.getPricedItemManager()
            .getPricedItemDataItemWithId(pricedItemId);
        const typeDescription = PI.getPricedItemType(pricedItemDataItem.type)
            .description;
        const name = pricedItemDataItem.name || pricedItemDataItem.ticker;

        let action = { 
            type: 'removePricedItem', 
            pricedItemId: pricedItemId, 
            name: userMsg('Actions-removePricedItem', 
                typeDescription, name), 
        };

        const accountIds = [];
        const accountManager = this._accountingSystem.getAccountManager();
        accountManager.getAccountIds().forEach((id) => {
            const accountDataItem = accountManager.getAccountDataItemWithId(id);
            if (accountDataItem.pricedItemId === pricedItemId) {
                accountIds.push(id);
            }
        });

        const lotIds = [];
        const lotManager = this._accountingSystem.getLotManager();
        lotManager.getLotIds().forEach((id) => {
            const lotDataItem = lotManager.getLotDataItemWithId(id);
            if (lotDataItem.pricedItemId === pricedItemId) {
                lotIds.push(id);
            }
        });

        if (accountIds.length || lotIds.length) {
            const actions = [];
            const dependees = new Set();
            for (let i = 0; i < accountIds.length; ++i) {
                const action = await this.asyncCreateRemoveAccountAction(accountIds[i]);
                if (action.dependees) {
                    action.dependees.forEach((dependee) => dependees.add(dependee));
                }
                dependees.add('ACCOUNT');
                actions.push(action);
            }

            for (let i = 0; i < lotIds.length; ++i) {
                const action = await this.asyncCreateRemoveLotAction(lotIds[i], true);
                if (action.dependees) {
                    action.dependees.forEach((dependee) => dependees.add(dependee));
                }
                dependees.add('LOT');
                actions.push(action);
            }

            // The remove priced item action...
            actions.push(action);

            action = createCompositeAction(
                {
                    name: userMsg('Actions-remove_accounts_and_pricedItem',
                        typeDescription, name), 
                },
                actions);
            action.dependees = Array.from(dependees.values());
        }

        return action;
    }

    async _asyncRemovePricedItemApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getPricedItemManager().asyncRemovePricedItem(
                action.pricedItemId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a priced item.
     * @param {PricedItem|PricedItemDataItem} pricedItemUpdates The updates to the 
     * priced item, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyPricedItemAction(pricedItemUpdates) {
        const originalPricedItemDataItem = this._accountingSystem.getPricedItemManager()
            .getPricedItemDataItemWithId(pricedItemUpdates.id);
        const typeDescription = PI.getPricedItemType(originalPricedItemDataItem.type)
            .description;
        const name = originalPricedItemDataItem.name || originalPricedItemDataItem.ticker;
        
        const pricedItemDataItem = PI.getPricedItemDataItem(pricedItemUpdates, true);
        return { 
            type: 'modifyPricedItem', 
            pricedItemDataItem: pricedItemDataItem, 
            name: userMsg('Actions-modifyPricedItem', typeDescription, name), 
        };
    }

    async _asyncModifyPricedItemApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getPricedItemManager().asyncModifyPricedItem(
                action.pricedItemDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }



    /**
     * Creates an action for adding a new lot.
     * @param {Lot|LotDataItem} lot The information for the new lot.
     * @returns {ActionDataItem}
     */
    createAddLotAction(lot) {
        const lotDataItem = L.getLotDataItem(lot, true);
        return { 
            type: 'addLot', 
            lotDataItem: lotDataItem, 
            name: userMsg('Actions-addLot'), 
        };
    }

    async _asyncAddLotApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getLotManager().asyncAddLot(
                action.lotDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a lot.
     * <p>If the lot has dependees, the action will have a dependees property that's
     * an array containing the types of dependees.
     * @param {number} lotId 
     * @returns {ActionDataItem}
     */
    async asyncCreateRemoveLotAction(lotId, ignoreTransactions) {
        let action = { 
            type: 'removeLot', 
            lotId: lotId, 
            name: userMsg('Actions-removeLot'), 
        };

        if (!ignoreTransactions) {
            const transactionManager = this._accountingSystem.getTransactionManager();
            const transactionKeys 
                = await transactionManager.asyncGetSortedTransactionKeysForLot(
                    lotId) || [];
            
            if (transactionKeys.length) {
                const transactionIds = transactionKeys.map((key) => key.id);
                const transactionsAction 
                    = await this.asyncCreateRemoveTransactionsAction(transactionIds);
                action = createCompositeAction(
                    {
                        name: userMsg('Actions-remove_transactions_and_lot'),
                    },
                    [
                        transactionsAction,
                        action,
                    ]);
                action.dependees = ['TRANSACTION'];
            }
        }

        return action;
    }

    async _asyncRemoveLotApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getLotManager().asyncRemoveLot(
                action.lotId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a lot.
     * @param {Lot|LotDataItem} lotUpdates The updates to the lot, the id 
     * property is required.
     * @returns {ActionDataItem}
     */
    createModifyLotAction(lotUpdates) {
        const lotDataItem = L.getLotDataItem(lotUpdates, true);
        return { 
            type: 'modifyLot', 
            lotDataItem: lotDataItem, 
            name: userMsg('Actions-modifyLot'), 
        };
    }

    async _asyncModifyLotApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getLotManager().asyncModifyLot(
                action.lotDataItem, isValidateOnly);
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
        return { 
            type: 'addPrices', 
            pricedItemId: pricedItemId, 
            priceDataItems: priceDataItems, 
            name: userMsg('Actions-addPrices'), 
        };
    }

    async _asyncAddPricesApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getPriceManager().asyncAddPrices(
                action.pricedItemId, action.priceDataItems, isValidateOnly);
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

        return { 
            type: 'removePricesInDateRange', 
            pricedItemId: pricedItemId, 
            ymdDateA: ymdDateA, 
            ymdDateB: ymdDateB, 
            name: userMsg('Actions-removePrices'), 
        };
    }

    async _asyncRemovePricesInDateRangeApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getPriceManager().asyncRemovePricesInDateRange(
                action.pricedItemId, action.ymdDateA, action.ymdDateB, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);        
    }

    
    /**
     * Creates an action for adding transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]
     *          |TransactionDataItem[]} transactions 
     * @returns {ActionDataItem}
     */
    createAddTransactionsAction(transactions) {
        let transactionDataItems;
        if (!Array.isArray(transactions)) {
            transactionDataItems = T.getTransactionDataItem(transactions, true);
        }
        else {
            transactionDataItems = transactions.map((transaction) => 
                T.getTransactionDataItem(transaction, true));
        }
        return { 
            type: 'addTransactions', 
            transactionDataItems: transactionDataItems, 
            name: userMsg('Actions-addTransactions'), 
        };
    }

    async _asyncAddTransactionsApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getTransactionManager().asyncAddTransactions(
                action.transactionDataItems, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing transactions.
     * @param {number|number[]} transactionIds 
     * @returns {ActionDataItem}
     */
    async asyncCreateRemoveTransactionsAction(transactionIds) {
        if (Array.isArray(transactionIds)) {
            transactionIds = Array.from(transactionIds);
        }

        return { 
            type: 'removeTransactions', 
            transactionIds: transactionIds, 
            name: userMsg('Actions-removeTransactions'), 
        };
    }

    async _asyncRemoveTransactionsApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getTransactionManager()
                .asyncRemoveTransactions(action.transactionIds, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }

    
    /**
     * Creates an action for modifying transactions.
     * @param {Transaction|TransactionDataItem|Transaction[]
     * |TransactionDataItem[]} transactions The transaction modifications, 
     * an id property is required.
     * @returns {ActionDataItem}
     */
    async asyncCreateModifyTransactionsAction(transactions) {
        let transactionDataItems;
        if (!Array.isArray(transactions)) {
            transactionDataItems = T.getTransactionDataItem(transactions, true);
        }
        else {
            transactionDataItems = transactions.map((transaction) => 
                T.getTransactionDataItem(transaction, true));
        }
        return { 
            type: 'modifyTransactions', 
            transactionDataItems: transactionDataItems, 
            name: userMsg('Actions-modifyTransactions'), 
        };
    }

    async _asyncModifyTransactionsApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getTransactionManager()
                .asyncModifyTransactions(action.transactionDataItems, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    // Special transaction actions:
    // - Buy Transactions
    // - Merge/Split Transaction?
    // - Reconcile Transactions?


    /**
     * Creates an action for adding a new reminder.
     * @param {Reminder|ReminderDataItem} reminder The information for the new 
     * reminder.
     * @returns {ActionDataItem}
     */
    createAddReminderAction(reminder) {
        const reminderDataItem = R.getReminderDataItem(reminder, true);
        return { 
            type: 'addReminder', 
            reminderDataItem: reminderDataItem, 
            name: userMsg('Actions-addReminder'), 
        };
    }

    async _asyncAddReminderApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getReminderManager().asyncAddReminder(
                action.reminderDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for removing a reminder.
     * @param {number} reminderId 
     * @returns {ActionDataItem}
     */
    createRemoveReminderAction(reminderId) {
        return { 
            type: 'removeReminder', 
            reminderId: reminderId, 
            name: userMsg('Actions-removeReminder'), 
        };
    }

    async _asyncRemoveReminderApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getReminderManager().asyncRemoveReminder(
                action.reminderId, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }


    /**
     * Creates an action for modifying a reminder.
     * @param {Reminder|ReminderDataItem} reminderUpdates The updates to the 
     * reminder, the id property is required.
     * @returns {ActionDataItem}
     */
    createModifyReminderAction(reminderUpdates) {
        const reminderDataItem = R.getReminderDataItem(reminderUpdates, true);
        return { 
            type: 'modifyReminder', 
            reminderDataItem: reminderDataItem, 
            name: userMsg('Actions-modifyReminder'), 
        };
    }

    async _asyncModifyReminderApplier(isValidateOnly, action) {
        const result 
            = await this._accountingSystem.getReminderManager().asyncModifyReminder(
                action.reminderDataItem, isValidateOnly);
        this._emitActionEvent(isValidateOnly, action, result);
    }
}
