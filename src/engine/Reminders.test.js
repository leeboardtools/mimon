import * as RI from './Reminders';
import * as DO from '../util/DateOccurrences';
import * as RE from '../util/Repeats';
import * as ASTH from './AccountingSystemTestHelpers';
import { getYMDDate } from '../util/YMDDate';

function testReminderDataItem(reminder) {
    const dataItem = RI.getReminderDataItem(reminder);
    const test = RI.getReminder(dataItem);
    expect(test).toEqual(reminder);

    const testDataItem = RI.getReminderDataItem(test);
    expect(testDataItem).toEqual(dataItem);

    expect(RI.getReminder(reminder)).toBe(reminder);
    expect(RI.getReminder(reminder, true)).not.toBe(reminder);

    expect(RI.getReminderDataItem(dataItem)).toBe(dataItem);
    expect(RI.getReminderDataItem(dataItem, true)).not.toBe(dataItem);
}


//
//---------------------------------------------------------
//
test('Reminders-DataItems', () => {
    const reminderA = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DOW_OF_MONTH,
            offset: 2,
            dayOfWeek: 3,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.YEARLY,
                period: 4,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: getYMDDate('2010-06-01'),
            occurrenceCount: 3,
        },
        description: 'Hello',
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
    };
    testReminderDataItem(reminderA);
});


//
//---------------------------------------------------------
//
test('Reminders-add_modify', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const handler = new RI.InMemoryRemindersHandler();
    const manager = new RI.ReminderManager(accountingSystem, { handler: handler });
    const undoManager = accountingSystem.getUndoManager();

    let result;

    const settingsA = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_MONTH.name,
            offset: 10,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY.name,
                period: 1,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2010-06-01',
        },
        description: 'Hello',
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
    };

    result = await manager.asyncAddReminder(settingsA);
    const reminderA = result.newReminderDataItem;
    settingsA.id = reminderA.id;
    expect(reminderA).toEqual(settingsA);


    let addResult;
    manager.on('reminderAdd', (result) => { addResult = result; });

    let removeResult;
    manager.on('reminderRemove', (result) => { removeResult = result; });

    const settingsB = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_MONTH.name,
            offset: 10,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY.name,
                period: 1,
            },
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: false,
    };

    // Only validate.
    result = await manager.asyncAddReminder(settingsB, true);
    expect(manager.getReminderIds()).toEqual([reminderA.id]);

    result = await manager.asyncAddReminder(settingsB);
    const reminderB = RI.getReminderDataItem(result.newReminderDataItem, true);
    settingsB.id = reminderB.id;
    expect(reminderB).toEqual(settingsB);
    expect(addResult.newReminderDataItem).toEqual(settingsB);

    expect(manager.getReminderIds()).toEqual([reminderA.id, reminderB.id]);
    expect(manager.getReminderDataItemWithIds([reminderA.id, reminderB.id]))
        .toEqual([settingsA, settingsB]);
    expect(manager.getReminderDataItemWithId(reminderA.id))
        .toEqual(settingsA);
    

    // Make sure copies are returned.
    result.newReminderDataItem.occurrenceDefinition.occurrenceType = 'abc';
    expect(manager.getReminderDataItemWithId(reminderB.id))
        .toEqual(settingsB);
    manager.getReminderDataItemWithId(reminderB.id).occurrenceDefinition = 1234;
    expect(manager.getReminderDataItemWithId(reminderB.id))
        .toEqual(settingsB);

    
    // Undo Add
    await undoManager.asyncUndoToId(result.undoId);
    expect(manager.getReminderDataItemWithId(reminderB.id)).toBeUndefined();
    expect(manager.getReminderDataItemWithId(reminderA.id))
        .toEqual(settingsA);
    expect(removeResult.removedReminderDataItem).toEqual(reminderB);
    
    await manager.asyncAddReminder(settingsB);
    expect(manager.getReminderIds()).toEqual([reminderA.id, reminderB.id]);
    expect(manager.getReminderDataItemWithIds([reminderA.id, reminderB.id]))
        .toEqual([settingsA, settingsB]);
    

    // Test validation
    const invalidSettings = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_MONTH.name,
            offset: -3,
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: false,
    };
    await expect(manager.asyncAddReminder(invalidSettings)).rejects.toThrow(Error);

    invalidSettings.occurrenceDefinition = undefined;
    await expect(manager.asyncAddReminder(invalidSettings)).rejects.toThrow(Error);


    //
    // Modify.

    let modifyResult;
    manager.on('reminderModify', (result) => { modifyResult = result; });
    const changesB1 = {
        id: settingsB.id,
        isEnabled: true,
    };
    const settingsB1 = Object.assign({}, settingsB, changesB1);

    // Validate only
    result = await manager.asyncModifyReminder(changesB1, true);
    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB);

    result = await manager.asyncModifyReminder(changesB1);
    expect(result.newReminderDataItem).toEqual(settingsB1);
    expect(result.oldReminderDataItem).toEqual(settingsB);
    expect(modifyResult.newReminderDataItem).toEqual(settingsB1);
    expect(modifyResult.oldReminderDataItem).toEqual(settingsB);

    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB1);

    //
    // Make sure data items were returned.
    result.newReminderDataItem.occurrenceDefinition = 1234;
    result.oldReminderDataItem.occurrenceDefinition = 'abc';


    //
    // Undo modify
    await undoManager.asyncUndoToId(result.undoId);
    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB);
    expect(modifyResult.newReminderDataItem).toEqual(settingsB);
    expect(modifyResult.oldReminderDataItem).toEqual(settingsB1);

    await manager.asyncModifyReminder(changesB1);
    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB1);

    //
    // Test validation.
    const invalidChanges = {
        id: settingsB.id,
        occurrenceDefinition: undefined,
    };
    await expect(manager.asyncModifyReminder(invalidChanges)).rejects.toThrow(Error);

    invalidChanges.occurrenceDefinition = {
        occurrenceType: DO.OccurrenceType.DOW_OF_MONTH,
        offset: 3,
        dayOfMonth: 2,
        repeatDefinition: {
            repeatType: DO.OccurrenceRepeatType.YEARLY,
            period: 1,
        },
    };
    await expect(manager.asyncModifyReminder(invalidChanges)).rejects.toThrow(Error);

 
    //
    // Remove.

    // Validate only
    result = await manager.asyncRemoveReminder(reminderA.id, true);
    expect(manager.getReminderDataItemWithId(reminderA.id)).toEqual(settingsA);

    result = await manager.asyncRemoveReminder(reminderA.id);
    expect(result.removedReminderDataItem).toEqual(reminderA);
    expect(removeResult.removedReminderDataItem).toEqual(reminderA);

    expect(manager.getReminderDataItemWithId(reminderA.id)).toBeUndefined();
    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB1);
    expect(manager.getReminderIds()).toEqual([reminderB.id]);

    // Make sure a copy was returned.
    result.removedReminderDataItem.occurrenceDefinition = 'abc';

    await undoManager.asyncUndoToId(result.undoId);
    expect(addResult.newReminderDataItem).toEqual(reminderA);
    expect(manager.getReminderDataItemWithId(reminderA.id)).toEqual(settingsA);
    expect(manager.getReminderDataItemWithId(reminderB.id)).toEqual(settingsB1);
    expect(manager.getReminderIds()).toEqual([reminderB.id, reminderA.id]);
});


