import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import { YMDDate } from '../util/YMDDate';
import { CellDateEditor } from '../util-ui/CellDateEditor';
import { TickerSelector } from './TickerSelector';
import { ContentFramer } from '../util-ui/ContentFramer';
import { asyncGetUpdatedPricedItemPrices } from '../engine/PriceRetriever';
import deepEqual from 'deep-equal';
import { setFocus } from '../util/ElementUtils';
import { PageTitle } from '../util-ui/PageTitle';
import { Row, Col } from '../util-ui/RowCols';
import { Button } from '../util-ui/Button';


function equalBool(a, b) {
    return (a && b) || (!a && !b);
}

function updateTickerEntries(tickerEntriesByTicker, tickers, callback) {
    if (!tickerEntriesByTicker) {
        return;
    }

    tickers.forEach((ticker) => {
        const tickerEntry = tickerEntriesByTicker.get(ticker);
        if (tickerEntry) {
            callback(tickerEntry);
        }
    });
}


/**
 * @typedef {object} PriceRetrieverWindow~TickerSelection
 * @property {boolean} [selectDefaults]
 * @property {string[]} [selectedTickers]
 */

function addPricedItemsToTickers(accessor, pricedItemType, 
    tickerEntriesByTicker, defaultTickers) {

    const ids = accessor.getPricedItemIdsForType(pricedItemType);
    if (ids) {
        const myTickerEntries = [];
        ids.forEach((id) => {
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(id);
            const { ticker, onlineUpdateType, isInactive, isHidden } = pricedItemDataItem;
            if (ticker && onlineUpdateType && !isInactive) {
                myTickerEntries.push({ 
                    pricedItemDataItem: pricedItemDataItem,
                    ticker: ticker, 
                    isSelected: false, 
                });
                if (!isHidden) {
                    defaultTickers.add(ticker);
                }
            }
        });

        myTickerEntries.sort((a, b) => a.ticker.localeCompare(b.ticker));
        myTickerEntries.forEach((entry) => 
            tickerEntriesByTicker.set(entry.ticker, entry));
    }
}

/**
 * React component for retrieving prices.
 */
export class PriceRetrieverWindow extends React.Component {
    constructor(props) {
        super(props);

        this._retrieveRef = React.createRef();
        this._tickerSelectorRef = React.createRef();

        this.onRetrievePrices = this.onRetrievePrices.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onTickerSelect = this.onTickerSelect.bind(this);

        this.onSelectAllTickers = this.onSelectAllTickers.bind(this);
        this.onSelectNoTickers = this.onSelectNoTickers.bind(this);
        this.onSelectDefaultTickers = this.onSelectDefaultTickers.bind(this);

        const { tickerEntriesByTicker, defaultTickers } = this.getTickers();

        // TEST!!
        /*
        const addTestEntry = (ticker) => {
            tickerEntriesByTicker.set(ticker, { ticker: ticker });
        };
        addTestEntry('A');
        addTestEntry('B');
        addTestEntry('C');
        addTestEntry('D');
        addTestEntry('E');
        addTestEntry('F');
        addTestEntry('G');
        addTestEntry('H');
        addTestEntry('I');
        addTestEntry('J');
        addTestEntry('K');
        addTestEntry('L');
        addTestEntry('M');
        addTestEntry('N');
        addTestEntry('O');
        addTestEntry('P');
        addTestEntry('Q');
        addTestEntry('R');
        addTestEntry('S');
        addTestEntry('T');
        addTestEntry('U');
        addTestEntry('V');
        addTestEntry('W');
        addTestEntry('X');
        addTestEntry('Y');
        addTestEntry('Z');
        */


        // Load all the allTickerEntries...
        const { tickerSelection } = this.props;

        let tickersToSelect;
        let selectDefaults;
        if (!tickerSelection || tickerSelection.selectDefaults) {
            // Load the defaults...
            tickersToSelect = defaultTickers;
            selectDefaults = true;
        }
        else {
            tickersToSelect = tickerSelection.selectedTickers;
        }

        if (tickersToSelect) {
            updateTickerEntries(
                tickerEntriesByTicker,
                tickersToSelect,
                (tickerEntry) => {
                    tickerEntry.isSelected = true;
                });
        }

        this.state = {
            isRetrieving: false,
            tickerEntriesByTicker: tickerEntriesByTicker,
            defaultTickers: defaultTickers,
            selectDefaults: selectDefaults,
            ymdDateFrom: new YMDDate().toString(),
            ymdDateTo: new YMDDate().toString(),
        };
    }


