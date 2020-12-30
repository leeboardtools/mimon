import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { RemindersList } from './RemindersList';


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
                const action = await accountingActions.asyncCreateRemoveReminderAction(
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


    getTabDropdownInfo(tabId, activeReminderId, hiddenInfo) {
        const { hiddenReminderIds, showHiddenReminders, }
            = hiddenInfo;

        const showReminderLabelId = (hiddenReminderIds.indexOf(activeReminderId) >= 0)
            ? 'RemindersListHandler-showReminder'
            : 'RemindersListHandler-hideReminder';

        const menuItems = [
            { id: 'newReminder',
                label: userMsg('RemindersListHandler-newReminder'),
                onChooseItem: () => this.onNewReminder(tabId),
            },                        
            { id: 'modifyReminder',
                label: userMsg('RemindersListHandler-modifyReminder'),
                disabled: !activeReminderId,
                onChooseItem: () => this.onModifyReminder(tabId),
            },                        
            { id: 'removeReminder',
                label: userMsg('RemindersListHandler-removeReminder'),
                disabled: !activeReminderId,
                onChooseItem: () => this.onRemoveReminder(tabId),
            },
            {},
            { id: 'toggleReminderVisible',
                label: userMsg(showReminderLabelId),
                disabled: !activeReminderId,
                onChooseItem: () => this.onToggleReminderVisible(
                    tabId, activeReminderId),
            },
            { id: 'toggleShowHiddenReminders',
                label: userMsg('RemindersListHandler-showHiddenReminders'),
                checked: showHiddenReminders,
                onChooseItem: () => this.onToggleShowHiddenReminders(
                    tabId),
            },
            
        ];

        return {
            items: menuItems,
        };
    }


    onSelectReminder(tabId, reminderId) {
        const state = this.getTabIdState(tabId);
        const prevActiveReminderId = state.activeReminderId;

        if ((!prevActiveReminderId && reminderId)
         || (prevActiveReminderId && !reminderId)) {
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

    
    onChooseReminder(tabId, reminderId) {
        if (reminderId) {
            this.openTab('reminderEditor', { reminderId: reminderId, });
        }
    }



    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for an reminders list page.
     * @param {string} tabId 
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId) {
        const hiddenInfo = {
            hiddenReminderIds: [],
            showHiddenReminders: false,
            hiddenColumns: [],
        };

        return {
            tabId: tabId,
            title: userMsg('RemindersListHandler-masterReminderList_title'),
            dropdownInfo: this.getTabDropdownInfo(tabId, undefined, hiddenInfo),
            onRenderTabPage: this.onRenderTabPage,
            hiddenReminderIds: [],
            hiddenColumns: [],
        };
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
            accessor={accessor}
            onSelectReminder={(reminderId) => 
                this.onSelectReminder(tabEntry.tabId, reminderId)}
            onChooseReminder={(reminderId) => 
                this.onChooseReminder(tabEntry.tabId, reminderId)}
            hiddenReminderIds={tabEntry.hiddenReminderIds}
            showHiddenReminders={tabEntry.showHiddenReminders}
            contextMenuItems={contextMenuItems}
        />;
    }
}
