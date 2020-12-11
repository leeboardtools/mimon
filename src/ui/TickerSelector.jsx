import React from 'react';
import PropTypes from 'prop-types';
import { getQuantityDefinition } from '../util/Quantities';
import { Tooltip } from '../util-ui/Tooltip';
import { MultiColumnList } from '../util-ui/MultiColumnList';


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

        this._multiColumnRef = React.createRef();

        this.onActivateItem = this.onActivateItem.bind(this);
        this.onItemClick = this.onItemClick.bind(this);
        this.onItemKeyDown = this.onItemKeyDown.bind(this);

        this.getItemKey = this.getItemKey.bind(this);
        this.renderTicker = this.renderTicker.bind(this);

        this.state = {
            activeItemIndex: 0,
        };
    }


    focus() {
        if (this._multiColumnRef.current) {
            this._multiColumnRef.current.focus();
        }
    }


    onActivateItem(index) {
        this.setState({
            activeItemIndex: index,
        });
    }


    onItemClick(e, index, ticker, isSelected) {
        this.onActivateItem(index);

        const { onTickerSelect } = this.props;
        if (onTickerSelect) {
            onTickerSelect(ticker, !isSelected);
        }
    }


    onItemKeyDown(e, index, ticker, isSelected) {
        if (e.key === ' ') {
            this.onItemClick(e, index, ticker, isSelected);
            e.preventDefault();
        }
    }


    getItemKey(index) {
        const tickerEntry = this.props.tickerEntries[index];
        if (tickerEntry) {
            return tickerEntry.ticker;
        }
        return index;
    }


    renderTicker(index, isActive, ref) {
        const tickerEntry = this.props.tickerEntries[index];
        if (tickerEntry) {
            let { disabled, accessor,
                noTickerTooltips } = this.props;

            const defaultPriceQuantityDefinition 
                = accessor.getDefaultPriceQuantityDefinition();

            const { ticker, isSelected, retrievedPrice, errorMsg,
                pricedItemDataItem } = tickerEntry;
            let className = 'TickerSelector-item';
            //className = 'list-group-item';
            if (disabled) {
                className += ' disabled';
            }
            if (isActive) {
                className += ' active';
            }

            let tickerClassName = 'col ticker-base';

            let tickerComponent = ticker;
            if (!noTickerTooltips && pricedItemDataItem && pricedItemDataItem.name) {
                tickerComponent = <Tooltip tooltip = {pricedItemDataItem.name}>
                    {ticker}
                </Tooltip>;
            }

            tickerComponent = <label className = "">
                <input className = "form-check-input" type="checkbox"
                    checked = {isSelected}
                    readOnly
                    tabIndex = {-1}
                />
                {tickerComponent}
            </label>;


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
            
            return <li key = {ticker}
                className = {className}
                onClick = {(e) => this.onItemClick(e, index, ticker, isSelected)}
                onKeyDown = {(e) => this.onItemKeyDown(e, index, ticker, isSelected)}
                disabled = {disabled}
                tabIndex = {-1} // We don't want each item tab-able...
                ref = {ref}
            >
                <div className = "row">
                    <div className = {tickerClassName}>
                        {tickerComponent}
                    </div>
                    <div className = {statusClassName}>
                        {statusMsg}
                    </div>
                </div>
            </li>;
        }
    }


    render() {
        const { tickerEntries } = this.props;
        const { activeItemIndex, } = this.state;

        return <MultiColumnList
            itemCount = {tickerEntries.length}
            getItemKey = {this.getItemKey}
            onRenderItem = {this.renderTicker}

            activeItemIndex = {activeItemIndex}
            onActivateItem = {this.onActivateItem}

            classExtras = "TickerSelector"

            ref = {this._multiColumnRef}
        />;
    }
}

TickerSelector.propTypes = {
    accessor: PropTypes.object.isRequired,
    tickerEntries: PropTypes.arrayOf(PropTypes.object).isRequired,
    onTickerSelect: PropTypes.func,
    disabled: PropTypes.bool,
    noTickerTooltips: PropTypes.bool,
};
