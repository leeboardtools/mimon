import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import * as AS from '../engine/AccountStates';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo } from '../util-ui/CollapsibleRowTable';
import { getDecimalDefinition, getQuantityDefinitionName } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns, getColumnWithKey, } from '../util-ui/ColumnInfo';
import { YMDDate } from '../util/YMDDate';


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
    buildRowInfos() {
        const rowInfos = [];
        const rowInfosByAccountId = new Map();
        const { topLevelAccountIds } = this.state;

        let { activeRowKey } = this.state;

        topLevelAccountIds.forEach((id) => {
            this.addAccountIdToRowEntries(rowInfos, id, rowInfosByAccountId, 1);
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


    addAccountIdToRowEntries(rowInfos, accountId, rowInfosByAccountId, depth) {
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
                    childId, rowInfosByAccountId, depth + 1);
            });

            if (this.props.sortAlphabetically) {
                rowInfo.childRowInfos.sort((a, b) => 
                    (a.accountDataItem)
                        ? ((b.accountDataItem)
                            ? a.accountDataItem.name.localeCompare(b.accountDataItem.name)
                            : -1)
                        : 1);
            }

            const { subtotalsLevel } = this.props;
            if ((subtotalsLevel >= 0) && (depth <= subtotalsLevel)) {
                this.addSubtotalsRowEntry(rowInfo, 
                    accountDataItem);
            }
        }

    }


    addSubtotalsRowEntry(rowInfo, subtotalAccountDataItem) {
        const { childRowInfos } = rowInfo;
        const subtotalRowInfo = {
            key: '_SUBTOTAL_' + subtotalAccountDataItem.id,
            subtotalAccountDataItem: subtotalAccountDataItem,
            subtotaledRowInfo: rowInfo,
        };
        childRowInfos.push(subtotalRowInfo);

        const emptyRowInfo = {
            key: '_EMPTY_' + subtotalAccountDataItem.id,
        };
        childRowInfos.push(emptyRowInfo);
    }


    addRowInfoToAccountState(rowInfo, accountState) {
        const { accessor } = this.props;
        const { accountDataItem, childRowInfos } = rowInfo;
        if (accountDataItem) {
            const rowAccountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id);
            
            if (rowAccountState) {
                let quantityBaseValue;
                let quantityDefinition;

                if (rowAccountState.lotStates) {
                    // Need the price...
                    const priceDataItem = this.state.pricesByPricedItemId.get(
                        accountDataItem.pricedItemId);
                    if (priceDataItem) {
                        const result = GH.getTotalMarketValueBaseValue({
                            accessor: accessor,
                            pricedItemId: accountDataItem.pricedItemId,
                            accountStateDataItem: rowAccountState,
                            priceDataItem: priceDataItem,
                        });

                        quantityBaseValue = result.quantityBaseValue;
                        quantityDefinition = result.quantityDefinition;

                        const { lotStatesWithMarketValue } = result;
                        if (lotStatesWithMarketValue) {
                            accountState.lotStates = (accountState.lotStates)
                                ? accountState.lotStates.concat(lotStatesWithMarketValue)
                                : lotStatesWithMarketValue;
                        }
                    }

                }
                else {
                    quantityBaseValue = rowAccountState.quantityBaseValue;

                    const currency = accessor.getCurrencyOfAccountId(accountDataItem.id);
                    if (currency) {
                        quantityDefinition = currency.getQuantityDefinition();
                    }
                }

                if (quantityBaseValue) {
                    accountState.quantityDefinition = accountState.quantityDefinition
                        || quantityDefinition;

                    if (quantityDefinition 
                        !== accountState.quantityDefinition) {
                        // FIX ME!!!
                        // Need to do conversion if quantity definition does not match...
                        console.log({
                            msg: 'Quantity definition mismatch',
                            accountStateQD: accountState.quantityDefinition,
                            rowQD: quantityDefinition,
                            hasLotStates: rowAccountState.lotStates !== undefined,
                        });
                    }

                    accountState.quantityBaseValue += quantityBaseValue;
                }
            }
        }

        if (childRowInfos) {
            childRowInfos.forEach((rowInfo) => {
                this.addRowInfoToAccountState(rowInfo, accountState);
            });
        }
    }


    getAccountStateForSubtotalRowInfo(rowInfo) {
        const { subtotalAccountDataItem } = rowInfo;
        if (!subtotalAccountDataItem) {
            return;
        }

        const accountType = A.getAccountType(subtotalAccountDataItem.type);
        const accountState = AS.getFullAccountStateDataItem({}, accountType.hasLots);

        this.addRowInfoToAccountState(rowInfo.subtotaledRowInfo, accountState, 
            accountType.hasLots);
        return accountState;
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
        this.setState(() => {
            const result = this.buildRowInfos();
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


    renderName({ columnInfo, accountDataItem, rowInfo, }) {
        let value;

        if (accountDataItem) {
            value = {
                name: accountDataItem.name,
                description: accountDataItem.description,
            };
        }
        else {
            const { subtotalAccountDataItem } = rowInfo;
            if (subtotalAccountDataItem) {
                if (subtotalAccountDataItem) {
                    value = userMsg('AccountsList-subtotalName',
                        subtotalAccountDataItem.name);

                    columnInfo = Object.assign({}, columnInfo);
                    columnInfo.inputClassExtras 
                        += ' AccountsList-subtotal AccountsList-subtotal-name';
                }
            }
        }

        if (value) {
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: value,
            });
        }

    }


    columnInfoFromRenderArgs(renderArgs) {
        let { columnInfo, rowInfo } = renderArgs;
        if (rowInfo.subtotalAccountDataItem) {
            columnInfo = Object.assign({}, columnInfo);
            columnInfo.inputClassExtras = 'AccountsList-subtotal '
                + ((rowInfo.accountDataItem)
                    ? 'AccountsList-subtotal-collapsed-value'
                    : 'AccountsList-subtotal-value');
        }
        return columnInfo;
    }


    renderBalanceDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { accountDataItem, accountState } = renderArgs;

        const { accessor } = this.props;

        accountDataItem = accountDataItem || renderArgs.subtotalAccountDataItem;
        if (!accountDataItem) {
            return;
        }

        if (!accountState) {
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
        }
        
        let quantityValue;
        
        const accountType = A.getAccountType(accountDataItem.type);
        if (accountType.hasLots) {
            // Need the price...
            const priceDataItem = this.state.pricesByPricedItemId.get(
                accountDataItem.pricedItemId);
            if (priceDataItem) {
                quantityValue = GH.getTotalMarketValueBaseValue({
                    accessor: accessor,
                    pricedItemId: accountDataItem.pricedItemId,
                    accountStateDataItem: accountState,
                    priceDataItem: priceDataItem,
                });
            }
        }
        else {
            const currency = accessor.getCurrencyOfAccountId(accountDataItem.id);
            if (!currency) {
                return;
            }

            let quantityBaseValue;
            
            if (accountState) {
                quantityBaseValue = accountState.quantityBaseValue;
            }
            else {
                const { childAccountIds } = accountDataItem;
                if (!childAccountIds || !childAccountIds.length) {
                    return;
                }

                quantityBaseValue = 0;
            }

            quantityValue = {
                quantityBaseValue: quantityBaseValue,
                currency: currency,
            };
        }

        if (!quantityValue) {
            return;
        }

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
        });
    }


    renderSharesDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { accountDataItem, accountState, quantityDefinition } = renderArgs;

        accountDataItem = accountDataItem || renderArgs.subtotalAccountDataItem;
        if (!accountDataItem) {
            return;
        }

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
            return LCE.renderTotalSharesDisplay({
                columnInfo: columnInfo,
                value: {
                    quantityBaseValue: accountState.quantityBaseValue,
                    quantityDefinition: quantityDefinition,
                }
            });
        }
    }


    renderCostBasisDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { accountDataItem, accountState } = renderArgs;

        accountDataItem = accountDataItem || renderArgs.subtotalAccountDataItem;
        if (!accountDataItem) {
            return;
        }

        const { accessor } = this.props;

        if (!accountState) {
            const accountType = A.getAccountType(accountDataItem.type);
            if (!accountType.hasLots) {
                return;
            }
        
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
        }

        if (!accountState || !accountState.lotStates) {
            return;
        }
        
        const quantityValue = GH.getTotalCostBasisBaseValue({
            accessor: accessor,
            pricedItemId: accountDataItem.pricedItemId,
            accountStateDataItem: accountState,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
        });
    }


    renderCashInDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { accountDataItem, accountState } = renderArgs;

        accountDataItem = accountDataItem || renderArgs.subtotalAccountDataItem;
        if (!accountDataItem) {
            return;
        }

        const { accessor } = this.props;

        if (!accountState) {
            const accountType = A.getAccountType(accountDataItem.type);
            if (!accountType.hasLots) {
                return;
            }
        
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
        }

        if (!accountState || !accountState.lotStates) {
            return;
        }
        
        const quantityValue = GH.getTotalCashInBaseValue({
            accessor: accessor,
            pricedItemId: accountDataItem.pricedItemId,
            accountStateDataItem: accountState,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
        });
    }


    renderGainDisplay(renderArgs) {
        const columnInfo = this.columnInfoFromRenderArgs(renderArgs);
        let { accountDataItem, accountState, calcGainValueCallback, suffix } = renderArgs;

        accountDataItem = accountDataItem || renderArgs.subtotalAccountDataItem;
        if (!accountDataItem) {
            return;
        }

        const { accessor } = this.props;

        if (!accountState) {
            const accountType = A.getAccountType(accountDataItem.type);
            if (!accountType.hasLots) {
                return;
            }
        
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
        }

        if (!accountState || !accountState.lotStates) {
            return;
        }
        
        const priceDataItem = this.state.pricesByPricedItemId.get(
            accountDataItem.pricedItemId);
        if (!priceDataItem) {
            let isMarketValue;
            for (let i = 0; i < accountState.lotStates.length; ++i) {
                if (typeof accountState.lotStates[i].marketValueBaseValue 
                    === 'number') {
                    isMarketValue = true;
                    break;
                }
            }
            if (!isMarketValue) {
                return;
            }
        }

        const quantityValue = calcGainValueCallback({
            accessor: accessor,
            pricedItemId: accountDataItem.pricedItemId,
            accountStateDataItem: accountState,
            priceDataItem: priceDataItem,
        });

        return ACE.renderBalanceDisplay({
            columnInfo: columnInfo,
            value: quantityValue,
            suffix: suffix,
        });
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
            if (rowInfo.subtotalAccountDataItem && !rowInfo.accountDataItem) {
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
            subtotalAccountDataItem: rowInfo.subtotalAccountDataItem,
        };

        switch (columnInfo.key) {
        case 'name' :
            return this.renderName(renderArgs);
        
        case 'description' :
            if (!accountDataItem) {
                return;
            }
            return ACE.renderDescriptionDisplay({
                columnInfo: columnInfo,
                value: {
                    name: accountDataItem.name,
                    description: accountDataItem.description,
                }
            });
        
        case 'accountType' :
            if (!accountDataItem) {
                return;
            }
            return ACE.renderAccountTypeDisplay({
                columnInfo: columnInfo,
                value: {
                    accountType: accountDataItem.type,
                }
            });
        
        case 'balance' :
            return this.renderBalanceDisplay(renderArgs);
        
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
        let { rowInfo, isSizeRender, } = args;
        if (isSizeRender) {
            return;
        }

        let isSubtotal = rowInfo.subtotalAccountDataItem;
        if (!isSubtotal && this.props.showSubtotalsWhenCollapsed
         && (rowInfo.expandCollapseState === ExpandCollapseState.COLLAPSED)) {
            const { accountDataItem } = rowInfo;
            if (accountDataItem && accountDataItem.childAccountIds 
             && accountDataItem.childAccountIds.length) {
                isSubtotal = true;
                rowInfo = Object.assign({}, rowInfo, {
                    subtotalAccountDataItem: rowInfo.accountDataItem,
                    subtotaledRowInfo: rowInfo,
                });
            }
        }

        if (isSubtotal) {
            return {
                accountState: this.getAccountStateForSubtotalRowInfo(rowInfo),
                subtotalRowInfo: rowInfo,
            };
        }
    }


    render() {
        const { props, state } = this;

        return <div className="RowTableContainer AccountsList">
            <CollapsibleRowTable
                columns = {props.columns}
                rowInfos = {state.rowInfos}
                onExpandCollapseRow = {this.onExpandCollapseRow}

                onRenderCell = {this.onRenderCell}
                onPreRenderRow = {this.onPreRenderRow}

                onSetColumnWidth = {this.props.onSetColumnWidth}
                onMoveColumn = {this.props.onMoveColumn}

                activeRowKey = {state.activeRowKey}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems = {this.props.contextMenuItems}
                onChooseContextMenuItem = {this.props.onChooseContextMenuItem}

                id = {this.props.id}
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
    subtotalsLevel: PropTypes.number,
    subtotalAccountIds: PropTypes.arrayOf(PropTypes.number),

    sortAlphabetically: PropTypes.bool,
    children: PropTypes.any,
    id: PropTypes.string,
};
