import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { asyncDirExists, splitDirs } from '../util/Files';
import folder from '../images/folder.png';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { CloseButton } from './CloseButton';


/**
 * A component for selecting files or folders.
 */
export class FileSelector extends React.Component {
    constructor(props) {
        super(props);

        this.onOK = this.onOK.bind(this);
        this.onSelectParentDir = this.onSelectParentDir.bind(this);
        this.onSelectDir = this.onSelectDir.bind(this);
        this.onDoubleClickDir = this.onDoubleClickDir.bind(this);
        this.onSelectFile = this.onSelectFile.bind(this);
        this.onDoubleClickFile = this.onDoubleClickFile.bind(this);

        this.state = {
            currentDir: '.',
            dirs: [],
            files: [],
        };

        process.nextTick(async () => {
            const { initialDir } = props;
            if (await asyncDirExists(initialDir)) {
                this.setState({
                    currentDir: initialDir,
                });
            }

            await this.asyncUpdateCurrentDirList();
        });
    }


    async asyncUpdateCurrentDirList() {
        const { currentDir } = this.state;
        try {
            const { onFilterDirEnt } = this.props;
            const currentDirPath = await fsPromises.realpath(currentDir);
            const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });

            const dirs = [];
            const files = [];
            entries.forEach((dirEnt) => {
                if (dirEnt.name[0] === '.') {
                    return;
                }
                if (!onFilterDirEnt(dirEnt, currentDirPath)) {
                    return;
                }
                if (dirEnt.isDirectory()) {
                    dirs.push(dirEnt);
                }
                else if (dirEnt.isFile()) {
                    files.push(dirEnt);
                }
            });

            let { activePathName } = this.state;
            if (!activePathName) {
                if (files && files.length) {
                    activePathName = path.join(currentDirPath, files[0].name);
                    this.onSelectFile(activePathName);
                }
                else if (dirs && dirs.length) {
                    activePathName = path.join(currentDirPath, dirs[0].name);
                    this.onSelectDir(activePathName);
                }
            }

            this.setState({
                dirs: dirs,
                files: files,
                currentDirPath: currentDirPath,
            });
        }
        catch (e) {
            console.log('error! ' + e);

            this.setState({
                errorMsg: userMsg('FileSelector-readdir_failed', currentDir, e),
            });
        }
    }


    onOK() {
        const { activePathName, currentDirPath } = this.state;
        this.props.onOK(activePathName || currentDirPath);
    }


    onSelectParentDir(dir) {
        this.setState({
            currentDir: dir,
        });
        process.nextTick(async () => await this.asyncUpdateCurrentDirList());
    }


    onSelectDir(dirName) {
        this.setState({
            activePathName: dirName,
        });

        const { onDirSelect } = this.props;
        if (onDirSelect) {
            onDirSelect(dirName);
        }
    }


    onDoubleClickDir(event, dir) {
        this.setState({
            currentDir: dir,
            activePathName: undefined,
        });
        process.nextTick(async () => await this.asyncUpdateCurrentDirList());
    }


    onSelectFile(fileName) {
        this.setState({
            activePathName: fileName,
        });

        const { onFileSelect } = this.props;
        if (onFileSelect) {
            onFileSelect(fileName);
        }
    }


    onDoubleClickFile(event, fileName) {

    }


    renderHeader() {
        const { title } = this.props;
        let titleComponent;
        if (title) {
            titleComponent = <h4 className="modal-title">
                {title}
            </h4>;
        }

        return <React.Fragment>
            {titleComponent}
            <CloseButton
                onClick = {this.props.onCancel}
            />
        </React.Fragment>;
    }


    renderBody() {
        const { currentDirPath, dirs, files } = this.state;

        const currentDirParts = splitDirs(currentDirPath);
        const currentDirComponents = [];
        let builtDir = path.sep;
        for (let i = 0; i < currentDirParts.length; ++i) {
            const part = currentDirParts[i];
            const myDir = path.join(builtDir, part);
            let className = 'btn btn-outline-secondary btn-sm';
            if ((i + 1) === currentDirParts.length) {
                className += ' active';
            }
            builtDir = path.join(builtDir, part);
            const component = <button type="button"
                key={builtDir}
                className={className}
                onClick={(event) => this.onSelectParentDir(myDir)}
            >{part}</button>;
            currentDirComponents.push(component);
        }

        const { activePathName } = this.state;

        const entityComponents = [];
        dirs.forEach((dir) => {
            const { name } = dir;
            const pathName = path.join(currentDirPath, name);
            let className = 'list-group-item list-group-item-action';
            if (pathName === activePathName) {
                className += ' active';
            }
            const component = <a href="#" key={name}
                className={className}
                onClick={() => this.onSelectDir(pathName)}
                onDoubleClick={(event) => this.onDoubleClickDir(event, pathName)}
            >
                <div className="media">
                    <img src={folder} className="mr-1"></img>
                    <div className="media-body">
                        {name}
                    </div>
                </div>
            </a>;
            entityComponents.push(component);
        });

        files.forEach((file) => {
            const { name } = file;
            const pathName = path.join(currentDirPath, name);
            let className = 'list-group-item list-group-item-action';
            if (pathName === activePathName) {
                className += ' active';
            }
            const component = <li key={name}
                className={className}
                onClick={() => this.onSelectFile(pathName)}
                onDoubleClick={(event) => this.onDoubleClickFile(event, pathName)}
            >
                {name}
            </li>;
            entityComponents.push(component);
        });


        return <React.Fragment>
            <div className="p-2 border-bottom">
                {currentDirComponents}
            </div>
            <div className="modal-body">
                <div className="container-fluid text-left">
                    {entityComponents}
                </div>
            </div>
        </React.Fragment>;
    }


    renderFilter() {

    }

    render() {
        const header = this.renderHeader();
        const body = this.renderBody();
        const filter = this.renderFilter();

        let { okButtonText, isOKDisabled,
            onGetPreFileListComponent, onGetPostFileListComponent } = this.props;
        okButtonText = okButtonText || userMsg('FileSelector-open');

        const btnClassName = 'btn btn-primary m-2';

        let preFileListComponent = (onGetPreFileListComponent)
            ? onGetPreFileListComponent() : undefined;
        let postFileListComponent = (onGetPostFileListComponent)
            ? onGetPostFileListComponent() : undefined;

        return <div className="modal-dialog modal-dialog-scrollable Modal-full-height" 
            role="document">
            <div className="modal-content">
                <div className="modal-header">
                    {header}
                </div>
                {preFileListComponent}
                {body}
                {postFileListComponent}
                <div className="modal-footer">
                    {filter}
                    <button className={btnClassName} type="button"
                        onClick={this.props.onCancel}
                    >
                        {userMsg('cancel')}
                    </button>
                    <button className={btnClassName} type="button"
                        onClick={this.onOK} 
                        disabled={isOKDisabled}>
                        {okButtonText}
                    </button>
                </div>
            </div>
        </div>;
    }
}

