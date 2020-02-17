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
            dayOfWeek: 10,
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
    // Remove.
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
