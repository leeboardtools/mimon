import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import deepEqual from 'deep-equal';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo,
    renderCollapsibleRowTableAsText, } from '../util-ui/CollapsibleRowTable';
import { SimpleRowTableTextRecorder } from '../util-ui/RowTable';
import { getDecimalDefinition, getQuantityDefinitionName, } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns, getColumnWithKey, } from '../util-ui/ColumnInfo';
import { YMDDate } from '../util/YMDDate';


function getPercentOfRootAccount() {
    return { key: 'percentOfRootAccount',
        header: {
            label: userMsg('AccountsList-percentOfRootAccount_column_label'),
            ariaLabel: 'Percent of Root Account',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    };
}

function getPercentOfAccountGroup() {
    return { key: 'percentOfAccountGroup',
        header: {
            label: userMsg('AccountsList-percentOfAccountGroup_column_label'),
            ariaLabel: 'Percent of Parent Account',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    };
}


let columnInfoDefs;

/**
 * @returns {ColumnInfo[]} Array containing the available
 * columns for accounts lists.
 */
function getAccountsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        columnInfoDefs = [
            ACE.getNameColumnInfo({}),
            ACE.getDescriptionColumnInfo({}),
            ACE.getAccountTypeColumnInfo({}),
            ACE.getBalanceColumnInfo({}),
            getPercentOfRootAccount(),
            getPercentOfAccountGroup(),
            LCE.getTotalSharesColumnInfo({}),
            LCE.getTotalCostBasisColumnInfo({}),
            LCE.getTotalCashInColumnInfo({}),
            LCE.getTotalGainColumnInfo({}),
            LCE.getTotalCashInGainColumnInfo({}),
            LCE.getTotalSimplePercentGainColumnInfo({}),
            LCE.getTotalCashInPercentGainColumnInfo({}),
            LCE.getTotalAnnualPercentGainColumnInfo({}),
            LCE.getTotalAnnualCashInPercentGainColumnInfo({}),
        ];
    }

    return columnInfoDefs;
}

/**
 * Retrieves the account list columns with default settings.
 */
