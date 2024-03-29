import React from 'react';
import PropTypes from 'prop-types';
import { EventEmitter } from 'events';
import { userMsg } from '../util/UserMessages';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TabbedPages } from '../util-ui/TabbedPages';
import { DropdownMenu } from '../util-ui/DropdownMenu';
import deepEqual from 'deep-equal';
import { asyncGetUserSetting, asyncSetUserSetting } from '../util/UserSettings';
import { AccountsListHandler } from './AccountsListHandler';
import { AccountRegisterHandler } from './AccountRegisterHandler';
import { AccountEditorHandler } from './AccountEditorHandler';
import { PricedItemsListHandler } from './PricedItemsListHandler';
import { PricedItemEditorHandler } from './PricedItemEditorHandler';
import * as PI from '../engine/PricedItems';
import { ErrorBoundary } from '../util-ui/ErrorBoundary';
import { PricesListHandler } from './PricesListHandler';
import { PriceRetrieverWindowHandler } from './PriceRetrieverWindowHandler';
import { ReconcilerWindowHandler } from './ReconcilerWindowHandler';
import { ReminderEditorHandler } from './ReminderEditorHandler';
import { RemindersListHandler } from './RemindersListHandler';
import { CustomTabInstanceManager, 
    generateCustomTabId, } from '../util-ui/CustomTabInstanceManager';
import { RingBuffer } from '../util/RingBuffer';
import { StringPrompter } from '../util-ui/StringPrompter';
import { AllFilesFilter, CSVFilter, FileSelector } from '../util-ui/FileSelector';
import { makeValidFileName, asyncDirExists } from '../util/Files';
import { stringTableToCSV } from '../util/CSVUtils';
import { promises as fsPromises } from 'fs';
import * as path from 'path';


const projectSettingsMainWindow = ['mainWindow'];


/**
 * The main window component. This is responsible for managing the normal
 * accounting system editing process.
 */
export class MainWindow extends React.Component {
    constructor(props) {
        super(props);

        this._eventEmitter = new EventEmitter();
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);

