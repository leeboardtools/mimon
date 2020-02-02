import { EventEmitter } from 'events';
import { bug } from './Bug';


/**
 * @typedef {object}    ActionDataItem
 * @property {string}   type    String used to identify the callback to use for applying the action.
 * @property {string}   name    Simple name for the action.
 * @property {string}   [description]
 * @property {string}   [undoName]    Simple name for undoing the action.
 * @property {string}   [undoDescription]
 */


/**
 * Helper for creating a composite action, which is an action made up of other actions.
 * @param {ActionDataItem} mainAction The main action information.
 * @param {ActionDataItem[]} subActions The array of sub actions.
 * @returns {ActionDataItem}
 */
export function createCompositeAction(mainAction, subActions) {
    return Object.assign({}, mainAction, { type: 'Composite', subActions: subActions, });
}


/**
 * Manages {@link ActionDataItem}s.
 * <p>
 * There is one built-in action type: 'Composite'.
 */
export class ActionManager extends EventEmitter {
    constructor(options) {
        super(options);

        this._undoManager = options.undoManager;

        this._handler = options.handler;

        this._appliersByType = new Map();

        this._asyncCompositeActionApplier = this._asyncCompositeActionApplier.bind(this);
        this.registerActionApplier('Composite', this._asyncCompositeActionApplier);
    }


    async asyncSetupForUse() {

    }


    /**
     * @returns {number}    The number of actions that have been applied and are available for undoing.
     */
    getAppliedActionCount() {
        return this._handler.getAppliedActionCount();
    }

    /**
     * @returns {number}    The number of actions that have been undone and can be reapplied.
     */
    getUndoneActionCount() {
        return this._handler.getUndoneActionCount();
    }

    /**
     * Retrieves an applied action.
     * @param {number} index The index, 0 is the oldest applied action.
     * @returns {ActionDataItem}
     */
    async asyncGetAppliedActionAtIndex(index) {
        const entry = await this._handler.asyncGetAppliedActionEntryAtIndex(index);
        if (entry) {
            return entry.action;
        }
    }

    /**
     * Retrieves an undone action.
     * @param {number} index The index, 0 is the oldest undone action.
     */
    async asyncGetUndoneActionAtIndex(index) {
        return this._handler.asyncGetUndoneActionAtIndex(index);
    }


    /**
     * Removes all applied actions from the manager.
     */
    async asyncClearAppliedActions() {
        const firstEntry = await this._handler.asyncGetAppliedActionEntryAtIndex(0);
        if (firstEntry) {
            await this._handler.asyncRemoveLastAppliedActionEntries(this._handler.getAppliedActionCount());
            await this._undoManager.asyncUndoToId(firstEntry.undoId, true);
        }
    }


    /**
     * Removes all undone actions from the manager.
     */
    async asyncClearUndoneActions() {
        this._handler.asyncRemoveLastUndoneActions(this._handler.getUndoneActionCount());
    }


    async _asyncCompositeActionApplier(isValidateOnly, action) {
        const { subActions } = action;
        if (!subActions) {
            throw bug('Action of type "Composite" does not have a subActions property! Action: ' + JSON.stringify(action));
        }
        for (let i = 0; i < subActions.length; ++i) {
            await this._asyncApplyAction(subActions[i], isValidateOnly);
        }
    }


    async _asyncApplyAction(action, isValidateOnly) {
        const applier = this._appliersByType.get(action.type);
        if (!applier) {
            throw bug('An applier was not registered for actions of type "' + action.type + '"!');
        }

        await applier(isValidateOnly, action);
    }


    /**
     * Performs validation on an action. The action manager is not updated.
     * @param {ActionDataItem} action 
     * @returns {undefined|Error}   Returns <code>undefined</code> if the action passes validation, an Error object if invalid.
     */
    async asyncValidateApplyAction(action) {
        try {
            await this._asyncApplyAction(action, true);
        }
        catch (e) {
            return e;
        }
    }


    /**
     * Applies an action. After application the action is in the applied actions list at index {@link ActionManager#getAppliedActionCount} - 1.
     * @param {ActionDataItem} action 
     */
    async asyncApplyAction(action) {
        const undoId = this._undoManager.getNextUndoId();
        const actionEntry = {
            undoId: undoId,
            action: action,
        };

        try {
            await this._asyncApplyAction(action);
            await this._handler.asyncAddAppliedActionEntry(actionEntry);
        }
        catch (e) {
            await this._undoManager.asyncUndoToId(undoId);
        }
    }


