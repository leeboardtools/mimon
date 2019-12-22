

/**
 * Cleans up an object to be returned by an overridden toJSON() method, removing any
 * enumerated properties that have the value <code>undefined</code>.
 * @param {object} json The JSON object to be cleaned up.
 */
export function toCleanJSON(json) {
    const cleanJSON = {};
    for (const [key, value] of Object.entries(json)) {
        if (value !== undefined) {
            cleanJSON[key] = value;
        }
    }
    return cleanJSON;
};


/**
 * Converts a {@link Map} to a JSON object that can be passed to {@link jsonToMap} to get an equivalent Map back.
 * @param {Map} map The map to convert.
 * @returns {object}    The JSON object.
 */
export function mapToJSON(map) {
    if (!map) {
        return map;
    }

    return Array.from(map.entries());
}

/**
 * Converts a JSON object created by {@link mapToJSON} to an eqiuivalent Map.
 * @param {object} json
 * @returns {Map}   The equivalent Map object.
 */
export function jsonToMap(json) {
    if (!json) {
        return json;
    }

    return new Map(json);
}

/**
 * Converts a {@link Set} to a JSON object that can be passed to {@link jsonToSet} to get an equivalent Set back.
 * @param {Set} set The set to convert.
 * @returns {object}    The JSON object.
 */
export function setToJSON(set) {
    if (!set) {
        return set;
    }

    return Array.from(set.values());
}

/**
 * Converts a JSON object created by {@link setToJSON} to an equivalent Set.
 * @param {object} json
 * @returns {Set}   The equivalent Set object.
 */
export function jsonToSet(json) {
    if (!json) {
        return json;
    }

    return new Set(json);
}
