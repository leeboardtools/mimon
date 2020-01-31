import { EventEmitter } from 'events';
import { userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';



/**
 * @typedef {object} LotDataItem
 * @property {number}   id  The id of the lot in the lot manager.
 * @property {number}   pricedItemId    The id of the priced item the lot represents.
 * @property {string}   [description]   The description of the lot.
 */

/**
 * @typedef {object} Lot
 * @property {number}   id  The id of the lot in the lot manager.
 * @property {number}   pricedItemId    The id of the priced item the lot represents.
 * @property {string}   [description]   The description of the lot.
 */

/**
 * Retrieves a {@link Lot} representation of a {@link LotDataItem}
 * @param {(LotDataItem|Lot)} lotDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Lot}
 */
export function getLot(lotDataItem, alwaysCopy) {
    if (lotDataItem) {
        if (alwaysCopy) {
            return Object.assign({}, lotDataItem);
        }
    }
    return lotDataItem;
}


/**
 * Retrieves a {@link LotDataItem} representation of a {@link Lot}.
 * @param {(Lot|LotDataItem)} lot 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotDataItem}
 */
export const getLotDataItem = getLot;


/**
 * Manages {@link Lot} and {@link LotDataItem}s.
 */
export class LotManager extends EventEmitter {
    constructor(accountingSystem, options) {
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator || this._handler.getIdGeneratorOptions());

        this._lotDataItemsById = new Map();

        const undoManager = accountingSystem.getUndoManager();
        this._asyncApplyUndoAddLot = this._asyncApplyUndoAddLot.bind(this);
        undoManager.registerUndoApplier('addLot', this._asyncApplyUndoAddLot);

        this._asyncApplyUndoRemoveLot = this._asyncApplyUndoRemoveLot.bind(this);
        undoManager.registerUndoApplier('removeLot', this._asyncApplyUndoRemoveLot);

        this._asyncApplyUndoModifyLot = this._asyncApplyUndoModifyLot.bind(this);
        undoManager.registerUndoApplier('modifyLot', this._asyncApplyUndoModifyLot);

        const lotDataItems = this._handler.getLotDataItems();
        lotDataItems.forEach((lotDataItem) => {
            this._lotDataItemsById.set(lotDataItem.id, lotDataItem);
        });
    }

    async asyncSetupForUse() {
    }


    getAccountingSystem() { return this._accountingSystem; }


    /**
     * @returns {number[]}  Array containing the ids of all the lots.
     */
    getLotIds() {
        return Array.from(this._lotDataItemsById.keys());
    }


    /**
     * 
     * @param {number} id The id of the lot to retrieve.
     * @returns {(LotDataItem|undefined)}    A copy of the lot's data.
     */
    getLotDataItemWithId(id) {
        const lotDataItem = this._lotDataItemsById.get(id);
        return getLotDataItem(lotDataItem, true);
    }


    async _asyncApplyUndoAddLot(undoDataItem) {
        const { lotId, idGeneratorOptions } = undoDataItem;

        const lotDataItem = this.getLotDataItemWithId(lotId);

        const updatedDataItems = [[lotId]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems);

        this._lotDataItemsById.delete(lotId);
        this._idGenerator.fromJSON(idGeneratorOptions);

        this.emit('lotRemove', { removedLotDataItem: lotDataItem });
    }


    async _asyncApplyUndoRemoveLot(undoDataItem) {
        const { removedLotDataItem } = undoDataItem;

        const { id } = removedLotDataItem;
        const updatedDataItems = [[ id, removedLotDataItem ]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems);

        this._lotDataItemsById.set(id, removedLotDataItem);

        this.emit('lotAdd', { newLotDataItem: removedLotDataItem, });
    }


    async _asyncApplyUndoModifyLot(undoDataItem) {
        const { oldLotDataItem } = undoDataItem;

        const { id } = oldLotDataItem;
        const newLotDataItem = this.getLotDataItemWithId(id);
        const updatedDataItems = [[ id, oldLotDataItem ]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems);

        this._lotDataItemsById.set(id, oldLotDataItem);

        this.emit('lotModify', { newLotDataItem: oldLotDataItem, oldLotDataItem: newLotDataItem, });
    }


    _validate(lotDataItem) {
        const pricedItemManager = this._accountingSystem.getPricedItemManager();
        if (!pricedItemManager.getPricedItemDataItemWithId(lotDataItem.pricedItemId)) {
            return userError('LotManager-invalid_pricedItem_id', lotDataItem.pricedItemId);
        }
    }

    /**
     * Fired by {@link LotManager#asyncAddLot} and {@link LotManager#asyncAddCurrencyLot} after the priced
     * item has been added.
     * @event LotManager~lotAdd
     * @type {object}
     * @property {LotData}   newLotData   The lot data item being returned by the {@link LotManager#asyncAddLot} call.
     */

    /**
     * @typedef {object}    LotManager~AddLotResult
     * @property {LotDataItem}  newLotDataItem
     */

    /**
     * Adds a lot.
     * @param {(Lot|LotDataItem)} lot 
     * @param {boolean} validateOnly 
     * @returns {LotManager~AddLotResult|undefined} <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {LotManager~lotAdd}
     */
    async asyncAddLot(lot, validateOnly) {
        const lotDataItem = getLotDataItem(lot, true);

        const error = this._validate(lotDataItem);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return;
        }
        
        const originalIdGeneratorOptions = this._idGenerator.toJSON();

        const id = this._idGenerator.generateId();
        lotDataItem.id = id;
        const idGeneratorOptions = this._idGenerator.toJSON();

        const updatedDataItems = [[id, lotDataItem]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems, idGeneratorOptions);

        this._lotDataItemsById.set(id, lotDataItem);

        const undoId = await this._accountingSystem.getUndoManager().asyncRegisterUndoDataItem('addLot', 
            { lotId: lotDataItem.id, idGeneratorOptions: originalIdGeneratorOptions, });

        this.emit('lotAdd', { newLotDataItem: lotDataItem, });
        return { newLotDataItem: lotDataItem, undoId: undoId };
    }


    /**
     * Fired by {@link LotManager#asyncRemovedLot} after a lot has been removed.
     * @event LotManager~lotRemove
     * @type {object}
     * @property {LotDataItem}   removedLotDataItem   The lot data item being returned by the {@link LotManager#asyncRemoveLot} call.
     */

    /**
     * @typedef {object}    LotManager~RemoveLotResult
     * @property {LotDataItem}  removedLotDataItem
     */

    /**
     * Removes a lot.
     * @param {number} id 
     * @param {boolean} validateOnly 
     * @returns {LotManager~RemoveLotResult|undefined}  <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {LotManager~lotRemove}
     */
    async asyncRemoveLot(id, validateOnly) {
        const lotDataItem = this._lotDataItemsById.get(id);
        if (!lotDataItem) {
            throw userError('LotManager-remove_no_id', id);
        }

        if (validateOnly) {
            return;
        }

        this._lotDataItemsById.delete(id);

        const updatedDataItems = [[id]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems);

        const undoId = await this._accountingSystem.getUndoManager().asyncRegisterUndoDataItem('removeLot', 
            { removedLotDataItem: getLotDataItem(lotDataItem, true), });

        this.emit('lotRemove', { removedLotDataItem: lotDataItem });
        return { removedLotDataItem: lotDataItem, undoId: undoId, };
    }


    /**
     * Fired by {@link LotManager#asyncModifyLot} after the lot has been modified.
     * @event LotManager~lotModify
     * @type {object}
     * @property {LotDataItem}   newLotDataItem   The new lot data item being returned by the {@link LotManager#asyncAddLot} call.
     * @property {LotDataItem}   oldLotDataItem   The old lot data item being returned by the {@link LotManager#asyncAddLot} call.
     */

    /**
     * @typedef {object}    LotManager~ModifyLotResult
     * @property {LotDataItem}  newLotDataItem
     * @property {LotDataItem}  oldLotDataItem
     */

    /**
     * Modifies an existing lot.
     * @param {(LotData|Lot)} lot The new lot properties. The id property is required. For all other
     * properties, if the property is not included in lot, the property will not be changed.
     * @param {boolean} validateOnly 
     * @returns {LotManager~ModifyLotResult|undefined}  <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {LotManager~lotModify}
     */
    async asyncModifyLot(lot, validateOnly) {
        const id = lot.id;

        const oldLotDataItem = this._lotDataItemsById.get(id);
        if (!oldLotDataItem) {
            throw userError('LotManager-modify_no_id', id);
        }

        let newLotDataItem = Object.assign({}, oldLotDataItem, lot);
        newLotDataItem = getLotDataItem(newLotDataItem);

        const error = this._validate(newLotDataItem);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return newLotDataItem;
        }

        const updatedDataItems = [[id, newLotDataItem]];

        await this._handler.asyncUpdateLotDataItems(updatedDataItems);

        this._lotDataItemsById.set(id, newLotDataItem);

        const undoId = await this._accountingSystem.getUndoManager().asyncRegisterUndoDataItem('modifyLot', 
            { oldLotDataItem: getLotDataItem(oldLotDataItem, true), });

        newLotDataItem = getLotDataItem(newLotDataItem, true);
        this.emit('lotModify', { newLotDataItem: newLotDataItem, oldLotDataItem: oldLotDataItem });
        return { newLotDataItem: newLotDataItem, oldLotDataItem: oldLotDataItem, undoId: undoId, };
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link LotManager}.
 * @interface
 */
