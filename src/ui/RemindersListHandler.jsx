import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { RemindersList, createDefaultColumns } from './RemindersList';
import { isReminderDue, getReminderNextDateOccurrenceState } from '../engine/Reminders';
import { createCompositeAction } from '../util/Actions';
import * as T from '../engine/Transactions';
import { YMDDate, getYMDDateString } from '../util/YMDDate';
import deepEqual from 'deep-equal';
import { TabIdRowTableHandler, updateStateFromProjectSettings } 
    from '../util-ui/RowTableHelpers';


const MAX_REMIND_DAYS_BEFORE = 14;


/**
 * Handler for {@link RemindersList} components and their pages in the 
 * {@link MainWindow}, this manages all the reminder related commands.
 */
export class RemindersListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.updateStateFromModifiedProjectSettings 
            = this.updateStateFromModifiedProjectSettings.bind(this);

        this.onNewReminder = this.onNewReminder.bind(this);
        this.onModifyReminder = this.onModifyReminder.bind(this);
        this.onRemoveReminder = this.onRemoveReminder.bind(this);

        this.onToggleReminderVisible = this.onToggleReminderVisible.bind(this);
        this.onToggleShowHiddenReminders = this.onToggleShowHiddenReminders.bind(this);

        this.onSelectReminder = this.onSelectReminder.bind(this);
        this.onChooseReminder = this.onChooseReminder.bind(this);

        this.onApplyReminders = this.onApplyReminders.bind(this);
        this.onSkipDueReminders = this.onSkipDueReminders.bind(this);


        this.onReminderAdd = this.onReminderAdd.bind(this);
        this.onReminderModify = this.onReminderModify.bind(this);
        this.onReminderRemove = this.onReminderRemove.bind(this);
        this.onTransactionsModify = this.onTransactionsModify.bind(this);
        this.onTransactionsRemove = this.onTransactionsRemove.bind(this);

        this.onCloseTab = this.onCloseTab.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);

        this.getTabDropdownInfo = this.getTabDropdownInfo.bind(this);


        // This should be after all the bind() calls...
        this._rowTableHandler = new TabIdRowTableHandler({
            mainWindowHandler: this,
            userIdBase: 'RemindersListHandler',
            updateStateFromModifiedProjectSettings:
                this.updateStateFromModifiedProjectSettings,
        });
    }


    updateStateFromModifiedProjectSettings(args) {
        const { newState, currentState } = args;
        if (newState.remindDaysBefore !== currentState.remindDaysBefore) {
            updateStateFromProjectSettings(args, 'remindDaysBefore');

            const { accessor } = this.props;
            const refYMDDates = this.getRefYMDDatesForIsReminderDue(newState.tabId);
            const newDueEntriesById = new Map();
            const reminderIds = accessor.getReminderIds();
            reminderIds.forEach((id) => {
                const reminderDataItem = accessor.getReminderDataItemWithId(id);
                const dueEntry = this.createDueEntry({
                    tabId: newState,
                    reminderDataItem: reminderDataItem,
                    refYMDDates: refYMDDates, 
                });
                if (dueEntry) {
                    newDueEntriesById.set(id, dueEntry);
                }
            });
            if (!deepEqual(newDueEntriesById, currentState.dueEntriesById)) {
                newState.dueEntriesById = newDueEntriesById;
            }    
        }
    }


    onNewReminder(tabId) {
        this.openTab('reminderEditor');
    }


    onModifyReminder(tabId) {
        const { activeReminderId} = this.getTabIdState(tabId);
        if (activeReminderId) {
            this.openTab('reminderEditor', { reminderId: activeReminderId, });
        }
    }


    onRemoveReminder(tabId) {
        const { activeReminderId} = this.getTabIdState(tabId);
        if (activeReminderId) {
            process.nextTick(async () => {
                const { accessor } = this.props;
                const accountingActions = accessor.getAccountingActions();
                const action = await accountingActions.createRemoveReminderAction(
                    activeReminderId);
                accessor.asyncApplyAction(action)
                    .catch((e) => {
                        this.setErrorMsg(e);
                    });
            });
        }
    }


    onToggleReminderVisible(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        const hiddenReminderIds = Array.from(state.hiddenReminderIds);
        const index = hiddenReminderIds.indexOf(reminderId);
        if (index >= 0) {
            hiddenReminderIds.splice(index, 1);
        }
        else {
            hiddenReminderIds.push(reminderId);
            // TODO: Also need to set the active reminder to something else
            // if we're not showing hidden reminders.
        }

        const newState = Object.assign({}, state, {
            hiddenReminderIds: hiddenReminderIds,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, 
            newState);

        this.setTabIdState(tabId, newState);
    }


    onToggleShowHiddenReminders(tabId) {
        const state = this.getTabIdState(tabId);

        const newState = Object.assign({}, state, {
            showHiddenReminders: !state.showHiddenReminders,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, 
            newState);

        this.setTabIdState(tabId, newState);

    }


    getRefYMDDatesForIsReminderDue(tabId) {
        const result = {
            today: new YMDDate(),
        };
        const state = (typeof tabId === 'object') ? tabId : this.getTabIdState(tabId);
        if (state) {
            const { remindDaysBefore } = state;
            if ((typeof remindDaysBefore === 'number') && (remindDaysBefore > 0)) {
                result.earlyYMDDate = new YMDDate().addDays(remindDaysBefore);
            }
        }

        return result;
    }


    isReminderDataItemDue(tabId, reminderDataItem, refYMDDates) {
        refYMDDates = refYMDDates || this.getRefYMDDatesForIsReminderDue(tabId);
        const refYMDDate = (reminderDataItem.noRemindEarly) 
            ? refYMDDates.today : refYMDDates.earlyYMDDate;
        return isReminderDue(reminderDataItem, refYMDDate);
    }


    getAllDueReminders(tabId) {
        const { accessor } = this.props;

        const refYMDDates = this.getRefYMDDatesForIsReminderDue(tabId);

        const reminderIds = [];
        const allReminderIds = accessor.getReminderIds();
        allReminderIds.forEach((id) => {
            const reminderDataItem = accessor.getReminderDataItemWithId(id);
            if (this.isReminderDataItemDue(tabId, reminderDataItem, refYMDDates)) {
                reminderIds.push(id);
            }
        });

        return reminderIds;
    }


    createApplyOrSkipReminderActions({tabId, reminderId, mode, isSkip}) {
        const { accessor } = this.props;
        const accountingActions = accessor.getAccountingActions();
        const reminderDataItem = accessor.getReminderDataItemWithId(reminderId);

        const result = {
            dueEntry: {
                reminderId: reminderId,
                dueStatus: (isSkip) ? 'SKIPPED' : 'APPLIED',
            },
        };

        const actions = [];

        let baseTransactionDataItem;
        if (!isSkip) {
            const { transactionTemplate } = reminderDataItem;
            baseTransactionDataItem = T.getTransactionDataItem(
                transactionTemplate, true);
            delete baseTransactionDataItem.id;

            const { splits } = baseTransactionDataItem;
            if (accessor.validateSplits(splits)) {
                let missingSplitIndex = -1;
                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    if (!split.quantityBaseValue) {
                        if (missingSplitIndex >= 0) {
                            // Multiple missing splits, zero everything out.
                            missingSplitIndex = -1;
                            break;
                        }
                        missingSplitIndex = i;
                    }
                }

                if (missingSplitIndex >= 0) {
                    const workingSplits = splits.slice(0, missingSplitIndex).concat(
                        splits.slice(missingSplitIndex + 1)
                    );
                    splits[missingSplitIndex] = accessor.createBalancingSplitDataItem(
                        workingSplits, splits[missingSplitIndex].accountId);
                }
                else {
                    // Presume all the splits did not have quantityBaseValues...
                    const { splits } = baseTransactionDataItem;

                    let sign = 1;
                    splits.forEach((split) => {
                        const accountCategory = accessor.getCategoryOfAccountId(
                            split.accountId
                        );
                        split.quantityBaseValue = sign * accountCategory.creditSign * 0;
                        sign = -sign;
                    });

                    result.dueEntry.dueStatus = 'PARTIAL';
                }
            }
        }

        let transactionDataItem = baseTransactionDataItem;
        let transactionAction;

        // modes:
        // NEXT - "Apply All Due Reminders for Next Date Only"
        // ALL - "Apply All Due Reminders for All Due Dates Until Today"
        // LATEST - "Apply All Due Reminders for Latest Date Only"
        // NEXT_NOW
        // NOW_KEEP_NEXT
        let onlyLatest;
        let keepNext;
        let applyNow;
        let repeatForAll;
        switch (mode) {
        case 'NEXT':
            break;

        case 'ALL':
            repeatForAll = true;
            break;

        case 'LATEST':
            onlyLatest = true;
            break;

        case 'LATEST_NOW':
            onlyLatest = true;
            applyNow = true;
            break;

        case 'NEXT_NOW':
            applyNow = true;
            break;

        case 'NOW_KEEP_NEXT':
            applyNow = true;
            keepNext = true;
            break;
        }

        const refYMDDates = this.getRefYMDDatesForIsReminderDue(tabId);
        const { today } = refYMDDates;
        do {
            let nextOccurrenceState = this.isReminderDataItemDue(
                tabId, reminderDataItem, refYMDDates);
            if (onlyLatest) {
                // We want the latest due date.
                if (nextOccurrenceState) {
                    const refYMDDate = (reminderDataItem.noRemindEarly) 
                        ? refYMDDates.today : refYMDDates.earlyYMDDate;
                    let latestOccurrenceState = nextOccurrenceState;
                    while (latestOccurrenceState) {
                        nextOccurrenceState = latestOccurrenceState;
                        latestOccurrenceState = isReminderDue(
                            reminderDataItem, refYMDDate, latestOccurrenceState);
                    }
                }
            }
            if (applyNow) {
                if (!nextOccurrenceState || onlyLatest) {
                    nextOccurrenceState = getReminderNextDateOccurrenceState(
                        reminderDataItem,
                        {
                            lastOccurrenceYMDDate: today,
                        });
                }
            }
            if (!nextOccurrenceState) {
                break;
            }

            if (!isSkip) {
                transactionDataItem = T.getTransactionDataItem(
                    baseTransactionDataItem, true);

                const { splits } = transactionDataItem;
                let isNonZeroSplit;
                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    if (split.quantityBaseValue) {
                        isNonZeroSplit = true;
                        break;
                    }
                }
    
                // Use the reminder's next date only if the reminder is not a 
                // partial reminder.
                transactionDataItem.ymdDate = (isNonZeroSplit)
                    ? nextOccurrenceState.lastOccurrenceYMDDate
                    : today;
                transactionAction = accountingActions.createAddTransactionAction(
                    transactionDataItem);
                actions.push(transactionAction);
            }

            // Update the reminder's state...
            if (!keepNext) {
                reminderDataItem.lastOccurrenceState = nextOccurrenceState;
            }
            if (!isSkip) {
                if (nextOccurrenceState.lastOccurrenceYMDDate !== today) {
                    reminderDataItem.lastAppliedYMDDate = getYMDDateString(today);
                }
            }
            const reminderAction = accountingActions.createModifyReminderAction(
                reminderDataItem);
            actions.push(reminderAction);
        }
        while (repeatForAll);

        if (transactionAction) {
            // This is the transaction action for the latest application.
            const { postApplyCallback } = transactionAction;
            
            transactionAction.postApplyCallback = (action, actionResult) => {
                const state = this.getTabIdState(tabId);

                result.dueEntry.transactionDataItem 
                    = actionResult.newTransactionDataItem;
                    
                const { dueEntriesById } = state;
                if (dueEntriesById) {
                    const dueEntry = dueEntriesById.get(reminderId);
                    if (dueEntry) {
                        const newDueEntry = Object.assign({}, dueEntry, {
                            transactionDataItem: actionResult.newTransactionDataItem,
                            dueStatus: result.dueEntry.dueStatus,
                        });
                        const newDueEntriesById = new Map(dueEntriesById);
                        newDueEntriesById.set(reminderId, newDueEntry);
                        this.updateDueEntriesById(tabId, newDueEntriesById);
                    }
                }
                return (postApplyCallback)
                    ? postApplyCallback(action, actionResult)
                    : actionResult;
            };
        }

        result.actions = actions;
            
        return result;
    }


    applyOrSkipReminders(args) {
        const { tabId, reminderId, } = args;
        let reminderIds;
        if (!reminderId) {
            reminderIds = this.getAllDueReminders();
        }
        else {
            reminderIds = [reminderId];
        }

        process.nextTick(async () => {
            const state = this.getTabIdState(tabId);
            const { dueEntriesById } = state;
            const newDueEntriesById = (dueEntriesById) 
                ? new Map(dueEntriesById)
                : undefined;
            let dueEntriesByIdUpdated;
            let actions = [];
            for (let i = 0; i < reminderIds.length; ++i) {
                args.reminderId = reminderIds[i];
                const result = this.createApplyOrSkipReminderActions(
                    args);
                if (result) {
                    actions = actions.concat(result.actions);
                    if (newDueEntriesById) {
                        newDueEntriesById.set(reminderIds[i], result.dueEntry);
                        dueEntriesByIdUpdated = true;
                    }
                }
            }

            if (actions.length) {
                const action = createCompositeAction({
                    name: userMsg(args.actionNameId),
                },
                actions);

                const { accessor } = this.props;
                await accessor.asyncApplyAction(action);
            }

            if (dueEntriesByIdUpdated) {
                this.updateDueEntriesById(tabId, newDueEntriesById);
            }
        });
    }

    onApplyReminders(args) {
        this.applyOrSkipReminders(args);
    }

    onSkipDueReminders(args) {
        args = Object.assign({}, args, { isSkip: true, });
        this.applyOrSkipReminders(args);
    }


    createDueEntry({ tabId, reminderDataItem, previousDueEntry, refYMDDates }) {
        const nextOccurrenceState = this.isReminderDataItemDue(
            tabId, reminderDataItem, refYMDDates);
        if (nextOccurrenceState) {
            return {
                reminderId: reminderDataItem.id,
                dueStatus: 'DUE',
            };
        }
        return previousDueEntry;
    }


    updateDueEntriesById(tabId, newDueEntriesById) {
        const state = this.getTabIdState(tabId);
        const newState = Object.assign({}, state, {
            dueEntriesById: newDueEntriesById,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, 
            newState);

        this.setTabIdState(tabId, newState);
    }

    onReminderAdd(tabId, result) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            const reminderDataItem = result.newReminderDataItem;
            const { id } = reminderDataItem;
            const dueEntry = this.createDueEntry({
                tabId: tabId,
                reminderDataItem: reminderDataItem,
            });
            if (dueEntry) {
                const newDueEntriesById = new Map(state.dueEntriesById);
                newDueEntriesById.set(id, dueEntry);
                this.updateDueEntriesById(tabId, newDueEntriesById);
            }

        }
    }

    onReminderModify(tabId, result) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            const newDueEntriesById = new Map(state.dueEntriesById);

            const reminderDataItem = result.newReminderDataItem;
            const { id } = reminderDataItem;
            const dueEntry = this.createDueEntry({
                tabId: tabId, 
                reminderDataItem: reminderDataItem,
            });
            if (dueEntry) {
                newDueEntriesById.set(id, dueEntry);
            }
            else {
                newDueEntriesById.delete(id);
            }
            
            this.updateDueEntriesById(tabId, newDueEntriesById);
        }
    }

    onReminderRemove(tabId, result) {
        const state = this.getTabIdState(tabId);
        const { id } = result.removedReminderDataItem;
        if (state.dueEntriesById && state.dueEntriesById.has(id)) {
            const newDueEntriesById = new Map(state.dueEntriesById);
            newDueEntriesById.delete(id);

            this.updateDueEntriesById(tabId, newDueEntriesById);
        }
    }


    getDueEntriesByTransactionId(tabId) {
        const state = this.getTabIdState(tabId);
        const { dueEntriesById } = state;
        if (!dueEntriesById || !dueEntriesById.size) {
            return;
        }

        const dueEntriesByTransactionId = new Map();
        dueEntriesById.forEach((dueEntry) => {
            if (dueEntry.transactionDataItem) {
                dueEntriesByTransactionId.set(
                    dueEntry.transactionDataItem.id,
                    dueEntry,
                );
            }
        });

        if (dueEntriesByTransactionId.size) {
            return dueEntriesByTransactionId;
        }
    }


    onTransactionsModify(tabId, result) {
        const dueEntriesByTransactionId 
            = this.getDueEntriesByTransactionId(tabId);
        if (!dueEntriesByTransactionId) {
            return;
        }

        const state = this.getTabIdState(tabId);

        let newDueEntriesById;

        result.newTransactionDataItems.forEach((transactionDataItem) => {
            const transactionId = transactionDataItem.id;
            const dueEntry = dueEntriesByTransactionId.get(transactionId);
            if (dueEntry) {
                const { splits } = transactionDataItem;
                let isNonZeroSplit;
                for (let i = 0; i < splits.length; ++i) {
                    const split = splits[i];
                    if (split.quantityBaseValue) {
                        isNonZeroSplit = true;
                        break;
                    }
                }

                let newDueStatus = (isNonZeroSplit) ? 'APPLIED' : 'PARTIAL';
                if (newDueStatus !== dueEntry.dueStatus) {
                    if (!newDueEntriesById) {
                        newDueEntriesById = new Map(state.dueEntriesById);
                    }

                    newDueEntriesById.set(dueEntry.reminderId, Object.assign({},
                        dueEntry,
                        {
                            dueStatus: newDueStatus,
                        }));
                }
            }
        });

        if (newDueEntriesById) {
            this.updateDueEntriesById(tabId, newDueEntriesById);
        }
    }


    onTransactionsRemove(tabId, result) {
        const dueEntriesByTransactionId 
            = this.getDueEntriesByTransactionId(tabId);
        if (!dueEntriesByTransactionId) {
            return;
        }

        const state = this.getTabIdState(tabId);

        let newDueEntriesById;

        result.removedTransactionDataItems.forEach((transactionDataItem) => {
            const transactionId = transactionDataItem.id;
            const dueEntry = dueEntriesByTransactionId.get(transactionId);
            if (dueEntry) {
                let newDueStatus = 'DUE';
                if (newDueStatus !== dueEntry.dueStatus) {
                    if (!newDueEntriesById) {
                        newDueEntriesById = new Map(state.dueEntriesById);
                    }

                    newDueEntriesById.set(dueEntry.reminderId, Object.assign({},
                        dueEntry,
                        {
                            dueStatus: newDueStatus,
                        }));
                }
            }
        });

        if (newDueEntriesById) {
            this.updateDueEntriesById(tabId, newDueEntriesById);
        }
    }


    onCloseTab(tabId, tabEntry) {
        if (tabEntry.dueEntriesById) {
            const { accessor } = this.props;
            accessor.off('reminderAdd', tabEntry.onReminderAdd);
            accessor.off('reminderModify', tabEntry.onReminderModify);
            accessor.off('reminderRemove', tabEntry.onReminderRemove);
            accessor.off('transactionsAdd', tabEntry.onTransactionsModify);
            accessor.off('transactionsModify', tabEntry.onTransactionsModify);
            accessor.off('transactionsRemove', tabEntry.onTransactionsRemove);
        }
    }


    onDaysBeforeReminder(tabId, daysBefore) {
        const state = this.getTabIdState(tabId);
        if (state.remindDaysBefore === daysBefore) {
            return;
        }

        this.setTabIdProjectSettings(state.projectSettingsId,
            {
                remindDaysBefore: daysBefore,
            },
            userMsg('RemindersListHandler-action_daysBeforeDue'));
    }

    buildDaysBeforeMenuItem(tabId, state) {
        const subMenuItems = [];

        for (let i = 0; i <= MAX_REMIND_DAYS_BEFORE; ++i) {
            //
            subMenuItems.push({
                id: 'daysBefore_' + i.toString(),
                label: i.toString(),
                checked: i === state.remindDaysBefore,
                onChooseItem: () => this.onDaysBeforeReminder(tabId, i),
            });
        }
        return { id: 'daysBeforeDueSubMenu',
            label: userMsg('RemindersListHandler-daysBeforeDueSubMenu'),
            subMenuItems: subMenuItems,
        };
    }


    getTabDropdownInfo(tabId, state) {
        const { activeReminderId, 
            hiddenReminderIds, showHiddenReminders, dueEntriesById, }
            = state;

        const showReminderLabelId = (hiddenReminderIds.indexOf(activeReminderId) >= 0)
            ? 'RemindersListHandler-showReminder'
            : 'RemindersListHandler-hideReminder';
        
        const checkRemindersItem = { id: 'checkReminders', 
            label: userMsg('MainWindow-checkReminders'),
            onChooseItem: () => this.openTab('remindersDueList'),
        };
        const newReminderItem = { id: 'newReminder',
            label: userMsg('RemindersListHandler-newReminder'),
            onChooseItem: () => this.onNewReminder(tabId),
        };
        const modifyReminderItem = { id: 'modifyReminder',
            label: userMsg('RemindersListHandler-modifyReminder'),
            disabled: !activeReminderId,
            onChooseItem: () => this.onModifyReminder(tabId),
        };
        const removeReminderItem = { id: 'removeReminder',
            label: userMsg('RemindersListHandler-removeReminder'),
            disabled: !activeReminderId,
            onChooseItem: () => this.onRemoveReminder(tabId),
        };
        const toggleReminderVisibleItem = { id: 'toggleReminderVisible',
            label: userMsg(showReminderLabelId),
            disabled: !activeReminderId,
            onChooseItem: () => this.onToggleReminderVisible(
                tabId, activeReminderId),
        };
        const toggleShowHiddenRemindersItem = { id: 'toggleShowHiddenReminders',
            label: userMsg('RemindersListHandler-showHiddenReminders'),
            checked: showHiddenReminders,
            onChooseItem: () => this.onToggleShowHiddenReminders(
                tabId),
        };

        let anyDueItems;
        let anyAppliedItems;
        let activeItemDueEntry;
        let canApplyActiveItem;
        if (dueEntriesById) {
            for (let [, dueEntry] of dueEntriesById) {
                if (dueEntry.dueStatus === 'DUE') {
                    anyDueItems = true;
                    if (anyAppliedItems) {
                        break;
                    }
                }
                else if (dueEntry.transactionDataItem) {
                    anyAppliedItems = true;
                    if (anyDueItems) {
                        break;
                    }
                }
            }

            if (activeReminderId) {
                activeItemDueEntry = dueEntriesById.get(activeReminderId);
                if (activeItemDueEntry && (activeItemDueEntry.dueStatus === 'DUE')) {
                    canApplyActiveItem = true;
                }
            }
        }
        else if (activeReminderId) {
            const { accessor } = this.props;
            const reminderDataItem = accessor.getReminderDataItemWithId(activeReminderId);
            if (reminderDataItem) {
                const nextOccurrenceState = getReminderNextDateOccurrenceState(
                    reminderDataItem);
                if (nextOccurrenceState && nextOccurrenceState.lastOccurrenceYMDDate) {
                    canApplyActiveItem = true;
                }
            }
        }

        const openAppliedTransactionItem = { id: 'openSelectedAppliedReminderTransaction',
            label: userMsg('RemindersListHandler-openSelectedAppliedReminderTransaction'),
            disabled: !anyAppliedItems
                || !activeItemDueEntry || !activeItemDueEntry.transactionDataItem,
            onChooseItem: () => this.onOpenAppliedTransaction(tabId),
        };

        const applySelectedRemindersNextItem = { id: 'applySelectedRemindersNext',
            label: userMsg('RemindersListHandler-applySelectedRemindersNext'),
            disabled: !canApplyActiveItem,
            onChooseItem: () => this.onApplyReminders({
                tabId: tabId, 
                reminderId: activeReminderId,
                mode: 'NEXT',
                actionNameId: 'RemindersListHandler-applySelectedRemindersNext',
            }),
        };
        const applyAllDueRemindersNextItem = { id: 'applyAllDueRemindersNext',
            label: userMsg('RemindersListHandler-applyAllDueRemindersNext'),
            disabled: !anyDueItems,
            onChooseItem: () => this.onApplyReminders({ 
                tabId: tabId, 
                mode: 'NEXT',
                actionNameId: 'RemindersListHandler-applyAllDueRemindersNext',
            }),
        };

        const applySelectedRemindersAllItem = { id: 'applySelectedRemindersAll',
            label: userMsg('RemindersListHandler-applySelectedRemindersAll'),
            disabled: !canApplyActiveItem,
            onChooseItem: () => this.onApplyReminders({
                tabId: tabId, 
                reminderId: activeReminderId,
                mode: 'ALL',
                actionNameId: 'RemindersListHandler-applySelectedRemindersAll',
            }),
        };
        const applyAllDueRemindersAllItem = { id: 'applyAllDueRemindersAll',
            label: userMsg('RemindersListHandler-applyAllDueRemindersAll'),
            disabled: !anyDueItems,
            onChooseItem: () => this.onApplyReminders({ 
                tabId: tabId, 
                mode: 'ALL',
                actionNameId: 'RemindersListHandler-applyAllDueRemindersAll',
            }),
        };

        const applySelectedRemindersLatestItem = { id: 'applySelectedRemindersLatest',
            label: userMsg('RemindersListHandler-applySelectedRemindersLatest'),
            disabled: !canApplyActiveItem,
            onChooseItem: () => this.onApplyReminders({
                tabId: tabId, 
                reminderId: activeReminderId,
                mode: 'LATEST',
                actionNameId: 'RemindersListHandler-applySelectedRemindersLatest',
            }),
        };
        const applyAllDueRemindersLatestItem = { id: 'applyAllDueRemindersLatest',
            label: userMsg('RemindersListHandler-applyAllDueRemindersLatest'),
            disabled: !anyDueItems,
            onChooseItem: () => this.onApplyReminders({ 
                tabId: tabId, 
                mode: 'LATEST',
                actionNameId: 'RemindersListHandler-applyAllDueRemindersLatest',
            }),
        };

        const skipSelectedRemindersNextItem = { id: 'skipSelectedRemindersNext',
            label: userMsg('RemindersListHandler-skipSelectedRemindersNext'),
            disabled: !canApplyActiveItem,
            onChooseItem: () => this.onSkipDueReminders({
                tabId: tabId, 
                reminderId: activeReminderId,
                mode: 'NEXT',
                actionNameId: 'RemindersListHandler-skipSelectedRemindersNext',
            }),
        };
        const skipAllDueRemindersNextItem = { id: 'skipAllDueRemindersNext',
            label: userMsg('RemindersListHandler-skipAllDueRemindersNext'),
            disabled: !anyDueItems,
            onChooseItem: () => this.onSkipDueReminders({
                tabId: tabId,
                mode: 'NEXT',
                actionNameId: 'RemindersListHandler-skipAllDueRemindersNext',
            }),
        };

        const skipSelectedRemindersAllItem = { id: 'skipSelectedRemindersAll',
            label: userMsg('RemindersListHandler-skipSelectedRemindersAll'),
            disabled: !canApplyActiveItem,
            onChooseItem: () => this.onSkipDueReminders({
                tabId: tabId, 
                reminderId: activeReminderId,
                mode: 'ALL',
                actionNameId: 'RemindersListHandler-skipSelectedRemindersAll',
            }),
        };
        const skipAllDueRemindersAllItem = { id: 'skipAllDueRemindersAll',
            label: userMsg('RemindersListHandler-skipAllDueRemindersAll'),
            disabled: !anyDueItems,
            onChooseItem: () => this.onSkipDueReminders({
                tabId: tabId,
                mode: 'ALL',
                actionNameId: 'RemindersListHandler-skipAllDueRemindersAll',
            }),
        };

        const menuItems = [];
        if (dueEntriesById) {
            menuItems.push(applyAllDueRemindersLatestItem);
            menuItems.push(applySelectedRemindersLatestItem);
            menuItems.push(skipSelectedRemindersAllItem);
            menuItems.push(openAppliedTransactionItem);
            menuItems.push(modifyReminderItem);
            menuItems.push({});

            menuItems.push(this.buildDaysBeforeMenuItem(tabId, state));
            menuItems.push({});

            const specialActionsMenuItems = [];
            menuItems.push({ id: 'specialActionsSubMenu',
                label: userMsg('RemindersListHandler-specialActionsSubMenu'),
                subMenuItems: specialActionsMenuItems,
            });

            specialActionsMenuItems.push(applyAllDueRemindersAllItem);
            specialActionsMenuItems.push(applySelectedRemindersAllItem);
            specialActionsMenuItems.push({});
            specialActionsMenuItems.push(applyAllDueRemindersNextItem);
            specialActionsMenuItems.push(applySelectedRemindersNextItem);
            specialActionsMenuItems.push({});
            specialActionsMenuItems.push(skipAllDueRemindersAllItem);
            specialActionsMenuItems.push({});
            specialActionsMenuItems.push(skipAllDueRemindersNextItem);
            specialActionsMenuItems.push(skipSelectedRemindersNextItem);
        }
        else {
            menuItems.push(checkRemindersItem);
            menuItems.push({});

            const applyLatestDueNow = { id: 'applyLatestDueNow',
                label: userMsg('RemindersListHandler-applyLatestDueNow'),
                disabled: !canApplyActiveItem,
                onChooseItem: () => this.onApplyReminders({
                    tabId: tabId, 
                    reminderId: activeReminderId,
                    mode: 'LATEST_NOW',
                    actionNameId: 'RemindersListHandler-applyLatestDueNow',
                }),
            };
            menuItems.push(applyLatestDueNow);

            const applyNextDueNow = { id: 'applyNextDueNow',
                label: userMsg('RemindersListHandler-applyNextDueNow'),
                disabled: !canApplyActiveItem,
                onChooseItem: () => this.onApplyReminders({
                    tabId: tabId, 
                    reminderId: activeReminderId,
                    mode: 'NEXT_NOW',
                    actionNameId: 'RemindersListHandler-applyNextDueNow',
                }),
            };
            menuItems.push(applyNextDueNow);

            const applyNowKeepNextDue = { id: 'applyNowKeepNextDue',
                label: userMsg('RemindersListHandler-applyNowKeepNextDue'),
                disabled: !canApplyActiveItem,
                onChooseItem: () => this.onApplyReminders({
                    tabId: tabId, 
                    reminderId: activeReminderId,
                    mode: 'NOW_KEEP_NEXT',
                    actionNameId: 'RemindersListHandler-applyNowKeepNextDue',
                }),
            };
            menuItems.push(applyNowKeepNextDue);

            const skipNextDue = { id: 'skipNextDue',
                label: userMsg('RemindersListHandler-skipNextDue'),
                disabled: !canApplyActiveItem,
                onChooseItem: () => this.onSkipDueReminders({
                    tabId: tabId, 
                    reminderId: activeReminderId,
                    mode: 'NEXT_NOW',
                    actionNameId: 'RemindersListHandler-skipNextDue',
                }),
            };
            menuItems.push(skipNextDue);

            menuItems.push({});
            menuItems.push(newReminderItem);
            menuItems.push(modifyReminderItem);
            menuItems.push(removeReminderItem);
            menuItems.push({});
            menuItems.push(toggleReminderVisibleItem);
            menuItems.push(toggleShowHiddenRemindersItem);
            menuItems.push({});
            menuItems.push(this._rowTableHandler.createClearColumnSortingMenuItem(
                tabId, state
            ));

        }
        menuItems.push({});
        menuItems.push(
            this._rowTableHandler.createResetColumnWidthsMenuItem(tabId, state));

        return {
            items: menuItems,
        };
    }


    onSelectReminder(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        const prevActiveReminderId = state.activeReminderId;

        let dropdownInfoNeedsUpdate;
        if ((!prevActiveReminderId && reminderId)
         || (prevActiveReminderId && !reminderId)) {
            dropdownInfoNeedsUpdate = true;
        }
        else if (reminderId) {
            const { dueEntriesById } = state;
            if (dueEntriesById) {
                const prevDueEntry = dueEntriesById.get(prevActiveReminderId);
                const dueEntry = dueEntriesById.get(reminderId);
                if (!deepEqual(dueEntry, prevDueEntry)) {
                    dropdownInfoNeedsUpdate = true;
                }
            }
        }

        if (dropdownInfoNeedsUpdate) {
            const newState = Object.assign({}, state, {
                activeReminderId: reminderId,
            });
            newState.dropdownInfo = this.getTabDropdownInfo(tabId, 
                newState);
            this.setTabIdState(tabId, newState);
        }
        else {
            this.setTabIdState(tabId,
                {
                    activeReminderId: reminderId,
                });
        }
    }
    

    onOpenAppliedTransaction(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            reminderId = reminderId || state.activeReminderId;
            const dueEntry = state.dueEntriesById.get(reminderId);
            if (dueEntry && dueEntry.transactionDataItem) {
                const { transactionDataItem } = dueEntry;
                const { splits } = transactionDataItem;
                this.openTab('accountRegister', {
                    accountId: splits[0].accountId,
                    transactionDataItem: transactionDataItem,
                    splitIndex: 0,
                });

                return true;
            }
        }
    }

    onOpenReminder(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        reminderId = reminderId || state.activeReminderId;
        if (reminderId) {
            this.openTab('reminderEditor', { reminderId: reminderId, });
        }
    }
    
    onChooseReminder(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            if (this.onOpenAppliedTransaction(tabId, reminderId)) {
                return;
            }
        }
        if (reminderId) {
            this.onOpenReminder(tabId, reminderId);
        }
    }

    onToggleEnabled(tabId, reminderId) {
        const state = this.getTabIdState(tabId);

        const { accessor } = this.props;
        if (state.dueEntriesById) {
            // 
        }
        else {
            const accountingActions = accessor.getAccountingActions();

            const reminderDataItem = accessor.getReminderDataItemWithId(reminderId);
            reminderDataItem.isEnabled = !reminderDataItem.isEnabled;
            const action = accountingActions.createModifyReminderAction(
                reminderDataItem);
            
            accessor.asyncApplyAction(action);
        }
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an reminders list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        let settings = this.getTabIdProjectSettings(tabId) || {};

        const projectSettingsId = tabId;

        const isRemindersDue = (tabId === 'remindersDueList');
        const titleId = (isRemindersDue)
            ? 'RemindersListHandler-remindersDueList_title'
            : 'RemindersListHandler-masterReminderList_title';

        const allColumns = createDefaultColumns(isRemindersDue);
        let { remindDaysBefore } = settings;
        if ((typeof remindDaysBefore !== 'number')
         || (remindDaysBefore < 0)
         || (remindDaysBefore > MAX_REMIND_DAYS_BEFORE)) {
            remindDaysBefore = 0;
        }

        const tabEntry = {
            tabId: tabId,
            projectSettingsId: projectSettingsId,
            isRemindersDue: isRemindersDue,
            title: userMsg(titleId),
            hasClose: true,
            onRenderTabPage: this.onRenderTabPage,
            onCloseTab: this.onCloseTab,
            hiddenReminderIds: [],
            showHiddenReminders: false,
            allColumns: allColumns,
            remindDaysBefore: remindDaysBefore,
        };

        if (isRemindersDue) {
            const { accessor } = this.props;

            const refYMDDates = this.getRefYMDDatesForIsReminderDue(tabEntry);
            const dueEntriesById = new Map();
            const reminderIds = accessor.getReminderIds();
            reminderIds.forEach((id) => {
                const reminderDataItem = accessor.getReminderDataItemWithId(id);
                const dueEntry = this.createDueEntry({
                    tabId: tabEntry,
                    reminderDataItem: reminderDataItem,
                    refYMDDates: refYMDDates,
                });
                if (dueEntry) {
                    dueEntriesById.set(id, dueEntry);
                }
            });

            tabEntry.dueEntriesById = dueEntriesById;

            tabEntry.onReminderAdd = (result) => this.onReminderAdd(tabId, result);
            tabEntry.onReminderModify = (result) => this.onReminderModify(tabId, result);
            tabEntry.onReminderRemove = (result) => this.onReminderRemove(tabId, result);


            accessor.on('reminderAdd', tabEntry.onReminderAdd);
            accessor.on('reminderModify', tabEntry.onReminderModify);
            accessor.on('reminderRemove', tabEntry.onReminderRemove);

            tabEntry.onTransactionsModify 
                = (result) => this.onTransactionsModify(tabId, result);
            tabEntry.onTransactionsRemove 
                = (result) => this.onTransactionsRemove(tabId, result);
            accessor.on('transactionsAdd', tabEntry.onTransactionsModify);
            accessor.on('transactionsModify', tabEntry.onTransactionsModify);
            accessor.on('transactionsRemove', tabEntry.onTransactionsRemove);
        }

        this._rowTableHandler.setupTabEntryFromSettings(tabEntry, settings);

        tabEntry.dropdownInfo = this.getTabDropdownInfo(tabId, tabEntry);
        return tabEntry;
    }


    /**
     * Called by {@link MainWindow} via the tab entry's onRenderTabPage to render the 
     * reminder list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;

        const { tabId } = tabEntry;

        const state = this.getTabIdState(tabId);
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <RemindersList
            accessor = {accessor}
            onSelectReminder = {(reminderId) => 
                this.onSelectReminder(tabId, reminderId)}
            onChooseReminder = {(reminderId) => 
                this.onChooseReminder(tabId, reminderId)}
            onClose = {() => this.closeTab(tabId)}
            onToggleEnabled = {(reminderId) => 
                this.onToggleEnabled(tabId, reminderId)}
            hiddenReminderIds = {tabEntry.hiddenReminderIds}
            showHiddenReminders = {tabEntry.showHiddenReminders}
            dueEntriesById = {tabEntry.dueEntriesById}
            contextMenuItems = {contextMenuItems}
            columns = {tabEntry.columns}
            columnSorting = {tabEntry.columnSorting}
            onColumnSortingChange = {(args) =>
                this._rowTableHandler.onColumnSortingChange(tabId, args)}
                
            onSetColumnWidth = {(args) =>
                this._rowTableHandler.onSetColumnWidth(tabId, args)}
        />;
    }
}
