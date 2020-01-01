import { GroupedItemManager, ItemGroups } from './GroupedItemManager';


function getGroupKey(item) {
    const { ymdDate } = item;
    const index = ymdDate.indexOf('-');
    return ymdDate.slice(0, index);
}

function itemTagFromItem(item) {
    return { id: item.id, groupKey: getGroupKey(item), };
}

test('GroupedItemManager', async () => {
    const itemGroups = new ItemGroups();
    const manager = new GroupedItemManager({
        itemTagFromItem: itemTagFromItem,
        asyncRetrieveItemsFromGroup: itemGroups.asyncRetrieveItemsFromGroup,
        asyncUpdateItemsInGroup: itemGroups.asyncUpdateItemsInGroup,
    });

    expect(manager.getItemIds()).toEqual([]);

    const item1 = { id: 1, ymdDate: '2018-01-01', value: 'Item 1', };
    await manager.asyncUpdateItems(item1);
    expect(manager.getItemIds()).toEqual([ 1 ]);
    expect(await manager.asyncGetItemsWithIds(1)).toEqual(item1);

    const item2 = { id: 2, ymdDate: '2018-12-31', value: 'Item 2', };
    const item3 = { id: 3, ymdDate: '2017-03-31', value: 'Item 3', };
    const item4 = { id: 4, ymdDate: '2016-12-24', value: 'Item 4', };
    await manager.asyncUpdateItems([item2, item3]);
    await manager.asyncAddItems(item4);

    expect(await manager.asyncGetItemsWithIds(1)).toEqual(item1);
    expect(await manager.asyncGetItemsWithIds(2)).toEqual(item2);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3);
    expect(await manager.asyncGetItemsWithIds(4)).toEqual(item4);
    expect(itemGroups._itemGroups.size).toEqual(3);


    // Modify, same group.
    const item3a = { id: 3, ymdDate: '2017-12-21', value: 'Item 3a', };
    await manager.asyncUpdateItems(item3a);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3a);

    // Modify, different groups.
    const item2a = { id: 2, ymdDate: '2016-01-02', value: 'Item 2a', };
    const item4a = { id: 4, ymdDate: '2018-01-01', value: 'Item 4a', };
    const item3b = { id: 3, ymdDate: '2018-12-31', value: 'Item 3b', };

    await manager.asyncUpdateItems([item2a, item4a, item3b]);
    expect(await manager.asyncGetItemsWithIds(2)).toEqual(item2a);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3b);
    expect(await manager.asyncGetItemsWithIds(4)).toEqual(item4a);


    await manager.asyncRemoveItems(1);
    expect(await manager.asyncGetItemsWithIds(1)).toBeUndefined();
    expect(await manager.asyncGetItemsWithIds([1, 2, 3, 4])).toEqual([undefined, item2a, item3b, item4a]);

    await manager.asyncRemoveItems([2, 4]);
    expect(await manager.asyncGetItemsWithIds([1, 2, 3, 4])).toEqual([undefined, undefined, item3b, undefined]);

});


test('GroupedItemManager-noCache', async () => {
    const itemGroups = new ItemGroups();
    const manager = new GroupedItemManager({
        itemTagFromItem: itemTagFromItem,
        asyncRetrieveItemsFromGroup: itemGroups.asyncRetrieveItemsFromGroup,
        asyncUpdateItemsInGroup: itemGroups.asyncUpdateItemsInGroup,
        noCache: true,
    });

    expect(manager.getItemIds()).toEqual([]);

    const item1 = { id: 1, ymdDate: '2018-01-01', value: 'Item 1', };
    await manager.asyncUpdateItems(item1);
    expect(manager.getItemIds()).toEqual([ 1 ]);
    expect(await manager.asyncGetItemsWithIds(1)).toEqual(item1);

    const item2 = { id: 2, ymdDate: '2018-12-31', value: 'Item 2', };
    const item3 = { id: 3, ymdDate: '2017-03-31', value: 'Item 3', };
    const item4 = { id: 4, ymdDate: '2016-12-24', value: 'Item 4', };
    await manager.asyncUpdateItems([item2, item3]);
    await manager.asyncAddItems(item4);

    expect(await manager.asyncGetItemsWithIds(1)).toEqual(item1);
    expect(await manager.asyncGetItemsWithIds(2)).toEqual(item2);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3);
    expect(await manager.asyncGetItemsWithIds(4)).toEqual(item4);
    expect(itemGroups._itemGroups.size).toEqual(3);


    // Modify, same group.
    const item3a = { id: 3, ymdDate: '2017-12-21', value: 'Item 3a', };
    await manager.asyncUpdateItems(item3a);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3a);

    // Modify, different groups.
    const item2a = { id: 2, ymdDate: '2016-01-02', value: 'Item 2a', };
    const item4a = { id: 4, ymdDate: '2018-01-01', value: 'Item 4a', };
    const item3b = { id: 3, ymdDate: '2018-12-31', value: 'Item 3b', };

    await manager.asyncUpdateItems([item2a, item4a, item3b]);
    expect(await manager.asyncGetItemsWithIds(2)).toEqual(item2a);
    expect(await manager.asyncGetItemsWithIds(3)).toEqual(item3b);
    expect(await manager.asyncGetItemsWithIds(4)).toEqual(item4a);


    await manager.asyncRemoveItems(1);
    expect(await manager.asyncGetItemsWithIds(1)).toBeUndefined();
    expect(await manager.asyncGetItemsWithIds([1, 2, 3, 4])).toEqual([undefined, item2a, item3b, item4a]);

    await manager.asyncRemoveItems([2, 4]);
    expect(await manager.asyncGetItemsWithIds([1, 2, 3, 4])).toEqual([undefined, undefined, item3b, undefined]);

});
