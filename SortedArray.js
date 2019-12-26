import { bSearch } from './BinarySearch';


/**
 * Simple sorted array that uses a comparison function.
 */
export class SortedArray {
    /**
     * @callback SortedArray~KeyCallback
     * @param {object}  value   The value whose key is desired.
     * @returns {object}    The key for value.
     */
    /**
     * @typedef {object}    SortedArray~Options
     * @property {string}  [duplicates=undefined]  How to handle duplicates, allowed values are:
     * <li>'ignore' (the default, {@link SortedArray#add} returns -1 for duplicates
     * <li>'allow'
     * <li>'replace' Existing values are replaced.
     * @property {object[]} [initialValues] Optional initial values for the array. These will be sorted.
     * @property {SortedArray~KeyCallback}  [keyCallback]   Optional callback for retrieving a key from an array value.
     */

    /**
     * @constructor
     * @param {bSearchCompare} compare The binary search comparison function.
     * @param {SortedArray~Options} [options]
     */
    constructor(compare, options) {
        options = options || {};

        this._compare = compare;
        this._duplicates = options.duplicates || 'ignore';
        this._keyCallback = options.keyCallback || ((value) => value);

        if (options.initialValues) {
            this._array = Array.from(options.initialValues).sort();
            if (this._duplicates !== 'allow') {
                // We need to make sure there aren't any duplicates...
                for (let i = 1; i < this._array.length;) {
                    const key = this._keyCallback(this._array[i - 1]);
                    if (!this._compare(key, this._array[i])) {
                        this._array.splice(i, 1);
                    }
                    else {
                        ++i;
                    }
                }
            }
        }
        else {
            this._array = [];
        }
    }

    /**
     * @returns {number}    The number of elements in the array.
     */
    get length() { return this._array.length; }

    /**
     * @returns {object[]}  The array.
     */
    getValues() { return this._array; }

    /**
     * @returns {bSearchCompare}    The binary search comparison function.
     */
    getCompare() { return this._compare; }

    /**
     * @returns {string}   The duplicates setting, one of 'ignore', 'allow', or 'replace'
     */
    duplicates() { return this._duplicates; }

    /**
     * Retrieves the value at a given index.
     * @param {number} index
     */
    at(index) { return this._array[index]; }

    /**
     * Retrieves the index of the element that is equal to or is the closest to but less than a value.
     * @param {object} value
     * @returns {number}
     */
    indexLE(value) {
        value = this._keyCallback(value);
        return bSearch(this._array, value, this._compare);
    }

    /**
     * Retrieves the index of the element that is equal to or is the closest to but greater than a value.
     * @param {object} value
     */
    indexGE(value) {
        value = this._keyCallback(value);
        let index = bSearch(this._array, value, this._compare);
        if (index < 0) {
            return 0;
        }
        while ((index < this._array.length) && (this._compare(value, this._array[index]) >= 0)) {
            ++index;
        }
        if (!this._compare(value, this._array[index - 1])) {
            return index - 1;
        }
        return index;
    }

    /**
     * Determines the index of an element of a given value. If there are multiple entries of the index
     * this returns the lowest index.
     * @param {object} value The value of interest.
     * @returns {number}    The index, -1 if value is not in the array.
     */
    indexOf(value) {
        const index = this.indexLE(value);
        if ((index >= 0) && (index < this._array.length)) {
            value = this._keyCallback(value);
            if (!this._compare(value, this._array[index])) {
                return index;
            }
        }
        return -1;
    }

    /**
     * Adds a value to the array.
     * @param {object} value The value to add.
     * @returns {number}    The index where the value was inserted, -1 if duplicates are not allowed and the
     * value was already in the array.
     */
    add(value) {
        let index = this.indexLE(value);
        if (index < 0) {
            ++index;
        }
        else if (index < this._array.length) {
            value = this._keyCallback(value);
            if (!this._compare(value, this._array[index])) {
                switch (this._duplicates) {
                case 'ignore':
                    return -1;
                    
                case 'replace':
                    this._array[index] = value;
                    return index;
                }
            }
            else {
                ++index;
            }
        }
        this._array.splice(index, 0, value);
        return index;
    }

    /**
     * Deletes a value from the array.
     * @param {object} value The value to delete.
     * @returns {boolean}   <code>true</code> if the value was deleted from the array.
     */
    delete(value) {
        const index = this.indexOf(value);
        if (index >= 0) {
            this._array.splice(index, 1);
            return true;
        }
    }

    /**
     * Deletes a value at a specific index.
     * @param {number} index
     */
    deleteIndex(index) {
        this._array.splice(index, 1);
    }

    /**
     * Deletes a number of values starting at a specific index.
     * @param {number} index
     * @param {number} count
     */
    deleteIndexRange(index, count) {
        this._array.splice(index, count);
    }

    /**
     * Removes all the values from the array.
     */
    clear() {
        this._array = [];
    }

    /**
     * Calls a callback function for each value in the array, similar to {@link Array.forEach}.
     * @param {Function} callback
     */
    forEach(callback) {
        return this._array.forEach(callback);
    }

}
