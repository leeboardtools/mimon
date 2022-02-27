import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import * as A from '../engine/Accounts';
import deepEqual from 'deep-equal';
import { YMDDate } from '../util/YMDDate';
import { getQuantityDefinition, } from '../util/Quantities';
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
import { sortRowInfos } from '../util-ui/RowTableHelpers';
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
function getPriceClose(rowInfo) {
    if (rowInfo) {
        const { accountGainsState, } = rowInfo;
        if (accountGainsState) {
            const { priceDataItem } = accountGainsState;
            if (priceDataItem) {
                return priceDataItem.close;
            }
        }
    }
}

function comparePrices(rowInfoA, rowInfoB) {
    const priceValueA = getPriceClose(rowInfoA);
    const priceValueB = getPriceClose(rowInfoB);
    return compare(priceValueA, priceValueB);
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

    if (!totalAccountGainsState.overallTotals.marketValueBaseValue) {
        return;
    }

    let totalCurrency = topLevelRowInfo.currency;
    let itemCurrency = rowInfo.currency;
    if (totalCurrency !== itemCurrency) {
        return;
    }

    const quantityDefinition = totalCurrency.getQuantityDefinition();
    const totalValue = quantityDefinition.baseValueToNumber(
        totalAccountGainsState.overallTotals.marketValueBaseValue);
    const thisValue = quantityDefinition.baseValueToNumber(
        accountGainsState.overallTotals.marketValueBaseValue);
    const percent = 100 * thisValue / totalValue;
    return percent;
}

function comparePercentOfTotal(rowInfoA, rowInfoB) {
    const percentA = rowInfoA.percentOfTotal;
    const percentB = rowInfoB.percentOfTotal;
    return compare(percentA, percentB);
}


//
//
function typeToRank(type) {
    switch (type) {
    case 'SUMMARY' :
        return 10;
    
    case 'EMPTY' :
        return 9;
    
    case 'GROUP_SUBTOTAL' :
        return 8;
    
    case 'GROUP' :
        return -1;
    }

    return 0;
}