    /**
     * Undoes a number of the last applied actions. The actions are moved to the undone action list.
     * @param {number} [actionCount=1]  The number of applied actions to undo, if greater than the number of applied actions then
     * all applied actions are undone.
     */
    async asyncUndoLastAppliedActions(actionCount) {
        const totalCount = this._handler.getAppliedActionCount();
        if (totalCount > 0) {
            if (actionCount === undefined) {
                actionCount = 1;
            }

            const lastIndex = Math.max(totalCount - actionCount, 0);
            actionCount = totalCount - lastIndex;


            const actionEntry = await this._handler.asyncGetAppliedActionEntryAtIndex(lastIndex);
            await this._undoManager.asyncUndoToId(actionEntry.undoId);

            for (let index = totalCount - 1; index >= lastIndex; --index) {
                const actionEntry = await this._handler.asyncGetAppliedActionEntryAtIndex(index);
                await this._handler.asyncRemoveLastAppliedActionEntries(1);
                await this._handler.asyncAddUndoneAction(actionEntry.action);
            }
        }
    }


    /**
     * Reapplies a number of the last undone actions. The actions are moved frmo the undone action list to the applied action list
     * as they are reapplied.
     * @param {number} [actionCount=1]  The number of undone actions to reapply. If greater than the number of undone actions then
     * all undone actions are reapplied.
     */
    async asyncReapplyLastUndoneActions(actionCount) {
        const totalCount = this._handler.getUndoneActionCount();
        if (totalCount > 0) {
            if (actionCount === undefined) {
                actionCount = 1;
            }

            const lastIndex = Math.max(totalCount - actionCount, 0);

            for (let index = totalCount - 1; index >= lastIndex; --index) {
                const action = await this.asyncGetUndoneActionAtIndex(index);

                await this._handler.asyncRemoveLastUndoneActions(1);
                await this.asyncApplyAction(action);
            }
        }
    }


    /**
     * @callback ActionManager~Applier
     * @param {boolean} isValidateOnly  <code>true</code> if the applier is being called from {@link ActionManager#asyncValidateApplyAction}.
     * @param {ActionDataItem} actionDataItem   The action data item to be applied.
     */


    /**
     * Registers an applier for an action type.
     * @param {string} type 
     * @param {ActionManager~Applier} applier 
     */
    registerActionApplier(type, applier) {
        this._appliersByType.set(type, applier);
    }
}



/**
 * Handler interface implemented by {@link AccountingFile} implementations to interact with the {@link ActionManager}.
 * @interface
 */
export class ActionsHandler {
    getAppliedActionCount() {
        throw Error('ActionHandler.getAppliedActionCount() abstract method!');
    }

    getUndoneActionCount() {
        throw Error('ActionHandler.getUndoneActionCount() abstract method!');
    }

    async asyncGetAppliedActionEntryAtIndex(index) {
        throw Error('ActionHandler.asyncGetAppliedActionEntryAtIndex() abstract method!');
    }
    
    async asyncGetUndoneActionAtIndex(index) {
        throw Error('ActionHandler.asyncGetUndoneActionAtIndex() abstract method!');
    }
    
    async asyncAddAppliedActionEntry(actionEntry) {
        throw Error('ActionsHandler.asyncAddAppliedActionEntry() abstract method!');
    }

    async asyncAddUndoneAction(action) {
        throw Error('ActionsHandler.asyncAddUndoneAction() abstract method!');
    }

    async asyncRemoveLastAppliedActionEntries(count) {
        throw Error('ActionsHandler.asyncRemoveLastAppliedActionEntries() abstract method!');
    }

    async asyncRemoveLastUndoneActions(count) {
        throw Error('ActionsHandler.asyncRemoveLastUndoneActions() abstract method!');
    }
}


/**
 * Simple implementation of {@link ActionsHandler}.
 */
export class InMemoryActionsHandler extends ActionsHandler {
    constructor() {
        super();
        this._appliedActionEntries = [];
        this._undoneActions = [];
 
        this._lastChangeId = 0;
    }

    getLastChangeId() { return this._lastChangeId; }

    markChanged() { ++this._lastChangeId; }

    toJSON() {
        return {
            appliedActionEntries: this._appliedActionEntries,
            udoneActions: this._undoneActions,
        };
    }

    fromJSON(json) {
        this._appliedActionEntries.clear();
        this._undoneActions.clear();

        if (json.appliedActionEntries) {
            this._appliedActionEntries = json.appliedActionEntries;
        }
        if (json.undoneActions) {
            this._undoneActions = json.undoneActions;
        }

        this.markChanged();
    }

    getAppliedActionCount() {
        return this._appliedActionEntries.length;
    }

    getUndoneActionCount() {
        return this._undoneActions.length;
    }

    async asyncGetAppliedActionEntryAtIndex(index) {
        return this._appliedActionEntries[index];
    }

    async asyncGetUndoneActionAtIndex(index) {
        return this._undoneActions[index];
    }

    async asyncAddAppliedActionEntry(actionEntry) {
        this._appliedActionEntries.push(actionEntry);
    }

    async asyncAddUndoneAction(action) {
        this._undoneActions.push(action);
    }

    async asyncRemoveLastAppliedActionEntries(count) {
        const { _appliedActionEntries } = this;
        _appliedActionEntries.splice(_appliedActionEntries.length - count);
    }

    async asyncRemoveLastUndoneActions(count) {
        const { _undoneActions } = this;
        _undoneActions.splice(_undoneActions.length - count);
    }
}
