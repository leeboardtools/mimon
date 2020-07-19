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

        this.onDuplicateTransaction = this.onDuplicateTransaction.bind(this);
        this.onCopyTransaction = this.onCopyTransaction.bind(this);
        this.onPasteTransaction = this.onPasteTransaction.bind(this);

        this.onReconcileAccount = this.onReconcileAccount.bind(this);

        this.onSelectSplit = this.onSelectSplit.bind(this);
    }

    onReconcileAccount(tabId) {
        const { accountId} = this.getTabIdState(tabId);
        if (accountId) {
            this.openTab('reconcileAccount', accountId);
        }
    }


    onRemoveTransaction(tabId) {
        const { activeSplitInfo } = this.getTabIdState(tabId);
        if (activeSplitInfo) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = accountingActions.createRemoveTransactionAction(
                    activeSplitInfo.transactionId);
                accessor.asyncApplyAction(action)
                    .catch((e) => {
                        this.setErrorMsg(e);
                    });
            });
        }
    }
    

    onDuplicateTransaction(tabId) {
        const state = this.getTabIdState(tabId);
        if (!state) {
            return;
        }

        const { activeSplitInfo } = state;
        const { current } = state.accountRegisterRef;
        if (activeSplitInfo && current && current.handlePasteCommand) {
            return current.handlePasteCommand(activeSplitInfo, true);
        }
    }


    onCopyTransaction(tabId) {
        const { activeSplitInfo } = this.getTabIdState(tabId);
        if (activeSplitInfo) {
            const tabIds = this.getTabIdsWithType('accountRegister');
            tabIds.forEach((tabId) => {
                this.setTabIdState(tabId, {
                    splitInfoForCopy: activeSplitInfo,
                },
                () => {
                    this.setTabIdState(tabId, {
                        dropdownInfo: this.getTabDropdownInfo(tabId),
                    });
                });
            });
        }
    }


    handlePasteTransaction(tabId, apply) {
        const state = this.getTabIdState(tabId);
        if (!state) {
            return;
        }
        const { current } = state.accountRegisterRef;
        const { splitInfoForCopy } = state;
        if (!splitInfoForCopy || !current) {
            return;
        }

        if (current.handlePasteCommand) {
            return current.handlePasteCommand(splitInfoForCopy, apply);
        }
    }
    

    onPasteTransaction(tabId) {
        this.handlePasteTransaction(tabId, true);
    }

    canPaste(tabId) {
        return this.handlePasteTransaction(tabId);
    }
    

    getTabDropdownInfo(tabId) {
        let activeSplitInfo;
        const state = this.getTabIdState(tabId);
        if (state) {
            activeSplitInfo = state.activeSplitInfo;
        }
        const menuItems = [
            { id: 'removeTransaction',
                label: userMsg('AccountRegisterHandler-removeTransaction'),
                disabled: !activeSplitInfo,
                onChooseItem: () => this.onRemoveTransaction(tabId),
            },
            {},
            { id: 'duplicateTransaction',
                label: userMsg('AccountRegisterHandler-duplicateTransaction'),
                disabled: !activeSplitInfo,
                onChooseItem: () => this.onDuplicateTransaction(tabId),
            },
            { id: 'copyTransaction',
                label: userMsg('AccountRegisterHandler-copyTransaction'),
                disabled: !activeSplitInfo,
                onChooseItem: () => this.onCopyTransaction(tabId),
            },
            { id: 'pasteTransaction',
                label: userMsg('AccountRegisterHandler-pasteTransaction'),
                disabled: !this.canPaste(tabId),
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


    //
    // splitInfo is:
    //      transactionId
    //      transactionDataItem
    //      splitIndex
    //
    onSelectSplit(tabId, splitInfo) {
        this.setTabIdState(tabId, {
            activeSplitInfo: splitInfo,
        },
        () => {
            this.setTabIdState(tabId, {
                dropdownInfo: this.getTabDropdownInfo(tabId),
            });
        });
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
            onSelectSplit = {(splitInfo) =>
                this.onSelectSplit(tabEntry.tabId, splitInfo)}
            contextMenuItems={contextMenuItems}
            refreshUndoMenu = {this.refreshUndoMenu}
            ref = {accountRegisterRef}
        />;
    }
}