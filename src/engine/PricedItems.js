import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getCurrencyCode, getCurrency } from '../util/Currency';
import { getQuantityDefinition, getQuantityDefinitionName } from '../util/Quantities';

/**
 * @typedef {object}    PricedItemTypeDef
 * @property {string}   name    The name of the priced item type.
 * @property {strign}   description The user readable description of the priced item type.
 */

/**
 * The priced item classes.
 * @readonly
 * @enum {PricedItemTypeDef}
 * @property {PricedItemTypeDef}  SECURITY
 * @property {PricedItemTypeDef}  REAL_ESTATE
 */
export const PricedItemType = {
    CURRENCY: { name: 'CURRENCY', },
    SECURITY: { name: 'SECURITY', hasTickerSymbol: true },
    MUTUAL_FUND: { name: 'MUTUAL_FUND', hasTickerSymbol: true },
    REAL_ESTATE: { name: 'REAL_ESTATE', },
    PROPERTY: { name: 'PROPERTY', },
    // COLLECTIBLE: { name: 'COLLECTIBLE', },
};

/**
 * @param {(string|PricedItemTypeDef)} ref 
 * @returns {PricedItemTypeDef} Returns the {@link PricedItemTypeDef} represented by ref.
 */
export function pricedItemType(ref) {
    return (typeof ref === 'string') ? PricedItemType[ref] : ref;
}


export function loadPricedItemUserMessages() {
    for (const type of Object.values(PricedItemType)) {
        type.description = userMsg('PricedItemType-' + type.name);
    }
}


/**
 * @typedef {object} PricedItemDataItem
 * @property {number}   id  The priced item's id.
 * @property {string}   type    name property of one of {@link PricedItemType}.
 * @property {string}   currency    The 3 letter currency name of the currency underlying the priced item.
 * @property {string}   quantityDefinition  The name of the {@link QuantityDefinition} defining quantities of the priced item.
 * @property {string}   [name]  The user supplied name of the priced item.
 * @property {string}   [description]   The user supplied description of the priced item.
 */

/**
 * @typedef {object} PricedItem
 * @property {number}   id  The priced item's id.
 * @property {PricedItemType}   type    The priced item's type.
 * @property {Currency} currency    The currency object of the currency underlying the priced item.
 * @property {QuantityDefinition}   quantityDefinition  The quantity definition defining the priced item's quantities.
 * @property {string}   [name]  The user supplied name of the priced item.
 * @property {string}   [description]   The user supplied description of the priced item.
 */

/**
 * Retrieves a {@link PricedItem} representation of a {@link PricedItemDataItem}.
 * @param {(PricedItemDataItem|PricedItem)} pricedItemDataItem 
 * @returns {PricedItem}
 */
export function getPricedItem(pricedItemDataItem) {
    if (pricedItemDataItem) {
        if (typeof pricedItemDataItem.type === 'string') {
            const pricedItem = Object.assign({}, pricedItemDataItem);
            pricedItem.type = PricedItemType[pricedItem.type];
            pricedItem.currency = getCurrency(pricedItem.currency);
            pricedItem.quantityDefinition = getQuantityDefinition(pricedItem.quantityDefinition);
            return pricedItem;
        }
    }
    
    return pricedItemDataItem;
}

/**
 * Retrieves a {@link PricedItemDataItem} representation of a {@link PricedItem}.
 * @param {(PricedItem|PricedItemDataItem)} pricedItem 
 * @returns {PricedItemDataItem}
 */
export function getPricedItemDataItem(pricedItem) {
    if (pricedItem) {
        if (typeof pricedItem.type !== 'string') {
            const pricedItemDataItem = Object.assign({}, pricedItem);
            pricedItemDataItem.type = pricedItem.type.name;
            pricedItemDataItem.currency = getCurrencyCode(pricedItem.currency);
            pricedItemDataItem.quantityDefinition = getQuantityDefinitionName(pricedItem.quantityDefinition);
            return pricedItemDataItem;
        }
    }

    return pricedItem;
}



/**
 * Manages {@link PricedItemDataItem}s.
 */
export class PricedItemManager {

    /**
     * @typedef {object} PricedItemManager~Options
     * @property {PricedItemsHandler}    handler
     * @property {NumericIdGenerator~Options}   idGenerator
     */

    /**
     * 
     * @param {AccountingSystem} accountingSystem 
     * @param {PricedItemManager~Options} options 
     */
    
    constructor(accountingSystem, options) {
        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator);

        this._currencyPricedItemIdsByCurrency = new Map();
        this._pricedItemsById = new Map();

