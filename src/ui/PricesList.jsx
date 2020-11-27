import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { EditableRowTable } from '../util-ui/EditableRowTable';
//import { PricesListHandler } from './PricesListHandler';
import { columnInfosToColumns, 
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';
import * as PI from '../engine/PricedItems';
import * as ACE from './AccountingCellEditors';

const allColumnInfoDefs = {};



/**
 */
export function getPricesListColumnInfoDefs(pricedItemType) {
    pricedItemType = PI.getPricedItemType(pricedItemType);

    let columnInfoDefs = allColumnInfoDefs[pricedItemType.name];
    if (!columnInfoDefs) {
        columnInfoDefs = {
            date: ACE.getDateColumnInfo({
                //getCellValue: getDateCellValue,
                //saveCellValue: saveDateCellValue,
            }),
            refNum: ACE.getRefNumColumnInfo({
                //getCellValue: (args) => getSplitCellValue(args, 'refNum', 'value'),
                //saveCellValue: (args) => saveSplitCellValue(args, 'refNum', 'value'),
            }),
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
 * Component for the historical price editing list.
 */
export class PricesList extends React.Component {
    constructor(props) {
        super(props);

        this.getRowKey = this.getRowKey.bind(this);
        this.onLoadRows = this.onLoadRows.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        this.getRowEntry = this.getRowEntry.bind(this);
        this.startRowEdit = this.startRowEdit.bind(this);
        this.getSaveBuffer = this.getSaveBuffer.bind(this);
        this.asyncSaveBuffer = this.asyncSaveBuffer.bind(this);

        this._cellEditorsManager = new CellEditorsManager({
            getRowEntry: this.getRowEntry,
            getColumnInfo: (columnIndex) => this.state.columnInfos[columnIndex],
            setManagerState: (state) => this.setState({
                managerState: state,
            }),
            getManagerState: () => this.state.managerState,
            startRowEdit: this.startRowEdit,
            getSaveBuffer: this.getSaveBuffer,
            asyncSaveBuffer: this.asyncSaveBuffer,
        });

        this._rowTableRef = React.createRef();
        this._modalRef = React.createRef();

        const { pricedItemId, accessor } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        const pricedItemType = PI.getPricedItemType(pricedItemDataItem.type);

        const columnInfoDefs = getPricesListColumnInfoDefs(pricedItemType);

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
            for (let name in columnInfoDefs) {
                const columnInfoDef = columnInfoDefs[name];
                if (columnInfoDef) {
                    columnInfos.push(columnInfoDef);
                }
            }
        }



        this.state = {
            rowEntries: [],
            columnInfos: columnInfos,
        };

        this._sizingRowEntry = {

        };


        this.state.columns = columnInfosToColumns(this.state);
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


    getRowEntry(args) {
        const { rowIndex, isSizeRender } = args;
        return (isSizeRender)
            ? this._sizingRowEntry
            : this.state.rowEntries[rowIndex];
    }


    startRowEdit(args) {
    }


    getSaveBuffer(args) {
    }


    async asyncSaveBuffer(args) {
    }


    onSetColumnWidth(args) {
        this.setState((state) => stateUpdateFromSetColumnWidth(args, state));
    }


    render() {
        const { state } = this;

        const { modal } = state;

        let modalComponent;
        let registerClassName = 'RowTableContainer PricesList';
        if (modal) {
            modalComponent = modal(this._modalRef);
            registerClassName += ' d-none';
        }

        const table = <div className = {registerClassName}>
            <EditableRowTable
                columns = {state.columns}

                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}

                onLoadRows = {this.onLoadRows}

                onSetColumnWidth = {this.onSetColumnWidth}

                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

                classExtras = "table-striped"

                //
                // EditableRowTable methods
                onRenderDisplayCell = {this._cellEditorsManager.onRenderDisplayCell}
                onRenderEditCell = {this._cellEditorsManager.onRenderEditCell}

                requestedActiveRowIndex = {state.activeRowIndex}
                onActiveRowChanged = {this.onActiveRowChanged}

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
    onChooseContextMenuItem: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.string),
    children: PropTypes.any,
};