    componentDidMount() {
        process.nextTick(() => {
            if (this._retrieveRef.current && !this._retrieveRef.current.disabled) {
                setFocus(this._retrieveRef.current);
            }
            else if (this._tickerSelectorRef.current) {
                setFocus(this._tickerSelectorRef.current);
            }
        });
    }


    componentWillUnmount() {
    }


    getTickers() {
        const tickerEntriesByTicker = new Map();
        const defaultTickers = new Set();

        const { accessor } = this.props;
        addPricedItemsToTickers(accessor, PI.PricedItemType.SECURITY, 
            tickerEntriesByTicker, defaultTickers);
        addPricedItemsToTickers(accessor, PI.PricedItemType.MUTUAL_FUND, 
            tickerEntriesByTicker, defaultTickers);
        
        return {
            tickerEntriesByTicker: tickerEntriesByTicker,
            defaultTickers: defaultTickers,
        };
    }


    updateTickerEntry(ticker, changes) {
        this.setState((state) => {
            const { tickerEntriesByTicker } = state;

            const tickerEntry = tickerEntriesByTicker.get(ticker);
            if (tickerEntry) {
                const newTickerEntry = Object.assign({}, tickerEntry, changes);
                if (!deepEqual(tickerEntry, newTickerEntry)) {
                    const newTickerEntriesByTicker = new Map(tickerEntriesByTicker);
                    newTickerEntriesByTicker.set(ticker, newTickerEntry);

                    return {
                        tickerEntriesByTicker: newTickerEntriesByTicker,
                    };
                }
            }
        });
    }


    onRetrievePrices() {
        if (this.state.isRetrieving) {
            return;
        }

        const { tickerEntriesByTicker, selectDefaults } = this.state;
        const newTickerEntriesByTicker = new Map(tickerEntriesByTicker);
        let isChanges;

        const tickers = [];
        const pricedItemIds = [];
        tickerEntriesByTicker.forEach((tickerEntry) => {
            if (tickerEntry.isSelected) {
                tickers.push(tickerEntry.ticker);
                const { pricedItemDataItem } = tickerEntry;
                if (pricedItemDataItem) {
                    pricedItemIds.push(pricedItemDataItem.id);
                }

                if (tickerEntry.errorMsg) {
                    newTickerEntriesByTicker.set(tickerEntry.ticker,
                        Object.assign({}, tickerEntry, {
                            errorMsg: undefined,
                        }));
                    isChanges = true;
                }
            }
        });

        if (!tickers.length) {
            return;
        }


        const { updateTickerSelection } = this.props;
        if (updateTickerSelection) {
            updateTickerSelection({
                selectDefaults: selectDefaults,
                selectedTickers: tickers,
            });
        }

        const stateUpdates = {
            isRetrieving: true,
        };
        if (isChanges) {
            stateUpdates.tickerEntriesByTicker = newTickerEntriesByTicker;
        }

        this.setState(stateUpdates);

        process.nextTick(async () => {
            const { accessor } = this.props;
            const args = {
                pricedItemManager: accessor,
                pricedItemIds: pricedItemIds,
                ymdDateA: this.state.ymdDateTo,
                ymdDateB: this.state.ymdDateFrom,
                callback: (callbackArgs) => {
                    if (this.state.isCancel) {
                        callbackArgs.isCancel = true;
                    }

                    const { ticker, err, prices } = callbackArgs;
                    if (err) {
                        this.updateTickerEntry(ticker, {
                            errorMsg: err.toString(),
                        });
                    }
                    if (prices && prices.length) {
                        this.updateTickerEntry(ticker, {
                            retrievedPrice: prices[0].close,
                            errorMsg: undefined,
                        });
                    }
                },
            };

            const result = await asyncGetUpdatedPricedItemPrices(args);
            const { successfulEntries, failedEntries } = result;
            if (successfulEntries && successfulEntries.length) {
                const errors = [];
                for (let i = 0; i < successfulEntries.length; ++i) {
                    const entry = successfulEntries[i];
                    try {
                        await accessor.asyncAddPrices(entry.pricedItemId, entry.prices);
                    }
                    catch (e) {
                        errors.push({
                            ticker: entry.ticker,
                            errorMsg: e.toString(),
                        });
                    }
                }

                if (errors.length) {
                    errors.forEach((error) => {
                        this.updateTickerEntry(error.ticker, {
                            errorMsg: error.errorMsg,
                        });
                    });
                }
            }

            if (failedEntries && failedEntries.length) {
                console.log(failedEntries);
            }

            this.setState({
                isRetrieving: false,
                isCancel: false,
            });
        });
    }


