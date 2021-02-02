/**
 * @typedef {object} dataChange-Result
 * Object returned by {@link dataChange}
 * @property {*} updatedObject  The new object if any changes were made, otherwise
 * it is the original object.
 * @property {dataChange-SavedChanges} savedChanges
 */

/**
 * @typedef {object} dataChange-SavedChanges
 * @property {*} changes
 * @property {Array} changesPath
 */

/**
 * @typedef {object} dataChange-Args
 * Optional single argument to {@link dataChange}
 * @property {*} original
 * @property {*} changes
 * @property {Array} changesPath
 * @property {boolean} [assignChanges]
 */

/**
 * Applies changes to a data object, saving what was changed so that calling
 * this again with the saved changes brings the new object back to the original
 * state, so for something like this:
 * <pre><code>     const result = dataChange(original, changes);
 *      const result2 = dataChange(result.updatedObject, 
 *          result.savedChanges.changes, result.changes.changesPath);
 *      const isEqual = deepEqual(original, result2.updatedObject);
 * </code></pre>
 * <code>isEqual</code> would be truthy, with the following caveat:
 * <p>
 * Changed properties whose values are <code>undefined</code> are removed from 
 * the object, so if the original object had the properties as <code>undefined</code>
 * they will not be restored as a property with value <code>undefined</code>.
 * <p>
 * Only simple objects and arrays are supported, Sets and Maps are not supported.
 * <p>
 * If the result of a call to dataChange() is passed to it unchanged, the effect is
 * to undo the previous change, so the following is equivalent to the previous
 * code snippet:
 * <pre><code>     const result = dataChange(original, changes);
 *      const result2 = dataChange(result);
 *      const isEqual = deepEqual(original, result2.updatedObject);
 * </code></pre>
 * <p>
 * Normally both the original argument and changes arguments are objects, 
 * however they can also be arrays, numbers, strings, <code>null</code>, or
 * <code>undefined</code>.
 * <p>
 * When both original and changes are objects, original is updated similar to:
 * <pre><code>     updatedObject = Object.assign({}, original, changes);
 * </code></pre>
 * For all other combinations of original and changes types a straight
 * substitution is performed.
 * <p>
 * A changesPath argument is also supported. This argument is required if
 * you want the changes argument to be <code>undefined</code>, otherwise 
 * dataChange() cannot distinguish between a {@link dataChange-Result} being passed
 * in.
 * <p>
 * The changesPath argument lets you specify a 'path' into sub-objects and arrays
 * of original so you don't have to replicate sub-objects that are not changing.
 * The changesPath argument is an array of strings and numbers. If an element is
 * a string it is the name of a property at that depth from original. If an element
 * is a number it is the index of an array at that depth from original.
 * <p>
 * When changesPath is specified, changes is applied as-is, with one exception. 
 * That is, if it is an empty object, the point referred to by the changesPath 
 * is replaced with the empty object.
 * <p>
 * The exception is if the assignChanges property is truthy in the
 * {@link dataChange-Args} (which must be used), and both the item to be changed
 * and changes are non-array objects. In this case Object.assign({}, item, changes)
 * is used.
 * <p>
 * For example:
 * <pre><code> const a = {
 *      b: {
 *          g: {
 *              m: 'mmm',
 *          },
 *          h: 123,
 *      },
 *      c: [ 
 *          0, 
 *          [
 *              100, 
 *              200, 
 *              {
 *                  w: null,
 *              },
 *          ],
 *      ],
 *  };
 *  // To change a.b.h to {}:
 *  result = dataChange(a, {}, ['b', h']);
 * 
 *  // To change a.c[1][2].w (which is null) to 73:
 *  result = dataChange(a, 73, ['c', 1, 2, 'w']);
 * 
 *  // To set a.c[3] to x.y.z:
 *  change = { z: 123, };
 *  result = dataChange(a, change, ['c', 3, 'x', 'y']);
 * </code></pre>
 * Any differences between the changesPath and original automatically forces a
 * change at that point.
 * 
 * @param {*} original May be an object, array, number, string,
 * <code>null</code>, <code>undefined</code>, {@link dataChange-Args}
 * or {@link dataChange-Result}.
 * @param {*} changes  May be an object, array, number, string,
 * <code>null</code>, <code>undefined</code>. If <code>undefined</code> is desired
 * then changesPath must also be specified. If changes is an object or an array,
 * it is highly recommended that it be a copy of the working object.
 * @param {Array} [changesPath] Array of elements that are strings or numbers, with
 * strings representing property names and numbers array indices.
 * @return {dataChange-Result}
 */
