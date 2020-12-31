import { cleanupDir } from './FileTestHelpers';

import * as JSONGzip from './JSONGzipFiles';
import * as path from 'path';
import * as os from 'os';
import { promises as fsPromises } from 'fs';


async function createDir(dir) {
    const baseDir = path.join(os.tmpdir(), dir);
    try {
        await fsPromises.mkdir(baseDir);
    }
    catch (e) {
        // Do nothing
    }
    return baseDir;
}

test('JSONGzip', async () => {
    const baseDir = await createDir('JSONGzip');

    try {
        await cleanupDir(baseDir, true);

        const refA = {
            abc: 'Abc',
            array: [1, 2, 3],
            def: {
                ghi: 'JKL'
            }
        };

        const fileA = path.join(baseDir, 'fileA.gz');

        await JSONGzip.writeToFile(refA, fileA);

        const testA = await JSONGzip.readFromFile(fileA);
        expect(testA).toEqual(refA);
    }
    finally {
        await cleanupDir(baseDir);
    }

});
