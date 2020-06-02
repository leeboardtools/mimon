import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { CellTextDisplay, CellTextEditor } from '../util-ui/CellTextEditor';
import { CellSelectDisplay } from '../util-ui/CellSelectEditor';
import { CellDateDisplay } from '../util-ui/CellDateEditor';
import { CellQuantityDisplay } from '../util-ui/CellQuantityEditor';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import deepEqual from 'deep-equal';


const allColumnInfoDefs = {};


function renderTextEditor(args) {
    const {columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value || '';
    return <CellTextEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {value.toString()}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: e.target.value,
            });
        }}
        errorMsg = {errorMsg}
    />;
}

function renderTextDisplay(columnInfo, value) {
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    return <CellTextDisplay
        ariaLabel = {ariaLabel}
        value = {value}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
    />;
}


//
//---------------------------------------------------------
// date
function getDateEditorCellBufferValue({ rowEntry }) {
    return rowEntry.transactionDataItem.ymdDate;
}

function updateDataFromEditor(args) {
    const { transactionDataItem, cellEditBuffer } = args;
    transactionDataItem.ymdDate = cellEditBuffer.value;
}

function renderDateEditor(
    {caller, columnInfo, rowIndex, rowEditBuffer}) {

}

function renderDateDisplay({columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        return <CellDateDisplay
            ariaLabel = "Date"
            value = {transactionDataItem.ymdDate}
            classExtras = {columnInfo.inputClassExtras}
            inputClassExtras = {columnInfo.inputClassExtras}
            size = {columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// refNum
function getRefNumEditorCellBufferValue({ rowEntry }) {
    const { transactionDataItem, splitIndex } = rowEntry;
    return transactionDataItem.splits[splitIndex].refNum || '';
}

function updateRefNumFromEditor(args) {
    const { rowEntry, transactionDataItem } = args;
    const { splitIndex } = rowEntry;
    transactionDataItem.splits[splitIndex].refNum = args.cellEditBuffer.value;
}

function renderRefNumEditor(args) {
    return renderTextEditor(args);
}

function renderRefNumDisplay({columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        const split = transactionDataItem.splits[rowEntry.splitIndex];
        const refNum = split.refNum || '';
        return renderTextDisplay(columnInfo, refNum.toString());
    }
}


//
//---------------------------------------------------------
// description
function getDescriptionEditorCellBufferValue({ rowEntry }) {
    const { transactionDataItem, splitIndex } = rowEntry;
    return transactionDataItem.splits[splitIndex].description 
        || transactionDataItem.description;
}

function updateDescriptionFromEditor(args) {
    const { transactionDataItem, cellEditBuffer } = args;
    transactionDataItem.description = cellEditBuffer.value;
}

function renderDescriptionEditor(args) {
    return renderTextEditor(args);
}

function renderDescriptionDisplay({caller, columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        const split = transactionDataItem.splits[rowEntry.splitIndex];
        let { description, memo } = split;
        description = description || transactionDataItem.description;
        memo = memo || transactionDataItem.memo;

        const descriptionComponent 
            = renderTextDisplay(columnInfo, description);
        if (memo) {
            return <div className = "simple-tooltip">
                {descriptionComponent}
                <div className = "simple-tooltiptext">{memo}</div>
            </div>;
        }

        return descriptionComponent;
    }
}


//
//---------------------------------------------------------
// split
function getSplitEditorCellBufferValue(
    {caller, columnIndex, columnInfo, rowEditBuffer}) {

}

function updateSplitFromEditor(args) {

}

function renderSplitEditor(
    {caller, columnInfo, rowIndex, rowEditBuffer}) {

}

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

function renderSplitDisplay({caller, columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        const { accessor } = caller.props;
        const splits = transactionDataItem.splits;
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
                {renderTextDisplay(columnInfo, text)}
                {tooltip}
            </div>;
        }
        
        return renderTextDisplay(columnInfo, text);
    }
}


//
//---------------------------------------------------------
// reconcile
function getReconcileEditorCellBufferValue({ rowEntry }) {
    const { transactionDataItem, splitIndex } = rowEntry;
    return transactionDataItem.splits[splitIndex].reconcileState || '';
}

function updateReconcileFromEditor(args) {
    
}
    
function renderReconcileEditor(
    {caller, columnInfo, rowIndex, rowEditBuffer}) {

}

function renderReconcileDisplay({columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        const split = transactionDataItem.splits[rowEntry.splitIndex];
        let reconcileState = split.reconcileState
            || T.ReconcileState.NOT_RECONCILED.name;
        
        return <CellSelectDisplay
            selectedValue = {userMsg('AccountRegister-reconcile_' + reconcileState)}
            ariaLabel = "Reconcile State"
            classExtras = {columnInfo.inputClassExtras}
            size = {columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// bought
function getBoughtSoldEditorCellBufferValue(
    {caller, columnIndex, columnInfo, rowEditBuffer}, sign) {

}

function updateBoughtSoldFromEditor(args, sign) {

}

function renderBoughtSoldEditor(
    {caller, columnInfo, rowIndex, rowEditBuffer}, sign) {

}

function renderBoughtSoldDisplay({caller, columnInfo, rowEntry}, sign) {
    const { accountType, quantityDefinition } = caller.state;
    const { transactionDataItem } = rowEntry;
    if (!transactionDataItem) {
        return;
    }
    const split = transactionDataItem.splits[rowEntry.splitIndex];
    const { lotChanges } = split;
    if (!lotChanges || !lotChanges.length) {
        return;
    }

    let quantityBaseValue = 0;
    for (let lotChange of lotChanges) {
        quantityBaseValue += lotChange.quantityBaseValue;
    }

    const { category } = accountType;
    sign *= category.creditSign;
    quantityBaseValue *= sign;
    if (quantityBaseValue < 0) {
        return;
    }

    const { accessor } = caller.props;
    const lotTooltipEntries = [];
    for (let i = 0; i < lotChanges.length; ++i) {
        const lotChange = lotChanges[i];

        const lotDataItem = accessor.getLotDataItemWithId(lotChange.lotId);
        const pricedItemDataItem 
            = accessor.getPricedItemDataItemWithId(lotDataItem.pricedItemId);
        if (lotDataItem && pricedItemDataItem) {
            const quantityDefinition = getQuantityDefinition(
                pricedItemDataItem.quantityDefinition);
            const value = quantityDefinition.baseValueToValueText(
                lotChange.quantityBaseValue * sign);
            lotTooltipEntries.push(<div className = "row" key = {i}>
                <div className = "col col-sm-auto text-left">
                    {lotDataItem.description}
                </div>
                <div className = "col text-right">
                    {value}
                </div>
            </div>);
        }
    }

    const displayComponent = <CellQuantityDisplay
        quantityBaseValue = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        ariaLabel = {sign > 0 ? 'Credit' : 'Debit'}
        inputClassExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
    />;

    if (lotTooltipEntries.length) {
        return <div className = "simple-tooltip">
            {displayComponent}
            <div className = "simple-tooltiptext">
                {lotTooltipEntries}
            </div>
        </div>;
    }
    return displayComponent;
}

function getBoughtEditorCellBufferValue(args) {
    return getBoughtSoldEditorCellBufferValue(args, -1);
}

function updateBoughtFromEditor(args) {
    return updateBoughtSoldFromEditor(args, -1);
}

function renderBoughtEditor(args) {
    return renderBoughtSoldEditor(args, -1);
}


function renderBoughtDisplay(args) {
    return renderBoughtSoldDisplay(args, -1);
}



//
//---------------------------------------------------------
// sold

function getSoldEditorCellBufferValue(args) {
    return getBoughtSoldEditorCellBufferValue(args, 1);
}

function updateSoldFromEditor(args) {
    return updateBoughtSoldFromEditor(args, 1);
}

function renderSoldEditor(args) {
    return renderBoughtSoldEditor(args, 1);
}

function renderSoldDisplay(args) {
    return renderBoughtSoldDisplay(args, 1);
}


//
//---------------------------------------------------------
// shares

function renderSharesDisplay({ caller, columnInfo, rowEntry }) {
    const { accountStateDataItem } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return <CellQuantityDisplay
            quantityDefinition = {quantityDefinition}
            quantityBaseValue = {quantityBaseValue}
            ariaLabel = "Shares"
            inputClassExtras = {columnInfo.inputClassExtras}
            size = {columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// debit
function getDebitCreditQuantityBaseValue({ caller, columnInfo, rowEntry}, sign) {
    const { accountType } = caller.state;
    const { transactionDataItem } = rowEntry;
    if (!transactionDataItem) {
        return;
    }
    const split = transactionDataItem.splits[rowEntry.splitIndex];

    const { category } = accountType;
    const quantityBaseValue = sign * split.quantityBaseValue * category.creditSign;
    if (quantityBaseValue < 0) {
        return;
    }

    return quantityBaseValue;
}

function updateDebitCreditFromEditor(args, sign) {

}

function getDebitCreditEditorCellBufferValue(args, sign) {
    return getDebitCreditQuantityBaseValue(args, sign);
}

function renderDebitCreditEditor(
    {caller, columnInfo, rowIndex, rowEditBuffer}, sign) {

}

function renderDebitCreditDisplay(args, sign) {
    const { caller, columnInfo, } = args;
    const quantityBaseValue = getDebitCreditQuantityBaseValue(args, sign);
    if (quantityBaseValue === undefined) {
        return;
    }
    const { quantityDefinition } = caller.state;

    // Need to assign to component then return component to effectively disable
    // eslint(react/prop-types) being triggered on the function.
    const component = <CellQuantityDisplay
        quantityBaseValue = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        ariaLabel = {sign > 0 ? 'Credit' : 'Debit'}
        inputClassExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
    />;
    return component;
}


function getDebitEditorCellBufferValue(args) {
    return getDebitCreditEditorCellBufferValue(args, -1);
}

function updateDebitFromEditor(args) {
    return updateDebitCreditFromEditor(args, -1);
}

function renderDebitEditor(args) {
    return renderDebitCreditEditor(args, -1);
}

function renderDebitDisplay(args) {
    return renderDebitCreditDisplay(args, -1);
}



//
//---------------------------------------------------------
// credit
function getCreditEditorCellBufferValue(args) {
    return getDebitCreditEditorCellBufferValue(args, 1);
}

function updateCreditFromEditor(args) {
    return updateDebitCreditFromEditor(args, 1);
}

function renderCreditEditor(args) {
    return renderDebitCreditEditor(args, 1);
}

function renderCreditDisplay(args) {
    return renderDebitCreditDisplay(args, 1);
}


//
//---------------------------------------------------------
// balance

function renderBalanceDisplay({caller, columnInfo, rowEntry}) {
    const { accountStateDataItem } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return <CellQuantityDisplay
            quantityDefinition = {quantityDefinition}
            quantityBaseValue = {quantityBaseValue}
            ariaLabel = "Balance"
            inputClassExtras = {columnInfo.inputClassExtras}
            size = {columnInfo.inputSize}
        />;
    }
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
                renderDisplay: renderDateDisplay,
                renderEditor: renderDateEditor,
                getCellEditBufferValue: getDateEditorCellBufferValue,
                updateTransactionDataItem: updateDataFromEditor,
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
                renderDisplay: renderRefNumDisplay,
                renderEditor: renderRefNumEditor,
                getCellEditBufferValue: getRefNumEditorCellBufferValue,
                updateTransactionDataItem: updateRefNumFromEditor,
            },
            description: { key: 'description',
                header: {
                    label: userMsg('AccountRegister-description'),
                    ariaLabel: 'Description',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName,
                renderDisplay: renderDescriptionDisplay,
                renderEditor: renderDescriptionEditor,
                getCellEditBufferValue: getDescriptionEditorCellBufferValue,
                updateTransactionDataItem: updateDescriptionFromEditor,
            },
            splits: { key: 'split',
                header: {
                    label: userMsg('AccountRegister-split'),
                    ariaLabel: 'Split',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName,
                renderDisplay: renderSplitDisplay,
                renderEditor: renderSplitEditor,
                getCellEditBufferValue: getSplitEditorCellBufferValue,
                updateTransactionDataItem: updateSplitFromEditor,
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
                renderDisplay: renderReconcileDisplay,
                renderEditor: renderReconcileEditor,
                getCellEditBufferValue: getReconcileEditorCellBufferValue,
                updateTransactionDataItem: updateReconcileFromEditor,
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
                renderDisplay: renderBoughtDisplay,
                renderEditor: renderBoughtEditor,
                getCellEditBufferValue: getBoughtEditorCellBufferValue,
                updateTransactionDataItem: updateBoughtFromEditor,
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
                renderDisplay: renderSoldDisplay,
                renderEditor: renderSoldEditor,
                getCellEditBufferValue: getSoldEditorCellBufferValue,
                updateTransactionDataItem: updateSoldFromEditor,
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
                renderDisplay: renderSharesDisplay,
                //renderEditor: renderSharesEditor,
                //getCellEditBufferValue: getSharesEditorCellBufferValue,
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
                renderDisplay: renderDebitDisplay,
                renderEditor: renderDebitEditor,
                getCellEditBufferValue: getDebitEditorCellBufferValue,
                updateTransactionDataItem: updateDebitFromEditor,
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
                renderDisplay: renderCreditDisplay,
                renderEditor: renderCreditEditor,
                getCellEditBufferValue: getCreditEditorCellBufferValue,
                updateTransactionDataItem: updateCreditFromEditor,
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
                renderDisplay: renderBalanceDisplay,
                //renderEditor: renderBalanceEditor,
                //getCellEditBufferValue: getBalanceEditorCellBufferValue,
            };

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

        this.onStartRowEdit = this.onStartRowEdit.bind(this);
        this.onCancelRowEdit = this.onCancelRowEdit.bind(this);
        this.asyncOnSaveRowEdit = this.asyncOnSaveRowEdit.bind(this);

        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

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
            transactionDataItem: {
                ymdDate: '2020-12-31',
                description: userMsg('AccountRegister-dummy_description'),
                splits: [
                    {
                        reconcileState: T.ReconcileState.NOT_RECONCILED,
                        accountId: -1,
                        quantityBaseValue: 999999999,
                        lotChanges: [

                        ],
                    },
                ],
            },
            accountStateDataItem: {
                ymdDate: '2020-12-31',
                quantityBaseValue: 999999999,
                lotStates: [

                ],
            },
            splitIndex: 0,
            splitAccountDataItem: {
                name: userMsg('AccountRegister-dummy_accountName'),
            }
        };

        this.state.columns = this.generateColumns();

        this.updateRowEntries();
    }


    generateColumns(columnWidths) {
        const { columnInfos } = this.state;
        const columns = columnInfos.map((columnInfo) => {
            return {
                key: columnInfo.key,
                // width
                // minWidth
                // maxWidth
                header: columnInfo.header,
                footer: columnInfo.footer,
            };
        });

        columnWidths = columnWidths || this.state.columnWidths;
        if (columnWidths) {
            const count = Math.min(columnWidths.length, columns.length);
            for (let i = 0; i < count; ++i) {
                if (columnWidths[i] !== undefined) {
                    columns[i].width = columnWidths[i];
                }
            }
        }

        return columns;
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


    onSetColumnWidth({ columnIndex, columnWidth}) {
        this.setState((state) => {
            const columnWidths = Array.from(state.columnWidths || []);
            columnWidths[columnIndex] = columnWidth;
            return {
                columnWidths: columnWidths,
                columns: this.generateColumns(columnWidths),
            };
        });
    }


    onActiveRowChanged(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        });
    }


    onStartRowEdit({ rowIndex, rowEditBuffer, cellEditBuffers,
        asyncEndRowEdit, cancelRowEdit,
        setRowEditBuffer, setCellEditBuffer}) {
        
        const rowEntry = this.state.rowEntries[rowIndex];
        const { transactionDataItem } = rowEntry;
        if (!transactionDataItem) {
            return;
        }

        const { columnInfos } = this.state;
        const cellBufferArgs = {
            caller: this,
            rowEditBuffer: rowEditBuffer,
            rowEntry: rowEntry,
        };
        for (let i = 0; i < columnInfos.length; ++i) {
            const { getCellEditBufferValue } = columnInfos[i];
            if (getCellEditBufferValue) {
                cellBufferArgs.columnIndex = i;
                cellBufferArgs.columnInfo = columnInfos[i];
                cellEditBuffers[i].value = getCellEditBufferValue(cellBufferArgs);
            }
        }

        this.setState({
            editInfo: {
                transactionId: transactionDataItem.id,
                asyncEndRowEdit: asyncEndRowEdit,
                cancelRowEdit: cancelRowEdit,
                setRowEditBuffer: setRowEditBuffer, 
                setCellEditBuffer: setCellEditBuffer,
            },
            errorMsgs: {}
        });

        return true;
    }


    onCancelRowEdit() {
        this.setState({
            editInfo: undefined,
            errorMsgs: {}
        });
    }


    async asyncOnSaveRowEdit(args) {
        const { rowIndex, cellEditBuffers } = args;
        const rowEntry = this.state.rowEntries[rowIndex];
        const { transactionDataItem } = rowEntry;
        if (!transactionDataItem) {
            return;
        }

        const newTransactionDataItem 
            = T.getTransactionDataItem(transactionDataItem, true);

        const { columnInfos } = this.state;
        const cellArgs = Object.assign({}, args,
            {
                transactionDataItem: newTransactionDataItem,
                caller: this,
                rowEntry: rowEntry,
            });
        for (let i = 0; i < columnInfos.length; ++i) {
            const columnInfo = columnInfos[i];
            const { updateTransactionDataItem } = columnInfo;
            if (updateTransactionDataItem) {
                cellArgs.columnIndex = i;
                cellArgs.columnInfo = columnInfo;
                cellArgs.cellEditBuffer = cellEditBuffers[i];
                updateTransactionDataItem(cellArgs);
            }
        }

        try {
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

        this.setState({
            editInfo: undefined,
            errorMsgs: {}
        });

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

    
    onRenderEditCell(args) {
        const { columnIndex } = args;
        const { columnInfos } = this.state;
        const columnInfo = columnInfos[columnIndex];
        const { renderEditor } = columnInfo;
        if (!args.isSizeRender && renderEditor) {
            return renderEditor(Object.assign({}, args, { 
                caller: this,
                columnInfo: columnInfo,
                setCellEditBuffer: (value) => {
                    this.state.editInfo.setCellEditBuffer(columnIndex, value);
                },
                errorMsg: this.state.errorMsgs[columnInfo.key],
            }));
        }

        return this.onRenderDisplayCell(args);
    }


    onRenderDisplayCell({rowIndex, columnIndex, isSizeRender}) {
        if (rowIndex < 0) {
            // Shouldn't happen...
            return;
        }

        let rowEntry;
        if (isSizeRender) {
            rowEntry = this._sizingRowEntry;
        }
        else {
            rowEntry = this.state.rowEntries[rowIndex];
        }

        if (!rowEntry) {
            return;
        }

        const columnInfo = this.state.columnInfos[columnIndex];
        const { renderDisplay } = columnInfo;
        if (renderDisplay) {
            return renderDisplay({
                caller: this, 
                columnInfo: columnInfo, 
                rowEntry: rowEntry,
            });
        }
    }


    render() {
        const { state } = this;

        return <div className = "RowTableContainer AccountRegister">
            <EditableRowTable
                columns = {state.columns}

                rowCount = {state.rowEntries.length}
                getRowKey = {this.getRowKey}

                onLoadRows = {this.onLoadRows}

                //onRenderCell: PropTypes.func.isRequired,

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
                onRenderDisplayCell = {this.onRenderDisplayCell}
                onRenderEditCell = {this.onRenderEditCell}

                requestedActiveRowIndex = {state.activeRowIndex}
                onActiveRowChanged = {this.onActiveRowChanged}

                onStartRowEdit = {this.onStartRowEdit}
                asyncOnSaveRowEdit = {this.asyncOnSaveRowEdit}
                onCancelRowEdit = {this.onCancelRowEdit}

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
