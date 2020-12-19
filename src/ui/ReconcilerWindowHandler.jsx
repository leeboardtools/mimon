import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { ReconcilerWindow } from './ReconcilerWindow';


function getUndoRedoInfo(tabEntry) {
    const { current } = tabEntry.reconcilerWindowRef;
    if (current) {
        const { getUndoRedoInfo } = current;
        if (getUndoRedoInfo) {
            return getUndoRedoInfo();
        }
    }
}

 

 

/**
 * Handler for {@link ReconcilerWindow} components and their pages in the 
 * {@link MainWindow}, this manages all the price retriever related commands.
 */
export class ReconcilerWindowHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    getTabDropdownInfo(tabId, activeAccountId, hiddenInfo) {
        const menuItems = [
        ];

        return {
            items: menuItems,
        };
    }
    


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an accounts list page.
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
            title: userMsg('ReconcilerWindowHandler-title', accountDataItem.name),
            hasClose: true,
            accountId: accountId,
            //dropdownInfo: this.getTabDropdownInfo(tabId, undefined),
            reconcilerWindowRef: React.createRef(),
            onRenderTabPage: this.onRenderTabPage,
            getUndoRedoInfo: getUndoRedoInfo,
            openArgs: openArgs,
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

        const { accountId, reconcilerWindowRef } = tabEntry;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo, } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <ReconcilerWindow
            accessor = {accessor}
            accountId = {accountId}
            contextMenuItems = {contextMenuItems}
            openArgs = {tabEntry.openArgs}
            onClose={() => this.closeTab(tabEntry.tabId)}
            onOpenRegisterForTransactionSplit = {this.onOpenRegisterForTransactionSplit}
            ref = {reconcilerWindowRef}
        />;
    }

}
