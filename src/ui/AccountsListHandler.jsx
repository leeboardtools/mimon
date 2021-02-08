import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountsList, createDefaultColumns } from './AccountsList';
import * as A from '../engine/Accounts';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ExpandCollapseState } from '../util-ui/CollapsibleRowTable';
import { RowTableHandler } from './RowTableHelpers';


/**
 * Handler for {@link AccountsList} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountsListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);


        // This should be after all the bind() calls...
        this._rowTableHandler = new RowTableHandler({
            mainWindowHandler: this,
            userIdBase: 'AccountsListHandler',
        });
    }


    shutdownHandler() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    onReconcileAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.openTab('reconciler', { accountId: activeAccountId, });
        }
    }


    openAccountRegister(accountId) {
        if (accountId) {
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
        if (activeAccountId) {
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

        this.setTabIdProjectSettings(tabId, 
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

        this.setTabIdProjectSettings(tabId, 
            {
                hiddenAccountIds: hiddenAccountIds,
            },
            userMsg(actionNameId, accountDataItem.name));
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

        this.setTabIdProjectSettings(tabId, 
            {
                showHiddenAccounts: newState.showHiddenAccounts,
            },
            userMsg(actionNameId));
    }


    onUpdateCollapsedAccountIds(tabId, 
        { accountId, expandCollapseState, collapsedAccountIds}) {

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

        this.setTabIdProjectSettings(tabId, 
            {
                collapsedAccountIds: collapsedAccountIds,
            },
            actionName);
    }



    getTabDropdownInfo(tabId, state, activeAccountId) {
        if (!activeAccountId) {
            const state = this.getTabIdState(tabId);
            if (state) {
                activeAccountId = state.activeAccountId;
            }
        }


        const { hiddenRootAccountTypes, hiddenAccountIds, showHiddenAccounts,
            columns }
            = state;

        const showAccountLabelId = (hiddenAccountIds.indexOf(activeAccountId) >= 0)
            ? 'AccountsListHandler-showAccount'
            : 'AccountsListHandler-hideAccount';
        
        const { accessor } = this.props;

        const accountType = accessor.getTypeOfAccountId(activeAccountId) || {};


        const toggleColumnsSubMenuItems 
            = this._rowTableHandler.createToggleColumnMenuItems(
                tabId, columns);


        const menuItems = [
            { id: 'reconciler',
                label: userMsg('AccountsListHandler-reconcileAccount'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
            { id: 'openAccountRegister',
                label: userMsg('AccountsListHandler-openAccountRegister'),
                disabled: !activeAccountId,
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
                disabled: !activeAccountId,
                onChooseItem: () => this.onModifyAccount(tabId),
            },                        
            { id: 'removeAccount',
                label: userMsg('AccountsListHandler-removeAccount'),
                disabled: !activeAccountId,
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
                        disabled: !activeAccountId,
                        onChooseItem: () => this.onToggleAccountVisible(
                            tabId, activeAccountId),
                    },
                    { id: 'toggleShowHiddenAccounts',
                        label: userMsg('AccountsListHandler-showHiddenAccounts'),
                        checked: showHiddenAccounts,
                        onChooseItem: () => this.onToggleShowHiddenAccounts(
                            tabId),
                    },
                ],
            },
            
            { id: 'columnsSubMenu',
                label: userMsg('AccountsListHandler-columns_subMenu'),
                subMenuItems: toggleColumnsSubMenuItems,
            },

            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state),
        ];

        return {
            items: menuItems,
        };
    }


    onSelectAccount(tabId, accountId) {
        const state = this.getTabIdState(tabId);
        const prevActiveAccountId = state.activeAccountId;

        const { accessor } = this.props;
        const accountType = accessor.getTypeOfAccountId(accountId);
        const prevAccountType = accessor.getTypeOfAccountId(prevActiveAccountId);

        if ((!prevActiveAccountId && accountId)
         || (prevActiveAccountId && !accountId)
         || (accountType !== prevAccountType)) {
            this.setTabIdState(tabId,
                {
                    activeAccountId: accountId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, state, accountId),
                });
        }
        else {
            this.setTabIdState(tabId,
                {
                    activeAccountId: accountId,
                });
        }
    }

    
    onChooseAccount(tabId, accountId) {
        this.openAccountRegister(accountId);
    }



    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an accounts list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        let settings = this.getTabIdProjectSettings(tabId) || {};
        const columns = createDefaultColumns();
        const showHiddenAccounts = settings.showHiddenAccounts;
        const hiddenRootAccountTypes = settings.hiddenRootAccountTypes || [];
        const hiddenAccountIds = settings.hiddenAccountIds || [];
        const collapsedAccountIds = settings.collapsedAccountIds || [];

        const tabEntry = {
            tabId: tabId,
            title: userMsg('AccountsListHandler-masterAccountList_title'),
            onRenderTabPage: this.onRenderTabPage,
            hiddenRootAccountTypes: hiddenRootAccountTypes,
            hiddenAccountIds: hiddenAccountIds,
            showHiddenAccounts: showHiddenAccounts,
            collapsedAccountIds: collapsedAccountIds,
            columns: columns,
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
            initialCollapsedAccountIds = {collapsedAccountIds}
            onUpdateCollapsedAccountIds = {(args) =>
                this.onUpdateCollapsedAccountIds(tabEntry.tabId, args)}
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabEntry.tabId, args)}
            contextMenuItems = {contextMenuItems}
        />;
    }
}
