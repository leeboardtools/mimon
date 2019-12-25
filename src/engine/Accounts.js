import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getYMDDate, getYMDDateString } from '../util/YMDDate';
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
export function getAccountType(ref) {
    return (typeof ref === 'string') ? AccountType[ref] : ref;
}

export function getAccountTypeName(type) {
    return ((type === undefined) || (typeof type === 'string')) ? type : type.name;
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
        const ymdDate = getYMDDate(accountStateDataItem.ymdDate);
        const lots = getLots(accountStateDataItem.lots);
        if ((ymdDate !== accountStateDataItem.ymdDate)
         || (lots !== accountStateDataItem.lots)) {
            return {
                ymdDate: ymdDate,
                quantityBaseValue: accountStateDataItem.quantityBaseValue,
                lots: lots,
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
        const ymdDateString = getYMDDateString(accountState.ymdDate);
        const lotDataItems = getLotDataItems(accountState.lots);
        if ((ymdDateString !== accountState.ymdDate)
         || (lotDataItems !== accountState.lots)) {
            return {
                ymdDate: ymdDateString,
                quantityBaseValue: accountState.quantityBaseValue,
                lots: lotDataItems,
            };
        }
    }
    return accountState;
}


/**
 * @typedef {object} AccountDataItem
 * @property {number}   id  The account's id.
 * @property {string}   [refId] Optional user reference id.
 * @property {string}   type    The name property of one of {@link AccountType}.
 * @property {number}   pricedItemId   The local id of the priced item the account represents.
 * @property {string}   [name]  The name of the account.
 * @property {string}   [description]   The description of the account.
 * @property {AccountStateDataItem} accountState The current account state
 */

/**
 * @typedef {object} AccountData
 * @property {number}   id  The account's id.
 * @property {string}   [refId] Optional user reference id.
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
        const type = getAccountType(accountDataItem.type);
        const accountState = getAccountState(accountDataItem.accountState);
        if ((type !== accountDataItem.type)
         || (accountState !== accountDataItem.accountState)) {
            const account = Object.assign({}, accountDataItem);
            account.type = type;
            account.accountState = accountState;
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
        const typeName = getAccountTypeName(account.type);
        const accountStateDataItem = getAccountStateDataItem(account.accountState);
        if ((typeName !== account.type)
         || (accountStateDataItem !== account.accountState)) {
            const accountDataItem = Object.assign({}, account);
            accountDataItem.type = typeName;
            accountDataItem.accountState = accountStateDataItem;
            return accountDataItem;
        }
    }
    return account;
}


/**
 * Manages {@link Account}s.
 */
export class AccountManager {

    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator);

        this._accountsById = new Map();
        this._accountsByRefId = new Map();

        const accounts = this._handler.getAccounts();
        accounts.forEach((account) => {
            this._accountsById.set(account.id, account);

            if (account.refId) {
                this._accountsByRefId.set(account.refId, account);
            }
        });

        this._rootAssetAccountId = options.rootAssetAccountId;
        this._rootAssetAccount = this._accountsById.get(this._rootAssetAccountId);

        this._rootLiabilityAccountId = options.rootLiabilityAccountId;
        this._rootLiabilityAccount = this._accountsById.get(this._rootLiabilityAccountId);

        this._rootIncomeAccountId = options.rootIncomeAccountId;
        this._rootIncomeAccount = this._accountsById.get(this._rootIncomeAccountId);

        this._rootExpenseAccountId = options.rootExpenseAccountId;
        this._rootExpenseAccount = this._accountsById.get(this._rootExpenseAccountId);

        this._rootEquityAccountId = options.rootEquityAccountId;
        this._rootEquityAccountId = this._accountsById.get(this._rootEquityAccountId);

        this._openingBalancesAccountId = options.openingBalanceAccountId;
        this._openingBalancesAccount = this._accountsById.get(this._openingBalancesAccountId);
    }

    async asyncSetupForUse() {
        const accountingSystem = this._accountingSystem;
        const pricedItemManager = accountingSystem.getPricedItemManager();
        const currencyPricedItemId = pricedItemManager.getCurrencyPricedItemId(accountingSystem.getBaseCurrency());

        if (!this._rootAssetAccount) {
            this._rootAssetAccountId = this._idGenerator.generateId();
            this._rootAssetAccount = await this._asyncAddAccount(this._rootAssetAccountId, {
                type: AccountType.ASSET,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Assets_name'),
                description: userMsg('Account-Root_Assets_desc'),
            });
        }
        
        if (!this._rootLiabilityAccount) {
            this._rootLiabilityAccountId = this._idGenerator.generateId();
            this._rootLiabilityAccount = await this._asyncAddAccount(this._rootLiabilityAccountId, {
                type: AccountType.LIABILITY,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Liabilities_name'),
                description: userMsg('Account-Root_Liabilities_desc'),
            });
        }

        if (!this._rootIncomeAccount) {
            this._rootIncomeAccountId = this._idGenerator.generateId();
            this._rootIncomeAccount = await this._asyncAddAccount(this._rootIncomeAccountId, {
                type: AccountType.INCOME,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Income_name'),
                description: userMsg('Account-Root_Income_desc'),
            });
        }

        if (!this._rootExpenseAccount) {
            this._rootExpenseAccountId = this._idGenerator.generateId();
            this._rootExpenseAccount = await this._asyncAddAccount(this._rootExpenseAccountId, {
                type: AccountType.EXPENSE,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Expense_name'),
                description: userMsg('Account-Root_Expense_desc'),
            });
        }

        if (!this._rootEquityAccount) {
            this._rootEquityAccountId = this._idGenerator.generateId();
            this._rootEquityAccount = await this._asyncAddAccount(this._rootEquityAccountId, {
                type: AccountType.EQUITY,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Equity_name'),
                description: userMsg('Account-Root_Equity_desc'),
            });
        }

        if (!this._openingBalancesAccount) {
            this._openingBalancesAccountId = this._idGenerator.generateId();
            this._openingBalancesAccount = await this._asyncAddAccount(this._openingBalancesAccountId, 
                {
                    type: AccountType.OPENING_BALANCE,
                    pricedItemId: currencyPricedItemId, 
                    name: userMsg('Account-Opening_Balances_name'),
                    description: userMsg('Account-Opening_Balances_desc'),
                },
                this._rootEquityAccount);
        }
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


    /**
     * Retrieves the account with a given id.
     * @param {number} id
     * @returns {(AccountDataItem|undefined)}
     */
    getAccount(id) {
        const account = this._accountsById.get(id);
        return (account) ? Object.assign({}, account) : undefined;
    }


    /**
     * Retrieves the account with a given refId.
     * @param {string} refId
     * @returns {(AccountDataItem|undefined)}
     */
    getAccountWithRefId(refId) {
        const account = this._accountsByRefId.get(refId);
        return (account) ? Object.assign({}, account) : undefined;
    }


    async _asyncAddAccount(id, account, parentAccount) {
        account = Object.assign({}, account, { id: id });
        if (typeof account.type !== 'string') {
            account.type = account.type.name;
        }
        account.childAccountIds = account.childAccountIds || [];

        await this._handler.asyncAddAccount(account);

        this._accountsById.set(id, account);
        if (parentAccount) {
            parentAccount.childAccountIds.push(id);
        }

        return account;
    }


    async asyncAddAccount(parentAccountId, account, validateOnly) {

    }

    async asyncRemoveAccount(accountId, validateOnly) {

    }

    async asyncModifyAccount(account, validateOnly) {

    }
}


