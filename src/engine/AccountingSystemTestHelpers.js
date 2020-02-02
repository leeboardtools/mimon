import { AccountingSystem } from './AccountingSystem';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryAccountsHandler } from './Accounts';
import { InMemoryLotsHandler } from './Lots';
import * as A from './Accounts';
import * as PI from './PricedItems';
//import * as T from './Transactions';
import { getDecimalDefinition } from '../util/Quantities';
import { InMemoryPricesHandler } from './Prices';
import { InMemoryTransactionsHandler } from './Transactions';
import { InMemoryUndoHandler } from '../util/Undo';
import { InMemoryActionsHandler } from './Actions';


//
//---------------------------------------------------------
//
export async function asyncCreateAccountingSystem(options) {
    options = options || {};
    options = Object.assign(
        {
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
        initialYMDDate
    )).newAccountDataItem.id;

    sys.cashId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.CASH, pricedItemId: baseCurrencyPricedItemId, name: 'Cash', },
        initialYMDDate
    )).newAccountDataItem.id;
    
    sys.checkingId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Checking Account', },
        initialYMDDate
    )).newAccountDataItem.id;
    
    sys.savingsId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Savings Account', },
        initialYMDDate
    )).newAccountDataItem.id;
        
    sys.fixedAssetsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Fixed Assets', },
        initialYMDDate
    )).newAccountDataItem.id;

    
    sys.housePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Main House', }
    )).newPricedItemDataItem.id;
    sys.houseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.housePricedItemId, name: 'Main House', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.secondHousePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Second House', }
    )).newPricedItemDataItem.id;
    sys.secondHouseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.secondHousePricedItemId, name: 'Vacation House', },
        initialYMDDate
    )).newAccountDataItem.id;

    
    sys.aaplPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Apple Computer Inc.', ticker: 'AAPL', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.intcPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Intel Corporation', ticker: 'INTC', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.msftPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Microsoft Corporation', ticker: 'MSFT', market: 'NASDAQ', }
    )).newPricedItemDataItem.id;
    sys.mmmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: '3M', ticker: 'MMM', market: 'NYSE', }
    )).newPricedItemDataItem.id;
    sys.ibmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'IBM Corporation', ticker: 'IBM', market: 'NYSE', }
    )).newPricedItemDataItem.id;

    sys.tibexPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'TIAA TIBEX', ticker: 'TIBEX', }
    )).newPricedItemDataItem.id;
    sys.vwusxPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Vanguard VWUSX', ticker: 'VWUSX', }
    )).newPricedItemDataItem.id;

    sys.investmentsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Investsments', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.brokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage A', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.aaplBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.msftBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.msftPricedItemId, name: 'MSFT', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.mmmBrokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.mmmPricedItemId, name: 'MMM', },
        initialYMDDate
    )).newAccountDataItem.id;


    sys.brokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage B', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.ibmBrokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.SECURITY, pricedItemId: sys.ibmPricedItemId, name: 'IBM', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.vwusxBrokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.vwusxPricedItemId, name: 'Vanguard VWUSX', },
        initialYMDDate
    )).newAccountDataItem.id;


    sys.iraId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'IRA', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.aaplIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.tibexIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.tibexPricedItemId, name: 'TIAA TIBEX', },
        initialYMDDate
    )).newAccountDataItem.id;


    
    //
    // Liabilities
    //
    sys.creditCardsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Credit Cards', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.amexCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'American Express', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.discoverreditCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'Discover Card', },
        initialYMDDate
    )).newAccountDataItem.id;


    sys.loansId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Loans', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.autoLoanId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.LOAN, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Loan', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.mortgageId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.MORTGAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Mortgage', },
        initialYMDDate
    )).newAccountDataItem.id;


    //
    // Income
    //
    sys.bonusId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Bonus', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.dividendsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Dividend Income', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.giftsReceivedId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Gifts Received', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.interestId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Interest Income', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.otherIncomeId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Other Income', },
        initialYMDDate
    )).newAccountDataItem.id;
    
    sys.salaryId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Salary', },
        initialYMDDate
    )).newAccountDataItem.id;
    
    
    //
    // Expenses
    //
    sys.autoId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.autoInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Insurance', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.autoFuelId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.autoMaintenanceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Maintenance', },
        initialYMDDate
    )).newAccountDataItem.id;


    sys.commissionsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Commissions', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.feesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Fees', },
        initialYMDDate
    )).newAccountDataItem.id;
    
    sys.charityId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Charity', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.groceriesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Groceries', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.entertainmentId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Entertainment', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.householdId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Household', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.insurancePremiumsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Insurance', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.healthInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Health Insurance', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.dentalInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Dental Insurance', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.lifeInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Life Insurance', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.medicalId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medical', },
        initialYMDDate
    )).newAccountDataItem.id;

    sys.miscId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Miscellaneous', },
        initialYMDDate
    )).newAccountDataItem.id;


    sys.taxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Taxes', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.federalTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Federal Taxes', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.stateTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'State Taxes', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.medicareTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medicare Taxes', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.socSecTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Social Security Taxes', },
        initialYMDDate
    )).newAccountDataItem.id;
    

    sys.utilitiesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Utilities', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.electricityId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Power', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.gasId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.phoneId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Phone', },
        initialYMDDate
    )).newAccountDataItem.id;
    sys.internetId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Internet', },
        initialYMDDate
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