    onCancel() {
        if (!this.state.isRetrieving) {
            return;
        }

        this.setState({
            isCancel: true,
        });
    }


    _selectTickers(tickersToSelect, selectDefaults) {
        if (!tickersToSelect) {
            return;
        }

        if (!(tickersToSelect instanceof Set)) {
            tickersToSelect = new Set(tickersToSelect);
        }

        this.setState((state) => {
            const { tickerEntriesByTicker } = state;

            let isChange;
            const newTickerEntriesByTicker = new Map();
            tickerEntriesByTicker.forEach((tickerEntry, key) => {
                const isSelected = tickersToSelect.has(tickerEntry.ticker);
                if (!equalBool(isSelected, tickerEntry.isSelected)) {
                    tickerEntry = Object.assign({}, tickerEntry, {
                        isSelected: isSelected,
                    });

                    isChange = true;
                }
                newTickerEntriesByTicker.set(key, tickerEntry);
            });

            if (isChange) {
                return {
                    selectDefaults: selectDefaults,
                    tickerEntriesByTicker: newTickerEntriesByTicker,
                };
            }
        });
    }

    onSelectAllTickers() {
        const { tickerEntriesByTicker } = this.state;
        this._selectTickers(tickerEntriesByTicker.keys(), false);
    }


    onSelectNoTickers() {
        this._selectTickers([], false);
    }


    onSelectDefaultTickers() {
        const { defaultTickers } = this.state;
        this._selectTickers(defaultTickers, true);
    }


    renderTickerButton(labelId, onClick) {
        const label = userMsg(labelId);
        return <Button
            classExtras = "Btn-secondary PriceRetrieverWindow-ticker-select-button"
            aria-label = {label}
            onClick = {onClick}
            disabled = {this.state.isRetrieving}
        >
            {label}
        </Button>;
    }


    onTickerSelect(ticker, isSelect) {
        this.updateTickerEntry(ticker, {
            isSelected: isSelect,
        });
    }


