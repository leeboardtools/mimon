// TEMP!!!
/* eslint-disable no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import * as Engine from '../engine/Engine';
import { getUserSetting, setUserSetting } from '../util/UserSettings';
//import { WIPAccounting } from '../tools/WIPAccounting';
import { userMsg } from '../util/UserMessages';
//import CreateNewAccountingFile from './CreateNewAccountingFile';
//import AccountingFileEditor from './AccountingFileEditor';
//import * as UIHelpers from './UIHelpers';
import { MenuManager } from '../util/MenuManagerRenderer';


const electron = require('electron');
const { app } = electron.remote;
const { ipcRenderer } = electron;

const process = require('process');
const path = require('path');


async function asyncGetStartupOptions() {
    return getUserSetting('startup', {});
}

async function asyncChangeStartupOptions(newOptions) {
    let options = await asyncGetStartupOptions();
    options = Object.assign(options, newOptions);
    await setUserSetting('startup', options);

    return options;
}



//
// ---------------------------------------------------------
//
function AppInitializing(props) {
    return (
        <div>
            <h2>...</h2>
        </div>
    );
}




//
// ---------------------------------------------------------
//
AppOpenScreen.propTypes = {
    mruPathNames: PropTypes.array,
    onNewClick: PropTypes.func.isRequired,
    onOpenClick: PropTypes.func.isRequired,
    onRecentClick: PropTypes.func.isRequired,
    onRemoveRecentClick: PropTypes.func.isRequired,
};

function AppOpenScreen(props) {
    let buttonClassName = 'btn btn-primary btn-lg btn-block';
    let mruComponent;
    if (props.mruPathNames && (props.mruPathNames.length > 0)) {
        const namesItem = props.mruPathNames.map((pathName) =>
            <div key={pathName} className="list-group-item list-group-item-action" 
                onClick={() => props.onRecentClick(pathName)}>
                <span>{pathName}</span>
                <button
                    type="button"
                    className="close ml-3"
                    data-dismiss="modal"
                    aria-label="Remove Path Name"
                    onClick={(event) => { 
                        props.onRemoveRecentClick(pathName); event.stopPropagation(); 
                    }}
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        );

        mruComponent = <React.Fragment>
            <div className="row justify-content-md-center">
                {<span>Previously on LBMiMon...</span>}
            </div>
            <div className="row justify-content-md-center">
                {<div className="list-group">{namesItem}</div>}
            </div>
            <div className="row justify-content-md-center">
                &nbsp;
            </div>
        </React.Fragment>;

        buttonClassName = 'btn btn-secondary btn-sm btn-block';
    }

    return (
        <div>
            <h2>LBMiMon</h2>
            <h4>LeeboardTools&apos; Personal Money Manager</h4>
            <div className="container">
                <div className="row">
                    <div className="col"> </div>
                    <div className="col-6">
                        {mruComponent}
                        <button className={buttonClassName}
                            onClick={props.onNewClick}>New...</button>
                        <button className={buttonClassName}
                            onClick={props.onOpenClick}>Open...</button>
                    </div>
                    <div className="col"> </div>
                </div>
            </div>
        </div>
    );
}

export function createMenuItemTemplate(id, options) {
    return Object.assign({
        id: id,
        idRenderer: id,
        label: userMsg(id),
    },
    options);
}

export function createRoleMenuItemTemplate(role) {
    return {
        idRenderer: 'MenuItem-' + role,
        role: role,
    };
}

function getMainMenuTemplate(mainSetup) {
    const template = [
        {
            label: userMsg('MainMenu-file'),
            submenu: [
                createMenuItemTemplate('MenuItem-revertFile'),
                createMenuItemTemplate('MenuItem-closeFile'),
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: userMsg('MainMenu-edit'),
            submenu: [
                createRoleMenuItemTemplate('undo'),
                createRoleMenuItemTemplate('redo'),
                { type: 'separator' },
                createRoleMenuItemTemplate('cut'),
                createRoleMenuItemTemplate('copy'),
                createRoleMenuItemTemplate('paste'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-copyTransaction'),
                createMenuItemTemplate('MenuItem-pasteTransaction'),
            ],
        },
        {
            label: userMsg('MainMenu-account'),
            submenu: [
                createMenuItemTemplate('MenuItem-openAccount'),
                createMenuItemTemplate('MenuItem-closeAccount'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-reconcile'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-toggleShowHiddenAccounts', 
                    { type: 'checkbox' }),
                createMenuItemTemplate('MenuItem-hideAccount'),
                createMenuItemTemplate('MenuItem-showAccount', { visible: false }),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-moveAccountUp'),
                createMenuItemTemplate('MenuItem-moveAccountDown'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-newAccount'),
                createMenuItemTemplate('MenuItem-modifyAccount'),
                createMenuItemTemplate('MenuItem-removeAccount'),
            ],
        },
        {
            label: userMsg('MainMenu-transaction'),
            submenu: [
                createMenuItemTemplate('MenuItem-newTransaction'),
                createMenuItemTemplate('MenuItem-copyTransaction'),
                createMenuItemTemplate('MenuItem-pasteTransaction'),
                createMenuItemTemplate('MenuItem-removeTransaction'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-findTransaction'),
            ],
        },
        {
            label: userMsg('MainMenu-securities'),
            submenu: [
                createMenuItemTemplate('MenuItem-view_SECURITY'),
                createMenuItemTemplate('MenuItem-downloadPrices'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-toggleShowAccounts_SECURITY', 
                    { type: 'checkbox' }),
                createMenuItemTemplate('MenuItem-toggleShowQuantityZero_SECURITY', 
                    { type: 'checkbox' }),
                createMenuItemTemplate('MenuItem-open_SECURITY'),
                createMenuItemTemplate('MenuItem-close_SECURITY'),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-toggleShowHidden_SECURITY', 
                    { type: 'checkbox' }),
                createMenuItemTemplate('MenuItem-hide_SECURITY'),
                createMenuItemTemplate('MenuItem-show_SECURITY', { visible: false }),
                { type: 'separator' },
                createMenuItemTemplate('MenuItem-new_SECURITY'),
                createMenuItemTemplate('MenuItem-modify_SECURITY'),
                createMenuItemTemplate('MenuItem-remove_SECURITY'),
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
        createMenuItemTemplate('MenuItem-openAccount'),
        createMenuItemTemplate('MenuItem-closeAccount'),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-reconcile'),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-toggleShowHiddenAccounts', { type: 'checkbox' }),
        createMenuItemTemplate('MenuItem-hideAccount'),
        createMenuItemTemplate('MenuItem-showAccount', { visible: false }),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-moveAccountUp'),
        createMenuItemTemplate('MenuItem-moveAccountDown'),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-newAccount'),
        createMenuItemTemplate('MenuItem-modifyAccount'),
        createMenuItemTemplate('MenuItem-removeAccount'),
    ]);

    menuManager.addContextMenuTemplate('MasterPricedItemsEditor_SECURITY', [
        createMenuItemTemplate('MenuItem-view_SECURITY'),
        createMenuItemTemplate('MenuItem-downloadPrices'),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-toggleShowAccounts_SECURITY', 
            { type: 'checkbox' }),
        createMenuItemTemplate('MenuItem-toggleShowQuantityZero_SECURITY', 
            { type: 'checkbox' }),
        createMenuItemTemplate('MenuItem-open_SECURITY'),
        createMenuItemTemplate('MenuItem-close_SECURITY'),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-toggleShowHidden_SECURITY', 
            { type: 'checkbox' }),
        createMenuItemTemplate('MenuItem-hide_SECURITY'),
        createMenuItemTemplate('MenuItem-show_SECURITY', { visible: false }),
        { type: 'separator' },
        createMenuItemTemplate('MenuItem-new_SECURITY'),
        createMenuItemTemplate('MenuItem-modify_SECURITY'),
        createMenuItemTemplate('MenuItem-remove_SECURITY'),
    ]);
}



//
// ---------------------------------------------------------
//

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            appState: 'initializing',
            accountingFile: undefined,
            menuManager: new MenuManager(),
        };

        this.onNewClick = this.onNewClick.bind(this);
        this.onOpenClick = this.onOpenClick.bind(this);
        this.onRecentClick = this.onRecentClick.bind(this);
        this.onRemoveRecentClick = this.onRemoveRecentClick.bind(this);

        process.nextTick(async () => { this.asyncInitialize(); });
    }


    async asyncInitialize() {
        // mainSetup is stuff like 'isDevMode'
        const mainSetup = ipcRenderer.sendSync('sync-get-main-setup');
        this.setState({ mainSetup: mainSetup, });

        const settingsPathName = path.join(app.getPath('appData'), 
            app.name, 'user.json');
        await Engine.initializeEngine(settingsPathName);

        // await UIHelpers.setup();

        /*
        this._mainMenuTemplate = getMainMenuTemplate(this.state.mainSetup);
        this.state.menuManager.setMenuTemplate(this._mainMenuTemplate);

        addContextMenuTemplates(this.state.menuManager);
        */

        await this.asyncPostEngineInitialized();
    }


    async asyncPostEngineInitialized() {
        const startupOptions = await asyncGetStartupOptions();

        if (startupOptions.mruPathNames) {
            // Do something
        }

        // TEST!!!
        startupOptions.mruPathNames = [
            'Abc',
            '/home/me/Def',
        ];

        if (startupOptions.autoOpen) {
            if (startupOptions.mruPathNames && (startupOptions.mruPathNames.length > 0)) {
                const wasSilenced = this._isSilenced;
                try {
                    this._isSilenced = true;
                    if (await this.asyncOpenAccountingFile(
                        startupOptions.mruPathNames[0])) {
                        return;
                    }
                }
                finally {
                    this._isSilenced = wasSilenced;
                }
            }
        }

        this.setState({
            appState: 'openingScreen',
            mruPathNames: startupOptions.mruPathNames,
        });
    }


    componentDidMount() {
    }


    componentWillUnmount() {
        if (this._mainMenuTemplate) {
            this.state.menuManager.setMenuTemplate(undefined);
        }
    }


    reportError(key, err) {
        const msg = userMsg(key, err);
        console.log(msg);
        // eslint-disable-next-line no-undef
        alert(msg);
        return msg;
    }


    onNewClick() {
        console.log('onNewClick');
    }
    onOpenClick() {
        console.log('onOpenClick');
    }
    onRecentClick(pathName) {
        console.log('onRecentClick: ' + pathName);
    }
    onRemoveRecentClick(pathName) {
        console.log('onRemoveRecentClick: ' + pathName);
    }


    render() {
        let mainComponent;
        const { appState, mruPathNames } = this.state;
        switch (appState) {
        case 'openingScreen' :
            mainComponent = <AppOpenScreen
                mruPathNames = {mruPathNames}
                onNewClick = {this.onNewClick}
                onOpenClick = {this.onOpenClick}
                onRecentClick = {this.onRecentClick}
                onRemoveRecentClick = {this.onRemoveRecentClick}
            />;
            break;
        
        default :
            mainComponent = <div>
                <div>I am the React App</div>
                <div className="alert alert-primary">
                    This is Bootstrap
                </div>
            </div>
            ;
            break;
        }

        return <div className="container-fluid">
            {mainComponent}
        </div>;
    }
}