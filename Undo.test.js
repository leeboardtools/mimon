import { UndoManager, InMemoryUndoHandler } from './Undo';

test('InMemoryUndoHandler', async () => {
    const handler = new InMemoryUndoHandler();
    const manager = new UndoManager({ handler: handler });

    let appliedUndoDataItemsA = [];
    manager.registerUndoApplier('applierA', 
        (undoDataItem) => { appliedUndoDataItemsA.push(undoDataItem); });

    let appliedUndoDataItemsB = [];
    manager.registerUndoApplier('applierB', 
        async (undoDataItem) => { appliedUndoDataItemsB.push(undoDataItem); });

    const applierA1 = { description: 'ApplierA 1'};
    applierA1.id = await manager.asyncRegisterUndoDataItem('applierA', applierA1);
    applierA1.applier = 'applierA';

    expect(await manager.asyncGetUndoDataItemWithId(applierA1.id)).toEqual(applierA1);


    const applierA2 = { applier: 'applierA', description: 'ApplierA 2'};
    applierA2.id = await manager.asyncRegisterUndoDataItem(applierA2);
    expect(await manager.getSortedUndoIds()).toEqual([applierA1.id, applierA2.id]);

    
    const applierB1 = { description: 'ApplierB 1', };
    applierB1.id = await manager.asyncRegisterUndoDataItem('applierB', applierB1);
    applierB1.applier = 'applierB';
    expect(await manager.asyncGetUndoDataItemWithId(applierB1.id)).toEqual(applierB1);


    const applierB2 = { applier: 'applierB', description: 'ApplierB 2', };
    applierB2.id = await manager.asyncRegisterUndoDataItem(applierB2);
    expect(await manager.asyncGetUndoDataItemWithId(applierB2.id)).toEqual(applierB2);


    const applierA3 = { applier: 'applierA', description: 'ApplierA 3', };
    applierA3.id = await manager.asyncRegisterUndoDataItem(applierA3);
    expect(await manager.asyncGetUndoDataItemWithId(applierA3.id)).toEqual(applierA3);

    expect(await manager.getSortedUndoIds())
        .toEqual(
            [ applierA1.id, applierA2.id, applierB1.id, applierB2.id, applierA3.id ]);

    
    await manager.asyncUndoToId(applierA3.id);
    expect(appliedUndoDataItemsA[0]).toEqual(applierA3);
    expect(await manager.getSortedUndoIds())
        .toEqual([ applierA1.id, applierA2.id, applierB1.id, applierB2.id, ]);

    await manager.asyncUndoToId(applierB1.id);
    expect(appliedUndoDataItemsB).toEqual([applierB2, applierB1]);
    expect(await manager.getSortedUndoIds()).toEqual([ applierA1.id, applierA2.id, ]);


    const json = handler.toJSON();

    appliedUndoDataItemsA.length = 0;
    await manager.asyncUndoToId(applierA2.id, true);
    expect(appliedUndoDataItemsA).toEqual([]);
    expect(await manager.getSortedUndoIds()).toEqual([ applierA1.id, ]);


    {
        const handler2 = new InMemoryUndoHandler();
        handler2.fromJSON(json);

        const manager2 = new UndoManager({ handler: handler2 });
        expect(await manager2.getSortedUndoIds())
            .toEqual([ applierA1.id, applierA2.id, ]);
        expect(await manager2.asyncGetUndoDataItemWithId(applierA1.id))
            .toEqual(applierA1);
        expect(await manager2.asyncGetUndoDataItemWithId(applierA2.id))
            .toEqual(applierA2);
        expect(await manager2.asyncGetUndoDataItemWithId(applierA3.id)).toBeUndefined();

        manager2.registerUndoApplier('applierA', 
            (undoDataItem) => { appliedUndoDataItemsA.push(undoDataItem); });
        manager2.registerUndoApplier('applierB', 
            (undoDataItem) => { appliedUndoDataItemsB.push(undoDataItem); });

        appliedUndoDataItemsA.length = 0;
        appliedUndoDataItemsB.length = 0;
        await manager2.asyncUndoToId(applierA1.id);

        expect(appliedUndoDataItemsA).toEqual([ applierA2, applierA1 ]);
        expect(manager2.getSortedUndoIds()).toEqual([]);

        const applierA4 = { applier: 'applierA', description: 'Applier A 4'};
        applierA4.id = await manager2.asyncRegisterUndoDataItem(applierA4);
        expect(applierA4.id).toBeGreaterThan(applierA3.id);
    }

});