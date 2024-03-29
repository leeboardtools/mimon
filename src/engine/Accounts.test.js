import * as A from './Accounts';
import * as PI from './PricedItems';
import * as ASTH from './AccountingSystemTestHelpers';
import * as ATH from './AccountTestHelpers';
import { getDecimalDefinition } from '../util/Quantities';
import { StandardAccountTag } from './StandardTags';
import { YMDDate } from '../util/YMDDate';

function testAccountDataItem(account) {
    const dataItem = A.getAccountDataItem(account);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const accountBack = A.getAccount(json);
    expect(accountBack).toEqual(account);

    expect(A.getAccount(account) === account).toBeTruthy();
    expect(A.getAccountDataItem(dataItem) === dataItem).toBeTruthy();
}


//
//---------------------------------------------------------
//
test('Account-Data Items', () => {
    const plainAccount = {
        id: 123,
        type: A.AccountType.ASSET,
        pricedItemId: 12345,
        lastReconcileYMDDate: new YMDDate('2020-02-02'),
        pendingReconcileYMDDate: new YMDDate('1919-19-19'),
    };
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.BANK;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.BROKERAGE;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.CASH;
    testAccountDataItem(plainAccount);

    const lotsAccount = {
        id: 1234,
        type: A.AccountType.SECURITY,
        pricedItemId: 1234578,
    };    
    testAccountDataItem(lotsAccount);


    lotsAccount.type = A.AccountType.MUTUAL_FUND;
    testAccountDataItem(lotsAccount);

    lotsAccount.type = A.AccountType.REAL_ESTATE;
    testAccountDataItem(lotsAccount);

    lotsAccount.type = A.AccountType.PROPERTY;
    testAccountDataItem(lotsAccount);


    plainAccount.type = A.AccountType.LIABILITY;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.CREDIT_CARD;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.LOAN;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.MORTGAGE;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.INCOME;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.EXPENSE;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.EQUITY;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.OPENING_BALANCE;
    testAccountDataItem(plainAccount);


    const lotsAccountDataItem = A.getAccountDataItem(lotsAccount);
    const deepCopyDataItem = A.getAccountDataItem(lotsAccountDataItem, true);
    expect(deepCopyDataItem).toEqual(lotsAccountDataItem);

    const lotsAccount2 = A.getAccount(lotsAccount);
    const deepCopyAccount2 = A.getAccount(lotsAccount2, true);
    expect(deepCopyAccount2).toEqual(lotsAccount2);
});


//
//---------------------------------------------------------
//
test('Account-areSimilar', () => {
    const a = A.getAccount({
        id: 123,
        type: A.AccountType.ASSET,
        description: 'A',
        pricedItemId: 12,
    });
    const b = A.getAccount({
        id: 123,
        type: A.AccountType.ASSET,
        description: 'A',
        pricedItemId: 12,
    });
    expect(A.areAccountsSimilar(a, b)).toBeTruthy();

    b.id = 456;
    expect(A.areAccountsSimilar(a, b)).toBeFalsy();

    expect(A.areAccountsSimilar(a, b, true)).toBeTruthy();
});


//
//---------------------------------------------------------
//
test('Account-flagAttributes', () => {
    const a = A.getAccount({
        id: 123,
        type: A.AccountType.ASSET,
        description: 'A',
        pricedItemId: 12,
    });
    expect(A.getAccountFlagAttribute(a, 'isExcludeFromGain')).toBeFalsy();

    a.isExcludeFromGain = true;
    expect(A.getAccountFlagAttribute(a, 'isExcludeFromGain')).toBeFalsy();

    const b = A.getAccount({
        id: 123,
        type: A.AccountType.SECURITY,
        description: 'A',
        pricedItemId: 12,
    });
    expect(A.getAccountFlagAttribute(b, 'isExcludeFromGain')).toBeFalsy();

    b.isExcludeFromGain = false;
    expect(A.getAccountFlagAttribute(b, 'isExcludeFromGain')).toBeFalsy();

    b.isExcludeFromGain = true;
    expect(A.getAccountFlagAttribute(b, 'isExcludeFromGain')).toBeTruthy();

});

