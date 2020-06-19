import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo } from '../util-ui/CollapsibleRowTable';
import { getDecimalDefinition, getQuantityDefinitionName } from '../util/Quantities';
import * as CE from './AccountingCellEditors';
import { columnInfosToColumns,
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';


let columnInfoDefs;

/**
 * @returns {CollapsibleRowTableOld~ColInfo[]} Array containing the available
 * columns for accounts lists.
 */
export function getAccountsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';
        const numericClassName = 'text-right';
        const numericSize = -8; // 12.456,78

        columnInfoDefs = {
            name: { key: 'name',
                header: {
                    label: userMsg('AccountsList-name'),
                    ariaLabel: 'Name',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName + ' w-50',
            },
            type: { key: 'type',
                header: {
                    label: userMsg('AccountsList-type'),
                    ariaLabel: 'Account Type',
                    classExtras: 'text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: cellClassName,
            },
            balance: { key: 'balance',
                header: {
                    label: userMsg('AccountsList-balance'),
                    ariaLabel: 'Account Balance',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
            },
            shares: { key: 'shares',
                header: {
                    label: userMsg('AccountsList-shares'),
                    ariaLabel: 'Shares',
                    classExtras: numericClassName,
                },
                inputClassExtras: numericClassName,
                cellClassName: cellClassName,
                inputSize: numericSize,
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

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

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
            rowInfos: [],
        };

        this._collapsedRowIds = new Set();

        this._hiddenRootAccountTypes = new Set(props.hiddenRootAccountTypes);
        this._hiddenAccountIds = new Set(props.hiddenAccountIds);

        this.state.columns = columnInfosToColumns(this.state);

        this.state = Object.assign(this.state, this.buildRowInfos());
        if (this.state.rowInfos.length) {
            this.state.activeRowKey = this.state.rowInfos[0].key;
        }

        this._sizingRowInfo = {
            accountDataItem: {
                name: userMsg('AccountsList-dummy_name'),

                // TODO:
                // Scan through the account type names to find the longest one...
                type: A.AccountType.REAL_ESTATE.name,

                pricedItemId: accessor.getBaseCurrencyPricedItemId(),

            },
            accountState: {
                quantityBaseValue: 999999999,
            },
            quantityDefinition: getQuantityDefinitionName(
                getDecimalDefinition(4)
            ),
        };
    }


    onAccountAdd(result) {
        if (this.isAccountIdDisplayed(result.newAccountDataItem.id)) {
            this.rebuildRowInfos();
        }
    }

    
    onAccountsModify(result) {
        const { rowInfosByAccountId } = this.state;
        for (let accountDataItem of result.newAccountDataItems) {
            const { id } = accountDataItem;
            const rowInfo = rowInfosByAccountId.get(id);
            if (rowInfo) {
                // TODO:
                // Only do a full update if the parent or children changed,
                // otherwise just need to update the row entry.
                this.rebuildRowInfos();
                return;
            }
        }
    }


    onAccountRemove(result) {
        const { id } = result.removedAccountDataItem;
        const { rowInfosByAccountId } = this.state;
        if (rowInfosByAccountId.has(id)) {
            this.rebuildRowInfos();
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
            let prevActiveRowKey = this.state.activeRowKey;
            
            const result = this.buildRowInfos();
            this.setState(result);

            if (prevActiveRowKey !== result.activeRowKey) {
                const { onSelectAccount } = this.props;
                if (onSelectAccount) {
                    onSelectAccount(result.activeRowKey);
                }
            }
        }
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


    // TODO: Support summary rows...
    buildRowInfos() {
        const rowInfos = [];
        const rowInfosByAccountId = new Map();
        const { topLevelAccountIds } = this.state;

        let { activeRowKey } = this.state;

        topLevelAccountIds.forEach((id) => {
            this.addAccountIdToRowEntries(rowInfos, id, rowInfosByAccountId);
        });

        let newActiveRowKey;
        if (activeRowKey) {
            // Make sure the active row key is still valid.
            if (findRowInfoWithKey(rowInfos, activeRowKey)) {
                newActiveRowKey = activeRowKey;
            }
        }

        return {
            rowInfos: rowInfos,
            rowInfosByAccountId: rowInfosByAccountId,
            activeRowKey: newActiveRowKey,
        };
    }


    addAccountIdToRowEntries(rowInfos, accountId, rowInfosByAccountId) {
        if (!this.isAccountIdDisplayed(accountId)) {
            return;
        }

        const { accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const { childAccountIds } = accountDataItem;

        const key = accountDataItem.id;
        const isCollapsed = this._collapsedRowIds.has(key);
        const index = rowInfos.length;

        const rowInfo = {
            key: key,
            index: index,
            expandCollapseState: (childAccountIds && childAccountIds.length)
                ? ((isCollapsed) 
                    ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountDataItem: accountDataItem,
        };
        rowInfos.push(rowInfo);
        rowInfosByAccountId.set(accountId, rowInfo);

        if (childAccountIds) {
            rowInfo.childRowInfos = [];
            childAccountIds.forEach((childId) => {
                this.addAccountIdToRowEntries(rowInfo.childRowInfos, 
                    childId, rowInfosByAccountId);
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


    rebuildRowInfos() {
        this.setState((state) => {
            const result = this.buildRowInfos();
            return result;
        });
    }


    onSetColumnWidth(args) {
        this.setState((state) => stateUpdateFromSetColumnWidth(args, state));
    }


    onActivateRow({ rowInfo }) {
        const activeRowKey = (rowInfo) ? rowInfo.key : undefined;
        this.setState({
            activeRowKey: activeRowKey,
        });

        const { onSelectAccount } = this.props;
        if (onSelectAccount) {
            onSelectAccount(activeRowKey);
        }
    }


    onOpenActiveRow({ rowIndex }) {
        const { onChooseAccount } = this.props;
        const { activeRowKey } = this.state;
        if (onChooseAccount && activeRowKey) {
            onChooseAccount(activeRowKey);
        }
    }


    renderBalanceDisplay(columnInfo, accountDataItem, accountState) {
        const { accessor } = this.props;

        let currency;
        if (!accountState) {
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );

            if (pricedItemDataItem 
            && (pricedItemDataItem.type === PI.PricedItemType.CURRENCY.name)) {
                accountState = accessor.getCurrentAccountStateDataItem(
                    accountDataItem.id);
                currency = pricedItemDataItem.currency;
            }
        }
        else {
            currency = accessor.getBaseCurrencyCode();
        }

        if (accountState && accountState.quantityBaseValue && currency) {
            return CE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: {
                    quantityBaseValue: accountState.quantityBaseValue,
                    currency: currency,
                },
            });
        }
    }


    renderSharesDisplay(columnInfo, accountDataItem, accountState, quantityDefinition) {
        const { accessor } = this.props;

        if (!accountState) {
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );
            
            if (pricedItemDataItem 
             && ((pricedItemDataItem.type === PI.PricedItemType.SECURITY.name)
              || (pricedItemDataItem.type === PI.PricedItemType.MUTUAL_FUND.name))) {
                accountState = accessor.getCurrentAccountStateDataItem(
                    accountDataItem.id);
                quantityDefinition = pricedItemDataItem.quantityDefinition;
            }
        }

        if (accountState && accountState.quantityBaseValue) {
            return CE.renderSharesDisplay({
                columnInfo: columnInfo,
                value: {
                    quantityBaseValue: accountState.quantityBaseValue,
                    quantityDefinition: quantityDefinition,
                }
            });
        }
    }

    
    onRenderCell({ rowInfo, columnIndex, isSizeRender, }) {
        let { accountDataItem } = rowInfo;
        
        const columnInfo = this.state.columnInfos[columnIndex];

        let accountState;
        let quantityDefinition;
        if (isSizeRender) {
            accountDataItem = this._sizingRowInfo.accountDataItem;
            accountState = this._sizingRowInfo.accountState;
            quantityDefinition = this._sizingRowInfo.quantityDefinition;
        }
        switch (columnInfo.key) {
        case 'name' :
            return CE.renderNameDisplay({
                columnInfo: columnInfo,
                value: accountDataItem.name,
            });
        
        case 'type' :
            return CE.renderAccountTypeDisplay({
                columnInfo: columnInfo,
                value: {
                    accountType: accountDataItem.type,
                }
            });
        
        case 'balance' :
            return this.renderBalanceDisplay(columnInfo, accountDataItem,
                accountState);
        
        case 'shares' :
            return this.renderSharesDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition);
        }
    }


    render() {
        const { state } = this;

        return <div className="RowTableContainer AccountsList">
            <CollapsibleRowTable
                columns = {state.columns}
                rowInfos = {state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell = {this.onRenderCell}

                onSetColumnWidth = {this.onSetColumnWidth}

                activeRowKey = {state.activeRowKey}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}
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