export class LotsHandler {
    /**
     * Retrieves an array containing all the lots. The lots are presumed
     * to already be loaded when the {@link LotManager} is constructed.
     * @returns {LotDataItem[]}
     */
    getLotDataItems() {
        throw Error('LotsHandler.getLotDataItems() abstract method!');
    }

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for initializing the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('LotsHandler.getIdGeneratorOptions() abstract method!');
    }


    /**
     * Main function for updating the lot data items.
     * @param {*} idLotDataItemPairs Array of one or two element sub-arrays. The first element of each sub-array is the lot id.
     * For new or modified lots, the second element is the new data item. For lots to be deleted, this is <code>undefined</code>.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The current state of the id generator, if <code>undefined</code>
     * the generator state hasn't changed.
     */
    async asyncUpdateLotDataItems(idLotDataItemPairs, idGeneratorOptions) {
        throw Error('LotsHandler.lotModify() abstract method!');
    }
}


/**
 * A simple in-memory implementation of {@link LotsHandler}
 */
export class InMemoryLotsHandler extends LotsHandler {
    constructor(lotDataItems) {
        super();

        this._lotDataItemsById = new Map();
        if (lotDataItems) {
            lotDataItems.forEach((lotDataItem) => {
                this._lotDataItemsById.set(lotDataItem.id, lotDataItem);
            });
        }

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            lots: Array.from(this._lotDataItemsById.values()),
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._lotDataItemsById.clear();
        json.lots.forEach((lotDataItem) => {
            this._lotDataItemsById.set(lotDataItem.id, lotDataItem);
        });

        this.markChanged();
    }


    getLotDataItems() {
        return Array.from(this._lotDataItemsById.values());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncUpdateLotDataItems(idLotDataItemPairs, idGeneratorOptions) {
        idLotDataItemPairs.forEach(([id, lotDataItem]) => {
            if (!lotDataItem) {
                this._lotDataItemsById.delete(id);
            }
            else {
                this._lotDataItemsById.set(id, lotDataItem);
            }
        });

        if (idGeneratorOptions) {
            this._idGeneratorOptions = idGeneratorOptions;
        }

        this.markChanged();
    }

}