export function createDefaultColumns() {
    const columnInfos = getAccountsListColumnInfoDefs();

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });

    getColumnWithKey(columns, 'name').isVisible = true;
    getColumnWithKey(columns, 'accountType').isVisible = true;
    getColumnWithKey(columns, 'balance').isVisible = true;
    getColumnWithKey(columns, 'percentOfAccountGroup').isVisible = true;
    getColumnWithKey(columns, 'totalShares').isVisible = true;
    getColumnWithKey(columns, 'totalCostBasis').isVisible = true;
    getColumnWithKey(columns, 'totalPercentGain').isVisible = true;
    getColumnWithKey(columns, 'totalAnnualCashInPercentGain').isVisible = true;

    return columns;
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
        this.onPreRenderRow = this.onPreRenderRow.bind(this);

        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        this.renderAsStringTable = this.renderAsStringTable.bind(this);

        const { accessor, collapsedAccountIds } = this.props;

        this.state = {
            topLevelAccountIds: [
                accessor.getRootAssetAccountId(),
                accessor.getRootLiabilityAccountId(),
                accessor.getRootIncomeAccountId(),
                accessor.getRootExpenseAccountId(),
                accessor.getRootEquityAccountId(),
            ],
            rowInfos: [],
            pricesYMDDate: undefined,
            pricesByPricedItemId: new Map(),
        };

        this._collapsedRowIds = new Set(collapsedAccountIds);

        this._hiddenRootAccountTypes = new Set(props.hiddenRootAccountTypes);
        this._hiddenAccountIds = new Set(props.hiddenAccountIds);

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
                quantityBaseValue: ACE.BalanceSizingBaseValue,
            },
            quantityDefinition: getQuantityDefinitionName(
                getDecimalDefinition(4)
            ),
        };

        this._percentSuffix = userMsg('AccountsList-percentSuffix');
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

        this.updatePrices();

        const { activeRowKey } = this.state;
        const { onSelectAccount } = this.props;
        if (onSelectAccount) {
            onSelectAccount(activeRowKey);
        }
    }

    componentWillUnmount() {
        this.props.accessor.off('accountAdd', this.onAccountAdd);
        this.props.accessor.off('accountsModify', this.onAccountsModify);
        this.props.accessor.off('accountRemove', this.onAccountRemove);
    }


    componentDidUpdate(prevProps, prevState) {
        const { props } = this;
        const { hiddenRootAccountTypes, hiddenAccountIds, 
        } = props;
        let rowsNeedUpdating = false;
        if (!deepEqual(prevProps.hiddenRootAccountTypes, hiddenRootAccountTypes)) {
            this._hiddenRootAccountTypes = new Set(hiddenRootAccountTypes);
            rowsNeedUpdating = true;
        }

        if (!deepEqual(prevProps.hiddenAccountIds, hiddenAccountIds)) {
            this._hiddenAccountIds = new Set(hiddenAccountIds);
            rowsNeedUpdating = true;
        }

        rowsNeedUpdating 
            |= (prevProps.showHiddenAccounts !== props.showHiddenAccounts);
        rowsNeedUpdating 
            |= (prevProps.showInactiveAccounts !== props.showInactiveAccounts);
        rowsNeedUpdating 
            |= (prevProps.sortAlphabetically !== props.sortAlphabetically);
        rowsNeedUpdating
            |= (prevProps.showSubtotalsWhenCollapsed 
                !== props.showSubtotalsWhenCollapsed);
        rowsNeedUpdating
            |= (prevProps.showNetWorth !== props.showNetWorth);
        rowsNeedUpdating
            |= (prevProps.showNetIncome !== props.showNetIncome);
        rowsNeedUpdating 
            |= (prevProps.subtotalsLevel !== props.subtotalsLevel);

        if (!deepEqual(prevProps.collapsedAccountIds, 
            props.collapsedAccountIds)) {
            this._collapsedRowIds = new Set(props.collapsedAccountIds);
            rowsNeedUpdating = true;
        }

        if (rowsNeedUpdating) {
            let prevActiveRowKey = this.state.activeRowKey;
            
            const result = this.buildRowInfos();
            this.setState(result);

            if (prevActiveRowKey !== result.activeRowKey) {
                const { onSelectAccount } = props;
                if (onSelectAccount) {
                    onSelectAccount(result.activeRowKey);
                }
            }
        }

        if (prevState.pricesYMDDate !== this.state.pricesYMDDate) {
            this.updatePrices();
        }
    }



    onExpandCollapseRow({rowInfo, expandCollapseState}) {
        this.setState((state) => {
            rowInfo = Object.assign({}, rowInfo, {
                expandCollapseState: expandCollapseState,
            });
            switch (expandCollapseState) {
            case ExpandCollapseState.EXPANDED :
                this._collapsedRowIds.delete(rowInfo.key);
                break;
    
            case ExpandCollapseState.COLLAPSED :
                this._collapsedRowIds.add(rowInfo.key);
                break;
            
            default :
                return;
            }

            const { onUpdateCollapsedAccountIds } = this.props;
            if (onUpdateCollapsedAccountIds) {
                onUpdateCollapsedAccountIds({
                    accountId: rowInfo.key,
                    expandCollapseState: expandCollapseState,
                    collapsedAccountIds: Array.from(this._collapsedRowIds.values()),
                });
            }

            return {
                rowInfos: updateRowInfo(state.rowInfos, rowInfo),
            };
        }, 
        () => {
        });
    }


    // TODO: Support summary rows...
    buildRowInfos(state) {
        state = state || this.state;

        const rowInfos = [];
        const rowInfosByAccountId = new Map();
        const { topLevelAccountIds } = state;

        let { activeRowKey } = state;

        const { accessor, showNetWorth, showNetIncome } = this.props;

        const rootAssetAccountId = accessor.getRootAssetAccountId();
        const rootLiabilityAccountId = accessor.getRootLiabilityAccountId();
        const rootIncomeAccountId = accessor.getRootIncomeAccountId();
        const rootExpenseAccountId = accessor.getRootExpenseAccountId();

        let rootNetWorthAfterRowInfo;
        let rootNetIncomeAfterRowInfo;

        const topLevelRowInfos = [];
        const groupRowInfos = [];

        topLevelAccountIds.forEach((id) => {
            let accountTotals;
            const currency = accessor.getCurrencyOfAccountId(id);
            if (currency) {
                accountTotals = {
                    sumQuantityBaseValue: 0,
                    currencyQuantityDefinition: currency.getQuantityDefinition(),
                };
            }

            const rowInfo = this.addAccountIdToRowEntries({
                state: state,
                rowInfos: rowInfos, 
                accountId: id, 
                rowInfosByAccountId: rowInfosByAccountId, 
                depth: 1, 
                accountTotals: accountTotals,
                topLevelRowInfoIndex: topLevelRowInfos.length,
                groupRowInfos,
            });

            topLevelRowInfos.push(rowInfo);

            if (rowInfo && rowInfo.accountDataItem 
             && (rowInfo.accountDataItem.id === id)) {
                switch (id) {
                case rootAssetAccountId :
                    rootNetWorthAfterRowInfo = rowInfo;
                    break;

                case rootLiabilityAccountId :
                    rootNetWorthAfterRowInfo = rowInfo;
                    break;

                case rootIncomeAccountId :
                    rootNetIncomeAfterRowInfo = rowInfo;
                    break;

                case rootExpenseAccountId :
                    rootNetIncomeAfterRowInfo = rowInfo;
                    break;
                }
            }
        });

        if (showNetWorth) {
            this.addRootNetRowInfo({
                state: state,
                rowInfos: rowInfos, 
                insertAfterRowInfo: rootNetWorthAfterRowInfo,
                plusRootAccountDataItem: accessor.getAccountDataItemWithId(
                    rootAssetAccountId), 
                minusRootAccountDataItem: accessor.getAccountDataItemWithId(
                    rootLiabilityAccountId),
                name: userMsg('AccountsList-netWorth_name'),
            });
        }
        if (showNetIncome) {
            this.addRootNetRowInfo({
                state: state,
                rowInfos: rowInfos, 
                insertAfterRowInfo: rootNetIncomeAfterRowInfo,
                plusRootAccountDataItem: accessor.getAccountDataItemWithId(
                    rootIncomeAccountId), 
                minusRootAccountDataItem: accessor.getAccountDataItemWithId(
                    rootExpenseAccountId),
                name: userMsg('AccountsList-netIncome_name'),
            });
        }

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
            topLevelRowInfos: topLevelRowInfos,
            groupRowInfos: groupRowInfos,
        };
    }


    addChildAccountIdsToAccountGainsState(args) {
        let { state, totalAccountGainsState, childAccountIds } = args;
        const { accessor } = this.props;

        childAccountIds.forEach((accountId) => {
            if (!this.isAccountIdDisplayed(accountId)) {
                return;
            }

            const accountDataItem 
                = accessor.getAccountDataItemWithId(accountId);
            const priceDataItem = state.pricesByPricedItemId.get(
                accountDataItem.pricedItemId);

            const accountState = this.getAccountStateForAccountId(accountId);
            const accountGainsState = GH.accountStateToAccountGainsState({
                accessor: accessor,
                accountId: accountId,
                accountState: accountState,
                priceDataItem: priceDataItem,
                isExcludeFromGain: accountDataItem.isExcludeFromGain,
                isQuantityShares: A.getAccountType(accountDataItem.type).hasLots,
            });

            totalAccountGainsState = GH.addAccountGainsState(
                totalAccountGainsState, accountGainsState
            );

            if (accountDataItem.childAccountIds) {
                this.addChildAccountIdsToAccountGainsState(Object.assign({}, args, {
                    childAccountIds: accountDataItem.childAccountIds
                }));
            }
        });
    }


    addAccountIdToRowEntries({ 
        state,
        rowInfos, 
        accountId, 
        rowInfosByAccountId, 
        depth, 
        topLevelRowInfoIndex,
        groupRowInfos,
        groupRowInfoIndex,
    }) {
        if (!this.isAccountIdDisplayed(accountId)) {
            return;
        }

        const { accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        const { childAccountIds } = accountDataItem;

        const key = accountDataItem.id;
        const isCollapsed = this._collapsedRowIds.has(key);

        const priceDataItem = state.pricesByPricedItemId.get(
            accountDataItem.pricedItemId);

        const accountState = this.getAccountStateForAccountId(accountId);
        const accountGainsState = GH.accountStateToAccountGainsState({
            accessor: accessor,
            accountId: accountId,
            accountState: accountState,
            priceDataItem: priceDataItem,
            isExcludeFromGain: accountDataItem.isExcludeFromGain,
            isQuantityShares: A.getAccountType(accountDataItem.type).hasLots,
        });

        const rowInfo = {
            key: key,
            expandCollapseState: (childAccountIds && childAccountIds.length)
                ? ((isCollapsed) 
                    ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountId: accountId,
            accountDataItem: accountDataItem,
            isHidden: this.props.showHiddenAccounts 
                && this._hiddenAccountIds.has(accountDataItem.id),
            accountGainsState: accountGainsState,
            totalAccountGainsState: accountGainsState,
            groupRowInfoIndex: groupRowInfoIndex,
        };

        if (groupRowInfoIndex !== undefined) {
            rowInfo.topLevelRowInfoIndex = topLevelRowInfoIndex;
        }
        
        rowInfos.push(rowInfo);
        rowInfosByAccountId.set(accountId, rowInfo);

        if (childAccountIds && childAccountIds.length) {
            const myGroupRowInfoIndex = groupRowInfos.length;
            groupRowInfos.push(rowInfo);

            let { totalAccountGainsState } = rowInfo;
            totalAccountGainsState = GH.cloneAccountGainsState(totalAccountGainsState);
            rowInfo.totalAccountGainsState = totalAccountGainsState;

            if (!isCollapsed) {
                // We want to include the market value of this parent
                // with the children for the percent of parent calculation.
                // It's OK to refer to ourself because for the total we use
                // the totalAccountGainsState, while for the portion we use
                // accountGainsState.
                rowInfo.groupRowInfoIndex = myGroupRowInfoIndex;

                rowInfo.childRowInfos = [];
                childAccountIds.forEach((childId) => {
                    const childRowInfo = this.addAccountIdToRowEntries({
                        state: state,
                        rowInfos: rowInfo.childRowInfos, 
                        accountId: childId, 
                        rowInfosByAccountId: rowInfosByAccountId, 
                        depth: depth + 1,
                        topLevelRowInfoIndex: topLevelRowInfoIndex,
                        groupRowInfos: groupRowInfos,
                        groupRowInfoIndex: myGroupRowInfoIndex,
                    });
                    if (childRowInfo) {
                        GH.addAccountGainsState(totalAccountGainsState, 
                            childRowInfo.totalAccountGainsState);
                    }
                });

                if (this.props.sortAlphabetically) {
                    rowInfo.childRowInfos.sort((a, b) => 
                        (a.accountDataItem)
                            ? ((b.accountDataItem)
                                ? a.accountDataItem.name.localeCompare(
                                    b.accountDataItem.name)
                                : -1)
                            : 1);
                }

                const { subtotalsLevel } = this.props;
                if ((subtotalsLevel >= 0) && (depth <= subtotalsLevel)) {
                    const subtotalRowInfo = this.addSubtotalsRowEntry(rowInfo, 
                        accountDataItem);
                    subtotalRowInfo.topLevelRowInfoIndex = topLevelRowInfoIndex;
                    subtotalRowInfo.groupRowInfoIndex = groupRowInfoIndex;
                }
            }
            else {
                // We need to manually add all the account gain states.
                this.addChildAccountIdsToAccountGainsState({
                    state: state,
                    totalAccountGainsState: totalAccountGainsState,
                    childAccountIds: childAccountIds,
                });
                rowInfo.accountGainsState = totalAccountGainsState;
                rowInfo.subtotalName = accountDataItem.name;
            }
        }

        return rowInfo;
    }


    addSubtotalsRowEntry(rowInfo, subtotalAccountDataItem) {
        const { childRowInfos } = rowInfo;

        const subtotalRowInfo = {
            key: '_SUBTOTAL_' + subtotalAccountDataItem.id,
            accountId: subtotalAccountDataItem.id,
            subtotalName: subtotalAccountDataItem.name,
            accountGainsState: rowInfo.totalAccountGainsState,
        };
        childRowInfos.push(subtotalRowInfo);

        const emptyRowInfo = {
            key: '_EMPTY_' + subtotalAccountDataItem.id,
        };
        childRowInfos.push(emptyRowInfo);

        return subtotalRowInfo;
    }


    buildAccountGainsForRootAccount(state, accountId) {
        const { accessor } = this.props;
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);

        const priceDataItem = state.pricesByPricedItemId.get(
            accountDataItem.pricedItemId);

        const accountState = this.getAccountStateForAccountId(accountId);
        const accountGainsState = GH.accountStateToAccountGainsState({
            accessor: accessor,
            accountId: accountId,
            accountState: accountState,
            priceDataItem: priceDataItem,
            isExcludeFromGain: accountDataItem.isExcludeFromGain,
            isQuantityShares: A.getAccountType(accountDataItem.type).hasLots,
        });

        this.addChildAccountIdsToAccountGainsState({
            state: state,
            totalAccountGainsState: accountGainsState,
            childAccountIds: accountDataItem.childAccountIds,
        });

        return accountGainsState;
    }


    addRootNetRowInfo({ state, rowInfos, insertAfterRowInfo, 
        plusRootAccountDataItem, minusRootAccountDataItem, name }) {
        
        const plusAccountGainsState = this.buildAccountGainsForRootAccount(
            state, plusRootAccountDataItem.id);
        const minusAccountGainsState = this.buildAccountGainsForRootAccount(
            state, minusRootAccountDataItem.id);
        
        let accountGainsState = GH.cloneAccountGainsState(plusAccountGainsState);
        accountGainsState.quantityBaseValue 
            -= minusAccountGainsState.quantityBaseValue;
        accountGainsState.marketValueBaseValue 
            -= minusAccountGainsState.marketValueBaseValue;

        delete accountGainsState.costBasisBaseValue;
        delete accountGainsState.cashInBaseValue;
        delete accountGainsState.lotStates;
        delete accountGainsState.cashInLotStates;

        const netRowInfo = {
            key: '_NET_' + name,
            plusAccountGainsState: plusAccountGainsState,
            minusAccountGainsState: minusAccountGainsState,
            accountGainsState: accountGainsState,
            rootNetName: name,
        };

        const emptyRowInfo = {
            key: '_EMPTY_' + name,
        };

        let rowIndex = rowInfos.indexOf(insertAfterRowInfo);
        if (rowIndex < 0) {
            rowIndex = rowInfos.length - 1;
        }
        rowInfos.splice(rowIndex + 1, 0, netRowInfo, emptyRowInfo);
    }



    getAccountStateForAccountId(accountId) {
        // Some day support a date...
        const { accessor } = this.props;
        return accessor.getCurrentAccountStateDataItem(accountId);
    }


    isAccountIdDisplayed(accountId) {
        const { showHiddenAccounts, showInactiveAccounts } = this.props;
        if (!showHiddenAccounts && this._hiddenAccountIds.has(accountId)) {
            return false;
        }
        
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        if (!accountDataItem) {
            return false;
        }

        if (!showHiddenAccounts && accountDataItem.isHidden) {
            return false;
        }

        if (!showInactiveAccounts && accountDataItem.isInactive) {
            return false;
        }

        if (this._hiddenRootAccountTypes.has(accountDataItem.type)) {
            return false;
        }

        return true;
    }


    rebuildRowInfos() {
        this.setState((state) => {
            const result = this.buildRowInfos(state);
            return result;
        });
    }


    updatePrices() {
        process.nextTick(async () => {
            const newPricesByPricedItemId = new Map();

            const { accessor } = this.props;
            let { pricesYMDDate: ymdDate } = this.state;
            if (!ymdDate) {
                ymdDate = new YMDDate();
            }

            const pricedItemIds = accessor.getPricedItemIds();
            for (let i = 0; i < pricedItemIds.length; ++i) {
                const pricedItemId = pricedItemIds[i];
                const priceDataItem 
                    = await accessor.asyncGetPriceDataItemOnOrClosestBefore(
                        pricedItemId, ymdDate);
                newPricesByPricedItemId.set(pricedItemId, priceDataItem);
            }

            if (!deepEqual(newPricesByPricedItemId, this.state.pricesByPricedItemId)) {
                this.setState({
                    pricesByPricedItemId: newPricesByPricedItemId,
                });
                this.rebuildRowInfos();
            }
        });
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


    onOpenActiveRow() {
        const { onChooseAccount } = this.props;
        const { activeRowKey } = this.state;
        if (onChooseAccount && activeRowKey) {
            onChooseAccount(activeRowKey);
        }
    }


    columnInfoFromRenderArgs(renderArgs) {
        let { columnInfo, rowInfo } = renderArgs;
        if (rowInfo.subtotalName || rowInfo.rootNetName) {
            columnInfo = Object.assign({}, columnInfo);
            columnInfo.inputClassExtras = 'AccountsList-subtotal '
                + ((rowInfo.accountDataItem)
                    ? 'AccountsList-subtotal-collapsed-value'
                    : 'AccountsList-subtotal-value');
        }

        const { accountDataItem } = rowInfo;

        if (accountDataItem && accountDataItem.isHidden) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-always-hidden-account',
            });
        }
        else if (rowInfo.isHidden) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-hidden-account',
            });
        }

        if (accountDataItem && accountDataItem.isInactive) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-inactive-account',
            });
        }


        return columnInfo;
    }


    accountStateFromRenderArgs(renderArgs) {
        const { accountState } = renderArgs;
        if (accountState) {
            return accountState;
        }

        const { rowInfo } = renderArgs;
        if (rowInfo && rowInfo.accountState) {
            return rowInfo.accountState;
        }

        const { accountDataItem } = renderArgs;
        if (accountDataItem) {
            return this.getAccountStateForAccountId(accountDataItem.id);
        }
    }


    renderAsStringTable() {
        const { props, state } = this;

        const renderProps = {
            recorder: new SimpleRowTableTextRecorder(),

            columns: props.columns,
            rowInfos: state.rowInfos,

            onRenderCell: this.onRenderCell,
            onPreRenderRow: this.onPreRenderRow,
        };
        renderCollapsibleRowTableAsText(renderProps);

        return renderProps.recorder.getAllRows();
    }


    renderName(renderArgs) {
        const { accountDataItem, rowInfo, } = renderArgs;
        let value;

        let columnInfo = this.columnInfoFromRenderArgs(renderArgs);

        if (accountDataItem) {
            value = {
                name: accountDataItem.name,
                description: accountDataItem.description,
            };
        }
        else {
            const { subtotalName, rootNetName } = rowInfo;
            if (subtotalName || rootNetName) {
                if (subtotalName) {
                    value = userMsg('AccountsList-subtotalName',
                        subtotalName);
                }
                else {
                    value = rootNetName;
                }

                columnInfo = Object.assign({}, columnInfo);
                columnInfo.inputClassExtras 
                    += ' AccountsList-subtotal AccountsList-subtotal-name';
            }
        }

        if (value) {
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: value,
                renderAsText: renderArgs.renderAsText,
            });
        }
    }


    renderDescription(renderArgs) {
        const { accountDataItem } = renderArgs;
        if (!accountDataItem) {
            return;
        }

        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        return ACE.renderDescriptionDisplay({
            columnInfo: columnInfo,
            value: {
                name: accountDataItem.name,
                description: accountDataItem.description,
            },
            renderAsText: renderArgs.renderAsText,
        });
    }


    renderAccountType(renderArgs) {
        const { accountDataItem } = renderArgs;
        if (!accountDataItem) {
            return;
        }

        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        return ACE.renderAccountTypeDisplay({
            columnInfo: columnInfo,
            value: {
                accountType: accountDataItem.type,
            },
            renderAsText: renderArgs.renderAsText,
        });
    }


    renderQuantityBaseValue(renderArgs, quantityBaseValue) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);

        const currency = this.props.accessor.getCurrencyOfAccountId(
            renderArgs.accountId);
        if (!currency || (quantityBaseValue === undefined)) {
            return;
        }

        const quantityValue = {
            quantityBaseValue: quantityBaseValue,
            currency: currency,
        };
        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
            renderAsText: renderArgs.renderAsText,
        });
    }


    renderBalanceDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            const quantityBaseValue = accountGainsState.marketValueBaseValue;
            return this.renderQuantityBaseValue(renderArgs, quantityBaseValue);
        }
    }


    renderPercentOfDisplay(renderArgs) {
        const { rowInfo, totalsRowInfo, } = renderArgs;
        if (!totalsRowInfo) {
            return;
        }

        const { accountGainsState } = rowInfo;
        const { totalAccountGainsState } = totalsRowInfo;
        if (!accountGainsState || !totalAccountGainsState) {
            return;
        }

        if (!totalAccountGainsState.marketValueBaseValue) {
            return;
        }

        const { accessor } = this.props;
        const totalCurrency = accessor.getCurrencyOfAccountId(totalsRowInfo.accountId);
        const thisCurrency = accessor.getCurrencyOfAccountId(rowInfo.accountId);
        if (totalCurrency !== thisCurrency) {
            return;
        }

        const quantityDefinition = totalCurrency.getQuantityDefinition();
        const totalValue = quantityDefinition.baseValueToNumber(
            totalAccountGainsState.marketValueBaseValue);
        const thisValue = quantityDefinition.baseValueToNumber(
            accountGainsState.marketValueBaseValue);
        const percent = 100. * thisValue / totalValue;
        const percentQuantityDefinition = accessor.getPercentGainQuantityDefinition();

        const value = {
            quantityBaseValue: percentQuantityDefinition.numberToBaseValue(percent),
            quantityDefinition: percentQuantityDefinition,
        };

        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: value,
            suffix: this._percentSuffix,
            renderAsText: renderArgs.renderAsText,
        });
    }


    renderSharesDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        const { rowInfo } = renderArgs;
        const { accountGainsState, accountDataItem } = rowInfo;
        if (accountGainsState && accountGainsState.isQuantityShares
         && accountDataItem) {
            const { accessor } = this.props;
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );
            if (pricedItemDataItem) {
                return LCE.renderTotalSharesDisplay({
                    columnInfo: columnInfo,
                    value: {
                        quantityBaseValue: accountGainsState.quantityBaseValue,
                        quantityDefinition: pricedItemDataItem.quantityDefinition,
                    },
                    renderAsText: renderArgs.renderAsText,
                });
            }
        }
    }


    renderCostBasisDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            const quantityBaseValue = accountGainsState.costBasisBaseValue;
            return this.renderQuantityBaseValue(renderArgs, quantityBaseValue);
        }
    }


    renderCashInDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            const quantityBaseValue = accountGainsState.cashInBaseValue;
            return this.renderQuantityBaseValue(renderArgs, quantityBaseValue);
        }
    }


    renderGainDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { rowInfo, calcGainValueCallback, suffix } = renderArgs;

        const { accessor } = this.props;

        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            const value = calcGainValueCallback({
                accessor: accessor,
                accountId: rowInfo.accountId,
                accountGainsState: accountGainsState,
            });
            if (!value || (value.quantityBaseValue === undefined)) {
                return;
            }

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: value,
                suffix: suffix,
                renderAsText: renderArgs.renderAsText,
            });
        }
    }

    
    onRenderCell(args) {
        let { rowInfo, columnIndex, isSizeRender, } = args;
        let { accountDataItem } = rowInfo;
        
        const { columnInfo } = this.props.columns[columnIndex];

        let accountState;
        let quantityDefinition;
        if (isSizeRender) {
            accountDataItem = this._sizingRowInfo.accountDataItem;
            accountState = this._sizingRowInfo.accountState;
            quantityDefinition = this._sizingRowInfo.quantityDefinition;
        }
        else {
            const { rowRenderInfo } = args;
            if (rowRenderInfo) {
                accountState = rowRenderInfo.accountState;
                if (rowRenderInfo.subtotalRowInfo) {
                    rowInfo = rowRenderInfo.subtotalRowInfo;
                }
            }
            if (rowInfo.subtotalName && !rowInfo.accountDataItem) {
                // Line up with the parent which is what we're subtotaling.
                --args.depth;
            }
        }

        const renderArgs = {
            rowInfo: rowInfo,
            columnInfo: columnInfo, 
            accountDataItem: accountDataItem,
            accountState: accountState,
            quantityDefinition: quantityDefinition,
            renderAsText: args.renderAsText,
        };

        switch (columnInfo.key) {
        case 'name' :
            return this.renderName(renderArgs);
        
        case 'description' :
            return this.renderDescription(renderArgs);
        
        case 'accountType' :
            return this.renderAccountType(renderArgs);
        
        case 'balance' :
            return this.renderBalanceDisplay(renderArgs);
        
        case 'percentOfRootAccount' :
            renderArgs.totalsRowInfo = this.state.topLevelRowInfos[
                rowInfo.topLevelRowInfoIndex];
            return this.renderPercentOfDisplay(renderArgs);
        
        case 'percentOfAccountGroup' :
            renderArgs.totalsRowInfo 
                = this.state.groupRowInfos[
                    rowInfo.groupRowInfoIndex]
                || this.state.topLevelRowInfos[
                    rowInfo.topLevelRowInfoIndex];
            return this.renderPercentOfDisplay(renderArgs);
        
        case 'totalShares' :
            return this.renderSharesDisplay(renderArgs);
        
        case 'totalCostBasis' :
            return this.renderCostBasisDisplay(renderArgs);
        
        case 'totalCashIn' :
            return this.renderCashInDisplay(renderArgs);
        
        case 'totalGain' :
            renderArgs.calcGainValueCallback = LCE.calcSimpleGainBalanceValue;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalPercentGain' :
            renderArgs.calcGainValueCallback = LCE.calcSimplePercentGainBalanceValue;
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalCashInGain' :
            renderArgs.calcGainValueCallback = LCE.calcCashInGainBalanceValue;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalCashInPercentGain' :
            renderArgs.calcGainValueCallback = LCE.calcCashInPercentGainBalanceValue;
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalAnnualPercentGain' :
            renderArgs.calcGainValueCallback = LCE.calcAnnualPercentGainBalanceValue;
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalAnnualCashInPercentGain' :
            renderArgs.calcGainValueCallback 
                = LCE.calcAnnualCashInPercentGainBalanceValue;
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        }
    }


    onPreRenderRow(args) {
    }


    render() {
        const { props, state } = this;

        let rowClassExtras;
        if (!props.showRowBorders) {
            rowClassExtras = 'No-border';
        }

        return <div className="RowTableContainer AccountsList">
            <CollapsibleRowTable
                columns = {props.columns}
                rowInfos = {state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell = {this.onRenderCell}
                onPreRenderRow = {this.onPreRenderRow}

                onSetColumnWidth = {props.onSetColumnWidth}
                onMoveColumn = {props.onMoveColumn}

                activeRowKey = {state.activeRowKey}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems = {props.contextMenuItems}
                onChooseContextMenuItem = {props.onChooseContextMenuItem}

                rowClassExtras = {rowClassExtras}

                id = {props.id}
            />
            {props.children}
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
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    onMoveColumn: PropTypes.func,
    hiddenRootAccountTypes: PropTypes.arrayOf(PropTypes.string),
    hiddenAccountIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenAccounts: PropTypes.bool,
    showInactiveAccounts: PropTypes.bool,
    showAccountIds: PropTypes.bool,

    collapsedAccountIds: PropTypes.arrayOf(PropTypes.number),
    onUpdateCollapsedAccountIds: PropTypes.func,

    showSubtotalsWhenCollapsed: PropTypes.bool,
    showNetWorth: PropTypes.bool,
    showNetIncome: PropTypes.bool,
    subtotalsLevel: PropTypes.number,
    subtotalAccountIds: PropTypes.arrayOf(PropTypes.number),

    sortAlphabetically: PropTypes.bool,
    showRowBorders: PropTypes.bool,

    children: PropTypes.any,
    id: PropTypes.string,
};
