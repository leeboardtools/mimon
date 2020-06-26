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
 * @property {string}   [placeholder = '...]    The string to appear in place
 * of the names that were left out.
 */

/**
 * Constructs a possibly shorted version of {@link getAccountAncestorName}. The
 * name is shortened if there are more than three accounts in the ancestor tree,
 * in which case only the root and the last two accounts are included.
 * @param {EngineAccessor} accessor 
 * @param {number} id 
 * @param {getShortAccountAncestorNamesOptions} [options]
 * @returns {string}
 */
export function getShortAccountAncestorNames(accessor, id, options) {
    options = options || {};
    const separator = options.separator || ':';

    const accountDataItems = getAncestorAccountDataItems(accessor, id);
    if (accountDataItems.length <= 3) {
        return buildAncestorNames(accountDataItems, separator);
    }

    const placeholder = options.placeholder || '...';
    return accountDataItems[accountDataItems.length - 1].name 
        + placeholder + accountDataItems[1].name
        + separator + accountDataItems[0].name;
}
