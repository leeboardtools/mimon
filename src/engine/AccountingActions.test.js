import * as ASTH from './AccountingSystemTestHelpers';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as RE from '../util/Repeats';
import * as T from './Transactions';
import * as Q from '../util/Quantities';



//
//---------------------------------------------------------
//
test('AccountingActions-Accounts', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    const currencyBasePricedItemId 
        = accountingSystem.getPricedItemManager().getBaseCurrencyPricedItemId();

    let currentSettings;
    actions.on('addAccount', (action, result) => {
        if (currentSettings) {
            currentSettings.id = result.newAccountDataItem.id;
        }
    });

    const settingsA = {
        parentAccountId: sys.currentAssetsId,
        type: A.AccountType.BANK.name,
        pricedItemId: currencyBasePricedItemId,
        name: 'New Bank Account',
    };

    // New Account
    const newAccountAction = actions.createAddAccountAction(settingsA);
    
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(newAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Remove Account
    const removeAccountAction = await actions.asyncCreateRemoveAccountAction(
        settingsA.id);
    expect(removeAccountAction.dependees).toBeUndefined();

    await actionManager.asyncApplyAction(removeAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Modify account.
    const settingsA1 = {
        id: settingsA.id,
        type: A.AccountType.CASH.name,
        name: 'Emergency Cash',
    };
    const modifyAccountAction = actions.createModifyAccountAction(settingsA1);
    await actionManager.asyncApplyAction(modifyAccountAction);
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);

    await actionManager.asyncUndoLastAppliedActions();
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);


    // Validation.
    const invalidA1 = {
        id: settingsA.id,
        type: A.AccountType.LIABILITY.name,
    };
    const invalidModifyAction = actions.createModifyAccountAction(invalidA1);
    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();

    expect(accountManager.getAccountDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);
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
    actions.on('addPricedItem', (action, result) => {
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
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Remove PricedItem
    const removePricedItemAction 
        = await actions.asyncCreateRemovePricedItemAction(settingsA.id);
    expect(removePricedItemAction.dependees).toBeUndefined();

    await actionManager.asyncApplyAction(removePricedItemAction);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


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
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);

    await actionManager.asyncUndoLastAppliedActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);


    // Invalid modify.
    const invalidA1 = {
        id: settingsA.id,
        type: PI.PricedItemType.PROPERTY.name,
    };
    const invalidModifyAction = actions.createModifyPricedItemAction(invalidA1);
    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();
    expect(pricedItemManager.getPricedItemDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);
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
    actions.on('addLot', (action, result) => {
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
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Remove Lot
    const removeLotAction = await actions.asyncCreateRemoveLotAction(settingsA.id);
    expect(removeLotAction.dependees).toBeUndefined();

    await actionManager.asyncApplyAction(removeLotAction);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Modify Lot.
    const settingsA1 = {
        id: settingsA.id,
        pricedItemId: sys.intcPricedItemId,
        description: 'Modified Lot A',
    };
    const modifyLotAction = actions.createModifyLotAction(settingsA1);
    await actionManager.asyncApplyAction(modifyLotAction);
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);

    await actionManager.asyncUndoLastAppliedActions();
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(lotManager.getLotDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);

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
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual(pricesA);

    await actionManager.asyncUndoLastAppliedActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual([]);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual(pricesA);


    const actionB = actions.createRemovePricesInDateRange(sys.aaplPricedItemId, 
        '2019-01-03', '2019-01-05');
    await actionManager.asyncApplyAction(actionB);
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual([
        pricesA[0], pricesA[4],
    ]);

    await actionManager.asyncUndoLastAppliedActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual(pricesA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await priceManager.asyncGetPriceDataItemsInDateRange(sys.aaplPricedItemId, 
        '2019-01-02', '2019-01-06')).toEqual([
        pricesA[0], pricesA[4],
    ]);
});



