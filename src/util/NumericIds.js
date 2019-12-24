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

    /**
     * Converts a JSON object compatible with {@link NumericIdGenerator~toJSON()} to a
     * {@link NumericIdGenerator}.
     * @param {object} json The JSON object to convert.
     * @returns {(NumericIdGenerator|undefined)}    Returns <code>undefined</code> if json is <code>undefined</code>.
     */
    static fromJSON(json) {
        return (json) ? new NumericIdGenerator(json) : undefined;
    }

    /**
     * @returns {number}    The next available id.
     */
    generateId() {
        return ++this._lastId;
    }
}
