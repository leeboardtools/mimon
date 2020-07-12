/**
 * Base class for the handlers used by {@link MainWindow}
 */
export class MainWindowHandlerBase {
    constructor(props) {
        this.props = props;

        this.getTabIdState = props.onGetTabIdState;
        this.setTabIdState = props.onSetTabIdState;
        this.setErrorMsg = props.onSetErrorMsg;
        this.setModal = props.onSetModal;
        this.openTab = props.onOpenTab;
        this.closeTab = props.onCloseTab;
        this.refreshUndoMenu = props.onRefreshUndoMenu;
    }
    
}

/**
 * @typedef {object}    MainWindowHandlerBase~undoInfo
 * @property {string}   [label]
 * @property {function} [onClick]   If onClick is not defined then
 * the undo/redo menu is disabled.
 */

/**
 * @typedef {object}    MainWindowHandlerBase~undoRedoInfo
 * @property {MainWindowHandlerBase~undoInfo}   undoInfo
 * @property {MainWindowHandlerBase~undoInfo}   redoInfo
 */

/**
 * Optional callback that can be set as the getUndoRedoInfo property of
 * the tab entry returned by createTabEntry(), used to override the
 * main undo/redo menu handling for the active tab.
 * @callback {MainWindowHandlerBase~getUndoRedoInfo}
 * @param {TappedPages~TabEntry}    tabEntry
 * @returns {MainWindowHandlerBase~undoRedoInfo|undefined}  If <code>undefined</code>
 * is returned the normal handling is performed.
 */

/**
 * Retrieves the state associated with a tab entry.
 * @function MainWindowHandlerBase#getTabIdState
 * @param {string}  tabId
 * @returns {object}
 */
 
/**
 * Changes the state associated with a tab entry.
 * @function MainWindowHandlerBase#setTabIdState
 * @param {string}  tabId
 * @param {object}  newState
 */

/**
 * Displays an error message in the main window.
 * @function MainWindowHandlerBase#setErrorMsg
 * @param {string|undefined}    errorMsg    The error message to display.
 */

/**
 * Installs a modal object in the main window.
 * @function MainWindowHandlerBase#setModal
 * @param {object|undefined}    modal
 */

/**
 * Opens/activates a tab in the main window.
 * @function MainWindowHandlerBase#openTab
 * @param {string}  type    The type of tab to open.
 * @param {*}  ...args
 */

/**
 * Refreshes the undo menu.
 * @function MainWindowHandlerBase#refreshUndoMenu
 */