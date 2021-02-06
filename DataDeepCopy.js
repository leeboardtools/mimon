/**
 * Performs a simple deep copy of a data object.
 * <p>
 * For Set and Map instances a copy of the Set or Map is returned with
 * all the entries also deep copied.
 * <p>
 * Date objects are returned as-is.
 * <p>
 * For arrays the elements of the array are deep copied.
 * <p>
 * For objects the properties enumerated by for..in are deep copied,
 * prototypes are not copied. Objects are items where typeof item === 'object'
 * and are not one of the previously mentioned built-in objects.
 * <p>
 * Everything else is returned as-is.
 * <p>
 * As objects are deep copied within the function they are kept track
 * of, and only one copy of the object is made. For multiple references
 * the same copy is repeated. Circular references are supported.
 * @param {*} data 
 * @returns {*}
 */
export function dataDeepCopy(data) {
    if ((typeof data === 'object') && (data !== null)) {
        return dataDeepCopyImpl(data, new Map());
    }

    return data;
}

function dataDeepCopyImpl(data, refMap) {
    let copy;

    if (refMap.has(data)) {
        return refMap.get(data);
    }

    if (Array.isArray(data)) {
        copy = [];
        refMap.set(data, copy);
        data.forEach((item) => copy.push(dataDeepCopyImpl(item, refMap)));
        return copy;
    }
    else if (typeof data === 'object') {
        if (data === null) {
            return data;
        }
        if (data instanceof Date) {
            return data;
        }
        if (data instanceof Set) {
            copy = new Set();
            refMap.set(data, copy);
            data.forEach((value) => copy.add(dataDeepCopyImpl(value, refMap)));
            return copy;
        }
        if (data instanceof Map) {
            copy = new Map();
            refMap.set(data, copy);
            data.forEach((value, key) => copy.set(
                dataDeepCopyImpl(key, refMap), 
                dataDeepCopyImpl(value, refMap)));
            return copy;
        }

        copy = {};
        refMap.set(data, copy);

        for (const name in data) {
            copy[name] = dataDeepCopyImpl(data[name], refMap);
        }
        return copy;
    }

    return data;
}
