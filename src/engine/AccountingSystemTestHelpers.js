/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
import { AccountingSystem, InMemoryAccountingSystemHandler } from './AccountingSystem';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryAccountsHandler } from './Accounts';
import { InMemoryLotsHandler } from './Lots';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as T from './Transactions';
import { getDecimalDefinition } from '../util/Quantities';
import { InMemoryPricesHandler } from './Prices';
import { InMemoryTransactionsHandler } from './Transactions';
import { InMemoryUndoHandler } from '../util/Undo';
import { InMemoryActionsHandler } from '../util/Actions';
import { getYMDDate } from '../util/YMDDate';
import { getQuantityDefinition } from '../util/Quantities';


//
//---------------------------------------------------------
//
export async function asyncCreateAccountingSystem(options) {
    options = options || {};
    options = Object.assign(
        {
            handler: new InMemoryAccountingSystemHandler(),

            accountManager: {
                handler: new InMemoryAccountsHandler(),
            },
            lotManager: {
                handler: new InMemoryLotsHandler(),
            },

            pricedItemManager: {
                handler: new InMemoryPricedItemsHandler(),
            },
            priceManager: {
                handler: new InMemoryPricesHandler(),
            },

            transactionManager: {
                handler: new InMemoryTransactionsHandler(),
            },

            actionManager: {
                handler: new InMemoryActionsHandler(),
            },
            undoManager: {
                handler: new InMemoryUndoHandler(),
            },
        },
        options);

    const accountingSystem = new AccountingSystem(options);
    await accountingSystem.asyncSetupForUse();
    return accountingSystem;
}


//
//---------------------------------------------------------
//  -Root Assets
//      -currentAssetsId
//          -cashId
//          -checkingId
//          -savingsId
//
//      -fixedAssetsId
//          -houseId
//          -secondHouseId
//
//      -investmentsId
//          -brokerageAId
//              -aaplBrokerageAId
//              -msftBrokerageAId
//              -mmmBrokerageAId
//
//          -brokerageBId
//              -ibmBrokerageBId
//              -vwusxBrokerageBId
//
//          -iraId
//              -aaplIRAId
//              -tibexIRAId
//
//  - Root Liabilities
//      -creditCardsId
//          -amexCardId
//          -discoverCardId
//
//      -loansId
//          -autoLoanId
//          -mortgageId
//
//  -Root Income
//      -bonusId
//      -dividendsId
//      -giftsReceivedId
//      -interestId
//      -otherIncomeId
//      -salaryId
//
//  -Root Expenses
//      -autoId
//          -autoInsuranceId
//          -autoFuelId
//          -autoMaintenanceId
//
//      -commissionsId
//      -feesId
//      -charityId
//      -groceriesId
//      -entertainmentId
//      -householdId
//
//      -insurancePremiumsId
//          -healthInsuranceId
//          -dentalInsuranceId
//          -lifeInsuranceId
//
//      -medicalId
//      -miscId
//
//      -taxesId
//          -federalTaxesId
//          -stateTaxesId
//          -medicareTaxesId
//          -socSecTaxesId
//
//      -utilitiesId
//          -electricityId
//          -gasId
//          -phoneId
//          -internetId
//


//
//---------------------------------------------------------
//
export async function asyncCreateBasicAccountingSystem(options) {
    const accountingSystem = await asyncCreateAccountingSystem(options);
    return asyncSetupBasicAccounts(accountingSystem);
}


