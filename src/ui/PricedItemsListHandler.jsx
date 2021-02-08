import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricedItemsList, createDefaultColumns } from './PricedItemsList';
import * as PI from '../engine/PricedItems';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { RowTableHandler } from './RowTableHelpers';

/**
 * Handler for {@link PricedItemsList} components and their pages in the 
 * {@link MainWindow}, this manages all the pricedItem related commands.
 */
export class PricedItemsListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        //this.onOpenPricedItemRegister = this.onOpenPricedItemRegister.bind(this);
        this.onNewPricedItem = this.onNewPricedItem.bind(this);
        this.onModifyPricedItem = this.onModifyPricedItem.bind(this);
        this.onRemovePricedItem = this.onRemovePricedItem.bind(this);

        this.onTogglePricedItemVisible = this.onTogglePricedItemVisible.bind(this);
        this.onToggleShowHiddenPricedItems 
            = this.onToggleShowHiddenPricedItems.bind(this);

        this.onSelectPricedItem = this.onSelectPricedItem.bind(this);
        this.onChoosePricedItem = this.onChoosePricedItem.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);


        // This should be after all the bind() calls...
        this._rowTableHandler = new RowTableHandler({
            mainWindowHandler: this,
            userIdBase: 'AccountsListHandler',
        });
    }


    shutdownHandler() {
        this._rowTableHandler.shutdownHandler();
        this._rowTableHandler = undefined;
    }


    /*
    openPricedItemRegister(pricedItemId) {
        if (pricedItemId) {
            this.openTab('pricedItemRegister', pricedItemId);
        }
    }

    onOpenPricedItemRegister(tabId) {
        const { activePricedItemId} = this.getTabIdState(tabId);
        if (activePricedItemId) {
            this.openPricedItemRegister(activePricedItemId);
        }
    }
    */


    onNewPricedItem(tabId, pricedItemTypeName) {
        this.openTab('pricedItemEditor', { pricedItemTypeName: pricedItemTypeName, });
    }


    onModifyPricedItem(tabId) {
        const { activePricedItemId, pricedItemTypeName } = this.getTabIdState(tabId);
        if (activePricedItemId) {
            this.openTab('pricedItemEditor', 
                { pricedItemId: activePricedItemId, 
                    pricedItemTypeName: pricedItemTypeName, 
                });
        }
    }


    onRemovePricedItem(tabId, pricedItemTypeName) {
        const { activePricedItemId} = this.getTabIdState(tabId);
        if (activePricedItemId) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = await accountingActions.asyncCreateRemovePricedItemAction(
                    activePricedItemId);

                if (action.dependees && action.dependees.length) {
                    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
                        activePricedItemId);
                    const type = PI.getPricedItemType(pricedItemTypeName);
                    const title = userMsg(
                        // eslint-disable-next-line max-len
                        'AccountsListHandler-prompt_remove_priced_item_with_dependees_title',
                        type.description);
                    const message = userMsg(
                        'AccountsListHandler-prompt_remove_priced_item_with_dependees',
                        type.description, pricedItemDataItem.name);
                    this.setModal(() => {
                        return <QuestionPrompter
                            title={title}
                            message={message}
                            onButton={(id) => {
                                if (id === 'yes') {
                                    accessor.asyncApplyAction(action)
                                        .catch((e) => {
                                            this.setErrorMsg(e);
                                        });
                                }
                                this.setModal();
                            }}
                            buttons={StandardButton.YES_NO}
                        />;
                    });
                }
                else {
                    accessor.asyncApplyAction(action)
                        .catch((e) => {
                            this.setErrorMsg(e);
                        });
                }
            });
        }
    }


    onOpenPricesList(tabId, pricedItemId, pricedItemTypeName) {
        this.openTab('pricesList', { pricedItemId: pricedItemId, });
    }


    onTogglePricedItemVisible(tabId, pricedItemId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);
        const hiddenPricedItemIds = Array.from(state.hiddenPricedItemIds);
        const index = hiddenPricedItemIds.indexOf(pricedItemId);
        let actionNameId;
        if (index >= 0) {
            hiddenPricedItemIds.splice(index, 1);
            actionNameId = 'PricedItemsListHandler-showPricedItem';
        }
        else {
            hiddenPricedItemIds.push(pricedItemId);
            actionNameId = 'PricedItemsListHandler-hidePricedItem';
            // TODO: Also need to set the active pricedItem to something else
            // if we're not showing hidden pricedItems.
        }

        const newState = Object.assign({}, state, {
            hiddenPricedItemIds: hiddenPricedItemIds,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        const pricedItemDataItem = this.props.accessor.getPricedItemDataItemWithId(
            pricedItemId);

        this.setTabIdProjectSettings(tabId, 
            {
                hiddenPricedItemIds: hiddenPricedItemIds,
            },
            userMsg(actionNameId, pricedItemDataItem.name));
    }


    onToggleShowHiddenPricedItems(tabId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showHiddenPricedItems: !state.showHiddenPricedItems,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);


        this.setTabIdState(tabId, newState);

        const pluralTypeDescription 
            = PI.getPricedItemType(pricedItemTypeName).pluralDescription;
        this.setTabIdProjectSettings(tabId, 
            {
                showHiddenPricedItems: newState.showHiddenPricedItems,
            },
            userMsg('PricedItemsListHandler-action_toggleShowHiddenPricedItems',
                pluralTypeDescription
            ));
    }


    
    getTabDropdownInfo(tabId, state) {
        const { activePricedItemId, pricedItemTypeName, 
            hiddenPricedItemIds, showHiddenPricedItems,
        } = state;

        const showPricedItemLabelId 
            = (hiddenPricedItemIds.indexOf(activePricedItemId) >= 0)
                ? 'PricedItemsListHandler-showPricedItem'
                : 'PricedItemsListHandler-hidePricedItem';

        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;
        const pluralTypeDescription 
            = PI.getPricedItemType(pricedItemTypeName).pluralDescription;
        const menuItems = [
            { id: 'openPricesList',
                label: userMsg('PricedItemsListHandler-openPricesList', 
                    typeDescription),
                onChooseItem: () => this.onOpenPricesList(tabId, 
                    activePricedItemId, pricedItemTypeName),
            },
            {},
            { id: 'newPricedItem',
                label: userMsg('PricedItemsListHandler-newPricedItem', 
                    typeDescription),
                onChooseItem: () => this.onNewPricedItem(tabId, pricedItemTypeName),
            },                        
            { id: 'modifyPricedItem',
                label: userMsg('PricedItemsListHandler-modifyPricedItem', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onModifyPricedItem(tabId),
            },                        
            { id: 'removePricedItem',
                label: userMsg('PricedItemsListHandler-removePricedItem', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onRemovePricedItem(tabId, pricedItemTypeName),
            },
            {},
            { id: 'togglePricedItemVisible',
                label: userMsg(showPricedItemLabelId, 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onTogglePricedItemVisible(
                    tabId, activePricedItemId, pricedItemTypeName),
            },
            { id: 'toggleShowHiddenPricedItems',
                label: userMsg('PricedItemsListHandler-showHiddenPricedItems', 
                    pluralTypeDescription),
                checked: showHiddenPricedItems,
                onChooseItem: () => this.onToggleShowHiddenPricedItems(
                    tabId, pricedItemTypeName),
            },

            {},
            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state),
        ];

        return {
            items: menuItems,
        };
    }


    onSelectPricedItem(tabId, pricedItemId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);
        const prevActivePricedItemId = state.activePricedItemId;
        if ((!prevActivePricedItemId && pricedItemId)
         || (prevActivePricedItemId && !pricedItemId)) {
            const newState = Object.assign({}, state, {
                activePricedItemId: pricedItemId,
            });
            newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
            this.setTabIdState(tabId, newState);
        }
        else {
            this.setTabIdState(tabId,
                {
                    activePricedItemId: pricedItemId,
                });
        }
    }

    
    onChoosePricedItem(tabId, pricedItemId) {
        if (pricedItemId) {
            this.openTab('pricesList', { pricedItemId: pricedItemId, });
        }
    }



    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an pricedItems list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, pricedItemTypeName) {
        const projectSettingsId = 'PricedItemsListHandler-' + pricedItemTypeName;
        let settings = this.getTabIdProjectSettings(projectSettingsId) || {};
        const columns = createDefaultColumns(pricedItemTypeName);

        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;
        const tabEntry = {
            tabId: tabId,
            title: userMsg('PricedItemsListHandler-title', 
                typeDescription),
            hasClose: true,
            onRenderTabPage: this.onRenderTabPage,
            pricedItemTypeName: pricedItemTypeName,
            columns: columns,
            projectSettingsId: projectSettingsId,
            hiddenPricedItemIds: settings.hiddenPricedItemIds || [],
            showHiddenPricedItems: settings.showHiddenPricedItems,
        };

        this._rowTableHandler.setupTabEntryFromSettings(tabEntry, settings);
        tabEntry.dropdownInfo = this.getTabDropdownInfo(tabId, tabEntry);

        return tabEntry;
    }


    /**
     * Called by {@link MainWindow} via the tab entry's onRenderTabPage to render the 
     * pricedItem list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <PricedItemsList
            accessor={accessor}
            pricedItemTypeName={tabEntry.pricedItemTypeName}
            onSelectPricedItem={(pricedItemId) => 
                this.onSelectPricedItem(tabEntry.tabId, pricedItemId, 
                    tabEntry.pricedItemTypeName)}
            onChoosePricedItem={(pricedItemId) => 
                this.onChoosePricedItem(tabEntry.tabId, pricedItemId)}
            columns={tabEntry.columns}
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabEntry.tabId, args)}
            hiddenPricedItemIds={tabEntry.hiddenPricedItemIds}
            showHiddenPricedItems={tabEntry.showHiddenPricedItems}
            contextMenuItems={contextMenuItems}
        />;
    }
}
