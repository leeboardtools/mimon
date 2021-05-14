/**
 * Simple ring buffer.
 */
export class RingBuffer {
    constructor(args) {
        this[Symbol.iterator] = this.values;

        let bufferSize = 10;
        this._bufferSize = bufferSize;
        this._buffer = [];
        this._nextIndex = 0;
        this._firstIndex = 0;
        this._elementCount = 0;

        if (Array.isArray(args)) {
            this._bufferSize = this._elementCount = args.length;
            this._buffer = Array.from(args);
        }
        else if (typeof args === 'number') {
            this._bufferSize = args;
        }
        else if (typeof args === 'object') {
            // TODO:

        }
    }


    /**
     * @returns {number} The maximum number of elements the buffer holds. When
     * {@link RingBuffer#elementCount} equals this value the buffer is full and
     * pushing new elements will cause the oldest element to be removed.
     */
    bufferSize() { 
        return this._bufferSize; 
    }

    /**
     * @returns {number} The number of elements currently in the buffer.
     */
    elementCount() {
        return this._elementCount;
    }


    /**
     * Removes all the elements from the buffer.
     */
    clear() {
        this._nextIndex = 0;
        this._firstIndex = 0;
        this._elementCount = 0;
    }


    /**
     * Adds an element to the highest position in the ring buffer. If the buffer is
     * full then the oldest element is removed.
     * @param {*} element 
     * @return {*} element
     */
    push(element) {
        this._buffer[this._nextIndex] = element;
        ++this._nextIndex;
        if (this._nextIndex >= this._bufferSize) {
            this._nextIndex = 0;
        }

        if (this._elementCount >= this._bufferSize) {
            ++this._firstIndex;

            if (this._firstIndex >= this._bufferSize) {
                this._firstIndex = 0;
            }
        }
        else {
            ++this._elementCount;
        }

        return element;
    }


    /**
     * Removes and returns the oldest element in the buffer.
     * @returns {*|undefined} <code>undefined</code> is returned if there are no elements
     * in the buffer.
     */
    popOldest() {
        if (!this._elementCount) {
            return;
        }

        const element = this._buffer[this._firstIndex];
        ++this._firstIndex;
        if (this._firstIndex >= this._bufferSize) {
            this._firstIndex = 0;
        }

        --this._elementCount;
        return element;
    }


    /**
     * Removes and returns the newest element in the buffer.
     * @returns {*|undefined}   <code>undefined</code> is returned if there are 
     * no elements in the buffer.
     */
    popNewest() {
        if (!this._elementCount) {
            return;
        }

        let newestIndex = this._nextIndex - 1;
        if (newestIndex < 0) {
            newestIndex += this._bufferSize;
        }

        const element = this._buffer[newestIndex];
        this._nextIndex = newestIndex;

        --this._elementCount;
        return element;
    }


    /**
     * Retrieves the element at a given index. The element at index 0 is the oldest 
     * element, the element at index {@link RingBuffer#elementCount} - 1 is the newest.
     * @param {number} index The index, if negative then the index is calculated from
     * {@link RingBuffer#elementCount} + index.
     * @returns {*|undefined} <code>undefined</code> is returned if index is out of range.
     */
    at(index) {
        index = this._indexToBufferIndex(index);
        if (index !== undefined) {
            return this._buffer[index];
        }
    }

    _indexToBufferIndex(index) {
        if (index < 0) {
            if (-index > this._elementCount) {
                return;
            }

            index += this._nextIndex;
            if (index < 0) {
                index += this._bufferSize;
            }
        }
        else {
            if (index >= this._elementCount) {
                return;
            }

            index += this._firstIndex;
            if (index >= this._bufferSize) {
                index -= this._bufferSize;
            }
        }

        return index;
    }


    /**
     * Replaces the element at a given index.
     * @param {number} index 
     * @param {*} element 
     * @throws {RangeError}
     */
    setAt(index, element) {
        index = this._indexToBufferIndex(index);
        if (index !== undefined) {
            this._buffer[index] = element;
        }
        else {
            throw new RangeError('index is out of range');
        }
    }


