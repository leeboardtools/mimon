function arrayCompare(a, b) {
    if (a.length !== b.length) {
        return a.length - b.length;
    }

    for (let i = 0; i < a.length; ++i) {
        const result = compare(a[i], b[i]);
        if (result) {
            return result;
        }
    }

    return 0;
}

function objectCompare(a, b) {
    const entriesA = Object.entries(a);
    const entriesB = Object.entries(b);
    if (entriesA.length !== entriesB.length) {
        return entriesA.length - entriesB.length;
    }

    entriesA.sort(([keyA], [keyB]) => (keyA === keyB)
        ? 0
        : (keyA < keyB) ? -1 : 1);
    entriesB.sort(([keyA], [keyB]) => (keyA === keyB)
        ? 0
        : (keyA < keyB) ? -1 : 1);
    
    for (let i = 0; i < entriesA.length; ++i) {
        const entryA = entriesA[i];
        const entryB = entriesB[i];
        if (entryA[0] !== entryB[0]) {
            return (entryA[0] < entryB[0]) ? -1 : 1;
        }

        const result = compare(entryA[1], entryB[1]);
        if (result) {
            return result;
        }
    }

    return 0;
}


/**
 * Compares two values, return &lt; 0 if a is before b, 0 if a is equal to b, &gt; 
 * 0 if a is after b.
 * <p>
 * The following priority is given to the types (compare(undefined, null) will 
 * return a value &lt; 0...):
 * <li>undefined is before everything else
 * <li>null
 * <li>numbers
 * <li>strings
 * <li>arrays
 * <li>objects - only enumerable properties are compared, and these are compared
 * first by key then value with the keys first sorted.
 * <li>everything else. These are compared by converting a and b to strings
 * via toString() and then comparing the strings.
 * <p>
 * No attempt is made to detect circular references, there should not be any.
 * @param {*} a 
 * @param {*} b 
 * @returns {number}
 */
export function compare(a, b) {
    if (a === b) {
        return 0;
    }
    if (a === undefined) {
        // b === undefined handled by a === b
        return -1;
    }
    else if (b === undefined) {
        return 1;
    }

    if (a === null) {
        // b === null handled by a === b
        return -1;
    }
    else if (b === null) {
        return 1;
    }

    if (typeof a === 'number') {
        if (typeof b === 'number') {
            return a - b;
        }
        return -1;
    }
    else if (typeof b === 'number') {
        return 1;
    }

    if (typeof a === 'string') {
        if (typeof b === 'string') {
            // a === b handled at top.
            return (a < b)
                ? -1 : 1;
        }
        else {
            return -1;
        }
    }
    else if (typeof b === 'string') {
        return 1;
    }

    if (Array.isArray(a)) {
        if (Array.isArray(b)) {
            return arrayCompare(a, b);
        }
        else {
            return -1;
        }
    }
    else if (Array.isArray(b)) {
        return 1;
    }

    if (typeof a === 'object') {
        if (typeof b === 'object') {
            return objectCompare(a, b);
        }
        else {
            return -1;
        }
    }
    else if (typeof b === 'object') {
        return 1;
    }

    a = a.toString();
    b = b.toString();
    return (a === b) 
        ? 0 
        : ((a < b) ? -1 : 1);
}


/**
 * Class to help perform multi-level comparisons.
 * <p>
 * {@link MultiCompare#setCompareOrder} is used to control the order and direction
 * of comparisons.
 * <p>
 * If {@link MultiCompare#setCompareOrder} is not called or does not specify any of
 * the comparators, the default comparison will be used, which by default will
 * be the same as if {@link compare} were called.
 * If a key-less comparator is specified in the comparator list for the 
 * constructor, its compare property will be the default compare.
 */
export class MultiCompare {
    /**
     * @constructor
     * @param {MultiCompare~Comparator[]} comparators 
     */
    constructor(comparators) {
        this.compare = this.compare.bind(this);

        this._comparators = {};
        this._activeComparators = [];
        this._finalSign = 1;
        this._defaultCompare = compare;

        if (comparators) {
            comparators.forEach((comparator) => {
                if (!comparator.key) {
                    this._defaultCompare = comparator.compare;
                }
                else {
                    this._comparators[comparator.key] = comparator.compare;
                }
            });
        }
    }

    /**
     * @callback MultiCompare~CompareCallback
     * @param {*} a
     * @param {*} b
     * @param {number} sortSign This will either be 1 or -1.
     * @returns {number}
     */

    /**
     * @typedef {object} MultiCompare~Comparator
     * @property {string} key
     * @property {MultiCompare~CompareCallback} compare
     */

    /**
     * @typedef {object} MultiCompare~CompareDef
     * @property {string} key
     * @property {number} [sortSign=1] Optional sign for the comparison, if &ge; 0
     * then the normal comparison order for the comparator will be used,
     * otherwise the reverse order will be used.
     */

    /**
     * Sets the comparison order.
     * <p>
     * If an entry does not not have a key, then the sign of the entry
     * is used as the default sign. In other words, to reverse the comparison
     * order for the case when all specified comparators return 0,
     * you can call:
     * <pre><code>
     *     multiCompare.setCompareOrder({ sortSign: -1, });
     * </code></pre>
     * <p>
     * If all the specified comparators return 0 then {@link compare} will
     * be called.
     * @param {MultiCompare~CompareDef|MultiCompare~CompareDef[]} compareOrder 
     */
    setCompareOrder(compareOrder) {
        this._activeComparators = [];
        this._finalSign = 1;
        if (compareOrder) {
            if (!Array.isArray(compareOrder)) {
                compareOrder = [compareOrder];
            }

            compareOrder.forEach((compareDef) => {
                let sortSign = 1;
                if (compareDef.sortSign < 0) {
                    sortSign = -1;
                }

                const comparator = this._comparators[compareDef.key];
                if (comparator) {
                    this._activeComparators.push({
                        key: compareDef.key,
                        compare: comparator,
                        sortSign: sortSign,
                    });
                }
                else if (!compareDef.key) {
                    this._finalSign = sortSign;
                }
            });
        }
    }

    /**
     * 
     * @returns {MultiCompare~CompareDef[]} An array containing the active
     * compare order. The final entry is the final sign, its key property
     * is undefined.
     */
    getCompareOrder() {
        const compareOrder = this._activeComparators.map((comparator) => {
            return {
                key: comparator.key,
                sortSign: comparator.sortSign,
            };
        });

        compareOrder.push({
            sortSign: this._finalSign,
        });

        return compareOrder;
    }


    /**
     * The main comparison method.
     * @param {*} a 
     * @param {*} b 
     * @returns {number} A value &lt; 0 if a is to appear before b,
     * &gt; 0 if a is to appear after b, and 0 if a is considered the same
     * as b.
     */
    compare(a, b) {
        for (let i = 0; i < this._activeComparators.length; ++i) {
            const { compare, sortSign } = this._activeComparators[i];
            const result = compare(a, b, sortSign);
            if (result) {
                return result * sortSign;
            }
        }

        return this._defaultCompare(a, b, this._finalSign) * this._finalSign;
    }
}
