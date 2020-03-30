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

        this.onSelectAccount = this.onSelectAccount.bind(this);
        this.onChooseAccount = this.onChooseAccount.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        // TO ADD;
        // Show/ hide accounts
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
        this.setErrorMsg('onNewAccount is not yet implemented.');
    }


    onModifyAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            this.setErrorMsg('onModifyAccount is not yet implemented.');
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

        // TODO: Add callback for saving the state?

        this.setTabIdState(tabId, {
            hiddenRootAccountTypes: hiddenRootAccountTypes,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeAccountId, hiddenRootAccountTypes),
        });
    }

    
    getTabDropdownInfo(tabId, activeAccountId, hiddenRootAccountTypes) {
        if (!hiddenRootAccountTypes) {
            const state = this.getTabIdState(tabId);
            if (state) {
                hiddenRootAccountTypes = state.hiddenRootAccountTypes;
            }
        }

        hiddenRootAccountTypes = hiddenRootAccountTypes || [];

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
        ];

        return {
            items: menuItems,
        };
    }


    onSelectAccount(tabId, accountId) {
        const prevActiveAccountId = this.getTabIdState(tabId).activeAccountId;
        if ((!prevActiveAccountId && accountId)
         || (prevActiveAccountId && !accountId)) {
            this.setTabIdState(tabId,
                {
                    activeAccountId: accountId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, accountId),
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
        return {
            tabId: tabId,
            title: userMsg('AccountsListHandler-masterAccountList_title'),
            dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
            hiddenRootAccountTypes: [],
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
        return <AccountsList
            accessor={accessor}
            onSelectAccount={(accountId) => 
                this.onSelectAccount(tabEntry.tabId, accountId)}
            onChooseAccount={(accountId) => 
                this.onChooseAccount(tabEntry.tabId, accountId)}
            hiddenRootAccountTypes={tabEntry.hiddenRootAccountTypes}
            hiddenAccountIds={tabEntry.hiddenAccountIds}
        />;
    }
}
