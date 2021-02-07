import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { getQuantityDefinition } from '../util/Quantities';
import * as CE from './AccountingCellEditors';
import { RowTable } from '../util-ui/RowTable';
import { columnInfosToColumns, getVisibleColumns, } from '../util-ui/ColumnInfo';


let columnInfoDefs;

function getPricedItemsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';
        const inputClassExtras = 'text-center';

        columnInfoDefs = columnInfoDefs = {
            name: { key: 'name',
                header: {
                    label: userMsg('PricedItemsList-name'),
                    ariaLabel: 'Name',
                    classExtras: 'text-left',
                },
                propertyName: 'name',
                cellClassName: cellClassName + ' text-left w-40',
            },
            description: { key: 'description',
                header: {
                    label: userMsg('PricedItemsList-description'),
                    ariaLabel: 'Description',
                    classExtras: 'text-left',
                },
                propertyName: 'description',
                cellClassName: cellClassName,
            },
            currency: { key: 'currency',
                header: {
                    label: userMsg('PricedItemsList-currency'),
                    ariaLabel: 'Currency',
                },
                propertyName: 'currency',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -4,
            },
            quantityDefinition: { key: 'quantityDefinition',
                header: {
                    label: userMsg('PricedItemsList-quantityDefinition'),
                    ariaLabel: 'Quantity Definition',
                },
                propertyName: 'quantityDefinition',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -10,
            },
            ticker: { key: 'ticker',
                header: {
                    label: userMsg('PricedItemsList-ticker'),
                    ariaLabel: 'Ticker Symbol',
                },
                propertyName: 'ticker',
                cellClassName: cellClassName + ' text-left',
                inputClassExtras: inputClassExtras,
                inputSize: -6,
            },
            onlineSource: { key: 'onlineSource',
                header: {
                    label: userMsg('PricedItemsList-onlineSource'),
                    ariaLabel: 'Online Source',
                },
                propertyName: 'onlineSource',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -12,
            }
        };
    }

    return columnInfoDefs;
}

/**
 * Retrieves the priced item list columns with default settings.
 */
export function createDefaultColumns(pricedItemType) {
    pricedItemType = PI.getPricedItemType(pricedItemType);

    const columnInfoDefs = getPricedItemsListColumnInfoDefs();
    const columnInfos = [];
    if (pricedItemType.hasTickerSymbol) {
        columnInfos.push(columnInfoDefs.ticker);
        columnInfos.push(columnInfoDefs.onlineSource);
    }

    columnInfos.push(columnInfoDefs.name);
    //columnInfos.push(columnInfoDefs.description);
    columnInfos.push(columnInfoDefs.currency);
    columnInfos.push(columnInfoDefs.quantityDefinition);

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });

    columns.forEach((column) => column.isVisible = true);

    return columns;
}


/**
 * Component for displaying a list of priced items.
 */
