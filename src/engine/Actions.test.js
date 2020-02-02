import * as ASTH from './AccountingSystemTestHelpers';

function applyAction(action, accountingSystem, values, undoName) {
    const undoManager = accountingSystem.getUndoManager();
    undoManager.asyncRegisterUndoDataItem(undoName, { value: values[0], });
    values[0] = action.value;
}

test('ActionManager', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const manager = accountingSystem.getActionManager();
    const undoManager = accountingSystem.getUndoManager();

    let valueA = [];
    let valueB = [];
    
    undoManager.registerUndoApplier('A', (undoDataItem) => { valueA[0] = undoDataItem.value; } );
    undoManager.registerUndoApplier('B', (undoDataItem) => { valueB[0] = undoDataItem.value; } );

    manager.registerActionApplier('actionA', (action, accountingSystem) => { applyAction(action, accountingSystem, valueA, 'A'); });
    manager.registerActionApplier('actionB', (action, accountingSystem) => { applyAction(action, accountingSystem, valueB, 'B'); });

    expect(manager.getAppliedActionCount()).toEqual(0);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toBeUndefined();
    expect(await manager.asyncGetUndoneActionAtIndex(0)).toBeUndefined();


    const actionA1 = { type: 'actionA', value: 1, };
    await manager.asyncApplyAction(actionA1);
    expect(valueA[0]).toEqual(1);

    expect(manager.getAppliedActionCount()).toEqual(1);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);


    const actionA2 = { type: 'actionA', value: 2, };
    await manager.asyncApplyAction(actionA2);
    expect(valueA[0]).toEqual(2);

    expect(manager.getAppliedActionCount()).toEqual(2);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(actionA2);


    const actionB1 = { type: 'actionB', value: 10, };
    await manager.asyncApplyAction(actionB1);
    expect(valueB[0]).toEqual(10);
    expect(valueA[0]).toEqual(2);

    expect(manager.getAppliedActionCount()).toEqual(3);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(actionA2);
    expect(await manager.asyncGetAppliedActionAtIndex(2)).toEqual(actionB1);


    const actionB2 = { type: 'actionB', value: 20, };
    await manager.asyncApplyAction(actionB2);

    const actionB3 = { type: 'actionB', value: 30, };
    await manager.asyncApplyAction(actionB3);

    const actionA3 = { type: 'actionA', value: 3, };
    await manager.asyncApplyAction(actionA3);

    // Now have:
    //  actionA1,
    //  actionA2,
    //  actionB1,
    //  actionB2,
    //  actionB3,
    //  actionA3,

    // Undo single action.
    await manager.asyncUndoLastAppliedActions();
    expect(valueA[0]).toEqual(actionA2.value);

    expect(manager.getAppliedActionCount()).toEqual(5);
    expect(manager.getUndoneActionCount()).toEqual(1);

    expect(await manager.asyncGetUndoneActionAtIndex(0)).toEqual(actionA3);


    // Redo single action.
    await manager.asyncReapplyLastUndoneActions();
    expect(valueA[0]).toEqual(actionA3.value);

    expect(manager.getAppliedActionCount()).toEqual(6);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(await manager.asyncGetAppliedActionAtIndex(5)).toEqual(actionA3);
    expect(await manager.asyncGetUndoneActionAtIndex(0)).toBeUndefined();


    // Undo several actions.
    await manager.asyncUndoLastAppliedActions(4);

    // Now have:
    // Applied:
    //  actionA1,
    //  actionA2,
    //
    // Undone: (reverse order)
    //  actionB1,
    //  actionB2,
    //  actionB3,
    //  actionA3,
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(undefined);

    expect(manager.getAppliedActionCount()).toEqual(2);
    expect(manager.getUndoneActionCount()).toEqual(4);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(actionA2);
    expect(await manager.asyncGetUndoneActionAtIndex(3)).toEqual(actionB1);


    // Redo several actions.
    await manager.asyncReapplyLastUndoneActions(2);
    // Now have:
    // Applied:
    //  actionA1,
    //  actionA2,
    //  actionB1,
    //  actionB2,
    //
    // Undone: (reverse order)
    //  actionB3,
    //  actionA3,
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB2.value);

    expect(manager.getAppliedActionCount()).toEqual(4);
    expect(manager.getUndoneActionCount()).toEqual(2);
    expect(await manager.asyncGetAppliedActionAtIndex(3)).toEqual(actionB2);
    expect(await manager.asyncGetUndoneActionAtIndex(1)).toEqual(actionB3);


    // Clear Undone Actions
    await manager.asyncClearUndoneActions();
    expect(manager.getAppliedActionCount()).toEqual(4);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB2.value);


    // Clear Applied Actions.
    await manager.asyncClearAppliedActions();
    expect(manager.getAppliedActionCount()).toEqual(0);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB2.value);


    await manager.asyncReapplyLastUndoneActions();
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB2.value);


    await manager.asyncUndoLastAppliedActions();
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB2.value);
});
