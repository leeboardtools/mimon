import React from 'react';
//import { userMsg } from '../util/UserMessages';
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
    }


    getTabDropdownInfo(tabId, accountId) {
        // New Transaction
        // Modify Transaction
        // Delete Transaction
        // Copy Transaction
        // Paste Transaction
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