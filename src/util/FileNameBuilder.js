import * as path from 'path';

/**
 * Simple class for constructing/deconstructing a base file name (name.ext) from a 
 * prefix, suffix, and extension.
 * @class
 */
export class FileNameBuilder {
    /**
     * @typedef {object} FileNameBuilder~Options
     * @property {string}   [prefix=""]
     * @property {string}   [noBasisName=""]    Optional base file name to use when 
     * no basis is passed to {@link FileNameBuilder#buildFileName}. If this is 
     * specified and there is no basis passed, this will replace the prefix and 
     * suffix. The extension will still be added.
     * @property {string}   [suffix=""]
     * @property {string}   [ext=""]    The file extension, this should only be 
     * the final extension.
     */

    /**
     * @constructor
     * @param {FileNameBuilder#Options} options
     */
    constructor(options) {
        options = options || {};
        this._prefix = options.prefix || '';
        this._noBasisName = options.noBasisName;
        this._suffix = options.suffix || '';
        if (options.ext) {
            if (options.ext.charAt(0) !== '.') {
                this._ext = '.' + options.ext;
            }
            else {
                this._ext = options.ext;
            }
        }
        else {
            this._ext = '';
        }
    }

    /**
     * Constructs the base file name.
     * @param {string} basis The basis of the file name.
     * @returns {string}    The base file name (name.ext)
     */
    buildFileName(basis) {
        if (((basis === undefined) || (basis === '')) && this._noBasisName) {
            return this._noBasisName + this._ext;
        }
        return this._prefix + basis + this._suffix + this._ext;
    }

    /**
     * Parses the basis from a file name.
     * @param {string} fileName The file name to parse. Only the base file name is 
     * used, any root/directory is ignored.
     * @returns {string|undefined}  The basis used to construct the file name, or
     * <code>undefined</code> if the base file name
     * is not compatible.
     */
    parseFileName(fileName) {
        const { name, ext } = path.parse(fileName);
        if ((ext === this._ext)
         && name.startsWith(this._prefix)
         && name.endsWith(this._suffix)) {
            if (this._suffix) {
                return name.slice(this._prefix.length, -this._suffix.length);
            }
            else {
                return name.slice(this._prefix.length);
            }
        }
    }
}

