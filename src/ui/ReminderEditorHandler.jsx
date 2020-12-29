import React from 'react';
import { userMsg } from '../util/UserMessages';
import { MainWindowHandlerBase } from './MainWindowHandlerBase';
import { ReminderEditor } from './ReminderEditor';

 

/**
 * Handler for {@link ReminderEditor} components and their pages in the 
 * {@link MainWindow}, this manages all the reminder related commands.
 */
export class ReminderEditorHandler extends MainWindowHandlerBase {
    constructor(props) {
        super(props);

        this.onRenderTabPage = this.onRenderTabPage.bind(this);
    }


    getTabDropdownInfo(tabId) {
    }


    /**
     * Called by {@link MainWindow} to create the {@link TabbedPages~TabEntry}
     * object for a reminder register page.
     * @param {string} tabId 
     * @param {number}  reminderId
     * @param {TransactionDataItem} [transactionDataItem] If reminderId is not valid
     * (i.e. a new reminder) and this is specified, the reminder is being created
     * with this transaction as the template.
     * @returns {TabbedPages~TabEntry}
     */
    createTabEntry(tabId, reminderId, transactionDataItem) {
        const reminderDataItem = this.props.accessor.getReminderDataItemWithId(
            reminderId);
        const title = (reminderDataItem) 
            ? userMsg('ReminderEditorHandler-modifyReminder_title'
                , reminderDataItem.name)
            : userMsg('ReminderEditorHandler-newReminder_title');
        return {
            tabId: tabId,
            title: title,
            //hasClose: true,
            reminderId: reminderId,
            transactionTemplate: transactionDataItem,
            //dropdownInfo: this.getTabDropdownInfo(tabId),
            onRenderTabPage: this.onRenderTabPage,
        };
    }


    /**
     * Called by {@link MainWindow} to render the reminder list page for a tab entry.
     * @param {TabbedPages~TabEntry} tabEntry 
     * @param {boolean} isActive 
     */
    onRenderTabPage(tabEntry, isActive) {
        const { accessor } = this.props;
        const { reminderId, transactionTemplate } = tabEntry;
        return <ReminderEditor
            accessor={accessor}
            reminderId={reminderId}
            transactionTemplate = {transactionTemplate}
            onClose={() => this.closeTab(tabEntry.tabId)}
        />;
    }
}