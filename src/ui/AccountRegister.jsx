import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as CE from './AccountingCellEditors';
import { columnInfosToColumns, 
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';
import deepEqual from 'deep-equal';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';


const allColumnInfoDefs = {};


function getTransactionCellValue(args) {
    const { rowEntry, columnInfo } = args;
    const { transactionDataItem } = rowEntry;
    const { propertyName } = columnInfo;
    if (transactionDataItem && propertyName) {
        return transactionDataItem[propertyName];
    }
}

function saveTransactionCellValue(args) {
    const { saveBuffer, columnInfo, cellEditBuffer } = args;
    const { propertyName } = columnInfo;
    if (saveBuffer && propertyName) {
        saveBuffer[propertyName] = cellEditBuffer.value;
    }
}


function getSplitCellValue(args) {
    const { rowEntry, columnInfo } = args;
    const { transactionDataItem, splitIndex } = rowEntry;
    const { propertyName } = columnInfo;
    if (transactionDataItem && propertyName) {
        return transactionDataItem.splits[splitIndex][propertyName];
    }
}

function saveSplitCellValue(args) {
    const { rowEntry, columnInfo, cellEditBuffer, saveBuffer } = args;
    const { splitIndex } = rowEntry;
    const { propertyName } = columnInfo;
    if (saveBuffer && propertyName) {
        saveBuffer.splits[splitIndex][propertyName] = cellEditBuffer.value;
    }
}


function getAccountStateQuantityCellValue(args) {
    const { rowEntry } = args;
    const { accountStateDataItem, caller } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return {
            quantityBaseValue: quantityBaseValue,
            quantityDefinition: quantityDefinition,
        };
    }
}

// Don't have saveAccountStateQuantityCellValue() as it is read-only...


//
//---------------------------------------------------------
//
function getDescriptionCellValue(args) {
    const { rowEntry } = args;
    const { transactionDataItem, splitIndex } = rowEntry;
    if (transactionDataItem) {
        const split = transactionDataItem.splits[splitIndex];
        let description;
        let memo;
        if (split.description) {
            description = split.description;
            memo = split.memo || transactionDataItem.memo;
        }
        else {
            description = transactionDataItem.description;
            memo = transactionDataItem.memo;
        }

        if (memo) {
            return {
                description: description,
                memo: memo,
            };
        }
        return transactionDataItem.description;
    }
}

function saveDescriptionCellValue(args) {
    const { rowEntry, cellEditBuffer, saveBuffer } = args;
    const { transactionDataItem, splitIndex } = rowEntry;
    if (saveBuffer) {
        const split = transactionDataItem.splits[splitIndex];
        let { value } = cellEditBuffer;
        if (typeof value === 'object') {
            value = value.description;
        }

        if (split.description) {
            saveBuffer.splits[splitIndex].description = value;
        }
        else {
            saveBuffer.description = value;
        }
    }
}


//
//---------------------------------------------------------
// splits

function renderSplitItemTooltip(caller, splits, index) {
    const split = splits[index];
    const splitAccountDataItem 
        = caller.props.accessor.getAccountDataItemWithId(split.accountId);
    if (!splitAccountDataItem) {
        return;
    }
    
    const { quantityDefinition } = caller.state;
    const value = getQuantityDefinition(quantityDefinition)
        .baseValueToValueText(split.quantityBaseValue);
    return <div className = "row" key = {index}>
        <div className = "col col-sm-auto text-left">{splitAccountDataItem.name}</div>
        <div className = "col text-right">{value}</div>
    </div>;
}


