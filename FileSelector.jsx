import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { asyncDirExists } from '../util/Files';

const fsPromises = require('fs').promises;
const path = require('path');


export class FileSelector extends React.Component {
    constructor(props) {
        super(props);

        this.onOpen = this.onOpen.bind(this);
        this.onClickDir = this.onClickDir.bind(this);
        this.onDoubleClickDir = this.onDoubleClickDir.bind(this);
        this.onClickFile = this.onClickFile.bind(this);
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

            this.setState({
                dirs: dirs,
                files: files,
                currentDirPath: currentDirPath,
            });
        }
        catch (e) {
            this.setState({
                errorMsg: userMsg('FileSelector-readdir_failed', currentDir, e),
            });
        }
    }


    onOpen() {
    }


    onClickDir(event, dirName) {

    }

    onDoubleClickDir(event, dirName) {

    }

    onClickFile(event, fileName) {

    }

    onDoubleClickFile(event, fileName) {

    }


    renderBody() {
        const { currentDirPath, dirs, files } = this.state;

        const entityComponents = [];
        dirs.forEach((dir) => {
            const { name } = dir;
            const component = <li key={name}
                onClick={(event) => this.onClickDir(event, name)}
                onDoubleClick={(event) => this.onDoubleClickDir(event, name)}
            >
                {name}
            </li>;
            entityComponents.push(component);
        });

        files.forEach((file) => {
            const { name } = file;
            const component = <li key={name}
                onClick={(event) => this.onClickFile(event, name)}
                onDoubleClick={(event) => this.onDoubleClickFile(event, name)}
            >
                {name}
            </li>;
            entityComponents.push(component);
        });


        return <div className="container-fluid">
            <div className="row">{currentDirPath}</div>
            <div className="text-left overflow-auto">
                {entityComponents}
            </div>
        </div>;
    }

    renderFilter() {

    }

    render() {
        const { title } = this.props;

        let titleComponent;
        if (title) {
            titleComponent = <h4 className="pageTitle pb-3 mb-4 border-bottom">
                {title}
            </h4>;
        }

        const body = this.renderBody();
        const filter = this.renderFilter();

        let { selectButtonText } = this.props;
        selectButtonText = selectButtonText || userMsg('FileSelector-open');

        let openBtnDisabled = false;

        const btnClassName = 'btn btn-primary m-2';
        return <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
            {titleComponent}
            {body}
            <div className="mt-auto">
                {filter}
                <div className="row border-top m-2">
                    <div className="col text-right mt-2">
                        <button className={btnClassName}
                            onClick={this.props.onCancel}
                        >
                            {userMsg('cancel')}
                        </button>
                        <button className={btnClassName}
                            onClick={this.onOpen} 
                            disabled={openBtnDisabled}>
                            {selectButtonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>;
    }
}

FileSelector.propTypes = {
    title: PropTypes.string,
    initialDir: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onFilterDirEnt: PropTypes.func,
    onGetFilterComponent: PropTypes.func,
    selectButtonText: PropTypes.string,
};
