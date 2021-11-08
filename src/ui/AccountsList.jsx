import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import * as AS from '../engine/AccountStates';
import deepEqual from 'deep-equal';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo,
    renderCollapsibleRowTableAsText, } from '../util-ui/CollapsibleRowTable';
import { SimpleRowTableTextRecorder } from '../util-ui/RowTable';
import { sortRowInfos } from './RowTableHelpers';
import { getDecimalDefinition, getQuantityDefinitionName, } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns, getColumnWithKey,
    columnInfosToMultiComparators, } from '../util-ui/ColumnInfo';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import { compare, MultiCompare } from '../util/MultiCompare';
import { buildFromList } from '../util/StringUtils';


//
//
function compareAccountDataItemProperty(a, b, property) {
    a = (a.accountDataItem) ? a.accountDataItem[property] : '';
    b = (b.accountDataItem) ? b.accountDataItem[property] : '';

    a = a || '';
    b = b || '';
    return a.localeCompare(b);
}


//
//
function getOverallTotalsBaseValue(rowInfo, property) {
    if (rowInfo) {
        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            return accountGainsState.overallTotals[property];
        }
    }
}

function compareOverallTotalsBaseValues(rowInfoA, rowInfoB, property) {
    const baseValueA = getOverallTotalsBaseValue(rowInfoA, property);
    const baseValueB = getOverallTotalsBaseValue(rowInfoB, property);
    return compare(baseValueA, baseValueB);
}


//
//
function getSharesBaseValue(rowInfo) {
    if (rowInfo) {
        const { accountGainsState, } = rowInfo;
        if (accountGainsState && accountGainsState.isQuantityShares) {
            return accountGainsState.quantityBaseValue;
        }
    }
}

//
//
function compareShares(rowInfoA, rowInfoB) {
    const sharesBaseValueA = getSharesBaseValue(rowInfoA);
    const sharesBaseValueB = getSharesBaseValue(rowInfoB);
    return compare(sharesBaseValueA, sharesBaseValueB);
}


//
//
function getGainBaseValue(rowInfo, property) {
    if (rowInfo) {
        const value = rowInfo[property];
        if (value) {
            return value.quantityBaseValue;
        }
    }
}


//
//
function compareGainBaseValues(rowInfoA, rowInfoB, property) {
    const baseValueA = getGainBaseValue(rowInfoA, property);
    const baseValueB = getGainBaseValue(rowInfoB, property);
    return compare(baseValueA, baseValueB);
}


//
//
function getRowInfoRank(rowInfo) {
    switch (rowInfo.type) {
    case 'NET' :
        return 10;
    
    case 'NET_EMPTY' :
        return 11;
    
    case 'SUBTOTAL' :
        return 1;
    
    case 'SUBTOTAL_EMPTY' :
        return 2;
    }

    return 0;
}


//
//
function baseCompare(argsA, argsB, sign, compare) {
    const rowInfoA = argsA.rowInfo;
    const rowInfoB = argsB.rowInfo;
    let rankA = getRowInfoRank(rowInfoA);
    let rankB = getRowInfoRank(rowInfoB);
    if (rankA !== rankB) {
        return (rankA - rankB) * sign;
    }
    return compare(rowInfoA, rowInfoB, argsA.caller);
}


//
// This is for columns that also have subtotal values (actually, any column
// that has values, but this handles subtotals specially for row with
// subtotals by using the subtotal value as the value for the row)
function subtotalCompare(argsA, argsB, sign, compare) {
    const rowInfoA = argsA.rowInfo;
    const rowInfoB = argsB.rowInfo;
    const subtotalA = rowInfoA.subtotalRowInfo;
    const subtotalB = rowInfoB.subtotalRowInfo;

    let rankA = (subtotalA) ? 0 : getRowInfoRank(rowInfoA);
    let rankB = (subtotalB) ? 0 : getRowInfoRank(rowInfoB);
    if (rankA !== rankB) {
        return (rankA - rankB) * sign;
    }

    return compare(subtotalA || rowInfoA, subtotalB || rowInfoB, argsA.caller);
}


//
//
function getPercentOf({ rowInfo, totalsRowInfo, }) {
    if (!totalsRowInfo) {
        return;
    }

    const { accountGainsState } = rowInfo;
    const { totalAccountGainsState } = totalsRowInfo;
    if (!accountGainsState || !totalAccountGainsState) {
        return;
    }

    const totalMarketValueBaseValue 
        = totalAccountGainsState.overallTotals.marketValueBaseValue;
    if (!totalMarketValueBaseValue) {
        return;
    }

    const totalCurrency = totalsRowInfo.currency;
    const thisCurrency = rowInfo.currency;
    if (totalCurrency !== thisCurrency) {
        return;
    }

    const quantityDefinition = totalCurrency.getQuantityDefinition();
    const totalValue = quantityDefinition.baseValueToNumber(
        totalMarketValueBaseValue);
    const thisValue = quantityDefinition.baseValueToNumber(
        accountGainsState.overallTotals.marketValueBaseValue);
    const percent = 100 * thisValue / totalValue;
    return percent;
}


//
//
function comparePercentOfRootAccount(rowInfoA, rowInfoB) {
    return compare(rowInfoA.percentOfTotal, rowInfoB.percentOfTotal);
}

//
//
function comparePercentOfAccountGroup(rowInfoA, rowInfoB) {
    return compare(rowInfoA.percentOfGroup, rowInfoB.percentOfGroup);
}


