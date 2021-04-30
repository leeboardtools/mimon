import * as A from '../engine/Accounts';
import { cleanSpaces } from '../util/StringUtils';
import { StandardAccountTag } from '../engine/StandardTags';
import { getQuantityDefinition } from '../util/Quantities';
import { getCurrency } from '../util/Currency';

/**
 * Builds an array containing the {@link AccountDataItem}s of an account and
 * all its parents.
 * @param {EngineAccessor} accessor 
 * @param {number} id 
 * @returns {AccountDataItem[]} The array, the first element is the account with
 * id, the second element is its parent, etc. The array is empty if there is no
 * account with the id.
 */
export function getAncestorAccountDataItems(accessor, id) {
    const accountDataItems = [];
    let accountDataItem;
    while ((accountDataItem = accessor.getAccountDataItemWithId(id))) {
        accountDataItems.push(accountDataItem);
        id = accountDataItem.parentAccountId;
    }

    return accountDataItems;
}

function buildAncestorNames(accountDataItems, separator) {
    let name = '';
    let addSeparator = false;
    for (let i = accountDataItems.length - 1; i >= 0; --i) {
        if (addSeparator) {
            name += separator;
        }
        else {
            addSeparator = true;
        }
        name += accountDataItems[i].name;
    }

    return name;
}

/**
 * @typedef {object}    getAccountAncestorNamesOptions
 * @property {string}   [separator=':'] The string to appear between names.
 */

/**
 * Constructs a name consisting of the names of all the ancestor accounts of
 * an account, plus the account. The root account is the first name.
 * @param {EngineAccessor} accessor 
 * @param {number} id 
 * @param {getAccountAncestorNamesOptions} [options]
 * @returns {string}
 */
export function getAccountAncestorNames(accessor, id, options) {
    options = options || {};
    const separator = options.separator || ':';
    const accountDataItems = getAncestorAccountDataItems(accessor, id);
    return buildAncestorNames(accountDataItems, separator);
}


/**
 * @typedef {object}    getShortAccountAncestorNamesOptions
 * @property {string}   [separator = ':'] The string to appear between names.
 * @property {string}   [placeholder = ':[...]:']    The string to appear in place
 * of the names that were left out.
 * @property {number}   [maxAccounts = 4] The optional maximum number of accounts before
 * the name is shortened.
 */

/**
 * Constructs a possibly shortened version of {@link getAccountAncestorName}. The
 * name is shortened if there are more than four accounts in the ancestor tree,
 * in which case only the root and the last two accounts are included.
 * @param {EngineAccessor} accessor 
 * @param {number} id 
 * @param {getShortAccountAncestorNamesOptions} [options]
 * @returns {string}
 */
export function getShortAccountAncestorNames(accessor, id, options) {
    options = options || {};
    const separator = options.separator || ':';
    const maxAccounts = (options.maxAccounts > 1) ? options.maxAccounts : 4;

    const accountDataItems = getAncestorAccountDataItems(accessor, id);
    if (accountDataItems.length <= maxAccounts) {
        return buildAncestorNames(accountDataItems, separator);
    }

    const placeholder = options.placeholder || ':[...]:';

    const preCount = Math.floor(maxAccounts / 2);
    const postCount = maxAccounts - preCount;

    let i = accountDataItems.length - 1;
    let result = accountDataItems[i].name;
    let end1 = i - preCount;
    for (--i; i > end1; --i) {
        result += separator + accountDataItems[i].name;
    }

    i = postCount - 1;
    result += placeholder + accountDataItems[i].name;
    for (--i; i >= 0; --i) {
        result += separator + accountDataItems[i].name;
    }

    return result;
}


/**
 * @typedef {object}    AccountHelpersNameId
 * @property {string}   name    The name as returned by 
 * {@link getAncestorAccountDataItems}.
 * @property {number}   id  The account id.
 */


/**
 * Finds the account within an account tree with the longest name returned by
 * {@link getAncestorAccountDataItems}.
 * @param {EngineAccessor} accessor 
 * @param {AccountHelpersNameId} [nameId] Updated with the information of the 
 * account with the longest name, if <code>undefined</code> it will be created.
 * @param {number} [accountId] The account id, if <code>undefined</code> 
 * all the accounts will be checked.
 * @returns {AccountHelpersNameId}
 */
