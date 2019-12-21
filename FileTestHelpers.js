import { getFullPathsInDir } from './Files';

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
    const files = await getFullPathsInDir(dir);
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
