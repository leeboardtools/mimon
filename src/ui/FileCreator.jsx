import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { SequentialPages } from '../util-ui/SequentialPages';
import { asyncGetUniqueFileName } from '../util/Files';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { InfoReporter } from '../util-ui/InfoReporter';
import { asyncGetNewFileTemplates } from '../tools/Templates';
import { NewFileConfigurator} from './NewFileConfigurator';
import { PageTitle } from '../util-ui/PageTitle';
import { YMDDate } from '../util/YMDDate';
import { CurrencySelector } from '../util-ui/CurrencySelector';
import { createTestTransactions, createTestReminders } 
    from '../tools/CreateTestTransactions';
import * as path from 'path';
import * as os from 'os';
import { promises as fsPromises } from 'fs';


/**
 * Component for specifying the file name/type of a new accounting project file.
 * @private
 */
class NewFileName extends React.Component {
    constructor(props) {
        super(props);

        this.onBrowse = this.onBrowse.bind(this);
        this.onProjectNameChange = this.onProjectNameChange.bind(this);
    }


    onBrowse() {
        const { frameManager, baseDirName } = this.props;

        const options = {
            defaultPath: baseDirName,
            properties: [ 'openDirectory', 'createDirectory', ],
        };

        frameManager.asyncFileOpenDialog(options).then((result) => {
            if (result.filePaths.length) {
                const baseDirName = result.filePaths[0];
                this.props.onSetBaseDirName(baseDirName);
            }
        }).catch((err) => {
            console.log('failed: ' + JSON.stringify(err));
        });
    }


    onProjectNameChange(event) {
        this.props.onSetProjectName(event.target.value);
    }


    renderBaseDirSelector() {
        const label = userMsg('NewFileName-baseDir_selector_label');
        const browseText = userMsg('NewFileName-browse_btn');

        return <div className = "form-group text-left">
            <label className = "mb-0" htmlFor = "NewFileName-baseDir">
                {label}
            </label>
            <div className = "input-group mb-0">
                <input type = "text"
                    id = "NewFileName-baseDir"
                    className = "form-control"
                    readOnly
                    aria-label = "Base Folder"
                    value = {this.props.baseDirName}/>
                <div className = "input-group-append">
                    <button className = "btn btn-outline-secondary" 
                        type = "button"
                        id = "browse_btn"
                        aria-label = "Browse Base Folder"
                        onClick = {this.onBrowse}>
                        {browseText}
                    </button>
                </div>
            </div>
        </div>;
    }


    renderFileTypeSelector() {
    }


    renderProjectNameEditor() {
        let label;

        const { accessor, projectNameErrorMsg } = this.props;
        if (accessor.isFileFactoryAtIndexDirBased(this.props.fileFactoryIndex)) {
            label = userMsg('NewFileName-dir_projectName_label');
        }

        let projectName = this.props.projectName || '';

        let inputClassName = 'form-control';
        let errorMsgComponent;
        if (projectNameErrorMsg) {
            inputClassName += ' is-invalid';
            errorMsgComponent = <div className = "invalid-feedback">
                {projectNameErrorMsg}
            </div>;
        }

        return <div className = "form-group text-left">
            <label className = "mb-0" htmlFor = "NewFileName-projectName">
                {label}
            </label>
            <div className = "input-group mb-0">
                <input type = "text"
                    id = "NewFileName-projectName"
                    className = {inputClassName}
                    onChange = {this.onProjectNameChange}
                    aria-label = "Project Name"
                    value = {projectName}/>
                {errorMsgComponent}
            </div>
        </div>;
    }


    render() {
    
        const baseDirSelector = this.renderBaseDirSelector();
        const fileTypeSelector = this.renderFileTypeSelector();
        const projectNameEditor = this.renderProjectNameEditor();

        return <div className = "container-fluid mt-auto mb-auto">
            <PageTitle>
                {userMsg('NewFileName-heading')}
            </PageTitle>
            {baseDirSelector}
            {projectNameEditor}
            {fileTypeSelector}
        </div>;
    }
}

NewFileName.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    baseDirName: PropTypes.string,
    projectName: PropTypes.string,
    projectNameErrorMsg: PropTypes.string,
    fileFactoryIndex: PropTypes.number,
    onSetBaseDirName: PropTypes.func.isRequired,
    onSetProjectName: PropTypes.func.isRequired,
    onSetFileFactoryIndex: PropTypes.func.isRequired,
};


/**
 * Component for editing the general settings.
 * @private
 */
class GeneralSettingsEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onOpeningBalancesDateChange 
            = this.onOpeningBalancesDateChange.bind(this);
        
        this.state = {
            addTestTransactions: false,
            addTestReminders: false,
        };
    }


    onOpeningBalancesDateChange(event) {
        this.props.onSetOpeningBalancesDate(event.target.value);
    }


    renderOpeningBalancesDateEditor() {
        const label = userMsg('GeneraSettingsEditor-openingBalancesDate_label');
        const inputClassName = 'form-control';

        return <div className = "form-row text-left">
            <div className = "form-col">
                <label className = "mb-0" 
                    htmlFor = "GeneralSettingsEditor-openingBalancesDate">
                    {label}
                </label>
                <div className = "mb-0">
                    <input type = "date"
                        id = "GeneralSettingsEditor-openingBalancesDate"
                        className = {inputClassName}
                        onChange = {this.onOpeningBalancesDateChange}
                        aria-label = "Opening Balance Date"
                        value = {this.props.openingBalancesDate}/>
                </div>
            </div>
        </div>;
    }

    
    renderDefaultCurrency() {
        const label = userMsg('GeneraSettingsEditor-defaultCurrency_label');
        return <div className = "form-row text-left">
            <div className = "form-col">
                <label className = "mb-0" 
                    htmlFor = "GeneralSettingsEditor-defaultCurrency">
                    {label}
                </label>
                <div className = "mb-0">
                    <CurrencySelector
                        id = "GeneralSettingsEditor-defaultCurrency"
                        onChange = {this.props.onSetDefaultCurrency}
                        aria-label = "Default Currency"
                        value = {this.props.defaultCurrency}/>
                </div>
            </div>
        </div>;
    }

    
    renderAddTestTransactions() {
        const { onSetAddTestTransactions } = this.props;
        if (onSetAddTestTransactions) {
            return <div className = "text-left">
                <div className = "row mb-2">&nbsp;</div>
                <input type = "checkbox" 
                    id = "addTestTransactions"
                    value = {this.state.addTestTransactions}
                    onClick = {(e) => {
                        const add = !this.state.addTestTransactions;
                        onSetAddTestTransactions(add);
                        this.setState({
                            addTestTransactions: add,
                        });
                    }}
                />
                <label htmlFor = "addTestTransactions">Add Test Transactions</label>
            </div>;
        }
    }


    renderAddTestReminders() {
        const { onSetAddTestReminders } = this.props;
        if (onSetAddTestReminders) {
            return <div className = "text-left">
                <div className = "row mb-2">&nbsp;</div>
                <input type = "checkbox" 
                    id = "addTestReminders"
                    value = {this.state.addTestReminders}
                    onClick = {(e) => {
                        const add = !this.state.addTestReminders;
                        onSetAddTestReminders(add);
                        this.setState({
                            addTestReminders: add,
                        });
                    }}
                />
                <label htmlFor = "addTestReminders">Add Test Reminders</label>
            </div>;
        }
    }


    render() {
        const openingBalancesDateEditor = this.renderOpeningBalancesDateEditor();
        const defaultCurrency = this.renderDefaultCurrency();
        const addTestTransactions = this.renderAddTestTransactions();
        const addTestReminders = this.renderAddTestReminders();

        return <div className = "container-fluid mt-auto mb-auto">
            <PageTitle>
                {userMsg('GeneraSettingsEditor-heading')}
            </PageTitle>
            {openingBalancesDateEditor}
            <div className = "row mb-2">&nbsp;</div>
            {defaultCurrency}
            {addTestTransactions}
            {addTestReminders}
        </div>;
    }
}

GeneralSettingsEditor.propTypes = {
    openingBalancesDate: PropTypes.string.isRequired,
    onSetOpeningBalancesDate: PropTypes.func.isRequired,
    defaultCurrency: PropTypes.string.isRequired,
    onSetDefaultCurrency: PropTypes.func.isRequired,
    onSetAddTestTransactions: PropTypes.func,
    onSetAddTestReminders: PropTypes.func,
};


/**
 * Component for creating new accounting project files.
 */
