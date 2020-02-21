import { EventEmitter } from 'events';
import { userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import * as R from '../util/Repeats';
import { getTransaction, getTransactionDataItem } from './Transactions';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';



/**
 * @typedef {object} ReminderDataItem
 * @property {number}   id  The id of the reminder in the reminder manager.
 * @property {RepeatDefinition} repeatDefinition    Defines how the reminder
 * repeats.
 * @property {string}   [description]   The description of the reminder.
 * @property {Transaction} transactionTemplate  The template for
 * the transaction being reminded of.
 * @property {boolean}  isEnabled
 * @property {YMDDate}  lastAppliedDate The date the last time the reminder
 * was applied, used to determine the next time the reminder is to go off.
 */

/**
 * @typedef {object} Reminder
 * @property {number}   id  The id of the reminder in the reminder manager.
 * @property {RepeatDefinitionDataItem} repeatDefinition Defines how the 
 * reminder repeats.
 * @property {string}   [description]   The description of the reminder.
 * @property {TransactionDataItem} transactionTemplate  The template for
 * the transaction being reminded of.
 * @property {boolean}  isEnabled
 * @property {string}  lastAppliedDate The date the last time the reminder
 * was applied, used to determine the next time the reminder is to go off.
 */

/**
 * Retrieves a {@link Reminder} representation of a {@link ReminderDataItem}
 * @param {(ReminderDataItem|Reminder)} reminderDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {Reminder}
 */
export function getReminder(reminderDataItem, alwaysCopy) {
    if (reminderDataItem) {
        const repeatDefinition 
            = R.getRepeatDefinition(reminderDataItem.repeatDefinition, alwaysCopy);
        const transactionTemplate 
            = getTransaction(reminderDataItem.transactionTemplate, alwaysCopy);
        const lastAppliedDate = getYMDDate(reminderDataItem.lastAppliedDate);
        if (alwaysCopy
         || (repeatDefinition !== reminderDataItem.repeatDefinition)
         || (transactionTemplate !== reminderDataItem.transactionTemplate)
         || (lastAppliedDate !== reminderDataItem.lastAppliedDate)) {
            const reminder = Object.assign({}, reminderDataItem);
            if (repeatDefinition) {
                reminder.repeatDefinition = repeatDefinition;
            }
            if (transactionTemplate) {
                reminder.transactionTemplate = transactionTemplate;
            }
            if (lastAppliedDate) {
                reminder.lastAppliedDate = lastAppliedDate;
            }
            return reminder;
        }
    }
    return reminderDataItem;
}


/**
 * Retrieves a {@link ReminderDataItem} representation of a {@link Reminder}.
 * @param {(Reminder|ReminderDataItem)} reminder 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {ReminderDataItem}
 */
export function getReminderDataItem(reminder, alwaysCopy) {
    if (reminder) {
        const repeatDefinition 
            = R.getRepeatDefinitionDataItem(reminder.repeatDefinition, alwaysCopy);
        const transactionTemplate 
            = getTransactionDataItem(reminder.transactionTemplate, alwaysCopy);
        const lastAppliedDate 
            = getYMDDateString(reminder.lastAppliedDate);
        if (alwaysCopy
         || (repeatDefinition !== reminder.repeatDefinition)
         || (transactionTemplate !== reminder.transactionTemplate)
         || (lastAppliedDate !== reminder.lastAppliedDate)) {
            const reminderDataItem = Object.assign({}, reminder);
            if (repeatDefinition) {
                reminderDataItem.repeatDefinition = repeatDefinition;
            }
            if (transactionTemplate) {
                reminderDataItem.transactionTemplate = transactionTemplate;
            }
            if (lastAppliedDate) {
                reminderDataItem.lastAppliedDate = lastAppliedDate;
            }
            return reminderDataItem;
        }
    }
    return reminder;
}




/**
 * Manages {@link Reminder} and {@link ReminderDataItem}s.
 */
export class ReminderManager extends EventEmitter {
    constructor(accountingSystem, options) {
        super(options);

        this._accountingSystem = accountingSystem;
        this._handler = options.handler;
        
        this._idGenerator = new NumericIdGenerator(options.idGenerator 
            || this._handler.getIdGeneratorOptions());

        this._reminderDataItemsById = new Map();

        const undoManager = accountingSystem.getUndoManager();
        this._asyncApplyUndoAddReminder = this._asyncApplyUndoAddReminder.bind(this);
        undoManager.registerUndoApplier('addReminder', this._asyncApplyUndoAddReminder);

        this._asyncApplyUndoRemoveReminder 
            = this._asyncApplyUndoRemoveReminder.bind(this);
        undoManager.registerUndoApplier('removeReminder', 
            this._asyncApplyUndoRemoveReminder);

        this._asyncApplyUndoModifyReminder 
            = this._asyncApplyUndoModifyReminder.bind(this);
        undoManager.registerUndoApplier('modifyReminder', 
            this._asyncApplyUndoModifyReminder);
        
        //
        // Synonyms
        this.getReminderDataItemWithId = this.getReminderDataItemWithIds;

        const reminderDataItems = this._handler.getReminderDataItems();
        reminderDataItems.forEach((reminderDataItem) => {
            this._reminderDataItemsById.set(reminderDataItem.id, reminderDataItem);
        });

    }

    async asyncSetupForUse() {
    }

    shutDownFromUse() {
        this._reminderDataItemsById.clear();
        this._handler = undefined;
        this._accountingSystem = undefined;
    }


    getAccountingSystem() { return this._accountingSystem; }


    /**
     * @returns {number[]}  Array containing the ids of all the reminders.
     */
    getReminderIds() {
        return Array.from(this._reminderDataItemsById.keys());
    }


    /**
     * 
     * @param {number|number[]} ids Either a single id or an array of ids of the
     * reminder data items to retrieve.
     * @returns {(ReminderDataItem|ReminderDataItem[]|undefined)}   If ids is
     * an array an array is returned, otherwise a single item is returned.
     */
    getReminderDataItemWithIds(ids) {
        if (!Array.isArray(ids)) {
            const result = this.getReminderDataItemWithIds([ids]);
            if (result) {
                return result[0];
            }
            return;
        }

        const result = [];
        ids.forEach((id) => {
            const reminderDataItem = this._reminderDataItemsById.get(id);
            if (reminderDataItem) {
                result.push(getReminderDataItem(reminderDataItem, true));
            }
        });

        return result;
    }


    /**
     * Retrieves an array containing the {@link ReminderDataItem}s of all the
     * reminders that are enabled and due based on ymdDate.
     * @param {YMDDate|string} ymdDate 
     * @returns {ReminderDataItem[]}
     */
    getDueReminderDataItems(ymdDate) {
        ymdDate = getYMDDate(ymdDate);

        const reminderDataItems = [];
        this._reminderDataItemsById.forEach((reminderDataItem, id) => {
            if (!reminderDataItem.isEnabled) {
                return;
            }

            const nextYMDDate = R.getNextRepeatYMDDate(reminderDataItem.repeatDefinition,
                reminderDataItem.lastAppliedDate);
            if (!nextYMDDate) {
                return;
            }

            if (YMDDate.compare(ymdDate, nextYMDDate) >= 0) {
                reminderDataItems.push(getReminderDataItem(reminderDataItem, true));
            }
        });

        return reminderDataItems;
    }


    async _asyncApplyUndoAddReminder(undoDataItem) {
        const { reminderId, idGeneratorOptions } = undoDataItem;

        const reminderDataItem = this.getReminderDataItemWithId(reminderId);

        const updatedDataItems = [[reminderId]];
        await this._handler.asyncUpdateReminderDataItems(updatedDataItems);

        this._reminderDataItemsById.delete(reminderId);
        this._idGenerator.fromJSON(idGeneratorOptions);

        this.emit('reminderRemove', { removedReminderDataItem: reminderDataItem });
    }


    async _asyncApplyUndoRemoveReminder(undoDataItem) {
        const { removedReminderDataItem } = undoDataItem;

        const { id } = removedReminderDataItem;
        const updatedDataItems = [[ id, removedReminderDataItem ]];
        await this._handler.asyncUpdateReminderDataItems(updatedDataItems);

        this._reminderDataItemsById.set(id, removedReminderDataItem);

        this.emit('reminderAdd', { newReminderDataItem: removedReminderDataItem, });
    }


    async _asyncApplyUndoModifyReminder(undoDataItem) {
        const { oldReminderDataItem } = undoDataItem;

        const { id } = oldReminderDataItem;
        const newReminderDataItem = this.getReminderDataItemWithId(id);
        const updatedDataItems = [[ id, oldReminderDataItem ]];
        await this._handler.asyncUpdateReminderDataItems(updatedDataItems);

        this._reminderDataItemsById.set(id, oldReminderDataItem);

        this.emit('reminderModify', 
            { newReminderDataItem: oldReminderDataItem, 
                oldReminderDataItem: newReminderDataItem, });
    }


    _validate(reminderDataItem) {
        const { repeatDefinition } = reminderDataItem;
        if (!repeatDefinition) {
            return userError('ReminderManager-repeat_definition_required');
        }
        let error = R.validateRepeatDefinition(repeatDefinition);
        if (error) {
            return error;
        }
    }

    /**
     * Fired by {@link ReminderManager#asyncAddReminder} and 
     * {@link ReminderManager#asyncAddCurrencyReminder} after the priced item has 
     * been added.
     * @event ReminderManager~reminderAdd
     * @type {object}
     * @property {ReminderData}   newReminderData   The reminder data item being 
     * returned by the {@link ReminderManager#asyncAddReminder} call.
     */

    /**
     * @typedef {object}    ReminderManager~AddReminderResult
     * @property {ReminderDataItem}  newReminderDataItem
     */

    /**
     * Adds a reminder.
     * @param {(Reminder|ReminderDataItem)} reminder 
     * @param {boolean} validateOnly 
     * @returns {ReminderManager~AddReminderResult|undefined} <code>undefined</code> 
     * is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {ReminderManager~reminderAdd}
     */
    async asyncAddReminder(reminder, validateOnly) {
        let reminderDataItem = getReminderDataItem(reminder, true);

        const error = this._validate(reminderDataItem);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return;
        }
        
        const originalIdGeneratorOptions = this._idGenerator.toJSON();

        const id = this._idGenerator.generateId();
        reminderDataItem.id = id;
        const idGeneratorOptions = this._idGenerator.toJSON();

        const updatedDataItems = [[id, reminderDataItem]];
        await this._handler.asyncUpdateReminderDataItems(
            updatedDataItems, idGeneratorOptions);

        this._reminderDataItemsById.set(id, reminderDataItem);

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('addReminder', 
                { reminderId: reminderDataItem.id, 
                    idGeneratorOptions: originalIdGeneratorOptions, 
                });

        reminderDataItem = getReminderDataItem(reminderDataItem, true);
        this.emit('reminderAdd', { newReminderDataItem: reminderDataItem, });
        return { newReminderDataItem: reminderDataItem, undoId: undoId };
    }


    /**
     * Fired by {@link ReminderManager#asyncRemovedReminder} after a reminder has 
     * been removed.
     * @event ReminderManager~reminderRemove
     * @type {object}
     * @property {ReminderDataItem}   removedReminderDataItem   The reminder data 
     * item being returned by the {@link ReminderManager#asyncRemoveReminder} call.
     */

    /**
     * @typedef {object}    ReminderManager~RemoveReminderResult
     * @property {ReminderDataItem}  removedReminderDataItem
     */

    /**
     * Removes a reminder.
     * @param {number} id 
     * @param {boolean} validateOnly 
     * @returns {ReminderManager~RemoveReminderResult|undefined}  
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {ReminderManager~reminderRemove}
     */
    async asyncRemoveReminder(id, validateOnly) {
        const reminderDataItem = this._reminderDataItemsById.get(id);
        if (!reminderDataItem) {
            throw userError('ReminderManager-remove_no_id', id);
        }

        if (validateOnly) {
            return;
        }

        this._reminderDataItemsById.delete(id);

        const updatedDataItems = [[id]];
        await this._handler.asyncUpdateReminderDataItems(updatedDataItems);

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('removeReminder', 
                { removedReminderDataItem: getReminderDataItem(reminderDataItem, true), 
                });

        this.emit('reminderRemove', { removedReminderDataItem: reminderDataItem });
        return { removedReminderDataItem: reminderDataItem, undoId: undoId, };
    }


    /**
     * Fired by {@link ReminderManager#asyncModifyReminder} after the reminder has 
     * been modified.
     * @event ReminderManager~reminderModify
     * @type {object}
     * @property {ReminderDataItem}   newReminderDataItem   The new reminder data 
     * item being returned by the {@link ReminderManager#asyncAddReminder} call.
     * @property {ReminderDataItem}   oldReminderDataItem   The old reminder data 
     * item being returned by the {@link ReminderManager#asyncAddReminder} call.
     */

    /**
     * @typedef {object}    ReminderManager~ModifyReminderResult
     * @property {ReminderDataItem}  newReminderDataItem
     * @property {ReminderDataItem}  oldReminderDataItem
     */

    /**
     * Modifies an existing reminder.
     * @param {(ReminderData|Reminder)} reminder The new reminder properties. 
     * The id property is required. For all other properties, if the property 
     * is not included in reminder, the property will not be changed.
     * @param {boolean} validateOnly 
     * @returns {ReminderManager~ModifyReminderResult|undefined}  
     * <code>undefined</code> is returned if validateOnly is <code>true</code>.
     * @throws {Error}
     * @fires {ReminderManager~reminderModify}
     */
    async asyncModifyReminder(reminder, validateOnly) {
        const id = reminder.id;

        const oldReminderDataItem = this._reminderDataItemsById.get(id);
        if (!oldReminderDataItem) {
            throw userError('ReminderManager-modify_no_id', id);
        }

        let newReminderDataItem = Object.assign({}, oldReminderDataItem, reminder);
        newReminderDataItem = getReminderDataItem(newReminderDataItem);

        const error = this._validate(newReminderDataItem);
        if (error) {
            throw error;
        }

        if (validateOnly) {
            return newReminderDataItem;
        }

        const updatedDataItems = [[id, newReminderDataItem]];

        await this._handler.asyncUpdateReminderDataItems(updatedDataItems);

        this._reminderDataItemsById.set(id, newReminderDataItem);

        const undoId = await this._accountingSystem.getUndoManager()
            .asyncRegisterUndoDataItem('modifyReminder', 
                { oldReminderDataItem: getReminderDataItem(oldReminderDataItem, true), });

        newReminderDataItem = getReminderDataItem(newReminderDataItem, true);
        this.emit('reminderModify', 
            { newReminderDataItem: newReminderDataItem, 
                oldReminderDataItem: oldReminderDataItem });
        return { newReminderDataItem: newReminderDataItem, 
            oldReminderDataItem: oldReminderDataItem, 
            undoId: undoId, 
        };
    }
}


