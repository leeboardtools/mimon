import React from 'react';
import PropTypes from 'prop-types';
import { userMsg, getUserMsgLocale, numberToOrdinalString } 
    from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';
import { PageBody } from '../util-ui/PageBody';
import { ErrorBoundary } from '../util-ui/ErrorBoundary';
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
import { accountEntriesToItems, AccountSelectorField, 
    addAccountIdsToAccountEntries } from './AccountSelector';
import { MultiSplitsEditor } from './MultiSplitsEditor';
import { QuantityField, getValidQuantityBaseValue } 
    from '../util-ui/QuantityField';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import { formatDate } from '../util-ui/CellDateEditor';
import { Row, Col } from '../util-ui/RowCols';


/**
 * Component for editing the transaction template of a {@link Reminder}.
 */
class TransactionTemplateEditor extends React.Component {
    constructor(props) {
        super(props);

        this.updateAccountEntries = this.updateAccountEntries.bind(this);
        this.onPrimaryAccountSelected = this.onPrimaryAccountSelected.bind(this);
        this.onDescriptionChange = this.onDescriptionChange.bind(this);
        this.onMemoChange = this.onMemoChange.bind(this);
        this.onSplitSelected = this.onSplitSelected.bind(this);
        this.onDebitCreditChange = this.onDebitCreditChange.bind(this);
        this.onDebitCreditBlur = this.onDebitCreditBlur.bind(this);

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
        accessor.on('accountsModify', this.updateAccountEntries);
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
        accessor.off('accountsModify', this.updateAccountEntries);
        accessor.off('accountRemove', this.updateAccountEntries);
    }


    updateAccountEntries() {
        const { accessor } = this.props;
        const accountEntries = [];
        const rootAccountIds = accessor.getRootAccountIds();
        addAccountIdsToAccountEntries({ 
            accessor: accessor, 
            accountEntries: accountEntries, 
            accountIds: rootAccountIds, 
        }); 
        
        const items = accountEntriesToItems({
            accessor: accessor, 
            accountEntries: accountEntries,
        });

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

        return <AccountSelectorField
            id = {this.makeId('PrimaryAccountSelector')}
            accessor = {accessor}
            accountEntries = {this.state.accountItems}
            accountEntriesAreItems = {true}
            selectedAccountId = {this.getPrimaryAccountId()}
            onChange = {this.onPrimaryAccountSelected}
            inputClassExtras = "TransactionTemplateEditor-accountSelector Field-postSpace"
            label = {userMsg(
                'TransactionTemplateEditor-primaryAccountSelector_label')}
            ariaLabel = "Primary Account"
        />;
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
            fieldClassExtras 
                = "Field-postSpace TransactionTemplateEditor-descriptionField"
            inputClassExtras 
                = "TransactionTemplateEditor-descriptionEditor"
        />;
    }


    onMemoChange(e) {
        this.updateTransactionTemplate({
            memo: e.target.value,
        });
    }

    renderMemoEditor() {
        const { transactionTemplate } = this.props;
        const memo = transactionTemplate.memo
            || transactionTemplate.splits[0].memo;
        return <TextField 
            id = {this.makeId('MemoEditor')}
            ariaLabel = "Memo"
            placeholder = {userMsg('TransactionTemplateEditor-memo_label')}
            value = {memo}
            onChange = {this.onMemoChange}
            fieldClassExtras 
                = "Field-postSpace TransactionTemplateEditor-memoField"
            inputClassExtras 
                = "TransactionTemplateEditor-memoEditor"
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
            accountItems.splice(0, 0, 
                {
                    value: -1,
                    text: userMsg(
                        'TransactionTemplateEditor-secondaryAccountSelector_multiSplits'),
                    indent: 0,
                });
        }

