import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { YMDDate } from '../util/YMDDate';
import { getQuantityDefinition, 
    getQuantityDefinitionName, } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns, getColumnWithKey,
    columnInfosToMultiComparators, } from '../util-ui/ColumnInfo';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo,
    renderCollapsibleRowTableAsText, } from '../util-ui/CollapsibleRowTable';
import { SimpleRowTableTextRecorder } from '../util-ui/RowTable';
import { sortRowInfos } from './RowTableHelpers';
import { compare, MultiCompare } from '../util/MultiCompare';


//
//
function getTickerFromRowInfo(rowInfo) {
    const { tickerValue } = rowInfo;
    if (tickerValue) {
        const { value } = tickerValue;
        if (typeof value === 'string') {
            return value;
        }
        return tickerValue;
    }
}

function compareTickerValues(a, b) {
    const tickerA = getTickerFromRowInfo(a);
    const tickerB = getTickerFromRowInfo(b);
    return compare(tickerA, tickerB);
}


//
//
function getNameFromRowInfo(rowInfo) {
    const { nameValue } = rowInfo;
    if (nameValue) {
        const { name } = nameValue;
        if (typeof name === 'string') {
            return name;
        }
        return nameValue;
    }
}

function compareNameValues(a, b) {
    const nameA = getNameFromRowInfo(a);
    const nameB = getNameFromRowInfo(b);
    return compare(nameA, nameB);
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
function getPercentOfTotal(rowInfo, topLevelRowInfo) {
    const { accountGainsState, } = rowInfo;
    if (!accountGainsState || !topLevelRowInfo) {
        return;
    }

    const totalAccountGainsState = topLevelRowInfo.accountGainsState;
    if (!totalAccountGainsState) {
        return;
    }

    if (!totalAccountGainsState.gainTotals.marketValueBaseValue) {
        return;
    }

    let totalCurrency = topLevelRowInfo.currency;
    let itemCurrency = rowInfo.currency;
    if (totalCurrency !== itemCurrency) {
        return;
    }

    const quantityDefinition = totalCurrency.getQuantityDefinition();
    const totalValue = quantityDefinition.baseValueToNumber(
        totalAccountGainsState.gainTotals.marketValueBaseValue);
    const thisValue = quantityDefinition.baseValueToNumber(
        accountGainsState.gainTotals.marketValueBaseValue);
    const percent = 100. * thisValue / totalValue;
    return percent;
}

function comparePercentOfTotal(rowInfoA, rowInfoB) {
    const percentA = rowInfoA.percentOfTotal;
    const percentB = rowInfoB.percentOfTotal;
    return compare(percentA, percentB);
}


//
//
function keyToRank(key) {
    if (typeof key === 'string') {
        if (key === '_SUMMARY_') {
            return 10;
        }
    }

    return 0;
}


//
//
function baseCompare(argsA, argsB, sign, compare) {
    const rowInfoA = argsA.rowInfo;
    const rowInfoB = argsB.rowInfo;
    let rankA = keyToRank(rowInfoA.key);
    let rankB = keyToRank(rowInfoB.key);
    if (rankA !== rankB) {
        return (rankA - rankB) * sign;
    }
    return compare(rowInfoA, rowInfoB, argsA.caller);
}


let columnInfoDefs;

function getPricedItemsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'M-0';
        const inputClassExtras = 'Text-center';

        columnInfoDefs = {
            ticker: { key: 'ticker',
                header: {
                    label: userMsg('PricedItemsList-ticker'),
                    ariaLabel: 'Ticker Symbol',
                },
                propertyName: 'ticker',
                cellClassName: cellClassName + ' Text-left',
                inputSize: -6,
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareTickerValues(a, b, sign)),
            },
            name: { key: 'name',
                header: {
                    label: userMsg('PricedItemsList-name'),
                    ariaLabel: 'Name',
                    classExtras: 'Text-left',
                },
                propertyName: 'name',
                cellClassName: cellClassName + ' Text-left W-40',
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareNameValues(a, b, sign)),
            },
            description: { key: 'description',
                header: {
                    label: userMsg('PricedItemsList-description'),
                    ariaLabel: 'Description',
                    classExtras: 'Text-left',
                },
                propertyName: 'description',
                cellClassName: cellClassName,
            },
            currency: { key: 'currency',
                header: {
                    label: userMsg('PricedItemsList-currency'),
                    ariaLabel: 'Currency',
                },
                propertyName: 'currency',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -4,
            },
            quantityDefinition: { key: 'quantityDefinition',
                header: {
                    label: userMsg('PricedItemsList-quantityDefinition'),
                    ariaLabel: 'Quantity Definition',
                },
                propertyName: 'quantityDefinition',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -10,
            },
            onlineSource: { key: 'onlineSource',
                header: {
                    label: userMsg('PricedItemsList-onlineSource'),
                    ariaLabel: 'Online Source',
                },
                propertyName: 'onlineSource',
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                inputSize: -12,
            },

            percentOfTotal: { key: 'percentOfTotal',
                header: {
                    label: userMsg('PricedItemsList-percentOfTotal_column_label'),
                    ariaLabel: 'Percent of Root Account',
                    classExtras: 'RowTable-header-base Percent-base Percent-header',
                },
                inputClassExtras: 'Percent-base Percent-input',
                cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => comparePercentOfTotal(a, b)),
            },

            totalMarketValue: LCE.getTotalMarketValueColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'marketValueBaseValue')),
            }),

            totalShares: LCE.getTotalSharesColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareShares(a, b, sign)),
            }),

            totalCostBasis: LCE.getTotalCostBasisColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'costBasisBaseValue')),
            }),

            totalCashIn: LCE.getTotalCashInColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'cashInBaseValue')),
            }),

            totalGain: LCE.getTotalGainColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(a, b, 'totalGainValue')),
            }),

            totalCashInGain: LCE.getTotalCashInGainColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(a, b, 'totalCashInGainValue')),
            }),

            totalPercentGain: LCE.getTotalSimplePercentGainColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(a, b, 'totalPercentGainValue')),
            }),

            totalCashInPercentGain: LCE.getTotalCashInPercentGainColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(a, b, 'totalCashInPercentGainValue')),
            }),

            totalAnnualPercentGain: LCE.getTotalAnnualPercentGainColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareGainBaseValues(a, b, 'totalAnnualPercentGainValue')),
            }),

            totalAnnualCashInPercentGain: 
                LCE.getTotalAnnualCashInPercentGainColumnInfo({
                    sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                        (a, b) => compareGainBaseValues(a, b, 
                            'totalAnnualCashInPercentGainValue')),
                }),
        };
    }

    return columnInfoDefs;
}


