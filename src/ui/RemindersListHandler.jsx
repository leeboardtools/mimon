import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { RemindersList } from './RemindersList';
import { isReminderDue } from '../engine/Reminders';
import { createCompositeAction } from '../util/Actions';
import * as T from '../engine/Transactions';
import { YMDDate } from '../util/YMDDate';
import deepEqual from 'deep-equal';


/**
 * Handler for {@link RemindersList} components and their pages in the 
 * {@link MainWindow}, this manages all the reminder related commands.
 */
export class RemindersListHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

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
        this.onCloseTab = this.onCloseTab.bind(this);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
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

        const hiddenInfo = Object.assign({}, state, {
            hiddenReminderIds: hiddenReminderIds,
        });

        this.setTabIdState(tabId, {
            hiddenReminderIds: hiddenReminderIds,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeReminderId, hiddenInfo),
        });
    }


    onToggleShowHiddenReminders(tabId) {
        const state = this.getTabIdState(tabId);

        const hiddenInfo = Object.assign({}, state, {
            showHiddenReminders: !state.showHiddenReminders,
        });

        this.setTabIdState(tabId, {
            showHiddenReminders: !state.showHiddenReminders,
            dropdownInfo: this.getTabDropdownInfo(tabId, 
                state.activeReminderId, hiddenInfo),
        });

    }


    getAllDueReminders(tabId) {
        const { accessor } = this.props;

        const reminderIds = [];
        const allReminderIds = accessor.getReminderIds();
        allReminderIds.forEach((id) => {
            const reminderDataItem = accessor.getReminderDataItemWithId(id);
            if (isReminderDue(reminderDataItem)) {
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

            if (accessor.validateSplits(transactionTemplate.splits)) {
                // Presume all the splits did not have quantityBaseValues...
                baseTransactionDataItem.splits.forEach((split) => {
                    split.quantityBaseValue = 0;
                });

                result.dueEntry.dueStatus = 'PARTIAL';
            }
        }

        let transactionDataItem = baseTransactionDataItem;        
        let transactionAction;

        do {
            let nextOccurrenceState = isReminderDue(reminderDataItem);
            if (mode === 'LATEST') {
                // We want the latest due date.
                let latestOccurrenceState = nextOccurrenceState;
                const today = new YMDDate();
                while (latestOccurrenceState) {
                    nextOccurrenceState = latestOccurrenceState;
                    latestOccurrenceState = isReminderDue(
                        reminderDataItem, today, latestOccurrenceState);
                }
            }
            if (!nextOccurrenceState) {
                break;
            }

            if (!isSkip) {
                transactionDataItem = T.getTransactionDataItem(
                    baseTransactionDataItem, true);

                transactionDataItem.ymdDate 
                    = nextOccurrenceState.lastOccurrenceYMDDate;
                transactionAction = accountingActions.createAddTransactionAction(
                    transactionDataItem);
                actions.push(transactionAction);
            }

            // Update the reminder's state...
            reminderDataItem.lastOccurrenceState = nextOccurrenceState;
            const reminderAction = accountingActions.createModifyReminderAction(
                reminderDataItem);
            actions.push(reminderAction);
        }
        while (mode === 'ALL');

        if (transactionAction) {
            // This is the transaction action for the latest application.
            const { postApplyCallback } = transactionAction;
            transactionAction.postApplyCallback = (action, actionResult) => {
                result.dueEntry.transactionDataItem 
                    = actionResult.newTransactionDataItem;
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
            const newDueEntriesById = new Map(state.dueEntriesById);
            let dueEntriesByIdUpdated;
            let actions = [];
            for (let i = 0; i < reminderIds.length; ++i) {
                args.reminderId = reminderIds[i];
                const result = this.createApplyOrSkipReminderActions(
                    args);
                if (result) {
                    actions = actions.concat(result.actions);
                    newDueEntriesById.set(reminderIds[i], result.dueEntry);
                    dueEntriesByIdUpdated = true;
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


    createDueEntry(reminderDataItem, previousDueEntry) {
        const nextOccurrenceState = isReminderDue(reminderDataItem);
        if (nextOccurrenceState) {
            return {
                reminderId: reminderDataItem.id,
                dueStatus: 'DUE',
            };
        }
        return previousDueEntry;
    }


    updateDueEntriesById(tabId, newDueEntriesById) {
        this.setTabIdState(tabId, {
            dueEntriesById: newDueEntriesById,
        },
        (state) => {
            this.setTabIdState(
                tabId, {
                    dropdownInfo: this.getTabDropdownInfo(tabId, 
                        state.activeReminderId, state),
                },
            );
        });
    }

    onReminderAdd(tabId, result) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            const newDueEntriesById = new Map(state.dueEntriesById);

            const reminderDataItem = result.newReminderDataItem;
            const { id } = reminderDataItem;
            newDueEntriesById.set(id, this.createDueEntry(reminderDataItem));

            this.updateDueEntriesById(tabId, newDueEntriesById);
        }
    }

    onReminderModify(tabId, result) {
        const state = this.getTabIdState(tabId);
        if (state.dueEntriesById) {
            const newDueEntriesById = new Map(state.dueEntriesById);

            const reminderDataItem = result.newReminderDataItem;
            const { id } = reminderDataItem;
            newDueEntriesById.set(id, this.createDueEntry(reminderDataItem,
                state.dueEntriesById.get(id)));
            
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

    onCloseTab(tabId, tabEntry) {
        if (tabEntry.dueEntriesById) {
            const { accessor } = this.props;
            accessor.off('reminderAdd', tabEntry.onReminderAdd);
            accessor.off('reminderModify', tabEntry.onReminderModify);
            accessor.off('reminderRemove', tabEntry.onReminderRemove);
        }
    }


    getTabDropdownInfo(tabId, activeReminderId, state) {
        const { hiddenReminderIds, showHiddenReminders, dueEntriesById, }
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
            menuItems.push(openAppliedTransactionItem);
            menuItems.push(modifyReminderItem);
            menuItems.push({});
            menuItems.push(applyAllDueRemindersAllItem);
            menuItems.push(applySelectedRemindersAllItem);
            menuItems.push({});
            menuItems.push(applyAllDueRemindersNextItem);
            menuItems.push(applySelectedRemindersNextItem);
            menuItems.push({});
            menuItems.push(skipAllDueRemindersAllItem);
            menuItems.push(skipSelectedRemindersAllItem);
            menuItems.push({});
            menuItems.push(skipAllDueRemindersNextItem);
            menuItems.push(skipSelectedRemindersNextItem);
        }
        else {
            menuItems.push(checkRemindersItem);
            menuItems.push({});
            menuItems.push(newReminderItem);
            menuItems.push(modifyReminderItem);
            menuItems.push(removeReminderItem);
            menuItems.push({});
            menuItems.push(toggleReminderVisibleItem);
            menuItems.push(toggleShowHiddenRemindersItem);
        }

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
            this.setTabIdState(tabId,
                {
                    activeReminderId: reminderId,
                    dropdownInfo: this.getTabDropdownInfo(tabId, reminderId, state),
                });
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



    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an reminders list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        const isRemindersDue = (tabId === 'remindersDueList');
        const titleId = (isRemindersDue)
            ? 'RemindersListHandler-remindersDueList_title'
            : 'RemindersListHandler-masterReminderList_title';

        const newState = {
            tabId: tabId,
            isRemindersDue: isRemindersDue,
            title: userMsg(titleId),
            hasClose: true,
            onRenderTabPage: this.onRenderTabPage,
            onCloseTab: this.onCloseTab,
            hiddenReminderIds: [],
            showHiddenReminders: false,
            hiddenColumns: [],
        };

        if (isRemindersDue) {
            const { accessor } = this.props;

            const dueEntriesById = new Map();
            const reminderIds = accessor.getReminderIds();
            reminderIds.forEach((id) => {
                const reminderDataItem = accessor.getReminderDataItemWithId(id);
                if (isReminderDue(reminderDataItem)) {
                    dueEntriesById.set(id, {
                        reminderId: id,
                        dueStatus: 'DUE'
                    });
                }
            });

            newState.dueEntriesById = dueEntriesById;

            newState.onReminderAdd = (result) => this.onReminderAdd(tabId, result);
            newState.onReminderModify = (result) => this.onReminderModify(tabId, result);
            newState.onReminderRemove = (result) => this.onReminderRemove(tabId, result);

            accessor.on('reminderAdd', newState.onReminderAdd);
            accessor.on('reminderModify', newState.onReminderModify);
            accessor.on('reminderRemove', newState.onReminderRemove);
        }

        newState.dropdownInfo = this.getTabDropdownInfo(tabId, undefined, newState);
        return newState;
    }


    /**
     * Called by {@link MainWindow} via the tab entry's onRenderTabPage to render the 
     * reminder list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;

        const state = this.getTabIdState(tabEntry.tabId);
        const { dropdownInfo } = state;
        let contextMenuItems;
        if (dropdownInfo) {
            contextMenuItems = dropdownInfo.items;
        }

        return <RemindersList
            accessor = {accessor}
            onSelectReminder = {(reminderId) => 
                this.onSelectReminder(tabEntry.tabId, reminderId)}
            onChooseReminder = {(reminderId) => 
                this.onChooseReminder(tabEntry.tabId, reminderId)}
            onClose={() => this.closeTab(tabEntry.tabId)}
            hiddenReminderIds = {tabEntry.hiddenReminderIds}
            showHiddenReminders = {tabEntry.showHiddenReminders}
            dueEntriesById = {tabEntry.dueEntriesById}
            contextMenuItems = {contextMenuItems}
        />;
    }
}
