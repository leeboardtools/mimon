import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountRegister } from './AccountRegister';
import { EventEmitter } from 'events';


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

        this._eventEmitter = new EventEmitter();
    }


    onReconcileAccount(tabId) {
        const { accountId} = this.getTabIdState(tabId);
        if (accountId) {
            this.openTab('reconciler', { accountId: accountId, });
        }
    }


    onOpenPricesList(tabId) {
        const { accountId} = this.getTabIdState(tabId);
        if (accountId) {
            const { accessor } = this.props;
            const accountDataItem = accessor.getAccountDataItemWithId(accountId);
            this.openTab('pricesList', { pricedItemId: accountDataItem.pricedItemId, });
        }
    }

    onRemoveTransaction(tabId) {
        const { activeSplitInfo } = this.getTabIdState(tabId);
        if (activeSplitInfo) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = await accountingActions.asyncCreateRemoveTransactionAction(
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
        let accountType = {};
        const state = this.getTabIdState(tabId);
        if (state) {
            activeSplitInfo = state.activeSplitInfo;
            const { accessor } = this.props;
            accountType = accessor.getTypeOfAccountId(state.accountId);
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
            { id: 'reconciler',
                label: userMsg('AccountsListHandler-reconcileAccount'),
                onChooseItem: () => this.onReconcileAccount(tabId),
            },
            { id: 'openPricesList',
                label: userMsg('AccountsListHandler-openPricesList'),
                disabled: !accountType.hasLots,
                onChooseItem: () => this.onOpenPricesList(tabId),
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
     * @param {object}  [openArgs]
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, accountId, openArgs) {
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
            openArgs: openArgs,
        };
    }


    /**
     * Opens an existing tab.
     * @param {number} tabId 
     * @param {number} accountId 
     * @param {object} openArgs 
     */
    openTabEntry(tabId, accountId, openArgs) {
        if (openArgs) {
            this._eventEmitter.emit(
                'editTransactionSplit',
                accountId,
                openArgs);
        }
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
            onOpenRegisterForTransactionSplit = {
                this.onOpenRegisterForTransactionSplit
            }
            contextMenuItems={contextMenuItems}
            refreshUndoMenu = {this.refreshUndoMenu}
            eventEmitter = {this._eventEmitter}
            openArgs = {tabEntry.openArgs}
            ref = {accountRegisterRef}
        />;
    }
}