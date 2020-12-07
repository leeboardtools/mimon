import React from 'react';
import PropTypes from 'prop-types';
import { getQuantityDefinition } from '../util/Quantities';
import { Tooltip } from '../util-ui/Tooltip';


/**
 * @typedef {object} TickerSelector~TickerEntry
 * @property {PricedItemDataItem} [pricedItemDataItem]
 * @property {string} ticker
 * @property {boolean} isSelected
 * @property {string} [errorMsg] If present this is displayed in place of the
 * retrieved price.
 * @property {undefined|number|string} [retrievedPrice] If a number, it will
 * be presented using the price quantity definition from either the priced
 * item if there is one or the default from the accessor.
 */


/**
 * React component for selecting tickers.
 */
export class TickerSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let { tickerEntries, onTickerSelect, disabled, accessor,
            noTickerTooltips } = this.props;

        onTickerSelect = onTickerSelect || (() => {});

        const defaultPriceQuantityDefinition 
            = accessor.getDefaultPriceQuantityDefinition();

        const tickerItems = [];
        tickerEntries.forEach((tickerEntry) => {
            const { ticker, isSelected, retrievedPrice, errorMsg,
                pricedItemDataItem } = tickerEntry;
            let className = 'list-group-item';
            if (disabled) {
                className += ' disabled';
            }

            let tickerClassName = 'col ticker-base';
            if (isSelected) {
                tickerClassName += ' ticker-checked';
            }

            let tickerComponent = ticker;
            if (!noTickerTooltips && pricedItemDataItem && pricedItemDataItem.name) {
                tickerComponent = <Tooltip tooltip = {pricedItemDataItem.name}>
                    {ticker}
                </Tooltip>;
            }

            let statusClassName = 'col monetary-base';
            let statusMsg;
            if (errorMsg) {
                statusMsg = errorMsg;
                statusClassName += ' failed_msg';
            }
            else {
                statusMsg = retrievedPrice;
                if (typeof retrievedPrice === 'number') {
                    if (pricedItemDataItem) {
                        const { priceQuantityDefinition } = pricedItemDataItem;
                        const quantityDefinition = getQuantityDefinition(
                            priceQuantityDefinition)
                            || defaultPriceQuantityDefinition;
                        if (quantityDefinition) {
                            statusMsg = quantityDefinition.numberToValueText(
                                retrievedPrice);
                        }
                    }
                }

                statusClassName += ' success_msg';
            }
            
            const item = <div key = {ticker}
                className = {className}
                onClick = {(e) => onTickerSelect(ticker, !isSelected)}
                disabled = {disabled}
            >
                <div className = "row">
                    <div className = {tickerClassName}>
                        {tickerComponent}
                    </div>
                    <div className = {statusClassName}>
                        {statusMsg}
                    </div>
                </div>
            </div>;
            tickerItems.push(item);
        });

        // TODO: We need a multi-column selector...
        return <div className = "TickerSelector">
            {tickerItems}
        </div>;
    }
}

TickerSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    tickerEntries: PropTypes.arrayOf(PropTypes.object).isRequired,
    onTickerSelect: PropTypes.func,
    disabled: PropTypes.bool,
    noTickerTooltips: PropTypes.bool,
};
