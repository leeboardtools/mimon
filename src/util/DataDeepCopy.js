/**
 * Performs a simple deep copy of a data object.
 * At present only JSON-compatible properties are copied.
 * @param {object} data 
 * @returns {object}
 */
export function dataDeepCopy(data) {
    if (typeof data === 'object') {
        return JSON.parse(JSON.stringify(data));
    }

    return data;
}