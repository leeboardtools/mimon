import { userMsg } from '../util/UserMessages';
import { IdGenerator } from '../util/Ids';
import { PricedItemType } from './PricedItems';


/**
 * @typedef {object} AccountCategoryDef
 * @property {string}   name    The identifying name of the account class.
 * @property {string}   description The user description of the account class.
 * @property {number}   creditSign  Either -1 or 1, a credit value is multiplied by this before the value is added to
 * @property {boolean}  isAle   <code>true</code> if the category is an asset, liability, or equity.
 * the account balance.
 */

/**
 * The classes of accounts.
 * @readonly
 * @enum {AccountCategoryDef}
 * @property {AccountCategoryDef} ASSET    An asset account.
 * @property {AccountCategoryDef} LIABILITY    A liability account.
 * @property {AccountCategoryDef} INCOME   An income account.
 * @property {AccountCategoryDef} EXPENSE  An expense account.
 * @property {AccountCategoryDef} EQUITY   An equity account.
 */
export const AccountCategory = {
    ASSET: { name: 'ASSET', creditSign: -1, isALE: true, },
    LIABILITY: { name: 'LIABILITY', creditSign: 1, isALE: true, },
    INCOME: { name: 'INCOME', creditSign: 1, isALE: false, },
    EXPENSE: { name: 'EXPENSE', creditSign: -1, isALE: false, },
    EQUITY: { name: 'EQUITY', creditSign: 1, isALE: true, },
};

/**
 * @param {(string|AccountCategoryDef)} ref 
 * @returns {AccountCategoryDef}    Returns the {@link AccountCategoryDef} represented by ref.
 */
export function accountCategory(ref) {
    return (typeof ref === 'string') ? AccountCategory[ref] : ref;
}


/**
 * @typedef {object} AccountTypeDef
 * @property {string}   name    The identifying name of the account type.
 * @property {AccountCategory} category   The account category to which the type belongs.
 * @property {string}   description The user description of the account class.
 * @property {boolean}  [hasLots=false] If <code>true</code> the account uses {@link Lot}s.
 * @property {boolean}  [isSingleton=false] If <code>true</code> only one instance of this type should be created.
 * @property {boolean}  [noDelete=false]    If <code>true</code> accounts of this type are not removable.
 * @property {AccountTypeDef[]} allowedChildTypes   Array containing the account types allowed for child accounts.
 * @property {PricedItemType}   pricedItemType  The type of priced items this supports.
 */

/**
 * The account types.
 * @readonly
 * @enum {AccountTypeDef} AccountType
 * @property {AccountTypeDef}   ASSET   All purpose asset account.
 * @property {AccountTypeDef}   BANK    For accounts that hold money, such as checking and savings accounts.
 * @property {AccountTypeDef}   BROKERAGE   Accounts that typically contain securities.
 * @property {AccountTypeDef}   CASH    For straight cash.
 * @property {AccountTypeDef}   SECURITY    For a specific security.
 * @property {AccountTypeDef}   MUTUAL_FUND For a mutual fund account.
 * @property {AccountTypeDef}   REAL_ESTATE For a specific piece of real estate.
 * @property {AccountTypeDef}   PROPERTY    For specific piece of property.
 *
 * @property {AccountTypeDef}   LAIBILITY   All purpose liability account.
 * @property {AccountTypeDef}   CREDIT_CARD For credit cards.
 * @property {AccountTypeDef}   LOAN    For a basic loan such as an auto loan.
 * @property {AccountTypeDef}   MORTGAGE    For mortgages, which typically include escrow payments.
 *
 * @property {AccountTypeDef}   INCOME  Straightforward income account.
 * @property {AccountTypeDef}   EXPENSE Straightforward expense account.
 *
 * @property {AccountTypeDef}   EQUITY  All purpose equity account.
 * @property {AccountTypeDef}   OPENING_BALANCE For opening balances.
 *
 */
