import * as A from './Accounts';
import { AccountingSystem } from './AccountingSystem';
import * as ATH from './AccountTestHelpers';


test('AccountManager-rootAccounts', () => {
    const accountingSystem = new AccountingSystem();
    const accountManager = accountingSystem.getAccountManager();
    expect(accountManager).not.toBeUndefined();

    const pricedItemManager = accountingSystem.getPricedItemManager();
    const currencyPricedItemLocalId = pricedItemManager.getCurrencyPricedItemLocalId(accountingSystem.getBaseCurrency());


    const rootAssetAccount = accountManager.getRootAssetAccount();
    const testRootAssetAccount = accountManager.getAccount(accountManager.getRootAssetAccountLocalId());
    expect(testRootAssetAccount).toEqual(rootAssetAccount);

    ATH.expectAccount(testRootAssetAccount, {
        localId: accountManager.getRootAssetAccountLocalId(),
        type: A.AccountType.ASSET,
        pricedItemLocalId: currencyPricedItemLocalId,
    });


    const rootLiabilityAccount = accountManager.getRootLiabilityAccount();
    const testRootLiabilityAccount = accountManager.getAccount(accountManager.getRootLiabilityAccountLocalId());
    expect(testRootLiabilityAccount).toEqual(rootLiabilityAccount);

    ATH.expectAccount(testRootLiabilityAccount, {
        localId: accountManager.getRootLiabilityAccountLocalId(),
        type: A.AccountType.LIABILITY,
        pricedItemLocalId: currencyPricedItemLocalId,
    });


    const rootIncomeAccount = accountManager.getRootIncomeAccount();
    const testRootIncomeAccount = accountManager.getAccount(accountManager.getRootIncomeAccountLocalId());
    expect(testRootIncomeAccount).toEqual(rootIncomeAccount);

    ATH.expectAccount(testRootIncomeAccount, {
        localId: accountManager.getRootIncomeAccountLocalId(),
        type: A.AccountType.INCOME,
        pricedItemLocalId: currencyPricedItemLocalId,
    });


    const rootExpenseAccount = accountManager.getRootExpenseAccount();
    const testRootExpenseAccount = accountManager.getAccount(accountManager.getRootExpenseAccountLocalId());
    expect(testRootExpenseAccount).toEqual(rootExpenseAccount);

    ATH.expectAccount(testRootExpenseAccount, {
        localId: accountManager.getRootExpenseAccountLocalId(),
        type: A.AccountType.EXPENSE,
        pricedItemLocalId: currencyPricedItemLocalId,
    });


    const rootEquityAccount = accountManager.getRootEquityAccount();
    const testRootEquityAccount = accountManager.getAccount(accountManager.getRootEquityAccountLocalId());
    expect(testRootEquityAccount).toEqual(rootEquityAccount);

    ATH.expectAccount(testRootEquityAccount, {
        localId: accountManager.getRootEquityAccountLocalId(),
        type: A.AccountType.EQUITY,
        pricedItemLocalId: currencyPricedItemLocalId,
        childAccountLocalIds: [accountManager.getOpeningBalancesAccountLocalId()],
    });


    const openingBalancesAccount = accountManager.getOpeningBalancesAccount();
    const testOpeningBalancesAccount = accountManager.getAccount(accountManager.getOpeningBalancesAccountLocalId());
    expect(testOpeningBalancesAccount).toEqual(openingBalancesAccount);

    ATH.expectAccount(testOpeningBalancesAccount, {
        localId: accountManager.getOpeningBalancesAccountLocalId(),
        type: A.AccountType.OPENING_BALANCE,
        pricedItemLocalId: currencyPricedItemLocalId,
    });
});