export function getAccountWithLongestAncestorName(accessor, nameId, accountId) {
    nameId = nameId || { name: '', id: -1, };

    if (accountId === undefined) {
        getAccountWithLongestAncestorName(accessor, nameId,
            accessor.getRootAssetAccountId());
        getAccountWithLongestAncestorName(accessor, nameId,
            accessor.getRootLiabilityAccountId());
        getAccountWithLongestAncestorName(accessor, nameId,
            accessor.getRootIncomeAccountId());
        getAccountWithLongestAncestorName(accessor, nameId,
            accessor.getRootExpenseAccountId());
        getAccountWithLongestAncestorName(accessor, nameId,
            accessor.getRootEquityAccountId());
        return nameId;
    }

    // We only need to check accounts with no children.
    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (!accountDataItem.childAccountIds || !accountDataItem.childAccountIds.length) {
        const name = getShortAccountAncestorNames(accessor, accountId);
        if (name.length > nameId.name.length) {
            nameId.name = name;
            nameId.id = accountId;
        }
    }
    else {
        // Gotta check the children.
        accountDataItem.childAccountIds.forEach((childAccountId) =>
            getAccountWithLongestAncestorName(accessor, nameId, childAccountId));
    }

    return nameId;
}


/**
 * Callback for {@link crawlAccountTree}
 * @callback crawlAccountTreeCallback
 * @param {AccountDataItem} accountDataItem
 * @returns {boolean|undefined}   <code>true</code> if crawling should be halted.
 */

/**
 * @param {EngineAccessor} accessor 
 * @param {AccountDataItem|number} accountDataItem 
 * @param {crawlAccountTreeCallback} callback 
 * @return {boolean|undefined}  <code>true</code> if at any point the callback
 * returned <code>true</code>.
 */
export function crawlAccountTree(accessor, accountDataItem, callback) {
    if (typeof accountDataItem === 'number') {
        accountDataItem = accessor.getAccountDataItemWithId(accountDataItem);
    }
    
    if (accountDataItem) {
        if (callback(accountDataItem)) {
            return true;
        }

        const { childAccountIds } = accountDataItem;
        if (childAccountIds) {
            for (let accountId of childAccountIds) {
                if (crawlAccountTree(accessor, accountId, callback)) {
                    return true;
                }
            }
        }
    }
}

/**
 * @typedef {object} DefaultSplitAccountTypeDef
 * @property {string}   property    The name of the property in the
 * {@link DefaultSplitAccountIds} object of the {@link AccountDataItem}
 * @property {AccountCategory}  category
 * @property {TagDef[]}   tags
 */


/**
 * Enumeration of the built-in default split account types
 * @readonly
 * @enum {DefaultSplitAccountTypeDef}
 * @property {DefaultSplitAccountTypeDef}   INTEREST_INCOME
 * @property {DefaultSplitAccountTypeDef}   DIVIDENDS_INCOME
 * @property {DefaultSplitAccountTypeDef}   LONG_TERM_CAPITAL_GAINS_INCOME
 * @property {DefaultSplitAccountTypeDef}   SHORT_TERM_CAPITAL_GAINS_INCOME
 * @property {DefaultSplitAccountTypeDef}   ORDINARY_INCOME
 * @property {DefaultSplitAccountTypeDef}   INTEREST_EXPENSE
 * @property {DefaultSplitAccountTypeDef}   FEES_EXPENSE
 * @property {DefaultSplitAccountTypeDef}   TAXES_EXPENSE
 */
