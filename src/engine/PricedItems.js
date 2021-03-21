import { EventEmitter } from 'events';
import { userMsg } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import { getCurrencyCode, getCurrency, Currencies } from '../util/Currency';
import { getQuantityDefinition, getQuantityDefinitionName } from '../util/Quantities';
import { userError } from '../util/UserMessages';


/**
 * @typedef {object}    PricedItemTypeDef
 * @property {string}   name    The name of the priced item type.
 * @property {string}   description The user readable description of the priced item type.
 * @property {string}   pluralDescription The plural version of description.
 * @property {boolean}  [hasTickerSymbol]   If <code>true</code> priced items of this
 * type have a ticker symbol property.
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
    CURRENCY: { name: 'CURRENCY', 
        validateFunc: validateCurrencyDataItem,
    },
    SECURITY: { name: 'SECURITY', 
        validateFunc: validateSecurityDataItem, 
        hasTickerSymbol: true,
    },
    MUTUAL_FUND: { name: 'MUTUAL_FUND', 
        validateFunc: validateMutualFundDataItem, 
        hasTickerSymbol: true,
    },
    REAL_ESTATE: { name: 'REAL_ESTATE', 
        validateFunc: validateRealEstateDataItem, 
    },
    PROPERTY: { name: 'PROPERTY', 
        validateFunc: validatePropertyDataItem, 
    },
    // COLLECTIBLE: { name: 'COLLECTIBLE', },
};

function validateCurrencyDataItem(manager, item, isModify) {
    if (!item.quantityDefinition) {
        const currency = getCurrency(item.currency);
        item.quantityDefinition = getQuantityDefinitionName(
            currency.getQuantityDefinition());
        if (item.id !== manager._currencyBasePricedItemId) {
            item.isStandardCurrency = true;
        }
    }

    const currencyName = manager._getCurrencyPricedItemCurrencyName(item);
    const existingId = manager._currencyPricedItemIdsByCurrency.get(currencyName);
    if (existingId) {
        if ((item.id !== manager._currencyBasePricedItemId)
         && (!isModify || (existingId !== item.id))) {
            return userError('PricedItemManager-currency_already_exists', currencyName);
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
        type.pluralDescription = userMsg('PricedItemType-plural_' + type.name);
    }
    for (const type of Object.values(PricedItemOnlineUpdateType)) {
        type.description = userMsg('PricedItemOnlineUpdateType-' + type.name);
    }
}



/**
 * @typedef PricedItemOnlineUpdateTypeDef
 * @property {string}   name
 * @property {boolean}  hasUpdate
 * @property {string}   description
 */

/**
 * The types of online updating.
 * @readonly
 * @enum {PricedItemOnlineUpdateTypeDef}
 * @property {PricedItemOnlineUpdateTypeDef}    NONE
 * @property {PricedItemOnlineUpdateTypeDef}    YAHOO_FINANCE
 */
export const PricedItemOnlineUpdateType = {
    NONE: { name: 'NONE', hasUpdate: false, },
    YAHOO_FINANCE: { name: 'YAHOO_FINANCE', hasUpdate: true, },
};


/**
 * @param {(string|PricedItemOnlineUpdateTypeDef)} ref 
 * @returns {PricedItemTypeDef} Returns the {@link PricedItemTypeDef} represented by ref.
 */
export function getPricedItemOnlineUpdateType(ref) {
    return (typeof ref === 'string') ? PricedItemOnlineUpdateType[ref] : ref;
}

/**
 * @param {(string|PricedItemOnlineUpdateType)} type 
 * @returns {string}
 */
export function getPricedItemOnlineUpdateTypeName(type) {
    return ((type === undefined) || (typeof type === 'string')) ? type : type.name;
}


