import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { columnInfosToColumns, } from '../util-ui/ColumnInfo';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';
import * as PI from '../engine/PricedItems';
import * as ACE from './AccountingCellEditors';
import * as P from '../engine/Prices';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import { getDecimalDefinition } from '../util/Quantities';
import { CellSelectDisplay, CellSelectEditor } from '../util-ui/CellSelectEditor';
import deepEqual from 'deep-equal';
import { createCompositeAction } from '../util/Actions';

const allColumnInfoDefs = {};


const PriceItemType = {
    PRICE: { name: 'PRICE', },
    MULTIPLIER: { name: 'MULTIPLIER', },
};


/**
 * @typedef {object} PricesList~PriceInfo
 * @private
 * @property {PriceDataItem|PriceMultiplierDataItem} priceDataItem
 * @property {PriceItemType} priceItemType
 * @property {EngineAccessor} accessor
 */


function getPriceInfo(args) {
    const { rowEditBuffer, rowEntry } = args;
    return (rowEditBuffer) 
        ? rowEditBuffer 
        : rowEntry;
}


//
//---------------------------------------------------------
//
function getDateCellValue(args) {
    const { priceDataItem, caller } = getPriceInfo(args);
    if (priceDataItem) {
        return {
            ymdDate: priceDataItem.ymdDate,
            accessor: caller.props.accessor,
        };
    }
}


function saveDateCellValue(args) {
    const { cellEditBuffer, saveBuffer } = args;
    if (saveBuffer) {
        const { newPriceDataItem } = saveBuffer;
        const { value } = cellEditBuffer;
        newPriceDataItem.ymdDate = value.ymdDate;
    }
}


//
//---------------------------------------------------------
// PriceItemType
function getPriceItemTypeCellValue(args) {
    const { priceItemType } = getPriceInfo(args);
    return priceItemType;
}

function savePriceItemTypeCellValue(args) {
    const { priceItemType } = getPriceInfo(args);
    const { saveBuffer } = args;
    if (saveBuffer) {
        saveBuffer.newPriceItemType = priceItemType;
    }
}

function renderPriceItemTypeDisplay(args) {
    const { priceItemType } = getPriceInfo(args);
    if (priceItemType) {
        const { columnInfo } = args;
        const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

        const { rowEntry } = args;
        const value = (rowEntry && !rowEntry.key)
            ? userMsg('PricesList-newPrice')
            : priceItemType.description;

        return <CellSelectDisplay
            ariaLabel = {ariaLabel}
            selectedValue = {value}
            classExtras = {inputClassExtras}
            size = {inputSize}
        />;
    }
}

function onPriceItemTypeChange(e, args) {
    const value = e.target.value;
    const { rowEditBuffer, rowEntry, } = args;
    const priceItemType = PriceItemType[value];
    if (priceItemType && rowEditBuffer) {
        let { priceDataItem } = rowEditBuffer;
        switch (priceItemType) {
        case PriceItemType.PRICE :
            break;
        
        case PriceItemType.MULTIPLIER :
            if ((typeof priceDataItem.newCount !== 'number')
             || (typeof priceDataItem.oldCount !== 'number')) {
                priceDataItem = P.getPriceMultiplierDataItem(priceDataItem, true);
                priceDataItem.newCount = 2;
                priceDataItem.oldCount = 1;
            }
            break;
        }

        rowEntry.caller.updateRowEditBuffer(args,
            {
                priceItemType: priceItemType,
                priceDataItem: priceDataItem,
            });
    }
}


//
//---------------------------------------------------------
//
function renderPriceItemTypeEditor(args) {
    const { columnInfo, rowEditBuffer, errorMsg, refForFocus } = args;
    if (rowEditBuffer) {
        const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
        const items = [];
        for (let name in PriceItemType) {
            items.push([name, PriceItemType[name].description]);
        }

        const { priceItemType } = rowEditBuffer;
        return <CellSelectEditor
            selectedValue = {priceItemType.name}
            items = {items}
            errorMsg = {errorMsg}
            ariaLabel = {ariaLabel}
            classExtras = {inputClassExtras}
            size = {inputSize}
            onChange = {(e) => onPriceItemTypeChange(e, args)}
            ref = {refForFocus}
        />;
    }
}