//
//---------------------------------------------------------
//
test('AccountManager-rootAccounts', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const accountManager = accountingSystem.getAccountManager();
    expect(accountManager).not.toBeUndefined();

    const pricedItemManager = accountingSystem.getPricedItemManager();
    const currencyPricedItemId = pricedItemManager.getBaseCurrencyPricedItemId();


    const rootAssetAccount = accountManager.getRootAssetAccountDataItem();
    const testRootAssetAccount = accountManager.getAccountDataItemWithId(
        accountManager.getRootAssetAccountId());
    expect(testRootAssetAccount).toEqual(rootAssetAccount);

    ATH.expectAccount(testRootAssetAccount, {
        id: accountManager.getRootAssetAccountId(),
        type: A.AccountType.ASSET,
        pricedItemId: currencyPricedItemId,
    });


    const rootLiabilityAccount = accountManager.getRootLiabilityAccountDataItem();
    const testRootLiabilityAccount = accountManager.getAccountDataItemWithId(
        accountManager.getRootLiabilityAccountId());
    expect(testRootLiabilityAccount).toEqual(rootLiabilityAccount);

    ATH.expectAccount(testRootLiabilityAccount, {
        id: accountManager.getRootLiabilityAccountId(),
        type: A.AccountType.LIABILITY,
        pricedItemId: currencyPricedItemId,
    });


    const rootIncomeAccount = accountManager.getRootIncomeAccountDataItem();
    const testRootIncomeAccount = accountManager.getAccountDataItemWithId(
        accountManager.getRootIncomeAccountId());
    expect(testRootIncomeAccount).toEqual(rootIncomeAccount);

    ATH.expectAccount(testRootIncomeAccount, {
        id: accountManager.getRootIncomeAccountId(),
        type: A.AccountType.INCOME,
        pricedItemId: currencyPricedItemId,
    });


    const rootExpenseAccount = accountManager.getRootExpenseAccountDataItem();
    const testRootExpenseAccount = accountManager.getAccountDataItemWithId(
        accountManager.getRootExpenseAccountId());
    expect(testRootExpenseAccount).toEqual(rootExpenseAccount);

    ATH.expectAccount(testRootExpenseAccount, {
        id: accountManager.getRootExpenseAccountId(),
        type: A.AccountType.EXPENSE,
        pricedItemId: currencyPricedItemId,
    });


    const rootEquityAccount = accountManager.getRootEquityAccountDataItem();
    const testRootEquityAccount = accountManager.getAccountDataItemWithId(
        accountManager.getRootEquityAccountId());
    expect(testRootEquityAccount).toEqual(rootEquityAccount);

    ATH.expectAccount(testRootEquityAccount, {
        id: accountManager.getRootEquityAccountId(),
        type: A.AccountType.EQUITY,
        pricedItemId: currencyPricedItemId,
        childAccountIds: [accountManager.getOpeningBalancesAccountId()],
    });


    const openingBalancesAccount = accountManager.getOpeningBalancesAccountDataItem();
    const testOpeningBalancesAccount = accountManager.getAccountDataItemWithId(
        accountManager.getOpeningBalancesAccountId());
    expect(testOpeningBalancesAccount).toEqual(openingBalancesAccount);

    ATH.expectAccount(testOpeningBalancesAccount, {
        id: accountManager.getOpeningBalancesAccountId(),
        type: A.AccountType.OPENING_BALANCE,
        pricedItemId: currencyPricedItemId,
    });
});


