/**
 * @typedef {object} dataChange-Result
 * Object returned by {@link dataChange}
 * @property {*} newObject  The new object, this is always a copy of the object
 * passed to {@link dataChange}.
 * @property {*} oldChangedValues An object whose properties are the properties
 * of the object that were changed, and whose values are the original values.
 */

/**
 * Applies changes to a data object, saving what was changed so that calling
 * this again with the saved changes brings the new object back to the original
 * state, so for something like this:
 * <pre><code>
 *      const result = dataChange(original, changes);
 *      const result2 = dataChange(result.newObject, result.oldChangedValues);
 *      const isEqual = deepEqual(original, result2.newObject);
 * </code></pre>
 * <code>isEqual</code> would be truthy, with the following caveat:
 * <p>
 * Changed properties whose value are <code>undefined</code> are removed from 
 * the object, so if the original object had the properties as <code>undefined</code>
 * they will not be restored exactly.
 * <p>
 * Also note that changes are only applied at the properties of original, and not to
 * any property values that are also objects.
 * @param {*} original 
 * @param {*} changes 
 * @return {dataChange-Result}
 */
export function dataChange(original, changes) {
    const result = {};
    if (changes) {
        result.oldChangedValues = {};
        const { oldChangedValues } = result;

        for (let name in changes) {
            const newValue = changes[name];
            const oldValue = original[name];
            if (newValue !== oldValue) {
                oldChangedValues[name] = oldValue;
            }
        }
    }

    result.newObject = Object.assign({}, original, changes);

    return result;
}