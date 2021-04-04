import { userMsg } from '../util/UserMessages';


/**
 * Generates a unique tabId   a given base.
 * @param {string} tabIdBase The base for the tabId
 * @param {string[]} tabIdsInUse Array of tabIds in use.
 * @returns {string} A tabId of the form tabIdBase + index
 */
export function generateCustomTabId(tabIdBase, tabIdsInUse) {
    let lastIndexInUse = 0;
    tabIdsInUse.forEach((tabId) => {
        if (tabId.startsWith(tabIdBase)) {
            const suffix = tabId.slice(tabIdBase.length);
            const index = Number.parseInt(suffix);
            if (!Number.isNaN(index)) {
                lastIndexInUse = Math.max(lastIndexInUse, index);
            }
        }
    });

    return tabIdBase + (lastIndexInUse + 1).toString();
}


/**
 * @callback CustomTabInstanceManager~onOpenTabIdCallback
 * @param {string} tabId
 */

/**
 * @callback CustomTabInstanceManager~onGetTabIdTitleCallback
 * @param {string} tabId
 * @returns {string}
 */

/**
 * @typedef {object} CustomTabInstanceManager~options
 * @property {string} tabIdBase All tab ids managed by this start with this string.
 * @property {string} actionIdBase The base string id for the action names.
 * @property {string} labelIdBase The base string id for the menu labels.
 * @property {CustomTabInstanceManager~onOpenTabIdCallback} onOpenTabId
 * @property {CustomTabInstanceManager~onGetTabIdTitleCallback} onGetTabIdTitle
 */


/**
 * Class for managing 'custom' tab instances.
 */
export class CustomTabInstanceManager {
    /**
     * 
     * @param {CustomTabInstanceManager~options} options 
     */
    constructor(options) {
        this.options = options;

        this.basicUserName = userMsg(options.labelIdBase + '_name');
    }


    // What does create need to do?
    //  - Prompt for a name.
    //      - The name is just for the user, a tab id must be generated.
    //  - Duplicate the current tab item's entry in ProjectSettings.
    //  - Support Undo
    //
    // What does delete need to do?
    //  - Confirm? Or just support undo.
    //  - Close the tab.
    //  - Remove the active Tab Id from the ProjectSettings
    //
    // Rename:
    //  - Just prompt for a new name.

    /**
     * @typedef CustomTabInstanceManager~createSubMenuItemsArgs
     * @property {string} activeTabId
     * @property {string} [alternateCreateTabId] If specified and activeTabId is
     * not for this manager but is this then this is used to create a new
     * tab instance.
     */

    /**
     * Creates the sub-menu items for the custom tabs.
     * @param {CustomTabInstanceManager~createSubMenuItemsArgs} args
     * @returns {MenuList~Item[]}
     */
    createSubMenuItems({ allTabIds, activeTabId, alternateCreateTabId} ) {
        const { tabIdBase, actionIdBase,
            onOpenTabId,
            onGetTabIdTitle,
            onCreateTabIdInstance,
            onRenameTabIdInstance,
            onDeleteTabIdInstance,
        }
            = this.options;

        let createTabId = activeTabId;
        if (activeTabId) {
            if (!activeTabId.startsWith(tabIdBase)) {
                if (activeTabId !== alternateCreateTabId) {
                    createTabId = undefined;
                }
                activeTabId = undefined;
            }
        }

        let tabTitle = '';
        if (activeTabId) {
            tabTitle = onGetTabIdTitle(activeTabId);
        }

        const subMenuItems = [];

        let isCustomItems;
        allTabIds.forEach((tabId) => {
            if (tabId.startsWith(tabIdBase)) {
                subMenuItems.push({
                    id: 'openCustom' + actionIdBase + '_' + tabId,
                    label: userMsg('CustomTabInstanceManager-openCustomItem_menuLabel',
                        onGetTabIdTitle(tabId)),
                    checked: tabId === activeTabId,
                    onChooseItem: () => onOpenTabId(tabId),
                });
                isCustomItems = true;
            }
        });

        if (isCustomItems) {
            subMenuItems.push({});
        }

        if (onCreateTabIdInstance) {
            const menuLabel = userMsg(
                'CustomTabInstanceManager-createCustomItem_menuLabel',
                this.basicUserName,
            );
            subMenuItems.push({
                id: 'createCustom' + actionIdBase,
                label: menuLabel,
                disabled: !createTabId,
                onChooseItem: () => onCreateTabIdInstance({
                    originalTabId: createTabId,
                    basicUserName: this.basicUserName,
                    menuLabel: menuLabel,
                    options: this.options,
                }),
            });
        }

        if (onRenameTabIdInstance) {
            const menuLabel = userMsg(
                'CustomTabInstanceManager-renameCustomItem_menuLabel',
                this.basicUserName,
                tabTitle,
            );
            subMenuItems.push({
                id: 'renameCustom' + actionIdBase,
                label: menuLabel,
                disabled: !tabTitle,
                onChooseItem: () => onRenameTabIdInstance({
                    tabId: activeTabId,
                    basicUserName: this.basicUserName,
                    menuLabel: menuLabel,
                    options: this.options,
                }),
            });
        }

        if (onDeleteTabIdInstance) {
            const menuLabel = userMsg(
                'CustomTabInstanceManager-deleteCustomItem_menuLabel',
                this.basicUserName,
                tabTitle,
            );
            subMenuItems.push({
                id: 'deleteCustom' + actionIdBase,
                label: menuLabel,
                disabled: !tabTitle,
                onChooseItem: () => onDeleteTabIdInstance({
                    activeTabId: activeTabId, 
                    basicUserName: this.basicUserName,
                    menuLabel: menuLabel,
                    options: this.options,
                }),
            });
        }

        return subMenuItems;
    }

}