/**
 * Handler interface implemented by {@link AccountingFile} implementations to 
 * interact with the {@link ReminderManager}.
 * @interface
 */
export class RemindersHandler {
    /**
     * Retrieves an array containing all the reminders. The reminders are presumed
     * to already be loaded when the {@link ReminderManager} is constructed.
     * @returns {ReminderDataItem[]}
     */
    getReminderDataItems() {
        throw Error('RemindersHandler.getReminderDataItems() abstract method!');
    }

    /**
     * @returns {NumericIdGenerator~Options}    The id generator options for 
     * initializing the id generator.
     */
    getIdGeneratorOptions() {
        throw Error('RemindersHandler.getIdGeneratorOptions() abstract method!');
    }


    /**
     * Main function for updating the reminder data items.
     * @param {*} idReminderDataItemPairs Array of one or two element sub-arrays. 
     * The first element of each sub-array is the reminder id.
     * For new or modified reminders, the second element is the new data item. 
     * For reminders to be deleted, this is <code>undefined</code>.
     * @param {NumericIdGenerator~Options|undefined}  idGeneratorOptions    The 
     * current state of the id generator, if <code>undefined</code> the generator 
     * state hasn't changed.
     */
    async asyncUpdateReminderDataItems(idReminderDataItemPairs, idGeneratorOptions) {
        throw Error('RemindersHandler.reminderModify() abstract method!');
    }
}


