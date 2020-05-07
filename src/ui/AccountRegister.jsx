import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { RowEditCollapsibleTable } from '../util-ui/RowEditTable';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectDisplay } from '../util-ui/CellSelectEditor';
import { CellDateDisplay } from '../util-ui/CellDateEditor';
import { CellQuantityDisplay } from '../util-ui/CellQuantityEditor';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import deepEqual from 'deep-equal';


const allColumnInfoDefs = {};

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
                label: userMsg('AccountRegister-date'),
                ariaLabel: 'Date',
                propertyName: 'date',
                className: 'text-center',
                inputClassName: 'text-center',
                inputSize: -10,
                cellClassName: cellClassName,
            },
            refNum: { key: 'refNum',
                label: userMsg('AccountRegister-refNum'),
                ariaLabel: 'Number',
                propertyName: 'refNum',
                className: 'text-center',
                inputClassName: 'text-right',
                inputSize: -6,
                cellClassName: cellClassName,
            },
            description: { key: 'description',
                label: userMsg('AccountRegister-description'),
                ariaLabel: 'Description',
                propertyName: 'description',
                className: 'w-auto',
                cellClassName: cellClassName,
            },
            splits: { key: 'split',
                label: userMsg('AccountRegister-split'),
                ariaLabel: 'Split',
                propertyName: 'split',
                className: '',
                cellClassName: cellClassName,
            },
            reconcile: { key: 'reconcile',
                label: userMsg('AccountRegister-reconcile'),
                ariaLabel: 'Reconciled',
                propertyName: 'reconcile',
                className: 'text-center',
                inputSize: 2,
                cellClassName: cellClassName,
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
                label: userMsg('AccountRegister-bought'),
                ariaLabel: 'Bought',
                propertyName: 'bought',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            };
            columnInfoDefs.sold = { key: 'sold',
                label: userMsg('AccountRegister-sold'),
                ariaLabel: 'Sold',
                propertyName: 'sold',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            };
            columnInfoDefs.shares = { key: 'shares',
                label: userMsg('AccountRegister-shares'),
                ariaLabel: 'Shares',
                propertyName: 'shares',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            };
        }
        else {
            columnInfoDefs.debit = { key: 'debit',
                label: accountType.debitLabel,
                ariaLabel: accountType.debitLabel,
                propertyName: 'debit',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            };
            columnInfoDefs.credit = { key: 'credit',
                label: accountType.creditLabel,
                ariaLabel: accountType.creditLabel,
                propertyName: 'credit',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            };
            columnInfoDefs.balance = { key: 'balance',
                label: userMsg('AccountRegister-balance'),
                ariaLabel: 'Account Balance',
                propertyName: 'balance',
                className: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
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

        this.onLoadRowEntries = this.onLoadRowEntries.bind(this);

        this.onStartEditRow = this.onStartEditRow.bind(this);
        this.onCancelEditRow = this.onCancelEditRow.bind(this);
        this.asyncOnSaveEditRow = this.asyncOnSaveEditRow.bind(this);
        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onGetRowAtIndex = this.onGetRowAtIndex.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);

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

        this.updateRowEntries();
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

            this.setState({
                rowEntries: newRowEntries,
                rowEntriesByTransactionId: newRowEntriesByTransactionIds,
            });
        });
    }


    onLoadRowEntries(startRowIndex, rowCount) {
        const { accessor } = this.props;
        const { rowEntries } = this.state;

        let needsLoading = false;
        const lastRowIndex = startRowIndex + rowCount - 1;
        for (let i = startRowIndex; i <= lastRowIndex; ++i) {
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
        const transactionIdA = rowEntries[startRowIndex].transactionId;
        const transactionIdB = rowEntries[lastRowIndex].transactionId;

        process.nextTick(async () => {
            console.log('loading transactions: ' + startRowIndex + ' ' + lastRowIndex);

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
            for (let rowIndex = startRowIndex; rowIndex <= lastRowIndex; 
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


    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }


    onActivateRow(rowEntry) {
        this.setState({
            activeRowKey: rowEntry.key,
        });
    }



    onStartEditRow(rowEntry, cellEditBuffers, rowEditBuffer, asyncEndEditRow) {
    }


    onCancelEditRow(rowEntry, cellEditBuffers, rowEditBuffers) {
    }

    async asyncOnSaveEditRow(rowEntry, cellEditBuffers, rowEditBuffer) {
    }


    renderTextDisplay(columnInfo, value) {
        const { ariaLabel, inputClassName, inputSize } = columnInfo;
        return <CellTextDisplay
            ariaLabel={ariaLabel}
            value={value}
            inputClassExtras={inputClassName}
            size={inputSize}
        />;
    }



    renderDateEditor(columnInfo, renderArgs, rowEntry) {

    }

    renderDateDisplay(columnInfo, rowEntry) {
        const { transactionDataItem } = rowEntry;
        if (transactionDataItem) {
            return <CellDateDisplay
                ariaLabel="Date"
                value={transactionDataItem.ymdDate}
                classExtras={columnInfo.className}
                inputClassExtras={columnInfo.inputClassName}
                size={columnInfo.inputSize}
            />;
        }
    }

    
    renderRefNumEditor(columnInfo, renderArgs, rowEntry) {

    }

    renderRefNumDisplay(columnInfo, rowEntry) {
        const { transactionDataItem } = rowEntry;
        if (transactionDataItem) {
            const split = transactionDataItem.splits[rowEntry.splitIndex];
            const refNum = split.refNum || '';
            return this.renderTextDisplay(columnInfo, refNum.toString());
        }
    }

    
    renderDescriptionEditor(columnInfo, renderArgs, rowEntry, splitDataItem) {

    }

    renderDescriptionDisplay(columnInfo, rowEntry) {
        const { transactionDataItem } = rowEntry;
        if (transactionDataItem) {
            const split = transactionDataItem.splits[rowEntry.splitIndex];
            let { description, memo } = split;
            description = description || transactionDataItem.description;
            memo = memo || transactionDataItem.memo;

            const descriptionComponent 
                = this.renderTextDisplay(columnInfo, description);
            if (memo) {
                return <div className="simple-tooltip">
                    {descriptionComponent}
                    <div className="simple-tooltiptext">{memo}</div>
                </div>;
            }

            return descriptionComponent;
        }
    }
    


    renderSplitEditor(columnInfo, renderArgs, rowEntry) {

    }

    renderSplitItemTooltip(splits, index) {
        const split = splits[index];
        const splitAccountDataItem 
            = this.props.accessor.getAccountDataItemWithId(split.accountId);
        
        const { quantityDefinition } = this.state;
        const value = getQuantityDefinition(quantityDefinition)
            .baseValueToValueText(split.quantityBaseValue);
        return <div className="row" key={index}>
            <div className="col col-sm-auto text-left">{splitAccountDataItem.name}</div>
            <div className="col text-right">{value}</div>
        </div>;
    }

    renderSplitDisplay(columnInfo, rowEntry) {
        const { transactionDataItem } = rowEntry;
        if (transactionDataItem) {
            const { accessor } = this.props;
            const splits = transactionDataItem.splits;
            let text;
            if (splits.length === 2) {
                const split = splits[1 - rowEntry.splitIndex];
                const splitAccountDataItem 
                    = accessor.getAccountDataItemWithId(split.accountId);
                text = splitAccountDataItem.name;
            }
            else {
                text = userMsg('AccountRegister-multi_splits');
                const tooltipEntries = [];
                for (let i = 0; i < splits.length; ++i) {
                    tooltipEntries.push(this.renderSplitItemTooltip(splits, i));
                }
                const tooltip = <div className="simple-tooltiptext">
                    {tooltipEntries}
                </div>;

                return <div className="simple-tooltip"> 
                    {this.renderTextDisplay(columnInfo, text)}
                    {tooltip}
                </div>;
            }
            
            return this.renderTextDisplay(columnInfo, text);
        }
    }


    renderDebitCreditEditor(columnInfo, renderArgs, rowEntry, sign) {

    }

    renderDebitCreditDisplay(columnInfo, rowEntry, sign) {
        const { accountType, quantityDefinition } = this.state;
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

        return <CellQuantityDisplay
            quantityBaseValue={quantityBaseValue}
            quantityDefinition={quantityDefinition}
            ariaLabel={sign > 0 ? 'Credit' : 'Debit'}
            inputClassExtras={columnInfo.className}
            size={columnInfo.inputSize}
        />;
    }

    
    renderDebitEditor(columnInfo, renderArgs, rowEntry) {
        return this.renderDebitCreditEditor(columnInfo, renderArgs, rowEntry, -1);
    }

    renderDebitDisplay(columnInfo, rowEntry) {
        return this.renderDebitCreditDisplay(columnInfo, rowEntry, -1);
    }

    
    renderCreditEditor(columnInfo, renderArgs, rowEntry) {
        return this.renderDebitCreditEditor(columnInfo, renderArgs, rowEntry, 1);
    }

    renderCreditDisplay(columnInfo, rowEntry) {
        return this.renderDebitCreditDisplay(columnInfo, rowEntry, 1);
    }


    renderBoughtSoldEditor(columnInfo, renderArgs, rowEntry, sign) {

    }

    renderBoughtSoldDisplay(columnInfo, rowEntry, sign) {
        const { accountType, quantityDefinition } = this.state;
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

        const { accessor } = this.props;
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
            inputClassExtras={columnInfo.className}
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

    
    renderBoughtEditor(columnInfo, renderArgs, rowEntry) {
        return this.renderBoughtSoldEditor(columnInfo, renderArgs, rowEntry, -1);
    }

    renderBoughtDisplay(columnInfo, rowEntry) {
        return this.renderBoughtSoldDisplay(columnInfo, rowEntry, -1);
    }

    
    renderSoldEditor(columnInfo, renderArgs, rowEntry) {
        return this.renderBoughtSoldEditor(columnInfo, renderArgs, rowEntry, 1);
    }

    renderSoldDisplay(columnInfo, rowEntry) {
        return this.renderBoughtSoldDisplay(columnInfo, rowEntry, 1);
    }

    
    renderSharesEditor(columnInfo, renderArgs, rowEntry) {
        this.renderSharesDisplay(columnInfo, rowEntry);
    }

    renderSharesDisplay(columnInfo, rowEntry) {
        const { accountStateDataItem } = rowEntry;
        if (accountStateDataItem) {
            const { quantityDefinition } = this.state;
            const { quantityBaseValue } = accountStateDataItem;
            return <CellQuantityDisplay
                quantityDefinition={quantityDefinition}
                quantityBaseValue={quantityBaseValue}
                ariaLabel="Shares"
                inputClassExtras={columnInfo.className}
                size={columnInfo.inputSize}
            />;
        }
    }

    
    renderBalanceEditor(columnInfo, renderArgs, rowEntry) {
        this.renderBalanceDisplay(columnInfo, rowEntry);
    }

    renderBalanceDisplay(columnInfo, rowEntry) {
        const { accountStateDataItem } = rowEntry;
        if (accountStateDataItem) {
            const { quantityDefinition } = this.state;
            const { quantityBaseValue } = accountStateDataItem;
            return <CellQuantityDisplay
                quantityDefinition={quantityDefinition}
                quantityBaseValue={quantityBaseValue}
                ariaLabel="Balance"
                inputClassExtras={columnInfo.className}
                size={columnInfo.inputSize}
            />;
        }
    }

    
    renderReconcileEditor(columnInfo, renderArgs, rowEntry) {

    }

    renderReconcileDisplay(columnInfo, rowEntry) {
        const { transactionDataItem } = rowEntry;
        if (transactionDataItem) {
            const split = transactionDataItem.splits[rowEntry.splitIndex];
            let reconcileState = split.reconcileState
                || T.ReconcileState.NOT_RECONCILED.name;
            
            return <CellSelectDisplay
                selectedValue={userMsg('AccountRegister-reconcile_' + reconcileState)}
                ariaLabel="Reconcile State"
                classExtras={columnInfo.className}
                size={columnInfo.inputSize}
            />;
        }
    }

    
    onRenderEditCell(cellInfo, cellSettings, renderArgs) {
        const { rowEntry } = cellInfo;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'date' :
            return this.renderDateEditor(columnInfo, renderArgs, rowEntry);
        
        case 'refNum' :
            return this.renderRefNumEditor(columnInfo, renderArgs, rowEntry);
        
        case 'description' :
            return this.renderDescriptionEditor(columnInfo, renderArgs, rowEntry);
        
        case 'split' :
            return this.renderSplitEditor(columnInfo, renderArgs, rowEntry);

        case 'debit' :
            return this.renderDebitEditor(columnInfo, renderArgs, rowEntry);

        case 'credit' :
            return this.renderCreditEditor(columnInfo, renderArgs, rowEntry);

        case 'balance' :
            return this.renderBalanceEditor(columnInfo, renderArgs, rowEntry);

        case 'bought' :
            return this.renderBoughtEditor(columnInfo, renderArgs, rowEntry);

        case 'sold' :
            return this.renderSoldEditor(columnInfo, renderArgs, rowEntry);
        
        case 'shares' :
            return this.renderSharesEditor(columnInfo, renderArgs, rowEntry);
    
        case 'reconcile' :
            return this.renderReconcileEditor(columnInfo, renderArgs, rowEntry);
        }
    }

    onRenderDisplayCell(cellInfo, cellSettings) {
        const { rowEntry } = cellInfo;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'date' :
            return this.renderDateDisplay(columnInfo, rowEntry);
        
        case 'refNum' :
            return this.renderRefNumDisplay(columnInfo, rowEntry);
        
        case 'description' :
            return this.renderDescriptionDisplay(columnInfo, rowEntry);
        
        case 'split' :
            return this.renderSplitDisplay(columnInfo, rowEntry);
        
        case 'debit' :
            return this.renderDebitDisplay(columnInfo, rowEntry);
        
        case 'credit' :
            return this.renderCreditDisplay(columnInfo, rowEntry);
        
        case 'balance' :
            return this.renderBalanceDisplay(columnInfo, rowEntry);

        case 'bought' :
            return this.renderBoughtDisplay(columnInfo, rowEntry);

        case 'sold' :
            return this.renderSoldDisplay(columnInfo, rowEntry);
            
        case 'shares' :
            return this.renderSharesDisplay(columnInfo, rowEntry);
            
        case 'reconcile' :
            return this.renderReconcileDisplay(columnInfo, rowEntry);
        
        }
    }


    render() {
        const { state } = this;
        return <div>
            <RowEditCollapsibleTable
                tableClassExtras="table-striped"
                columnInfos={state.columnInfos}
                rowEntries={state.rowEntries}
                activeRowKey={state.activeRowKey}
                onRenderDisplayCell={this.onRenderDisplayCell}
                onRenderEditCell={this.onRenderEditCell}
                onStartEditRow={this.onStartEditRow}
                onCancelEditRow={this.onCancelEditRow}
                asyncOnSaveEditRow={this.asyncOnSaveEditRow}

                onGetRowAtIndex={this.onGetRowAtIndex}
                onActivateRow={this.onActivateRow}
                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}
                onLoadRowEntries={this.onLoadRowEntries}
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