//
//---------------------------------------------------------
//
test('Reminders-getDueReminderDataItems', async () => {
    const accountingSystem = await ASTH.asyncCreateAccountingSystem();
    const manager = accountingSystem.getReminderManager();

    let result;

    // Disabled setting...
    const settingsA = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DOW_OF_MONTH.name,
            offset: 3,
            dayOfWeek: 6,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY.name,
                period: 1,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2019-06-01',
            occurrenceCount: 0,
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: false,
    };
    result = await manager.asyncAddReminder(settingsA);
    const reminderA = result.newReminderDataItem;
    settingsA.id = reminderA.id;

    // Next due date is 2019-10-11
    const settingsB = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_WEEK.name,
            dayOfWeek: 5,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.WEEKLY.name,
                period: 2,
                maxRepeats: 3,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2019-10-04',
            occurrenceCount: 2,
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
    };
    result = await manager.asyncAddReminder(settingsB);
    const reminderB = result.newReminderDataItem;
    settingsB.id = reminderB.id;


    // Next due date is 2019-06-15.
    const settingsC = {
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DOW_OF_MONTH.name,
            offset: 3,
            dayOfWeek: 6,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY.name,
                period: 1,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2019-06-01',
            occurrenceCount: 0,
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
    };
    result = await manager.asyncAddReminder(settingsC);
    const reminderC = result.newReminderDataItem;
    settingsC.id = reminderC.id;


    expect(manager.getDueReminderDataItems('2019-06-14')).toEqual([]);
    expect(manager.getDueReminderDataItems('2019-06-15'))
        .toEqual([settingsC]);
    expect(manager.getDueReminderDataItems('2019-10-17'))
        .toEqual([settingsC]);
    expect(manager.getDueReminderDataItems('2019-10-18'))
        .toEqual([settingsB, settingsC]);


    // Check applied count disabling at repeatCount.
    const settingsB1 = Object.assign({}, settingsB, {
        lastOccurrenceState: Object.assign({}, settingsB.lastOccurrenceState, {
            occurrenceCount: 3,
        }),
    });
    result = await manager.asyncModifyReminder(settingsB1);
    expect(manager.getDueReminderDataItems('2019-10-17'))
        .toEqual([settingsC]);
    

    
    // Make sure copies are returned.
    manager.getDueReminderDataItems('2019-10-10')[0].occurrenceDefinition = 'abc';
    expect(manager.getDueReminderDataItems('2019-10-10'))
        .toEqual([settingsC]);
});