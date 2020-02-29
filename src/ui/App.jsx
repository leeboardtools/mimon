// TEMP!!!
/* eslint-disable no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import * as Engine from '../engine/Engine';
import { getUserSetting, setUserSetting } from '../util/UserSettings';
import { userMsg } from '../util/UserMessages';
import { EngineAccessor } from '../tools/EngineAccess';
import { FileCreator } from './FileCreator';
import { MenuManager } from '../util/MenuManagerRenderer';
import * as FM from '../util/FrameManager';


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
    onExitClick: PropTypes.func.isRequired,
};

function AppOpenScreen(props) {
    let buttonClassName = 'btn btn-primary btn-md btn-block';
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
                {<span>{userMsg('AppOpeningScreen-mru_title')}</span>}
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
        <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
            <div className="mb-4">
                <h2 className="text-center">LBMiMon</h2>
                <h4 className="text-center">A Personal Money Manager</h4>
                <h5 className="text-center">From Leeboard Tools</h5>
            </div>
            <div className="container">
                <div className="row">
                    <div className="col"> </div>
                    <div className="col-8">
                        {mruComponent}
                        <button className={buttonClassName}
                            onClick={props.onNewClick}
                            aria-label="New File">
                            {userMsg('AppOpeningScreen-new_file')}</button>
                        <button className={buttonClassName}
                            onClick={props.onOpenClick}
                            aria-label="Open File">
                            {userMsg('AppOpeningScreen-open_file')}</button>
                    </div>
                    <div className="col"> </div>
                </div>
            </div>
            <div className="container mt-auto">
                <div className="row">
                    <div className="col"></div>
                    <div className="col">
                        <button className="btn btn-secondary btn-sm btn-block mb-4"
                            onClick={props.onExitClick}
                            aria-label="Exit">
                            {userMsg('AppOpeningScreen-exit')}</button>
                    </div>
                    <div className="col"></div>
                </div>
            </div>
        </div>
    );
}

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



//
// ---------------------------------------------------------
//

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            appState: 'initializing',
        };

        this.onNewClick = this.onNewClick.bind(this);
        this.onOpenClick = this.onOpenClick.bind(this);
        this.onRecentClick = this.onRecentClick.bind(this);
        this.onRemoveRecentClick = this.onRemoveRecentClick.bind(this);
        this.onExitClick = this.onExitClick.bind(this);

        this.onCreateFile = this.onCreateFile.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this._accessor = new EngineAccessor();
        this._frameManager = new FM.FrameManager();

        process.nextTick(async () => { this.asyncInitialize(); });
    }


    async asyncInitialize() {
        // mainSetup is stuff like 'isDevMode'
        const mainSetup = ipcRenderer.sendSync('sync-get-main-setup');
        this.setState({ mainSetup: mainSetup, });

        const settingsPathName = path.join(app.getPath('appData'), 
            app.name, 'user.json');

        await Engine.initializeEngine(settingsPathName, app.getAppPath());

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
    }


    reportError(key, err) {
        const msg = userMsg(key, err);
        console.log(msg);
        // eslint-disable-next-line no-undef
        alert(msg);
        return msg;
    }


    onCreateFile(fileName, fileFactoryIndex, fileContents) {
        alert('Creating: ' + fileName);
    }

    onCancel() {
        this.setState({
            appState: 'openingScreen'
        });
    }


    onNewClick() {
        this.setState({
            appState: 'newFile',
        });
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
    onExitClick() {
        app.quit();
    }


    render() {
        let mainComponent;
        const { appState, mruPathNames } = this.state;
        switch (appState) {
        case 'openingScreen' :
            return <AppOpenScreen
                mruPathNames = {mruPathNames}
                onNewClick = {this.onNewClick}
                onOpenClick = {this.onOpenClick}
                onRecentClick = {this.onRecentClick}
                onRemoveRecentClick = {this.onRemoveRecentClick}
                onExitClick = {this.onExitClick}
            />;
        
        case 'newFile': 
            return <FileCreator
                accessor = {this._accessor}
                frameManager = {this._frameManager}
                onCreate = {this.onCreateFile}
                onCancel = {this.onCancel}
            />;
            //break;
        
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