//
//---------------------------------------------------------
//
export async function asyncSetupBasicAccounts(accountingSystem) {
    const accountManager = accountingSystem.getAccountManager();
    const pricedItemManager = accountingSystem.getPricedItemManager();

    const sys = { accountingSystem: accountingSystem };
    const rootAssetId = accountManager.getRootAssetAccountId();
    const rootLiabilityId = accountManager.getRootLiabilityAccountId();
    const rootIncomeId = accountManager.getRootIncomeAccountId();
    const rootExpenseId = accountManager.getRootExpenseAccountId();

    // Add a whole bunch of accounts.
    const initialYMDDate = '2000-01-23';
    sys.initialYMDDate = initialYMDDate;

    //
    // Assets
    //
    const baseCurrencyPricedItemId = pricedItemManager.getCurrencyBasePricedItemId();
    sys.currentAssetsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Current Assets', },
    )).newAccountDataItem.id;

    sys.cashId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.CASH, pricedItemId: baseCurrencyPricedItemId, name: 'Cash', },
    )).newAccountDataItem.id;
    
    sys.checkingId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Checking Account', },
    )).newAccountDataItem.id;
    
    sys.savingsId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Savings Account', },
    )).newAccountDataItem.id;
        
    sys.fixedAssetsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Fixed Assets', },
    )).newAccountDataItem.id;

    
    sys.housePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Main House', }
    )).newPricedItemDataItem.id;
    sys.houseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.housePricedItemId, name: 'Main House', },
    )).newAccountDataItem.id;

    sys.secondHousePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Second House', }
    )).newPricedItemDataItem.id;
    sys.secondHouseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.secondHousePricedItemId, name: 'Vacation House', },
    )).newAccountDataItem.id;

    
    sys.aaplPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'Apple Computer Inc.', ticker: 'AAPL', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.intcPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'Intel Corporation', ticker: 'INTC', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.msftPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'Microsoft Corporation', ticker: 'MSFT', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.mmmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: '3M', ticker: 'MMM', market: 'NYSE', }
    )).newPricedItemDataItem.id;
    sys.ibmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'IBM Corporation', ticker: 'IBM', market: 'NYSE', }
    )).newPricedItemDataItem.id;

    sys.tibexPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'TIAA TIBEX', ticker: 'TIBEX', }
    )).newPricedItemDataItem.id;
    sys.vwusxPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(4), name: 'Vanguard VWUSX', ticker: 'VWUSX', }
    )).newPricedItemDataItem.id;

    sys.investmentsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Investsments', },
    )).newAccountDataItem.id;

    sys.brokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage A', },
    )).newAccountDataItem.id;

    sys.aaplBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
    )).newAccountDataItem.id;

    sys.msftBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.msftPricedItemId, name: 'MSFT', },
    )).newAccountDataItem.id;

    sys.mmmBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.mmmPricedItemId, name: 'MMM', },
    )).newAccountDataItem.id;


    sys.brokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage B', },
    )).newAccountDataItem.id;

    sys.ibmBrokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.SECURITY, pricedItemId: sys.ibmPricedItemId, name: 'IBM', },
    )).newAccountDataItem.id;

    sys.vwusxBrokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.vwusxPricedItemId, name: 'Vanguard VWUSX', },
    )).newAccountDataItem.id;


    sys.iraId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'IRA', },
    )).newAccountDataItem.id;

    sys.aaplIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
    )).newAccountDataItem.id;

    sys.tibexIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.tibexPricedItemId, name: 'TIAA TIBEX', },
    )).newAccountDataItem.id;


    
    //
    // Liabilities
    //
    sys.creditCardsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Credit Cards', },
    )).newAccountDataItem.id;

    sys.amexCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'American Express', },
    )).newAccountDataItem.id;

    sys.discoverreditCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'Discover Card', },
    )).newAccountDataItem.id;


    sys.loansId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Loans', },
    )).newAccountDataItem.id;

    sys.autoLoanId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.LOAN, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Loan', },
    )).newAccountDataItem.id;

    sys.mortgageId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.MORTGAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Mortgage', },
    )).newAccountDataItem.id;


    //
    // Income
    //
    sys.bonusId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Bonus', },
    )).newAccountDataItem.id;

    sys.dividendsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Dividend Income', },
    )).newAccountDataItem.id;

    sys.giftsReceivedId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Gifts Received', },
    )).newAccountDataItem.id;

    sys.interestId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Interest Income', },
    )).newAccountDataItem.id;

    sys.otherIncomeId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Other Income', },
    )).newAccountDataItem.id;
    
    sys.salaryId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Salary', },
    )).newAccountDataItem.id;
    
    
    //
    // Expenses
    //
    sys.autoId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto', },
    )).newAccountDataItem.id;
    sys.autoInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Insurance', },
    )).newAccountDataItem.id;
    sys.autoFuelId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
    )).newAccountDataItem.id;
    sys.autoMaintenanceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Maintenance', },
    )).newAccountDataItem.id;


    sys.commissionsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Commissions', },
    )).newAccountDataItem.id;

    sys.feesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Fees', },
    )).newAccountDataItem.id;
    
    sys.charityId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Charity', },
    )).newAccountDataItem.id;

    sys.groceriesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Groceries', },
    )).newAccountDataItem.id;

    sys.entertainmentId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Entertainment', },
    )).newAccountDataItem.id;

    sys.householdId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Household', },
    )).newAccountDataItem.id;

    sys.insurancePremiumsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Insurance', },
    )).newAccountDataItem.id;
    sys.healthInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Health Insurance', },
    )).newAccountDataItem.id;
    sys.dentalInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Dental Insurance', },
    )).newAccountDataItem.id;
    sys.lifeInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Life Insurance', },
    )).newAccountDataItem.id;

    sys.medicalId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medical', },
    )).newAccountDataItem.id;

    sys.miscId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Miscellaneous', },
    )).newAccountDataItem.id;


    sys.taxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Taxes', },
    )).newAccountDataItem.id;
    sys.federalTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Federal Taxes', },
    )).newAccountDataItem.id;
    sys.stateTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'State Taxes', },
    )).newAccountDataItem.id;
    sys.medicareTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medicare Taxes', },
    )).newAccountDataItem.id;
    sys.socSecTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Social Security Taxes', },
    )).newAccountDataItem.id;
    

    sys.utilitiesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Utilities', },
    )).newAccountDataItem.id;
    sys.electricityId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Power', },
    )).newAccountDataItem.id;
    sys.gasId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
    )).newAccountDataItem.id;
    sys.phoneId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Phone', },
    )).newAccountDataItem.id;
    sys.internetId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Internet', },
    )).newAccountDataItem.id;


    return sys;
}