//
//
function baseCompare(argsA, argsB, sign, compare) {
    const rowInfoA = argsA.rowInfo;
    const rowInfoB = argsB.rowInfo;
    let rankA = typeToRank(rowInfoA.type);
    let rankB = typeToRank(rowInfoB.type);
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

            totalShares: LCE.getTotalSharesColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareShares(a, b, sign)),
            }),

            price: LCE.getPriceColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => comparePrices(a, b)),
                header: {
                    label: userMsg('PricedItemsList-price'),
                },
            }),

            totalMarketValue: LCE.getTotalMarketValueColumnInfo({
                sortCompare: (a, b, sign) => baseCompare(a, b, sign,
                    (a, b) => compareOverallTotalsBaseValues(
                        a, b, 'marketValueBaseValue')),
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
        columnInfos.push(columnInfoDefs.price);
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
    markColumnVisible(columns, 'price');
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


export function getDefaultIncludeOptions() {
    return {
        includeRegularAccounts: true,
        includeRetirementAccounts: true,
        includeBrokerageCash: true,
        includeCashSecurities: true,
        includeAccountLessSecurities: true,
        groupSecurities: false,
    };
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

        this.onTransactionsAdd = this.onTransactionsAdd.bind(this);
        this.onTransactionsModify = this.onTransactionsModify.bind(this);
        this.onTransactionsRemove = this.onTransactionsRemove.bind(this);

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        this._asyncLoadAccountStateInfos = this._asyncLoadAccountStateInfos.bind(this);

        this.renderAsStringTable = this.renderAsStringTable.bind(this);

        this._multiCompare = new MultiCompare(getPricedItemsListColumnComparators());
        this._multiCompare.setCompareOrder(props.columnSorting);


        const { pricedItemTypeName, collapsedRowKeys } = this.props;

        this._hiddenPricedItemIds = new Set(this.props.hiddenPricedItemIds);

        this.state = {
            rowInfos: [],
            accountStatesChangeId: 0,

            rowInfosByKey: new Map(),

            columnKeys: new Set(),

            accountStateInfosByAccountId: new Map(),
            accountStateInfosByPricedItemId: new Map(),

            accountStateInfoLoadingInfo: {
                accountStatesChangeId: 0,
                ymdDate: props.pricesYMDDate,
            },
            loadedAccountStateInfo: {
                accountStatesChangeId: 0,
                ymdDate: props.pricesYMDDate,
            },


            accountIdsByPricedItemId: new Map(),
            pricesByPricedItemId: new Map(),
        };

        this._collapsedRowKeys = new Set(collapsedRowKeys);

        this.state = Object.assign(this.state, this.buildRowInfos());

        if (this.state.rowInfos.length) {
            this.state.activeRowKey = this.state.rowInfos[0].key;
        }

        const { accessor } = props;

        const sizingPricedItemDataItem = {
            id: this.props.accessor.getBaseCurrencyPricedItemId(),
            name: userMsg('PricedItemsList-dummy_name'),
            description: userMsg('PricedItemsList-dummy_description'),
            type: pricedItemTypeName,
            onlineUpdateType: PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
            ticker: 'WWWW',
            quantityDefinition: accessor.getDefaultSharesQuantityDefinition(),
        };

        this._sizingRowEntry = {
            key: 'sizing',
            type: 'PRICED_ITEM',
            expandCollapseState: ExpandCollapseState.COLLAPSED,
            pricedItemDataItem: sizingPricedItemDataItem,
            pricedItemId: sizingPricedItemDataItem.id,
            accountIds: [],

            tickerValue: 'WWWW',
            nameValue: {
                name: sizingPricedItemDataItem.name,
                description: sizingPricedItemDataItem.description,
            },

            accountState: {
                quantityBaseValue: ACE.BalanceSizingBaseValue,
            },
            //quantityDefinition: getQuantityDefinitionName(
            //    accessor.getDefaultSharesQuantityDefinition(),
            //),
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
            const { pricedItemDataItem } = rowEntry;
            if (pricedItemDataItem && (pricedItemDataItem.id === id)) {
                this.rebuildRowInfos();
                return;
            }
        }
    }


    onPricedItemRemove(result) {
        const { id } = result.removedPricedItemDataItem;
        for (let rowEntry of this.state.rowInfos) {
            const { pricedItemDataItem } = rowEntry;
            if (pricedItemDataItem && (pricedItemDataItem.id === id)) {
                this.rebuildRowInfos();
                return;
            }
        }
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
        this.props.accessor.on('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.on('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.on('pricedItemRemove', this.onPricedItemRemove);

        this.props.accessor.on('accountAdd', this.onAccountAdd);
        this.props.accessor.on('accountsModify', this.onAccountsModify);
        this.props.accessor.on('accountRemove', this.onAccountRemove);

        this.props.accessor.on('transactionsAdd', this.onTransactionsAdd);
        this.props.accessor.on('transactionsModify', this.onTransactionsModify);
        this.props.accessor.on('transactionsRemove', this.onTransactionsRemove);

        this.props.accessor.on('pricesAdd', this.onPricesChange);
        this.props.accessor.on('pricesRemove', this.onPricesChange);

        this.accountIdsUpdated();

        this.reloadAccountStateInfos();
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

        if (!rowsNeedUpdating) {
            rowsNeedUpdating = !deepEqual(props.includeOptions, prevProps.includeOptions);
        }

        if (!rowsNeedUpdating) {
            if (!deepEqual(prevState.accountIdsByPricedItemId,
                this.state.accountIdsByPricedItemId)) {
                rowsNeedUpdating = true;
            }
        }

        if (!deepEqual(prevProps.collapsedRowKeys, 
            props.collapsedRowKeys)) {
            this._collapsedRowKeys = new Set(props.collapsedRowKeys);
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
         || (this.state.accountStatesChangeId 
          !== this.state.accountStateInfoLoadingInfo.accountStatesChangeId)) {
            sortingNeedsUpdating = false;
            this.reloadAccountStateInfos();
        }

        if (sortingNeedsUpdating) {
            this.updateRowInfoSorting();
        }
    }


    reloadAccountStateInfos() {
        const { state, props } = this;
        const { accountStatesChangeId, accountStateInfoLoadingInfo } = state;
        const { pricesYMDDate, } = props;

        if ((accountStatesChangeId !== accountStateInfoLoadingInfo.accountStatesChangeId)
         || (pricesYMDDate !== accountStateInfoLoadingInfo.ymdDate)) {
            this.setState({
                accountStateInfoLoadingInfo: {
                    accountStatesChangeId: accountStatesChangeId,
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
        const isDateSpecified = ymdDate;
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
            const accountStateInfo = allAccountStateInfos[i];
            let accountStateDataItem = accountStateDataItems[i];
            if (!accountStateDataItem) {
                if (!isDateSpecified) {
                    accountStateDataItem 
                        = accessor.getCurrentAccountStateDataItem(allAccountIds[i]);
                }
            }
            accountStateInfo.accountState = accountStateDataItem;

            if (!accountStateDataItem) {
                continue;
            }

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
                isExcludeFromGain: 
                    A.getAccountFlagAttribute(accountDataItem, 'isExcludeFromGain'),
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



    buildRowInfos(state) {
        state = state || this.state;

        const rowInfos = [];
        const accountStateInfosByAccountId = new Map();

        const { accessor, pricedItemTypeName, 
        } = this.props;

        let pricedItemIds = accessor.getPricedItemIdsForType(pricedItemTypeName);

        const type = PI.getPricedItemType(pricedItemTypeName);
        this._hasTickers = type.hasTickerSymbol;

        const rootCurrency = accessor.getCurrencyOfAccountId(
            accessor.getRootAssetAccountId());

        const includeOptions = this.props.includeOptions || getDefaultIncludeOptions();
        const rowInfoGroups = [];
        if (this._hasTickers && includeOptions.groupSecurities) {
            if (includeOptions.includeRegularAccounts) {
                rowInfoGroups.push({
                    keyPrefix: 'Group_regularAccounts',
                    includeOptions: {
                        includeRegularAccounts: true,
                        includeBrokerageCash: includeOptions.includeBrokerageCash,
                        includeCashSecurities: includeOptions.includeCashSecurities,
                    },
                    rowInfos: [],
                });
            }
            if (includeOptions.includeRetirementAccounts) {
                rowInfoGroups.push({
                    keyPrefix: 'Group_retirementAccounts',
                    includeOptions: {
                        includeRetirementAccounts: true,
                        includeBrokerageCash: includeOptions.includeBrokerageCash,
                        includeCashSecurities: includeOptions.includeCashSecurities,
                    },
                    rowInfos: [],
                });
            }
            if (includeOptions.includeAccountLessSecurities) {
                rowInfoGroups.push({
                    keyPrefix: 'Group_accountLessSecurities',
                    includeOptions: {
                        includeAccountLessSecurities: true,
                        includeBrokerageCash: includeOptions.includeBrokerageCash,
                        includeCashSecurities: includeOptions.includeCashSecurities,
                    },
                    rowInfos: [],
                });
            }
        }
        else {
            rowInfoGroups.push({
                includeOptions: includeOptions,
                rowInfos: rowInfos,
            });
        }

        rowInfoGroups.forEach((rowInfoGroup) => {
            const addArgs = {
                state: state,
                rowInfoGroup: rowInfoGroup,
                accountStateInfosByAccountId: accountStateInfosByAccountId,
                currency: rootCurrency,
            };

            pricedItemIds.forEach((id) => {
                addArgs.pricedItemId = id;
                this.addPricedItemIdToRowInfoGroup(addArgs);
            });

            if (this._hasTickers && includeOptions.includeBrokerageCash) {
                this.addBrokerageCashToRowInfoGroup(addArgs);
            }

            if (rowInfoGroups.length > 1) {
                if (rowInfoGroup.rowInfos.length) {
                    const subtotalRowInfo = {
                        key: '_SUBTOTAL_' + key,
                        type: 'GROUP_SUBTOTAL',
                        expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                        currency: rootCurrency,
                    };
                    rowInfoGroup.rowInfos.push(subtotalRowInfo);

                    const emptyRowInfo = {
                        key: '_SUBTOTALEMPTY_' + key,
                        type: 'EMPTY',
                    };
                    rowInfoGroup.rowInfos.push(emptyRowInfo);

                    const key = rowInfoGroup.keyPrefix;
                    const groupRowInfo = {
                        key: key,
                        type: 'GROUP',
                        nameValue: userMsg('PricedItemsList-' + key),
                        expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                        currency: rootCurrency,
                        childRowInfos: rowInfoGroup.rowInfos,
                        subtotalRowInfo: subtotalRowInfo,
                    };

                    const isCollapsed = this._collapsedRowKeys.has(key);
                    groupRowInfo.expandCollapseState
                        = (isCollapsed)
                            ? ExpandCollapseState.COLLAPSED
                            : ExpandCollapseState.EXPANDED;

                    rowInfos.push(groupRowInfo);
                }
            }
        });

        let summaryRowInfo;
        if (this._hasTickers) {
            summaryRowInfo = {
                key: '_SUMMARY_',
                type: 'SUMMARY',
                expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                currency: rootCurrency,
                nameValue: userMsg('PricedItemsList-Summary'),
            };
            rowInfos.push(summaryRowInfo);
        }


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
            accountStatesChangeId: state.accountStatesChangeId + 1,
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


    addBrokerageCashToRowInfoGroup({ state, rowInfoGroup,
        accountStateInfosByAccountId, currency }) {
        
        const { accessor, showAccounts } = this.props;
        const { rowInfos, keyPrefix, includeOptions, } = rowInfoGroup;

        // Grab a list of all brokerage accounts that satisfy the current include options
        const accountIds = [];
        AH.crawlAccountTree(accessor, accessor.getRootAssetAccountId(), 
            (accountDataItem) => {
                const type = A.getAccountType(accountDataItem.type);
                if (!type.hasSecurities
                 && !A.getAccountFlagAttribute(accountDataItem,
                     'isIncludeInSecuritiesCash')) {
                    return;
                }
                if (A.getAccountFlagAttribute(accountDataItem,
                    'isRetirementAccount')) {
                    if (!includeOptions.includeRetirementAccounts) {
                        return;
                    }
                }
                else {
                    if (!includeOptions.includeRegularAccounts) {
                        return;
                    }
                }

                accountIds.push(accountDataItem.id);

                // Check the security child accounts for a security marked
                // as a cash security.
                const { childAccountIds } = accountDataItem;
                if (childAccountIds) {
                    childAccountIds.forEach((accountId) => {
                        const childAccountDataItem = accessor.getAccountDataItemWithId(
                            accountId);
                        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                            childAccountDataItem.pricedItemId
                        );
                        if (pricedItemDataItem.isCashSecurity) {
                            accountIds.push(accountId);
                        }
                    });
                }
            });
        
        if (!accountIds.length) {
            return;
        }

        // 
        let key;
        if (keyPrefix) {
            key = keyPrefix + '_CASH_';
        }
        else {
            key = '_CASH_';
        }

        const isCollapsed = this._collapsedRowKeys.has(key);

        let expandCollapseState = ExpandCollapseState.NO_EXPAND_COLLAPSE;
        if (accountIds && accountIds.length && showAccounts) {
            expandCollapseState = (isCollapsed)
                ? ExpandCollapseState.COLLAPSED
                : ExpandCollapseState.EXPANDED;
        }

        const rowInfo = {
            key: key,
            type: 'CASH',
            expandCollapseState: expandCollapseState,
            accountIds: accountIds,
            currency: currency,
        };

        const tickerValue = userMsg('PricedItemsList-cash_ticker');
        const cashName = userMsg('PricedItemsList-cash_name');
        if (this._hasNameColumn) {
            rowInfo.tickerValue = tickerValue;
        }
        else {
            rowInfo.tickerValue = {
                value: tickerValue,
                tooltip: cashName,
            };
        }

        rowInfo.nameValue = cashName;

        rowInfos.push(rowInfo);

        this.addAccountIdRowInfosToRowInfo({
            rowInfo: rowInfo,
            accountIds: accountIds,
            accountStateInfosByAccountId: accountStateInfosByAccountId,
        });
    }


    addPricedItemIdToRowInfoGroup({state, rowInfoGroup, pricedItemId, 
        accountStateInfosByAccountId, }) {

        if (!this.isPricedItemIdDisplayed(pricedItemId)) {
            return;
        }

        const { rowInfos, keyPrefix, includeOptions, } = rowInfoGroup;

        const { accessor, showAccounts } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
        if (pricedItemDataItem.isCashSecurity
         && (!includeOptions.includeCashSecurities 
          || includeOptions.includeBrokerageCash)) {
            return;
        }

        const { accountIdsByPricedItemId } = state;
        const allAccountIds = accountIdsByPricedItemId.get(pricedItemId);

        let accountIds;
        if (allAccountIds && this._hasTickers) {
            accountIds = [];
            allAccountIds.forEach((accountId) => {
                const accountDataItem = accessor.getAccountDataItemWithId(accountId);
                const parentAccountDataItem = accessor.getAccountDataItemWithId(
                    accountDataItem.parentAccountId
                );
                if (A.getAccountFlagAttribute(parentAccountDataItem,
                    'isRetirementAccount')) {
                    if (!includeOptions.includeRetirementAccounts) {
                        return;
                    }
                }
                else {
                    if (!includeOptions.includeRegularAccounts) {
                        return;
                    }
                }

                accountIds.push(accountId);
            });

            if (allAccountIds.length) {
                // This case indicates the priced item is being filtered out.
                if (!accountIds.length) {
                    return;
                }
            }

            if (!accountIds.length) {
                if (!includeOptions.includeAccountLessSecurities) {
                    return;
                }
            }
            else {
                if (includeOptions.includeAccountLessSecurities
                 && includeOptions.groupSecurities) {
                    return;
                }
            }
        }

        // 
        let key;
        if (keyPrefix) {
            key = keyPrefix + '_' + pricedItemDataItem.id;
        }
        else {
            key = pricedItemDataItem.id;
        }

        const isCollapsed = this._collapsedRowKeys.has(key);

        let expandCollapseState = ExpandCollapseState.NO_EXPAND_COLLAPSE;
        if (accountIds && accountIds.length && showAccounts) {
            expandCollapseState = (isCollapsed)
                ? ExpandCollapseState.COLLAPSED
                : ExpandCollapseState.EXPANDED;
        }

        const rowInfo = {
            key: key,
            type: 'PRICED_ITEM',
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

        this.addAccountIdRowInfosToRowInfo({
            rowInfo: rowInfo,
            accountIds: accountIds,
            accountStateInfosByAccountId: accountStateInfosByAccountId,
        });
    }


    addAccountIdRowInfosToRowInfo({ rowInfo, accountIds, 
        accountStateInfosByAccountId, }) {

        if (!accountIds) {
            return;
        }

        const { accessor, showAccounts } = this.props;

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
                    type: 'ACCOUNT',
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

        this.updateSubtotalRowInfoAccountStates(summaryRowInfo, rowInfos);

        rowInfos.forEach((rowInfo) => {
            this.updateRowInfoCalculateds(state, rowInfo, summaryRowInfo);
        });
    }


    updateRowInfoAccountStates(rowInfo) {
        const { type } = rowInfo;
        switch (type) {
        case 'PRICED_ITEM':
            this.updatePricedItemRowInfoAccountStates(rowInfo);
            return rowInfo.accountGainsState;

        case 'CASH':
            this.updatePricedItemRowInfoAccountStates(rowInfo, true);
            return rowInfo.accountGainsState;

        case 'GROUP':
            if (rowInfo.expandCollapseState === ExpandCollapseState.EXPANDED) {
                this.updateSubtotalRowInfoAccountStates(
                    rowInfo.subtotalRowInfo, rowInfo.childRowInfos);
                return rowInfo.subtotalRowInfo.accountGainsState;
            }
            else {
                this.updateSubtotalRowInfoAccountStates(
                    rowInfo, rowInfo.childRowInfos);
                return rowInfo.accountGainsState;
            }
        }
    }


    updateSubtotalRowInfoAccountStates(rowInfo, rowInfos) {
        let summaryAccountGainsState;

        rowInfos.forEach((rowInfo) => {
            const accountGainsState = this.updateRowInfoAccountStates(rowInfo);

            summaryAccountGainsState = GH.addAccountGainsState(
                summaryAccountGainsState,
                accountGainsState,
            );
        });

        if (rowInfo) {
            rowInfo.accountGainsState = summaryAccountGainsState;
        }
    }


    updatePricedItemRowInfoAccountStates(rowInfo, excludeGainTotals) {
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

                let { accountGainsState } = accountStateInfo;

                if (excludeGainTotals && accountGainsState) {
                    const { overallTotals } = accountGainsState;
                    accountGainsState = Object.assign({}, 
                        accountGainsState, {
                            gainTotals: {},
                            overallTotals: {
                                marketValueBaseValue: overallTotals.marketValueBaseValue,
                            }
                        });
                }
                rowInfo.accountGainsState = accountGainsState;

                pricedItemAccountGainsState = GH.addAccountGainsState(
                    pricedItemAccountGainsState,
                    accountGainsState);
            });
        }
        else {
            accountIds.forEach((accountId) => {
                const accountStateInfo = accountStateInfosByAccountId.get(accountId);
                if (!accountStateInfo) {
                    return;
                }


                let { accountGainsState } = accountStateInfo;

                if (excludeGainTotals && accountGainsState) {
                    const { overallTotals } = accountGainsState;
                    accountGainsState = Object.assign({}, 
                        accountGainsState, {
                            gainTotals: {},
                            overallTotals: {
                                marketValueBaseValue: overallTotals.marketValueBaseValue,
                            }
                        });
                }


                pricedItemAccountGainsState = GH.addAccountGainsState(
                    pricedItemAccountGainsState,
                    accountGainsState);
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
        const { accountGainsState, pricedItemDataItem } = rowInfo;
        if (accountGainsState) {
            if (pricedItemDataItem && pricedItemDataItem.isExcludeFromGain) {
                return;
            }
            
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
                this._collapsedRowKeys.delete(rowInfo.key);
                break;
    
            case ExpandCollapseState.COLLAPSED :
                this._collapsedRowKeys.add(rowInfo.key);
                break;
            
            default :
                return;
            }

            const { onUpdateCollapsedPricedItemIds } = this.props;
            if (onUpdateCollapsedPricedItemIds) {
                onUpdateCollapsedPricedItemIds({
                    pricedItemId: rowInfo.key,
                    expandCollapseState: expandCollapseState,
                    collapsedRowKeys: Array.from(this._collapsedRowKeys.values()),
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

        // Test against undefined so we don't end up displaying a blank cell with
        // the summary bar for the summary/subtotal rows.
        if (nameValue !== undefined) {
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: nameValue,
                renderAsText: renderAsText,
            });
        }
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

        // Test against undefined so we don't end up displaying a blank cell with
        // the summary bar for the summary/subtotal rows.
        if (tickerValue !== undefined) {
            return ACE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: tickerValue,
                renderAsText: renderAsText,
            });
        }
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
        if (!this._hasTickers) {
            return renderArgs.columnInfo;
        }
        
        let { columnInfo, rowInfo } = renderArgs;
        const { type } = rowInfo;
        
        if (type === 'GROUP') {
            columnInfo = Object.assign({}, columnInfo);
            columnInfo.inputClassExtras
                += ' PricedItemsList-group';
        }
        else if (type === 'EMPTY') {
            //
        }
        else if ((type === 'GROUP_SUBTOTAL') || (type === 'SUMMARY')) {
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


    renderPrice(args) {
        const { rowInfo, } = args;
        const { type } = rowInfo;
        if ((type !== 'PRICED_ITEM') && (type !== 'ACCOUNT') && (type !== 'CASH')) {
            return;
        }

        const price = getPriceClose(rowInfo);
        if (price !== undefined) {
            const columnInfo = this.columnInfoFromRenderArgs(args);
            const { pricedItemId } = rowInfo;
            const quantityDefinition = this.props.accessor
                .getPriceQuantityDefinitionForPricedItem(pricedItemId);
            const quantityValue = {
                quantityBaseValue: quantityDefinition.numberToBaseValue(price),
                quantityDefinition: quantityDefinition,
            };

            let tooltip;
            const { priceDataItem } = rowInfo.accountGainsState;
            if (priceDataItem) {
                tooltip = this.props.accessor.formatDate(priceDataItem.ymdDate);
            }

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
                renderAsText: args.renderAsText,
                tooltip: tooltip,
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
        
        case 'price' :
            return this.renderPrice(args);
        
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
                sizingRowInfo = {this._sizingRowEntry}
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

    showRowBorders: PropTypes.bool,

    showAccounts: PropTypes.bool,
    showHiddenAccounts: PropTypes.bool,
    showInactiveAccounts: PropTypes.bool,

    includeOptions: PropTypes.object,

    collapsedRowKeys: PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string])
    ),
    onUpdateCollapsedPricedItemIds: PropTypes.func,

    header: PropTypes.any,
    children: PropTypes.any,
    id: PropTypes.string,
};
