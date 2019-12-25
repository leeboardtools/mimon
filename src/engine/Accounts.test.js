import * as A from './Accounts';
import * as PI from './PricedItems';
import * as ASTH from './AccountingSystemTestHelpers';
import * as ATH from './AccountTestHelpers';
import { YMDDate } from '../util/YMDDate';
import { getDecimalDefinition } from '../util/Quantities';

function testAccountStateDataItem(accountState) {
    const dataItem = A.getAccountStateDataItem(accountState);
    const string = JSON.stringify(dataItem);
    const json = JSON.parse(string);
    expect(json).toEqual(dataItem);

    const accountStateBack = A.getAccountState(json);
    expect(accountStateBack).toEqual(accountState);

    expect(A.getAccountState(accountState) === accountState).toBeTruthy();
    expect(A.getAccountStateDataItem(dataItem) === dataItem).toBeTruthy();
}

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
test('AccountState-Data Items', () => {
    const stateA = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
    };
    testAccountStateDataItem(stateA);

    const stateB = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
        lots: [
            { purchaseYMDDate: new YMDDate(2000, 0, 1), quantityBaseValue: 123456, costBasisBaseValue: 7989, }, 
            { purchaseYMDDate: new YMDDate(2010, 10, 11), quantityBaseValue: 9876, costBasisBaseValue: 456, }, 
        ],
    };
    testAccountStateDataItem(stateB);
});


//
//---------------------------------------------------------
//
test('Account-Data Items', () => {
    const plainState = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
    };

    const plainAccount = {
        id: 123,
        type: A.AccountType.ASSET,
        pricedItemId: 12345,
        accountState: plainState,
    };
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.BANK;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.BROKERAGE;
    testAccountDataItem(plainAccount);

    plainAccount.type = A.AccountType.CASH;
    testAccountDataItem(plainAccount);

    const lotsState = {
        ymdDate: new YMDDate(2019, 3, 4),
        quantityBaseValue: -4567,
        lots: [
            { purchaseYMDDate: new YMDDate(2000, 0, 1), quantityBaseValue: 123456, costBasisBaseValue: 7989, }, 
            { purchaseYMDDate: new YMDDate(2010, 10, 11), quantityBaseValue: 9876, costBasisBaseValue: 456, }, 
        ],
    };
    const lotsAccount = {
        id: 1234,
        type: A.AccountType.SECURITY,
        pricedItemId: 1234578,
        accountState: lotsState,
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

});