//
//---------------------------------------------------------
//
test('AccountingActions-Tranasctions', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    let currentSettings;
    actions.on('addTransactions', (action, result) => {
        if (currentSettings) {
            if (!Array.isArray(currentSettings)) {
                currentSettings.id = result.newTransactionDataItem.id;
            }
            else {
                for (let i = 0; i < currentSettings.length; ++i) {
                    currentSettings[i].id = result.newTransactionDataItems[i].id;
                }
            }
        }
    });


    const settingsA = [
        {
            ymdDate: '2019-10-05',
            description: 'First A',
            splits: [
                { accountId: sys.cashId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: 10000, },
                { accountId: sys.checkingId, 
                    reconcileState: T.ReconcileState.PENDING.name, 
                    quantityBaseValue: -10000, },
            ],
        },
        {
            ymdDate: '2019-10-10',
            description: 'Second A',
            splits: [
                { accountId: sys.cashId, 
                    reconcileState: T.ReconcileState.RECONCILED.name, 
                    quantityBaseValue: 20000, },
                { accountId: sys.checkingId, 
                    reconcileState: T.ReconcileState.PENDING.name, 
                    quantityBaseValue: -20000, },
            ],
        },
    ];

    const actionA = actions.createAddTransactionsAction(settingsA);
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(actionA);

    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(settingsA[0]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toMatchObject(settingsA[1]);


    const settingsB = {
        ymdDate: '2019-10-15',
        splits: [
            { accountId: sys.cashId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: -2000, },
            { accountId: sys.groceriesId, 
                reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                quantityBaseValue: 2000, },
        ],

    };

    const actionB = actions.createAddTransactionsAction(settingsB);
    currentSettings = settingsB;
    await actionManager.asyncApplyAction(actionB);
    currentSettings = undefined;

    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(settingsB);

    await actionManager.asyncUndoLastAppliedActions(2);

    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toBeUndefined();


    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(settingsA[0]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toMatchObject(settingsA[1]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(settingsB);


    // Modify transaction
    const settingsA1 = [
        {
            id: settingsA[0].id,
            ymdDate: '2019-10-20',
        },
        {
            id: settingsB.id,
            splits: [
                { accountId: sys.cashId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: -3000, },
                { accountId: sys.groceriesId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: 3000, },
            ],    
        }
    ];

    const modifyAction = await actions.asyncCreateModifyTransactionsAction(settingsA1);
    await actionManager.asyncApplyAction(modifyAction);

    const modifiedA0 = Object.assign({}, settingsA[0], settingsA1[0]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(modifiedA0);

    const modifiedB = Object.assign({}, settingsB, settingsA1[1]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(modifiedB);

    await actionManager.asyncUndoLastAppliedActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(settingsA[0]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toMatchObject(settingsA[1]);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(settingsB);


    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(modifiedA0);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(modifiedB);


    // Remove transaction.
    const removeAction 
        = await actions.asyncCreateRemoveTransactionsAction(settingsA[1].id);
    await actionManager.asyncApplyAction(removeAction);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toMatchObject(settingsA[1]);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[1].id))
        .toBeUndefined();


    // Multiple remove transactions
    const removeActionB = await actions.asyncCreateRemoveTransactionsAction(
        [settingsA[0].id, settingsB.id]);
    await actionManager.asyncApplyAction(removeActionB);

    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(modifiedA0);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(modifiedB);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(2);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsA[0].id))
        .toMatchObject(modifiedA0);
    expect(await transactionManager.asyncGetTransactionDataItemWithId(settingsB.id))
        .toMatchObject(modifiedB);


    // Check validation.
    const invalidA1 = [
        {
            id: settingsA[0].id,
            ymdDate: '2019-10-20',
        },
        {
            id: settingsB.id,
            splits: [
                { accountId: sys.cashId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: -3000, },
                { accountId: sys.groceriesId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: 4000, },
            ],    
        }
    ];
    const invalidModifyAction 
        = await actions.asyncCreateModifyTransactionsAction(invalidA1);
    expect(await actionManager.asyncValidateApplyAction(invalidModifyAction))
        .toBeInstanceOf(Error);

    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();
});



//
//---------------------------------------------------------
//
test('AccountingActions-addLotTranasctions', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const transactionManager = accountingSystem.getTransactionManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    const lotManager = accountingSystem.getLotManager();
    const pricedItemManager = accountingSystem.getPricedItemManager();
    const aaplPricedItem = pricedItemManager.getPricedItemDataItemWithId(
        sys.aaplPricedItemId);
    const lotQuantityDefinition = Q.getQuantityDefinition(
        aaplPricedItem.quantityDefinition);
    const priceQuantityDefinition = pricedItemManager
        .getBaseCurrency().getQuantityDefinition();

    let lastResult;
    actions.on('addTransactions', (action, result) => {
        lastResult = result;
    });
    actions.on('addLot', (action, result) => {
        lastResult = result;
    });

    const aaplPriceA = { close: 200 };
    const aaplQuantityA = 100;
    const aaplCostBasisA = aaplQuantityA * aaplPriceA.close;
    const aaplQuantityBaseValueA 
        = lotQuantityDefinition.numberToBaseValue(aaplQuantityA);
    const aaplCostBasisBaseValueA 
        = priceQuantityDefinition.numberToBaseValue(aaplCostBasisA);
    const aaplLotChangeA = {
        quantityBaseValue: aaplQuantityBaseValueA, 
        costBasisBaseValue: aaplCostBasisBaseValueA, 
    };
    const settingsA = {
        ymdDate: '2010-02-01',
        splits: [
            {
                accountId: sys.brokerageAId,
                quantityBaseValue: -aaplCostBasisBaseValueA,
            },
            {
                accountId: sys.aaplBrokerageAId, 
                quantityBaseValue: aaplCostBasisBaseValueA, 
                lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                lotChanges: [ aaplLotChangeA ],
            },
        ]
    };
    const stateA = {
        lotStates: [
            {
                quantityBaseValue: aaplQuantityBaseValueA, 
                costBasisBaseValue: aaplCostBasisBaseValueA,
                ymdDateCreated: settingsA.ymdDate,
            }
        ],
        quantityBaseValue: aaplQuantityBaseValueA,
        ymdDate: settingsA.ymdDate,
    };

    const actionA = actions.createAddTransactionsAction(settingsA);

    await actionManager.asyncApplyAction(actionA);
    const transA = lastResult.newTransactionDataItem;
    const lotAId = transA.splits[1].lotChanges[0].lotId;

    expect(lotManager.getLotDataItemWithId(lotAId)).toMatchObject({
        pricedItemId: aaplPricedItem.id,
    });


    const aaplBrokerageAStateA = transactionManager.getCurrentAccountStateDataItem(
        sys.aaplBrokerageAId);
    expect(aaplBrokerageAStateA).toMatchObject(stateA);

    await actionManager.asyncUndoLastAppliedActions();

    expect(lotManager.getLotDataItemWithId(lotAId)).toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(transA.id))
        .toBeUndefined();

    await actionManager.asyncReapplyLastUndoneAction();

    expect(lotManager.getLotDataItemWithId(lotAId)).toMatchObject({
        pricedItemId: aaplPricedItem.id,
    });
    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateA);

    //
    // Also support multiple lots...
    const aaplPriceB = { close: 200 };
    const aaplQuantityB = 100;
    const aaplCostBasisB = aaplQuantityB * aaplPriceB.close;
    const aaplQuantityBaseValueB 
        = lotQuantityDefinition.numberToBaseValue(aaplQuantityB);
    const aaplCostBasisBaseValueB 
        = priceQuantityDefinition.numberToBaseValue(aaplCostBasisB);
    const aaplLotChangeB1 = {
        quantityBaseValue: aaplQuantityBaseValueB * 3 / 4, 
        costBasisBaseValue: aaplCostBasisBaseValueB * 3 / 4, 
    };
    const aaplLotChangeB2 = {
        quantityBaseValue: aaplQuantityBaseValueB - aaplLotChangeB1.quantityBaseValue, 
        costBasisBaseValue: aaplCostBasisBaseValueB - aaplLotChangeB1.costBasisBaseValue, 
    };
    const settingsB = {
        ymdDate: '2010-03-01',
        splits: [
            {
                accountId: sys.aaplBrokerageAId, 
                quantityBaseValue: aaplCostBasisBaseValueB, 
                lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                lotChanges: [ aaplLotChangeB1, aaplLotChangeB2 ],
            },
            {
                accountId: sys.brokerageAId,
                quantityBaseValue: -aaplCostBasisBaseValueB,
            },
        ]
    };
    const stateB = {
        lotStates: [
            {
                quantityBaseValue: aaplQuantityBaseValueA, 
                costBasisBaseValue: aaplCostBasisBaseValueA,
                ymdDateCreated: settingsA.ymdDate,
            },
            {
                quantityBaseValue: aaplLotChangeB1.quantityBaseValue, 
                costBasisBaseValue: aaplLotChangeB1.costBasisBaseValue,
                ymdDateCreated: settingsB.ymdDate,
            },
            {
                quantityBaseValue: aaplLotChangeB2.quantityBaseValue, 
                costBasisBaseValue: aaplLotChangeB2.costBasisBaseValue,
                ymdDateCreated: settingsB.ymdDate,
            }
        ],
        quantityBaseValue: aaplQuantityBaseValueA + aaplQuantityBaseValueB,
        ymdDate: settingsB.ymdDate,
    };

    const actionB = actions.createAddTransactionsAction(settingsB);

    await actionManager.asyncApplyAction(actionB);

    const transB = lastResult.newTransactionDataItem;
    const lotB1Id = transB.splits[0].lotChanges[0].lotId;
    const lotB2Id = transB.splits[0].lotChanges[1].lotId;
    expect(lotManager.getLotDataItemWithId(lotB1Id)).toBeDefined();
    expect(lotManager.getLotDataItemWithId(lotB2Id)).toBeDefined();

    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateB);

    await actionManager.asyncUndoLastAppliedActions();

    expect(lotManager.getLotDataItemWithId(lotAId)).toMatchObject({
        pricedItemId: aaplPricedItem.id,
    });
    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateA);

    expect(lotManager.getLotDataItemWithId(lotB1Id)).toBeUndefined();
    expect(lotManager.getLotDataItemWithId(lotB2Id)).toBeUndefined();


    await actionManager.asyncReapplyLastUndoneAction();

    expect(lotManager.getLotDataItemWithId(lotB1Id)).toBeDefined();
    expect(lotManager.getLotDataItemWithId(lotB2Id)).toBeDefined();

    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateB);

    await actionManager.asyncUndoLastAppliedActions();

    expect(lotManager.getLotDataItemWithId(lotAId)).toMatchObject({
        pricedItemId: aaplPricedItem.id,
    });
    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateA);

    expect(lotManager.getLotDataItemWithId(lotB1Id)).toBeUndefined();
    expect(lotManager.getLotDataItemWithId(lotB2Id)).toBeUndefined();




    // To Test:
    // Reinvested dividends
    const aaplPriceC = { close: 200 };
    const aaplQuantityC = 10;
    const aaplCostBasisC = aaplQuantityC * aaplPriceC.close;
    const aaplQuantityBaseValueC 
        = lotQuantityDefinition.numberToBaseValue(aaplQuantityC);
    const aaplCostBasisBaseValueC 
        = priceQuantityDefinition.numberToBaseValue(aaplCostBasisC);
    const aaplLotChangeC = {
        quantityBaseValue: aaplQuantityBaseValueC, 
        costBasisBaseValue: aaplCostBasisBaseValueC, 
    };
    const settingsC = {
        ymdDate: '2010-03-01',
        splits: [
            {
                accountId: sys.aaplBrokerageAId, 
                quantityBaseValue: aaplCostBasisBaseValueC, 
                lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND.name,
                lotChanges: [ aaplLotChangeC ],
            },
            {
                accountId: sys.dividendsAAPLId,
                quantityBaseValue: aaplCostBasisBaseValueC,
            },
        ]
    };
    const stateC = {
        lotStates: [
            {
                quantityBaseValue: aaplQuantityBaseValueA, 
                costBasisBaseValue: aaplCostBasisBaseValueA,
                ymdDateCreated: settingsA.ymdDate,
            },
            {
                quantityBaseValue: aaplLotChangeC.quantityBaseValue, 
                costBasisBaseValue: aaplLotChangeC.costBasisBaseValue,
                ymdDateCreated: settingsC.ymdDate,
            },
        ],
        quantityBaseValue: aaplQuantityBaseValueA + aaplQuantityBaseValueC,
        ymdDate: settingsC.ymdDate,
    };

    const actionC = actions.createAddTransactionsAction(settingsC);

    await actionManager.asyncApplyAction(actionC);

    const transC = lastResult.newTransactionDataItem;
    const lotCId = transC.splits[0].lotChanges[0].lotId;
    expect(lotManager.getLotDataItemWithId(lotCId)).toBeDefined();

    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateC);

    await actionManager.asyncUndoLastAppliedActions();

    expect(lotManager.getLotDataItemWithId(lotAId)).toMatchObject({
        pricedItemId: aaplPricedItem.id,
    });
    expect(transactionManager.getCurrentAccountStateDataItem(sys.aaplBrokerageAId))
        .toMatchObject(stateA);

    expect(lotManager.getLotDataItemWithId(lotCId)).toBeUndefined();


    // Add shares
});


