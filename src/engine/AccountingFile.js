/**
 * Base class for the object that associates a {@link AccountingSystem} with some 
 * form of storage.
 * <p>
 * {@link AccountingFile}s are created by implementations of 
 * {@link AccountingFileFactory}.
 */
export class AccountingFile {

    /**
     * @typedef {object} AccountingFile~Options
     * @property {AccountingFileFactory}    accountingFileFactory
     * @property {AccountingSystem} accountingSystem
     * @property {string}   pathName
     */
    constructor(options) {
        if (options) {
            this._setup(options);
        }
    }

    _setup(options) {
        this._accountingFileFactory 
            = options.accountingFileFactory || this._accountingFileFactory;
        this._accountingSystem = options.accountingSystem || this._accountingSystem;
        this._pathName = options.pathName || this._pathName;
        this._stateId = options.stateId || 1;
    }

    getAccountingFileFactory() { return this._accountingFileFactory; }

    getAccountingSystem() { return this._accountingSystem; }

    getPathName() { return this._pathName; }

    getStateId() { return this._stateId; }


    /**
     * @returns {boolean}   <code>true</code> if changes have been made to the 
     * accounting system that have not yet been saved.
     */
    isModified() {
        throw Error('AccountingFile.isModified() abstract method!');
    }


    /**
     * Writes any changes that have been made to the accounting system.
     */
    async asyncWriteFile() {

        const stateId = this._stateId + 1;
        await this._asyncWriteFileImpl(stateId);

        this._stateId = stateId;
    }


    /**
     * Closes the file, once called the accounting file object should not be used.
     * Any changes that have been made to the accounting system are lots.
     */
    async asyncCloseFile() {
        return this._asyncCloseFileImpl();
    }


    
    async _asyncWriteFileImpl(stateId) {
        throw Error('AccountingFile._asyncWriteFileImpl() abstract method!');
    }
    
    async _asyncCloseFileImpl() {
        throw Error('AccountingFile._asyncCloseFileImpl() abstract method!');
    }
}


/**
 * @class
 * Base class for factory objects that create an {@link AccountingFile} object for 
 * representing a {@link AccountingSystem} in a file or directory.
 */
export class AccountingFileFactory {

    /**
     * @returns {boolean}   <code>true</code> if the accounting files are directory based.
     */
    isDirBased() {
        throw Error('AccountingFileFactory.isDirBased() abstract method!');
    }


    /**
     * Called to retrieve an array of Electron 
     * [FileFilter]{@link https://electronjs.org/docs/api/structures/file-filter} objects
     * for use with file open dialog boxes.
     * @returns {AccountingFileFactory~FileFilter[]|undefined}
     */
    getFileNameFilters() {
        throw Error('AccountingFileFactory.getFileNameFilters() abstract method!');
    }


    /**
     * Determines if a given directory/file name is a possible valid accounting file 
     * of this type.
     * @param {string} pathName The path name of interest. If 
     * {@link AccountingFile#isDirBased} returned <code>true</code> this
     * should be a directory, otherwise it should be a file name.
     * @returns {boolean}   <code>true</code> if it could be.
     */
    async asyncIsPossibleAccountingFile(pathName) {
        // eslint-disable-next-line max-len
        throw Error('AccountingFileFactory.asyncIsPossibleAccountingFile() abstract method!');
    }


    /**
     * Determines if a path name is likely to succeed if passed to 
     * {@link AccountingFile#asyncCreateFile}.
     * @param {string} pathName The path name of interest.
     * @returns {true|Error}
     */
    async asyncCanCreateFile(pathName) {
        throw Error('AccountingFileFactory.asyncCanCreateFile() abstract method!');
    }


    /**
     * Creates a new accounting file system, replacing an existing one if necessary.
     * @param {string} pathName The path name for the new file system. If the file 
     * system already exists
     * it should be overwritten. If {@link AccountingFileFactor#isDirBased} returns 
     * <code>true</code> this should be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was created.
     */
    async asyncCreateFile(pathName) {
        throw Error('AccountingFileFactory.asyncCreateFile() abstract method!');
    }


    /**
     * Opens an existing accounting file system.
     * @param {string} pathName The path name of the file system to open. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should 
     * be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was opened.
     */
    async asyncOpenFile(pathName) {
        throw Error('AccountingFileFactory.asyncOpenFile() abstract method!');
    }


    /**
     * Copies an existing accounting file into a new accounting system, replacing an 
     * existing one if necessary.
     * Note that an {@link AccountingFile} is returned, if not needed it should be closed.
     * @param {AccountingFile} accountingFile The accounting file to be copied.
     * @param {string} pathName The path name for the new file system. If the file 
     * system already exists it should be overwritten. If 
     * {@link AccountingFileFactor#isDirBased} returns <code>true</code> this should 
     * be a directory, otherwise it should be a file name.
     * @returns {AccountingFile}    The accounting file that was created.
     */
    async asyncCopyAccountingFile(accountingFile, pathName) {
        throw Error('AccountingFileFactory.asyncSaveAsFile() abstract method!');
    }
}