export const AccountType = {
    ASSET: { name: 'ASSET', category: AccountCategory.ASSET, pricedItemType: PricedItemType.CURRENCY, },
    BANK: { name: 'BANK', category: AccountCategory.ASSET, pricedItemType: PricedItemType.CURRENCY, hasChecks: true, },
    BROKERAGE: { name: 'BROKERAGE', category: AccountCategory.ASSET, pricedItemType: PricedItemType.CURRENCY, hasChecks: true, },
    CASH: { name: 'CASH', category: AccountCategory.ASSET, pricedItemType: PricedItemType.CURRENCY, },
    SECURITY: { name: 'SECURITY', category: AccountCategory.ASSET, pricedItemType: PricedItemType.SECURITY, hasLots: true, },
    MUTUAL_FUND: { name: 'MUTUAL_FUND', category: AccountCategory.ASSET, pricedItemType: PricedItemType.MUTUAL_FUND, hasLots: true, hasChecks: true, },
    REAL_ESTATE: { name: 'REAL_ESTATE', category: AccountCategory.ASSET, pricedItemType: PricedItemType.REAL_ESTATE, hasLots: true, },
    PROPERTY: { name: 'PROPERTY', category: AccountCategory.ASSET, pricedItemType: PricedItemType.PROPERTY, hasLots: true, },

    LIABILITY: { name: 'LIABILITY', category: AccountCategory.LIABILITY, pricedItemType: PricedItemType.CURRENCY, },
    CREDIT_CARD: { name: 'CREDIT_CARD', category: AccountCategory.LIABILITY, pricedItemType: PricedItemType.CURRENCY, hasChecks: true, },
    LOAN: { name: 'LOAN', category: AccountCategory.LIABILITY, pricedItemType: PricedItemType.CURRENCY, },
    MORTGAGE: { name: 'MORTGAGE', category: AccountCategory.LIABILITY, pricedItemType: PricedItemType.CURRENCY, },

    INCOME: { name: 'INCOME', category: AccountCategory.INCOME, pricedItemType: PricedItemType.CURRENCY, },
    EXPENSE: { name: 'EXPENSE', category: AccountCategory.EXPENSE, pricedItemType: PricedItemType.CURRENCY, },

    EQUITY: { name: 'EQUITY', category: AccountCategory.EQUITY, pricedItemType: PricedItemType.CURRENCY, },
    OPENING_BALANCE: { name: 'OPENING_BALANCE', category: AccountCategory.EQUITY, pricedItemType: PricedItemType.CURRENCY, isSingleton: true, noDelete: true, },
};


/**
 * @param {(string|AccountTypeDef)} ref 
 * @returns {AccountTypeDef}    Returns the {@link AccountTypeDef} represented by ref.
 */
export function accountType(ref) {
    return (typeof ref === 'string') ? AccountType[ref] : ref;
}


AccountType.ASSET.allowedChildTypes = [
    AccountType.ASSET,
    AccountType.BANK,
    AccountType.BROKERAGE,
    AccountType.CASH,
    AccountType.MUTUAL_FUND,
    AccountType.PROPERTY,
    AccountType.SECURITY,
];

AccountType.BANK.allowedChildTypes = [];

AccountType.BROKERAGE.allowedChildTypes = [
    AccountType.SECURITY,
];

AccountType.CASH.allowedChildTypes = [];

AccountType.MUTUAL_FUND.allowedChildTypes = [
    AccountType.SECURITY,
];

AccountType.PROPERTY.allowedChildTypes = [];

AccountType.SECURITY.allowedChildTypes = [];

AccountType.LIABILITY.allowedChildTypes = [
    AccountType.LIABILITY,
    AccountType.CREDIT_CARD,
    AccountType.LOAN,
    AccountType.MORTGAGE,
];

AccountType.CREDIT_CARD.allowedChildTypes = [];

AccountType.LOAN.allowedChildTypes = [];

AccountType.MORTGAGE.allowedChildTypes = [];

AccountType.INCOME.allowedChildTypes = [
    AccountType.INCOME,
];

AccountType.EXPENSE.allowedChildTypes = [
    AccountType.EXPENSE,
];

AccountType.EQUITY.allowedChildTypes = [
    AccountType.EQUITY,
    AccountType.OPENING_BALANCE,
];

AccountType.OPENING_BALANCE.allowedChildTypes = [];


export function loadAccountsUserMessages() {
    for (const accountClass of Object.values(AccountCategory)) {
        accountClass.description = userMsg('AccountCategory-' + accountClass.name);
    }
    for (const type of Object.values(AccountType)) {
        type.description = userMsg('AccountType-' + type.name);
    }
}




export class AccountManager {

    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
        
        this._idGenerator = new IdGenerator();

        this._accountsByLocalId = new Map();
        this._accountsByUUId = new Map();

        const pricedItemManager = accountingSystem.getPricedItemManager();
        const currencyPricedItemLocalId = pricedItemManager.getCurrencyPricedItemLocalId(accountingSystem.getBaseCurrency());