//
//---------------------------------------------------------
//
test('AccountingActions-AccountingSystem', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    let lastResult;
    actions.on('modifyOptions', (action, result) => {
        lastResult = result;
    });


    const settingsA = {
        a: { b: 'A String', c: [1, 2, '3'], },
        b: 123,
    };

    // Modify options
    const modifyOptionsActionA = actions.createModifyOptionsAction(settingsA);
    await actionManager.asyncApplyAction(modifyOptionsActionA);
    
    expect(accountingSystem.getOptions()).toEqual(settingsA);
    expect(lastResult).toMatchObject(
        { newOptions: settingsA, oldOptions: {} });


    const settingsB = {
        a: { b: [123, 'abc']},
    };
    const optionsB = Object.assign({}, settingsA, settingsB);

    const modifyOptionsActionB = actions.createModifyOptionsAction(settingsB);
    await actionManager.asyncApplyAction(modifyOptionsActionB);

    expect(accountingSystem.getOptions()).toEqual(optionsB);
    expect(lastResult).toMatchObject(
        { newOptions: optionsB, oldOptions: settingsA });
    

    await actionManager.asyncUndoLastAppliedAction();
    expect(accountingSystem.getOptions()).toEqual(settingsA);

    lastResult = undefined;
    await actionManager.asyncReapplyLastUndoneAction();
    expect(accountingSystem.getOptions()).toEqual(optionsB);
    expect(lastResult).toMatchObject(
        { newOptions: optionsB, oldOptions: settingsA });
});


