import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { RowTable } from '../util-ui/RowTable';
import deepEqual from 'deep-equal';
import { columnInfosToColumns, 
    stateUpdateFromSetColumnWidth } from '../util-ui/ColumnInfo';
import * as ACE from './AccountingCellEditors';
import { getCurrencyForAccountId } 
    from '../tools/AccountHelpers';
import { getCurrency } from '../util/Currency';
import { Checkbox } from '../util-ui/Checkbox';
import * as DO from '../util/DateOccurrences';


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
        let maxIndex = 0;
        let maxQuantityBaseValue = Math.abs(splits[0].quantityBaseValue);
        for (let i = 1; i < splits.length; ++i) {
            const quantityBaseValue = Math.abs(splits[i].quantityBaseValue);
            if (quantityBaseValue > maxQuantityBaseValue) {
                maxIndex = i;
                maxQuantityBaseValue = quantityBaseValue;
            }
        }
        return splits[maxIndex];
    }
}

function getAccessor(args) {
    const { caller } = args;
    if (caller) {
        return caller.props.accessor;
    }
}

function getEnabledCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        return reminderDataItem.isEnabled;
    }
}

function renderEnabledCell(args) {
    const { caller, value, rowIndex } = args;
    return <Checkbox
        value = {value}
        onChange = {(isChecked) => caller.toggleEnabled(rowIndex)}
    />;
}

function getDescriptionCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        return reminderDataItem.description;
    }
}

function getAccountNameCellValue(args) {
    const split = getMainSplit(args);
    const accessor = getAccessor(args);
    if (split && accessor) {
        const accountDataItem = accessor.getAccountDataItemForId(
            split.accountId);
        if (accountDataItem) {
            return accountDataItem.name;
        }
    }

    if (args.isSizeRender) {
        return userMsg('AccountRegister-dummy_accountName');
    }
}


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


function getLastAppliedDateCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        const { lastOccurrenceState } = reminderDataItem;
        if (lastOccurrenceState) {
            return {
                accessor: getAccessor(args),
                ymdDate: lastOccurrenceState.lastOccurrenceYMDDate,
            };
        }
    }
}


function getNextDateCellValue(args) {
    const reminderDataItem = getReminderDataItem(args);
    if (reminderDataItem) {
        const { occurrenceDefinition, lastOccurrenceState } = reminderDataItem;
        if (occurrenceDefinition) {
            const nextOccurrenceState = DO.getNextDateOccurrenceState(
                occurrenceDefinition, lastOccurrenceState);
            if (!nextOccurrenceState.occurrencesAllDone) {
                return {
                    accessor: getAccessor(args),
                    ymdDate: nextOccurrenceState.lastOccurrenceYMDDate,
                };
            }
        }
    }
}


let columnInfoDefs;

function getRemindersListColumnInfoDefs() {
    if (!columnInfoDefs) {
        const cellClassName = 'm-0';
        const inputClassExtras = 'text-center';

        columnInfoDefs = {
            enabled: { key: 'enabled',
                header: {
                    label: userMsg('RemindersList-enabled_heading'),
                    ariaLabel: 'Enabled',
                    classExtras: 'text-center',
                },
                cellClassName: cellClassName,
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
                    classExtras: 'text-left name-cell',
                },
                cellClassName: cellClassName,
                getCellValue: getAccountNameCellValue,
                renderDisplayCell: ACE.renderTextDisplay,
            },
            amount: { key: 'amount',
                header: {
                    label: userMsg('RemindersList-amount_heading'),
                    ariaLabel: 'Amount',
                    classExtras: 'text-right',
                },
                cellClassName: cellClassName,
                inputClassExtras: 'text-right',
                getCellValue: getAmountCellValue,
                renderDisplayCell: ACE.renderTextDisplay,
            },
            lastDate: { key: 'lastDate',
                header: {
                    label: userMsg('RemindersList-lastDate_heading'),
                    ariaLabel: 'Last Date',
                    classExtras: 'text-center',
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
                    classExtras: 'text-center',
                },
                cellClassName: cellClassName,
                inputClassExtras: inputClassExtras,
                getCellValue: getNextDateCellValue,
                renderDisplayCell: ACE.renderDateDisplay,
            },
        };
    }

    return columnInfoDefs;
}


