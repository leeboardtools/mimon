import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { RowTable } from '../util-ui/RowTable';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectDisplay } from '../util-ui/CellSelectEditor';
import { CellDateDisplay } from '../util-ui/CellDateEditor';
import { CellQuantityDisplay } from '../util-ui/CellQuantityEditor';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import deepEqual from 'deep-equal';


const allColumnInfoDefs = {};


function renderTextDisplay(columnInfo, value) {
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    return <CellTextDisplay
        ariaLabel={ariaLabel}
        value={value}
        inputClassExtras={inputClassExtras}
        size={inputSize}
    />;
}


//
//---------------------------------------------------------
// date

function renderDateEditor({caller, columnInfo, renderArgs, rowEntry}) {

}

function renderDateDisplay({columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        return <CellDateDisplay
            ariaLabel="Date"
            value={transactionDataItem.ymdDate}
            classExtras={columnInfo.inputClassExtras}
            inputClassExtras={columnInfo.inputClassExtras}
            size={columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// refNum

function renderRefNumEditor({caller, columnInfo, renderArgs, rowEntry}) {

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
function renderDescriptionEditor({caller, columnInfo, renderArgs, rowEntry}) {

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
            return <div className="simple-tooltip">
                {descriptionComponent}
                <div className="simple-tooltiptext">{memo}</div>
            </div>;
        }

        return descriptionComponent;
    }
}


//
//---------------------------------------------------------
// split
    
function renderSplitEditor({caller, columnInfo, renderArgs, rowEntry}) {

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
    return <div className="row" key={index}>
        <div className="col col-sm-auto text-left">{splitAccountDataItem.name}</div>
        <div className="col text-right">{value}</div>
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
            const tooltip = <div className="simple-tooltiptext">
                {tooltipEntries}
            </div>;

            return <div className="simple-tooltip"> 
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
    
function renderReconcileEditor({columnInfo, renderArgs, rowEntry}) {

}

function renderReconcileDisplay({columnInfo, rowEntry}) {
    const { transactionDataItem } = rowEntry;
    if (transactionDataItem) {
        const split = transactionDataItem.splits[rowEntry.splitIndex];
        let reconcileState = split.reconcileState
            || T.ReconcileState.NOT_RECONCILED.name;
        
        return <CellSelectDisplay
            selectedValue={userMsg('AccountRegister-reconcile_' + reconcileState)}
            ariaLabel="Reconcile State"
            classExtras={columnInfo.inputClassExtras}
            size={columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// bought

function renderBoughtSoldEditor({columnInfo, renderArgs, rowEntry}, sign) {

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
            lotTooltipEntries.push(<div className="row" key={i}>
                <div className="col col-sm-auto text-left">
                    {lotDataItem.description}
                </div>
                <div className="col text-right">
                    {value}
                </div>
            </div>);
        }
    }

    const displayComponent = <CellQuantityDisplay
        quantityBaseValue={quantityBaseValue}
        quantityDefinition={quantityDefinition}
        ariaLabel={sign > 0 ? 'Credit' : 'Debit'}
        inputClassExtras={columnInfo.inputClassExtras}
        size={columnInfo.inputSize}
    />;

    if (lotTooltipEntries.length) {
        return <div className="simple-tooltip">
            {displayComponent}
            <div className="simple-tooltiptext">
                {lotTooltipEntries}
            </div>
        </div>;
    }
    return displayComponent;
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

function renderSoldEditor(args) {
    return renderBoughtSoldEditor(args, 1);
}

function renderSoldDisplay(args) {
    return renderBoughtSoldDisplay(args, 1);
}


//
//---------------------------------------------------------
// shares
    
function renderSharesEditor(args) {
    renderSharesDisplay(args);
}

function renderSharesDisplay({ caller, columnInfo, rowEntry }) {
    const { accountStateDataItem } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return <CellQuantityDisplay
            quantityDefinition={quantityDefinition}
            quantityBaseValue={quantityBaseValue}
            ariaLabel="Shares"
            inputClassExtras={columnInfo.inputClassExtras}
            size={columnInfo.inputSize}
        />;
    }
}


//
//---------------------------------------------------------
// debit

function renderDebitCreditEditor({columnInfo, renderArgs, rowEntry}, sign) {

}

function renderDebitCreditDisplay({ caller, columnInfo, rowEntry }, sign) {
    const { accountType, quantityDefinition } = caller.state;
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

    // Need to assign to component then return component to effectively disable
    // eslint(react/prop-types) being triggered on the function.
    const component = <CellQuantityDisplay
        quantityBaseValue={quantityBaseValue}
        quantityDefinition={quantityDefinition}
        ariaLabel={sign > 0 ? 'Credit' : 'Debit'}
        inputClassExtras={columnInfo.inputClassExtras}
        size={columnInfo.inputSize}
    />;
    return component;
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

function renderCreditEditor(args) {
    return renderDebitCreditEditor(args, 1);
}

function renderCreditDisplay(args) {
    return renderDebitCreditDisplay(args, 1);
}


//
//---------------------------------------------------------
// balance
function renderBalanceEditor(args) {
    renderBalanceDisplay(args);
}

function renderBalanceDisplay({caller, columnInfo, rowEntry}) {
    const { accountStateDataItem } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return <CellQuantityDisplay
            quantityDefinition={quantityDefinition}
            quantityBaseValue={quantityBaseValue}
            ariaLabel="Balance"
            inputClassExtras={columnInfo.inputClassExtras}
            size={columnInfo.inputSize}
        />;
    }
}





/**
 * @returns {CollapsibleRowTable~ColInfo[]} Array containing the available
 * columns for account registers.
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
                renderEditor: renderSharesEditor,
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
                renderEditor: renderBalanceEditor,
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

        this.onTransactionAdd = this.onTransactionAdd.bind(this);
        this.onTransactionModify = this.onTransactionModify.bind(this);
        this.onTransactionRemove = this.onTransactionRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);
        this.onLoadRows = this.onLoadRows.bind(this);

        this.onStartEditRow = this.onStartEditRow.bind(this);
        this.onCancelEditRow = this.onCancelEditRow.bind(this);
        this.asyncOnSaveEditRow = this.asyncOnSaveEditRow.bind(this);
        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onActivateRow = this.onActivateRow.bind(this);
        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

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
                index: newRowEntries.length,
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


    onTransactionAdd(result) {
        const { newTransactionDataItem } = result;
        const key = {
            id: newTransactionDataItem.id,
            ymdDate: newTransactionDataItem.ymdDate,
        };

        if (this.isTransactionKeyDisplayed(key)) {
            this.updateRowEntries(key);
        }
    }

    
    onTransactionModify(result) {
        const { newTransactionDataItem } = result;
        const { id } = newTransactionDataItem;
        if (this.state.rowEntriesByTransactionId.has(id)) {
            const key = {
                id: id,
                ymdDate: newTransactionDataItem.ymdDate,
            };
            this.updateRowEntries(key);
        }
    }


    onTransactionRemove(result) {
        const { removedTransactionDataItem } = result;
        const { id } = removedTransactionDataItem;
        if (this.state.rowEntriesByTransactionId.has(id)) {
            const key = {
                id: id,
                ymdDate: removedTransactionDataItem.ymdDate,
            };
            this.updateRowEntries(key);
        }
    }


    componentDidMount() {
        this.props.accessor.on('pricedItemAdd', this.onTransactionAdd);
        this.props.accessor.on('pricedItemModify', this.onTransactionModify);
        this.props.accessor.on('pricedItemRemove', this.onTransactionRemove);
    }

    componentWillUnmount() {
        this.props.accessor.off('pricedItemAdd', this.onTransactionAdd);
        this.props.accessor.off('pricedItemModify', this.onTransactionModify);
        this.props.accessor.off('pricedItemRemove', this.onTransactionRemove);
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


    updateRowEntries(modifiedTransactionKey) {
        process.nextTick(async () => {
            const newRowEntries = [];
            const newRowEntriesByTransactionIds = new Map();

            const modifiedId = (modifiedTransactionKey) 
                ? modifiedTransactionKey.id : undefined;

            const { accessor, accountId } = this.props;
            const transactionKeys 
                = await accessor.asyncGetSortedTransactionKeysForAccount(
                    accountId, true);
            
            const { rowEntriesByTransactionId } = this.state;
            transactionKeys.forEach((key) => {
                if (!this.isTransactionKeyDisplayed(key)) {
                    return;
                }

                const { splitCount } = key;

                for (let splitOccurrance = 0; splitOccurrance < splitCount; 
                    ++splitOccurrance) {
                    const rowEntry = {
                        key: key.id.toString() + '_' + splitOccurrance,
                        index: newRowEntries.length,
                        transactionId: key.id,
                        splitOccurrance: splitOccurrance,
                    };
                    if (modifiedId !== key.id) {
                        const existingRowEntry = rowEntriesByTransactionId.get(key.id);
                        if (existingRowEntry) {
                            rowEntry.transactionDataItem 
                                = existingRowEntry.transactionDataItem;
                            rowEntry.accountState = existingRowEntry.accountState;
                        }
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

            let { activeRowIndex } = this.state;
            if (activeRowIndex === undefined) {
                activeRowIndex = newRowEntries.length - 1;
            }

            this.setState({
                activeRowIndex: activeRowIndex,
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
            });
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


    onLoadRows({firstRowIndex, lastRowIndex}) {
        const { accessor } = this.props;
        const { rowEntries } = this.state;

        let needsLoading = false;
        for (let i = firstRowIndex; i <= lastRowIndex; ++i) {
            const rowEntry = rowEntries[i];
            if (!rowEntry.accountStateDataItem) {
                needsLoading = true;
                break;
            }
        }

        if (!needsLoading) {
            return;
        }

        const { accountId } = this.props;
        const transactionIdA = rowEntries[firstRowIndex].transactionId;
        const transactionIdB = rowEntries[lastRowIndex].transactionId;

        process.nextTick(async () => {
            console.log('loading transactions: ' + firstRowIndex + ' ' + lastRowIndex);

            const results = await accessor.asyncGetAccountStateAndTransactionDataItems(
                accountId, transactionIdA, transactionIdB);
            
            if (this.state.rowEntries !== rowEntries) {
                // Uh-oh, we're out of sync...
                console.log('Out of sync, rowEntries has changed...');
                return;
            }

            const newRowEntries = Array.from(this.state.rowEntries);
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

            console.log('loaded...');
            this.setState({
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
            });
        });
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


    onActivateRow(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        });
    }


    onStartEditRow({ rowEntry, cellEditBuffers, rowEditBuffer, asyncEndEditRow }) {
        const { accountDataItem } = rowEntry;
        if (!accountDataItem) {
            return;
        }

        this.setState({
            asyncEndEditRow: asyncEndEditRow,
            errorMsgs: {}
        });    
    }


    onCancelEditRow({ rowEntry, cellEditBuffers, rowEditBuffers }) {
        this.setState({
            asyncEndEditRow: undefined,
            errorMsgs: {}
        });
    }

    async asyncOnSaveEditRow({ rowEntry, cellEditBuffers, rowEditBuffer }) {
        this.setState({
            asyncEndEditRow: undefined,
            errorMsgs: {}
        });
    }


    updateRowEditBuffer(renderArgs, rowEditBuffer) {
        renderArgs.updateRowEditBuffer(rowEditBuffer);
        if (this.state.errorMsgs) {
            this.setState({
                errorMsgs: {}
            });
        }
    }

    setErrorMsg(propertyName, msg) {
        this.setState({
            errorMsgs: {
                [propertyName]: msg,
            }
        });
        return msg;
    }

    
    onRenderEditCell({cellInfo, cellSettings, renderArgs}) {
        const { rowEntry } = cellInfo;
        const { columnInfo } = cellInfo;
        const { renderEditor } = columnInfo;
        if (renderEditor) {
            return renderEditor({
                caller: this, 
                cellInfo: cellInfo, 
                renderArgs: renderArgs, 
                rowEntry: rowEntry,
            });
        }
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

        return <div className="AccountRegister">
            <RowTable
                columns={state.columns}

                rowCount={state.rowEntries.length}
                getRowKey={this.getRowKey}

                onLoadRows={this.onLoadRows}

                //onRenderCell: PropTypes.func.isRequired,
                onRenderCell={this.onRenderDisplayCell}

                requestedVisibleRowIndex={state.activeRowIndex}

                onSetColumnWidth={this.onSetColumnWidth}

                //rowHeight: PropTypes.number,
                //headerHeight: PropTypes.number,
                //footerHeight: PropTypes.number,

                activeRowIndex={state.activeRowIndex}
                onActivateRow={this.onActivateRow}

                //onOpenRow: PropTypes.func,
                //onCloseRow: PropTypes.func,

                //onContextMenu: PropTypes.func,
                //contextMenuItems: PropTypes.array,
                //onChooseContextMenuItem: PropTypes.func,
                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}

                classExtras="table-striped"
                //headerClassExtras: PropTypes.string,
                //bodyClassExtras: PropTypes.string,
                //rowClassExtras: PropTypes.string,
                //footerClassExtras: PropTypes.string,

                //rowEntries={state.rowEntries}
                /*activeRowKey={state.activeRowKey}
                onRenderDisplayCell={this.onRenderDisplayCell}
                onRenderEditCell={this.onRenderEditCell}
                onStartEditRow={this.onStartEditRow}
                onCancelEditRow={this.onCancelEditRow}
                asyncOnSaveEditRow={this.asyncOnSaveEditRow}
                */
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