//
//---------------------------------------------------------
//
test('AccountingActions-Reminders', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const reminderManager = accountingSystem.getReminderManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();

    let currentSettings;
    actions.on('addReminder', (action, result) => {
        if (currentSettings) {
            currentSettings.id = result.newReminderDataItem.id;
        }
    });

    const settingsA = {
        repeatDefinition: {
            type: RE.RepeatType.YEARLY.name,
            period: 12,
            offset: {
                type: RE.YearOffsetType.NTH_WEEK.name,
                offset: 2,
                dayOfWeek: 1,
            },
            startYMDDate: '2010-01-01',
        },
        description: 'Hello',
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
        lastAppliedDate: '2010-06-01',
    };

    // New Reminder
    const newReminderAction = actions.createAddReminderAction(settingsA);
    
    currentSettings = settingsA;
    await actionManager.asyncApplyAction(newReminderAction);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Remove Reminder
    const removeReminderAction = actions.createRemoveReminderAction(settingsA.id);
    await actionManager.asyncApplyAction(removeReminderAction);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncUndoLastAppliedActions(1);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id)).toBeUndefined();

    await actionManager.asyncReapplyLastUndoneActions(1);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);


    // Modify Reminder.
    const settingsA1 = {
        id: settingsA.id,
        repeatDefinition: {
            type: RE.RepeatType.MONTHLY.name,
            period: 4,
            offset: {
                type: RE.MonthOffsetType.NTH_DAY.name,
                offset: 3,
            },
            startYMDDate: '2015-12-31',
        },
    };
    const modifyReminderAction = actions.createModifyReminderAction(settingsA1);
    await actionManager.asyncApplyAction(modifyReminderAction);
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);

    await actionManager.asyncUndoLastAppliedActions();
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA);

    await actionManager.asyncReapplyLastUndoneActions();
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);


    // Invalid modify.
    const invalidA1 = {
        id: settingsA.id,
        repeatDefinition: undefined,
    };
    const invalidModifyAction = actions.createModifyReminderAction(invalidA1);
    await expect(actionManager.asyncApplyAction(invalidModifyAction)).rejects.toThrow();
    expect(reminderManager.getReminderDataItemWithId(settingsA.id))
        .toMatchObject(settingsA1);
});



