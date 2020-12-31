import { asyncImportXMLFile } from './XMLFileImporter';
import { getAppPathName } from '../engine/Engine';
import * as path from 'path';

test('XMLFileImporter-asyncImportXMLFile', async () => {
    const xmlPathName = path.join(getAppPathName(), 'test.data', 'jGnash Test.xml');
    console.log({
        xmlPathName: xmlPathName,
    });
});
