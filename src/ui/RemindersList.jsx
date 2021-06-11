import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { RowTable } from '../util-ui/RowTable';
import deepEqual from 'deep-equal';
import { columnInfosToColumns } from '../util-ui/ColumnInfo';
import * as ACE from './AccountingCellEditors';
import { getCurrencyForAccountId } 
    from '../tools/AccountHelpers';
import { getCurrency } from '../util/Currency';
import { Checkbox } from '../util-ui/Checkbox';
import { getReminderNextDateOccurrenceState } from '../engine/Reminders';
import { QuestionPrompter, StandardButton } from '../util-ui/QuestionPrompter';
import { YMDDate } from '../util/YMDDate';


function getReminderDataItem(args) {
    const { rowEntry } = args;
    if (rowEntry) {
        return rowEntry.reminderDataItem;
    }
}

function getTransactionTemplate(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        return reminderDataItem.transactionTemplate;
    }
}

function getMainSplit(args) {
    const transactionTemplate = getTransactionTemplate(args);
    if (transactionTemplate && transactionTemplate.splits.length) {
        const { splits } = transactionTemplate;
        return splits[0];
    }
}

function getAccessor(args) {
    const { caller } = args;
    if (caller) {
        return caller.props.accessor;
    }
}


//
//---------------------------------------------------------
// Enable State

function getEnabledCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        return reminderDataItem.isEnabled;
    }
}

function renderEnabledCell(args) {
    const { caller, value, } = args;
    const { onToggleEnabled } = caller.props;
    const reminderDataItem = getReminderDataItem(args);

    const checkbox = <Checkbox
        classExtras = "Cell"
        value = {value}
        onChange = {(isChecked) => caller.toggleEnabled(reminderDataItem.id)}
        disabled = { onToggleEnabled === undefined }
    />;

    return <div className = "Input-group Mb-0">
        {checkbox}
    </div>;
}


//
//---------------------------------------------------------
// Due status

function getDueStatusCellValue(args) {
    const { rowEntry } = args;
    if (rowEntry) {
        return rowEntry.dueStatus || 'DUE';
    }
}

function renderDueStatusCell(args) {
    const { value, } = args;
    const className = 'RemindersList-dueStatus RemindersList-dueStatus_' + value;
    const text = userMsg(
        'RemindersList-dueStatus_' + value);
    return <div className = {className}>
        {text}
    </div>;
}


//
//---------------------------------------------------------
// Description

function getDescriptionCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        let { description } = reminderDataItem;
        if (!description) {
            const { transactionTemplate } = reminderDataItem;
            if (transactionTemplate) {
                description = transactionTemplate.description;
                if (!description) {
                    const { splits } = transactionTemplate;
                    if (splits && splits.length) {
                        description = splits[0].description;
                    }
                }
            }
        }
        return description;
    }
}


//
//---------------------------------------------------------
// Account name

function getAccountNameCellValue(args) {
    const split = getMainSplit(args);
    const accessor = getAccessor(args);
    if (split && accessor) {
        const accountDataItem = accessor.getAccountDataItemWithId(
            split.accountId);
        if (accountDataItem) {
            return accountDataItem.name;
        }
    }

    if (args.isSizeRender) {
        return userMsg('AccountRegister-dummy_accountName');
    }
}


//
//---------------------------------------------------------
// Amount

function getAmountCellValue(args) {
    const split = getMainSplit(args);
    const accessor = getAccessor(args);
    if (split && accessor) {
        const currency = getCurrencyForAccountId(accessor, split.accountId);
        const { quantityBaseValue } = split;
        if (currency && (quantityBaseValue !== undefined)) {
            return currency.baseValueToString(quantityBaseValue);
        }
    }

    if (args.isSizeRender && accessor) {
        const currency = getCurrency(accessor.getBaseCurrencyCode());
        return currency.baseValueFromString(ACE.BalanceSizingBaseValue);
    }
}


//
//---------------------------------------------------------
// Last applied date

function getLastAppliedDateCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        let { lastAppliedYMDDate } = reminderDataItem;
        if (!lastAppliedYMDDate) {
            const { lastOccurrenceState } = reminderDataItem;
            if (lastOccurrenceState) {
                lastAppliedYMDDate = lastOccurrenceState.lastOccurrenceYMDDate;
            }
        }
        if (lastAppliedYMDDate) {
            return {
                accessor: getAccessor(args),
                ymdDate: lastAppliedYMDDate,
            };
        }
    }
}


//
//---------------------------------------------------------
// Next due date

