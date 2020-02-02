import * as ASTH from './AccountingSystemTestHelpers';
import * as A from './Accounts';
import * as PI from './PricedItems';



//
//---------------------------------------------------------
//
test('AccountingActions-Accounts', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    const baseCurrencyPricedItemId = accountingSystem.getPricedItemManager().getCurrencyBasePricedItemId();

    let currentSettings;
    actions.registerAsyncActionCallback('addAccount', (action, result) => {
        if (currentSettings) {
            currentSettings.id = result.newAccountDataItem.id;
        }
    });

    const settingsA = {
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.BANK.name,
        pricedItemId: baseCurrencyPricedItemId,
        name: 'New Bank Account',
    };

    // New Account
    const newAccountAction = actions.createAddAccountAction(settingsA);
    
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(newAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Remove Account
    const removeAccountAction = actions.createRemoveAccountAction(settingsA.id);
    await actionManager.asyncApplyAction(removeAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Modify account.
    const settingsA1 = {
        id: settingsA.id,
        type: A.AccountType.CASH.name,
        name: 'Emergency Cash',
    };
    const modifyAccountAction = actions.createModifyAccountAction(settingsA1);
    await actionManager.asyncApplyAction(modifyAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));

    await actionManager.asyncUndoLastAppliedActions();
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));
});



//
//---------------------------------------------------------
//
test('AccountingActions-PricedItems', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const pricedItemManager = accountingSystem.getPricedItemManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    let currentSettings;
    actions.registerAsyncActionCallback('addPricedItem', (action, result) => {
        if (currentSettings) {
            currentSettings.id = result.newPricedItemDataItem.id;
        }
    });

    const settingsA = {
        type: PI.PricedItemType.SECURITY.name,
        currency: 'EUR',
        quantityDefinition: 'DecimalDefinition_4',
        name: 'New Security',
        ticker: 'AAPL',
    };

    // New Priced Item
    const newPricedItemAction = actions.createAddPricedItemAction(settingsA);
    
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(newPricedItemAction);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Remove PricedItem
    const removePricedItemAction = actions.createRemovePricedItemAction(settingsA.id);
    await actionManager.asyncApplyAction(removePricedItemAction);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Modify account.
    const settingsA1 = {
        id: settingsA.id,
        currency: 'USD',
        quantityDefinition: 'DecimalDefinition_2',
        name: 'Modified Security',
        ticker: 'IBM',
    };
    const modifyPricedItemAction = actions.createModifyPricedItemAction(settingsA1);
    await actionManager.asyncApplyAction(modifyPricedItemAction);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));

    await actionManager.asyncUndoLastAppliedActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));

});
