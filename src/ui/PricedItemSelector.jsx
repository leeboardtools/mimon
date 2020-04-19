import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from '../util-ui/DropdownField';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import { getCurrency } from '../util/Currency';

/**
 * Dropdown component for selecting a priced item.
 * @class
 */
export function PricedItemSelector(props) {
    const { accessor, pricedItemEntries, selectedPricedItemId, 
        ...passThroughProps } = props;

    const baseCurrencyId = accessor.getBaseCurrencyPricedItemId();

    const items = [];
    pricedItemEntries.forEach((entry) => {
        const { pricedItemId } = entry;

        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        const type = PI.getPricedItemType(pricedItemDataItem.type);
        let text;
        switch (type) {
        case PI.PricedItemType.CURRENCY :
            if (pricedItemId === baseCurrencyId) {
                text = userMsg('PricedItemSelector-baseCurrency_label',
                    pricedItemDataItem.currency);
            }
            else {
                const currency = getCurrency(pricedItemDataItem.currency);
                text = userMsg('PricedItemSelector-currency_label',
                    currency.getCode(), currency.getName());
            }
            break;
        
        default :
            if (type.hasTickerSymbol) {
                text = userMsg('PricedItemSelector-ticker_label', 
                    pricedItemDataItem.ticker,
                    pricedItemDataItem.name);
            }
            else {
                text = pricedItemDataItem.name;
            }
        }
        items.push({
            value: pricedItemId,
            text: text,
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


