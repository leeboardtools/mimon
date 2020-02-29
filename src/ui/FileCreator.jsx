import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { SequentialPages } from './SequentialPages';
import { getUniqueFileName } from '../util/Files';

const os = require('os');
const path = require('path');


/**
 * @callback FileCreator~onCreateCallback
 * @param {string}  fileName
 * @param {number}  fileFactoryIndex    The index of the file factory to use from
 * {@link EngineAccessor}
 * @param {object}  fileContents
 */

//
// CreateFileName
//

class CreateFileName extends React.Component {
    constructor(props) {
        super(props);

        this.onBrowse = this.onBrowse.bind(this);
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


    renderBaseDirSelector() {
        const label = userMsg('CreateFileName-baseDir_selector_label');
        const browseText = userMsg('CreateFileName-browse_btn');

        return <div className="form-group text-left">
            <label className="mb-0" htmlFor="CreateFileName-baseDir">
                {label}
            </label>
            <div className="input-group mb-0">
                <input type="text"
                    id="CreateFileName-baseDir"
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
/*        const { accessor } = this.props;

        let fileTypeSelector;
        if (accessor.getFileFactoryCount() > 1) {
            // TODO:
            // Put in a file type selector.
        }
*/
    }


    renderProjectNameEditor() {
        let label;
        let helperLabel;

        const { accessor } = this.props;
        if (accessor.isFileFactoryAtIndexDirBased(this.props.fileFactoryIndex)) {
            label = userMsg('CreateFileName-dir_projectName_label');
            helperLabel = userMsg('CreateFileName-dir_projectNameHelpBlock');
        }

        let projectName = this.props.projectName || '';

        return <div className="form-group text-left">
            <label className="mb-0" htmlFor="CreateFileName-projectName">
                {label}
            </label>
            <div className="input-group mb-0">
                <input type="text"
                    id="CreateFileName-projectName"
                    className="form-control"
                    aria-describedby="CreateFileName-projectNameHelpBlock"
                    value={projectName}/>
            </div>
            <small 
                id="CreateFileName-projectNameHelpBlock"
                className="form-text text-muted">
                {helperLabel}
            </small>
        </div>;
    }


    render() {
    
        const baseDirSelector = this.renderBaseDirSelector();
        const fileTypeSelector = this.renderFileTypeSelector();
        const projectNameEditor = this.renderProjectNameEditor();

        return <div className="container-fluid mt-auto mb-auto">
            <h4 className="pageTitle pb-3 mb-4 border-bottom">
                {userMsg('CreateFileName-heading')}
            </h4>
            {baseDirSelector}
            {projectNameEditor}
            {fileTypeSelector}
        </div>;
    }
}

CreateFileName.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    baseDirName: PropTypes.string,
    projectName: PropTypes.string,
    fileFactoryIndex: PropTypes.number,
    onSetBaseDirName: PropTypes.func.isRequired,
    onSetProjectName: PropTypes.func.isRequired,
    onSetFileFactoryIndex: PropTypes.func.isRequired,
};


//
// Accounts
//

//
// Priced Items
//



/**
 * Component for creating new account system files.
 */
export class FileCreator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fileFactoryIndex: 0,
            baseDirName: path.join(os.homedir(), 'Mimon'),
            projectName: undefined,
        };

        this._pages = [
            {
                pageId: 'fileName',
            },
            {
                pageId: 'accounts',
            },
            {
                pageId: 'pricedItems',
            },
        ];

        this.onSetBaseDirName = this.onSetBaseDirName.bind(this);
        this.onSetProjectName = this.onSetProjectName.bind(this);
        this.onSetFileFactoryIndex = this.onSetFileFactoryIndex.bind(this);

        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivatePage = this.onActivatePage.bind(this);
        this.onCreate = this.onCreate.bind(this);


        process.nextTick(async () => {
            const defaultProjectName = userMsg('FileCreator-default_project_name');
            this.setState({
                projectName: await getUniqueFileName(this.state.baseDirName, 
                    defaultProjectName)
            });
        });
    }


    onSetBaseDirName(name) {
        this.setState({
            baseDirName: name,
        });
    }

    onSetProjectName(name) {
        this.setState({
            projectName: name,
        });
    }

    onSetFileFactoryIndex(index) {
        this.setState({
            fileFactoryIndex: index,
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
            component = <CreateFileName
                accessor={this.props.accessor}
                frameManager={this.props.frameManager}
                baseDirName={this.state.baseDirName}
                projectName={this.state.projectName}
                fileFactoryIndex={this.state.fileFactoryIndex}
                onSetBaseDirName={this.onSetBaseDirName}
                onSetProjectName={this.onSetProjectName}
                onSetFileFactoryIndex={this.onSetFileFactoryIndex}
            />;
            break;

        case 'accounts':
            component = <div>Accounts</div>;
            break;

        case 'pricedItems':
            component = <span>Priced Items</span>;
            break;
        }

        return <div className="container-fluid mt-3">
            {component}
        </div>;
    }


    onCreate() {
        const { fileName, fileFactoryIndex, fileContents } = this.state;
        this.props.onCreate(fileName, fileFactoryIndex, fileContents);
    }


    render() {
        return <SequentialPages
            pageCount={this._pages.length}
            activePageIndex={this.state.activePageIndex}
            onActivatePage={this.onActivatePage}
            onRenderPage={this.onRenderPage}
            onFinish={this.onCreate}
            onCancel={this.props.onCancel}
        />;
    }
}

FileCreator.propTypes = {
    accessor: PropTypes.object.isRequired,
    frameManager: PropTypes.object.isRequired,
    onCreate: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