export class RemindersList extends React.Component {
    constructor(props) {
        super(props);

        this.onReminderAdd = this.onReminderAdd.bind(this);
        this.onReminderModify = this.onReminderModify.bind(this);
        this.onReminderRemove = this.onReminderRemove.bind(this);

        this.getRowKey = this.getRowKey.bind(this);
        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

        this.onRenderCell = this.onRenderCell.bind(this);
        this.onActivateRow = this.onActivateRow.bind(this);
        this.onOpenActiveRow = this.onOpenActiveRow.bind(this);

        const columnInfoDefs = getRemindersListColumnInfoDefs();

        const columnInfos = [];

        if (!columnInfos.length) {
            for (let name in columnInfoDefs) {
                columnInfos.push(columnInfoDefs[name]);
            }
        }


        this._hiddenReminderIds = new Set();

        this.state = {
            columnInfos: columnInfos,
            rowEntries: [],
            columnKeys: new Set(),
        };

        this._sizingRowEntry = {
            key: 123,
            reminderDataItem: {
                description: userMsg('AccountRegister-dummy_description'),
                transactionTemplate: undefined,
                isEnabled: true,
            }
        };

        this.state.columns = columnInfosToColumns(this.state);

        this.state.rowEntries = this.buildRowEntries().rowEntries;
    }


    onReminderAdd(result) {
        if (this.isReminderIdDisplayed(result.newReminderDataItem.id)) {
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


        const { columnInfos } = this.state;
        const columnKeys = new Set();
        columnInfos.forEach((columnInfo) => columnKeys.add(columnInfo.key));
        if (!deepEqual(columnKeys, prevState.columnKeys)) {
            this.setState({
                columnKeys: columnKeys,
            });
        }
    }


    // Setting up the row entries:
    // Want to be able to filter what gets displayed.
    // Support summary rows for say reminder balances.
    buildRowEntries() {
        const rowEntries = [];
        const { accessor } = this.props;
        const reminderIds = accessor.getReminderIds();

        reminderIds.forEach((id) => {
            this.addReminderIdToRowEntries(rowEntries, id);
        });

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


    addReminderIdToRowEntries(rowEntries, reminderId) {
        if (!this.isReminderIdDisplayed(reminderId)) {
            return;
        }

        const { accessor } = this.props;
        const reminderDataItem = accessor.getReminderDataItemWithId(reminderId);

        const key = reminderDataItem.id.toString();
        const index = rowEntries.length;

        rowEntries.push({
            key: key,
            index: index,
            reminderDataItem: reminderDataItem,
        });
    }


    isReminderIdDisplayed(reminderId) {
        const { showHiddenReminders } = this.props;
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

    onSetColumnWidth(args) {
        this.setState((state) => stateUpdateFromSetColumnWidth(args, state));
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
        const { onChooseReminder } = this.props;
        const { reminderDataItem } = rowEntry;
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

        const columnInfo = this.state.columnInfos[args.columnIndex];
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

    }


    render() {
        const { state } = this;
        return <div className="RowTableContainer RemindersList">
            <RowTable
                columns = { state.columns }
                rowCount = { state.rowEntries.length }
                getRowKey = { this.getRowKey }

                onRenderCell={this.onRenderCell}

                onSetColumnWidth = { this.onSetColumnWidth }

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
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    hiddenReminderIds: PropTypes.arrayOf(PropTypes.number),
    showHiddenReminders: PropTypes.bool,
    showReminderIds: PropTypes.bool,
    children: PropTypes.any,
};
