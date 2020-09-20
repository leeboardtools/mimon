import React from 'react';
import PropTypes from 'prop-types';
import { PricedItemSelector } from './PricedItemSelector';
import * as PI from '../engine/PricedItems';


/**
 * Component for selecting a currency priced item.
 * @class
 */
export function CurrencyPricedItemSelector(props) {
    const { accessor, selectedCurrency, onChange, ...passThroughProps } = props;

    const itemIds = accessor.getPricedItemIdsForType(PI.PricedItemType.CURRENCY.name);
    const baseCurrencyId = (props.noBaseCurrency) 
        ? accessor.getBaseCurrencyPricedItemId()
        : undefined;

    const items = [];
    itemIds.forEach((id) => {
        if (id !== baseCurrencyId) {
            items.push({
                pricedItemId: id,
            });
        }
    });

    const selectedPricedItemId = (selectedCurrency)
        ? accessor.getCurrencyPricedItemId(selectedCurrency)
        : accessor.getBaseCurrencyPricedItemId();
    return <PricedItemSelector
        {...passThroughProps}
        accessor={accessor}
        pricedItemEntries={items}
        onChange={(e) => {
            if (onChange) {
                const id = event.target.value;
                let currency;
                if (id !== accessor.getBaseCurrencyPricedItemId()) {
                    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(id);
                    currency = pricedItemDataItem.currency;
                }
                onChange(currency);
            }
        }}
        selectedPricedItemId={selectedPricedItemId}
    />;
}

/**
 * @callback {CurrencyPricedItemSelector~onChange}
 * @param {string}  currency
 */

/**
 * @typedef {object} CurrencyPricedItemSelector~propTypes
 */
CurrencyPricedItemSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    selectedCurrency: PropTypes.string,
    noBaseCurrency: PropTypes.bool,
    shortNames: PropTypes.bool,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};
