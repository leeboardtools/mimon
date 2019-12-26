import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getCurrencyCode, getCurrency } from '../util/Currency';
import { getQuantityDefinition, getQuantityDefinitionName } from '../util/Quantities';
import { userError } from '../util/UserMessages';

/**
 * @typedef {object}    PricedItemTypeDef
 * @property {string}   name    The name of the priced item type.
 * @property {strign}   description The user readable description of the priced item type.
 */

/**
 * The priced item classes.
 * @readonly
 * @enum {PricedItemTypeDef}
 * @property {PricedItemTypeDef}  CURRENCY
 * @property {PricedItemTypeDef}  SECURITY
 * @property {PricedItemTypeDef}  MUTUAL_FUND
 * @property {PricedItemTypeDef}  REAL_ESTATE
 * @property {PricedItemTypeDef}  PROPERTY
 */
export const PricedItemType = {
    CURRENCY: { name: 'CURRENCY', validateFunc: validateCurrencyDataItem },
    SECURITY: { name: 'SECURITY', validateFunc: validateSecurityDataItem, hasTickerSymbol: true },
    MUTUAL_FUND: { name: 'MUTUAL_FUND', validateFunc: validateMutualFundDataItem, hasTickerSymbol: true },
    REAL_ESTATE: { name: 'REAL_ESTATE', validateFunc: validateRealEstateDataItem, },
    PROPERTY: { name: 'PROPERTY', validateFunc: validatePropertyDataItem, },
    // COLLECTIBLE: { name: 'COLLECTIBLE', },
};

function validateCurrencyDataItem(manager, item, isModify) {
    if (!item.quantityDefinition) {
        const currency = getCurrency(item.currency);
        item.quantityDefinition = getQuantityDefinitionName(currency.getQuantityDefinition());
    }

    const currencyName = manager._getCurrencyName(item.currency, item.quantityDefinition);
    const existingId = manager._currencyPricedItemIdsByCurrency.get(currencyName);
    if (existingId) {
        if (!isModify || (existingId !== item.id)) {
            return userError('PricedItemManager-currency_already_exists', item.currency);
        }
    }
}

function validateSecurityDataItem(manager, item, isModify) {

}

function validateMutualFundDataItem(manager, item, isModify) {

}

function validateRealEstateDataItem(manager, item, isModify) {

}

function validatePropertyDataItem(manager, item, isModify) {

}


/**
 * @param {(string|PricedItemTypeDef)} ref 
 * @returns {PricedItemTypeDef} Returns the {@link PricedItemTypeDef} represented by ref.
 */
export function getPricedItemType(ref) {
    return (typeof ref === 'string') ? PricedItemType[ref] : ref;
}

/**
 * @param {(string|PricedItemType)} type 
 * @returns {string}
 */
export function getPricedItemTypeName(type) {
    return ((type === undefined) || (typeof type === 'string')) ? type : type.name;
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
        const type = getPricedItemType(pricedItemDataItem.type);
        const currency = getCurrency(pricedItemDataItem.currency);
        const quantityDefinition = getQuantityDefinition(pricedItemDataItem.quantityDefinition);
        if ((type !== pricedItemDataItem.type)
         || (currency !== pricedItemDataItem.currency)
         || (quantityDefinition !== pricedItemDataItem.quantityDefinition)) {
            // We're using Object.assign() to create a copy just in case there are other properties.
            const pricedItem = Object.assign({}, pricedItemDataItem);
            pricedItem.type = type;
            pricedItem.currency = currency;
            pricedItem.quantityDefinition = quantityDefinition;
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
        const typeName = getPricedItemTypeName(pricedItem.type);
        const currencyCode = getCurrencyCode(pricedItem.currency);
        const quantityDefinitionName = getQuantityDefinitionName(pricedItem.quantityDefinition);
        if ((typeName !== pricedItem.type)
         || (currencyCode !== pricedItem.currency)
         || (quantityDefinitionName !== pricedItem.quantityDefinition)) {
            const pricedItemDataItem = Object.assign({}, pricedItem);
            pricedItemDataItem.type = typeName;
            pricedItemDataItem.currency = currencyCode;
            pricedItemDataItem.quantityDefinition = quantityDefinitionName;
            return pricedItemDataItem;
        }
    }

    return pricedItem;
}



