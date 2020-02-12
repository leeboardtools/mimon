const path = require('path');
const fsPromises = require('fs').promises;

/**
 * Determines if a file exists.
 * @async
 * @param {string} fileName The name of the file to check for.
 * @returns {Promise<boolean>}  <code>true</code> if the file exists.
 */
export async function fileExists(fileName) {
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
 * @param {string[]|string} fileNames The array of file names to check.
 * @returns {boolean}   <code>true</code> if all the files in fileNames exist.
 */
export async function allFilesExist(fileNames) {
    if (typeof fileNames === 'string') {
        return fileExists(fileNames);
    }

    for (const fileName of fileNames) {
        if (!await fileExists(fileName)) {
            return false;
        }
    }

    return true;
}

/**
 * Retrieves all the files in a directory, prepending the directory name to the 
 * file names.
 * @param {string} dir
 * @returns {string[]}  Array containing the path names to the files.
 * @async
 */
export async function getFullPathsInDir(dir) {
    const files = await fsPromises.readdir(dir);
    return files.map((file) => path.join(dir, file));
}

/**
 * Retrieves the base file names of all the files, but no directories, in a directory.
 * @param {string} dir The directory of interest.
 * @returns {string[]} Array containing the base file names (name.txt) of all the 
 * files in dir, no directories.
 */
export async function getFilesOnlyInDir(dir) {
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
 */
export async function getDirectoriesOnlyInDir(dir) {
    const dirEnts = await fsPromises.readdir(dir, { withFileTypes: true });
    const names = [];
    dirEnts.forEach((dirEnt) => {
        if (dirEnt.isDirectory()) {
            names.push(dirEnt.name);
        }
    });
    return names;
}