function markColumnVisible(columns, key) {
    const column = getColumnWithKey(columns, key);
    if (column) {
        column.isVisible = true;
    }
}

/**
 * Retrieves the priced item list columns with default settings.
 */
export function createDefaultColumns(pricedItemType) {
    pricedItemType = PI.getPricedItemType(pricedItemType);

    const columnInfoDefs = getPricedItemsListColumnInfoDefs();
    const columnInfos = [];
    if (pricedItemType.hasTickerSymbol) {
        columnInfos.push(columnInfoDefs.ticker);
        columnInfos.push(columnInfoDefs.name);
        columnInfos.push(columnInfoDefs.totalShares);
        columnInfos.push(columnInfoDefs.totalCostBasis);
        columnInfos.push(columnInfoDefs.totalCashIn);
        columnInfos.push(columnInfoDefs.totalMarketValue);
        columnInfos.push(columnInfoDefs.totalGain);
        columnInfos.push(columnInfoDefs.totalCashInGain);
        columnInfos.push(columnInfoDefs.totalPercentGain);
        columnInfos.push(columnInfoDefs.totalCashInPercentGain);
        columnInfos.push(columnInfoDefs.totalAnnualPercentGain);
        columnInfos.push(columnInfoDefs.totalAnnualCashInPercentGain);        
        columnInfos.push(columnInfoDefs.percentOfTotal);

        columnInfos.push(columnInfoDefs.onlineSource);
        columnInfos.push(columnInfoDefs.currency);
        columnInfos.push(columnInfoDefs.quantityDefinition);
    }
    else {
        columnInfos.push(columnInfoDefs.name);
        columnInfos.push(columnInfoDefs.totalMarketValue);

        columnInfos.push(columnInfoDefs.currency);
        columnInfos.push(columnInfoDefs.quantityDefinition);
    }

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });


    if (pricedItemType.hasTickerSymbol) {
        markColumnVisible(columns, 'ticker');
    }
    markColumnVisible(columns, 'name');

    markColumnVisible(columns, 'totalMarketValue');
    markColumnVisible(columns, 'totalShares');
    markColumnVisible(columns, 'totalCostBasis');
    markColumnVisible(columns, 'totalGain');
    markColumnVisible(columns, 'percentOfTotal');

    return columns;
}


let columnInfoComparators;

function getPricedItemsListColumnComparators() {
    if (!columnInfoComparators) {
        const columnInfos = getPricedItemsListColumnInfoDefs();
        columnInfoComparators = columnInfosToMultiComparators(
            Object.values(columnInfos)
        );
    }

    return columnInfoComparators;
}


/**
 * Component for displaying a list of priced items.
 */
