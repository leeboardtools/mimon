// TEMP!!!
/* eslint-disable no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import * as FM from '../util/FrameManager';
import { userMsg } from '../util/UserMessages';
import { AccountsList } from './AccountsList';
import { TabbedPages } from '../util-ui/TabbedPages';


function getMainMenuTemplate(mainSetup) {
    const template = [
        {
            label: userMsg('MainMenu-file'),
            submenu: [
                FM.createMenuItemTemplate('MenuItem-revertFile'),
                FM.createMenuItemTemplate('MenuItem-closeFile'),
                { type: 'separator' },
                { role: 'quit' },
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

        this.onCloseTab = this.onCloseTab.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);
        
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


    onCloseTab(tabEntry) {

    }


    onActivateTab(tabEntry) {

    }


    onOpenAccountRegister(accountDataItem) {

    }


    onRenderPage(tabEntry, isActive) {
        const { accessor } = this.props;
        switch (tabEntry.tabType) {
        case 'AccountsList':
            return <AccountsList
                accessor={accessor}
                onChooseAccount={this.onOpenAccountRegister}
            />;
        }
    }


    render() {
        const { state } = this;
        return <TabbedPages
            tabEntries={state.tabEntries}
            activeTabId={state.activeTabId}
            onRenderPage={this.onRenderPage}
            onCloseTab={this.onCloseTab}
            onActiveTab={this.onActiveTab}
        />;
    }
}

MainWindow.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
};
