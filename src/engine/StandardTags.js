import { userMsg } from '../util/UserMessages';
import { cleanSpaces } from '../util/StringUtils';

/**
 * @typedef {object}    TagDef
 * @property {string}   name
 * @property {string}   description
 */

 
/**
 * Enumeration of the standard account tags
 * @readonly
 * @enum {TagDef}
 * @property {TagDef}   INTEREST
 * @property {TagDef}   DIVIDENDS
 * @property {TagDef}   SHORT_TERM_CAPITAL_GAINS
 * @property {TagDef}   LONG_TERM_CAPITAL_GAINS
 * @property {TagDef}   ORDINARY_INCOME
 * @property {TagDef}   STOCK_GRANTS
 * @property {TagDef}   FEES
 * @property {TagDef}   BANK_FEES
 * @property {TagDef}   BROKERAGE_COMMISSIONS
 * @property {TagDef}   TAXES
 * @property {TagDef}   EQUITY
 */
export const StandardAccountTag = {
    INTEREST: { name: 'INTEREST' },
    DIVIDENDS: { name: 'DIVIDENDS' },
    SHORT_TERM_CAPITAL_GAINS: { name: 'SHORT_TERM_CAPITAL_GAINS'},
    LONG_TERM_CAPITAL_GAINS: { name: 'LONG_TERM_CAPITAL_GAINS'},
    ORDINARY_INCOME: { name: 'ORDINARY_INCOME'},
    STOCK_GRANTS: { name: 'STOCK_GRANTS'},
    FEES: { name: 'FEES' },
    BANK_FEES: { name: 'BANK_FEES' },
    BROKERAGE_COMMISSIONS: { name: 'BROKERAGE_COMMISSIONS' },
    TAXES: { name: 'TAXES' },
    EQUITY: { name: 'EQUITY' },
};



/**
 * Retrieves the user description representation of a tag, which is the
 * description property of the tag if it is a {@link StandardAccountTag}
 * or the tag itself.
 * @param {StandardAccountTag|string} tag 
 * @returns {string}    The user description representation of the tag.
 */
export function getTagDescription(tag) {
    return (tag && tag.description) ? tag.description : tag;
}

/**
 * Retrieves the storable string representation of a tag. Basically if the
 * tag has a name property, like {@link StandardAccountTag}s do, the name
 * property is returned, otherwise the tag is returned after being
 * passed to {@link cleanSpaces}.
 * @param {StandardAccountTag|string} tag 
 * @returns {string}
 */
export function getTagString(tag) {
    if (tag) {
        if (tag.name) {
            return tag.name;
        }
        return cleanSpaces(tag);
    }
}


export function loadStandardTags() {

    for (const tag of Object.values(StandardAccountTag)) {
        tag.description = userMsg('AccountTag-' + tag.name);
    }
}