export class PricedItemsList extends React.Component {
    constructor(props) {
        super(props);

        this.onPricedItemAdd = this.onPricedItemAdd.bind(this);
        this.onPricedItemModify = this.onPricedItemModify.bind(this);
        this.onPricedItemRemove = this.onPricedItemRemove.bind(this);

        this.accountIdsUpdated = this.accountIdsUpdated.bind(this);
        this.onAccountAdd = this.accountIdsUpdated;
        this.onAccountsModify = this.onAccountsModify.bind(this);
        this.onAccountRemove = this.accountIdsUpdated;

        this.onPricesChange = this.onPricesChange.bind(this);

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        this._asyncLoadAccountStateInfos = this._asyncLoadAccountStateInfos.bind(this);

        this.renderAsStringTable = this.renderAsStringTable.bind(this);

        this._multiCompare = new MultiCompare(getPricedItemsListColumnComparators());
        this._multiCompare.setCompareOrder(props.columnSorting);


        const { pricedItemTypeName, collapsedPricedItemIds } = this.props;

        this._hiddenPricedItemIds = new Set(this.props.hiddenPricedItemIds);

        this.state = {
            rowInfos: [],
            rowInfosChangeId: 0,

            rowInfosByKey: new Map(),

            columnKeys: new Set(),

            accountStateInfosByAccountId: new Map(),
            accountStateInfosByPricedItemId: new Map(),

            accountStateInfoLoadingInfo: {
                rowInfosChangeId: 0,
                ymdDate: props.pricesYMDDate,
            },
            loadedAccountStateInfo: {
                rowInfosChangeId: 0,
                ymdDate: props.pricesYMDDate,
            },


            accountIdsByPricedItemId: new Map(),
            pricesByPricedItemId: new Map(),
        };

        this._collapsedRowIds = new Set(collapsedPricedItemIds);

        this.state = Object.assign(this.state, this.buildRowInfos());

        if (this.state.rowInfos.length) {
            this.state.activeRowKey = this.state.rowInfos[0].key;
        }

        const { accessor } = props;

        this._sizingRowEntry = {
            pricedItemDataItem: {
                id: this.props.accessor.getBaseCurrencyPricedItemId(),
                name: userMsg('PricedItemsList-dummy_name'),
                description: userMsg('PricedItemsList-dummy_description'),
                type: pricedItemTypeName,
                onlineUpdateType: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
                ticker: 'WWWW',
                accountState: {
                    quantityBaseValue: ACE.BalanceSizingBaseValue,
                },
                quantityDefinition: accessor.getDefaultSharesQuantityDefinition(),
            },
            accountState: {
                quantityBaseValue: ACE.BalanceSizingBaseValue,
            },
            quantityDefinition: getQuantityDefinitionName(
                accessor.getDefaultSharesQuantityDefinition(),
            ),
        };

        this._percentSuffix = userMsg('AccountsList-percentSuffix');
    }


    onPricedItemAdd(result) {
        if (this.isPricedItemIdDisplayed(result.newPricedItemDataItem.id)) {
            this.rebuildRowInfos();
        }
    }

    
    onPricedItemModify(result) {
        const { id } = result.newPricedItemDataItem;
        for (let rowEntry of this.state.rowInfos) {
            if (rowEntry.pricedItemDataItem.id === id) {
                this.rebuildRowInfos();
                return;
            }
        }
    }


    onPricedItemRemove(result) {
        const { id } = result.removedPricedItemDataItem;
        for (let rowEntry of this.state.rowInfos) {
            if (rowEntry.pricedItemDataItem.id === id) {
                this.rebuildRowInfos();
                return;
            }
        }
    }


