// TEMP!!! For the menus...
/* eslint-disable no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import * as FM from '../util/FrameManager';
import { userMsg } from '../util/UserMessages';
import { AccountsList } from './AccountsList';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TabbedPages } from '../util-ui/TabbedPages';
import * as A from '../engine/Accounts';
import { DropDown } from '../util-ui/DropDown';


//
//---------------------------------------------------------
//
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

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onModifyAccount = this.onModifyAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);
        
        this.onSelectAccount = this.onSelectAccount.bind(this);
        this.onOpenAccountRegister = this.onOpenAccountRegister.bind(this);
        this.openAccountRegister = this.openAccountRegister.bind(this);
        this.onCloseAccountRegister = this.onCloseAccountRegister.bind(this);


        this.onPostRenderTabs = this.onPostRenderTabs.bind(this);


        this.state = {
            tabEntries: [
                {
                    tabId: 'masterAccountList',
                    tabType: 'AccountsList',
                    title: userMsg('MainWindow-masterAccountList_title'),
                    isAccountEditor: true,
                }
            ],
        };

        this.state.activeTabEntry = this.state.tabEntries[0];
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
        const { state } = this;
        const { selectedAccountId, isAccountEditor } = state;

        if ((prevState.selectedAccountId !== selectedAccountId)
         || (prevState.isAccountEditor !== isAccountEditor)) {
            this.updateAccountMenus();
        }
    }



    onCancel() {
        this.setState({
            errorMsg: undefined,
            modalState: undefined,
        });
    }


    onCloseTab(tabEntry) {
        if (tabEntry === this.state.activeTabEntry) {
            this.setState({
                activeTabEntry: undefined,
            });
        }
    }

    onActivateTab(tabEntry) {
        this.setState({
            activeTabEntry: tabEntry,
        });
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
        console.log('Check Reminders');
    }


    onUpdatePrices() {
        console.log('Update Prices');
    }


    onForceReload() {
        document.location.reload(true);
    }


    isAccountEditorActive() {
        const { activeTabEntry } = this.state;
        return activeTabEntry && activeTabEntry.isAccountEditor;
    }

    isNewAccountEnabled() {
        return this.isAccountEditorActive();
    }

    onNewAccount() {
        if (this.isNewAccountEnabled()) {
            this.setState({
                modalState: 'newAccount',
            });
        }
    }


    isModifyAccountEnabled() {
        if (this.isAccountEditorActive()) {
            const { accessor } = this.props;
            const { selectedAccountId } = this.state;
            return accessor.getAccountDataItemWithId(
                selectedAccountId);
        }
    }

    onModifyAccount() {
        if (this.isModifyAccountEnabled()) {
            this.setState({
                modalState: 'modifyAccount',
            });
        }
    }


    isRemoveAccountEnabled() {
        if (this.isAccountEditorActive()) {
            const { accessor } = this.props;
            const { selectedAccountId } = this.state;
            const accountDataItem = accessor.getAccountDataItemWithId(
                selectedAccountId);
            if (accountDataItem) {
                return accountDataItem.parentAccountId;
            }
        }
    }

    onRemoveAccount() {
        if (this.isRemoveAccountEnabled()) {
            this.setState({
                modalState: 'removeAccount',
            });
        }
    }

    onSelectAccount(accountId) {
        this.setState({
            selectedAccountId: accountId,
        });
    }


    isOpenAccountRegisterEnabled() {
        if (this.isAccountEditorActive()) {
            const { accessor } = this.props;
            const { selectedAccountId } = this.state;
            return accessor.getAccountDataItemWithId(
                selectedAccountId);
        }
    }

    onOpenAccountRegister() {
        if (this.isOpenAccountRegisterEnabled()) {
            this.openAccountRegister(this.state.selectedAccountId);
        }
    }

    openAccountRegister(accountId) {
        console.log('openAccountRegister: ' + accountId);
    }


    isCloseAccountRegisterEnabled() {

    }
    onCloseAccountRegister() {

    }


    onRenderPage(tabEntry, isActive) {
        const { accessor } = this.props;
        switch (tabEntry.tabType) {
        case 'AccountsList':
            return <AccountsList
                accessor={accessor}
                onSelectAccount={this.onSelectAccount}
                onChooseAccount={this.openAccountRegister}
            />;
        
        case 'AccountRegister':

        }
    }


    renderModal(modalState) {
        switch (modalState) {
        case 'newAccount' :
            break;

        case 'modifyAccount' :
            break;

        case 'removeAccount' :
            break;

        case 'newPricedItem' :
            break;

        case 'modifyPricedItem' :
            break;

        case 'removePricedItem' :
            break;
        }
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
                onClick: this.onCheckReminders,
            },
            { id: 'updatePrices', 
                label: userMsg('MainWindow-updatePrices'),
                onClick: this.onUpdatePrices,
            },
            {},
            { id: 'viewAccountsList', 
                label: userMsg('MainWindow-viewAccountsList'),
                disabled: true,
            },
            { id: 'viewRemindersList', 
                label: userMsg('MainWindow-viewRemindersList'),
                disabled: true,
            },
            { id: 'viewSecuritiesList', 
                label: userMsg('MainWindow-viewSecuritiesList'),
                disabled: true,
            },
            { id: 'viewPricesList', 
                label: userMsg('MainWindow-viewPricesList'),
                disabled: true,
            },
            { id: 'viewPricedItemsList', 
                label: userMsg('MainWindow-viewPricedItemsList'),
                disabled: true,
            },
            {},
            { id: 'revertChanges',
                label: userMsg('MainWindow-revertChanges'),
                disabled: !accessor.isAccountingFileModified(),
                onClick: this.props.onRevertFile,
            },
            { id: 'closeFile',
                label: userMsg('MainWindow-closeFile'),
                onClick: this.props.onCloseFile,
            },
            {},
            { id: 'exit',
                label: userMsg('MainWindow-exit'),
                onClick: this.props.onExit,
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

        const mainMenu = <DropDown
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
            onActiveTab={this.onActiveTab}
            onPostRenderTabs={this.onPostRenderTabs}
        />;
    }


    render() {
        const { errorMsg, modalState } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }

        if (modalState) {
            const modal = this.renderModal(modalState);
            if (modal) {
                return modal;
            }
        }

        return this.renderTabbedPages();
    }
}

MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    mainSetup: PropTypes.object,
    onClose: PropTypes.func,
    onRevertFile: PropTypes.func,
    onCloseFile: PropTypes.func,
    onExit: PropTypes.func,
};
