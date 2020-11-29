import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricesList } from './PricesList';
import * as P from '../engine/Prices';


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

        this.onSetActivePrice = this.onSetActivePrice.bind(this);
        this.onRemovePrice = this.onRemovePrice.bind(this);
        this.onUpdatePrices = this.onUpdatePrices.bind(this);
        this.onGetHistoricalPrices = this.onGetHistoricalPrices.bind(this);

        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);
        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    onSetActivePrice(tabId, priceDataItem) {
        this.setTabIdState(tabId, {
            activePriceDataItem: priceDataItem,
        },
        () => {
            this.setTabIdState(tabId, {
                dropdownInfo: this.getTabDropdownInfo(tabId),
            });
        });
    }


    onRemovePrice(tabId) {
        const state = this.getTabIdState(tabId);
        if (state) {
            const { pricedItemId, activePriceDataItem } = state;
            if (activePriceDataItem) {
                process.nextTick(async () => {
                    const { accessor } = this.props;
                    const accountingActions = accessor.getAccountingActions();

                    const options = {};
                    if (P.isPrice(activePriceDataItem)) {
                        options.noMultipliers = true;
                    }
                    else if (P.isMultiplier(activePriceDataItem)) {
                        options.noPrices = true;
                    }
                    else {
                        return;
                    }

                    const action = accountingActions.createRemovePricesInDateRange(
                        pricedItemId, 
                        activePriceDataItem.ymdDate, 
                        activePriceDataItem.ymdDate, 
                        options);
                    accessor.asyncApplyAction(action)
                        .catch((e) => {
                            this.setErrorMsg(e);
                        });
                });
            }
        }
    }

    
    onUpdatePrices(tabId) {

    }


    onGetHistoricalPrices(tabId) {

    }
    

    getTabDropdownInfo(tabId) {
        let activePriceDataItem;
        const state = this.getTabIdState(tabId);
        if (state) {
            activePriceDataItem = state.activePriceDataItem;
        }
        const menuItems = [
            { id: 'removePrice',
                label: userMsg('PricesListHandler-removePrice'),
                disabled: !activePriceDataItem,
                onChooseItem: () => this.onRemovePrice(tabId),
            },
            {},
            { id: 'updatePrices',
                label: userMsg('PricesListHandler-updatePrices'),
                disabled: !activePriceDataItem,
                onChooseItem: () => this.onUpdatePrices(tabId),
            },
            { id: 'getHistoricalPrices',
                label: userMsg('PricesListHandler-getHistoricalPrices'),
                disabled: !activePriceDataItem,
                onChooseItem: () => this.onGetHistoricalPrices(tabId),
            },
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
            onSelectPrice = {(priceDataItem) =>
                this.onSetActivePrice(tabEntry.tabId, priceDataItem)}
            contextMenuItems={contextMenuItems}
            refreshUndoMenu = {this.refreshUndoMenu}
            openArgs = {tabEntry.openArgs}
            ref = {pricesListRef}
        />;
    }
}