/**
 * @typedef {object} PricedItemDataItem
 * @property {number}   id  The priced item's id.
 * @property {string}   type    name property of one of {@link PricedItemType}.
 * @property {string}   [currency]  The 3 letter currency name of the currency 
 * underlying the priced item. If <code>undefined</code> the base currency from 
 * the priced item manager is to be used. Required if type is 
 * {@link PrciedItemType~CURRENCY}
 * @property {boolean}  [isStandardCurrency]    If <code>true</code> the priced
 * item is a standard built-in currency and cannot be modified nor removed.
 * @property {string}   quantityDefinition  The name of the {@link QuantityDefinition} 
 * defining quantities of the priced item.
 * @property {string}   [priceQuantityDefinition]   If specified the
 * name of the {@link QuantityDefinition} defining the prices of the item, normally
 * used for securities.
 * @property {string}   [name]  The user supplied name of the priced item.
 * @property {string}   [description]   The user supplied description of the 
 * priced item.
 * @property {string}   [ticker]    The ticker symbol, only for priced item types
 * that have hasTickerSymbol.
 * @property {string}   [onlineUpdateType]  The online update type, only for 
 * priced item types that have hasTickerSymbol.
 * @property {boolean}  [isInactive]
 */

/**
 * @typedef {object} PricedItem
 * @property {number}   id  The priced item's id.
 * @property {PricedItemType}   type    The priced item's type.
 * @property {Currency} [currency]  The currency object of the currency underlying 
 * the priced item. If <code>undefined</code> the base currency from the priced item
 * manager is to be used. Required if type is {@link PrciedItemType~CURRENCY}
 * @property {boolean}  [isStandardCurrency]    If <code>true</code> the priced
 * item is a standard built-in currency and cannot be modified nor removed.
 * @property {QuantityDefinition}   quantityDefinition  The quantity definition 
 * defining the priced item's quantities.
 * @property {QuantityDefinition}   [priceQuantityDefinition]   If specified the
 * QuantityDefinition defining the prices of the item, normally used for securities.
 * @property {string}   [name]  The user supplied name of the priced item.
 * @property {string}   [description]   The user supplied description of the priced item.
 * @property {string}   [ticker]    The ticker symbol, only for priced item types
 * that have hasTickerSymbol.
 * @property {PricedItemOnlineUpdateType}   [onlineUpdateType]  The online update 
 * type, only for priced item types that have hasTickerSymbol.
 * @property {boolean}  [isInactive]
 */

/**
 * Retrieves a {@link PricedItem} representation of a {@link PricedItemDataItem}.
 * @param {(PricedItemDataItem|PricedItem)} pricedItemDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {PricedItem}
 */
export function getPricedItem(pricedItemDataItem, alwaysCopy) {
    if (pricedItemDataItem) {
        const type = getPricedItemType(pricedItemDataItem.type);
        const currency = getCurrency(pricedItemDataItem.currency);
        const quantityDefinition = getQuantityDefinition(
            pricedItemDataItem.quantityDefinition);
        const priceQuantityDefinition = getQuantityDefinition(
            pricedItemDataItem.priceQuantityDefinition);
        const onlineUpdateType = getPricedItemOnlineUpdateType(
            pricedItemDataItem.onlineUpdateType);
        if (alwaysCopy
         || (type !== pricedItemDataItem.type)
         || (currency !== pricedItemDataItem.currency)
         || (quantityDefinition !== pricedItemDataItem.quantityDefinition)
         || (priceQuantityDefinition !== pricedItemDataItem.priceQuantityDefinition)
         || (onlineUpdateType !== pricedItemDataItem.onlineUpdateType)) {
            // We're using Object.assign() to create a copy just in case 
            // there are other properties.
            const pricedItem = Object.assign({}, pricedItemDataItem);
            if (type !== undefined) {
                pricedItem.type = type;
            }
            if (currency !== undefined) {
                pricedItem.currency = currency;
            }
            if (quantityDefinition !== undefined) {
                pricedItem.quantityDefinition = quantityDefinition;
            }
            if (priceQuantityDefinition !== undefined) {
                pricedItem.priceQuantityDefinition = priceQuantityDefinition;
            }
            if (onlineUpdateType !== undefined) {
                pricedItem.onlineUpdateType = onlineUpdateType;
            }
            return pricedItem;
        }
    }
    
    return pricedItemDataItem;
}

/**
 * Retrieves a {@link PricedItemDataItem} representation of a {@link PricedItem}.
 * @param {(PricedItem|PricedItemDataItem)} pricedItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {PricedItemDataItem}
 */