    componentDidMount() {
        this.props.accessor.on('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.on('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.on('pricedItemRemove', this.onPricedItemRemove);

        this.props.accessor.on('accountAdd', this.onAccountAdd);
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.props.accessor.on('accountRemove', this.onAccountRemove);

        this.props.accessor.on('pricesAdd', this.onPricesChange);
        this.props.accessor.on('pricesRemove', this.onPricesChange);

        this.accountIdsUpdated();

        this.reloadAccountStateInfos();
    }

    componentWillUnmount() {
        this.props.accessor.off('pricesAdd', this.onPricesChange);
        this.props.accessor.off('pricesRemove', this.onPricesChange);

        this.props.accessor.off('accountAdd', this.onAccountAdd);
        this.props.accessor.off('accountsModify', this.onAccountsModify);
        this.props.accessor.off('accountRemove', this.onAccountRemove);

        this.props.accessor.off('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.off('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.off('pricedItemRemove', this.onPricedItemRemove);
    }


    componentDidUpdate(prevProps, prevState) {
        let { rowsNeedUpdating } = this.state;
        const { props } = this;
        const { hiddenPricedItemIds, 
            showHiddenPricedItems,
            showInactivePricedItems } = props;
        
        this._hasNameColumn = this.state.columnKeys.has('name');

        if (!deepEqual(prevProps.hiddenPricedItemIds, hiddenPricedItemIds)) {
            this._hiddenPricedItemIds = new Set(hiddenPricedItemIds);
            rowsNeedUpdating = true;
        }

        rowsNeedUpdating |= (prevProps.showHiddenPricedItems !== showHiddenPricedItems);
        rowsNeedUpdating 
            |= (prevProps.showInactivePricedItems !== showInactivePricedItems);

        rowsNeedUpdating
            |= (prevProps.showAccounts !== props.showAccounts);
        rowsNeedUpdating
            |= (prevProps.showHiddenAccounts !== props.showHiddenAccounts);
        rowsNeedUpdating
            |= (prevProps.showInactiveAccounts !== props.showInactiveAccounts);

        rowsNeedUpdating
            |= (prevProps.sortAlphabetically !== props.sortAlphabetically);

        if (!rowsNeedUpdating) {
            if (!deepEqual(prevState.accountIdsByPricedItemId,
                this.state.accountIdsByPricedItemId)) {
                rowsNeedUpdating = true;
            }
        }

        if (!deepEqual(prevProps.collapsedPricedItemIds, 
            props.collapsedPricedItemIds)) {
            this._collapsedRowIds = new Set(props.collapsedPricedItemIds);
            rowsNeedUpdating = true;
        }

        let sortingNeedsUpdating = !deepEqual(props.columnSorting,
            prevProps.columnSorting);
        if (sortingNeedsUpdating) {
            this._multiCompare.setCompareOrder(props.columnSorting);
        }

        if (!deepEqual(prevProps.columns, props.columns)) {
            const { columns } = props;
            if (columns) {
                // columnKeys is used to add tooltip info to the name/ticker items
                // depending on whether a description or name column is showing.
                const columnKeys = new Set();
                columns.forEach((column) => columnKeys.add(column.key));

                this.setState({
                    columnKeys: columnKeys,
                });
            }
        }

        if (!rowsNeedUpdating) {
            rowsNeedUpdating = !deepEqual(this.state.accountIdsByPricedItemId,
                prevState.accountIdsByPricedItemId);
        }

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;

            const result = this.buildRowInfos();
            result.rowsNeedUpdating = false;
            this.setState(result);

            if (prevActiveRowKey !== result.activeRowKey) {
                let activeRowInfo;
                if (result.activeRowKey) {
                    activeRowInfo = result.rowInfosByKey.get(result.activeRowKey);
                }
                this.onSelectItem(activeRowInfo);
            }
        }

        if ((props.pricesYMDDate !== prevProps.pricesYMDDate)
         || (this.state.rowInfosChangeId 
          !== this.state.accountStateInfoLoadingInfo.rowInfosChangeId)) {
            sortingNeedsUpdating = false;
            this.reloadAccountStateInfos();
        }

        if (sortingNeedsUpdating) {
            this.updateRowInfoSorting();
        }
    }


    reloadAccountStateInfos() {
        const { state, props } = this;
        const { rowInfosChangeId, accountStateInfoLoadingInfo } = state;
        const { pricesYMDDate, } = props;

        if ((rowInfosChangeId !== accountStateInfoLoadingInfo.rowInfosChangeId)
         || (pricesYMDDate !== accountStateInfoLoadingInfo.ymdDate)) {
            this.setState({
                accountStateInfoLoadingInfo: {
                    rowInfosChangeId: rowInfosChangeId,
                    ymdDate: pricesYMDDate,
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

        let { ymdDate } = accountStateInfoLoadingInfo;
        if (ymdDate) {
            accountStateDataItems = await accessor.asyncGetAccountStateForDate(
                allAccountIds,
                ymdDate,
            );
        }
        else {
            ymdDate = (new YMDDate()).toString();
        }


        if (!accountStateDataItems) {
            accountStateDataItems = allAccountIds.map((accountId) =>
                accessor.getCurrentAccountStateDataItem(accountId));
        }

        // We only need priceDataItems for account states that have lots.
        const accountIdIndicesByPriceDataItemId = new Map();
        for (let i = 0; i < allAccountIds.length; ++i) {
            const accountStateDataItem = accountStateDataItems[i];
            if (!accountStateDataItem) {
                continue;
            }

            const accountStateInfo = allAccountStateInfos[i];
            const { accountDataItem } = accountStateInfo;
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
                ymdDate: ymdDate,
                refYMDDate: ymdDate,
            });

            const allAccountIdIndices 
                = Array.from(accountIdIndicesByPriceDataItemId.values());
            for (let i = 0; i < pricedItemIds.length; ++i) {
                const accountIdIndices = allAccountIdIndices[i];
                accountIdIndices.forEach((index) => {
                    allAccountStateInfos[index].priceDataItem = priceDataItems[i];
                });
            }
        }

        for (let i = 0; i < allAccountIds.length; ++i) {
            const accountStateInfo = allAccountStateInfos[i];
            const { accountDataItem } = accountStateInfo;
            const args = {
                accessor: accessor,
                accountId: allAccountIds[i],
                accountState: accountStateDataItems[i],
                priceDataItem: accountStateInfo.priceDataItem,
                isExcludeFromGain: accountDataItem.isExcludeFromGain,
                isQuantityShares: true,
            };

            accountStateInfo.accountGainsState = GH.accountStateToAccountGainsState(args);
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

        const compare = (a, b) => this._multiCompare.compare(
            { rowInfo: a, caller: this, },
            { rowInfo: b, caller: this, });

        const { rowInfos } = state;
        const sortedRowInfos = [];

        rowInfos.forEach((rowInfo) => {
            rowInfo = Object.assign({}, rowInfo, {
                childRowInfos: sortRowInfos(rowInfo.childRowInfos, compare),
            });
            sortedRowInfos.push(rowInfo);
        });

        sortedRowInfos.sort(compare);

        this.setState({
            sortedRowInfos: sortedRowInfos,
        });
    }


    accountIdsUpdated() {
        this.setState({
            accountIdsByPricedItemId: 
                AH.getAccountIdsByPricedItemId(this.props.accessor),
        });
    }


    onAccountsModify(result) {
        this.accountIdsUpdated();
        this.setState({
            rowsNeedUpdating: true,
        });
    }


    onPricesChange() {
        this.setState((state) => {
            return {
                rowInfosChangeId: state.accountStateInfoLoadingInfo.rowInfosChangeId + 1,
            };
        });
    }


    buildRowInfos(state) {
        state = state || this.state;

        const rowInfos = [];
        const accountStateInfosByAccountId = new Map();

        const { accessor, pricedItemTypeName, 
            sortAlphabetically, 
        } = this.props;
        let pricedItemIds = accessor.getPricedItemIdsForType(pricedItemTypeName);

        if (sortAlphabetically) {
            const pricedItemDataItems = pricedItemIds.map((id) => 
                accessor.getPricedItemDataItemWithId(id));
            
            const sorter = (PI.PricedItemType[pricedItemTypeName].hasTickerSymbol)
                ? (a, b) => (a.ticker || a.name).localeCompare(b.ticker || b.name)
                : (a, b) => (a.name || '').localeCompare(b.name || '');
            pricedItemDataItems.sort(sorter);

            pricedItemIds = pricedItemDataItems.map((pricedItemDataItem) => 
                pricedItemDataItem.id);
        }

        const addArgs = {
            state: state,
            rowInfos: rowInfos,
            accountStateInfosByAccountId: accountStateInfosByAccountId,
        };
        pricedItemIds.forEach((id) => {
            addArgs.pricedItemId = id;
            this.addPricedItemIdToRowEntries(addArgs);
        });


        const summaryRowInfo = {
            key: '_SUMMARY_',
            expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
            currency: accessor.getCurrencyOfAccountId(
                accessor.getRootAssetAccountId()),
        };
        rowInfos.push(summaryRowInfo);

        let { activeRowKey } = state;
        let newActiveRowKey;
        if (activeRowKey) {
            // Make sure the active row key is still valid.
            if (findRowInfoWithKey(rowInfos, activeRowKey)) {
                newActiveRowKey = activeRowKey;
            }
        }

        const rowInfosByKey = new Map();
        rowInfos.forEach((rowInfo) => {
            rowInfosByKey.set(rowInfo.key, rowInfo);
            const { childRowInfos } = rowInfo;
            if (childRowInfos) {
                childRowInfos.forEach((rowInfo) => {
                    rowInfosByKey.set(rowInfo.key, rowInfo);
                });
            }
        });

        return {
            rowInfos: rowInfos,
            summaryRowInfo: summaryRowInfo,
            rowInfosChangeId: state.rowInfosChangeId + 1,
            accountStateInfosByAccountId: accountStateInfosByAccountId,
            rowInfosByKey: rowInfosByKey,
            activeRowKey: newActiveRowKey,
        };
    }


    isIncludeAccountDataItem(accountDataItem) {
        const { showHiddenAccounts, showInactiveAccounts } = this.props;
        if (showHiddenAccounts && showInactiveAccounts) {
            return true;
        }

        while (accountDataItem) {
            if (accountDataItem.isHidden && !showHiddenAccounts) {
                return;
            }
            if (accountDataItem.isInactive && !showInactiveAccounts) {
                return;
            }

            accountDataItem = this.props.accessor.getAccountDataItemWithId(
                accountDataItem.parentAccountId);
        }

        return true;
    }


    addPricedItemIdToRowEntries({state, rowInfos, pricedItemId, 
        accountStateInfosByAccountId, }) {

        if (!this.isPricedItemIdDisplayed(pricedItemId)) {
            return;
        }

        const { accessor, showAccounts } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);

        const key = pricedItemDataItem.id;
        const isCollapsed = this._collapsedRowIds.has(key);

        const { accountIdsByPricedItemId } = state;
        let expandCollapseState = ExpandCollapseState.NO_EXPAND_COLLAPSE;
        const accountIds = accountIdsByPricedItemId.get(pricedItemId);
        if (accountIds && accountIds.length && showAccounts) {
            expandCollapseState = (isCollapsed)
                ? ExpandCollapseState.COLLAPSED
                : ExpandCollapseState.EXPANDED;
        }

        const rowInfo = {
            key: key,
            expandCollapseState: expandCollapseState,
            pricedItemDataItem: pricedItemDataItem,
            pricedItemId: pricedItemId,
            accountIds: accountIds,
            currency: accessor.getCurrencyOfPricedItemId(pricedItemId),
        };

        if (this._hasNameColumn) {
            rowInfo.tickerValue = pricedItemDataItem.ticker;
        }
        else {
            rowInfo.tickerValue = {
                value: pricedItemDataItem.ticker,
                tooltip: pricedItemDataItem.name,
            };
        }

        let { name, description } = pricedItemDataItem;
        if (!name) {
            rowInfo.nameValue = description;
        }
        else {
            rowInfo.nameValue = {
                name: name,
                description: description,
            };
        }

        rowInfos.push(rowInfo);

        if (accountIds) {
            let childRowInfos;

            if (showAccounts) {
                childRowInfos = [];
                rowInfo.childRowInfos = childRowInfos;
            }

            accountIds.forEach((accountId) => {
                const accountDataItem = accessor.getAccountDataItemWithId(accountId);
                if (!this.isIncludeAccountDataItem(accountDataItem)) {
                    return;
                }

                let childRowInfo;
                if (childRowInfos) {
                    childRowInfo = {
                        key: 'AccountId_' + accountId,
                        expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                        accountDataItem: accountDataItem,
                        nameValue: AH.getShortAccountAncestorNames(accessor,
                            accountDataItem.id),
                    };

                    childRowInfos.push(childRowInfo);
                }

                const accountStateInfo = this.createAccountStateInfo(
                    accountId, childRowInfo);
                accountStateInfosByAccountId.set(accountId,
                    accountStateInfo);
            });

            if (childRowInfos && this.props.sortAlphabetically) {
                childRowInfos.sort((a, b) =>
                    a.accountDataItem.name.localeCompare(b.accountDataItem.name));
            }
        }
    }


    createAccountStateInfo(accountId, rowInfo) {
        const { accessor, pricesYMDDate, } = this.props;

        const accountStateInfo = {
            rowInfo: rowInfo,
            accountDataItem: accessor.getAccountDataItemWithId(accountId),
        };
        if (!pricesYMDDate) {
            accountStateInfo.accountState 
                = accessor.getCurrentAccountStateDataItem(accountId);
        }

        return accountStateInfo;
    }


    isPricedItemIdDisplayed(pricedItemId) {
        const { showHiddenPricedItems, showInactivePricedItems } = this.props;
        if (!showHiddenPricedItems && this._hiddenPricedItemIds.has(pricedItemId)) {
            return false;
        }
        
        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);
        if (!pricedItemDataItem) {
            return false;
        }

        if (pricedItemDataItem.isStandardCurrency) {
            return false;
        }

        if (!showInactivePricedItems && pricedItemDataItem.isInactive) {
            return false;
        }

        return true;
    }


    rebuildRowInfos() {
        this.setState((state) => this.buildRowInfos(state));
    }


    updateRootRowInfoAccountStates() {
        const { state } = this;
        const { rowInfos } = state;

        const { summaryRowInfo } = state;
        if (summaryRowInfo) {
            summaryRowInfo.accountGainsState = undefined;
        }

        let summaryAccountGainsState;

        rowInfos.forEach((rowInfo) => {
            this.updatePricedItemRowInfoAccountStates(rowInfo);

            summaryAccountGainsState = GH.addAccountGainsState(
                summaryAccountGainsState,
                rowInfo.accountGainsState,
            );
        });

        if (summaryRowInfo) {
            summaryRowInfo.accountGainsState = summaryAccountGainsState;
        }

        rowInfos.forEach((rowInfo) => {
            this.updateRowInfoCalculateds(state, rowInfo, summaryRowInfo);
        });
    }


    updatePricedItemRowInfoAccountStates(rowInfo) {
        const { accountStateInfosByAccountId } = this.state;
        const { accountIds, childRowInfos } = rowInfo;
        if (!accountIds) {
            return;
        }

        let pricedItemAccountGainsState;
        if (childRowInfos) {
            childRowInfos.forEach((rowInfo) => {
                const accountId = rowInfo.accountDataItem.id;
                const accountStateInfo = accountStateInfosByAccountId.get(accountId);
                if (!accountStateInfo) {
                    rowInfo.accountGainsState = undefined;
                    return;
                }
                rowInfo.accountGainsState = accountStateInfo.accountGainsState;

                pricedItemAccountGainsState = GH.addAccountGainsState(
                    pricedItemAccountGainsState,
                    accountStateInfo.accountGainsState);
            });
        }
        else {
            accountIds.forEach((accountId) => {
                const accountStateInfo = accountStateInfosByAccountId.get(accountId);
                if (!accountStateInfo) {
                    return;
                }

                pricedItemAccountGainsState = GH.addAccountGainsState(
                    pricedItemAccountGainsState,
                    accountStateInfo.accountGainsState);
            });
        }


        rowInfo.accountGainsState = pricedItemAccountGainsState;
    }



    updateRowInfoCalculateds(state, rowInfo, topLevelRowInfo) {
        rowInfo.percentOfTotal = getPercentOfTotal(rowInfo, topLevelRowInfo);


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

            const { onUpdateCollapsedPricedItemIds } = this.props;
            if (onUpdateCollapsedPricedItemIds) {
                onUpdateCollapsedPricedItemIds({
                    pricedItemId: rowInfo.key,
                    expandCollapseState: expandCollapseState,
                    collapsedPricedItemIds: Array.from(this._collapsedRowIds.values()),
                });
            }

            return {
                rowInfos: updateRowInfo(state.rowInfos, rowInfo),
            };
        }, 
        () => {
        });
    }


