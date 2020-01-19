import { EventEmitter } from 'events';
import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getYMDDate, getYMDDateString } from '../util/YMDDate';
import { PricedItemType, getPricedItemType } from './PricedItems';
import { getFullSplitDataItem } from './Transactions';
import { getLots, getLotDataItems, getLotString } from './Lots';
import deepEqual from 'deep-equal';
import { SortedArray } from '../util/SortedArray';


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
    OPENING_BALANCE: { name: 'OPENING_BALANCE', category: AccountCategory.EQUITY, pricedItemType: PricedItemType.CURRENCY, isSingleton: true, },
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
    AccountType.REAL_ESTATE,
    AccountType.PROPERTY,
    AccountType.SECURITY,
];

AccountType.BANK.allowedChildTypes = [];

AccountType.BROKERAGE.allowedChildTypes = [
    AccountType.SECURITY,
    AccountType.MUTUAL_FUND,
    AccountType.PROPERTY,
];

AccountType.CASH.allowedChildTypes = [];

AccountType.MUTUAL_FUND.allowedChildTypes = [
    AccountType.SECURITY,
];

AccountType.REAL_ESTATE.allowedChildTypes = [];

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
 * Retrieves an {@link AccountState} representation of a {@link AccountStateDataItem} object, avoids copying if the arg
 * is already an {@link AccountState}
 * @param {(AccountStateDataItem|AccountState)} accountStateDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {AccountState}
 */
