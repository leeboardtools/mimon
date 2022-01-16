import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import { getCurrency } from '../util/Currency';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as AH from '../tools/AccountHelpers';
import { columnInfosToColumns, } from '../util-ui/ColumnInfo';
import deepEqual from 'deep-equal';
import { CellEditorsManager } from '../util-ui/CellEditorsManager';
import { CellSelectDisplay, } from '../util-ui/CellSelectEditor';
import { getDefaultAccountIdForNewSplit, 
    MultiSplitsEditor } from './MultiSplitsEditor';
import { YMDDate } from '../util/YMDDate';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { Row, Col } from '../util-ui/RowCols';
import { addAccountIdsToAccountEntries, AccountSelector, 
    accountEntriesToItems } from './AccountSelector';
import { CellTextEditor } from '../util-ui/CellTextEditor';


const allColumnInfoDefs = {};

/**
 * @typedef {object} AccountRegister~RowEditBuffer
 * @private
 * @property {TransactionDataItem}  newTransactionDataItem
 * @property {number}   splitIndex
 * 
 */

/**
 * @typedef {object} AccountRegister~SaveBuffer
 * Returned by {@link AccountRegister#getSaveBuffer}, passed on to the
 * saveCellValue callbacks.
 * @private
 * @property {TransactionDataItem}  newTransactionDataItem
 * @property {number}   splitIndex
 * 
 */

function getTransactionInfo(args) {
    const { rowEditBuffer, rowEntry } = args;
    return (rowEditBuffer) 
        ? rowEditBuffer
        : {
            newTransactionDataItem: rowEntry.transactionDataItem,
            splitIndex: rowEntry.splitIndex,
        };
}


function getSplitInfo(args) {
    const { saveBuffer, rowEditBuffer, rowEntry } = args;
    return (saveBuffer) 
        ? saveBuffer.lceSplitInfo
        : (rowEditBuffer) 
            ? rowEditBuffer.lceSplitInfo
            : rowEntry.lceSplitInfo;
}


function updateSplitInfo(args, newSplitInfo) {
    const { rowEntry } = args;
    const { caller } = rowEntry;
    caller.updateLCESplitInfo(args, newSplitInfo);
}

function setModal(args, modal, reason) {
    const { rowEntry } = args;
    const { caller } = rowEntry;
    let { columnIndex } = args;
    if (columnIndex !== undefined) {
        if (reason === 'done') {
            ++columnIndex;
        }
    }
    caller.setModal(modal, columnIndex);
}



function getSplitCellValue(args, propertyName, valueName) {
    const { newTransactionDataItem, splitIndex } = getTransactionInfo(args);
    if (newTransactionDataItem) {
        let cellValue = newTransactionDataItem.splits[splitIndex][propertyName];
        if (!valueName) {
            return cellValue;
        }
        const value = {};
        value[valueName] = cellValue;
        return value;
    }
}

function saveSplitCellValue(args, propertyName, valueName) {
    const { cellEditBuffer, saveBuffer } = args;
    const { splitIndex } = getTransactionInfo(args);
    if (saveBuffer && propertyName) {
        saveBuffer.newTransactionDataItem.splits[splitIndex][propertyName] 
            = (valueName && (typeof cellEditBuffer.value === 'object')) 
                ? cellEditBuffer.value[valueName]
                : cellEditBuffer.value;
    }
}


function getAccountStateQuantityCellValue(args) {
    const { rowEntry } = args;
    const { accountStateDataItem, caller } = rowEntry;
    if (accountStateDataItem) {
        const { quantityDefinition } = caller.state;
        const { quantityBaseValue } = accountStateDataItem;
        return {
            accessor: caller.props.accessor,
            quantityBaseValue: quantityBaseValue,
            quantityDefinition: quantityDefinition,
        };
    }
}

// Don't have saveAccountStateQuantityCellValue() as it is read-only...


//
//---------------------------------------------------------
//
function getDateCellValue(args) {
    const { newTransactionDataItem } = getTransactionInfo(args);
    if (newTransactionDataItem) {
        const { rowEntry } = args;
        const { caller } = rowEntry;
        return {
            ymdDate: newTransactionDataItem.ymdDate,
            accessor: caller.props.accessor,
        };
    }
}

function saveDateCellValue(args) {
    const { cellEditBuffer, saveBuffer } = args;
    if (saveBuffer) {
        const { newTransactionDataItem } = saveBuffer;
        let { value } = cellEditBuffer;
        newTransactionDataItem.ymdDate = value.ymdDate;
    }

}


//
//---------------------------------------------------------
//
function getDescriptionCellValue(args) {
    const { newTransactionDataItem, splitIndex } = getTransactionInfo(args);
    if (newTransactionDataItem) {
        const split = newTransactionDataItem.splits[splitIndex];
        let { description } = newTransactionDataItem;
        let memo;
        let placeholder;
        if (split.description) {
            memo = split.description;
        }

        if (!newTransactionDataItem.id) {
            placeholder = userMsg('AccountRegister-new_description');
        }

        if ((memo && (memo !== description)) || placeholder) {
            return {
                description: description,
                memo: memo,
                placeholder: placeholder,
            };
        }
        return description;
    }

    return {
        description: userMsg('AccountRegister-loading'),
        inputClassExtras: 'AccountRegister-loading',
    };
}

function saveDescriptionCellValue(args) {
    const { cellEditBuffer, saveBuffer } = args;
    if (saveBuffer) {
        const { newTransactionDataItem } = saveBuffer;
        let { value } = cellEditBuffer;
        if (typeof value === 'object') {
            value = value.description;
        }

        newTransactionDataItem.description = value;
    }
}

function renderDescriptionCellEditor(args) {
    const { rowEntry } = args;
    const { caller } = rowEntry;
    return caller.renderDescriptionCellEditor(args);
}

function onChangeDescriptionFilter(e, caller) {
    const { props } = caller;
    const { onColumnFiltersChange } = props;
    if (onColumnFiltersChange) {
        onColumnFiltersChange({
            description: e.target.value,
        });
    }
}

function renderDescriptionFilterEditor(args) {
    const { rowRenderInfo } = args;
    const { caller } = rowRenderInfo;
    if (caller) {
        let value;
        const { columnFilters } = caller.props;
        if (columnFilters) {
            value = columnFilters.description;
        }
        return <CellTextEditor
            arialLabel = "Description Filter"
            value = {value}
            onChange = {(e) => onChangeDescriptionFilter(e, caller)}
        />;
    }
}


//
//---------------------------------------------------------
// splits
function getSplitsListCellValue(args) {
    const { newTransactionDataItem } = getTransactionInfo(args);
    if (newTransactionDataItem) {
        let { splits } = newTransactionDataItem;
        if (args.isEdit) {
            splits = Array.from(splits);
            for (let i = 0; i < splits.length; ++i) {
                splits[i] = T.getSplitDataItem(splits[i], true);
            }
        }
        return {
            splits: splits,
            rowEntry: args.rowEntry,
        };
    }
}

function saveSplitsListCellValue(args) {
    const { cellEditBuffer, saveBuffer } = args;
    const { splitIndex } = getTransactionInfo(args);
    if (saveBuffer) {
        const { newTransactionDataItem } = saveBuffer;
        const { value } = cellEditBuffer;
        const { splits } = value;
        if (splits.length !== 2) {
            const { refNum } = newTransactionDataItem.splits[splitIndex];
            newTransactionDataItem.splits = splits;
            if (refNum !== undefined) {
                newTransactionDataItem.splits[splitIndex].refNum = refNum;
            }
            else {
                delete newTransactionDataItem.splits[splitIndex].refNum;
            }
        }
        else {
            newTransactionDataItem.splits[1 - splitIndex].accountId 
                = splits[1 - splitIndex].accountId;
        }
    }
}