export function dataChange(original, changes, changesPath) {
    let assignChanges;
    if (!changes && !changesPath) {
        if ((original.changes !== undefined) || (original.changesPath !== undefined)) {
            changes = original.changes;
            changesPath = original.changesPath;
        }
        else {
            const { savedChanges } = original;
            if (!savedChanges) {
                const error = Error('If dataChange() is passed a single argument '
                    + 'that argument should be an object with either original, changes, '
                    + 'and optionally a changesPath property, or an object with '
                    + 'original and savedChanges properties.');
                console.error(error);
                throw error;
            }
            changes = savedChanges.changes;
            changesPath = savedChanges.changesPath;
        }
        assignChanges = original.assignChanges;

        original = original.original || original.updatedObject;
    }

    if (changesPath) {
        return handleChangesPath(original, changes, changesPath, assignChanges);
    }


    // Different types or either an array causes direct replacement.
    if ((typeof original !== typeof changes)
     || Array.isArray(original)
     || Array.isArray(changes)) {
        return {
            updatedObject: changes,
            savedChanges: {
                changes: original,
            }
        };
    }


    if (!changes || !Object.entries(changes).length) {
        // No changes...
        return {
            updatedObject: original,
            savedChanges: {},
        };
    }

    if (!original) {
        return {
            updatedObject: Object.assign({}, changes),
            savedChanges: {
                changes: undefined,
            }
        };
    }
    else if (original === {}) {
        return {
            updatedObject: Object.assign({}, changes),
            savedChanges: {
                changes: {},
                changesPath: [],
                // This forces changes to be applied as-is so {} can be assigned.
            }
        };
    }


    let oldChangedValues;

    for (let name in changes) {
        let newValue = changes[name];
        let oldValue = original[name];
        if (newValue !== oldValue) {
            if (!oldChangedValues) {
                oldChangedValues = {};
            }
            oldChangedValues[name] = oldValue;
        }
    }

    const result = {
        updatedObject: Object.assign({}, original, changes),
        savedChanges: {
            changes: oldChangedValues,
        }
    };

    if (!Object.entries(original).length) {
        // Need an empty changesPath in order to restore the {}
        result.savedChanges.changesPath = [];
    }

    return result;
}


