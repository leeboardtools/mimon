import React from 'react';
import PropTypes from 'prop-types';
import { userMsg, userError } from '../util/UserMessages';
import { columnInfosToColumns, } from '../util-ui/ColumnInfo';
import { ModalPage } from '../util-ui/ModalPage';
import { ContentFramer } from '../util-ui/ContentFramer';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';
import { CellButton } from '../util-ui/CellButton';
import { QuantityDisplay } from '../util-ui/QuantityDisplay';
import { Field } from '../util-ui/Field';
import { getYMDDate, YMDDate } from '../util/YMDDate';
import * as ACE from './AccountingCellEditors';
import { getQuantityDefinition } from '../util/Quantities';
import { getCurrency } from '../util/Currency';
import { bSearch } from '../util/BinarySearch';
import * as T from '../engine/Transactions';
import { AccessorRowTableHandler } from './RowTableHelpers';


const projectSettingsPath = ['LotsSelectionEditor', ];

async function asyncProcessLotTransactions({ accessor, accountId, 
    transactionId, ymdDate, }) {

    let lotStates = [];
    let availableSharesBaseValue = 0;
    let futureFIFOSharesBaseValue = 0;
    let futureLIFOSharesBaseValue = 0;

    ymdDate = getYMDDate(ymdDate);

    // We want the transaction after the date, since we're going to be grabbing
    // the account state before the transaction.
    const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
        accountId);

    let transactionIndex;
    if (transactionId) {
        for (let transactionIndex = 0; transactionIndex < transactionKeys.length; 
            ++transactionIndex) {
            if (transactionKeys[transactionIndex].id === transactionId) {
                break;
            }
        }
    }
    else {
        transactionIndex = bSearch(transactionKeys, ymdDate, (value, arrayValue) => 
            YMDDate.compare(value, arrayValue.ymdDate));
        if (transactionIndex >= 0) {
            for ( ; transactionIndex < transactionKeys.length; ++transactionIndex) {
                if (YMDDate.compare(transactionKeys[transactionIndex].ymdDate, ymdDate)
                 > 0) {
                    break;
                }
            }
            if (transactionIndex < transactionKeys.length) {
                transactionId = transactionKeys[transactionIndex].id;
            }

            // Back up the index because we want to include the transaction in 
            // future processing
            --transactionIndex;
        }
    }

    const accountStates = (transactionId)
        ? await accessor.asyncGetAccountStateDataItemsBeforeTransaction(
            accountId, transactionId)
        : [ accessor.getCurrentAccountStateDataItem(accountId) ];
    if (accountStates.length) {
        // accountState contains the lots available prior to this transaction.
        const accountState = accountStates[accountStates.length - 1];
        lotStates = accountState.lotStates;

        // TODO:
        // Now we need to remove any lots that have been sold in the future.
        const transactionIds = [];
        for (let i = transactionIndex + 1; i < transactionKeys.length; ++i) {
            transactionIds.push(transactionKeys[i].id);
        }

        const transactionDataItems = await accessor.asyncGetTransactionDataItemsWithIds(
            transactionIds);
        
        transactionDataItems.forEach((transactionDataItem) => {
            transactionDataItems.splits.forEach((split) => {
                if (split.accountId !== accountId) {
                    return;
                }

                switch (split.lotTransactionType) {
                case T.LotTransactionType.BUY_SELL.name :
                    if (split.quantityBaseValue < 0) {
                        const { lotChanges } = split;

                        switch (split.sellAutoLotType) {
                        case T.AutoLotType.FIFO.name :
                            futureFIFOSharesBaseValue 
                                += split.sellAutoLotQuantityBaseValue;
                            break;

                        case T.AutoLotType.LIFO.name :
                            futureLIFOSharesBaseValue 
                                += split.sellAutoLotQuantityBaseValue;
                            break;
                        
                        default :
                            lotChanges.forEach((lotChange) => {
                                for (let i = 0; i < lotStates.length; ++i) {
                                    const lotState = lotStates[i];
                                    if (lotState.lotId === lotChange.lotId) {
                                        lotState.quantityBaseValue 
                                            -= lotChange.quantityBaseValue;
                                        if (lotState.quantityBaseValue <= 0) {
                                            lotStates.splice(i, 1);
                                        }
                                        break;
                                    }
                                }
                            });
                            break;
                        }

                    }
                    break;
                }
            });
        });

        lotStates.forEach((lotState) => {
            availableSharesBaseValue += lotState.quantityBaseValue;
        });
    }

    // When building the list of lots to choose from, we want to exclude
    // any lots used by earlier transactions, including FIFO and LIFO,
    // and then exclude any lots explicitly chosen for by later transactions.

    return {
        lotStates: lotStates,
        availableSharesBaseValue: availableSharesBaseValue,
        futureFIFOSharesBaseValue: futureFIFOSharesBaseValue,
        futureLIFOSharesBaseValue: futureLIFOSharesBaseValue,
    };
}


