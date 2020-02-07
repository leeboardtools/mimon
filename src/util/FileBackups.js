import { performFileActions, DeleteFileAction, CopyFileAction } from './FileActions';
import { getFilesOnlyInDir, fileExists } from './Files';
import { userError } from './UserMessages';

const path = require('path');

const yearFormatter = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    useGrouping: false,
    minimumIntegerDigits: 4,
});

const monthFormatter = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    useGrouping: false,
    minimumIntegerDigits: 2,
});

const dayFormatter = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    useGrouping: false,
    minimumIntegerDigits: 2,
});

const NAME_PREFIX = 'BAK_';
const NAME_SEP = '_';
const ZERO_CHAR_CODE = '0'.charCodeAt(0);

/**
 * Simple parser of a decimal integer that returns <code>undefined</code> if the 
 * text contains any invalid characters.
 * @param {string} text The text to parse.
 * @returns {(number|undefined)}  The parsed integer or <code>undefined</code> if 
 * the text contained any invalid characters. The only valid characters are optional 
 * leading whitespace, followed by an optional '-' sign, and then the digits '0' 
 * through '9'.
 */
export function parseDecimalInteger(text) {
    let value = 0;
    text = text.trimStart();
    let i = 0;
    let sign;
    if (text.charAt(i) === '-') {
        sign = -1;
        ++i;
    }
    else {
        sign = 1;
    }
    if (i >= text.length) {
        return;
    }

    for (; i < text.length; ++i) {
        const digit = text.charCodeAt(i) - ZERO_CHAR_CODE;
        if ((digit < 0) || (digit > 9)) {
            return;
        }

        value = value * 10 + digit;
    }

    return sign * value;
}

/**
 * Makes sure a date can be compared with other backup dates. Basically strips off 
 * the time info.
 * @param {Date} date The date to be used.
 * @returns {Date}
 */
export function cleanBackupDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Default function for generating the name for a backup given the file name and 
 * a date.
 * @param {string} fileName The name of the file to be backed up. If the name 
 * contains a path the path will be kept.
 * @param {Date} date The date associated with the backup.
 * @returns {string}    The backup file name.
 */
export function defMakeBackupFileName(fileName, date, prefix) {
    prefix = prefix || NAME_PREFIX;
    const parts = path.parse(fileName);
    parts.base = prefix + yearFormatter.format(date.getFullYear()) 
        + monthFormatter.format(date.getMonth() + 1) 
        + dayFormatter.format(date.getDate())
        + NAME_SEP + parts.base;
    return path.format(parts);
}


/**
 * Object returned when parsing a backup file name.
 * @typedef {object}    FilesBackup~NameParts
 * @property {Date} date    The date associated with the backup.
 * @property {string}   originalFileName   The original base file name (name.ext).
 */

/**
 * Default funciton for parsing a backup file name into the original file name and 
 * the date.
 * @param {string} fileName The file name to parse.
 * @returns {(FileBackup~NameParts|undefined)}  The backup parts or 
 * <code>undefined</code> if the file name is not a recognizable backup file name.
 */
export function defParseBackupFileName(fileName, prefix) {
    prefix = prefix || NAME_PREFIX;
    const parts = path.parse(fileName);
    let base = parts.base;
    if (!base.startsWith(prefix)) {
        return;
    }
    base = base.slice(prefix.length);

    const sepIndex = base.indexOf('_');
    if (sepIndex < 0) {
        return;
    }

    const digitsText = base.slice(0, sepIndex);
    if (digitsText.length < 8) {
        return;
    }

    const day = parseDecimalInteger(digitsText.slice(-2));
    const month = parseDecimalInteger(digitsText.slice(-4, -2));
    const year = parseDecimalInteger(digitsText.slice(0, -4));
    if (!day || !month || (year === undefined)) {
        return;
    }

    // Make sure the date is valid.
    const date = new Date(year, month - 1, day);
    if ((date.getFullYear() !== year) 
        || ((date.getMonth() + 1) !== month) 
        || (date.getDate() !== day)) {
        return;
    }

    const originalName = base.slice(sepIndex + 1);
    if (!originalName) {
        return;
    }

    return {
        date: new Date(year, month - 1, day),
        originalFileName: originalName,
    };
}