export function getPricedItemDataItem(pricedItem, alwaysCopy) {
    if (pricedItem) {
        const typeName = getPricedItemTypeName(pricedItem.type);
        const currencyCode = getCurrencyCode(pricedItem.currency);
        const quantityDefinitionName = getQuantityDefinitionName(
            pricedItem.quantityDefinition);
        const priceQuantityDefinitionName = getQuantityDefinitionName(
            pricedItem.priceQuantityDefinition);
        const onlineUpdateTypeName = getPricedItemOnlineUpdateTypeName(
            pricedItem.onlineUpdateType);
        if (alwaysCopy
         || (typeName !== pricedItem.type)
         || (currencyCode !== pricedItem.currency)
         || (quantityDefinitionName !== pricedItem.quantityDefinition)
         || (priceQuantityDefinitionName !== pricedItem.priceQuantityDefinition)
         || (onlineUpdateTypeName !== pricedItem.onlineUpdateType)) {
            const pricedItemDataItem = Object.assign({}, pricedItem);
            if (typeName !== undefined) {
                pricedItemDataItem.type = typeName;
            }
            if (currencyCode !== undefined) {
                pricedItemDataItem.currency = currencyCode;
            }
            if (quantityDefinitionName !== undefined) {
                pricedItemDataItem.quantityDefinition = quantityDefinitionName;
            }
            if (priceQuantityDefinitionName !== undefined) {
                pricedItemDataItem.priceQuantityDefinition = priceQuantityDefinitionName;
            }
            if (onlineUpdateTypeName !== undefined) {
                pricedItemDataItem.onlineUpdateType = onlineUpdateTypeName;
            }
            return pricedItemDataItem;
        }
    }

    return pricedItem;
}



/**
 * Manages {@link PricedItemDataItem}s.
 * <p>
 * The base currency is a special PricedItemType.CURRENCY priced item.
 * It's designed to be used as the default currency, particularly
 * for accounts. The idea is that the base currency can be changed and
 * it will be reflected by all the data items that refer to the base
 * currency priced item.
 * <p>
 * All other currencies are available in one of two forms. The first is
 * the default currency form, each currency is automatically added from
 * Currencies. These priced items cannot be modified nor removed.
 * <p>
 * In addition, specialized currencies with specific quantity definitions may
 * be added. These are treated as normal priced items.
 */