//
//---------------------------------------------------------
//
function handleChangesPath(original, changes, changesPath, assignChanges) {
    // Changes is treated as-is...
    if (!changesPath.length) {
        return {
            updatedObject: changes,
            savedChanges: {
                changes: original,
                changesPath: [],
            },
        };
    }

    const objects = [
        original,
    ];

    for (let i = 0; i < changesPath.length; ++i) {
        const ref = changesPath[i];
        const type = typeof ref;
        if (type === 'string') {
            if ((typeof objects[i] !== 'object') || Array.isArray(objects[i])) {
                // Need to replace objects[i] with an object, which means everything
                // from changesPath[i - 1] onward is a new object.
                changes = convertPathToChanges(i - 1, changes, changesPath);
                break;
            }
            else if (!Object.prototype.hasOwnProperty.call(objects[i], ref)) {
                // objects[i] does not have the desired property, so we need
                // to change objects[i], and everything from changesPath[i] ownard
                // is the new object.
                objects.push(objects[i][ref]);
                changes = convertPathToChanges(i, changes, changesPath);
                break;
            }
        }
        else if (type === 'number') {
            if (!Array.isArray(objects[i])) {
                // Need to replace objects[i] with an array, which means everything
                // from changesPath[i - 1] ownard is a new object.
                changes = convertPathToChanges(i - 1, changes, changesPath);
                break;
            }
            else if (ref >= objects[i].length) {
                // This is a little tricky since we need to save the original size of
                // the array for restoring. That means we'll back up the changes
                // from objects[i].
                changes = convertPathToChanges(i, changes, changesPath);
                const array = Array.from(objects[i]);
                array[ref] = changes;
                changes = array;
                break;
            }
        }
        else {
            const error = Error('dataChange(): Elements of changesPath '
                + 'must either be strings or numbers. '
                + 'changesPath[' + i + '] = ' + changesPath[i]);
            console.error(error);
            throw error;
        }

        objects.push(objects[i][ref]);
    }

    // The last object gets replaced directly...
    const savedChanges = objects[objects.length - 1];
    if (assignChanges
     && (typeof savedChanges === 'object')
     && (typeof changes === 'object')
     && !Array.isArray(savedChanges)
     && !Array.isArray(changes)) {
        objects[objects.length - 1] = Object.assign({}, savedChanges, changes);
    }
    else {
        objects[objects.length - 1] = changes;
    }


    // Copy the objects in the chain and update the references...
    for (let i = objects.length - 2; i >= 0; --i) {
        switch (typeof changesPath[i]) {
        case 'string' :
            objects[i] = Object.assign({}, objects[i]);
            break;
        
        case 'number' :
            objects[i] = Array.from(objects[i]);
            break;
        }

        objects[i][changesPath[i]] = objects[i + 1];
    }

    return {
        updatedObject: objects[0],
        savedChanges: {
            changes: savedChanges,
            changesPath: changesPath.slice(0, objects.length - 1),
        }
    };
}


//
//---------------------------------------------------------
//
function convertPathToChanges(fromIndex, changes, changesPath) {
    let entry = changes;

    for (let i = changesPath.length - 1; i > fromIndex; --i) {
        const ref = changesPath[i];

        let parent;
        switch (typeof ref) {
        case 'string' :
            parent = {};
            break;
        
        case 'number' :
            parent = [];
            break;
        }

        parent[ref] = entry;
        entry = parent;
    }

    return entry;
}


/**
 * Resolves a data path like the changesPath argument of {@link dataChange},
 * retrieving the item at the end of the path.
 * @param {*} object 
 * @param {Array} path 
 * @returns {*} The item, <code>undefined</code> if any part of the path
 * could not be resolved.
 */
export function resolveDataPath(object, path) {
    return resolveDataPathWithInfo(object, path).resolvedItem;
}

/**
 * @typedef {object} resolveDataPathWithInfo-Result
 * @property {*} resolvedItem   The item resolved from the path, will be
 * <code>undefined</code> if the path was not fully resolved.
 * @property {number} pathIndex The index of the item in the path at which
 * {@link resolveDataPathWithInfo} returned, this will be path.length if
 * the path was fully resolved.
 */


/**
 * Resolves a data path like the changesPath argument of {@link dataChange},
 * retrieving the item at the end of the path along with the index along
 * the path.
 * @param {*} object 
 * @param {Array} path 
 * @returns {resolveDataPathWithInfo-Result}
 */
export function resolveDataPathWithInfo(object, path) {
    for (let i = 0; i < path.length; ++i) {
        const ref = path[i];
        switch (typeof ref) {
        case 'string':
            if (typeof object !== 'object') {
                return {
                    pathIndex: i,
                };
            }
            break;
        
        case 'number':
            if (!Array.isArray(object)
             || (ref >= object.length)) {
                return {
                    pathIndex: i,
                };
            }
            break;
        
        default:
        {
            const error = Error('dataChange(): Elements of changesPath '
                + 'must either be strings or numbers. '
                + 'path[' + i + '] = ' + path[i]);
            console.error(error);
            throw error;
        }
        }

        object = object[ref];
    }

    return {
        resolvedItem: object,
        pathIndex: path.length,
    };
}