/**
 * A class for creating dated backups of existing files when they are modified via 
 * {@link FileAction}s and restoring them,
 * also via {@link FileAction}s.
 * <p>
 * Note that the backup system currently requires all files be in the same directory.
 * <p>
 * To perform a backup, you first build an array of the {@link FileAction}s that will 
 * be performed to modify the files of interest. You then pass this array on to 
 * {@link FileBackups#applyToFileActions}.
 * <p>
 * You can then apply the file actions. When the file actions are applied, the 
 * appropriate backup files are created.
 * <p>
 * Backup files are created by renaming the original files with prefix constructed 
 * from the backup date, of the form 'BAK_20191011', which would represent a backup 
 * for Octobler 11, 2019.
 * <p>
 * If for some reason the file actions are reverted, the new backup files will also 
 * be reverted.
 * <p>
 * When it comes time to restore a backup, you call {@link FileBackups#getBackups} 
 * to obtain a list of the available
 * backups. You can then perform the actual restore via 
 * {@link FileBackups#restoreBackup} or obtain a list of {@link FileAction}s
 * to perform the backup later via {@link FileBackups#generateRestoreBackupFileActions}.
 * <p>
 * Backups are only made so there is one backup set for a given date. For a given 
 * date only the latest backup is kept.
 * <p>
 * The default maximum number of backups is 5, the {@link FileBackups~Options} 
 * object passed to the constructor can be used to change that. Only the newest 
 * backups are kept. Old backups are automatically removed via actions added to the 
 * file action list in the call to {@link FileBackups#applyToFileActions}.
 * @class
 */
export class FileBackups {

    /**
     * The options supported by the constructor.
     * @typedef {object} FileBackups~Options
     * @property {number}   [maxBackups=5]  The maximum number of backups to support, 
     * 0 disables backups.
     * @property {Function} [makeBackupFileName]  The function for generating the 
     * backup file name.
     * @property {Function} [parseBackupFileName=]    The function for parsing the 
     * backup file name.
     */

    /**
     * @constructor
     * @param {FileBackups~Options} [options]   Optional options.
     */
    constructor(options) {
        options = options || {};
        this._maxBackups = (options.maxBackups !== undefined) ? options.maxBackups : 5;
        this._makeBackupFileName = options.makeBackupFileName || defMakeBackupFileName;
        this._parseBackupFileName = options.parseBackupFileName || defParseBackupFileName;
    }

    /**
     * @returns {number}    The maximum number of backups to keep.
     */
    getMaxBackups() { return this._maxBackups; }

    /**
     * Sets the maximum number of backups.
     * @param {number} maxBackups The maximum number of backups. Existing 
     * available backups are not automatically adjusted.
     */
    setMaxBackups(maxBackups) { this._maxBackups = maxBackups; }


    /**
     * The main backup generation and management method. This utilizes an array of 
     * {@link FileAction}s representing the actions that will modify the set of files 
     * for backing up.
     * <p>
     * If a backup is to be generated, {@link FileAction~setBackupFileName} will be 
     * called for each file action with an appropriate backup file name.
     * <p>
     * Additionally, if there are more backups available than 
     * {@link FileBackups~getMaxBackups}, {@link DeleteFileAction}s will be added to 
     * the file action list.
     * @param {FileAction[]} fileActions The original list of file actions. Actions 
     * for cleaning up existing backups may be added to this list.
     * @param {Date} [backupDate=new Date()]    Optional date for the backup, 
     * intended only for testing.
     * @returns {FileAction[]}  fileActions
     */
    async applyToFileActions(fileActions, backupDate) {
        if (!this._maxBackups) {
            return fileActions;
        }

        let dir;
        const date = cleanBackupDate(backupDate || new Date());
        const myBackupFileNames = new Set();
        fileActions.forEach((fileAction) => {
            const pathName = fileAction.getPathName();
            if (pathName) {
                if (!dir) {
                    const parts = path.parse(pathName);
                    dir = parts.dir;
                }
                const backupFileName = this._makeBackupFileName(pathName, date);
                myBackupFileNames.add(backupFileName);
                fileAction.setBackupFileName(backupFileName);
            }
        });

        if (dir) {
            // Check for existing backup files, we want to get rid of those before 
            // we do anything else.
            const existingBackups = await this.getBackups(dir);
            const backupDate = new Date(date.getFullYear(), date.getMonth(), 
                date.getDate());
            for (const { date, fileNames } of existingBackups) {
                if (date.valueOf() === backupDate.valueOf()) {
                    for (const { pathName } of fileNames) {
                        const { base } = path.parse(pathName);
                        if (!myBackupFileNames.has(base)) {
                            fileActions.splice(0, 0, new DeleteFileAction(pathName));
                        }
                    }
                }
            }

            const cleanupActions 
                = await this.generateCleanupBackupFileActions(dir, date);
            cleanupActions.forEach((action) => fileActions.push(action));
        }

        return fileActions;
    }

    /**
     * @typedef {object} FileBackups~FileNames
     * @property {string}   pathName    The full path name of the backup file.
     * @property {string}   originalFileName    The base file name (name.ext) of 
     * the original file.
     */

    /**
     * @typedef {object} FileBackups~BackupSet
     * @property {Date} date    The date of the backup set.
     * @property {FileBackups~FileNames[]}  fileNames An array containing the file 
     * names for each backup file in the backup set.
     */

