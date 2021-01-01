import { userError } from '../util/UserMessages';
import { XMLFileImporter } from './XMLFileImporter';
import { promises as fsPromises } from 'fs';


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


    /**
     * Main importing method.
     * @param {string} pathNameToImport 
     * @param {string} pathName
     * @param {NewFileContents} newFileContents
     */
    async asyncImportFile(pathNameToImport, newProjectPathName, newFileContents) {
        const accountingFilePathName = this._accessor.getAccountingFilePathName();
        const stat = await fsPromises.lstat(pathNameToImport);
        if (!stat) {
            // File doesn't exist...
            throw userError('FileImporter-file_not_exist', pathNameToImport);
        }
        const isPossibleImport = (stat.isDirectory())
            ? this.isDirNamePossibleImport
            : this.isFileNamePossibleImport;

        let lastError;

        for (let i = 0; i < this._fileImporters.length; ++i) {
            if (isPossibleImport(pathNameToImport)) {
                try {
                    await this._fileImporters[i].asyncImportFile(
                        pathNameToImport, newProjectPathName, newFileContents);
                    return;
                }
                catch (e) {
                    lastError = e;
                }
            }
        }

        if (lastError) {
            throw userError('FileImporter-importFailed', pathNameToImport, 
                accountingFilePathName,
                lastError);
        }
    }
}
