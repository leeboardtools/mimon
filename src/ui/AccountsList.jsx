import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { ActiveRowCollapsibleTable } from '../util-ui/ActiveRowTable';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectDisplay } from '../util-ui/CellSelectEditor';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import { CurrencyDisplay } from '../util-ui/CurrencyDisplay';
import { QuantityDisplay } from '../util-ui/QuantityDisplay';
import deepEqual from 'deep-equal';


let columnInfoDefs;

/**
 * @returns {CollapsibleRowTable~ColInfo[]} Array containing the available
 * columns for accounts lists.
 */
export function getAccountsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';

        columnInfoDefs = {
            name: { key: 'name',
                label: userMsg('AccountsList-name'),
                ariaLabel: 'Name',
                propertyName: 'name',
                className: 'w-50',
                cellClassName: cellClassName,
            },
            type: { key: 'type',
                label: userMsg('AccountsList-type'),
                ariaLabel: 'Account Type',
                propertyName: 'type',
                className: '',
                cellClassName: cellClassName,
            },
            balance: { key: 'balance',
                label: userMsg('AccountsList-balance'),
                ariaLabel: 'Account Balance',
                propertyName: 'balance',
                className: 'text-center',
                cellClassName: cellClassName,
            },
            shares: { key: 'shares',
                label: userMsg('AccountsList-shares'),
                ariaLabel: 'Shares',
                propertyName: 'shares',
                className: 'text-center',
                cellClassName: cellClassName,
            },
        };
    }

    return columnInfoDefs;
}


/**
 * Component for displaying a list of accounts.
 */
export class AccountsList extends React.Component {
    constructor(props) {
        super(props);

        this.onAccountAdd = this.onAccountAdd.bind(this);
        this.onAccountsModify = this.onAccountsModify.bind(this);
        this.onAccountRemove = this.onAccountRemove.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onGetRowExpandCollapseState = this.onGetRowExpandCollapseState.bind(this);
        this.onGetRowAtIndex = this.onGetRowAtIndex.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenRow = this.onOpenRow.bind(this);
        this.onRowToggleCollapse = this.onRowToggleCollapse.bind(this);

        const { accessor } = this.props;

        const columnInfoDefs = getAccountsListColumnInfoDefs();

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
            topLevelAccountIds: [
                accessor.getRootAssetAccountId(),
                accessor.getRootLiabilityAccountId(),
                accessor.getRootIncomeAccountId(),
                accessor.getRootExpenseAccountId(),
                accessor.getRootEquityAccountId(),
            ],
            rowEntries: [],
        };

        this._collapsedRowIds = new Set();

        this._hiddenRootAccountTypes = new Set(props.hiddenRootAccountTypes);
        this._hiddenAccountIds = new Set(props.hiddenAccountIds);