        this._rootAssetAccountId = this._idGenerator.newIdOptions();
        this._rootAssetAccount = this._addAccount(this._rootAssetAccountId, {
            type: AccountType.ASSET,
            pricedItemLocalId: currencyPricedItemLocalId, 
            name: userMsg('Account-Root_Assets_name'),
            description: userMsg('Account-Root_Assets_desc'),
        });

        this._rootLiabilityAccountId = this._idGenerator.newIdOptions();
        this._rootLiabilityAccount = this._addAccount(this._rootLiabilityAccountId, {
            type: AccountType.LIABILITY,
            pricedItemLocalId: currencyPricedItemLocalId, 
            name: userMsg('Account-Root_Liabilities_name'),
            description: userMsg('Account-Root_Liabilities_desc'),
        });

        this._rootIncomeAccountId = this._idGenerator.newIdOptions();
        this._rootIncomeAccount = this._addAccount(this._rootIncomeAccountId, {
            type: AccountType.INCOME,
            pricedItemLocalId: currencyPricedItemLocalId, 
            name: userMsg('Account-Root_Income_name'),
            description: userMsg('Account-Root_Income_desc'),
        });

        this._rootExpenseAccountId = this._idGenerator.newIdOptions();
        this._rootExpenseAccount = this._addAccount(this._rootExpenseAccountId, {
            type: AccountType.EXPENSE,
            pricedItemLocalId: currencyPricedItemLocalId, 
            name: userMsg('Account-Root_Expense_name'),
            description: userMsg('Account-Root_Expense_desc'),
        });

        this._rootEquityAccountId = this._idGenerator.newIdOptions();
        this._rootEquityAccount = this._addAccount(this._rootEquityAccountId, {
            type: AccountType.EQUITY,
            pricedItemLocalId: currencyPricedItemLocalId, 
            name: userMsg('Account-Root_Equity_name'),
            description: userMsg('Account-Root_Equity_desc'),
        });

        this._openingBalancesAccountId = this._idGenerator.newIdOptions();
        this._openingBalancesAccount = this._addAccount(this._openingBalancesAccountId, 
            {
                type: AccountType.OPENING_BALANCE,
                pricedItemLocalId: currencyPricedItemLocalId, 
                name: userMsg('Account-Opening_Balances_name'),
                description: userMsg('Account-Opening_Balances_desc'),
            },
            this._rootEquityAccount);


    }

    getAccountingSystem() { return this._accountingSystem; }


    getRootAssetAccountLocalId() { return this._rootAssetAccountId.localId; }
    getRootAssetAccount() { return Object.assign({}, this._rootAssetAccount); }

    getRootLiabilityAccountLocalId() { return this._rootLiabilityAccountId.localId; }
    getRootLiabilityAccount() { return Object.assign({}, this._rootLiabilityAccount); }

    getRootIncomeAccountLocalId() { return this._rootIncomeAccountId.localId; }
    getRootIncomeAccount() { return Object.assign({}, this._rootIncomeAccount); }

    getRootExpenseAccountLocalId() { return this._rootExpenseAccountId.localId; }
    getRootExpenseAccount() { return Object.assign({}, this._rootExpenseAccount); }

    getRootEquityAccountLocalId() { return this._rootEquityAccountId.localId; }
    getRootEquityAccount() { return Object.assign({}, this._rootEquityAccount); }

    getOpeningBalancesAccountLocalId() { return this._openingBalancesAccountId.localId; }
    getOpeningBalancesAccount() { return Object.assign({}, this._openingBalancesAccount); }


    getAccount(ref) {
        let account;
        if (typeof ref === 'number') {
            account = this._accountsByLocalId.get(ref);
        }
        else {
            if (ref.uuid) {
                ref = ref.uuid;
            }
            account = this._accountsByUUId.get(ref);
        }

        return (account) ? Object.assign({}, account) : undefined;
    }



    _addAccount(id, account, parentAccount) {
        account = Object.assign({}, account, { id: id });
        if (typeof account.type !== 'string') {
            account.type = account.type.name;
        }
        account.childAccountLocalIds = account.childAccountLocalIds || [];

        this._accountsByLocalId.set(id.localId, account);
        this._accountsByUUId.set(id.uuid, account);

        if (parentAccount) {
            parentAccount.childAccountLocalIds.push(id.localId);
        }

        return account;
    }


    addAccount(parentAccountLocalId, account) {

    }

    removeAccount(accountLocalId) {

    }

    modifyAccount(accountLocalId, accountUpdates) {

    }
}
