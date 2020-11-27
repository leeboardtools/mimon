import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricesList } from './PricesList';


function getUndoRedoInfo(tabEntry) {
    const { current } = tabEntry.pricesListRef;
    if (current) {
        const { getUndoRedoInfo } = current;
        if (getUndoRedoInfo) {
            return getUndoRedoInfo();
        }
    }
}

 
/**
 * Handler for {@link PricesList} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class PricesListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);
        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }
    

    getTabDropdownInfo(tabId) {
        //let activeSplitInfo;
        const state = this.getTabIdState(tabId);
        if (state) {
            //activeSplitInfo = state.activeSplitInfo;
        }
        const menuItems = [
            /*
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
            */

            // TODO:
            // 'clearNewTransaction - resets the new transaction...
        ];
        return {
            items: menuItems,
        };
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for a historical prices page.
     * @param {string} tabId 
     * @param {number}  pricedItemId
     * @param {object}  [openArgs]
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, pricedItemId, openArgs) {
        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);
        return {
            tabId: tabId,
            title: pricedItemDataItem.name,
            hasClose: true,
            pricedItemId: pricedItemId,
            dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
            pricesListRef: React.createRef(),
            getUndoRedoInfo: getUndoRedoInfo,
            openArgs: openArgs,
        };
    }


    /**
     * Called by {@link MainWindow} to render the historical prices list page for 
     * a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        const { pricedItemId, pricesListRef } = tabEntry;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <PricesList
            accessor = {accessor}
            pricedItemId = {pricedItemId}
            //onSelectSplit = {(splitInfo) =>
            //    this.onSelectSplit(tabEntry.tabId, splitInfo)}
            //onOpenRegisterForTransactionSplit = {
            //    this.onOpenRegisterForTransactionSplit
            //}
            contextMenuItems={contextMenuItems}
            refreshUndoMenu = {this.refreshUndoMenu}
            //eventEmitter = {this._eventEmitter}
            openArgs = {tabEntry.openArgs}
            ref = {pricesListRef}
        />;
    }
}
