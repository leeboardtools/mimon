import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import { PricedItemType } from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { collapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo, rowInfosTreeToArray, 
} from '../util-ui/CollapsibleRowTable';
import { EditableRowTable } from '../util-ui/EditableRowTable';
import * as C from '../util/Currency';
import { CellTextEditor, CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectEditor, CellSelectDisplay } from '../util-ui/CellSelectEditor';
import CellEditorsManager from '../util-ui/CellEditorsManager';
import * as CE from './AccountingCellEditors';


const EditableCollapsibleRowTable = collapsibleRowTable(EditableRowTable);


export function cloneAccountDataItem(accountDataItem) {
    const clone = Object.assign({}, accountDataItem);
    if (accountDataItem.childAccounts && accountDataItem.childAccounts) {
        clone.childAccounts = cloneAccountDataItems(accountDataItem.childAccounts);
    }
    return clone;
}

export function cloneAccountDataItems(accountDataItems) {
    const clone = [];
    accountDataItems.forEach((accountDataItem) => {
        clone.push(cloneAccountDataItem(accountDataItem));
    });
    return clone;
}

export function findAccountDataItemWithId(accountDataItems, id) {
    for (let i = 0; i < accountDataItems.length; ++i) {
        const accountDataItem = accountDataItems[i];
        if (accountDataItem.id === id) {
            return accountDataItem;
        }
        if (accountDataItem.childAccounts) {
            const result = findAccountDataItemWithId(accountDataItem.childAccounts, id);
            if (result) {
                return result;
            }
        }
    }
}

function removeAccountDataItemWithId(accountDataItems, id) {
    for (let i = 0; i < accountDataItems.length; ++i) {
        const accountDataItem = accountDataItems[i];
        if (accountDataItem.id === id) {
            accountDataItems.splice(i, 1);
            return true;
        }

        const { childAccounts } = accountDataItem;
        if (childAccounts) {
            if (removeAccountDataItemWithId(childAccounts, id)) {
                return true;
            }
        }
    }
}


/**
 * Component for editing the accounts for a particular root account
 * in a new accounting file.
 * @private
 */