//
//
function getPercentOfRootAccount() {
    return { key: 'percentOfRootAccount',
        header: {
            label: userMsg('AccountsList-percentOfRootAccount_column_label'),
            ariaLabel: 'Percent of Root Account',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
        sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
            comparePercentOfRootAccount),
    };
}

//
//
function getPercentOfAccountGroup() {
    return { key: 'percentOfAccountGroup',
        header: {
            label: userMsg('AccountsList-percentOfAccountGroup_column_label'),
            ariaLabel: 'Percent of Parent Account',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
        sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
            comparePercentOfAccountGroup),
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
            ACE.getNameColumnInfo({ 
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareAccountDataItemProperty(a, b, 'name')),
            }),
            ACE.getDescriptionColumnInfo({ 
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareAccountDataItemProperty(a, b, 'description')),
            }),
            ACE.getAccountTypeColumnInfo({}),
            ACE.getBalanceColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'marketValueBaseValue')),
            }),
            getPercentOfRootAccount(),
            getPercentOfAccountGroup(),
            LCE.getTotalSharesColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareShares(a, b)),
            }),
            LCE.getTotalCostBasisColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'costBasisBaseValue')),
            }),
            LCE.getTotalCashInColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'cashInBaseValue')),
            }),
            LCE.getTotalGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalGainValue')),
            }),
            LCE.getTotalCashInGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalCashInGainValue')),
            }),
            LCE.getTotalSimplePercentGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalPercentGainValue')),
            }),
            LCE.getTotalCashInPercentGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalCashInPercentGainValue')),
            }),
            LCE.getTotalAnnualPercentGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalAnnualPercentGainValue')),
            }),
            LCE.getTotalAnnualCashInPercentGainColumnInfo({
                sortCompare: (a, b, sign) => subtotalCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(
                        a, b, 'totalAnnualCashInPercentGainValue')),
            }),
        ];
    }

    return columnInfoDefs;
}


let columnInfoComparators;

