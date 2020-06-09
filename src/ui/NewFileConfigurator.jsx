import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { TabbedPages } from '../util-ui/TabbedPages';
import * as A from '../engine/Accounts';
import { PricedItemType } from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTableOld';
import { RowEditCollapsibleTable } from '../util-ui/RowEditTable';
import * as C from '../util/Currency';
import { CellTextEditor, CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectEditor, CellSelectDisplay } from '../util-ui/CellSelectEditor';
import { NewFileAccountsEditor,
    cloneAccountDataItems, findAccountDataItemWithId, } from './NewFileAccountsEditor';
import { Dropdown } from '../util-ui/Dropdown';



// OK
function getDescendantIds(accountDataItem, ids) {
    ids = ids || new Set();
    const { childAccounts } = accountDataItem;
    if (childAccounts) {
        childAccounts.forEach((account) => {
            ids.add(account.id);
            getDescendantIds(account, ids);
        });
    }
    return ids;
}

// OK
function removeAccountDataItemFromParent(accountDataItems, parentId, id) {
    const parent = findAccountDataItemWithId(accountDataItems, parentId);
    if (parent) {
        accountDataItems = parent.childAccounts;
    }
    for (let i = 0; i < accountDataItems.length; ++i) {
        if (accountDataItems[i].id === id) {
            accountDataItems.splice(i, 1);
            return true;
        }
    }
}

