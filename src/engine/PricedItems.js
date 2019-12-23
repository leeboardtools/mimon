import { userMsg } from '../util/UserMessages';
import { IdGenerator } from '../util/Ids';
import { Currencies } from '../util/Currency';

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

export function pricedItemType(ref) {
    return (typeof ref === 'string') ? PricedItemType[ref] : ref;
}


export function loadPricedItemUserMessages() {
    for (const type of Object.values(PricedItemType)) {
        type.description = userMsg('PricedItemType-' + type.name);
    }
}


export class PricedItemManager {
    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
        
        this._idGenerator = new IdGenerator();

        this._currencyPricedItemLocalIdsByCurrency = new Map();
        this._pricedItemsByLocalId = new Map();
        this._pricedItemsByUUID = new Map();


        this._currencyUSDPricedItemId = this._idGenerator.newIdOptions();
        this._currencyUSDPricedItem = this._addPricedItem(this._currencyUSDPricedItemId, {
            type: PricedItemType.CURRENCY,
            currency: 'USD',
        });

        this._currencyEURPricedItemId = this._idGenerator.newIdOptions();
        this._currencyEURPricedItem = this._addPricedItem(this._currencyEURPricedItemId, {
            type: PricedItemType.CURRENCY,
            currency: 'EUR',
        });

        const baseCurrency = accountingSystem.getBaseCurrency();
        if (!this._currencyPricedItemLocalIdsByCurrency.get(baseCurrency)) {
            const localId = this._idGenerator.newIdOptions();
            this._addPricedItem(localId, {
                type: PricedItemType.CURRENCY,
                currency: baseCurrency,
            });
        }
    }

    getAccountingSystem() { return this._accountingSystem; }


    getCurrencyUSDPricedItemLocalId() { return this._currencyUSDPricedItemId.localId; }
    getCurrencyUSDPricedItem() { return Object.assign({}, this._currencyUSDPricedItem); }


    getCurrencyEURPricedItemLocalId() { return this._currencyEURPricedItemId.localId; }
    getCurrencyEURPricedItem() { return Object.assign({}, this._currencyEURPricedItem); }


    _addPricedItem(id, pricedItem) {
        const item = Object.assign({}, pricedItem, { id: id });

        this._pricedItemsByLocalId.set(id.localId, item);
        this._pricedItemsByUUID.set(id.uuid, item);

        if (pricedItemType(pricedItem.type) === PricedItemType.CURRENCY) {
            this._currencyPricedItemLocalIdsByCurrency.set(item.currency, id.localId);
        }

        return item;
    }

    _getPricedItem(ref) {
        if (typeof ref === 'number') {
            return this._pricedItemsByLocalId.get(ref);
        }
        else if (ref.uuid) {
            ref = ref.uuid;
        }

        return this._pricedItemsByUUId.get(ref);
    }

    getPricedItem(ref) {
        const pricedItem = this._getPricedItem(ref);
        return (pricedItem) ? Object.assign({}, pricedItem) : undefined;
    }

    getCurrencyPricedItemLocalId(currency) {
        return this._currencyPricedItemLocalIdsByCurrency.get(currency);
    }

    getCurrencyPricedItem(currency) {
        return this.getPricedItem(this.getCurrencyPricedItemLocalId(currency));
    }
}
