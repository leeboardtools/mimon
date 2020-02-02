import * as ASTH from './AccountingSystemTestHelpers';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as P from './Prices';



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

    await actionManager.asyncReapplyLastUndoneActions();
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));


    // Validation.
    const invalidA1 = {
        id: settingsA.id,
        type: A.AccountType.LIABILITY.name,
    };
    const invalidModifyAction = actions.createModifyAccountAction(invalidA1);
    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();

    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));
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


    // Modify priced item.
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

    await actionManager.asyncReapplyLastUndoneActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));


    // Invalid modify.
    const invalidA1 = {
        id: settingsA.id,
        type: PI.PricedItemType.PROPERTY.name,
    };
    const invalidModifyAction = actions.createModifyPricedItemAction(invalidA1);
    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));
});



//
//---------------------------------------------------------
//
test('AccountingActions-Lots', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const lotManager = accountingSystem.getLotManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    let currentSettings;
    actions.registerAsyncActionCallback('addLot', (action, result) => {
        if (currentSettings) {
            currentSettings.id = result.newLotDataItem.id;
        }
    });


    const settingsA = {
        pricedItemId: sys.aaplPricedItemId,
        description: 'Lot A',
    };

    // New Lot
    const newLotAction = actions.createAddLotAction(settingsA);
    
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(newLotAction);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Remove Lot
    const removeLotAction = actions.createRemoveLotAction(settingsA.id);
    await actionManager.asyncApplyAction(removeLotAction);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));


    // Modify Lot.
    const settingsA1 = {
        id: settingsA.id,
        pricedItemId: sys.intcPricedItemId,
        description: 'Modified Lot A',
    };
    const modifyLotAction = actions.createModifyLotAction(settingsA1);
    await actionManager.asyncApplyAction(modifyLotAction);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));

    await actionManager.asyncUndoLastAppliedActions();
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA));

    await actionManager.asyncReapplyLastUndoneActions();
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toEqual(expect.objectContaining(settingsA1));

});



//
//---------------------------------------------------------
//
test('AccountingActions-Prices', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const priceManager = accountingSystem.getPriceManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    const pricesA = [
        { ymdDate: '2019-01-02', close: 12345, open: 11111, },
        { ymdDate: '2019-01-03', close: 23456, open: 22222, },
        { ymdDate: '2019-01-04', close: 34567, open: 33333, },
        { ymdDate: '2019-01-05', close: 45678, open: 44444, },
        { ymdDate: '2019-01-06', close: 56789, open: 55555, },
    ];
    const actionA = actions.createAddPricesAction(sys.aaplPricedItemId, pricesA);
    await actionManager.asyncApplyAction(actionA);
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual(pricesA);

    await actionManager.asyncUndoLastAppliedActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual([]);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual(pricesA);


    const actionB = actions.createRemovePricesInDateRange(sys.aaplPricedItemId, '2019-01-03', '2019-01-05');
    await actionManager.asyncApplyAction(actionB);
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual([
        pricesA[0], pricesA[4],
    ]);

    await actionManager.asyncUndoLastAppliedActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual(pricesA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, '2019-01-02', '2019-01-06')).toEqual([
        pricesA[0], pricesA[4],
    ]);
});
