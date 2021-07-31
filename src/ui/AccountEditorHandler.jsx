import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { AccountEditor } from './AccountEditor';

 

/**
 * Handler for {@link AccountEditor} components and their pages in the 
 * {@link MainWindow}, this manages all the account related commands.
 */
export class AccountEditorHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onNewPricedItem = this.onNewPricedItem.bind(this);
        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    getTabDropdownInfo(tabId) {
    }


    onNewPricedItem(pricedItemTypeName, endEditCallback) {
        this.openTab('pricedItemEditor', { 
            pricedItemTypeName: pricedItemTypeName, 
            endEditCallback: endEditCallback,
        });
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for a account register page.
     * @param {string} tabId 
     * @param {number}  accountId
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, accountId, parentAccountId, childListIndex) {
        const accountDataItem = this.props.accessor.getAccountDataItemWithId(
            accountId);
        const title = (accountDataItem) 
            ? userMsg('AccountEditorHandler-modifyAccount_title', accountDataItem.name)
            : userMsg('AccountEditorHandler-newAccount_title');
        return {
            tabId: tabId,
            title: title,
            //hasClose: true,
            accountId: accountId,
            parentAccountId: parentAccountId,
            childListIndex: childListIndex,
            //dropdownInfo: this.getTabDropdownInfo(tabId),
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
        const { accountId, parentAccountId, childListIndex } = tabEntry;
        return <AccountEditor
            accessor={accessor}
            accountId={accountId}
            parentAccountId={parentAccountId}
            childListIndex={childListIndex}
            onClose={() => this.closeTab(tabEntry.tabId)}
            onNewPricedItem={this.onNewPricedItem}
        />;
    }
}