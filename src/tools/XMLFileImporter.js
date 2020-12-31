import { userError } from '../util/UserMessages';
import * as path from 'path';
import * as fs from 'fs';
import * as sax from 'sax';


class XMLFileImporterImpl {
    constructor(accessor) {
        this._accessor = accessor;

        this._state = 'START';
    }

    onError(e) {
        console.log('error! ' + e);
    }

    onOpenTag_START(tag) {
        if (tag.name === 'OBJECT-STREAM') {
            this._state = 'STARTED';
        }
    }

    onOpenTag(tag) {
        switch (this._state) {
        case 'START' :
            break;

        default :
            console.log('opentag: ' + tag.name);
            break;

        }
    }

    onText(text) {
        console.log('text: ' + text);
    }

    onCloseTag(tagName) {
        console.log('closeTag: ' + tagName);
    }

    onEnd() {
        console.log('end');
    }
}


/**
 * Imports an XML file into the current project in an accessor.
 * @param {EngineAccessor} accessor 
 * @param {string} fileNameToImport 
 */
export async function asyncImportXMLFile(accessor, fileNameToImport) {
    const strict = false;
    const saxOptions = {};
    const saxStream = sax.createStream(strict, saxOptions);

    const importer = new XMLFileImporterImpl(accessor);

    saxStream.on('error', (e) => {
        importer.onError(e);
        this._parser.error = null;
        this._parser.resume();
    });
    saxStream.on('text', (text) => {
        importer.onText(text);
    });
    saxStream.on('opentag', (tag) => {
        importer.onOpenTag(tag);
    });
    saxStream.on('closetag', (tagName) => {
        importer.onCloseTag(tagName);
    });
    saxStream.on('end', () => {
        importer.onEnd();
    });

    return new Promise((resolve, reject) => {
        fs.createReadStream(fileNameToImport)
            .pipe(saxStream)
            .on('error', (err) => reject(err))
            .on('end', () => resolve());
    });
}


/**
 * File importer for XML files.
 */
export class XMLFileImporter {
    constructor(accessor) {
        this._accessor = accessor;
    }


    isFileNamePossibleImport(filePathName) {
        const ext = path.extname(filePathName).toUpperCase();
        if (ext === '.XML') {
            return true;
        }
    }


    isDirNamePossibleImport(dirPathName) {
    }


    async asyncImportFile(fileNameToImport) {
        return asyncImportXMLFile(this._accessor, fileNameToImport);
    }
}
