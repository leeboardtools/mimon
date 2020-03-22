import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { CollapsibleRowTable, ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { CellTextDisplay } from '../util-ui/CellTextEditor';
import { CellSelectDisplay } from '../util-ui/CellSelectEditor';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import { CurrencyDisplay } from '../util-ui/CurrencyDisplay';
import { QuantityDisplay } from '../util-ui/QuantityDisplay';


export class AccountsList extends React.Component {
    constructor(props) {
        super(props);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onGetRowExpandCollapseState = this.onGetRowExpandCollapseState.bind(this);
        this.onRowClick = this.onRowClick.bind(this);
        this.onRowDoubleClick = this.onRowDoubleClick.bind(this);
        this.onRowToggleCollapse = this.onRowToggleCollapse.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        const { accessor } = this.props;

        const cellClassName = 'm-0';
        this.state = {
            columnInfos: [
                { key: 'name',
                    label: userMsg('AccountsList-name'),
                    ariaLabel: 'Name',
                    propertyName: 'name',
                    className: 'w-50',
                    cellClassName: cellClassName,
                },
                { key: 'type',
                    label: userMsg('AccountsList-type'),
                    ariaLabel: 'Account Type',
                    propertyName: 'type',
                    className: '',
                    cellClassName: cellClassName,
                },
                { key: 'balance',
                    label: userMsg('AccountsList-balance'),
                    ariaLabel: 'Account Balance',
                    propertyName: 'balance',
                    className: 'text-center',
                    cellClassName: cellClassName,
                },
                { key: 'shares',
                    label: userMsg('AccountsList-shares'),
                    ariaLabel: 'Shares',
                    propertyName: 'shares',
                    className: 'text-center',
                    cellClassName: cellClassName,
                },
                // Quantity (for lots)
            ],
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

        this.state.rowEntries = this.buildRowEntries();
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

        return rowEntries;
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
        return true;
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


    onGetRowExpandCollapseState(rowEntry) {
        return rowEntry.expandCollapseState;
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


    onRowClick(rowEntry) {

    }


    onRowDoubleClick(rowEntry) {

    }


    onContextMenu(rowEntry) {

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
        return <CollapsibleRowTable
            columnInfos={state.columnInfos}
            rowEntries={state.rowEntries}
            activeRowKey={state.activeRowKey}
            onRenderCell={this.onRenderCell}
            onGetRowExpandCollapseState={this.onGetRowExpandCollapseState}
            onRowClick={this.onRowClick}
            onRowDoubleClick={this.onRowDoubleClick}
            onRowToggleCollapse={this.onRowToggleCollapse}
            onContextMenu={this.onContextMenu}
        />;
    }
}

AccountsList.propTypes = {
    accessor: PropTypes.object.isRequired,
    onChooseAccount: PropTypes.func,
};