        return <AccountSelectorField
            id = {this.makeId('SplitsSelector')}
            accessor = {accessor}
            accountEntries = {accountItems}
            accountEntriesAreItems = {true}
            selectedAccountId = {secondaryAccountId}
            onChange = {this.onSplitSelected}
            fieldClassExtras
                = "Field-postSpace TransactionTemplateEditor-splitsSelectorField"
            inputClassExtras = "TransactionTemplateEditor-splitsSelector"
            label = {userMsg(
                'TransactionTemplateEditor-secondaryAccountSelector_label')}
            ariaLabel = "Split"
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


    onDebitCreditBlur(e, type, quantityDefinition, sign) {
        const text = this.state[type + 'ValueText'];
        if (text) {
            try {
                // This is all to swap the number to the other side of it is negative.
                let quantityBaseValue = getValidQuantityBaseValue(text,
                    quantityDefinition);
                if (typeof quantityBaseValue === 'number') {
                    if (quantityBaseValue < 0) {
                        // Want to swap with the other type...
                        const otherType = (type === 'debit') ? 'credit' : 'debit';
                        const stateChange = {};
                        stateChange[otherType + 'ValueText'] 
                            = quantityDefinition.baseValueToValueText(-quantityBaseValue);
                        stateChange[type + 'ValueText'] = '';
                        this.setState(stateChange);
                    }
                }
            }
            catch (e) {
                // Ignore...
            }
        }
    }


