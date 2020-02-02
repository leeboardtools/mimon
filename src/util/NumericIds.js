/**
 * Simple generator for number based ids. The first id generated is normally 1.
 */
export class NumericIdGenerator {
    /**
     * @typedef {object} NumericIdGenerator~Options
     * @property {number}   [lastId=0]  The last id generated.
     */

    /**
     * @param {NumberIdGenerator~Options} options 
     */
    constructor(options) {
        options = options || {};
        this._lastId = options.lastId || 0;
    }

    toJSON() {
        return { lastId: this._lastId, };
    }

    fromJSON(json) {
        this._lastId = (json && json.lastId) ? json.lastId : 0;
    }

    /**
     * @returns {number}    The next available id.
     */
    generateId() {
        return ++this._lastId;
    }

    /**
     * @returns {number}    The value that will be returned by the next call to {@link NumericIdGenerator#generateId}
     */
    peekGenerateId() {
        return this._lastId + 1;
    }
}
