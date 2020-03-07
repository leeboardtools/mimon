import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { SequentialPages } from '../util-ui/SequentialPages';
import { getUniqueFileName } from '../util/Files';
import { ErrorReporter } from './ErrorReporter';
import { asyncGetNewFileTemplates } from '../tools/Templates';
import { NewFileConfigurator} from './NewFileConfigurator';

const os = require('os');
const path = require('path');
const fsPromises = require('fs').promises;


/**
 * Component for specifying the file name/type of a new accounting project file.
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

        return <div className="form-group text-left">
            <label className="mb-0" htmlFor="NewFileName-baseDir">
                {label}
            </label>
            <div className="input-group mb-0">
                <input type="text"
                    id="NewFileName-baseDir"
                    className="form-control"
                    readOnly
                    aria-label="Base Folder"
                    value={this.props.baseDirName}/>
                <div className="input-group-append">
                    <button className="btn btn-outline-secondary" 
                        type="button"
                        id="browse_btn"
                        aria-label="Browse Base Folder"
                        onClick={this.onBrowse}>
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
            errorMsgComponent = <div className="invalid-feedback">
                {projectNameErrorMsg}
            </div>;
        }

        return <div className="form-group text-left">
            <label className="mb-0" htmlFor="NewFileName-projectName">
                {label}
            </label>
            <div className="input-group mb-0">
                <input type="text"
                    id="NewFileName-projectName"
                    className={inputClassName}
                    onChange={this.onProjectNameChange}
                    aria-label="Project Name"
                    value={projectName}/>
                {errorMsgComponent}
            </div>
        </div>;
    }


    render() {
    
        const baseDirSelector = this.renderBaseDirSelector();
        const fileTypeSelector = this.renderFileTypeSelector();
        const projectNameEditor = this.renderProjectNameEditor();

        return <div className="container-fluid mt-auto mb-auto">
            <h4 className="pageTitle pb-3 mb-4 border-bottom">
                {userMsg('NewFileName-heading')}
            </h4>
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
 * Component for creating new accounting project files.
 */
export class FileCreator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fileFactoryIndex: 0,
            baseDirName: path.join(os.homedir(), 'Mimon'),
            projectName: undefined,
            activePageIndex: 0,
            newFileContents: { 
                accounts: [], 
                pricedItems: [], 
            },
        };

        this._pages = [
            {
                pageId: 'fileName',
            },
            {
                pageId: 'accounts',
            },
        ];

        this.onSetBaseDirName = this.onSetBaseDirName.bind(this);
        this.onSetProjectName = this.onSetProjectName.bind(this);
        this.onSetFileFactoryIndex = this.onSetFileFactoryIndex.bind(this);

        this.onUpdateFileContents = this.onUpdateFileContents.bind(this);

        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivatePage = this.onActivatePage.bind(this);
        this.onCreate = this.onCreate.bind(this);

        process.nextTick(async () => {
            const defaultProjectName = userMsg('FileCreator-default_project_name');

            this._newFileTemplates = await asyncGetNewFileTemplates();

            this.setState({
                projectName: await getUniqueFileName(this.state.baseDirName, 
                    defaultProjectName),
                newFileContents: this._newFileTemplates[0],
            });
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

    onUpdateFileContents(newFileContents) {
        this.setState({
            newFileContents: newFileContents
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
                accessor={this.props.accessor}
                frameManager={this.props.frameManager}
                baseDirName={this.state.baseDirName}
                projectName={this.state.projectName}
                projectNameErrorMsg={this.state.projectNameErrorMsg}
                fileFactoryIndex={this.state.fileFactoryIndex}
                onSetBaseDirName={this.onSetBaseDirName}
                onSetProjectName={this.onSetProjectName}
                onSetFileFactoryIndex={this.onSetFileFactoryIndex}
            />;
            break;

        case 'accounts':
            component = <NewFileConfigurator
                accessor={this.props.accessor}
                newFileContents={this.state.newFileContents}
                onUpdateFileContents={this.onUpdateFileContents}
            />;
            break;

        }

        return <div className="container-fluid mt-3">
            {component}
        </div>;
    }


    onCreate() {
        process.nextTick(async () => {
            const { baseDirName, projectName, fileFactoryIndex, 
                newFileContents } = this.state;
            const pathName = path.join(baseDirName, projectName);
            try {
                const { accessor } = this.props;

                await accessor.asyncCreateAccountingFile(pathName, fileFactoryIndex, 
                    newFileContents);

                this.props.onCreate();
            }
            catch (e) {
                this.setState({
                    errorMsg: e.message,
                });
            }
        });
    }


    render() {
        const { activePageIndex, errorMsg } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={this.props.onCancel}
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
            pageCount={this._pages.length}
            activePageIndex={this.state.activePageIndex}
            onActivatePage={this.onActivatePage}
            onRenderPage={this.onRenderPage}
            onFinish={this.onCreate}
            onCancel={this.props.onCancel}
            isBackDisabled={isBackDisabled}
            isNextDisabled={isNextDisabled}
        />;
    }
}

FileCreator.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    onCreate: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
