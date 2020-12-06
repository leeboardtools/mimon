import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { getQuantityDefinition } from '../util/Quantities';


/**
 * @typedef {object} TickerSelector~TickerEntry
 * @property {PricedItemDataItem} [pricedItemDataItem]
 * @property {string} ticker
 * @property {boolean} isSelected
 * @property {string} [errorMsg] If present this is displayed in place of the
 * retrieved price.
 * @property {undefined|number|string} [retrievedPrice] If <code>undefined</code> 
 * the ticker has not been retrieved or attempted to be retrieved. If a string then
 * it will be displayed, otherwise if isNaN(retrievedPrice) returns true then a failure
 * message will be displayed, otherwise retrievedPrice will be displayed.
 */


/**
 * React component for selecting tickers.
 */
export class TickerSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let { tickerEntries, onTickerSelect, disabled, accessor } = this.props;

        onTickerSelect = onTickerSelect || (() => {});

        const defaultPriceQuantityDefinition 
            = accessor.getDefaultPriceQuantityDefinition();

        const tickerItems = [];
        tickerEntries.forEach((tickerEntry) => {
            const { ticker, isSelected, retrievedPrice, errorMsg } = tickerEntry;
            let className = 'list-group-item';
            if (disabled) {
                className += ' disabled';
            }

            let tickerClassName = 'col ticker-base';
            if (isSelected) {
                tickerClassName += ' dropdown-item-checked';
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
                    const { pricedItemDataItem } = tickerEntry;
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
                        {ticker}
                    </div>
                    <div className = {statusClassName}>
                        {statusMsg}
                    </div>
                </div>
            </div>;
            tickerItems.push(item);
        });

        // TODO: We need a multi-column selector...
        return <div>
            <div>
                {tickerItems}
            </div>
        </div>;
    }
}

TickerSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    tickerEntries: PropTypes.arrayOf(PropTypes.object).isRequired,
    onTickerSelect: PropTypes.func,
    disabled: PropTypes.bool,
};
