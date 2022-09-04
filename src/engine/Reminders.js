import { EventEmitter } from 'events';
import { userError } from '../util/UserMessages';
import { NumericIdGenerator } from '../util/NumericIds';
import * as DO from '../util/DateOccurrences';
import { getTransaction, getTransactionDataItem } from './Transactions';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';



/**
 * @typedef {object} Reminder
 * @property {number}   id  The id of the reminder in the reminder manager.
 * @property {DateOccurrenceDefinition} occurrenceDefinition Defines when the 
 * reminder is to occur and optionally repeat.
 * @property {DateOccurrenceState} lastOccurrenceState The state representing
 * the last occurrence.
 * @property {YMDDate} [lastAppliedYMDDate] If present the date of the last
 * application of the reminder. Normally the lastOccurrenceYMDDate property
 * of lastOccurrenceState is the date of the last application. However,
 * that property is used to determine the next due date. If a reminder is
 * to applied early, in order for the next due date to skip that application
 * lastOccurrenceYMDDate will need to be on or after the original due date.
 * lastAppliedYMDDate is used in that scenario to track the date the
 * reminder was last applied.
 * @property {string}   [description]   The description of the reminder.
 * @property {Transaction} transactionTemplate  The template for
 * the transaction being reminded of.
 * @property {boolean}  isEnabled
 * @property {boolean}  [noRemindEarly=false] If truthy then the reminder should
 * only appear if the current date is on or after the next occurrence, otherwise if
 * there is a global 'remind days before' setting it should make use of that.
 */

/**
 * @typedef {object} ReminderDataItem
 * @property {number}   id  The id of the reminder in the reminder manager.
 * @property {DateOccurrenceDefinitionDataItem} occurrenceDefinition Defines when 
 * the reminder is to occur and optionally repeat.
 * @property {DateOccurrenceStateDataItem} lastOccurrenceState The state representing
 * the last occurrence.
 * @property {string} [lastAppliedYMDDate] If present the date of the last
 * application of the reminder. Normally the lastOccurrenceYMDDate property
 * of lastOccurrenceState is the date of the last application. However,
 * that property is used to determine the next due date. If a reminder is
 * to applied early, in order for the next due date to skip that application
 * lastOccurrenceYMDDate will need to be on or after the original due date.
 * lastAppliedYMDDate is used in that scenario to track the date the
 * reminder was last applied.
 * @property {string}   [description]   The description of the reminder.
 * @property {TransactionDataItem} transactionTemplate  The template for
 * the transaction being reminded of.
 * @property {boolean}  isEnabled
 * @property {boolean}  [noRemindEarly=false] If truthy then the reminder should
 * only appear if the current date is on or after the next occurrence, otherwise if
 * there is a global 'remind days before' setting it should make use of that.
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
        const occurrenceDefinition = DO.getDateOccurrenceDefinition(
            reminderDataItem.occurrenceDefinition, alwaysCopy);
        const lastOccurrenceState = DO.getDateOccurrenceState(
            reminderDataItem.lastOccurrenceState, alwaysCopy);
        const lastAppliedYMDDate = getYMDDate(reminderDataItem.lastAppliedYMDDate);
        const transactionTemplate 
            = getTransaction(reminderDataItem.transactionTemplate, alwaysCopy);

        if (alwaysCopy
         || (occurrenceDefinition !== reminderDataItem.occurrenceDefinition)
         || (lastOccurrenceState !== reminderDataItem.lastOccurrenceState)
         || (lastAppliedYMDDate !== reminderDataItem.lastAppliedYMDDate)
         || (transactionTemplate !== reminderDataItem.transactionTemplate)) {
            const reminder = Object.assign({}, reminderDataItem);
            if (occurrenceDefinition) {
                reminder.occurrenceDefinition = occurrenceDefinition;
            }
            if (lastOccurrenceState) {
                reminder.lastOccurrenceState = lastOccurrenceState;
            }
            if (lastAppliedYMDDate) {
                reminder.lastAppliedYMDDate = lastAppliedYMDDate;
            }
            if (transactionTemplate) {
                reminder.transactionTemplate = transactionTemplate;
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
        const occurrenceDefinition = DO.getDateOccurrenceDefinitionDataItem(
            reminder.occurrenceDefinition, alwaysCopy);
        const lastOccurrenceState = DO.getDateOccurrenceStateDataItem(
            reminder.lastOccurrenceState, alwaysCopy);
        const lastAppliedYMDDate = getYMDDateString(reminder.lastAppliedYMDDate);
        const transactionTemplate 
            = getTransactionDataItem(reminder.transactionTemplate, alwaysCopy);
        if (alwaysCopy
         || (occurrenceDefinition !== reminder.occurrenceDefinition)
         || (lastOccurrenceState !== reminder.lastOccurrenceState)
         || (lastAppliedYMDDate !== reminder.lastAppliedYMDDate)
         || (transactionTemplate !== reminder.transactionTemplate)) {
            const reminderDataItem = Object.assign({}, reminder);
            if (occurrenceDefinition) {
                reminderDataItem.occurrenceDefinition = occurrenceDefinition;
            }
            if (lastOccurrenceState) {
                reminderDataItem.lastOccurrenceState = lastOccurrenceState;
            }
            if (lastAppliedYMDDate) {
                reminderDataItem.lastAppliedYMDDate = lastAppliedYMDDate;
            }
            if (transactionTemplate) {
                reminderDataItem.transactionTemplate = transactionTemplate;
            }
            return reminderDataItem;
        }
    }
    return reminder;
}


/**
 * Determines if a reminder is due.
 * @param {Reminder|ReminderDataItem} reminder 
 * @param {YMDDate|string} [refYMDDate] If not specified today is used.
 * @param {DateOccurrenceState|DateOccurrenceStateDataItem} [occurrenceState]
 * If specified overrides the reminder's lastOccurrenceState.
 * @returns {DateOccurrenceState|undefined} Returns <code>undefined</code> if
 * the reminder is not currently due.
 */
