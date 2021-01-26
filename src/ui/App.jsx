import React from 'react';
import PropTypes from 'prop-types';
import * as Engine from '../engine/Engine';
import { asyncGetUserSetting, asyncSetUserSetting } from '../util/UserSettings';
import { userMsg } from '../util/UserMessages';
import { EngineAccessor } from '../tools/EngineAccess';
import { FileCreator } from './FileCreator';
import * as FM from '../util/FrameManager';
import { MainWindow } from './MainWindow';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { asyncFileOrDirExists, asyncDirExists, } 
    from '../util/Files';
import { FileSelector } from '../util-ui/FileSelector';
import deepEqual from 'deep-equal';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { FileImporter } from '../tools/FileImporter';
import { ProgressReporter } from '../util-ui/ProgressReporter';
import * as path from 'path';
import * as electron from 'electron';
import * as process from 'process';
import { InfoReporter } from '../util-ui/InfoReporter';

const { app } = electron.remote;
const { ipcRenderer } = electron;



async function asyncGetStartupOptions() {
    return asyncGetUserSetting('startup', {});
}

async function asyncChangeStartupOptions(newOptions) {
    let options = await asyncGetStartupOptions();
    options = Object.assign(options, newOptions);
    await asyncSetUserSetting('startup', options);

    return options;
}



/**
 * The opening screen component.
 * @private
 */
class AppOpenScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
        };

        this.updateMRUList();
    }


    updateMRUList() {
        process.nextTick(async () => {
            const validPathNames = [];
            const { mruPathNames } = this.props;
            if (mruPathNames) {
                for (let i = 0; i < mruPathNames.length; ++i) {
                    const pathName = mruPathNames[i];
                    if (await asyncFileOrDirExists(pathName)) {
                        validPathNames.push(pathName);
                    }
                }
            }

            this.setState({
                validPathNames: validPathNames,
            });
        });
    }


    componentDidUpdate(prevProps) {
        const oldMRUPathNames = prevProps.mruPathNames || [];
        const newMRUPathNames = this.props.mruPathNames || [];
        if (!deepEqual(oldMRUPathNames, newMRUPathNames)) {
            this.updateMRUList();
        }
    }


    render() {
        const { props } = this;
        let buttonClassName = 'btn btn-outline-primary btn-md btn-block';
        let mruComponent;
        let importButton;
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

            mruComponent = <div className="mb-4">
                <div className="row justify-content-md-center mb-2">
                    <span>{userMsg('AppOpeningScreen-mru_title')}</span>
                </div>
                <div className="row justify-content-md-center">
                    {namesItem}
                </div>
                <div className="row justify-content-md-center">
                    &nbsp;
                </div>
            </div>;

            buttonClassName = 'btn btn-outline-secondary btn-sm btn-block';
        }

        const { onImportClick } = props;
        if (onImportClick) {
            importButton = <button className={buttonClassName}
                onClick={onImportClick}
                aria-label="Import File">
                {userMsg('AppOpeningScreen-import_file')}
            </button>;
        }

        return (
            <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
                <div className="mb-4 mt-4">
                    <h2 className="text-center">
                        {userMsg('AppOpeningScreen-title_main')}
                    </h2>
                    <h4 className="text-center">
                        {userMsg('AppOpeningScreen-title_secondary')}
                    </h4>
                    <h5 className="text-center">
                        {userMsg('AppOpeningScreen-title_from')}
                    </h5>
                </div>
                <div className="container">
                    <div className="row">
                        <div className="col"> </div>
                        <div className="col-8">
                            {mruComponent}
                            <button className={buttonClassName}
                                onClick={props.onNewClick}
                                aria-label="New File">
                                {userMsg('AppOpeningScreen-new_file')}
                            </button>
                            <button className={buttonClassName}
                                onClick={props.onOpenClick}
                                aria-label="Open File">
                                {userMsg('AppOpeningScreen-open_file')}
                            </button>
                            {importButton}
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
    onImportClick: PropTypes.func,
    onRecentClick: PropTypes.func.isRequired,
    onRemoveRecentClick: PropTypes.func.isRequired,
    onExitClick: PropTypes.func.isRequired,
};

/**
 * The main application component.
 * @class
 * @name App
 */
