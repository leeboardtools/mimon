import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { YMDDate } from '../util/YMDDate';
import { PricedItemType } from './PricedItems';
import { getLots, getLotDataItems } from './Lots';


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


/**
 * @typedef {object} AccountStateDataItem
 * @property {string}   ymdDate The date this state represented as a {@link YMDDate} string.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition.
 * @property {LotDataItem[]}    [lots]    For accounts that use lots, the array of the lot data items.
 */

/**
 * @typedef {object} AccountState
 * @property {YMDDate}  ymdDate The date this state represents.
 * @property {number}   quantityBaseValue   The base value of the quantity of the state. The applicable 
 * quantity definition is found in the account's priced item's quantityDefinition.
 * @property {Lot[]}    [lots]  For accounts that use lots, the array of the lots.
 */

/**
 * Retrieves an {@link AccountState} representation of a {@link AccountStateDataItem} object.
 * @param {(AccountStateDataItem|AccountState)} accountStateDataItem 
 * @returns {AccountState}
 */
export function getAccountState(accountStateDataItem) {
    if (accountStateDataItem) {
        if (typeof accountStateDataItem.ymdDate === 'string') {
            return {
                ymdDate: new YMDDate(accountStateDataItem.ymdDate),
                quantityBaseValue: accountStateDataItem.quantityBaseValue,
                lots: getLots(accountStateDataItem.lots),
            };
        }
    }
    return accountStateDataItem;
}

/**
 * Retrieves an {@link AccountStateDataItem} representation of a {@link AccountState} object.
 * @param {(AccountState|AccountStateDataItem)} accountState 
 */
export function getAccountStateDataItem(accountState) {
    if (accountState) {
        if (typeof accountState.ymdDate !== 'string') {
            return {
                ymdDate: accountState.ymdDate.toString(),
                quantityBaseValue: accountState.quantityBaseValue,
                lots: getLotDataItems(accountState.lots),
            };
        }
    }
    return accountState;
}


/**
 * @typedef {object} AccountDataItem
 * @property {number}   id  The account's id.
 * @property {string}   type    The name property of one of {@link AccountType}.
 * @property {number}   pricedItemId   The local id of the priced item the account represents.
 * @property {string}   [name]  The name of the account.
 * @property {string}   [description]   The description of the account.
 * @property {AccountStateDataItem} accountState The current account state
 */

/**
 * @typedef {object} AccountData
 * @property {number}   id  The account's id.
 * @property {AccountType}  type    The account's type.
 * @property {number}   pricedItemId   The local id of the priced item the account represents.
 * @property {string}   [name]  The name of the account.
 * @property {string}   [description]   The description of the account.
 * @property {AccountState} accountState The current account state
 */

/**
 * Retrieves an {@link Account} representation of an {@link AccountDataItem}.
 * @param {(AccountDataItem|Account)} accountDataItem 
 * @returns {Account}
 */
export function getAccount(accountDataItem) {
    if (accountDataItem) {
        if (typeof accountDataItem.accountState.ymdDate === 'string') {
            const account = Object.assign({}, accountDataItem);
            account.type = AccountType[accountDataItem.type];
            account.accountState = getAccountState(accountDataItem.accountState);
            return account;
        }
    }
    return accountDataItem;
}

/**
 * Retrieves an {@link AccountDataItem} representation of an {@link Account}.
 * @param {(Account|AccountDataItem)} account 
 */
export function getAccountDataItem(account) {
    if (account) {
        if (typeof account.accountState.ymdDate !== 'string') {
            const accountDataItem = Object.assign({}, account);
            accountDataItem.type = account.type.name;
            accountDataItem.accountState = getAccountStateDataItem(account.accountState);
            return accountDataItem;
        }
    }
    return account;
}


/**
 * Manages {@link Account}s.
 */
export class AccountManager {

    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
        
        this._idGenerator = new NumericIdGenerator();

        this._accountsById = new Map();