export class FileCreator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fileFactoryIndex: 0,
            baseDirName: props.initialDir || path.join(os.homedir(), 'Mimon'),
            projectName: undefined,
            activePageIndex: 0,
            newFileContents: { 
                accounts: {}, 
                openingBalancesDate: (new YMDDate()).toString(),
                baseCurrency: 'USD',
            },
            openingBalancesDate: (new YMDDate()).toString(),
            baseCurrency: 'USD',
        };

        this._pages = [
            {
                pageId: 'fileName',
            },
            {
                pageId: 'generalSettings',
            },
        ];
        if (!this.props.isImport) {
            this._pages.push({
                pageId: 'accounts',
            });
        }

        this.onSetBaseDirName = this.onSetBaseDirName.bind(this);
        this.onSetProjectName = this.onSetProjectName.bind(this);
        this.onSetFileFactoryIndex = this.onSetFileFactoryIndex.bind(this);

        this.onSetOpeningBalancesDate = this.onSetOpeningBalancesDate.bind(this);
        this.onSetDefaultCurrency = this.onSetDefaultCurrency.bind(this);
        this.onSetAddTestTransactions = this.onSetAddTestTransactions.bind(this);
        this.onSetAddTestReminders = this.onSetAddTestReminders.bind(this);

        this.onUpdateFileContents = this.onUpdateFileContents.bind(this);
        this.onSetEndEditAsyncCallback = this.onSetEndEditAsyncCallback.bind(this);

        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivatePage = this.onActivatePage.bind(this);
        this.onFileCreate = this.onFileCreate.bind(this);

        process.nextTick(async () => {
            const defaultProjectName = userMsg('FileCreator-default_project_name');

            const stateChanges = {
                projectName: await asyncGetUniqueFileName(this.state.baseDirName, 
                    defaultProjectName),
            };

            if (!this.props.isImport) {
                this._newFileTemplates = await asyncGetNewFileTemplates();
                stateChanges.newFileContents = this._newFileTemplates[0];
            }

            this.setState(stateChanges);
        });
    }


    updateFileInfo(settings) {
        process.nextTick(async () => {
            let baseDirName = settings.baseDirName || this.state.baseDirName;
            let projectName = settings.projectName || this.state.projectName;
            let fileFactoryIndex = (settings.fileFactoryIndex === undefined)
                ? this.state.fileFactoryIndex : settings.fileFactoryIndex;
            
            const { accessor } = this.props;
            const fileFactoryCount = accessor.getFileFactoryCount();
            fileFactoryIndex = Math.max(fileFactoryIndex, 0);
            fileFactoryIndex = Math.min(fileFactoryIndex, fileFactoryCount - 1);

            const pathName = path.join(baseDirName, projectName);

            let projectNameErrorMsg;
            let result;
            if (!projectName) {
                projectNameErrorMsg = userMsg('FileCreator-project_name_required');
            }
            else {
                try {
                    await fsPromises.mkdir(baseDirName, {
                        recursive: true,
                    });
    
                    result = await accessor.asyncCanCreateAccountingFile(
                        pathName, fileFactoryIndex);
                    if (result instanceof Error) {
                        projectNameErrorMsg = result.message;
                    }
                }
                catch (e) {
                    projectNameErrorMsg = userMsg('FileCreator-cannot_make_base_dir', e);
                }
            }

            this.setState({
                baseDirName: baseDirName,
                projectName: projectName,
                projectNameErrorMsg: projectNameErrorMsg,
                fileFactoryIndex: fileFactoryIndex,
            });
        });
    }

    onSetBaseDirName(name) {
        this.updateFileInfo({
            baseDirName: name,
        });
    }

    onSetProjectName(name) {
        this.updateFileInfo({
            projectName: name,
        });
    }

    onSetFileFactoryIndex(index) {
        this.updateFileInfo({
            fileFactoryIndex: index,
        });
    }

    onSetOpeningBalancesDate(date) {
        this.setState({
            openingBalancesDate: date,
        });
    }

    onSetDefaultCurrency(currency) {
        this.setState({
            baseCurrency: currency,
        });
    }

    onSetAddTestTransactions(add) {
        this.setState({
            addTestTransactions: add,
        });
    }

    onSetAddTestReminders(add) {
        this.setState({
            addTestReminders: add,
        });
    }

    onUpdateFileContents(newFileContents) {
        this.setState({
            newFileContents: newFileContents
        });
    }


    onSetEndEditAsyncCallback(asyncCallback) {
        this.setState({
            asyncEndEditCallback: asyncCallback,
        });
    }


    onActivatePage(pageIndex) {
        this.setState({
            activePageIndex: pageIndex,
        });
    }


    onRenderPage(pageIndex, isActive) {
        const page = this._pages[pageIndex];
        let component;
        switch (page.pageId) {
        case 'fileName':
            component = <NewFileName
                accessor = {this.props.accessor}
                frameManager = {this.props.frameManager}
                baseDirName = {this.state.baseDirName}
                projectName = {this.state.projectName}
                projectNameErrorMsg = {this.state.projectNameErrorMsg}
                fileFactoryIndex = {this.state.fileFactoryIndex}
                onSetBaseDirName = {this.onSetBaseDirName}
                onSetProjectName = {this.onSetProjectName}
                onSetFileFactoryIndex = {this.onSetFileFactoryIndex}
            />;
            break;
        
        case 'generalSettings':
            {
                const { mainSetup, isImport } = this.props;
                const isDevMode = mainSetup && mainSetup.isDevMode && !isImport;
                const onSetAddTestTransactions = (isDevMode)
                    ? this.onSetAddTestTransactions
                    : undefined;
                const onSetAddTestReminders = (isDevMode)
                    ? this.onSetAddTestReminders
                    : undefined;
                component = <GeneralSettingsEditor
                    openingBalancesDate = {this.state.openingBalancesDate}
                    onSetOpeningBalancesDate = {this.onSetOpeningBalancesDate}
                    defaultCurrency = {this.state.baseCurrency}
                    onSetDefaultCurrency = {this.onSetDefaultCurrency}
                    onSetAddTestTransactions = {onSetAddTestTransactions}
                    onSetAddTestReminders = {onSetAddTestReminders}
                />;
            }
            break;

        case 'accounts':
            component = <NewFileConfigurator
                accessor = {this.props.accessor}
                baseCurrency = { this.state.baseCurrency}
                newFileContents = {this.state.newFileContents}
                onUpdateFileContents = {this.onUpdateFileContents}
                onSetEndEditAsyncCallback = {this.onSetEndEditAsyncCallback}
            />;
            break;

        }

        return component;
    }


    onFileCreate() {
        process.nextTick(async () => {
            const { asyncEndEditCallback, baseDirName, projectName, fileFactoryIndex, 
                newFileContents } = this.state;
            
            if (asyncEndEditCallback) {
                if (!(await asyncEndEditCallback(true))) {
                    return;
                }
            }
            
            newFileContents.openingBalancesDate = this.state.openingBalancesDate;
            newFileContents.baseCurrency = this.state.baseCurrency;

            if (this.state.addTestTransactions) {
                createTestTransactions(newFileContents, {
                    includeReverseSplit: true,
                    includeReturnOfCapital: true,
                });
            }
            
            if (this.state.addTestReminders) {
                createTestReminders(newFileContents, {
                });
            }
            
            const pathName = path.join(baseDirName, projectName);
            try {
                const { accessor } = this.props;

                if (this.props.onCreateFile) {
                    this.props.onCreateFile({
                        pathName: pathName,
                        newFileContents: newFileContents,
                    });
                }
                else {
                    const warnings = await accessor.asyncCreateAccountingFile(
                        pathName, {
                            fileFactoryIndex: fileFactoryIndex, 
                            initialContents: newFileContents,
                        });

                    if (warnings.length) {
                        this.setState({
                            warningTitle: 
                                userMsg('FileCreator-file_create_warnings', pathName),
                            warningMsg: warnings,
                        });
                    }
                    else {
                        this.props.onFileCreated();
                    }
                }
            }
            catch (e) {
                this.setState({
                    errorMsg: e.message,
                });
            }
        });
    }


    render() {
        const { activePageIndex, errorMsg, warningMsg } = this.state;
        if (errorMsg) {
            return <ErrorReporter message = {errorMsg} 
                onClose = {this.props.onCancel}
            />;
        }
        if (warningMsg) {
            return <InfoReporter message = {warningMsg} 
                title = {this.state.warningTitle}
                onClose = {this.props.onFileCreated}
            />;
        }
        
        const activePage = this._pages[activePageIndex];

        let isBackDisabled;
        let isNextDisabled;

        switch (activePage.pageId) {
        case 'fileName' :
            isNextDisabled = this.state.projectNameErrorMsg;
            break;
        
        case 'accounts' :
            isNextDisabled = this.state.accountsErrorMsg;
            break;
        }

        return <SequentialPages
            pageCount = {this._pages.length}
            activePageIndex = {this.state.activePageIndex}
            onActivatePage = {this.onActivatePage}
            onRenderPage = {this.onRenderPage}
            onFinish = {this.onFileCreate}
            onCancel = {this.props.onCancel}
            isBackDisabled = {isBackDisabled}
            isNextDisabled = {isNextDisabled}
        />;
    }
}


/**
 * @typedef {object} FileCreator~onCreateFileArgs
 * @property {string} pathName
 * @property {NewFileContents} newFileContents
 */

/**
 * @callback FileCreator~onCreateFile
 * @param {FileCreator~onCreateFileArgs} args
 */

/**
 * @callback FileCreator~onFileCreated
 */

/**
 * @callback FileCreator~onCancel
 */

/**
 * @typedef {object}    FileCreator~propTypes
 * @property {EngineAccessor}   accessor
 * @property {FrameManager} frameManager    Used for the file open dialog box
 * @property {FileCreator~onCreateFile} onCreateFile If this is specified it is called
 * to handle the actual file creation, onFileCreated is not called.
 * @property {FileCreator~onFileCreated}    onFileCreated Called once the file has
 * been created.
 * @property {FileCreator~onCancel} onCancel    Called if the file creation is cancelled.
 * @property {string}   [initialDir]    If specified the initial folder.
 */
FileCreator.propTypes = {
    accessor: PropTypes.object.isRequired,
    mainSetup: PropTypes.object,
    isImport: PropTypes.bool,
    frameManager: PropTypes.object.isRequired,
    onFileCreated: PropTypes.func,
    onCreateFile: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    initialDir: PropTypes.string,
};