export const DefaultSplitAccountType = {
    INTEREST_INCOME: { name: 'INTEREST_INCOME',
        property: 'interestIncomeId',
        category: A.AccountCategory.INCOME,
        tags: [ StandardAccountTag.INTEREST],
    },
    DIVIDENDS_INCOME: { name: 'DIVIDENDS_INCOME',
        property: 'dividendsIncomeId',
        category: A.AccountCategory.INCOME,
        tags: [ StandardAccountTag.DIVIDENDS],
    },
    LONG_TERM_CAPITAL_GAINS_INCOME: { name: 'LONG_TERM_CAPITAL_GAINS_INCOME',
        property: 'longTermCapitalGainsIncomeId',
        category: A.AccountCategory.INCOME,
        tags: [ StandardAccountTag.LONG_TERM_CAPITAL_GAINS],
    },
    SHORT_TERM_CAPITAL_GAINS_INCOME: { name: 'SHORT_TERM_CAPITAL_GAINS_INCOME',
        property: 'shortTermCapitalGainsIncomeId',
        category: A.AccountCategory.INCOME,
        tags: [ StandardAccountTag.SHORT_TERM_CAPITAL_GAINS],
    },
    ORDINARY_INCOME: { name: 'ORDINARY_INCOME',
        property: 'ordinaryIncomeId',
        category: A.AccountCategory.INCOME,
        tags: [ StandardAccountTag.ORDINARY_INCOME],
    },
    INTEREST_EXPENSE: { name: 'INTEREST_EXPENSE',
        property: 'interestExpenseId',
        category: A.AccountCategory.EXPENSE,
        tags: [ StandardAccountTag.INTEREST],
    },
    FEES_EXPENSE: { name: 'FEES_EXPENSE',
        property: 'feesExpenseId',
        category: A.AccountCategory.EXPENSE,
        tags: [ StandardAccountTag.FEES],
        specialTags: {
            'BANK': [ StandardAccountTag.BANK_FEES ],
            'SECURITY': [ StandardAccountTag.BROKERAGE_COMMISSIONS ],
            'MUTUAL_FUND': [StandardAccountTag.BROKERAGE_COMMISSIONS ],
        }
    },
    TAXES_EXPENSE: { name: 'TAXES_EXPENSE',
        property: 'taxesExpenseId',
        category: A.AccountCategory.EXPENSE,
        tags: [ StandardAccountTag.TAXES],
    },
    EQUITY: { name: 'EQUITY',
        property: 'equityId',
        category: A.AccountCategory.EQUITY,
        tags: [ StandardAccountTag.EQUITY],
    },
};


export function getDefaultSplitAccountType(defaultSplitAccountType) {
    return (typeof defaultSplitAccountType === 'string')
        ? DefaultSplitAccountType[defaultSplitAccountType]
        : defaultSplitAccountType;
}


/**
 * Retrieves the tags array for a {@link DefaultSplitAccountTypeDef},
 * handling the special cases for a specific account data item.
 * @param {AccountDataItem} accountDataItem 
 * @param {DefaultSplitAccountTypeDef} defaultSplitAccountType 
 * @return {TagDef[]}
 */
export function getDefaultSplitAccountTags(accountDataItem,
    defaultSplitAccountType) {

    defaultSplitAccountType = getDefaultSplitAccountType(defaultSplitAccountType);
    let { tags, specialTags } = defaultSplitAccountType;
    if (specialTags) {
        if (specialTags[accountDataItem.type]) {
            return specialTags[accountDataItem.type];
        }
    }

    return tags;
}


/**
 * Retrieves the account id to use for a default split account associated with an 
 * accountDataItem.
 * @param {EngineAccessor} accessor 
 * @param {AccountDataItem|number} accountDataItem 
 * @param {DefaultSplitAccountType} defaultSplitAccountType 
 * @returns {number}
 */
