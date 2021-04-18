import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountsList, createDefaultColumns } from './AccountsList';
import * as A from '../engine/Accounts';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { TabIdRowTableHandler, updateStateFromProjectSettings } from './RowTableHelpers';


/**
 * Handler for {@link AccountsList} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountsListHandler extends MainWindowHandlerBase {
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
            userIdBase: 'AccountsListHandler',
            updateStateFromModifiedProjectSettings: 
                this.updateStateFromModifiedProjectSettings,
        });
    }


    shutdownHandler() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    onReconcileAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (this.props.accessor.getAccountDataItemWithId(activeAccountId)) {
            this.openTab('reconciler', { accountId: activeAccountId, });
        }
    }


    openAccountRegister(accountId) {
        if (this.props.accessor.getAccountDataItemWithId(accountId)) {
            this.openTab('accountRegister', { accountId: accountId, });
        }
    }


    onOpenAccountRegister(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.openAccountRegister(activeAccountId);
        }
    }


    onOpenPricesList(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            const { accessor } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(activeAccountId);
            if (accountDataItem) {
                this.openTab('pricesList', 
                    { pricedItemId: accountDataItem.pricedItemId, });
            }
        }
    }


    onNewAccount(tabId) {
        let parentAccountId;
        let childListIndex = 0;
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            const { accessor } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(activeAccountId);
            const accountType = A.getAccountType(accountDataItem.type);
            if (accountType.allowedChildTypes.length) {
                parentAccountId = activeAccountId;
            }
            else if (accountDataItem) {
                parentAccountId = accountDataItem.parentAccountId;
                const parentAccountDataItem 
                    = accessor.getAccountDataItemWithId(parentAccountId);
                childListIndex = parentAccountDataItem.childAccountIds.indexOf(
                    activeAccountId) + 1;
            }
        }
        this.openTab('accountEditor', { 
            parentAccountId: parentAccountId, 
            childListIndex: childListIndex,
        });
    }


    onModifyAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (this.props.accessor.getAccountDataItemWithId(activeAccountId)) {
            this.openTab('accountEditor', { accountId: activeAccountId, });
        }
    }


    onRemoveAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            // Want to prompt if there are transactions for the account.
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = await accountingActions.asyncCreateRemoveAccountAction(
                    activeAccountId);
                if (action.dependees && action.dependees.length) {
                    const accountDataItem = accessor.getAccountDataItemWithId(
                        activeAccountId);
                    
                    const message = userMsg(
                        'AccountsListHandler-prompt_remove_account_with_transactions',
                        accountDataItem.name);
                    this.setModal(() => {
                        return <QuestionPrompter
                            // eslint-disable-next-line max-len
                            title={userMsg('AccountsListHandler-prompt_remove_account_with_transactions_title')}
                            message={message}
                            onButton={(id) => {
                                if (id === 'yes') {
                                    accessor.asyncApplyAction(action)
                                        .catch((e) => {
                                            this.setErrorMsg(e);
                                        });
                                }
                                this.setModal();
                            }}
                            buttons={StandardButton.YES_NO}
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
        updateStateFromProjectSettings(args, 'hiddenRootAccountTypes');
        updateStateFromProjectSettings(args, 'hiddenAccountIds');

        updateStateFromProjectSettings(args, 'showHiddenAccounts');
        updateStateFromProjectSettings(args, 'showInactiveAccounts');

        updateStateFromProjectSettings(args, 'sortAlphabetically');

        updateStateFromProjectSettings(args, 'collapsedAccountIds');

        updateStateFromProjectSettings(args, 'showSubtotalsWhenCollapsed');
        updateStateFromProjectSettings(args, 'showNetWorth');
        updateStateFromProjectSettings(args, 'showNetIncome');

        updateStateFromProjectSettings(args, 'subtotalsLevel');
    }


    onToggleViewAccountType(tabId, accountType) {
        const state = this.getTabIdState(tabId);
        const hiddenRootAccountTypes = Array.from(state.hiddenRootAccountTypes);
        const index = hiddenRootAccountTypes.indexOf(accountType);
        let actionNameId;
        if (index >= 0) {
            hiddenRootAccountTypes.splice(index, 1);
            actionNameId = 'AccountsListHandler-action_showAccountType';
        }
        else {
            hiddenRootAccountTypes.push(accountType);
            actionNameId = 'AccountsListHandler-action_hideAccountType';
        }

        const newState = Object.assign({}, state, {
            hiddenRootAccountTypes: hiddenRootAccountTypes,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                hiddenRootAccountTypes: hiddenRootAccountTypes,
            },
            userMsg(actionNameId, A.AccountType[accountType].description));
    }


    onToggleAccountVisible(tabId, accountId) {
        const state = this.getTabIdState(tabId);
        const hiddenAccountIds = Array.from(state.hiddenAccountIds);
        const index = hiddenAccountIds.indexOf(accountId);
        let actionNameId;
        if (index >= 0) {
            hiddenAccountIds.splice(index, 1);
            actionNameId = 'AccountsListHandler-action_showAccount';
        }
        else {
            hiddenAccountIds.push(accountId);
            // TODO: Also need to set the active account to something else
            // if we're not showing hidden accounts.
            actionNameId = 'AccountsListHandler-action_hideAccount';
        }

        const newState = Object.assign({}, state, {
            hiddenAccountIds: hiddenAccountIds,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        if (accountDataItem) {
            this.setTabIdProjectSettings(state.projectSettingsId, 
                {
                    hiddenAccountIds: hiddenAccountIds,
                },
                userMsg(actionNameId, accountDataItem.name));
        }
    }


    onToggleShowHiddenAccounts(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showHiddenAccounts: !state.showHiddenAccounts,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showHiddenAccounts)
            ? 'AccountsListHandler-action_showHiddenAccounts'
            : 'AccountsListHandler-action_hideHiddenAccounts';

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
            ? 'AccountsListHandler-action_showInactiveAccounts'
            : 'AccountsListHandler-action_hideInactiveAccounts';

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
            ? 'AccountsListHandler-action_enableSortAlphabetically'
            : 'AccountsListHandler-action_disableSortAlphabetically';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                sortAlphabetically: newState.sortAlphabetically,
            },
            userMsg(actionNameId));
    }


    onUpdateCollapsedAccountIds(tabId, 
        { accountId, expandCollapseState, collapsedAccountIds}) {

        const state = this.getTabIdState(tabId);

        this.setTabIdState(tabId, {
            collapsedAccountIds: collapsedAccountIds
        });

        const actionNameId = (expandCollapseState === ExpandCollapseState.EXPANDED)
            ? 'AccountsListHandler-action_expandAccount'
            : 'AccountsListHandler-action_collapseAccount';

        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);

        let actionName;
        if (accountDataItem) {
            actionName = userMsg(actionNameId, accountDataItem.name);
        }

        this.setTabIdProjectSettings(state.projectSettingsId, 
            {
                collapsedAccountIds: collapsedAccountIds,
            },
            actionName);
    }


    onToggleShowSubtotalsWhenCollapsed(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showSubtotalsWhenCollapsed: !state.showSubtotalsWhenCollapsed,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showSubtotalsWhenCollapsed)
            ? 'AccountsListHandler-action_showSubtotalsWhenCollapsed'
            : 'AccountsListHandler-action_showAccountValuesWhenCollapsed';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                showSubtotalsWhenCollapsed: newState.showSubtotalsWhenCollapsed,
            },
            userMsg(actionNameId));
    }


    onToggleShowNetWorth(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showNetWorth: !state.showNetWorth,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showNetWorth)
            ? 'AccountsListHandler-action_showNetWorth'
            : 'AccountsListHandler-action_hideNetWorth';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                showNetWorth: newState.showNetWorth,
            },
            userMsg(actionNameId));
    }


    onToggleShowNetIncome(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showNetIncome: !state.showNetIncome,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showNetIncome)
            ? 'AccountsListHandler-action_showNetIncome'
            : 'AccountsListHandler-action_hideNetIncome';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                showNetIncome: newState.showNetIncome,
            },
            userMsg(actionNameId));
    }


    onSetSubtotalsLevel(tabId, level) {
        const state = this.getTabIdState(tabId);
        this.setTabIdState(tabId, {
            subtotalsLevel: level,
        });

        let actionNameId;
        switch (level) {
        case Number.MAX_VALUE :
            actionNameId = 'AccountsListHandler-action_subtotals_all';
            break;
        
        default :
            actionNameId = 'AccountsListHandler-action_subtotals_none';
            break;
        
        case 1 :
        case 2 :
        case 3 :
            actionNameId = 'AccountsListHandler-action_subtotals_' + level;
            break;
        }

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                subtotalsLevel: level,
            },
            userMsg(actionNameId));    
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


    getTabDropdownInfo(tabId, state, activeAccountId) {
        if (!activeAccountId) {
            const state = this.getTabIdState(tabId);
            if (state) {
                activeAccountId = state.activeAccountId;
            }
        }


        const { hiddenRootAccountTypes, hiddenAccountIds, showHiddenAccounts,
            showInactiveAccounts, allColumns, sortAlphabetically,
            subtotalsLevel, showSubtotalsWhenCollapsed,
            showNetWorth, showNetIncome }
            = state;

        const showAccountLabelId = (hiddenAccountIds.indexOf(activeAccountId) >= 0)
            ? 'AccountsListHandler-showAccount'
            : 'AccountsListHandler-hideAccount';
        
        const { accessor } = this.props;

        const accountType = accessor.getTypeOfAccountId(activeAccountId) || {};
        const activeAccountDataItem = accessor.getAccountDataItemWithId(activeAccountId);

        const toggleColumnsSubMenuItems 
            = this._rowTableHandler.createToggleColumnMenuItems(
                tabId, allColumns);


        const menuItems = [
            { id: 'reconciler',
                label: userMsg('AccountsListHandler-reconcileAccount'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
            { id: 'openAccountRegister',
                label: userMsg('AccountsListHandler-openAccountRegister'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onOpenAccountRegister(tabId),
            },
            { id: 'openPricesList',
                label: userMsg('AccountsListHandler-openPricesList'),
                disabled: !accountType.hasLots,
                onChooseItem: () => this.onOpenPricesList(tabId),
            },
            {},
            { id: 'newAccount',
                label: userMsg('AccountsListHandler-newAccount'),
                onChooseItem: () => this.onNewAccount(tabId),
            },                        
            { id: 'modifyAccount',
                label: userMsg('AccountsListHandler-modifyAccount'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onModifyAccount(tabId),
            },                        
            { id: 'removeAccount',
                label: userMsg('AccountsListHandler-removeAccount'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onRemoveAccount(tabId),
            },

            {},

            { id: 'accountsVisibilitySubMenu',
                label: userMsg('AccountsListHandler-accountsVisibility_subMenu'),
                subMenuItems: [
                    { id: 'viewAssets',
                        label: userMsg('AccountsListHandler-view_assets'),
                        checked: (hiddenRootAccountTypes.indexOf('ASSET') < 0),
                        onChooseItem: () => this.onToggleViewAccountType(
                            tabId, A.AccountType.ASSET.name),
                    },
                    { id: 'viewLiabilities',
                        label: userMsg('AccountsListHandler-view_liabilities'),
                        checked: (hiddenRootAccountTypes.indexOf('LIABILITY') < 0),
                        onChooseItem: () => this.onToggleViewAccountType(
                            tabId, A.AccountType.LIABILITY.name),
                    },
                    { id: 'viewIncome',
                        label: userMsg('AccountsListHandler-view_income'),
                        checked: (hiddenRootAccountTypes.indexOf('INCOME') < 0),
                        onChooseItem: () => this.onToggleViewAccountType(
                            tabId, A.AccountType.INCOME.name),
                    },
                    { id: 'viewExpenses',
                        label: userMsg('AccountsListHandler-view_expenses'),
                        checked: (hiddenRootAccountTypes.indexOf('EXPENSE') < 0),
                        onChooseItem: () => this.onToggleViewAccountType(
                            tabId, A.AccountType.EXPENSE.name),
                    },
                    { id: 'viewEquity',
                        label: userMsg('AccountsListHandler-view_equity'),
                        checked: (hiddenRootAccountTypes.indexOf('EQUITY') < 0),
                        onChooseItem: () => this.onToggleViewAccountType(
                            tabId, A.AccountType.EQUITY.name),
                    },
                    {},
                    { id: 'toggleAccountVisible',
                        label: userMsg(showAccountLabelId),
                        disabled: !activeAccountDataItem,
                        onChooseItem: () => this.onToggleAccountVisible(
                            tabId, activeAccountId),
                    },
                    { id: 'toggleShowHiddenAccounts',
                        label: userMsg('AccountsListHandler-showHiddenAccounts'),
                        checked: showHiddenAccounts,
                        onChooseItem: () => this.onToggleShowHiddenAccounts(
                            tabId),
                    },
                    {},
                    { id: 'toggleShowInactiveAccounts',
                        label: userMsg('AccountsListHandler-showInactiveAccounts'),
                        checked: showInactiveAccounts,
                        onChooseItem: () => this.onToggleShowInactiveAccounts(
                            tabId),
                    },
                    {},
                    { id: 'toggleDisplayAlphabetically',
                        label: userMsg('AccountsListHandler-displayAlphabetically'),
                        checked: sortAlphabetically,
                        onChooseItem: () => this.onToggleSortAlphabetically(
                            tabId),
                    }
                ],
            },

            { id: 'subtotalsSubMenu',
                label: userMsg('AccountsListHandler-subtotals_subMenu'),
                subMenuItems: [
                    { id: 'toggleShowSubtotalsWhenCollapsed',
                        label: userMsg('AccountsListHandler-subtotalsWhenCollapsed'),
                        checked: showSubtotalsWhenCollapsed,
                        onChooseItem: () => this.onToggleShowSubtotalsWhenCollapsed(
                            tabId),
                    },
                    { id: 'toggleShowNetWorth',
                        label: userMsg('AccountsListHandler-showNetWorth'),
                        checked: showNetWorth,
                        // TODO: disable if both root asset and root liability 
                        // accounts are not displayed.
                        onChooseItem: () => this.onToggleShowNetWorth(
                            tabId),
                    },
                    { id: 'toggleShowNetIncome',
                        label: userMsg('AccountsListHandler-showNetIncome'),
                        checked: showNetIncome,
                        // TODO: disable if both root income and root expense
                        // accounts are not displayed.
                        onChooseItem: () => this.onToggleShowNetIncome(
                            tabId),
                    },
                    {},
                    { id: 'displaySubtotalsForNone',
                        label: userMsg('AccountsListHandler-subtotals_none'),
                        checked: subtotalsLevel <= 0,
                        onChooseItem: () => this.onSetSubtotalsLevel(tabId, 0),
                    },
                    { id: 'displaySubtotalsForAll',
                        label: userMsg('AccountsListHandler-subtotals_all'),
                        checked: (subtotalsLevel === Number.MAX_VALUE),
                        onChooseItem: () => 
                            this.onSetSubtotalsLevel(tabId, Number.MAX_VALUE),
                    },
                    { id: 'displaySubtotalsForTopLevel',
                        label: userMsg('AccountsListHandler-subtotals_1'),
                        checked: (subtotalsLevel === 1),
                        onChooseItem: () => this.onSetSubtotalsLevel(tabId, 1),
                    },
                    { id: 'displaySubtotalsForLevel2',
                        label: userMsg('AccountsListHandler-subtotals_2'),
                        checked: (subtotalsLevel === 2),
                        onChooseItem: () => this.onSetSubtotalsLevel(tabId, 2),
                    },
                    { id: 'displaySubtotalsForLevel3',
                        label: userMsg('AccountsListHandler-subtotals_3'),
                        checked: (subtotalsLevel === 3),
                        onChooseItem: () => this.onSetSubtotalsLevel(tabId, 3),
                    },
                ],
            },
            
            { id: 'columnsSubMenu',
                label: userMsg('AccountsListHandler-columns_subMenu'),
                subMenuItems: toggleColumnsSubMenuItems,
            },

            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state),
            this._rowTableHandler.createResetColumnOrderMenuItem(tabId, state),
            this._rowTableHandler.createToggleRowBordersMenuItem(tabId, state),
        ];

        return {
            items: menuItems,
        };
    }


    onSelectAccount(tabId, accountId) {
        const state = this.getTabIdState(tabId);
        const prevActiveAccountId = state.activeAccountId;

        if (prevActiveAccountId !== accountId) {
            this.setTabIdState(tabId,
                {
                    activeAccountId: accountId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, state, accountId),
                });
        }
    }

    
    onChooseAccount(tabId, accountId) {
        this.openAccountRegister(accountId);
    }



    getMasterTabId() {
        return 'accountsList';
    }

    getTabIdBase() {
        return 'accountsList-';
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an accounts list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        const projectSettingsId = tabId;
        let settings = this.getTabIdProjectSettings(projectSettingsId) || {};
        const title = (tabId === 'accountsList')
            ? userMsg('AccountsListHandler-masterAccountList_title')
            : settings.title;
        const allColumns = createDefaultColumns();
        const showRowBorders = (settings.showRowBorders === undefined)
            ? true
            : settings.showRowBorders;
        const showHiddenAccounts = settings.showHiddenAccounts;
        const showInactiveAccounts = settings.showInactiveAccounts;
        const hiddenRootAccountTypes = settings.hiddenRootAccountTypes || [];
        const hiddenAccountIds = settings.hiddenAccountIds || [];
        const collapsedAccountIds = settings.collapsedAccountIds || [];
        const sortAlphabetically = (settings.sortAlphabetically === undefined)
            ? true
            : settings.sortAlphabetically;
        const showSubtotalsWhenCollapsed 
            = (settings.showSubtotalsWhenCollapsed === undefined)
                ? true
                : settings.showSubtotalsWhenCollapsed;
        const showNetWorth = (settings.showNetWorth === undefined)
            ? true
            : settings.showNetWorth;
        const showNetIncome = (settings.showNetIncome === undefined)
            ? true
            : settings.showNetIncome;
        const subtotalsLevel = (settings.subtotalsLevel === undefined)
            ? 3
            : settings.subtotalsLevel;
        const subtotalAccountIds = settings.subtotalAccountIds || [];

        const tabEntry = {
            tabId: tabId,
            title: title,
            hasClose: tabId !== 'accountsList',
            onRenderTabPage: this.onRenderTabPage,
            projectSettingsId: projectSettingsId,
            hiddenRootAccountTypes: hiddenRootAccountTypes,
            hiddenAccountIds: hiddenAccountIds,
            showHiddenAccounts: showHiddenAccounts,
            showInactiveAccounts: showInactiveAccounts,
            collapsedAccountIds: collapsedAccountIds,
            sortAlphabetically: sortAlphabetically,
            showSubtotalsWhenCollapsed: showSubtotalsWhenCollapsed,
            showNetWorth: showNetWorth,
            showNetIncome: showNetIncome,
            subtotalsLevel: subtotalsLevel,
            subtotalAccountIds: subtotalAccountIds,
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
     * account list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo, collapsedAccountIds } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <AccountsList
            accessor = {accessor}
            onSelectAccount = {(accountId) => 
                this.onSelectAccount(tabEntry.tabId, accountId)}
            onChooseAccount = {(accountId) => 
                this.onChooseAccount(tabEntry.tabId, accountId)}
            columns = {tabEntry.columns}
            hiddenRootAccountTypes = {tabEntry.hiddenRootAccountTypes}
            hiddenAccountIds = {tabEntry.hiddenAccountIds}
            showHiddenAccounts = {tabEntry.showHiddenAccounts}
            showInactiveAccounts = {tabEntry.showInactiveAccounts}
            sortAlphabetically = {tabEntry.sortAlphabetically}

            collapsedAccountIds = {collapsedAccountIds}
            onUpdateCollapsedAccountIds = {(args) =>
                this.onUpdateCollapsedAccountIds(tabEntry.tabId, args)}

            showSubtotalsWhenCollapsed = {tabEntry.showSubtotalsWhenCollapsed}
            showNetWorth = {tabEntry.showNetWorth}
            showNetIncome = {tabEntry.showNetIncome}

            subtotalsLevel = {tabEntry.subtotalsLevel}
            subtotalAccountIds = {tabEntry.subtotalAccountIds}

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
