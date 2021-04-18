import * as path from 'path';
import { promises as fsPromises } from 'fs';


/**
 * Determines if a file or directory exists.
 * @async
 * @param {string} pathName The name of the file/directory to check for.
 * @returns {Promise<boolean>}  <code>true</code> if the file exists.
 */
export async function asyncFileOrDirExists(pathName) {
    try {
        if (!pathName) {
            return false;
        }
        const stat = await fsPromises.stat(pathName);
        return stat.isFile() || stat.isDirectory();
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
    }
}

/**
 * Determines if a directory exists.
 * @async
 * @param {string} dirName The name of the file to check for.
 * @returns {Promise<boolean>}  <code>true</code> if the file exists.
 */
export async function asyncDirExists(dirName) {
    try {
        if (!dirName) {
            return false;
        }
        const stat = await fsPromises.stat(dirName);
        return stat.isDirectory();
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
    }
}

/**
 * Determines if a file exists.
 * @async
 * @param {string} fileName The name of the file to check for.
 * @returns {Promise<boolean>}  <code>true</code> if the file exists.
 */
export async function asyncFileExists(fileName) {
    try {
        if (!fileName) {
            return false;
        }
        const stat = await fsPromises.stat(fileName);
        return stat.isFile();
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
    }
}


/**
 * Determines if all of a set of file names exist.
 * @async
 * @param {string[]|string} fileNames The array of file names to check.
 * @returns {boolean}   <code>true</code> if all the files in fileNames exist.
 */
export async function asyncAllFilesExist(fileNames) {
    if (typeof fileNames === 'string') {
        return asyncFileExists(fileNames);
    }

    for (const fileName of fileNames) {
        if (!await asyncFileExists(fileName)) {
            return false;
        }
    }

    return true;
}


/**
 * Retrieves a unique file name by appending '-#' on to a base name until
 * a file/directory does not exist with that name.
 * @param {string} baseDir 
 * @param {string} initialName 
 * @returns {string}    The unique name, does not include the directory.
 * @async
 */
export async function asyncGetUniqueFileName(baseDir, initialName) {
    let name = initialName;
    let i = 0;
    while (await asyncFileOrDirExists(path.join(baseDir, name))) {
        ++i;
        name = initialName + '-' + i;
    }

    return name;
}


/**
 * Retrieves all the files in a directory, prepending the directory name to the 
 * file names.
 * @param {string} dir
 * @returns {string[]}  Array containing the path names to the files.
 * @async
 */
export async function asyncGetFullPathsInDir(dir) {
    const files = await fsPromises.readdir(dir);
    return files.map((file) => path.join(dir, file));
}

/**
 * Retrieves the base file names of all the files, but no directories, in a directory.
 * @param {string} dir The directory of interest.
 * @returns {string[]} Array containing the base file names (name.txt) of all the 
 * files in dir, no directories.
 */
export async function asyncGetFilesOnlyInDir(dir) {
    const dirEnts = await fsPromises.readdir(dir, { withFileTypes: true });
    const names = [];
    dirEnts.forEach((dirEnt) => {
        if (dirEnt.isFile()) {
            names.push(dirEnt.name);
        }
    });
    return names;
}

/**
 * Retrieves the base file names of all the directories, but no files, in a directory.
 * @param {string} dir The directory of interest.
 * @returns {string[]} Array containing the base file names (name.txt) of all the 
 * directories in dir, no files.
 * @async
 */
export async function asyncGetDirectoriesOnlyInDir(dir) {
    const dirEnts = await fsPromises.readdir(dir, { withFileTypes: true });
    const names = [];
    dirEnts.forEach((dirEnt) => {
        if (dirEnt.isDirectory()) {
            names.push(dirEnt.name);
        }
    });
    return names;
}


/**
 * Determines if a directory can be created, this does so by actually trying to create
 * the directories, cleaning up afterward.
 * @param {string} dir The directory of interest.
 * @returns {boolean}   <code>true</code> if dir can be created or already exists.
 * @async
 */
export async function asyncCanCreateDir(dir) {
    if (await asyncDirExists(dir)) {
        return true;
    }

    // We need to figure out what needs creating.
    dir = path.normalize(dir);
    const dirs = [];
    let parts = path.parse(dir);
    while (parts.base) {
        dirs.push(parts.base);
        parts = path.parse(parts.dir);
    }

    const createdDirs = [];
    try {
        dir = '';
        for (let i = dirs.length - 1; i >= 0; --i) {
            dir = path.join(dir, dirs[i]);
            if (!await asyncDirExists(dir)) {
                await fsPromises.mkdir(dir);
                createdDirs.push(dir);
            }
        }
        return true;
    }
    catch (e) {
        return e;
    }
    finally {
        for (let i = createdDirs.length - 1; i >= 0; --i) {
            try {
                await fsPromises.rmdir(createdDirs[i]);
            }
            catch (e) {
                // Ignore failures, not much we can do...
            }
        }
    }
}


/**
 * Splits a path name into an array containing the individual directories
 * and file name.
 * @param {string} pathName
 * @returns {string[]}
 */
export function splitDirs(pathName) {
    if (pathName) {
        let parts = pathName.split(path.sep);
        if (parts.length && !parts[0]) {
            parts.splice(0, 1);
        }
        return parts;
    }
    return [];
}


// Copied from 
// https://github.com/sindresorhus/filename-reserved-regex/blob/main/index.js...
// eslint-disable-next-line no-control-regex
const regExFileNameReserved = /[<>:"/\\|?*\u0000-\u001F]/g;

/**
 * Simple conversion of a string to a valid file name.
 * @param {string} fileName 
 * @param {string} [replacement='_']
 * @returns {string}
 */
export function makeValidFileName(fileName, replacement = '_') {
    if (fileName) {
        fileName = fileName.replace(regExFileNameReserved, replacement);
    }
    return fileName;
}


const driveLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/**
 * Retrieves an array containing the available drive letters including the ':'.
 * If not running on Windows then an empty array is returned.
 * @returns {string[]}
 * @async
 */
export async function asyncGetAvailableDrives() {
    const drives = [];
    if (navigator.appVersion.indexOf('Win') >= 0) {
        // Possible drives are from C through Z...
        for (let i = 0; i < driveLetters.length; ++i) {
            try {
                const stat = await fsPromises.stat(driveLetters[i] + ':\\');
                if (stat.isDirectory()) {
                    drives.push(driveLetters[i] + ':');
                }
            }
            catch (e) {
                // 
            }
        }
    }
    return drives;
}