function getNextDateCellValue(args) {
    let reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        let occurrenceState;
        const { lastOccurrenceState, occurrenceDefinition } = reminderDataItem;
        if (!lastOccurrenceState || !lastOccurrenceState.lastOccurrenceYMDDate) {
            if (occurrenceDefinition && !occurrenceDefinition.startYMDDate) {
                // Prevent earlier than today if new and no start date...
                occurrenceState = {
                    lastOccurrenceYMDDate: new YMDDate(),
                };
            }
        }

        const nextOccurrenceState = getReminderNextDateOccurrenceState(
            reminderDataItem,
            occurrenceState);
        if (nextOccurrenceState) {
            return {
                accessor: getAccessor(args),
                ymdDate: nextOccurrenceState.lastOccurrenceYMDDate,
            };
        }
    }
}


let columnInfoDefs;
let dueColumnInfoDefs;

function getRemindersListColumnInfoDefs(dueEntriesById) {
    if (!columnInfoDefs) {
        const cellClassName = 'M-0';
        const inputClassExtras = 'Text-center';

        columnInfoDefs = {
            enabled: { key: 'enabled',
                header: {
                    label: userMsg('RemindersList-enabled_heading'),
                    ariaLabel: 'Enabled',
                    classExtras: 'Text-center',
                },
                cellClassName: cellClassName 
                    + ' CheckboxCell RemindersList-checkbox-cell',
                getCellValue: getEnabledCellValue,
                renderDisplayCell: renderEnabledCell,
            },
            description: ACE.getDescriptionColumnInfo({
                getCellValue: getDescriptionCellValue,
            }),
            accountName: { key: 'accountName',
                header: {
                    label: userMsg('RemindersList-accountName_heading'),
                    ariaLabel: 'Account Name',
                    classExtras: 'Text-left Name-cell',
                },
                cellClassName: cellClassName,
                getCellValue: getAccountNameCellValue,
                renderDisplayCell: ACE.renderTextDisplay,
            },
            amount: { key: 'amount',
                header: {
                    label: userMsg('RemindersList-amount_heading'),
                    ariaLabel: 'Amount',
                    classExtras: 'Text-right',
                },
                cellClassName: cellClassName,
                inputClassExtras: 'Text-right',
                getCellValue: getAmountCellValue,
                renderDisplayCell: ACE.renderTextDisplay,
            },
            lastDate: { key: 'lastDate',
                header: {
                    label: userMsg('RemindersList-lastDate_heading'),
                    ariaLabel: 'Last Date',
                    classExtras: 'Text-center',
                },
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                getCellValue: getLastAppliedDateCellValue,
                renderDisplayCell: ACE.renderDateDisplay,
            },
            nextDate: { key: 'nextDate',
                header: {
                    label: userMsg('RemindersList-nextDate_heading'),
                    ariaLabel: 'Next Date',
                    classExtras: 'Text-center',
                },
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                getCellValue: getNextDateCellValue,
                renderDisplayCell: ACE.renderDateDisplay,
            },
        };

        dueColumnInfoDefs = {
            dueStatus: { key: 'dueStatus',
                header: {
                    label: userMsg('RemindersList-dueStatus_heading'),
                    ariaLabel: 'Status',
                    classExtras: 'Text-center',
                },
                cellClassName: cellClassName,
                getCellValue: getDueStatusCellValue,
                renderDisplayCell: renderDueStatusCell,
            },
            description: columnInfoDefs.description,
            accountName: columnInfoDefs.accountName,
            amount: columnInfoDefs.amount,
            lastDate: columnInfoDefs.lastDate,
            nextDate: columnInfoDefs.nextDate,
        };
    }

    return (dueEntriesById) ? dueColumnInfoDefs : columnInfoDefs;
}


/**
 * Retrieves the account list columns with default settings.
 */
export function createDefaultColumns(dueEntriesById) {
    const columnInfos = getRemindersListColumnInfoDefs(dueEntriesById);

    const columns = columnInfosToColumns({
        columnInfos: columnInfos,
    });

    columns.forEach((column) => column.isVisible = true);

    return columns;
}


export class RemindersList extends React.Component {
    constructor(props) {
        super(props);

        this.onReminderAdd = this.onReminderAdd.bind(this);
        this.onReminderModify = this.onReminderModify.bind(this);
        this.onReminderRemove = this.onReminderRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);


        this._hiddenReminderIds = new Set();

        this.state = {
            rowEntries: [],
        };

        this._sizingRowEntry = {
            key: 123,
            reminderDataItem: {
                description: userMsg('AccountRegister-dummy_description'),
                transactionTemplate: undefined,
                isEnabled: true,
            }
        };