function renderSplitsListDisplay(args) {
    const { rowEntry, columnInfo, value } = args;
    const splits = value;
    if (splits) {
        const { caller } = rowEntry;
        const { accessor } = caller.props;
        let text;
        if (splits.length === 2) {
            const split = splits[1 - rowEntry.splitIndex];
            let splitAccountDataItem = accessor.getAccountDataItemWithId(split.accountId);
            if (!splitAccountDataItem) {
                splitAccountDataItem = rowEntry.splitAccountDataItem;
                if (!splitAccountDataItem) {
                    return;
                }
            }

            text = splitAccountDataItem.name;
        }
        else {
            text = userMsg('AccountRegister-multi_splits');
            const tooltipEntries = [];
            for (let i = 0; i < splits.length; ++i) {
                tooltipEntries.push(renderSplitItemTooltip(caller, splits, i));
            }
            const tooltip = <div className = "simple-tooltiptext">
                {tooltipEntries}
            </div>;

            return <div className = "simple-tooltip"> 
                {CE.renderTextDisplay({
                    columnInfo: columnInfo, 
                    value: text,
                })}
                {tooltip}
            </div>;
        }
        
        return CE.renderTextDisplay({
            columnInfo: columnInfo, 
            value: text,
        });
    }
}


function renderSplitsListEditor(args) {

}




//
//---------------------------------------------------------
// Split quantities

function getSplitQuantityCellValue(args, type) {
    const { rowEntry } = args;
    const { transactionDataItem, caller } = rowEntry;
    if (!transactionDataItem) {
        return;
    }
    const { accountType, quantityDefinition } = caller.state;
    const split = transactionDataItem.splits[rowEntry.splitIndex];
    const value = {
        accessor: caller.props.accessor,
        split: split,
        accountType: accountType,
        quantityDefinition: quantityDefinition,
        splitQuantityType: type,
    };
    return value;
}

function saveSplitQuantityCellValue(args) {

}


/**
 */