//
//---------------------------------------------------------
//
test('AccountManager-rootAccounts', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const accountManager = accountingSystem.getAccountManager();
    expect(accountManager).not.toBeUndefined();

    const pricedItemManager = accountingSystem.getPricedItemManager();
    const currencyPricedItemId = pricedItemManager.getCurrencyPricedItemId(accountingSystem.getBaseCurrency());


    const rootAssetAccount = accountManager.getRootAssetAccount();
    const testRootAssetAccount = accountManager.getAccountDataItemWithId(accountManager.getRootAssetAccountId());
    expect(testRootAssetAccount).toEqual(rootAssetAccount);

    ATH.expectAccount(testRootAssetAccount, {
        id: accountManager.getRootAssetAccountId(),
        type: A.AccountType.ASSET,
        pricedItemId: currencyPricedItemId,
    });


    const rootLiabilityAccount = accountManager.getRootLiabilityAccount();
    const testRootLiabilityAccount = accountManager.getAccountDataItemWithId(accountManager.getRootLiabilityAccountId());
    expect(testRootLiabilityAccount).toEqual(rootLiabilityAccount);

    ATH.expectAccount(testRootLiabilityAccount, {
        id: accountManager.getRootLiabilityAccountId(),
        type: A.AccountType.LIABILITY,
        pricedItemId: currencyPricedItemId,
    });


    const rootIncomeAccount = accountManager.getRootIncomeAccount();
    const testRootIncomeAccount = accountManager.getAccountDataItemWithId(accountManager.getRootIncomeAccountId());
    expect(testRootIncomeAccount).toEqual(rootIncomeAccount);

    ATH.expectAccount(testRootIncomeAccount, {
        id: accountManager.getRootIncomeAccountId(),
        type: A.AccountType.INCOME,
        pricedItemId: currencyPricedItemId,
    });


    const rootExpenseAccount = accountManager.getRootExpenseAccount();
    const testRootExpenseAccount = accountManager.getAccountDataItemWithId(accountManager.getRootExpenseAccountId());
    expect(testRootExpenseAccount).toEqual(rootExpenseAccount);

    ATH.expectAccount(testRootExpenseAccount, {
        id: accountManager.getRootExpenseAccountId(),
        type: A.AccountType.EXPENSE,
        pricedItemId: currencyPricedItemId,
    });


    const rootEquityAccount = accountManager.getRootEquityAccount();
    const testRootEquityAccount = accountManager.getAccountDataItemWithId(accountManager.getRootEquityAccountId());
    expect(testRootEquityAccount).toEqual(rootEquityAccount);

    ATH.expectAccount(testRootEquityAccount, {
        id: accountManager.getRootEquityAccountId(),
        type: A.AccountType.EQUITY,
        pricedItemId: currencyPricedItemId,
        childAccountIds: [accountManager.getOpeningBalancesAccountId()],
    });


    const openingBalancesAccount = accountManager.getOpeningBalancesAccount();
    const testOpeningBalancesAccount = accountManager.getAccountDataItemWithId(accountManager.getOpeningBalancesAccountId());
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

    const securityPricedItemA = await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.SECURITY,
        currency: accountingSystem.getBaseCurrency(),
        quantityDefinition: getDecimalDefinition(-4),
        ticker: 'ABCD',
    });

    const mutualFundPricedItemA = await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.MUTUAL_FUND,
        currency: accountingSystem.getBaseCurrency(),
        quantityDefinition: getDecimalDefinition(-4),
        ticker: 'MFUND',
    });

    const realEstatePricedItemA = await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.REAL_ESTATE,
        currency: accountingSystem.getBaseCurrency(),
        quantityDefinition: getDecimalDefinition(0),
    });

    const propertyPricedItemA = await pricedItemManager.asyncAddPricedItem({
        type: PI.PricedItemType.PROPERTY,
        currency: accountingSystem.getBaseCurrency(),
        quantityDefinition: getDecimalDefinition(0),
    });


    let accountDataItem;

    //
    // ASSET
    //
    const assetOptionsA = {
        parentAccountId: accountManager.getRootAssetAccountId(),
        type: A.AccountType.ASSET,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Current Assets',
    };
    const assetA = await accountManager.asyncAddAccount(assetOptionsA);
    ATH.expectAccount(assetA, assetOptionsA);
    expect(assetA.accountState.lots).toBeUndefined();

    expect(accountManager.getRootAssetAccount().childAccountIds.includes(assetA.id)).toBeTruthy();

    //
    // BANK
    //
    const bankOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.BANK,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Checking Account',
        description: 'This is a checking account',
    };
    const bankA = await accountManager.asyncAddAccount(bankOptionsA);
    ATH.expectAccount(bankA, bankOptionsA);
    expect(bankA.accountState.lots).toBeUndefined();

    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([bankA.id]));


    //
    // CASH
    //
    const cashOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.CASH,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Cash Account',
    };
    const cashA = await accountManager.asyncAddAccount(cashOptionsA);
    ATH.expectAccount(cashA, cashOptionsA);
    expect(cashA.accountState.lots).toBeUndefined();

    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([cashA.id]));


    //
    // BROKERAGE
    //
    const brokerageOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.BROKERAGE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Brokerage Account',
    };
    const brokerageA = await accountManager.asyncAddAccount(brokerageOptionsA);
    ATH.expectAccount(brokerageA, brokerageOptionsA);
    expect(brokerageA.accountState.lots).toBeUndefined();

    accountDataItem = accountManager.getAccountDataItemWithId(assetA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([brokerageA.id]));


    //
    // SECURITY
    //
    const securityOptionsA = {
        parentAccountId: brokerageA.id,
        type: A.AccountType.SECURITY,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Security Account',
        description: 'This is a security account',
    };
    // Fails because expects a security priced item.
    await expect(accountManager.asyncAddAccount(securityOptionsA)).rejects.toThrow();

    securityOptionsA.pricedItemId = securityPricedItemA.id;
    const securityA = await accountManager.asyncAddAccount(securityOptionsA);
    ATH.expectAccount(securityA, securityOptionsA);
    expect(securityA.accountState.lots).toEqual([]);

    accountDataItem = accountManager.getAccountDataItemWithId(brokerageA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([securityA.id]));


    //
    // MUTUAL_FUND
    //
    const mutualFundOptionsA = {
        parentAccountId: brokerageA.id,
        type: A.AccountType.MUTUAL_FUND,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
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

    const mutualFundA = await accountManager.asyncAddAccount(mutualFundOptionsA);
    ATH.expectAccount(mutualFundA, mutualFundOptionsA);
    expect(mutualFundA.accountState.lots).toEqual([]);


    //
    // REAL_ESTATE
    //
    const realEstateOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.REAL_ESTATE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Real Estate Account',
        description: 'This is a real estate account',
    };
    // Fails because expects a real estate priced item.
    await expect(accountManager.asyncAddAccount(realEstateOptionsA)).rejects.toThrow();
    realEstateOptionsA.pricedItemId = realEstatePricedItemA.id;

    const realEstateA = await accountManager.asyncAddAccount(realEstateOptionsA);
    ATH.expectAccount(realEstateA, realEstateOptionsA);
    expect(realEstateA.accountState.lots).toEqual([]);


    //
    // PROPERTY
    //
    const propertyOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.PROPERTY,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Property Account',
        description: 'This is a property account',
    };
    // Fails because expects a real estate priced item.
    await expect(accountManager.asyncAddAccount(propertyOptionsA)).rejects.toThrow();
    propertyOptionsA.pricedItemId = propertyPricedItemA.id;

    const propertyA = await accountManager.asyncAddAccount(propertyOptionsA);
    ATH.expectAccount(propertyA, propertyOptionsA);
    expect(propertyA.accountState.lots).toEqual([]);


    //
    // LIABILITY
    //
    const liabilityOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.LIABILITY,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Liability Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(liabilityOptionsA)).rejects.toThrow();
    liabilityOptionsA.parentAccountId = accountManager.getRootLiabilityAccountId();

    const liabilityA = await accountManager.asyncAddAccount(liabilityOptionsA);
    ATH.expectAccount(liabilityA, liabilityOptionsA);
    expect(liabilityA.accountState.lots).toBeUndefined();


    //
    // CREDIT_CARD
    //
    const creditCardOptionsA = {
        parentAccountId: assetA.id,
        type: A.AccountType.CREDIT_CARD,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Credit Card Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(creditCardOptionsA)).rejects.toThrow();
    creditCardOptionsA.parentAccountId = liabilityA.id;

    const creditCardA = await accountManager.asyncAddAccount(creditCardOptionsA);
    ATH.expectAccount(creditCardA, creditCardOptionsA);
    expect(creditCardA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([creditCardA.id]));


    //
    // LOAN
    //
    const loanOptionsA = {
        parentAccountId: creditCardA.id,
        type: A.AccountType.LOAN,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Loan Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(loanOptionsA)).rejects.toThrow();
    loanOptionsA.parentAccountId = liabilityA.id;

    const loanA = await accountManager.asyncAddAccount(loanOptionsA);
    ATH.expectAccount(loanA, loanOptionsA);
    expect(loanA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([loanA.id]));


    //
    // MORTGAGE
    //
    const mortgageOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.MORTGAGE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Mortgage Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(mortgageOptionsA)).rejects.toThrow();
    mortgageOptionsA.parentAccountId = liabilityA.id;

    const mortgageA = await accountManager.asyncAddAccount(mortgageOptionsA);
    ATH.expectAccount(mortgageA, mortgageOptionsA);
    expect(mortgageA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(liabilityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([mortgageA.id]));


    //
    // INCOME
    //
    const incomeOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.INCOME,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Income Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(incomeOptionsA)).rejects.toThrow();
    incomeOptionsA.parentAccountId = accountManager.getRootIncomeAccountId();

    const incomeA = await accountManager.asyncAddAccount(incomeOptionsA);
    ATH.expectAccount(incomeA, incomeOptionsA);
    expect(incomeA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getRootIncomeAccount();
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([incomeA.id]));


    const incomeOptionsB = {
        parentAccountId: incomeA.id,
        type: A.AccountType.INCOME,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Child Income Account',
    };
    const incomeB = await accountManager.asyncAddAccount(incomeOptionsB);
    ATH.expectAccount(incomeB, incomeOptionsB);
    expect(incomeB.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(incomeA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([incomeB.id]));


    //
    // EXPENSE
    //
    const expenseOptionsA = {
        parentAccountId: loanA.id,
        type: A.AccountType.EXPENSE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Income Account',
    };
    // Fails because asset accounts can't have liability accounts..
    await expect(accountManager.asyncAddAccount(expenseOptionsA)).rejects.toThrow();
    expenseOptionsA.parentAccountId = accountManager.getRootExpenseAccountId();

    const expenseA = await accountManager.asyncAddAccount(expenseOptionsA);
    ATH.expectAccount(expenseA, expenseOptionsA);
    expect(expenseA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getRootExpenseAccount();
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([expenseA.id]));


    const expenseOptionsB = {
        parentAccountId: expenseA.id,
        type: A.AccountType.EXPENSE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Child Expense Account',
    };
    const expenseB = await accountManager.asyncAddAccount(expenseOptionsB);
    ATH.expectAccount(expenseB, expenseOptionsB);
    expect(expenseB.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(expenseA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([expenseB.id]));


    //
    // EQUITY
    //
    const equityOptionsA = {
        parentAccountId: incomeA.id,
        type: A.AccountType.EQUITY,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Equity Account',
    };
    // Fails because income accounts can't have equity accounts..
    await expect(accountManager.asyncAddAccount(equityOptionsA)).rejects.toThrow();
    equityOptionsA.parentAccountId = accountManager.getRootEquityAccountId();

    const equityA = await accountManager.asyncAddAccount(equityOptionsA);
    ATH.expectAccount(equityA, equityOptionsA);
    expect(equityA.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getRootEquityAccount();
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([equityA.id]));


    const equityOptionsB = {
        parentAccountId: equityA.id,
        type: A.AccountType.EQUITY,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Child Equity Account',
    };
    const equityB = await accountManager.asyncAddAccount(equityOptionsB);
    ATH.expectAccount(equityB, equityOptionsB);
    expect(equityB.accountState.lots).toBeUndefined();
    
    accountDataItem = accountManager.getAccountDataItemWithId(equityA.id);
    expect(accountDataItem.childAccountIds).toEqual(expect.arrayContaining([equityB.id]));


    //
    // OPENING_BALANCE
    //
    const openingBalancesOptionsA = {
        parentAccountId: equityA.id,
        type: A.AccountType.OPENING_BALANCE,
        pricedItemId: pricedItemManager.getCurrencyBasePricedItemId(),
        name: 'Opening Balance Account',
    };
    // Can only have one opening balances account.
    await expect(accountManager.asyncAddAccount(openingBalancesOptionsA)).rejects.toThrow();
});