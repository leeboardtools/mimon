import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricedItemEditor } from './PricedItemEditor';
import * as PI from '../engine/PricedItems';

 

/**
 * Handler for {@link PricedItemEditor} components and their pages in the 
 * {@link MainWindow}, this manages all the pricedItem related commands.
 */
export class PricedItemEditorHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    getTabDropdownInfo(tabId) {
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for a pricedItem register page.
     * @param {string} tabId 
     * @param {number}  pricedItemId
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, pricedItemId, pricedItemTypeName) {
        const pricedItemType = PI.getPricedItemType(pricedItemTypeName);
        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);
        const title = (pricedItemDataItem) 
            ? userMsg('PricedItemEditorHandler-modifyPricedItem_title'
                , pricedItemDataItem.name || pricedItemDataItem.ticker)
            : userMsg('PricedItemEditorHandler-newPricedItem_title'
                , pricedItemType.description);
        return {
            tabId: tabId,
            title: title,
            //hasClose: true,
            pricedItemId: pricedItemId,
            pricedItemTypeName: pricedItemTypeName,
            //dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
        };
    }


    /**
     * Called by {@link MainWindow} to render the pricedItem list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        const { pricedItemId, pricedItemTypeName } = tabEntry;
        return <PricedItemEditor
            accessor={accessor}
            pricedItemId={pricedItemId}
            pricedItemTypeName={pricedItemTypeName}
            onClose={() => this.closeTab(tabEntry.tabId)}
        />;
    }
}