import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from '../util-ui/DropdownField';
import { userMsg } from '../util/UserMessages';


/**
 * @typedef {object} addAccountIdsToAccountEntriesFilterCallback~Result
 * @property {boolean} [skipAccountId]
 * @property {boolean} [skipChildren]
 * @property {boolean} [disabled]
 */


/**
 * Filter callback for {@link addAccountIdsToAccountEntries}
 * @callback addAccountIdsToAccountEntriesFilterCallback
 * @param {number} accountId
 * @returns {addAccountIdsToAccountEntriesFilterCallback~Result|undefined}
 */

/**
 * @typedef addAccountIdsToAccountEntriesArgs
 * @property {EngineAccessor} accessor 
 * @property {AccountSelector~AccountEntry} accountEntries
 * @property {number[]} accountIds
 * @property {addAccountIdsToAccountEntriesFilterCallback} [filter]
 * @property {boolean} [sortByName]
 */

/**
 * Helper for building the accountEntries property for {@link AccountSelector}.
 * @param {addAccountIdsToAccountEntriesArgs} args
 */
export function addAccountIdsToAccountEntries(args) {
    let { accessor, accountEntries, accountIds, filter, sortByName, } = args;
    filter = filter || (() => undefined);

    const accountDataItems = accountIds.map((accountId) => 
        accessor.getAccountDataItemWithId(accountId));
    if (sortByName) {
        accountDataItems.sort((a, b) =>
            a.name.localeCompare(b.name));
    }

    args = Object.assign({}, args);

    accountDataItems.forEach((accountDataItem) => {
        const accountId = accountDataItem.id;

        const filterResult = filter(accountId) || {};
        if (!filterResult.skipAccountId) {
            const accountEntry = {
                accountId: accountId,
            };
            if (filterResult.disabled) {
                accountEntry.disabled = true;
            }
            accountEntries.push(accountEntry);
        }
        if (!filterResult.skipChildren) {
            if (accountDataItem.childAccountIds) {                    
                args.accountIds = accountDataItem.childAccountIds;
                args.sortByName = true;

                addAccountIdsToAccountEntries(args);
            }
        }
    });
}


/**
 * Converts an array of {@link AccountSelector~AccountEntry}s into items that
 * can be used directly by {@link AccountSelector} with the accountEntriesAreItems
 * property set to <code>true</code>.
 * <p>
 * This is to avoid rebuilding the item list each time the selector is rendered.
 * @param {EngineAccessor} accessor 
 * @param {AccountSelector~AccountEntry} accountEntries
 * @returns {Array}
 */
export function accountEntriesToItems(accessor, accountEntries) {
    const items = [];
    const parentStack = [];
    accountEntries.forEach((entry) => {
        const { accountId } = entry;
        while (parentStack.length) {
            const parent = parentStack[parentStack.length - 1];
            if (parent.childAccountIds 
            && (parent.childAccountIds.indexOf(accountId) >= 0)) {
                break;
            }
            else {
                --parentStack.length;
            }
        }

        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const item = {
            value: accountId,
            text: entry.text || accountDataItem.name,
            indent: parentStack.length,
        };
        if (entry.disabled) {
            item.disabled = true;
        }
        
        items.push(item);

        parentStack.push(accountDataItem);
    });

    return items;
}


/**
 * Dropdown field component for selecting an account.
 * @class
 */
export function AccountSelector(props) {
    const { accessor, accountEntries, accountEntriesAreItems,
        selectedAccountId, disabledRoot,
        ...passThroughProps } = props;
    let items = [];
    if (disabledRoot) {
        items.push({
            value: -1,
            text: userMsg('AccountSelector-disabled_root'),
        });
    }
    else if (accountEntriesAreItems) {
        items = accountEntries;
    }
    else {
        items = accountEntriesToItems(accessor, accountEntries);
    }

    return <DropdownField
        {...passThroughProps}
        items={items}
        value={selectedAccountId}
    />;
}

/**
 * @typedef {object}    AccountSelector~AccountEntry
 * @property {number}   accountId
 */

/**
 * @typedef {object}    AccountSelector~propTypes
 * @property {AccountSelector~AccountEntry} accountEntries
 * @property {boolean} [accountEntriesAreItems=false] Set to true if
 * accountEntries has been converted to items via {@link accountEntriesToItems}.
 */
AccountSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    id: PropTypes.string,
    accountEntries: PropTypes.array.isRequired,
    accountEntriesAreItems: PropTypes.bool,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    selectedAccountId: PropTypes.number,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    disabledRoot: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    prependComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    appendComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
};