    renderTickers() {
        const { tickerEntriesByTicker, isRetrieving } = this.state;
        const tickerEntries = Array.from(tickerEntriesByTicker.values());

        let style;
        const { tickersHeight } = this.state;
        if ((tickersHeight !== undefined) && (tickersHeight > 0)) {
            style = {
                height: tickersHeight,
            };
        }

        return <div className = "W-100 H-100" style = {style}>
            <div className = "FlexC FlexC-row W-inherit H-inherit M-1">
                <div className = "FlexI-grow-1 Pl-3 Pb-2 H-inherit">
                    <TickerSelector
                        accessor = { this.props.accessor }
                        tickerEntries = {tickerEntries}
                        onTickerSelect = {
                            (ticker, isSelect) => this.onTickerSelect(ticker, isSelect)}
                        disabled = {isRetrieving}
                        ref = {this._tickerSelectorRef}
                    />
                </div>
                <div className = "M-4">
                    <Row>
                        {this.renderTickerButton('PriceRetrieverWindow-select_all',
                            this.onSelectAllTickers)}
                    </Row>
                    <Row>
                        {this.renderTickerButton('PriceRetrieverWindow-select_none',
                            this.onSelectNoTickers)}
                    </Row>
                    <Row>
                        {this.renderTickerButton('PriceRetrieverWindow-select_defaults',
                            this.onSelectDefaultTickers)}
                    </Row>
                </div>
            </div>
        </div>;
    }


    renderDateComponent(labelId, statePropertyName) {
        const value = this.state[statePropertyName];
        const label = userMsg(labelId);
        const id = 'PriceRetrieverWindow_' + statePropertyName;

        const dateEditor = <CellDateEditor
            id = {id}
            value = {value}
            ariaLabel = {label}
            onChange = {(ymdDate) => {
                const changes = {};
                changes[statePropertyName] = ymdDate;
                this.setState(changes);
            }}
            disabled = {this.state.isRetrieving}
        />;

        return <Row>
            <Col classExtras = "Text-right VAlign-middle">
                <label htmlFor = {id} className = "Mt-1">
                    {label}
                </label>
            </Col>
            <Col classExtras = "Text-left VAlign-middle">
                {dateEditor}
            </Col>
        </Row>;
    }


    render() {
        const { state } = this;
        const tickersComponent = this.renderTickers();

        let button;
        if (state.isRetrieving) {
            button = <Button
                classExtras = "Btn-primary"
                aria-label = "Cancel"
                onClick = {() => this.onCancel()}>
                {userMsg('PriceRetrieverWindow-cancel_button')}
            </Button>;
        }
        else {
            const { tickerEntriesByTicker } = state;
            let anyTickerSelected;
            for (let key of tickerEntriesByTicker.keys()) {
                if (tickerEntriesByTicker.get(key).isSelected) {
                    anyTickerSelected = true;
                    break;
                }
            }
            button = <Button
                classExtras = "Btn-primary"
                aria-label = "Retrieve Prices"
                onClick = {() => this.onRetrievePrices()}
                disabled = {!anyTickerSelected}
                ref = {this._retrieveRef}
            >
                {userMsg('PriceRetrieverWindow-retrieve_button')}
            </Button>;
        }


        const fromDate = this.renderDateComponent(
            'PriceRetrieverWindow-from_date',
            'ymdDateFrom');

        const toDate = this.renderDateComponent(
            'PriceRetrieverWindow-from_date',
            'ymdDateTo');

        const controlsClassName = 'Py-2 Row-justify-content-center '
            + ' PriceRetrieverWindow-controls';
        const header = <div>
            <Row>
                <Col>
                    <PageTitle>
                        {userMsg('PriceRetrieverWindow-title')}
                    </PageTitle>
                </Col>
            </Row>
            <Row classExtras = {controlsClassName} 
            >
                <Col classExtras = "PriceRetrieverWindow-retrieveButton">
                    {button}
                </Col>
                <Col classExtras = "PriceRetrieverWindow-dateControl">
                    {fromDate}
                </Col>
                <Col classExtras = "PriceRetrieverWindow-dateControl">
                    {toDate}
                </Col>
            </Row>
        </div>;
        return <ContentFramer
            onRenderHeader = {() => header}
            onRenderContent = {() => tickersComponent}
            classExtras = "PriceRetrieverWindow"
        />;
    }
}

PriceRetrieverWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    contextMenuItems: PropTypes.array,
    tickerSelection: PropTypes.object,
    updateTickerSelection: PropTypes.func,
};