//
//---------------------------------------------------------
//
export async function asyncAddOpeningBalances(sys) {
    const { accountingSystem, initialYMDDate } = sys;
    const transactionManager = accountingSystem.getTransactionManager();

    const openingBalancesId = accountingSystem.getAccountManager().getOpeningBalancesAccountId();

    sys.checkingOBQuantityBaseValue = 100000;
    sys.cashOBQuantityBaseValue = 5000;
    sys.brokerageAOBQuantityBaseValue = 1000000;
    sys.brokerageBOBQuantityBaseValue = 2000000;
    sys.iraOBQuantityBaseValue = 3000000;

    await transactionManager.asyncAddTransaction([
        { ymdDate: initialYMDDate, 
            splits: [
                { accountId: sys.checkingId, quantityBaseValue: sys.checkingOBQuantityBaseValue, },
                { accountId: openingBalancesId, quantityBaseValue: sys.checkingOBQuantityBaseValue, },
            ], 
        },
        { ymdDate: initialYMDDate, 
            splits: [
                { accountId: sys.cashId, quantityBaseValue: sys.cashOBQuantityBaseValue, },
                { accountId: openingBalancesId, quantityBaseValue: sys.cashOBQuantityBaseValue, },
            ], 
        },
        { ymdDate: initialYMDDate, 
            splits: [
                { accountId: sys.brokerageAId, quantityBaseValue: sys.brokerageAOBQuantityBaseValue, },
                { accountId: openingBalancesId, quantityBaseValue: sys.brokerageAOBQuantityBaseValue, },
            ], 
        },
        { ymdDate: initialYMDDate, 
            splits: [
                { accountId: sys.brokerageBId, quantityBaseValue: sys.brokerageBOBQuantityBaseValue, },
                { accountId: openingBalancesId, quantityBaseValue: sys.brokerageBOBQuantityBaseValue, },
            ], 
        },
        { ymdDate: initialYMDDate, 
            splits: [
                { accountId: sys.iraId, quantityBaseValue: sys.iraOBQuantityBaseValue, },
                { accountId: openingBalancesId, quantityBaseValue: sys.iraOBQuantityBaseValue, },
            ], 
        },

    ]);
}