        if (this.props.dueEntriesById) {
            this._sizingRowEntry.dueStatus = 'APPLIED';
        }

        this.state.rowEntries = this.buildRowEntries().rowEntries;
    }


    onReminderAdd(result) {
        const { id } = result.newReminderDataItem;
        if (this.isReminderIdDisplayed(id)) {
            this.updateRowEntries();
        }
    }

    
    onReminderModify(result) {
        const { id } = result.newReminderDataItem;
        for (let rowEntry of this.state.rowEntries) {
            if (rowEntry.reminderDataItem.id === id) {
                this.updateRowEntries();
                return;
            }
        }
    }


    onReminderRemove(result) {
        const { id } = result.removedReminderDataItem;
        for (let rowEntry of this.state.rowEntries) {
            if (rowEntry.reminderDataItem.id === id) {
                this.updateRowEntries();
                return;
            }
        }
    }


    componentDidMount() {
        this.props.accessor.on('reminderAdd', this.onReminderAdd);
        this.props.accessor.on('reminderModify', this.onReminderModify);
        this.props.accessor.on('reminderRemove', this.onReminderRemove);
    }

    componentWillUnmount() {
        this.props.accessor.off('reminderAdd', this.onReminderAdd);
        this.props.accessor.off('reminderModify', this.onReminderModify);
        this.props.accessor.off('reminderRemove', this.onReminderRemove);
    }


    componentDidUpdate(prevProps, prevState) {
        let rowsNeedUpdating = false;
        const { hiddenReminderIds, 
            showHiddenReminders } = this.props;

        if (!deepEqual(prevProps.hiddenReminderIds, hiddenReminderIds)) {
            this._hiddenReminderIds = new Set(hiddenReminderIds);
            rowsNeedUpdating = true;
        }

        if (prevProps.showHiddenReminders !== showHiddenReminders) {
            rowsNeedUpdating = true;
        }

        if (!rowsNeedUpdating) {
            if (!deepEqual(this.props.dueEntriesById, prevProps.dueEntriesById)) {
                rowsNeedUpdating = true;
            }
        }

        if (rowsNeedUpdating) {
            const { prevActiveRowKey } = this.state;
            const result = this.buildRowEntries();
            this.setState({
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
                activeRowIndex: result.activeRowIndex,
            });

            if (prevActiveRowKey !== result.activeRowKey) {
                const { onSelectReminder } = this.props;
                if (onSelectReminder) {
                    const reminderDataItem = (result.activeRowEntry)
                        ? result.activeRowEntry.reminderDataItem
                        : undefined;
                    onSelectReminder(reminderDataItem 
                        ? reminderDataItem.id 
                        : undefined);
                }
            }
        }
    }


    buildRowEntries() {
        const rowEntries = [];
        const { accessor, dueEntriesById } = this.props;

        if (dueEntriesById) {
            dueEntriesById.forEach((value, id) => {
                this.addReminderIdToRowEntries(id, rowEntries);
            });
        }
        else {
            const reminderIds = accessor.getReminderIds();

            reminderIds.forEach((id) => {
                this.addReminderIdToRowEntries(id, rowEntries);
            });
        }

        let { activeRowKey } = this.state;
        let activeRowEntry;
        let activeRowIndex;
        if (activeRowKey) {
            let currentIndex;
            for (currentIndex = 0; currentIndex < rowEntries.length; ++currentIndex) {
                if (rowEntries[currentIndex].key === activeRowKey) {
                    activeRowEntry = rowEntries[currentIndex];
                    activeRowIndex = currentIndex;
                    break;
                }
            }
            if (currentIndex >= rowEntries.length) {
                // The active row is no longer visible...
                activeRowKey = undefined;
            }
        }

        return {
            rowEntries: rowEntries,
            activeRowIndex: activeRowIndex,
            activeRowKey: activeRowKey,
            activeRowEntry: activeRowEntry,
        };
    }


    addReminderIdToRowEntries(reminderId, rowEntries) {
        if (!this.isReminderIdDisplayed(reminderId)) {
            return;
        }

        const { accessor, dueEntriesById } = this.props;
        const reminderDataItem = accessor.getReminderDataItemWithId(reminderId);

        const key = reminderDataItem.id.toString();
        const index = rowEntries.length;

        let dueStatus;
        if (dueEntriesById) {
            const status = dueEntriesById.get(reminderId);
            if (status) {
                dueStatus = status.dueStatus;
            }
            else {
                dueStatus = 'DUE';
            }
        }

        const rowEntry = {
            key: key,
            index: index,
            reminderDataItem: reminderDataItem,
            dueStatus: dueStatus,
        };

        if (rowEntries) {
            rowEntries.push(rowEntry);
        }

        return rowEntry;
    }


    isReminderIdDisplayed(reminderId) {
        const { dueEntriesById, showHiddenReminders } = this.props;
        if (dueEntriesById) {
            return dueEntriesById.has(reminderId);
        }

        if (!showHiddenReminders && this._hiddenReminderIds.has(reminderId)) {
            return false;
        }
        
        const reminderDataItem = this.props.accessor.getReminderDataItemWithId(
            reminderId);
        if (!reminderDataItem) {
            return false;
        }

        return true;
    }


    updateRowEntries() {
        this.setState((state) => {
            const result = this.buildRowEntries();
            return {
                rowEntries: result.rowEntries,
                activeRowKey: result.activeRowKey,
                activeRowIndex: result.activeRowIndex,
            };
        });
    }



    getRowKey(rowIndex) {
        const rowEntry = this.state.rowEntries[rowIndex];
        if (rowEntry) {
            return rowEntry.key;
        }
        return rowIndex;
    }


    onActivateRow(activeRowIndex) {
        const rowEntry = (activeRowIndex !== undefined)
            ? this.state.rowEntries[activeRowIndex]
            : undefined;
        const activeRowKey = (rowEntry) ? rowEntry.key : undefined;
        this.setState({
            activeRowIndex: activeRowIndex,
            activeRowKey: activeRowKey,
        });

        const { onSelectReminder } = this.props;
        if (onSelectReminder) {
            const { reminderDataItem } = rowEntry;
            onSelectReminder(reminderDataItem ? reminderDataItem.id : undefined);
        }
    }


    onOpenActiveRow({rowIndex}) {
        const rowEntry = this.state.rowEntries[rowIndex];
        const { reminderDataItem } = rowEntry;
        const { onChooseReminder } = this.props;

        if (onChooseReminder && reminderDataItem) {
            onChooseReminder(reminderDataItem.id);
        }
    }



    onRenderCell(args) {
        let rowEntry = (args.isSizeRender)
            ? this._sizeRowEntry
            : this.state.rowEntries[args.rowIndex];
        args = Object.assign({}, args, {
            caller: this,
            rowEntry: rowEntry,
            isActive: args.rowIndex === this.state.activeRowIndex,
        });

        const { columnInfo } = this.props.columns[args.columnIndex];
        const { renderDisplayCell } = columnInfo;
        if (renderDisplayCell) {
            const value = columnInfo.getCellValue(args);
            return renderDisplayCell({
                caller: this,
                rowEntry: rowEntry,
                columnInfo: columnInfo,
                value: value,
            });
        }
    }


    toggleEnabled(rowIndex) {
        const { onToggleEnabled } = this.props;
        if (onToggleEnabled) {
            onToggleEnabled(rowIndex);
        }
    }


    renderNoRemindersDue() {
        return <QuestionPrompter
            message = {userMsg('RemindersList-no_reminders_due')}
            buttons = {StandardButton.OK}
            onButton = {() => this.props.onClose()}
        />;
    }


    render() {
        const { props, state } = this;
        const { rowEntries } = state;
        const { dueEntriesById } = props;
        if (dueEntriesById) {
            // If there are no reminders due say so...
            if (!rowEntries.length) {
                return this.renderNoRemindersDue();
            }
        }

        return <div className="RowTableContainer RemindersList">
            <RowTable
                columns = { props.columns }
                rowCount = { rowEntries.length }
                getRowKey = { this.getRowKey }

                onRenderCell={this.onRenderCell}

                onSetColumnWidth = { this.props.onSetColumnWidth }

                activeRowIndex = {state.activeRowIndex}
                onActivateRow = {this.onActivateRow}

                onOpenActiveRow = {this.onOpenActiveRow}

                contextMenuItems={this.props.contextMenuItems}
                onChooseContextMenuItem={this.props.onChooseContextMenuItem}
            />
        </div>;
    }
}

RemindersList.propTypes = {
    accessor: PropTypes.object,
    onSelectReminder: PropTypes.func,
    onChooseReminder: PropTypes.func,
    onToggleEnabled: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    columns: PropTypes.arrayOf(PropTypes.object),
    onSetColumnWidth: PropTypes.func,
    hiddenReminderIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenReminders: PropTypes.bool,
    showReminderIds: PropTypes.bool,
    dueEntriesById: PropTypes.objectOf(Map),
    children: PropTypes.any,
};
