import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricesList, createDefaultColumns } from './PricesList';
import * as P from '../engine/Prices';
import { TabIdRowTableHandler } from '../util-ui/RowTableHelpers';


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

        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);
        this.onRenderTabPage = this.onRenderTabPage.bind(this);


        // This should be after all the bind() calls...
        this._rowTableHandler = new TabIdRowTableHandler({
            mainWindowHandler: this,
            userIdBase: 'PricesListHandler',
        });
    }


    shutdownHandler() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    onSetActivePrice(tabId, priceDataItem) {
        const newState = Object.assign({}, this.getTabIdState(tabId), {
            activePriceDataItem: priceDataItem,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);
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
        this.openTab('priceRetrieverWindow');
    }


    getTabDropdownInfo(tabId, state) {
        let activePriceDataItem;
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
            {},
            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state),
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


        const projectSettingsId = 'PricesListHandler-' + pricedItemDataItem.type;
        let settings = this.getTabIdProjectSettings(projectSettingsId) || {};

        const allColumns = createDefaultColumns(pricedItemDataItem.type);
        const tabEntry = {
            tabId: tabId,
            title: pricedItemDataItem.name 
                || pricedItemDataItem.ticker
                || pricedItemDataItem.description,
            hasClose: true,
            pricedItemId: pricedItemId,
            onRenderTabPage: this.onRenderTabPage,
            pricesListRef: React.createRef(),
            getUndoRedoInfo: getUndoRedoInfo,
            openArgs: openArgs,
            projectSettingsId: projectSettingsId,
            allColumns: allColumns,
        };

        this._rowTableHandler.setupTabEntryFromSettings(tabEntry, settings);

        tabEntry.dropdownInfo = this.getTabDropdownInfo(tabId, tabEntry);

        return tabEntry;
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
            columns = {tabEntry.columns}
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabEntry.tabId, args)}
            openArgs = {tabEntry.openArgs}
            ref = {pricesListRef}
        />;
    }
}
