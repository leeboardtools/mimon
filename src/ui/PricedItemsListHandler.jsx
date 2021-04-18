import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricedItemsList, createDefaultColumns } from './PricedItemsList';
import * as PI from '../engine/PricedItems';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { TabIdRowTableHandler, updateStateFromProjectSettings, 
} from './RowTableHelpers';
import { getColumnWithKey } from '../util-ui/ColumnInfo';

const pricedItemsListTagPrefix = 'pricedItemsList_';

/**
 * Handler for {@link PricedItemsList} components and their pages in the 
 * {@link MainWindow}, this manages all the pricedItem related commands.
 */
export class PricedItemsListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.updateStateFromModifiedProjectSettings 
            = this.updateStateFromModifiedProjectSettings.bind(this);
            
        this.onExportAsStringTable = this.onExportAsStringTable.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);


        // This should be after all the bind() calls...
        this._rowTableHandler = new TabIdRowTableHandler({
            mainWindowHandler: this,
            userIdBase: 'PricedItemsListHandler',
            updateStateFromModifiedProjectSettings: 
                this.updateStateFromModifiedProjectSettings,
        });
    }


    shutdownHandler() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    /*
    openPricedItemRegister(pricedItemId) {
        if (pricedItemId) {
            this.openTab('pricedItemRegister', pricedItemId);
        }
    }

    onOpenPricedItemRegister(tabId) {
        const { activePricedItemId} = this.getTabIdState(tabId);
        if (activePricedItemId) {
            this.openPricedItemRegister(activePricedItemId);
        }
    }
    */


    onNewPricedItem(tabId, pricedItemTypeName) {
        this.openTab('pricedItemEditor', { pricedItemTypeName: pricedItemTypeName, });
    }


    onModifyPricedItem(tabId) {
        const { activePricedItemId, pricedItemTypeName } = this.getTabIdState(tabId);
        if (activePricedItemId) {
            this.openTab('pricedItemEditor', 
                { pricedItemId: activePricedItemId, 
                    pricedItemTypeName: pricedItemTypeName, 
                });
        }
    }


    onRemovePricedItem(tabId, pricedItemTypeName) {
        const { activePricedItemId} = this.getTabIdState(tabId);
        if (activePricedItemId) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = await accountingActions.asyncCreateRemovePricedItemAction(
                    activePricedItemId);

                if (action.dependees && action.dependees.length) {
                    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                        activePricedItemId);
                    const type = PI.getPricedItemType(pricedItemTypeName);
                    const title = userMsg(
                        // eslint-disable-next-line max-len
                        'AccountsListHandler-prompt_remove_priced_item_with_dependees_title',
                        type.description);
                    const message = userMsg(
                        'AccountsListHandler-prompt_remove_priced_item_with_dependees',
                        type.description, pricedItemDataItem.name);
                    this.setModal(() => {
                        return <QuestionPrompter
                            title = {title}
                            message = {message}
                            onButton = {(id) => {
                                if (id === 'yes') {
                                    accessor.asyncApplyAction(action)
                                        .catch((e) => {
                                            this.setErrorMsg(e);
                                        });
                                }
                                this.setModal();
                            }}
                            buttons = {StandardButton.YES_NO}
                        />;
                    });
                }
                else {
                    accessor.asyncApplyAction(action)
                        .catch((e) => {
                            this.setErrorMsg(e);
                        });
                }
            });
        }
    }


    updateStateFromModifiedProjectSettings(args) {
        updateStateFromProjectSettings(args, 'hiddenPricedItemIds');

        updateStateFromProjectSettings(args, 'showHiddenPricedItems');
        updateStateFromProjectSettings(args, 'showInactivePricedItems');

        updateStateFromProjectSettings(args, 'showAccounts');
        updateStateFromProjectSettings(args, 'showHiddenAccounts');
        updateStateFromProjectSettings(args, 'showInactiveAccounts');

        updateStateFromProjectSettings(args, 'sortAlphabetically');
        updateStateFromProjectSettings(args, 'collapsedPricedItemIds');
    }


    onOpenPricesList(tabId) {
        const { activePricedItemId, } = this.getTabIdState(tabId);
        this.openTab('pricesList', { pricedItemId: activePricedItemId, });
    }


    onTogglePricedItemVisible(tabId, pricedItemId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);
        const hiddenPricedItemIds = Array.from(state.hiddenPricedItemIds);
        const index = hiddenPricedItemIds.indexOf(pricedItemId);
        let actionNameId;
        if (index >= 0) {
            hiddenPricedItemIds.splice(index, 1);
            actionNameId = 'PricedItemsListHandler-showPricedItem';
        }
        else {
            hiddenPricedItemIds.push(pricedItemId);
            actionNameId = 'PricedItemsListHandler-hidePricedItem';
            // TODO: Also need to set the active pricedItem to something else
            // if we're not showing hidden pricedItems.
        }

        const newState = Object.assign({}, state, {
            hiddenPricedItemIds: hiddenPricedItemIds,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                hiddenPricedItemIds: hiddenPricedItemIds,
            },
            userMsg(actionNameId, pricedItemDataItem.name));
    }


    onToggleShowHiddenPricedItems(tabId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showHiddenPricedItems: !state.showHiddenPricedItems,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);


        this.setTabIdState(tabId, newState);

        const pluralTypeDescription 
            = PI.getPricedItemType(pricedItemTypeName).pluralDescription;
        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                showHiddenPricedItems: newState.showHiddenPricedItems,
            },
            userMsg('PricedItemsListHandler-action_toggleShowHiddenPricedItems',
                pluralTypeDescription
            ));
    }


    onToggleShowInactivePricedItems(tabId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showInactivePricedItems: !state.showInactivePricedItems,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);


        this.setTabIdState(tabId, newState);

        const pluralTypeDescription 
            = PI.getPricedItemType(pricedItemTypeName).pluralDescription;
        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                showInactivePricedItems: newState.showInactivePricedItems,
            },
            userMsg('PricedItemsListHandler-action_toggleShowInactivePricedItems',
                pluralTypeDescription
            ));
    }


    onToggleShowAccounts(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showAccounts: !state.showAccounts,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showAccounts)
            ? 'PricedItemsListHandler-action_showAccounts'
            : 'PricedItemsListHandler-action_hideAccounts';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                showAccounts: newState.showAccounts,
            },
            userMsg(actionNameId));
    }


    onToggleShowHiddenAccounts(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showHiddenAccounts: !state.showHiddenAccounts,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showHiddenAccounts)
            ? 'PricedItemsListHandler-action_showHiddenAccounts'
            : 'PricedItemsListHandler-action_hideHiddenAccounts';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                showHiddenAccounts: newState.showHiddenAccounts,
            },
            userMsg(actionNameId));
    }


    onToggleShowInactiveAccounts(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showInactiveAccounts: !state.showInactiveAccounts,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showInactiveAccounts)
            ? 'PricedItemsListHandler-action_showInactiveAccounts'
            : 'PricedItemsListHandler-action_hideInactiveAccounts';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                showInactiveAccounts: newState.showInactiveAccounts,
            },
            userMsg(actionNameId));
    }


    onToggleSortAlphabetically(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            sortAlphabetically: !state.sortAlphabetically,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.sortAlphabetically)
            ? 'PricedItemsListHandler-action_enableSortAlphabetically'
            : 'PricedItemsListHandler-action_disableSortAlphabetically';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                sortAlphabetically: newState.sortAlphabetically,
            },
            userMsg(actionNameId));
    }


    onUpdateCollapsedPricedItemIds(tabId, 
        { pricedItemId, expandCollapseState, collapsedPricedItemIds}) {
        const state = this.getTabIdState(tabId);

        this.setTabIdState(tabId, {
            collapsedPricedItemIds: collapsedPricedItemIds
        });

        const actionNameId = (expandCollapseState === ExpandCollapseState.EXPANDED)
            ? 'PricedItemsListHandler-action_expandPricedItem'
            : 'PricedItemsListHandler-action_collapsePricedItem';

        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);
        
        let actionName;
        if (pricedItemDataItem) {
            actionName = userMsg(actionNameId, 
                pricedItemDataItem.ticker || pricedItemDataItem.name);
        }

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                collapsedPricedItemIds: collapsedPricedItemIds,
            },
            actionName);
    }



    onExportAsStringTable(tabId) {
        const state = this.getTabIdState(tabId);
        const { current } = state.pageRef;
        if (!current) {
            return;
        }

        const { renderAsStringTable } = current;
        if (renderAsStringTable) {
            return renderAsStringTable();
        }
    }

    
    getTabDropdownInfo(tabId, state) {
        const { activePricedItemId, pricedItemTypeName, 
            hiddenPricedItemIds, 
            showHiddenPricedItems, showInactivePricedItems,
            showAccounts, showHiddenAccounts, showInactiveAccounts,
            sortAlphabetically,
            allColumns,
        } = state;

        const showPricedItemLabelId 
            = (hiddenPricedItemIds.indexOf(activePricedItemId) >= 0)
                ? 'PricedItemsListHandler-showPricedItem'
                : 'PricedItemsListHandler-hidePricedItem';

        const optionalColumns = [];
        if (PI.getPricedItemType(pricedItemTypeName).hasTickerSymbol) {
            optionalColumns.push(getColumnWithKey(allColumns, 'totalMarketValue'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalShares'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalCostBasis'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalCashIn'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalGain'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalCashInGain'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalPercentGain'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalCashInPercentGain'));
            optionalColumns.push(getColumnWithKey(allColumns, 'totalAnnualPercentGain'));
            optionalColumns.push(
                getColumnWithKey(allColumns, 'totalAnnualCashInPercentGain'));
            optionalColumns.push(getColumnWithKey(allColumns, 'onlineSource'));
        }
        optionalColumns.push(getColumnWithKey(allColumns, 'currency'));
        optionalColumns.push(getColumnWithKey(allColumns, 'quantityDefinition'));

        const toggleColumnsSubMenuItems 
            = this._rowTableHandler.createToggleColumnMenuItems(
                tabId, optionalColumns);

        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;
        const pluralTypeDescription 
            = PI.getPricedItemType(pricedItemTypeName).pluralDescription;
        const menuItems = [
            { id: 'openPricesList',
                label: userMsg('PricedItemsListHandler-openPricesList', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onOpenPricesList(tabId),
            },
            {},
            { id: 'newPricedItem',
                label: userMsg('PricedItemsListHandler-newPricedItem', 
                    typeDescription),
                onChooseItem: () => this.onNewPricedItem(tabId, pricedItemTypeName),
            },                        
            { id: 'modifyPricedItem',
                label: userMsg('PricedItemsListHandler-modifyPricedItem', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onModifyPricedItem(tabId),
            },                        
            { id: 'removePricedItem',
                label: userMsg('PricedItemsListHandler-removePricedItem', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onRemovePricedItem(tabId, pricedItemTypeName),
            },
            {},
            { id: 'pricedItemsVisibilitySubMenu',
                label: userMsg('PricedItemsListHandler-visibility_subMenu',
                    typeDescription),
                subMenuItems: [
                    { id: 'togglePricedItemVisible',
                        label: userMsg(showPricedItemLabelId, 
                            typeDescription),
                        disabled: !activePricedItemId,
                        onChooseItem: () => this.onTogglePricedItemVisible(
                            tabId, activePricedItemId, pricedItemTypeName),
                    },
                    { id: 'toggleShowHiddenPricedItems',
                        label: userMsg('PricedItemsListHandler-showHiddenPricedItems', 
                            pluralTypeDescription),
                        checked: showHiddenPricedItems,
                        onChooseItem: () => this.onToggleShowHiddenPricedItems(
                            tabId, pricedItemTypeName),
                    },
                    { id: 'toggleShowInactivePricedItems',
                        label: userMsg('PricedItemsListHandler-showInactivePricedItems', 
                            pluralTypeDescription),
                        checked: showInactivePricedItems,
                        onChooseItem: () => this.onToggleShowInactivePricedItems(
                            tabId, pricedItemTypeName),
                    },
                    {},
                    { id: 'toggleSortAlphabetically',
                        label: userMsg('PricedItemsListHandler-sortAlphabetically', 
                            pluralTypeDescription),
                        checked: sortAlphabetically,
                        onChooseItem: () => this.onToggleSortAlphabetically(
                            tabId, pricedItemTypeName),
                    },
                ],
            },
            { id: 'pricedItemsAccountsSubMenu',
                label: userMsg('PricedItemsListHandler-accounts_subMenu'),
                subMenuItems: [
                    { id: 'toggleShowPricedItemAccounts',
                        label: userMsg(
                            'PricedItemsListHandler-showPricedItemAccounts'),
                        checked: showAccounts,
                        onChooseItem: () => this.onToggleShowAccounts(
                            tabId),
                    },
                    { id: 'toggleShowHiddenPricedItemAccounts',
                        label: userMsg(
                            'PricedItemsListHandler-showHiddenPricedItemAccounts'),
                        checked: showHiddenAccounts,
                        onChooseItem: () => this.onToggleShowHiddenAccounts(
                            tabId),
                    },
                    { id: 'toggleShowInactivePricedItemAccounts',
                        label: userMsg(
                            'PricedItemsListHandler-showInactivePricedItemAccounts'),
                        checked: showInactiveAccounts,
                        onChooseItem: () => this.onToggleShowInactiveAccounts(
                            tabId),
                    },
                ],
            },
            {},
            
            { id: 'columnsSubMenu',
                label: userMsg('PricedItemsListHandler-columns_subMenu'),
                subMenuItems: toggleColumnsSubMenuItems,
            },

            {},
            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state),
            this._rowTableHandler.createResetColumnOrderMenuItem(tabId, state),
            this._rowTableHandler.createToggleRowBordersMenuItem(tabId, state),
        ];

        return {
            items: menuItems,
        };
    }


    onSelectItem(tabId, args) {
        const state = this.getTabIdState(tabId);
        const prevActivePricedItemId = state.activePricedItemId;
        const prevActiveAccountId = state.activeAccountId;
        let { pricedItemId, accountId } = args;
        if (accountId && !pricedItemId) {
            const { accessor } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);
            pricedItemId = accountDataItem.pricedItemId;
        }
        
        if ((!prevActivePricedItemId && pricedItemId)
         || (prevActivePricedItemId && !pricedItemId)
         || (!prevActiveAccountId && accountId)
         || (prevActiveAccountId && !accountId)) {
            const newState = Object.assign({}, state, {
                activePricedItemId: pricedItemId,
                activeAccountId: accountId,
            });
            newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
            this.setTabIdState(tabId, newState);
        }
        else {
            this.setTabIdState(tabId,
                {
                    activePricedItemId: pricedItemId,
                    activeAccountId: accountId,
                });
        }
    }

    
    onChooseItem(tabId, args) {
        const { pricedItemId, accountId } = args;
        if (pricedItemId) {
            this.openTab('pricesList', { pricedItemId: pricedItemId, });
        }
        else if (accountId) {
            this.openTab('accountRegister', { accountId: accountId, });
        }
    }



    getMasterTabId(pricedItemTypeName) {
        return pricedItemsListTagPrefix + pricedItemTypeName;
    }

    getTabIdBase(pricedItemTypeName) {
        return pricedItemsListTagPrefix + pricedItemTypeName + '-';
    }


    parsePricedItemsListTabId(tabId) {
        if (!tabId.startsWith(pricedItemsListTagPrefix)) {
            return;
        }

        let pricedItemTypeName = tabId.slice(pricedItemsListTagPrefix.length);
        const customInstanceStart = pricedItemTypeName.indexOf('-');

        let customInstanceName;
        if (customInstanceStart >= 0) {
            customInstanceName = pricedItemTypeName.slice(customInstanceStart + 1);
            pricedItemTypeName = pricedItemTypeName.slice(0, customInstanceStart);
        }

        return {
            tabId: tabId,
            pricedItemTypeName: pricedItemTypeName,
            customIntsanceName: customInstanceName,
        };
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an pricedItems list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, pricedItemTypeName) {
        const projectSettingsId = tabId;

        const masterTabId = this.getMasterTabId(pricedItemTypeName);
        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;

        let settings = this.getTabIdProjectSettings(projectSettingsId) || {};
        const title = (tabId === masterTabId)
            ? userMsg('PricedItemsListHandler-title', typeDescription)
            : settings.title;
        const allColumns = createDefaultColumns(pricedItemTypeName);
        const showRowBorders = (settings.showRowBorders === undefined)
            ? true
            : settings.showRowBorders;
        const collapsedPricedItemIds = settings.collapsedPricedItemIds || [];
        const showAccounts = (settings.showAccounts === undefined)
            ? true
            : settings.showAccounts;
        const sortAlphabetically = (settings.sortAlphabetically === undefined)
            ? true
            : settings.sortAlphabetically;

        const tabEntry = {
            tabId: tabId,
            title: title,
            hasClose: true,
            onRenderTabPage: this.onRenderTabPage,
            pricedItemTypeName: pricedItemTypeName,
            projectSettingsId: projectSettingsId,
            hiddenPricedItemIds: settings.hiddenPricedItemIds || [],
            showHiddenPricedItems: settings.showHiddenPricedItems,
            showInactivePricedItems: settings.showInactivePricedItems,
            showAccounts: showAccounts,
            showHiddenAccounts: settings.showHiddenAccounts,
            showInactiveAccounts: settings.showInactiveAccounts,
            sortAlphabetically: sortAlphabetically,
            collapsedPricedItemIds: collapsedPricedItemIds,
            allColumns: allColumns,
            showRowBorders: showRowBorders,

            pageRef: React.createRef(),
            canExportAsStringTable: () => true,
            onExportAsStringTable: this.onExportAsStringTable,
        };

        this._rowTableHandler.setupTabEntryFromSettings(tabEntry, settings);
        
        tabEntry.dropdownInfo = this.getTabDropdownInfo(tabId, tabEntry);

        return tabEntry;
    }


    /**
     * Called by {@link MainWindow} via the tab entry's onRenderTabPage to render the 
     * pricedItem list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo, collapsedPricedItemIds } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <PricedItemsList
            accessor = {accessor}
            pricedItemTypeName = {tabEntry.pricedItemTypeName}
            onSelectItem = {(args) => 
                this.onSelectItem(tabEntry.tabId, args)}
            onChooseItem = {(args) => 
                this.onChooseItem(tabEntry.tabId, args)}
            columns = {tabEntry.columns}
            hiddenPricedItemIds = {tabEntry.hiddenPricedItemIds}
            showHiddenPricedItems = {tabEntry.showHiddenPricedItems}
            showInactivePricedItems = {tabEntry.showInactivePricedItems}

            showAccounts = {tabEntry.showAccounts}
            showHiddenAccounts = {tabEntry.showHiddenAccounts}
            showInactiveAccounts = {tabEntry.showInactiveAccounts}

            sortAlphabetically = {tabEntry.sortAlphabetically}

            collapsedPricedItemIds = {collapsedPricedItemIds}
            onUpdateCollapsedPricedItemIds = {(args) =>
                this.onUpdateCollapsedPricedItemIds(tabEntry.tabId, args)}
            
            showRowBorders = {tabEntry.showRowBorders}
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabEntry.tabId, args)}
            onMoveColumn = {(args) =>
                this._rowTableHandler.onMoveColumn(tabEntry.tabId, args)}
            contextMenuItems = {contextMenuItems}

            ref = {tabEntry.pageRef}

            id = {tabEntry.tabId}
        />;
    }
}