//
//---------------------------------------------------------
//
test('AccountManager-add', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const accountManager = accountingSystem.getAccountManager();
    const pricedItemManager = accountingSystem.getPricedItemManager();

    const securityPricedItemA = (await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.SECURITY,
        currency: pricedItemManager.getBaseCurrencyCode(),
        quantityDefinition: getDecimalDefinition(-4),
        ticker: 'ABCD',
    })).newPricedItemDataItem;

    const mutualFundPricedItemA = (await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.MUTUAL_FUND,
        currency: pricedItemManager.getBaseCurrencyCode(),
        quantityDefinition: getDecimalDefinition(-4),
        ticker: 'MFUND',
    })).newPricedItemDataItem;

    const realEstatePricedItemA = (await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.REAL_ESTATE,
        currency: pricedItemManager.getBaseCurrencyCode(),
        quantityDefinition: getDecimalDefinition(0),
    })).newPricedItemDataItem;

    const propertyPricedItemA = (await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.PROPERTY,
        currency: pricedItemManager.getBaseCurrencyCode(),
        quantityDefinition: getDecimalDefinition(0),
    })).newPricedItemDataItem;


    let accountDataItem;
    let result;

    let eventResult;
    accountManager.on('accountAdd', (result) => eventResult = result);

    //
    // ASSET
    //
    const assetOptionsA = {
        parentAccountId: accountManager.getRootAssetAccountId(),
        type: A.AccountType.ASSET,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Current Assets',
    };
    const assetA = (await accountManager.asyncAddAccount(assetOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(assetA, assetOptionsA);

    ATH.expectAccount(eventResult.newAccountDataItem, assetOptionsA);

    expect(accountManager.getRootAssetAccountDataItem()
        .childAccountIds.includes(assetA.id)).toBeTruthy();
    
    expect(accountManager.getCategoryOfAccountId(assetA.id))
        .toEqual(A.AccountCategory.ASSET);
    

    // Verify that the account data items returned are copies.,
    assetA.name = 'blah blah';
    ATH.expectAccount(accountManager.getAccountDataItemWithId(assetA.id), assetOptionsA);


    //
    // BANK
    //
    const bankTags = [ 'Abc', '123' ];
    const bankDefaultSplitAccountIds = {
        interestIncomeId: 123,
    };
    const bankOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.BANK,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Checking Account',
        description: 'This is a checking account',
        tags: [ bankTags[0], ' ' + bankTags[1] + '  ', ],   // Make sure tags get cleaned
        defaultSplitAccountIds: bankDefaultSplitAccountIds,
    };
    result = await accountManager.asyncAddAccount(bankOptionsA);
    bankOptionsA.tags = bankTags;
    const bankA = result.newAccountDataItem;
    ATH.expectAccount(bankA, bankOptionsA);

    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([bankA.id]));

    // Make sure tags is copied.
    bankA.tags[0] = 'ZZZ';
    expect(bankA.tags).not.toEqual(bankTags);
    bankA.tags[0] = bankTags[0];

    // Make sure defaultSplitAccountIds is copied...
    bankA.defaultSplitAccountIds.interestIncomeId = 456;
    expect(bankA.defaultSplitAccountIds).not.toEqual(
        bankDefaultSplitAccountIds);
    bankA.defaultSplitAccountIds.interestIncomeId 
        = bankDefaultSplitAccountIds.interestIncomeId;

    expect(accountManager.getCategoryOfAccountId(bankA.id))
        .toEqual(A.AccountCategory.ASSET);
    

    let removeArg;
    accountManager.on('accountRemove', (result) => { removeArg = result; });

    // Check undo addAccount.
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(accountManager.getAccountDataItemWithId(bankA.id)).toBeUndefined();

    expect(removeArg).toEqual({ removedAccountDataItem: bankA });


    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).not
        .toEqual(expect.arrayContaining([bankA.id]));

    const bankA1 = (await accountManager.asyncAddAccount(bankOptionsA))
        .newAccountDataItem;
    expect(bankA1).toEqual(bankA);



    //
    // CASH
    //
    const cashOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.CASH,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Cash Account',
    };
    const cashA = (await accountManager.asyncAddAccount(cashOptionsA)).newAccountDataItem;
    ATH.expectAccount(cashA, cashOptionsA);

    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([cashA.id]));


    //
    // BROKERAGE
    //
    const brokerageOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.BROKERAGE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Brokerage Account',
    };
    const brokerageA = (await accountManager.asyncAddAccount(brokerageOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(brokerageA, brokerageOptionsA);

    

    //
    // Check new account with childListIndex
    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual([
        bankA.id, cashA.id, brokerageA.id
    ]);

    const testA = {
        parentAccountId: assetA.id,
        type: A.AccountType.CASH,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Test Account',
    };
    result = await accountManager.asyncAddAccount(testA, false, 1);
        
    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual([
        bankA.id, result.newAccountDataItem.id, cashA.id, brokerageA.id
    ]);

    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    

    // Check out of bounds.
    result = await accountManager.asyncAddAccount(testA, false, 3);
    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual([
        bankA.id, cashA.id, brokerageA.id, result.newAccountDataItem.id
    ]);

    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);



    //
    // SECURITY
    //
    const securityOptionsA = {
        parentAccountId: brokerageA.id,
        type: A.AccountType.SECURITY,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Security Account',
        description: 'This is a security account',
    };
    // Fails because expects a security priced item.
    await expect(accountManager.asyncAddAccount(securityOptionsA)).rejects.toThrow();

    securityOptionsA.pricedItemId = securityPricedItemA.id;
    const securityA = (await accountManager.asyncAddAccount(securityOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(securityA, securityOptionsA);

    accountDataItem = accountManager.getAccountDataItemWithId(brokerageA.id);
    expect(accountDataItem.childAccountIds)
        .toEqual(expect.arrayContaining([securityA.id]));


    //
    // MUTUAL_FUND
    //
    const mutualFundOptionsA = {
        parentAccountId: brokerageA.id,
        type: A.AccountType.MUTUAL_FUND,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Mutual Fund Account',
        description: 'This is a mutual funds account',
    };
    // Fails because expects a mutual fund priced item.
    await expect(accountManager.asyncAddAccount(mutualFundOptionsA)).rejects.toThrow();
    mutualFundOptionsA.pricedItemId = mutualFundPricedItemA.id;

    // Fails because bank accounts don't support mutual funds.
    mutualFundOptionsA.parentAccountId = bankA.id;
    await expect(accountManager.asyncAddAccount(mutualFundOptionsA)).rejects.toThrow();

    mutualFundOptionsA.parentAccountId = brokerageA.id;

    const mutualFundA = (await accountManager.asyncAddAccount(mutualFundOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(mutualFundA, mutualFundOptionsA);


    //
    // REAL_ESTATE
    //
    const realEstateOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.REAL_ESTATE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Real Estate Account',
        description: 'This is a real estate account',
    };
    // Fails because expects a real estate priced item.
    await expect(accountManager.asyncAddAccount(realEstateOptionsA)).rejects.toThrow();
    realEstateOptionsA.pricedItemId = realEstatePricedItemA.id;

    const realEstateA = (await accountManager.asyncAddAccount(realEstateOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(realEstateA, realEstateOptionsA);


    //
    // PROPERTY
    //
    const propertyOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.PROPERTY,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Property Account',
        description: 'This is a property account',
    };
    // Fails because expects a real estate priced item.
    await expect(accountManager.asyncAddAccount(propertyOptionsA)).rejects.toThrow();
    propertyOptionsA.pricedItemId = propertyPricedItemA.id;

    const propertyA = (await accountManager.asyncAddAccount(propertyOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(propertyA, propertyOptionsA);


    //
    // LIABILITY
    //
    const liabilityOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.LIABILITY,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Liability Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(liabilityOptionsA)).rejects.toThrow();
    liabilityOptionsA.parentAccountId = accountManager.getRootLiabilityAccountId();

    const liabilityA = (await accountManager.asyncAddAccount(liabilityOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(liabilityA, liabilityOptionsA);

    expect(accountManager.getCategoryOfAccountId(liabilityA.id))
        .toEqual(A.AccountCategory.LIABILITY);
    


    //
    // CREDIT_CARD
    //
    const creditCardOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.CREDIT_CARD,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Credit Card Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(creditCardOptionsA)).rejects.toThrow();
    creditCardOptionsA.parentAccountId = liabilityA.id;

    const creditCardA = (await accountManager.asyncAddAccount(creditCardOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(creditCardA, creditCardOptionsA);
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds)
        .toEqual(expect.arrayContaining([creditCardA.id]));


    //
    // LOAN
    //
    const loanOptionsA = {
        parentAccountId: creditCardA.id,
        type: A.AccountType.LOAN,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Loan Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(loanOptionsA)).rejects.toThrow();
    loanOptionsA.parentAccountId = liabilityA.id;

    const loanA = (await accountManager.asyncAddAccount(loanOptionsA)).newAccountDataItem;
    ATH.expectAccount(loanA, loanOptionsA);
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([loanA.id]));


    //
    // MORTGAGE
    //
    const mortgageOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.MORTGAGE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Mortgage Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(mortgageOptionsA)).rejects.toThrow();
    mortgageOptionsA.parentAccountId = liabilityA.id;

    const mortgageA = (await accountManager.asyncAddAccount(mortgageOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(mortgageA, mortgageOptionsA);
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds)
        .toEqual(expect.arrayContaining([mortgageA.id]));


    //
    // INCOME
    //
    const incomeOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.INCOME,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Income Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(incomeOptionsA)).rejects.toThrow();
    incomeOptionsA.parentAccountId = accountManager.getRootIncomeAccountId();

    const incomeA = (await accountManager.asyncAddAccount(incomeOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(incomeA, incomeOptionsA);
    
    accountDataItem = accountManager.getRootIncomeAccountDataItem();
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([incomeA.id]));


    const incomeOptionsB = {
        parentAccountId: incomeA.id,
        type: A.AccountType.INCOME,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Child Income Account',
    };
    const incomeB = (await accountManager.asyncAddAccount(incomeOptionsB))
        .newAccountDataItem;
    ATH.expectAccount(incomeB, incomeOptionsB);
    
    accountDataItem = accountManager.getAccountDataItemWithId(incomeA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([incomeB.id]));


    //
    // EXPENSE
    //
    const expenseOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.EXPENSE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Income Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(expenseOptionsA)).rejects.toThrow();
    expenseOptionsA.parentAccountId = accountManager.getRootExpenseAccountId();

    const expenseA = (await accountManager.asyncAddAccount(expenseOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(expenseA, expenseOptionsA);
    
    accountDataItem = accountManager.getRootExpenseAccountDataItem();
    expect(accountDataItem.childAccountIds)
        .toEqual(expect.arrayContaining([expenseA.id]));


    const expenseOptionsB = {
        parentAccountId: expenseA.id,
        type: A.AccountType.EXPENSE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Child Expense Account',
    };
    const expenseB = (await accountManager.asyncAddAccount(expenseOptionsB))
        .newAccountDataItem;
    ATH.expectAccount(expenseB, expenseOptionsB);
    
    accountDataItem = accountManager.getAccountDataItemWithId(expenseA.id);
    expect(accountDataItem.childAccountIds)
        .toEqual(expect.arrayContaining([expenseB.id]));


    //
    // EQUITY
    //
    const equityOptionsA = {
        parentAccountId: incomeA.id,
        type: A.AccountType.EQUITY,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Equity Account',
    };
    // Fails because income accounts can't have equity accounts..
    await expect(accountManager.asyncAddAccount(equityOptionsA)).rejects.toThrow();
    equityOptionsA.parentAccountId = accountManager.getRootEquityAccountId();

    const equityA = (await accountManager.asyncAddAccount(equityOptionsA))
        .newAccountDataItem;
    ATH.expectAccount(equityA, equityOptionsA);
    
    accountDataItem = accountManager.getRootEquityAccountDataItem();
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([equityA.id]));


    let eventArgs;
    accountManager.on('accountAdd', (args) => {
        eventArgs = args;
    });

    const equityOptionsB = {
        parentAccountId: equityA.id,
        type: A.AccountType.EQUITY,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Child Equity Account',
    };
    const equityB = (await accountManager.asyncAddAccount(equityOptionsB))
        .newAccountDataItem;
    ATH.expectAccount(equityB, equityOptionsB);
    
    accountDataItem = accountManager.getAccountDataItemWithId(equityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([equityB.id]));

    // accountNew event test.
    expect(eventArgs).toEqual({ newAccountDataItem: equityB });
    expect(eventArgs.newAccountDataItem).toBe(equityB);

    //
    // OPENING_BALANCE
    //
    const openingBalancesOptionsA = {
        parentAccountId: equityA.id,
        type: A.AccountType.OPENING_BALANCE,
        pricedItemId: pricedItemManager.getBaseCurrencyPricedItemId(),
        name: 'Opening Balance Account',
    };
    // Can only have one opening balances account.
    await expect(accountManager.asyncAddAccount(openingBalancesOptionsA))
        .rejects.toThrow();
});



//
//---------------------------------------------------------
//
test('AccountManager-modify', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();

    let account;
    let oldAccount;


    // Move IRA to fixed assets.
    const iraMove = { id: sys.iraId, parentAccountId: sys.fixedAssetsId };
    await accountManager.asyncModifyAccount(iraMove, true);

    // Just did a validate only, so account parent should still be investmentsId.
    account = accountManager.getAccountDataItemWithId(sys.iraId);
    expect(account.parentAccountId).toEqual(sys.investmentsId);

    // Moving to liabilities should fail.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.iraId, parentAccountId: sys.loansId })).rejects.toThrow();


    let eventArgs;
    accountManager.on('accountsModify', (args) => {
        eventArgs = args;
    });

    // Now for the actual move...
    let result;
    result = await accountManager.asyncModifyAccount(iraMove);
    account = result.newAccountDataItem;
    oldAccount = result.oldAccountDataItem;
    expect(account.parentAccountId).toEqual(sys.fixedAssetsId);

    // accountsModify event test
    expect(eventArgs).toEqual(
        { newAccountDataItems: [account], oldAccountDataItems: [oldAccount], });
    expect(eventArgs.newAccountDataItems[0]).toBe(account);
    expect(eventArgs.oldAccountDataItems[0]).toBe(oldAccount);

    const newAccountDataItem 
        = A.getAccountDataItem(eventArgs.newAccountDataItems[0], true);
    const oldAccountDataItem 
        = A.getAccountDataItem(eventArgs.oldAccountDataItems[0], true);


    // Now a child of fixedAssetsId
    account = accountManager.getAccountDataItemWithId(sys.fixedAssetsId);
    expect(account.childAccountIds).toEqual(expect.arrayContaining([sys.iraId]));

    // And not investmentsId
    account = accountManager.getAccountDataItemWithId(sys.investmentsId);
    expect(account.childAccountIds).not.toEqual(expect.arrayContaining([sys.iraId]));

    // Make sure the account data items returned were a copies.
    eventArgs.newAccountDataItems[0].name = 'Blah';
    eventArgs.oldAccountDataItems[0].name = 'Ugh';
    expect(accountManager.getAccountDataItemWithId(newAccountDataItem.id))
        .toEqual(newAccountDataItem);


    // Undo...
    let modifyArg;
    accountManager.on('accountsModify', (result) => { modifyArg = result; });
    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(modifyArg).toEqual(
        { oldAccountDataItems: [newAccountDataItem], 
            newAccountDataItems: [oldAccountDataItem], });

    account = accountManager.getAccountDataItemWithId(sys.iraId);

    expect(account.parentAccountId).toEqual(sys.investmentsId);

    account = accountManager.getAccountDataItemWithId(sys.fixedAssetsId);
    expect(account.childAccountIds).not.toEqual(expect.arrayContaining([sys.iraId]));

    // And not investmentsId
    account = accountManager.getAccountDataItemWithId(sys.investmentsId);
    expect(account.childAccountIds).toEqual(expect.arrayContaining([sys.iraId]));


    // And back...
    result = await accountManager.asyncModifyAccount(iraMove);
    account = result.newAccountDataItem;
    oldAccount = result.oldAccountDataItem;

    // Now a child of fixedAssetsId
    account = accountManager.getAccountDataItemWithId(sys.fixedAssetsId);
    expect(account.childAccountIds).toEqual(expect.arrayContaining([sys.iraId]));

    // And not investmentsId
    account = accountManager.getAccountDataItemWithId(sys.investmentsId);
    expect(account.childAccountIds).not.toEqual(expect.arrayContaining([sys.iraId]));


    // Can't move root account.
    await expect(accountManager.asyncModifyAccount(
        { id: accountManager.getRootAssetAccountId(), 
            parentAccountId: sys.fixedAssetsId 
        })).rejects.toThrow();

    // Can't move to a descendant.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.investmentsId, 
            parentAccountId: sys.brokerageAId 
        })).rejects.toThrow();

    // Can't move to an account that doesn't accept children.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.brokerageAId, 
            parentAccountId: sys.savingsId
        })).rejects.toThrow();


    // Change type.
    const changeCheckingType = { id: sys.checkingId, type: A.AccountType.BROKERAGE };
    result = await accountManager.asyncModifyAccount(changeCheckingType);
    account = result.newAccountDataItem;
    ATH.expectAccount(account, changeCheckingType);

    await accountManager.asyncModifyAccount(
        { id: sys.checkingId, type: A.AccountType.BANK });

    // Can't change to an expense account.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.checkingId, 
            type: A.AccountType.EXPENSE 
        })).rejects.toThrow();


    // Can't change something with lots to something without lots.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.aaplBrokerageAId, 
            type: A.AccountType.BROKERAGE 
        })).rejects.toThrow();
    await expect(accountManager.asyncModifyAccount(
        { id: sys.brokerageAId, 
            type: A.AccountType.SECURITY 
        })).rejects.toThrow();


    // Check refId.
    await accountManager.asyncModifyAccount({ id: sys.checkingId, refId: '1234', });
    account = accountManager.getAccountDataItemWithId(sys.checkingId);
    expect(account.refId).toEqual('1234');

    expect(accountManager.getAccountDataItemWithRefId('1234')).toEqual(account);

    // Make sure getAccountDataItemWithRefId() returns a copy.
    result = accountManager.getAccountDataItemWithRefId('1234');
    result.name = 'blah';
    expect(accountManager.getAccountDataItemWithRefId('1234')).toEqual(account);

    account = (await accountManager.asyncModifyAccount(
        { id: sys.checkingId, refId: '9', })).newAccountDataItem;
    expect(accountManager.getAccountDataItemWithRefId('1234')).toBeUndefined();

    expect(accountManager.getAccountDataItemWithRefId('9')).toEqual(account);

    // No duplicate refIds.
    await expect(accountManager.asyncModifyAccount(
        { id: sys.savingsId, refId: '9'})).rejects.toThrow();

    await accountManager.asyncModifyAccount({ id: sys.savingsId, refId: '8'});
    account = accountManager.getAccountDataItemWithRefId('8');
    expect(account.id).toEqual(sys.savingsId);


    // Check tags...
    result = await accountManager.asyncModifyAccount(
        {id: sys.savingsId, tags: [ 'Abc' ]}
    );
    let newAccount = result.newAccountDataItem;
    expect(newAccount.tags).toEqual(['Abc']);

    // Make sure it's a copy
    newAccount.tags[0] = 'Def';
    expect(accountManager.getAccountDataItemWithId(sys.savingsId).tags).toEqual(
        ['Abc']
    );

    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    ATH.expectAccount(accountManager.getAccountDataItemWithId(sys.savingsId), account);
    

    // Check DefaultSplitAccountIds...
    result = await accountManager.asyncModifyAccount(
        {id: sys.savingsId, defaultSplitAccountIds: { interestIncomeId: 123, }}
    );
    newAccount = result.newAccountDataItem;
    expect(newAccount.defaultSplitAccountIds).toEqual({ interestIncomeId: 123, });

    // Make sure it's a copy
    newAccount.defaultSplitAccountIds.interestIncomeId = 456;
    expect(accountManager.getAccountDataItemWithId(sys.savingsId)
        .defaultSplitAccountIds).toEqual(
        { interestIncomeId: 123 }
    );

    result = await accountManager.asyncModifyAccount(
        {id: sys.savingsId, defaultSplitAccountIds: undefined, }
    );
    newAccount = result.newAccountDataItem;
    expect(newAccount.defaultSplitAccountIds).toBeUndefined();
});