        const pricedItems = this._handler.getPricedItems();
        pricedItems.forEach((pricedItem) => {
            this._pricedItemsById.set(pricedItem.id, pricedItem);
            if (pricedItem.type === PricedItemType.CURRENCY.name) {
                this._currencyPricedItemIdsByCurrency.set(pricedItem.currency, pricedItem);
            }
        });
    }


    async asyncSetupForUse() {
        let usdPricedItem = this._currencyPricedItemIdsByCurrency.get('USD');
        if (!usdPricedItem) {
            const id = this._idGenerator.generateId();
            usdPricedItem = await this._asyncAddPricedItem(id, {
                type: PricedItemType.CURRENCY,
                currency: 'USD',
            });
        }
        this._currencyUSDPricedItemId = usdPricedItem.id;
        this._currencyUSDPricedItem = usdPricedItem;


        let eurPricedItem = this._currencyPricedItemIdsByCurrency.get('EUR');
        if (!eurPricedItem) {
            const id = this._idGenerator.generateId();
            eurPricedItem = await this._asyncAddPricedItem(id, {
                type: PricedItemType.CURRENCY,
                currency: 'EUR',
            });
        }
        this._currencyEURPricedItemId = eurPricedItem.id;
        this._currencyEURPricedItem = eurPricedItem;


        this._baseCurrency = this._accountingSystem.getBaseCurrency();
        let baseCurrencyPricedItem = this._currencyPricedItemIdsByCurrency.get(this._baseCurrency);
        if (!baseCurrencyPricedItem) {
            const id = this._idGenerator.generateId();
            baseCurrencyPricedItem = await this._asyncAddPricedItem(id, {
                type: PricedItemType.CURRENCY,
                currency: this._baseCurrency,
            });
        }
        this._currencyBasePricedItemId = baseCurrencyPricedItem.id;
        this._currencyBasePricedItem = baseCurrencyPricedItem;
    }


    getAccountingSystem() { return this._accountingSystem; }


    /**
     * @returns {Currency}  The base currency, from {@link AccountingSystem#getBaseCurrency}.
     */
    getBaseCurrency() { return this._baseCurrency; }

    /**
     * @returns {number}    The id of the base currency priced item.
     */
    getCurrencyBasePricedItemId() { return this._currencyBasePricedItemId; }

    /**
     * @returns {PricedItemDataItem}    The priced item for the base currency.
     */
    getCurrencyBasePricedItem() { return this._currencyBasePricedItem; }


    /**
     * @returns {number}    The id of the priced item for the USD currency.
     */
    getCurrencyUSDPricedItemId() { return this._currencyUSDPricedItemId; }

    /**
     * @returns {PricedItemDataItem}    The priced item for the USD currency.
     */
    getCurrencyUSDPricedItem() { return Object.assign({}, this._currencyUSDPricedItem); }


    /**
     * @returns {number}    The id of the priced item for the EUR currency.
     */
    getCurrencyEURPricedItemId() { return this._currencyEURPricedItemId; }

    /**
     * @returns {PricedItemDataItem}    The priced item for the EUR currency.
     */
    getCurrencyEURPricedItem() { return Object.assign({}, this._currencyEURPricedItem); }

    

    async _asyncAddPricedItem(id, pricedItem) {
        const item = Object.assign({}, pricedItem, { id: id });

        await this._handler.asyncAddPricedItem(item);

        this._pricedItemsById.set(id, item);

        pricedItem = getPricedItemDataItem(pricedItem);
        if (pricedItemType(pricedItem.type) === PricedItemType.CURRENCY) {
            this._currencyPricedItemIdsByCurrency.set(item.currency, id);
        }

        return item;
    }

    _getPricedItem(ref) {
        return this._pricedItemsById.get(ref);
    }

    /**
     * 
     * @param {number} ref The id of the priced item to retrieve.
     * @returns {(PricedItemDataItem|undefined)}    A copy of the priced item's data.
     */
    getPricedItem(ref) {
        const pricedItem = this._getPricedItem(ref);
        return (pricedItem) ? Object.assign({}, pricedItem) : undefined;
    }

    /**
     * Retrieves the priced item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @returns {number}
     */
    getCurrencyPricedItemId(currency) {
        currency = getCurrencyCode(currency);
        return this._currencyPricedItemIdsByCurrency.get(currency);
    }

    /**
     * Retrieves a copy of the priced item data item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @returns {PricedItemDataItem}
     */
    getCurrencyPricedItem(currency) {
        currency = getCurrencyCode(currency);
        return this.getPricedItem(this.getCurrencyPricedItemId(currency));
    }

}


/**
 * @interface
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link PricedItemManager}.
 */
export class PricedItemsHandler {
    /**
     * Retrieves an array containing all the priced items. The priced items are presumed
     * to already be loaded when the {@link PricedItemManager} is constructed.
     * @returns {PricedItemDataItem[]}
     */
    getPricedItems() {
        throw Error('PricedItemsHandler.getPricedItems() abstract method!');
    }

    /**
     * Adds a new priced item.
     * @param {PricedItemDataItem} pricedItemDataItem 
     */
    async asyncAddPricedItem(pricedItemDataItem) {
        throw Error('PricedItemsHandler.addpricedItem() abstract method!');
    }

    /**
     * Modifies an existing priced item.
     * @param {PricedItemDataItem} pricedItemDataItem 
     */
    async asyncModifyPricedItem(pricedItemDataItem) {
        throw Error('PricedItemsHandler.modifyPricedItem() abstract method!');
    }

    /**
     * Removes an existing priced item.
     * @param {number} id 
     */
    async asyncRemovePricedItem(id) {
        throw Error('PricedItemsHandler.removePricedItem() abstract method!');
    }
}

/**
 * Simple in-memory implementation of {@link PricedItemsHandler}
 */
export class InMemoryPricedItemsHandler extends PricedItemsHandler {
    constructor(pricedItems) {
        super();

        this._pricedItemsById = new Map();

        if (pricedItems) {
            pricedItems.forEach((pricedItem) => {
                this._pricedItemsById.set(pricedItem.id, pricedItem);
            });
        }
    }

    getPricedItems() {
        return Array.from(this._pricedItemsById.values());
    }

    async asyncAddPricedItem(pricedItemDataItem) {
        this._pricedItemsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncModifyPricedItem(pricedItemDataItem) {
        this._pricedItemsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncRemovePricedItem(id) {
        this._pricedItemsById.delete(id);
    }
}