//
//---------------------------------------------------------
//
function getPriceItemTypeColumnInfo() {
    return { key: 'priceItemType',
        header: {
            label: userMsg('PricesList-label_type'),
            classExtras: 'RowTable-header-base PriceItemType-base PriceItemType-header',
        },
        inputClassExtras: 'PriceItemType-base PriceItemType-input',
        cellClassName: 'RowTable-cell-base PriceItemType-base PriceItemType-cell',

        getCellValue: getPriceItemTypeCellValue,
        saveCellValue: savePriceItemTypeCellValue,
        renderDisplayCell: renderPriceItemTypeDisplay,
        renderEditCell: renderPriceItemTypeEditor,
    };
}

//
//---------------------------------------------------------
//
function getPriceValueCellValue(args, priceName, multiplierName) {
    const { priceDataItem, priceItemType, caller } = getPriceInfo(args);
    if (priceDataItem) {
        if (priceItemType === PriceItemType.PRICE) {
            if (priceName) {
                const value = priceDataItem[priceName];
                const { priceQuantityDefinition } = caller.state;
                let quantityBaseValue = '';
                if (typeof value === 'number') {
                    quantityBaseValue = priceQuantityDefinition
                        .numberToBaseValue(value);
                }
                return {
                    quantityBaseValue: quantityBaseValue,
                    quantityDefinition: priceQuantityDefinition,
                };
            }
        }
        else if (priceItemType === PriceItemType.MULTIPLIER) {
            if (multiplierName) {
                const value = priceDataItem[multiplierName];
                const { countQuantityDefinition } = caller.state;
                let quantityBaseValue = '';
                if (typeof value === 'number') {
                    quantityBaseValue = countQuantityDefinition
                        .numberToBaseValue(value);
                }
                return {
                    quantityBaseValue: quantityBaseValue,
                    quantityDefinition: countQuantityDefinition,
                };
            }
        }
    }
}

function savePriceValueCellValue(args, priceName, multiplierName) {
    const { priceItemType } = getPriceInfo(args);
    const { saveBuffer, cellEditBuffer } = args;
    if (saveBuffer) {
        let name;
        switch (priceItemType) {
        case PriceItemType.PRICE :
            name = priceName;
            break;
        
        case PriceItemType.MULTIPLIER :
            name = multiplierName;
            break;
        }
        if (!name) {
            return;
        }

        const { value } = cellEditBuffer;
        const { quantityBaseValue, quantityDefinition } = value;
        if (typeof quantityBaseValue === 'number') {
            const { newPriceDataItem } = saveBuffer;
            newPriceDataItem[name] = quantityDefinition.baseValueToNumber(
                quantityBaseValue
            );
        }
    }
}


//
//---------------------------------------------------------
//
function renderPriceValueCellDisplay(args, priceName, multiplierName, countSuffix) {
    const { priceItemType } = getPriceInfo(args);
    if (priceItemType === PriceItemType.MULTIPLIER) {
        if (countSuffix) {
            countSuffix = userMsg(countSuffix);
            args = Object.assign({}, args, { suffix: countSuffix });
        }
    }

    return ACE.renderQuantityDisplay(args);
}

function renderPriceValueCellEditor(args, priceName, multiplierName, countSuffix) {
    const { priceItemType } = getPriceInfo(args);
    if (priceItemType === PriceItemType.MULTIPLIER) {
        if (countSuffix) {
            countSuffix = userMsg(countSuffix);
            args = Object.assign({}, args, { suffix: countSuffix });
        }
    }

    return ACE.renderQuantityEditor(args);
}


