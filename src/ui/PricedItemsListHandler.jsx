import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { PricedItemsList } from './PricedItemsList';
import * as PI from '../engine/PricedItems';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';

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
        this.openTab('pricedItemEditor', undefined, pricedItemTypeName);
    }


    onModifyPricedItem(tabId) {
        const { activePricedItemId, pricedItemTypeName } = this.getTabIdState(tabId);
        if (activePricedItemId) {
            this.openTab('pricedItemEditor', 
                activePricedItemId, pricedItemTypeName);
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

                // TEST!!!
                action.dependees = [1];

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


    onTogglePricedItemVisible(tabId, pricedItemId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);
        const hiddenPricedItemIds = Array.from(state.hiddenPricedItemIds);
        const index = hiddenPricedItemIds.indexOf(pricedItemId);
        if (index >= 0) {
            hiddenPricedItemIds.splice(index, 1);
        }
        else {
            hiddenPricedItemIds.push(pricedItemId);
            // TODO: Also need to set the active pricedItem to something else
            // if we're not showing hidden pricedItems.
        }

        const hiddenInfo = Object.assign({}, state, {
            hiddenPricedItemIds: hiddenPricedItemIds,
        });

        this.setTabIdState(tabId, {
            hiddenPricedItemIds: hiddenPricedItemIds,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activePricedItemId, pricedItemTypeName, hiddenInfo),
        });
    }


    onToggleShowHiddenPricedItems(tabId, pricedItemTypeName) {
        const state = this.getTabIdState(tabId);

        const hiddenInfo = Object.assign({}, state, {
            showHiddenPricedItems: !state.showHiddenPricedItems,
        });

        this.setTabIdState(tabId, {
            showHiddenPricedItems: !state.showHiddenPricedItems,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activePricedItemId, pricedItemTypeName, hiddenInfo),
        });

    }


    
    getTabDropdownInfo(tabId, activePricedItemId, pricedItemTypeName, hiddenInfo) {
        const { hiddenPricedItemIds, showHiddenPricedItems }
            = hiddenInfo;

        const showPricedItemLabelId 
            = (hiddenPricedItemIds.indexOf(activePricedItemId) >= 0)
                ? 'PricedItemsListHandler-showPricedItem'
                : 'PricedItemsListHandler-hidePricedItem';

        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;
        const menuItems = [
            /*
            { id: 'openPricedItemRegister',
                label: userMsg('PricedItemsListHandler-openPricedItemRegister', 
                    typeDescription),
                disabled: !activePricedItemId,
                onChooseItem: () => this.onOpenPricedItemRegister(tabId),
            },
            */
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
                    typeDescription),
                checked: showHiddenPricedItems,
                onChooseItem: () => this.onToggleShowHiddenPricedItems(
                    tabId, pricedItemTypeName),
            }
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
            this.setTabIdState(tabId,
                {
                    activePricedItemId: pricedItemId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, 
                        pricedItemId, pricedItemTypeName, state),
                });
        }
        else {
            this.setTabIdState(tabId,
                {
                    activePricedItemId: pricedItemId,
                });
        }
    }

    
    onChoosePricedItem(tabId, pricedItemId) {
        this.openPricedItemRegister(pricedItemId);
    }



    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an pricedItems list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, pricedItemTypeName) {
        const hiddenInfo = {
            hiddenPricedItemIds: [],
            showHiddenPricedItems: false,
        };

        const typeDescription = PI.getPricedItemType(pricedItemTypeName).description;
        return {
            tabId: tabId,
            title: userMsg('PricedItemsListHandler-title', 
                typeDescription),
            hasClose: true,
            dropdownInfo: this.getTabDropdownInfo(tabId, undefined, 
                pricedItemTypeName, hiddenInfo),
            onRenderTabPage: this.onRenderTabPage,
            hiddenPricedItemIds: [],
            pricedItemTypeName: pricedItemTypeName,
        };
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
            hiddenPricedItemIds={tabEntry.hiddenPricedItemIds}
            showHiddenPricedItems={tabEntry.showHiddenPricedItems}
            contextMenuItems={contextMenuItems}
        />;
    }
}
