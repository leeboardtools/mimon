import React from 'react';
import PropTypes from 'prop-types';
import * as Engine from '../engine/Engine';
import { getUserSetting, setUserSetting } from '../util/UserSettings';
import { userMsg } from '../util/UserMessages';
import { EngineAccessor } from '../tools/EngineAccess';
import { FileCreator } from './FileCreator';
import * as FM from '../util/FrameManager';
import { MainWindow } from './MainWindow';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { fileOrDirExists } from '../util/Files';


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
class AppOpenScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        };

        process.nextTick(async () => {
            const validPathNames = [];
            const { mruPathNames } = props;
            for (let i = 0; i < mruPathNames.length; ++i) {
                const pathName = mruPathNames[i];
                if (await fileOrDirExists(pathName)) {
                    validPathNames.push(pathName);
                }
            }

            this.setState({
                validPathNames: validPathNames,
            });
        });
    }

    render() {
        const { props } = this;
        let buttonClassName = 'btn btn-outline-primary btn-md btn-block';
        let mruComponent;
        const { validPathNames } = this.state;
        if (validPathNames && (validPathNames.length > 0)) {
            const className = buttonClassName;
            const namesItem = validPathNames.map((pathName) =>
                <div key={pathName} 
                    className= {className}
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
                    {namesItem}
                </div>
                <div className="row justify-content-md-center">
                    &nbsp;
                </div>
            </React.Fragment>;

            buttonClassName = 'btn btn-outline-secondary btn-sm btn-block';
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
}

AppOpenScreen.propTypes = {
    mruPathNames: PropTypes.array,
    onNewClick: PropTypes.func.isRequired,
    onOpenClick: PropTypes.func.isRequired,
    onRecentClick: PropTypes.func.isRequired,
    onRemoveRecentClick: PropTypes.func.isRequired,
    onExitClick: PropTypes.func.isRequired,
};

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

        this.onFileCreated = this.onFileCreated.bind(this);
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


    async addToMRU(pathName) {
        const startupOptions = await asyncGetStartupOptions();
        let mruPathNames = startupOptions.mruPathNames;
        const { maxMRUCount } = startupOptions;

        mruPathNames = (mruPathNames) ? Array.from(mruPathNames) : [];
        const index = mruPathNames.indexOf(pathName);
        if (index >= 0) {
            mruPathNames.splice(index, 1);
        }
        mruPathNames.splice(0, 0, pathName);

        if (maxMRUCount && (maxMRUCount > 0)) {
            if (mruPathNames.length > maxMRUCount) {
                mruPathNames.length = maxMRUCount;
            }
        }

        await asyncChangeStartupOptions({ mruPathNames: mruPathNames });
        return mruPathNames;
    }

    async removeFromMRU(pathName) {
        const startupOptions = await asyncGetStartupOptions();
        const mruPathNames = startupOptions.mruPathNames;

        if (mruPathNames) {
            const index = mruPathNames.indexOf(pathName);
            if (index >= 0) {
                mruPathNames.splice(index, 1);
            }
            await asyncChangeStartupOptions({ mruPathNames: mruPathNames });
        }

        return mruPathNames;
    }


    enterMainWindow() {
        process.nextTick(async () => {
            const pathName = this._accessor.getAccountingFilePathName();
            const mruPathNames = await this.addToMRU(pathName);

            this.setState({
                mruPathNames: mruPathNames,
                appState: 'mainWindow',
            });    
        });
    }

    onFileCreated() {
        this.enterMainWindow();
    }

    onCancel() {
        this.setState({
            appState: 'openingScreen',
            errorMsg: undefined,
        });
    }


    onNewClick() {
        this.setState({
            appState: 'newFile',
            errorMsg: undefined,
        });
    }

    onOpenClick() {
        console.log('onOpenClick');
    }

    onRecentClick(pathName) {
        process.nextTick(async () => {
            try {
                await this._accessor.asyncOpenAccountingFile(pathName);
                this.enterMainWindow();
            }
            catch (e) {
                this.setState({
                    errorMsg: userMsg('App-mru_open_failed', pathName, e.toString()),
                });
            }
        });
    }

    onRemoveRecentClick(pathName) {
        process.nextTick(async () => {
            const mruPathNames = await this.removeFromMRU(pathName);
            this.setState({ mruPathNames: mruPathNames });
        });
    }

    onExitClick() {
        app.quit();
    }


    render() {
        let mainComponent;
        const { appState, mruPathNames, errorMsg } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }

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
                onFileCreated = {this.onFileCreated}
                onCancel = {this.onCancel}
            />;
        
        case 'mainWindow' :
            return <MainWindow
                accessor = {this._accessor}
                frameManager = { this._frameManager}
            />;
        
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