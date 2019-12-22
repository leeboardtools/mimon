
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

