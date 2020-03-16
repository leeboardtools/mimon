const path = require('path');
const fsPromises = require('fs').promises;

/**
 * Determines if a file exists.
 * @async
 * @param {string} pathName The path name of the file to check for.
 * @returns {Promise<boolean>}  <code>true</code> if the file exists.
 */
export async function asyncFileExists(pathName) {
    try {
        if (!pathName) {
            return false;
        }
        const stat = await fsPromises.stat(pathName);
        return stat.isFile();
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
    }
}

/**
 * Replaces the base name of a path (name.ext) with another base name or the base 
 * name from another path.
 * @param {string} pathName The path name whose base name is to be replaced.
 * @param {string} baseName The base name or path name whose base name is to be used
 * as the base name for pathName.
 */
export function replaceBaseFileName(pathName, baseName) {
    const parts = path.parse(pathName);
    const baseParts = path.parse(baseName);
    parts.base = baseParts.base;
    return path.format(parts);
}

/**
 * Retrieves a path name given a file name that may just be a base name (name.ext), 
 * or may have a path. If the file name is just a base name, the path in a reference 
 * path name will be used.
 * @param {string} fileName The base file name or path name.
 * @param {string} refPathName The reference path name to use if fileName is just 
 * a base file name. refPathName is presumed to include a base file name, that base 
 * file name will be replaced.
 */
export function getFullPathName(fileName, refPathName) {
    const fileNameParts = path.parse(fileName);
    if (fileNameParts.dir) {
        return fileName;
    }
    return replaceBaseFileName(refPathName, fileNameParts.base);
}


/**
 * Interface for the file actions. File actions perform an action on a file, which 
 * can be reverted until the action is finalized.
 * <p>
 * A set of file actions are normally created, and then passed to 
 * {@link performFileActions}. performFileActions() handles calling 
 * {@link FileAction#apply}, {@link FileAction#finalize}, and 
 * {@link FileAction#revert} when appropriate.
 * @interface
 */
export class FileAction {
    constructor(pathName) {
        this._pathName = pathName;
    }

    getPathName() { return this._pathName; }

    /**
     * Callback called when a backup file is created.
     * @callback FileAction~BackupCallback
     * @param {string} backupFileName   The backupFileName arg that was passed to 
     * the {@link FileAction#setBackupFileName} call.
     * @param {string} backupPathName   The full path name of the created backup file.
     */

    /**
     * Sets a backup file name. If a file with {@link FileAction#getPathName} exists 
     * when the action is applied and a backup file name has been specified, the 
     * existing file is renamed to the backup file name.
     * @param {string} backupFileName The optional file name for the backup file. 
     * Only the base name (name.ext) is used.
     * @param {FileAction~BackupCallback}   [callback]  Optional callback function 
     * that's called when the backup file is created.
     */
    setBackupFileName(backupFileName, callback) {
        this._backupFileName = backupFileName;
        this._backupFileCallback = callback;
    }

    getBackupFileName() { return this._backupFileName; }

    async _applyForExistingFile() {
        if (await asyncFileExists(this._pathName)) {
            if (this._backupFileName) {
                this._backupPathName = getFullPathName(this._backupFileName, 
                    this._pathName);
                this._backupAction = new RenameFileAction(this._pathName, 
                    this._backupPathName);
                await this._backupAction.apply();

                if (this._backupFileCallback) {
                    this._backupFileCallback(this._backupFileName, 
                        this._backupPathName);
                }
            }
            else if (this._isDeleteExistingFile) {
                const parts = path.parse(this._pathName);
                const originalBase = parts.base;
                let index = 1;
                let toDeletePathName;
                do {
                    parts.base = 'to_delete' + index + '_' + originalBase;
                    ++index;
                    toDeletePathName = path.format(parts);
                } while (await asyncFileExists(toDeletePathName));

                await fsPromises.rename(this._pathName, toDeletePathName);
                this._toDeletePathName = toDeletePathName;
            }
        }
    }

    async _finalizeForExistingFile() {
        if (this._backupAction) {
            await this._backupAction.finalize();
            this._backupAction = undefined;
        }
        else if (this._toDeletePathName) {
            await fsPromises.unlink(this._toDeletePathName);
            this._toDeletePathName = undefined;
        }
    }

    async _revertForExistingFile() {
        if (this._backupAction) {
            await this._backupAction.revert();
            this._backupAction = undefined;
        }
        else if (this._toDeletePathName) {
            await fsPromises.rename(this._toDeletePathName, this._pathName);
            this._toDeletePathName = undefined;
        }
    }


    /**
     * Performs the action. This is where the bulk of the action should be performed, 
     * particularly the parts where errors a reasonably likely to occur.
     * The action is not finalized until {@link FileAction#finalize} is called. 
     * Before then, the action can be reverted by calling {@link FileAction#revert}
     */
    async apply() {
        try {
            await this._applyForExistingFile();
            await this._applyMainAction();
        }
        catch (e) {
            await this.revert();
            throw e;
        }
    }

