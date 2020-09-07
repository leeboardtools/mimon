import { bSearch } from './BinarySearch';

function codePointCompare(value, arrayValue) {
    return value.codePoint - arrayValue.codePoint;
}

function nodeHasValue(node) {
    return Object.prototype.hasOwnProperty.call(node, 'value');
}


function getNextValueNode(stack) {
    for (; stack.length;) {    
        const stackEntry = stack[stack.length - 1];
        let [node, childIndex] = stackEntry;
        let valueNode;
        if (childIndex === -1) {
            if (nodeHasValue(node)) {
                valueNode = node;
            }
        }

        ++childIndex;
        if (childIndex >= node.childNodes.length) {
            --stack.length;
        }
        else {
            stack.push([node.childNodes[childIndex], -1]);
            stackEntry[1] = childIndex;
        }

        if (valueNode) {
            return valueNode;
        }
    }
}



/**
 * @typedef {object}    StringTree~Node
 * @property {string}   key
 * @property {*}    [value]
 * @property {StringTree~Node[]}    childNodes
 */

/**
 * @typedef {object}    StringTree~NodePathEntry
 * @property {StringTree~Node}  parentNode
 * @property {number}   childIndex
 */

/**
 * @typedef {object}    StringTree~NodePathResult
 * @property {StringTree~NodePathEntry[]} nodePath
 * @property {boolean}  isPartial
 */

/**
 * @typedef {object}    StringTree~constructorArgs
 * @property {Iterable} [initialEntries]    If specified an array of two element 
 * sub arrays whose first element is the key and second element the value.
 * @property {boolean}  [caseInsensitive=false]
 */

/**
 * A collection of string keys and values, stored in tree form.
 * <p>
 * The nodes of the tree are based on the code points of the key strings.
 */
export class StringTree {
    /**
     * 
     * @param {StringTree~constructorArgs|Iterable} [args]
     */
    constructor(args) {
        this[Symbol.iterator] = this.entries;

        this.clear();

        this._filterCodePoint = (codePoint) => codePoint;

        let iterator;
        if (args) {
            if (typeof args[Symbol.iterator] === 'function') {
                iterator = args;
            }
            else {
                if (args.caseInsensitive) {
                    this._filterCodePoint = (codePoint) =>
                        ((codePoint >= 97) && (codePoint <= 122))
                            ? (codePoint - 32) : codePoint;
                }
                iterator = args.initialEntries;
            }
        }

        if (iterator) {
            for (let result of iterator) {
                this.set(result[0], result[1]);
            }
        }
    }

    /**
     * Removes all the elements from the tree.
     */
    clear() {
        this._root = {
            childNodes: [],
            key: '',
        };
        this._size = 0;
        this._keyValueMap = undefined;
    }


    /**
     * Removes the specified element from the tree by key.
     * @param {string} key 
     * @returns {boolean} <code>true</code> if the element exists, 
     * <code>false</code> if not.
     */
    delete(key) {
        key = key || '';
        if (!key) {
            if (nodeHasValue(this._root)) {
                delete this._root.value;
                --this._size;
                this._keyValueMap = undefined;
                return true;
            }
        }

        let { nodePath, isPartial } = this.getNodePath(key);
        if (!isPartial) {
            let i = nodePath.length - 1;
            const { parentNode, childIndex } = nodePath[i];
            const { childNodes } = parentNode;
            const childNode = childNodes[childIndex];
            if (!nodeHasValue(childNode)) {
                // Don't have a value, don't want to delete anything downstream.
                return false;
            }

            delete childNode.value;
            --this._size;
            this._keyValueMap = undefined;

            // Prune any dead branches going upstream...
            for (; i >= 0; --i) {
                const { parentNode, childIndex } = nodePath[i];
                const { childNodes } = parentNode;
                const childNode = childNodes[childIndex];
                const hasValue = nodeHasValue(childNode);
                if (hasValue || childNode.childNodes.length) {
                    break;
                }

                childNodes.splice(childIndex, 1);
            }
            return true;
        }
    }


    _createIterator(valueCallback, root) {
        root = root || this._root;
        const stack = [[root, -1]];
        return {
            next: function () {
                const node = getNextValueNode(stack);
                if (node) {
                    return {
                        value: valueCallback(node),
                        done: false,
                    };
                }
                return {
                    done: true,
                };
            },
            
            [Symbol.iterator]: function () {
                return this;
            }
        };
    }

    
    /**
     * @returns {Iterator}  A new Iterator object that contains the [key, value]
     * pairs for each element in the tree in depth-first order.
     */
    entries() {
        return this._createIterator((node) => [node.key, node.value]);
    }
    

    /**
     * @callback StringTree~forEachCallback
     * Callback function for {@link StringTree#forEach}
     * @param {*} value
     * @param {string} key
     * @param {StringTree}  tree
     */

    /**
     * Calls a callback function for each element in the tree.
     * @param {StringTree~forEachCallback} callback 
     * @param {*} thisArg   Value to use as <code>this</code> when executing
     * callback.
     */
    forEach(callback, thisArg) {
        const callbackToUse = (thisArg)
            ? (value, key, tree) => callback.call(thisArg, value, key, tree)
            : callback;
        for (let node of this._createIterator((node) => node)) {
            callbackToUse(node.value, node.key, this);
        }
    }
    

    _getNodeWithKey(key) {
        key = key || '';
        if (!key) {
            return this._root;
        }

        let { nodePath, isPartial } = this.getNodePath(key);
        if (!isPartial) {
            const { parentNode, childIndex } = nodePath[nodePath.length - 1];
            return parentNode.childNodes[childIndex];
        }
    }


