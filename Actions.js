import { EventEmitter } from 'events';
import { bug } from './Bug';


/**
 * @event ActionManager#actionApply
 * @param {ActionDataItem}  action
 * @param {*}   [result]    The result returned by the action applier.
 */

/**
 * @event ActionManager#actionUndo
 * @param {ActionDataItem}  lastAction
 */

/**
 * @event ActionManager#actionReapply
 * @param {ActionDataItem}  lastAction
 * @param {*}   [lastResult]    The result returned by the action applier that
 * applied lastAction.
 */

/**
 * @event ActionManager#appliedActionsClear
 */

/**
 * @event ActionManager#undoneActionsClear
 */

/**
 * Optional callback called after an action has been applied.
 * @function ActionManager~PostApplyCallback
 * @param {ActionDataItem} action   The action that was applied.
 * @param {*}   result  The result from the action applier
 * @return {*}  The result to return.
 */

/**
 * Optional callback called after an action has been undone.
 * Note that the undo callback can be called at any point after the action
 * has been undone, if multiple actions are being undone it may be getting
 * called after all the actions have been undone.
 * @function ActionManager~PostUndoCallback
 * @param {ActionDataItem} action   The action that was undone.
 */

/**
 * @typedef {object}    ActionDataItem
 * @property {string}   type    String used to identify the callback to use for 
 * applying the action.
 * @property {string}   name    Simple name for the action.
 * @property {string}   [description]
 * @property {ActionManager~PostApplyCallback} [postApplyCallback]
 * @property {ActionManager~PostUndoCallback} [postUndoCallback]
 */


/**
 * Helper for creating a composite action, which is an action made up of other actions.
 * The composite action applier returns an array containing the results of each action.
 * @param {ActionDataItem} mainAction The main action information.
 * @param {ActionDataItem[]} subActions The array of sub actions.
 * @returns {ActionDataItem}    The action has a subActions field.
 */
export function createCompositeAction(mainAction, subActions) {
    return Object.assign({}, mainAction, 
        { type: 'Composite', subActions: subActions, });
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

        this._asyncAppliersByType = new Map();

        this._asyncCompositeActionApplier = this._asyncCompositeActionApplier.bind(this);
        this.registerAsyncActionApplier('Composite', this._asyncCompositeActionApplier);

        this.asyncUndoLastAppliedAction = this.asyncUndoLastAppliedActions;
        this.asyncReapplyLastUndoneAction = this.asyncReapplyLastUndoneActions;
    }


    async asyncSetupForUse() {

    }

    shutDownFromUse() {
        this._asyncAppliersByType.clear();
        this._handler = undefined;
        this._undoManager = undefined;
    }
    

    /**
     * @returns {number}    The number of actions that have been applied and are 
     * available for undoing.
     */
    getAppliedActionCount() {
        return this._handler.getAppliedActionCount();
    }

    /**
     * @returns {number}    The number of actions that have been undone and can be 
     * reapplied.
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
     * @fires {ActionManager#appliedActionsClear}
     */
    async asyncClearAppliedActions() {
        const firstEntry = await this._handler.asyncGetAppliedActionEntryAtIndex(0);
        if (firstEntry) {
            await this._handler.asyncRemoveLastAppliedActionEntries(
                this._handler.getAppliedActionCount());
            await this._undoManager.asyncUndoToId(firstEntry.undoId, true);

            this.emit('appliedActionsClear');
        }
    }


    /**
     * Removes all undone actions from the manager.
     * @fires {ActionManager#undoneActionsClear}
     */
    async asyncClearUndoneActions() {
        const count = this._handler.getUndoneActionCount();
        if (count) {
            this._handler.asyncRemoveLastUndoneActions(count);
            
            this.emit('undoneActionsClear');
        }
    }


    async _asyncCompositeActionApplier(isValidateOnly, action) {
        const { subActions } = action;
        if (!subActions) {
            // eslint-disable-next-line max-len
            throw bug('Action of type "Composite" does not have a subActions property! Action: ' + JSON.stringify(action));
        }

        const results = [];
        for (let i = 0; i < subActions.length; ++i) {
            results.push(await this._asyncApplyAction(subActions[i], isValidateOnly));
        }

        return results;
    }


    async _asyncApplyAction(action, isValidateOnly) {
        const asyncApplier = this._asyncAppliersByType.get(action.type);
        if (!asyncApplier) {
            throw bug('An applier was not registered for actions of type "' 
                + action.type + '"!');
        }

        let result = await asyncApplier(isValidateOnly, action);

        if (!isValidateOnly) {
            const { postApplyCallback } = action;
            if (postApplyCallback) {
                result = postApplyCallback(action, result);
            }

            return result;
        }
    }


    /**
     * Performs validation on an action. The action manager is not updated.
     * @param {ActionDataItem} action 
     * @returns {undefined|Error}   Returns <code>undefined</code> if the action 
     * passes validation, an Error object if invalid.
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
     * @typedef {object}    ActionManager#ActionEntry
     * @property {number}   undoId
     * @property {ActionDataItem}   action
     */


    /**
     * Applies an action. After application the action is in the applied actions list 
     * at index {@link ActionManager#getAppliedActionCount} - 1.
     * The undone actions list is cleared.
     * @param {ActionDataItem} action 
     * @fires {ActionManager#actionApply}
     */
    async asyncApplyAction(action) {
        return this._asyncApplyAction2(action, true);
    }

    async _asyncApplyAction2(action, clearUndoneList) {
        const undoId = this._undoManager.getNextUndoId();
        const actionEntry = {
            undoId: undoId,
            action: action,
        };

        try {
            const result = await this._asyncApplyAction(action);
            await this._handler.asyncAddAppliedActionEntry(actionEntry);

            if (clearUndoneList) {
                await this.asyncClearUndoneActions();
            }

            this.emit('actionApply', action, result);
            return result;
        }
        catch (e) {
            if (this._undoManager.getNextUndoId() !== undoId) {
                await this._undoManager.asyncUndoToId(undoId);
            }
            throw e;
        }
    }


    /**
     * Undoes a number of the last applied actions. The actions are moved to the 
     * undone action list.
     * @param {number} [actionCount=1]  The number of applied actions to undo, if 
     * greater than the number of applied actions then all applied actions are undone.
     * @fires {ActionManager#actionUndo}
     */
    async asyncUndoLastAppliedActions(actionCount) {
        const totalCount = this._handler.getAppliedActionCount();
        if (totalCount > 0) {
            if (actionCount === undefined) {
                actionCount = 1;
            }

            const lastIndex = Math.max(totalCount - actionCount, 0);
            actionCount = totalCount - lastIndex;


            const actionEntry 
                = await this._handler.asyncGetAppliedActionEntryAtIndex(lastIndex);
            await this._undoManager.asyncUndoToId(actionEntry.undoId);

            let lastAction;
            for (let index = totalCount - 1; index >= lastIndex; --index) {
                const actionEntry 
                    = await this._handler.asyncGetAppliedActionEntryAtIndex(index);
                await this._handler.asyncRemoveLastAppliedActionEntries(1);
                await this._handler.asyncAddUndoneAction(actionEntry.action);

                const { postUndoCallback } = actionEntry.action;
                if (postUndoCallback) {
                    postUndoCallback(actionEntry);
                }

                lastAction = actionEntry.action;
            }

            this.emit('actionUndo', lastAction);
        }
    }


    /**
     * Reapplies a number of the last undone actions. The actions are moved frmo the 
     * undone action list to the applied action list as they are reapplied.
     * @param {number} [actionCount=1]  The number of undone actions to reapply. 
     * If greater than the number of undone actions then all undone actions are reapplied.
     * @fires {ActionManager#actionReapply}
     */
    async asyncReapplyLastUndoneActions(actionCount) {
        const totalCount = this._handler.getUndoneActionCount();
        if (totalCount > 0) {
            if (actionCount === undefined) {
                actionCount = 1;
            }

            const lastIndex = Math.max(totalCount - actionCount, 0);

            let lastAction;
            let lastActionResult;
            for (let index = totalCount - 1; index >= lastIndex; --index) {
                const action = await this.asyncGetUndoneActionAtIndex(index);

                await this._handler.asyncRemoveLastUndoneActions(1);
                lastActionResult = await this._asyncApplyAction2(action);
                lastAction = action;
            }

            this.emit('actionReapply', lastAction, lastActionResult);
        }
    }


    /**
     * @callback ActionManager~Applier
     * @async
     * @param {boolean} isValidateOnly  <code>true</code> if the applier is being 
     * called from {@link ActionManager#asyncValidateApplyAction}.
     * @param {ActionDataItem} actionDataItem   The action data item to be applied.
     * @return {*}  Optional, will be returned by {@link ActionManager#asyncApplyAction}.
     */


    /**
     * Registers an applier for an action type.
     * @param {string} type 
     * @param {ActionManager~Applier} asyncApplier 
     */
    registerAsyncActionApplier(type, asyncApplier) {
        this._asyncAppliersByType.set(type, asyncApplier);
    }


    /**
     * Unregisters an action type.
     * @param {string} type 
     */
    unregisterAsyncActionApplier(type) {
        this._asyncAppliersByType.delete(type);
    }
}