//
//---------------------------------------------------------
//
test('AccountingActions-removeAccounts With Transactions', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    await ASTH.asyncAddOpeningBalances(sys);
    await ASTH.asyncAddBasicTransactions(sys);

    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();
    const transactionManager = accountingSystem.getTransactionManager();

    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transAId))
        .toBeDefined();

    const removeAccountAction = await actions.asyncCreateRemoveAccountAction(sys.cashId);
    expect(removeAccountAction.dependees).toEqual(['TRANSACTION']);

    await actionManager.asyncApplyAction(removeAccountAction);

    expect(accountManager.getAccountDataItemWithId(sys.cashId)).toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transAId))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transAId))
        .toBeDefined();

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transAId))
        .toBeUndefined();
        
});


//
//---------------------------------------------------------
//
test('AccountingActions-removeLots With Accounts', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    await ASTH.asyncAddOpeningBalances(sys);
    await ASTH.asyncAddBasicTransactions(sys);

    const { accountingSystem } = sys;
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();
    const transactionManager = accountingSystem.getTransactionManager();

    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeDefined();

    const removeLotAction = await actions.asyncCreateRemoveLotAction(sys.aaplLot1.id);
    expect(removeLotAction.dependees).toEqual(['TRANSACTION']);

    await actionManager.asyncApplyAction(removeLotAction);

    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeDefined();

    await actionManager.asyncReapplyLastUndoneActions();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeUndefined();
});