//
//---------------------------------------------------------
//
test('AccountManager-removeAccount', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();

    // Can't delete the required accounts:
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getRootAssetAccountId())).rejects.toThrow();
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getRootLiabilityAccountId())).rejects.toThrow();
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getRootIncomeAccountId())).rejects.toThrow();
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getRootExpenseAccountId())).rejects.toThrow();
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getRootEquityAccountId())).rejects.toThrow();
    await expect(accountManager.asyncRemoveAccount(
        accountManager.getOpeningBalancesAccountId())).rejects.toThrow();

    const originalAccount = accountManager.getAccountDataItemWithId(sys.iraId);


    let eventArgs;
    accountManager.on('accountRemove', (args) => {
        eventArgs = args;
    });


    let account;
    const result = await accountManager.asyncRemoveAccount(sys.iraId);
    account = result.removedAccountDataItem;
    expect(account).toEqual(originalAccount);

    // accountRemove event test.
    expect(eventArgs).toEqual({ removedAccountDataItem: account });
    expect(eventArgs.removedAccountDataItem).toBe(account);


    let parentAccount = accountManager.getAccountDataItemWithId(account.parentAccountId);
    expect(parentAccount.childAccountIds)
        .not.toEqual(expect.arrayContaining([sys.iraId]));
    expect(parentAccount.childAccountIds)
        .toEqual(expect.arrayContaining([sys.aaplIRAId, sys.tibexIRAId]));
    
    const aaplIRA = accountManager.getAccountDataItemWithId(sys.aaplIRAId);
    expect(aaplIRA.parentAccountId).toEqual(parentAccount.id);


    // Make sure the account data item returned was a copy.
    eventArgs.removedAccountDataItem.name = 'Hey';


    // We should be able to add back the account.
    let removeResult;
    accountManager.on('accountAdd', (result) => { removeResult = result; });

    await accountingSystem.getUndoManager().asyncUndoToId(result.undoId);
    expect(removeResult).toEqual(
        { newAccountDataItem: originalAccount });

    account = accountManager.getAccountDataItemWithId(sys.iraId);
    parentAccount = accountManager.getAccountDataItemWithId(sys.investmentsId);
    expect(parentAccount.childAccountIds).toEqual(expect.arrayContaining([sys.iraId]));
    expect(parentAccount.childAccountIds)
        .not.toEqual(expect.arrayContaining([sys.aaplIRAId, sys.tibexIRAId]));

    expect(accountManager.getAccountDataItemWithId(sys.aaplIRAId).parentAccountId)
        .toEqual(sys.iraId);
    expect(accountManager.getAccountDataItemWithId(sys.tibexIRAId).parentAccountId)
        .toEqual(sys.iraId);
    
    expect(account).toEqual(originalAccount);

    //
    // Test JSON.
    const handlerA = accountManager._handler;
    const jsonString = JSON.stringify(handlerA);
    const json = JSON.parse(jsonString);
    const handlerB = new A.InMemoryAccountsHandler();
    handlerB.fromJSON(json);

    expect(handlerB.getIdGeneratorOptions()).toEqual(handlerA.getIdGeneratorOptions());

    const accountDataItemsA = Array.from(handlerA.getAccountDataItems()).sort();
    const accountDataItemsB = Array.from(handlerB.getAccountDataItems()).sort();
    expect(accountDataItemsB).toEqual(accountDataItemsA);
});