//
//---------------------------------------------------------
//
function getPriceValueColumnInfo(name, multiplierName, countSuffix) {
    return { key: name,
        header: {
            label: userMsg('PricesList-label_' + name),
            ariaLabel: name,
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',

        getCellValue: (args) => 
            getPriceValueCellValue(args, name, multiplierName, countSuffix),
        saveCellValue: (args) =>
            savePriceValueCellValue(args, name, multiplierName, countSuffix),
        renderDisplayCell: (args) =>
            renderPriceValueCellDisplay(args, name, multiplierName, countSuffix),
        renderEditCell: (args) =>
            renderPriceValueCellEditor(args, name, multiplierName, countSuffix),
    };
}


/**
 */
export function getPricesListColumnInfoDefs(pricedItemType) {
    pricedItemType = PI.getPricedItemType(pricedItemType);

    let columnInfoDefs = allColumnInfoDefs[pricedItemType.name];
    if (!columnInfoDefs) {

        if (!PriceItemType.PRICE.description) {
            for (let name in PriceItemType) {
                PriceItemType[name].description = userMsg('PricesList-' + name);
            }
        }

        columnInfoDefs = {
            date: ACE.getDateColumnInfo({
                getCellValue: getDateCellValue,
                saveCellValue: saveDateCellValue,
            }),
            priceItemType: getPriceItemTypeColumnInfo(),
            close: getPriceValueColumnInfo('close', 'newCount', 
                'PricesList-newCount_suffix'),
            open: getPriceValueColumnInfo('open', 'oldCount', 
                'PricesList-oldCount_suffix'),
            high: getPriceValueColumnInfo('high'),
            low: getPriceValueColumnInfo('low'),
            //volume: getPriceColumnInfo('volume'),
        };

        for (let name in columnInfoDefs) {
            const columnInfo = columnInfoDefs[name];
            if (columnInfo) {
                columnInfo.ariaLabel = columnInfo.ariaLabel 
                    || columnInfo.header.ariaLabel;
            }
        }

        allColumnInfoDefs[pricedItemType.name] = columnInfoDefs;
    }

    return columnInfoDefs;
}

/**
 * Retrieves the price list columns with default settings.
 */
export function createDefaultColumns(pricedItemType) {
    const columnInfos = getPricesListColumnInfoDefs(pricedItemType);

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });

    columns.forEach((column) => column.isVisible = true);

    return columns;
}


/**
 * Component for the historical price editing list.
 */