//
//---------------------------------------------------------
//
test('AccountingActions-removePricedItems With Accounts and Lots', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    await ASTH.asyncAddOpeningBalances(sys);
    await ASTH.asyncAddBasicTransactions(sys);

    const { accountingSystem } = sys;
    const pricedItemManager = accountingSystem.getPricedItemManager();
    const accountManager = accountingSystem.getAccountManager();
    const actions = accountingSystem.getAccountingActions();
    const actionManager = accountingSystem.getActionManager();
    const transactionManager = accountingSystem.getTransactionManager();
    const lotManager = accountingSystem.getLotManager();

    expect(accountManager.getAccountDataItemWithId(sys.aaplIRAId))
        .toBeDefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeDefined();
    expect(lotManager.getLotDataItemWithId(sys.aaplLot1.id))
        .toBeDefined();

    const removeAction = await actions.asyncCreateRemovePricedItemAction(
        sys.aaplPricedItemId);
    expect(removeAction.dependees).toEqual(expect.arrayContaining([
        'TRANSACTION',
        'ACCOUNT',
        'LOT',
    ]));

    await actionManager.asyncApplyAction(removeAction);

    expect(pricedItemManager.getPricedItemDataItemWithId(sys.aaplPricedItemId))
        .toBeUndefined();
    expect(accountManager.getAccountDataItemWithId(sys.aaplIRAId))
        .toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeUndefined();
    expect(lotManager.getLotDataItemWithId(sys.aaplLot1.id))
        .toBeUndefined();

    await actionManager.asyncUndoLastAppliedActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(sys.aaplPricedItemId))
        .toBeDefined();
    expect(accountManager.getAccountDataItemWithId(sys.aaplIRAId))
        .toBeDefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeDefined();
    expect(lotManager.getLotDataItemWithId(sys.aaplLot1.id))
        .toBeDefined();

    await actionManager.asyncReapplyLastUndoneActions();
    expect(pricedItemManager.getPricedItemDataItemWithId(sys.aaplPricedItemId))
        .toBeUndefined();
    expect(accountManager.getAccountDataItemWithId(sys.aaplIRAId))
        .toBeUndefined();
    expect(await transactionManager.asyncGetTransactionDataItemWithId(
        sys.transGId))
        .toBeUndefined();
    expect(lotManager.getLotDataItemWithId(sys.aaplLot1.id))
        .toBeUndefined();
        
});
