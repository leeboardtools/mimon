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
import { accountEntriesToItems, AccountSelector, 
    addAccountIdsToAccountEntries } from './AccountSelector';
import { QuantityField, getValidQuantityBaseValue } 
    from '../util-ui/QuantityField';
import { YMDDate } from '../util/YMDDate';


class TransactionTemplateEditor extends React.Component {
    constructor(props) {
        super(props);

        this.updateAccountEntries = this.updateAccountEntries.bind(this);
        this.onPrimaryAccountSelected = this.onPrimaryAccountSelected.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);
        this.onSplitSelected = this.onSplitSelected.bind(this);
        this.onQuantityEditorChange = this.onQuantityEditorChange.bind(this);
        this.onDebitCreditChange = this.onDebitCreditChange.bind(this);

        this.state = {
            lastEditedSign:undefined,
            accountEntries: [],
            accountItems: [],
            debitValueText: '',
            creditValueText: '',
        };
    }


    componentDidMount() {
        const { accessor } = this.props;
        accessor.on('accountAdd', this.updateAccountEntries);
        accessor.on('accountModify', this.updateAccountEntries);
        accessor.on('accountRemove', this.updateAccountEntries);

        this.updateAccountEntries();

        const { transactionTemplate } = this.props;
        const { splits } = transactionTemplate;
        if (splits && splits.length) {
            let { quantityBaseValue } = splits[0];
            if (typeof quantityBaseValue === 'number') {
                const primaryAccountId = this.getPrimaryAccountId();
                quantityBaseValue *= this.getCreditSign();

                const currency = accessor.getCurrencyOfAccountId(primaryAccountId);
                let text = currency.getQuantityDefinition().baseValueToValueText(
                    Math.abs(quantityBaseValue));
                if (quantityBaseValue > 0) {
                    this.setState({
                        creditValueText: text,
                    });
                }
                else {
                    this.setState({
                        debitValueText: text,
                    });
                }
            }
        }
    }

    componentWillUnmount() {
        const { accessor } = this.props;
        accessor.off('accountAdd', this.updateAccountEntries);
        accessor.off('accountModify', this.updateAccountEntries);
        accessor.off('accountRemove', this.updateAccountEntries);
    }


    updateAccountEntries() {
        const { accessor } = this.props;
        const accountEntries = [];
        const rootAccountIds = accessor.getRootAccountIds();
        addAccountIdsToAccountEntries(
            accessor, accountEntries, rootAccountIds); 
        
        const items = accountEntriesToItems(accessor, accountEntries);

        this.setState({
            accountEntries: accountEntries,
            accountItems: items,
        });
    }


    makeId(id) {
        const idBase = this.props.id || 'TransactionTemplateEditor';
        return idBase + '_' + id;
    }


    getPrimaryAccountId() {
        const { transactionTemplate } = this.props;
        return transactionTemplate.splits[0].accountId;
    }

    getSecondaryAccountId() {
        const { transactionTemplate } = this.props;
        return (transactionTemplate.splits.length === 2)
            ? transactionTemplate.splits[1].accountId
            : -1;
    }

    getCreditSign() {
        const { accessor } = this.props;
        const primaryAccountId = this.getPrimaryAccountId();
        const category = accessor.getCategoryOfAccountId(primaryAccountId);
        return category.creditSign;
    }

    updateTransactionTemplate(changes) {
        const { onTransactionTemplateChange } = this.props;
        const transactionTemplate = Object.assign({},
            this.props.transactionTemplate, 
            changes);
        onTransactionTemplateChange({
            transactionTemplate: transactionTemplate,
        });
    }

    updateSplit(splitIndex, changes) {
        const { transactionTemplate } = this.props;
        const splits = Array.from(transactionTemplate.splits);
        splits[splitIndex] = Object.assign({}, splits[splitIndex], changes);
        this.updateTransactionTemplate({
            splits: splits,
        });
    }

    onPrimaryAccountSelected(e) {
        this.updateSplit(0, {
            accountId: e.target.value,
        });
    }

    renderPrimaryAccountSelector() {
        const { accessor } = this.props;

        return <AccountSelector
            id = {this.makeId('PrimaryAccountSelector')}
            accessor = {accessor}
            accountEntries = {this.state.accountItems}
            accountEntriesAreItems = {true}
            selectedAccountId = {this.getPrimaryAccountId()}
            onChange = {this.onPrimaryAccountSelected}
            inputClassExtras = "TransactionTemplateEditor-accountSelector"
            prependComponent = {userMsg(
                'TransactionTemplateEditor-primaryAccountSelector_label')}
        />;
    }


    renderPrimaryAccountRow() {
        const primaryAccountSelector = this.renderPrimaryAccountSelector();
        return <div className = "FieldContainer-inline">
            {primaryAccountSelector}
        </div>;
    }



    onDescriptionChange(e) {
        this.updateTransactionTemplate({
            description: e.target.value,
        });
    }


    renderDescriptionEditor() {
        const { transactionTemplate } = this.props;
        const description = transactionTemplate.description
            || transactionTemplate.splits[0].description;
        return <TextField 
            id = {this.makeId('DescriptionEditor')}
            ariaLabel = "Description"
            placeholder = {userMsg('TransactionTemplateEditor-description_label')}
            value = {description}
            onChange = {this.onDescriptionChange}
            fieldClassExtras = "TransactionTemplateEditor-descriptionField"
            inputClassExtras 
                = "Field-postSpace TransactionTemplateEditor-descriptionEditor"
        />;
    }


    onSplitSelected(e) {
        const { value } = e.target;
        if (value <= 0) {
            // Splits button...
            const { onOpenMultiSplitsEditor } = this.props;
            if (onOpenMultiSplitsEditor) {
                onOpenMultiSplitsEditor();
            }
        }
        else {
            this.updateSplit(1, {
                accountId: value,
            });
        }
    }


    renderSplitSelector() {
        const { accessor } = this.props;
        const primaryAccountId = this.getPrimaryAccountId();
        const secondaryAccountId = this.getSecondaryAccountId();

        const accountItems = this.state.accountItems.map((accountItem) => {
            if (accountItem.value === primaryAccountId) {
                return Object.assign({}, accountItem, {
                    disabled: true,
                });
            }
            return accountItem;
        });

        if (this.props.onOpenMultiSplitsEditor) {
            accountItems.push({
                value: -1,
                text: userMsg(
                    'TransactionTemplateEditor-secondaryAccountSelector_multiSplits'),
            });
        }

        return <AccountSelector
            id = {this.makeId('SplitsSelector')}
            accessor = {accessor}
            accountEntries = {accountItems}
            accountEntriesAreItems = {true}
            selectedAccountId = {secondaryAccountId}
            onChange = {this.onSplitSelected}
            fieldClassExtras
                = "TransactionTemplateEditor-splitsSelectorField"
            inputClassExtras = "TransactionTemplateEditor-splitsSelector"
        />;
    }


    onQuantityEditorChange(e, quantityDefinition, sign) {
        let quantityBaseValue = e.target.value.trim();
        try {
            quantityBaseValue = getValidQuantityBaseValue(
                quantityBaseValue,
                quantityDefinition);
            if (typeof quantityBaseValue === 'number') {
                quantityBaseValue *= sign;
            }
        }
        catch (e) {
            quantityBaseValue = e.target.value;
        }

        this.updateSplit(0, {
            quantityBaseValue: quantityBaseValue,
        });

        this.setState({
            lastEditedSign: sign,
        });
    }

    renderQuantityEditor({ sign, id, ariaLabel, label, disabled, classExtras, }) {
        const { accessor, transactionTemplate } = this.props;
        const split = transactionTemplate.splits[0];

        const { accountId, quantityBaseValue } = split;
        const currency = accessor.getCurrencyOfAccountId(accountId);
        const quantityDefinition = currency.getQuantityDefinition();

        let value = quantityBaseValue;
        if (typeof value === 'number') {
            value *= sign;
            if (value < 0) {
                value = '';
            }
        }
        else if (sign !== this.state.lastEditedSign) {
            value = '';
        }

        let className = 'TransactionTemplateEditor-quantityEditor';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <QuantityField
            id = {id}
            arialLabel = {ariaLabel}
            value = {value}
            quantityDefinition = {quantityDefinition}
            inputClassExtras = {className}
            onChange = {(e) => this.onQuantityEditorChange(
                e, quantityDefinition, sign)}
            disabled = {disabled}
            placeholder = {label}
            allowEmpty = {true}
        />;
    }


    onDebitCreditChange(e, type, quantityDefinition, sign) {
        let text = e.target.value;
        let splitUpdated;
        try {
            let quantityBaseValue = getValidQuantityBaseValue(text,
                quantityDefinition);
            if (typeof quantityBaseValue === 'number') {
                quantityBaseValue *= sign;

                this.updateSplit(0, {
                    quantityBaseValue: quantityBaseValue,
                });

                splitUpdated = true;
            }
        }
        catch (e) {
            // Ignore...
        }

        if (!splitUpdated) {
            this.updateSplit(0, {
                quantityBaseValue: text,
            });
        }

        const stateChange = {};
        stateChange[type + 'ValueText'] = text;
        this.setState(stateChange);
    }


    renderDebitCreditEditor(type) {
        const { accessor, transactionTemplate } = this.props;
        const { splits } = transactionTemplate;
        const split = splits[0];
        const disabled = splits.length !== 2;

        const { accountId } = split;
        const currency = accessor.getCurrencyOfAccountId(accountId);
        const quantityDefinition = currency.getQuantityDefinition();

        const primaryAccountId = this.getPrimaryAccountId();
        const accountType = accessor.getTypeOfAccountId(primaryAccountId);

        let sign = this.getCreditSign();
        if (type === 'debit') {
            sign = -sign;
        }

        let value = this.state[type + 'ValueText'];
        if (typeof value === 'number') {
            value *= sign;
            if (value < 0) {
                value = '';
            }
        }

        let className = 'TransactionTemplateEditor-debitCreditEditor';

        return <QuantityField
            id = {this.makeId(type + 'Editor')}
            arialLabel = {type + ' Editor'}
            value = {value}
            quantityDefinition = {quantityDefinition}
            inputClassExtras = {className}
            onChange = {(e) => this.onDebitCreditChange(
                e, type, quantityDefinition, sign)}
            disabled = {disabled}
            placeholder = {accountType[type + 'Label']}
            allowEmpty = {true}
        />;
    }

    renderSecondRow() {
        const descriptionEditor = this.renderDescriptionEditor();
        const secondaryAccountSelector = this.renderSplitSelector();
        const debitEditor = this.renderDebitCreditEditor('debit');
        const creditEditor = this.renderDebitCreditEditor('credit');

        return <div className 
            = "FieldContainer-inline TransactionTemplateEditor-secondRow">
            {descriptionEditor}
            {secondaryAccountSelector}
            {debitEditor}
            {creditEditor}
        </div>;
    }


    render() {
        return <div className = "TransactionTemplateEditor">
            {this.renderPrimaryAccountRow()}
            {this.renderSecondRow()}
        </div>;
    }
}

