
/**
 * Simple generator for BigInt based ids. The first id generated is normally "1".
 * Note that this returns string ids, not BigInt, this is so the ids can
 * easily be JSON'ified since JSON.stringify() doesn't support BigInt.
 */
export class BigIntIdGenerator {
    /**
     * @typedef {object} BigIntIdGenerator~Options
     * @property {number|string|BigInt}   [lastId=0]  The last id generated.
     */

    /**
     * @param {BigIntIdGenerator~Options|number|string} options 
     */
    constructor(options) {
        let lastId;
        if (typeof options === 'object') {
            lastId = options.lastId;            
        }
        else {
            lastId = options;
        }
        this._lastId = BigInt(lastId || 0);
    }

    toJSON() {
        return { lastId: this._lastId.toString(), };
    }

    fromJSON(json) {
        this._lastId = BigInt((json && json.lastId) ? json.lastId : 0);
    }

    /**
     * @returns {string}    The next available id. The next time this is called
     * a new id will be returned.
     */
    generateId() {
        return (++this._lastId).toString();
    }

    /**
     * @returns {string}    The value that will be returned by the next call to 
     * {@link BigIntIdGenerator#generateId}. Calling this does not affect the
     * next id returned by {@link BigIntIdGenerator#generateId}.
     */
    peekGenerateId() {
        return (this._lastId + 1n).toString();
    }
}