//
//---------------------------------------------------------
//
export async function asyncAddBasicTransactions(sys) {
    const { accountingSystem, initialYMDDate } = sys;
    const transactionManager = accountingSystem.getTransactionManager();

    let ymdDate = getYMDDate(initialYMDDate);

    ymdDate = ymdDate.addDays(1);
    await transactionManager.asyncAddTransactions([
        {
            ymdDate: ymdDate,
            description: 'Lunch',
            splits: [
                { accountId: sys.groceriesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 1000, },
                { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -1000, },
            ],
        },
        {
            ymdDate: ymdDate,
            description: 'Cash',
            splits: [
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.RECONCILED.name, quantityBaseValue: -10000, },
                { accountId: sys.cashId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
            ],
        },
    ]);

    ymdDate = ymdDate.addDays(1);
    await transactionManager.asyncAddTransactions([
        {
            ymdDate: ymdDate,
            description: 'Shopping',
            splits: [
                { accountId: sys.householdId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 15000, },
                { accountId: sys.amexCardId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 15000, },
            ],
        },
        {
            ymdDate: ymdDate,
            description: 'Power bill',
            splits: [
                { accountId: sys.electricityId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 5000, },
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.RECONCILED.name, quantityBaseValue: -5000, },
            ],
        },
        {
            ymdDate: ymdDate,
            description: 'Phone bill',
            splits: [
                { accountId: sys.electricityId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 7000, },
                { accountId: sys.phoneId, reconcileState: T.ReconcileState.RECONCILED.name, quantityBaseValue: -7000, },
            ],
        },
    ]);

    ymdDate = ymdDate.addDays(1);
    await transactionManager.asyncAddTransactions([
        {
            ymdDate: ymdDate,
            description: 'Paycheck',
            splits: [
                { accountId: sys.salaryId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 100000, },
                { accountId: sys.federalTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 25000, },
                { accountId: sys.stateTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 10000, },
                { accountId: sys.medicareTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 2500, },
                { accountId: sys.socSecTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 2000, },
                { accountId: sys.stateTaxesId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 500, description: 'State Fee'},
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 60000, },
            ],
        },
    ]);


    const priceManager = accountingSystem.getPriceManager();

    //
    //  AAPL
    //  2005-02-25  6.36    5.53
    //      2 for 1 split
    //  2005-02-28  6.41    5.58
    //  2005-03-04  6.12    5.32
    //  2005-03-11  5.75    5.01
    //  
    //  2014-06-04  92.12   83.86
    //  2014-06-05  92.48   84.19
    //  2014-06-06  92.22   83.95
    //      7 for 1 split
    //  2014-06-09  93.70   85.30
    //  2014-06-10  94.25   85.80
    //  2014-06-13  91.28   83.09
    //  2014-06-20  90.91   82.76
    await priceManager.asyncAddPrices(sys.aaplPricedItemId,
        [
            { ymdDate: '2005-02-04', close: 5.63 * 2 * 7, },
            { ymdDate: '2005-02-11', close: 5.80 * 2 * 7, },
            { ymdDate: '2005-02-18', close: 6.20 * 2 * 7, },
            { ymdDate: '2005-02-25', close: 6.36 * 2 * 7, },
            // 2 for 1 split...
            { ymdDate: '2005-02-28', close: 6.41 * 7, },
            { ymdDate: '2005-03-04', close: 6.12 * 7, },
            { ymdDate: '2005-03-11', close: 5.75 * 7, },

            { ymdDate: '2014-06-04', close: 92.12 * 7, },
            { ymdDate: '2014-06-05', close: 92.48 * 7, },
            { ymdDate: '2014-06-06', close: 92.22 * 7, },
            // 7 for 1 split...
            { ymdDate: '2014-06-09', close: 93.70, },
            { ymdDate: '2014-06-10', close: 94.25, },
            { ymdDate: '2014-06-13', close: 91.28, },
            { ymdDate: '2014-06-20', close: 90.91, },

            { ymdDate: '2015-03-12', close: 124.45, },

            { ymdDate: '2020-01-24', close: 318.31, },
            { ymdDate: '2020-01-31', close: 309.51, },

        ]);
    
    // MSFT
    await priceManager.asyncAddPrices(sys.msftPricedItemId,
        [
            { ymdDate: '2005-02-04', close: 26.32, },
            { ymdDate: '2005-02-11', close: 25.97, },
            { ymdDate: '2005-02-18', close: 25.48, },
            { ymdDate: '2005-02-25', close: 25.25, },
            { ymdDate: '2005-02-28', close: 25.16, },
            { ymdDate: '2005-03-04', close: 25.17, },
            { ymdDate: '2005-03-11', close: 25.09, },

            { ymdDate: '2014-06-04', close: 40.32, },
            { ymdDate: '2014-06-10', close: 41.11, },
            { ymdDate: '2014-06-13', close: 41.23, },
            { ymdDate: '2014-06-20', close: 41.68, },

            { ymdDate: '2015-03-12', close: 41.02, },

            { ymdDate: '2020-01-24', close: 165.04, },
            { ymdDate: '2020-01-31', close: 170.23, },
        ]);

    const pricedItemManager = accountingSystem.getPricedItemManager();
    const aaplPricedItem = pricedItemManager.getPricedItemDataItemWithId(sys.aaplPricedItemId);
    const lotQuantityDefinition = getQuantityDefinition(aaplPricedItem.quantityDefinition);
    const priceQuantityDefinition = accountingSystem.getBaseCurrencyObject().getQuantityDefinition();
    
    const lotManager = accountingSystem.getLotManager();
    const aaplLot1 = (await lotManager.asyncAddLot({ pricedItemId: sys.aaplPricedItemId, description: 'Lot 2005-02-11'})).newLotDataItem;
    sys.aaplLot1 = aaplLot1;

    const aaplPrice1 = await priceManager.asyncGetPriceDataItemOnOrClosestBefore(sys.aaplPricedItemId, '2005-02-11');
    const aaplQuantity1 = 100;
    const aaplCostBasis1 = aaplQuantity1 * aaplPrice1.close;
    const aaplQuantityBaseValue1 = lotQuantityDefinition.numberToBaseValue(aaplQuantity1);
    const aaplCostBasisBaseValue1 = priceQuantityDefinition.numberToBaseValue(aaplCostBasis1);

    const aaplLotChange1 = { lotId: aaplLot1.id, quantityBaseValue: aaplQuantityBaseValue1, costBasisBaseValue: aaplCostBasisBaseValue1, };
    await transactionManager.asyncAddTransaction([
        {
            ymdDate: '2005-02-11',
            splits: [
                { accountId: sys.iraId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -aaplCostBasisBaseValue1, },
                { 
                    accountId: sys.aaplIRAId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: aaplCostBasisBaseValue1, 
                    lotChanges: [ aaplLotChange1 ],
                },
                
            ]
        }
    ]);
    


    // Add the stock splits.
    const aaplChangeSplit2005_02_28 = { lotId: aaplLot1.id, isSplitMerge: true, quantityBaseValue: aaplQuantityBaseValue1, };
    const aaplTrans2005_02_28 = (await transactionManager.asyncAddTransaction(
        {
            ymdDate: '2005-02-28',
            description: '2 for 1 split',
            splits: [
                {
                    accountId: sys.aaplIRAId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: 0,
                    lotChanges: [ aaplChangeSplit2005_02_28 ],
                }
            ],
        }
    )).newTransactionDataItem;

    const aaplChangeSplit2014_06_09 = { lotId: aaplLot1.id, isSplitMerge: true, quantityBaseValue: 6 * (aaplChangeSplit2005_02_28.quantityBaseValue + aaplQuantityBaseValue1), };
    const aaplTrans2014_06_09 = (await transactionManager.asyncAddTransaction(
        {
            ymdDate: '2014-06-09',
            description: '7 for 1 split',
            splits: [
                {
                    accountId: sys.aaplIRAId,
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: 0,
                    lotChanges: [ aaplChangeSplit2014_06_09 ],
                }
            ],
        }
    )).newTransactionDataItem;



    const aaplLot2 = (await lotManager.asyncAddLot({ pricedItemId: sys.aaplPricedItemId, description: 'Lot 2015-03-12'})).newLotDataItem;
    sys.applLot2 = aaplLot2;

    const aaplPrice2 = await priceManager.asyncGetPriceDataItemOnOrClosestBefore(sys.aaplPricedItemId, '2015-03-12');
    const aaplQuantity2 = 100;
    const aaplCostBasis2 = aaplQuantity2 * aaplPrice2.close;
    const aaplQuantityBaseValue2 = lotQuantityDefinition.numberToBaseValue(aaplQuantity2);
    const aaplCostBasisBaseValue2 = priceQuantityDefinition.numberToBaseValue(aaplCostBasis2);
    const aaplLotChange2 = { lotId: aaplLot2.id, quantityBaseValue: aaplQuantityBaseValue2, costBasisBaseValue: aaplCostBasisBaseValue2, };
    await transactionManager.asyncAddTransaction([
        {
            ymdDate: aaplPrice2.ymdDate,
            splits: [
                { accountId: sys.iraId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -aaplCostBasisBaseValue2, },
                { 
                    accountId: sys.aaplIRAId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: aaplCostBasisBaseValue2, 
                    lotChanges: [ aaplLotChange2 ],
                },
            ]
        }
    ]);


    // Sell 10 shares
    const aaplPrice3 = await priceManager.asyncGetPriceDataItemOnOrClosestBefore(sys.aaplPricedItemId, '2020-01-24');
    const aaplQuantity3 = -10;
    const aaplCostBasis3 = aaplQuantity3 * aaplPrice3.close;
    const aaplQuantityBaseValue3 = lotQuantityDefinition.numberToBaseValue(aaplQuantity3);
    const aaplCostBasisBaseValue3 = priceQuantityDefinition.numberToBaseValue(aaplCostBasis3);
    const aaplLotChange3 = { lotId: aaplLot2.id, quantityBaseValue: aaplQuantityBaseValue3, costBasisBaseValue: aaplCostBasisBaseValue3, };
    await transactionManager.asyncAddTransaction([
        {
            ymdDate: aaplPrice3.ymdDate,
            splits: [
                { accountId: sys.iraId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -aaplCostBasisBaseValue3, },
                { 
                    accountId: sys.aaplIRAId, 
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name, 
                    quantityBaseValue: aaplCostBasisBaseValue3, 
                    lotChanges: [ aaplLotChange3 ],
                },
                
            ]
        }
    ]);


    await transactionManager.asyncAddTransactions([
        {
            ymdDate: '2010-12-01',
            description: 'Charity donation',
            splits: [
                { accountId: sys.charityId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 15000, },
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -15000, refNum: '123' },
            ],
        },
        {
            ymdDate: '2011-12-10',
            description: 'Charity donation',
            splits: [
                { accountId: sys.charityId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 15000, },
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -15000, refNum: '456' },
            ],
        },
        {
            ymdDate: '2013-12-15',
            description: 'Charity donation',
            splits: [
                { accountId: sys.charityId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: 20000, },
                { accountId: sys.checkingId, reconcileState: T.ReconcileState.NOT_RECONCILED.name, quantityBaseValue: -20000, refNum: '678' },
            ],
        },
    ]);

}