function getSplitRenderInfo(caller, split, splitIndex) {
    const { accessor } = caller.props;
    const accountDataItem 
        = accessor.getAccountDataItemWithId(split.accountId);
    if (!accountDataItem) {
        return;
    }

    const category = A.getAccountType(accountDataItem.type).category;
    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
        accountDataItem.pricedItemId);
    const currency = getCurrency(pricedItemDataItem.currency);

    return {
        split: split,
        splitIndex: splitIndex,
        accountDataItem: accountDataItem,
        category: category,
        creditSign: category.creditSign,
        currency: currency,
        accessor: accessor,
        quantityBaseValue: split.quantityBaseValue,
        aleCreditSign: 1,
    };
}


function compareSplitRenderInfo(a, b) {
    return Math.abs(b.quantityBaseValue) - Math.abs(a.quantityBaseValue);
}


function renderSplitItemTooltip(splitRenderInfo, valueClassExtras) {
    const { accountDataItem, category, currency, quantityBaseValue,
        aleCreditSign, splitIndex, code } = splitRenderInfo;
    if (!accountDataItem) {
        return;
    }

    let { creditSign } = splitRenderInfo;
    if (category.isALE) {
        creditSign *= aleCreditSign;
    }

    let outerValueClassExtras = 'AccountRegister-tooltip-value';
    let codeCol;
    if (code) {
        outerValueClassExtras += ' AccountRegister-tooltip-value-withCode';
        codeCol = <Col classExtras = "AccountRegister-tooltip-code">
            {code}
        </Col>;
    }
    
    const value = currency.getQuantityDefinition()
        .baseValueToValueText(quantityBaseValue * creditSign);

    return <Row key = {splitIndex} classExtras = "AccountRegister-tooltip-row">
        <Col classExtras = "Col-auto Text-left">{accountDataItem.name}</Col>
        <Col classExtras = {outerValueClassExtras}>
            <div className = {valueClassExtras}>{value}</div>
        </Col>
        {codeCol}
    </Row>;
}


function generateMultiSplitTooltips(args, value) {
    const { rowEntry } = args;
    const { caller } = rowEntry;

    const { splits } = value;
    const { splitIndex } = getTransactionInfo(args);

    const splitRenderInfos = [];
    for (let i = 0; i < splits.length; ++i) {
        splitRenderInfos.push(getSplitRenderInfo(caller, splits[i], i));
    }

    const nonBaseSplitRenderInfos = [];
    for (let i = 0; i < splitIndex; ++i) {
        nonBaseSplitRenderInfos.push(splitRenderInfos[i]);
    }
    for (let i = splitIndex + 1; i < splitRenderInfos.length; ++i) {
        nonBaseSplitRenderInfos.push(splitRenderInfos[i]);
    }

    let baseSplitRenderInfo = splitRenderInfos[splitIndex];
    const baseCategory = baseSplitRenderInfo.category;

    let isIncomeBased;
    if (baseCategory === A.AccountCategory.ASSET) {
        for (let i = 0; i < nonBaseSplitRenderInfos.length; ++i) {
            if (nonBaseSplitRenderInfos[i].category === A.AccountCategory.INCOME) {
                isIncomeBased = true;
                break;
            }
        }
    }

    let baseClassExtras;
    

    const prioritySplitRenderInfos = [];
    let remainingSplitRenderInfos = [];
    if (isIncomeBased) {
        baseSplitRenderInfo.aleCreditSign = baseSplitRenderInfo.category.creditSign;

        const baseCreditSign = -baseCategory.creditSign;
        nonBaseSplitRenderInfos.forEach((splitRenderInfo) => {
            if (splitRenderInfo.category === A.AccountCategory.INCOME) {
                prioritySplitRenderInfos.push(splitRenderInfo);
            }
            else {
                remainingSplitRenderInfos.push(splitRenderInfo);
            }
            splitRenderInfo.aleCreditSign = baseCreditSign;
        });

        baseClassExtras = 'Border-top';
    }
    else {
        remainingSplitRenderInfos = splitRenderInfos;

        remainingSplitRenderInfos.forEach((splitRenderInfo) => {
            splitRenderInfo.code = splitRenderInfo.category.code;
            splitRenderInfo.creditSign = 1;
            splitRenderInfo.aleCreditSign = 1;
        });

        baseSplitRenderInfo = undefined;
    }

    prioritySplitRenderInfos.sort(compareSplitRenderInfo);
    remainingSplitRenderInfos.sort(compareSplitRenderInfo);
    

    const tooltips = [];

    prioritySplitRenderInfos.forEach((entry) => {
        tooltips.push(renderSplitItemTooltip(entry));
    });
    remainingSplitRenderInfos.forEach((entry) => {
        tooltips.push(renderSplitItemTooltip(entry));
    });

    if (baseSplitRenderInfo) {
        tooltips.push(renderSplitItemTooltip(baseSplitRenderInfo, baseClassExtras));
    }

    return tooltips;
}


function renderSplitsListDisplay(args) {
    const { rowEntry, columnInfo, } = args;
    let { value } = args;
    if (!value) {
        const { cellEditBuffer } = args;
        if (!cellEditBuffer) {
            return;
        }
        value = cellEditBuffer.value;
    }

    if (!value) {
        return;
    }

    const { splits } = value;
    if (splits) {
        const { caller } = rowEntry;
        const { accessor } = caller.props;
        const { ariaLabel, inputSize } = columnInfo;
        let classExtras = columnInfo.inputClassExtras;
        const { splitIndex } = getTransactionInfo(args);

        let text;
        let tooltip;
        if (splits.length === 2) {
            const split = splits[1 - splitIndex];
            text = AH.getShortAccountAncestorNames(accessor, split.accountId);
        }
        else {
            text = userMsg('AccountRegister-multi_splits');

            tooltip = generateMultiSplitTooltips(args, value);
        }

        return <CellSelectDisplay
            selectedValue = {text}
            ariaLabel = {ariaLabel}
            classExtras = {classExtras}
            size = {inputSize}p
            tooltip = {tooltip}
        />;
    }
}


function handleMultiSplitSelect(args) {
    const { cellEditBuffer, } = args;
    const { rowEntry } = cellEditBuffer.value;
    const { caller } = rowEntry;

    const { newTransactionDataItem, splitIndex }
        = caller.grabEditedTransactionInfo(args);
    const { splits } = newTransactionDataItem;

    // Multi-splits
    const { accessor } = caller.props;
    caller.setModal((ref) => {
        return <MultiSplitsEditor
            accessor = {accessor}
            splits = {splits}
            splitIndex = {splitIndex}
            onDone = {({splits, splitIndex}) => {
                caller.updateSplits(args, splits, splitIndex);
                setModal(args, undefined, 'done');
            }}
            onCancel = {() => {
                setModal(args, undefined);
            }}
            refreshUndoMenu = {caller.props.refreshUndoMenu}
            ref = {ref}
        />;
    });
}


function onSplitsListChange(e, args) {
    const value = parseInt(e.target.value);
    const { cellEditBuffer, setCellEditBuffer, } = args;
    const { splits } = cellEditBuffer.value;
    const { splitIndex } = getTransactionInfo(args);
    if (value === -1) {
        // Multi-splits
        return handleMultiSplitSelect(args);
    }

    if (splits.length !== 2) {
        // We need to convert to a 2 split.
    }

    const newSplits = Array.from(splits);
    const newSplit = T.getSplitDataItem(splits[1 - splitIndex], true);
    newSplit.accountId = value;
    newSplits[1 - splitIndex] = newSplit;
    setCellEditBuffer(
        args.columnIndex,
        {
            value: Object.assign({}, cellEditBuffer.value, {
                splits: newSplits,
            }),
        });
    newSplit.accountId = value;
    
}