function getCellValue(args, name) {
    const { rowEditBuffer, rowEntry } = args;
    if (rowEditBuffer && (rowEditBuffer[name] !== undefined)) {
        return rowEditBuffer[name];
    }

    if (rowEntry) {
        return rowEntry[name];
    }
}


function getSharesCellValue(args, name) {
    const { rowEntry } = args;
    return {
        quantityBaseValue: getCellValue(args, name),
        quantityDefinition: rowEntry.sharesQuantityDefinition,
    };
}


function saveSelectedSharesCellValue(args) {
    const { cellEditBuffer, saveBuffer, rowEntry } = args;
    if (saveBuffer && cellEditBuffer) {
        let { quantityBaseValue } = cellEditBuffer.value;
        if (quantityBaseValue < 0) {
            throw userError('LotsSelectionEditor-shares_lt_zero');
        }
        if (quantityBaseValue > rowEntry.availableSharesBaseValue) {
            quantityBaseValue = rowEntry.availableSharesBaseValue;
        }
        saveBuffer.selectedSharesBaseValue = quantityBaseValue;
    }
}



function renderButton(args, title, onClick) {
    const { columnInfo } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    return <CellButton
        value = {title}
        ariaLabel = {ariaLabel}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onClick = {(e) => onClick(e, args)}
    />;
}


function renderAllButton(args) {
    return renderButton(args, userMsg('LotsSelectionEditor-all_button'),
        (e) => {
            const { rowEntry, rowIndex } = args;
            const { caller } = rowEntry;
            const newRowEntry = Object.assign({}, rowEntry);
            newRowEntry.selectedSharesBaseValue
                = newRowEntry.availableSharesBaseValue;
            caller.updateRowEntry(rowIndex, newRowEntry, args);
        });
}

function renderNoneButton(args) {
    return renderButton(args, userMsg('LotsSelectionEditor-none_button'),
        (e) => {
            const { rowEntry, rowIndex } = args;
            const { caller } = rowEntry;
            const newRowEntry = Object.assign({}, rowEntry);
            newRowEntry.selectedSharesBaseValue = 0;
            caller.updateRowEntry(rowIndex, newRowEntry, args);
        });
}


