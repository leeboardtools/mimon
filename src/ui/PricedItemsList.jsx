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
import { columnInfosToColumns, getColumnWithKey, } from '../util-ui/ColumnInfo';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo,
    renderCollapsibleRowTableAsText, } from '../util-ui/CollapsibleRowTable';
import { SimpleRowTableTextRecorder } from '../util-ui/RowTable';


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
            },
            name: { key: 'name',
                header: {
                    label: userMsg('PricedItemsList-name'),
                    ariaLabel: 'Name',
                    classExtras: 'Text-left',
                },
                propertyName: 'name',
                cellClassName: cellClassName + ' Text-left W-40',
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

            totalMarketValue: LCE.getTotalMarketValueColumnInfo({}),

            totalShares: LCE.getTotalSharesColumnInfo({}),

            totalCostBasis: LCE.getTotalCostBasisColumnInfo({}),

            totalCashIn: LCE.getTotalCashInColumnInfo({}),

            totalGain: LCE.getTotalGainColumnInfo({}),

            totalCashInGain: LCE.getTotalCashInGainColumnInfo({}),

            totalPercentGain: LCE.getTotalSimplePercentGainColumnInfo({}),

            totalCashInPercentGain: LCE.getTotalCashInPercentGainColumnInfo({}),

            totalAnnualPercentGain: LCE.getTotalAnnualPercentGainColumnInfo({}),

            totalAnnualCashInPercentGain: 
                LCE.getTotalAnnualCashInPercentGainColumnInfo({}),
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

    return columns;
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

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        this.renderAsStringTable = this.renderAsStringTable.bind(this);

        const { pricedItemTypeName, collapsedPricedItemIds } = this.props;

        this._hiddenPricedItemIds = new Set(this.props.hiddenPricedItemIds);

        this.state = {
            rowInfos: [],
            rowInfosByKey: new Map(),
            columnKeys: new Set(),
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

        this.accountIdsUpdated();

        this.updatePrices();
    }

    componentWillUnmount() {
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


    buildRowInfos(state) {
        state = state || this.state;

        const rowInfos = [];
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

        pricedItemIds.forEach((id) => {
            this.addPricedItemIdToRowEntries(state, rowInfos, id);
        });

        let summaryAccountGainsState;
        rowInfos.forEach((rowInfo) => {
            summaryAccountGainsState = GH.addAccountGainsState(summaryAccountGainsState,
                rowInfo.accountGainsState);
        });

        rowInfos.push({
            key: '_SUMMARY_',
            expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
            accountGainsState: summaryAccountGainsState,
        });

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


    addPricedItemIdToRowEntries(state, rowInfos, pricedItemId) {
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
        };
        rowInfos.push(rowInfo);

        if (accountIds) {
            let pricedItemAccountGainsState;
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

                const priceDataItem = state.pricesByPricedItemId.get(
                    accountDataItem.pricedItemId);
                
                const accountState = this.getAccountStateForAccountId(accountId);
                const accountGainsState = GH.accountStateToAccountGainsState({
                    accessor: accessor,
                    accountId: accountId,
                    pricedItemId: pricedItemId,
                    accountState: accountState,
                    priceDataItem: priceDataItem,
                    isExcludeFromGain: accountDataItem.isExcludeFromGain,
                });

                pricedItemAccountGainsState = GH.addAccountGainsState(
                    pricedItemAccountGainsState,
                    accountGainsState);

                if (childRowInfos) {
                    childRowInfos.push({
                        key: 'AccountId_' + accountId,
                        expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                        accountDataItem: accountDataItem,
                        accountGainsState: accountGainsState,
                    });
                }
            });

            if (childRowInfos && this.props.sortAlphabetically) {
                childRowInfos.sort((a, b) =>
                    a.accountDataItem.name.localeCompare(b.accountDataItem.name));
            }

            rowInfo.accountGainsState = pricedItemAccountGainsState;
        }
    }


    getAccountStateForAccountId(accountId) {
        // Some day support a date...
        const { accessor } = this.props;
        return accessor.getCurrentAccountStateDataItem(accountId);
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


    updatePrices() {
        process.nextTick(async () => {
            const newPricesByPricedItemId = new Map();

            const { accessor } = this.props;
            let { pricesYMDDate } = this.props;
            if (!pricesYMDDate) {
                pricesYMDDate = new YMDDate();
            }

            const pricedItemIds = accessor.getPricedItemIds();
            for (let i = 0; i < pricedItemIds.length; ++i) {
                const pricedItemId = pricedItemIds[i];
                const priceDataItem 
                    = await accessor.asyncGetPriceDataItemOnOrClosestBefore(
                        pricedItemId, pricesYMDDate);
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


    renderName({ columnInfo, rowInfo, renderAsText }) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            let value = pricedItemDataItem.name;
            if (this.state.columnKeys.has('description')) {
                value = pricedItemDataItem.name;
            }
            else {
                let { name, description } = pricedItemDataItem;
                if (!name) {
                    value = description;
                }
                else {
                    value = {
                        name: name,
                        description: description,
                    };
                }
            }
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: value,
                renderAsText: renderAsText,
            });
        }

        const { accountDataItem } = rowInfo;
        if (accountDataItem) {
            const name = AH.getShortAccountAncestorNames(this.props.accessor,
                accountDataItem.id);
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: name,
                renderAsText: renderAsText,
            });
        }
    }


    renderDescription({ columnInfo, rowInfo, renderAsText }) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            return ACE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.description,
                renderAsText: renderAsText,
            });
        }
    }


    renderCurrency({ columnInfo, rowInfo, renderAsText }) {
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


    renderQuantityDefinition({ columnInfo, rowInfo, renderAsText }) {
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


    renderTicker({ columnInfo, rowInfo, renderAsText }) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            return ACE.renderTextDisplay({
                columnInfo: columnInfo, 
                value: (this.state.columnKeys.has('name'))
                    ? pricedItemDataItem.ticker
                    : {
                        value: pricedItemDataItem.ticker,
                        tooltip: pricedItemDataItem.name,
                    },
                renderAsText: renderAsText,
            });
        }
    }


    renderOnlineSource({ columnInfo, rowInfo, renderAsText }) {
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
        if (!rowInfo.pricedItemId) {
            columnInfo = Object.assign({}, columnInfo);
            columnInfo.inputClassExtras
                += ' PricedItemsList-subtotal PricedItemsList-subtotal-value';
        }

        return columnInfo;
    }


    renderTotalMarketValue(args) {
        const columnInfo = this.columnInfoFromRenderArgs(args);
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;
        if (accountGainsState) {
            const quantityValue = {
                quantityBaseValue: accountGainsState.marketValueBaseValue,
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
                quantityBaseValue: accountGainsState.costBasisBaseValue,
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
                quantityBaseValue: accountGainsState.cashInBaseValue,
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
        const { rowInfo, } = args;
        const { accountGainsState, pricedItemId } = rowInfo;

        const { calcGainValueCallback, suffix, } = args;
        const { accessor } = this.props;

        if (accountGainsState) {
            const quantityValue = calcGainValueCallback({
                accessor: accessor,
                pricedItemId: pricedItemId,
                accountGainsState: accountGainsState,
            });
            if (quantityValue === undefined) {
                return;
            }

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
                suffix: suffix,
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
            args.calcGainValueCallback = LCE.calcSimpleGainBalanceValue;
            return this.renderGainDisplay(args);

        case 'totalCashInGain' :
            args.calcGainValueCallback = LCE.calcCashInGainBalanceValue;
            return this.renderGainDisplay(args);

        case 'totalPercentGain' :
            args.calcGainValueCallback = LCE.calcSimplePercentGainBalanceValue;
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalCashInPercentGain' :
            args.calcGainValueCallback = LCE.calcCashInPercentGainBalanceValue;
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalAnnualPercentGain' :
            args.calcGainValueCallback = LCE.calcAnnualPercentGainBalanceValue;
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

        case 'totalAnnualCashInPercentGain' :
            args.calcGainValueCallback = LCE.calcAnnualCashInPercentGainBalanceValue;
            args.suffix = this._percentSuffix;
            return this.renderGainDisplay(args);

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
                rowInfos = {state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell={this.onRenderCell}

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
    id: PropTypes.string,
    children: PropTypes.any,
};
