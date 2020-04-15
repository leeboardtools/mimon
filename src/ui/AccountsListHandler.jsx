import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountsList } from './AccountsList';
import * as A from '../engine/Accounts';

/**
 * Handler for {@link AccountsList} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountsListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onReconcileAccount = this.onReconcileAccount.bind(this);
        this.onOpenAccountRegister = this.onOpenAccountRegister.bind(this);
        this.onNewAccount = this.onNewAccount.bind(this);
        this.onModifyAccount = this.onModifyAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);

        this.onToggleViewAccountType = this.onToggleViewAccountType.bind(this);
        this.onToggleAccountVisible = this.onToggleAccountVisible.bind(this);
        this.onToggleShowHiddenAccounts = this.onToggleShowHiddenAccounts.bind(this);

        this.onSelectAccount = this.onSelectAccount.bind(this);
        this.onChooseAccount = this.onChooseAccount.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    onReconcileAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.openTab('reconcileAccount', activeAccountId);
        }
    }


    openAccountRegister(accountId) {
        if (accountId) {
            this.openTab('accountRegister', accountId);
        }
    }


    onOpenAccountRegister(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.openAccountRegister(activeAccountId);
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
        this.openTab('accountEditor', undefined, parentAccountId, childListIndex);
    }


    onModifyAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.openTab('accountEditor', activeAccountId);
        }
    }


    onRemoveAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.setErrorMsg('onRemoveAccount is not yet implemented.');
        }
    }


    onToggleViewAccountType(tabId, accountType) {
        const state = this.getTabIdState(tabId);
        const hiddenRootAccountTypes = Array.from(state.hiddenRootAccountTypes);
        const index = hiddenRootAccountTypes.indexOf(accountType);
        if (index >= 0) {
            hiddenRootAccountTypes.splice(index, 1);
        }
        else {
            hiddenRootAccountTypes.push(accountType);
        }

        const hiddenInfo = Object.assign({}, state, {
            hiddenRootAccountTypes: hiddenRootAccountTypes,
        });

        this.setTabIdState(tabId, {
            hiddenRootAccountTypes: hiddenRootAccountTypes,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeAccountId, hiddenInfo),
        });
    }


    onToggleAccountVisible(tabId, accountId) {
        const state = this.getTabIdState(tabId);
        const hiddenAccountIds = Array.from(state.hiddenAccountIds);
        const index = hiddenAccountIds.indexOf(accountId);
        if (index >= 0) {
            hiddenAccountIds.splice(index, 1);
        }
        else {
            hiddenAccountIds.push(accountId);
            // TODO: Also need to set the active account to something else
            // if we're not showing hidden accounts.
        }

        const hiddenInfo = Object.assign({}, state, {
            hiddenAccountIds: hiddenAccountIds,
        });

        this.setTabIdState(tabId, {
            hiddenAccountIds: hiddenAccountIds,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeAccountId, hiddenInfo),
        });
    }


    onToggleShowHiddenAccounts(tabId) {
        const state = this.getTabIdState(tabId);

        const hiddenInfo = Object.assign({}, state, {
            showHiddenAccounts: !state.showHiddenAccounts,
        });

        this.setTabIdState(tabId, {
            showHiddenAccounts: !state.showHiddenAccounts,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeAccountId, hiddenInfo),
        });

    }


    
    getTabDropdownInfo(tabId, activeAccountId, hiddenInfo) {
        const { hiddenRootAccountTypes, hiddenAccountIds, showHiddenAccounts }
            = hiddenInfo;

        const showAccountLabelId = (hiddenAccountIds.indexOf(activeAccountId) >= 0)
            ? 'AccountsListHandler-showAccount'
            : 'AccountsListHandler-hideAccount';

        const menuItems = [
            { id: 'reconcileAccount',
                label: userMsg('AccountsListHandler-reconcileAccount'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
            { id: 'openAccountRegister',
                label: userMsg('AccountsListHandler-openAccountRegister'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onOpenAccountRegister(tabId),
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
            }
        ];

        return {
            items: menuItems,
        };
    }


    onSelectAccount(tabId, accountId) {
        const state = this.getTabIdState(tabId);
        const prevActiveAccountId = state.activeAccountId;
        if ((!prevActiveAccountId && accountId)
         || (prevActiveAccountId && !accountId)) {
            this.setTabIdState(tabId,
                {
                    activeAccountId: accountId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, accountId, state),
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
        const hiddenInfo = {
            hiddenRootAccountTypes: [],
            hiddenAccountIds: [],
            showHiddenAccounts: false,
        };

        return {
            tabId: tabId,
            title: userMsg('AccountsListHandler-masterAccountList_title'),
            dropdownInfo: this.getTabDropdownInfo(tabId, undefined, hiddenInfo),
            onRenderTabPage: this.onRenderTabPage,
            hiddenRootAccountTypes: [],
            hiddenAccountIds: [],
        };
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
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <AccountsList
            accessor={accessor}
            onSelectAccount={(accountId) => 
                this.onSelectAccount(tabEntry.tabId, accountId)}
            onChooseAccount={(accountId) => 
                this.onChooseAccount(tabEntry.tabId, accountId)}
            hiddenRootAccountTypes={tabEntry.hiddenRootAccountTypes}
            hiddenAccountIds={tabEntry.hiddenAccountIds}
            showHiddenAccounts={tabEntry.showHiddenAccounts}
            contextMenuItems={contextMenuItems}
        />;
    }
}