/**
 * @interface
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link AccountManager}.
 */
export class AccountsHandler {
    /**
     * Retrieves an array containing all the priced items. The priced items are presumed
     * to already be loaded when the {@link AccountManager} is constructed.
     * @returns {AccountDataItem[]}
     */
    getAccounts() {
        throw Error('AccountsHandler.getAccounts() abstract method!');
    }

    /**
     * Adds a new priced item.
     * @param {AccountDataItem} pricedItemDataItem 
     */
    async asyncAddAccount(pricedItemDataItem) {
        throw Error('AccountsHandler.addpricedItem() abstract method!');
    }

    /**
     * Modifies an existing priced item.
     * @param {AccountDataItem} pricedItemDataItem 
     */
    async asyncModifyAccount(pricedItemDataItem) {
        throw Error('AccountsHandler.modifyAccount() abstract method!');
    }

    /**
     * Removes an existing priced item.
     * @param {number} id 
     */
    async asyncRemoveAccount(id) {
        throw Error('AccountsHandler.removeAccount() abstract method!');
    }
}

/**
 * Simple in-memory implementation of {@link AccountsHandler}
 */
export class InMemoryAccountsHandler extends AccountsHandler {
    constructor(accounts) {
        super();

        this._accountsById = new Map();

        if (accounts) {
            accounts.forEach((pricedItem) => {
                this._accountsById.set(pricedItem.id, pricedItem);
            });
        }
    }

    getAccounts() {
        return Array.from(this._accountsById.values());
    }

    async asyncAddAccount(pricedItemDataItem) {
        this._accountsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncModifyAccount(pricedItemDataItem) {
        this._accountsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncRemoveAccount(id) {
        this._accountsById.delete(id);
    }
}
