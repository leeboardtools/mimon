import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';
import { columnInfosToColumns, 
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';
import * as CE from './AccountingCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import deepEqual from 'deep-equal';


function getSplitCellValue(args, propertyName) {
    const { rowEntry } = args;
    const { split } = rowEntry;
    if (split) {
        if ((rowEntry.originalSplitIndex === undefined)
         && (propertyName === 'description')) {
            return {
                description: split[propertyName],
                placeholder: userMsg('MultiSplitsEditor-new_description_placeholder'),
            };
        }
        return split[propertyName];
    }
}

function saveSplitCellValue(args, propertyName) {
    const { saveBuffer, cellEditBuffer } = args;
    if (saveBuffer) {
        const { value } = cellEditBuffer;
        if (typeof value === 'object') {
            saveBuffer.newSplit[propertyName] = cellEditBuffer.value[propertyName];
        }
        else {
            saveBuffer.newSplit[propertyName] = cellEditBuffer.value;
        }
    }
}


function noLotAccountIdFilter(accessor, id) {
    const accountDataItem = accessor.getAccountDataItemWithId(id);
    const accountType = A.getAccountType(accountDataItem.type);
    return !accountType.hasLots;
}

function getAccountIdCellValue(args) {
    const { rowEntry } = args;
    const { split, accessor } = rowEntry;
    if (split) {
        return {
            accountId: split.accountId,
            accessor: accessor,
            readOnly: rowEntry.readOnly,
            accountIdFilter: (id) => noLotAccountIdFilter(accessor, id),
        };
    }
}

function saveAccountIdCellValue(args) {
    const { saveBuffer, cellEditBuffer } = args;
    if (saveBuffer) {
        saveBuffer.newSplit.accountId = cellEditBuffer.value.accountId;
    }
}




//
//---------------------------------------------------------
// Split quantities

function getSplitQuantityCellValue(args, type) {
    const { rowEntry } = args;
    const { split, accessor, accountType, quantityDefinition } = rowEntry;
    if (!split) {
        return;
    }

    const value = {
        accessor: accessor,
        split: split,
        accountType: accountType,
        quantityDefinition: quantityDefinition,
        splitQuantityType: type,
        readOnly: rowEntry.readOnly,
    };
    return value;
}

function saveSplitQuantityCellValue(args) {
    const { cellEditBuffer, saveBuffer } = args;
    const { value } = cellEditBuffer;
    if (saveBuffer && value) {
        if (value.readOnly) {
            // If readOnly then the split will be set by the multi-splits.
            return;
        }
        
        const { split } = value;
        const { quantityBaseValue } = split;
        if (typeof quantityBaseValue === 'number') {
            // If a number then the value hasn't been edited.
            return;
        }
        else if (quantityBaseValue === '') {
            // Not set presume the opposite will set it.
            return;
        }

        const { accountId } = saveBuffer.newSplit;
        Object.assign(saveBuffer.newSplit, 
            CE.resolveSplitQuantityEditValueToSplitDataItem(args));
        saveBuffer.newSplit.accountId = accountId;
    }
}


function getMultiSplitsEditorColumnInfos(accountType) {
    accountType = A.getAccountType(accountType);

    const columnInfos = {
        description: CE.getDescriptionColumnInfo({
            getCellValue: (args) => getSplitCellValue(args, 'description'),
            saveCellValue: (args) => saveSplitCellValue(args, 'description'),
        }),

        accountId: CE.getAccountIdColumnInfo({
            getCellValue: (args) => getAccountIdCellValue(args),
            saveCellValue: (args) => saveAccountIdCellValue(args),
        }),

        debit: CE.getSplitQuantityColumnInfo(
            {
                getCellValue: (args) => getSplitQuantityCellValue(args, 'debit'),
                saveCellValue: saveSplitQuantityCellValue,
            },
            'debit',
            accountType.debitLabel
        ),
        credit: CE.getSplitQuantityColumnInfo(
            {
                getCellValue: (args) => getSplitQuantityCellValue(args, 'credit'),
                saveCellValue: saveSplitQuantityCellValue,
            },
            'credit',
            accountType.creditLabel
        ),
    };
    return columnInfos;
}


export class MultiSplitsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onDone = this.onDone.bind(this);
        this.onDeleteSplit = this.onDeleteSplit.bind(this);
        this.onDeleteAll = this.onDeleteAll.bind(this);

        this.getUndoRedoInfo = this.getUndoRedoInfo.bind(this);

        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        this.getRowEntry = this.getRowEntry.bind(this);
        this.getSaveBuffer = this.getSaveBuffer.bind(this);
        this.asyncSaveBuffer = this.asyncSaveBuffer.bind(this);

        this._cellEditorsManager = new CellEditorsManager({
            getRowEntry: this.getRowEntry,
            getColumnInfo: (columnIndex) => this.state.columnInfos[columnIndex],
            setManagerState: (state) => this.setState({
                managerState: state,
            }),
            getManagerState: () => this.state.managerState,
            getSaveBuffer: this.getSaveBuffer,
            asyncSaveBuffer: this.asyncSaveBuffer,
        });

        this._rowTableRef = React.createRef();

        const { accessor, splits, splitIndex } = this.props;
        const { accountId } = splits[splitIndex];
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
            accountDataItem.pricedItemId);

        const columnInfoDefs = getMultiSplitsEditorColumnInfos(accountDataItem.type);

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
                columnInfos.push(columnInfoDefs[name]);
            }
        }


        this.state = {
            columnInfos: columnInfos,
            rowEntries: [],
            activeRowIndex: 0,
            accountType: accountDataItem.type,
            currency: pricedItemDataItem.currency,
            quantityDefinition: pricedItemDataItem.quantityDefinition,
        };


        const nameId = AH.getAccountWithLongestAncestorName(accessor);

        this._sizingRowEntry = {
            split: {
                accountId: nameId.id,
                description: userMsg('AccountRegister-dummy_description'),
                quantityBaseValue: 999999999,
            },
            accountType: this.state.accountType,
            quantityDefinition: this.state.quantityDefinition,
            accessor: accessor,
        };


        this.state.columns = columnInfosToColumns(this.state);

        this.state = Object.assign(this.state, 
            this.buildRowEntries(this.props));
    }


    componentDidMount() {
        console.log('multi-did mount');
    }

    componentWillUnmount() {
        console.log('multi-will unmount');
    }


    componentDidUpdate(prevProps) {
        let rowsNeedUpdating = false;
        if (!deepEqual(prevProps.splits, this.props.splits)) {
            rowsNeedUpdating = true;
        }

        if (rowsNeedUpdating) {
            //this.updateRowEntries();
        }
    }


    createSplitRowEntry(split, originalIndex) {
        const { accessor } = this.props;

        if (!split) {
            // The 'new' split...
            split = {
                quantityBaseValue: '',
            };

            switch (A.getAccountType(this.state.accountType).category) {
            case A.AccountCategory.ASSET :
                split.accountId = accessor.getRootExpenseAccountId();
                break;

            case A.AccountCategory.LIABILITY :
            case A.AccountCategory.INCOME :
            case A.AccountCategory.EXPENSE :
            case A.AccountCategory.EQUITY :
            default :
                split.accountId = accessor.getRootAssetAccountId();
                break;
            }
        }

        const { accountId } = split;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);

        let accountType;
        let quantityDefinition;
        if (accountDataItem) {
            accountType = accountDataItem.type;
            
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId);
            quantityDefinition = pricedItemDataItem.quantityDefinition;
        }
        else {
            quantityDefinition = this.state.quantityDefinition;
        }

        return {
            split: split,
            originalSplitIndex: originalIndex,
            accessor: accessor,
            accountType: accountType,
            quantityDefinition: quantityDefinition,
        };
    }


    buildRowEntries({splits, splitIndex}) {
        const newRowEntries = [
            this.createSplitRowEntry(splits[splitIndex], splitIndex),
        ];
        newRowEntries[0].readOnly = true;

        for (let i = 0; i < splitIndex; ++i) {
            newRowEntries.push(this.createSplitRowEntry(splits[i], i));
        }
        for (let i = splitIndex + 1; i < splits.length; ++i) {
            newRowEntries.push(this.createSplitRowEntry(splits[i], i));
        }

        newRowEntries.push(this.createSplitRowEntry());

        return {
            rowEntries: newRowEntries,
        };
    }

    updateRowEntries() {
        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        this.setState(this.buildRowEntries(this.props));
    }


    onSetColumnWidth(args) {
        this.setState((state) => stateUpdateFromSetColumnWidth(args, state));
    }


    onActiveRowChanged(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        });
    }


    getRowEntry(args) {
        const { rowIndex, isSizeRender } = args;
        return (isSizeRender)
            ? this._sizingRowEntry
            : this.state.rowEntries[rowIndex];
    }
    
    
    getSaveBuffer(args) {
        const { rowIndex } = args;
        const rowEntry = this.state.rowEntries[rowIndex];
        const { split } = rowEntry;
        return {
            newSplit: T.getSplitDataItem(split, true),
        };
    }


    async asyncSaveBuffer(args) {
        const { rowIndex, saveBuffer } = args;
        this.setState((state) => {
            const newRowEntries = Array.from(state.rowEntries);
            let { originalSplitIndex } = newRowEntries[rowIndex];
            if (originalSplitIndex === undefined) {
                originalSplitIndex = -1;
            }

            const { newSplit } = saveBuffer;
            newRowEntries[rowIndex] = this.createSplitRowEntry(
                newSplit,
                originalSplitIndex
            );
            newRowEntries[0].readOnly = true;
            
            const isNewSplit = (rowIndex + 1) >= newRowEntries.length;
            if (isNewSplit) {
                // 'new' split, need to add another 'new' split...
                newRowEntries.push(this.createSplitRowEntry());
            }

            if (rowIndex !== 0) {
                let splitIndexToBalance = 0;
                if (isNewSplit) {
                    // If the new split doesn't have any quantities defined then
                    // we want to balance it.
                    if (newSplit.quantityBaseValue === '') {
                        splitIndexToBalance = rowIndex;
                    }
                }

                const splits = [];
                for (let i = newRowEntries.length - 2; i > splitIndexToBalance; --i) {
                    splits.push(newRowEntries[i].split);
                }
                for (let i = splitIndexToBalance - 1; i >= 0; --i) {
                    splits.push(newRowEntries[i].split);
                }
                const mainSplit = newRowEntries[splitIndexToBalance].split;

                const { accessor } = this.props;
                const balancingSplit = accessor.createBalancingSplitDataItem(
                    splits,
                    mainSplit.accountId);
                if (balancingSplit.quantityBaseValue !== mainSplit.quantityBaseValue) {
                    Object.assign(newRowEntries[splitIndexToBalance].split, 
                        balancingSplit);
                }
            }

            return {
                rowEntries: newRowEntries,
            };
        });

        return true;
    }


    setErrorMsg(columnInfoKey, msg) {
        this._cellEditorsManager.setErrorMsg(columnInfoKey, msg);
    }


    splitsFromRowEntries() {
        const splits = [];
        const originalIndices = [];
        const splitRowEntryIndices = [];
        let splitIndex;

        // We shouldn't have more than a handful of splits, so let's go ahead
        // and sort brute force...
        const { rowEntries } = this.state;
        splits.push(rowEntries[0].split);
        splitRowEntryIndices.push(0);
        originalIndices.push(rowEntries[0].originalIndex);
        splitIndex = 0;

        const endIndex = rowEntries.length - 1; // Last entry is the 'new' split entry...
        for (let i = 1; i < endIndex; ++i) {
            const rowEntry = rowEntries[i];
            const originalIndex = rowEntry.originalIndex;
            if (originalIndex === undefined) {
                splits.push(rowEntry.split);
                splitRowEntryIndices.push(i);
                originalIndices.push(Number.MAX_SAFE_INTEGER);
            }
            else {
                // Need to search for where to insert...
                let j = 0;
                for (; j < splits.length; ++j) {
                    if (originalIndices[j] > originalIndex) {
                        break;
                    }
                }

                splits.splice(j, 0, rowEntry.split);
                splitRowEntryIndices.splice(j, 0, i);
                originalIndices.splice(j, 0, originalIndex);
                if (j <= splitIndex) {
                    ++splitIndex;
                }
            }
        }

        return {
            splits: splits,
            splitIndex: splitIndex,
            splitRowEntryIndices: splitRowEntryIndices,
        };
    }


    onDone() {
        process.nextTick(async () => {
            if (await this._cellEditorsManager.asyncEndRowEdit()) {
                const { onDone } = this.props;
                onDone(this.splitsFromRowEntries());
            }
        });
    }


    onDeleteSplit() {
        const { activeRowIndex, } = this.state;
        if (activeRowIndex > 0) {
            this._cellEditorsManager.cancelRowEdit();
            if ((activeRowIndex + 1) === this.state.rowEntries.length) {
                // Don't actually delete the new split row...
                return;
            }

            let { splits, splitIndex, splitRowEntryIndices } 
                = this.splitsFromRowEntries();
            for (let i = 0; i < splitRowEntryIndices.length; ++i) {
                if (splitRowEntryIndices[i] === activeRowIndex) {
                    // The one to delete...
                    splits.splice(i, 1);
                    if (i < splitIndex) {
                        --splitIndex;
                    }

                    if (splits.length > 1) {
                        const nonMainSplits = Array.from(splits);
                        nonMainSplits.splice(splitIndex, 1);
                        const { accessor } = this.props;
                        splits[splitIndex] = accessor.createBalancingSplitDataItem(
                            nonMainSplits,
                            splits[splitIndex].accountId);
                    }

                    this.setState(this.buildRowEntries({
                        splits: splits,
                        splitIndex: splitIndex,
                    }));
                    break;
                }
            }
        }
    }


    onDeleteAll() {
        this._cellEditorsManager.cancelRowEdit();
        const { rowEntries } = this.state;
        if (rowEntries.length > 2) {
            let { splits, splitIndex } = this.splitsFromRowEntries();
            const newSplits = [splits[splitIndex]];
            this.setState(this.buildRowEntries({
                splits: newSplits,
                splitIndex: 0,
            }));
        }
    }

    
    getUndoRedoInfo() {
        return {
            undoInfo: {},
            redoInfo: {},
        };
    }


    renderSplitsTable() {
        const { state } = this;

        return <div className = "RowTableContainer mt-2">
            <EditableRowTable
                columns = {state.columns}

                rowCount = {state.rowEntries.length}
                //getRowKey = {this.getRowKey}

                //onLoadRows = {this.onLoadRows}

                onSetColumnWidth = {this.onSetColumnWidth}

                //contextMenuItems = {this.props.contextMenuItems}
                //onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

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
        </div>;
    }


    render() {
        const { rowEntries, activeRowIndex, } = this.state;

        const actionButtons = [
            {
                label: userMsg('MultiSplitsEditor-delete'),
                onClick: this.onDeleteSplit,
                disabled: (activeRowIndex < 1) || (activeRowIndex >= rowEntries.length),
                classExtras: 'btn-secondary',
            },
            {
                label: userMsg('MultiSplitsEditor-delete_all'),
                onClick: this.onDeleteAll,
                disabled: rowEntries.length <= 2,
                classExtras: 'btn-secondary',
            },
        ];

        const doneDisabled = !this._cellEditorsManager.isEditing()
            && (rowEntries.length <= 2);

        return <ModalPage
            title = {userMsg('MultiSplitsEditor-title')}
            actionButtons = {actionButtons}
            onDone = {this.onDone}
            doneDisabled = {doneDisabled}
            onCancel = {this.props.onCancel}
        >
            {this.renderSplitsTable()}
        </ModalPage>;
    }
}


MultiSplitsEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    splits: PropTypes.array.isRequired,
    splitIndex: PropTypes.number.isRequired,
    onDone: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    columns: PropTypes.arrayOf(PropTypes.string),
};
