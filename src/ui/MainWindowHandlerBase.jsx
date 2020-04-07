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
    }
    
}

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