// OK
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
class NewFileAccountsEditorOld extends React.Component {
    constructor(props) {
        super(props);

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);
        this.onMoveAccountUp = this.onMoveAccountUp.bind(this);
        this.onMoveAccountDown = this.onMoveAccountDown.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);

        this.onGetRowAtIndex = this.onGetRowAtIndex.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);

        this.onStartEditRow = this.onStartEditRow.bind(this);
        this.onCancelEditRow = this.onCancelEditRow.bind(this);
        this.asyncOnSaveEditRow = this.asyncOnSaveEditRow.bind(this);
        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onTextEditorChange = this.onTextEditorChange.bind(this);
        this.onAccountTypeChange = this.onAccountTypeChange.bind(this);

        this.onGetRowExpandCollapseState = this.onGetRowExpandCollapseState.bind(this);
        this.onRowToggleCollapse = this.onRowToggleCollapse.bind(this);


        const cellClassName = 'm-0';
        this._columnInfos = [
            { key: 'name',
                label: userMsg('NewFileAccountsEditor-account_name'),
                ariaLabel: 'Name',
                propertyName: 'name',
                className: 'w-30',
                cellClassName: cellClassName,
            },
            { key: 'type',
                label: userMsg('NewFileAccountsEditor-type'),
                ariaLabel: 'Account Type',
                propertyName: 'type',
                className: 'w-15',
                cellClassName: cellClassName,
            },
            { key: 'description',
                label: userMsg('NewFileAccountsEditor-description'),
                ariaLabel: 'Description',
                propertyName: 'description',
                className: 'w-40',
                cellClassName: cellClassName,
            },
            { key: 'opening_balance',
                label: userMsg('NewFileAccountsEditor-opening_balance'),
                ariaLabel: 'Opening Balance',
                propertyName: 'openingBalance',
                className: 'w-15 text-right',
                inputClassExtras: 'text-right',
                cellClassName: cellClassName,
            },
        ];

        this._collapsedRowIds = new Set();

        this.state = {
            rowEntries: this.buildRowEntries(),
            undoList: [],
            redoList: [],
        };

        if (this.state.rowEntries.length) {
            this.state.activeRowKey = this.state.rowEntries[0].key;
        }
    }


    buildRowEntries() {
        const rowEntries = [];
        const { rootAccountDataItems } = this.props;
        
        const parentType = A.AccountCategory[this.props.accountCategory]
            .rootAccountType.name;
        rootAccountDataItems.forEach((accountDataItem) => {
            this.addToRowEntries(rowEntries, accountDataItem, parentType, 
                undefined, undefined, 0);
        });

        return rowEntries;
    }
    

    addToRowEntries(rowEntries, accountDataItem, 
        parentType, parentIndex, parentId, depth) {

        const { childAccounts } = accountDataItem;

        const key = accountDataItem.id.toString();
        const isCollapsed = this._collapsedRowIds.has(key);
        const index = rowEntries.length;

        rowEntries.push({
            key: key,
            index: index,
            parentType: parentType,
            parentIndex: parentIndex,
            parentId: parentId,
            expandCollapseState: (childAccounts && childAccounts.length)
                ? ((isCollapsed) ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountDataItem: accountDataItem,
            depth: depth,
        });

        if (childAccounts && !isCollapsed) {
            childAccounts.forEach((childDataItem) => {
                this.addToRowEntries(rowEntries, childDataItem, 
                    accountDataItem.type, index, accountDataItem.id, depth + 1);
            });
        }
    }


    updateRowEntries(activeRowKey) {
        this.setState((state) => {
            const rowEntries = this.buildRowEntries();
            return {
                rowEntries: rowEntries,
                activeRowKey: activeRowKey || state.activeRowKey,
            };
        });
    }


    getActiveRowEntry() {
        const { activeRowKey, rowEntries } = this.state;
        if (activeRowKey) {
            for (let i = rowEntries.length - 1; i >= 0; --i) {
                if (rowEntries[i].key === activeRowKey) {
                    return rowEntries[i];
                }
            }
        }
    }


    componentDidUpdate(prevProps, prevState) {
        if (!deepEqual(prevProps.rootAccountDataItems, this.props.rootAccountDataItems)) {
            this.updateRowEntries();
        }
    }


    onNewAccount() {
        this.actAfterEndEdit(() => {
            // If the active row is closed or the active row's account type
            // does not support children...
            //      - Add the new data item to the parent.
            // Otherwise
            //      - Add as a child of the active row.            
            let parentId;
            let afterSiblingId;

            const activeRowEntry = this.getActiveRowEntry();
            if (activeRowEntry) {
                // If the active row's type doesn't support children then it will never be
                // expanded.
                if (activeRowEntry.expandCollapseState === ExpandCollapseState.EXPANDED) {
                    parentId = activeRowEntry.accountDataItem.id;
                }
                else {
                    // parentId may be 0/undefined...
                    parentId = activeRowEntry.parentId;
                    afterSiblingId = activeRowEntry.accountDataItem.id;
                }
            }

            this.saveForUndo();
            const activeRowKey = this.props.onNewAccount(this.props.accountCategory, 
                parentId, afterSiblingId);

            this.setState({
                activeRowKey: activeRowKey,
            });
        });
    }


    onRemoveAccount() {
        this.actAfterEndEdit(() => {
            const activeRowEntry = this.getActiveRowEntry();
            if (activeRowEntry) {
                this.saveForUndo();

                const { rowEntries } = this.state;
                let nextActiveRowEntry;
                if (activeRowEntry.parentIndex === undefined) {
                    // Just look for the next top level entry.
                    for (let i = activeRowEntry.index + 1; i < rowEntries.length; ++i) {
                        if (rowEntries[i].parentIndex === undefined) {
                            nextActiveRowEntry = rowEntries[i];
                            break;
                        }
                    }
                }
                else {
                    // This is a little tricky, we need to find the next row entry that's
                    // at or above the active row entry's level.
                    const descendantIds 
                        = getDescendantIds(activeRowEntry.accountDataItem);
                    for (let i = activeRowEntry.index + 1; i < rowEntries.length; ++i) {
                        const id = rowEntries[i].accountDataItem.id;
                        if (!descendantIds.has(id)) {
                            nextActiveRowEntry = rowEntries[i];
                            break;
                        }
                    }

                }

                if (!nextActiveRowEntry) {
                    if (activeRowEntry.index > 0) {
                        nextActiveRowEntry = rowEntries[activeRowEntry.index - 1];
                    }
                }

                const nextActiveRowKey = (nextActiveRowEntry) 
                    ? nextActiveRowEntry.key 
                    : undefined;

                const newRootAccountDataItems 
                    = cloneAccountDataItems(this.props.rootAccountDataItems);
                removeAccountDataItemWithId(newRootAccountDataItems, 
                    activeRowEntry.accountDataItem.id);
                this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
                    newRootAccountDataItems);
        
                this.setState({
                    activeRowKey: nextActiveRowKey,
                });
            }
        });
    }

    getMoveNewRootAccountDataItems(delta) {
        const activeRowEntry = this.getActiveRowEntry();
        if (activeRowEntry) {
            const { rowEntries } = this.state;

            const newRootAccountDataItems 
                = cloneAccountDataItems(this.props.rootAccountDataItems);
            
            removeAccountDataItemFromParent(newRootAccountDataItems,
                activeRowEntry.parentId,
                activeRowEntry.accountDataItem.id);
            
            let afterRowEntry;
            if (delta > 0) {
                // Skip over any kids...
                const descendantIds 
                    = getDescendantIds(activeRowEntry.accountDataItem);
                for (let i = activeRowEntry.index + 1; i < rowEntries.length; ++i) {
                    const rowEntry = rowEntries[i];
                    if (!descendantIds.has(rowEntry.accountDataItem.id)) {
                        afterRowEntry = rowEntry;
                        break;
                    }
                }
                if (!afterRowEntry) {
                    return;
                }
            }
            else {
                afterRowEntry = rowEntries[activeRowEntry.index - 2];
            }

            // We want the same parent as this row entry, and want to appear
            // after the row entry in its parent list.
            if (afterRowEntry) {
                const activeType = A.AccountType[activeRowEntry.accountDataItem.type];
                if (afterRowEntry.expandCollapseState === ExpandCollapseState.EXPANDED) {
                    // Add as the first child.
                    const account = findAccountDataItemWithId(newRootAccountDataItems, 
                        afterRowEntry.accountDataItem.id);
                    const parentType = A.AccountType[account.type];
                    if (parentType.allowedChildTypes.indexOf(activeType) < 0) {
                        return;
                    }

                    account.childAccounts.splice(0, 0, activeRowEntry.accountDataItem);
                }
                else {
                    // Otherwise, add it after the account in the parent's child list.
                    const parent = findAccountDataItemWithId(newRootAccountDataItems,
                        afterRowEntry.parentId);
                    if (parent) {
                        // Make sure we're compatible with the parent.
                        const parentType = A.AccountType[parent.type];
                        if (parentType.allowedChildTypes.indexOf(activeType) < 0) {
                            return;
                        }
                    }
                    const accountDataItems = (parent)
                        ? parent.childAccounts
                        : newRootAccountDataItems;
                    const nextId = afterRowEntry.accountDataItem.id;
                    for (let i = 0; i < accountDataItems.length; ++i) {
                        if (accountDataItems[i].id === nextId) {
                            accountDataItems.splice(i + 1, 0, 
                                activeRowEntry.accountDataItem);
                            break;
                        }
                    }
                }
            }
            else {
                newRootAccountDataItems.splice(0, 0, activeRowEntry.accountDataItem);
            }

            return newRootAccountDataItems;
        }
    }


    moveActiveRowEntry(delta) {
        const newRootAccountDataItems = this.getMoveNewRootAccountDataItems(delta);
        if (newRootAccountDataItems) {
            this.saveForUndo();

            this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
                newRootAccountDataItems);
        }
    }

    onMoveAccountUp() {
        this.actAfterEndEdit(() => {
            this.moveActiveRowEntry(-1);
        });
    }


    onMoveAccountDown() {
        this.actAfterEndEdit(() => {
            this.moveActiveRowEntry(1);
        });
    }


    saveForUndo() {
        const undoList = Array.from(this.state.undoList);
        const save = {
            rootAccountDataItems:
                cloneAccountDataItems(this.props.rootAccountDataItems),
            activeRowKey: this.state.activeRowKey,
        };
        undoList.push(save);

        this.setState({
            undoList: undoList,
        });
    }


    doUndoRedo(actList, saveList) {
        if (actList.length) {
            const save = {
                rootAccountDataItems:
                    cloneAccountDataItems(this.props.rootAccountDataItems),
                activeRowKey: this.state.activeRowKey,
            };

            const act = actList[actList.length - 1];
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
                    activeRowKey: result.activeRowKey,
                    undoList: result.lists[0],
                    redoList: result.lists[1],
                });
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
                }
            }
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


    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }

    onActivateRow(rowEntry) {
        if (rowEntry.key !== this.state.activeRowKey) {
            this.actAfterEndEdit(() => {
                this.setState({
                    activeRowKey: rowEntry.key,
                });
            });
        }
    }


    onRowToggleCollapse(rowEntry) {
        switch (rowEntry.expandCollapseState) {
        case ExpandCollapseState.COLLAPSED :
            this._collapsedRowIds.delete(rowEntry.key);
            break;

        case ExpandCollapseState.EXPANDED :
            this._collapsedRowIds.add(rowEntry.key);
            break;
        
        default :
            return;
        }

        // This has the side effect of making rowEntry the active row entry...
        this.updateRowEntries(rowEntry.key);
    }


    onGetRowExpandCollapseState(rowEntry) {
        return rowEntry.expandCollapseState;
    }


    onStartEditRow({ rowEntry, cellEditBuffers, rowEditBuffer, asyncEndEditRow }) {
        for (let i = 0; i < this._columnInfos.length; ++i) {
            cellEditBuffers.push(i);
        }

        const { accountDataItem } = rowEntry;
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


    onCancelEditRow({ rowEntry, cellEditBuffers, rowEditBuffers }) {
        this.props.onSetEndEditAsyncCallback(undefined);
        this.setState({
            asyncEndEditRow: undefined,
            errorMsgs: {}
        });
    }


    setErrorMsg(propertyName, msg) {
        this.setState({
            errorMsgs: {
                [propertyName]: msg,
            }
        });
        return msg;
    }

 
    async asyncOnSaveEditRow({ rowEntry, cellEditBuffers, rowEditBuffer }) {
        const currency = C.USD;
        const newRootAccountDataItems 
            = cloneAccountDataItems(this.props.rootAccountDataItems);
        const accountDataItem = findAccountDataItemWithId(
            newRootAccountDataItems, rowEntry.key);
        
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

        this.saveForUndo();
        this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
            newRootAccountDataItems);
        
        this.props.onSetEndEditAsyncCallback(undefined);

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

    renderTextDisplay(columnInfo, value) {
        const { ariaLabel, inputClassExtras } = columnInfo;
        
        return <CellTextDisplay
            ariaLabel = {ariaLabel}
            value = {value}
            inputClassExtras = {inputClassExtras}
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
        const { rowEntry } = cellInfo;
        const parentType = A.AccountType[rowEntry.parentType];

        // If the account has kids, we need to restrict the allowed types.
        const { childAccounts } = rowEntry.accountDataItem;
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

    renderAccountTypeDisplay(type) {
        const accountType = A.AccountType[type];
        return <CellSelectDisplay
            ariaLabel = "Account Type"
            selectedValue = {accountType.description}
        />;
    }


    onRenderEditCell({cellInfo, cellSettings, renderArgs}) {
        const { rowEntry } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowEntry.depth;
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


    onRenderDisplayCell({cellInfo, cellSettings}) {
        const { rowEntry } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowEntry.depth;
        }

        const { accountDataItem } = rowEntry;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'type' :
            return this.renderAccountTypeDisplay(accountDataItem.type);

        case 'name' :
            return this.renderTextDisplay(columnInfo, accountDataItem.name);

        case 'description' :
            return this.renderTextDisplay(columnInfo, accountDataItem.description);

        case 'opening_balance' :
            return this.renderTextDisplay(columnInfo, accountDataItem.openingBalance);
        }
    }


    renderControlBar() {
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

        const divClassName = 'ml-2';
        const btnClassName = 'btn btn-outline-secondary btn-sm fixed-width-button';
        return <div className = "row pl-2 pr-2 pb-2">
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "New Account" 
                    onClick = {() => this.onNewAccount()}>
                    {userMsg('NewFileAccountsEditor-add_account')}
                </button>
            </div>
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "Remove Account" 
                    disabled = {removeDisabled}
                    onClick = {() => this.onRemoveAccount()}>
                    {userMsg('NewFileAccountsEditor-remove_account')}
                </button>
            </div>
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "Move Account Up" 
                    disabled = {upDisabled}
                    onClick = {() => this.onMoveAccountUp()}>
                    {userMsg('NewFileAccountsEditor-move_up')}
                </button>
            </div>
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "Move Account Down" 
                    disabled = {downDisabled}
                    onClick = {() => this.onMoveAccountDown()}>
                    {userMsg('NewFileAccountsEditor-move_down')}
                </button>
            </div>
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "Undo" 
                    disabled = {undoDisabled}
                    onClick = {() => this.onUndo()}>
                    {userMsg('NewFileAccountsEditor-undo')}
                </button>
            </div>
            <div className = {divClassName}>
                <button type = "button" 
                    className = {btnClassName}
                    aria-label = "Redo" 
                    disabled = {redoDisabled}
                    onClick = {() => this.onRedo()}>
                    {userMsg('NewFileAccountsEditor-redo')}
                </button>
            </div>
        </div>;
    }


    renderTable() {
        return <RowEditCollapsibleTable
            columnInfos = {this._columnInfos}
            rowEntries = {this.state.rowEntries}
            activeRowKey = {this.state.activeRowKey}
            onRenderDisplayCell = {this.onRenderDisplayCell}
            onRenderEditCell = {this.onRenderEditCell}
            onStartEditRow = {this.onStartEditRow}
            onCancelEditRow = {this.onCancelEditRow}
            asyncOnSaveEditRow = {this.asyncOnSaveEditRow}
            onGetRowExpandCollapseState = {this.onGetRowExpandCollapseState}
            onRowToggleCollapse = {this.onRowToggleCollapse}
            onGetRowAtIndex = {this.onGetRowAtIndex}
            onActivateRow = {this.onActivateRow}
        />;
    }


    render() {
        const controlBar = this.renderControlBar();
        const table = this.renderTable();

        return <div className = "container-fluid">
            <div className = "row pl-0 pr-0">
                {controlBar}
            </div>
            <div className = "row mb-auto">
                {table}
            </div>
        </div>;
    }
}
NewFileAccountsEditorOld.propTypes = {
    accountCategory: PropTypes.string.isRequired,
    rootAccountDataItems: PropTypes.array.isRequired,
    onUpdateRootAccountDataItems: PropTypes.func.isRequired,
    onNewAccount: PropTypes.func.isRequired,
    onRemoveAccount: PropTypes.func.isRequired,
    onSetEndEditAsyncCallback: PropTypes.func.isRequired,
};



