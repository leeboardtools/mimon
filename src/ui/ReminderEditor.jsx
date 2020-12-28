import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';
import { Checkbox } from '../util-ui/Checkbox';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { ErrorReporter } from '../util-ui/ErrorReporter';
import { TextField } from '../util-ui/TextField';
import deepEqual from 'deep-equal';
import * as R from '../engine/Reminders';
import * as T from '../engine/Transactions';
import * as DO from '../util/DateOccurrences';
import { SeparatorBar } from '../util-ui/SeparatorBar';
import { DateOccurrenceEditor } from '../util-ui/DateOccurrenceEditor';
import { YMDDate } from '../util/YMDDate';


class TransactionTemplateEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return <div>Transaction Template</div>;
    }
}

TransactionTemplateEditor.propTypes = {
    transactionTemplate: PropTypes.object,
    onTransactionTemplateChange: PropTypes.func.isRequired,
};


/**
 * The main component for editing a new or an existing reminder.
 */
export class ReminderEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onReminderModify = this.onReminderModify.bind(this);

        this.onFinish = this.onFinish.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.onDescriptionChange = this.onDescriptionChange.bind(this);
        this.onEnabledChanged = this.onEnabledChanged.bind(this);
        this.onTransactionTemplateChange = this.onTransactionTemplateChange.bind(this);
        this.onOccurrenceChange = this.onOccurrenceChange.bind(this);

        this.setErrorMsg = this.setErrorMsg.bind(this);

        let reminderDataItem = {};

        const { accessor, reminderId, } = this.props;
        this._idBase = 'ReminderEditor_' + (reminderId || '0');

        if (reminderId) {
            reminderDataItem = accessor.getReminderDataItemWithId(reminderId);
        }
        else {
            const today = new YMDDate();
            reminderDataItem.isEnabled = true;
            reminderDataItem.occurrenceDefinition = {
                occurrenceType: DO.OccurrenceType.DAY_OF_MONTH,
                offset: today.getDOM() - 1,
                dayOfWeek: today.getDayOfWeek(),
                month: today.getMonth(),
                startYMDDate: today,
                repeatDefinition: {
                    repeatType: DO.OccurrenceRepeatType.NO_REPEAT,
                    period: 1,
                },
            };
            reminderDataItem.lastOccurrenceState = {};
        }

        this.state = {
            reminderDataItem: reminderDataItem,
            originalReminderDataItem: R.getReminderDataItem(
                reminderDataItem, true),
            isOKToSave: (reminderId !== undefined),
        };
    }


    onReminderModify(result) {
        const { newReminderDataItem } = result;
        if (newReminderDataItem.id === this.props.reminderId) {
            this.updateReminderDataItem(newReminderDataItem);
        }
    }


    componentDidMount() {
        this.props.accessor.on('reminderModify', this.onReminderModify);
        this.updateReminderDataItem({});
    }


    componentWillUnmount() {
        this.props.accessor.off('reminderModify', this.onReminderModify);
    }


    setModal(modal) {
        this.setState({
            modal: modal,
        });
    }


    setErrorMsg(errorMsg) {
        this.setState({
            errorMsg: errorMsg
        });
    }


    isSomethingToSave() {
        const { reminderId, accessor } = this.props;
        if (!reminderId) {
            return this.state.isOKToSave;
        }

        const reminderDataItem = accessor.getReminderDataItemWithId(reminderId);
        return !deepEqual(this.state.reminderDataItem, reminderDataItem);
    }


    onFinish() {
        if (this.state.isOKToSave) {
            if (this.isSomethingToSave()) {
                const { reminderId, accessor } = this.props;
                const { reminderDataItem } = this.state;
                
                let action;
                const accountingActions = accessor.getAccountingActions();
                if (reminderId) {
                    action = accountingActions.createModifyReminderAction(
                        reminderDataItem);
                }
                else {
                    action = accountingActions.createAddReminderAction(
                        reminderDataItem);
                }

                accessor.asyncApplyAction(action)
                    .then(() => {
                        this.props.onClose();
                    })
                    .catch((e) => {
                        this.setErrorMsg(e);
                    });
            }
        }
    }


    onCancel() {
        if (this.state.isOKToSave && this.isSomethingToSave()) {
            this.setModal(() =>
                <QuestionPrompter
                    title={userMsg('ReminderEditor-prompt_cancel_title')}
                    message={userMsg('ReminderEditor-prompt_cancel_msg')}
                    buttons={StandardButton.YES_NO}
                    onButton={(id) => {
                        if (id === 'yes') {
                            this.props.onClose();
                        }
                        this.setModal(undefined);
                    }}
                />
            );
        }
        else {
            this.props.onClose();
        }
    }


    updateReminderDataItem(changes, reloadOriginal) {
        this.setState((state) => {
            const newReminderDataItem 
                = Object.assign({}, state.reminderDataItem, changes);
            
            const { accessor } = this.props;
            let { originalReminderDataItem, } = state;
            if (reloadOriginal) {
                originalReminderDataItem = R.getReminderDataItem(
                    newReminderDataItem, true);
            }

            // TODO:
            // Update isOKToSave
            let isOKToSave = true;
            /*
            if (!RP.validateRepeatDefinition(newReminderDataItem)) {
                // Errors handled by the reminder editor.
                isOKToSave = false;
            }
            */

            let nameErrorMsg;
            /*
            if (!newReminderDataItem.name) {
                isOKToSave = false;
                nameErrorMsg = userMsg('ReminderEditor-name_required');
            }
            else {
                // Check if name is already used.
                if (!originalReminderDataItem
                 || (originalReminderDataItem.name !== newReminderDataItem.name)) {
                    const reminderIds = accessor.getReminderIdsForType(
                        reminderType);
                    for (let i = 0; i < reminderIds.length; ++i) {
                        const reminderDataItem = accessor.getReminderDataItemWithId(
                            reminderIds[i]
                        );
                        if (reminderDataItem.name === newReminderDataItem.name) {
                            isOKToSave = false;
                            nameErrorMsg = userMsg('ReminderEditor-name_duplicate');
                            break;
                        }
                    }
                }
            }
            */

            return {
                reminderDataItem: newReminderDataItem,
                isOKToSave: isOKToSave,
                nameErrorMsg: nameErrorMsg,
                originalReminderDataItem: originalReminderDataItem,
            };
        });
    }




    onDescriptionChange(e) {
        this.updateReminderDataItem({
            description: e.target.value,
        });
    }

    renderDescriptionEditor() {
        return <TextField
            id = {this._idBase + '_description'}
            ariaLabel = "Description"
            label = {userMsg('ReminderEditor-description_label')}
            value = {this.state.reminderDataItem.description}
            onChange = {this.onDescriptionChange}
        />;
    }


    onEnabledChanged(isEnabled) {
        this.updateReminderDataItem({
            isEnabled: isEnabled,
        });
    }

    renderEnabledEditor() {
        const { reminderDataItem } = this.state;
        return <Checkbox 
            value = {reminderDataItem.isEnabled}
            classExtras = "form-group pb-1"
            label = {userMsg('ReminderEditor-enabled_label')}
            onChange = {this.onEnabledChanged}
        />;
    }


    onTransactionTemplateChange(transactionTemplate) {
        this.updateReminderDataItem({
            transactionTemplate: T.getTransactionDataItem(
                transactionTemplate, true)
        });
    }

    renderTransactionTemplateEditor() {
        const { reminderDataItem } = this.state;
        return <TransactionTemplateEditor
            transactionTemplate = {reminderDataItem.transactionTemplate}
            onTransactionTemplateChange = {this.onTransactionTemplateChange}
        />;
    }


    onOccurrenceChange({ occurrenceDefinition: occurrenceDefinitionChanges, 
        lastOccurrenceState: lastOccurrenceStateChanges }) {
        const { reminderDataItem } = this.state;
        let { occurrenceDefinition, lastOccurrenceState } = reminderDataItem;
        if (occurrenceDefinitionChanges) {
            occurrenceDefinition = Object.assign({}, occurrenceDefinition, 
                occurrenceDefinitionChanges);
        }
        if (lastOccurrenceStateChanges) {
            lastOccurrenceState = Object.assign({}, lastOccurrenceState,
                lastOccurrenceStateChanges);
        }

        this.updateReminderDataItem({
            occurrenceDefinition: occurrenceDefinition,
            lastOccurrenceState: lastOccurrenceState,
        });
    }

    renderDateOccurrenceEditor() {
        const { reminderDataItem } = this.state;
        const { occurrenceDefinition, lastOccurrenceState } = reminderDataItem;
        return <DateOccurrenceEditor
            id = "ReminderEditor-OccurrenceEditor"
            occurrenceDefinition = {occurrenceDefinition}
            lastOccurrenceState = {lastOccurrenceState}
            onChange = {this.onOccurrenceChange}
        />;
    }


    renderPage() {
        const descriptionEditor = this.renderDescriptionEditor();
        const enabledEditor = this.renderEnabledEditor();
        const transactionTemplateEditor = this.renderTransactionTemplateEditor();
        const dateOccurrenceEditor = this.renderDateOccurrenceEditor();

        return <div className="container-fluid mt-auto mb-auto text-left">
            <div className = "row align-items-end">
                <div className = "col">
                    {descriptionEditor}
                </div>
                <div className = "col-auto mr-4">
                    {enabledEditor}
                </div>
            </div>
            <SeparatorBar/>
            <div className = "row">
                <div className = "col">
                    {transactionTemplateEditor}
                </div>
            </div>
            <SeparatorBar/>
            <div className = "row">
                <div className = "col">
                    {dateOccurrenceEditor}
                </div>
            </div>
        </div>;
    }


    render() {
        const { errorMsg, modal, isOKToSave } = this.state;
        if (errorMsg) {
            return <ErrorReporter message={errorMsg} 
                onClose={() => this.setErrorMsg()}
            />;
        }

        if (modal) {
            return modal();
        }

        const page = this.renderPage();

        return <ModalPage
            onDone = {this.onFinish}
            onCancel = {this.onCancel}
            doneDisabled={!isOKToSave}
        >
            {page}
        </ModalPage>;
    }
}


ReminderEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    reminderId: PropTypes.number,
    onClose: PropTypes.func.isRequired,
};
