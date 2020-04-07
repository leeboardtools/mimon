import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TabbedPages } from '../util-ui/TabbedPages';
import { Dropdown } from '../util-ui/Dropdown';
import deepEqual from 'deep-equal';
import { AccountsListHandler } from './AccountsListHandler';
import { AccountRegisterHandler } from './AccountRegisterHandler';
import { AccountEditorHandler } from './AccountEditorHandler';


/**
 * The main window component. This is responsible for managing the normal
 * accounting system editing process.
 */
export class MainWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onCancel = this.onCancel.bind(this);
        this.onCloseTab = this.onCloseTab.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);

        this.onActionChange = this.onActionChange.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);

        this.onForceReload = this.onForceReload.bind(this);


        this.onCheckReminders = this.onCheckReminders.bind(this);
        this.onUpdatePrices = this.onUpdatePrices.bind(this);


        this.onGetTabIdState = this.onGetTabIdState.bind(this);
        this.onSetTabIdState = this.onSetTabIdState.bind(this);
        this.onSetErrorMsg = this.onSetErrorMsg.bind(this);
        this.onSetModal = this.onSetModal.bind(this);
        this.onOpenTab = this.onOpenTab.bind(this);
    

        this.onPostRenderTabs = this.onPostRenderTabs.bind(this);


        this._accountsListHandler = new AccountsListHandler({
            accessor: this.props.accessor,
            onGetTabIdState: this.onGetTabIdState,
            onSetTabIdState: this.onSetTabIdState,
            onSetErrorMsg: this.onSetErrorMsg,
            onSetModal: this.onSetModal,
            onOpenTab: this.onOpenTab,
        });

        this._accountRegisterHandler = new AccountRegisterHandler({
            accessor: this.props.accessor,
            onGetTabIdState: this.onGetTabIdState,
            onSetTabIdState: this.onSetTabIdState,
            onSetErrorMsg: this.onSetErrorMsg,
            onSetModal: this.onSetModal,
            onOpenTab: this.onOpenTab,
        });

        this._accountEditorHandler = new AccountEditorHandler({
            accessor: this.props.accessor,
            onGetTabIdState: this.onGetTabIdState,
            onSetTabIdState: this.onSetTabIdState,
            onSetErrorMsg: this.onSetErrorMsg,
            onSetModal: this.onSetModal,
            onOpenTab: this.onOpenTab,
            onCloseTab: this.onCloseTab,
        });
        this.state = {
            tabEntries: [],
        };
        this._tabEntriesById = new Map();
        this._accountRegistersByAccountId = new Map();
        this._accountEditorsByAccountId = new Map();

        const masterAccountsList = this._accountsListHandler.createTabEntry(
            'masterAccountsList'
        );
        this.state.tabEntries.push(masterAccountsList);
        this._tabEntriesById.set(masterAccountsList.tabId, masterAccountsList);


        this.state.activeTabId = this.state.tabEntries[0].tabId;
    }


    componentDidMount() {
        const { accessor } = this.props;

        accessor.on('actionChange', this.onActionChange);
        this.onActionChange();
    }


    componentWillUnmount() {
        const { accessor } = this.props;

        accessor.off('actionChange', this.onActionChange);
    }


    componentDidUpdate(prevProps, prevState) {
    }


    onCancel() {
        this.setState({
            errorMsg: undefined,
            modal: undefined,
        });
    }


    addTabEntry(tabEntry) {
        this.setState((oldState) => {
            const newTabEntries = Array.from(oldState.tabEntries);
            newTabEntries.push(tabEntry);
            this._tabEntriesById.set(tabEntry.tabId, tabEntry);
            return {
                tabEntries: newTabEntries,
            };
        });
    }


    onCloseTab(tabId) {
        const tabEntry = this._tabEntriesById.get(tabId);
        if (tabEntry.onCanCloseTab) {
            if (!tabEntry.onCanCloseTab()) {
                return;
            }
        }

        if (tabId === this.state.activeTabId) {
            this.setState({
                activeTabId: undefined,
            });
        }

        if (tabEntry) {
            const { onCloseTab } = tabEntry;
            if (onCloseTab) {
                onCloseTab(tabId);
            }

            if (tabId.startsWith('accountRegister_')) {
                this._accountRegistersByAccountId.delete(tabEntry.accountId);
            }
            else if (tabId.startsWith('accountEditor_')) {
                this._accountEditorsByAccountId.delete(tabEntry.accountId);
            }

            this._tabEntriesById.delete(tabId);
            this.setState((oldState) => {
                const oldTabEntries = oldState.tabEntries;
                const newTabEntries = [];
                let i = 0;
                for (; i < oldTabEntries.length; ++i) {
                    if (oldTabEntries[i].tabId === tabId) {
                        break;
                    }
                    newTabEntries.push(oldTabEntries[i]);
                }
                ++i;

                let { activeTabId } = oldState;
                
                if ((activeTabId === tabId) || !activeTabId) {
                    if (i < oldTabEntries.length) {
                        activeTabId = oldTabEntries[i].tabId;
                    }
                    else if (newTabEntries.length) {
                        activeTabId = newTabEntries[newTabEntries.length - 1].tabId;
                    }
                    else {
                        activeTabId = undefined;
                    }
                }

                for (; i < oldTabEntries.length; ++i) {
                    newTabEntries.push(oldTabEntries[i]);
                }

                return {
                    tabEntries: newTabEntries,
                    activeTabId: activeTabId,
                };
            });
        }
    }


    onActivateTab(tabId) {
        this.setState({
            activeTabId: tabId,
        });

        return tabId;
    }


    onActionChange() {
        process.nextTick(async () => {
            const { accessor } = this.props;
            const lastAppliedAction = accessor.getLastAppliedAction();

            let lastUndoneAction;
            const lastUndoneActionIndex = accessor.getUndoneActionCount() - 1;
            if (lastUndoneActionIndex >= 0) {
                lastUndoneAction = await accessor.asyncGetUndoneActionAtIndex(
                    lastUndoneActionIndex);
            }
            this.setState({
                isUndoEnabled: lastAppliedAction !== undefined,
                isRedoEnabled: lastUndoneAction !== undefined,
            });

        });
    }


    isUndoEnabled() {
        return this.state.isUndoEnabled;
    }

    onUndo() {
        if (this.state.isUndoEnabled) {
            process.nextTick(async () => {
                await this.props.accessor.asyncUndoLastAppliedActions();
            });
        }
    }


    isRedoEnabled() {
        return this.state.isRedoEnabled;
    }

    onRedo() {
        if (this.state.isRedoEnabled) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                await accessor.asyncReapplyLastAppliedActions();
            });
        }
    }


    onCheckReminders() {
        this.setErrorMsg('onCheckReminders is not yet implemented.');
    }


    onUpdatePrices() {
        this.setErrorMsg('onUpdatePrices is not yet implemented.');
    }


    onForceReload() {
        document.location.reload(true);
    }


    onGetTabIdState(tabId) {
        return this._tabEntriesById.get(tabId);
    }


    onSetTabIdState(tabId, state) {
        const oldTabEntry = this._tabEntriesById.get(tabId);
        if (oldTabEntry) {
            const newTabEntry = Object.assign({}, oldTabEntry, state);
            if (!deepEqual(oldTabEntry, newTabEntry)) {
                this._tabEntriesById.set(tabId, newTabEntry);

                this.setState((oldState) => {
                    const newTabEntries = oldState.tabEntries.map((tabEntry) => 
                        (tabEntry.tabId === tabId) ? newTabEntry : tabEntry);
                    return {
                        tabEntries: newTabEntries,
                    };
                });
            }
        }
    }


    onSetErrorMsg(errorMsg) {
        this.setState({
            errorMsg: errorMsg,
        });
    }

    onSetModal(modal) {
        this.setState({
            modal: modal,
        });
    }


    openAccountRegister(accountId) {
        let tabId = this._accountRegistersByAccountId.get(accountId);
        if (!tabId) {
            tabId = 'accountRegister_' + accountId;
            this._accountRegistersByAccountId.set(accountId, tabId);
            const tabEntry = this._accountRegisterHandler.createTabEntry(
                tabId, accountId);
            this.addTabEntry(tabEntry);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openAccountEditor(accountId, parentAccountId) {
        let tabId = this._accountEditorsByAccountId.get(accountId);
        if (!tabId) {
            tabId = 'accountEditor_' + (accountId || '_new');
            this._accountEditorsByAccountId.set(accountId, tabId);
            const tabEntry = this._accountEditorHandler.createTabEntry(
                tabId, accountId, parentAccountId);
            this.addTabEntry(tabEntry);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    onOpenTab(type, ...args) {
        switch (type) {
        case 'reconcileAccount' :
            this.onSetErrorMsg('Sorry, Reconcile Account is not yet implemented...');
            break;
        
        case 'accountRegister' :
            this.openAccountRegister(args[0]);
            break;
        
        case 'accountEditor' :
            this.openAccountEditor(args[0], args[1]);
            break;
    
        default :
            this.onSetErrorMsg('Sorry, ' + type + ' is not yet implemented...');
            break;
        }
    }


    onRenderPage(tabEntry, isActive) {
        return tabEntry.onRenderTabPage(tabEntry, isActive);
    }


    renderMainMenu() {
        // Have the undo/redo buttons...
        const baseClassName = 'nav nav-link pl-2 pr-2';

        let undoClassName = baseClassName;
        if (!this.isUndoEnabled()) {
            undoClassName += ' disabled';
        }

        const undo = <a
            className={undoClassName}
            onClick={this.onUndo}
            aria-label="Undo"
            href="#"
            role="button"
        >
            <i className="material-icons">undo</i>
        </a>;


        let redoClassName = baseClassName;
        if (!this.isRedoEnabled()) {
            redoClassName += ' disabled';
        }
        const redo = <a
            className={redoClassName}
            onClick={this.onRedo}
            aria-label="Redo"
            href="#"
            role="button"
        >
            <i className="material-icons">redo</i>
        </a>;


        const { accessor } = this.props;
        const mainMenuTitle = <i className="material-icons">menu</i>;
        const mainMenuItems = [
            { id: 'checkReminders', 
                label: userMsg('MainWindow-checkReminders'),
                onChooseItem: this.onCheckReminders,
            },
            { id: 'updatePrices', 
                label: userMsg('MainWindow-updatePrices'),
                onChooseItem: this.onUpdatePrices,
            },
            {},
            { id: 'viewAccountsList', 
                label: userMsg('MainWindow-viewAccountsList'),
                onChooseItem: () => this.onActivateTab('masterAccountsList')
            },
            { id: 'viewRemindersList', 
                label: userMsg('MainWindow-viewRemindersList'),
                disabled: !this._tabEntriesById.get('remindersList'),
                onChooseItem: () => this.onActivateTab('remindersList'),
            },
            { id: 'viewSecuritiesList', 
                label: userMsg('MainWindow-viewSecuritiesList'),
                disabled: !this._tabEntriesById.get('securitiesList'),
                onChooseItem: () => this.onActivateTab('securitiesList'),
            },
            { id: 'viewPricesList', 
                label: userMsg('MainWindow-viewPricesList'),
                disabled: !this._tabEntriesById.get('pricesList'),
                onChooseItem: () => this.onActivateTab('pricesList'),
            },
            { id: 'viewPricedItemsList', 
                label: userMsg('MainWindow-viewPricedItemsList'),
                disabled: !this._tabEntriesById.get('pricedItemsList'),
                onChooseItem: () => this.onActivateTab('pricedItemsList'),
            },
            {},
            { id: 'revertChanges',
                label: userMsg('MainWindow-revertChanges'),
                disabled: !accessor.isAccountingFileModified(),
                onChooseItem: this.props.onRevertFile,
            },
            { id: 'closeFile',
                label: userMsg('MainWindow-closeFile'),
                onChooseItem: this.props.onCloseFile,
            },
            {},
            { id: 'exit',
                label: userMsg('MainWindow-exit'),
                onChooseItem: this.props.onExit,
            },
        ];

        const { mainSetup } = this.props;
        if (mainSetup.isDevMode) {
            mainMenuItems.push({}),
            mainMenuItems.push({
                id: 'forceReload',
                label: userMsg('MainWindow-forceReload'),
                onClick: this.onForceReload,
            });
        }

        const mainMenu = <Dropdown
            title={mainMenuTitle}
            items={mainMenuItems}
            topClassExtras="mt-2 ml-2"
            noArrow
            menuClassExtras="dropdown-menu-right"
        />;

        return <div className="btn-group btn-group-sm" role="group">
            {undo}
            {redo}
            {mainMenu}
        </div>;
    }

    onPostRenderTabs(tabs) {
        const menu = this.renderMainMenu();
        return <div className="d-flex">
            <div className="flex-grow-1">
                {tabs}
            </div>
            {menu}
        </div>;
    }



    renderTabbedPages() {
        const { state } = this;
        return <TabbedPages
            tabEntries={state.tabEntries}
            activeTabId={state.activeTabId}
            onRenderPage={this.onRenderPage}
            onCloseTab={this.onCloseTab}
            onActivateTab={this.onActivateTab}
            onPostRenderTabs={this.onPostRenderTabs}
        />;
    }


    render() {
        const { errorMsg, modal } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }

        if (modal) {
            const modalComponent = modal();
            if (modalComponent) {
                return modalComponent;
            }
        }

        return this.renderTabbedPages();
    }
}


/**
 * @callback MainWindow~onRevertFile
 */

/**
 * @callback MainWindow~onCloseFile
 */

/**
 * @callback MainWindow~onExit
 */

/**
 * @typedef {object} MainWindow~propTypes
 * @property {EngineAccessor}   accessor
 * @property {App~MainSetup}    [mainSetup]
 * @property {MainWindow~onRevertFile}  [onRevertFile]  Called to revert the file.
 * @property {MainWindow~onCloseFile}   [onCloseFile]   Called to close the file.
 * @property {MainWindow~onExit}    [onExit]    Called to exit.
 */
MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    mainSetup: PropTypes.object,
    onRevertFile: PropTypes.func,
    onCloseFile: PropTypes.func,
    onExit: PropTypes.func,
};