export function getAccountRegisterColumnInfoDefs(accountType) {
    accountType = A.getAccountType(accountType);

    let columnInfoDefs = allColumnInfoDefs[accountType.name];
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';

        const numericClassName = 'text-right';
        const numericSize = -8; // 12.456,78

        columnInfoDefs = {
            date: { key: 'date',
                header: {
                    label: userMsg('AccountRegister-date'),
                    ariaLabel: 'Date',
                    classExtras: 'text-center',
                },
                inputClassExtras: 'text-center',
                inputSize: -10,
                cellClassName: cellClassName,

                propertyName: 'ymdDate',
                getCellValue: getTransactionCellValue,
                saveCellValue: saveTransactionCellValue,
                renderDisplayCell: CE.renderDateDisplay,
                renderEditCell: CE.renderDateEditor,
            },
            refNum: { key: 'refNum',
                header: {
                    label: userMsg('AccountRegister-refNum'),
                    ariaLabel: 'Number',
                    classExtras: 'text-center',
                },
                inputClassExtras: 'text-center',
                inputSize: -6,
                cellClassName: cellClassName,

                propertyName: 'refNum',
                getCellValue: getSplitCellValue,
                saveCellValue: saveSplitCellValue,
                renderDisplayCell: CE.renderRefNumDisplay,
                renderEditCell: CE.renderRefNumEditor,
            },
            description: { key: 'description',
                header: {
                    label: userMsg('AccountRegister-description'),
                    ariaLabel: 'Description',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName,

                getCellValue: getDescriptionCellValue,
                saveCellValue: saveDescriptionCellValue,
                renderDisplayCell: CE.renderDescriptionDisplay,
                renderEditCell: CE.renderDescriptionEditor,
            },
            splits: { key: 'split',
                header: {
                    label: userMsg('AccountRegister-split'),
                    ariaLabel: 'Split',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName,

                propertyName: 'splits',
                getCellValue: getTransactionCellValue,
                saveCellValue: saveTransactionCellValue,
                renderDisplayCell: renderSplitsListDisplay,
                renderEditCell: renderSplitsListEditor,
            },
            reconcile: { key: 'reconcile',
                header: {
                    label: userMsg('AccountRegister-reconcile'),
                    ariaLabel: 'Reconciled',
                    classExtras: 'text-center',
                },
                inputClassExtras: 'text-center',
                inputSize: 2,
                cellClassName: cellClassName,

                propertyName: 'reconcileState',
                getCellValue: getSplitCellValue,
                saveCellValue: saveSplitCellValue,
                renderDisplayCell: CE.renderReconcileStateDisplay,
                renderEditCell: CE.renderReconcileStateEditor,
            },
        };

        if (accountType.hasLots) {
            // Need to think about this more, what exactly do we want to display
            // when there are shares involved.
            //  - market value? 
            //  - cost basis?
            //  - shares?
            // Also, how does this affect the debit and credit columns?
            //  - bought
            //  - sold
            columnInfoDefs.bought = { key: 'bought',
                header: {
                    label: userMsg('AccountRegister-bought'),
                    ariaLabel: 'Bought',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: (args) => getSplitQuantityCellValue(args, 'bought'),
                saveCellValue: saveSplitQuantityCellValue,
                renderDisplayCell: CE.renderSplitQuantityDisplay,
                renderEditCell: CE.renderSplitQuantityEditor,

            };
            columnInfoDefs.sold = { key: 'sold',
                header: {
                    label: userMsg('AccountRegister-sold'),
                    ariaLabel: 'Sold',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: (args) => getSplitQuantityCellValue(args, 'sold'),
                saveCellValue: saveSplitQuantityCellValue,
                renderDisplayCell: CE.renderSplitQuantityDisplay,
                renderEditCell: CE.renderSplitQuantityEditor,
            };
            columnInfoDefs.shares = { key: 'shares',
                header: {
                    label: userMsg('AccountRegister-shares'),
                    ariaLabel: 'Shares',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: getAccountStateQuantityCellValue,
                renderDisplayCell: CE.renderSharesDisplay,
            };
        }
        else {
            columnInfoDefs.debit = { key: 'debit',
                header: {
                    label: accountType.debitLabel,
                    ariaLabel: accountType.debitLabel,
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: (args) => getSplitQuantityCellValue(args, 'debit'),
                saveCellValue: saveSplitQuantityCellValue,
                renderDisplayCell: CE.renderSplitQuantityDisplay,
                renderEditCell: CE.renderSplitQuantityEditor,
            };
            columnInfoDefs.credit = { key: 'credit',
                header: {
                    label: accountType.creditLabel,
                    ariaLabel: accountType.creditLabel,
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: (args) => getSplitQuantityCellValue(args, 'credit'),
                saveCellValue: saveSplitQuantityCellValue,
                renderDisplayCell: CE.renderSplitQuantityDisplay,
                renderEditCell: CE.renderSplitQuantityEditor,
            };
            columnInfoDefs.balance = { key: 'balance',
                header: {
                    label: userMsg('AccountRegister-balance'),
                    ariaLabel: 'Account Balance',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,

                getCellValue: getAccountStateQuantityCellValue,
                renderDisplayCell: CE.renderBalanceDisplay,
            };

        }

        for (let name in columnInfoDefs) {
            const columnInfo = columnInfoDefs[name];
            columnInfo.ariaLabel = columnInfo.ariaLabel 
                || columnInfo.header.ariaLabel;
        }

        allColumnInfoDefs[accountType.name] = columnInfoDefs;
    }

    return columnInfoDefs;
}




/**
 * Component for account registers.
 */
export class AccountRegister extends React.Component {
    constructor(props) {
        super(props);

        this.onTransactionsAdd = this.onTransactionsAdd.bind(this);
        this.onTransactionsModify = this.onTransactionsModify.bind(this);
        this.onTransactionsRemove = this.onTransactionsRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);
        this.onLoadRows = this.onLoadRows.bind(this);

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

        const { accountId, accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const accountType = A.getAccountType(accountDataItem.type);

        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
            accountDataItem.pricedItemId);

        const columnInfoDefs = getAccountRegisterColumnInfoDefs(accountType);

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


        this._hiddenTransactionIds = new Set();

        this._reconcileItems = [
            [T.ReconcileState.NOT_RECONCILED.name, 
                T.ReconcileState.NOT_RECONCILED.description],
            [T.ReconcileState.PENDING.name, 
                T.ReconcileState.PENDING.description],
            [T.ReconcileState.RECONCILED.name, 
                T.ReconcileState.RECONCILED.description],
        ];

        this.state = {
            accountType: accountType,
            columnInfos: columnInfos,
            rowEntries: [],
            rowEntriesByTransactionId: new Map(),
            currency: pricedItemDataItem.currency,
            quantityDefinition: pricedItemDataItem.quantityDefinition,
        };

        /*
                newRowEntry.accountStateDataItem = resultEntry.accountStateDataItem;
                newRowEntry.transactionDataItem = resultEntry.transactionDataItem;
                newRowEntry.splitIndex = resultEntry.splitIndex;
                key: key.id.toString() + '_' + splitOccurrance,
                rowIndex: newRowEntries.length,
                transactionId: key.id,
                splitOccurrance: splitOccurrance,
        */
        this._sizingRowEntry = {
            caller: this,
            transactionDataItem: {
                ymdDate: '2020-12-31',
                description: userMsg('AccountRegister-dummy_description'),
                splits: [
                    {
                        reconcileState: T.ReconcileState.NOT_RECONCILED,
                        accountId: -1,
                        quantityBaseValue: 999999999,
                        lotChanges: [
                            { quantityBaseValue: 999999999, },
                        ],
                    },
                ],
            },
            accountStateDataItem: {
                ymdDate: '2020-12-31',
                quantityBaseValue: 999999999,
                lotStates: [
                    { quantityBaseValue: 999999999, },
                ],
            },
            splitIndex: 0,
            splitAccountDataItem: {
                name: userMsg('AccountRegister-dummy_accountName'),
            }
        };

        this.state.columns = columnInfosToColumns(this.state);

        this.updateRowEntries();
    }

    
    isTransactionForThis(transactionDataItem) {
        const { splits } = transactionDataItem;
        for (let i = 0; i < splits.length; ++i) {
            const split = splits[i];
            if (split.accountId === this.props.accountId) {
                return true;
            }
        }
    }

    onTransactionsAdd(result) {
        const { newTransactionDataItems } = result;
        const addedIds = new Set();
        newTransactionDataItems.forEach((transactionDataItem) => {
            if (this.isTransactionForThis(transactionDataItem)) {
                addedIds.add(transactionDataItem.id);
            }
        });

        if (addedIds.size) {
            this.updateRowEntries(addedIds);
        }
    }

    
    onTransactionsModify(result) {
        const { newTransactionDataItems } = result;
        const modifiedIds = new Set();
        newTransactionDataItems.forEach((transactionDataItem) => {
            if (this.isTransactionForThis(transactionDataItem)) {
                modifiedIds.add(transactionDataItem.id);
            }
        });

        if (modifiedIds.size) {
            this.updateRowEntries(modifiedIds);
        }
    }


    onTransactionsRemove(result) {
        const { removedTransactionDataItems } = result;
        const removedIds = new Set();
        removedTransactionDataItems.forEach((transactionDataItem) => {
            if (this.isTransactionForThis(transactionDataItem)) {
                const { id } = transactionDataItem;
                const { editInfo } = this.state;
                if (editInfo && (editInfo.transactionId === id)) {
                    editInfo.cancelRowEdit();
                }

                removedIds.add(id);
            }    
        });

        if (removedIds.size) {
            // Don't need to pass in the removed ids...
            this.updateRowEntries();
        }
    }


    componentDidMount() {
        this.props.accessor.on('transactionsAdd', this.onTransactionsAdd);
        this.props.accessor.on('transactionsModify', this.onTransactionsModify);
        this.props.accessor.on('transactionsRemove', this.onTransactionsRemove);
    }

    componentWillUnmount() {
        this.props.accessor.off('transactionsAdd', this.onTransactionsAdd);
        this.props.accessor.off('transactionsModify', this.onTransactionsModify);
        this.props.accessor.off('transactionsRemove', this.onTransactionsRemove);
    }


    componentDidUpdate(prevProps) {
        let rowsNeedUpdating = false;
        const { hiddenTransactionIds, 
            showHiddenTransactions } = this.props;

        if (!deepEqual(prevProps.hiddenTransactionIds, hiddenTransactionIds)) {
            this._hiddenTransactionIds = new Set(hiddenTransactionIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenTransactions !== showHiddenTransactions) {
            rowsNeedUpdating = true;
        }

        if (rowsNeedUpdating) {
            this.updateRowEntries();
        }
    }

    //
    // rowEntry has:
    //  key: key.id.toString() + '_' + splitOccurrance,
    //  rowIndex: newRowEntries.length,
    //  transactionId: key.id,
    //  splitOccurrance: splitOccurrance,
    //  transactionDataItem 
    //  accountStateDataItem

    updateRowEntries(modifiedTransactionIds) {
        process.nextTick(async () => {
            const newRowEntries = [];
            const newRowEntriesByTransactionIds = new Map();

            modifiedTransactionIds = modifiedTransactionIds || new Set();

            const { accessor, accountId } = this.props;
            const transactionKeys 
                = await accessor.asyncGetSortedTransactionKeysForAccount(
                    accountId, true);
            
            
            let { activeRowIndex } = this.state;

            let visibleRowRange;
            if (this._rowTableRef.current) {
                visibleRowRange = this._rowTableRef.current.getVisibleRowRange();
            }
            let activeRowEntry;
            
            const { rowEntriesByTransactionId } = this.state;
            transactionKeys.forEach((key) => {
                if (!this.isTransactionKeyDisplayed(key)) {
                    return;
                }

                const { splitCount } = key;

                let existingTransactionRowEntries = rowEntriesByTransactionId.get(key.id);
                let isModified = modifiedTransactionIds.has(key.id);

                for (let splitOccurrance = 0; splitOccurrance < splitCount; 
                    ++splitOccurrance) {
                    const rowEntryKey = key.id.toString() + '_' + splitOccurrance;
                    let existingRowEntry;
                    if (existingTransactionRowEntries) {
                        for (let i = 0; i < existingTransactionRowEntries.length; ++i) {
                            const entry = existingTransactionRowEntries[i];
                            if (entry.key === rowEntryKey) {
                                existingRowEntry = existingTransactionRowEntries[i];

                                if (isModified) {
                                    // Want an unloaded copy...
                                    existingRowEntry = Object.assign({}, 
                                        existingRowEntry);
                                    existingRowEntry.transactionDataItem = undefined;
                                    existingRowEntry.accountStateDataItem = undefined;
                                }

                                if (activeRowIndex === existingRowEntry.rowIndex) {
                                    activeRowEntry = existingRowEntry;
                                }

                                break;
                            }
                        }
                    }

                    let rowEntry = existingRowEntry;
                    if (!rowEntry) {
                        rowEntry = {
                            key: rowEntryKey,
                            transactionId: key.id,
                            splitOccurrance: splitOccurrance,
                            caller: this,
                        };
                    }
                    newRowEntries.push(rowEntry);

                    const transactionRowEntries 
                        = newRowEntriesByTransactionIds.get(key.id);
                    if (!transactionRowEntries) {
                        newRowEntriesByTransactionIds.set(key.id, [rowEntry]);
                    }
                    else {
                        transactionRowEntries.push(rowEntry);
                    }
                }
            });

            // TODO:
            // Need to add the 'new transaction' row entry

            // Update the row entry indices.
            let newTopVisibleRow;
            let newBottomFullyVisibleRow;

            for (let i = 0; i < newRowEntries.length; ++i) {
                const oldRowIndex = newRowEntries[i].rowIndex;
                if (oldRowIndex !== undefined) {
                    // Was the row visible?
                    if (visibleRowRange) {
                        if ((oldRowIndex >= visibleRowRange.topVisibleRow)
                         && (oldRowIndex <= visibleRowRange.bottomVisibleRow)) {
                            if ((newTopVisibleRow === undefined)
                             || (oldRowIndex < newTopVisibleRow)) {
                                newTopVisibleRow = oldRowIndex;
                            }
                            if ((newBottomFullyVisibleRow === undefined)
                             || (oldRowIndex > newBottomFullyVisibleRow)) {
                                newBottomFullyVisibleRow = oldRowIndex;
                            }
                        }
                    }
                }
                newRowEntries[i].rowIndex = i;
            }

            if (activeRowEntry) {
                activeRowIndex = activeRowEntry.rowIndex;
            }

            if ((activeRowIndex === undefined) 
             || (activeRowIndex >= newRowEntries.length)) {
                activeRowIndex = newRowEntries.length - 1;
            }
            
            this.setState({
                activeRowIndex: activeRowIndex,
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
                minLoadedRowIndex: newRowEntries.length,
                maxLoadedRowIndex: -1,
            });

            if (newTopVisibleRow !== undefined) {
                if (activeRowIndex !== undefined) {

                    // Keep the active row visible...
                    let delta = 0;
                    if (activeRowIndex < newTopVisibleRow) {
                        delta = activeRowIndex - newTopVisibleRow;
                    }
                    else if (activeRowIndex > newBottomFullyVisibleRow) {
                        delta = activeRowIndex - newBottomFullyVisibleRow;
                    }
                    newTopVisibleRow += delta;
                    newBottomFullyVisibleRow += delta;
                }

                
                const pageRows = newBottomFullyVisibleRow - newTopVisibleRow + 1;
                const firstRowToLoad = Math.max(0, newTopVisibleRow - pageRows);
                const lastRowToLoad = Math.min(newRowEntries.length - 1, 
                    newBottomFullyVisibleRow + pageRows);
                
                
                this._firstRowIndexToLoad = firstRowToLoad;
                this._lastRowIndexToLoad = lastRowToLoad;
                this.asyncLoadRows().then(() => {
                    this._rowTableRef.current.makeRowRangeVisible(
                        newTopVisibleRow, newBottomFullyVisibleRow);
                });
            }
        });
    }


    getRowKey(rowIndex) {
        const { rowEntries } = this.state;
        const rowEntry = rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.transactionId;
        }
        return -rowIndex;
    }


    async asyncLoadRows() {
        const firstRowIndex = this._firstRowIndexToLoad;
        const lastRowIndex = this._lastRowIndexToLoad;

        const { accessor } = this.props;
        const { accountId } = this.props;
        const { rowEntries } = this.state;
        const transactionIdA = rowEntries[firstRowIndex].transactionId;
        const transactionIdB = rowEntries[lastRowIndex].transactionId;

        const results = await accessor.asyncGetAccountStateAndTransactionDataItems(
            accountId, transactionIdA, transactionIdB);
        
        const newRowEntries = Array.from(rowEntries);
        const newRowEntriesByTransactionIds 
            = new Map(this.state.rowEntriesByTransactionId);

        let resultIndex = 0;
        for (let rowIndex = firstRowIndex; rowIndex <= lastRowIndex; 
            ++rowIndex, ++resultIndex) {
            const newRowEntry = Object.assign({}, rowEntries[rowIndex]);
            const id = newRowEntry.transactionId;
            const { splitOccurrance } = newRowEntry;

            // We need to look out for skipped transactions and also the possibility
            // that we're now out of sync...
            let resultEntry;
            for (; resultIndex < results.length; ++resultIndex) {
                resultEntry = results[resultIndex];
                if ((splitOccurrance === resultEntry.splitOccurrance)
                 && (id === resultEntry.transactionDataItem.id)) {
                    break;
                }
            }
            if (resultIndex >= results.length) {
                // Uh-oh, must be out of sync...
                console.log('Out of sync...');
                return;
            }
            
            newRowEntry.accountStateDataItem = resultEntry.accountStateDataItem;
            newRowEntry.transactionDataItem = resultEntry.transactionDataItem;
            newRowEntry.splitIndex = resultEntry.splitIndex;

            newRowEntries[rowIndex] = newRowEntry;
            let transactionIdRowEntries 
                = Array.from(newRowEntriesByTransactionIds.get(id));
            transactionIdRowEntries[newRowEntry.splitOccurrance]
                = newRowEntry;
            newRowEntriesByTransactionIds.set(id, transactionIdRowEntries);
        }

        this.setState((state) => {
            return {
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
                minLoadedRowIndex: Math.min(firstRowIndex, state.minLoadedRowIndex),
                maxLoadedRowIndex: Math.max(lastRowIndex, state.maxLoadedRowIndex),
            };
        });
    }


    onLoadRows({firstRowIndex, lastRowIndex}) {
        // We're not using state.minLoadedRowIndex and maxLoadedRowIndex to
        // determine if loading is needed in case for some reason a row entry
        // within that range was not loaded.
        const { rowEntries, } = this.state;
        let needsLoading = false;
        for (let i = firstRowIndex; i <= lastRowIndex; ++i) {
            const rowEntry = rowEntries[i];
            if (!rowEntry.accountStateDataItem) {
                needsLoading = true;
                break;
            }
        }

        if (needsLoading) {
            this._firstRowIndexToLoad = firstRowIndex;
            this._lastRowIndexToLoad = lastRowIndex;
            process.nextTick(async () => this.asyncLoadRows());
        }
    }


    isTransactionKeyDisplayed(key) {
        const { id } = key;
        const { showHiddenTransactions } = this.props;
        if (!showHiddenTransactions && this._hiddenTransactionIds.has(id)) {
            return false;
        }

        return true;
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
        const { transactionDataItem } = rowEntry;
        return T.getTransactionDataItem(transactionDataItem, true);
    }


    async asyncSaveBuffer(args) {
        try {
            const { rowIndex, saveBuffer: newTransactionDataItem } = args;
            const rowEntry = this.state.rowEntries[rowIndex];
            const { transactionDataItem } = rowEntry;

            const { accessor } = this.props;
            const accountingActions = accessor.getAccountingActions();
            let action;
            if ((rowIndex + 1) === this.state.rowEntries.length) {
                // Last row is new transaction...
                action = accountingActions.createAddTransactionsAction(
                    newTransactionDataItem
                );
            }
            else {
                if (!T.areTransactionsSimilar(
                    newTransactionDataItem, transactionDataItem)) {

                    action = accountingActions.createModifyTransactionsAction(
                        newTransactionDataItem
                    );
                }
            }

            if (action) {
                await accessor.asyncApplyAction(action);
            }
        }
        catch (e) {
            this.setErrorMsg('description', e.toString());
            return;
        }

        return true;
    }


    setErrorMsg(key, msg) {
        this.setState({
            errorMsgs: {
                [key]: msg,
            }
        });
        return msg;
    }

    render() {
        const { state } = this;

        return <div className = "RowTableContainer AccountRegister">
            <EditableRowTable
                columns = {state.columns}

                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}

                onLoadRows = {this.onLoadRows}

                onSetColumnWidth = {this.onSetColumnWidth}

                //rowHeight: PropTypes.number,
                //headerHeight: PropTypes.number,
                //footerHeight: PropTypes.number,

                //onOpenRow: PropTypes.func,
                //onCloseRow: PropTypes.func,

                //onContextMenu: PropTypes.func,
                //contextMenuItems: PropTypes.array,
                //onChooseContextMenuItem: PropTypes.func,
                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

                classExtras = "table-striped"
                //headerClassExtras: PropTypes.string,
                //bodyClassExtras: PropTypes.string,
                //rowClassExtras: PropTypes.string,
                //footerClassExtras: PropTypes.string,

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
    }
}


/**
 * @typedef {object} AccountRegister~propTypes
 * @property {EngineAccessor}   accessor
 */
AccountRegister.propTypes = {
    accessor: PropTypes.object.isRequired,
    accountId: PropTypes.number.isRequired,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.string),
    hiddenTransactionIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenTransactions: PropTypes.bool,
    showTransactionIds: PropTypes.bool,
    children: PropTypes.any,
};
