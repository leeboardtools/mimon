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
import { FileSelector, setNetworkPaths } from '../util-ui/FileSelector';
import deepEqual from 'deep-equal';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { FileImporter } from '../tools/FileImporter';
import { ProgressReporter } from '../util-ui/ProgressReporter';
import * as path from 'path';
import { ipcRenderer } from 'electron';
import * as process from 'process';
import { InfoReporter } from '../util-ui/InfoReporter';
import { RowColContainer, Row, Col } from '../util-ui/RowCols';
import { CloseButton } from '../util-ui/CloseButton';
import { Button } from '../util-ui/Button';


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
        let buttonClassName = 'Btn Btn-outline-primary Btn-block';
        let mruComponent;
        let importButton;
        const { validPathNames } = this.state;
        if (validPathNames && (validPathNames.length > 0)) {
            const className = buttonClassName;
            const namesItem = validPathNames.map((pathName) =>
                <div key={pathName} 
                    className = {className}
                    onClick={() => props.onRecentClick(pathName)}>
                    <span>{pathName}</span>
                    <CloseButton
                        classExtras = "Ml-3"
                        ariaLabel = "Remove Path Name"
                        onClick = {(event) => { 
                            props.onRemoveRecentClick(pathName); event.stopPropagation(); 
                        }}
                    />
                </div>
            );

            mruComponent = <div className="Mb-4">
                <Row classExtras = "Row-justify-content-center Mb-2">
                    <span>{userMsg('AppOpeningScreen-mru_title')}</span>
                </Row>
                <Row classExtras = "Row-justify-content-center">
                    {namesItem}
                </Row>
                <Row classExtras = "Row-justify-content-center">
                    &nbsp;
                </Row>
            </div>;

            buttonClassName = 'Btn-outline-secondary Btn-sm Btn-block';
        }

        const { onImportClick } = props;
        if (onImportClick) {
            importButton = <Button classExtras = {buttonClassName}
                onClick={onImportClick}
                ariaLabel="Import File">
                {userMsg('AppOpeningScreen-import_file')}
            </Button>;
        }

        let forceReloadComponent;
        if (props.onForceReload) {
            forceReloadComponent = <Row>
                <Col>
                    <Button 
                        classExtras = {'Btn-secondary Btn-sm Btn-block Mb-4'
                            + ' AppOpeningScreen-force_reload'}
                        onClick={props.onForceReload}
                        aria-label="Force Reload">
                        {userMsg('AppOpeningScreen-force_reload')}
                    </Button>
                </Col>
            </Row>;
        }

        return (
            <div className="FlexC W-100 H-100 P-1 Mx-auto FlexC-column">
                <div className="Mb-4 Mt-4">
                    <h2 className="Text-center App-title">
                        {userMsg('AppOpeningScreen-title_main')}
                    </h2>
                    <h4 className="Text-center">
                        {userMsg('AppOpeningScreen-title_secondary')}
                    </h4>
                    <h5 className="Text-center">
                        {userMsg('AppOpeningScreen-title_from')}
                    </h5>
                </div>
                <RowColContainer>
                    <Row>
                        <Col/>
                        <Col classExtras = "Col-8">
                            {mruComponent}
                            <Button classExtras = {buttonClassName}
                                onClick={props.onNewClick}
                                aria-label = "New File">
                                {userMsg('AppOpeningScreen-new_file')}
                            </Button>
                            <Button classExtras = {buttonClassName}
                                onClick={props.onOpenClick}
                                aria-label = "Open File">
                                {userMsg('AppOpeningScreen-open_file')}
                            </Button>
                            {importButton}
                        </Col>
                        <Col/>
                    </Row>
                </RowColContainer>
                <RowColContainer classExtras="Mt-auto">
                    <Row>
                        <Col/>
                        <Col>
                            <Button 
                                classExtras = "Btn-secondary Btn-sm Btn-block Mb-4"
                                onClick={props.onExitClick}
                                aria-label="Exit">
                                {userMsg('AppOpeningScreen-exit')}
                            </Button>
                        </Col>
                        <Col/>
                    </Row>
                    {forceReloadComponent}
                </RowColContainer>
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
    onForceReload: PropTypes.func,
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

        
        this.getZoomMenuItems = this.getZoomMenuItems.bind(this);
        this.onActualSize = this.onActualSize.bind(this);
        this.onZoomIn = this.onZoomIn.bind(this);
        this.onZoomOut = this.onZoomOut.bind(this);
        this.onToggleFullScreen = this.onToggleFullScreen.bind(this);


        this.getDevMenuItems = this.getDevMenuItems.bind(this);
        this.onForceReload = this.onForceReload.bind(this);
        this.onOpenDevTools = this.onOpenDevTools.bind(this);


        this.statusCallback = this.statusCallback.bind(this);

        this.onStatusCancel = this.onStatusCancel.bind(this);
        this.onConfirmStatusCancelButton = this.onConfirmStatusCancelButton.bind(this);

        this.onRevertFile = this.onRevertFile.bind(this);
        this.onCloseFile = this.onCloseFile.bind(this);
        this.onExit = this.onExit.bind(this);
        this.onRequestExit = this.onRequestExit.bind(this);

        this._frameManager = new FM.FrameManager();

        this._zoomFactors = [ 0.5, 0.625, 0.75, 0.875, 1., 
            1.125, 1.25, 1.375, 1.5, 1.625, 1.75, ];
        this._actualSizeZoomFactorIndex = this._zoomFactors.indexOf(1);
        this.state.zoomFactorIndex = this._actualSizeZoomFactorIndex;

        process.nextTick(async () => { this.asyncInitialize(); });
    }


    async asyncInitialize() {
        // mainSetup is stuff like 'isDevMode', 'zoomLevel', 'zoomFactor'
        const mainSetup = ipcRenderer.sendSync('sync-get-main-setup');
        this.setState({ mainSetup: mainSetup, });

        const { zoomFactor } = mainSetup;
        if (zoomFactor) {
            let closestIndex = 0;
            let closestDistance = Math.abs(zoomFactor - this._zoomFactors[0]);
            for (let i = 1; i < this._zoomFactors.length; ++i) {
                const delta = Math.abs(zoomFactor - this._zoomFactors[i]);
                if (delta < closestDistance) {
                    closestDistance = delta;
                    closestIndex = i;
                }
            }

            this.setState({
                zoomFactorIndex: closestIndex,
            });
        }

        const appData = ipcRenderer.sendSync('sync-getPath', 'appData');
        const appPath = ipcRenderer.sendSync('sync-getAppPath');
        const name = ipcRenderer.sendSync('sync-appName');
        const settingsPathName = path.join(appData, 
            name, 'user.json');
        

        await Engine.asyncInitializeEngine(settingsPathName, appPath);

        // This must come after the engine is initialized so user messages are loaded.
        this._accessor = new EngineAccessor();

        await this.asyncPostEngineInitialized();
    }


    async asyncPostEngineInitialized() {
        const networkPaths = await asyncGetUserSetting('networkPaths', []);
        setNetworkPaths(networkPaths);

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
            currentDir = ipcRenderer.sendSync('sync-getPath', 'documents');
        }

        this._fileImporter = new FileImporter(this._accessor);

        ipcRenderer.invoke('async-setTitle', userMsg('App-empty_main_title'));

        this.setState({
            appState: 'openingScreen',
            mruPathNames: startupOptions.mruPathNames,
            currentDir: currentDir,
            fileFactoryIndex: 0,
        });
    }


    componentDidMount() {
        ipcRenderer.on('app-close', this.onExit);
    }


    componentWillUnmount() {
        ipcRenderer.off('app-close', this.onExit);
    }


    componentDidUpdate(prevProps, prevState) {
        
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

            ipcRenderer.invoke('async-setTitle', userMsg('App-project_main_title',
                pathName));

            this.setState({
                mruPathNames: mruPathNames,
                appState: 'mainWindow',
                currentDir: currentDir,
            });
        });
    }


    exitMainWindow(postExit) {
        process.nextTick(async () => {
            const pathName = this._accessor.getAccountingFilePathName();
            try {
                if (pathName) {
                    await this._accessor.asyncCloseAccountingFile();
                }
                this.onCancel();

                if (postExit) {
                    postExit();
                }

                ipcRenderer.invoke('async-setTitle', userMsg('App-empty_main_title'));
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
                        console.info('Saved changes to ' 
                            + this._accessor.getAccountingFilePathName());
                    }

                    this.exitMainWindow(postClose);
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
        this.closeFile(() => {}, 
            userMsg('App-save_ignore_button'));
    }

    onExit() {
        this.closeFile(() => { ipcRenderer.sendSync('sync-exit'); }, 
            userMsg('App-save_exit_button'));
    }

    onRequestExit() {
        ipcRenderer.sendSync('sync-quit');
    }


    async asyncOpenAccountingFile(pathName, options, errorId) {
        try {
            await this._accessor.asyncOpenAccountingFile(pathName, options);
            
            if (this.state.modalRenderer) {
                this.setModalRenderer();
            }
            this.enterMainWindow();
        }
        catch (e) {
            if (e.msgCode === 'LOCK_EXISTS') {
                if (options && !options.breakLock) {
                    const name = path.parse(pathName).base;
                    this.setModalRenderer(() => {
                        return <QuestionPrompter
                            title={userMsg('App-break_lock_title', name)}
                            message={userMsg('App-break_lock_msg', name)}
                            buttons={StandardButton.YES_NO}
                            onButton={(id) => {
                                const newOptions = Object.assign({}, options, {
                                    breakLock: true,
                                });

                                switch (id) {
                                case 'yes' :
                                    process.nextTick(async () => {
                                        await this.asyncOpenAccountingFile(pathName, 
                                            newOptions,
                                            errorId);
                                    });
                                    break;

                                default :
                                    this.setModalRenderer();
                                    break;
                                }
                            }}
                        />;
                    });
                    return;
                }
            }
            this.setState({
                errorMsg: userMsg(errorId, pathName, e.toString()),
            });
        }
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

            await this.asyncOpenAccountingFile(pathName, {
                fileFactoryIndex: fileFactoryIndex,
                clearActions: true,
            },
            'App-open_failed');
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
            await this.asyncOpenAccountingFile(pathName, {
                fileFactoryIndex: this.state.fileFactoryIndex,
                clearActions: true,
            },
            'App-open_failed');
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
            await this.asyncOpenAccountingFile(pathName, {
                clearActions: true,
            },
            'App-mru_open_failed');
        });
    }

    onRemoveRecentClick(pathName) {
        process.nextTick(async () => {
            const mruPathNames = await this.removeFromMRU(pathName);
            this.setState({ mruPathNames: mruPathNames });
        });
    }



    getZoomMenuItems() {
        return [
            { id: 'zoomSubMenu',
                label: userMsg('App-zoomSubMenu'),
                subMenuItems: [
                    { id: 'actualSize',
                        label: userMsg('App-actualSize'),
                        onChooseItem: this.onActualSize,
                        disabled:
                            this.state.zoomFactorIndex 
                                === this._actualSizeZoomFactorIndex,
                    },
                    { id: 'zoomIn',
                        label: userMsg('App-zoomIn'),
                        onChooseItem: this.onZoomIn,
                        disabled: 
                            (this.state.zoomFactorIndex + 1) >= this._zoomFactors.length,
                    },
                    { id: 'zoomOut',
                        label: userMsg('App-zoomOut'),
                        onChooseItem: this.onZoomOut,
                        disabled:
                            !this.state.zoomFactorIndex,
                    },
                    /*
                    { id: 'toggleFullScreen',
                        label: userMsg('App-toggleFullScreen'),
                        onChooseItem: this.onToggleFullScreen,
                    },
                    */
                ],
            }
        ];
    }

    _setZoomFactorIndex(index) {
        if ((index !== this.state.zoomFactorIndex)
         && (index >= 0) && (index < this._zoomFactors.length)) {
            this.setState({
                zoomFactorIndex: index,
            },
            () => {
                ipcRenderer.invoke('async-setZoomFactor', 
                    this._zoomFactors[this.state.zoomFactorIndex])
                    .then(() => this.forceUpdate());
            });
        }
    }


    onActualSize() {
        this._setZoomFactorIndex(this._actualSizeZoomFactorIndex);
    }

    onZoomIn() {
        this._setZoomFactorIndex(this.state.zoomFactorIndex + 1);
    }

    onZoomOut() {
        this._setZoomFactorIndex(this.state.zoomFactorIndex - 1);
    }

    onToggleFullScreen() {

    }


    getDevMenuItems() {
        const { mainSetup } = this.state;
        if (!mainSetup || !mainSetup.isDevMode) {
            return;
        }

        return [{ id: 'developersSubMenu',
            label: userMsg('App-devSubMenu'),
            subMenuItems: [
                { id: 'forceReload',
                    label: userMsg('App-forceReload'),
                    onChooseItem: this.onForceReload,
                },
                { id: 'openDevTools',
                    label: userMsg('App-openDevTools'),
                    onChooseItem: this.onOpenDevTools,
                }
            ],
        }
        ];
    }


    onForceReload() {
        document.location.reload();
    }


    onOpenDevTools() {
        ipcRenderer.invoke('async-openDevTools');
    }


    render() {
        let mainComponent;
        const { appState, mruPathNames, errorMsg, currentDir,
            isOpenFileEnabled, isImportFileEnabled, modalRenderer,
            mainSetup } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.onCancel}
            />;
        }

        if (modalRenderer) {
            return modalRenderer();
        }

        let onForceReload = (mainSetup && mainSetup.isDevMode)
            ? this.onForceReload
            : undefined;

        switch (appState) {
        case 'openingScreen' :
            return <AppOpenScreen
                mruPathNames = {mruPathNames}
                onNewClick = {this.onNewClick}
                onOpenClick = {this.onOpenClick}
                onImportClick = {this.onImportClick}
                onRecentClick = {this.onRecentClick}
                onRemoveRecentClick = {this.onRemoveRecentClick}
                onForceReload = {onForceReload}
                onExitClick = {this.onRequestExit}
            />;
        
        case 'newFile': 
            return <FileCreator
                accessor = {this._accessor}
                mainSetup = {mainSetup}
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
                mainSetup = {mainSetup}
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
                onClose = {this.onCancel}
                onRevertFile = {this.onRevertFile}
                onCloseFile = {this.onCloseFile}
                onExit = {this.onRequestExit}
                getZoomMenuItems = {this.getZoomMenuItems}
                getDevMenuItems = {this.getDevMenuItems}
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

        return <RowColContainer>
            {mainComponent}
        </RowColContainer>;
    }
}

/**
 * @typedef {object}    App~MainSetup
 * @property {boolean}  [isDevMode] <code>true</code> if in developer mode.
 */