export function getAccountState(accountStateDataItem, alwaysCopy) {
    if (accountStateDataItem) {
        const ymdDate = getYMDDate(accountStateDataItem.ymdDate);
        const lots = getLots(accountStateDataItem.lots, alwaysCopy);
        if (alwaysCopy 
         || (ymdDate !== accountStateDataItem.ymdDate)
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
 * Retrieves an {@link AccountStateDataItem} representation of a {@link AccountState} object, avoids copying if the arg
 * is already an {@link AccountStateDataItem}
 * @param {(AccountState|AccountStateDataItem)} accountState 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {AccountStateDataItem}
 */
export function getAccountStateDataItem(accountState, alwaysCopy) {
    if (accountState) {
        const ymdDateString = getYMDDateString(accountState.ymdDate);
        const lotDataItems = getLotDataItems(accountState.lots, alwaysCopy);
        if (alwaysCopy 
         || (ymdDateString !== accountState.ymdDate)
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
 * Retrieves an {@link AccountStateDataItem} that has any missing required properties filled in with
 * default values.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {boolean} hasLots 
 * @returns {AccountStateDataItem}
 */
export function getFullAccountStateDataItem(accountState, hasLots) {
    accountState = getAccountStateDataItem(accountState, true);
    if (accountState) {
        accountState.quantityBaseValue = accountState.quantityBaseValue || 0;
        if (hasLots && !accountState.lots) {
            accountState.lots = [];
        }
    }

    return accountState;
}


/**
 * Retrieves an {@link AccountState} that has any missing required properties filled in with
 * default values.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {boolean} hasLots 
 * @returns {AccountState}
 */
export function getFullAccountState(accountState, hasLots) {
    accountState = getAccountState(accountState, true);
    if (accountState) {
        accountState.quantityBaseValue = accountState.quantityBaseValue || 0;
        if (hasLots && !accountState.lots) {
            accountState.lots = [];
        }
    }

    return accountState;
}



function adjustAccountStateDataItemForSplit(accountState, split, ymdDate, sign) {
    const accountStateDataItem = getFullAccountStateDataItem(accountState, split.lotChanges && split.lotChanges.length);
    split = getFullSplitDataItem(split);

    accountStateDataItem.ymdDate = getYMDDateString(ymdDate) || accountStateDataItem.ymdDate;
    accountStateDataItem.quantityBaseValue += sign * split.quantityBaseValue;

    if (split.lotChanges) {
        const { lots } = accountStateDataItem;
        const sortedLots = new SortedArray((a, b) => a[0].localeCompare(b[0]), { duplicates: 'allow' });
        lots.forEach((lot) => {
            sortedLots.add([getLotString(lot), lot]);
        });

        split.lotChanges.forEach(([newLot, oldLot]) => {
            if (sign < 0) {
                [ newLot, oldLot ] = [ oldLot, newLot ];
            }

            if (oldLot) {
                // Look for the old lot.
                const lotString = getLotString(oldLot);
                const index = sortedLots.indexOf([lotString, oldLot]);
                if (index < 0) {
                    throw userError('AccountState-add_split_lot_not_found', lotString);
                }
                sortedLots.deleteIndex(index);
            }
            if (newLot) {
                sortedLots.add([getLotString(newLot), newLot]);
            }
        });

        lots.length = 0;
        sortedLots.forEach(([, lot]) => {
            lots.push(lot);
        });
    }

    return accountStateDataItem;
}


/**
 * Returns a new account state data item that reflects the application of a {@link Split}
 * to the account state. The only validation performed is a check for lots being modified
 * or removed being in the account state.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {Split|SplitDataItem} split 
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function addSplitToAccountStateDataItem(accountState, split, ymdDate) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, 1);
}


/**
 * Returns a new account state data item that reflects the removal of a {@link Split}
 * from the account state. This is the opposite of {@link addSplitToAccountStateDataItem}.
 * The only validation performed is a check for lots being modified or removed being in 
 * the account state.
 * @param {AccountState|AccountStateDataItem} accountState 
 * @param {Split|SplitDataItem} split 
 * @returns {AccountStateDataItem}
 * @throws {Error}
 */
export function removeSplitFromAccountStateDataItem(accountState, split, ymdDate) {
    return adjustAccountStateDataItemForSplit(accountState, split, ymdDate, -1);
}


/**
 * @typedef {object} AccountDataItem
 * @property {number}   id  The account's id.
 * @property {string}   [refId] Optional user reference id, these must be unique.
 * @property {number}   parentAccountId The account id of the parent account.
 * @property {string}   type    The name property of one of {@link AccountType}.
 * @property {number}   pricedItemId   The local id of the priced item the account represents.
 * @property {string}   [name]  The name of the account.
 * @property {string}   [description]   The description of the account.
 */

/**
 * @typedef {object} AccountData
 * @property {number}   id  The account's id.
 * @property {string}   [refId] Optional user reference id, these must be unique.
 * @property {number}   parentAccountId The account id of the parent account.
 * @property {AccountType}  type    The account's type.
 * @property {number}   pricedItemId   The local id of the priced item the account represents.
 * @property {string}   [name]  The name of the account.
 * @property {string}   [description]   The description of the account.
 */

/**
 * Retrieves an {@link Account} representation of an {@link AccountDataItem}, avoids copying if the arg
 * is already an {@link Account}
 * @param {(AccountDataItem|Account)} accountDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Account}
 */
export function getAccount(accountDataItem, alwaysCopy) {
    if (accountDataItem) {
        const type = getAccountType(accountDataItem.type);
        if (alwaysCopy
         || (type !== accountDataItem.type)) {
            const account = Object.assign({}, accountDataItem);
            account.type = type;
            return account;
        }
    }
    return accountDataItem;
}

/**
 * Retrieves an {@link AccountDataItem} representation of an {@link Account}, avoids copying if the arg
 * is already an {@link AccountDataItem}
 * @param {(Account|AccountDataItem)} account 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {AccountDataItem}
 */
export function getAccountDataItem(account, alwaysCopy) {
    if (account) {
        const typeName = getAccountTypeName(account.type);
        if (alwaysCopy
         || (typeName !== account.type)) {
            const accountDataItem = Object.assign({}, account);
            accountDataItem.type = typeName;
            return accountDataItem;
        }
    }
    return account;
}

/**
 * Performs a deep copy of either an {@link Account} or an {@link AccountDataItem}.
 * @param {(Account|AccountDataItem)} account 
 * @returns {(Account|AccountDataItem)} The type returned is the same as the arg.
 */
export function deepCopyAccount(account) {
    const accountDataItem = getAccountDataItem(account);
    if (accountDataItem === account) {
        account = getAccount(accountDataItem);
        return getAccountDataItem(account);
    }
    else {
        return getAccount(accountDataItem);
    }
}


/**
 * Retrieves the id from an account reference, which may be an id already, an {@link Account}, or an {@link AccountDataItem}
 * @param {(Account|AccountDataItem|number)} ref 
 * @returns {number}
 */
export function getAccountId(ref) {
    return (ref !== undefined) ? ((typeof ref === 'number') ? ref : ref.id) : undefined;
}


/**
 * Manages {@link Account}s.
 */
export class AccountManager extends EventEmitter {

    /**
     * @typedef {object}    AccountManager~Options
     * @property {NumericIdGenerator~Options}   [idGenerator]   The id generator state to restore to.
     */
    constructor(accountingSystem, options) {
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator || this._handler.getIdGeneratorOptions());

        this._accountsById = new Map();
        this._accountsByRefId = new Map();

        const accounts = this._handler.getAccountDataItems();
        accounts.forEach((account) => {
            this._accountsById.set(account.id, account);

            if (account.refId) {
                this._accountsByRefId.set(account.refId, account);
            }
        });

        const baseOptions = this._handler.getBaseOptions() || {};

        this._rootAssetAccountId = baseOptions.rootAssetAccountId;
        this._rootAssetAccount = this._accountsById.get(this._rootAssetAccountId);

        this._rootLiabilityAccountId = baseOptions.rootLiabilityAccountId;
        this._rootLiabilityAccount = this._accountsById.get(this._rootLiabilityAccountId);

        this._rootIncomeAccountId = baseOptions.rootIncomeAccountId;
        this._rootIncomeAccount = this._accountsById.get(this._rootIncomeAccountId);

        this._rootExpenseAccountId = baseOptions.rootExpenseAccountId;
        this._rootExpenseAccount = this._accountsById.get(this._rootExpenseAccountId);

        this._rootEquityAccountId = baseOptions.rootEquityAccountId;
        this._rootEquityAccount = this._accountsById.get(this._rootEquityAccountId);

        this._openingBalancesAccountId = baseOptions.openingBalancesAccountId;
        this._openingBalancesAccount = this._accountsById.get(this._openingBalancesAccountId);
    }

    async asyncSetupForUse() {
        const accountingSystem = this._accountingSystem;
        const pricedItemManager = accountingSystem.getPricedItemManager();
        const currencyPricedItemId = pricedItemManager.getCurrencyPricedItemId(accountingSystem.getBaseCurrency());

        if (!this._rootAssetAccount) {
            this._rootAssetAccount = await this._asyncAddAccount({
                type: AccountType.ASSET,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Assets_name'),
                description: userMsg('Account-Root_Assets_desc'),
            });
            this._rootAssetAccountId = this._rootAssetAccount.id;
        }
        
        if (!this._rootLiabilityAccount) {
            this._rootLiabilityAccount = await this._asyncAddAccount({
                type: AccountType.LIABILITY,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Liabilities_name'),
                description: userMsg('Account-Root_Liabilities_desc'),
            });
            this._rootLiabilityAccountId = this._rootLiabilityAccount.id;
        }

        if (!this._rootIncomeAccount) {
            this._rootIncomeAccount = await this._asyncAddAccount({
                type: AccountType.INCOME,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Income_name'),
                description: userMsg('Account-Root_Income_desc'),
            });
            this._rootIncomeAccountId = this._rootIncomeAccount.id;
        }

        if (!this._rootExpenseAccount) {
            this._rootExpenseAccount = await this._asyncAddAccount({
                type: AccountType.EXPENSE,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Expense_name'),
                description: userMsg('Account-Root_Expense_desc'),
            });
            this._rootExpenseAccountId = this._rootExpenseAccount.id;
        }

        if (!this._rootEquityAccount) {
            this._rootEquityAccount = await this._asyncAddAccount({
                type: AccountType.EQUITY,
                pricedItemId: currencyPricedItemId, 
                name: userMsg('Account-Root_Equity_name'),
                description: userMsg('Account-Root_Equity_desc'),
            });
            this._rootEquityAccountId = this._rootEquityAccount.id;
        }

        if (!this._openingBalancesAccount) {
            this._openingBalancesAccount = await this._asyncAddAccount(
                {
                    parentAccountId: this._rootEquityAccountId,
                    type: AccountType.OPENING_BALANCE,
                    pricedItemId: currencyPricedItemId, 
                    name: userMsg('Account-Opening_Balances_name'),
                    description: userMsg('Account-Opening_Balances_desc'),
                });
            this._openingBalancesAccountId = this._openingBalancesAccount.id;
        }

        this._handler.setBaseOptions({
            rootAssetAccountId: this._rootAssetAccountId,
            rootLiabilityAccountId: this._rootLiabilityAccountId,
            rootIncomeAccountId: this._rootIncomeAccountId,
            rootExpenseAccountId: this._rootExpenseAccountId,
            rootEquityAccountId: this._rootEquityAccountId,
            openingBalancesAccountId: this._openingBalancesAccountId,
        });
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
    getAccountDataItemWithId(id) {
        const account = this._accountsById.get(id);
        return (account) ? Object.assign({}, account) : undefined;
    }


    /**
     * Retrieves the account with a given refId.
     * @param {string} refId
     * @returns {(AccountDataItem|undefined)}
     */
    getAccountDataItemWithRefId(refId) {
        const account = this._accountsByRefId.get(refId);
        return (account) ? Object.assign({}, account) : undefined;
    }


    /**
     * Determines if an account is a child of another account.
     * @param {(Account|AccountDataItem|number)} test A reference to the account to be tested.
     * @param {(Account|AccountDataItem|number)} ref A reference to the account to be tested against.
     * @returns {boolean}   <code>true</code> if the account with id testId is a child of the account with id refId.
     */
    isAccountChildOfAccount(test, ref) {
        const testId = getAccountId(test);
        const refId = getAccountId(ref);

        let accountDataItem = this.getAccountDataItemWithId(testId);
        while (accountDataItem) {
            if (accountDataItem.parentAccountId === refId) {
                return true;
            }

            accountDataItem = this.getAccountDataItemWithId(accountDataItem.parentAccountId);
        }

        return false;
    }


    async _asyncAddAccount(account) {
        account = getAccountDataItem(account);
        
        const accountDataItem = Object.assign({}, account);

        accountDataItem.childAccountIds = accountDataItem.childAccountIds || [];

        const id = this._idGenerator.generateId();
        accountDataItem.id = id;
        const idGeneratorOptions = this._idGenerator.toJSON();

        const updatedAccountEntries = [];
        updatedAccountEntries.push([id, accountDataItem]);

        if (accountDataItem.parentAccountId) {
            const parentAccountDataItem = this.getAccountDataItemWithId(accountDataItem.parentAccountId);
            parentAccountDataItem.childAccountIds.push(id);

            updatedAccountEntries.push([account.parentAccountId, parentAccountDataItem]);
        }

        // Gotta move any specified child accounts.
        accountDataItem.childAccountIds.forEach((childId) => {
            const childAccountDataItem = this.getAccountDataItemWithId(childId);

            const { parentAccountId } = childAccountDataItem;
            const parentAccountDataItem = this.getAccountDataItemWithId(parentAccountId);
            const index = parentAccountDataItem.childAccountIds.indexOf(childId);
            parentAccountDataItem.childAccountIds.splice(index, 1);
            updatedAccountEntries.push([parentAccountId, parentAccountDataItem]);

            childAccountDataItem.parentAccountId = id;
            updatedAccountEntries.push([childId, childAccountDataItem]);
        });


        await this._handler.asyncUpdateAccountDataItems(updatedAccountEntries, idGeneratorOptions);

        updatedAccountEntries.forEach(([id, accountDataItem]) => {
            this._accountsById.set(id, accountDataItem);
            if (accountDataItem.refId) {
                this._accountsByRefId.set(accountDataItem.refId, accountDataItem);
            }
        });

        return accountDataItem;
    }


    _validateAccountBasics(accountDataItem, parentAccountDataItem, isModify) {
        const type = getAccountType(accountDataItem.type);
        if (!type) {
            return userError('AccountManager-type_invalid', type);
        }
        if (!isModify && type.isSingleton) {
            return userError('AccountManager-singleton_in_use', type.name);
        }

        // Make sure our type is valid for the parent.
        if (parentAccountDataItem) {
            const parentType = getAccountType(parentAccountDataItem.type);
            if (!parentType.allowedChildTypes.includes(type)) {
                return userError('AccountManager-type_not_allowed_for_parent', getAccountTypeName(type), getAccountTypeName(parentAccountDataItem.type));
            }
        }

        if (accountDataItem.refId) {
            const refIdAccount = this._accountsByRefId.get(accountDataItem.refId);
            if (refIdAccount) {
                return userError('AccountManager-duplicate_ref_id', accountDataItem.refId);
            }
        }

        const pricedItem = this._accountingSystem.getPricedItemManager().getPricedItemDataItemWithId(accountDataItem.pricedItemId);
        if (!pricedItem) {
            return userError('AccountManager-invalid_pricedItem_id', accountDataItem.pricedItemId);
        }

        const pricedItemType = getPricedItemType(pricedItem.type);
        if (pricedItemType !== type.pricedItemType) {
            return userError('AccountManager-invalid_pricedItem_type_for_type', pricedItemType.name, type.name);
        }

        if (type.validateFunc) {
            const error = type.validateFunc(this, accountDataItem, isModify);
            if (error) {
                return error;
            }
        }
    }


    /**
     * Fired by {@link AccountManager#asyncAddAccount} after an account has been added.
     * @event AccountManager~accountAdd
     * @type {object}
     * @property {AccountDataItem}  newAccountDataItem  The account data item being returned by the {@link AccountManager#asyncAddAccount} call.
     */


    /**
     * Adds a new account.
     * @param {(Account|AccountDataItem)} account   The account to add.
     * @param {(YMDDate|string)} [initialYMDDate]   The date to assign to the account state.
     * @param {boolean} validateOnly 
     * @returns {AccountDataItem}   The newly added account's data item.
     * @throws {Error}
     * @fires {AccountManager~accountAdd}
     */
    async asyncAddAccount(account, initialYMDDate, validateOnly) {
        const accountDataItem = Object.assign({}, getAccountDataItem(account));

        const parentAccountDataItem = this.getAccountDataItemWithId(accountDataItem.parentAccountId);
        if (!parentAccountDataItem) {
            throw userError('AccountManager-parent_account_invalid', accountDataItem.parentAccountId);
        }

        
        const type = getAccountType(accountDataItem.type);
        
        if (accountDataItem.childAccountIds) {
            // Verify that all the accounts in childAccountIds can be moved to this account's type.
            const { childAccountIds } = accountDataItem;
            for (let i = childAccountIds.length - 1; i >= 0; --i) {
                const childId = childAccountIds[i];
                const childAccount = this.getAccountDataItemWithId(childId);
                if (!childAccount) {
                    throw userError('AccountManager-child_account_invalid', childId);
                }
                const childType = getAccountType(childAccount.type);
                if (!type.allowedChildTypes.includes(childType)) {
                    throw userError('AccountManager-child_incompatible', childId, childType.name, type.name);
                }
            }
        }
        else {
            accountDataItem.childAccountIds = [];
        }


        const error = this._validateAccountBasics(accountDataItem, parentAccountDataItem, false);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return;
        }

        const newAccountDataItem = await this._asyncAddAccount(accountDataItem);
        const result = Object.assign({}, newAccountDataItem);

        this.emit('accountAdd', { newAccountDataItem: result });
        return result;
    }



    /**
     * Fired by {@link AccountManager#asyncRemoveAccount} after an account has been removed.
     * @event AccountManager~accountRemove
     * @type {object}
     * @property {AccountDataItem}  removedAccountDataItem  The account data item that was removed.
     */

    /**
     * Removes an account. Root accounts and the opening balances account cannot be removed.
     * @param {number} accountId 
     * @param {boolean} validateOnly 
     * @returns {AccountDataItem}   The removed account data item.
     * @throws {Error}
     * @fires {AccountManager~accountRemove}
     */
    async asyncRemoveAccount(accountId, validateOnly) {
        const accountDataItem = this.getAccountDataItemWithId(accountId);
        if (!accountDataItem) {
            throw userError('AccountManager-remove_account_id_not_found', accountId);
        }

        if (!accountDataItem.parentAccountId) {
            throw userError('AccountManager-no_delete_root_accounts');
        }
        if (accountId === this._openingBalancesAccountId) {
            throw userError('AccountManager-no_delete_opening_balances_account');
        }

        const { parentAccountId } = accountDataItem;
        const parentAccountDataItem = this.getAccountDataItemWithId(parentAccountId);
        if (!parentAccountDataItem) {
            throw userError('AccountManager-remove_parent_account_not_found', accountDataItem.parentAccountId);
        }
        const parentType = getAccountType(parentAccountDataItem.type);

        // Make sure all the child accounts are compatible with the parent account.
        const { childAccountIds } = accountDataItem;
        const childAccountDataItems = [];
        for (let i = childAccountIds.length - 1; i >= 0; --i) {
            const childId = childAccountIds[i];
            const childAccountDataItem = this.getAccountDataItemWithId(childId);
            if (childAccountDataItem) {
                const childType = getAccountType(childAccountDataItem.type);
                if (!parentType.allowedChildTypes.includes(childType)) {
                    throw userError('AccountManager-child_not_compatible', childType.name, parentType.name);
                }
            }

            parentAccountDataItem.childAccountIds.push(childId);
            childAccountDataItem.parentAccountId = parentAccountId;
            childAccountDataItems.push(childAccountDataItem);
        }

        parentAccountDataItem.childAccountIds.splice(parentAccountDataItem.childAccountIds.indexOf(accountId), 1);

        if (validateOnly) {
            return;
        }

        const updatedAccountEntries = [];
        updatedAccountEntries.push([accountId]);

        updatedAccountEntries.push([parentAccountId, parentAccountDataItem]);
        childAccountDataItems.forEach((dataItem) => {
            updatedAccountEntries.push([dataItem.id, dataItem]);
        });

        await this._handler.asyncUpdateAccountDataItems(updatedAccountEntries);

        updatedAccountEntries.forEach(([id, accountDataItem]) => {
            if (!accountDataItem) {
                return;
            }
            this._accountsById.set(id, accountDataItem);
            if (accountDataItem.refId) {
                this._accountsByRefId.set(accountDataItem.refId, accountDataItem);
            }
        });

        this._accountsById.delete(accountId);
        if (accountDataItem.refId) {
            this._accountsByRefId.delete(accountDataItem.refId);
        }

        this.emit('accountRemove', { removedAccountDataItem: accountDataItem });

        return accountDataItem;
    }


    /**
     * Fired by {@link AccountManager#asyncModifyAccount} after an account has been modified.
     * @event AccountManager~accountsModify
     * @type {object}
     * @property {AccountDataItem[]}  newAccountDataItems  Array of the new account data items.
     * @property {AccountDataItem[]}  oldAccountDataItems  Array of the old account data items.
     */

    /**
     * Modifies an account.
     * @param {(Account|AccountDataItem)} account The account id is required. Only specified properties are modified, with restrictions on the
     * type and priced item accounts. Note that the childAccountIds can only be shuffled about, the accounts in the list cannot be changed.
     * @param {boolean} validateOnly 
     * @returns {AccountDataItem[]|undefined} If the account is modified, returns an array whose first element is the new account data item
     * and whose second element is the old account item data. Otherwise <code>undefined</code> is returned (which happens if account does not actually
     * change anything).
     * @throws {Error}
     * @fires {AccountManager~accountsModify}
     */
    async asyncModifyAccount(account, validateOnly) {
        const { id } = account;
        const oldAccountDataItem = this.getAccountDataItemWithId(id);
        if (!oldAccountDataItem) {
            throw userError('AccountManager-modify_no_id', id);
        }

        const newAccountDataItem = getAccountDataItem(deepCopyAccount(Object.assign({}, oldAccountDataItem, account)));

        // Can't change the type nor parent of the root and opening balance accounts.
        const oldParentAccountId = oldAccountDataItem.parentAccountId;
        const newParentAccountId = newAccountDataItem.parentAccountId;
        let newParentAccountDataItem;
        let oldParentAccountDataItem;
        if (!oldAccountDataItem.parentAccountId) {
            if (newAccountDataItem.type !== oldAccountDataItem.type) {
                throw userError('AccountManager-no_change_root_account_type');
            }
            if (newAccountDataItem.parentAccountId) {
                throw userError('AccountManager-no_change_root_account_parent');
            }
        }
        else if (account.id === this._openingBalancesAccountId) {
            if (newAccountDataItem.type !== oldAccountDataItem.type) {
                throw userError('AccountManager-no_change_opening_balances_account_type');
            }
            if (newAccountDataItem.parentAccountId !== oldAccountDataItem.parentAccountId) {
                throw userError('AccountManager-no_change_opening_balances_account_parent');
            }
        }
        else {
            newParentAccountDataItem = this.getAccountDataItemWithId(newParentAccountId);
            if (!newParentAccountDataItem) {
                throw userError('AccountManager-parent_account_invalid', newParentAccountId);
            }

            if (newParentAccountId !== oldParentAccountId) {
                // Make sure the new parent is not a child of the account.
                if (this.isAccountChildOfAccount(newParentAccountId, id)) {
                    throw userError('AccountManager-parent_is_child');
                }

                oldParentAccountDataItem = this.getAccountDataItemWithId(oldParentAccountId);
                if (!oldParentAccountDataItem) {
                    throw userError('AccountManager-parent_account_invalid', oldParentAccountId);
                }

                const index = oldParentAccountDataItem.childAccountIds.indexOf(id);
                if (index >= 0) {
                    oldParentAccountDataItem.childAccountIds.splice(index, 1);
                }

                newParentAccountDataItem.childAccountIds.push(id);
            }
            else {
                oldParentAccountDataItem = newParentAccountDataItem;
            }
        }


        const oldType = getAccountType(oldAccountDataItem.type);
        const newType = getAccountType(newAccountDataItem.type);
        if (oldType !== newType) {
            if (newType) {
                // We'll let _validateAccountBasics() handle the invalid type case.
                if (oldType.category !== newType.category) {
                    throw userError('AccountManager-no_change_category');
                }

                if (oldType.pricedItemType !== newType.pricedItemType) {
                    throw userError('AccountManager-no_change_pricedItem_types');
                }
            }
        }

        if (account.childAccountIds) {
            if (oldAccountDataItem.childAccountIds.length !== account.childAccountIds.length) {
                throw userError('AccountManager-no_change_child_ids');
            }
            const existingIds = new Set(oldAccountDataItem.childAccountIds);
            account.childAccountIds.forEach((id) => existingIds.delete(id));
            if (existingIds.size) {
                throw userError('AccountManager-no_change_child_ids');
            }
        }

        const error = this._validateAccountBasics(newAccountDataItem, newParentAccountDataItem, true);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return;
        }

        if (deepEqual(newAccountDataItem, oldAccountDataItem)) {
            return;
        }

        const updatedAccountEntries = [];
        updatedAccountEntries.push([newAccountDataItem.id, newAccountDataItem]);

        if (newParentAccountId !== oldParentAccountId) {
            updatedAccountEntries.push([oldParentAccountDataItem.id, oldParentAccountDataItem]);
            updatedAccountEntries.push([newParentAccountId, newParentAccountDataItem]);
        }

        await this._handler.asyncUpdateAccountDataItems(updatedAccountEntries);
        
        this._accountsById.set(id, newAccountDataItem);

        if (oldAccountDataItem.refId !== newAccountDataItem.refId) {
            if (oldAccountDataItem.refId) {
                this._accountsByRefId.delete(oldAccountDataItem.refId);
            }
        }

        updatedAccountEntries.forEach(([id, accountDataItem]) => {
            this._accountsById.set(id, accountDataItem);
            if (accountDataItem.refId) {
                this._accountsByRefId.set(accountDataItem.refId, accountDataItem);
            }
        });

        const result = [Object.assign({}, newAccountDataItem), oldAccountDataItem];
        
        this.emit('accountsModify', {
            newAccountDataItems: [result[0]],
            oldAccountDataItems: [result[1]],
        });

        return result;
    }

}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link AccountManager}.
 * @interface
 */
export class AccountsHandler {
    /**
     * Retrieves an array containing all the account data items. The accounts are presumed
     * to already be loaded when the {@link AccountManager} is constructed.
     * @returns {AccountDataItem[]}
     */
    getAccountDataItems() {
        throw Error('AccountsHandler.getAccountDataItems() abstract method!');
    }

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for initializing the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('AccountsHandler.getIdGeneratorOptions() abstract method!');
    }


    /**
     * Called by {@link AccountManager#asyncSetupForUse} to save the base options of the account manager.
     * @param {object} options The options, a JSON-able object.
     */
    setBaseOptions(options) {
        throw Error('AccountsHandler.setBaseOptiosn() abstract method!');
    }

    /**
     * @returns {object}    The base options object passed to {@link AccountsHandler#setBaseOptinos}.
     */
    getBaseOptions() {
        throw Error('AccountsHandler.getBaseOptions() abstract method!');
    }


    /**
     * Main function for updating the account data items. We use a single function for both modify and delete because
     * modifying or deleting one account may affect other accounts, so those accounts must also be deleted at the same time.
     * @param {*} accountIdAndDataItemPairs Array of one or two element sub-arrays. The first element of each sub-array is the account id.
     * For new or modified accounts, the second element is the new data item. For accounts to be deleted, this is <code>undefined</code>.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The current state of the id generator, if <code>undefined</code>
     * the generator state hasn't changed.
     */
    async asyncUpdateAccountDataItems(accountIdAndDataItemPairs, idGeneratorOptions) {
        throw Error('AccountsHandler.asyncUpdateAccountDataItems() abstract method!');
    }

}

/**
 * Simple in-memory implementation of {@link AccountsHandler}
 */
export class InMemoryAccountsHandler extends AccountsHandler {
    constructor(accounts) {
        super();

        this._accountDataItemsById = new Map();

        if (accounts) {
            accounts.forEach((pricedItem) => {
                this._accountDataItemsById.set(pricedItem.id, pricedItem);
            });
        }

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            accounts: Array.from(this._accountDataItemsById.values()),
            baseOptions: this._baseOptions,
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._accountDataItemsById.clear();
        json.accounts.forEach((accountDataItem) => {
            this._accountDataItemsById.set(accountDataItem.id, accountDataItem);
        });

        this._baseOptions = json.baseOptions;

        this.markChanged();
    }

    getAccountDataItems() {
        return Array.from(this._accountDataItemsById.values());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    setBaseOptions(options) {
        this._baseOptions = options;
        this.markChanged();
    }

    getBaseOptions() {
        return this._baseOptions;
    }


    async asyncUpdateAccountDataItems(accountIdAndDataItemPairs, idGeneratorOptions) {
        accountIdAndDataItemPairs.forEach(([id, accountDataItem]) => {
            if (!accountDataItem) {
                this._accountDataItemsById.delete(id);
            }
            else {
                this._accountDataItemsById.set(id, accountDataItem);
            }
        });

        if (idGeneratorOptions) {
            this._idGeneratorOptions = idGeneratorOptions;
        }
        
        this.markChanged();
    }

}