        const pricedItemManager = accountingSystem.getPricedItemManager();
        const currencyPricedItemId = pricedItemManager.getCurrencyPricedItemId(accountingSystem.getBaseCurrency());

        this._rootAssetAccountId = this._idGenerator.generateId();
        this._rootAssetAccount = this._addAccount(this._rootAssetAccountId, {
            type: AccountType.ASSET,
            pricedItemId: currencyPricedItemId, 
            name: userMsg('Account-Root_Assets_name'),
            description: userMsg('Account-Root_Assets_desc'),
        });

        this._rootLiabilityAccountId = this._idGenerator.generateId();
        this._rootLiabilityAccount = this._addAccount(this._rootLiabilityAccountId, {
            type: AccountType.LIABILITY,
            pricedItemId: currencyPricedItemId, 
            name: userMsg('Account-Root_Liabilities_name'),
            description: userMsg('Account-Root_Liabilities_desc'),
        });

        this._rootIncomeAccountId = this._idGenerator.generateId();
        this._rootIncomeAccount = this._addAccount(this._rootIncomeAccountId, {
            type: AccountType.INCOME,
            pricedItemId: currencyPricedItemId, 
            name: userMsg('Account-Root_Income_name'),
            description: userMsg('Account-Root_Income_desc'),
        });

        this._rootExpenseAccountId = this._idGenerator.generateId();
        this._rootExpenseAccount = this._addAccount(this._rootExpenseAccountId, {
            type: AccountType.EXPENSE,
            pricedItemId: currencyPricedItemId, 
            name: userMsg('Account-Root_Expense_name'),
            description: userMsg('Account-Root_Expense_desc'),
        });

        this._rootEquityAccountId = this._idGenerator.generateId();
        this._rootEquityAccount = this._addAccount(this._rootEquityAccountId, {
            type: AccountType.EQUITY,
            pricedItemId: currencyPricedItemId, 
            name: userMsg('Account-Root_Equity_name'),
            description: userMsg('Account-Root_Equity_desc'),
        });

        this._openingBalancesAccountId = this._idGenerator.generateId();
        this._openingBalancesAccount = this._addAccount(this._openingBalancesAccountId, 
            {
                type: AccountType.OPENING_BALANCE,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Opening_Balances_name'),
                description: userMsg('Account-Opening_Balances_desc'),
            },
            this._rootEquityAccount);


    }

    getAccountingSystem() { return this._accountingSystem; }


    getRootAssetAccountId() { return this._rootAssetAccountId; }
    getRootAssetAccount() { return Object.assign({}, this._rootAssetAccount); }

    getRootLiabilityAccountId() { return this._rootLiabilityAccountId; }
    getRootLiabilityAccount() { return Object.assign({}, this._rootLiabilityAccount); }

    getRootIncomeAccountId() { return this._rootIncomeAccountId; }
    getRootIncomeAccount() { return Object.assign({}, this._rootIncomeAccount); }

    getRootExpenseAccountId() { return this._rootExpenseAccountId; }
    getRootExpenseAccount() { return Object.assign({}, this._rootExpenseAccount); }

    getRootEquityAccountId() { return this._rootEquityAccountId; }
    getRootEquityAccount() { return Object.assign({}, this._rootEquityAccount); }

    getOpeningBalancesAccountId() { return this._openingBalancesAccountId; }
    getOpeningBalancesAccount() { return Object.assign({}, this._openingBalancesAccount); }


    getAccount(ref) {
        let account;
        if (typeof ref === 'number') {
            account = this._accountsById.get(ref);
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
        account.childAccountIds = account.childAccountIds || [];

        this._accountsById.set(id, account);

        if (parentAccount) {
            parentAccount.childAccountIds.push(id);
        }

        return account;
    }


    addAccount(parentAccountId, account) {

    }

    removeAccount(accountId) {

    }

    modifyAccount(accountId, accountUpdates) {

    }
}