function getLotsSelectionEditorColumnInfos() {
    const columnInfos = {
        // Purchase date
        ymdDatePurchased: ACE.getDateColumnInfo({
            getCellValue: (args) => {
                return {
                    ymdDate: getCellValue(args, 'ymdDatePurchased'),
                };
            }
        }),

        term: { key: 'term',
            header: {
                label: userMsg('LotsSelectionEditor-term'),
                ariaLabel: 'Term',
                classExtras: 'RowTable-header-base',
            },
            inputClassExtras: '',
            cellClassName: 'RowTable-cell-base',

            getCellValue: (args) => getCellValue(args, 'term'),
            renderDisplayCell: ACE.renderTextDisplay,
        },

        availableShares: { key: 'availableShares',
            header: {
                label: userMsg('LotsSelectionEditor-availableShares'),
                ariaLabel: 'Term',
                classExtras: 'RowTable-header-base Shares-base Shares-header',
            },
            inputClassExtras: 'Shares-base Shares-input',
            cellClassName: 'RowTable-cell-base Shares-base Shares-cell',

            getCellValue: (args) => getSharesCellValue(args, 'availableSharesBaseValue'),
            renderDisplayCell: ACE.renderQuantityDisplay,
        },

        selectedShares: { key: 'selectedShares',
            header: {
                label: userMsg('LotsSelectionEditor-selectedShares'),
                ariaLabel: 'Term',
                classExtras: 'RowTable-header-base Shares-base Shares-header',
            },
            inputClassExtras: 'Shares-base Shares-input',
            cellClassName: 'RowTable-cell-base Shares-base Shares-cell',

            getCellValue: (args) => getSharesCellValue(args, 'selectedSharesBaseValue'),
            saveCellValue: saveSelectedSharesCellValue,
            renderDisplayCell: ACE.renderQuantityDisplay,
            renderEditCell: ACE.renderQuantityEditor,
        },

        // All button
        allButton: { key: 'allButton',
            header: {
                ariaLabel: 'All Buttons',
                classExtras: 'RowTable-header-base',
            },
            ariaLabel: 'All',
            inputClassExtras: 'Button-input',
            cellClassName: 'RowTable-cell-base All_None-button',

            getCellValue: (args) => '',
            saveCellValue: (args) => '',    
            // Need saveCellValue this so we get setCellEditBuffer in args...
            renderDisplayCell: renderAllButton,
            renderEditCell: renderAllButton,
        },

        // None button
        noneButton: { key: 'noneButton',
            header: {
                ariaLabel: 'None Buttons',
                classExtras: 'RowTable-header-base',
            },
            ariaLabel: 'None',
            inputClassExtras: 'Button-input',
            cellClassName: 'RowTable-cell-base All_None-button',

            getCellValue: (args) => '',
            saveCellValue: (args) => '',
            // Need saveCellValue this so we get setCellEditBuffer in args...
            renderDisplayCell: renderNoneButton,
            renderEditCell: renderNoneButton,
        },

        // Additional columns:
        // Gain/loss on selected shares
    };
    return columnInfos;
}


function createDefaultColumns() {
    const columnInfos = getLotsSelectionEditorColumnInfos();

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });
    columns.forEach((column) => column.isVisible = true);

    return columns;
}


/**
 * React component for selecting lots.
 */
