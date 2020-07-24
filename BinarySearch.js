/**
 * Simple binary search of a sorted array of numbers.
 * @param {Array} array The sorted array in increasing order, array[i] &lt; array[i+1].
 * No check is made.
 * @param {Number} value    The value to locate.
 * @returns {Number}    The index of the first element in array that is &le; value, if
 * value is &lt; array[0] then -1 is returned.
 */
export function bSearchNumberArray(array, value) {
    var lastIndex = array.length - 1;
    if (value < array[0]) {
        return -1;
    }
    else if (value >= array[lastIndex]) {
        return lastIndex;
    }

    var low = 0;
    var high = lastIndex;
    while ((high - low) > 1) {
        var mid = (low + high) >> 1;
        if (value < array[mid]) {
            high = mid;
        }
        else {
            low = mid;
        }
    }

    const startLowValue = array[low];
    while ((low >= 0) && (array[low] === startLowValue)) {
        --low;
    }
    ++low;

    return low;
}


/**
 * @callback bSearchCompare The comparison function used by {@link bSearch}.
 * Note that value may be an element in the array.
 * @param {object} value    The value to compare against.
 * @param {object} arrayValue   The value in the array to compare against.
 * @param {object[]}    array   The array passed into {@link bSearch}.
 * @param {number}  index   The index of arrayValue in array.
 * @returns {number}    &lt; 0 if value is before arrayValue, &gt; 0 if value is 
 * after arrayValue, 0 if value is the same as arrayValue.
 */


/**
 * Simple binary search of a sorted array using a comparison function.
 * @param {Array} array The sorted array in increasing order, array[i] &lt; array[i+1].
 * No check is made.
 * @param {object} value    The value to locate.
 * @param {bSearchCompare}    compare The comparison function.
 * @returns {Number}    The index of the first element in array that is &le; value, if
 * value is &lt; array[0] then -1 is returned.
 */
export function bSearch(array, value, compare) {
    const lastIndex = array.length - 1;
    if (lastIndex < 0) {
        return lastIndex;
    }

    let result = compare(value, array[0], array, 0);
    if (result <= 0) {
        return (result < 0) ? -1 : 0;
    }

    var low;
    result = compare(value, array[lastIndex], array, lastIndex);
    if (result >= 0) {
        if (result > 0) {
            return lastIndex;
        }
        low = lastIndex;
    }
    else {
        low = 0;
        var high = lastIndex;
        while ((high - low) > 1) {
            var mid = (low + high) >> 1;
            if (compare(value, array[mid], array, mid) < 0) {
                high = mid;
            }
            else {
                low = mid;
            }
        }
    }


    const startLowValue = array[low];
    while ((low >= 0) && !compare(startLowValue, array[low], array, low)) {
        --low;
    }
    ++low;

    return low;
}
