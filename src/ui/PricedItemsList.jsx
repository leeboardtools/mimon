import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { getQuantityDefinition } from '../util/Quantities';
import * as CE from './AccountingCellEditors';
import { RowTable } from '../util-ui/RowTable';
import { columnInfosToColumns, 
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';


let columnInfoDefs;

/**
 * @returns {ColumnInfo[]} Array containing the available
 * columns for priced item lists.
 */
export function getPricedItemsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';
        const inputClassExtras = 'text-center';

        columnInfoDefs = columnInfoDefs = {
            name: { key: 'name',
                header: {
                    label: userMsg('PricedItemsList-name'),
                    ariaLabel: 'Name',
                },
                propertyName: 'name',
                className: '',
                cellClassName: cellClassName,
            },
            description: { key: 'description',
                header: {
                    label: userMsg('PricedItemsList-description'),
                    ariaLabel: 'Description',
                },
                propertyName: 'description',
                className: '',
                cellClassName: cellClassName,
            },
            currency: { key: 'currency',
                header: {
                    label: userMsg('PricedItemsList-currency'),
                    ariaLabel: 'Currency',
                },
                propertyName: 'currency',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            quantityDefinition: { key: 'quantityDefinition',
                header: {
                    label: userMsg('PricedItemsList-quantityDefinition'),
                    ariaLabel: 'Quantity Definition',
                },
                propertyName: 'quantityDefinition',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            ticker: { key: 'ticker',
                header: {
                    label: userMsg('PricedItemsList-ticker'),
                    ariaLabel: 'Ticker Symbol',
                },
                propertyName: 'ticker',
                className: 'text-center w-10',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            },
            onlineSource: { key: 'onlineSource',
                header: {
                    label: userMsg('PricedItemsList-onlineSource'),
                    ariaLabel: 'Online Source',
                },
                propertyName: 'onlineSource',
                className: 'text-center',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
            }
        };
    }

    return columnInfoDefs;
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
        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        const { pricedItemTypeName } = this.props;
        const pricedItemType = PI.getPricedItemType(pricedItemTypeName);

        const columnInfoDefs = getPricedItemsListColumnInfoDefs();

        const columnInfos = [];
        const { columns } = props;
        if (columns) {
            for (let name of columns) {
                const columnInfo = columnInfoDefs[name];
                if (columnInfo) {
                    columnInfos.push(columnInfo);
                }
            }
        }

        if (!columnInfos.length) {
            if (pricedItemType.hasTickerSymbol) {
                columnInfos.push(columnInfoDefs.ticker);
                columnInfos.push(columnInfoDefs.onlineSource);
            }

            columnInfos.push(columnInfoDefs.name);
            columnInfos.push(columnInfoDefs.description);
            columnInfos.push(columnInfoDefs.currency);
            columnInfos.push(columnInfoDefs.quantityDefinition);
        }


        this._hiddenPricedItemIds = new Set();

        this.state = {
            columnInfos: columnInfos,
            rowEntries: [],
        };

        this._sizingRowEntry = {
            pricedItemDataItem: {
                name: 'Name',
                description: 'Description',
                type: pricedItemTypeName,
                ticker: 'WWWW',
            }
        };

        this.state.columns = columnInfosToColumns(this.state);

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
            const result = this.buildRowEntries().rowEntries;
            return {
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
                activeRowIndex: result.activeRowIndex,
            };
        });
    }



    getRowKey(rowIndex) {
        return this.state.rowEntries[rowIndex].key;
    }

    onSetColumnWidth(args) {
        this.setState((state) => stateUpdateFromSetColumnWidth(args, state));
    }


    /*
    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }
    */


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
            currency: currency,
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
        const columnInfo = this.state.columnInfos[columnIndex];
        switch (columnInfo.key) {
        case 'name' :
            return CE.renderNameDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.name,
            });
        
        case 'description' :
            return CE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.name,
            });
        
        case 'currency' :
            return this.renderCurrency(columnInfo, pricedItemDataItem);
        
        case 'quantityDefinition' :
            return this.renderQuantityDefinition(
                columnInfo, pricedItemDataItem);
        
        case 'ticker' :
            return CE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: pricedItemDataItem.ticker,
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

                onSetColumnWidth = { this.onSetColumnWidth }

                activeRowIndex = {state.activeRowIndex}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}
            /*
                columnInfos={state.columnInfos}
                rowEntries={state.rowEntries}
                onGetRowAtIndex={this.onGetRowAtIndex}
                onOpenRow={this.onOpenRow}
                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}
            */
            />
            {this.props.children}
        </div>;
        /*

    onLoadRows: PropTypes.func,

    onRenderCell: PropTypes.func.isRequired,

    requestedVisibleRowIndex: PropTypes.number,

    onSetColumnWidth: PropTypes.func,

    rowHeight: PropTypes.number,
    headerHeight: PropTypes.number,
    footerHeight: PropTypes.number,

    activeRowIndex: PropTypes.number,
    onActivateRow: PropTypes.func,
    noActiveRowFocus: PropTypes.bool,

    onOpenActiveRow: PropTypes.func,

    onKeyDown: PropTypes.func,
    onRowDoubleClick: PropTypes.func,

    onContextMenu: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,

    classExtras: PropTypes.string,
    headerClassExtras: PropTypes.string,
    bodyClassExtras: PropTypes.string,
    rowClassExtras: PropTypes.string,
    footerClassExtras: PropTypes.string,
        */
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
    columns: PropTypes.arrayOf(PropTypes.string),
    hiddenPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenPricedItems: PropTypes.bool,
    showPricedItemIds: PropTypes.bool,
    children: PropTypes.any,
};