export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            appState: 'initializing',
        };

        this.onNewClick = this.onNewClick.bind(this);
        this.onOpenClick = this.onOpenClick.bind(this);
        this.onImportClick = this.onImportClick.bind(this);
        this.onRecentClick = this.onRecentClick.bind(this);
        this.onRemoveRecentClick = this.onRemoveRecentClick.bind(this);

        this.onFileCreated = this.onFileCreated.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onOpenFile = this.onOpenFile.bind(this);
        this.onFilterOpenFile = this.onFilterOpenFile.bind(this);
        this.onOpenFileDirSelect = this.onOpenFileDirSelect.bind(this);

        this.onImportFile = this.onImportFile.bind(this);
        this.onFilterImportFile = this.onFilterImportFile.bind(this);
        this.onImportFileDirSelect = this.onImportFileDirSelect.bind(this);
        this.onImportFileFileSelect = this.onImportFileFileSelect.bind(this);

        this.onImportProjectCreateFile = this.onImportProjectCreateFile.bind(this);

        this.statusCallback = this.statusCallback.bind(this);

        this.onStatusCancel = this.onStatusCancel.bind(this);
        this.onConfirmStatusCancelButton = this.onConfirmStatusCancelButton.bind(this);

        this.onRevertFile = this.onRevertFile.bind(this);
        this.onCloseFile = this.onCloseFile.bind(this);
        this.onExit = this.onExit.bind(this);

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
                        startupOptions.mruPathNames[0],
                        {
                            clearActions: true,
                        })) {
                        return;
                    }
                }
                finally {
                    this._isSilenced = wasSilenced;
                }
            }
        }

        let currentDir = startupOptions.currentDir;
        if (!currentDir || !asyncDirExists(currentDir)) {
            currentDir = app.getPath('documents');
        }

        this._fileImporter = new FileImporter(this._accessor);

        this.setState({
            appState: 'openingScreen',
            mruPathNames: startupOptions.mruPathNames,
            currentDir: currentDir,
            fileFactoryIndex: 0,
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

    setModalRenderer(renderer) {
        this.setState({
            modalRenderer: renderer,
        });
    }


    enterMainWindow() {
        process.nextTick(async () => {
            const pathName = this._accessor.getAccountingFilePathName();
            const mruPathNames = await this.addToMRU(pathName);

            let currentDir = path.parse(pathName).dir;
            if (currentDir !== this.state.currentDir) {
                await asyncChangeStartupOptions({ currentDir: currentDir });
            }

            this.setState({
                mruPathNames: mruPathNames,
                appState: 'mainWindow',
                currentDir: currentDir,
            });
        });
    }


    exitMainWindow() {
        process.nextTick(async () => {
            const pathName = this._accessor.getAccountingFilePathName();
            try {
                if (pathName) {
                    await this._accessor.asyncCloseAccountingFile();
                }
                this.onCancel();
            }
            catch (e) {
                this.setState({
                    errorMsg: userMsg('App-close_failed', pathName, e.toString()),
                });
            }
        });
    }


    closeFile(postClose, noButtonLabel) {
        process.nextTick(async () => {
            let retry = true;
            while (retry) {
                retry = false;
                try {
                    if (this._accessor.isAccountingFileModified()) {
                        await this._accessor.asyncWriteAccountingFile();
                    }
                    postClose();
                }
                catch (e) {
                    const name = path.parse(
                        this._accessor.getAccountingFilePathName()).base;
                    const msg = userMsg('App-save_Failed-msg', name, e.toString());
                    const buttons = [
                        { id: 'yes', label: userMsg('App-save_retry_button'), },
                        { id: 'no', label: noButtonLabel, },
                        { id: 'cancel', label: userMsg('cancel'), },
                    ];

                    // FIX ME!!!
                    // The retry in this loop will not work, it's async!
                    this.setModalRenderer(() => {
                        return <QuestionPrompter
                            title={userMsg('App-save_failed_title')}
                            message={msg}
                            buttons={buttons}
                            onButton={(id) => {
                                switch (id) {
                                case 'yes' :
                                    retry = true;
                                    break;

                                case 'no' :
                                    this.setModalRenderer();
                                    postClose();
                                    break;

                                case 'cancel' :
                                    this.setModalRenderer();
                                    break;
                                }
                            }}
                        />;
                    });
                }
            }
        });
    }


    onCloseFile() {
        this.closeFile(() => { this.exitMainWindow(); }, 
            userMsg('App-save_ignore_button'));
    }

    onExit() {
        this.closeFile(() => { app.exit(); }, 
            userMsg('App-save_exit_button'));
    }


    revertFile() {
        process.nextTick(async () => {
            const pathName = this._accessor.getAccountingFilePathName();
            const fileFactoryIndex = this._accessor.getAccountingFileFactoryIndex();
            try {
                await this._accessor.asyncCloseAccountingFile();
            }
            catch (e) {
                this.setState({
                    errorMsg: userMsg('App-close_failed', pathName, e.toString()),
                });
                return;
            }

            try {
                await this._accessor.asyncOpenAccountingFile(pathName, {
                    fileFactoryIndex: fileFactoryIndex,
                    clearActions: true,
                });
                this.enterMainWindow();
            }
            catch (e) {
                this.setState({
                    errorMsg: userMsg('App-open_failed', pathName, e.toString()),
                });
            }
        });
    }


    onRevertFile() {
        if (this._accessor.isAccountingFileModified()) {
            this.setModalRenderer(() => {
                const name = path.parse(
                    this._accessor.getAccountingFilePathName()).base;
                return <QuestionPrompter
                    title={userMsg('App-confirm_revert_title', name)}
                    message={userMsg('App-confirm_revert_msg', name)}
                    buttons={StandardButton.YES_CANCEL}
                    onButton={(id) => {
                        switch (id) {
                        case 'yes' :
                            this.revertFile();
                            break;

                        case 'cancel' :
                            this.setModalRenderer();
                            break;
                        }
                    }}
                />;
            });
        }
    }


    onFileCreated() {
        this.enterMainWindow();
    }

    onCancel() {
        this.setState({
            appState: 'openingScreen',
            errorMsg: undefined,
            importPathName: undefined,
        });
    }


    onNewClick() {
        this.setState({
            appState: 'newFile',
            errorMsg: undefined,
        });
    }


    onFilterOpenFile(dirEnt, currentDirPath) {
        if (!dirEnt.isDirectory()) {
            return false;
        }
        
        return true;
    }

    onOpenFileDirSelect(dir) {
        process.nextTick(async () => {
            const isPossibleFile = await this._accessor.asyncIsPossibleAccountingFile(
                dir, this.state.fileFactoryIndex
            );
            this.setState({
                isOpenFileEnabled: isPossibleFile,
            });
        });
    }

    onOpenFile(pathName) {
        process.nextTick(async () => {
            try {
                await this._accessor.asyncOpenAccountingFile(pathName, {
                    fileFactoryIndex: this.state.fileFactoryIndex,
                    clearActions: true,
                });
                this.enterMainWindow();
            }
            catch (e) {
                this.setState({
                    errorMsg: userMsg('App-open_failed', pathName, e.toString()),
                });
            }
        });
    }


    onOpenClick() {
        this.setState({
            appState: 'openFile',
            errorMsg: undefined,
        });
    }


    onFilterImportFile(dirEnt, currentDirPath) {
        if (dirEnt.isDirectory()) {
            return true;
        }
        return this._fileImporter.isFileNamePossibleImport(dirEnt.name);
    }

    onImportFileDirSelect(pathName) {
        this.setState({
            isImportFileEnabled: this._fileImporter.isDirNamePossibleImport(pathName),
        });
    }

    onImportFileFileSelect(pathName) {
        this.setState({
            isImportFileEnabled: this._fileImporter.isFileNamePossibleImport(pathName),
        });
    }

    onImportFile(importPathName) {
        this.setState({
            appState: 'importFileNewFile',
            importPathName: importPathName,
        });
    }

    onImportClick() {
        this.setState({
            appState: 'importFile',
            errorMsg: undefined,
        });
    }

    onImportProjectCreateFile({ pathName: projectPathName, newFileContents, options, }) {
        process.nextTick(async () => {
            const { importPathName } = this.state;
            try {
                this.setState({
                    appState: 'status',
                    isCancelled: false,
                    statusTitle: userMsg('App-importingStatus_title',
                        importPathName),
                    statusConfirmCancelMessage: userMsg('App-confirm_import_cancel',
                        importPathName),
                });

                const importArgs = Object.assign({}, options, {
                    pathNameToImport: importPathName, 
                    newProjectPathName: projectPathName, 
                    newFileContents: newFileContents,
                    statusCallback: this.statusCallback,
                });
                const warnings = await this._fileImporter.asyncImportFile(
                    importArgs
                );

                if (warnings && warnings.length) {
                    this.setState({
                        appState: 'importWarnings',
                        importWarningsTitle: userMsg(
                            'App-importWarnings_title',
                            importPathName,
                        ),
                        importWarnings: warnings,
                    });
                }
                else {
                    this.enterMainWindow();
                }

            }
            catch (e) {
                // asyncImportFile() populates the error message...
                this.setState({
                    errorMsg: e.toString(),
                    isCancelled: false,
                });
            }
        });
    }


    statusCallback(progress) {
        if (!this.state.isCancelled) {
            this.setState((state) => {
                return {
                    statusProgress: progress,
                };
            });
        }
        return this.state.isCancelled;
    }


    onStatusCancel() {
        this.setState({
            appState: 'statusConfirmCancel',
        });
    }


    onConfirmStatusCancelButton(buttonId) {
        switch (buttonId) {
        case 'yes':
            this.setState({
                appState: 'status',
                statusProgress: userMsg('App-cancelling_import'), 
                isCancelled: true,
            });
            break;
        
        default :
            this.setState({
                appState: 'status',
            });
            break;
        }
    }


    onRecentClick(pathName) {
        process.nextTick(async () => {
            try {
                await this._accessor.asyncOpenAccountingFile(pathName, {
                    clearActions: true,
                });
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


    render() {
        let mainComponent;
        const { appState, mruPathNames, errorMsg, currentDir,
            isOpenFileEnabled, isImportFileEnabled, modalRenderer } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }

        if (modalRenderer) {
            return modalRenderer();
        }

        switch (appState) {
        case 'openingScreen' :
            return <AppOpenScreen
                mruPathNames = {mruPathNames}
                onNewClick = {this.onNewClick}
                onOpenClick = {this.onOpenClick}
                onImportClick = {this.onImportClick}
                onRecentClick = {this.onRecentClick}
                onRemoveRecentClick = {this.onRemoveRecentClick}
                onExitClick = {this.onExit}
            />;
        
        case 'newFile': 
            return <FileCreator
                accessor = {this._accessor}
                mainSetup = {this.state.mainSetup}
                frameManager = {this._frameManager}
                onFileCreated = {this.onFileCreated}
                onCancel = {this.onCancel}
                initialDir = {currentDir}
            />;
        
        case 'openFile' :
            return <FileSelector
                title = {userMsg('App-open_file_title')}
                initialDir = {currentDir}
                onOK = {this.onOpenFile}
                onCancel = {this.onCancel}
                onFilterDirEnt = {this.onFilterOpenFile}
                onDirSelect = {this.onOpenFileDirSelect}
                okButtonText = {userMsg('FileSelector-open')}
                isOKDisabled = {!isOpenFileEnabled}
            />;
        
        case 'importFile' :
            return <FileSelector
                title = {userMsg('App-import_file_title')}
                initialDir = {currentDir}
                onOK = {this.onImportFile}
                onCancel = {this.onCancel}
                onFilterDirEnt = {this.onFilterImportFile}
                onDirSelect = {this.onImportFileDirSelect}
                onFileSelect = {this.onImportFileFileSelect}
                okButtonText = {userMsg('App-importButton')}
                isOKDisabled = {!isImportFileEnabled}
            />;

        case 'importFileNewFile' :
            return <FileCreator
                accessor = {this._accessor}
                mainSetup = {this.state.mainSetup}
                isImport = {true}
                frameManager = {this._frameManager}
                onCreateFile = {this.onImportProjectCreateFile}
                onCancel = {this.onCancel}
                initialDir = {currentDir}
            />;
        
        case 'importWarnings' :
            return <InfoReporter
                title = {this.state.importWarningsTitle}
                message = {this.state.importWarnings}
                onClose = {() => this.enterMainWindow()}
            />;
        
        case 'status' :
        {
            let onCancel;
            if (this.state.statusConfirmCancelMessage) {
                onCancel = this.onStatusCancel;
            }
            return <ProgressReporter 
                title = {this.state.statusTitle}
                progress = {this.state.statusProgress}
                onCancel = {onCancel}
                cancelDisabled = {this.state.isCancelled}
            />;
        }
        
        case 'statusConfirmCancel' :
            return <QuestionPrompter
                message = {this.state.statusConfirmCancelMessage}
                onButton = {this.onConfirmStatusCancelButton}
                buttons = {StandardButton.YES_NO}
            />;
        
        case 'mainWindow' :
            return <MainWindow
                accessor = {this._accessor}
                mainSetup = {this.state.mainSetup}
                onClose = {this.onCancel}
                onRevertFile={this.onRevertFile}
                onCloseFile={this.onCloseFile}
                onExit={this.onExit}
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

/**
 * @typedef {object}    App~MainSetup
 * @property {boolean}  [isDevMode] <code>true</code> if in developer mode.
 */