    /**
     * @returns {number}    The number of elements in the tree.
     */
    get size() {
        return this._size;
    }


    /**
     * Retrieves the element associated with a key.
     * @param {string} key 
     * @returns {*|undefined}   The value, <code>undefined</code> if there is
     * no element with the key, or if the element is <code>undefined</code>.
     */
    get(key) {
        const node = this._getNodeWithKey(key);
        if (node) {
            return node.value;
        }
    }

    /**
     * Determines if the tree contains an element with a given key. This
     * includes keys whose value is <code>undefined</code>.
     * @param {string} key 
     * @returns {boolean}
     */
    has(key) {
        const node = this._getNodeWithKey(key);
        return node && nodeHasValue(node);
    }

    
    /**
     * @returns {Iterator}  An iterator of the key strings in depth first order.
     */
    keys() {
        return this._createIterator((node) => node.key);
    }
    

    /**
     * Sets the value associated with a key.
     * @param {string} key 
     * @param {*} value 
     * @returns {StringTree}    this.
     */
    set(key, value) {
        key = key || '';
        if (!key) {
            if (!nodeHasValue(this._root)) {
                ++this._size;
                this._keyValueMap = undefined;
            }
            this._root.value = value;
            return this;
        }

        let { nodePath, isPartial } = this.getNodePath(key);
        // The only time nodePath will be empty is if key is also empty,
        // and we already checked for that.

        let { parentNode, childIndex } = nodePath[nodePath.length - 1];
        if (isPartial) {
            // Need to add nodes...
            // The last node path entry points to where the first missing
            // node should go.

            const codePoints = [];
            const filteredCodePoints = [];
            for (let i = 0; i < nodePath.length; ++i) {
                const codePoint = key.codePointAt(i);
                codePoints.push(codePoint);
                filteredCodePoints.push(this._filterCodePoint(codePoint));
            }

            const keyLength = key.length;
            for (let i = nodePath.length - 1; i < keyLength; ++i) {
                const subKey = String.fromCodePoint(...codePoints);
                const newNode = {
                    key: subKey,
                    codePoint: filteredCodePoints[i],
                    childNodes: [],
                };

                parentNode.childNodes.splice(childIndex + 1, 0, newNode);

                const codePoint = key.codePointAt(i + 1);
                if (codePoint === undefined) {
                    break;
                }

                codePoints.push(codePoint);
                filteredCodePoints.push(this._filterCodePoint(codePoint));
                parentNode = newNode;
                childIndex = -1;
            }

            ++childIndex;

            ++this._size;
            this._keyValueMap = undefined;
        }

        const { childNodes } = parentNode;
        childNodes[childIndex].value = value;

        return this;
    }

    
    /**
     * @returns {Iterator}  An iterator whose elements are the values of the
     * elements in the tree, in depth-first order.
     */
    values() {
        return this._createIterator((node) => node.value);
    }
    


    /**
     * Retrieves the node path that leads closest to a key.
     * <p>
     * Nodes are based on the key's code points. A node fully matching a key
     * will not necessarily have a value.
     * @param {string} key 
     * @returns {StringTree~NodePathResult}
     */
    getNodePath(key) {
        const nodePath = [];
        let isPartial;

        const compareValue = {
        };

        let parentNode = this._root;
        const keyLength = key.length;
        for (let i = 0; i < keyLength; ++i) {
            let codePoint = key.codePointAt(i);
            if (codePoint === undefined) {
                // May be fewer code points than key.length, but will
                // always be <= length.
                break;
            }

            codePoint = this._filterCodePoint(codePoint);

            const { childNodes } = parentNode;
            compareValue.codePoint = codePoint;
            const index = bSearch(childNodes, compareValue, codePointCompare);
            nodePath.push({
                parentNode: parentNode,
                childIndex: index,
            });

            if ((index < 0) || (index >= childNodes.length)
             || (childNodes[index].codePoint !== codePoint)) {
                isPartial = true;
                break;
            }

            parentNode = childNodes[index];
        }

        return {
            nodePath: nodePath,
            isPartial: isPartial,
        };
    }


    /**
     * Retrieves an iterator whose elements are the elements whose keys start with
     * a given string. If there is an element that matches the key it is the first
     * element returned by the iterator.
     * <p>
     * The elements returned by the iterator are [key, value] pairs.
     * @param {string} key 
     * @returns {Iterator}
     */
    entriesStartingWith(key) {
        if (!key) {
            return this.entries();
        }
        
        const { nodePath, isPartial } = this.getNodePath(key);
        if (isPartial) {
            return [];
        }

        const result = [];
        let baseNode;
        let nodesToCheck;
        if (!nodePath.length) {
            baseNode = this._root;
            if (nodeHasValue(baseNode)) {
                result.push([baseNode.key, baseNode.value]);
            }
        }
        else {
            const { parentNode, childIndex} = nodePath[nodePath.length - 1];
            baseNode = parentNode.childNodes[childIndex];
            if (nodeHasValue(baseNode)) {
                result.push([baseNode.key, baseNode.value]);
                nodesToCheck = baseNode.childNodes;
            }
        }

        if (!nodesToCheck) {
            nodesToCheck = [baseNode];
        }

        nodesToCheck.forEach((nodeToCheck) => {
            for (let node of this._createIterator((node) => node, nodeToCheck)) {
                result.push([node.key, node.value]);
            }
        });

        return result;
    }
}