    renderDebitCreditEditor(type, classExtras) {
        const { accessor, transactionTemplate } = this.props;
        const { splits } = transactionTemplate;
        const split = splits[0];
        const disabled = splits.length !== 2;

        const { accountId } = split;
        const currency = accessor.getCurrencyOfAccountId(accountId);
        const quantityDefinition = currency.getQuantityDefinition();

        const primaryAccountId = this.getPrimaryAccountId();
        const accountType = accessor.getTypeOfAccountId(primaryAccountId);

        let label;
        let sign = this.getCreditSign();
        if (type === 'debit') {
            sign = -sign;
            label = accountType.debitLabel;
        }
        else {
            label = accountType.creditLabel;
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
            label = {label}
            value = {value}
            quantityDefinition = {quantityDefinition}
            fieldClassExtras = {classExtras}
            inputClassExtras = {className}
            onChange = {(e) => this.onDebitCreditChange(
                e, type, quantityDefinition, sign)}
            onBlur = {(e) => this.onDebitCreditBlur(
                e, type, quantityDefinition, sign)}
            disabled = {disabled}
            placeholder = {accountType[type + 'Label']}
            allowEmpty = {true}
        />;
    }


    renderPrimaryAccountRow() {
        const descriptionEditor = this.renderDescriptionEditor();

        // TODO: AccountRegister doesn't yet support memos...
        const memoEditor = undefined;   // = this.renderMemoEditor();
        return <div className 
            = "FieldContainer-inline TransactionTemplateEditor-primaryRow">
            {descriptionEditor}
            {memoEditor}
        </div>;
    }

    renderSecondRow() {
        const primaryAccountSelector = this.renderPrimaryAccountSelector();
        const secondaryAccountSelector = this.renderSplitSelector();
        const debitEditor = this.renderDebitCreditEditor('debit', 'Field-postSpace');
        const creditEditor = this.renderDebitCreditEditor('credit');

        return <div className 
            = "FieldContainer-inline TransactionTemplateEditor-secondRow">
            {primaryAccountSelector}
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

        this.onMultiSplitsEditorDone = this.onMultiSplitsEditorDone.bind(this);
        this.onMultiSplitsEditorCancel = this.onMultiSplitsEditorCancel.bind(this);
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

        let forceDirty;
        let { transactionTemplate } = reminderDataItem;
        if (!transactionTemplate) {
            transactionTemplate = this.props.transactionTemplate;

            if (transactionTemplate) {
                // This is the case of creating a new reminder from a transaction, 
                // want to create a new reminder when Done is pressed.
                forceDirty = true;
            }
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

            if (forceDirty) {
                originalReminderDataItem.transactionTemplate = undefined;
            }
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
            else {
                this.props.onClose();
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


    updateReminderDataItem(changes, callback) {
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
        },
        callback);
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
            placeholder = {userMsg('ReminderEditor-description_label')}
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
            classExtras = "Form-group Pb-1"
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


    onMultiSplitsEditorDone({splits}) {
        const { reminderDataItem } = this.state;
        let { transactionTemplate } = reminderDataItem;
        transactionTemplate = T.getTransactionDataItem(
            transactionTemplate, true);
        transactionTemplate.splits = splits;
        this.updateReminderDataItem({
            transactionTemplate: transactionTemplate,
        },
        () => this.setModal(undefined)
        );
    }

    onMultiSplitsEditorCancel() {
        this.setModal(undefined);
    }


    onOpenMultiSplitsEditor() {
        const { accessor, refreshUndoMenu, } = this.props;
        const { reminderDataItem } = this.state;
        const { transactionTemplate } = reminderDataItem;

        this.setModal(() => <MultiSplitsEditor
            accessor = {accessor}
            splits = {transactionTemplate.splits}
            splitIndex = {0}
            onDone = {this.onMultiSplitsEditorDone}
            onCancel = {this.onMultiSplitsEditorCancel}
            refreshUndoMenu = {refreshUndoMenu}
        />);
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


    renderLastOccurrenceStateEditor() {
        const { reminderDataItem } = this.state;
        const { lastOccurrenceState } = reminderDataItem;
        if (lastOccurrenceState && lastOccurrenceState.lastOccurrenceYMDDate) {
            const lastOccurrenceYMDDate 
                = getYMDDate(lastOccurrenceState.lastOccurrenceYMDDate);
            const occurrenceCount = lastOccurrenceState.occurrenceCount || 1;
            if (YMDDate.isValidDate(lastOccurrenceYMDDate)) {
                const { accessor } = this.props;
                const dateFormat = accessor.getDateFormat();
                const dateText = formatDate(
                    lastOccurrenceYMDDate, dateFormat, getUserMsgLocale());
                const lastOccurrenceText = userMsg('ReminderEditor-lastOccurrenceDate',
                    dateText,
                    numberToOrdinalString(occurrenceCount));
                return <div className = "Field-editor">
                    {lastOccurrenceText}
                </div>;
            }
        }
    }


    renderPage() {
        const descriptionEditor = this.renderDescriptionEditor();
        const enabledEditor = this.renderEnabledEditor();
        const transactionTemplateEditor = this.renderTransactionTemplateEditor();
        const dateOccurrenceEditor = this.renderDateOccurrenceEditor();
        const lastStateEditor = this.renderLastOccurrenceStateEditor();

        return <PageBody classExtras = "Editor-body ReminderEditor-body">
            <Row classExtras = "Row-align-items-center Mt-2">
                <Col classExtras = "Col-auto Mr-4">
                    {enabledEditor}
                </Col>
                <Col>
                    {descriptionEditor}
                </Col>
            </Row>
            <SeparatorBar/>
            <div className = "ReminderEditor-section_label">
                {userMsg('ReminderEditor-transactionTemplate_heading')}
            </div>
            <Row>
                <Col>
                    {transactionTemplateEditor}
                </Col>
            </Row>
            <SeparatorBar/>
            <div className = "ReminderEditor-section_label">
                {userMsg('ReminderEditor-occurrenceDefinition_heading')}
            </div>
            <Row>
                <Col>
                    {dateOccurrenceEditor}
                </Col>
            </Row>
            <Row>
                <Col>
                    {lastStateEditor}
                </Col>
            </Row>
        </PageBody>;
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

        return <ErrorBoundary>
            <ModalPage
                onDone = {this.onFinish}
                onCancel = {this.onCancel}
                doneDisabled={!isOKToSave || !this.isSomethingToSave()}
            >
                {page}
            </ModalPage>
        </ErrorBoundary>;
    }
}

ReminderEditor.propTypes = {
    accessor: PropTypes.object.isRequired,
    reminderId: PropTypes.number,
    transactionTemplate: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    refreshUndoMenu: PropTypes.func,
};