/**
 * Manages {@link PricedItemDataItem}s.
 * <p>
 * Note that priced items with the PricedItemType.CURRENCY are restricted to only one priced item per currency.
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
        this._requiredCurrencyPricedItemIds = new Set();

        const pricedItems = this._handler.getPricedItems();
        pricedItems.forEach((pricedItem) => {
            this._pricedItemsById.set(pricedItem.id, pricedItem);
            if (pricedItem.type === PricedItemType.CURRENCY.name) {
                const currencyName = this._getCurrencyName(pricedItem.currency, pricedItem.quantityDefinition);
                this._currencyPricedItemIdsByCurrency.set(currencyName, pricedItem);
            }
        });
    }


    async asyncSetupForUse() {
        let usdPricedItem = this.getCurrencyPricedItemDataItemWithId('USD');
        if (!usdPricedItem) {
            usdPricedItem = await this.asyncAddCurrencyPricedItem('USD');
        }
        this._currencyUSDPricedItemId = usdPricedItem.id;
        this._currencyUSDPricedItem = usdPricedItem;
        this._requiredCurrencyPricedItemIds.add(usdPricedItem.id);


        let eurPricedItem = this.getCurrencyPricedItemDataItemWithId('EUR');
        if (!eurPricedItem) {
            eurPricedItem = await this.asyncAddCurrencyPricedItem('EUR');
        }
        this._currencyEURPricedItemId = eurPricedItem.id;
        this._currencyEURPricedItem = eurPricedItem;
        this._requiredCurrencyPricedItemIds.add(eurPricedItem.id);


        this._baseCurrency = this._accountingSystem.getBaseCurrency();
        let baseCurrencyPricedItem = this.getCurrencyPricedItemDataItemWithId(this._baseCurrency);
        if (!baseCurrencyPricedItem) {
            baseCurrencyPricedItem = await this.asyncAddCurrencyPricedItem(this._baseCurrency);
        }
        this._currencyBasePricedItemId = baseCurrencyPricedItem.id;
        this._currencyBasePricedItem = baseCurrencyPricedItem;
        this._requiredCurrencyPricedItemIds.add(baseCurrencyPricedItem.id);
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

    

    async _asyncAddPricedItem(pricedItem) {
        pricedItem = getPricedItemDataItem(pricedItem);

        const pricedItemData = Object.assign({}, pricedItem);
        
        const id = this._idGenerator.generateId();
        pricedItemData.id = id;
        const idGeneratorState = this._idGenerator.toJSON();

        await this._handler.asyncAddPricedItem(pricedItemData, idGeneratorState);

        this._pricedItemsById.set(id, pricedItemData);

        if (getPricedItemType(pricedItem.type) === PricedItemType.CURRENCY) {
            const currencyName = this._getCurrencyName(pricedItemData.currency, pricedItemData.quantityDefinition);
            this._currencyPricedItemIdsByCurrency.set(currencyName, id);
        }

        return pricedItemData;
    }

    _getPricedItem(id) {
        return this._pricedItemsById.get(id);
    }


    /**
     * @returns {number[]}  Array containing the ids of all the priced items.
     */
    getPricedItemIds() {
        return Array.from(this._pricedItemsById.keys());
    }


    /**
     * 
     * @param {number} id The id of the priced item to retrieve.
     * @returns {(PricedItemDataItem|undefined)}    A copy of the priced item's data.
     */
    getPricedItemDataItemWithId(id) {
        const pricedItem = this._getPricedItem(id);
        return (pricedItem) ? Object.assign({}, pricedItem) : undefined;
    }

    _getCurrencyName(currency, quantityDefinition) {
        const code = getCurrencyCode(currency);
        if (!quantityDefinition) {
            currency = getCurrency(code);
            quantityDefinition = currency.getQuantityDefinition();
        }

        const definitionName = getQuantityDefinitionName(quantityDefinition);
        return code + '_' + definitionName;
    }

    /**
     * Retrieves the priced item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity definition, if
     * <code>undefined</code> the currency's quantity definition is used.
     * @returns {number}
     */
    getCurrencyPricedItemId(currency, quantityDefinition) {
        const currencyName = this._getCurrencyName(currency, quantityDefinition);
        return this._currencyPricedItemIdsByCurrency.get(currencyName);
    }

    /**
     * Retrieves a copy of the priced item data item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity definition, if
     * <code>undefined</code> the currency's quantity definition is used.
     * @returns {PricedItemDataItem}
     */
    getCurrencyPricedItemDataItemWithId(currency, quantityDefinition) {
        return this.getPricedItemDataItemWithId(this.getCurrencyPricedItemId(currency, quantityDefinition));
    }


    /**
     * Adds a priced item representing a currency.
     * @param {(string|Currency)} currency 
     * @param {boolean} validateOnly 
     * @param {PricedItemDataItem} options 
     */
    async asyncAddCurrencyPricedItem(currency, validateOnly, options) {
        const pricedItem = Object.assign({}, options);
        pricedItem.type = PricedItemType.CURRENCY;
        pricedItem.currency = currency;

        return this.asyncAddPricedItem(pricedItem, validateOnly);
    }

    /**
     * Adds a priced item.
     * @param {(PricedItem|PricedItemDataItem)} pricedItem 
     * @param {boolean} validateOnly 
     * @returns {PricedItemDataItem} Note that this object will not be the same as the pricedItem arg.
     * @throws {Error}
     */
    async asyncAddPricedItem(pricedItem, validateOnly) {
        let pricedItemDataItem = getPricedItemDataItem(pricedItem);
        const type = getPricedItemType(pricedItemDataItem.type);
        if (!type) {
            throw userError('PricedItemManager-invalid_type', pricedItemDataItem.type);
        }

        const currency = getCurrency(pricedItemDataItem.currency);
        if (!currency) {
            throw userError('PricedItemManager-invalid_currency', pricedItemDataItem.currency);
        }

        if (type.validateFunc) {
            const error = type.validateFunc(this, pricedItemDataItem);
            if (error) {
                throw error;
            }
        }

        if (!getQuantityDefinition(pricedItemDataItem.quantityDefinition)) {
            throw userError('PricedItemManager-quantity_definition_missing');
        }

        if (validateOnly) {
            return;
        }

        return this._asyncAddPricedItem(pricedItemDataItem);
    }

    /**
     * Removes a priced item.
     * @param {number} id 
     * @param {boolean} validateOnly 
     * @returns {PricedItemDataItem}    The priced item that was removed.
     * @throws {Error}
     */
    async asyncRemovePricedItem(id, validateOnly) {
        if (this._requiredCurrencyPricedItemIds.has(id)) {
            throw userError('PricedItemManager-remove_required_currency');
        }

        const pricedItem = this._pricedItemsById.get(id);
        if (!pricedItem) {
            throw userError('PricedItemManager-remove_no_id', id);
        }

        if (validateOnly) {
            return;
        }

        const type = getPricedItemType(pricedItem.type);
        if (type === PricedItemType.CURRENCY) {
            const currencyName = this._getCurrencyName(pricedItem.currency, pricedItem.quantityDefinition);
            this._currencyPricedItemIdsByCurrency.delete(currencyName);
        }

        this._pricedItemsById.delete(id);

        await this._handler.asyncRemovePricedItem(id);

        return pricedItem;
    }

    /**
     * Modifies an existing priced item. The type cannot be modified.
     * @param {(PricedItemData|PricedItem)} pricedItem The new priced item properties. The id property is required. For all other
     * properties, if the property is not included in pricedItem, the property will not be changed.
     * @param {boolean} validateOnly 
     * @throws {Error}
     */
    async asyncModifyPricedItem(pricedItem, validateOnly) {
        const id = pricedItem.id;

        const oldPricedItem = this._pricedItemsById.get(id);
        if (!oldPricedItem) {
            throw userError('PricedItemManager-modify_no_id', id);
        }

        let newPricedItem = Object.assign({}, oldPricedItem, pricedItem);
        newPricedItem = getPricedItemDataItem(newPricedItem);

        if (newPricedItem.type !== oldPricedItem.type) {
            throw userError('PricedItemManager-modify_type_change');
        }

        const type = getPricedItemType(newPricedItem.type);
        const error = type.validateFunc(this, newPricedItem, true);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return newPricedItem;
        }

        await this._handler.asyncModifyPricedItem(newPricedItem);
        this._pricedItemsById.set(id, newPricedItem);

        if (type === PricedItemType.CURRENCY) {
            const oldCurrencyName = this._getCurrencyName(oldPricedItem.currency, oldPricedItem.quantityDefinition);
            const newCurrencyName = this._getCurrencyName(newPricedItem.currency, newPricedItem.quantityDefinition);
            
            if (oldCurrencyName !== newCurrencyName) {
                this._currencyPricedItemIdsByCurrency.delete(oldCurrencyName);
                this._currencyPricedItemIdsByCurrency.set(newCurrencyName, id);
            }
        }

        return newPricedItem;
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link PricedItemManager}.
 * @interface
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
     * @param {NumericIdGenerator~Options}  idGeneratorState    The current state of the id generator.
     */
    async asyncAddPricedItem(pricedItemDataItem, idGeneratorState) {
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

    async asyncAddPricedItem(pricedItemDataItem, idGeneratorState) {
        this._pricedItemsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncModifyPricedItem(pricedItemDataItem) {
        this._pricedItemsById.set(pricedItemDataItem.id, pricedItemDataItem);
    }

    async asyncRemovePricedItem(id) {
        this._pricedItemsById.delete(id);
    }
}