        this.onCancel = this.onCancel.bind(this);
        this.onCloseTab = this.onCloseTab.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);

        this.onActionChange = this.onActionChange.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);

        this.onModifyProjectSettings = this.onModifyProjectSettings.bind(this);


        this.onCheckReminders = this.onCheckReminders.bind(this);
        this.onUpdatePrices = this.onUpdatePrices.bind(this);

        this.onGetSharedState = this.onGetSharedState.bind(this);
        this.onSetSharedState = this.onSetSharedState.bind(this);

        this.onGetTabIdTitle = this.onGetTabIdTitle.bind(this);
        this.onCreateCustomTabIdInstance = this.onCreateCustomTabIdInstance.bind(this);
        this.onRenameCustomTabIdInstance = this.onRenameCustomTabIdInstance.bind(this);
        this.onDeleteCustomTabIdInstance = this.onDeleteCustomTabIdInstance.bind(this);

        this.onGetTabIdsWithType = this.onGetTabIdsWithType.bind(this);
        this.onGetTabIdState = this.onGetTabIdState.bind(this);
        this.onSetTabIdState = this.onSetTabIdState.bind(this);
        this.onGetTabIdsInProjectSettings = this.onGetTabIdsInProjectSettings.bind(this);
        this.onGetTabIdProjectSettings = this.onGetTabIdProjectSettings.bind(this);
        this.onSetTabIdProjectSettings = this.onSetTabIdProjectSettings.bind(this);
        this.onGetTabIdUserSettings = this.onGetTabIdUserSettings.bind(this);
        this.onSetTabIdUserSettings = this.onSetTabIdUserSettings.bind(this);
        this.onSetErrorMsg = this.onSetErrorMsg.bind(this);
        this.onSetModal = this.onSetModal.bind(this);
        this.onOpenTabId = this.onOpenTabId.bind(this);
        this.onOpenTab = this.onOpenTab.bind(this);
        this.onRefreshUndoMenu = this.onRefreshUndoMenu.bind(this);
    
        this.onPrint = this.onPrint.bind(this);
        this.onExportAsCSV = this.onExportAsCSV.bind(this);

        this.onPostRenderTabs = this.onPostRenderTabs.bind(this);

        this.promptCustomTabIdName = this.promptCustomTabIdName.bind(this);


        const handlerArgs = {
            accessor: this.props.accessor,
            onGetSharedState: this.onGetSharedState,
            onSetSharedState: this.onSetSharedState,
            onGetTabIdsWithType: this.onGetTabIdsWithType,
            onGetTabIdState: this.onGetTabIdState,
            onSetTabIdState: this.onSetTabIdState,
            onGetTabIdProjectSettings: this.onGetTabIdProjectSettings,
            onSetTabIdProjectSettings: this.onSetTabIdProjectSettings,
            onGetTabIdUserSettings: this.onGetTabIdUserSettings,
            onSetTabIdUserSettings: this.onSetTabIdUserSettings,
            onSetErrorMsg: this.onSetErrorMsg,
            onSetModal: this.onSetModal,
            onOpenTab: this.onOpenTab,
            onCloseTab: this.onCloseTab,
            onRefreshUndoMenu: this.onRefreshUndoMenu,
            on: this.on,
            off: this.off,
        };

        const customTabInstanceManagerArgs = {
            onOpenTabId: this.onOpenTabId,
            onGetTabIdTitle: this.onGetTabIdTitle,
            onCreateTabIdInstance: this.onCreateCustomTabIdInstance,
            onRenameTabIdInstance: this.onRenameCustomTabIdInstance,
            onDeleteTabIdInstance: this.onDeleteCustomTabIdInstance,
        };

        this._accountsListHandler = new AccountsListHandler(handlerArgs);
        this._customAccountsListInstanceManager = new CustomTabInstanceManager(
            Object.assign({}, customTabInstanceManagerArgs, {
                tabIdBase: this._accountsListHandler.getTabIdBase(),
                actionIdBase: 'AccountList',
                labelIdBase: 'MainWindow-customAccountsList',
            }),
        );

        this._accountRegisterHandler = new AccountRegisterHandler(handlerArgs);
        this._accountRegistersByAccountId = new Map();

        this._accountEditorHandler = new AccountEditorHandler(handlerArgs);
        this._accountEditorsByAccountId = new Map();


        this._pricedItemsListHandler = new PricedItemsListHandler(handlerArgs);

        this._pricedItemEditorHandler = new PricedItemEditorHandler(handlerArgs);
        this._pricedItemEditorsByPricedItemId = {};

        this._customPricedItemsListInstanceManagers = {};

        for (const name in PI.PricedItemType) {
            this._pricedItemEditorsByPricedItemId[name] = new Map();
            this._customPricedItemsListInstanceManagers[name] 
                = new CustomTabInstanceManager(            
                    Object.assign({}, customTabInstanceManagerArgs, {
                        tabIdBase: this._pricedItemsListHandler.getTabIdBase(
                            name),
                        actionIdBase: name + 'List',
                        labelIdBase: 'MainWindow-custom_' + name + '_List',
                    }),
                );
        }


        this._pricesListHandler = new PricesListHandler(handlerArgs);
        this._pricesListsByPricedItemId = new Map();


        this._priceRetrieverWindowHandler = new PriceRetrieverWindowHandler(handlerArgs);


        this._reconcilerWindowHandler = new ReconcilerWindowHandler(handlerArgs);
        this._reconcilersByAccountId = new Map();


        this._remindersListHandler = new RemindersListHandler(handlerArgs);


        this._reminderEditorHandler = new ReminderEditorHandler(handlerArgs);
        this._reminderEditorsByReminderId = new Map();

        
        this.state = {
            tabEntries: [],
            sharedState: {},
        };
        this._tabItemsById = new Map();


        this._prevActiveTabIds = new RingBuffer(20);


        process.nextTick(async () => {
            const { accessor } = props;

            const pathName = accessor.getAccountingFilePathName();
            let dirName = pathName;
            if (!await asyncDirExists(pathName)) {
                dirName = path.dirname(pathName);
            }
            this.setState({
                projectDir: dirName,
                currentDir: dirName,
            });

            this._projectSettings = accessor.getProjectSettings(
                projectSettingsMainWindow);
            if (!this._projectSettings || !this._projectSettings.tabIdSettings) {
                await accessor.asyncDirectModifyProjectSettings({
                    changes: {
                        tabIdSettings: {},
                    },
                    changesPath: projectSettingsMainWindow,
                });

                this._projectSettings = accessor.getProjectSettings(
                    projectSettingsMainWindow
                );
            }

            this._userSettings = await asyncGetUserSetting('mainWindow');
            if (!this._userSettings) {
                this._userSettings = {
                };
            }
            if (!this._userSettings.tabIdSettings) {
                this._userSettings.tabIdSettings = {};
            }

            
            this.openAccountsListTabId(this._accountsListHandler.getMasterTabId());

        });
    }


    componentDidMount() {
        const { accessor } = this.props;

        accessor.on('actionChange', this.onActionChange);
        this.onActionChange();

        accessor.on('modifyProjectSettings', this.onModifyProjectSettings);
    }


    componentWillUnmount() {
        const { accessor } = this.props;

        accessor.off('modifyProjectSettings', this.onModifyProjectSettings);

        accessor.off('actionChange', this.onActionChange);

        this._accountsListHandler.shutdownHandler();
        this._accountRegisterHandler.shutdownHandler();
        this._accountEditorHandler.shutdownHandler();
        this._pricedItemsListHandler.shutdownHandler();
        this._pricedItemEditorHandler.shutdownHandler();
        this._pricesListHandler.shutdownHandler();
        this._priceRetrieverWindowHandler.shutdownHandler();
        this._reconcilerWindowHandler.shutdownHandler();
        this._remindersListHandler.shutdownHandler();
        this._reminderEditorHandler.shutdownHandler();
    }


    componentDidUpdate(prevProps, prevState) {
        const { state } = this;
        if (state.activeTabId !== prevState.activeTabId) {
            if (state.activeTabId && prevState.activeTabId) {
                this._prevActiveTabIds.push(prevState.activeTabId);
            }
        }

        if (state.isPrint && !prevState.isPrint) {
            // We print using the isPrint state in order to have the drop-down menu
            // go away before printing.
            this.setState({
                isPrint: false,
            },
            () => {
                window.print();
            });
        }
    }


    on(event, listener) {
        this._eventEmitter.on(event, listener);
    }

    off(event, listener) {
        this._eventEmitter.off(event, listener);
    }


    onCancel() {
        this.setState({
            errorMsg: undefined,
            modal: undefined,
        });
    }


    addTabEntry(tabEntry, tabType) {
        this.setState((oldState) => {
            const newTabEntries = Array.from(oldState.tabEntries);
            newTabEntries.push(tabEntry);
            this._tabItemsById.set(tabEntry.tabId, [tabEntry, tabType]);
            return {
                tabEntries: newTabEntries,
            };
        });
    }


    onCloseTab(tabId) {
        const tabItem = this._tabItemsById.get(tabId);
        if (!tabItem) {
            return;
        }

        const tabEntry = tabItem[0];
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
                onCloseTab(tabId, tabEntry);
            }

            if (tabId.startsWith('accountRegister_')) {
                this._accountRegistersByAccountId.delete(tabEntry.accountId);
            }
            else if (tabId.startsWith('accountEditor_')) {
                this._accountEditorsByAccountId.delete(tabEntry.accountId);
            }
            else if (tabId.startsWith('pricedItemEditor_')) {
                this._pricedItemEditorsByPricedItemId[tabEntry.pricedItemTypeName].delete(
                    tabEntry.pricedItemId);
            }
            else if (tabId.startsWith('pricesList_')) {
                this._pricesListsByPricedItemId.delete(tabEntry.pricedItemId);
            }
            else if (tabId.startsWith('reconciler_')) {
                this._reconcilersByAccountId.delete(tabEntry.accountId);
            }
            else if (tabId === 'remindersList') {
                this._remindersListTabEntry = undefined;
            }
            else if (tabId === 'remindersDueList') {
                this._remindersDueListTabEntry = undefined;
            }
            else if (tabId.startsWith('reminderEditor_')) {
                this._reminderEditorsByReminderId.delete(tabEntry.reminderId);
            }

            this._tabItemsById.delete(tabId);
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
                    while (this._prevActiveTabIds.elementCount()) {
                        const tabId = this._prevActiveTabIds.popNewest();
                        if (this._tabItemsById.has(tabId)) {
                            activeTabId = tabId;
                            break;
                        }
                    }
                }

                if (!activeTabId) {
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
            let lastAppliedAction;
            const lastAppliedActionIndex = accessor.getAppliedActionCount() - 1;
            if (lastAppliedActionIndex >= 0) {
                lastAppliedAction = await accessor.asyncGetAppliedActionAtIndex(
                    lastAppliedActionIndex);
            }

            let lastUndoneAction;
            const lastUndoneActionIndex = accessor.getUndoneActionCount() - 1;
            if (lastUndoneActionIndex >= 0) {
                lastUndoneAction = await accessor.asyncGetUndoneActionAtIndex(
                    lastUndoneActionIndex);
            }
            this.setState({
                isUndoEnabled: lastAppliedAction !== undefined,
                lastAppliedAction: lastAppliedAction,
                isRedoEnabled: lastUndoneAction !== undefined,
                lastUndoneAction: lastUndoneAction,
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
                await accessor.asyncReapplyLastUndoneAction();
            });
        }
    }


    onCheckReminders() {
        this.onOpenTab('remindersDueList');
    }


    onUpdatePrices() {
        this.openPriceRetrieverWindow();
    }


    onGetSharedState() {
        return this.state.sharedState;
    }

    onSetSharedState(stateChanges) {
        this.setState((state) => {
            const newSharedState = Object.assign({}, state.sharedState, stateChanges);
            if (!deepEqual(state.sharedState, newSharedState)) {
                return {
                    sharedState: newSharedState,
                };
            }
        });
    }


    onGetTabIdsWithType(type) {
        const tabIds = [];
        this._tabItemsById.forEach((tabItem) => {
            if (tabItem[1] === type) {
                tabIds.push(tabItem[0].tabId);
            }
        });
        return tabIds;
    }


    onGetTabIdState(tabId) {
        const tabItem = this._tabItemsById.get(tabId);
        if (tabItem) {
            return tabItem[0];
        }
    }


    onSetTabIdState(tabId, state, callback) {
        const oldTabItem = this._tabItemsById.get(tabId);
        if (oldTabItem) {
            const oldTabEntry = oldTabItem[0];
            const newTabEntry = Object.assign({}, oldTabEntry, state);
            if (!deepEqual(oldTabEntry, newTabEntry)) {
                this._tabItemsById.set(tabId, [newTabEntry, oldTabItem[1]]);

                let stateCallback;
                if (callback) {
                    stateCallback = (state) => callback(newTabEntry);
                }

                this.setState((oldState) => {
                    const newTabEntries = oldState.tabEntries.map((tabEntry) => 
                        (tabEntry.tabId === tabId) ? newTabEntry : tabEntry);
                    return {
                        tabEntries: newTabEntries,
                    };
                },
                stateCallback);
            }
        }
    }


    onGetTabIdsInProjectSettings() {
        const tabIds = [];
        if (this._projectSettings && this._projectSettings.tabIdSettings) {
            for (let name in this._projectSettings.tabIdSettings) {
                tabIds.push(name);
            }
        }
        return tabIds;
    }


    onGetTabIdProjectSettings(tabId) {
        return this._projectSettings.tabIdSettings[tabId];
    }

    onSetTabIdProjectSettings(tabId, changes, actionName) {
        let postApplyCallback;
        let postUndoCallback;
        if (typeof tabId === 'object') {
            changes = tabId.changes;
            actionName = tabId.actionName;
            postApplyCallback = tabId.postApplyCallback;
            postUndoCallback = tabId.postUndoCallback;
            tabId = tabId.tabId;
        }

        const { accessor } = this.props;
        const action = accessor.createModifyProjectSettingsAction({
            name: actionName || userMsg('MainWindow-action_modify_project_settings'),
            changes: changes,
            changesPath: projectSettingsMainWindow.concat([ 'tabIdSettings', tabId]),
            assignChanges: true,
            postApplyCallback: postApplyCallback,
            postUndoCallback: postUndoCallback,
        });

        process.nextTick(async () => {
            try {
                await accessor.asyncApplyAction(action);
                this._projectSettings.tabIdSettings[tabId] = accessor.getProjectSettings(
                    action.changesPath
                );
            }
            catch (e) {
                // FIX ME!!!
                console.log('Could not save project settings: ' + e);
            }
        });
    }

    onModifyProjectSettings(result) {
        const { originalAction } = result;
        if (!originalAction) {
            return;
        }

        const { changes, changesPath } = originalAction;
        if (!changesPath || (changesPath[0] !== projectSettingsMainWindow[0])) {
            // Not our change...
            return;
        }

        if (changesPath.length === 1) {
            if (changes) {
                this._projectSettings = Object.assign({}, this._projectSettings, changes);
                return;
            }
        }

        if (changesPath[1] === 'tabIdSettings') {
            const tabId = changesPath[2];
            if (!tabId) {
                return;
            }

            const oldTabIdSettings = this._projectSettings.tabIdSettings[tabId];

            let tabIdSettings = this.props.accessor.getProjectSettings(
                changesPath
            );
            this._projectSettings.tabIdSettings[tabId] = tabIdSettings;
            
            if (changes && !deepEqual(changes, tabIdSettings)
                && !Array.isArray(changes) && !Array.isArray(tabIdSettings)) {
                // Make sure tabIdSettings has the same set of properties as
                // changes, this way any changes that were added will be available
                // for removal.
                tabIdSettings = Object.assign({}, tabIdSettings);
                for (const name in changes) {
                    if (!Object.prototype.hasOwnProperty.call(tabIdSettings, name)) {
                        if (Array.isArray(changes[name])) {
                            tabIdSettings[name] = [];
                        }
                        else {
                            tabIdSettings[name] = undefined;
                        }
                    }
                }
            }

            if (oldTabIdSettings && tabIdSettings 
             && (oldTabIdSettings.title !== tabIdSettings.title)) {
                this.onSetTabIdState(tabId, {
                    title: tabIdSettings.title,
                });
            }

            if (!this._projectSettings.tabIdSettings[tabId]) {
                this.onCloseTab(tabId);
                delete this._projectSettings.tabIdSettings[tabId];
            }

            this._eventEmitter.emit('tabIdProjectSettingsModify', 
                tabId, tabIdSettings, changes);
        }
    }


    onGetTabIdUserSettings(tabId) {
        return this._userSettings.tabIdSettings[tabId];
    }

    onSetTabIdUserSettings(tabId, changes) {
        const { tabIdSettings } = this._userSettings;
        const newSettings = Object.assign({}, tabIdSettings[tabId], changes);
        if (!deepEqual(newSettings, tabIdSettings[tabId])) {
            tabIdSettings[tabId] = newSettings;
            process.nextTick(async () => {
                try {
                    await asyncSetUserSetting('mainWindow', this._userSettings);
                }
                catch (e) {
                    // FIX ME!!!
                    console.log('Could not save user settings: ' + e);
                }
            });
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


    openAccountsListTabId(tabId) {
        if (!this._tabItemsById.has(tabId)) {
            const tabEntry = this._accountsListHandler.createTabEntry(
                tabId);
            this.addTabEntry(tabEntry, this._accountsListHandler.getMasterTabId());
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openAccountRegister(openArgs) {
        const { accountId } = openArgs;
        let tabId = this._accountRegistersByAccountId.get(accountId);
        if (!tabId) {
            const tabType = 'accountRegister';
            tabId = tabType + '_' + accountId;
            this._accountRegistersByAccountId.set(accountId, tabId);
            const tabEntry = this._accountRegisterHandler.createTabEntry(
                tabId, accountId, openArgs);
            this.addTabEntry(tabEntry, tabType);
        }
        else {
            this._accountRegisterHandler.openTabEntry(tabId, accountId, 
                openArgs);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openAccountEditor({ accountId, parentAccountId, childListIndex, }) {
        let tabId = this._accountEditorsByAccountId.get(accountId);
        if (!tabId) {
            const tabType = 'accountEditor';
            tabId = tabType + '_' + (accountId || '_new');
            this._accountEditorsByAccountId.set(accountId, tabId);
            const tabEntry = this._accountEditorHandler.createTabEntry(
                tabId, accountId, parentAccountId, childListIndex);
            this.addTabEntry(tabEntry, tabType);
        }

        this.setState({
            activeTabId: tabId,
        });
    }



    openPricedItemsList(pricedItemTypeName) {
        const tabId = this._pricedItemsListHandler.getMasterTabId(pricedItemTypeName);
        return this.openPricedItemsListTabId(tabId, pricedItemTypeName);
    }

    openPricedItemsListTabId(tabId, pricedItemTypeName) {
        if (!this._tabItemsById.has(tabId)) {
            const tabEntry = this._pricedItemsListHandler.createTabEntry(
                tabId, pricedItemTypeName);
            this.addTabEntry(tabEntry, 'pricedItemsList');
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openPricedItemEditor(openArgs) {
        const { pricedItemId, pricedItemTypeName, } = openArgs;
        const editorsByPricedItemId 
            = this._pricedItemEditorsByPricedItemId[pricedItemTypeName];
        let tabId = editorsByPricedItemId.get(pricedItemId);
        if (!tabId) {
            const tabType = 'pricedItemEditor';
            tabId = tabType + '_' + (pricedItemId || (pricedItemTypeName + '_new'));
            editorsByPricedItemId.set(pricedItemId, tabId);
            const tabEntry = this._pricedItemEditorHandler.createTabEntry(
                tabId, openArgs);
            this.addTabEntry(tabEntry, tabType);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openPricesList(openArgs) {
        const { pricedItemId } = openArgs;
        let tabId = this._pricesListsByPricedItemId.get(pricedItemId);
        if (!tabId) {
            const tabType = 'pricesList';
            tabId = tabType + '_' + pricedItemId;
            this._pricesListsByPricedItemId.set(pricedItemId, tabId);
            const tabEntry = this._pricesListHandler.createTabEntry(
                tabId, pricedItemId, openArgs);
            this.addTabEntry(tabEntry, tabType);
        }
        else {
            if (this._pricesListHandler.openTabEntry) {
                this._pricesListHandler.openTabEntry(tabId, pricedItemId, 
                    openArgs);
            }
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openPriceRetrieverWindow() {
        const tabId = 'pricedRetrieverWindow';
        if (!this._tabItemsById.has(tabId)) {
            const tabEntry = this._priceRetrieverWindowHandler.createTabEntry(
                tabId);
            this.addTabEntry(tabEntry, tabId);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openReconciler(openArgs) {
        const { accountId } = openArgs;
        let tabId = this._reconcilersByAccountId.get(accountId);
        if (!tabId) {
            const tabType = 'reconciler';
            tabId = tabType + '_' + accountId;
            this._reconcilersByAccountId.set(accountId, tabId);
            const tabEntry = this._reconcilerWindowHandler.createTabEntry(
                tabId, accountId, openArgs);
            this.addTabEntry(tabEntry, tabType);
        }
        else {
            if (this._reconcilerWindowHandler.openTabEntry) {
                this._reconcilerWindowHandler.openTabEntry(tabId, accountId, 
                    openArgs);
            }
        }

        this.setState({
            activeTabId: tabId,
        });
    }

    
    openRemindersList(openArgs) {
        const tabId = 'remindersList';
        if (!this._remindersListTabEntry) {
            const tabEntry = this._remindersListHandler.createTabEntry(
                tabId, openArgs);
            this.addTabEntry(tabEntry, tabId);
            this._remindersListTabEntry = tabEntry;
        }

        this.setState({
            activeTabId: tabId,
        });
    }

    
    openRemindersDueList(openArgs) {
        const tabId = 'remindersDueList';
        if (!this._remindersDueListTabEntry) {
            const tabEntry = this._remindersListHandler.createTabEntry(
                tabId, openArgs);
            this.addTabEntry(tabEntry, tabId);
            this._remindersDueListTabEntry = tabEntry;
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    openReminderEditor(openArgs) {
        openArgs = openArgs || {};
        const { reminderId, transactionDataItem, } = openArgs;
        
        let tabId = this._reminderEditorsByReminderId.get(reminderId);
        if (!tabId) {
            const tabType = 'reminderEditor';
            tabId = tabType + '_' + (reminderId || '_new');
            this._reminderEditorsByReminderId.set(reminderId, tabId);
            const tabEntry = this._reminderEditorHandler.createTabEntry(
                tabId, reminderId, transactionDataItem);
            this.addTabEntry(tabEntry, tabType);
        }

        this.setState({
            activeTabId: tabId,
        });
    }


    onOpenTabId(tabId) {
        if (tabId.startsWith(this._accountsListHandler.getMasterTabId())) {
            this.openAccountsListTabId(tabId);
            return;
        }

        let result;

        result = this._pricedItemsListHandler.parsePricedItemsListTabId(tabId);
        if (result) {
            this.openPricedItemsListTabId(tabId, result.pricedItemTypeName);
            return;
        }
    }


    /**
     * Opens a given 'main' tab. This differs from onOpenTabId() in that
     * onOpenTabId() works off an existing tab id, parsing the tab id to figure
     * out which tab to open. onOpenTabId() also provides limited support for tab types.
     * @param {string} type 
     * @param  {...any} args 
     */
    onOpenTab(type, ...args) {
        switch (type) {
        case 'reconciler' :
            this.openReconciler(...args);
            break;
        
        case 'accountRegister' :
            this.openAccountRegister(...args);
            break;
        
        case 'accountEditor' :
            this.openAccountEditor(...args);
            break;
        
        case 'SECURITY_List' :
            this.openPricedItemsList(PI.PricedItemType.SECURITY.name);
            break;
        
        case 'MUTUAL_FUND_List' :
            this.openPricedItemsList(PI.PricedItemType.MUTUAL_FUND.name);
            break;
        
        case 'CURRENCY_List' :
            this.openPricedItemsList(PI.PricedItemType.CURRENCY.name);
            break;

        case 'REAL_ESTATE_List' :
            this.openPricedItemsList(PI.PricedItemType.REAL_ESTATE.name);
            break;

        case 'PROPERTY_List' :
            this.openPricedItemsList(PI.PricedItemType.PROPERTY.name);
            break;
        
        case 'pricedItemEditor' :
            this.openPricedItemEditor(...args);
            break;
        
        case 'pricesList' :
            this.openPricesList(...args);
            break;
        
        case 'priceRetrieverWindow' :
            this.openPriceRetrieverWindow(...args);
            break;
        
        case 'reminderEditor' :
            this.openReminderEditor(...args);
            break;
        
        case 'remindersList' :
            this.openRemindersList(...args);
            break;
    
        case 'remindersDueList' :
            this.openRemindersDueList(...args);
            break;
    
        default :
            this.onSetErrorMsg('Sorry, ' + type + ' is not yet implemented...');
            break;
        }
    }


    onPrint() {
        this.setState({
            isPrint: true,
        });
    }


    onExportAsCSV() {
        const { activeTabId } = this.state;
        if (!activeTabId) {
            return;
        }
        
        const tabItem = this._tabItemsById.get(activeTabId);
        if (!tabItem) {
            return;
        }

        const tabEntry = tabItem[0];
        const { onExportAsStringTable } = tabEntry;
        if (!onExportAsStringTable) {
            return;
        }

        const tabTitle = this.onGetTabIdTitle(activeTabId);

        const title = userMsg('MainWindow-exportAsCSV_title',
            tabTitle,
        );

        let initialName = makeValidFileName(tabTitle) + '.csv';


        process.nextTick(async () => {
            let exportDir = this._projectSettings.exportDir;
            if (!await asyncDirExists(exportDir)) {
                // projectDir should always be a valid directory...
                exportDir = this.state.projectDir;
            }

            // Prompt for the file name...
            this.onSetModal(() => <FileSelector 
                title = {title}
                initialDir = {exportDir}
                initialName = {initialName}
                fileFilters = {[
                    CSVFilter,
                    AllFilesFilter,
                ]}
                onOK = {(fileName) => this.onDoExportAsCSV(fileName,
                    onExportAsStringTable, activeTabId)}
                onCancel = {this.onCancel}
                isCreateFile
                isConfirmReplaceFile
            />);            
        });
    }


    onDoExportAsCSV(fileName, onExportAsStringTable, activeTabId) {
        this.onSetModal();
        try {
            const stringTable = onExportAsStringTable(activeTabId);
            const csvString = stringTableToCSV(stringTable);

            process.nextTick(async () => {
                try {
                    const fh = await fsPromises.open(fileName, 'w');
                    try {
                        await fh.write(csvString);

                        await this.props.accessor.asyncDirectModifyProjectSettings({
                            changes: {
                                exportDir: path.dirname(fileName),
                            },
                            changesPath: projectSettingsMainWindow,
                            assignChanges: true,
                        });
                    }
                    finally {
                        fh.close();
                    }
                }
                catch (e) {
                    this.onSetErrorMsg(userMsg('MainWindow-csvWriteFailed',
                        fileName, e));
                }
            });
        }
        catch (e) {
            this.onSetErrorMsg(userMsg('MainWindow-csvWriteFailed',
                fileName, e));
        }
    }


    onRefreshUndoMenu() {
        this.forceUpdate();
    }


    onRenderPage(tabEntry, isActive) {
        return <ErrorBoundary>
            {tabEntry.onRenderTabPage(tabEntry, isActive)}
        </ErrorBoundary>;
    }


    getUndoRedoInfo() {
        const { lastAppliedAction, lastUndoneAction } = this.state;
        const undoInfo = {};
        if (lastAppliedAction) {
            undoInfo.label = userMsg('MainWindow-undo_label', lastAppliedAction.name);
            undoInfo.onClick = this.onUndo;
        }

        const redoInfo = {};
        if (lastUndoneAction) {
            redoInfo.label = userMsg('MainWindow-redo_label', lastUndoneAction.name);
            redoInfo.onClick = this.onRedo;
        }

        return {
            undoInfo: undoInfo,
            redoInfo: redoInfo,
        };
    }


    makeCustomTagId(tabIdBase) {
        let tabIdsInUse = this.onGetTabIdsInProjectSettings();
        tabIdsInUse = tabIdsInUse.concat(
            Array.from(this._tabItemsById.keys())
        );

        return generateCustomTabId(tabIdBase, tabIdsInUse);
    }


    promptCustomTabIdName({title, basicUserName, callback, currentName, }) {
        return <StringPrompter 
            title = {title}
            label = {userMsg(
                'MainWindow-customTabIdName_label', basicUserName)}
            initialValue = {currentName}
            onDone = {callback}
            onCancel = {this.onCancel}
        />;
    }


    onGetTabIdTitle(tabId) {
        let tabEntry = this.onGetTabIdState(tabId);
        if (!tabEntry) {
            tabEntry = this.onGetTabIdProjectSettings(tabId);
        }

        if (tabEntry) {
            return tabEntry.title;
        }
    }

    onCreateCustomTabIdInstance({ originalTabId, basicUserName, menuLabel, options }) {
        this.onSetModal(() => this.promptCustomTabIdName({
            title: userMsg('MainWindow-createCustomTabName_title',
                basicUserName),
            basicUserName: basicUserName, 
            callback: (newName) => {
                // Close the prompter...
                this.onCancel();

                const existingProjectSettings = this.onGetTabIdProjectSettings(
                    originalTabId
                );

                // We need to generate a new tab id...
                const newTabId = this.makeCustomTagId(options.tabIdBase);

                this.onSetTabIdProjectSettings({
                    tabId: newTabId,
                    changes: Object.assign({}, existingProjectSettings, {
                        title: newName,
                    }),
                    actionName: menuLabel,
                    postApplyCallback: (result) => {
                        this.onOpenTabId(newTabId);
                        return result;
                    },
                });
            },
        }));
    }


    onRenameCustomTabIdInstance({ tabId, basicUserName, menuLabel, }) {
        const tabEntry = this.onGetTabIdState(tabId);
        if (!tabEntry) {
            return;
        }
        
        this.onSetModal(() => this.promptCustomTabIdName({
            title: userMsg('MainWindow-renameCustomTabName_title',
                basicUserName, tabEntry.title),
            basicUserName: basicUserName, 
            currentName: tabEntry.title,
            callback: (newName) => {
                // Close the prompter...
                this.onCancel();

                this.onSetTabIdProjectSettings({
                    tabId: tabId,
                    changes: {
                        title: newName,
                    },
                    actionName: menuLabel,
                });
            },
        }));
    }


    onDeleteCustomTabIdInstance({ tabId, basicUserName, menuLabel, }) {
        this.onCloseTab(tabId);

        this.onSetTabIdProjectSettings({
            tabId: tabId,
            changes: undefined,
            actionName: menuLabel,
            postUndoCallback: (result) => {
                this.onOpenTabId(tabId);
                return result;
            },
        });
    }


    getAccountsListSubMenu(allTabIds) {
        const { activeTabId } = this.state;

        const masterTabId = this._accountsListHandler.getMasterTabId();
        const masterNetWorthTabId = masterTabId 
            + this._accountsListHandler.getNetWorthTabIdSuffix();
        const masterNetIncomeTabId = masterTabId 
            + this._accountsListHandler.getNetIncomeTabIdSuffix();

        let subMenuItems = [
            { id: 'viewAccountsList', 
                label: userMsg('MainWindow-viewAccountsList'),
                checked: activeTabId === masterTabId,
                onChooseItem: () => this.onActivateTab(masterTabId)
            },
            { id: 'viewNetWorth', 
                label: userMsg('MainWindow-viewNetWorthList'),
                checked: activeTabId === masterNetWorthTabId,
                onChooseItem: () => this.onOpenTabId(masterNetWorthTabId)
            },
            { id: 'viewNetIncome', 
                label: userMsg('MainWindow-viewNetIncomeList'),
                checked: activeTabId === masterNetIncomeTabId,
                onChooseItem: () => this.onOpenTabId(masterNetIncomeTabId)
            },
            {},
        ];

        subMenuItems = subMenuItems.concat(
            this._customAccountsListInstanceManager.createSubMenuItems({
                allTabIds: allTabIds,
                activeTabId: activeTabId,
                alternateCreateTabId: masterTabId,
            }),
        );

        return { id: 'accountsListSubMenu',
            label: userMsg('MainWindow-accountsListSubMenu'),
            subMenuItems: subMenuItems,
        };
    }


    getPricedItemsListSubMenu(pricedItemTypeName, allTabIds) {
        const { activeTabId } = this.state;
        const masterTabId 
            = this._pricedItemsListHandler.getMasterTabId(pricedItemTypeName);
        const baseLabel = pricedItemTypeName + '_List';
        let subMenuItems = [
            { id: 'view_' + baseLabel, 
                label: userMsg('MainWindow-view_' + baseLabel),
                checked: activeTabId === masterTabId,
                onChooseItem: () => this.openPricedItemsList(pricedItemTypeName),
            },
            {},
        ];

        subMenuItems = subMenuItems.concat(
            this._customPricedItemsListInstanceManagers[pricedItemTypeName]
                .createSubMenuItems({
                    allTabIds: allTabIds,
                    activeTabId: activeTabId,
                    alternateCreateTabId: masterTabId,
                }),
        );

        return { id: baseLabel + 'SubMenu',
            label: userMsg('MainWindow-' + baseLabel + 'SubMenu'),
            subMenuItems: subMenuItems,
        };
    }


    renderMainMenu() {
        // Have the undo/redo buttons...
        const baseClassName = 'Nav Nav-link Px-2';
        const { accessor } = this.props;

        const activeTabItem = this._tabItemsById.get(this.state.activeTabId);
        const activeTabEntry = (activeTabItem) ? activeTabItem[0] : undefined;
        let undoRedoInfo;
        if (activeTabEntry) {
            const { getUndoRedoInfo } = activeTabEntry;
            if (getUndoRedoInfo) {
                undoRedoInfo = getUndoRedoInfo(activeTabEntry);
            }
        }

        undoRedoInfo = undoRedoInfo || this.getUndoRedoInfo();
        let { undoInfo, redoInfo } = undoRedoInfo;
        undoInfo = undoInfo || {};
        redoInfo = redoInfo || {};

        let undoClassName = baseClassName + ' Undo-tooltip';
        if (!undoInfo.onClick) {
            undoClassName += ' disabled';
        }

        let undo = <a
            className={undoClassName}
            onClick={undoInfo.onClick}
            aria-label="Undo"
            href="#"
            role="button"
        >
            <i className="material-icons">undo</i>
            <span className="Undo-tooltip-text">{undoInfo.label}</span>
        </a>;


        let redoClassName = baseClassName + ' Undo-tooltip';
        if (!redoInfo.onClick) {
            redoClassName += ' disabled';
        }
        const redo = <a
            className={redoClassName}
            onClick={redoInfo.onClick}
            aria-label="Redo"
            href="#"
            role="button"
        >
            <i className="material-icons">redo</i>
            <span className="Undo-tooltip-text">{redoInfo.label}</span>
        </a>;


        const allTabIds = this.onGetTabIdsInProjectSettings();

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
            this.getAccountsListSubMenu(allTabIds),

            { id: 'viewRemindersList', 
                label: userMsg('MainWindow-viewRemindersList'),
                onChooseItem: () => this.onOpenTab('remindersList'),
            },
            {},
            this.getPricedItemsListSubMenu(PI.PricedItemType.SECURITY.name, allTabIds),
            this.getPricedItemsListSubMenu(PI.PricedItemType.MUTUAL_FUND.name, allTabIds),
            this.getPricedItemsListSubMenu(PI.PricedItemType.CURRENCY.name, allTabIds),
            this.getPricedItemsListSubMenu(PI.PricedItemType.REAL_ESTATE.name, allTabIds),
            this.getPricedItemsListSubMenu(PI.PricedItemType.PROPERTY.name, allTabIds),
        ];

        const { getZoomMenuItems } = this.props;
        if (getZoomMenuItems) {
            const zoomMenuItems = getZoomMenuItems();
            if (zoomMenuItems) {
                mainMenuItems.push({});
                zoomMenuItems.forEach((menuItem) => mainMenuItems.push(menuItem));
            }
        }

        mainMenuItems.push({});

        mainMenuItems.push({ id: 'print',
            label: userMsg('MainWindow-print'),
            onChooseItem: this.onPrint,
        });


        let exportAsCSVDisabled = true;
        if (activeTabEntry) {
            const { canExportAsStringTable } = activeTabEntry;
            if (canExportAsStringTable) {
                exportAsCSVDisabled = !(canExportAsStringTable());
            }
        }
        mainMenuItems.push({ id: 'exportAsCSV',
            label: userMsg('MainWindow-exportAsCSV'),
            disabled: exportAsCSVDisabled,
            onChooseItem: this.onExportAsCSV,
        });


        mainMenuItems.push({});

        mainMenuItems.push({ id: 'revertChanges',
            label: userMsg('MainWindow-revertChanges'),
            disabled: !accessor.isAccountingFileModified(),
            onChooseItem: this.props.onRevertFile,
        });
        mainMenuItems.push({ id: 'closeFile',
            label: userMsg('MainWindow-closeFile'),
            onChooseItem: this.props.onCloseFile,
        });
        mainMenuItems.push({});
        mainMenuItems.push({ id: 'exit',
            label: userMsg('MainWindow-exit'),
            onChooseItem: this.props.onExit,
        });

        const { getDevMenuItems } = this.props;
        if (getDevMenuItems) {
            const devMenu = getDevMenuItems();
            if (devMenu) {
                mainMenuItems.push({});
                devMenu.forEach((menuItem) => mainMenuItems.push(menuItem));
            }
        }

        const mainMenu = <DropdownMenu
            title={mainMenuTitle}
            items={mainMenuItems}
            topClassExtras="Mt-2 Ml-2"
            noArrow
            menuClassExtras="Dropdown-menu-right"
        />;

        return <div className="Btn-group Btn-group-sm" role="group">
            {undo}
            {redo}
            {mainMenu}
        </div>;
    }

    onPostRenderTabs(tabs) {
        const menu = this.renderMainMenu();
        return <div className="FlexC">
            <div className="FlexI-grow-1">
                {tabs}
            </div>
            {menu}
        </div>;
    }



    renderTabbedPages(classExtras) {
        const { state } = this;
        return <TabbedPages
            classExtras = {classExtras}
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

        let errorComponent;
        let modalComponent;
        if (errorMsg) {
            errorComponent = <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }
        else if (modal) {
            modalComponent = modal();
        }

        if (errorComponent || modalComponent) {
            return <div>
                {errorComponent}
                {modalComponent}
                {this.renderTabbedPages('D-none')}
            </div>;
        }
        /*

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
        */

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
 * @property {MainWindow~onRevertFile}  [onRevertFile]  Called to revert the file.
 * @property {MainWindow~onCloseFile}   [onCloseFile]   Called to close the file.
 * @property {MainWindow~onExit}    [onExit]    Called to exit.
 */
MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    onRevertFile: PropTypes.func,
    onCloseFile: PropTypes.func,
    onExit: PropTypes.func,
    getZoomMenuItems: PropTypes.func,
    getDevMenuItems: PropTypes.func,
};
