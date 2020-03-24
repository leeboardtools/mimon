// TEMP!!! For the menus...
/* eslint-disable no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import * as FM from '../util/FrameManager';
import { userMsg } from '../util/UserMessages';
import { AccountsList } from './AccountsList';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TabbedPages } from '../util-ui/TabbedPages';


function getMainMenuTemplate(mainSetup) {
    mainSetup = mainSetup || {};

    const template = [
        {
            label: userMsg('MainMenu-file'),
            submenu: [
                FM.createMenuItemTemplate('MenuItem-revertFile'),
                FM.createMenuItemTemplate('MenuItem-closeFile'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-exit'),
            ],
        },
        {
            label: userMsg('MainMenu-edit'),
            submenu: [
                FM.createRoleMenuItemTemplate('undo'),
                FM.createRoleMenuItemTemplate('redo'),
                { type: 'separator' },
                FM.createRoleMenuItemTemplate('cut'),
                FM.createRoleMenuItemTemplate('copy'),
                FM.createRoleMenuItemTemplate('paste'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-copyTransaction'),
                FM.createMenuItemTemplate('MenuItem-pasteTransaction'),
            ],
        },
        {
            label: userMsg('MainMenu-account'),
            submenu: [
                FM.createMenuItemTemplate('MenuItem-openAccount'),
                FM.createMenuItemTemplate('MenuItem-closeAccount'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-reconcile'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-toggleShowHiddenAccounts', 
                    { type: 'checkbox' }),
                FM.createMenuItemTemplate('MenuItem-hideAccount'),
                FM.createMenuItemTemplate('MenuItem-showAccount', { visible: false }),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-moveAccountUp'),
                FM.createMenuItemTemplate('MenuItem-moveAccountDown'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-newAccount'),
                FM.createMenuItemTemplate('MenuItem-modifyAccount'),
                FM.createMenuItemTemplate('MenuItem-removeAccount'),
            ],
        },
        {
            label: userMsg('MainMenu-transaction'),
            submenu: [
                FM.createMenuItemTemplate('MenuItem-newTransaction'),
                FM.createMenuItemTemplate('MenuItem-copyTransaction'),
                FM.createMenuItemTemplate('MenuItem-pasteTransaction'),
                FM.createMenuItemTemplate('MenuItem-removeTransaction'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-findTransaction'),
            ],
        },
        {
            label: userMsg('MainMenu-securities'),
            submenu: [
                FM.createMenuItemTemplate('MenuItem-view_SECURITY'),
                FM.createMenuItemTemplate('MenuItem-downloadPrices'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-toggleShowAccounts_SECURITY', 
                    { type: 'checkbox' }),
                FM.createMenuItemTemplate('MenuItem-toggleShowQuantityZero_SECURITY', 
                    { type: 'checkbox' }),
                FM.createMenuItemTemplate('MenuItem-open_SECURITY'),
                FM.createMenuItemTemplate('MenuItem-close_SECURITY'),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-toggleShowHidden_SECURITY', 
                    { type: 'checkbox' }),
                FM.createMenuItemTemplate('MenuItem-hide_SECURITY'),
                FM.createMenuItemTemplate('MenuItem-show_SECURITY', { visible: false }),
                { type: 'separator' },
                FM.createMenuItemTemplate('MenuItem-new_SECURITY'),
                FM.createMenuItemTemplate('MenuItem-modify_SECURITY'),
                FM.createMenuItemTemplate('MenuItem-remove_SECURITY'),
            ],
        },
        {
            label: userMsg('MainMenu-report'),
            submenu: [
            ],
        },
        {
            label: userMsg('MainMenu-reminder'),
            submenu: [
            ],
        },
        {
            label: userMsg('MainMenu-view'),
            submenu: [
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ],
        },
        {
            label: userMsg('MainMenu-window'),
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
            ]
        },
    ];

    if (mainSetup.isDevMode) {
        template.push({
            label: userMsg('MainMenu-debug'),
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
            ]
        });
    }

    return template;
}


function addContextMenuTemplates(menuManager) {
    menuManager.addContextMenuTemplate('MasterAccountsEditor', [
        FM.createMenuItemTemplate('MenuItem-openAccount'),
        FM.createMenuItemTemplate('MenuItem-closeAccount'),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-reconcile'),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-toggleShowHiddenAccounts', 
            { type: 'checkbox' }),
        FM.createMenuItemTemplate('MenuItem-hideAccount'),
        FM.createMenuItemTemplate('MenuItem-showAccount', { visible: false }),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-moveAccountUp'),
        FM.createMenuItemTemplate('MenuItem-moveAccountDown'),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-newAccount'),
        FM.createMenuItemTemplate('MenuItem-modifyAccount'),
        FM.createMenuItemTemplate('MenuItem-removeAccount'),
    ]);

    menuManager.addContextMenuTemplate('MasterPricedItemsEditor_SECURITY', [
        FM.createMenuItemTemplate('MenuItem-view_SECURITY'),
        FM.createMenuItemTemplate('MenuItem-downloadPrices'),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-toggleShowAccounts_SECURITY', 
            { type: 'checkbox' }),
        FM.createMenuItemTemplate('MenuItem-toggleShowQuantityZero_SECURITY', 
            { type: 'checkbox' }),
        FM.createMenuItemTemplate('MenuItem-open_SECURITY'),
        FM.createMenuItemTemplate('MenuItem-close_SECURITY'),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-toggleShowHidden_SECURITY', 
            { type: 'checkbox' }),
        FM.createMenuItemTemplate('MenuItem-hide_SECURITY'),
        FM.createMenuItemTemplate('MenuItem-show_SECURITY', { visible: false }),
        { type: 'separator' },
        FM.createMenuItemTemplate('MenuItem-new_SECURITY'),
        FM.createMenuItemTemplate('MenuItem-modify_SECURITY'),
        FM.createMenuItemTemplate('MenuItem-remove_SECURITY'),
    ]);
}



export class MainWindow extends React.Component {
    constructor(props) {
        super(props);

        this.onCancel = this.onCancel.bind(this);
        this.onCloseTab = this.onCloseTab.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);
        
        this.onSelectAccount = this.onSelectAccount.bind(this);
        this.onOpenAccountRegister = this.onOpenAccountRegister.bind(this);

        this.state = {
            tabEntries: [
                {
                    tabId: 'masterAccountList',
                    tabType: 'AccountsList',
                    title: userMsg('MainWindow-masterAccountList_title'),
                }
            ],
        };
    }


    componentDidMount() {
        const { frameManager, mainSetup, onDidMount } = this.props;

        const mainMenuTemplate = getMainMenuTemplate(mainSetup);
        frameManager.setMainMenuTemplate(mainMenuTemplate);

        this._menuManager = frameManager.getMenuManager();

        if (onDidMount) {
            onDidMount();
        }
    }


    componentWillUnmount() {
        const { frameManager, onWillUnmount } = this.props;

        if (onWillUnmount) {
            onWillUnmount();
        }

        // frameManager.setMainMenuTemplate(undefined);

    }


    componentDidUpdate(prevProps, prevState) {
        const { state } = this;
        if (prevState.selectedAccountId !== state.selectedAccountId) {
            const wasAccount = prevState.selectedAccountId 
                && (prevState.selectedAccountId > 0);
            const isAccount = state.selectedAccountId
                && (state.selectedAccountId > 0);
            if (wasAccount !== isAccount) {
                // Update the enabled state of the account menu items
            }
        }
    }


    onCancel() {
        this.setState({
            errorMsg: undefined,
            modalState: undefined,
        });
    }


    onCloseTab(tabEntry) {

    }


    onActivateTab(tabEntry) {

    }


    onSelectAccount(accountId) {
        this.setState({
            selectedAccountId: accountId,
        });
    }


    onOpenAccountRegister(accountId) {

    }


    onRenderPage(tabEntry, isActive) {
        const { accessor } = this.props;
        switch (tabEntry.tabType) {
        case 'AccountsList':
            return <AccountsList
                accessor={accessor}
                onSelectAccount={this.onSelectAccount}
                onChooseAccount={this.onOpenAccountRegister}
            />;
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


    renderTabbedPages() {
        const { state } = this;
        return <TabbedPages
            tabEntries={state.tabEntries}
            activeTabId={state.activeTabId}
            onRenderPage={this.onRenderPage}
            onCloseTab={this.onCloseTab}
            onActiveTab={this.onActiveTab}
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
            return this.renderModal(modalState);
        }

        return this.renderTabbedPages();
    }
}

MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    mainSetup: PropTypes.object,
    onClose: PropTypes.func,
    onDidMount: PropTypes.func,
    onWillUnmount: PropTypes.func,
};