export class PricesList extends React.Component {
    constructor(props) {
        super(props);

        this.onPricesAdd = this.onPricesAdd.bind(this);
        this.onPricesRemove = this.onPricesRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);
        this.onLoadRows = this.onLoadRows.bind(this);

        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);

        this.getRowEntry = this.getRowEntry.bind(this);
        this.startRowEdit = this.startRowEdit.bind(this);
        this.getSaveBuffer = this.getSaveBuffer.bind(this);
        this.asyncSaveBuffer = this.asyncSaveBuffer.bind(this);

        this._cellEditorsManager = new CellEditorsManager({
            getRowEntry: this.getRowEntry,
            getColumnInfo: (columnIndex) => this.props.columns[columnIndex].columnInfo,
            setManagerState: (state) => this.setState({
                managerState: state,
            }),
            getManagerState: () => this.state.managerState,
            startRowEdit: this.startRowEdit,
            getSaveBuffer: this.getSaveBuffer,
            asyncSaveBuffer: this.asyncSaveBuffer,
        });


        this._lastYMDDate = new YMDDate().toString();

        this._rowTableRef = React.createRef();
        this._modalRef = React.createRef();

        const { pricedItemId, accessor } = this.props;

        this.state = {
            rowEntries: [],
            priceQuantityDefinition: accessor.getPriceQuantityDefinitionForPricedItem(
                pricedItemId),
            countQuantityDefinition: getDecimalDefinition(0),
        };

        this._sizingRowEntry = {
            priceDataItem: {
                ymdDate: '2020-12-31',
                close: 999999.9999,
                open: 999999.9999,
                low: 999999.9999,
                high: 999999.9999,
                volume: ACE.BalanceSizingBaseValue,
            },
            priceItemType: PriceItemType.PRICE,
            caller: this,
        };

        this.updateRowEntries();
    }


    componentDidMount() {
        const { accessor } = this.props;
        accessor.on('pricesAdd', this.onPricesAdd);
        accessor.on('pricesRemove', this.onPricesRemove);
    }


    componentWillUnmount() {
        const { accessor } = this.props;
        accessor.off('pricesAdd', this.onPricesAdd);
        accessor.off('pricesRemove', this.onPricesRemove);
    }

    
    componentDidUpdate(prevProps, prevState) {
    }


    updateRowEditBuffer(args, rowEditBufferChanges) {
        const { rowEditBuffer, setRowEditBuffer } = args;
        const newRowEditBuffer = Object.assign({}, rowEditBuffer, rowEditBufferChanges);
        if (deepEqual(rowEditBuffer, newRowEditBuffer)) {
            return;
        }

        setRowEditBuffer(
            rowEditBufferChanges,
            (rowEditBuffer) => {
                args = Object.assign({}, args, {
                    rowEditBuffer: rowEditBuffer,
                });
                this._cellEditorsManager.reloadCellEditBuffers(args);
            }
        );
    }


    onPricesAdd(result) {
        if (result.pricedItemId !== this.props.pricedItemId) {
            return;
        }

        this.updateRowEntries(result.newPriceDataItems, 
            result.newPriceMultiplierDataItems);
    }


    onPricesRemove(result) {
        if (result.pricedItemId !== this.props.pricedItemId) {
            return;
        }

        this.updateRowEntries(undefined, undefined,
            result.removedPriceDataItems, 
            result.removedPriceMultiplierDataItems);
    }


    updateRowEntries(newPriceDataItems, newPriceMultiplierDataItems,
        removedPriceDataItems, removedPriceMultiplierDataItems) {

        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        process.nextTick(async () => {
            const newRowEntries = [];
            const { accessor, pricedItemId } = this.props;

            let { activeRowIndex, rowEntries } = this.state;
            if ((activeRowIndex + 1) === rowEntries.length) {
                // If the active row is the last row, it's the 'new transaction' row
                // and we want to advance to the next new transaction in that case.
                activeRowIndex = undefined;
            }

            let activeRowEntry;
            if ((activeRowIndex >= 0)
             && (activeRowIndex < rowEntries.length)) {
                activeRowEntry = rowEntries[activeRowIndex];
            }
            
            const priceDateRange = await accessor.asyncGetPriceDateRange(pricedItemId);
            const multiplierDateRange = await accessor.asyncGetPriceMultiplierDateRange(
                pricedItemId);
            
            let ymdDateA;
            let ymdDateB;
            if (priceDateRange) {
                if (multiplierDateRange) {
                    ymdDateA = YMDDate.orderYMDDatePair(
                        priceDateRange[0], multiplierDateRange[0])[0];
                    ymdDateB = YMDDate.orderYMDDatePair(
                        priceDateRange[1], multiplierDateRange[1])[1];
                }
                else {
                    ymdDateA = priceDateRange[0];
                    ymdDateB = priceDateRange[1];
                }
            }
            else if (multiplierDateRange) {
                ymdDateA = multiplierDateRange[0];
                ymdDateB = multiplierDateRange[1];
            }

            if (ymdDateA && ymdDateB) {
                const getArgs = {
                    pricedItemId: pricedItemId,
                    ymdDateA: ymdDateA,
                    ymdDateB: ymdDateB,

                    // TODO: add ymdDateRef if want current prices...
                };
                const dataItems 
                    = await accessor.asyncGetPriceAndMultiplierDataItemsInDateRange(
                        getArgs);
                
                dataItems.forEach((dataItem) => {
                    const rowEntry = {
                        key: dataItem.ymdDate,
                        priceDataItem: dataItem,
                        caller: this,
                    };
                    if (P.isMultiplier(dataItem)) {
                        rowEntry.key += 'M';
                        rowEntry.priceItemType = PriceItemType.MULTIPLIER;
                    }
                    else {
                        rowEntry.priceItemType = PriceItemType.PRICE;
                    }
                    newRowEntries.push(rowEntry);

                    if (activeRowEntry && (activeRowEntry.key === rowEntry.key)) {
                        activeRowEntry = rowEntry;
                    }
                });
            }


            const newItemRowEntry = {
                key: '',
                priceDataItem: {
                    ymdDate: this._lastYMDDate,
                    close: '',
                },
                priceItemType: PriceItemType.PRICE,
                caller: this,
            };
            newRowEntries.push(newItemRowEntry);


            // Update the row entry indices.
            for (let i = 0; i < newRowEntries.length; ++i) {
                newRowEntries[i].rowIndex = i;
            }

            if (activeRowEntry) {
                activeRowIndex = activeRowEntry.rowIndex;
            }

            const openNewRow = (activeRowIndex === undefined);
            if ((activeRowIndex === undefined) 
             || (activeRowIndex >= newRowEntries.length)) {
                activeRowIndex = newRowEntries.length - 1;
            }

            this.setState({
                activeRowIndex: activeRowIndex,
                openNewRow: openNewRow,
                rowEntries: newRowEntries,
                minLoadedRowIndex: 0,
                maxLoadedRowIndex: newRowEntries.length - 1,
            });
        });
    }


    getRowKey(rowIndex) {
        const { rowEntries } = this.state;
        const rowEntry = rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.key;
        }
        return (-rowIndex).toString();
    }


    onLoadRows({firstRowIndex, lastRowIndex}) {
    }


    onActiveRowChanged(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        },
        () => {
            const { onSelectPrice } = this.props;
            if (onSelectPrice) {
                let selectedPriceDataItem;
                const { rowEntries } = this.state;
                if ((rowIndex >= 0) && ((rowIndex + 1) < rowEntries.length)) {
                    selectedPriceDataItem = rowEntries[rowIndex].priceDataItem;
                }

                onSelectPrice(selectedPriceDataItem);
            }
        });
    }


    getRowEntry(args) {
        const { rowIndex, isSizeRender } = args;
        return (isSizeRender)
            ? this._sizingRowEntry
            : this.state.rowEntries[rowIndex];
    }


    startRowEdit(args) {
        const { rowIndex, rowEditBuffer } = args;
        const rowEntry = this.state.rowEntries[rowIndex];
        rowEditBuffer.priceDataItem = Object.assign({}, rowEntry.priceDataItem);
        rowEditBuffer.priceItemType = rowEntry.priceItemType;
        rowEditBuffer.accessor = this.props.accessor;
        rowEditBuffer.caller = this;

        this.setState({
            openNewRow: false,
        });

        return true;
    }


    getSaveBuffer(args) {
        const { rowEditBuffer } = args;
        return {
            newPriceDataItem: Object.assign({}, rowEditBuffer.priceDataItem),
            newPriceItemType: rowEditBuffer.priceItemType,
        };
    }


    async asyncSaveBuffer(args) {
        try {
            const { rowIndex, cellEditBuffers, saveBuffer, reason } = args;

            if ((reason === 'activateRow') 
             && (rowIndex === this.state.rowEntries.length - 1)) {
                // Don't save the new row if we're activating a different row.
                return true;
            }

            // Need to catch known errors...
            if (this._cellEditorsManager.areAnyErrors()) {
                return;
            }
            if (cellEditBuffers) {
                for (let buffer of cellEditBuffers) {
                    if (buffer.errorMsg
                     || (buffer.value && buffer.value.errorMsg)) {
                        // The check for buffer.value.errorMsg is a hack to support
                        // the local error message handling of 
                        // ACE.renderQuantityEditor()...
                        return;
                    }
                }
            }

            const rowEntry = this.state.rowEntries[rowIndex];
            const { priceDataItem, priceItemType } = rowEntry;

            const isNewItem = (rowIndex + 1) >= this.state.rowEntries.length;

            const { newPriceDataItem, newPriceItemType } = saveBuffer;
            if (isNewItem || (priceItemType !== newPriceItemType)
             || !deepEqual(priceDataItem, newPriceDataItem)) {
                const { accessor, pricedItemId } = this.props;
                const accountingActions = accessor.getAccountingActions();

                let deleteAction;
                if (!isNewItem) {
                    if ((priceItemType !== newPriceItemType)
                    || (priceDataItem.ymdDate !== newPriceDataItem.ymdDate)) {
                        // If either the type or the date changed we need to delete
                        // the old price item.
                        const options = {};
                        switch (priceItemType) {
                        case PriceItemType.PRICE :
                            options.noMultipliers = true;
                            break;
                        case PriceItemType.MULTIPLIER :
                            options.noPrices = true;
                            break;
                        }

                        deleteAction = accountingActions.createRemovePricesInDateRange(
                            pricedItemId,
                            priceDataItem.ymdDate,
                            priceDataItem.ymdDate,
                            options
                        );
                    }
                }

                switch (priceItemType) {
                case PriceItemType.PRICE :
                    P.cleanPriceDataItem(priceDataItem);
                    break;
                
                case PriceItemType.MULTIPLIER :
                    P.cleanPriceMultiplierDataItem(priceDataItem);
                    break;
                }

                let newAction = accountingActions.createAddPricesAction(
                    pricedItemId,
                    newPriceDataItem
                );

                if (deleteAction) {
                    newAction = createCompositeAction({
                        name: newAction.name,
                    },
                    [deleteAction, newAction]);
                }

                if (newAction) {

                    if (isNewItem) {
                        // This should force the active row to be the new item...
                        this.setState({
                            activeRowIndex: -1,
                        });
                    }

                    await this.asyncApplyAction(args, newAction, isNewItem);
                }
            }
        }
        catch (e) {
            this.setErrorMsg('priceItemType', e.toString());
            return;
        }

        return true;
    }


    async asyncApplyAction(args, action, isNewItem) {
        const { saveBuffer } = args;
        const { newPriceDataItem } = saveBuffer;
        const { accessor } = this.props;

        await accessor.asyncApplyAction(action);

        if (isNewItem) {
            this._lastYMDDate = getYMDDate(newPriceDataItem.ymdDate).addDays(1)
                .toString();
        }
    }


    setErrorMsg(columnInfoKey, msg) {
        this._cellEditorsManager.setErrorMsg(columnInfoKey, msg);
    }


    render() {
        const { props, state } = this;

        const { modal } = state;

        let modalComponent;
        let registerClassName = 'RowTableContainer PricesList';
        if (modal) {
            modalComponent = modal(this._modalRef);
            registerClassName += ' D-none';
        }

        const table = <div className = {registerClassName}>
            <EditableRowTable
                columns = {props.columns}

                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}

                onLoadRows = {this.onLoadRows}

                onSetColumnWidth = {this.props.onSetColumnWidth}

                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

                classExtras = "table-striped"

                //
                // EditableRowTable methods
                onRenderDisplayCell = {this._cellEditorsManager.onRenderDisplayCell}
                onRenderEditCell = {this._cellEditorsManager.onRenderEditCell}

                requestedActiveRowIndex = {state.activeRowIndex}
                onActiveRowChanged = {this.onActiveRowChanged}

                requestOpenActiveRow = {state.openNewRow}

                onStartRowEdit = {this._cellEditorsManager.onStartRowEdit}
                asyncOnSaveRowEdit = {this._cellEditorsManager.asyncOnSaveRowEdit}
                onCancelRowEdit = {this._cellEditorsManager.onCancelRowEdit}

                ref = {this._rowTableRef}
            />
            {this.props.children}
        </div>;

        return <div className="w-100 h-100">
            {modalComponent}
            {table}
        </div>;
    }
}

PricesList.propTypes = {
    accessor: PropTypes.object.isRequired,
    pricedItemId: PropTypes.number.isRequired,
    contextMenuItems: PropTypes.array,
    onSelectPrice: PropTypes.func,
    onChooseContextMenuItem: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    children: PropTypes.any,
};
