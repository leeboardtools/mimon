import { EventEmitter } from 'events';
import { userMsg, userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getYMDDate, getYMDDateString } from '../util/YMDDate';
import { deepEqual } from 'assert';

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
 * Retrieves a {@link Lot} representation of a {@link LotDataItem}, avoiding copying if possible.
 * @param {LotDataItem|Lot} lotDataItem 
 * @param {boolean} alwaysCopy 
 * @returns {Lot}
 */
export function getLot2(lotDataItem, alwaysCopy) {
    if (lotDataItem) {
        if (alwaysCopy) {
            return Object.assign({}, lotDataItem);
        }
    }

    return lotDataItem;
}

/**
 * Retrieves a {@link LotDataItem} representation of a {@link Lot}, avoiding copying if possible.
 * @function
 * @param {LotDataItem|Lot} lot
 * @param {boolean} alwaysCopy 
 * @returns {Lot}
 */
export const getLotDataItem2 = getLot2;


/**
 * @typedef {object} Lot
 * @property {YMDDate}  purchaseYMDDate The purchase date of the lot.
 * @property {number}   quantityBaseValue   The base value of the quantity of the lot. The {@link QuantityDefinition} is the quantity
 * definition of the lot of the account the lot belongs to.
 * @property {number}   costBasisBaseValue  The base value of the cost basis of the lot. The {@link QuantityDefinition} and
 * {@link Currency} are from the lot of the account the lot belongs to.
 * @property {string}   [description]   The description of the lot.
 */

/**
 * Retrieves a {@link Lot} representation of a {@link LotDataItem}
 * @param {(LotDataItem|Lot)} lotDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {Lot}
 */
// TODELETE
export function getLot(lotDataItem, alwaysCopy) {
    if (lotDataItem) {
        const purchaseYMDDate = getYMDDate(lotDataItem.purchaseYMDDate);
        if (alwaysCopy || (purchaseYMDDate !== lotDataItem.purchaseYMDDate)) {
            const lot = Object.assign({}, lotDataItem);
            lot.purchaseYMDDate = purchaseYMDDate;
            return lot;
        }
    }
    return lotDataItem;
}


// TODELETE
function checkFirstDefinedEntry(array, callback) {
    for (let i = 0; i < array.length; ++i) {
        if ((array[i] !== undefined) && (array[i] !== null)) {
            return callback(i);
        }
    }
}

/**
 * Array version of {@link getLot}.
 * @param {(LotDataItem[]|Lot[])} lotDataItems 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new array with new object will always be created.
 * @returns {Lot[]}
 */
// TODELETE
export function getLots(lotDataItems, alwaysCopy) {
    if (lotDataItems) {
        if (alwaysCopy
         || checkFirstDefinedEntry(lotDataItems, (i) => (getLot(lotDataItems[i]) !== lotDataItems[i]))) {
            return lotDataItems.map((lotDataItem) => getLot(lotDataItem, alwaysCopy));
        }
    }
    return lotDataItems;
}

/**
 * Retrieves a {@link LotDataItem} representation of a {@link Lot}.
 * @param {(Lot|LotDataItem)} lot 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always be created.
 * @returns {LotDataItem}
 */
// TODELETE
export function getLotDataItem(lot, alwaysCopy) {
    if (lot) {
        const purchaseYMDDateString = getYMDDateString(lot.purchaseYMDDate);
        if (alwaysCopy || (purchaseYMDDateString !== lot.purchaseYMDDate)) {
            const lotDataItem = Object.assign({}, lot);
            lotDataItem.purchaseYMDDate = purchaseYMDDateString;
            return lotDataItem;
        }
    }
    return lot;
}

/**
 * Array version of {@link getLotDataItem}
 * @param {(Lot[]|LotDataItem[])} lots 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new array with new objects will always be created.
 * @returns {LotDataItem[]}
 */
// TODELETE
export function getLotDataItems(lots, alwaysCopy) {
    if (lots) {
        if (alwaysCopy
         || checkFirstDefinedEntry(lots, (i) => (getLotDataItem(lots[i]) !== lots[i]))) {
            return lots.map((lot) => getLotDataItem(lot, alwaysCopy));
        }
    }
    return lots;
}

/**
 * Returns a string representation of a {@link Lot} or {@link LotDataItem}. The string representation has
 * the properties in a fixed order, unlike JSON.stringify().
 * @param {Lot|LotDataItem} lot 
 * @returns {string}
 */
// TODELETE
export function getLotString(lot) {
    const lotDataItem = getLotDataItem(lot);
    let string = lotDataItem.purchaseYMDDate + '_' + lotDataItem.quantityBaseValue + '_' + lotDataItem.costBasisBaseValue;
    if (lotDataItem.description) {
        string += '_' + lotDataItem.description;
    }
    return string;
}


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
     * Adds a lot.
     * @param {(Lot|LotDataItem)} lot 
     * @param {boolean} validateOnly 
     * @returns {LotDataItem} Note that this object will not be the same as the lot arg.
     * @throws {Error}
     * @fires {LotManager~lotAdd}
     */
    async asyncAddLot(lot, validateOnly) {
        const lotDataItem = getLotDataItem2(lot, true);

        const error = this._validate(lotDataItem);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return;
        }
        
        const id = this._idGenerator.generateId();
        lotDataItem.id = id;
        const idGeneratorOptions = this._idGenerator.toJSON();

        const updatedDataItems = [[id, lotDataItem]];
        await this._handler.asyncUpdateLotDataItems(updatedDataItems, idGeneratorOptions);

        this._lotDataItemsById.set(id, lotDataItem);

        this.emit('lotAdd', { newLotDataItem: lotDataItem, });
        return lotDataItem;
    }


    /**
     * Fired by {@link LotManager#asyncRemovedLot} after a lot has been removed.
     * @event LotManager~lotRemove
     * @type {object}
     * @property {LotDataItem}   removedLotDataItem   The lot data item being returned by the {@link LotManager#asyncRemoveLot} call.
     */

    /**
     * Removes a lot.
     * @param {number} id 
     * @param {boolean} validateOnly 
     * @returns {LotDataItem}    The lot that was removed.
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

        this.emit('lotRemove', { removedLotDataItem: lotDataItem });
        return lotDataItem;
    }


    /**
     * Fired by {@link LotManager#asyncModifyLot} after the lot has been modified.
     * @event LotManager~lotModify
     * @type {object}
     * @property {LotDataItem}   newLotDataItem   The new lot data item being returned by the {@link LotManager#asyncAddLot} call.
     * @property {LotDataItem}   oldLotDataItem   The old lot data item being returned by the {@link LotManager#asyncAddLot} call.
     */

    /**
     * Modifies an existing lot.
     * @param {(LotData|Lot)} lot The new lot properties. The id property is required. For all other
     * properties, if the property is not included in lot, the property will not be changed.
     * @param {boolean} validateOnly 
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
        newLotDataItem = getLotDataItem2(newLotDataItem);

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

        newLotDataItem = Object.assign({}, newLotDataItem);
        this.emit('lotModify', { newLotDataItem: newLotDataItem, oldLotDataItem: oldLotDataItem });
        return [ newLotDataItem, oldLotDataItem ];
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
