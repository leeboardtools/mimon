import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from '../util-ui/DropdownField';
import { userMsg } from '../util/UserMessages';


/**
 * Dropdown field component for selecting an account.
 * @class
 */
export function AccountSelector(props) {
    const { accessor, accountEntries, selectedAccountId, 
        disabledRoot,
        ...passThroughProps } = props;
    const items = [];
    if (disabledRoot) {
        items.push({
            value: selectedAccountId,
            text: userMsg('AccountSelector-disabled_root'),
        });
    }
    else {
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
            items.push({
                value: accountId,
                text: accountDataItem.name,
                indent: parentStack.length,
            });

            parentStack.push(accountDataItem);
        });
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
 */
AccountSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    id: PropTypes.string,
    accountEntries: PropTypes.array.isRequired,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    selectedAccountId: PropTypes.number,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    disabledRoot: PropTypes.bool,
};