    buildOnItemArgs(rowInfo) {
        const args = {};
        if (rowInfo) {
            if (rowInfo.pricedItemDataItem) {
                args.pricedItemId = rowInfo.pricedItemDataItem.id;
            }

            if (rowInfo.accountDataItem) {
                args.accountId = rowInfo.accountDataItem.id;
            }
        }

        return args;
    }


    onSelectItem(rowInfo) {
        const { onSelectItem } = this.props;
        if (onSelectItem) {
            const args = this.buildOnItemArgs(rowInfo);
            onSelectItem(args);
        }
    }


    onActivateRow({ rowInfo }) {
        const activeRowKey = (rowInfo) ? rowInfo.key : undefined;
        this.setState({
            activeRowKey: activeRowKey,
        });

        this.onSelectItem(rowInfo);
    }


    onOpenActiveRow({rowIndex}) {
        const { activeRowKey, rowInfosByKey } = this.state;
        const rowInfo = rowInfosByKey.get(activeRowKey);
        if (rowInfo) {
            const { onChooseItem } = this.props;
            if (onChooseItem) {
                const args = this.buildOnItemArgs(rowInfo);
                onChooseItem(args);
            }
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


    renderName(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { nameValue } = rowInfo;
        return ACE.renderNameDisplay({
            columnInfo: columnInfo,
            value: nameValue,
            renderAsText: renderAsText,
        });
    }


    renderDescription(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            return ACE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.description,
                renderAsText: renderAsText,
            });
        }
    }


    renderCurrency(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            let { currency } = pricedItemDataItem;
            if (!currency) {
                // Base currency...
                const { accessor } = this.props;
                currency = userMsg('PricedItemsList-default_currency', 
                    accessor.getBaseCurrencyCode());
            }
            return ACE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: currency,
                renderAsText: renderAsText,
            });
        }
    }


    renderQuantityDefinition(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            const quantityDefinition 
                = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
            if (quantityDefinition) {
                return ACE.renderTextDisplay({
                    columnInfo: columnInfo, 
                    value: quantityDefinition.getDisplayText(),
                    renderAsText: renderAsText,
                });
            }
        }
    }


    renderTicker(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { tickerValue } = rowInfo;
        return ACE.renderTextDisplay({
            columnInfo: columnInfo, 
            value: tickerValue,
            renderAsText: renderAsText,
        });
    }


    renderOnlineSource(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, renderAsText } = args;

        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            const onlineUpdateType = PI.getPricedItemOnlineUpdateType(
                pricedItemDataItem.onlineUpdateType);
            if (onlineUpdateType) {
                return ACE.renderTextDisplay({
                    columnInfo: columnInfo, 
                    value: onlineUpdateType.description,
                    renderAsText: renderAsText,
                });
            }
        }
    }


    columnInfoFromRenderArgs(renderArgs) {
        let { columnInfo, rowInfo } = renderArgs;
        if (!rowInfo.pricedItemId && !rowInfo.accountDataItem) {
            columnInfo = Object.assign({}, columnInfo);
            columnInfo.inputClassExtras
                += ' PricedItemsList-subtotal PricedItemsList-subtotal-value';
        }
        else if (!rowInfo.accountGainsState) {
            columnInfo = Object.assign({}, columnInfo, {
                inputClassExtras: (columnInfo.inputClassExtras || '')
                    + ' PricedItemsList-too-young',
            });
        }

        return columnInfo;
    }


    renderTotalMarketValue(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;
        if (accountGainsState) {
            const quantityValue = {
                quantityBaseValue: accountGainsState.overallTotals.marketValueBaseValue,
                quantityDefinition: this.props.accessor.getCurrencyOfPricedItemId(
                    pricedItemId
                ).getQuantityDefinition(),
            };

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
                renderAsText: args.renderAsText,
            });
        }
    }


    renderTotalShares(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;
        let { pricedItemDataItem } = rowInfo;
        pricedItemDataItem = pricedItemDataItem 
            || this.props.accessor.getPricedItemDataItemWithId(pricedItemId);

        if (pricedItemDataItem && accountGainsState) {
            return LCE.renderTotalSharesDisplay({
                columnInfo: columnInfo,
                value: {
                    quantityBaseValue: accountGainsState.quantityBaseValue,
                    quantityDefinition: pricedItemDataItem.quantityDefinition,
                },
                renderAsText: args.renderAsText,
            });
        }

    }


    renderTotalCostBasis(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;
        if (accountGainsState) {
            const quantityValue = {
                quantityBaseValue: accountGainsState.overallTotals.costBasisBaseValue,
                quantityDefinition: this.props.accessor.getCurrencyOfPricedItemId(
                    pricedItemId
                ).getQuantityDefinition(),
            };

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
                renderAsText: args.renderAsText,
            });
        }
    }


    renderTotalCashIn(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;
        if (accountGainsState) {
            const quantityValue = {
                quantityBaseValue: accountGainsState.overallTotals.cashInBaseValue,
                quantityDefinition: this.props.accessor.getCurrencyOfPricedItemId(
                    pricedItemId
                ).getQuantityDefinition(),
            };

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
                renderAsText: args.renderAsText,
            });
        }
    }


    renderGainDisplay(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);

        const { rowInfo, gainProperty, suffix } = args;
        const value = rowInfo[gainProperty];
        if (value) {
            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: value,
                suffix: suffix,
                renderAsText: args.renderAsText,
            });
        }
    }


    renderPercentOfTotal(args) {
        const { rowInfo, } = args;
        const { percentOfTotal } = rowInfo;
        if (percentOfTotal !== undefined) {
            const percentQuantityDefinition 
                = this.props.accessor.getPercentGainQuantityDefinition();

            const value = {
                quantityBaseValue: percentQuantityDefinition.numberToBaseValue(
                    percentOfTotal),
                quantityDefinition: percentQuantityDefinition,
            };

            const columnInfo = this.columnInfoFromRenderArgs(args);
            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: value,
                suffix: this._percentSuffix,
                renderAsText: args.renderAsText,
            });
        }
    }


    onRenderCell({ rowInfo, columnIndex, isSizeRender, renderAsText, }) {

        const { columnInfo } = this.props.columns[columnIndex];

        const args = {
            columnInfo: columnInfo,
            rowInfo: rowInfo,
            renderAsText: renderAsText,
        };

        if (isSizeRender) {
            args.pricedItemDataItem = this._sizingRowEntry.pricedItemDataItem;
            args.accountState = this._sizingRowEntry.accountState;
            args.quantityDefinition = this._sizingRowEntry.quantityDefinition;
        }

        switch (columnInfo.key) {
        case 'name' :
            return this.renderName(args);
        
        case 'description' :
            return this.renderDescription(args);
        
        case 'currency' :
            return this.renderCurrency(args);
        
        case 'quantityDefinition' :
            return this.renderQuantityDefinition(args);
        
        case 'ticker' :
            return this.renderTicker(args);
        
        case 'onlineSource' :
            return this.renderOnlineSource(args);
        
        case 'totalMarketValue' :
            return this.renderTotalMarketValue(args);
        
        case 'totalShares' :
            return this.renderTotalShares(args);
        
        case 'totalCostBasis' :
            return this.renderTotalCostBasis(args);

        case 'totalCashIn' :
            return this.renderTotalCashIn(args);

        case 'totalGain' :
            args.gainProperty = 'totalGainValue';
            return this.renderGainDisplay(args);

        case 'totalCashInGain' :
            args.gainProperty = 'totalCashInGainValue';
            return this.renderGainDisplay(args);

        case 'totalPercentGain' :
            args.gainProperty = 'totalPercentGainValue';
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalCashInPercentGain' :
            args.gainProperty = 'totalCashInPercentGainValue';
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalAnnualPercentGain' :
            args.gainProperty = 'totalAnnualPercentGainValue';
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalAnnualCashInPercentGain' :
            args.gainProperty = 'totalAnnualCashInPercentGainValue';
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);
        
        case 'percentOfTotal' :
            return this.renderPercentOfTotal(args);

        }
    }


    render() {
        const { props, state } = this;
        
        let rowClassExtras;
        if (!props.showRowBorders) {
            rowClassExtras = 'No-border';
        }

        return <div className="RowTableContainer PricedItemsList">
            <CollapsibleRowTable
                columns = { props.columns }
                rowInfos = {state.sortedRowInfos || state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell={this.onRenderCell}

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
 * @typedef {object} PricedItemsList~onSelectItemArgs
 * @property {number|undefined} [pricedItemId]
 * @property {number|undefined} [accountId]
 */

/**
 * @callback PricedItemsList~onSelectItem
 * @param {PricedItemsList~onSelectItemArgs}  args
 */

/**
 * @callback PricedItemsList~onChooseItem
 * @param {PricedItemsList~onSelectItemArgs}  args
 */


/**
 * @typedef {object} PricedItemsList~propTypes
 * @property {EngineAccessor}   accessor
 * @property {PricedItemsList~onSelectItem} [onSelectItem]   
 * Called when an item is selected.
 * @property {PricedItemsList~onChooseItem} [onChooseItem]   
 * Called when an pricedItem is 'chosen', either double-clicked or enter is pressed.
 */
PricedItemsList.propTypes = {
    accessor: PropTypes.object.isRequired,
    pricedItemTypeName: PropTypes.string.isRequired,

    pricesYMDDate: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),

    onSelectItem: PropTypes.func,
    onChooseItem: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,

    columns: PropTypes.arrayOf(PropTypes.object),
    columnSorting: PropTypes.arrayOf(PropTypes.object),
    onColumnSortingChange: PropTypes.func,
    onSetColumnWidth: PropTypes.func,
    onMoveColumn: PropTypes.func,

    hiddenPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenPricedItems: PropTypes.bool,
    showInactivePricedItems: PropTypes.bool,
    showPricedItemIds: PropTypes.bool,

    sortAlphabetically: PropTypes.bool,
    showRowBorders: PropTypes.bool,

    showAccounts: PropTypes.bool,
    showHiddenAccounts: PropTypes.bool,
    showInactiveAccounts: PropTypes.bool,

    collapsedPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    onUpdateCollapsedPricedItemIds: PropTypes.func,

    header: PropTypes.any,
    children: PropTypes.any,
    id: PropTypes.string,
};