    /**
     * Retrieves an array containing backup objects representing the available backups.
     * @param {string} dir The directory containing the backups.
     * @returns {FileBackups~BackupSet[]}   An array of backup sets. The array is 
     * sorted with the newest backup sets at lower indices.
     */
    async getBackups(dir) {
        const filesInDir = await getFilesOnlyInDir(dir);
        const backupsByDate = new Map();
        filesInDir.forEach((fileName) => {
            const nameParts = this._parseBackupFileName(fileName);
            if (nameParts) {
                const key = nameParts.date.valueOf();
                if (!backupsByDate.has(key)) {
                    backupsByDate.set(key, [nameParts.date, []]);
                }
                const backupNames = {
                    pathName: path.join(dir, fileName),
                    originalFileName: nameParts.originalFileName,
                };
                const value = backupsByDate.get(key);
                value[1].push(backupNames);
            }
        });

        const entries = Array.from(backupsByDate.entries());
        entries.sort((a, b) => b[0].valueOf() - a[0].valueOf());

        const result = [];
        entries.forEach((entry) => {
            const [, value] = entry;
            const [date, backupNames] = value;
            result.push({
                date: date,
                fileNames: backupNames,
            });
        });

        return result;
    }


    /**
     * Generates a list of {@link FileActions}s needed to restore a backup set. 
     * The backup set should have been one returned by {@link FileBackups#getBackups}.
     * @param {FileBackups~BackupSet} backupSet The backup set to be restored.
     * @param {string[]}    [governedFiles] Optional array of files which are 
     * governed by the backups. If a file is not being replaced by a backup file, 
     * a delete action will be added. These should be base file names (name.ext)
     * @returns {FileAction[]}  The array of file actions for the restore.
     */
    async generateRestoreBackupFileActions(backupSet, governedFiles) {
        const fileActions = [];
        governedFiles = new Set(governedFiles);

        // Make sure all the files exist.
        let parts;
        for (const { pathName, originalFileName } of backupSet.fileNames) {
            if (!await fileExists(pathName)) {
                throw userError('FileBackups-file_not_exist', pathName);
            }
            parts = path.parse(pathName);
            fileActions.push(new CopyFileAction(pathName, originalFileName));
            governedFiles.delete(originalFileName);
        }

        if (governedFiles.size) {
            const allFileActions = [];
            governedFiles.forEach((fileName) => {
                parts.base = fileName;
                const pathName = path.format(parts);
                allFileActions.push(new DeleteFileAction(pathName));

            });

            return allFileActions.concat(fileActions);
        }

        return fileActions;
    }

    /**
     * Helper for restoring files from a backup set.
     * @param {FileBackups~BackupSet} backupSet The backup set to be restored.
     */
    async restoreBackup(backupSet, existingFileNames) {
        const fileActions = await this.generateRestoreBackupFileActions(
            backupSet, existingFileNames);
        await performFileActions(fileActions);
    }


    /**
     * Generates {@link FileAction}s for deleting the files of a backup set. 
     * The backup set should have been one returned by {@link FileBackups#getBackups}.
     * @param {FileBackups~BackupSet} backupSet The backup set to be deleted.
     * @returns {FileAction[]} The array of file actions to be performed to remove 
     * the backup set.
     */
    async generateDeleteBackupFileActions(backupSet) {
        const fileActions = [];
        const { fileNames } = backupSet;
        fileNames.forEach((fileNamePair) => fileActions.push(
            new DeleteFileAction(fileNamePair.pathName)));
        return fileActions;
    }

    /**
     * Helper for deleting a backup set.
     * @param {FileBackups~BackupSet} backupSet The backup set to be deleted.
     */
    async deleteBackup(backupSet) {
        const fileActions = await this.generateDeleteBackupFileActions(backupSet);
        await performFileActions(fileActions);
    }


    /**
     * Generates {@link FileAction}s as needed for deleting backups that exceed the 
     * backup limits.
     * @param {string} dir The directory containing the backups.
     * @returns {FileAction[]}  The array of file actions to be performed for 
     * cleaning up.
     */
    async generateCleanupBackupFileActions(dir, currentBackupDate) {
        let fileActions = [];

        if ((this._maxBackups > 0) && dir) {
            // Add actions for deleting old backups.
            const backups = await this.getBackups(dir);

            // If a current backup date is given, we want to remove that backup from 
            // the backup list.
            if (currentBackupDate) {
                currentBackupDate = cleanBackupDate(currentBackupDate);
                for (let i = 0; i < backups.length; ++i) {
                    if (backups[i].date.valueOf() === currentBackupDate.valueOf()) {
                        backups.splice(i, 1);
                        break;
                    }
                }
            }

            const endBackupIndex = this._maxBackups - 1;
            for (let i = backups.length - 1; i >= endBackupIndex; --i) {
                console.log('Deleting Backup: ' + backups[i].date);
                fileActions = fileActions.concat(
                    await this.generateDeleteBackupFileActions(backups[i]));
            }
        }

        return fileActions;
    }

    /**
     * Helper for cleaning up extra backup sets. Normally the cleanup is done via 
     * extra {@link FileAction}s being added to {@link FileBackups#applyToFileActions}.
     * @param {string} dir The directory containing the backups.
     */
    async cleanupBackupFiles(dir) {
        const fileActions = await this.generateCleanupBackupFileActions(dir);
        await performFileActions(fileActions);
    }

}