function renderSplitsListEditor(args) {
    const { columnInfo, cellEditBuffer, errorMsg,
        refForFocus } = args;
    const { splits, rowEntry } = cellEditBuffer.value;
    if (!splits || !rowEntry) {
        return;
    }

    const { splitIndex } = getTransactionInfo(args);
    const { caller } = rowEntry;
    const { accountId, accessor } = caller.props;

    // If any of the other accounts are lot based then we can't change
    // the split editor from here.
    for (let i = 0; i < splitIndex; ++i) {
        const split = splits[i];
        const accountType = accessor.getTypeOfAccountId(split.accountId);
        if (accountType.hasLots) {
            return renderSplitsListDisplay(args);
        }
    }
    for (let i = splitIndex + 1; i < splits.length; ++i) {
        const split = splits[i];
        const accountType = accessor.getTypeOfAccountId(split.accountId);
        if (accountType.hasLots) {
            return renderSplitsListDisplay(args);
        }
    }

    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

    const accountItems = Array.from(caller.state.accountItems);
    for (let i = 0; i < accountItems.length; ++i) {
        if (accountItems[i].value === accountId) {
            accountItems.splice(i, 1);
            break;
        }
    }

    const activeAccountId = (splits.length !== 2) 
        ? -1
        : splits[1 - splitIndex].accountId;

    return <AccountSelector
        accessor = {accessor}
        accountEntries = {accountItems}
        accountEntriesAreItems
        selectedAccountId = {activeAccountId}
        errorMsg = {errorMsg}
        ariaLabel = {ariaLabel}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => onSplitsListChange(e, args)}
        ref = {refForFocus}
    />;
}




//
//---------------------------------------------------------
// Split quantities

function getSplitQuantityCellValue(args, type) {
    const { newTransactionDataItem, splitIndex } = getTransactionInfo(args);
    const { rowEntry } = args;
    const { caller } = rowEntry;
    if (!newTransactionDataItem) {
        return;
    }

    const { accountType, quantityDefinition } = caller.state;
    const split = newTransactionDataItem.splits[splitIndex];
    const value = {
        accessor: caller.props.accessor,
        split: split,
        accountType: accountType,
        quantityDefinition: quantityDefinition,
        splitQuantityType: type,
        readOnly: newTransactionDataItem.splits.length !== 2,
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
        if (quantityBaseValue === '') {
            // Not set presume the opposite will set it.
            return;
        }

        const { newTransactionDataItem } = saveBuffer;
        const { splitIndex } = getTransactionInfo(args);

        const splitToUpdate = newTransactionDataItem.splits[splitIndex];
        newTransactionDataItem.splits[splitIndex] 
            = ACE.resolveSplitQuantityEditValueToSplitDataItem(args,
                splitToUpdate);
    }
}


/**
 */
function getAccountRegisterColumnInfoDefs(accountType) {
    accountType = A.getAccountType(accountType);

    let columnInfoDefs = allColumnInfoDefs[accountType.name];
    if (!columnInfoDefs) {
        columnInfoDefs = {
            date: ACE.getDateColumnInfo({
                getCellValue: getDateCellValue,
                saveCellValue: saveDateCellValue,
            }),
            refNum: ACE.getRefNumColumnInfo({
                getCellValue: (args) => getSplitCellValue(args, 'refNum'),
                saveCellValue: (args) => saveSplitCellValue(args, 'refNum'),
            }),
        };

        if (accountType.hasLots) {
            const lceArgs = {
                getSplitInfo: getSplitInfo,
                updateSplitInfo: updateSplitInfo,
                setModal: setModal,
            };

            // action
            columnInfoDefs.actionType = LCE.getActionColumnInfo(lceArgs);

            // description

            // reconcileState
            columnInfoDefs.reconcile = ACE.getReconcileStateColumnInfo({
                getCellValue: (args) => getSplitCellValue(args, 'reconcileState',
                    'reconcileState'),
                saveCellValue: (args) => saveSplitCellValue(args, 'reconcileState',
                    'reconcileState'),
            });

            // shares
            columnInfoDefs.shares = LCE.getSharesColumnInfo(lceArgs);

            // amount
            columnInfoDefs.monetaryAmount = LCE.getMonetaryAmountColumnInfo(lceArgs);

            // fees/commissions
            columnInfoDefs.fees = LCE.getFeesColumnInfo(lceArgs);

            // price
            columnInfoDefs.price = LCE.getPriceColumnInfo(lceArgs);

            if (accountType.isESPP) {
                columnInfoDefs.grantDate = LCE.getGrantDateColumnInfo(lceArgs);

                // grant FMV
                columnInfoDefs.grantDateFMVPrice 
                    = LCE.getGrantDateFMVPriceColumnInfo(lceArgs);

                // purchase FMV
                columnInfoDefs.purchaseDateFMVPrice 
                    = LCE.getPurchaseDateFMVPriceColumnInfo(lceArgs);
            }

            // total shares
            columnInfoDefs.totalShares = LCE.getTotalSharesColumnInfo(lceArgs);

            // total market value
            columnInfoDefs.totalMarketValue = LCE.getTotalMarketValueColumnInfo(lceArgs);

            // total cost basis
            columnInfoDefs.totalCostBasis = LCE.getTotalCostBasisColumnInfo(lceArgs);

            // total cash-in
            columnInfoDefs.totalCashIn = LCE.getTotalCashInColumnInfo(lceArgs);


        }
        else {
            columnInfoDefs.description = ACE.getDescriptionColumnInfo(
                {
                    getCellValue: getDescriptionCellValue,
                    saveCellValue: saveDescriptionCellValue,
                    renderEditCell: renderDescriptionCellEditor,
                    renderHeaderFilterComponent: renderDescriptionFilterEditor,
                }
            );

            columnInfoDefs.splits = { key: 'splits',
                header: {
                    label: userMsg('AccountRegister-split'),
                    classExtras: 'RowTable-header-base Splits-base Splits-header',
                },
                inputClassExtras: 'Splits-base Splits-input '
                    + 'Cell CellSelectEditor-select AccountId-base AccountId-input',
                cellClassName: 'RowTable-cell-base Splits-base Splits-cell',

                propertyName: 'splits',
                getCellValue: getSplitsListCellValue,
                saveCellValue: saveSplitsListCellValue,
                renderDisplayCell: renderSplitsListDisplay,
                renderEditCell: renderSplitsListEditor,
            };

            columnInfoDefs.reconcile = ACE.getReconcileStateColumnInfo(
                {
                    getCellValue: (args) => getSplitCellValue(args, 'reconcileState',
                        'reconcileState'),
                    saveCellValue: (args) => saveSplitCellValue(args, 'reconcileState',
                        'reconcileState'),
                }
            );

            columnInfoDefs.debit = ACE.getSplitQuantityColumnInfo(
                {
                    getCellValue: (args) => getSplitQuantityCellValue(args, 'debit'),
                    saveCellValue: saveSplitQuantityCellValue,
                },
                'debit',
                accountType.debitLabel
            );
            columnInfoDefs.credit = ACE.getSplitQuantityColumnInfo(
                {
                    getCellValue: (args) => getSplitQuantityCellValue(args, 'credit'),
                    saveCellValue: saveSplitQuantityCellValue,
                },
                'credit',
                accountType.creditLabel
            );
            columnInfoDefs.credit.oppositeColumnInfo = columnInfoDefs.debit;
            columnInfoDefs.debit.oppositeColumnInfo = columnInfoDefs.credit;

            columnInfoDefs.balance = ACE.getBalanceColumnInfo({
                getCellValue: getAccountStateQuantityCellValue,
            });
        }

        for (let name in columnInfoDefs) {
            const columnInfo = columnInfoDefs[name];
            if (columnInfo) {
                columnInfo.ariaLabel = columnInfo.ariaLabel 
                    || columnInfo.header.ariaLabel;
            }
        }

        allColumnInfoDefs[accountType.name] = columnInfoDefs;
    }

    return columnInfoDefs;
}