export class NewFileAccountsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);
        this.onMoveAccountUp = this.onMoveAccountUp.bind(this);
        this.onMoveAccountDown = this.onMoveAccountDown.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        //this.onStartEditRow = this.onStartEditRow.bind(this);
        //this.onCancelEditRow = this.onCancelEditRow.bind(this);
        //this.asyncOnSaveEditRow = this.asyncOnSaveEditRow.bind(this);

        this.onStartRowEdit = this.onStartRowEdit.bind(this);
        this.onCancelRowEdit = this.onCancelRowEdit.bind(this);
        this.asyncOnSaveRowEdit = this.asyncOnSaveRowEdit.bind(this);

        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onTextEditorChange = this.onTextEditorChange.bind(this);
        this.onAccountTypeChange = this.onAccountTypeChange.bind(this);

        //this.onGetRowExpandCollapseState = this.onGetRowExpandCollapseState.bind(this);
        //this.onRowToggleCollapse = this.onRowToggleCollapse.bind(this);


        this._tableRef = React.createRef();

        this._collapsedRowIds = new Set();

        this.state = {
            rowInfos: this.buildRowInfos(),
            undoList: [],
            redoList: [],
        };

        this._sizingRowInfo = {
            accountDataItem: {
                name: userMsg('AccountsList-dummy_name'),

                // TODO:
                // Scan through the account type names to find the longest one...
                type: A.AccountType.REAL_ESTATE.name,
            },
        };

        const cellClassName = 'm-0 ';

        this.state.columnInfos = [
            { key: 'name',
                header: {
                    label: userMsg('NewFileAccountsEditor-account_name'),
                    ariaLabel: 'Name',
                    classExtras: 'text-left w-50',
                },
                propertyName: 'name',
                inputClassExtras: 'text-left',
                cellClassName: cellClassName + 'w-50',
            },
            { key: 'type',
                header: {
                    label: userMsg('NewFileAccountsEditor-type'),
                    ariaLabel: 'Account Type',
                    classExtras: 'text-left w-15',
                },
                propertyName: 'type',
                inputClassExtras: 'text-left',
                cellClassName: cellClassName + 'w-15',
            },
            { key: 'description',
                header: {
                    label: userMsg('NewFileAccountsEditor-description'),
                    ariaLabel: 'Description',
                    classExtras: 'text-left w-40',
                },
                propertyName: 'description',
                inputClassExtras: 'text-left',
                cellClassName: cellClassName + 'w-40',
            },
            { key: 'opening_balance',
                header: {
                    label: userMsg('NewFileAccountsEditor-opening_balance'),
                    ariaLabel: 'Opening Balance',
                    classExtras: 'text-right',
                },
                propertyName: 'openingBalance',
                inputClassExtras: 'text-right',
                cellClassName: cellClassName,
                inputSize: -12, // 1,234,567.89
            },
        ];

        this.state.columns = this.generateColumns();

        this.state = Object.assign(this.state, this.buildRowInfos());
        if (this.state.rowInfos.length) {
            this.state.activeRowKey = this.state.rowInfos[0].key;
        }
    }


    generateColumns(columnWidths) {
        const { columnInfos } = this.state;
        const columns = columnInfos.map((columnInfo) => {
            return {
                key: columnInfo.key,
                // width
                // minWidth
                // maxWidth
                cellClassExtras: columnInfo.cellClassName,
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


    onExpandCollapseRow({rowInfo, expandCollapseState}) {
        this.setState((state) => {
            rowInfo = Object.assign({}, rowInfo, {
                expandCollapseState: expandCollapseState,
            });
            switch (expandCollapseState) {
            case ExpandCollapseState.COLLAPSED :
                this._collapsedRowIds.delete(rowInfo.key);
                break;
    
            case ExpandCollapseState.EXPANDED :
                this._collapsedRowIds.add(rowInfo.key);
                break;
            
            default :
                return;
            }

            return {
                rowInfos: updateRowInfo(state.rowInfos, rowInfo),
            };
        });
    }


    buildRowInfos() {
        const rowInfos = [];
        const { rootAccountDataItems } = this.props;
        
        const parentType = A.AccountCategory[this.props.accountCategory]
            .rootAccountType.name;
        rootAccountDataItems.forEach((accountDataItem) => {
            this.addToRowInfos(rowInfos, accountDataItem, parentType, 
                undefined, undefined);
        });

        return rowInfos;
    }
    

    addToRowInfos(rowInfos, accountDataItem, 
        parentType, parentId) {

        const { childAccounts } = accountDataItem;

        const key = accountDataItem.id;
        const isCollapsed = this._collapsedRowIds.has(key);

        const rowInfo = {
            key: key,
            parentType: parentType,
            parentId: parentId,
            expandCollapseState: (childAccounts && childAccounts.length)
                ? ((isCollapsed) ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountDataItem: accountDataItem,
        };
        rowInfos.push(rowInfo);

        if (childAccounts && childAccounts.length) {
            rowInfo.childRowInfos = [];
            childAccounts.forEach((childDataItem) => {
                this.addToRowInfos(rowInfo.childRowInfos, childDataItem, 
                    accountDataItem.type, accountDataItem.id);
            });
        }
    }


    updateRowInfos(activeRowKey) {
        this.setState((state) => {
            const rowInfos = this.buildRowInfos();
            return {
                rowInfos: rowInfos,
                activeRowKey: activeRowKey || state.activeRowKey,
            };
        });
    }


    getActiveRowInfo() {
        const { activeRowKey, rowInfos } = this.state;
        if (activeRowKey) {
            return findRowInfoWithKey(rowInfos, activeRowKey);
        }
    }


    menuNeedsUpdate() {
        const { onMenuNeedsUpdate } = this.props;
        if (onMenuNeedsUpdate) {
            onMenuNeedsUpdate();
        }
    }


    componentDidMount() {
        this.menuNeedsUpdate();
    }


    componentDidUpdate(prevProps, prevState) {
        if (!deepEqual(prevProps.rootAccountDataItems, this.props.rootAccountDataItems)) {
            this.updateRowInfos();
        }

        if (this.state.activeRowKey !== prevState.activeRowKey) {
            const { onActiveRowChanged } = this.props;
            if (onActiveRowChanged) {
                onActiveRowChanged(this.state.activeRowKey);
            }
        }

        const { undoList, redoList } = this.state;
        if ((undoList.length !== prevState.undoList.length)
         || (redoList.length !== prevState.redoList.length)) {
            this.menuNeedsUpdate();
        }
    }


    setActiveRowKey(activeRowKey) {
        window.requestAnimationFrame(() => this.setState({
            activeRowKey: activeRowKey,
        }));
    }


    // OK
    onNewAccount() {
        this.actAfterEndEdit(() => {
            // If the active row is closed or the active row's account type
            // does not support children...
            //      - Add the new data item to the parent.
            // Otherwise
            //      - Add as a child of the active row.            
            let parentId;
            let afterSiblingId;

            const activeRowInfo = this.getActiveRowInfo();
            if (activeRowInfo) {
                // If the active row's type doesn't support children then it will never be
                // expanded.
                if (activeRowInfo.expandCollapseState === ExpandCollapseState.EXPANDED) {
                    parentId = activeRowInfo.accountDataItem.id;
                }
                else {
                    // parentId may be 0/undefined...
                    parentId = activeRowInfo.parentId;
                    afterSiblingId = activeRowInfo.accountDataItem.id;
                }

            }

            this.saveForUndo(userMsg('NewFileAccountsEditor-add_account'));
            const activeRowKey = this.props.onNewAccount(this.props.accountCategory, 
                parentId, afterSiblingId);
            
            this.setActiveRowKey(activeRowKey);
        });
    }


    // OK
    onRemoveAccount() {
        this.actAfterEndEdit(() => {
            const activeRowInfo = this.getActiveRowInfo();
            if (activeRowInfo) {
                this.saveForUndo(userMsg('NewFileAccountsEditor-remove_account'));

                const { rowInfos } = this.state;
                const { key } = activeRowInfo;

                let nextActiveRowInfo;

                const keysToIgnore = new Set();
                if (activeRowInfo.childRowInfos) {
                    activeRowInfo.childRowInfos.forEach((rowInfo) => 
                        keysToIgnore.add(rowInfo.key));
                }
    
                let rowInfosArray = rowInfosTreeToArray(rowInfos, keysToIgnore);
                if (!rowInfosArray) {
                    return;
                }

                for (let i = 0; i < rowInfosArray.length; ++i) {
                    if (rowInfosArray[i].key === key) {
                        nextActiveRowInfo = rowInfosArray[i + 1];
                        break;
                    }
                }
    
                if (!nextActiveRowInfo) {
                    nextActiveRowInfo = rowInfos[0];
                }

                const nextActiveRowKey = (nextActiveRowInfo) 
                    ? nextActiveRowInfo.key 
                    : undefined;

                const newRootAccountDataItems 
                    = cloneAccountDataItems(this.props.rootAccountDataItems);
                removeAccountDataItemWithId(newRootAccountDataItems, 
                    activeRowInfo.key);
                this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
                    newRootAccountDataItems);
        
                this.setActiveRowKey(nextActiveRowKey);
            }
        });
    }


    getMoveNewRootAccountDataItems(delta) {
        const activeRowInfo = this.getActiveRowInfo();
        if (activeRowInfo) {
            const { key } = activeRowInfo;

            // We only move accounts amongst their siblings.
            let siblingRowInfos;
            if (activeRowInfo.parentId) {
                const parentRowInfo = findRowInfoWithKey(
                    this.state.rowInfos, activeRowInfo.parentId);
                siblingRowInfos = parentRowInfo.childRowInfos;
            }
            else {
                siblingRowInfos = this.state.rowInfos;
            }

            let index;
            for (index = 0; index < siblingRowInfos.length; ++index) {
                if (siblingRowInfos[index].key === key) {
                    break;
                }
            }

            if (index >= siblingRowInfos.length) {
                // Something's not right...
                return;
            }

            let newIndex = index + delta;
            if (newIndex < 0) {
                newIndex = siblingRowInfos.length - 1;
            }
            else if (newIndex >= siblingRowInfos.length) {
                newIndex = 0;
            }

            if (newIndex === index) {
                return;
            }

            const newRootAccountDataItems 
                = cloneAccountDataItems(this.props.rootAccountDataItems);

            const dstRowInfo = siblingRowInfos[newIndex];
            let siblingAccountDataItems;
            if (dstRowInfo.parentId) {
                const parentAccountDataItem = findAccountDataItemWithId(
                    newRootAccountDataItems,
                    dstRowInfo.parentId);
                siblingAccountDataItems 
                    = parentAccountDataItem.childAccounts;
            }
            else {
                // Swapping in the main account data items...
                siblingAccountDataItems = newRootAccountDataItems;
            }


            [
                siblingAccountDataItems[index],
                siblingAccountDataItems[newIndex],
            ] = [
                siblingAccountDataItems[newIndex],
                siblingAccountDataItems[index],
            ];

            return newRootAccountDataItems;
        }
    }


    moveActiveRowInfo(delta, msg) {
        const newRootAccountDataItems = this.getMoveNewRootAccountDataItems(delta);
        if (newRootAccountDataItems) {
            this.saveForUndo(msg);

            this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
                newRootAccountDataItems);

            const { activeRowKey } = this.state;
            this.setState({
                activeRowKey: undefined,
            });
            this.setActiveRowKey(activeRowKey);
        }
    }


    onMoveAccountUp() {
        this.actAfterEndEdit(() => {
            this.moveActiveRowInfo(-1, userMsg('NewFileAccountsEditor-move_up'));
        });
    }


    onMoveAccountDown() {
        this.actAfterEndEdit(() => {
            this.moveActiveRowInfo(1, userMsg('NewFileAccountsEditor-move_down'));
        });
    }


    saveForUndo(contextMsg) {
        const undoList = Array.from(this.state.undoList);
        const save = {
            rootAccountDataItems:
                cloneAccountDataItems(this.props.rootAccountDataItems),
            activeRowKey: this.state.activeRowKey,
            contextMsg: contextMsg,
        };
        undoList.push(save);

        this.setState({
            undoList: undoList,
        });

        this.menuNeedsUpdate();
    }


    doUndoRedo(actList, saveList) {
        if (actList.length) {
            const act = actList[actList.length - 1];

            const save = {
                rootAccountDataItems:
                    cloneAccountDataItems(this.props.rootAccountDataItems),
                activeRowKey: act.activeRowKey,
                contextMsg: act.contextMsg,
            };

            this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
                act.rootAccountDataItems);

            const newActList = Array.from(actList);
            newActList.splice(newActList.length - 1, 1);

            const newSaveList = Array.from(saveList);
            newSaveList.push(save);

            return {
                activeRowKey: act.activeRowKey,
                lists: [
                    newActList,
                    newSaveList,
                ],
            };
        }
    }


    onUndo() {
        const { asyncEndEditRow, undoList, redoList } = this.state;
        if (asyncEndEditRow) {
            asyncEndEditRow(false);
        }
        else {
            const result = this.doUndoRedo(undoList, redoList);
            if (result) {
                this.setState({
                    undoList: result.lists[0],
                    redoList: result.lists[1],
                });
                this.setActiveRowKey(result.activeRowKey);
            }
        }
    }


    onRedo() {
        this.actAfterEndEdit(() => {
            const { undoList, redoList } = this.state;
            if (redoList.length) {
                const result = this.doUndoRedo(redoList, undoList);
                if (result) {
                    this.setState({
                        activeRowKey: result.activeRowKey,
                        redoList: result.lists[0],
                        undoList: result.lists[1],
                    });
                    this.setActiveRowKey(result.activeRowKey);
                }
            }
        });
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


    actAfterEndEdit(callback) {
        const { asyncEndEditRow } = this.state;
        if (asyncEndEditRow) {
            process.nextTick(async () => {
                if (await asyncEndEditRow(true)) {
                    callback();
                }
            });
        }
        else {
            callback();
        }
    }


    onActiveRowChanged(rowIndex) {
        if (!this._tableRef.current) {
            return;
        }
        const rowInfo = this._tableRef.current.getRowInfoForIndex(rowIndex);
        if (!rowInfo) {
            return;
        }
        if (rowInfo.key !== this.state.activeRowKey) {
            this.setState({
                activeRowKey: rowInfo.key,
            });
        }
    }

/*
    onRowToggleCollapse(rowInfo) {
        switch (rowInfo.expandCollapseState) {
        case ExpandCollapseState.COLLAPSED :
            this._collapsedRowIds.delete(rowInfo.key);
            break;

        case ExpandCollapseState.EXPANDED :
            this._collapsedRowIds.add(rowInfo.key);
            break;
        
        default :
            return;
        }

        // This has the side effect of making rowInfo the active row entry...
        this.updateRowInfos(rowInfo.key);
    }
*/

/*
    onGetRowExpandCollapseState(rowInfo) {
        return rowInfo.expandCollapseState;
    }
*/
/*
    onStartEditRow({ rowInfo, cellEditBuffers, rowEditBuffer, asyncEndEditRow }) {
        for (let i = 0; i < this._columnInfos.length; ++i) {
            cellEditBuffers.push(i);
        }

        const { accountDataItem } = rowInfo;
        rowEditBuffer.type = accountDataItem.type;
        rowEditBuffer.name = accountDataItem.name;
        rowEditBuffer.description = accountDataItem.description;
        rowEditBuffer.openingBalance = accountDataItem.openingBalance;

        this.props.onSetEndEditAsyncCallback(asyncEndEditRow);

        this.setState({
            asyncEndEditRow: asyncEndEditRow,
            errorMsgs: {}
        });
    }
*/
/*
    onCancelEditRow({ rowInfo, cellEditBuffers, rowEditBuffers }) {
        this.props.onSetEndEditAsyncCallback(undefined);
        this.setState({
            asyncEndEditRow: undefined,
            errorMsgs: {}
        });
    }
*/


    onStartRowEdit({ rowIndex, rowEditBuffer, cellEditBuffers,
        asyncEndRowEdit, cancelRowEdit,
        setRowEditBuffer, setCellEditBuffer}) {
        
        const rowEntry = this.state.rowEntries[rowIndex];
        const { accountDataItem } = rowEntry;
        if (!accountDataItem) {
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
                //transactionId: transactionDataItem.id,
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
        const { accountDataItem } = rowEntry;
        if (!accountDataItem) {
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



    setErrorMsg(propertyName, msg) {
        this.setState({
            errorMsgs: {
                [propertyName]: msg,
            }
        });
        return msg;
    }

/*
    async asyncOnSaveEditRow({ rowInfo, cellEditBuffers, rowEditBuffer }) {
        const currency = C.USD;
        const newRootAccountDataItems 
            = cloneAccountDataItems(this.props.rootAccountDataItems);
        const accountDataItem = findAccountDataItemWithId(
            newRootAccountDataItems, rowInfo.key);
        
        const name = (rowEditBuffer.name || '').trim();
        if (!name) { 
            return this.setErrorMsg('name', 
                userMsg('NewFileAccountsEditor-name_required'));
        }

        const openingBalance = (rowEditBuffer.openingBalance || '').trim();
        if (openingBalance) {
            try {
                currency.baseValueFromString(openingBalance);
            }
            catch (e) {
                return this.setErrorMsg('openingBalance',
                    userMsg('NewFileAccountsEditor-invalid_opening_balance'));
            }
        }
        
        accountDataItem.type = rowEditBuffer.type;
        accountDataItem.name = rowEditBuffer.name;
        accountDataItem.description = rowEditBuffer.description;
        accountDataItem.openingBalance = rowEditBuffer.openingBalance;

        this.saveForUndo(userMsg('NewFileAccountsEditor-modify_account'));
        this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
            newRootAccountDataItems);
        
        this.props.onSetEndEditAsyncCallback(undefined);

        this.setState({
            asyncEndEditRow: undefined,
            errorMsgs: {}
        });
    }
*/

    updateRowEditBuffer(renderArgs, rowEditBuffer) {
        renderArgs.updateRowEditBuffer(rowEditBuffer);
        if (this.state.errorMsgs) {
            this.setState({
                errorMsgs: {}
            });
        }
    }

    onTextEditorChange(event, propertyName, renderArgs) {
        const { rowEditBuffer } = renderArgs;
        rowEditBuffer[propertyName] = event.target.value;
        this.updateRowEditBuffer(renderArgs, rowEditBuffer);
    }


    renderTextEditor(columnInfo, renderArgs) {
        const { propertyName, ariaLabel, inputClassExtras } = columnInfo;
        const { rowEditBuffer, setCellRef, onFocus, onBlur } = renderArgs;
        const errorMsg = this.state.errorMsgs 
            ? this.state.errorMsgs[propertyName]
            : undefined;
        
        return <CellTextEditor
            ariaLabel = {ariaLabel}
            value = {rowEditBuffer[propertyName]}
            inputClassExtras = {inputClassExtras}
            errorMsg = {errorMsg}
            onChange = {(event) => { 
                this.onTextEditorChange(event, propertyName, renderArgs);
            }}
            onFocus = {onFocus}
            onBlur = {onBlur}
            ref = {setCellRef}
        />;
    }


    onAccountTypeChange(event, renderArgs) {
        const { rowEditBuffer } = renderArgs;
        rowEditBuffer.type = event.target.value;
        this.updateRowEditBuffer(renderArgs, rowEditBuffer);
    }

    renderAccountTypeEditor(renderArgs) {
        const { cellInfo, rowEditBuffer, setCellRef,
            onFocus, onBlur } = renderArgs;
        const { rowInfo } = cellInfo;
        const parentType = A.AccountType[rowInfo.parentType];

        // If the account has kids, we need to restrict the allowed types.
        const { childAccounts } = rowInfo.accountDataItem;
        const items = [];
        parentType.allowedChildTypes.forEach((type) => {
            if (type.pricedItemType !== PricedItemType.CURRENCY) {
                return;
            }

            let allowsChildren = true;
            if (childAccounts) {
                for (let i = childAccounts.length - 1; i >= 0; --i) {
                    const childType = A.AccountType[childAccounts[i].type];
                    if (type.allowedChildTypes.indexOf(childType) < 0) {
                        allowsChildren = false;
                        break;
                    }
                }
            }
            if (!allowsChildren) {
                return;
            }
            items.push([type.name, type.description]);
        });

        return <CellSelectEditor
            ariaLabel = "Account Type"
            selectedValue = {rowEditBuffer.type}
            items = {items}
            onChange = {(event) => { 
                this.onAccountTypeChange(event, renderArgs); 
            }}
            onFocus = {onFocus}
            onBlur = {onBlur}
            ref = {setCellRef}
        />;
    }

    
    onRenderEditCell({cellInfo, cellSettings, renderArgs}) {
        const { rowInfo } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowInfo.depth;
        }

        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'type' :
            return this.renderAccountTypeEditor(renderArgs);

        case 'name' :
            return this.renderTextEditor(columnInfo, renderArgs);

        case 'description' :
            return this.renderTextEditor(columnInfo, renderArgs);

        case 'opening_balance' :
            return this.renderTextEditor(columnInfo, renderArgs);

        }
    }


    onRenderDisplayCell(args) {
        const {rowIndex, columnIndex, isSizeRender, } = args;
        if (!this._tableRef.current) {
            return;
        }
        const rowInfo = this._tableRef.current.getRowInfoForIndex(rowIndex);
        if (!rowInfo) {
            return;
        }

        const { accountDataItem } = (isSizeRender) 
            ? this._sizingRowInfo 
            : rowInfo;
        
        const columnInfo = this.state.columnInfos[columnIndex];
        switch (columnInfo.key) {
        case 'type' :
            return CE.renderAccountTypeDisplay(Object.assign({}, args, {
                columnInfo: columnInfo,
                value: accountDataItem.type
            }));

        case 'name' :
            return CE.renderNameDisplay(Object.assign({}, args, {
                columnInfo: columnInfo,
                value: accountDataItem.name,
            }));

        case 'description' :
            return CE.renderDescriptionDisplay(Object.assign({}, args, {
                columnInfo: columnInfo,
                value: accountDataItem.description,
            }));

        case 'opening_balance' :
        {
            const currency = C.USD;
            return CE.renderBalanceDisplay(Object.assign({}, args, {
                columnInfo: columnInfo,
                quantityDefinition: currency.getQuantityDefinition(),
                value: accountDataItem.openingBalance,
            }));
        }
        }
    }


    getMenuItems() {
        const { activeRowKey, undoList, redoList } = this.state;

        let removeDisabled = true;
        let upDisabled = true;
        let downDisabled = true;
        const undoDisabled = !undoList.length;
        const redoDisabled = !redoList.length;
        if (activeRowKey) {
            removeDisabled = false;
            upDisabled = this.getMoveNewRootAccountDataItems(-1) === undefined;
            downDisabled = this.getMoveNewRootAccountDataItems(1) === undefined;
        }

        let undoContext = '';
        if (undoList.length) {
            const { contextMsg } = undoList[undoList.length - 1];
            if (contextMsg) {
                undoContext = ' ' + contextMsg;
            }
        }

        let redoContext = '';
        if (redoList.length) {
            const { contextMsg } = redoList[redoList.length - 1];
            if (contextMsg) {
                redoContext = ' ' + contextMsg;
            }
        }

        const menuItems = [
            { id: 'undo',
                label: userMsg('NewFileAccountsEditor-undo') + undoContext,
                onChooseItem: this.onUndo,
                disabled: undoDisabled,
            },
            { id: 'redo',
                label: userMsg('NewFileAccountsEditor-redo') + redoContext,
                onChooseItem: this.onRedo,
                disabled: redoDisabled,
            },
            { id: 'newAccount',
                label: userMsg('NewFileAccountsEditor-add_account'),
                onChooseItem: this.onNewAccount,
            },
            { id: 'removeAccount',
                label: userMsg('NewFileAccountsEditor-remove_account'),
                onChooseItem: this.onRemoveAccount,
                disabled: removeDisabled,
            },
            { id: 'moveAccountUp',
                label: userMsg('NewFileAccountsEditor-move_up'),
                onChooseItem: this.onMoveAccountUp,
                disabled: upDisabled,
            },
            { id: 'moveAccountDown',
                label: userMsg('NewFileAccountsEditor-move_down'),
                onChooseItem: this.onMoveAccountDown,
                disabled: downDisabled,
            },
        ];

        return menuItems;
    }


    render() {
        const { state } = this;


        let activeRowIndex;
        if (this._tableRef.current && this.props.isActive) {
            activeRowIndex = this._tableRef.current.getRowIndexForInfoKey(
                state.activeRowKey);

            if ((state.activeRowKey !== undefined)
             && (activeRowIndex === undefined)) {
                window.requestAnimationFrame(() => {
                    this.setState({
                        rerender: (state.rerender || 0) + 1,
                    });
                });
            }
        }

        return <EditableCollapsibleRowTable
            columns = {state.columns}
            rowInfos = {state.rowInfos}
            onExpandCollapseRow = {this.onExpandCollapseRow}

            onRenderDisplayCell = {this.onRenderDisplayCell}
            onRenderEditCell = {this.onRenderEditCell}

            requestedActiveRowIndex = {activeRowIndex}
            onActiveRowChanged = {this.onActiveRowChanged}

            onStartRowEdit = {this.onStartRowEdit}
            asyncOnSaveRowEdit = {this.asyncOnSaveRowEdit}
            onCancelRowEdit = {this.onCancelRowEdit}

            ref = {this._tableRef}

        /*
            onStartEditRow = {this.onStartEditRow}
            onCancelEditRow = {this.onCancelEditRow}
            asyncOnSaveEditRow = {this.asyncOnSaveEditRow}
        */
        />;
    }
}

NewFileAccountsEditor.propTypes = {
    accountCategory: PropTypes.string.isRequired,
    rootAccountDataItems: PropTypes.array.isRequired,
    onUpdateRootAccountDataItems: PropTypes.func.isRequired,
    onNewAccount: PropTypes.func.isRequired,
    onRemoveAccount: PropTypes.func.isRequired,
    onSetEndEditAsyncCallback: PropTypes.func.isRequired,
    onActiveRowChanged: PropTypes.func,
    onMenuNeedsUpdate: PropTypes.func,
    isActive: PropTypes.bool,
};



