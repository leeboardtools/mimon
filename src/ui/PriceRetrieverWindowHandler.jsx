import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PriceRetrieverWindow } from './PriceRetrieverWindow';


function getUndoRedoInfo(tabEntry) {
    const { current } = tabEntry.priceRetrieverWindowRef;
    if (current) {
        const { getUndoRedoInfo } = current;
        if (getUndoRedoInfo) {
            return getUndoRedoInfo();
        }
    }
}

 

/**
 * Handler for {@link PriceRetrieverWindow} components and their pages in the 
 * {@link MainWindow}, this manages all the price retriever related commands.
 */
export class PriceRetrieverWindowHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        this.tickerSelection = {
            selectDefaults: true,
            selectedTickers: [],
        };
    }


    onUpdateTickerSelection(tabId, tickerSelection) {
        this.setTabIdState(tabId, {
            tickerSelection: tickerSelection,
        });

        this.tickerSelection.selectDefaults = tickerSelection.selectDefaults;
        this.tickerSelection.selectedTickers 
            = Array.from(tickerSelection.selectedTickers);
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
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        return {
            tabId: tabId,
            title: userMsg('PriceRetrieverWindowHandler-title'),
            hasClose: true,
            //dropdownInfo: this.getTabDropdownInfo(tabId, undefined),
            priceRetrieverWindowRef: React.createRef(),
            getUndoRedoInfo: getUndoRedoInfo,
            onRenderTabPage: this.onRenderTabPage,
            tickerSelection: this.tickerSelection,
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

        const { priceRetrieverWindowRef } = tabEntry;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo, tickerSelection } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <PriceRetrieverWindow
            accessor = {accessor}
            tickerSelection = { tickerSelection }
            updateTickerSelection = {(tickerSelection) => 
                this.onUpdateTickerSelection(tabEntry.id, tickerSelection) }
            contextMenuItems = {contextMenuItems}
            openArgs = {tabEntry.openArgs}
            ref = {priceRetrieverWindowRef}
        />;
    }
}
