function getCleanKeys(object) {
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; ) {
        const value = object[keys[i]];
        if ((value === undefined) || (value === null) || (value === '')) {
            keys.splice(i, 1);
        }
        else {
            ++i;
        }
    }
    return keys;
}

/**
 * Determines if two entities are similar.
 * Two entities are similar if all their properties are in turn similar.
 * Properties are considered similar if any of the following are true
 * of their values:
 * <li>The values satisfy <code>===</code>.
 * <li>The values are <code>undefined</code>, <code>null</code>, or
 * the empty string.
 * <li>Both values are Arrays and their contents must element by element
 * also be similar.
 * @param {*} a 
 * @param {*} b 
 * @returns {boolean}
 */
export function areSimilar(a, b) {
    if ((a === null) || (a === '')) {
        a = undefined;
    }
    if ((b === null) || (b === '')) {
        b = undefined;
    }

    if (a === b) {
        return true;
    }

    const type = typeof a;
    if (type !== typeof b) {
        return false;
    }

    switch (type) {
    case 'number' :
    case 'bigint' :
    case 'string' :
    case 'symbol' :
    case 'function' :
        return false;

    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
            return false;
        }

        // Need to use the max length to support trailing undefineds.
        const length = Math.max(a.length, b.length);
        for (let i = length - 1; i >= 0; --i) {
            if (!areSimilar(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }
    else if (Array.isArray(b)) {
        return false;
    }

    const aKeys = getCleanKeys(a);
    const bKeys = getCleanKeys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }

    const sortedBKeys = new Set(bKeys);
    for (let i = aKeys.length - 1; i >= 0; --i) {
        const key = aKeys[i];
        if (!sortedBKeys.delete(key)) {
            return false;
        }

        if (!areSimilar(a[key], b[key])) {
            return false;
        }
    }

    return true;
}