export function isReminderDue(reminder, refYMDDate, occurrenceState) {
    const nextOccurrenceState = getReminderNextDateOccurrenceState(reminder, 
        occurrenceState);
    if (nextOccurrenceState && !nextOccurrenceState.isDone) {
        refYMDDate = getYMDDate(refYMDDate) || new YMDDate();
        if (YMDDate.compare(
            nextOccurrenceState.lastOccurrenceYMDDate, refYMDDate) <= 0) {
            return nextOccurrenceState;
        }
    }
}

/**
 * Retrieves the next date occurrence state for a reminder, the 
 * lastOccurrenceYMDDate property of the returned object is the next
 * due date.
 * @param {Reminder|ReminderDataItem} reminder 
 * @param {*} occurrenceState 
 * @param {DateOccurrenceState|DateOccurrenceStateDataItem} [occurrenceState]
 * If specified overrides the reminder's lastOccurrenceState.
 * @returns {DateOccurrenceState|undefined} Returns <code>undefined</code> if
 * the reminder is not enabled.
 */
export function getReminderNextDateOccurrenceState(reminder, occurrenceState) {
    reminder = getReminder(reminder);
    if (reminder && reminder.isEnabled) {
        const { occurrenceDefinition, lastOccurrenceState } = reminder;
        if (occurrenceDefinition) {
            occurrenceState = occurrenceState || lastOccurrenceState;
            return DO.getNextDateOccurrenceState(
                occurrenceDefinition, occurrenceState);
        }
    }
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

            const nextOccurrenceState = DO.getNextDateOccurrenceState(
                reminderDataItem.occurrenceDefinition,
                reminderDataItem.lastOccurrenceState);
            if (nextOccurrenceState.isDone) {
                return;
            }

            const nextYMDDate = nextOccurrenceState.lastOccurrenceYMDDate;
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
        const { occurrenceDefinition, lastOccurrenceState } 
            = reminderDataItem;
        if (!occurrenceDefinition) {
            return userError('ReminderManager-occurrence_definition_required');
        }
        let error = DO.validateDateOccurrenceDefinition(occurrenceDefinition);
        if (error) {
            return error;
        }

        if (lastOccurrenceState) {
            const { lastOccurrenceYMDDate, occurrenceCount } = lastOccurrenceState;

            if (lastOccurrenceYMDDate) {
                if (!YMDDate.isValidDate(getYMDDate(lastOccurrenceYMDDate))) {
                    return userError('ReminderManager-lastOccurrenceYMDDate_invalid');
                }
            }

            switch (typeof occurrenceCount) {
            case 'undefined' :
            case 'number' :
                break;
            
            default :
                return userError('ReminderManager-occurrenceCount_invalid');
            }
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
