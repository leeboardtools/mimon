import { userMsg } from '../util/UserMessages';


/**
 * Generates a unique tabId for a given base.
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
 * @callback CustomTabInstanceManager~onCreateTabIdInstance
 * @param {string} originalTabId The tab id of the tab to use as the template.
 * @param {string} basicUserName The user string whose id was built from the 
 * labelIdBase + '_name'
 * @param {string} menuLabel The label of the create menu
 * @param {CustomTabInstanceManager~options} options
 */

/**
 * @callback CustomTabInstanceManager~onRenameTabIdInstance
 * @param {string} tabId
 * @param {string} basicUserName The user string whose id was built from the 
 * labelIdBase + '_name'
 * @param {string} menuLabel The label of the create menu
 * @param {CustomTabInstanceManager~options} options
 */

/**
 * @callback CustomTabInstanceManager~onDeleteTabIdInstance
 * @param {string} tabId
 * @param {string} basicUserName The user string whose id was built from the 
 * labelIdBase + '_name'
 * @param {string} menuLabel The label of the create menu
 * @param {CustomTabInstanceManager~options} options
 */


/**
 * @typedef {object} CustomTabInstanceManager~options
 * @property {string} tabIdBase All tab ids managed by this start with this string.
 * @property {string} actionIdBase The base string id for the action names.
 * @property {string} labelIdBase The base string id for the menu labels.
 * @property {CustomTabInstanceManager~onOpenTabIdCallback} onOpenTabId
 * @property {CustomTabInstanceManager~onGetTabIdTitleCallback} onGetTabIdTitle
 * @property {CustomTabInstanceManager~onCreateTabIdInstance} [onCreateTabIdInstance]
 * @property {CustomTabInstanceManager~onRenameTabIdInstance} [onRenameTabIdInstance]
 * @property {CustomTabInstanceManager~onDeleteTabIdInstance} [onDeleteTabIdInstance]
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


    /**
     * @typedef CustomTabInstanceManager~createSubMenuItemsArgs
     * @property {string[]} allTabIds Array of tab ids, this is scanned for tab ids
     * that begin with tabIdBase to build the list of available custom tab instances.
     * @property {string} [activeTabId] The active tab id, does not have to be one
     * of the tabs managed by this manager.
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
                disabled: !activeTabId,
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
                disabled: !activeTabId,
                onChooseItem: () => onDeleteTabIdInstance({
                    tabId: activeTabId, 
                    basicUserName: this.basicUserName,
                    menuLabel: menuLabel,
                    options: this.options,
                }),
            });
        }

        return subMenuItems;
    }

}