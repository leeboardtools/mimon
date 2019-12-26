import { AccountingSystem } from './AccountingSystem';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryAccountsHandler } from './Accounts';
import * as A from './Accounts';
import * as PI from './PricedItems';
import { getDecimalDefinition } from '../util/Quantities';
import { InMemoryPricesHandler } from './Prices';


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

            pricedItemManager: {
                handler: new InMemoryPricedItemsHandler(),
            },
            priceManager: {
                handler: new InMemoryPricesHandler(),
            },

            transactionManager: {

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
//              -aaplBrokerageA
//              -msftBrokerageA
//              -mmmBrokerageA
//
//          -brokerageBId
//              -ibmBrokerageB
//              -vwusxBrokerageB
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
export async function asyncCreateBasicAccountingSystem(options) {
    const accountingSystem = await asyncCreateAccountingSystem(options);
    const accountManager = accountingSystem.getAccountManager();
    const pricedItemManager = accountingSystem.getPricedItemManager();

    const sys = { accountingSystem: accountingSystem };
    const rootAssetId = accountManager.getRootAssetAccountId();
    const rootLiabilityId = accountManager.getRootLiabilityAccountId();
    const rootIncomeId = accountManager.getRootIncomeAccountId();
    const rootExpenseId = accountManager.getRootExpenseAccountId();

    // Add a whole bunch of accounts.
    const initialYMDDate = '2000-01-23';

    //
    // Assets
    //
    const baseCurrencyPricedItemId = pricedItemManager.getCurrencyBasePricedItemId();
    sys.currentAssetsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Current Assets', },
        initialYMDDate
    )).id;

    sys.cashId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.CASH, pricedItemId: baseCurrencyPricedItemId, name: 'Cash', },
        initialYMDDate
    )).id;
    
    sys.checkingId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Checking Account', },
        initialYMDDate
    )).id;
    
    sys.savingsId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: baseCurrencyPricedItemId, name: 'Savings Account', },
        initialYMDDate
    )).id;
        
    sys.fixedAssetsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Fixed Assets', },
        initialYMDDate
    )).id;

    
    sys.housePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Main House', }
    )).id;
    sys.houseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.housePricedItemId, name: 'Main House', },
        initialYMDDate
    )).id;

    sys.secondHousePricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.REAL_ESTATE, currency: 'USD', quantityDefinition: getDecimalDefinition(0), name: 'Second House', }
    )).id;
    sys.secondHouseId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.fixedAssetsId, type: A.AccountType.REAL_ESTATE, pricedItemId: sys.secondHousePricedItemId, name: 'Vacation House', },
        initialYMDDate
    )).id;

    
    sys.aaplPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Apple Computer Inc.', ticker: 'AAPL', market: 'NASDAQ', }
    )).id;
    sys.intcPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Intel Corporation', ticker: 'INTC', market: 'NASDAQ', }
    )).id;
    sys.msftPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Microsoft Corporation', ticker: 'MSFT', market: 'NASDAQ', }
    )).id;
    sys.mmmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: '3M', ticker: 'MMM', market: 'NYSE', }
    )).id;
    sys.ibmPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.SECURITY, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'IBM Corporation', ticker: 'IBM', market: 'NYSE', }
    )).id;

    sys.tibexPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'TIAA TIBEX', ticker: 'TIBEX', }
    )).id;
    sys.vwusxPricedItemId = (await pricedItemManager.asyncAddPricedItem(
        { type: PI.PricedItemType.MUTUAL_FUND, currency: 'USD', quantityDefinition: getDecimalDefinition(-4), name: 'Vanguard VWUSX', ticker: 'VWUSX', }
    )).id;

    sys.investmentsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootAssetId, type: A.AccountType.ASSET, pricedItemId: baseCurrencyPricedItemId, name: 'Investsments', },
        initialYMDDate
    )).id;

    sys.brokerageAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage A', },
        initialYMDDate
    )).id;

    sys.aaplBrokerageA = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
        initialYMDDate
    )).id;

    sys.msftBrokerageA = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.msftPricedItemId, name: 'MSFT', },
        initialYMDDate
    )).id;

    sys.mmmBrokerageA = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageAId, type: A.AccountType.SECURITY, pricedItemId: sys.mmmPricedItemId, name: 'MMM', },
        initialYMDDate
    )).id;


    sys.brokerageBId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Brokerage B', },
        initialYMDDate
    )).id;

    sys.ibmBrokerageB = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.SECURITY, pricedItemId: sys.ibmPricedItemId, name: 'IBM', },
        initialYMDDate
    )).id;

    sys.vwusxBrokerageB = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.brokerageBId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.vwusxPricedItemId, name: 'Vanguard VWUSX', },
        initialYMDDate
    )).id;


    sys.iraId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.investmentsId, type: A.AccountType.BROKERAGE, pricedItemId: baseCurrencyPricedItemId, name: 'IRA', },
        initialYMDDate
    )).id;

    sys.aaplIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.SECURITY, pricedItemId: sys.aaplPricedItemId, name: 'AAPL', },
        initialYMDDate
    )).id;

    sys.tibexIRAId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.iraId, type: A.AccountType.MUTUAL_FUND, pricedItemId: sys.tibexPricedItemId, name: 'TIAA TIBEX', },
        initialYMDDate
    )).id;


    
    //
    // Liabilities
    //
    sys.creditCardsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Credit Cards', },
        initialYMDDate
    )).id;

    sys.amexCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'American Express', },
        initialYMDDate
    )).id;

    sys.discoverreditCardId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.creditCardsId, type: A.AccountType.CREDIT_CARD, pricedItemId: baseCurrencyPricedItemId, name: 'Discover Card', },
        initialYMDDate
    )).id;


    sys.loansId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootLiabilityId, type: A.AccountType.LIABILITY, pricedItemId: baseCurrencyPricedItemId, name: 'Loans', },
        initialYMDDate
    )).id;

    sys.autoLoanId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.LOAN, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Loan', },
        initialYMDDate
    )).id;

    sys.mortgageId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.loansId, type: A.AccountType.MORTGAGE, pricedItemId: baseCurrencyPricedItemId, name: 'Mortgage', },
        initialYMDDate
    )).id;


    //
    // Income
    //
    sys.bonusId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Bonus', },
        initialYMDDate
    )).id;

    sys.dividendsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Dividend Income', },
        initialYMDDate
    )).id;

    sys.giftsReceivedId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Gifts Received', },
        initialYMDDate
    )).id;

    sys.interestId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Interest Income', },
        initialYMDDate
    )).id;

    sys.otherIncomeId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Other Income', },
        initialYMDDate
    )).id;
    
    sys.salaryId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootIncomeId, type: A.AccountType.INCOME, pricedItemId: baseCurrencyPricedItemId, name: 'Salary', },
        initialYMDDate
    )).id;
    
    
    //
    // Expenses
    //
    sys.autoId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto', },
        initialYMDDate
    )).id;
    sys.autoInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Auto Insurance', },
        initialYMDDate
    )).id;
    sys.autoFuelId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
        initialYMDDate
    )).id;
    sys.autoMaintenanceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.autoId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Maintenance', },
        initialYMDDate
    )).id;


    sys.commissionsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Commissions', },
        initialYMDDate
    )).id;

    sys.feesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Fees', },
        initialYMDDate
    )).id;
    
    sys.charityId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Charity', },
        initialYMDDate
    )).id;

    sys.groceriesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Groceries', },
        initialYMDDate
    )).id;

    sys.entertainmentId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Entertainment', },
        initialYMDDate
    )).id;

    sys.householdId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Household', },
        initialYMDDate
    )).id;

    sys.insurancePremiumsId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Insurance', },
        initialYMDDate
    )).id;
    sys.healthInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Health Insurance', },
        initialYMDDate
    )).id;
    sys.dentalInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Dental Insurance', },
        initialYMDDate
    )).id;
    sys.lifeInsuranceId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.insurancePremiumsId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Life Insurance', },
        initialYMDDate
    )).id;

    sys.medicalId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medical', },
        initialYMDDate
    )).id;

    sys.miscId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Miscellaneous', },
        initialYMDDate
    )).id;


    sys.taxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Taxes', },
        initialYMDDate
    )).id;
    sys.federalTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Federal Taxes', },
        initialYMDDate
    )).id;
    sys.stateTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'State Taxes', },
        initialYMDDate
    )).id;
    sys.medicareTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Medicare Taxes', },
        initialYMDDate
    )).id;
    sys.socSecTaxesId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.taxesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Social Security Taxes', },
        initialYMDDate
    )).id;
    

    sys.utilitiesId = (await accountManager.asyncAddAccount(
        { parentAccountId: rootExpenseId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Utilities', },
        initialYMDDate
    )).id;
    sys.electricityId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Power', },
        initialYMDDate
    )).id;
    sys.gasId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Gas', },
        initialYMDDate
    )).id;
    sys.phoneId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Phone', },
        initialYMDDate
    )).id;
    sys.internetId = (await accountManager.asyncAddAccount(
        { parentAccountId: sys.utilitiesId, type: A.AccountType.EXPENSE, pricedItemId: baseCurrencyPricedItemId, name: 'Internet', },
        initialYMDDate
    )).id;


    return sys;
}
