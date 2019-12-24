import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getCurrencyCode, getCurrency } from '../util/Currency';
import { getQuantityDefinition } from '../util/Quantities';

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
            pricedItemDataItem.currency = pricedItem.currency.getCode();
            pricedItemDataItem.quantityDefinition = pricedItem.quantityDefinition.getName();
            return pricedItemDataItem;
        }
    }

    return pricedItem;
}


/**
 * Manages {@link PricedItemDataItem}s.
 */
export class PricedItemManager {
    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
        
        this._idGenerator = new NumericIdGenerator();

        this._currencyPricedItemIdsByCurrency = new Map();
        this._pricedItemsById = new Map();

        this._currencyUSDPricedItemId = this._idGenerator.generateId();
        this._currencyUSDPricedItem = this._addPricedItem(this._currencyUSDPricedItemId, {
            type: PricedItemType.CURRENCY,
            currency: 'USD',
        });

        this._currencyEURPricedItemId = this._idGenerator.generateId();
        this._currencyEURPricedItem = this._addPricedItem(this._currencyEURPricedItemId, {
            type: PricedItemType.CURRENCY,
            currency: 'EUR',
        });

        this._baseCurrency = accountingSystem.getBaseCurrency();
        this._currencyBasedPricedItemId = this._currencyPricedItemIdsByCurrency.get(this._baseCurrency);
        if (!this._currencyBasedPricedItemId) {
            const id = this._idGenerator.generateId();
            this._addPricedItem(id, {
                type: PricedItemType.CURRENCY,
                currency: this._baseCurrency,
            });

            this._currencyBasedPricedItemId = id;
        }
        this._currencyBasePricedItem = this._pricedItemsById.get(this._currencyBasedPricedItemId);
    }

    getAccountingSystem() { return this._accountingSystem; }


    /**
     * @returns {Currency}  The base currency, from {@link AccountingSystem#getBaseCurrency}.
     */
    getBaseCurrency() { return this._baseCurrency; }

    /**
     * @returns {number}    The id of the base currency priced item.
     */
    getCurrencyBasePricedItemId() { return this._currencyBasedPricedItemId; }

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

    

    _addPricedItem(id, pricedItem) {
        const item = Object.assign({}, pricedItem, { id: id });

        this._pricedItemsById.set(id, item);

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
