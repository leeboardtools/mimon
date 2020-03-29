import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountRegister } from './AccountRegister';

 

/**
 * Handler for {@link AccountRegister} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountRegisterHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        this.onNewTransaction = this.onNewTransaction.bind(this);
        this.onModifyTransaction = this.onModifyTransaction.bind(this);
        this.onRemoveTransaction = this.onRemoveTransaction.bind(this);

        this.onCopyTransaction = this.onCopyTransaction.bind(this);
        this.onPasteTransaction = this.onPasteTransaction.bind(this);

        this.onReconcileAccount = this.onReconcileAccount.bind(this);
    }

    onReconcileAccount(tabId) {
        const { accountId} = this.getTabIdState(tabId);
        if (accountId) {
            this.openTab('reconcileAccount', accountId);
        }
    }


    onNewTransaction(tabId) {
        this.setErrorMsg('onNewTransaction is not yet implemented.');
    }


    onModifyTransaction(tabId) {
        this.setErrorMsg('onMpdifyTransaction is not yet implemented.');
    }
    

    onRemoveTransaction(tabId) {
        this.setErrorMsg('onRemoveTransaction is not yet implemented.');
    }
    

    onCopyTransaction(tabId) {
        this.setErrorMsg('onCopyTransaction is not yet implemented.');
    }
    

    onPasteTransaction(tabId) {
        this.setErrorMsg('onPasteTransaction is not yet implemented.');
    }
    

    getTabDropdownInfo(tabId) {
        let activeTransactionId;

        const menuItems = [
            { id: 'newTransaction',
                label: userMsg('AccountRegisterHandler-newTransaction'),
                onChooseItem: () => this.onNewTransaction(tabId),
            },
            { id: 'modifyTransaction',
                label: userMsg('AccountRegisterHandler-modifyTransaction'),
                disabled: !activeTransactionId,
                onChooseItem: () => this.onModifyTransaction(tabId),
            },
            { id: 'removeTransaction',
                label: userMsg('AccountRegisterHandler-removeTransaction'),
                disabled: !activeTransactionId,
                onChooseItem: () => this.onRemoveTransaction(tabId),
            },
            {},
            { id: 'copyTransaction',
                label: userMsg('AccountRegisterHandler-copyTransaction'),
                disabled: !activeTransactionId,
                onChooseItem: () => this.onCopyTransaction(tabId),
            },
            { id: 'pasteTransaction',
                label: userMsg('AccountRegisterHandler-pasteTransaction'),
                disabled: !activeTransactionId,
                onChooseItem: () => this.onPasteTransaction(tabId),
            },
            {},
            { id: 'reconcileAccount',
                label: userMsg('AccountsListHandler-reconcileAccount'),
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
        ];
        return {
            items: menuItems,
        };
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for a account register page.
     * @param {string} tabId 
     * @param {number}  accountId
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, accountId) {
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        return {
            tabId: tabId,
            title: accountDataItem.name,
            accountId: accountId,
            dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
        };
    }


    /**
     * Called by {@link MainWindow} to render the account list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        const { accountId } = tabEntry;
        return <AccountRegister
            accessor={accessor}
            accountId={accountId}
        />;
    }
}