export class LotsSelectionEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onDone = this.onDone.bind(this);
        this.onSelectAll = this.onSelectAll.bind(this);
        this.onClearAll = this.onClearAll.bind(this);

        this.getUndoRedoInfo = this.getUndoRedoInfo.bind(this);

        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);

        this.renderLotsTable = this.renderLotsTable.bind(this);
        this.renderSummary = this.renderSummary.bind(this);

        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);

        this.getRowEntry = this.getRowEntry.bind(this);
        this.getRowKey = this.getRowKey.bind(this);
        
        this.getSaveBuffer = this.getSaveBuffer.bind(this);
        this.asyncSaveBuffer = this.asyncSaveBuffer.bind(this);

        this._cellEditorsManager = new CellEditorsManager({
            getRowEntry: this.getRowEntry,
            getColumnInfo: (columnIndex) => this.state.columns[columnIndex].columnInfo,
            setManagerState: (state) => this.setState({
                managerState: state,
            }),
            getManagerState: () => this.state.managerState,
            getSaveBuffer: this.getSaveBuffer,
            asyncSaveBuffer: this.asyncSaveBuffer,
        });

        this._rowTableRef = React.createRef();


        this._rowTableHandler = new AccessorRowTableHandler({
            accessor: props.accessor,
            getState: (stateId) => this.state,
            setState: (stateId, state) => this.setState(state),
            projectSettingsPath: projectSettingsPath,
        });

        const allColumns = createDefaultColumns();

        this.state = {
            allColumns: allColumns,
            rowEntries: [],
            activeRowIndex: 0,
        };

        this._sizingRowEntry = {
            key: 'sizing',
            ymdDatePurchased: '2020-12-3112',
            term: userMsg('LotsSelectionEditor-SHORT_TERM'),
            availableSharesBaseValue: ACE.BalanceSizingBaseValue,
            selectedSharesBaseValue: ACE.BalanceSizingBaseValue,
        };


        let settings = props.accessor.getProjectSettings(
            projectSettingsPath
        ) || {};
        this._rowTableHandler.setupNewStateFromSettings(undefined, 
            this.state, settings);


        this._undoStates = [];
        this._redoStates = [];

        this.updateRowEntries(this.props.lotChanges);
    }


    componentDidMount() {

    }


    componentWillUnmount() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    componentDidUpdate(prevProps) {
    }


    updateRowEntries(lotChanges) {
        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        process.nextTick(async () => {
            const lotChangesById = new Map();
            if (lotChanges) {
                lotChanges.forEach((lotChange) => {
                    lotChangesById.set(lotChange.lotId, lotChange);
                });
            }

            const newRowEntries = [];
            let { activeRowIndex, rowEntries } = this.state;

            const { accessor, accountId } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );

            const sharesQuantityDefinition = getQuantityDefinition(
                pricedItemDataItem.quantityDefinition
            );
            let currency = pricedItemDataItem.currency || accessor.getBaseCurrencyCode();
            currency = getCurrency(currency);
            const currencyQuantityDefinition = currency.getQuantityDefinition();

            let activeLotId;
            if ((activeRowIndex !== undefined)
             && (activeRowIndex < rowEntries.length)) {
                activeLotId = rowEntries[activeRowIndex].lotId;
            }

            const rowEntriesByLotId = new Map();
            rowEntries.forEach((rowEntry) => {
                rowEntriesByLotId.set(rowEntry.lotId, rowEntry);
            });

            const result = await asyncProcessLotTransactions(this.props);
            const { lotStates, 
                availableSharesBaseValue,
                futureLIFOSharesBaseValue } = result;
            if (lotStates) {
                const ymdDateSale = getYMDDate(this.props.ymdDate);
                const longTermMsg = userMsg('LotsSelectionEditor-LONG_TERM');
                const shortTermMsg = userMsg('LotsSelectionEditor-SHORT_TERM');
                lotStates.forEach((lotState) => {
                    const { lotId, ymdDateCreated, quantityBaseValue } = lotState;
                    if (lotId === activeLotId) {
                        activeRowIndex = newRowEntries.length;
                    }

                    let selectedSharesBaseValue = 0;
                    let { costBasisBaseValue } = lotState;
                    const existingRowEntry = rowEntriesByLotId.get(lotId);
                    if (existingRowEntry) {
                        selectedSharesBaseValue 
                            = existingRowEntry.selectedSharesBaseValue;
                        costBasisBaseValue = existingRowEntry.costBasisBaseValue;
                    }
                    else {
                        const lotChange = lotChangesById.get(lotId);
                        if (lotChange) {
                            selectedSharesBaseValue = -lotChange.quantityBaseValue;
                            costBasisBaseValue = lotChange.costBasisBaseValue;
                        }
                    }

                    const ymdDatePurchased = getYMDDate(ymdDateCreated);
                    let term;
                    if (ymdDateSale) {
                        const monthsAfter = ymdDatePurchased.monthsAfterMe(ymdDateSale);
                        term = (monthsAfter > 12)
                            ? longTermMsg
                            : shortTermMsg;
                    }

                    newRowEntries.push({
                        key: newRowEntries.length,
                        caller: this,
                        lotId: lotId,
                        ymdDatePurchased: ymdDateCreated,
                        term: term,
                        availableSharesBaseValue: quantityBaseValue,
                        selectedSharesBaseValue: selectedSharesBaseValue,
                        costBasisBaseValue: costBasisBaseValue,
                        sharesQuantityDefinition:
                            sharesQuantityDefinition,
                        currencyQuantityDefinition:
                            currencyQuantityDefinition,
                    });
                });
            }

            const newState = Object.assign({
                activeRowIndex: activeRowIndex,
                rowEntries: newRowEntries,
                availableSharesBaseValue: availableSharesBaseValue,
                futureLIFOSharesBaseValue: futureLIFOSharesBaseValue,
                sharesQuantityDefinition: sharesQuantityDefinition,
                currencyQuantityDefinition: currencyQuantityDefinition,
            }, 
            this.newRowEntriesState(newRowEntries));

            this.setState(newState);
        });
    }


    newRowEntriesState(newRowEntries) {
        let totalAvailableSharesBaseValue = 0;
        let totalSelectedSharesBaseValue = 0;
        newRowEntries.forEach((rowEntry) => {
            totalAvailableSharesBaseValue += rowEntry.availableSharesBaseValue;
            totalSelectedSharesBaseValue += rowEntry.selectedSharesBaseValue;
        });
        return {
            rowEntries: newRowEntries,
            totalAvailableSharesBaseValue: totalAvailableSharesBaseValue,
            totalSelectedSharesBaseValue: totalSelectedSharesBaseValue,
        };
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



    getRowKey(rowIndex) {
        const { rowEntries } = this.state;
        const rowEntry = rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.key;
        }
        return (-rowIndex).toString();
    }


    updateRowEntry(index, rowEntry, args) {
        this.setState((state, props) => {
            const newRowEntries = Array.from(state.rowEntries);
            newRowEntries[index] = rowEntry;
            return this.newRowEntriesState(newRowEntries);
        },
        () => {
            if (args && (this._cellEditorsManager.getEditRowIndex() === index)) {
                this._cellEditorsManager.reloadCellEditBuffers(args);
            }
        });
    }
    
    
    getSaveBuffer(args) {
        const { rowIndex } = args;
        const rowEntry = this.state.rowEntries[rowIndex];
        return {
            selectedSharesBaseValue: rowEntry.selectedSharesBaseValue,
        };
    }


    async asyncSaveBuffer(args) {
        const { rowIndex, saveBuffer } = args;
        const newRowEntry = Object.assign({}, this.state.rowEntries[rowIndex], {
            selectedSharesBaseValue: saveBuffer.selectedSharesBaseValue,
        });
        this.updateRowEntry(rowIndex, newRowEntry);

        return true;
    }


    setErrorMsg(columnInfoKey, msg) {
        this._cellEditorsManager.setErrorMsg(columnInfoKey, msg);
    }


    onDone() {
        process.nextTick(async () => {
            if (await this._cellEditorsManager.asyncEndRowEdit()) {
                const { onDone } = this.props;
                const { rowEntries } = this.state;

                const lotChanges = [];
                rowEntries.forEach((rowEntry) => {
                    if (rowEntry.selectedSharesBaseValue > 0) {
                        lotChanges.push({
                            lotId: rowEntry.lotId,
                            quantityBaseValue: -rowEntry.selectedSharesBaseValue,
                            costBasisBaseValue: rowEntry.costBasisBaseValue,
                        });
                    }
                });

                const result = {
                    lotChanges: lotChanges,
                };

                onDone(result);
            }
        });
    }


    onSelectAll() {
        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        this.setState((state) => {
            const { rowEntries } = state;
            const newRowEntries = rowEntries.map((rowEntry) => 
                (rowEntry.selectedSharesBaseValue
                 !== rowEntry.availableSharesBaseValue) 
                    ? Object.assign({}, rowEntry, 
                        {
                            selectedSharesBaseValue: rowEntry.availableSharesBaseValue
                        })
                    : rowEntry);
            return this.newRowEntriesState(newRowEntries);
        });
    }


    onClearAll() {
        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        this.setState((state) => {
            const { rowEntries } = state;
            const newRowEntries = rowEntries.map((rowEntry) => 
                (rowEntry.selectedSharesBaseValue) 
                    ? Object.assign({}, rowEntry, 
                        {
                            selectedSharesBaseValue: 0
                        })
                    : rowEntry);
            return this.newRowEntriesState(newRowEntries);
        });
    }



    saveUndoState() {
        /*
        this._undoStates.push({
            rowEntries: this.state.rowEntries.map((rowEntry) => 
                Object.assign({}, rowEntry, {
                    split: T.getSplitDataItem(rowEntry.split, true),
                })),
        });
        */
        this._redoStates.length = 0;
        this.refreshUndoMenu();
    }


    refreshUndoMenu() {
        const { refreshUndoMenu } = this.props;
        if (refreshUndoMenu) {
            refreshUndoMenu();
        }
    }


    onUndo() {
        const {_undoStates } = this;
        const undoCount = _undoStates.length;
        if (undoCount) {
            const undoState = _undoStates[undoCount - 1];
            --_undoStates.length;

            this._redoStates.push({
                rowEntries: this.state.rowEntries,
            });
            this.setState(undoState, () => this.refreshUndoMenu());
        }
    }


    onRedo() {
        const {_redoStates } = this;
        const redoCount = _redoStates.length;
        if (redoCount) {
            const redoState = _redoStates[redoCount - 1];
            --_redoStates.length;

            this._undoStates.push({
                rowEntries: this.state.rowEntries,
            });
            this.setState(redoState, () => this.refreshUndoMenu());
        }
    }

    
    getUndoRedoInfo() {
        const undoInfo = {};
        if (this._undoStates.length) {
            undoInfo.label = userMsg('MainWindow-undo_label');
            undoInfo.onClick = this.onUndo;
        }

        const redoInfo = {};
        if (this._redoStates.length) {
            redoInfo.label = userMsg('MainWindow-redo_label');
            redoInfo.onClick = this.onRedo;
        }
        
        return {
            undoInfo: undoInfo,
            redoInfo: redoInfo,
        };
    }


    renderTotalShares(labelId, sharesBaseValue) {
        if (typeof sharesBaseValue === 'number') {
            const label = userMsg(labelId);
            return <div className = "col">
                <Field
                    id = {labelId}
                    prependComponent = {label}
                >
                    <QuantityDisplay
                        ariaLabel = {label}
                        quantityBaseValue = {sharesBaseValue}
                        quantityDefinition = {this.state.sharesQuantityDefinition}
                        classExtras = "col-form-label"
                    />
                </Field>
            </div>;
        }
    }

    renderSummary() {
        // Summary has:
        // Availabe shares
        // Selected shares
        // Optional:
        //  Price:
        //  Market value of selected shares
        const { totalAvailableSharesBaseValue, 
            totalSelectedSharesBaseValue,
        } = this.state;

        let totalAvailableShares = this.renderTotalShares(
            'LotsSelectionEditor-totalAvailableShares_label',
            totalAvailableSharesBaseValue,
        );
        let totalSelectedShares = this.renderTotalShares(
            'LotsSelectionEditor-totalSelectedShares_label',
            totalSelectedSharesBaseValue,
        );

        const rowClassName = 'form-row justify-content-center '
            + 'LotsSelectionEditor-summary';

        return <div className = "container">
            <div className = {rowClassName}>
                {totalAvailableShares}
                {totalSelectedShares}
            </div>
        </div>;
    }


    renderLotsTable(args) {
        const { state } = this;
        return <div className = "RowTableContainer mt-2">
            <EditableRowTable
                columns = {state.columns}

                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}

                //onLoadRows = {this.onLoadRows}

                onSetColumnWidth = {(args) =>
                    this._rowTableHandler.onSetColumnWidth(undefined, args)}

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
        const { totalSelectedSharesBaseValue } = this.state;

        let { title } = this.props;
        title = title || userMsg('LotsSelectionEditor-title');

        const actionButtons = [
            {
                label: userMsg('LotsSelectionEditor-select_all'),
                onClick: this.onSelectAll,
                disabled: false,
                classExtras: 'btn-secondary',
            },
            {
                label: userMsg('LotsSelectionEditor-clear_all'),
                onClick: this.onClearAll,
                disabled: false,
                classExtras: 'btn-secondary',
            },
        ];


        const doneDisabled = !(totalSelectedSharesBaseValue > 0);

        return <ModalPage
            title = {title}
            actionButtons = {actionButtons}
            onDone = {this.onDone}
            doneDisabled = {doneDisabled}
            onCancel = {this.props.onCancel}
        >
            <ContentFramer
                onRenderContent = {this.renderLotsTable}
                onRenderFooter = {this.renderSummary}
                isDebug = {true}
            />
        </ModalPage>;        
    }
}

// If transactionId is not specified then it's a new transaction.
LotsSelectionEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    accountId: PropTypes.number.isRequired,
    transactionId: PropTypes.number,
    lotChanges: PropTypes.arrayOf(PropTypes.object).isRequired,
    ymdDate: PropTypes.string,
    priceBaseValue: PropTypes.number,
    title: PropTypes.string,
    onDone: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    refreshUndoMenu: PropTypes.func,
};