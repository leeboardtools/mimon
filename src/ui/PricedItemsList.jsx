import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { YMDDate } from '../util/YMDDate';
import { getQuantityDefinition, 
    getDecimalDefinition, getQuantityDefinitionName, } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns, getColumnWithKey, } from '../util-ui/ColumnInfo';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo } from '../util-ui/CollapsibleRowTable';


let columnInfoDefs;

function getPricedItemsListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';
        const inputClassExtras = 'Text-center';

        columnInfoDefs = {
            ticker: { key: 'ticker',
                header: {
                    label: userMsg('PricedItemsList-ticker'),
                    ariaLabel: 'Ticker Symbol',
                },
                propertyName: 'ticker',
                cellClassName: cellClassName + ' Text-left',
                inputClassExtras: inputClassExtras,
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
        this.onAccountModify = this.accountIdsUpdated;
        this.onAccountRemove = this.accountIdsUpdated;

        this.onExpandCollapseRow = this.onExpandCollapseRow.bind(this);
        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        const { pricedItemTypeName, collapsedPricedItemIds } = this.props;

        this._hiddenPricedItemIds = new Set(this.props.hiddenPricedItemIds);

        this.state = {
            rowInfos: [],
            rowInfosByKey: new Map(),
            columnKeys: new Set(),
            accountIdsByPricedItemId: new Map(),
            pricesYMDDate: undefined,
            pricesByPricedItemId: new Map(),
        };

        this._collapsedRowIds = new Set(collapsedPricedItemIds);

        this.state = Object.assign(this.state, this.buildRowInfos());

        if (this.state.rowInfos.length) {
            this.state.activeRowKey = this.state.rowInfos[0].key;
        }


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
                quantityDefinition: getDecimalDefinition(4),
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
        this.props.accessor.on('accountModify', this.onAccountModify);
        this.props.accessor.on('accountRemove', this.onAccountRemove);

        this.accountIdsUpdated();

        this.updatePrices();
    }

    componentWillUnmount() {
        this.props.accessor.off('accountAdd', this.onAccountAdd);
        this.props.accessor.off('accountModify', this.onAccountModify);
        this.props.accessor.off('accountRemove', this.onAccountRemove);

        this.props.accessor.off('pricedItemAdd', this.onPricedItemAdd);
        this.props.accessor.off('pricedItemModify', this.onPricedItemModify);
        this.props.accessor.off('pricedItemRemove', this.onPricedItemRemove);
    }


    componentDidUpdate(prevProps, prevState) {
        let rowsNeedUpdating = false;
        const { hiddenPricedItemIds, 
            showHiddenPricedItems } = this.props;

        if (!deepEqual(prevProps.hiddenPricedItemIds, hiddenPricedItemIds)) {
            this._hiddenPricedItemIds = new Set(hiddenPricedItemIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenPricedItems !== showHiddenPricedItems) {
            rowsNeedUpdating = true;
        }

        if (!rowsNeedUpdating) {
            if (!deepEqual(prevState.accountIdsByPricedItemId,
                this.state.accountIdsByPricedItemId)) {
                rowsNeedUpdating = true;
            }
        }

        if (!deepEqual(prevProps.collapsedPricedItemIds, 
            this.props.collapsedPricedItemIds)) {
            this._collapsedRowIds = new Set(this.props.collapsedPricedItemIds);
            rowsNeedUpdating = true;
        }

        if (!deepEqual(prevProps.columns, this.props.columns)) {
            const { columns } = this.props;
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

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;
            const result = this.buildRowInfos();
            this.setState(result);

            if (prevActiveRowKey !== result.activeRowKey) {
                this.onSelectItem(result.activeRowEntry);
            }
        }

    }


    accountIdsUpdated() {
        this.setState({
            accountIdsByPricedItemId: 
                AH.getAccountIdsByPricedItemId(this.props.accessor),
        });
    }


    buildRowInfos() {
        const rowInfos = [];
        const { accessor, pricedItemTypeName } = this.props;
        const pricedItemIds = accessor.getPricedItemIdsForType(pricedItemTypeName);

        pricedItemIds.forEach((id) => {
            this.addPricedItemIdToRowEntries(rowInfos, id);
        });

        rowInfos.push({
            key: '_SUMMARY_',
            index: rowInfos.length,
            expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
        });

        let { activeRowKey } = this.state;
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


    addPricedItemIdToRowEntries(rowInfos, pricedItemId) {
        if (!this.isPricedItemIdDisplayed(pricedItemId)) {
            return;
        }

        const { accessor } = this.props;
        const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);

        const key = pricedItemDataItem.id;
        const isCollapsed = this._collapsedRowIds.has(key);
        const index = rowInfos.length;

        const { accountIdsByPricedItemId } = this.state;
        let expandCollapseState = ExpandCollapseState.NO_EXPAND_COLLAPSE;
        const accountIds = accountIdsByPricedItemId.get(pricedItemId);
        if (accountIds && accountIds.length) {
            expandCollapseState = (isCollapsed)
                ? ExpandCollapseState.COLLAPSED
                : ExpandCollapseState.EXPANDED;
        }

        const rowInfo = {
            key: key,
            index: index,
            expandCollapseState: expandCollapseState,
            pricedItemDataItem: pricedItemDataItem,
        };
        rowInfos.push(rowInfo);

        if (accountIds) {
            rowInfo.childRowInfos = [];
            const { childRowInfos } = rowInfo;

            const { showHiddenAccounts } = this.props;
            accountIds.forEach((accountId) => {
                const accountDataItem = accessor.getAccountDataItemWithId(accountId);
                if (!showHiddenAccounts && accountDataItem.isHidden) {
                    return;
                }

                childRowInfos.push({
                    key: 'AccountId_' + accountId,
                    index: childRowInfos.length,
                    expandCollapseState: ExpandCollapseState.NO_EXPAND_COLLAPSE,
                    accountDataItem: accountDataItem,
                });
            });
        }
    }


    isPricedItemIdDisplayed(pricedItemId) {
        const { showHiddenPricedItems } = this.props;
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

        return true;
    }


    rebuildRowInfos() {
        this.setState(this.buildRowInfos());
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


    renderName(columnInfo, rowInfo) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: (this.state.columnKeys.has('description'))
                    ? pricedItemDataItem.name
                    : {
                        name: pricedItemDataItem.name,
                        description: pricedItemDataItem.description,
                    },
            });
        }

        const { accountDataItem } = rowInfo;
        if (accountDataItem) {
            const name = AH.getShortAccountAncestorNames(this.props.accessor,
                accountDataItem.id);
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: name,
            });
        }
    }


    renderDescription(columnInfo, rowInfo) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            return ACE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: pricedItemDataItem.description,
            });
        }
    }


    renderCurrency(columnInfo, rowInfo) {
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
            });
        }
    }


    renderQuantityDefinition(columnInfo, rowInfo) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            const quantityDefinition 
                = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
            if (quantityDefinition) {
                return ACE.renderTextDisplay({
                    columnInfo: columnInfo, 
                    value: quantityDefinition.getDisplayText(),
                });
            }
        }
    }


    renderTicker(columnInfo, rowInfo) {
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
            });
        }
    }


    renderOnlineSource(columnInfo, rowInfo) {
        const { pricedItemDataItem } = rowInfo;
        if (pricedItemDataItem) {
            const onlineUpdateType = PI.getPricedItemOnlineUpdateType(
                pricedItemDataItem.onlineUpdateType);
            if (onlineUpdateType) {
                return ACE.renderTextDisplay({
                    columnInfo: columnInfo, 
                    value: onlineUpdateType.description,
                });
            }
        }
    }


    getDisplayInfo(columnInfo, rowInfo) {

        const { accessor } = this.props;
        const { accountDataItem } = rowInfo;
        if (accountDataItem) {
            return {
                accountState: accessor.getCurrentAccountStateDataItem(
                    accountDataItem.id),
                pricedItemId: accountDataItem.pricedItemId,
            };
        }

        const { pricedItemDataItem } = rowInfo;
        const { accountIdsByPricedItemId } = this.state;
        let accountIds;
        let pricedItemId;
        if (pricedItemDataItem) {
            accountIds = accountIdsByPricedItemId.get(
                pricedItemDataItem.id);
            pricedItemId = pricedItemDataItem.id;
        }
        else {
            // Presume this is the final summary row, 
            accountIds = [];

            const pricedItemIds = accessor.getPricedItemIds();
            pricedItemIds.forEach((id) => {
                const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                    id);
                if (pricedItemDataItem.type !== this.props.pricedItemTypeName) {
                    return;
                }

                const workingAccountIds = accountIdsByPricedItemId.get(id);
                accountIds = accountIds.concat(workingAccountIds);

                pricedItemId = id;
            });
        }

        const accountState = {
            quantityBaseValue: 0,
            lotStates: [],
        };

        if (accountIds) {
            accountIds.forEach((accountId) => {
                if (!this.props.showHiddenAccounts) {
                    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
                    if (accountDataItem.isHidden) {
                        return;
                    }
                }

                const workingAccountState = accessor.getCurrentAccountStateDataItem(
                    accountId);
                accountState.quantityBaseValue 
                    += workingAccountState.quantityBaseValue;
                
                if (workingAccountState.lotStates) {
                    accountState.lotStates
                        = accountState.lotStates.concat(
                            workingAccountState.lotStates);
                }
            });
        }

        return {
            accountState: accountState,
            pricedItemId: pricedItemId,
        };
    }



    renderTotalMarketValue(columnInfo, rowInfo) {
        const { accountState, pricedItemId } = this.getDisplayInfo(columnInfo, rowInfo);
        const priceDataItem = this.state.pricesByPricedItemId.get(
            pricedItemId);
        if (priceDataItem) {
            const quantityValue = GH.getTotalMarketValueBaseValue({
                accessor: this.props.accessor,
                pricedItemId: pricedItemId,
                accountStateDataItem: accountState,
                priceDataItem: priceDataItem,
            });

            return ACE.renderBalanceDisplay({
                columnInfo: columnInfo,
                value: quantityValue,
            });
        }
    }


    renderTotalShares(columnInfo, rowInfo) {
        const { accountState, pricedItemId } = this.getDisplayInfo(columnInfo, rowInfo);
        let { pricedItemDataItem } = rowInfo;
        pricedItemDataItem = pricedItemDataItem 
            || this.props.accessor.getPricedItemDataItemWithId(pricedItemId);

        return LCE.renderTotalSharesDisplay({
            columnInfo: columnInfo,
            value: {
                quantityBaseValue: accountState.quantityBaseValue,
                quantityDefinition: pricedItemDataItem.quantityDefinition,
            }
        });

    }


    renderTotalCostBasis(columnInfo, rowInfo) {
        const { accountState, pricedItemId } = this.getDisplayInfo(columnInfo, rowInfo);
        
        const quantityValue = GH.getTotalCostBasisBaseValue({
            accessor: this.props.accessor,
            pricedItemId: pricedItemId,
            accountStateDataItem: accountState,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
        });
    }


    renderTotalCashIn(columnInfo, rowInfo) {
        const { accountState, pricedItemId } = this.getDisplayInfo(columnInfo, rowInfo);
        
        const quantityValue = GH.getTotalCashInBaseValue({
            accessor: this.props.accessor,
            pricedItemId: pricedItemId,
            accountStateDataItem: accountState,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
        });
    }


    renderGainDisplay({ columnInfo, rowInfo, 
        accountState, pricedItemDataItem, 
        calcGainValueCallback, suffix, }) {

        const { accessor } = this.props;

        let pricedItemId;
        if (!accountState) {
            const result = this.getDisplayInfo(columnInfo, rowInfo);
            accountState = result.accountState;
            pricedItemId = result.pricedItemId;
        }
        else {
            pricedItemId = pricedItemDataItem.id;
        }
        
        const priceDataItem = this.state.pricesByPricedItemId.get(
            pricedItemId);
        if (!priceDataItem) {
            return;
        }
        const quantityValue = calcGainValueCallback({
            accessor: accessor,
            pricedItemId: pricedItemId,
            accountStateDataItem: accountState,
            priceDataItem: priceDataItem,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
            suffix: suffix,
        });
    }


    onRenderCell({ rowInfo, columnIndex, isSizeRender }) {

        const { columnInfo } = this.props.columns[columnIndex];

        const args = {
            columnInfo: columnInfo,
            rowInfo: rowInfo,
        };

        if (isSizeRender) {
            args.pricedItemDataItem = this._sizingRowEntry.pricedItemDataItem;
            args.accountState = this._sizingRowEntry.accountState;
            args.quantityDefinition = this._sizingRowEntry.quantityDefinition;
        }

        switch (columnInfo.key) {
        case 'name' :
            return this.renderName(columnInfo, rowInfo);
        
        case 'description' :
            return this.renderDescription(columnInfo, rowInfo);
        
        case 'currency' :
            return this.renderCurrency(columnInfo, rowInfo);
        
        case 'quantityDefinition' :
            return this.renderQuantityDefinition(columnInfo, rowInfo);
        
        case 'ticker' :
            return this.renderTicker(columnInfo, rowInfo);
        
        case 'onlineSource' :
            return this.renderOnlineSource(columnInfo, rowInfo);
        
        case 'totalMarketValue' :
            return this.renderTotalMarketValue(columnInfo, rowInfo);
        
        case 'totalShares' :
            return this.renderTotalShares(columnInfo, rowInfo);
        
        case 'totalCostBasis' :
            return this.renderTotalCostBasis(columnInfo, rowInfo);

        case 'totalCashIn' :
            return this.renderTotalCashIn(columnInfo, rowInfo);

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
        return <div className="RowTableContainer PricedItemsList">
            <CollapsibleRowTable
                columns = { props.columns }
                rowInfos = {state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell={this.onRenderCell}

                onSetColumnWidth = {this.props.onSetColumnWidth}
                onMoveColumn = {this.props.onMoveColumn}

                activeRowKey = {state.activeRowKey}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}

                id = {this.props.id}
            />
            {this.props.children}
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
    onSelectItem: PropTypes.func,
    onChooseItem: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    onMoveColumn: PropTypes.func,
    hiddenPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenPricedItems: PropTypes.bool,
    showHiddenAccounts: PropTypes.bool,
    showPricedItemIds: PropTypes.bool,
    collapsedPricedItemIds: PropTypes.arrayOf(PropTypes.number),
    onUpdateCollapsedPricedItemIds: PropTypes.func,
    id: PropTypes.string,
    children: PropTypes.any,
};
