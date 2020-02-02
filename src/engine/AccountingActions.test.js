import * as ASTH from './AccountingSystemTestHelpers';
import * as A from './Accounts';

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
    accountManager.isDebug = true;
    const modifyAccountAction = actions.createModifyAccountAction(settingsA1);
    await actionManager.asyncApplyAction(modifyAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));

    await actionManager.asyncUndoLastAppliedActions();
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));
});