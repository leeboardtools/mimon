import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountRegister } from './AccountRegister';


function getUndoRedoInfo(tabEntry) {
    const { current } = tabEntry.accountRegisterRef;
    if (current) {
        const { getUndoRedoInfo } = current;
        if (getUndoRedoInfo) {
            return getUndoRedoInfo();
        }
    }
}
 

/**
 * Handler for {@link AccountRegister} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountRegisterHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        this.onRemoveTransaction = this.onRemoveTransaction.bind(this);

        this.onCopyTransaction = this.onCopyTransaction.bind(this);
        this.onPasteTransaction = this.onPasteTransaction.bind(this);

        this.onReconcileAccount = this.onReconcileAccount.bind(this);

        this.onSelectTransaction = this.onSelectTransaction.bind(this);
    }

    onReconcileAccount(tabId) {
        const { accountId} = this.getTabIdState(tabId);
        if (accountId) {
            this.openTab('reconcileAccount', accountId);
        }
    }


    onRemoveTransaction(tabId) {
        const { activeTransactionId } = this.getTabIdState(tabId);
        if (activeTransactionId) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = accountingActions.createRemoveTransactionAction(
                    activeTransactionId);
                accessor.asyncApplyAction(action)
                    .catch((e) => {
                        this.setErrorMsg(e);
                    });
            });
        }
    }
    

    onCopyTransaction(tabId) {
        this.setErrorMsg('onCopyTransaction is not yet implemented.');
    }
    

    onPasteTransaction(tabId) {
        this.setErrorMsg('onPasteTransaction is not yet implemented.');
    }
    

    getTabDropdownInfo(tabId, activeTransactionId) {
        const menuItems = [
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

            // TODO:
            // 'clearNewTransaction - resets the new transaction...
        ];
        return {
            items: menuItems,
        };
    }


    onSelectTransaction(tabId, transactionId) {
        const state = this.getTabIdState(tabId);
        const prevActiveTransactionId = state.activeTransactionId;
        if ((!prevActiveTransactionId && transactionId)
         || (prevActiveTransactionId && !transactionId)) {
            this.setTabIdState(tabId,
                {
                    activeTransactionId: transactionId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, transactionId),
                });
        }
        else {
            this.setTabIdState(tabId,
                {
                    activeTransactionId: transactionId,
                });
        }
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
            hasClose: true,
            accountId: accountId,
            dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
            accountRegisterRef: React.createRef(),
            getUndoRedoInfo: getUndoRedoInfo,
        };
    }


    /**
     * Called by {@link MainWindow} to render the account list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        const { accountId, accountRegisterRef } = tabEntry;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <AccountRegister
            accessor = {accessor}
            accountId = {accountId}
            onSelectTransaction = {(transactionId) =>
                this.onSelectTransaction(tabEntry.tabId, transactionId)}
            contextMenuItems={contextMenuItems}
            refreshUndoMenu = {this.refreshUndoMenu}
            ref = {accountRegisterRef}
        />;
    }
}