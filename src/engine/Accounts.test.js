import * as A from './Accounts';
import * as ASTH from './AccountingSystemTestHelpers';
import * as ATH from './AccountTestHelpers';
import { YMDDate } from '../util/YMDDate';

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
    const testRootAssetAccount = accountManager.getAccount(accountManager.getRootAssetAccountId());
    expect(testRootAssetAccount).toEqual(rootAssetAccount);

    ATH.expectAccount(testRootAssetAccount, {
        id: accountManager.getRootAssetAccountId(),
        type: A.AccountType.ASSET,
        pricedItemId: currencyPricedItemId,
    });


    const rootLiabilityAccount = accountManager.getRootLiabilityAccount();
    const testRootLiabilityAccount = accountManager.getAccount(accountManager.getRootLiabilityAccountId());
    expect(testRootLiabilityAccount).toEqual(rootLiabilityAccount);

    ATH.expectAccount(testRootLiabilityAccount, {
        id: accountManager.getRootLiabilityAccountId(),
        type: A.AccountType.LIABILITY,
        pricedItemId: currencyPricedItemId,
    });


    const rootIncomeAccount = accountManager.getRootIncomeAccount();
    const testRootIncomeAccount = accountManager.getAccount(accountManager.getRootIncomeAccountId());
    expect(testRootIncomeAccount).toEqual(rootIncomeAccount);

    ATH.expectAccount(testRootIncomeAccount, {
        id: accountManager.getRootIncomeAccountId(),
        type: A.AccountType.INCOME,
        pricedItemId: currencyPricedItemId,
    });


    const rootExpenseAccount = accountManager.getRootExpenseAccount();
    const testRootExpenseAccount = accountManager.getAccount(accountManager.getRootExpenseAccountId());
    expect(testRootExpenseAccount).toEqual(rootExpenseAccount);

    ATH.expectAccount(testRootExpenseAccount, {
        id: accountManager.getRootExpenseAccountId(),
        type: A.AccountType.EXPENSE,
        pricedItemId: currencyPricedItemId,
    });


    const rootEquityAccount = accountManager.getRootEquityAccount();
    const testRootEquityAccount = accountManager.getAccount(accountManager.getRootEquityAccountId());
    expect(testRootEquityAccount).toEqual(rootEquityAccount);

    ATH.expectAccount(testRootEquityAccount, {
        id: accountManager.getRootEquityAccountId(),
        type: A.AccountType.EQUITY,
        pricedItemId: currencyPricedItemId,
        childAccountIds: [accountManager.getOpeningBalancesAccountId()],
    });


    const openingBalancesAccount = accountManager.getOpeningBalancesAccount();
    const testOpeningBalancesAccount = accountManager.getAccount(accountManager.getOpeningBalancesAccountId());
    expect(testOpeningBalancesAccount).toEqual(openingBalancesAccount);

    ATH.expectAccount(testOpeningBalancesAccount, {
        id: accountManager.getOpeningBalancesAccountId(),
        type: A.AccountType.OPENING_BALANCE,
        pricedItemId: currencyPricedItemId,
    });
});