    /**
     * Finalizes the action. After this is called the action normally cannot be 
     * reverted.
     */
    async finalize() {
        try {
            await this._finalizeMainAction();
            await this._finalizeForExistingFile();
        }
        catch (e) {
            await this.revert();
            throw e;
        }
    }

    /**
     * Reverts the action. This is normally called when an exception occurs before 
     * finalization.
     * NOTE: Implements must not throw exceptions.
     */
    async revert() {
        try {
            await this._revertMainAction();
        }
        catch (e) {
            // Ignore
        }

        try {
            await this._revertForExistingFile();
        }
        catch (e) {
            // Ignore
        }
    }
}


/**
 * File action that deletes a file. The file to be deleted is temporarily renamed 
 * and is only deleted when finalized. If the file does not exist this does not do 
 * anything.
 * @class
 */
export class DeleteFileAction extends FileAction {
    /**
     * @constructor
     * @param {string} pathName The full path name of the file to be deleted.
     */
    constructor(pathName) {
        super(pathName);
        this._isDeleteExistingFile = true;
    }

    async _applyMainAction() {}

    async _finalizeMainAction() {}

    async _revertMainAction() {}
}


/**
 * File action for renaming a file. If the file does not exist nothing happens.
 * <p>
 * Note that {@link FileAction~setBackupFileName} has no effect on the original file.
 * @class
 */
export class RenameFileAction extends FileAction {
    /**
     * @constructor
     * @param {string} oldPathName The full path name of the file to be renamed.
     * @param {string} newFileName The base file name or full path name of the 
     * renamed file.
     */
    constructor(oldPathName, newFileName) {
        super();
        this._oldPathName = oldPathName;
        this._newPathName = getFullPathName(newFileName, oldPathName);
    }

    getOldPathName() { return this._oldPathName; }
    getNewPathName() { return this._newPathName; }


    async apply() {
        if (await asyncFileExists(this._oldPathName)) {
            if (await asyncFileExists(this._newPathName)) {
                this._existingFileAction = new DeleteFileAction(this._newPathName);
                await this._existingFileAction.apply();
            }

            await fsPromises.rename(this._oldPathName, this._newPathName);
        }
    }

    async finalize() {
        if (this._existingFileAction) {
            await this._existingFileAction.finalize();
            this._existingFileAction = undefined;
        }
    }

    async revert() {
        try {
            if (await asyncFileExists(this._newPathName)) {
                await fsPromises.rename(this._newPathName, this._oldPathName);
            }
        }
        catch (e) {
            // Ignore
        }

        if (this._existingFileAction) {
            await this._existingFileAction.revert();
            this._existingFileAction = undefined;
        }
    }
}


/**
 * File action for replacing an existing file or creating a new file (i.e. what 
 * happens when the original file doesn't exist). The replacement is done via a 
 * callback function.
 * @class
 */
export class ReplaceFileAction extends FileAction {
    /**
     * Callback called by {@link ReplaceFileAction#apply}, 
     * {@link ReplaceFileAction#finalize}, or {@link ReplaceFileAction#revert} to 
     * handle the actual creation of the file, extra finalization, or reversion.
     * For apply() his should handle creating, writing, and closing the file.
     * @callback ReplaceFileAction~Callback
     * @async
     * @param {string} pathName The full path name of the file to be created/written.
     * @returns {Promise}   A promise should be returned, the callbacks are treated 
     * as <code>async</code> functions.
     */

    /**
     * @typedef {Object} ReplaceFileAction~Callbacks
     * @property {ReplaceFileAction~Callback} [applyCallback]   The callback to be 
     * called during {@link ReplaceFileAction#apply}.
     * @property {ReplaceFileAction~Callback} [finalizeCallback]    The callback to 
     * be called during {@link ReplaceFileAction#finalize}.
     * @property {ReplaceFileAction~Callback} [revertCallback]  The callback to be 
     * called during {@link ReplaceFileAction#revert}.
     */

    /**
     * @constructor
     * @param {string} pathName The full path name of the file to be created.
     * @param {ReplaceFileAction~Callback|ReplaceFileAction~Callbacks} callback 
     * Either a single {@link ReplaceFileAction~Callback}, in which
     * case it is the callback to be called during {@link ReplaceFileAction#apply}, 
     * or a {@link ReplaceFileAction~Callbacks} object containing the various callbacks.
     */
    constructor(pathName, callbacks) {
        super(pathName);
        this._isDeleteExistingFile = true;
        if (typeof callbacks === 'function') {
            this._applyCallback = callbacks;
        }
        else {
            this._applyCallback = callbacks.applyCallback;
            this._finalizeCallback = callbacks.finalizeCallback;
            this._revertCallback = callbacks.revertCallback;
        }
    }