export class PricedItemManager extends EventEmitter {

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
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator 
            || this._handler.getIdGeneratorOptions());


        const undoManager = accountingSystem.getUndoManager();
        this._asyncApplyUndoAddPricedItem 
            = this._asyncApplyUndoAddPricedItem.bind(this);
        undoManager.registerUndoApplier('addPricedItem', 
            this._asyncApplyUndoAddPricedItem);

        this._asyncApplyUndoRemovePricedItem 
            = this._asyncApplyUndoRemovePricedItem.bind(this);
        undoManager.registerUndoApplier('removePricedItem', 
            this._asyncApplyUndoRemovePricedItem);

        this._asyncApplyUndoModifyPricedItem 
            = this._asyncApplyUndoModifyPricedItem.bind(this);
        undoManager.registerUndoApplier('modifyPricedItem', 
            this._asyncApplyUndoModifyPricedItem);


        this._currencyPricedItemIdsByCurrency = new Map();
        this._pricedItemDataItemsById = new Map();
        this._requiredCurrencyPricedItemIds = new Set();

        const baseOptions = this._handler.getBaseOptions() || {};
        this._currencyBasePricedItemId = baseOptions.currencyBasePricedItemId;

        const pricedItems = this._handler.getPricedItemDataItems();
        pricedItems.forEach((pricedItem) => {
            this._pricedItemDataItemsById.set(pricedItem.id, pricedItem);
            if ((pricedItem.type === PricedItemType.CURRENCY.name)
             && (pricedItem.id !== this._currencyBasePricedItemId)) {
                const currencyName = this._getCurrencyPricedItemCurrencyName(
                    pricedItem);
                this._currencyPricedItemIdsByCurrency.set(currencyName, pricedItem.id);
            }
        });
    }


    async asyncSetupForUse() {
        if (!this._currencyBasePricedItemId) {
            this._addingBaseCurrency = true;
            try {
                const pricedItem = (await this.asyncAddCurrencyPricedItem('USD'))
                    .newPricedItemDataItem;
                this._currencyBasePricedItemId = pricedItem.id;
            }
            finally {
                delete this._addingBaseCurrency;
            }
        }
        this._requiredCurrencyPricedItemIds.add(this._currencyBasePricedItemId);

        this._addingStandardCurrency = true;
        try {
            for (let code in Currencies) {
                let id = this._currencyPricedItemIdsByCurrency.get(code);
                if (!id) {
                    const pricedItem = (await this.asyncAddCurrencyPricedItem(code))
                        .newPricedItemDataItem;
                    id = pricedItem.id;
                }
                this._requiredCurrencyPricedItemIds.add(id);
            }
        }
        finally {
            delete this._addingStandardCurrency;
        }

        const baseOptions = {
            currencyBasePricedItemId: this._currencyBasePricedItemId,
        };
        await this._handler.asyncSetBaseOptions(baseOptions);
    }


    shutDownFromUse() {
        this._currencyPricedItemIdsByCurrency.clear();
        this._pricedItemDataItemsById.clear();
        this._requiredCurrencyPricedItemIds.clear();

        this._handler = undefined;
        this._accountingSystem = undefined;
    }


    getAccountingSystem() { return this._accountingSystem; }

    
    /**
     * @returns {number}    The id of the base currency priced item.
     */
    getBaseCurrencyPricedItemId() { return this._currencyBasePricedItemId; }

    /**
     * @returns {PricedItemDataItem}    The priced item for the base currency.
     */
    getBaseCurrencyPricedItemDataItem() { 
        return this.getPricedItemDataItemWithId(this._currencyBasePricedItemId); 
    }

    /**
     * @returns {string}    The currency of the base currency priced item.
     */
    getBaseCurrencyCode() {
        return this.getBaseCurrencyPricedItemDataItem().currency;
    }

    /**
     * @returns {Currency}  The currency of the base currency priced item.
     */
    getBaseCurrency() {
        return getCurrency(this.getBaseCurrencyCode());
    }



    async _asyncAddPricedItem(pricedItem) {
        const pricedItemDataItem = getPricedItemDataItem(pricedItem, true);
        if (this._addingStandardCurrency) {
            pricedItemDataItem.isStandardCurrency = true;
        }
        
        const id = this._idGenerator.generateId();
        pricedItemDataItem.id = id;
        const idGeneratorOptions = this._idGenerator.toJSON();

        const updatedDataItems = [[id, pricedItemDataItem]];
        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems, 
            idGeneratorOptions);

        this._pricedItemDataItemsById.set(id, pricedItemDataItem);

        if (!this._addingBaseCurrency
         && (getPricedItemType(pricedItem.type) === PricedItemType.CURRENCY)) {
            const currencyName = this._getCurrencyPricedItemCurrencyName(
                pricedItemDataItem);
            this._currencyPricedItemIdsByCurrency.set(currencyName, id);
        }

        return pricedItemDataItem;
    }

    _getPricedItem(id) {
        return this._pricedItemDataItemsById.get(id);
    }


    /**
     * @returns {number[]}  Array containing the ids of all the priced items.
     */
    getPricedItemIds() {
        return Array.from(this._pricedItemDataItemsById.keys());
    }


    /**
     * @param {string|PricedItemType} type 
     * @returns {number[]}  Array containing the ids of all the priced items
     * with type type.
     */
    getPricedItemIdsForType(type) {
        const typeName = getPricedItemTypeName(type);
        const ids = [];
        this._pricedItemDataItemsById.forEach((pricedItemDataItem, id) => {
            if (pricedItemDataItem.type === typeName) {
                ids.push(id);
            }
        });
        return ids;
    }


    /**
     * 
     * @param {number} id The id of the priced item to retrieve.
     * @returns {(PricedItemDataItem|undefined)}    A copy of the priced item's data.
     */
    getPricedItemDataItemWithId(id) {
        const pricedItem = this._getPricedItem(id);
        return (pricedItem) ? getPricedItemDataItem(pricedItem, true) : undefined;
    }


    _getCurrencyName(currency, quantityDefinition) {
        const code = getCurrencyCode(currency);
        if (!quantityDefinition) {
            return code;
        }

        const definitionName = getQuantityDefinitionName(quantityDefinition);
        return code + '_' + definitionName;
    }

    _getCurrencyPricedItemCurrencyName(pricedItemDataItem) {
        const quantityDefinition = (pricedItemDataItem.isStandardCurrency) 
            ? undefined 
            : pricedItemDataItem.quantityDefinition;
        return this._getCurrencyName(pricedItemDataItem.currency, 
            quantityDefinition);

    }

    /**
     * Retrieves the priced item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity 
     * definition, if <code>undefined</code> the currency's quantity definition is used.
     * @returns {number}
     */
    getCurrencyPricedItemId(currency, quantityDefinition) {
        const currencyName = this._getCurrencyName(currency, quantityDefinition);
        return this._currencyPricedItemIdsByCurrency.get(currencyName);
    }

    /**
     * Retrieves a copy of the priced item data item for a currency.
     * @param {(string|Currency)} currency Either a currency code or a {@link Currency}.
     * @param {(string|QuantityDefinition)} [quantityDefinition]    Optional quantity 
     * definition, if <code>undefined</code> the currency's quantity definition is used.
     * @returns {PricedItemDataItem}
     */
    getCurrencyPricedItemDataItem(currency, quantityDefinition) {
        return this.getPricedItemDataItemWithId(
            this.getCurrencyPricedItemId(currency, quantityDefinition));
    }


    async _asyncApplyUndoAddPricedItem(undoDataItem) {
        const { pricedItemId, idGeneratorOptions } = undoDataItem;

        const pricedItemDataItem = this.getPricedItemDataItemWithId(pricedItemId);

        const updatedDataItems = [[pricedItemId]];
        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems);

        this._pricedItemDataItemsById.delete(pricedItemId);
        this._idGenerator.fromJSON(idGeneratorOptions);

        const type = getPricedItemType(pricedItemDataItem.type);
        if ((type === PricedItemType.CURRENCY) 
         && (pricedItemDataItem.id !== this._currencyBasePricedItemId)) {
            const currencyName = this._getCurrencyPricedItemCurrencyName(
                pricedItemDataItem);
            this._currencyPricedItemIdsByCurrency.delete(currencyName);
        }

        this.emit('pricedItemRemove', { removedPricedItemDataItem: pricedItemDataItem });
    }


    async _asyncApplyUndoRemovePricedItem(undoDataItem) {
        const { removedPricedItemDataItem } = undoDataItem;

        const { id } = removedPricedItemDataItem;
        const updatedDataItems = [[ id, removedPricedItemDataItem ]];
        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems);

        this._pricedItemDataItemsById.set(id, removedPricedItemDataItem);

        this.emit('pricedItemAdd', { newPricedItemDataItem: removedPricedItemDataItem, });
    }


    async _asyncApplyUndoModifyPricedItem(undoDataItem) {
        const { oldPricedItemDataItem } = undoDataItem;

        const { id } = oldPricedItemDataItem;
        const newPricedItemDataItem = this.getPricedItemDataItemWithId(id);
        const updatedDataItems = [[ id, oldPricedItemDataItem ]];
        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems);

        this._pricedItemDataItemsById.set(id, oldPricedItemDataItem);

        const type = getPricedItemType(oldPricedItemDataItem.type);
        if ((type === PricedItemType.CURRENCY) 
         && (id !== this._currencyBasePricedItemId)) {
            const oldCurrencyName = this._getCurrencyName(oldPricedItemDataItem.currency, 
                oldPricedItemDataItem.quantityDefinition);
            const newCurrencyName = this._getCurrencyName(newPricedItemDataItem.currency, 
                newPricedItemDataItem.quantityDefinition);
            
            if (oldCurrencyName !== newCurrencyName) {
                this._currencyPricedItemIdsByCurrency.delete(newCurrencyName);
                this._currencyPricedItemIdsByCurrency.set(oldCurrencyName, id);
            }
        }

        this.emit('pricedItemModify', 
            { newPricedItemDataItem: oldPricedItemDataItem, 
                oldPricedItemDataItem: newPricedItemDataItem, 
            });
    }


    /**
     * Adds a priced item representing a currency.
     * @param {(string|Currency)} currency 
     * @param {boolean} validateOnly 
     * @param {PricedItemDataItem} options 
     * @returns {PricedItemManager~AddPricedItemResult|undefined}   
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {PricedItemManager~pricedItemAdd}
     */
    async asyncAddCurrencyPricedItem(currency, options, validateOnly) {
        const pricedItem = Object.assign({}, options);
        pricedItem.type = PricedItemType.CURRENCY;
        pricedItem.currency = currency;

        return this.asyncAddPricedItem(pricedItem, validateOnly);
    }

    /**
     * Fired by {@link PricedItemManager#asyncAddPricedItem} and 
     * {@link PricedItemManager#asyncAddCurrencyPricedItem} after the priced
     * item has been added.
     * @event PricedItemManager~pricedItemAdd
     * @type {object}
     * @property {PricedItemData}   newPricedItemData   The priced item data item 
     * being returned by the {@link PricedItemManager#asyncAddPricedItem} call.
     */

    /**
     * @typedef {object}    PricedItemManager~AddPricedItemResult
     * @property {PricedItemDataItem}   newPricedItemDataItem
     */

    /**
     * Adds a priced item.
     * @param {(PricedItem|PricedItemDataItem)} pricedItem 
     * @param {boolean} validateOnly 
     * @returns {PricedItemManager~AddPricedItemResult|undefined}   
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {PricedItemManager~pricedItemAdd}
     */
    async asyncAddPricedItem(pricedItem, validateOnly) {
        let pricedItemDataItem = getPricedItemDataItem(pricedItem);
        const type = getPricedItemType(pricedItemDataItem.type);
        if (!type) {
            throw userError('PricedItemManager-invalid_type', pricedItemDataItem.type);
        }

        const currency = getCurrency(pricedItemDataItem.currency);
        if (!currency) {
            throw userError('PricedItemManager-invalid_currency', 
                pricedItemDataItem.currency);
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
        
        const originalIdGeneratorOptions = this._idGenerator.toJSON();

        pricedItemDataItem = await this._asyncAddPricedItem(pricedItemDataItem);
        pricedItemDataItem = getPricedItemDataItem(pricedItemDataItem, true);

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('addPricedItem', 
                { pricedItemId: pricedItemDataItem.id, 
                    idGeneratorOptions: originalIdGeneratorOptions, 
                });


        this.emit('pricedItemAdd', { newPricedItemDataItem: pricedItemDataItem, });
        return { newPricedItemDataItem: pricedItemDataItem, undoId: undoId };
    }

    /**
     * Fired by {@link PricedItemManager#asyncRemovedPricedItem} after a priced item 
     * has been removed.
     * @event PricedItemManager~pricedItemRemove
     * @type {object}
     * @property {PricedItemDataItem}   removedPricedItemDataItem   The priced item 
     * data item being returned by the {@link PricedItemManager#asyncRemovePricedItem} 
     * call.
     */

    /**
     * @typedef {object}    PricedItemManager~RemovePricedItemResult
     * @property {PricedItemDataItem}   removedPricedItemDataItem
     */

    /**
     * Removes a priced item.
     * @param {number} id 
     * @param {boolean} validateOnly 
     * @returns {PricedItemManager~RemovePricedItemResult|undefined}   
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {PricedItemManager~pricedItemRemove}
     */
    async asyncRemovePricedItem(id, validateOnly) {
        if (this._requiredCurrencyPricedItemIds.has(id)) {
            throw userError('PricedItemManager-remove_required_currency');
        }

        const pricedItemDataItem = this._pricedItemDataItemsById.get(id);
        if (!pricedItemDataItem) {
            throw userError('PricedItemManager-remove_no_id', id);
        }

        if (validateOnly) {
            return;
        }

        const type = getPricedItemType(pricedItemDataItem.type);
        if ((type === PricedItemType.CURRENCY) 
         && (pricedItemDataItem.id !== this._currencyBasePricedItemId)) {
            const currencyName = this._getCurrencyName(pricedItemDataItem.currency, 
                pricedItemDataItem.quantityDefinition);
            this._currencyPricedItemIdsByCurrency.delete(currencyName);
        }

        this._pricedItemDataItemsById.delete(id);

        const updatedDataItems = [[id]];
        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems);

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('removePricedItem', 
                { removedPricedItemDataItem: 
                    getPricedItemDataItem(pricedItemDataItem, true), 
                });

        this.emit('pricedItemRemove', { removedPricedItemDataItem: pricedItemDataItem });
        return { removedPricedItemDataItem: pricedItemDataItem, undoId: undoId, };
    }

    /**
     * Fired by {@link PricedItemManager#asyncModifyPricedItem} after the priced item 
     * has been modified.
     * @event PricedItemManager~pricedItemModify
     * @type {object}
     * @property {PricedItemDataItem}   newPricedItemDataItem   The new priced item data 
     * item being returned by the {@link PricedItemManager#asyncAddPricedItem} call.
     * @property {PricedItemDataItem}   oldPricedItemDataItem   The old priced item data 
     * item being returned by the {@link PricedItemManager#asyncAddPricedItem} call.
     */


    /**
     * @typedef {object}    PricedItemManager~ModifyPricedItemResult
     * @property {PricedItemDataItem}   newPricedItemDataItem
     * @property {PricedItemDataItem}   oldPricedItemDataItem
     */

    /**
     * Modifies an existing priced item. The type cannot be modified.
     * @param {(PricedItemData|PricedItem)} pricedItem The new priced item properties. 
     * The id property is required. For all other properties, if the property is not 
     * included in pricedItem, the property will not be changed.
     * @param {boolean} validateOnly 
     * @returns {PricedItemManager~ModifyPricedItemResult|undefined}   
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {PricedItemManager~pricedItemModify}
     */
    async asyncModifyPricedItem(pricedItem, validateOnly) {
        const id = pricedItem.id;

        const oldPricedItemDataItem = this._pricedItemDataItemsById.get(id);
        if (!oldPricedItemDataItem) {
            throw userError('PricedItemManager-modify_no_id', id);
        }

        if (oldPricedItemDataItem.isStandardCurrency) {
            throw userError('PricedItemManager-modify_standard_currency');
        }

        let newPricedItemDataItem = Object.assign({}, oldPricedItemDataItem, pricedItem);
        newPricedItemDataItem = getPricedItemDataItem(newPricedItemDataItem);


        if (newPricedItemDataItem.type !== oldPricedItemDataItem.type) {
            throw userError('PricedItemManager-modify_type_change');
        }

        const type = getPricedItemType(newPricedItemDataItem.type);
        if (type.validateFunc) {
            const error = type.validateFunc(this, newPricedItemDataItem, true);
            if (error) {
                throw error;
            }
        }

        if (validateOnly) {
            return newPricedItemDataItem;
        }

        const updatedDataItems = [[id, newPricedItemDataItem]];

        await this._handler.asyncUpdatePricedItemDataItems(updatedDataItems);

        this._pricedItemDataItemsById.set(id, newPricedItemDataItem);

        if (type === PricedItemType.CURRENCY) {
            if (id !== this._currencyBasePricedItemId) {
                const oldCurrencyName = this._getCurrencyName(
                    oldPricedItemDataItem.currency, 
                    oldPricedItemDataItem.quantityDefinition);
                const newCurrencyName = this._getCurrencyName(
                    newPricedItemDataItem.currency, 
                    newPricedItemDataItem.quantityDefinition);
                
                if (oldCurrencyName !== newCurrencyName) {
                    this._currencyPricedItemIdsByCurrency.delete(oldCurrencyName);
                    this._currencyPricedItemIdsByCurrency.set(newCurrencyName, id);
                }
            }
            else {
                // Base currency.
                // Make sure the quantity definition is the currency's.
                newPricedItemDataItem.quantityDefinition 
                    = getCurrency(newPricedItemDataItem.currency)
                        .getQuantityDefinition().getName();
            }
        }

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('modifyPricedItem', 
                { oldPricedItemDataItem: 
                    getPricedItemDataItem(oldPricedItemDataItem, true), 
                });

        newPricedItemDataItem = getPricedItemDataItem(newPricedItemDataItem, true);
        this.emit('pricedItemModify', 
            { newPricedItemDataItem: newPricedItemDataItem, 
                oldPricedItemDataItem: oldPricedItemDataItem 
            });
        return { newPricedItemDataItem: newPricedItemDataItem, 
            oldPricedItemDataItem: oldPricedItemDataItem, 
            undoId: undoId, 
        };
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact 
 * with the {@link PricedItemManager}.
 * @interface
 */
export class PricedItemsHandler {
    
    /**
     * Retrieves an array containing all the priced items. The priced items are presumed
     * to already be loaded when the {@link PricedItemManager} is constructed.
     * @returns {PricedItemDataItem[]}
     */
    getPricedItemDataItems() {
        throw Error('PricedItemsHandler.getPricedItemDataItems() abstract method!');
    }

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for initializing 
     * the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('PricedItemsHandler.getIdGeneratorOptions() abstract method!');
    }


    /**
     * Called by {@link PricedItemManager#asyncSetupForUse} to save the base options 
     * of the manager.
     * @param {object} options The options, a JSON-able object.
     */
    async asyncSetBaseOptions(baseOptions) {
        throw Error('PricedItemsHandler.asyncSetBaseOptiosn() abstract method!');
    }

    /**
     * @returns {object}    The base options object passed to 
     * {@link PricedItemsHandler#asyncSetBaseOptinos}.
     */
    getBaseOptions() {
        throw Error('PricedItemsHandler.getBaseOptiosn() abstract method!');
    }


    /**
     * Main function for updating the priced item data items.
     * @param {*} idPricedItemDataItemPairs Array of one or two element sub-arrays. 
     * The first element of each sub-array is the priced item id. For new or modified 
     * priced items, the second element is the new data item. For priced items to be 
     * deleted, this is <code>undefined</code>.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The current 
     * state of the id generator, if <code>undefined</code> the generator state hasn't 
     * changed.
     */
    async asyncUpdatePricedItemDataItems(idPricedItemDataItemPairs, idGeneratorOptions) {
        throw Error('PricedItemsHandler.pricedItemModify() abstract method!');
    }

}


