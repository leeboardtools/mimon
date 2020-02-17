import * as RI from './Reminders';
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
        repeatDefinition: {
            type: RE.RepeatType.DAILY,
            period: 12,
            offset: 10,
            startYMDDate: getYMDDate('2010-01-01'),
        },
        description: 'Hello',
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
        lastAppliedDate: getYMDDate('2010-06-01'),
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
        repeatDefinition: {
            type: RE.RepeatType.DAILY.name,
            period: 12,
            offset: 10,
            startYMDDate: '2010-01-01',
        },
        description: 'Hello',
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
        lastAppliedDate: '2010-06-01',
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
        repeatDefinition: {
            type: RE.RepeatType.WEEKLY.name,
            period: 3,
            offset: { dayOfWeek: 3, },
            startYMDDate: '2010-01-01',
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
    const reminderB = result.newReminderDataItem;
    settingsB.id = reminderB.id;
    expect(reminderB).toEqual(settingsB);
    expect(addResult.newReminderDataItem).toEqual(settingsB);

    expect(manager.getReminderIds()).toEqual([reminderA.id, reminderB.id]);
    expect(manager.getReminderDataItemWithIds([reminderA.id, reminderB.id]))
        .toEqual([settingsA, settingsB]);
    expect(manager.getReminderDataItemWithId(reminderA.id))
        .toEqual(settingsA);

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
        repeatDefinition: {
            type: RE.RepeatType.WEEKLY.name,
            period: 3,
            offset: { dayOfWeek: 13, },
            startYMDDate: '2010-01-01',
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

    invalidSettings.repeatDefinition = undefined;
    await expect(manager.asyncAddReminder(invalidSettings)).rejects.toThrow(Error);


    //
    // Modify.

    let modifyResult;
    manager.on('reminderModify', (result) => { modifyResult = result; });
    const changesB1 = {
        id: settingsB.id,
        isEnabled: true,
        lastAppliedDate: '2020-05-04',
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
        repeatDefinition: undefined,
    };
    await expect(manager.asyncModifyReminder(invalidChanges)).rejects.toThrow(Error);

    invalidChanges.repeatDefinition = {
        type: RE.RepeatType.WEEKLY.name,
        period: 3,
        offset: { dayOfWeek: 13, },
        startYMDDate: '2010-01-01',
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

    const settingsA = {
        repeatDefinition: {
            type: RE.RepeatType.DAILY,
            period: 30,
            startYMDDate: '2015-06-01',
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: false,
        lastAppliedDate: '2019-10-01',
    };
    result = await manager.asyncAddReminder(settingsA);
    const reminderA = result.newReminderDataItem;
    settingsA.id = reminderA.id;


    // Next due date is 2019-10-11
    const settingsB = {
        repeatDefinition:  {
            type: RE.RepeatType.WEEKLY.name,
            period: 2,
            offset: { dayOfWeek: 5, },
            startYMDDate: '2019-06-01',
        },
        transactionTemplate: {
            splits: [
                { accountId: 123, },
                { accountId: 234, },
            ]
        },
        isEnabled: true,
        lastAppliedDate: '2019-10-01',
    };
    result = await manager.asyncAddReminder(settingsB);
    const reminderB = result.newReminderDataItem;
    settingsB.id = reminderB.id;


    // No lastAppliedDate, so next due date is 2019-06-15.
    const settingsC = {
        repeatDefinition:  {
            type: RE.RepeatType.MONTHLY.name,
            period: 1,
            offset: {
                type: RE.MonthOffsetType.NTH_DAY.name,
                offset: 15,
            },
            dayOfWeek: 6,
            startYMDDate: '2019-06-01',
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
    expect(manager.getDueReminderDataItems('2019-10-10'))
        .toEqual([settingsC]);
    expect(manager.getDueReminderDataItems('2019-10-11'))
        .toEqual([settingsB, settingsC]);
});