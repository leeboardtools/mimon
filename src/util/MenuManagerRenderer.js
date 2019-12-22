const electron = require('electron');
const { ipcRenderer } = electron;


/**
 * @class
 * Menu manager for the renderer process side of things.
 * <p>
 * What happens is:
 * <li>Call {@link MenuManager#setMenuTemplate} to install a menu template.
 * <li>The menu template is passed via {@link ipcRenderer#send} to the main process, where
 * the corresponding main process {@link MenuManagerMain} has been instantiated.
 * <li>{@link MenuManagerMain} handles the actual creation of an Electron [Menu]{@link https://electronjs.org/docs/api/menu} object
 * fills in click functions, and installs the menu as the application menu.
 * <li>{@link MenuManager#setMenuTemplate} scans the template looking for menu item entries that have
 * an <code>idRenderer</code> property. These menu items are the ones handled by the menu manager. These
 * items are also set disabled.
 * <li>When someone handles a particular menu item id, it calls {@link MenuManager#on} with the appropriate
 * <code>idRenderer</code> and passing in a listener. When this is done the manager sends an IPC message to the main process
 * to enable the menu items with the id.
 * <li>When someone no longer handles a particular menu item id, it calls {@link MenuManager#off} with the
 * <code>idRenderer</code> and listener that were passed to {@link MenuManager#on}. When this is done and
 * there are no more listeners for a particular menu item id, the manager sends an IPC message to the main process to disable
 * the menu items with the id.
 * <li>When a menu item with an <code>idRenderer</code> is chosen, the main processes sends an IPC message back to this manager,
 * which then calls the listeners associated with the id. Listeners are called from the newest one passed to {@link MenuManager#on}.
 * If a listener handles the message is needs to return <code>true</code> or some other truthy value, otherwise the next
 * listener will be called.
 */
export class MenuManager {
    constructor(options) {
        options = options || {};

        this.handleMenuClick = this.handleMenuClick.bind(this);

        this._contextMenuTemplatesByName = new Map();
        this._idEntriesByEvent = new Map();
    }


    handleMenuClick(event, id) {
        const idEntry = this._idEntriesByEvent.get(id);
        if (idEntry && idEntry.listeners) {
            for (let i = idEntry.listeners.length - 1; i >= 0; --i) {
                if (idEntry.listeners[i](id)) {
                    return;
                }
            }
        }
    }


    /**
     * Installs a menu template. Menu items to be handled by the menu manager on the renderer side of things should have
     * a <code>idRenderer</code> property.
     * @param {object[]} menuTemplate The menu template, it should be compatible with Electron's [Menu.buildFromTemplate()]{@link https://electronjs.org/docs/api/menu}.
     */
    setMenuTemplate(menuTemplate) {
        this._menuTemplate = menuTemplate;
        this._updateMenuTemplates();

        ipcRenderer.send('MenuManager-setMenuTemplate', menuTemplate);
    }


    addContextMenuTemplate(name, menuTemplate) {
        this._contextMenuTemplatesByName.set(name, menuTemplate);
    }


    setContextMenuTemplate(menuTemplate) {
        if (typeof menuTemplate === 'string') {
            menuTemplate = this._contextMenuTemplatesByName.get(menuTemplate);
        }

        if (this._contextMenuTemplate !== menuTemplate) {
            this._contextMenuTemplate = menuTemplate;
            this._updateMenuTemplates();

            ipcRenderer.send('MenuManager-setContextMenuTemplate', menuTemplate);
        }
    }


    popupContextMenu(options) {
        if (this._contextMenuTemplate) {
            ipcRenderer.send('MenuManager-popupContextMenu');
        }
    }


    closeContextMenu() {
        if (this._contextMenuTemplate) {
            ipcRenderer.send('MenuManager-closeContextMenu');
        }
    }


    _updateMenuTemplates() {
        ipcRenderer.off('MenuManager-menuClick', this.handleMenuClick);

        this._idEntriesByEvent = new Map();
        if (this._menuTemplate) {
            this._processMenuTemplate(this._menuTemplate);
        }
        if (this._contextMenuTemplate) {
            this._processMenuTemplate(this._contextMenuTemplate);
        }

        if (this._idEntriesByEvent.size) {
            ipcRenderer.on('MenuManager-menuClick', this.handleMenuClick);
        }
    }

