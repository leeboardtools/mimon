import { asyncGetFullPathsInDir, asyncGetDirectoriesOnlyInDir, } from './Files';

const os = require('os');
const path = require('path');
const fsPromises = require('fs').promises;

export async function createDir(dir) {
    const baseDir = path.join(os.tmpdir(), dir);
    try {
        await fsPromises.mkdir(baseDir);
    }
    catch (e) {
        // Ignore
    }
    return baseDir;
}

export async function writeFile(fileName, contents) {
    const fileHandle = await fsPromises.open(fileName, 'w');
    await fileHandle.write(contents);
    await fileHandle.close();
}

export async function expectFileToBe(fileName, contents) {
    const fileHandle = await fsPromises.open(fileName, 'r');
    const fileContents = await fileHandle.readFile({ encoding: 'utf8' });
    await fileHandle.close();
    expect(fileContents).toEqual(contents);
}

export async function cleanupDir(dir, keepDir) {
    const dirs = await asyncGetDirectoriesOnlyInDir(dir);
    for (let innerDir of dirs) {
        try {
            innerDir = path.join(dir, innerDir);
            await cleanupDir(innerDir, false);
        }
        catch (e) {
            // Ignore
        }
    }

    const files = await asyncGetFullPathsInDir(dir);
    for (const file of files) {
        try {
            await fsPromises.unlink(file);
        }
        catch (e) {
            // Ignore
        }
    }
    try {
        if (!keepDir) {
            await fsPromises.rmdir(dir);
        }
    }
    catch (e) {
        // Ignore
    }
}
