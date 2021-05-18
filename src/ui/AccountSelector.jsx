import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from '../util-ui/DropdownField';
import { DropdownSelector } from '../util-ui/DropdownSelector';
import { userMsg } from '../util/UserMessages';


/**
 * @typedef {object} addAccountIdsToAccountEntriesFilterCallback~Result
 * @property {boolean} [skipAccountId]
 * @property {boolean} [skipChildren]
 * @property {boolean} [disabled]
 */


/**
 * Filter callback for {@link addAccountIdsToAccountEntries}
 * If an object is returned, the object should be a
 * {@link addAccountIdsToAccountEntriesFilterCallback~Result}, otherwise
 * if the result is falsy then the account id will be excluded.
 * @callback addAccountIdsToAccountEntriesFilterCallback
 * @param {number} accountId
 * @returns {addAccountIdsToAccountEntriesFilterCallback~Result|*}
 */

/**
 * Optional callback for {@link addAccountIdsToAccountEntries} for generating the
 * label for the account. One option is to use {@link }
 * @callback addAccountIdsToAccountEntriesLabelCallback
 * @param {EngineAccessor} accessor
 * @param {AccountDataItem} accountDataItem
 * @returns {string}
 */

/**
 * @typedef addAccountIdsToAccountEntriesArgs
 * @property {EngineAccessor} accessor 
 * @property {AccountSelector~AccountEntry} accountEntries
 * @property {number[]} accountIds
 * @property {addAccountIdsToAccountEntriesFilterCallback} [filter]
 * @property {boolean} [sortByName] This is normally set to false for the root account
 * ids, child accounts are always sorted by name.
 * @property {addAccountIdsToAccountEntriesLabelCallback} [labelCallback]
 */

/**
 * Helper for building the accountEntries property for {@link AccountSelector}.
 * @param {addAccountIdsToAccountEntriesArgs} args
 */
export function addAccountIdsToAccountEntries(args) {
    let { accessor, accountEntries, accountIds, filter, sortByName,
        labelCallback, } = args;
    filter = filter || (() => true);

    const accountDataItems = accountIds.map((accountId) => 
        accessor.getAccountDataItemWithId(accountId));
    if (sortByName) {
        accountDataItems.sort((a, b) =>
            a.name.localeCompare(b.name));
    }

    args = Object.assign({}, args);

    accountDataItems.forEach((accountDataItem) => {
        const accountId = accountDataItem.id;

        let filterResult = filter(accountId);
        if (typeof filterResult !== 'object') {
            if (!filterResult) {
                return;
            }
            else {
                filterResult = {};
            }
        }

        if (!filterResult.skipAccountId) {
            const accountEntry = {
                accountId: accountId,
            };
            if (filterResult.disabled) {
                accountEntry.disabled = true;
            }
            if (labelCallback) {
                accountEntry.text = labelCallback(accessor, accountDataItem);
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
 * @typedef accountEntriesToItemsArgs
 * @property {EngineAccessor} accessor 
 * @property {AccountSelector~AccountEntry} accountEntries
 * @property {boolean} [noIndent=false]
 */


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
export function accountEntriesToItems({ accessor, accountEntries, noIndent, }) {
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
        };
        if (!noIndent) {
            item.indent = parentStack.length;
        }
        if (entry.disabled) {
            item.disabled = true;
        }
        
        items.push(item);

        parentStack.push(accountDataItem);
    });

    return items;
}


/**
 * Dropdown component for selecting an account.
 * @class
 */
export const AccountSelector = React.forwardRef(
    function _AccountSelector(props, ref) {
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
            items = accountEntriesToItems({
                accessor: accessor, 
                accountEntries: accountEntries,
            });
        }

        return <DropdownSelector
            {...passThroughProps}
            items = {items}
            value = {selectedAccountId}
            ref = {ref}
        />;
    }
);

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
    accountEntries: PropTypes.array.isRequired,
    accountEntriesAreItems: PropTypes.bool,
    ariaLabel: PropTypes.string,
    selectedAccountId: PropTypes.number,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    disabledRoot: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


/**
 * Dropdown field component for selecting an account.
 * @class
 */
export const AccountSelectorField = React.forwardRef(
    function _AccountSelectorField(props, ref) {
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
            items = accountEntriesToItems({
                accessor: accessor, 
                accountEntries: accountEntries,
            });
        }

        return <DropdownField
            {...passThroughProps}
            items = {items}
            value = {selectedAccountId}
            ref = {ref}
        />;
    }
);

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
AccountSelectorField.propTypes = {
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
