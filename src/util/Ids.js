import { toCleanJSON } from './JSONUtils';
import { uuidv1 } from 'uuid/v1';


/**
 * Immutable object representing an id. An id has both a local id value and a UUID.
 * The idea is that local ids are used locally and are just numbers, making sorting 
 * and tracking ids simpler.
 * @class
 */
export class Id {
    /**
     * @typedef {object}    Id~Options
     * @property {number}   localId The local id
     * @property {string}   uuid    The uuid of the id, a string of the form 
     * '1b671a64-40d5-491e-99b0-da01ff1f3341'.
     */

    /**
     * @constructor
     * @param {Id~Options} options The options.
     */
    constructor(options) {
        options = options || {};
        this._localId = options.localId;
        this._uuid = options.uuid;
    }

    static fromOptions(options) {
        return (options instanceof Id) ? options : new Id(options);
    }

    toJSON(arg) {
        return toCleanJSON({
            localId: this._localId,
            uuid: this._uuid,
        });
    }

    /**
     * @returns {number}    The local id.
     */
    getLocalId() { return this._localId; }

    /**
     * @returns {string}    The uuid, a string of the form 
     * '1b671a64-40d5-491e-99b0-da01ff1f3341'.
     */
    getUuid() { return this._uuid; }


    /**
     * Registers a simple processor supporting Id objects in a 
     * {@link JSONObjectProcessor}.
     * Note that if you extend Id, and have separate JSON object processing for 
     * that class, you should set a <code>_jsonNoId</code> property to 
     * <code>true</code> in that class.
     * @param {JSONProcessor} jsonProcessor The JSON object processor.
     */
    static registerWithJSONObjectProcessor(jsonProcessor) {
        jsonProcessor.addSimpleObjectProcessor({
            name: 'Id',
            isForObject: (object) => object instanceof Id && !object._jsonNoId,
            fromJSON: (json) => new Id(json),
        });
    }


    /**
     * Determines if two ids represent the same id.
     * @param {Id} a
     * @param {Id} b
     * @returns {boolean}
     */
    static areSame(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        if (a._localId !== b._localId) {
            return false;
        }
        if (a._uuid !== b._uuid) {
            return false;
        }
        return true;
    }
}


export const INVALID_LOCAL_ID = 0;


/**
 * Generator of {@link Id} objects.
 * @class
 */
export class IdGenerator {
    /**
     * @typedef {object}    IdGenerator~Options
     * @property {number}   nextLocalId The next local id to allocate.
     */

    /**
     * @constructor
     * @param {IdGenerator~Options} options
     */
    constructor(options) {
        options = options || {};
        this._nextLocalId = options.nextLocalId || 1;
    }

    static fromOptions(options) {
        return (options instanceof IdGenerator) ? options : new IdGenerator(options);
    }

    toJSON(arg) {
        return {
            nextLocalId: this._nextLocalId,
        };
    }

    /**
     * @returns {number}    The local id of the next id to be allocated.
     */
    getNextLocalId() { return this._nextLocalId; }

    /**
     * @returns {Id~Options}    The new id.
     */
    newIdOptions() {
        const localId = this._nextLocalId;
        ++this._nextLocalId;
        return {
            localId: localId,
            uuid: uuidv1(),
        };
    }

    /**
     * @returns {Id}    The new id.
     */
    newIdInstance() {
        return new Id(this.newIdOptions());
    }


    /**
     * Registers a simple processor supporting IdGenerator objects in a 
     * {@link JSONObjectProcessor}.
     * Note that if you extend IdGenerator, and have separate JSON object 
     * processing for that class, you should set a <code>_jsonNoIdGenerator</code> 
     * property to <code>true</code> in that class.
     * @param {JSONProcessor} jsonProcessor The JSON object processor.
     */
    static registerWithJSONObjectProcessor(jsonProcessor) {
        jsonProcessor.addSimpleObjectProcessor({
            name: 'IdManager',
            isForObject: (object) => object instanceof IdGenerator 
                && !object._jsonNoIdGenerator,
            fromJSON: (json) => new IdGenerator(json),
        });
    }
}