/**
 * A simple in-memory implementation of {@link RemindersHandler}
 */
export class InMemoryRemindersHandler extends RemindersHandler {
    constructor(reminderDataItems) {
        super();

        this._reminderDataItemsById = new Map();
        if (reminderDataItems) {
            reminderDataItems.forEach((reminderDataItem) => {
                this._reminderDataItemsById.set(reminderDataItem.id, reminderDataItem);
            });
        }

        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            idGeneratorOptions: this._idGeneratorOptions,
            reminders: Array.from(this._reminderDataItemsById.values()),
        };
    }

    fromJSON(json) {
        this._idGeneratorOptions = json.idGeneratorOptions;

        this._reminderDataItemsById.clear();
        json.reminders.forEach((reminderDataItem) => {
            this._reminderDataItemsById.set(reminderDataItem.id, reminderDataItem);
        });

        this.markChanged();
    }


    getReminderDataItems() {
        return Array.from(this._reminderDataItemsById.values());
    }

    getIdGeneratorOptions() {
        return this._idGeneratorOptions;
    }

    async asyncUpdateReminderDataItems(idReminderDataItemPairs, idGeneratorOptions) {
        idReminderDataItemPairs.forEach(([id, reminderDataItem]) => {
            if (!reminderDataItem) {
                this._reminderDataItemsById.delete(id);
            }
            else {
                this._reminderDataItemsById.set(id, reminderDataItem);
            }
        });

        if (idGeneratorOptions) {
            this._idGeneratorOptions = idGeneratorOptions;
        }

        this.markChanged();
    }

}
