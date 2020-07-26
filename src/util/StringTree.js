import { bSearch } from './BinarySearch';

function codePointCompare(value, arrayValue) {
    return value.codePoint - arrayValue.codePoint;
}

function nodeHasValue(node) {
    return Object.prototype.hasOwnProperty.call(node, 'value');
}

function getNextValueNode(root, stack) {
    if (!stack.length) {
        // Initial root...
        stack.push([root, 0]);
        if (nodeHasValue(root)) {
            return root;
        }
    }

    for (;;) {
        const entry = stack[stack.length - 1];
        const [ parentNode, childIndex ] = entry;

        const node = parentNode.childNodes[childIndex];
        if (!node) {
            // This could happen if the root has no child nodes but has a value...
            return;
        }

        ++(entry[1]);

        if (node.childNodes.length) {
            stack.push([node, 0]);
        }
        else if (entry[1] >= parentNode.childNodes.length) {
            --stack.length;
            if (!stack.length) {
                return;
            }
        }

        if (nodeHasValue(node)) {
            return node;
        }
    }
}


//
// Tree has nodes
// A node has:
//  - child nodes
//  - optional value
//  - key

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
 * A collection of string keys and values, stored in tree form.
 * <p>
 * The nodes of the tree are based on the code points of the key strings.
 */
export class StringTree {
    constructor(iterator) {
        this.clear();

        if (iterator) {
            for (let result = iterator.next(); !result.done; result = iterator.next()) {
                this.set((result.value[0], result.value[1]));
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
        this.size = 0;
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
                --this.size;
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
            --this.size;
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


    _createIterator(valueCallback) {
        const root = this._root;
        const stack = [];
        return {
            next: function () {
                const nextNode = getNextValueNode(root, stack);
                if (nextNode) {
                    return {
                        value: valueCallback(nextNode),
                        done: false,
                    };
                }
                return {
                    done: true,
                };
            },
            [Symbol.iterator]: function () { return this; }
        };
    }

    
    /**
     * @returns {Iterator}  A new Iterator object that contains the [key, value]
     * pairs for each element in the tree in depth-first order.
     */
    entries() {
        return this._createIterator((node) => [node.key, node.value]);
    }
    

    /*
    // TODO
    forEach() {

    }
    */

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
                ++this.size;
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
            for (let i = 0; i < nodePath.length; ++i) {
                codePoints.push(key.codePointAt(i));
            }

            const keyLength = key.length;
            for (let i = nodePath.length - 1; i < keyLength; ++i) {
                const subKey = String.fromCodePoint(...codePoints);
                const newNode = {
                    key: subKey,
                    codePoint: codePoints[i],
                    childNodes: [],
                };

                parentNode.childNodes.splice(childIndex + 1, 0, newNode);

                const codePoint = key.codePointAt(i + 1);
                if (codePoint === undefined) {
                    break;
                }

                codePoints.push(codePoint);
                parentNode = newNode;
                childIndex = -1;
            }

            ++childIndex;

            ++this.size;
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
            const codePoint = key.codePointAt(i);
            if (codePoint === undefined) {
                // May be fewer code points than key.length, but will
                // always be <= length.
                break;
            }

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


    // TODO:
    // Add getEntriesStartsWith()
    // Add entriesStartsWith() -> returns an Iterator.
}
