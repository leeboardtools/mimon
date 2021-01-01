import { asyncImportXMLFile } from './XMLFileImporter';
import { getAppPathName } from '../engine/Engine';
import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as path from 'path';
import { EngineAccessor } from './EngineAccess';

test('XMLFileImporter-asyncImportXMLFile', async () => {
    const baseDir = await createDir('XMLFileImporter');

    try {
        await cleanupDir(baseDir, true);

        const mimonPathName = path.join(baseDir, 'asyncImportXMLFile');

        const accessor = new EngineAccessor();
        
        const xmlPathName = path.join(getAppPathName(), 'test.data', 'jGnash Test.xml');
        await asyncImportXMLFile(accessor, xmlPathName, mimonPathName);

        console.log('All Done');


        //
        // All done...
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});