    /**
     * Determines the index of the first instance of an element in the buffer.
     * @param {*} element 
     * @param {number} [fromIndex=0]
     * @returns {number} The index of the first instance of element in the buffer,
     * -1 if the element is not present.
     */
    indexOf(element, fromIndex) {
        if (!this._elementCount) {
            return -1;
        }

        if (typeof fromIndex === 'number') {
            if ((fromIndex < 0) || (fromIndex >= this._elementCount)) {
                return -1;
            }
        }
        else {
            fromIndex = 0;
        }

        if (this._firstIndex < this._nextIndex) {
            for (let i = this._firstIndex + fromIndex; i < this._nextIndex; ++i) {
                if (this._buffer[i] === element) {
                    return i - this._firstIndex;
                }
            }
        }
        else {
            let i = this._firstIndex + fromIndex;
            for (; i < this._bufferSize; ++i) {
                if (this._buffer[i] === element) {
                    return i - this._firstIndex;
                }
            }

            i -= this._bufferSize;
            for (; i < this._nextIndex; ++i) {
                if (this._buffer[i] === element) {
                    return i + this._bufferSize - this._firstIndex;
                }
            }
        }

        return -1;
    }


    /**
     * Retrieves the index of the occurence of an element in the buffer starting
     * from an index and searching backwards.
     * @param {*} element 
     * @param {number} [fromIndex] If specified the index to start the search from,
     * otherwise the search is started from the newest element position.
     * @returns {number} The index, -1 if not found.
     */
    lastIndexOf(element, fromIndex) {
        if (fromIndex === undefined) {
            fromIndex = this._elementCount - 1;
        }
        if ((fromIndex < 0) || (fromIndex >= this._elementCount)) {
            return -1;
        }

        if (this._firstIndex < this._nextIndex) {
            for (let i = fromIndex; i >= this._firstIndex; --i) {
                if (this._buffer[i] === element) {
                    return i + this._firstIndex;
                }
            }
        }
        else {
            const firstToEnd = this._bufferSize - this._firstIndex;
            if (fromIndex > firstToEnd) {
                fromIndex -= firstToEnd;
                for (let i = fromIndex; i >= 0; --i) {
                    if (this._buffer[i] === element) {
                        return i + firstToEnd;
                    }
                }

                fromIndex = this._bufferSize - 1;
            }
            else {
                fromIndex += this._firstIndex;
            }

            for (let i = fromIndex; i >= this._firstIndex; --i) {
                if (this._buffer[i] === element) {
                    return i - this._firstIndex;
                }
            }
        }

        return -1;
    }


    /**
     * Determines if the ring buffer contains a given element.
     * @param {*} element 
     * @returns {boolean}
     */
    includes(element) {
        return this.indexOf(element) >= 0;
    }


    /**
     * Retrieves an Iterator object that contains the elements of the buffer
     * in insertion order.
     * @returns {Iterator}
     */
    values() {
        const ringBuffer = this;
        return {
            _index: 0,

            next: function () {
                if (this._index >= ringBuffer._elementCount) {
                    return {
                        done: true,
                    };
                }
                const result = {
                    value: ringBuffer.at(this._index),
                    done: false,
                };
                ++this._index;
                return result;
            },
            
            [Symbol.iterator]: function () {
                return this;
            }

        };
    }


    /**
     * @callback RingBuffer~forEachCallback
     * @param {*} value
     * @param {number} index
     * @param {RingBuffer} ringBuffer
     */


    /**
     * Executes a callback function for each element in the ring buffer in order
     * from oldest to newest.
     * @param {RingBuffer~forEachCallback} callback 
     * @param {*} thisArg Value to use as this when executing callback.
     */
    forEach(callback, thisArg) {
        if (!this._elementCount || !callback) {
            return;
        }

        const callbackToUse = (thisArg)
            ? (value, index, buffer) => callback.call(thisArg, value, index, buffer)
            : callback;

        if (this._firstIndex < this._nextIndex) {
            for (let i = this._firstIndex; i < this._nextIndex; ++i) {
                callbackToUse(this._buffer[i], i - this._firstIndex, this);
            }
        }
        else {
            for (let i = this._firstIndex; i < this._buffer.length; ++i) {
                callbackToUse(this._buffer[i], i - this._firstIndex, this);
            }

            const base = this._buffer.length - this._firstIndex;
            for (let i = 0; i < this._nextIndex; ++i) {
                callbackToUse(this._buffer[i], i + base, this);
            }
        }
    }

}