/**
 * Retrieves the account register columns with default settings.
 */
export function createDefaultColumns(accountType) {
    const columnInfos = getAccountRegisterColumnInfoDefs(accountType);

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });

    columns.forEach((column) => {
        column.isVisible = true;
    });

    return columns;
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

        this.onEditTransactionSplit = this.onEditTransactionSplit.bind(this);

        this.onAccountEvent = this.onAccountEvent.bind(this);

        this.getUndoRedoInfo = this.getUndoRedoInfo.bind(this);

        this.getRowKey = this.getRowKey.bind(this);
        this.onLoadRows = this.onLoadRows.bind(this);

        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);

        this.onPreRenderRow = this.onPreRenderRow.bind(this);

        this.getRowEntry = this.getRowEntry.bind(this);
        this.startRowEdit = this.startRowEdit.bind(this);
        this.getSaveBuffer = this.getSaveBuffer.bind(this);
        this.asyncSaveBuffer = this.asyncSaveBuffer.bind(this);
        this.endRowEdit = this.endRowEdit.bind(this);

        this.onChangeDescription = this.onChangeDescription.bind(this);
        this.onAutoCompleteDescription = this.onAutoCompleteDescription.bind(this);


        this._cellEditorsManager = new CellEditorsManager({
            getRowEntry: this.getRowEntry,
            getColumnInfo: (columnIndex) => 
                this.props.columns[columnIndex].columnInfo,
            setManagerState: (state) => this.setState({
                managerState: state,
            }),
            getManagerState: () => this.state.managerState,
            startRowEdit: this.startRowEdit,
            endRowEdit: this.endRowEdit,
            getSaveBuffer: this.getSaveBuffer,
            asyncSaveBuffer: this.asyncSaveBuffer,
        });

        this._rowTableRef = React.createRef();
        this._modalRef = React.createRef();

        const { accountId, accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const accountType = A.getAccountType(accountDataItem.type);

        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
            accountDataItem.pricedItemId);


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
            accountType: A.getAccountTypeName(accountType),
            rowEntries: [],
            rowEntriesByTransactionId: new Map(),
            currency: pricedItemDataItem.currency,
            quantityDefinition: pricedItemDataItem.quantityDefinition,
            forceLayoutUpdateId: 0,
        };


        this._lastYMDDate = new YMDDate().toString();
        this._lastOtherSplitAccountId
            = getDefaultAccountIdForNewSplit(accessor, this.state.accountType);


        // Find the account that has the longest name for the splits...
        const nameId = AH.getAccountWithLongestAncestorName(accessor);

        this._sizingRowEntry = {
            caller: this,
            transactionDataItem: {
                ymdDate: '2020-12-3112',
                description: userMsg('AccountRegister-dummy_description'),
                splits: [
                    {
                        reconcileState: T.ReconcileState.NOT_RECONCILED,
                        accountId: nameId.id,
                        quantityBaseValue: ACE.BalanceSizingBaseValue,
                        lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                        sellAutoLotType: T.AutoLotType.FIFO,
                        lotChanges: [
                        ],
                    },
                    {
                        reconcileState: T.ReconcileState.NOT_RECONCILED,
                        accountId: nameId.id,
                        quantityBaseValue: ACE.BalanceSizingBaseValue,
                        lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND.name,
                        lotChanges: [
                            { quantityBaseValue: ACE.BalanceSizingBaseValue, },
                        ],
                    },
                ],
            },
            accountStateDataItem: {
                ymdDate: '2020-12-3112',
                quantityBaseValue: ACE.BalanceSizingBaseValue,
                lotStates: [
                    { quantityBaseValue: ACE.BalanceSizingBaseValue, },
                ],
            },
            splitIndex: 0,
            splitAccountDataItem: {
                name: userMsg('AccountRegister-dummy_accountName'),
            }
        };

        this.updateRowEntries();

        this.updateRowEntryForLotCellEditors(this._sizingRowEntry);
    }


    getAccountType() {
        const { accessor, accountId } = this.props;
        return accessor.getTypeOfAccountId(accountId);
    }

    hasLots() {
        return this.getAccountType().hasLots;
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
                removedIds.add(transactionDataItem.id);
            }    
        });

        if (removedIds.size) {
            // Don't need to pass in the removed ids...
            this.updateRowEntries();
        }
    }


    onEditTransactionSplit(accountId, args) {
        if (accountId !== this.props.accountId) {
            return;
        }

        const { transactionDataItem, splitIndex } = args;
        if (transactionDataItem && this._rowTableRef.current) {
            const { rowEntriesByTransactionId } = this.state;
            const rowEntries = rowEntriesByTransactionId.get(
                transactionDataItem.id
            );
            if (rowEntries) {
                for (let i = 0; i < rowEntries.length; ++i) {
                    if (rowEntries[i].splitIndex === splitIndex) {
                        this._rowTableRef.current.activateRow(
                            rowEntries[i].rowIndex, () => {
                                this._rowTableRef.current.openActiveRow();
                            });

                        this.setState({
                            openArgsProcessed: true,
                        });

                        return;
                    }
                }
            }
        }
    }


    onAccountEvent() {
        this.updateAccountItems();
    }


    componentDidMount() {
        const { accessor, eventEmitter } = this.props;

        accessor.on('transactionsAdd', this.onTransactionsAdd);
        accessor.on('transactionsModify', this.onTransactionsModify);
        accessor.on('transactionsRemove', this.onTransactionsRemove);

        accessor.on('accountAdd', this.onAccountEvent);
        accessor.on('accountsModify', this.onAccountEvent);
        accessor.on('accountRemove', this.onAccountEvent);

        if (eventEmitter) {
            eventEmitter.on('editTransactionSplit', this.onEditTransactionSplit);
        }

        this.updateAccountItems();
    }

    componentWillUnmount() {
        const { accessor, eventEmitter } = this.props;

        accessor.off('transactionsAdd', this.onTransactionsAdd);
        accessor.off('transactionsModify', this.onTransactionsModify);
        accessor.off('transactionsRemove', this.onTransactionsRemove);

        if (eventEmitter) {
            eventEmitter.off('editTransactionSplit', this.onEditTransactionSplit);
        }

        accessor.off('accountAdd', this.onAccountEvent);
        accessor.off('accountsModify', this.onAccountEvent);
        accessor.off('accountRemove', this.onAccountEvent);
    }


    componentDidUpdate(prevProps) {
        const { props } = this;

        let rowsNeedUpdating = false;
        const { hiddenTransactionIds, 
            showHiddenTransactions } = props;

        if (!deepEqual(prevProps.hiddenTransactionIds, hiddenTransactionIds)) {
            this._hiddenTransactionIds = new Set(hiddenTransactionIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenTransactions !== showHiddenTransactions) {
            rowsNeedUpdating = true;
        }


        const isColumnFiltersChange = !deepEqual(
            props.columnFilters, prevProps.columnFilters);
        if (isColumnFiltersChange) {
            this.updateColumnFilters(props.columnFilters);
        }
        if (!rowsNeedUpdating && props.showColumnFilters) {
            if (isColumnFiltersChange) {
                rowsNeedUpdating = true;
            }
            else if (!prevProps.showColumnFilters) {
                // Only update if there are filters specified...
                rowsNeedUpdating = !deepEqual(props.columnFilters, {});
            }
        }

        if (props.showColumnFilters !== prevProps.showColumnFilters) {
            this.setState({
                forceLayoutUpdateId: this.state.forceLayoutUpdateId + 1,
            });
        }


        if (rowsNeedUpdating) {
            const prevActiveRowInfo = this.getActiveRowInfo();

            this.updateRowEntries();

            const { onSelectSplit } = this.props;
            if (onSelectSplit) {
                const activeRowInfo = this.getActiveRowInfo();
                if (!deepEqual(prevActiveRowInfo, activeRowInfo)) {
                    onSelectSplit(activeRowInfo);
                }
            }
        }

        const { openArgs } = this.props;
        const { openArgsProcessed } = this.state;
        if (openArgs && !openArgsProcessed) {
            this.onEditTransactionSplit(this.props.accountId, openArgs);
        }
    }


    updateColumnFilters(newColumnFilters) {

    }


    updateAccountItems() {
        const { accessor } = this.props;

        const rootAccountIds = accessor.getRootAccountIds();

        const accountEntries = [];
        addAccountIdsToAccountEntries({
            accessor: accessor,
            accountEntries: accountEntries,
            accountIds: rootAccountIds,
            labelCallback: AH.getShortAccountAncestorNames,
        });

        const accountItems = accountEntriesToItems({
            accessor: accessor, 
            accountEntries: accountEntries,
            noIndent: true,
        });
        accountItems.splice(0, 0,
            {
                value: -1,
                text: userMsg('AccountRegister-multi_splits'),
            }
        );

        this.setState({
            accountItems: accountItems,
        });
    }


    getActiveRowInfo() {
        const { activeRowIndex } = this.state;
        if (activeRowIndex !== undefined) {
            const rowEntry = this.state.rowEntries[activeRowIndex];
            if (rowEntry) {
                return {
                    transactionId: rowEntry.transactionId,
                    transactionDataItem: T.getTransactionDataItem(
                        rowEntry.transactionDataItem, true
                    ),
                    splitIndex: rowEntry.splitIndex,
                };
            }
        }
    }


    updateRowEntryForLotCellEditors(rowEntry) {
        if (this.hasLots()) {
            rowEntry.lceSplitInfo = LCE.createSplitInfo({
                transactionDataItem: 
                    rowEntry.transactionDataItem || rowEntry.newTransactionDataItem,
                splitIndex: rowEntry.splitIndex,
                accessor: this.props.accessor,
                accountStateDataItem: rowEntry.accountStateDataItem,
                referencePriceBaseValue: rowEntry.priceBaseValue,
                referenceYMDDate: rowEntry.priceYMDDate,
            });
        }
    }

    updateRowEntries(modifiedTransactionIds) {
        if (this._rowTableRef.current) {
            this._rowTableRef.current.cancelRowEdit();
        }

        process.nextTick(async () => {
            const newRowEntries = [];
            const newRowEntriesByTransactionIds = new Map();

            modifiedTransactionIds = modifiedTransactionIds || new Set();

            const { accessor, accountId, showColumnFilters, columnFilters } = this.props;

            let alwaysReloadRows;
            let transactionKeys;
            if (showColumnFilters && columnFilters) {
                transactionKeys 
                    = await accessor.asyncGetFilteredTransactionKeysForAccount(
                        accountId, columnFilters);
                alwaysReloadRows = transactionKeys && (transactionKeys.length);
            }

            if (!transactionKeys) {
                transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
                    accountId, true);
            }
            
            
            let { activeRowIndex, rowEntries } = this.state;
            if ((activeRowIndex + 1) === rowEntries.length) {
                // If the active row is the last row, it's the 'new transaction' row
                // and we want to advance to the next new transaction in that case.
                activeRowIndex = undefined;
            }

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

                let { splitCount } = key;

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
                                    existingRowEntry.lceSplitInfo = undefined;
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


            //
            // The 'new transaction' row...
            const newTransactionDataItem 
                = this.createTransactionDataItemForNewTransaction();

            const newTransactionRowEntry = {
                key: '',
                transactionDataItem: newTransactionDataItem,
                splitIndex: 0,
                splitOccurrance: 0,
                caller: this,
            };
            this.updateRowEntryForLotCellEditors(newTransactionRowEntry);
            
            newRowEntries.push(newTransactionRowEntry);


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

            const openNewRow = (activeRowIndex === undefined);
            if ((activeRowIndex === undefined) 
             || (activeRowIndex >= newRowEntries.length)) {
                activeRowIndex = newRowEntries.length - 1;
            }
            
            this.setState({
                activeRowIndex: activeRowIndex,
                openNewRow: openNewRow,
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
                minLoadedRowIndex: newRowEntries.length,
                maxLoadedRowIndex: -1,
            });

            if (alwaysReloadRows && (newTopVisibleRow === undefined)) {
                if (visibleRowRange) {
                    newTopVisibleRow = visibleRowRange.topVisibleRow;
                    newBottomFullyVisibleRow = visibleRowRange.bottomFullyVisibleRow;
                }
            }

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


    createTransactionDataItemForNewTransaction() {
        const newTransactionDataItem = {
            ymdDate: this._lastYMDDate,
        };

        const accountType = this.getAccountType();
        if (accountType.hasLots) {
            const { accessor, accountId } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);
            newTransactionDataItem.splits = [
                {
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    accountId: this.props.accountId,
                    quantityBaseValue: '',
                    lotTransactionType: this._lastLotTransactionType 
                        || T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    accountId: accountDataItem.parentAccountId,
                    quantityBaseValue: '',
                },
            ];

            if (accountType.isESPP) {
                newTransactionDataItem.splits[0].esppBuyInfo = {
                    grantYMDDate: this._lastYMDDate,
                };
            }
        }
        else {
            newTransactionDataItem.splits = [
                {
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    accountId: this.props.accountId,
                    quantityBaseValue: '',
                },
                {
                    reconcileState: T.ReconcileState.NOT_RECONCILED.name,
                    accountId: this._lastOtherSplitAccountId,
                    quantityBaseValue: '',
                },
            ];
        }

        return newTransactionDataItem;
    }


    getRowKey(rowIndex) {
        const { rowEntries } = this.state;
        const rowEntry = rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.key;
        }
        return (-rowIndex).toString();
    }


    async asyncLoadRows() {
        const { rowEntries } = this.state;

        const firstRowIndex = this._firstRowIndexToLoad;
        const lastRowIndex = this._lastRowIndexToLoad;

        // Don't try to load the 'new transaction' row...
        const lastRowToLoadIndex = Math.min(rowEntries.length - 2, lastRowIndex);

        const { accessor } = this.props;
        const { accountId } = this.props;
        const transactionIdA = rowEntries[firstRowIndex].transactionId;
        const transactionIdB = rowEntries[lastRowToLoadIndex].transactionId;

        const results = await accessor.asyncGetAccountStateAndTransactionDataItems(
            accountId, transactionIdA, transactionIdB);
        
        const newRowEntries = Array.from(rowEntries);
        const newRowEntriesByTransactionIds 
            = new Map(this.state.rowEntriesByTransactionId);

        let resultIndex = 0;
        for (let rowIndex = firstRowIndex; rowIndex <= lastRowToLoadIndex; 
            ++rowIndex, ++resultIndex) {
            const newRowEntry = Object.assign({}, rowEntries[rowIndex]);
            const id = newRowEntry.transactionId;
            const { splitOccurrance } = newRowEntry;

            // We need to look out for skipped transactions and also the possibility
            // that we're now out of sync...
            const startResultIndex = resultIndex;
            let resultEntry;
            for (; resultIndex < results.length; ++resultIndex) {
                resultEntry = results[resultIndex];
                if ((splitOccurrance === resultEntry.splitOccurrance)
                 && (id === resultEntry.transactionDataItem.id)) {
                    break;
                }
            }
            if (resultIndex >= results.length) {
                resultIndex = 0;
                for (; resultIndex < startResultIndex; ++resultIndex) {
                    resultEntry = results[resultIndex];
                    if ((splitOccurrance === resultEntry.splitOccurrance)
                    && (id === resultEntry.transactionDataItem.id)) {
                        break;
                    }
                }

                if (resultIndex >= startResultIndex) {
                    // Uh-oh, must be out of sync...
                    console.log('Out of sync...');
                    return;
                }
            }
            
            const { transactionDataItem } = resultEntry;
            newRowEntry.accountStateDataItem = resultEntry.accountStateDataItem;
            newRowEntry.transactionDataItem = transactionDataItem;
            newRowEntry.splitIndex = resultEntry.splitIndex;

            if (!LCE.canCalcPrice({
                transactionDataItem: transactionDataItem,
                splitIndex: newRowEntry.splitIndex,
                accessor: accessor,
            })) {
                const pricedItemDataItem 
                    = AH.getPricedItemDataItemForAccountId(accessor, accountId);
                const priceDataItem 
                    = await accessor.asyncGetPriceDataItemOnOrClosestBefore({
                        pricedItemId: pricedItemDataItem.id,
                        ymdDate: transactionDataItem.ymdDate,
                        refYMDDate: transactionDataItem.ymdDate,
                    });
                if (priceDataItem) {
                    const priceQuantityDefinition 
                        = accessor.getPriceQuantityDefinitionForPricedItem(
                            pricedItemDataItem.id);
                    const priceBaseValue 
                        = priceQuantityDefinition.numberToBaseValue(priceDataItem.close);
                    newRowEntry.priceBaseValue = priceBaseValue;
                    newRowEntry.priceYMDDate = priceDataItem.ymdDate;
                }
            }

            this.updateRowEntryForLotCellEditors(newRowEntry);

            newRowEntries[rowIndex] = newRowEntry;
            let transactionIdRowEntries 
                = Array.from(newRowEntriesByTransactionIds.get(id) || []);
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
            if (!rowEntry.transactionDataItem) {
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


    onActiveRowChanged(rowIndex) {
        this.setState({
            activeRowIndex: rowIndex,
        },
        () => {
            const { onSelectSplit } = this.props;
            if (onSelectSplit) {
                onSelectSplit(this.getActiveRowInfo());
            }
        });
    }


    onPreRenderRow(args) {
        if (args.rowIndex < 0) {
            return {
                showColumnFilters: this.props.showColumnFilters,
                caller: this,
            };
        }
    }


    getRowEntry(args) {
        const { rowIndex, isSizeRender } = args;
        return (isSizeRender)
            ? this._sizingRowEntry
            : this.state.rowEntries[rowIndex];
    }


    getActiveEditInfo() {
        const { getActiveEditInfo } = this.state;
        if (!getActiveEditInfo) {
            return;
        }

        return getActiveEditInfo();
    }


    onChangeDescription(e) {
        const activeEditInfo = this.getActiveEditInfo();
        if (!activeEditInfo) {
            return;
        }

        const { rowEditBuffer } = activeEditInfo;
        if (!rowEditBuffer) {
            return;
        }

        const { newTransactionDataItem, } = rowEditBuffer;
        if (newTransactionDataItem.id) {
            return;
        }
        
        const { value } = e.target;
        if (!value) {
            return;
        }

        if (value === this.state.descriptionAutoCompleteValue) {
            return;
        }
        

        const { accessor } = this.props;
        accessor.asyncGetFilteredTransactionKeysForAccount(
            this.props.accountId,
            {
                description: value,
            }
        ).then((result) => {
            if (result && result.length) {
                const itemsByDescription = new Map();

                // Items are ordered oldest to newest, we want to give priority to the
                // newest items...
                for (let i = result.length - 1; i >= 0; --i) {
                    const item = result[i];
                    const description 
                        = item.description.trim().toUpperCase();
                    if (!itemsByDescription.has(description)) {
                        itemsByDescription.set(description, item);
                    }
                }

                // We want the descriptions as they appear, so we can't use the keys since
                // those are case insensitive...
                const descriptionAutoCompleteList = [];
                const descriptionAutoCompleteItems = [];
                itemsByDescription.forEach((item) => {
                    descriptionAutoCompleteList.push(
                        item.description.trim());
                    descriptionAutoCompleteItems.push(item);
                });

                this.setState({
                    descriptionAutoCompleteValue: value,
                    descriptionAutoCompleteList: descriptionAutoCompleteList,
                    descriptionAutoCompleteItems: descriptionAutoCompleteItems,
                });
            }
            else {
                this.setState({
                    descriptionAutoCompleteValue: value,
                    descriptionAutoCompleteList: [],
                    descriptionAutoCompleteItems: undefined,
                });
            }
        }).catch((e) => {
            console.warn(
                'asyncGetFilteredTransactionKeysForAccount() failed: ' + e);
            this.setState({
                descriptionAutoCompleteValue: value,
                descriptionAutoCompleteList: [],
                descriptionAutoCompleteItems: undefined,
            });
        });
    }


    autoCompleteFromTransactionDataItem(args, transactionDataItem, splitIndex) {
        const activeEditInfo = this.getActiveEditInfo();
        if (!activeEditInfo) {
            return;
        }

        const { rowEditBuffer, setRowEditBuffer } = activeEditInfo;
        if (!setRowEditBuffer) {
            return;
        }

        if (splitIndex >= 0) {
            // Want to keep these...
            delete transactionDataItem.id;
            
            transactionDataItem.ymdDate = rowEditBuffer.newTransactionDataItem.ymdDate;
            const saveBuffer = this._cellEditorsManager.grabSaveBuffer(args, true);
            if (saveBuffer) {
                const { newTransactionDataItem } = saveBuffer;
                if (newTransactionDataItem && newTransactionDataItem.ymdDate) {
                    transactionDataItem.ymdDate = newTransactionDataItem.ymdDate;
                }
            }

            this._lastYMDDate = transactionDataItem.ymdDate;

            // We don't want any refNums set...
            transactionDataItem.splits.forEach((split) => {
                delete split.refNum;
                split.reconcileState = T.ReconcileState.NOT_RECONCILED;
            });

            setRowEditBuffer({
                newTransactionDataItem: transactionDataItem,
                splitIndex: splitIndex,
            },
            (rowEditBuffer) => {
                const args = Object.assign({}, activeEditInfo, {
                    rowEditBuffer: rowEditBuffer,
                });
                this._cellEditorsManager.reloadCellEditBuffers(args);
            });
        }
    }


    onAutoCompleteDescription(args, index, autoCompleteList) {
        try {
            // Make sure we're still good.
            const { descriptionAutoCompleteList, descriptionAutoCompleteItems, 
            } = this.state;
            if (!deepEqual(descriptionAutoCompleteList, autoCompleteList)) {
                return;
            }

            const item = descriptionAutoCompleteItems[index];
            if (!item) {
                return;
            }

            const splitIndex = item.splitAccountIds.indexOf(this.props.accountId);

            const { transactionDataItem } = item;
            if (transactionDataItem) {
                this.autoCompleteFromTransactionDataItem(args, 
                    transactionDataItem, splitIndex);
            }
            else {
                this.props.accessor.asyncGetTransactionDataItemWithId(item.id).then(
                    (transactionDataItem) =>
                        this.autoCompleteFromTransactionDataItem(
                            args, transactionDataItem, splitIndex)
                ).catch((e) => {
                    console.warn('asyncGetTransactionDataItemWithId() failed for '
                        + item.id + ' ' + e);
                });
            }
        }
        finally {
            this.setState({
                descriptionAutoCompleteValue: undefined,
                descriptionAutoCompleteList: undefined,
                descriptionAutoCompleteItems: undefined,
            });
        }
    }

    renderDescriptionCellEditor(args) {
        const { rowEditBuffer } = args;
        const { newTransactionDataItem, } = rowEditBuffer;
        if (!newTransactionDataItem.id) {
            // Only for the new transaction editor...
            args = Object.assign({}, args);
            args.autoCompleteList = this.state.descriptionAutoCompleteList;
            args.onChange = this.onChangeDescription;
            args.onAutoComplete = (index, autoCompleteList) => 
                this.onAutoCompleteDescription(args, index, autoCompleteList);
        }

        return ACE.renderDescriptionEditor(args);
    }


    startRowEdit(args) {
        const { rowIndex, rowEditBuffer } = args;
        const rowEntry = this.state.rowEntries[rowIndex];
        const { transactionDataItem } = rowEntry;
        rowEditBuffer.newTransactionDataItem 
            = T.getTransactionDataItem(transactionDataItem, true);
        rowEditBuffer.splitIndex = rowEntry.splitIndex;

        if (!this.hasLots()) {
            // If there's a split with lots, we need to edit in the account for the
            // lot.
            const { accessor } = this.props;
            const { splits } = transactionDataItem;
            for (let i = splits.length - 1; i >= 0; --i) {
                const split = splits[i];
                const accountType = accessor.getTypeOfAccountId(split.accountId);
                if (accountType.hasLots) {
                    const { onOpenRegisterForTransactionSplit } = this.props;
                    if (onOpenRegisterForTransactionSplit) {
                        onOpenRegisterForTransactionSplit(
                            transactionDataItem,
                            i
                        );
                        return false;
                    }
                }
            }
        }

        this.updateRowEntryForLotCellEditors(rowEditBuffer);

        this.setState({
            openNewRow: false,
            getActiveEditInfo: args.getActiveEditInfo,
        });

        return true;
    }


    endRowEdit(args) {
        this.setState({
            getActiveEditInfo: undefined,
        });
    }


    grabEditedTransactionInfo(args) {
        const saveBuffer = this._cellEditorsManager.grabSaveBuffer(args, true);
        this.finalizeSaveBuffer(saveBuffer);
        return saveBuffer;
    }


    finalizeSaveBuffer(saveBuffer) {
        const { newTransactionDataItem, splitIndex } = saveBuffer;

        const { splits } = newTransactionDataItem;
        if (splits.length === 2) {
            const { accessor } = this.props;
            const thisSplit = newTransactionDataItem.splits[splitIndex];
            const otherSplit = newTransactionDataItem.splits[1 - splitIndex];
            const newSplit = Object.assign({}, otherSplit,
                accessor.createBalancingSplitDataItem([thisSplit],
                    otherSplit.accountId));
            newTransactionDataItem.splits[1 - splitIndex]
                = newSplit;
        }
        
        return saveBuffer;
    }


    // Callback for when a multi-split is done, updates the currently edited split.
    updateSplits(args, splits, splitIndex) {
        const { newTransactionDataItem } = this.grabEditedTransactionInfo(args);
        if (deepEqual(newTransactionDataItem.splits, splits)) {
            return;
        }
        newTransactionDataItem.splits = splits;

        const { setRowEditBuffer } = args;
        setRowEditBuffer(
            {
                newTransactionDataItem: newTransactionDataItem,
                splitIndex: splitIndex,
            },
            (rowEditBuffer) => {
                args = Object.assign({}, args, {
                    rowEditBuffer: rowEditBuffer,
                });
                this._cellEditorsManager.reloadCellEditBuffers(args);
            }
        );
    }


    updateLCESplitInfo(args, lceSplitInfo) {
        const { setRowEditBuffer } = args;
        const { newTransactionDataItem: baseTransactionDataItem, 
            splitIndex: baseSplitIndex } 
            = this.grabEditedTransactionInfo(args);
        const baseSplitDataItem = baseTransactionDataItem.splits[baseSplitIndex];

        const newlceSplitInfo = LCE.copySplitInfo(lceSplitInfo);

        const { splitIndex, transactionDataItem } = lceSplitInfo;
        const newSplitDataItem = transactionDataItem.splits[splitIndex];
        transactionDataItem.ymdDate = baseTransactionDataItem.ymdDate;
        newSplitDataItem.reconcileState = baseSplitDataItem.reconcileState;
        newSplitDataItem.refNum = baseSplitDataItem.refNum;

        setRowEditBuffer(
            {
                newTransactionDataItem: baseTransactionDataItem,
                lceSplitInfo: newlceSplitInfo,
            },
            (rowEditBuffer) => {
                args = Object.assign({}, args, {
                    rowEditBuffer: rowEditBuffer,
                });
                this._cellEditorsManager.reloadCellEditBuffers(args);
            }
        );
    }
    
    
    getSaveBuffer(args) {
        const { rowEditBuffer } = args;
        const { newTransactionDataItem, splitIndex } = rowEditBuffer;
        return {
            newTransactionDataItem: 
                T.getTransactionDataItem(newTransactionDataItem, true),
            splitIndex: splitIndex,
            lceSplitInfo: rowEditBuffer.lceSplitInfo,
        };
    }


    async asyncSaveBuffer(args) {
        try {
            const { rowIndex, cellEditBuffers, saveBuffer, reason } = args;

            if ((reason === 'activateRow') 
             && (rowIndex === this.state.rowEntries.length - 1)) {
                // Don't save the new row if we're activating a different row.
                const newRowEntries = Array.from(this.state.rowEntries);
                const newRowEntry = Object.assign({}, newRowEntries[rowIndex], {
                    transactionDataItem: 
                        this.createTransactionDataItemForNewTransaction(),
                    splitIndex: 0,
                });
                newRowEntries[rowIndex] = newRowEntry;
                this.setState({
                    rowEntries: newRowEntries,
                });
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
            const { transactionDataItem } = rowEntry;

            this.finalizeSaveBuffer(saveBuffer);
            const { newTransactionDataItem } = saveBuffer;
            if (this.hasLots()) {
                const result = await LCE.asyncTransactionDataItemFromSplitInfo(
                    saveBuffer.lceSplitInfo,
                    newTransactionDataItem);
                if (result instanceof Error) {
                    this.setErrorMsg(result.columnInfoKey, result.toString());
                    return;
                }
                saveBuffer.splitIndex = result;
            }
            
            const { splits } = newTransactionDataItem;

            const { accessor } = this.props;

            const accountingActions = accessor.getAccountingActions();
            let action;
            let isNewTransaction;

            if ((rowIndex + 1) === this.state.rowEntries.length) {
                // Last row is new transaction...
                // Don't allow missing quantities.
                let isMissingQuantity = false;
                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    const lotTransactionType = T.getLotTransactionType(
                        split.lotTransactionType);
                    if (lotTransactionType 
                     && lotTransactionType.isQuantityBaseValueOptional) {
                        continue;
                    }
                    if (typeof split.quantityBaseValue !== 'number') {
                        isMissingQuantity = true;
                        break;
                    }
                }

                if (!isMissingQuantity) {
                    action = accountingActions.createAddTransactionsAction(
                        newTransactionDataItem
                    );

                    isNewTransaction = true;
                }
            }
            else {
                if (!T.areTransactionsSimilar(
                    newTransactionDataItem, transactionDataItem)) {

                    // Check for formerly reconciled items...
                    let areReconciledChanges;
                    const oldSplits = transactionDataItem.splits;
                    const newSplits = newTransactionDataItem.splits;
                    for (let i = 0; i < oldSplits.length; ++i) {
                        const oldSplit = oldSplits[i];
                        if (oldSplit.reconcileState 
                            === T.ReconcileState.RECONCILED.name) {
                            // Did it change in the new splits?
                            areReconciledChanges = true;

                            let newSplit;
                            // TODO: Put together a tracking multi-split instance system.
                            for (let j = 0; j < newSplits.length; ++j) {
                                if (newSplits[j].accountId === oldSplit.accountId) {
                                    newSplit = newSplits[i];
                                    break;
                                }
                            }
                            if (newSplit) {
                                if ((newSplit.reconcileState
                                  === oldSplit.reconcileState)
                                 && (newSplit.quantityBaseValue
                                  === oldSplit.quantityBaseValue)) {
                                    areReconciledChanges = false;
                                }
                            }
                            if (areReconciledChanges) {
                                break;
                            }
                        }
                    }

                    action = await accountingActions.asyncCreateModifyTransactionAction(
                        newTransactionDataItem
                    );

                    if (areReconciledChanges) {
                        // 
                        const msg = userMsg('AccountRegister-confirm_reconcile_change');
                        this.setModal(() => <QuestionPrompter
                            message = {msg}
                            onButton = {(buttonId) => {
                                if (buttonId === 'yes') {
                                    process.nextTick(async () => {
                                        await this.asyncApplyAction(args, action);
                                        if (this._rowTableRef.current) {
                                            this._rowTableRef.current.cancelRowEdit();
                                        }

                                        this.setModal(undefined);
                                    });
                                }
                                else {
                                    this.setModal(undefined);
                                }
                            }}
                            buttons = {StandardButton.YES_NO}
                        />);
                        return;
                    }

                }
            }

            if (action) {
                await this.asyncApplyAction(args, action, isNewTransaction);
            }
        }
        catch (e) {
            const columnName = (this.hasLots())
                ? 'shares' 
                : 'description';
            this.setErrorMsg(columnName, e.toString());
            return;
        }

        return true;
    }


    async asyncApplyAction(args, action, isNewTransaction) {
        const { saveBuffer } = args;
        const { newTransactionDataItem, splitIndex } = saveBuffer;
        const { splits } = newTransactionDataItem;

        const { accessor } = this.props;

        await accessor.asyncApplyAction(action);

        if (isNewTransaction) {
            this._lastYMDDate = newTransactionDataItem.ymdDate;
            let largestQuantityBaseValue = 0;
            for (let i = 0; i < splits.length; ++i) {
                if (i !== splitIndex) {
                    const { quantityBaseValue } = splits[i];
                    if (typeof quantityBaseValue === 'number') {
                        const absValue = Math.abs(quantityBaseValue);
                        if (absValue > largestQuantityBaseValue) {
                            this._lastOtherSplitAccountId = splits[i].accountId;
                        }
                    }
                }
                else if (this.hasLots()) {
                    this._lastLotTransactionType = splits[i].lotTransactionType;
                }
            }
        }
    }


    setErrorMsg(columnInfoKey, msg) {
        this._cellEditorsManager.setErrorMsg(columnInfoKey, msg);
    }


    setModal(modal, columnIndex) {
        if (modal !== this.state.modal) {
            this.setState({
                modal: modal,
            },
            () => {
                const { refreshUndoMenu} = this.props;
                if (refreshUndoMenu) {
                    refreshUndoMenu();
                }
                if (!this.state.modal) {
                    if (this._rowTableRef.current) {
                        this._rowTableRef.current.focus(columnIndex);
                    }
                }
            });
        }
    }


    getUndoRedoInfo() {
        const { modal } = this.state;
        if (modal) {
            const { current } = this._modalRef;
            if (current) {
                const { getUndoRedoInfo } = current; 
                if (getUndoRedoInfo) {
                    return getUndoRedoInfo();
                }
            }
        }
    }


    handlePasteCommand(splitInfoForCopy, apply) {
        const { transactionDataItem, splitIndex } = splitInfoForCopy;
        const newTransactionDataItem 
            = T.getTransactionDataItem(transactionDataItem, true);
        const { splits } = newTransactionDataItem;

        const { accountId } = this.props;
        let isAccountSplit;
        for (let i = 0; i < splits.length; ++i) {
            if (splits[i].accountId === accountId) {
                isAccountSplit = true;
                break;
            }
        }

        const { accessor } = this.props;

        if (!isAccountSplit) {
            const split = splits[splitIndex];
            const toCopyAccountDataItem = accessor.getAccountDataItemWithId(
                split.accountId);
            const toCopyAccountCategory = A.getAccountType(
                toCopyAccountDataItem.type
            ).category;

            const myAccountDataItem = accessor.getAccountDataItemWithId(
                accountId);
            const myCategory = A.getAccountType(
                myAccountDataItem.type
            ).category;
            
            if (myCategory === toCopyAccountCategory) {
                split.accountId = accountId;
                isAccountSplit = true;
            }
        }
        else {
            // In the same account register, let's update the date to today.
            newTransactionDataItem.ymdDate = new YMDDate().toString();
        }

        if (!isAccountSplit) {
            return;
        }

        if (apply) {
            // Clear out all the reconciled flags.
            splits.forEach((split) => {
                split.reconcileState = T.ReconcileState.NOT_RECONCILED.name;
            });

            if (this._rowTableRef.current) {
                // Replace the new transaction row with the pasted transaction
                // and start editing.
                const newRowEntries = Array.from(this.state.rowEntries);
                const editIndex = newRowEntries.length - 1;
                const newRowEntry = newRowEntries[editIndex];
                newRowEntry.transactionDataItem = newTransactionDataItem;
                newRowEntry.splitIndex = splitIndex;

                this.updateRowEntryForLotCellEditors(newRowEntry);

                this.setState({
                    activeRowIndex: editIndex,
                    rowEntries: newRowEntries,
                },
                () => {
                    this._rowTableRef.current.startRowEdit({
                        rowIndex: editIndex,
                        columnIndex: 0,
                    });
                });
            }
            else {
                // Just add the transaction.
                process.nextTick(async () => {
                    const accountingActions = accessor.getAccountingActions();
                    const action = accountingActions.createAddTransactionAction(
                        newTransactionDataItem);
                    accessor.asyncApplyAction(action)
                        .catch((e) => {
                            this.setErrorMsg(e);
                        });
                });    
            }
        }

        return true;
    }


    render() {
        const { props, state } = this;

        const { modal } = state;

        let modalComponent;
        let registerClassName = 'RowTableContainer AccountRegister';
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

                onPreRenderRow = {this.onPreRenderRow}

                onSetColumnWidth = {this.props.onSetColumnWidth}
                onMoveColumn = {this.props.onMoveColumn}

                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

                classExtras = "RowTable-striped"

                //
                // EditableRowTable methods
                onRenderDisplayCell = {this._cellEditorsManager.onRenderDisplayCell}
                onRenderEditCell = {this._cellEditorsManager.onRenderEditCell}

                onRenderHeaderCell = {this._cellEditorsManager.onRenderHeaderCell}
                onRenderFooterCell = {this._cellEditorsManager.onRenderFooterCell}

                requestedActiveRowIndex = {state.activeRowIndex}
                onActiveRowChanged = {this.onActiveRowChanged}

                requestOpenActiveRow = {state.openNewRow && !props.showColumnFilters}

                onStartRowEdit = {this._cellEditorsManager.onStartRowEdit}
                asyncOnSaveRowEdit = {this._cellEditorsManager.asyncOnSaveRowEdit}
                onCancelRowEdit = {this._cellEditorsManager.onCancelRowEdit}

                onEnterCellEdit = {this._cellEditorsManager.onEnterCellEdit}
                onExitCellEdit = {this._cellEditorsManager.onExitCellEdit}

                forceLayoutUpdateId = { state.forceLayoutUpdateId }

                id = {this.props.id}
                ref = {this._rowTableRef}
            />
            {this.props.children}
        </div>;

        return <div className="W-100 H-100">
            {modalComponent}
            {table}
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
    onSelectSplit: PropTypes.func,
    onOpenRegisterForTransactionSplit: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    refreshUndoMenu: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    onMoveColumn: PropTypes.func,
    hiddenTransactionIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenTransactions: PropTypes.bool,
    showTransactionIds: PropTypes.bool,
    children: PropTypes.any,
    eventEmitter: PropTypes.object,
    openArgs: PropTypes.object,

    showColumnFilters: PropTypes.bool,
    columnFilters: PropTypes.object,
    onColumnFiltersChange: PropTypes.func,

    id: PropTypes.string,
};
