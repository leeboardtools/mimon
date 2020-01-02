
/**
 * Object that manages items by grouping and caching them. Items are normally stored offline
 * and are retrieved when needed.
 * <p>
 * The design use case is to group items with dates (such as transactions) by say year, and
 * have each group stored in a separate file.
 * <p>
 * The creator of the manager provides a number of callbacks. These are used to interpret the
 * items stored in the manager.
 * <p>
 * Items are the individual chunks of data. Each item has a tag, provided by the itemTagFromItem callback.
 * The tag holds the id used to uniquely identify an item and the group key used to group
 * the item.
 */
export class GroupedItemManager {
    /**
     * @typedef {object}    GroupedItemManager~ItemTag
     * @property {*}    id
     * @property {*}    groupKey
     */
    /**
     * Returns the item tag to be used by the manager to catalog an item.
     * @callback GroupedItemManager~itemTagFromItem
     * @param {*} item
     * @param {*}
     */


    /**
     * @callback GroupedItemManager~asyncRetrieveItemsFromGroup
     * @async
     * @param {*}   groupKey    The group key of the group to retrieve from.
     * @param {Array} ids   Array of the item ids of the items to be retrieved.
     */

    /**
     * @callback GroupedItemManager~asyncUpdateItemsInGroup
     * @async
     * @param {*}   groupKey    The group key of the group whose items are to be updated.
     * @param {Array[]}   itemUpdates   Array of one or two element sub-arrays representing the items to be updated.
     * The first element is the id of the item, the second element is the new item, or <code>undefined</code> if the
     * item is being removed.
     */


    /**
     * @typedef {object} GroupedItemManager~Options
     * @property {object[][]}   [itemTagsById]  Optional array of two elemenet arrays, compatible with the
     * constructor of {@link Map}.
     * @property {GroupedItemManager~itemTagFromItem}   itemTagFromItem
     * @property {GroupedItemManager~asyncRetrieveItemsFromGroup}   asyncRetrieveItemsFromGroup
     * @property {GroupedItemManager~asyncUpdateItemsInGroup}   asyncUpdateItemsInGroup
     * @property {boolean}  [noCache=false] If <code>true</code> items are not cached by the manager.
     */
    
    constructor(options) {
        options = options || {};

        this._itemTagsById = new Map(options.itemTagsById);
        this._loadedItemGroups = new Map();

        this._itemTagFromItem = options.itemTagFromItem;
        this._idFromItemTag = options.idFromItemTag;
        this._groupKeyFromItemTag = options.groupKeyFromItemTag;

        this._asyncRetrieveItemsFromGroup = options.asyncRetrieveItemsFromGroup;
        this._asyncUpdateItemsInGroup = options.asyncUpdateItemsInGroup;

        this._noCache = options.noCache;

        this.asyncAddItems = this.asyncUpdateItems;
    }

    itemTagsToJSON() {
        return {
            itemTagsById: Array.from(this._itemTagsById.entries()),
        };
    }

    itemTagsFromJSON(json) {
        this._loadedItemGroups.clear();
        this._itemTagsById = new Map(json.itemTagsById);
    }


    /**
     * @returns {Array} An array containing the ids of all the items in the group.
     */
    getItemIds() {
        return Array.from(this._itemTagsById.keys());
    }


    flushCache() {
        this._loadedItemGroups.clear();
    }


    /**
     * Retrieves one or more items.
     * @param {*|Array} ids Array containing the ids of the items to be retrieved. May also be a single value.
     * @returns {*|Array} Array containing the retrieved items, the ordering corresponds to that of ids, or a single
     * item if ids is not an array.
     */
    async asyncGetItemsWithIds(ids) {
        if (!Array.isArray(ids)) {
            const result = await this.asyncGetItemsWithIds([ids]);
            return result ? result[0] : result;
        }

        // We want to keep track of the ordering of the items so we can return them in the same order.
        const items = [];
        const groupEntries = new Map();
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const itemTag = this._itemTagsById.get(id);
            if (itemTag) {
                const { groupKey } = itemTag;
                let loadedItemGroup = this._loadedItemGroups.get(groupKey);
                if (!loadedItemGroup) {
                    loadedItemGroup = {
                        itemsById: new Map(),
                    };
                    this._loadedItemGroups.set(groupKey, loadedItemGroup);
                }
                else {
                    const item = loadedItemGroup.itemsById.get(id);
                    if (item) {
                        items[i] = item;
                        continue;
                    }
                }

                let groupEntry = groupEntries.get(groupKey);
                if (!groupEntry) {
                    groupEntry = {
                        loadedItemGroup: loadedItemGroup,
                        ids: [],
                        indices: [],
                    };
                    groupEntries.set(groupKey, groupEntry);
                }
                groupEntry.ids.push(id);
                groupEntry.indices.push(i);
            }
        }

        for (let [groupKey, groupEntry] of groupEntries) {
            const groupItems = await this._asyncRetrieveItemsFromGroup(groupKey, groupEntry.ids);

            for (let i = 0; i < groupEntry.indices.length; ++i) {
                items[groupEntry.indices[i]] = groupItems[i];
                if (!this._noCache) {
                    groupEntry.loadedItemGroup.itemsById.set(ids[i], groupItems[i]);
                }
            }
        }