/**
 * Handler interface implemented by {@link AccountingFile} implementations to 
 * interact with the {@link ActionManager}.
 * @interface
 */
export class ActionsHandler {
    getAppliedActionCount() {
        throw Error('ActionHandler.getAppliedActionCount() abstract method!');
    }

    getUndoneActionCount() {
        throw Error('ActionHandler.getUndoneActionCount() abstract method!');
    }

    /**
     * 
     * @param {number} index 
     * @returns {ActionManager#ActionEntry}
     */
    async asyncGetAppliedActionEntryAtIndex(index) {
        // eslint-disable-next-line max-len
        throw Error('ActionHandler.asyncGetAppliedActionEntryAtIndex() abstract method!');
    }
    
    /**
     * 
     * @param {number} index 
     * @returns {ActionDataItem}
     */
    async asyncGetUndoneActionAtIndex(index) {
        throw Error('ActionHandler.asyncGetUndoneActionAtIndex() abstract method!');
    }
    
    /**
     * Adds an applied action to the applied actions stack.
     * @param {ActionManager#ActionEntry} actionEntry 
     */
    async asyncAddAppliedActionEntry(actionEntry) {
        throw Error('ActionsHandler.asyncAddAppliedActionEntry() abstract method!');
    }

    /**
     * Adds an undone action to the undone action stack.
     * @param {ActionDataItem} action 
     */
    async asyncAddUndoneAction(action) {
        throw Error('ActionsHandler.asyncAddUndoneAction() abstract method!');
    }

    /**
     * Removes one or more entries starting from the newest in the applied actions stack.
     * @param {number} count 
     */
    async asyncRemoveLastAppliedActionEntries(count) {
        // eslint-disable-next-line max-len
        throw Error('ActionsHandler.asyncRemoveLastAppliedActionEntries() abstract method!');
    }

    /**
     * Removes one or more entries starting from the newest in the undone actions stack.
     * @param {number} count 
     */
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
            undoneActions: this._undoneActions,
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
