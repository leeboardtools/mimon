/**
 * Parses a string into an integer, returning NaN if the string is not fully
 * parseable (parseInt() will still return a number if the string contains extra text...)
 * @param {number|string} value 
 * @returns {number}
 */
export function parseExactInt(value) {
    if (typeof value === 'number') {
        return Math.round(value);
    }
    if (typeof value !== 'string') {
        return NaN;
    }
    value = value.trim();

    // eslint-disable-next-line max-len
    // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
    if (/^[-+]?(\d+|Infinity)$/.test(value)) {
        return Number(value);
    } 
    else {
        return NaN;
    }

}
