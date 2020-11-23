import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import deepEqual from 'deep-equal';
import { CollapsibleRowTable, ExpandCollapseState,
    findRowInfoWithKey, updateRowInfo } from '../util-ui/CollapsibleRowTable';
import { getDecimalDefinition, getQuantityDefinitionName } from '../util/Quantities';
import * as ACE from './AccountingCellEditors';
import * as LCE from './LotCellEditors';
import * as GH from '../tools/GainHelpers';
import { columnInfosToColumns,
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';
import { YMDDate } from '../util/YMDDate';


let columnInfoDefs;

/**
 * @returns {ColumnInfo[]} Array containing the available
 * columns for accounts lists.
 */
export function getAccountsListColumnInfoDefs() {
    if (!columnInfoDefs) {

        columnInfoDefs = {
            /*
            name: { key: 'name',
                header: {
                    label: userMsg('AccountsList-name'),
                    ariaLabel: 'Name',
                    classExtras: 'header-base text-left',
                },
                inputClassExtras: 'text-left',
                cellClassName: 'm-0 w-50',
            },
            */
            name: ACE.getNameColumnInfo({}),
            type: ACE.getAccountTypeColumnInfo({}),
            balance: ACE.getBalanceColumnInfo({}),
            totalShares: LCE.getTotalSharesColumnInfo({}),
            costBasis: LCE.getTotalCostBasisColumnInfo({}),
            cashIn: LCE.getTotalCashInColumnInfo({}),
            gain: LCE.getTotalGainColumnInfo({}),
            cashInGain: LCE.getTotalCashInGainColumnInfo({}),
            percentGain: LCE.getTotalSimplePercentGainColumnInfo({}),
            cashInPercentGain: LCE.getTotalCashInPercentGainColumnInfo({}),
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
            pricesYMDDate: undefined,
            pricesByPricedItemId: new Map(),
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


    onOpenActiveRow() {
        const { onChooseAccount } = this.props;
        const { activeRowKey } = this.state;
        if (onChooseAccount && activeRowKey) {
            onChooseAccount(activeRowKey);
        }
    }


    renderBalanceDisplay(columnInfo, accountDataItem, accountState) {
        const { accessor } = this.props;

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
            const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                accountDataItem.pricedItemId
            );
            const currency = pricedItemDataItem.currency
                 || accessor.getBaseCurrencyCode();
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
            return LCE.renderTotalSharesDisplay({
                columnInfo: columnInfo,
                value: {
                    quantityBaseValue: accountState.quantityBaseValue,
                    quantityDefinition: quantityDefinition,
                }
            });
        }
    }


    renderCostBasisDisplay(columnInfo, accountDataItem, accountState, 
        quantityDefinition) {
        const { accessor } = this.props;

        const accountType = A.getAccountType(accountDataItem.type);
        if (!accountType.hasLots) {
            return;
        }
    
        if (!accountState) {
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
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


    renderCashInDisplay(columnInfo, accountDataItem, accountState, 
        quantityDefinition) {
        const { accessor } = this.props;

        const accountType = A.getAccountType(accountDataItem.type);
        if (!accountType.hasLots) {
            return;
        }
    
        if (!accountState) {
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
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


    renderGainDisplay(columnInfo, accountDataItem, accountState, 
        quantityDefinition, calcGainValueCallback, suffix) {
        const { accessor } = this.props;

        const accountType = A.getAccountType(accountDataItem.type);
        if (!accountType.hasLots) {
            return;
        }
    
        if (!accountState) {
            accountState = accessor.getCurrentAccountStateDataItem(
                accountDataItem.id
            );
        }
        
        const priceDataItem = this.state.pricesByPricedItemId.get(
            accountDataItem.pricedItemId);
        if (!priceDataItem) {
            return;
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
            return ACE.renderNameDisplay({
                columnInfo: columnInfo,
                value: {
                    name: accountDataItem.name,
                    description: accountDataItem.description,
                }
            });
        
        case 'accountType' :
            return ACE.renderAccountTypeDisplay({
                columnInfo: columnInfo,
                value: {
                    accountType: accountDataItem.type,
                }
            });
        
        case 'balance' :
            return this.renderBalanceDisplay(columnInfo, accountDataItem,
                accountState);
        
        case 'totalShares' :
            return this.renderSharesDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition);
        
        case 'totalCostBasis' :
            return this.renderCostBasisDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition);
        
        case 'totalCashIn' :
            return this.renderCashInDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition);
        
        case 'totalGain' :
            return this.renderGainDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition, LCE.calcSimpleGainBalanceValue);
        
        case 'totalPercentGain' :
            return this.renderGainDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition, LCE.calcSimplePercentGainBalanceValue,
                this._percentSuffix);
        
        case 'totalCashInGain' :
            return this.renderGainDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition, LCE.calcCashInGainBalanceValue);
        
        case 'totalCashInPercentGain' :
            return this.renderGainDisplay(columnInfo, accountDataItem,
                accountState, quantityDefinition, LCE.calcCashInPercentGainBalanceValue,
                this._percentSuffix);
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
