/**
 * Determines if two sets contain the same elements.
 * @param {Set<*>} a 
 * @param {Set<*>} b 
 * @returns {boolean}   <code>true></code> if a contains the same elements a b.
 */

export function doSetsHaveSameElements(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a.size !== b.size) {
        return false;
    }

    for (let element of a) {
        if (!b.has(element)) {
            return false;
        }
    }

    return true;
}