export function getDefaultSplitAccountId(accessor, accountDataItem, 
    defaultSplitAccountType) {
    
    defaultSplitAccountType = getDefaultSplitAccountType(defaultSplitAccountType);

    if (typeof accountDataItem === 'number') {
        accountDataItem = accessor.getAccountDataItemWithId(accountDataItem);
    }
    accountDataItem = A.getAccountDataItem(accountDataItem);
    const { defaultSplitAccountIds } = accountDataItem;

    let accountId;
    if (defaultSplitAccountIds) {
        accountId = defaultSplitAccountIds[defaultSplitAccountType.property];
    }

    if (accessor.getAccountDataItemWithId(accountId)) {
        return accountId;
    }
    accountId = undefined;

    let { category } = defaultSplitAccountType;
    const tags = getDefaultSplitAccountTags(accountDataItem, defaultSplitAccountType);

    const rootAccountId = accessor.getCategoryRootAccountId(category);
    const accountIds = accessor.getAccountIdsWithTags(tags, rootAccountId);
    if (accountIds && accountIds.length) {
        const name = cleanSpaces(accountDataItem.name || '').toUpperCase();

        for (let searchAccountId of accountIds) {
            if (crawlAccountTree(accessor, searchAccountId, (accountDataItem) => {
                if (cleanSpaces(accountDataItem.name || '').toUpperCase() === name) {
                    accountId = accountDataItem.id;
                    return true;
                }
            })) {
                break;
            }
        }

        if (!accountId) {
            accountId = accountIds[0];
        }
    }

    return accountId || rootAccountId;
}


/**
 * Retrieves the {@link PricedItemDataItem} of an account given the account id.
 * @param {EngineAccessor} accessor 
 * @param {number} accountId 
 * @returns {PricedItemDataItem|undefined}
 */
export function getPricedItemDataItemForAccountId(accessor, accountId) {
    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (accountDataItem) {
        return accessor.getPricedItemDataItemWithId(accountDataItem.pricedItemId);
    }
}


/**
 * Retrieves the {@link QuantityDefinition} of the {@link PricedItemDataItem}
 * of an account given the account id.
 * @param {EngineAccessor} accessor 
 * @param {number} accountId 
 * @returns {QuantityDefinition|undefined} <code>undefined</code> is returned 
 * if the account is not valid.
 */
export function getQuantityDefinitionForAccountId(accessor, accountId) {
    const pricedItemDataItem = getPricedItemDataItemForAccountId(accessor, accountId);
    if (pricedItemDataItem) {
        return getQuantityDefinition(pricedItemDataItem.quantityDefinition);
    }
}


/**
 * Retrieves the {@link Currency} of the {@link PricedItemDataItem}
 * of an account given the account id.
 * @param {EngineAccessor} accessor 
 * @param {number} accountId 
 * @returns {Currency|undefined} <code>undefined</code> is returned if the account 
 * is not valid.
 */
export function getCurrencyForAccountId(accessor, accountId) {
    const pricedItemDataItem = getPricedItemDataItemForAccountId(accessor, accountId);
    if (pricedItemDataItem) {
        return getCurrency(pricedItemDataItem.currency || accessor.getBaseCurrencyCode());
    }
}


/**
 * Returns a Map whose keys are the priced item ids and whose values are arrays
 * containing the account ids of the accounts referring to those priced item ids.
 * @param {EngineAccessor} accessor 
 * @param {number} [parentAccountId]   Optional account id to start from, if given the
 * descendants of this account are added, otherwise all the accounts in the accessor
 * are added.
 * @returns {Map}
 */
export function getAccountIdsByPricedItemId(accessor, parentAccountId) {
    const accountIdsByPricedItemId = new Map();
    accessor.getPricedItemIds().forEach((id) =>
        accountIdsByPricedItemId.set(id, []));
    
    if (parentAccountId) {
        addAccountIdsToPricedItemMap(accessor, parentAccountId, accountIdsByPricedItemId);
    }
    else {
        for (let name in A.AccountCategory) {
            const rootAccountId = accessor.getCategoryRootAccountId(name);
            addAccountIdsToPricedItemMap(accessor, rootAccountId, 
                accountIdsByPricedItemId);
        }
    }

    return accountIdsByPricedItemId;
}


function addAccountIdsToPricedItemMap(accessor, accountId, accountIdsByPricedItemId) {
    const accountDataItem = accessor.getAccountDataItemWithId(accountId);

    let accountIds = accountIdsByPricedItemId.get(accountDataItem.pricedItemId);
    if (!accountIds) {
        accountIds = [];
        accountIdsByPricedItemId.set(accountDataItem.pricedItemId, accountIds);
    }
    accountIds.push(accountId);

    if (accountDataItem.childAccountIds) {
        accountDataItem.childAccountIds.forEach((childId) => 
            addAccountIdsToPricedItemMap(accessor, childId, accountIdsByPricedItemId));
    }
}

