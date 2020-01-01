
const zlib = require('zlib');
const fs = require('fs');
const { Readable } = require('stream');

export class StringReadable extends Readable {
    constructor(string, options) {
        super(options);

        options = options || {};

        this._maxChunkSize = options.maxChunkSize || 1000;
        this._string = string || '';
        this._pos = 0;
    }

    _read(size) {
        size = Math.min(size, this._maxChunkSize);
        const endPos = Math.min(this._pos + size, this._string.length);
        this.push(this._string.slice(this._pos, endPos));
        this._pos = endPos;

        if (endPos >= this._string.length) {
            this.push(null);
        }
    }
}

/**
 * Writes a JSON object as a Gzip file using {@link fs#createWriteStream}.
 * @param {object} json The JSON object to be written, will be passed to {@link JSON#stringify}.
 * @param {string} path The path of the file to be written.
 * @param {object} [options] The optional options to pass to {@link fs#createWriteStream}.
 * @returns {Promise}
 */
export function writeToFile(json, path, options) {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(path, options)
            .on('error', err => reject(err));
        writeToWriteStream(json, writeStream)
            .then(obj => resolve(obj))
            .catch(err => reject(err));
    });
}

/**
 * Writes a JSON object as a Gzip file via a file handle.
 * @param {object} json The JSON object to be written, will be passed to {@link JSON#stringify}.
 * @param {FileHandle} fileHandle The file handle to write to.
 * @returns {Promise}
 */
export function writeToFileHandle(json, fileHandle) {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(undefined, { fd: fileHandle.fd })
            .on('error', err => reject(err));
        writeToWriteStream(json, writeStream)
            .then(obj => resolve(obj))
            .catch(err => reject(err));
    });
}

/**
 * Writes a JSON object as a Gzip file using a {@link fs#WriteStream}.
 * @param {object} json The JSON object to be written, will be passed to {@link JSON#stringify}.
 * @param {fs.WriteStream} writeStream The stream to write to.
 * @returns {Promise}
 */
export function writeToWriteStream(json, writeStream) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGzip();

        const jsonText = JSON.stringify(json);
        const inp = new StringReadable(jsonText);

        inp.pipe(gzip)
            .pipe(writeStream)
            .on('error', (err) => {
                return reject(err);
            })
            .on('finish', () => {
                return resolve();
            });
    });
}


/**
 * Reads a JSON object from a Gzip file using {@link fs#createReadStream}.
 * @param {string} path The path of the file.
 * @param {object} [options]    The optional options to pass to {@link fs#createReadStream}.
 * @returns {Promise<object>}
 */
export function readFromFile(path, options) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(path, options)
            .on('error', err => reject(err));
        readFromReadStream(readStream)
            .then(obj => resolve(obj))
            .catch(err => reject(err));
    });
}


/**
 * Reads a JSON object from a Gzip file using a {@link FileHandle}.
 * @param {FileHandle} fileHandle The file handle to read from.
 * @returns {Promise<object>}
 */
export function readFromFileHandle(fileHandle) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(undefined, { fd: fileHandle.fd })
            .on('error', err => reject(err));
        readFromReadStream(readStream)
            .then(obj => resolve(obj))
            .catch(err => reject(err));
    });
}

/**
 * Reads a JSON object from a Gzip file using a {@link fs#ReadStream}.
 * @param {fs.ReadStream} readStream The read stream to read from.
 * @returns {Promise<object>}
 */
export function readFromReadStream(readStream) {
    return new Promise((resolve, reject) => {
        const gunzip = zlib.createGunzip();
        let json = '';

        readStream.pipe(gunzip)
            .on('error', (err) => {
                return reject(err);
            })
            .on('data', (chunk) => {
                json += chunk;
            })
            .on('end', () => {
                try {
                    return resolve(JSON.parse(json));
                }
                catch (e) {
                    return reject(e);
                }
            });
    });
}