TransactionTemplateEditor.propTypes = {
    id: PropTypes.string,
    accessor: PropTypes.object.isRequired,
    transactionTemplate: PropTypes.object.isRequired,
    onTransactionTemplateChange: PropTypes.func.isRequired,
    onOpenMultiSplitsEditor: PropTypes.func,
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

        this.onOpenMultiSplitsEditor = this.onOpenMultiSplitsEditor.bind(this);

        this.setErrorMsg = this.setErrorMsg.bind(this);

        let reminderDataItem = {};

        const { accessor, reminderId, } = this.props;
        this._idBase = 'ReminderEditor_' + (reminderId || '0');

        let originalReminderDataItem;
        if (reminderId) {
            reminderDataItem = accessor.getReminderDataItemWithId(reminderId);
            originalReminderDataItem = R.getReminderDataItem(
                reminderDataItem, true);
        }
        else {
            reminderDataItem.isEnabled = true;
        }


        let { transactionTemplate } = reminderDataItem;
        if (!transactionTemplate) {
            transactionTemplate = this.props.transactionTemplate;
        }
        if (!transactionTemplate || (transactionTemplate.splits.length < 2)) {
            transactionTemplate = {
                splits: [
                    {
                        accountId: accessor.getRootAssetAccountId(),
                    },
                    {
                        accountId: accessor.getRootExpenseAccountId(),
                    },
                ]
            };
        }
        else {
            transactionTemplate = T.getTransactionDataItem(transactionTemplate, true);
        }

        reminderDataItem.transactionTemplate = transactionTemplate;

        if (!reminderDataItem.lastOccurrenceState) {
            reminderDataItem.lastOccurrenceState = {
            };
        }

        const today = new YMDDate();
        reminderDataItem.occurrenceDefinition = DO.makeValidDateOccurrenceDefinition(
            reminderDataItem.occurrenceDefinition, today);

        if (!originalReminderDataItem) {
            originalReminderDataItem = R.getReminderDataItem(
                reminderDataItem, true);
        }


        this.state = {
            reminderDataItem: reminderDataItem,
            originalReminderDataItem: originalReminderDataItem,
            isOKToSave: (reminderId !== undefined),
        };
    }


    makeId(id) {
        return this._idBase + '_' + id;
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
            console.log({
                reminderDataItem: this.state.reminderDataItem,
                original: this.state.originalReminderDataItem,
            });
            
            return !deepEqual(this.state.reminderDataItem, 
                this.state.originalReminderDataItem);
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

            let isOKToSave = true;

            // If the occurrence type changed, we need to make sure the
            // occurrence definition is valid.
            const { occurrenceDefinition } = state.reminderDataItem;
            const newOccurrenceDefinition = changes.occurrenceDefinition;
            if (newOccurrenceDefinition) {
                if (occurrenceDefinition.occurrenceType
                 !== newOccurrenceDefinition.occurrenceType) {
                    changes.occurrenceDefinition = DO.makeValidDateOccurrenceDefinition(
                        newOccurrenceDefinition, new YMDDate());
                }

                if (DO.validateDateOccurrenceDefinition(newOccurrenceDefinition)) {
                    isOKToSave = false;
                }
            }

            const newReminderDataItem = R.getReminderDataItem(
                Object.assign({}, state.reminderDataItem, changes));
            
            return {
                reminderDataItem: newReminderDataItem,
                isOKToSave: isOKToSave,
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
            id = {this.makeId('Description')}
            ariaLabel = "Description"
            label = {userMsg('ReminderEditor-description_label')}
            value = {this.state.reminderDataItem.description}
            onChange = {this.onDescriptionChange}
            inputClassExtras = "ReminderEditor-description"
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


    onTransactionTemplateChange({ transactionTemplate }) {
        this.updateReminderDataItem({
            transactionTemplate: T.getTransactionDataItem(
                transactionTemplate, true)
        });
    }


    onOpenMultiSplitsEditor() {
        console.log('onOpenMultiSplitsEditor');
    }

    renderTransactionTemplateEditor() {
        const { reminderDataItem } = this.state;
        return <TransactionTemplateEditor
            id = {this.makeId('TransactionTemplateEditor')}
            accessor = {this.props.accessor}
            transactionTemplate = {reminderDataItem.transactionTemplate}
            onTransactionTemplateChange = {this.onTransactionTemplateChange}
            onOpenMultiSplitsEditor = {this.onOpenMultiSplitsEditor}
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
            id = {this.makeId('OccurrenceEditor')}
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
            <div className = "ReminderEditor-section_label">
                {userMsg('ReminderEditor-transactionTemplate_heading')}
            </div>
            <div className = "row">
                <div className = "col">
                    {transactionTemplateEditor}
                </div>
            </div>
            <SeparatorBar/>
            <div className = "ReminderEditor-section_label">
                {userMsg('ReminderEditor-occurrenceDefinition_heading')}
            </div>
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
    transactionTemplate: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};
