import React from 'react';
import { userMsg } from '../util/UserMessages';
import { AccountsList } from './AccountsList';
//import * as A from '../engine/Accounts';


export class AccountsListHandler {
    constructor(props) {
        this.props = props;

        this.getTabIdState = props.onGetTabIdState;
        this.setTabIdState = props.onSetTabIdState;
        this.setErrorMsg = props.onSetErrorMsg;
        this.setModal = props.onSetModal;
        this.openTab = props.onOpenTab;


        this.onReconcileAccount = this.onReconcileAccount.bind(this);
        this.onOpenAccountRegister = this.onOpenAccountRegister.bind(this);
        this.onNewAccount = this.onNewAccount.bind(this);
        this.onModifyAccount = this.onModifyAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);

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

    }


    onModifyAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            console.log('onModifyAccount: ' + activeAccountId);
        }
    }


    onRemoveAccount(tabId) {
        const { activeAccountId} = this.getTabIdState(tabId);
        if (activeAccountId) {
            console.log('onRemoveAccount: ' + activeAccountId);
        }
    }


    createTabEntry(tabId) {
        return {
            tabId: tabId,
            title: userMsg('MainWindow-masterAccountList_title'),
            dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
        };
    }

    
    getTabDropdownInfo(tabId, activeAccountId) {
        console.log('menu: ' + activeAccountId);

        const menuItems = [
            { id: 'reconcileAccount',
                label: userMsg('AccountsListPage-reconcileAccount'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
            { id: 'openAccountRegister',
                label: userMsg('AccountsListPage-openAccountRegister'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onOpenAccountRegister(tabId),
            },
            {},
            { id: 'newAccount',
                label: userMsg('AccountsListPage-newAccount'),
                onChooseItem: () => this.onNewAccount(tabId),
            },                        
            { id: 'modifyAccount',
                label: userMsg('AccountsListPage-modifyAccount'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onModifyAccount(tabId),
            },                        
            { id: 'removeAccount',
                label: userMsg('AccountsListPage-removeAccount'),
                disabled: !activeAccountId,
                onChooseItem: () => this.onRemoveAccount(tabId),
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


    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        return <AccountsList
            accessor={accessor}
            onSelectAccount={(accountId) => 
                this.onSelectAccount(tabEntry.tabId, accountId)}
            onChooseAccount={(accountId) => 
                this.onChooseAccount(tabEntry.tabId, accountId)}
        />;
    }
}
