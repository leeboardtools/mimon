import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ActiveRowCollapsibleTable } from '../util-ui/ActiveRowTable';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { getQuantityDefinition } from '../util/Quantities';


/**
 * Component for displaying a list of priced items.
 */
export class PricedItemsList extends React.Component {
    constructor(props) {
        super(props);

        this.onPricedItemAdd = this.onPricedItemAdd.bind(this);
        this.onPricedItemModify = this.onPricedItemModify.bind(this);
        this.onPricedItemRemove = this.onPricedItemRemove.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onGetRowAtIndex = this.onGetRowAtIndex.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenRow = this.onOpenRow.bind(this);

        const { pricedItemTypeName } = this.props;
        const pricedItemType = PI.getPricedItemType(pricedItemTypeName);

        const cellClassName = 'm-0';
        const inputClassExtras = 'text-center';

        this._columnInfoDefs = {
            name: { key: 'name',
                label: userMsg('PricedItemsList-name'),
                ariaLabel: 'Name',
                propertyName: 'name',
                className: '',
                cellClassName: cellClassName,
            },
            description: { key: 'description',
                label: userMsg('PricedItemsList-description'),
                ariaLabel: 'Description',
                propertyName: 'description',
                className: '',
                cellClassName: cellClassName,
            },
            currency: { key: 'currency',
                label: userMsg('PricedItemsList-currency'),
                ariaLabel: 'Currency',
                propertyName: 'currency',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            quantityDefinition: { key: 'quantityDefinition',
                label: userMsg('PricedItemsList-quantityDefinition'),
                ariaLabel: 'Quantity Definition',
                propertyName: 'quantityDefinition',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            ticker: { key: 'ticker',
                label: userMsg('PricedItemsList-ticker'),
                ariaLabel: 'Ticker Symbol',
                propertyName: 'ticker',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            onlineSource: { key: 'onlineSource',
                label: userMsg('PricedItemsList-onlineSource'),
                ariaLabel: 'Online Source',
                propertyName: 'onlineSource',
                className: 'text-center',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            }
        };

        const columnInfos = [];
        if (pricedItemType.hasTickerSymbol) {
            columnInfos.push(this._columnInfoDefs.ticker);
            columnInfos.push(this._columnInfoDefs.onlineSource);
        }

        columnInfos.push(this._columnInfoDefs.name);
        columnInfos.push(this._columnInfoDefs.description);
        columnInfos.push(this._columnInfoDefs.currency);
        columnInfos.push(this._columnInfoDefs.quantityDefinition);


        this._hiddenPricedItemIds = new Set();

        this.state = {
            columnInfos: columnInfos,
            rowEntries: [],
        };

        this.state.rowEntries = this.buildRowEntries().rowEntries;
    }


    onPricedItemAdd(result) {
        if (this.isPricedItemIdDisplayed(result.newPricedItemDataItem.id)) {
            this.updateRowEntries();
        }
    }

    
    onPricedItemModify(result) {
        const { id } = result.newPricedItemDataItem;
        for (let rowEntry of this.state.rowEntries) {
            if (rowEntry.pricedItemDataItem.id === id) {
                this.updateRowEntries();
                return;
            }
        }
    }


    onPricedItemRemove(result) {
        const { id } = result.removedPricedItemDataItem;
        for (let rowEntry of this.state.rowEntries) {
            if (rowEntry.pricedItemDataItem.id === id) {
                this.updateRowEntries();
                return;
            }
        }
    }


    componentDidMount() {
        this.props.accessor.on('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.on('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.on('pricedItemRemove', this.onPricedItemRemove);
    }

    componentWillUnmount() {
        this.props.accessor.off('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.off('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.off('pricedItemRemove', this.onPricedItemRemove);
    }


    componentDidUpdate(prevProps) {
        let rowsNeedUpdating = false;
        const { hiddenPricedItemIds, 
            showHiddenPricedItems } = this.props;

        if (!deepEqual(prevProps.hiddenPricedItemIds, hiddenPricedItemIds)) {
            this._hiddenPricedItemIds = new Set(hiddenPricedItemIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenPricedItems !== showHiddenPricedItems) {
            rowsNeedUpdating = true;
        }

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;
            const result = this.buildRowEntries();
            this.setState({
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
            });

            if (prevActiveRowKey !== result.activeRowKey) {
                const { onSelectPricedItem } = this.props;
                if (onSelectPricedItem) {
                    const pricedItemDataItem = (result.activeRowEntry)
                        ? result.activeRowEntry.pricedItemDataItem
                        : undefined;
                    onSelectPricedItem(pricedItemDataItem 
                        ? pricedItemDataItem.id 
                        : undefined);
                }
            }
        }
    }


    // Setting up the row entries:
    // Want to be able to filter what gets displayed.
    // Support summary rows for say pricedItem balances.
    buildRowEntries() {
        const rowEntries = [];
        const { accessor, pricedItemTypeName } = this.props;
        const pricedItemIds = accessor.getPricedItemIdsForType(pricedItemTypeName);

        pricedItemIds.forEach((id) => {
            this.addPricedItemIdToRowEntries(rowEntries, id);
        });

        let { activeRowKey } = this.state;
        let activeRowEntry;
        if (activeRowKey) {
            let currentIndex;
            for (currentIndex = 0; currentIndex < rowEntries.length; ++currentIndex) {
                if (rowEntries[currentIndex].key === activeRowKey) {
                    activeRowEntry = rowEntries[currentIndex];
                    break;
                }
            }
            if (currentIndex >= rowEntries.length) {
                // The active row is no longer visible...
                activeRowKey = undefined;
            }
        }

        return {
            rowEntries: rowEntries,
            activeRowKey: activeRowKey,
            activeRowEntry: activeRowEntry,
        };
    }


    addPricedItemIdToRowEntries(rowEntries, pricedItemId) {
        if (!this.isPricedItemIdDisplayed(pricedItemId)) {
            return;
        }

        const { accessor } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);

        const key = pricedItemDataItem.id.toString();
        const index = rowEntries.length;

        rowEntries.push({
            key: key,
            index: index,
            pricedItemDataItem: pricedItemDataItem,
        });
    }


    isPricedItemIdDisplayed(pricedItemId) {
        const { showHiddenPricedItems } = this.props;
        if (!showHiddenPricedItems && this._hiddenPricedItemIds.has(pricedItemId)) {
            return false;
        }
        
        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);
        if (!pricedItemDataItem) {
            return false;
        }

        if (pricedItemDataItem.isStandardCurrency) {
            return false;
        }

        return true;
    }


    updateRowEntries(activeRowKey) {
        this.setState((state) => {
            const rowEntries = this.buildRowEntries().rowEntries;
            return {
                rowEntries: rowEntries,
                activeRowKey: activeRowKey || state.activeRowKey,
            };
        });
    }


    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }


    onActivateRow(rowEntry) {
        this.setState({
            activeRowKey: rowEntry.key,
        });

        const { onSelectPricedItem } = this.props;
        if (onSelectPricedItem) {
            const { pricedItemDataItem } = rowEntry;
            onSelectPricedItem(pricedItemDataItem ? pricedItemDataItem.id : undefined);
        }
    }


    onOpenRow(rowEntry) {
        const { onChoosePricedItem } = this.props;
        const { pricedItemDataItem } = rowEntry;
        if (onChoosePricedItem && pricedItemDataItem) {
            onChoosePricedItem(pricedItemDataItem.id);
        }
    }


    renderTextDisplay(columnInfo, value) {
        const { ariaLabel, inputClassExtras } = columnInfo;
        
        return <CellTextDisplay
            ariaLabel={ariaLabel}
            value={value}
            inputClassExtras={inputClassExtras}
        />;
    }


    renderCurrency(columnInfo, pricedItemDataItem) {
        let { currency } = pricedItemDataItem;
        if (!currency) {
            // Base currency...
            const { accessor } = this.props;
            currency = userMsg('PricedItemsList-default_currency', 
                accessor.getBaseCurrencyCode());
        }
        return this.renderTextDisplay(columnInfo, currency);
    }


    renderQuantityDefinition(columnInfo, pricedItemDataItem) {
        const quantityDefinition 
            = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
        if (quantityDefinition) {
            return this.renderTextDisplay(columnInfo, 
                quantityDefinition.getDisplayText());
        }
    }


    renderOnlineSource(columnInfo, pricedItemDataItem) {
        const onlineUpdateType = PI.getPricedItemOnlineUpdateType(
            pricedItemDataItem.onlineUpdateType);
        if (onlineUpdateType) {
            return this.renderTextDisplay(columnInfo, onlineUpdateType.description);
        }
    }


    renderShares(columnInfo, pricedItemDataItem) {

    }


    renderMarketValue(columnInfo, pricedItemDataItem) {
        
    }


    renderCostBasis(columnInfo, pricedItemDataItem) {
        
    }


    renderCashIn(columnInfo, pricedItemDataItem) {
        
    }


    onRenderCell(cellInfo, cellSettings) {
        const { rowEntry } = cellInfo;
        // id - x
        // type - x
        // name
        // currency
        // description
        // quantity definition
        // ticker
        // online update type

        const { pricedItemDataItem } = rowEntry;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'name' :
            if (this.props.showPricedItemIds) {
                return this.renderTextDisplay(columnInfo, 
                    pricedItemDataItem.name + ' ' + pricedItemDataItem.id);
            }
            return this.renderTextDisplay(columnInfo, pricedItemDataItem.name);
        
        case 'description' :
            return this.renderTextDisplay(columnInfo, pricedItemDataItem.description);
        
        case 'currency' :
            return this.renderCurrency(columnInfo, pricedItemDataItem);
        
        case 'quantityDefinition' :
            return this.renderQuantityDefinition(
                columnInfo, pricedItemDataItem);
        
        case 'ticker' :
            return this.renderTextDisplay(columnInfo, pricedItemDataItem.ticker);
        
        case 'onlineSource' :
            return this.renderOnlineSource(
                columnInfo, pricedItemDataItem);
        
        case 'shares' :
            return this.renderShares(columnInfo, pricedItemDataItem);
        
        case 'marketValue' :
            return this.renderMarketValue(columnInfo, pricedItemDataItem);
        
        case 'costBasis' :
            return this.renderCostBasis(columnInfo, pricedItemDataItem);

        case 'cashIn' :
            return this.renderCurrency(columnInfo, pricedItemDataItem);
        }
    }


    render() {
        const { state } = this;
        return <div>
            <ActiveRowCollapsibleTable
                columnInfos={state.columnInfos}
                rowEntries={state.rowEntries}
                activeRowKey={state.activeRowKey}
                onRenderCell={this.onRenderCell}
                onGetRowAtIndex={this.onGetRowAtIndex}
                onActivateRow={this.onActivateRow}
                onOpenRow={this.onOpenRow}
                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}
            />
            {this.props.children}
        </div>;
    }
}

/**
 * @callback PricedItemsList~onSelectPricedItem
 * @param {number}  pricedItemId
 */

/**
 * @callback PricedItemsList~onChoosePricedItem
 * @param {number}  pricedItemId
 */


/**
 * @typedef {object} PricedItemsList~propTypes
 * @property {EngineAccessor}   accessor
 * @property {PricedItemsList~onSelectPricedItem} [onSelectPricedItem]   
 * Called when an pricedItem is selected.
 * @property {PricedItemsList~onChoosePricedItem} [onChoosePricedItem]   
 * Called when an pricedItem is 'chosen', either double-clicked or enter is pressed.
 */
PricedItemsList.propTypes = {
    accessor: PropTypes.object.isRequired,
    pricedItemTypeName: PropTypes.string.isRequired,
    onSelectPricedItem: PropTypes.func,
    onChoosePricedItem: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    hiddenPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenPricedItems: PropTypes.bool,
    showPricedItemIds: PropTypes.bool,
    children: PropTypes.any,
};