    getApplyCallback() { return this._applyCallback; }
    getFinalizeCallback() { return this._finalizeCallback; }
    getRevertCallback() { return this._revertCallabck; }

    setNoFileBackupFileName(fileName, callback) {
        this._noFileBackupFileName = fileName;
        this._noFileBackupFileCallback = callback;
    }

    async _applyMainAction() {
        if (this._applyCallback) {
            await this._applyCallback(this._pathName);
        }

        if (this._noFileBackupFileName && !this._backupPathName) {
            if (await asyncFileExists(this._pathName)) {
                const noFileBackupPathName 
                    = getFullPathName(this._noFileBackupFileName, this._pathName);
                this._noFileBackupAction = new ReplaceFileAction(noFileBackupPathName,
                    async (pathName) => { await fsPromises.writeFile(pathName, ''); });
                await this._noFileBackupAction.apply();

                if (this._noFileBackupFileCallback) {
                    this._noFileBackupFileCallback(this._noFileBackupFileName, 
                        noFileBackupPathName);
                }
            }
        }
    }

    async _finalizeMainAction() {
        if (this._finalizeCallback) {
            await this._finalizeCallback(this._pathName);
        }
        if (this._noFileBackupAction) {
            await this._noFileBackupAction.finalize();
            this._noFileBackupAction = undefined;
        }
    }

    async _revertMainAction() {
        if (this._revertCallback) {
            try {
                await this._revertCallback(this._pathName);
            }
            catch (e) {
                // Ignore
            }
        }

        try {
            if (await asyncFileExists(this._pathName)) {
                await fsPromises.unlink(this._pathName);
            }
        }
        catch (e) {
            // Ignore
        }

        if (this._noFileBackupAction) {
            try {
                await this._noFileBackupAction.revert();
            }
            catch (e) {
                // Ignore
            }
        }
    }
}


/**
 * File action that keeps an existing file. If {@FileAction~setBackupFileName} is 
 * called with a file name before the action is applied, and the file exists, 
 * the existing file will be copied to the backup file name (actually, the existing
 * file is renamed to the backup file name, and then a copy of the backup file is
 * made with the original name). If the file does not exist or no backup file name 
 * has been set nothing happens.
 */
export class KeepFileAction extends FileAction {
    async _applyMainAction() {
        if (this._backupPathName) {
            // We need to duplicate the backup file back to us.
            await fsPromises.copyFile(this._backupPathName, this._pathName);
            this._copiedFileName = this._pathName;
        }
    }

    async _finalizeMainAction() {
        this._copiedFileName = undefined;
    }

    async _revertMainAction() {
        if (await asyncFileExists(this._copiedFileName)) {
            try {
                await fsPromises.unlink(this._copiedFileName);
            }
            catch (e) {
                // Ignore
            }
        }
    }
}


/**
 * File action that creates a copy of a file.
 */
export class CopyFileAction extends FileAction {
    /**
     * @constructor
     * @param {string} originalFileName The name of the file to be copied.
     * @param {string} newFileName The name of the copy of originalFileName. One or 
     * both of originalFileName and newFileName should contain a path.
     */
    constructor(originalFileName, newFileName) {
        super(getFullPathName(newFileName, originalFileName));
        this._originalPathName = getFullPathName(originalFileName, newFileName);
    }

    async _applyMainAction() {
        await fsPromises.copyFile(this._originalPathName, this._pathName);
        this._copiedFileName = this._pathName;
    }

    async _finalizeMainAction() {
    }

    async _revertMainAction() {
        if (await asyncFileExists(this._copiedFileName)) {
            try {
                await fsPromises.unlink(this._copiedFileName);
            }
            catch (e) {
                // Ignore
            }
        }
    }
}


/**
 * Applies and finalizes all the {@FileAction}s in an array of file actions, 
 * calling {@link FileAction#revert} on exceptions.
 * <p>
 * {@link FileAction#apply} is called in the order of appearance of the file actions 
 * in the list.
 * {@link FileAction#finalize} and {@link FileAction#revert} are called in the 
 * reverse order of appearance in the list.
 * @param {FileAction[]} fileActions The array of file actions to be performed in order.
 */
export async function performFileActions(fileActions) {
    try {
        for (let i = 0; i < fileActions.length; ++i) {
            await fileActions[i].apply();
        }

        // Note we finalize and revert in the reverse order of apply calls.
        for (let i = fileActions.length - 1; i >= 0; --i) {
            await fileActions[i].finalize();
        }
    }
    catch (e) {
        for (let i = fileActions.length - 1; i >= 0; --i) {
            try {
                await fileActions[i].revert();
            }
            catch (e) {
                // Ignore
            }
        }

        throw e;
    }
}