    _processMenuTemplate(menuTemplate) {
        for (const menuItem of menuTemplate) {
            const { idRenderer, submenu } = menuItem;
            if (idRenderer) {
                let idEntry = this._idEntriesByEvent.get(idRenderer);
                if (!idEntry) {
                    idEntry = {
                        listeners: [],
                    };

                    this._idEntriesByEvent.set(idRenderer, idEntry);
                }
                if (!menuItem.role) {
                    menuItem.enabled = false;
                }
                else {
                    idEntry.role = menuItem.role;
                }
            }
            else if (submenu) {
                this._processMenuTemplate(submenu);
            }
        }
    }


    /**
     * @callback  MenuManager~ClickListener
     * @param {string} id The id of the event.
     * @returns {boolean}   A truthy value if the id was processed and should not be processed further.
     */

    /**
     * Installs a listener for a menu item id.
     * @param {string} id The <code>idRenderer</code> value to listen for.
     * @param {MenuManager~ClickListener} listener
     * @param {boolean} [onlyIfUnique=false]    If <code>true<code> only one instance of listener will be added,
     * otherwise multiple instances may be added if this is called multiple times with the same listener.
     * This is useful when listeners are being installed/removed based upon some state other than
     * the active UI component.
     */
    on(id, listener, onlyIfUnique) {
        const idEntry = this._idEntriesByEvent.get(id);
        if (idEntry) {
            if (onlyIfUnique) {
                if (idEntry.listeners.lastIndexOf(listener) >= 0) {
                    return;
                }
            }

            idEntry.listeners.push(listener);
            ipcRenderer.send('MenuManager-enableId', id, true);
        }
    }


    /**
     * Installs a listener for a menu item id if it has not already been installed.
     * This is useful when listeners are being installed/removed based upon some state other than
     * the active UI component.
     * @param {string} id
     * @param {MenuManager~ClickListener} listener
     */
    onUniqueListener(id, listener) {
        this.on(id, listener, true);
    }


    /**
     * Removes a listener for a menu item id.
     * @param {string} id Thee <code>idRenderer</code> value that was listened for.
     * @param {MenuManager~ClickListener} listener
     */
    off(id, listener) {
        const idEntry = this._idEntriesByEvent.get(id);
        if (idEntry) {
            const index = idEntry.listeners.lastIndexOf(listener);
            if (index >= 0) {
                idEntry.listeners.splice(index, 1);
            }

            // Need to make sure the item is disabled if there are no listeners.
            if (!idEntry.listeners.length) {
                ipcRenderer.send('MenuManager-enableId', id, false);
            }
        }
    }


    /**
     * Helper that calls either {@link MenuManager#on} or {@link MenuManager#off} depending upon the
     * condition arg. This is useful for enabling/disabling menu items based on a boolean value.
     * @param {boolean} condition
     * @param {string} id
     * @param {MenuManager~ClickListener} listener
     */
    listenOnCondition(condition, id, listener) {
        if (condition) {
            this.on(id, listener, true);
        }
        else {
            this.off(id, listener);
        }
    }


    /**
     * Sets the checked state of a menu item.
     * @param {string} id
     * @param {boolean} isCheck
     */
    setChecked(id, isCheck) {
        ipcRenderer.send('MenuManager-checkId', id, isCheck);
    }


    /**
     * Sets the visible of a menu item.
     * @param {string} id
     * @param {boolean} isVisible
     */
    setVisible(id, isVisible) {
        ipcRenderer.send('MenuManager-showId', id, isVisible);
    }


    /**
     * Changes the label of a menu item.
     * @param {string} id
     * @param {string} label
     */
    setLabel(id, label) {
        ipcRenderer.send('MenuManager-setLabel', id, label);
    }


    /**
     * Enables/disabling the overriding of a menu item set to a role. When enabled, the menu item
     * is treated as a normal menu item, when disabled the role originally assigned to the menu item's template
     * is installed.
     * @param {string} id
     * @param {boolean} isOverride
     */
    overrideRole(id, isOverride) {
        ipcRenderer.send('MenuManager-overrideRole', id, isOverride);
    }
}

