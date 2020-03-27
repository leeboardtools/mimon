import { ipcMain, Menu, MenuItem } from 'electron';

class MenuHandler {
    constructor(menuTemplate, handleMenuClick, menuInstalledCallback) {
        this._menuTemplate = menuTemplate;
        this._handleMenuClick = handleMenuClick;
        this._menuInstalledCallback = menuInstalledCallback;
        this._rebuildMenu();
    }

    _rebuildMenu() {
        this._idMenuItems = new Map();
        this._menu = this._generateMenu(this._menuTemplate);
        if (this._menuInstalledCallback) {
            this._menuInstalledCallback(this._menu);
        }
        return this._menu;
    }

    _generateMenu(menuTemplate) {
        const menu = new Menu();
        menuTemplate.forEach((itemTemplate) => {
            const { idRenderer, submenu } = itemTemplate;
            const templateForMenuItem = Object.assign({}, itemTemplate);
            if (submenu) {
                templateForMenuItem.submenu = this._generateMenu(submenu);
            }
            if (idRenderer && templateForMenuItem.role) {
                delete templateForMenuItem.enabled;
                delete templateForMenuItem.label;
            }
            const menuItem = new MenuItem(templateForMenuItem);

            if (idRenderer) {
                let menuItemEntries = this._idMenuItems.get(idRenderer);
                if (!menuItemEntries) {
                    menuItemEntries = [];
                    this._idMenuItems.set(idRenderer, menuItemEntries);
                }

                itemTemplate.overrideRole = itemTemplate.overrideRole 
                    || itemTemplate.role;

                if (!menuItem.role) {
                    menuItem.click = (event, focusedWindow, focusedWebContents) => { 
                        this._handleMenuClick(event, focusedWindow, 
                            focusedWebContents, idRenderer); 
                    };
                }

                menuItemEntries.push({
                    itemTemplate: itemTemplate,
                    menuItem: menuItem,
                });
            }

            menu.append(menuItem);
        });
        return menu;
    }

    handleEnableMenuId(event, id, isEnable) {
        if (this._idMenuItems) {
            const menuItemEntries = this._idMenuItems.get(id);
            if (menuItemEntries) {
                menuItemEntries.forEach((menuItem) => {
                    menuItem.menuItem.enabled = isEnable;
                    menuItem.itemTemplate.enabled = isEnable;
                });
            }
        }
    }


    handleCheckMenuId(event, id, isCheck) {
        if (this._idMenuItems) {
            const menuItemEntries = this._idMenuItems.get(id);
            if (menuItemEntries) {
                menuItemEntries.forEach((menuItem) => {
                    menuItem.menuItem.checked = isCheck;
                    menuItem.itemTemplate.checked = isCheck;
                });
            }
        }
    }


    handleShowMenuId(event, id, isShow) {
        if (this._idMenuItems) {
            const menuItemEntries = this._idMenuItems.get(id);
            if (menuItemEntries) {
                menuItemEntries.forEach((menuItem) => {
                    menuItem.menuItem.visible = isShow;
                    menuItem.itemTemplate.visible = isShow;
                });
            }
        }
    }


    handleSetLabel(event, id, label) {
        if (this._idMenuItems) {
            const menuItemEntries = this._idMenuItems.get(id);
            if (menuItemEntries) {
                menuItemEntries.forEach((menuItem) => { 
                    menuItem.itemTemplate.label = label; 
                });
                this._rebuildMenu();
            }
        }
    }


    handleOverrideRole(event, id, isOverride) {
        if (this._idMenuItems) {
            const menuItemEntries = this._idMenuItems.get(id);
            if (menuItemEntries) {
                menuItemEntries.forEach(({ itemTemplate }) => {
                    if (isOverride) {
                        delete itemTemplate.role;
                    }
                    else {
                        itemTemplate.role = itemTemplate.overrideRole;
                    }
                });
                this._rebuildMenu();
            }
        }
    }


    popupContextMenu(event, options) {
        if (this._menu) {
            this._menu.popup(options);
        }
    }


    closeContextMenu(event) {
        if (this._menu) {
            this._menu.closePopup();
        }
    }
}


/**
 * @class MenuManagerMain
 * Main process side of the menu manager. To use just create an instance of it in the 
 * main process, preferrably after the app 'ready' event has been fired.
 * <p>
 * This provides the menu item callback, which simply sends an async ipc message back 
 * to the renderer process.
 */
