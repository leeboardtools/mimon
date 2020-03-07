import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { TabbedPages } from '../util-ui/TabbedPages';
import * as A from '../engine/Accounts';
import deepEqual from 'deep-equal';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { RowEditCollapsibleTable } from '../util-ui/RowEditTable';
import * as C from '../util/Currency';
import { CellTextEditor, CellTextDisplay } from '../util-ui/CellTextEditor';


function cloneAccountDataItem(accountDataItem) {
    const clone = Object.assign({}, accountDataItem);
    if (accountDataItem.childAccounts && accountDataItem.childAccounts) {
        clone.childAccounts = cloneAccountDataItems(accountDataItem.childAccounts);
    }
    return clone;
}

function cloneAccountDataItems(accountDataItems) {
    const clone = [];
    accountDataItems.forEach((accountDataItem) => {
        clone.push(cloneAccountDataItem(accountDataItem));
    });
    return clone;
}

function findAccountDataItemWithId(accountDataItems, id) {
    for (let i = 0; i < accountDataItems.length; ++i) {
        const accountDataItem = accountDataItems[i];
        if (accountDataItem.id.toString() === id) {
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


class NewFileAccountsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);

        this.onGetRowAtIndex = this.onGetRowAtIndex.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);

        this.onStartEditRow = this.onStartEditRow.bind(this);
        this.onCancelEditRow = this.onCancelEditRow.bind(this);
        this.asyncOnSaveEditRow = this.asyncOnSaveEditRow.bind(this);
        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);

        this.onTextEditorChange = this.onTextEditorChange.bind(this);

        this.onGetRowExpandCollapseState = this.onGetRowExpandCollapseState.bind(this);
        this.onRowToggleCollapse = this.onRowToggleCollapse.bind(this);


        this._columnInfos = [
            { key: 'name',
                label: userMsg('NewFileAccountsEditor-account_name'),
                ariaLabel: 'Name',
                propertyName: 'name',
                className: 'w-30',
            },
            { key: 'type',
                label: userMsg('NewFileAccountsEditor-type'),
                ariaLabel: 'Account Type',
                propertyName: 'type',
                className: 'w-10',
            },
            { key: 'description',
                label: userMsg('NewFileAccountsEditor-description'),
                ariaLabel: 'Description',
                propertyName: 'description',
                className: 'w-40',
            },
            { key: 'opening_balance',
                label: userMsg('NewFileAccountsEditor-opening_balance'),
                ariaLabel: 'Opening Balance',
                propertyName: 'openingBalance',
                className: 'w-20 text-right',
                cellClassName: 'text-right',
            },
        ];

        this._collapsedRowIds = new Set();

        this.state = {
            rowEntries: this.buildRowEntries(),
        };

    }


    buildRowEntries() {
        const rowEntries = [];
        const { rootAccountDataItems } = this.props;
        rootAccountDataItems.forEach((accountDataItem) => {
            this.addToRowEntries(rowEntries, accountDataItem, '', 0);
        });

        return rowEntries;
    }
    

    addToRowEntries(rowEntries, accountDataItem, parentName, depth) {
        const { childAccounts } = accountDataItem;

        const key = accountDataItem.id.toString();
        const isCollapsed = this._collapsedRowIds.has(key);

        rowEntries.push({
            key: key,
            index: rowEntries.length,
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
                    accountDataItem.name, depth + 1);
            });
        }
    }


    componentDidUpdate(prevProps, prevState) {
        if (!deepEqual(prevProps.rootAccountDataItems, this.props.rootAccountDataItems)) {
            this.setState({
                rowEntries: this.buildRowEntries(),
            });
        }
    }


    onNewAccount() {

    }


    onRemoveAccount() {

    }


    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }

    onActivateRow(rowEntry) {
        this.setState({
            activeRowKey: rowEntry.key,
        });
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

        this.setState({
            rowEntries: this.buildRowEntries(),
        });
    }


    onGetRowExpandCollapseState(rowEntry) {
        return rowEntry.expandCollapseState;
    }


    onStartEditRow(rowEntry, cellEditBuffers, rowEditBuffer, asyncEndEditRow) {
        for (let i = 0; i < this._columnInfos.length; ++i) {
            cellEditBuffers.push(i);
        }

        const { accountDataItem } = rowEntry;
        rowEditBuffer.type = accountDataItem.type;
        rowEditBuffer.name = accountDataItem.name;
        rowEditBuffer.description = accountDataItem.description;
        rowEditBuffer.openingBalance = accountDataItem.openingBalance;

        this.setState({
            errorMsgs: {}
        });
    }


    onCancelEditRow(rowEntry, cellEditBuffers, rowEditBuffers) {
    }


    setErrorMsg(propertyName, msg) {
        this.setState({
            errorMsgs: {
                [propertyName]: msg,
            }
        });
        return msg;
    }

    async asyncOnSaveEditRow(rowEntry, cellEditBuffers, rowEditBuffer) {
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

        this.props.onUpdateRootAccountDataItems(this.props.accountCategory, 
            newRootAccountDataItems);
    }


    onTextEditorChange(event, propertyName, renderArgs) {
        const { rowEditBuffer } = renderArgs;
        rowEditBuffer[propertyName] = event.target.value;
        renderArgs.updateRowEditBuffer(rowEditBuffer);
        if (this.state.errorMsgs) {
            this.setState({
                errorMsgs: {}
            });
        }
    }


    renderTextEditor(columnInfo, renderArgs) {
        const { propertyName, ariaLabel, cellClassName } = columnInfo;
        const { rowEditBuffer } = renderArgs;
        const errorMsg = this.state.errorMsgs 
            ? this.state.errorMsgs[propertyName]
            : undefined;
        
        return <CellTextEditor
            ariaLabel={ariaLabel}
            value={rowEditBuffer[propertyName]}
            inputClassExtras={cellClassName}
            errorMsg={errorMsg}
            onChange={(event) => { 
                this.onTextEditorChange(event, propertyName, renderArgs);
            }}
        />;
    }

    renderTextDisplay(columnInfo, value) {
        const { ariaLabel, cellClassName } = columnInfo;
        
        return <CellTextDisplay
            ariaLabel={ariaLabel}
            value={value}
            inputClassExtras={cellClassName}
        />;
    }


    onRenderEditCell(cellInfo, cellSettings, renderArgs) {
        const { rowEntry } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowEntry.depth;
        }

        const { rowEditBuffer } = renderArgs;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'type' :
            return A.AccountType[rowEditBuffer.type].description;

        case 'name' :
            return this.renderTextEditor(columnInfo, renderArgs);

        case 'description' :
            return this.renderTextEditor(columnInfo, renderArgs);

        case 'opening_balance' :
            return this.renderTextEditor(columnInfo, renderArgs);

        }
    }


    onRenderDisplayCell(cellInfo, cellSettings) {
        const { rowEntry } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowEntry.depth;
        }

        const { accountDataItem } = rowEntry;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'type' :
            return A.AccountType[accountDataItem.type].description;

        case 'name' :
            return this.renderTextDisplay(columnInfo, accountDataItem.name);

        case 'description' :
            return this.renderTextDisplay(columnInfo, accountDataItem.description);

        case 'opening_balance' :
            return this.renderTextDisplay(columnInfo, accountDataItem.openingBalance);
        }
    }


    renderControlBar() {
        return <div className="row text-center pl-2 pr-2 pb-2">
            <div className="pl-2">
                <button type="button" 
                    className="btn border rounded-circle btn-new"
                    aria-label="New Account" 
                    onClick={() => this.onNewAccount()}>
                    <span aria-hidden="true">+</span>
                </button>
            </div>
            <div className="pl-2">
                <button type="button" 
                    className="btn border rounded-circle btn-remove"
                    aria-label="Remove Account" 
                    onClick={() => this.onRemoveAccount()}>
                    <span aria-hidden="true">&minus;</span>
                </button>
            </div>
        </div>;
    }


    renderTable() {
        return <RowEditCollapsibleTable
            columnInfos={this._columnInfos}
            rowEntries={this.state.rowEntries}
            activeRowKey={this.state.activeRowKey}
            onRenderDisplayCell={this.onRenderDisplayCell}
            onRenderEditCell={this.onRenderEditCell}
            onStartEditRow={this.onStartEditRow}
            onCancelEditRow={this.onCancelEditRow}
            asyncOnSaveEditRow={this.asyncOnSaveEditRow}
            onGetRowExpandCollapseState={this.onGetRowExpandCollapseState}
            onRowToggleCollapse={this.onRowToggleCollapse}
            onGetRowAtIndex={this.onGetRowAtIndex}
            onActivateRow={this.onActivateRow}
        />;
    }


    render() {
        const controlBar = this.renderControlBar();
        const table = this.renderTable();

        return <div className="container-fluid">
            <div className="row pl-0 pr-0">
                {controlBar}
            </div>
            <div className="row mb-auto">
                {table}
            </div>
        </div>;
    }
}
NewFileAccountsEditor.propTypes = {
    accountCategory: PropTypes.string.isRequired,
    rootAccountDataItems: PropTypes.array.isRequired,
    onUpdateRootAccountDataItems: PropTypes.func.isRequired,
    onNewAccount: PropTypes.func.isRequired,
    onRemoveAccount: PropTypes.func.isRequired,
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
            },
            { tabId: 'liabilities',
                title: userMsg('NewFileConfigurator-liabilities_tab'),
                accountCategory: A.AccountCategory.LIABILITY.name,
            },
            { tabId: 'income',
                title: userMsg('NewFileConfigurator-income_tab'),
                accountCategory: A.AccountCategory.INCOME.name,
            },
            { tabId: 'expenses',
                title: userMsg('NewFileConfigurator-expense_tab'),
                accountCategory: A.AccountCategory.EXPENSE.name,
            },
        ];

        this.state = {
            activeTabId: this._tabEntries[0].tabId,
        };

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);

        this.onUpdateRootAccountDataItems = this.onUpdateRootAccountDataItems.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
    }


    onNewAccount(parentAccountId, belowAccountId) {

    }


    onRemoveAccount(accountId) {

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

            return <NewFileAccountsEditor
                accountCategory={tabEntry.accountCategory}
                rootAccountDataItems={rootAccountDataItems}
                onUpdateRootAccountDataItems={this.onUpdateRootAccountDataItems}
                onNewAccount={this.onNewAccount}
                onRemoveAccount={this.onRemoveAccount}
            />;
        }
        return <div>{tabEntry.title}</div>;
    }


    onActivateTab(tabId) {
        this.setState({
            activeTabId: tabId,
        });
    }
    

    render() {
        return <TabbedPages
            tabEntries={this._tabEntries}
            activeTabId={this.state.activeTabId}
            onRenderPage={this.onRenderPage}
            onActivateTab={this.onActivateTab}
        />;
    }
}

NewFileConfigurator.propTypes = {
    accessor: PropTypes.object.isRequired,
    newFileContents: PropTypes.object.isRequired,
    onUpdateFileContents: PropTypes.func.isRequired,
};