//
//---------------------------------------------------------
//
test('AccountManager-tags', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const accountManager = accountingSystem.getAccountManager();

    let result;
    result = accountManager.getAccountIdsWithTags(StandardAccountTag.INTEREST);
    expect(result).toEqual(expect.arrayContaining(
        [sys.interestIncomeId, sys.interestExpenseId]));
    expect(result.length).toEqual(2);

    result = accountManager.getAccountIdsWithTags(StandardAccountTag.INTEREST,
        accountManager.getRootAssetAccountDataItem());
    expect(result).toEqual([]);

    // Also check that the tag arg gets cleaned...
    result = accountManager.getAccountIdsWithTags(
        ' ' + StandardAccountTag.INTEREST.name + '  ',
        accountManager.getRootIncomeAccountId());
    expect(result).toEqual(expect.arrayContaining([sys.interestIncomeId]));
    expect(result.length).toEqual(1);

    result = accountManager.getAccountIdsWithTags(StandardAccountTag.INTEREST,
        accountManager.getRootExpenseAccountId());
    expect(result).toEqual(expect.arrayContaining([sys.interestExpenseId]));
    expect(result.length).toEqual(1);

    
    result = accountManager.getAccountIdsWithTags(
        [ StandardAccountTag.INTEREST,
            StandardAccountTag.DIVIDENDS,
        ],);
    expect(result).toEqual(expect.arrayContaining(
        [sys.interestIncomeId, sys.dividendsId, sys.interestExpenseId]
    ));
    expect(result.length).toEqual(3);

});