        return items;
    }


    /**
     * Adds and/or modifies items.
     * @param {*|Array} itemUpdates Either an array containing the new or modified items, or a single new or modified item.
     */
    async asyncUpdateItems(itemUpdates) {
        if (!Array.isArray(itemUpdates)) {
            return this.asyncUpdateItems([itemUpdates]);
        }

        const groupEntries = new Map();

        for (let i = 0; i < itemUpdates.length; ++i) {
            const itemUpdate = itemUpdates[i];

            const newItemTag = this._itemTagFromItem(itemUpdate);
            const { id, groupKey } = newItemTag;

            const oldItemTag = this._itemTagsById.get(id);
            if (oldItemTag) {
                const oldGroupKey = oldItemTag.groupKey;
                let groupEntry = groupEntries.get(oldGroupKey);
                if (!groupEntry) {
                    groupEntry = {
                        itemUpdates: [],
                        addedItemTags: [],
                    };
                    groupEntries.set(oldGroupKey, groupEntry);
                }

                if (oldGroupKey === groupKey) {
                    groupEntry.itemUpdates.push([id, itemUpdate]);
                    continue;
                }
                else {
                    groupEntry.itemUpdates.push([id]);
                }
            }

            let groupEntry = groupEntries.get(groupKey);
            if (!groupEntry) {
                groupEntry = {
                    itemUpdates: [],
                    addedItemTags: [],
                };
                groupEntries.set(groupKey, groupEntry);
            }
            groupEntry.itemUpdates.push([id, itemUpdate]);
            groupEntry.addedItemTags.push(newItemTag);
        }

        for (let [groupKey, groupEntry] of groupEntries) {
            await this._asyncUpdateItemsInGroup(groupKey, groupEntry.itemUpdates);

            groupEntry.addedItemTags.forEach((itemTag) => {
                this._itemTagsById.set(itemTag.id, itemTag);
            });

            if (!this._noCache) {
                const loadedItemGroup = this._loadedItemGroups.get(groupKey);
                if (loadedItemGroup) {
                    groupEntry.itemUpdates.forEach(([id, item]) => {
                        if (!item) {
                            loadedItemGroup.itemsById.delete(id);
                        }
                        else {
                            loadedItemGroup.itemsById.set(id, item);
                        }
                    });
                }
            }
        }
    }


    /**
     * Removes items.
     * @param {*|Array} ids Either an array of the ids to the items to be removed or a single id.
     */
    async asyncRemoveItems(ids) {
        if (!Array.isArray(ids)) {
            return this.asyncRemoveItems([ids]);
        }

        const groupEntries = new Map();
        for (let id of ids) {
            const itemTag = this._itemTagsById.get(id);
            if (itemTag) {
                const { groupKey } = itemTag;
                let groupEntry = groupEntries.get(groupKey);
                if (!groupEntry) {
                    groupEntry = [];
                    groupEntries.set(groupKey, groupEntry);
                }
                groupEntry.push([id]);
            }
        }

        for (let [groupKey, groupEntry] of groupEntries) {
            await this._asyncUpdateItemsInGroup(groupKey, groupEntry);

            if (!this._noCache) {
                const loadedItemGroup = this._loadedItemGroups.get(groupKey);
                if (loadedItemGroup) {
                    const { itemsById } = loadedItemGroup;
                    groupEntry.forEach(([id]) => itemsById.delete(id));
                }
            }
        }

    }
}


/**
 * Object that can be used to store items for use with {@link GroupedItemManager}, providing the async callbacks 
 * for the GroupedItemManager.
 * <p>
 * This handles the storage of items in a group, with an optional callback for loading items when a group is
 * first created.
 */
export class ItemGroups {
    constructor(options) {
        options = options || {};

        this._asyncLoadGroupItems = options.asyncLoadGroupItems;
        this._itemGroups = new Map();

        this.asyncRetrieveItemsFromGroup = this.asyncRetrieveItemsFromGroup.bind(this);
        this.asyncUpdateItemsInGroup = this.asyncUpdateItemsInGroup.bind(this);
    }

    /**
     * @typedef {object} ItemGroups~GroupItems
     * @property {Map}  itemsByIds  Map whose keys are ids and values are the items.
     * @property {number}   lastChangeId    Id that's incremented every time there's a change
     * made to an item in the group.
     */

    /**
     * @returns {Map<*,ItemGroups~GroupItems>}   The key is the group key.
     */
    getItemGroups() { return this._itemGroups; }


    async _loadNewGroupItems(groupKey, alwaysCreate) {
        const groupItems = {
            itemsByIds: new Map(),
            lastChangeId: 0,
        };
        if (this._asyncLoadGroupItems) {
            await this._asyncLoadGroupItems(groupKey, groupItems);
        }
        else if (!alwaysCreate) {
            return;
        }

        this._itemGroups.set(groupKey, groupItems);
        return groupItems;
    }

    async asyncRetrieveItemsFromGroup(groupKey, ids) {
        let groupItems = this._itemGroups.get(groupKey);
        if (!groupItems) {
            groupItems = await this._loadNewGroupItems(groupKey);
        }
        if (!groupItems) {
            return [];
        }
        const { itemsByIds } = groupItems;

        const items = [];
        for (let i = 0; i < ids.length; ++i) {
            items[i] = itemsByIds.get(ids[i]);
        }
        return items;
    }


    async asyncUpdateItemsInGroup(groupKey, itemUpdates) {
        let groupItems = this._itemGroups.get(groupKey);
        if (!groupItems) {
            groupItems = await this._loadNewGroupItems(groupKey, true);
        }

        const { itemsByIds } = groupItems;

        itemUpdates.forEach((itemUpdate) => {
            const [ id, item ] = itemUpdate;
            if (item) {
                itemsByIds.set(id, item);
            }
            else {
                itemsByIds.delete(id);
            }
            ++groupItems.lastChangeId;
        });
    }
}