/**
 * Simple in-memory implementation of {@link PricedItemsHandler}
 */
export class InMemoryPricedItemsHandler extends PricedItemsHandler {
    constructor(pricedItems) {
        super();

        this._pricedItemDataItemsById = new Map();

        if (pricedItems) {
            pricedItems.forEach((pricedItem) => {
                this._pricedItemDataItemsById.set(pricedItem.id, pricedItem);
            });
        }

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            pricedItems: Array.from(this._pricedItemDataItemsById.values()),
            baseOptions: this._baseOptions,
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._pricedItemDataItemsById.clear();
        json.pricedItems.forEach((pricedItemDataItem) => {
            this._pricedItemDataItemsById.set(pricedItemDataItem.id, pricedItemDataItem);
        });

        this._baseOptions = json.baseOptions;

        this.markChanged();
    }


    getPricedItemDataItems() {
        return Array.from(this._pricedItemDataItemsById.values());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncSetBaseOptions(baseOptions) {
        this._baseOptions = baseOptions;
        this.markChanged();
    }

    getBaseOptions() {
        return this._baseOptions;
    }

    async asyncUpdatePricedItemDataItems(idPricedItemDataItemPairs, idGeneratorOptions) {
        idPricedItemDataItemPairs.forEach(([id, pricedItemDataItem]) => {
            if (!pricedItemDataItem) {
                this._pricedItemDataItemsById.delete(id);
            }
            else {
                this._pricedItemDataItemsById.set(id, pricedItemDataItem);
            }
        });

        if (idGeneratorOptions) {
            this._idGeneratorOptions = idGeneratorOptions;
        }

        this.markChanged();
    }

}