function getAccountsListColumnComparators() {
    if (!columnInfoComparators) {
        const columnInfos = getAccountsListColumnInfoDefs();
        columnInfoComparators = columnInfosToMultiComparators(
            columnInfos
        );

        // The default compare...
        columnInfoComparators.push({
            compare: (a, b) => compareAccountDataItemProperty(a, b, 'name'),
        });
    }

    return columnInfoComparators;
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

        this.onTransactionsAdd = this.onTransactionsAdd.bind(this);
        this.onTransactionsModify = this.onTransactionsModify.bind(this);
        this.onTransactionsRemove = this.onTransactionsRemove.bind(this);

        this.onPricesChange = this.onPricesChange.bind(this);

        this._asyncLoadAccountStateInfos 
            = this._asyncLoadAccountStateInfos.bind(this);

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onPreRenderRow = this.onPreRenderRow.bind(this);

        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        this.renderAsStringTable = this.renderAsStringTable.bind(this);

        this._multiCompare = new MultiCompare(getAccountsListColumnComparators());
        this._multiCompare.setCompareOrder(props.columnSorting);


        const { accessor, collapsedAccountIds } = this.props;
        let topLevelAccountIds = this.props.topLevelAccountIds 
            || [
                accessor.getRootAssetAccountId(),
                accessor.getRootLiabilityAccountId(),
                accessor.getRootIncomeAccountId(),
                accessor.getRootExpenseAccountId(),
                accessor.getRootEquityAccountId(),
            ];

        this.state = {
            topLevelAccountIds: topLevelAccountIds,
            rowInfos: [],
            accountStatesChangeId: 0,

            accountStateInfosByAccountId: new Map(),

            accountStateInfoLoadingInfo: {
                accountStatesChangeId: 0,
                startYMDDate: props.startYMDDate,
                endYMDDate: props.endYMDDate,
            },
            loadedAccountStateInfo: {
                accountStatesChangeId: 0,
                startYMDDate: props.startYMDDate,
                endYMDDate: props.endYMDDate,
            },
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
        if (this.isAccountIdCounted(result.newAccountDataItem.id)) {
            this.rebuildRowInfos();
        }
    }

    
    onAccountsModify(result) {
        const { accountStateInfosByAccountId } = this.state;
        for (let accountDataItem of result.newAccountDataItems) {
            const { id } = accountDataItem;
            const accountStateInfo = accountStateInfosByAccountId.get(id);
            if (accountStateInfo && accountStateInfo.rowInfo) {
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
        const { accountStateInfosByAccountId } = this.state;
        const accountStateInfo = accountStateInfosByAccountId.get(id);
        if (accountStateInfo && accountStateInfo.rowInfo) {
            this.rebuildRowInfos();
        }
    }



    onTransactionsAdd(result) {
        this._updateIfOurTransactions(result.newTransactionDataItems);
    }

    onTransactionsModify(result) {
        if (!this._updateIfOurTransactions(result.newTransactionDataItems)) {
            this._updateIfOurTransactions(result.oldTransactionDataItems);
        }
    }

    onTransactionsRemove(result) {
        this._updateIfOurTransactions(result.removedTransactionDataItems);
    }


    _updateIfOurTransactions(transactionDataItems) {
        const { accountStateInfosByAccountId } = this.state;

        for (let i = 0; i < transactionDataItems.length; ++i) {
            const { splits } = transactionDataItems[i];
            if (!splits) {
                continue;
            }

            for (let s = 0; s < splits.length; ++s) {
                if (accountStateInfosByAccountId.get(splits[s].accountId)) {
                    this.markAccountStatesNeedUpdating();
                    return true;
                }
            }
        }
    }


    onPricesChange() {
        this.markAccountStatesNeedUpdating();
    }


    markAccountStatesNeedUpdating() {
        this.setState((state) => {
            return {
                accountStatesChangeId: 
                    state.accountStateInfoLoadingInfo.accountStatesChangeId + 1,
            };
        });
    }


    componentDidMount() {
        this.props.accessor.on('accountAdd', this.onAccountAdd);
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.props.accessor.on('accountRemove', this.onAccountRemove);

        this.props.accessor.on('transactionsAdd', this.onTransactionsAdd);
        this.props.accessor.on('transactionsModify', this.onTransactionsModify);
        this.props.accessor.on('transactionsRemove', this.onTransactionsRemove);

        this.props.accessor.on('pricesAdd', this.onPricesChange);
        this.props.accessor.on('pricesRemove', this.onPricesChange);

        this.reloadAccountStateInfos();

        const { activeRowKey } = this.state;
        const { onSelectAccount } = this.props;
        if (onSelectAccount) {
            onSelectAccount(activeRowKey);
        }
    }

    componentWillUnmount() {
        this.props.accessor.off('pricesAdd', this.onPricesChange);
        this.props.accessor.off('pricesRemove', this.onPricesChange);

        this.props.accessor.off('transactionsAdd', this.onTransactionsAdd);
        this.props.accessor.off('transactionsModify', this.onTransactionsModify);
        this.props.accessor.off('transactionsRemove', this.onTransactionsRemove);

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

        let sortingNeedsUpdating = !deepEqual(props.columnSorting,
            prevProps.columnSorting);
        if (sortingNeedsUpdating) {
            this._multiCompare.setCompareOrder(props.columnSorting);
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

        // We don't do a full row update on date changes because the accounts listed
        // are not dependent upon the dates.
        if ((props.startYMDDate !== prevProps.startYMDDate)
         || (props.endYMDDate !== prevProps.endYMDDate)
         || (this.state.accountStatesChangeId 
          !== this.state.accountStateInfoLoadingInfo.accountStatesChangeId)) {
            sortingNeedsUpdating = false;
            this.reloadAccountStateInfos();
        }

        if (sortingNeedsUpdating) {
            this.updateRowInfoSorting();
        }

        if (props.endYMDDate) {
            this._endDateString = props.accessor.formatDate(props.endYMDDate);
        }
    }


    reloadAccountStateInfos() {
        const { state, props } = this;
        const { accountStatesChangeId, accountStateInfoLoadingInfo } = state;
        const { startYMDDate, endYMDDate } = props;

        if ((accountStatesChangeId !== accountStateInfoLoadingInfo.accountStatesChangeId)
         || (startYMDDate !== accountStateInfoLoadingInfo.startYMDDate)
         || (endYMDDate !== accountStateInfoLoadingInfo.endYMDDate)) {
            this.setState({
                accountStateInfoLoadingInfo: {
                    accountStatesChangeId: accountStatesChangeId,
                    startYMDDate: startYMDDate,
                    endYMDDate: endYMDDate,
                },
            },

            () => {
                process.nextTick(this._asyncLoadAccountStateInfos);
            });
        }
    }

    async _asyncLoadAccountStateInfos() {
        const { accessor } = this.props;
        const { accountStateInfoLoadingInfo, accountStateInfosByAccountId } = this.state;

        const allAccountIds = Array.from(accountStateInfosByAccountId.keys());
        const allAccountStateInfos = Array.from(accountStateInfosByAccountId.values());

        let accountStateDataItems;
        let startAccountStateDataItems;

        let { startYMDDate, endYMDDate } = accountStateInfoLoadingInfo;
        const isDateSpecified = endYMDDate;
        if (endYMDDate) {
            accountStateDataItems = await accessor.asyncGetAccountStateForDate(
                allAccountIds,
                endYMDDate,
            );
        }
        else {
            endYMDDate = (new YMDDate()).toString();
        }

        if (startYMDDate) {
            startAccountStateDataItems = await accessor.asyncGetAccountStateForDate(
                allAccountIds,
                getYMDDate(startYMDDate).addDays(-1),
            );
        }

        if (!accountStateDataItems) {
            accountStateDataItems = allAccountIds.map((accountId) =>
                accessor.getCurrentAccountStateDataItem(accountId));
        }

        // We only need priceDataItems for account states that have lots.
        const accountIdIndicesByPriceDataItemId = new Map();
        for (let i = 0; i < allAccountIds.length; ++i) {
            const accountStateInfo = allAccountStateInfos[i];
            const { accountDataItem } = accountStateInfo;

            let accountStateDataItem = accountStateDataItems[i];
            if (!accountStateDataItem) {
                if (!isDateSpecified) {
                    accountStateDataItem 
                        = accessor.getCurrentAccountStateDataItem(allAccountIds[i]);
                }
                else {
                    const type = A.getAccountType(accountDataItem.type);
                    accountStateDataItem
                        = AS.getFullAccountStateDataItem(
                            { quantityBaseValue: 0, },
                            type.hasLots
                        );
                }
            }
            accountStateInfo.accountState = accountStateDataItem;

            if (!accountStateDataItem) {
                continue;
            }

            let accountIdsIndices = accountIdIndicesByPriceDataItemId.get(
                accountDataItem.pricedItemId
            );
            if (!accountIdsIndices) {
                accountIdsIndices = [];
                accountIdIndicesByPriceDataItemId.set(accountDataItem.pricedItemId,
                    accountIdsIndices);
            }
            accountIdsIndices.push(i);
        }

        if (accountIdIndicesByPriceDataItemId.size) {
            const pricedItemIds = Array.from(accountIdIndicesByPriceDataItemId.keys());
            const priceDataItems = await accessor.asyncGetPriceDataItemOnOrClosestBefore({
                pricedItemId: pricedItemIds,
                ymdDate: endYMDDate,
                refYMDDate: endYMDDate,
            });

            const allAccountIdIndices 
                = Array.from(accountIdIndicesByPriceDataItemId.values());
            for (let i = 0; i < pricedItemIds.length; ++i) {
                const accountIdIndices = allAccountIdIndices[i];
                accountIdIndices.forEach((index) => {
                    allAccountStateInfos[index].priceDataItem = priceDataItems[i];
                });
            }

            if (startAccountStateDataItems) {
                const priceDataItems 
                    = await accessor.asyncGetPriceDataItemOnOrClosestBefore({
                        pricedItemId: pricedItemIds,
                        ymdDate: startYMDDate,
                        refYMDDate: endYMDDate,
                    });

                const allAccountIdIndices 
                    = Array.from(accountIdIndicesByPriceDataItemId.values());
                for (let i = 0; i < pricedItemIds.length; ++i) {
                    const accountIdIndices = allAccountIdIndices[i];
                    accountIdIndices.forEach((index) => {
                        allAccountStateInfos[index].startPriceDataItem 
                            = priceDataItems[i];
                    });
                }
            }
        }

        for (let i = 0; i < allAccountIds.length; ++i) {
            const accountStateInfo = allAccountStateInfos[i];
            const { accountDataItem } = accountStateInfo;
            const args = {
                accessor: accessor,
                accountId: allAccountIds[i],
                accountState: accountStateInfo.accountState,
                priceDataItem: accountStateInfo.priceDataItem,
                isExcludeFromGain: accountDataItem.isExcludeFromGain,
                isQuantityShares: A.getAccountType(accountDataItem.type).hasLots,
            };

            accountStateInfo.accountGainsState = GH.accountStateToAccountGainsState(args);

            if (startAccountStateDataItems) {
                args.accountState = startAccountStateDataItems[i];
                args.priceDataItem = accountStateInfo.startPriceDataItem;

                const startAccountGainsState = GH.accountStateToAccountGainsState(args);
                accountStateInfo.accountGainsState = GH.subtractAccountGainsStates(
                    accountStateInfo.accountGainsState,
                    startAccountGainsState);
            }
        }

        this.updateRootRowInfoAccountStates();

        this.updateRowInfoSorting();

        this.setState({
            loadedAccountStateInfo: accountStateInfoLoadingInfo,
        });
    }


    updateRowInfoSorting(state) {
        state = state || this.state;
        if (!this.props.columnSorting || !this.props.columnSorting.length) {
            this.setState({
                sortedRowInfos: undefined,
            });
            return;
        }

        const rootRowInfos = Array.from(state.rowInfos);
        const compare = (a, b) => this._multiCompare.compare(
            { rowInfo: a, caller: this, },
            { rowInfo: b, caller: this, });
    
        const sortedRowInfos = [];
        rootRowInfos.forEach((rowInfo) => {
            rowInfo = Object.assign({}, rowInfo, {
                childRowInfos: sortRowInfos(rowInfo.childRowInfos, compare),
            });
            sortedRowInfos.push(rowInfo);
        });

        this.setState({
            sortedRowInfos: sortedRowInfos,
        });
    }


    buildRowInfos(state) {
        state = state || this.state;

        const rowInfos = [];
        const accountStateInfosByAccountId = new Map();

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
                accountStateInfosByAccountId: accountStateInfosByAccountId,
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
                accountStateInfosByAccountId: accountStateInfosByAccountId,
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
                accountStateInfosByAccountId: accountStateInfosByAccountId,
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

        if (deepEqual(rowInfos, state.rowInfos)) {
            return {};
        }

        return {
            rowInfos: rowInfos,
            sortedRowInfos: undefined,
            accountStatesChangeId: state.accountStatesChangeId + 1,
            accountStateInfosByAccountId: accountStateInfosByAccountId,
            activeRowKey: newActiveRowKey,
            topLevelRowInfos: topLevelRowInfos,
            groupRowInfos: groupRowInfos,
        };
    }


    addAccountIdToRowEntries({ 
        state,
        rowInfos, 
        accountId, 
        accountStateInfosByAccountId,
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

        const rowInfo = {
            key: key,
            type: 'ACCOUNT',
            expandCollapseState: (childAccountIds && childAccountIds.length)
                ? ((isCollapsed) 
                    ? ExpandCollapseState.COLLAPSED
                    : ExpandCollapseState.EXPANDED)
                : ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountId: accountId,
            accountDataItem: accountDataItem,
            currency: accessor.getCurrencyOfAccountId(accountId),
            isHidden: this.props.showHiddenAccounts 
                && this._hiddenAccountIds.has(accountDataItem.id),
            groupRowInfoIndex: groupRowInfoIndex,
        };

        if (groupRowInfoIndex !== undefined) {
            rowInfo.topLevelRowInfoIndex = topLevelRowInfoIndex;
        }
        
        rowInfos.push(rowInfo);
        accountStateInfosByAccountId.set(accountId,
            this.createAccountStateInfo(accountId, rowInfo));

        if (childAccountIds && childAccountIds.length) {
            const myGroupRowInfoIndex = groupRowInfos.length;
            groupRowInfos.push(rowInfo);
            
            if (!isCollapsed) {
                // We want to include the market value of this parent
                // with the children for the percent of parent calculation.
                // It's OK to refer to ourself because for the total we use
                // the totalAccountGainsState, while for the portion we use
                // accountGainsState.
                rowInfo.groupRowInfoIndex = myGroupRowInfoIndex;

                rowInfo.childRowInfos = [];
                childAccountIds.forEach((childId) => {
                    this.addAccountIdToRowEntries({
                        state: state,
                        rowInfos: rowInfo.childRowInfos, 
                        accountId: childId, 
                        accountStateInfosByAccountId: accountStateInfosByAccountId,
                        depth: depth + 1,
                        topLevelRowInfoIndex: topLevelRowInfoIndex,
                        groupRowInfos: groupRowInfos,
                        groupRowInfoIndex: myGroupRowInfoIndex,
                    });
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
                    rowInfo.subtotalRowInfo = subtotalRowInfo;
                }
            }
            else {
                childAccountIds.forEach((accountId) => 
                    this.addNonRowInfoChildAccount(accountId, 
                        accountStateInfosByAccountId));
            }
        }

        return rowInfo;
    }


    addNonRowInfoChildAccount(accountId, accountStateInfosByAccountId) {
        accountStateInfosByAccountId.set(accountId, this.createAccountStateInfo(
            accountId
        ));

        const accountDataItem = this.props.accessor.getAccountDataItemWithId(accountId);
        const { childAccountIds } = accountDataItem;
        if (childAccountIds) {
            childAccountIds.forEach((accountId) => 
                this.addNonRowInfoChildAccount(accountId, 
                    accountStateInfosByAccountId));
        }
    }


    /**
     * @typedef {object} AccountsList~RowInfo
     * A {@link CollapsibleRowTable~RowInfo} plus:
     * @property {number} accountId
     * @property {AccountDataItem} accountDataItem
     * @property {boolean} isHidden
     * @property {number} [groupRowInfoIndex]
     * @property {number} [topLevelRowInfoIndex]
     * @property {AccountGainsState} [accountGainsState]
     * @property {AccountGainsState} [totalAccountGainsState] Contains the totals of 
     * an account and all its children, used by renderPercentOfDisplay()
     * for 'percentOfRootAccount' and 'percentOfAccountGroup'.
     * Subtotal rows do not have a totalAccountGainsState.
     * For accounts without children or not displaying their children
     * accountGainsState === totalAccountGainsState.
     * 
     */

    /**
     * @typedef {object} AccountsList~SubtotalRowInfo
     * A {@link AccountsList~RowInfo} plus:
     * @property {string} subtotalName
     */

    /**
     * @typedef {object} AccountsList~RootNetRowInfo
     * A {@link AccountsList~RowInfo} plus:
     * @property {number} plusRootAccountId
     * @property {number} minusRootAccountId
     * @property {AccountGainsState} plusAccountGainsState
     * @property {AccountGainsState} minusAccountGainsState
     * @property {string} rootNetName
     */


    /**
     * @typedef {object} AccountsList~AccountStateInfo
     * @private
     * @property {AccountsList~RowInfo} rowInfo
     * @property {AccountDataItem} accountDataItem
     * @property {AccountState} [accountState]
     * @property {GainHelpers~AccountGainsStateDataItem} [accountGainsState]
     * @property {PriceDataItem} [priceDataItem]
     * @property {PriceDataItem} [startPriceDataItem]
     */

    createAccountStateInfo(accountId, rowInfo) {
        const { accessor, startYMDDate, endYMDDate } = this.props;

        const accountStateInfo = {
            rowInfo: rowInfo,
            accountDataItem: accessor.getAccountDataItemWithId(accountId),
        };
        if (!startYMDDate && !endYMDDate) {
            accountStateInfo.accountState 
                = accessor.getCurrentAccountStateDataItem(accountId);
        }

        return accountStateInfo;
    }


    addSubtotalsRowEntry(rowInfo, subtotalAccountDataItem) {
        const { childRowInfos } = rowInfo;

        const subtotalRowInfo = {
            key: '_SUBTOTAL_' + subtotalAccountDataItem.id,
            type: 'SUBTOTAL',
            accountId: subtotalAccountDataItem.id,
            subtotalName: subtotalAccountDataItem.name,
            currency: this.props.accessor.getCurrencyOfAccountId(
                subtotalAccountDataItem.id),
        };
        childRowInfos.push(subtotalRowInfo);

        const emptyRowInfo = {
            key: '_SUBTOTALEMPTY_' + subtotalAccountDataItem.id,
            type: 'SUBTOTAL_EMPTY',
        };
        childRowInfos.push(emptyRowInfo);

        return subtotalRowInfo;
    }



    addRootNetRowInfo({ state, rowInfos, insertAfterRowInfo, 
        accountStateInfosByAccountId,
        plusRootAccountDataItem, minusRootAccountDataItem, name }) {

        let isPlusRowInfo;
        let isMinusRowInfo;
        rowInfos.forEach((rowInfo) => {
            if (rowInfo.accountDataItem) {
                if (rowInfo.accountDataItem.id === plusRootAccountDataItem.id) {
                    isPlusRowInfo = true;
                }
                else if (rowInfo.accountDataItem.id === minusRootAccountDataItem.id) {
                    isMinusRowInfo = true;
                }
            }
        });

        if (!isPlusRowInfo) {
            this.addNonRowInfoChildAccount(
                plusRootAccountDataItem.id, accountStateInfosByAccountId);
        }

        if (!isMinusRowInfo) {
            this.addNonRowInfoChildAccount(
                minusRootAccountDataItem.id, accountStateInfosByAccountId);
        }

        const netRowInfo = {
            key: '_NET_' + name,
            type: 'NET',
            plusRootAccountId: plusRootAccountDataItem.id,
            minusRootAccountId: minusRootAccountDataItem.id,
            rootNetName: name,
            currency: this.props.accessor.getCurrencyOfAccountId(
                plusRootAccountDataItem.id),
        };

        const emptyRowInfo = {
            key: '_NETEMPTY_' + name,
            type: 'NET_EMPTY',
        };

        let rowIndex = rowInfos.indexOf(insertAfterRowInfo);
        if (rowIndex < 0) {
            rowIndex = rowInfos.length - 1;
        }
        rowInfos.splice(rowIndex + 1, 0, netRowInfo, emptyRowInfo);
    }


    updateRootRowInfoAccountStates(state, rowInfos) {
        state = state || this.state;
        rowInfos = rowInfos || state.rowInfos;

        for (let i = 0; i < rowInfos.length; ++i) {
            const rowInfo = rowInfos[i];
            const { type } = rowInfo;
            if (type === 'NET') {
                this.updateRootNetRowInfoAccountStates(state, rowInfo);
                continue;
            }

            this.updateRowInfoAccountStates(state, rowInfo);

            if (rowInfo.childRowInfos) {
                rowInfo.childRowInfos.forEach((childRowInfo) =>
                    this.updateRowInfoCalculateds(state, childRowInfo, rowInfo)
                );
            }
        }
        return rowInfos;
    }


    updateRowInfoAccountStates(state, rowInfo) {
        const { accountId, accountDataItem } = rowInfo;

        if (!accountDataItem) {
            return;
        }

        const accountStateInfo = this.state.accountStateInfosByAccountId.get(accountId);
        const { accountGainsState, accountState } = accountStateInfo;
        const { childAccountIds } = accountDataItem;

        // This prevents the display of balance, % of, 
        // for parent accounts without any transactions.
        if (!accountState
         || (accountState.transactionId || accountState.quantityBaseValue)
         || !childAccountIds || !childAccountIds.length) {
            rowInfo.accountGainsState = accountGainsState;
        }
        else {
            delete rowInfo.accountGainsState;
        }

        rowInfo.totalAccountGainsState = accountGainsState;

        if (childAccountIds && childAccountIds.length) {
            let { totalAccountGainsState } = rowInfo;
            totalAccountGainsState = GH.cloneAccountGainsState(totalAccountGainsState);
            if (totalAccountGainsState) {
                if (totalAccountGainsState.isExcludeFromGain) {
                    totalAccountGainsState.gainTotals = {};
                }
            }
            
            rowInfo.totalAccountGainsState = totalAccountGainsState;

            const { childRowInfos } = rowInfo;
            if (childRowInfos) {
                childRowInfos.forEach((childRowInfo) => {
                    const { type } = childRowInfo;
                    if (type === 'SUBTOTAL') {
                        childRowInfo.accountGainsState = GH.cloneAccountGainsState(
                            totalAccountGainsState);
                        if (childRowInfo.accountGainsState) {
                            childRowInfo.accountGainsState.isExcludeFromGain = false;
                        }
                        return;
                    }

                    this.updateRowInfoAccountStates(state, childRowInfo);
                    GH.addAccountGainsState(totalAccountGainsState, 
                        childRowInfo.totalAccountGainsState);
                });
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
    }


    updateRootNetRowInfoAccountStates(state, rowInfo) {
        const plusAccountGainsState = this.addAccountToAccountGainsState(
            state, rowInfo.plusRootAccountId);
        const minusAccountGainsState = this.addAccountToAccountGainsState(
            state, rowInfo.minusRootAccountId);
        
        let accountGainsState = GH.cloneAccountGainsState(plusAccountGainsState);
        if (accountGainsState) {
            accountGainsState.quantityBaseValue 
                -= minusAccountGainsState.quantityBaseValue;
            accountGainsState.overallTotals.marketValueBaseValue 
                -= minusAccountGainsState.overallTotals.marketValueBaseValue;

            delete accountGainsState.gainTotals;
        }

        rowInfo.plusAccountGainsState = plusAccountGainsState;
        rowInfo.minusAccountGainsState = minusAccountGainsState;
        rowInfo.accountGainsState = accountGainsState;
    }


    updateRowInfoCalculateds(state, rowInfo, topLevelRowInfo) {
        rowInfo.percentOfTotal = getPercentOf({
            rowInfo: rowInfo,
            totalsRowInfo: topLevelRowInfo,
        });

        const groupRowInfo = state.groupRowInfos[rowInfo.groupRowInfoIndex]
            || topLevelRowInfo;
        rowInfo.percentOfGroup = getPercentOf({
            rowInfo: rowInfo,
            totalsRowInfo: groupRowInfo,
        });

        
        rowInfo.totalGainValue = this.calcGainValue(rowInfo, 
            LCE.calcSimpleGainBalanceValue);

        rowInfo.totalPercentGainValue = this.calcGainValue(rowInfo,
            LCE.calcSimplePercentGainBalanceValue);

        rowInfo.totalCashInGainValue = this.calcGainValue(rowInfo,
            LCE.calcCashInGainBalanceValue);

        rowInfo.totalCashInPercentGainValue = this.calcGainValue(rowInfo,
            LCE.calcCashInPercentGainBalanceValue);

        rowInfo.totalAnnualPercentGainValue = this.calcGainValue(rowInfo,
            LCE.calcAnnualPercentGainBalanceValue);

        rowInfo.totalAnnualCashInPercentGainValue = this.calcGainValue(rowInfo,
            LCE.calcAnnualCashInPercentGainBalanceValue);


        if (rowInfo.childRowInfos) {
            rowInfo.childRowInfos.forEach((childRowInfo) =>
                this.updateRowInfoCalculateds(state, childRowInfo, topLevelRowInfo)
            );
        }
    }


    calcGainValue(rowInfo, calcGainValueCallback) {
        const { accountGainsState } = rowInfo;
        if (accountGainsState) {
            const value = calcGainValueCallback({
                accessor: this.props.accessor,
                accountId: rowInfo.accountId,
                accountGainsState: accountGainsState,
            });
            if (value && (value.quantityBaseValue !== undefined)) {
                return value;
            }
        }
    }


    // Called by updateRowInfoAccountStates() when an account is collapsed...
    // Also called by addAccountToAccountGainsState(), which calls this
    // for child accounts.
    addChildAccountIdsToAccountGainsState(args) {
        let { state, totalAccountGainsState, childAccountIds } = args;

        childAccountIds.forEach((accountId) => {
            if (!this.isAccountIdCounted(accountId)) {
                return;
            }

            this.addAccountToAccountGainsState(state, accountId, totalAccountGainsState);
        });
    }


    // This is called by updateRootNetRowInfoAccountStates(),
    // addChildAccountIsToAccountGainState()
    addAccountToAccountGainsState(state, accountId, totalAccountGainsState) {
        const { accessor } = this.props;

        let accountGainsState = this.getAccountGainsStateForAccountId(accountId);

        if (totalAccountGainsState) {
            accountGainsState = GH.addAccountGainsState(
                totalAccountGainsState, accountGainsState
            );
        }
        else {
            accountGainsState = GH.cloneAccountGainsState(accountGainsState);
        }

        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        if (accountDataItem.childAccountIds) {
            this.addChildAccountIdsToAccountGainsState({
                state: state,
                totalAccountGainsState: accountGainsState,
                childAccountIds: accountDataItem.childAccountIds,
            });
        }

        return accountGainsState;
    }


    getAccountGainsStateForAccountId(accountId) {
        const accountStateInfo = this.state.accountStateInfosByAccountId.get(accountId);
        if (accountStateInfo) {
            return accountStateInfo.accountGainsState;
        }
    }


    isAccountIdCounted(accountId) {
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

        return true;
    }


    isAccountIdDisplayed(accountId) {
        if (!this.isAccountIdCounted(accountId)) {
            return false;
        }

        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
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
                sortedRowInfos: undefined,
            };
        }, 
        () => {
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
            columnInfo.inputClassExtras += ' AccountsList-subtotal '
                + ((rowInfo.accountDataItem)
                    ? 'AccountsList-subtotal-collapsed-value'
                    : 'AccountsList-subtotal-value');
            
            if ((columnInfo.key === 'name')
             && (rowInfo.type === 'SUBTOTAL')) {
                columnInfo.inputClassExtras += ' AccountsList-subtotal-name';
            }
        }

        const { accountDataItem } = rowInfo;

        if (accountDataItem && accountDataItem.isHidden) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-always-hidden-account',
                isAlwaysHidden: true,
                isHidden: true,
            });
        }
        else if (rowInfo.isHidden) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-hidden-account',
                isHidden: true,
            });
        }

        if (accountDataItem && accountDataItem.isInactive) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-inactive-account',
                isInactive: true,
            });
        }

        if (accountDataItem 
         && (!accountDataItem.childAccountIds
          || !accountDataItem.childAccountIds.length)
         && !rowInfo.accountGainsState
         && this.props.endYMDDate) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' AccountList-too-young-account',
                isTooYoung: true,
            });
        }


        return columnInfo;
    }



    renderAsStringTable() {
        const { props, state } = this;

        const renderProps = {
            recorder: new SimpleRowTableTextRecorder(),

            columns: props.columns,
            rowInfos: state.sortedRowInfos || state.rowInfos,

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
                description: accountDataItem.description || '',
            };

            const descriptionPrefix = [];
            if (columnInfo.isInactive) {
                descriptionPrefix.push(userMsg('AccountsList-isInactive'));
            }
            if (columnInfo.isAlwaysHidden) {
                descriptionPrefix.push(userMsg('AccountsList-isAlwaysHidden'));
            }
            else if (columnInfo.isHidden) {
                descriptionPrefix.push(userMsg('AccountsList-isHidden'));
            }
            if (descriptionPrefix.length) {
                const status = buildFromList(descriptionPrefix, {
                    opening: userMsg('AccountsList-displayStatusOpening'),
                    separator: userMsg('AccountsList-displayStatusSeparator'),
                    closing: userMsg('AccountsList-displayStatusClosing'),
                });
                if (value.description) {
                    value.description = [value.description, status];
                }
                else {
                    value.description = status;
                }
            }

            if (columnInfo.isTooYoung) {
                if (!Array.isArray(value.description)) {
                    value.description = (value.description)
                        ? [value.description]
                        : [];
                }
                value.description.push(userMsg('AccountsList-tooYoung-tooltip',
                    this._endDateString));
            }
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


    renderQuantityBaseValue(renderArgs, quantityBaseValue, tooltip) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);

        const { rowInfo } = renderArgs;
        const { currency } = rowInfo;
        if (!currency || (quantityBaseValue === undefined)) {
            return;
        }

        const quantityValue = {
            quantityBaseValue: quantityBaseValue,
            currency: currency,
        };
        if (tooltip) {
            quantityValue.tooltip = tooltip;
        }

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
            renderAsText: renderArgs.renderAsText,
        });
    }


    renderBalanceDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const quantityBaseValue = getOverallTotalsBaseValue(
            rowInfo, 'marketValueBaseValue');
        if (quantityBaseValue !== undefined) {
            let tooltip;
            const { priceDataItem } = rowInfo.accountGainsState;
            if (priceDataItem) {
                tooltip = userMsg('AccountsList-price_tooltip',
                    priceDataItem.close,
                    this.props.accessor.formatDate(priceDataItem.ymdDate),
                );
            }
            return this.renderQuantityBaseValue(
                renderArgs, quantityBaseValue, tooltip);
        }
    }


    renderPercentOfDisplay(renderArgs) {
        const { percentOfProperty, rowInfo, } = renderArgs;

        const percent = rowInfo[percentOfProperty];
        if (percent === undefined) {
            return;
        }

        const percentQuantityDefinition 
            = this.props.accessor.getPercentGainQuantityDefinition();
        const value = {
            quantityBaseValue: 
                percentQuantityDefinition.numberToBaseValue(percent),
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
        const sharesBaseValue = getSharesBaseValue(rowInfo);
        if (sharesBaseValue === undefined) {
            return;
        }

        const { accountDataItem } = rowInfo;
        if (accountDataItem) {
            const { accessor } = this.props;
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );
            if (pricedItemDataItem) {
                return LCE.renderTotalSharesDisplay({
                    columnInfo: columnInfo,
                    value: {
                        quantityBaseValue: sharesBaseValue,
                        quantityDefinition: pricedItemDataItem.quantityDefinition,
                    },
                    renderAsText: renderArgs.renderAsText,
                });
            }
        }
    }


    renderCostBasisDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const quantityBaseValue = getOverallTotalsBaseValue(rowInfo, 
            'costBasisBaseValue');
        return this.renderQuantityBaseValue(renderArgs, quantityBaseValue);
    }


    renderCashInDisplay(renderArgs) {
        let { rowInfo, } = renderArgs;
        const quantityBaseValue = getOverallTotalsBaseValue(rowInfo, 
            'cashInBaseValue');
        return this.renderQuantityBaseValue(renderArgs, quantityBaseValue);
    }


    renderGainDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);

        const { rowInfo, gainProperty, suffix } = renderArgs;
        const value = rowInfo[gainProperty];
        if (value) {
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
            accessor: this.props.accessor,
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
            renderArgs.percentOfProperty = 'percentOfTotal';
            return this.renderPercentOfDisplay(renderArgs);
        
        case 'percentOfAccountGroup' :
            renderArgs.percentOfProperty = 'percentOfGroup';
            return this.renderPercentOfDisplay(renderArgs);
        
        case 'totalShares' :
            return this.renderSharesDisplay(renderArgs);
        
        case 'totalCostBasis' :
            return this.renderCostBasisDisplay(renderArgs);
        
        case 'totalCashIn' :
            return this.renderCashInDisplay(renderArgs);
        
        case 'totalGain' :
            renderArgs.gainProperty = 'totalGainValue';
            return this.renderGainDisplay(renderArgs);
        
        case 'totalPercentGain' :
            renderArgs.gainProperty = 'totalPercentGainValue';
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalCashInGain' :
            renderArgs.gainProperty = 'totalCashInGainValue';
            return this.renderGainDisplay(renderArgs);
        
        case 'totalCashInPercentGain' :
            renderArgs.gainProperty = 'totalCashInPercentGainValue';
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalAnnualPercentGain' :
            renderArgs.gainProperty = 'totalAnnualPercentGainValue';
            renderArgs.suffix = this._percentSuffix;
            return this.renderGainDisplay(renderArgs);
        
        case 'totalAnnualCashInPercentGain' :
            renderArgs.gainProperty = 'totalAnnualCashInPercentGainValue';
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
                rowInfos = {state.sortedRowInfos || state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell = {this.onRenderCell}
                onPreRenderRow = {this.onPreRenderRow}

                columnSorting = {props.columnSorting}
                onColumnSortingChange = {props.onColumnSortingChange}
                onSetColumnWidth = {props.onSetColumnWidth}
                onMoveColumn = {props.onMoveColumn}

                activeRowKey = {state.activeRowKey}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems = {props.contextMenuItems}
                onChooseContextMenuItem = {props.onChooseContextMenuItem}

                preHeaderComponent = {props.header}

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
    columnSorting: PropTypes.arrayOf(PropTypes.object),
    onColumnSortingChange: PropTypes.func,
    onSetColumnWidth: PropTypes.func,
    onMoveColumn: PropTypes.func,


    hiddenRootAccountTypes: PropTypes.arrayOf(PropTypes.string),
    hiddenAccountIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenAccounts: PropTypes.bool,
    showInactiveAccounts: PropTypes.bool,
    showAccountIds: PropTypes.bool,

    topLevelAccountIds: PropTypes.arrayOf(PropTypes.number),

    startYMDDate: PropTypes.string,
    endYMDDate: PropTypes.string,

    collapsedAccountIds: PropTypes.arrayOf(PropTypes.number),
    onUpdateCollapsedAccountIds: PropTypes.func,

    showSubtotalsWhenCollapsed: PropTypes.bool,
    showNetWorth: PropTypes.bool,
    showNetIncome: PropTypes.bool,
    subtotalsLevel: PropTypes.number,
    subtotalAccountIds: PropTypes.arrayOf(PropTypes.number),

    sortAlphabetically: PropTypes.bool,
    showRowBorders: PropTypes.bool,

    header: PropTypes.any,
    children: PropTypes.any,
    id: PropTypes.string,
};
