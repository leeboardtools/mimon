import { NumericIdGenerator } from './NumericIds';
import { SortedArray } from './SortedArray';
import { userError } from './UserMessages';


/**
 * @typedef {object} UndoDataItem
 * @property {number}   id
 * @property {string}   [description]
 * @property {string}   applier
 */

/**
 * Manages {@link UndoDataItem} items. Items are only added by the accounting system subsystem managers.
 */
export class UndoManager {
    constructor(options) {
        this._handler = options.handler;

        this._idGenerator = new NumericIdGenerator(options.idGenerator || this._handler.getIdGeneratorOptions());

        this._appliersByName = new Map();

        this._sortedUndoIds = new SortedArray((a, b) => a - b);
        const undoIds = this._handler.getUndoIds();
        if (undoIds) {
            undoIds.forEach((id) => this._sortedUndoIds.add(id));
        }
    }

    async asyncSetupForUse() {
    }

    /**
     * @returns {number[]}  An array containing the undo ids in increasing order.
     */
    getSortedUndoIds() {
        return Array.from(this._sortedUndoIds.getValues());
    }

    /**
     * Removes all undo data items.
     */
    async asyncClearUndos() {
        await this._handler.asyncDeleteUndoDataItems(this._sortedUndoIds.getValues());
        this._sortedUndoIds.clear();
    }


    /**
     * @returns {number}    The undo id that will be assigned to the next {@link UndoDataItem} registered with the manager.
     */
    getNextUndoId() {
        return this._idGenerator.peekGenerateId();
    }


    /**
     * 
     * @param {number} undoId 
     * @returns {UndoDataItem}
     */
    async asyncGetUndoDataItemWithId(undoId) {
        const result = await this._handler.asyncGetUndoDataItemWithId(undoId);
        if (result) {
            return Object.assign({}, result);
        }
    }

    async _asyncUndoId(undoId) {
        const undoDataItem = await this._handler.asyncGetUndoDataItemWithId(undoId);
        if (!undoDataItem) {
            throw userError('UndoManager-undo_id_invalid', undoId);
        }

        const asyncApplier = this._appliersByName.get(undoDataItem.applier);
        if (!asyncApplier) {
            throw userError('UndoManager-applier_not_found', undoDataItem.applier);
        }

        await asyncApplier(undoDataItem);
    }


    /**
     * Undoes actions up to and including a given undo id.
     * @param {number} undoId 
     * @param {boolean} [clearOnly=false]   If <code>true</code> the undo items are removed from the manager but are not
     * actually undone.
     * @throws Error
     */
    async asyncUndoToId(undoId, clearOnly) {
        const index = this._sortedUndoIds.indexOf(undoId);
        if (index < 0) {
            throw userError('UndoManager-id_invalid', undoId);
        }

        const undoIds = this._sortedUndoIds.getValues();
        let i = undoIds.length - 1;
        try {
            if (clearOnly) {
                i = index - 1;
            }
            else {
                for (; i >= index; --i) {
                    await this._asyncUndoId(undoIds[i]);
                }
            }
        }
        finally {
            ++i;
            const idsToDelete = undoIds.slice(i);
            await this._handler.asyncDeleteUndoDataItems(idsToDelete);
            this._sortedUndoIds.deleteIndexRange(i, idsToDelete.length);
        }
    }


    /**
     * Callback registered by the subsystems that support undo to handle the actual undo.
     * @callback UndoManager~AsyncApplier
     * @async
     * @param {UndoDataItem} undoDataItem
     */


    /**
     * Called by the subsystems that support undo to register their undo applier.
     * @param {string} name 
     * @param {UndoManager~AsyncApplier} asyncApplier 
     */
    registerUndoApplier(name, asyncApplier) {
        this._appliersByName.set(name, asyncApplier);
    }

    /**
     * Called by the subsystems that support undo to register an actual undo item.
     * @param {string}  applier
     * @param {UndoDataItem} undoDataItem
     * @returns {number}    The id assigned to the data item.
     */
    async asyncRegisterUndoDataItem(applier, undoDataItem) {
        if (!undoDataItem) {
            undoDataItem = applier;
            applier = undoDataItem.applier;
        }

        const applierFunc = this._appliersByName.get(applier);
        if (!applierFunc) {
            throw userError('UndoManager-applier_not_registered', undoDataItem.applier);
        }

        const idGeneratorOptions = this._idGenerator.toJSON();

        undoDataItem = Object.assign({}, undoDataItem, { applier: applier, });
        undoDataItem.id = this._idGenerator.generateId();
        try {
            await this._handler.asyncAddUndoDataItem(undoDataItem, this._idGenerator.toJSON());
            this._sortedUndoIds.add(undoDataItem.id);
        }
        catch (e) {
            this._idGenerator.fromJSON(idGeneratorOptions);
            throw e;
        }

        return undoDataItem.id;
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link UndoManager}.
 * @interface
 */
export class UndoHandler {
    /**
     * @returns {number[]}  An array containing the undo ids in increasing order.
     */
    getUndoIds() {
        throw Error('UndoHandler.getUndoIds() abstract method!');
    }

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for initializing the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('AccountsHandler.getIdGeneratorOptions() abstract method!');
    }

    /**
     * Retrieves an undo data item.
     * @param {number} undoId 
     * @returns {UndoDataItem}
     */
    async asyncGetUndoDataItemWithId(undoId) {
        throw Error('UndoHandler.asyncGetUndoDataItemWithId() abstract method!');
    }

    /**
     * Adds a new undo data item.
     * @param {UndoDataItem} undoDataItem 
     * @param {NumericIdGenerator~Options} idGeneratorOptions 
     */
    async asyncAddUndoDataItem(undoDataItem, idGeneratorOptions) {
        throw Error('UndoHandler.asyncAddUndoDataItem() abstract method!');
    }

    /**
     * Deletes undo data items with specified ids.
     * @param {number[]} undoIds 
     */
    async asyncDeleteUndoDataItems(undoIds) {
        throw Error('UndoHandler.asyncDeleteUndoDataItems() abstract method!');
    }
}


/**
 * Simple in-memory implementation of {@link UndoHandler}
 */
export class InMemoryUndoHandler extends UndoHandler {
    constructor() {
        super();

        this._lastChangeId = 0;
        this._undoDataItemsById = new Map();
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            undoDataItems: Array.from(this._undoDataItemsById.values()),
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._undoDataItemsById.clear();
        if (json.undoDataItems) {
            json.undoDataItems.forEach((dataItem) => {
                this._undoDataItemsById.set(dataItem.id, dataItem);
            });
        }

        this.markChanged();
    }


    getUndoIds() {
        return Array.from(this._undoDataItemsById.keys());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncGetUndoDataItemWithId(undoId) {
        return this._undoDataItemsById.get(undoId);
    }

    async asyncAddUndoDataItem(undoDataItem, idGeneratorOptions) {
        this._undoDataItemsById.set(undoDataItem.id, undoDataItem);
        this._idGeneratorOptions = idGeneratorOptions;

        this.markChanged();
    }

    async asyncDeleteUndoDataItems(undoIds) {
        if (undoIds && undoIds.length) {
            undoIds.forEach((id) => this._undoDataItemsById.delete(id));
            this.markChanged();
        }
    }
}