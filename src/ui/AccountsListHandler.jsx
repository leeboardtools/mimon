import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountsList, createDefaultColumns } from './AccountsList';
import * as A from '../engine/Accounts';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { TabIdRowTableHandler, updateStateFromProjectSettings } from './RowTableHelpers';
import { getYMDDate, YMDDate } from '../util/YMDDate';
import { DateSelectorBar, DateRangeBar } from './DateSelectorBar';
import { resolveDateSelector } from '../util/DateSelectorDef';
import { resolveDateRange } from '../util/DateRangeDef';


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
        updateStateFromProjectSettings(args, 'showDateSelector');

        updateStateFromProjectSettings(args, 'hiddenRootAccountTypes');
        updateStateFromProjectSettings(args, 'hiddenAccountIds');

        updateStateFromProjectSettings(args, 'showHiddenAccounts');
        updateStateFromProjectSettings(args, 'showInactiveAccounts');

        updateStateFromProjectSettings(args, 'sortAlphabetically');

        updateStateFromProjectSettings(args, 'dateSelectorDef');
        updateStateFromProjectSettings(args, 'dateRangeDef');

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


    onExpandCollapseChildAccounts(tabId, accountId, expandCollapseState) {
        const state = this.getTabIdState(tabId);

        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        const { childAccountIds } = accountDataItem;

        let actionNameId;
        const collapsedAccountIdsSet = new Set(state.collapsedAccountIds);
        if (expandCollapseState === ExpandCollapseState.EXPANDED) {
            childAccountIds.forEach((childAccountId) => 
                collapsedAccountIdsSet.delete(childAccountId)
            );
            actionNameId = 'AccountsListHandler-action_expandChildAccounts';
        }
        else {
            childAccountIds.forEach((childAccountId) => 
                collapsedAccountIdsSet.add(childAccountId)
            );
            actionNameId = 'AccountsListHandler-action_collapseChildAccounts';
        }

        this.onUpdateCollapsedAccountIds(tabId, {
            accountId: accountId,
            collapsedAccountIds: Array.from(collapsedAccountIdsSet.values()),
            actionName: userMsg(actionNameId),
        });
    }


    onUpdateCollapsedAccountIds(tabId, 
        { accountId, expandCollapseState, collapsedAccountIds, actionName}) {

        const state = this.getTabIdState(tabId);

        this.setTabIdState(tabId, {
            collapsedAccountIds: collapsedAccountIds
        });

        if (!actionName) {
            const actionNameId = (expandCollapseState === ExpandCollapseState.EXPANDED)
                ? 'AccountsListHandler-action_expandAccount'
                : 'AccountsListHandler-action_collapseAccount';

            const accountDataItem = this.props.accessor.getAccountDataItemWithId(
                accountId);

            if (accountDataItem) {
                actionName = userMsg(actionNameId, accountDataItem.name);
            }
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


    onToggleDateSelector(tabId, stateChanges) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, 
            stateChanges || {
                showDateSelector: !state.showDateSelector,
            });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        
        const actionNameId = (newState.showDateSelector)
            ? 'AccountsListHandler-action_showDateSelector'
            : 'AccountsListHandler-action_hideDateSelector';

        this.setTabIdState(tabId, newState);

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                showDateSelector: newState.showDateSelector,
            },
            userMsg(actionNameId));
    }


    onYMDDateChange(tabId, change, actionNameId) {
        const state = this.getTabIdState(tabId);
        this.setTabIdState(tabId, change);

        this.setTabIdProjectSettings(state.projectSettingsId,
            change,
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
            const stringTable = renderAsStringTable();
            if (!stringTable) {
                return;
            }

            if (state.showDateSelector) {
                const { accessor } = this.props;

                let startYMDDate;
                let endYMDDate;
                if (state.allowAsset || state.allowLiability) {
                    endYMDDate = resolveDateSelector(state.dateSelectorDef);
                }
                else {
                    const dateRange = resolveDateRange(state.dateRangeDef);
                    if (dateRange) {
                        startYMDDate = dateRange.earliestYMDDate;
                        endYMDDate = dateRange.latestYMDDate;
                    }
                }

                let dateLine;
                if (startYMDDate) {
                    dateLine = userMsg('AccountsListHandler-dateRangeString',
                        accessor.formatDate(startYMDDate),
                        accessor.formatDate(endYMDDate));
                }
                else {
                    dateLine = userMsg('AccountsListHandler-dateString',
                        accessor.formatDate(endYMDDate));
                }
                
                stringTable.splice(0, 0, dateLine);
            }

            return stringTable;
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
            showNetWorth, showNetIncome,
            showDateSelector,
            allowAsset, allowLiability, allowIncome, allowExpense, allowEquity, }
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


        const menuItems = [];
        menuItems.push({ id: 'reconciler',
            label: userMsg('AccountsListHandler-reconcileAccount'),
            disabled: !activeAccountDataItem,
            onChooseItem: () => this.onReconcileAccount(tabId),
        });
        menuItems.push({ id: 'openAccountRegister',
            label: userMsg('AccountsListHandler-openAccountRegister'),
            disabled: !activeAccountDataItem,
            onChooseItem: () => this.onOpenAccountRegister(tabId),
        });

        if (allowAsset) {
            menuItems.push({ id: 'openPricesList',
                label: userMsg('AccountsListHandler-openPricesList'),
                disabled: !accountType.hasLots,
                onChooseItem: () => this.onOpenPricesList(tabId),
            });
        }

        menuItems.push({ id: 'toggleDateSelector',
            label: userMsg('AccountsListHandler-showDateSelector'),
            checked: showDateSelector,
            onChooseItem: () => this.onToggleDateSelector(tabId),
        });

        menuItems.push({});

        let expandChildrenDisabled = true;
        let collapseChildrenDisabled = true;
        if (activeAccountDataItem) {
            const { childAccountIds } = activeAccountDataItem;
            if (childAccountIds) {
                for (let i = 0; i < childAccountIds.length; ++i) {
                    const isCollapsed 
                        = state.collapsedAccountIds.indexOf(childAccountIds[i]) >= 0;
                    if (isCollapsed) {
                        expandChildrenDisabled = false;
                        if (!collapseChildrenDisabled) {
                            break;
                        }
                    }
                    else {
                        collapseChildrenDisabled = false;
                        if (!expandChildrenDisabled) {
                            break;
                        }
                    }
                }
            }
        }

        menuItems.push({ id: 'expandChildAccounts',
            label: userMsg('AccountsListHandler-expandChildAccounts'),
            disabled: expandChildrenDisabled,
            onChooseItem: () => this.onExpandCollapseChildAccounts(tabId,
                activeAccountId, ExpandCollapseState.EXPANDED)
        });
        
        menuItems.push({ id: 'collapseChildAccounts',
            label: userMsg('AccountsListHandler-collapseChildAccounts'),
            disabled: collapseChildrenDisabled,
            onChooseItem: () => this.onExpandCollapseChildAccounts(tabId,
                activeAccountId, ExpandCollapseState.COLLAPSED)
        });

        menuItems.push({});

        if (allowAsset && allowLiability && allowIncome && allowExpense && allowEquity) {
            menuItems.push({ id: 'newAccount',
                label: userMsg('AccountsListHandler-newAccount'),
                onChooseItem: () => this.onNewAccount(tabId),
            });
            menuItems.push({ id: 'modifyAccount',
                label: userMsg('AccountsListHandler-modifyAccount'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onModifyAccount(tabId),
            });
            menuItems.push({ id: 'removeAccount',
                label: userMsg('AccountsListHandler-removeAccount'),
                disabled: !activeAccountDataItem,
                onChooseItem: () => this.onRemoveAccount(tabId),
            });
    
            menuItems.push({});
        }

        
        const visibilityMenuItems = [];
        menuItems.push({ id: 'accountsVisibilitySubMenu',
            label: userMsg('AccountsListHandler-accountsVisibility_subMenu'),
            subMenuItems: visibilityMenuItems,
        });
        if (allowAsset) {
            visibilityMenuItems.push({ id: 'viewAssets',
                label: userMsg('AccountsListHandler-view_assets'),
                checked: (hiddenRootAccountTypes.indexOf('ASSET') < 0),
                onChooseItem: () => this.onToggleViewAccountType(
                    tabId, A.AccountType.ASSET.name),
            });
        }
        if (allowLiability) {
            visibilityMenuItems.push({ id: 'viewLiabilities',
                label: userMsg('AccountsListHandler-view_liabilities'),
                checked: (hiddenRootAccountTypes.indexOf('LIABILITY') < 0),
                onChooseItem: () => this.onToggleViewAccountType(
                    tabId, A.AccountType.LIABILITY.name),
            });
        }
        if (allowIncome) {
            visibilityMenuItems.push({ id: 'viewIncome',
                label: userMsg('AccountsListHandler-view_income'),
                checked: (hiddenRootAccountTypes.indexOf('INCOME') < 0),
                onChooseItem: () => this.onToggleViewAccountType(
                    tabId, A.AccountType.INCOME.name),
            });
        }
        if (allowExpense) {
            visibilityMenuItems.push({ id: 'viewExpenses',
                label: userMsg('AccountsListHandler-view_expenses'),
                checked: (hiddenRootAccountTypes.indexOf('EXPENSE') < 0),
                onChooseItem: () => this.onToggleViewAccountType(
                    tabId, A.AccountType.EXPENSE.name),
            });
        }

        if (allowEquity) {
            visibilityMenuItems.push({ id: 'viewEquity',
                label: userMsg('AccountsListHandler-view_equity'),
                checked: (hiddenRootAccountTypes.indexOf('EQUITY') < 0),
                onChooseItem: () => this.onToggleViewAccountType(
                    tabId, A.AccountType.EQUITY.name),
            });
        }

        visibilityMenuItems.push({});
        visibilityMenuItems.push({ id: 'toggleAccountVisible',
            label: userMsg(showAccountLabelId),
            disabled: !activeAccountDataItem,
            onChooseItem: () => this.onToggleAccountVisible(
                tabId, activeAccountId),
        });
        visibilityMenuItems.push({ id: 'toggleShowHiddenAccounts',
            label: userMsg('AccountsListHandler-showHiddenAccounts'),
            checked: showHiddenAccounts,
            onChooseItem: () => this.onToggleShowHiddenAccounts(
                tabId),
        });
        visibilityMenuItems.push({});
        visibilityMenuItems.push({ id: 'toggleShowInactiveAccounts',
            label: userMsg('AccountsListHandler-showInactiveAccounts'),
            checked: showInactiveAccounts,
            onChooseItem: () => this.onToggleShowInactiveAccounts(
                tabId),
        });

        visibilityMenuItems.push({});

        visibilityMenuItems.push(this._rowTableHandler.createClearColumnSortingMenuItem(
            tabId, state
        ));
        visibilityMenuItems.push({ id: 'toggleDisplayAlphabetically',
            label: userMsg('AccountsListHandler-displayAlphabetically'),
            checked: sortAlphabetically,
            onChooseItem: () => this.onToggleSortAlphabetically(
                tabId),
        });

        const subtotalsMenuItem = [];
        menuItems.push({ id: 'subtotalsSubMenu',
            label: userMsg('AccountsListHandler-subtotals_subMenu'),
            subMenuItems: subtotalsMenuItem,
        });
        subtotalsMenuItem.push({ id: 'toggleShowSubtotalsWhenCollapsed',
            label: userMsg('AccountsListHandler-subtotalsWhenCollapsed'),
            checked: showSubtotalsWhenCollapsed,
            onChooseItem: () => this.onToggleShowSubtotalsWhenCollapsed(
                tabId),
        });
        if (allowAsset || allowLiability) {
            subtotalsMenuItem.push({ id: 'toggleShowNetWorth',
                label: userMsg('AccountsListHandler-showNetWorth'),
                checked: showNetWorth,
                onChooseItem: () => this.onToggleShowNetWorth(
                    tabId),
            });
        }
        if (allowIncome || allowExpense) {
            subtotalsMenuItem.push({ id: 'toggleShowNetIncome',
                label: userMsg('AccountsListHandler-showNetIncome'),
                checked: showNetIncome,
                onChooseItem: () => this.onToggleShowNetIncome(
                    tabId),
            });
        }
        subtotalsMenuItem.push({});
        subtotalsMenuItem.push({ id: 'displaySubtotalsForNone',
            label: userMsg('AccountsListHandler-subtotals_none'),
            checked: subtotalsLevel <= 0,
            onChooseItem: () => this.onSetSubtotalsLevel(tabId, 0),
        });
        subtotalsMenuItem.push({ id: 'displaySubtotalsForAll',
            label: userMsg('AccountsListHandler-subtotals_all'),
            checked: (subtotalsLevel === Number.MAX_VALUE),
            onChooseItem: () => 
                this.onSetSubtotalsLevel(tabId, Number.MAX_VALUE),
        });
        subtotalsMenuItem.push({ id: 'displaySubtotalsForTopLevel',
            label: userMsg('AccountsListHandler-subtotals_1'),
            checked: (subtotalsLevel === 1),
            onChooseItem: () => this.onSetSubtotalsLevel(tabId, 1),
        });
        subtotalsMenuItem.push({ id: 'displaySubtotalsForLevel2',
            label: userMsg('AccountsListHandler-subtotals_2'),
            checked: (subtotalsLevel === 2),
            onChooseItem: () => this.onSetSubtotalsLevel(tabId, 2),
        });
        subtotalsMenuItem.push({ id: 'displaySubtotalsForLevel3',
            label: userMsg('AccountsListHandler-subtotals_3'),
            checked: (subtotalsLevel === 3),
            onChooseItem: () => this.onSetSubtotalsLevel(tabId, 3),
        });

        menuItems.push({ id: 'columnsSubMenu',
            label: userMsg('AccountsListHandler-columns_subMenu'),
            subMenuItems: toggleColumnsSubMenuItems,
        });

        menuItems.push(this._rowTableHandler.createResetColumnWidthsMenuItem(
            tabId, state));
        menuItems.push(this._rowTableHandler.createResetColumnOrderMenuItem(
            tabId, state));
        menuItems.push(this._rowTableHandler.createToggleRowBordersMenuItem(
            tabId, state));

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

    getNetWorthTabIdSuffix() {
        return '-netWorth';
    }

    getNetIncomeTabIdSuffix() {
        return '-netIncome';
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
        let title = (tabId === 'accountsList')
            ? userMsg('AccountsListHandler-masterAccountList_title')
            : settings.title;
        const allColumns = createDefaultColumns();
        const showDateSelector = (settings.showDateSelector === undefined)
            ? false
            : settings.showDateSelector;
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
        let showNetWorth = (settings.showNetWorth === undefined)
            ? true
            : settings.showNetWorth;
        let showNetIncome = (settings.showNetIncome === undefined)
            ? true
            : settings.showNetIncome;
        const subtotalsLevel = (settings.subtotalsLevel === undefined)
            ? 3
            : settings.subtotalsLevel;
        const subtotalAccountIds = settings.subtotalAccountIds || [];

        let topLevelAccountIds = settings.topLevelAccountIds;
        if (!topLevelAccountIds) {
            const { accessor } = this.props;
            if (tabId.endsWith(this.getNetWorthTabIdSuffix())) {
                topLevelAccountIds = [
                    accessor.getRootAssetAccountId(),
                    accessor.getRootLiabilityAccountId(),
                ];
                if (!title) {
                    title = userMsg('AccountsListHandler-masterNetWorthList_title');
                }

                showNetIncome = false;
            }
            else if (tabId.endsWith(this.getNetIncomeTabIdSuffix())) {
                topLevelAccountIds = [
                    accessor.getRootIncomeAccountId(),
                    accessor.getRootExpenseAccountId(),
                ];
                if (!title) {
                    title = userMsg('AccountsListHandler-masterNetIncomeList_title');
                }

                showNetWorth = false;
            }
        }


        let allowAsset;
        let allowLiability;
        let allowIncome;
        let allowExpense;
        let allowEquity;
        if (topLevelAccountIds) {
            const { accessor } = this.props;
            topLevelAccountIds.forEach((accountId) => {
                if (accountId === accessor.getRootAssetAccountId()) {
                    allowAsset = true;
                }
                else if (accountId === accessor.getRootLiabilityAccountId()) {
                    allowLiability = true;
                }
                else if (accountId === accessor.getRootIncomeAccountId()) {
                    allowIncome = true;
                }
                else if (accountId === accessor.getRootExpenseAccountId()) {
                    allowExpense = true;
                }
                else if (accountId === accessor.getRootEquityAccountId()) {
                    allowEquity = true;
                }
            });
        }
        else {
            allowAsset = true;
            allowLiability = true;
            allowIncome = true;
            allowExpense = true;
            allowEquity = true;
        }

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

            topLevelAccountIds: topLevelAccountIds,
            allowAsset: allowAsset,
            allowLiability: allowLiability,
            allowIncome: allowIncome,
            allowExpense: allowExpense,
            allowEquity: allowEquity,

            dateSelectorDef: settings.dateSelectorDef,
            dateRangeDef: settings.dateRangeDef,
            showDateSelector: showDateSelector,

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

        const { tabId } = tabEntry;

        const state = this.getTabIdState(tabId);
        const { dropdownInfo, collapsedAccountIds, showDateSelector } = state;
        
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        let dateSelector;
        if (showDateSelector) {
            if (tabEntry.allowAsset || tabEntry.allowLiability) {
                dateSelector = <DateSelectorBar
                    classExtras = "AccountsList-DateSelectorBar"
                    label = {userMsg('AccountsListHandler-as_of_date_label')}

                    dateSelectorDef = {tabEntry.dateSelectorDef}
                    onDateSelectorDefChange = {
                        (dateSelectorDefDataItem) => this.onYMDDateChange(
                            tabId, 
                            {
                                dateSelectorDef: dateSelectorDefDataItem,
                            },
                            'AccountsListHandler-action_as_of_date')}
                    excludeFuture

                    dateFormat = {accessor.getDateFormat()}
                    onClose = {() => this.onToggleDateSelector(tabId, {
                        showDateSelector: false,
                    })}
                />;
            }
            else {
                dateSelector = <DateRangeBar
                    classExtras = "AccountsList-DateSelectorBar"
                    dateFormat = {accessor.getDateFormat()}

                    dateRangeDef = {tabEntry.dateRangeDef}
                    onDateRangeDefChange = {
                        (dateRangeDefDataItem) => this.onYMDDateChange(
                            tabId, 
                            {
                                dateRangeDef: dateRangeDefDataItem,
                            },
                            'AccountsListHandler-action_dateRange')}
                    excludeFuture

                    onClose = {() => this.onToggleDateSelector(tabId, {
                        showDateSelector: false,
                    })}
                />;
            }
        }

        const todayString = getYMDDate(new YMDDate());

        let startYMDDate;
        let endYMDDate;
        if (tabEntry.allowAsset || tabEntry.allowLiability) {
            endYMDDate = resolveDateSelector(tabEntry.dateSelectorDef, todayString);
        }
        else {
            const dateRange = resolveDateRange(tabEntry.dateRangeDef, todayString);
            if (dateRange) {
                startYMDDate = dateRange.earliestYMDDate;
                endYMDDate = dateRange.latestYMDDate;
            }
        }

        return <AccountsList
            accessor = {accessor}
            onSelectAccount = {(accountId) => 
                this.onSelectAccount(tabId, accountId)}
            onChooseAccount = {(accountId) => 
                this.onChooseAccount(tabId, accountId)}
            columns = {tabEntry.columns}
            hiddenRootAccountTypes = {tabEntry.hiddenRootAccountTypes}
            hiddenAccountIds = {tabEntry.hiddenAccountIds}
            showHiddenAccounts = {tabEntry.showHiddenAccounts}
            showInactiveAccounts = {tabEntry.showInactiveAccounts}
            sortAlphabetically = {tabEntry.sortAlphabetically}

            topLevelAccountIds = {tabEntry.topLevelAccountIds}
            startYMDDate = {startYMDDate}
            endYMDDate = {endYMDDate}

            collapsedAccountIds = {collapsedAccountIds}
            onUpdateCollapsedAccountIds = {(args) =>
                this.onUpdateCollapsedAccountIds(tabId, args)}

            showSubtotalsWhenCollapsed = {tabEntry.showSubtotalsWhenCollapsed}
            showNetWorth = {tabEntry.showNetWorth}
            showNetIncome = {tabEntry.showNetIncome}

            subtotalsLevel = {tabEntry.subtotalsLevel}
            subtotalAccountIds = {tabEntry.subtotalAccountIds}

            showRowBorders = {tabEntry.showRowBorders}

            columnSorting = {tabEntry.columnSorting}
            onColumnSortingChange = {(args) =>
                this._rowTableHandler.onColumnSortingChange(tabId, args)}
                
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabId, args)}
            onMoveColumn = {(args) =>
                this._rowTableHandler.onMoveColumn(tabId, args)}
            contextMenuItems = {contextMenuItems}

            header = {dateSelector}

            ref = {tabEntry.pageRef}

            id = {tabId}
        />;
    }
}
