import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from '../util-ui/DropdownField';

/**
 * Dropdown component for selecting a priced item.
 * @class
 */
export function PricedItemSelector(props) {
    const { accessor, pricedItemEntries, selectedPricedItemId, 
        ...passThroughProps } = props;
    const items = [];
    pricedItemEntries.forEach((entry) => {
        const { pricedItemId } = entry;

        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        items.push({
            value: pricedItemId,
            text: pricedItemDataItem.name || pricedItemDataItem.currency,
        });
    });

    return <DropdownField
        {...passThroughProps}
        items={items}
        value={selectedPricedItemId}
    />;
}

/**
 * @typedef {object} PricedItemSelector~PricedItemEntry
 * @property {number}   pricedItemId
 */

/**
 * @typedef {object}    PricedItemSelector~propTypes
 */
PricedItemSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    id: PropTypes.string,
    pricedItemEntries: PropTypes.array.isRequired,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    selectedPricedItemId: PropTypes.number,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
};
