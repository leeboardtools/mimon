import { createDir, cleanupDir } from '../util/FileTestHelpers';
import { EngineAccessor } from './EngineAccess';

const path = require('path');


//
//---------------------------------------------------------
//
test('EngineAccessor-fileAccess', async () => {
    const baseDir = await createDir('EngineAccessor-fileAccess');

    try {
        await cleanupDir(baseDir, true);

        const accessor = new EngineAccessor();

        const fileNameFilters = accessor.getFileNameFilters();

        expect(accessor.getFileFactoryCount()).toBeGreaterThanOrEqual(1);
        expect(fileNameFilters.length).toBeGreaterThanOrEqual(1);
        expect(accessor.getFileNameFiltersForFileFactoryIndex(0).length)
            .toBeGreaterThanOrEqual(1);

        expect(accessor.getAccountingFilePathName()).toBeUndefined();

        expect(accessor.getFileFactoryIndexFromFileNameFilter(fileNameFilters[0]))
            .toEqual(0);
        
        expect(accessor.isFileFactoryAtIndexDirBased(0)).toBeTruthy();
        expect(await accessor.asyncIsPossibleAccountingFile('MissingDir', 0)).toBeFalsy();


        const pathName1 = path.join(baseDir, 'test1');
        expect(await accessor.asyncCanCreateAccountingFile(pathName1)).toBeTruthy();

        // Shouldn't exist, asyncOpenAccountingFile() should fail.
        await expect(accessor.asyncOpenAccountingFile(pathName1)).rejects.toThrow();

        await accessor.asyncCreateAccountingFile(pathName1);

        expect(accessor.getAccountingFilePathName()).toEqual(pathName1);
        expect(accessor.getAccountingFileFactoryIndex()).toEqual(0);

        await accessor.asyncCloseAccountingFile();
        expect(accessor.getAccountingFilePathName()).toBeUndefined();
        expect(accessor.getAccountingFileFactoryIndex()).toBeUndefined();



        // Now we can open the file.
        await accessor.asyncOpenAccountingFile(pathName1);

        expect(accessor.getAccountingFilePathName()).toEqual(pathName1);
        expect(accessor.getAccountingFileFactoryIndex()).toEqual(0);

        await accessor.asyncCloseAccountingFile();
        expect(accessor.getAccountingFilePathName()).toBeUndefined();
        expect(accessor.getAccountingFileFactoryIndex()).toBeUndefined();


        // Now try save as.
        /*
        Not yet implemented by JSONGzipAccountingFile...

        const pathName2 = path.join(baseDir, 'saveAs-test');
        await access.asyncSaveAccountingFileAs(pathName2);

        expect(access.getAccountingFilePathName()).toEqual(pathName2);
        expect(access.getAccountingFileFactoryIndex()).toEqual(0);

        await access.asyncCloseAccountingFile();
        */

    }
    finally {
        // await cleanupDir(baseDir);
    }

});