export class PricedItemsList extends React.Component {
    constructor(props) {
        super(props);

        this.onPricedItemAdd = this.onPricedItemAdd.bind(this);
        this.onPricedItemModify = this.onPricedItemModify.bind(this);
        this.onPricedItemRemove = this.onPricedItemRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        const { pricedItemTypeName } = this.props;
        const pricedItemType = PI.getPricedItemType(pricedItemTypeName);

        this._hiddenPricedItemIds = new Set(this.props.hiddenPricedItemIds);

        const columns = this.props.columns || createDefaultColumns(pricedItemType);

        this.state = {
            columns: getVisibleColumns(columns),
            rowEntries: [],
            columnKeys: new Set(),
        };

        this._sizingRowEntry = {
            pricedItemDataItem: {
                name: userMsg('PricedItemsList-dummy_name'),
                description: userMsg('PricedItemsList-dummy_description'),
                type: pricedItemTypeName,
                onlineUpdateType: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
                ticker: 'WWWW',
            }
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


    componentDidUpdate(prevProps, prevState) {
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

        if (!deepEqual(prevProps.columns, this.props.columns)) {
            const { columns } = this.props;
            if (columns) {
                const visibleColumns = getVisibleColumns(columns);

                // columnKeys is used to add tooltip info to the name/ticker items
                // depending on whether a description or name column is showing.
                const columnKeys = new Set();
                visibleColumns.forEach((column) => columnKeys.add(column.key));

                this.setState({
                    columns: visibleColumns,
                    columnKeys: columnKeys,
                });
            }
        }

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;
            const result = this.buildRowEntries();
            this.setState({
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
                activeRowIndex: result.activeRowIndex,
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
        let activeRowIndex;
        if (activeRowKey) {
            let currentIndex;
            for (currentIndex = 0; currentIndex < rowEntries.length; ++currentIndex) {
                if (rowEntries[currentIndex].key === activeRowKey) {
                    activeRowEntry = rowEntries[currentIndex];
                    activeRowIndex = currentIndex;
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
            activeRowIndex: activeRowIndex,
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


    updateRowEntries() {
        this.setState((state) => {
            const result = this.buildRowEntries();
            return {
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
                activeRowIndex: result.activeRowIndex,
            };
        });
    }



    getRowKey(rowIndex) {
        const rowEntry = this.state.rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.key;
        }
    }


    onActivateRow(activeRowIndex) {
        const rowEntry = (activeRowIndex !== undefined)
            ? this.state.rowEntries[activeRowIndex]
            : undefined;
        const activeRowKey = (rowEntry) ? rowEntry.key : undefined;
        this.setState({
            activeRowIndex: activeRowIndex,
            activeRowKey: activeRowKey,
        });

        const { onSelectPricedItem } = this.props;
        if (onSelectPricedItem) {
            const { pricedItemDataItem } = rowEntry;
            onSelectPricedItem(pricedItemDataItem ? pricedItemDataItem.id : undefined);
        }
    }


    onOpenActiveRow({rowIndex}) {
        const rowEntry = this.state.rowEntries[rowIndex];
        const { onChoosePricedItem } = this.props;
        const { pricedItemDataItem } = rowEntry;
        if (onChoosePricedItem && pricedItemDataItem) {
            onChoosePricedItem(pricedItemDataItem.id);
        }
    }

    renderCurrency(columnInfo, pricedItemDataItem) {
        let { currency } = pricedItemDataItem;
        if (!currency) {
            // Base currency...
            const { accessor } = this.props;
            currency = userMsg('PricedItemsList-default_currency', 
                accessor.getBaseCurrencyCode());
        }
        return CE.renderTextDisplay({
            columnInfo: columnInfo, 
            value: currency,
        });
    }


    renderQuantityDefinition(columnInfo, pricedItemDataItem) {
        const quantityDefinition 
            = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
        if (quantityDefinition) {
            return CE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: quantityDefinition.getDisplayText(),
            });
        }
    }


    renderOnlineSource(columnInfo, pricedItemDataItem) {
        const onlineUpdateType = PI.getPricedItemOnlineUpdateType(
            pricedItemDataItem.onlineUpdateType);
        if (onlineUpdateType) {
            return CE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: onlineUpdateType.description,
            });
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


    onRenderCell({ rowIndex, columnIndex, isSizeRender }) {
        const rowEntry = (isSizeRender)
            ? this._sizingRowEntry
            : this.state.rowEntries[rowIndex];
        // type - x
        // name
        // currency
        // description
        // quantity definition
        // ticker
        // online update type

        const { pricedItemDataItem } = rowEntry;
        const columnInfo = this.state.columns[columnIndex].columnInfo;
        switch (columnInfo.key) {
        case 'name' :
            return CE.renderNameDisplay({
                columnInfo: columnInfo,
                value: (this.state.columnKeys.has('description'))
                    ? pricedItemDataItem.name
                    : {
                        name: pricedItemDataItem.name,
                        description: pricedItemDataItem.description,
                    },
            });
        
        case 'description' :
            return CE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.description,
            });
        
        case 'currency' :
            return this.renderCurrency(columnInfo, pricedItemDataItem);
        
        case 'quantityDefinition' :
            return this.renderQuantityDefinition(
                columnInfo, pricedItemDataItem);
        
        case 'ticker' :
            return CE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: (this.state.columnKeys.has('name'))
                    ? pricedItemDataItem.ticker
                    : {
                        value: pricedItemDataItem.ticker,
                        tooltip: pricedItemDataItem.name,
                    },
            });
        
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
        return <div className="RowTableContainer PricedItemsList">
            <RowTable
                columns = { state.columns }
                rowCount = { state.rowEntries.length }
                getRowKey = { this.getRowKey }

                onRenderCell={this.onRenderCell}

                onSetColumnWidth = { this.props.onSetColumnWidth }

                activeRowIndex = {state.activeRowIndex}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

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
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    hiddenPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenPricedItems: PropTypes.bool,
    showPricedItemIds: PropTypes.bool,
    children: PropTypes.any,
};