/**
 * Component for configuring a new file.
 */
export class NewFileConfigurator extends React.Component {
    constructor(props) {
        super(props);

        this._tabEntries = [
            { tabId: 'assets',
                title: userMsg('NewFileConfigurator-assets_tab'),
                accountCategory: A.AccountCategory.ASSET.name,
                pageRef: React.createRef(),
            },
            { tabId: 'liabilities',
                title: userMsg('NewFileConfigurator-liabilities_tab'),
                accountCategory: A.AccountCategory.LIABILITY.name,
                pageRef: React.createRef(),
            },
            { tabId: 'income',
                title: userMsg('NewFileConfigurator-income_tab'),
                accountCategory: A.AccountCategory.INCOME.name,
                pageRef: React.createRef(),
            },
            { tabId: 'expenses',
                title: userMsg('NewFileConfigurator-expense_tab'),
                accountCategory: A.AccountCategory.EXPENSE.name,
                pageRef: React.createRef(),
            },
        ];

        this.state = {
            activeTabId: this._tabEntries[0].tabId,
        };

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);
        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);
        this.onMenuNeedsUpdate = this.onMenuNeedsUpdate.bind(this);

        this.onUpdateRootAccountDataItems = this.onUpdateRootAccountDataItems.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onPostRenderTabs = this.onPostRenderTabs.bind(this);
    }


    onNewAccount(accountCategory, parentAccountId, afterSiblingAccountId) {
        const newFileContents = Object.assign({}, this.props.newFileContents);        
        const newId = (newFileContents.nextAccountId++).toString();

        const rootAccountDataItems = cloneAccountDataItems(
            newFileContents.accounts[accountCategory]);
        newFileContents.accounts[accountCategory] = rootAccountDataItems;
    
        let childAccounts = rootAccountDataItems;
        let parentAccountDataItem;
        let newType = A.AccountCategory[accountCategory].rootAccountType.name;

        if (parentAccountId) {
            parentAccountDataItem = findAccountDataItemWithId(
                rootAccountDataItems, parentAccountId);
            if (parentAccountDataItem) {
                newType = parentAccountDataItem.type;
                if (parentAccountDataItem.childAccounts) {
                    childAccounts = parentAccountDataItem.childAccounts;
                }
            }
        }
        
        const newAccountDataItem = {
            id: newId,
            name: userMsg('NewFileAccountsEditor-new_account_name'),
            type: newType,
        };

        if (afterSiblingAccountId) {
            for (let i = 0; i < childAccounts.length; ++i) {
                if (childAccounts[i].id === afterSiblingAccountId) {
                    newAccountDataItem.type = childAccounts[i].type;
                    childAccounts.splice(i + 1, 0, newAccountDataItem);
                    break;
                }
            }
        }
        else {
            childAccounts.splice(0, 0, newAccountDataItem);
        }

        this.props.onUpdateFileContents(newFileContents);

        return newId;
    }


    onRemoveAccount(accountId) {

    }


    onActiveRowChanged(activeRowKey) {
        this.setState({
            activeRowKey: activeRowKey,
        });
    }


    onMenuNeedsUpdate() {
        this.setState((state) => {
            return {
                updateCount: (state.updateCount || 0) + 1,
            };
        });
    }


    onUpdateRootAccountDataItems(accountCategory, rootAccountDataItems) {
        const newFileContents = Object.assign({}, this.props.newFileContents);
        newFileContents.accounts[accountCategory] = rootAccountDataItems;

        this.props.onUpdateFileContents(newFileContents);
    }


    onRenderPage(tabEntry, isActive) {
        if (tabEntry.accountCategory) {
            const { accounts } = this.props.newFileContents;
            if (!accounts) {
                return;
            }

            const rootAccountDataItems = accounts[tabEntry.accountCategory];
            if (!rootAccountDataItems || !rootAccountDataItems.length) {
                return;
            }

            let useOld = false;
            //useOld = true;
            if (useOld) {
                return <NewFileAccountsEditorOld
                    accountCategory = {tabEntry.accountCategory}
                    rootAccountDataItems = {rootAccountDataItems}
                    onUpdateRootAccountDataItems = {this.onUpdateRootAccountDataItems}
                    onNewAccount = {this.onNewAccount}
                    onRemoveAccount = {this.onRemoveAccount}
                    onSetEndEditAsyncCallback = {this.props.onSetEndEditAsyncCallback}
                />;
            }

            return <NewFileAccountsEditor
                accountCategory = {tabEntry.accountCategory}
                rootAccountDataItems = {rootAccountDataItems}
                onUpdateRootAccountDataItems = {this.onUpdateRootAccountDataItems}
                onNewAccount = {this.onNewAccount}
                onRemoveAccount = {this.onRemoveAccount}
                onSetEndEditAsyncCallback = {this.props.onSetEndEditAsyncCallback}
                onActiveRowChanged = {this.onActiveRowChanged}
                onMenuNeedsUpdate = {this.onMenuNeedsUpdate}
                isActive = {tabEntry.tabId === this.state.activeTabId}
                
                ref = {tabEntry.pageRef}
            />;
        }
        return <div>{tabEntry.title}</div>;
    }


    getActiveTabEntry() {
        const { activeTabId } = this.state;
        for (let i = 0; i < this._tabEntries.length; ++i) {
            if (this._tabEntries[i].tabId === activeTabId) {
                return this._tabEntries[i];
            }
        }
    }
    

    renderMenu() {
        const activeTabEntry = this.getActiveTabEntry();

        let undoItem;
        let redoItem;
        let mainMenuItems = [];
        if (activeTabEntry && activeTabEntry.pageRef) {
            const pageImpl = activeTabEntry.pageRef.current;
            if (pageImpl && pageImpl.getMenuItems) {
                const menuItems = pageImpl.getMenuItems();
                if (menuItems) {
                    for (let i = 0; i < menuItems.length; ++i) {
                        const menuItem = menuItems[i];
                        switch (menuItem.id) {
                        case 'undo' :
                            undoItem = menuItem;
                            break;
                        
                        case 'redo' :
                            redoItem = menuItem;
                            break;
                        
                        default :
                            mainMenuItems.push(menuItem);
                        }
                    }
                }
            }
        }

        // Have the undo/redo buttons...
        const baseClassName = 'nav nav-link pl-2 pr-2';

        let undoClassName = baseClassName + ' undo-tooltip';
        let undoLabel;
        let undoOnClick;
        if (undoItem) {
            undoLabel = undoItem.label;
            undoOnClick = undoItem.onChooseItem;
            if (undoItem.disabled) {
                undoClassName += ' disabled';
            }
        }
        else {
            undoClassName += ' disabled';
        }

        let undo = <a
            className = {undoClassName}
            onClick = {undoOnClick}
            aria-label = "Undo"
            href = "#"
            role = "button"
        >
            <i className = "material-icons">undo</i>
            <span className = "undo-tooltiptext">{undoLabel}</span>
        </a>;


        let redoClassName = baseClassName + ' undo-tooltip';
        let redoLabel;
        let redoOnClick;
        if (redoItem) {
            redoLabel = redoItem.label;
            redoOnClick = redoItem.onChooseItem;
            if (redoItem.disabled) {
                redoClassName += ' disabled';
            }
        }
        else {
            redoClassName += ' disabled';
        }
        const redo = <a
            className = {redoClassName}
            onClick = {redoOnClick}
            aria-label = "Redo"
            href = "#"
            role = "button"
        >
            <i className = "material-icons">redo</i>
            <span className = "undo-tooltiptext">{redoLabel}</span>
        </a>;


        const mainMenuTitle = <i className = "material-icons">menu</i>;

        const mainMenu = <Dropdown
            title = {mainMenuTitle}
            items = {mainMenuItems}
            topClassExtras = "mt-2 ml-2"
            noArrow
            menuClassExtras = "dropdown-menu-right"
        />;

        return <div className = "btn-group btn-group-sm" role = "group">
            {undo}
            {redo}
            {mainMenu}
        </div>;
    }


    onPostRenderTabs(tabs) {
        const menu = this.renderMenu();
        return <div className = "d-flex">
            <div className = "flex-grow-1">
                {tabs}
            </div>
            {menu}
        </div>;
    }


    onActivateTab(tabId) {
        this.setState({
            activeTabId: tabId,
        });
    }


    render() {
        const tabbedPages = <TabbedPages
            tabEntries = {this._tabEntries}
            activeTabId = {this.state.activeTabId}
            onRenderPage = {this.onRenderPage}
            onActivateTab = {this.onActivateTab}
            onPostRenderTabs = {this.onPostRenderTabs}
        />;
        return <div className="h-100">
            <h4 className="pageTitle pb-3 border-bottom">
                {userMsg('NewFileAccountsEditor-heading')}
            </h4>
            {tabbedPages}
        </div>;
    }
}

/**
 * @callback NewFileConfigurator~onUpdateFileContents
 * @param {NewFileContents}  newFileContents
 */

/**
 * @callback NewFileConfigurator~asyncEndEditCallback
 * @param {boolean} saveChanges
 * @async
 */

/**
 * @callback NewFileConfigurator~onSetEndEditAsyncCallback
 * @param {NewFileConfigurator~asyncEndEditCallback|undefined}    callback
 */

/**
 * @typedef {object} NewFileConfigurator~propTypes
 * @property {EngineAccessor}   accessor
 * @property {NewFileContents}   newFileContents
 * @property {NewFileConfigurator~onUpdateFileContents} onUpdateFileContents
 * @property {NewFileConfigurator~onSetEndEditAsyncCallback}    onSetEndEditAsyncCallback
 */
NewFileConfigurator.propTypes = {
    accessor: PropTypes.object.isRequired,
    newFileContents: PropTypes.object.isRequired,
    onUpdateFileContents: PropTypes.func.isRequired,
    onSetEndEditAsyncCallback: PropTypes.func.isRequired,
};