export class MenuManagerMain {
    constructor(options) {
        options = options || {};

        this.handleSetMenuTemplate = this.handleSetMenuTemplate.bind(this);
        this.handleSetContextMenuTemplate = this.handleSetContextMenuTemplate.bind(this);
        this.handlePopupContextMenu = this.handlePopupContextMenu.bind(this);
        this.handleCloseContextMenu = this.handleCloseContextMenu.bind(this);

        this.handleEnableMenuId = this.handleEnableMenuId.bind(this);
        this.handleCheckMenuId = this.handleCheckMenuId.bind(this);
        this.handleShowMenuId = this.handleShowMenuId.bind(this);
        this.handleSetLabel = this.handleSetLabel.bind(this);
        this.handleOverrideRole = this.handleOverrideRole.bind(this);

        this.handleMenuClick = this.handleMenuClick.bind(this);

        ipcMain.on('MenuManager-setMenuTemplate', this.handleSetMenuTemplate);
        ipcMain.on('MenuManager-setContextMenuTemplate', 
            this.handleSetContextMenuTemplate);
        ipcMain.on('MenuManager-popupContextMenu', this.handlePopupContextMenu);
        ipcMain.on('MenuManager-closeContextMenu', this.handleCloseContextMenu);

        ipcMain.on('MenuManager-enableId', this.handleEnableMenuId);
        ipcMain.on('MenuManager-checkId', this.handleCheckMenuId);
        ipcMain.on('MenuManager-showId', this.handleShowMenuId);
        ipcMain.on('MenuManager-setLabel', this.handleSetLabel);
        ipcMain.on('MenuManager-overrideRole', this.handleOverrideRole);
    }


    handleSetMenuTemplate(event, menuTemplate) {
        if (menuTemplate) {
            this._mainMenuHandler = new MenuHandler(menuTemplate, 
                this.handleMenuClick, (menu) => Menu.setApplicationMenu(menu));
        }
        else {
            this._mainMenuHandler = undefined;
            Menu.setApplicationMenu(null);
        }
    }

    handleSetContextMenuTemplate(event, menuTemplate) {
        if (menuTemplate) {
            this._contextMenuHandler = new MenuHandler(menuTemplate, 
                this.handleMenuClick);
        }
        else {
            this._contextMenuHandler = undefined;
        }
    }

    handlePopupContextMenu(event, options) {
        if (this._contextMenuHandler) {
            this._contextMenuHandler.popupContextMenu(event, options);
        }
    }

    handleCloseContextMenu(event) {
        if (this._contextMenuHandler) {
            this._contextMenuHandler.closeContextMenu(event);
        }
    }


    handleEnableMenuId(event, id, isEnable) {
        if (this._mainMenuHandler) {
            this._mainMenuHandler.handleEnableMenuId(event, id, isEnable);
        }
        if (this._contextMenuHandler) {
            this._contextMenuHandler.handleEnableMenuId(event, id, isEnable);
        }
    }


    handleCheckMenuId(event, id, isCheck) {
        if (this._mainMenuHandler) {
            this._mainMenuHandler.handleCheckMenuId(event, id, isCheck);
        }
        if (this._contextMenuHandler) {
            this._mainMenuHandler.handleCheckMenuId(event, id, isCheck);
        }
    }


    handleShowMenuId(event, id, isShow) {
        if (this._mainMenuHandler) {
            this._mainMenuHandler.handleShowMenuId(event, id, isShow);
        }
        if (this._contextMenuHandler) {
            this._contextMenuHandler.handleShowMenuId(event, id, isShow);
        }
    }


    handleSetLabel(event, id, label) {
        if (this._mainMenuHandler) {
            this._mainMenuHandler.handleSetLabel(event, id, label);
        }
        if (this._contextMenuHandler) {
            this._contextMenuHandler.handleSetLabel(event, id, label);
        }
    }


    handleOverrideRole(event, id, isOverride) {
        if (this._mainMenuHandler) {
            this._mainMenuHandler.handleOverrideRole(event, id, isOverride);
        }
        if (this._contextMenuHandler) {
            this._contextMenuHandler.handleOverrideRole(event, id, isOverride);
        }
    }


    handleMenuClick(event, focusedWindow, focusedWebContents, id) {
        focusedWebContents.send('MenuManager-menuClick', id);
    }
}

