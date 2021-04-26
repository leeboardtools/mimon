import { userError } from '../util/UserMessages';
import { XMLFileImporter } from './XMLFileImporter';
import { promises as fsPromises } from 'fs';
import * as path from 'path';


async function asyncLoadJSONExtrasIfPresent(pathName) {
    const parts = path.parse(pathName);
    parts.name += '-extras';
    parts.ext = '.json';
    delete parts.base;

    const jsonPathName = path.format(parts);
    let fh;
    try {
        fh = await fsPromises.open(jsonPathName);

        const text = await fh.readFile({
            encoding: 'utf8',
        });
        return JSON.parse(text);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }

        throw e;
    }
    finally {
        if (fh) {
            fh.close();
        }
    }
}


/**
 * Class that handles importing other accounting files.
 */
export class FileImporter {
    constructor(accessor) {
        this._accessor = accessor;

        this.isDirNamePossibleImport = this.isDirNamePossibleImport.bind(this);
        this.isFileNamePossibleImport = this.isFileNamePossibleImport.bind(this);


        this._fileImporters = [
            new XMLFileImporter(accessor),
        ];
    }


    isFileNamePossibleImport(filePathName) {
        for (let i = 0; i < this._fileImporters.length; ++i) {
            if (this._fileImporters[i].isFileNamePossibleImport(filePathName)) {
                return true;
            }
        }
    }


    isDirNamePossibleImport(dirPathName) {
        for (let i = 0; i < this._fileImporters.length; ++i) {
            if (this._fileImporters[i].isDirNamePossibleImport(dirPathName)) {
                return true;
            }
        }
    }


    async asyncGetClosestImporter(pathNameToImport) {
        const stat = await fsPromises.lstat(pathNameToImport);
        if (!stat) {
            // File doesn't exist...
            throw userError('FileImporter-file_not_exist', pathNameToImport);
        }

        const isPossibleImport = (stat.isDirectory())
            ? this.isDirNamePossibleImport
            : this.isFileNamePossibleImport;

        for (let i = 0; i < this._fileImporters.length; ++i) {
            if (isPossibleImport(pathNameToImport)) {
                return this._fileImporters[i];
            }
        }
    }


    /**
     * @typedef {object} FileImporter~ImportFileArgs
     * Additional properties may be added by specific importers.
     * @property {string} pathNameToImport
     * @property {string} newProjectPathName
     * @property {NewFileContents} newFileContents
     */

    /**
     * Main importing method.
     * @param {FileImporter~ImportFileArgs} args 
     */
    async asyncImportFile(args) {
        const { pathNameToImport, newProjectPathName } = args;
        const stat = await fsPromises.lstat(pathNameToImport);
        if (!stat) {
            // File doesn't exist...
            throw userError('FileImporter-file_not_exist', pathNameToImport);
        }
        const isPossibleImport = (stat.isDirectory())
            ? this.isDirNamePossibleImport
            : this.isFileNamePossibleImport;

        let lastError;

        const jsonExtras = await asyncLoadJSONExtrasIfPresent(pathNameToImport);
        if (jsonExtras) {
            args = Object.assign({}, args, { 
                jsonExtras: jsonExtras, 
            });
        }

        for (let i = 0; i < this._fileImporters.length; ++i) {
            if (isPossibleImport(pathNameToImport)) {
                try {
                    return await this._fileImporters[i].asyncImportFile(args);
                }
                catch (e) {
                    lastError = e;
                }
            }
        }

        if (lastError) {
            throw userError('FileImporter-importFailed', pathNameToImport, 
                newProjectPathName,
                lastError);
        }
    }
}