/**
 * @callback FileSelector~onOK
 * @param {string}  pathName
 */

/**
 * @callback FileSelector~onCancel
 */

/**
 * @typedef {object} FileSelector~dirEnt
 * This is a
 *  {@link https://nodejs.org/dist/latest-v12.x/docs/api/fs.html#fs_class_fs_dirent}
 */

/**
 * @callback FileSelector~onFilterDirEnt
 * @param {FileSelector~dirEnt}  dirEnt
 * @param {string}  pathName
 * @returns {boolean}   <code>true</code> if the dirEnt should be included/displayed.
 */

/**
 * @callback FileSelector~onDirSelect
 * @param {string}  pathName
 */

/**
 * @callback FileSelector~onFileSelect
 * @param {string}  pathName
 */

/**
 * @callback FileSelector~onGetPreFileListComponent
 * @returns {object|undefined}  The React component to display before the 
 * directory/file list.
 */

/**
 * @callback FileSelector~onGetPostFileListComponent
 * @returns {object|undefined}  The React component to display after the 
 * directory/file list.
 */

/**
 * @typedef {object} FileSelector~propTypes
 * @property {string}   [title]   The title to appear at the top.
 * @property {string}   [initialDir]    The initial folder to display.
 * @property {FileSelector~onOK}    onOK    Called when the OK button is chosen.
 * @property {FileSelector~onCancel}    onCancel    Called when the cancel or close
 * button is chosen.
 * @property {FileSelector~onFilterDirEnt}  [onFilterDirEnt]    If defined, called
 * for each directory and file in the active directory to see if it should be
 * included in the file list.
 * @property {FileSelector~onDirSelect} [onDirSelect]   If defined, called when a
 * directory is selected (becomes active)
 * @property {FileSelector~onFileSelect}    [onFileSelect]  If defined, called when
 * a file is selected (becomes active)
 * @property {string}   [okButtonText]  Text for the OK button.
 * @property {boolean}  [isOKDisabled]  If <code>true</code> the OK button is disabled.
 * @property {FileSelector~onGetPreFileListComponent} [onGetPreFileListComponent]
 * If defined, called to retrieve the component to display before the directory/file list.
 * @property {FileSelector~onGetPostFileListComponent}  [onGetPostFileListComponent]
 * If defined, called to retrieve the component to display after the directory/file list.
 */
FileSelector.propTypes = {
    title: PropTypes.string,
    initialDir: PropTypes.string,
    onOK: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onFilterDirEnt: PropTypes.func,
    onDirSelect: PropTypes.func,
    onFileSelect: PropTypes.func,
    okButtonText: PropTypes.string,
    isOKDisabled: PropTypes.bool,
    onGetPreFileListComponent: PropTypes.func,
    onGetPostFileListComponent: PropTypes.func,
};
