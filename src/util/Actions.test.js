import { ActionManager, InMemoryActionsHandler, createCompositeAction } from './Actions';
import { UndoManager, InMemoryUndoHandler } from './Undo';

let failValue;

function applyAction(isValidateOnly, action, undoManager, values, undoName) {
    if (action.value === failValue) {
        throw Error('FAIL');
    }

    if (isValidateOnly) {
        return;
    }
    undoManager.asyncRegisterUndoDataItem(undoName, { value: values[0], });
    values[0] = action.value;
    return values[0];
}

test('ActionManager', async () => {
    const undoManager = new UndoManager({handler : new InMemoryUndoHandler() });
    const manager = new ActionManager({ handler: new InMemoryActionsHandler(), 
        undoManager: undoManager, 
    });

    let valueA = [];
    let valueB = [];
    
    undoManager.registerUndoApplier('A', 
        (undoDataItem) => { valueA[0] = undoDataItem.value; } );
    undoManager.registerUndoApplier('B', 
        (undoDataItem) => { valueB[0] = undoDataItem.value; } );

    manager.registerAsyncActionApplier('actionA', 
        (isValidateOnly, action) => { 
            return applyAction(isValidateOnly, action, undoManager, valueA, 'A'); 
        });
    manager.registerAsyncActionApplier('actionB', 
        (isValidateOnly, action) => { 
            return applyAction(isValidateOnly, action, undoManager, valueB, 'B'); 
        });

    expect(manager.getAppliedActionCount()).toEqual(0);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toBeUndefined();
    expect(await manager.asyncGetUndoneActionAtIndex(0)).toBeUndefined();


    let applyEventAction;
    let applyEventResult;
    manager.on('actionApply', (action, result) => {
        applyEventAction = action;
        applyEventResult = result;
    });

    let undoEventAction;
    manager.on('actionUndo', (action) => {
        undoEventAction = action;
    });

    let reapplyEventAction;
    let reapplyEventResult;
    manager.on('actionReapply', (action, result) => {
        reapplyEventAction = action;
        reapplyEventResult = result;
    });


    let result;

    const actionA1 = { type: 'actionA', value: 1, };
    result = await manager.asyncApplyAction(actionA1);
    expect(valueA[0]).toEqual(1);
    expect(result).toEqual(1);

    expect(applyEventAction).toEqual(actionA1);
    expect(applyEventResult).toEqual(result);

    expect(manager.getAppliedActionCount()).toEqual(1);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);


    let postActionA2;

    const actionA2 = { type: 'actionA', 
        value: 2, 
        postApplyCallback: (action, result) => {
            postActionA2 = action;
            return result;
        },
        postUndoCallback: () => postActionA2 = undefined,
    };
    result = await manager.asyncApplyAction(actionA2);
    expect(valueA[0]).toEqual(2);
    expect(result).toEqual(2);

    expect(postActionA2).toEqual(actionA2);

    expect(manager.getAppliedActionCount()).toEqual(2);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(actionA2);


    let postActionB1;

    const actionB1 = { type: 'actionB', 
        value: 10, 
        postApplyCallback: (action, result) => {
            postActionB1 = action;
            return result;
        },
        postUndoCallback: () => postActionB1 = undefined,
    };
    await manager.asyncApplyAction(actionB1);
    expect(valueB[0]).toEqual(10);
    expect(valueA[0]).toEqual(2);

    expect(manager.getAppliedActionCount()).toEqual(3);
    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(actionA1);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(actionA2);
    expect(await manager.asyncGetAppliedActionAtIndex(2)).toEqual(actionB1);


    const actionB2 = { type: 'actionB', value: 20, };

    // Simple validateOnly test
    expect(await manager.asyncValidateApplyAction(actionB2)).toBeUndefined();
    expect(valueB[0]).toEqual(10);
    expect(valueA[0]).toEqual(2);

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

    expect(undoEventAction).toEqual(actionA3);


    expect(manager.getAppliedActionCount()).toEqual(5);
    expect(manager.getUndoneActionCount()).toEqual(1);

    expect(await manager.asyncGetUndoneActionAtIndex(0)).toEqual(actionA3);


    // Redo single action.
    await manager.asyncReapplyLastUndoneActions();
    expect(valueA[0]).toEqual(actionA3.value);

    expect(reapplyEventAction).toEqual(actionA3);
    expect(reapplyEventResult).toEqual(actionA3.value);


    expect(manager.getAppliedActionCount()).toEqual(6);
    expect(manager.getUndoneActionCount()).toEqual(0);
    expect(await manager.asyncGetAppliedActionAtIndex(5)).toEqual(actionA3);
    expect(await manager.asyncGetUndoneActionAtIndex(0)).toBeUndefined();

    expect(postActionB1).toBeDefined();

    // Undo several actions.
    await manager.asyncUndoLastAppliedActions(4);

    expect(postActionA2).toBeDefined();
    expect(postActionB1).toBeUndefined();
    

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


    let action;


    // Test composite actions
    const main1 = { name: 'Composite1', };
    const subActions1 = [ actionA1, actionA2, actionB1, ];
    const composite1 = createCompositeAction(main1, subActions1);

    postActionA2 = undefined;
    postActionB1 = undefined;
    
    result = await manager.asyncApplyAction(composite1);
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB1.value);
    expect(result).toEqual([actionA1.value, actionA2.value, actionB1.value, ]);
    expect(applyEventAction).toEqual(composite1);
    expect(applyEventResult).toEqual(result);

    expect(postActionA2).toEqual(actionA2);
    expect(postActionB1).toEqual(actionB1);

    expect(manager.getAppliedActionCount()).toEqual(1);

    action = await manager.asyncGetAppliedActionAtIndex(0);
    expect(action).toMatchObject(main1);


    const main2 = { name: 'Composite 2', };
    const subActions2 = [ actionB2, actionA3 ];
    const composite2 = createCompositeAction(main2, subActions2);

    // Validate only the composite action.
    expect(await manager.asyncValidateApplyAction(composite2)).toBeUndefined();

    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB1.value);

    failValue = actionA3.value;
    expect(await manager.asyncValidateApplyAction(composite2)).toEqual(Error('FAIL'));
    failValue = undefined;


    await manager.asyncApplyAction(composite2);
    expect(valueA[0]).toEqual(actionA3.value);
    expect(valueB[0]).toEqual(actionB2.value);

    expect(manager.getAppliedActionCount()).toEqual(2);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(composite2);


    // Undo the composite action.
    await manager.asyncUndoLastAppliedActions(1);
    expect(valueA[0]).toEqual(actionA2.value);
    expect(valueB[0]).toEqual(actionB1.value);

    expect(manager.getAppliedActionCount()).toEqual(1);
    expect(manager.getUndoneActionCount()).toEqual(1);

    expect(await manager.asyncGetAppliedActionAtIndex(0)).toEqual(composite1);
    expect(await manager.asyncGetUndoneActionAtIndex(0)).toEqual(composite2);


    // Reapply the composite action.
    await manager.asyncReapplyLastUndoneActions(1);
    expect(valueA[0]).toEqual(actionA3.value);
    expect(valueB[0]).toEqual(actionB2.value);

    expect(manager.getAppliedActionCount()).toEqual(2);
    expect(await manager.asyncGetAppliedActionAtIndex(1)).toEqual(composite2);

    expect(manager.getUndoneActionCount()).toEqual(0);

});