        this.state.rowEntries = this.buildRowEntries().rowEntries;
    }


    onAccountAdd(result) {
        if (this.isAccountIdDisplayed(result.newAccountDataItem.id)) {
            this.updateRowEntries();
        }
    }

    
    onAccountsModify(result) {
        for (let accountDataItem of result.newAccountDataItems) {
            const { id } = accountDataItem;
            for (let rowEntry of this.state.rowEntries) {
                if (rowEntry.accountDataItem.id === id) {
                    this.updateRowEntries();
                    return;
                }
            }
        }
    }


    onAccountRemove(result) {
        const { id } = result.removedAccountDataItem;
        for (let rowEntry of this.state.rowEntries) {
            if (rowEntry.accountDataItem.id === id) {
                this.updateRowEntries();
                return;
            }
        }
    }


    componentDidMount() {
        this.props.accessor.on('accountAdd', this.onAccountAdd);
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.props.accessor.on('accountRemove', this.onAccountRemove);
    }

    componentWillUnmount() {
        this.props.accessor.off('accountAdd', this.onAccountAdd);
        this.props.accessor.off('accountsModify', this.onAccountsModify);
        this.props.accessor.off('accountRemove', this.onAccountRemove);
    }


    componentDidUpdate(prevProps) {
        const { hiddenRootAccountTypes, hiddenAccountIds, 
            showHiddenAccounts } = this.props;
        let rowsNeedUpdating = false;
        if (!deepEqual(prevProps.hiddenRootAccountTypes, hiddenRootAccountTypes)) {
            this._hiddenRootAccountTypes = new Set(hiddenRootAccountTypes);
            rowsNeedUpdating = true;
        }

        if (!deepEqual(prevProps.hiddenAccountIds, hiddenAccountIds)) {
            this._hiddenAccountIds = new Set(hiddenAccountIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenAccounts !== showHiddenAccounts) {
            rowsNeedUpdating = true;
        }

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;
            const result = this.buildRowEntries();
            this.setState({
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
            });

            if (prevActiveRowKey !== result.activeRowKey) {
                const { onSelectAccount } = this.props;
                if (onSelectAccount) {
                    const accountDataItem = (result.activeRowEntry)
                        ? result.activeRowEntry.accountDataItem
                        : undefined;
                    onSelectAccount(accountDataItem ? accountDataItem.id : undefined);
                }
            }
        }
    }


    // Setting up the row entries:
    // Want to be able to filter what gets displayed.
    // Support summary rows for say account balances.
    buildRowEntries() {
        const rowEntries = [];
        const { topLevelAccountIds } = this.state;

        topLevelAccountIds.forEach((id) => {
            this.addAccountIdToRowEntries(rowEntries, id, 0, 0);
        });

        let { activeRowKey } = this.state;
        let activeRowEntry;
        if (activeRowKey) {
            let currentIndex;
            for (currentIndex = 0; currentIndex < rowEntries.length; ++currentIndex) {
                if (rowEntries[currentIndex].key === activeRowKey) {
                    activeRowEntry = rowEntries[currentIndex];
                    break;
                }
            }
            if (currentIndex >= rowEntries.length) {
                // The active row is no longer visible...
                activeRowKey = undefined;
            }
        }

        return {
            rowEntries: rowEntries,
            activeRowKey: activeRowKey,
            activeRowEntry: activeRowEntry,
        };
    }


    addAccountIdToRowEntries(rowEntries, accountId, parentAccountId, depth) {
        if (!this.isAccountIdDisplayed(accountId)) {
            return;
        }

        const { accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const { childAccountIds } = accountDataItem;

        const key = accountDataItem.id.toString();
        const isCollapsed = this._collapsedRowIds.has(key);
        const index = rowEntries.length;

        rowEntries.push({
            key: key,
            index: index,
            expandCollapseState: (childAccountIds && childAccountIds.length)
                ? ((isCollapsed) ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountDataItem: accountDataItem,
            depth: depth,
        });

        if (childAccountIds && !isCollapsed) {
            childAccountIds.forEach((childId) => {
                this.addAccountIdToRowEntries(rowEntries, childId, accountId, depth + 1);
            });
        }

    }


    isAccountIdDisplayed(accountId) {
        const { showHiddenAccounts } = this.props;
        if (!showHiddenAccounts && this._hiddenAccountIds.has(accountId)) {
            return false;
        }
        
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        if (!accountDataItem) {
            return false;
        }

        if (this._hiddenRootAccountTypes.has(accountDataItem.type)) {
            return false;
        }

        return true;
    }


    updateRowEntries(activeRowKey) {
        this.setState((state) => {
            const rowEntries = this.buildRowEntries().rowEntries;
            return {
                rowEntries: rowEntries,
                activeRowKey: activeRowKey || state.activeRowKey,
            };
        });
    }


    onGetRowExpandCollapseState(rowEntry) {
        return rowEntry.expandCollapseState;
    }

    onGetRowAtIndex(index) {
        return this.state.rowEntries[index];
    }


    onRowToggleCollapse(rowEntry, newExpandCollapseState) {
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


    onActivateRow(rowEntry) {
        this.setState({
            activeRowKey: rowEntry.key,
        });

        const { onSelectAccount } = this.props;
        if (onSelectAccount) {
            const { accountDataItem } = rowEntry;
            onSelectAccount(accountDataItem ? accountDataItem.id : undefined);
        }
    }


    onOpenRow(rowEntry) {
        const { onChooseAccount } = this.props;
        const { accountDataItem } = rowEntry;
        if (onChooseAccount && accountDataItem) {
            onChooseAccount(accountDataItem.id);
        }
    }


    renderTextDisplay(columnInfo, value) {
        const { ariaLabel, inputClassExtras } = columnInfo;
        
        return <CellTextDisplay
            ariaLabel={ariaLabel}
            value={value}
            inputClassExtras={inputClassExtras}
        />;
    }


    renderAccountTypeDisplay(type) {
        const accountType = A.AccountType[type];
        return <CellSelectDisplay
            ariaLabel="Account Type"
            selectedValue={accountType.description}
        />;
    }


    renderBalanceDisplay(columnInfo, accountDataItem) {
        const { accessor } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
            accountDataItem.pricedItemId
        );

        if (pricedItemDataItem 
         && (pricedItemDataItem.type === PI.PricedItemType.CURRENCY.name)) {
            const accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id);
            if (accountState && accountState.quantityBaseValue) {
                return <CurrencyDisplay
                    quantityBaseValue={accountState.quantityBaseValue}
                    currency={pricedItemDataItem.currency}
                />;
            }
        }
    }


    renderSharesDisplay(columnInfo, accountDataItem) {
        const { accessor } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
            accountDataItem.pricedItemId
        );
        
        if (pricedItemDataItem 
         && ((pricedItemDataItem.type === PI.PricedItemType.SECURITY.name)
          || (pricedItemDataItem.type === PI.PricedItemType.MUTUAL_FUND.name))) {
            const accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id);
            if (accountState && accountState.quantityBaseValue) {
                return <QuantityDisplay
                    quantityBaseValue={accountState.quantityBaseValue}
                    quantityDefinition={pricedItemDataItem.quantityDefinition}
                />;
            }
        }
    }

    
    onRenderCell(cellInfo, cellSettings) {
        const { rowEntry } = cellInfo;
        if (!cellInfo.columnIndex) {
            cellSettings.indent = rowEntry.depth;
        }

        const { accountDataItem } = rowEntry;
        const { columnInfo } = cellInfo;
        switch (columnInfo.key) {
        case 'name' :
            if (this.props.showAccountIds) {
                return this.renderTextDisplay(columnInfo, 
                    accountDataItem.name + ' ' + accountDataItem.id);
            }
            return this.renderTextDisplay(columnInfo, accountDataItem.name);
        
        case 'type' :
            return this.renderAccountTypeDisplay(accountDataItem.type);
        
        case 'balance' :
            return this.renderBalanceDisplay(columnInfo, accountDataItem);
        
        case 'shares' :
            return this.renderSharesDisplay(columnInfo, accountDataItem);
        }
    }


    render() {
        const { state } = this;
        return <div>
            <ActiveRowCollapsibleTable
                columnInfos={state.columnInfos}
                rowEntries={state.rowEntries}
                activeRowKey={state.activeRowKey}
                onRenderCell={this.onRenderCell}
                onGetRowExpandCollapseState={this.onGetRowExpandCollapseState}
                onGetRowAtIndex={this.onGetRowAtIndex}
                onActivateRow={this.onActivateRow}
                onOpenRow={this.onOpenRow}
                onRowToggleCollapse={this.onRowToggleCollapse}
                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}
            />
            {this.props.children}
        </div>;
    }
}

/**
 * @callback AccountsList~onSelectAccount
 * @param {number}  accountId
 */

/**
 * @callback AccountsList~onChooseAccount
 * @param {number}  accountId
 */


/**
 * @typedef {object} AccountsList~propTypes
 * @property {EngineAccessor}   accessor
 * @property {AccountsList~onSelectAccount} [onSelectAccount]   Called when an account
 * is selected.
 * @property {AccountsList~onChooseAccount} [onChooseAccount]   Called when an account
 * is 'chosen', either double-clicked or enter is pressed.
 */
AccountsList.propTypes = {
    accessor: PropTypes.object.isRequired,
    onSelectAccount: PropTypes.func,
    onChooseAccount: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.string),
    hiddenRootAccountTypes: PropTypes.arrayOf(PropTypes.string),
    hiddenAccountIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenAccounts: PropTypes.bool,
    showAccountIds: PropTypes.bool,
    children: PropTypes.any,
};
