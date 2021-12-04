import React from 'react';
import { userMsg } from '../util/UserMessages';
import { CellTextDisplay, CellTextEditor } from '../util-ui/CellTextEditor';
import { CellSelectDisplay, CellSelectEditor,
    renderCellSelectEditorAsText,
    CellToggleSelectDisplay, CellToggleSelectEditor, } from '../util-ui/CellSelectEditor';
import { CellDateDisplay, CellDateEditor } from '../util-ui/CellDateEditor';
import { CellQuantityDisplay, CellQuantityEditor,
    renderCellQuantityEditorAsText,
    renderCellQuantityDisplayAsText, } from '../util-ui/CellQuantityEditor';
import { getValidQuantityBaseValue } from '../util-ui/QuantityField';
import { Tooltip } from '../util-ui/Tooltip';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import * as AH from '../tools/AccountHelpers';
import { ReconcileState, getReconcileStateName } from '../engine/Transactions';
import { getCurrency } from '../util/Currency';
import { Row, Col } from '../util-ui/RowCols';
import { addAccountIdsToAccountEntries, AccountSelector, 
    accountEntriesToItems } from './AccountSelector';


/*
 * About the design:
 * The idea is to support {@link CellEditorsManager}'s 
 * {@link CellEditorsManager~ColumnInfo} callbacks directly for both the display
 * and editor renderers.
 * 
 * The editors should have an args that's based upon {@link CellEditorArgs} and
 * has one additional property, named value, which is the result of the 
 * getCellValue() callback.
 * 
 * The displayers should have an args that's just a columnInfo and a value
 * property, where the value property is the result of the getCellValue()
 * callback.
 */


/**
 * @typedef {object}    CellEditorArgs
 * {@link EditableRowTable~onRenderEditCellArgs} plus:
 * @property {ColumnInfo} columnInfo
 * @property {EditableRowTable~setCellEditBuffer}   setCellEditBuffer
 * @property {string}   [errorMsg]
 */


/**
 * @typedef {object} getColumnInfoArgs
 * Argument for the various getXColumnInfo() functions, these are additional
 * properties for the column info. Typically the following properties are
 * specified:
 * @property {CellEditorsManager~getCellValue}  getCellValue
 * @property {CellEditorsManager~saveCellValue} saveCellValue
 */


/**
 * @typedef {object}    CellTextEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string|CellTextValue}   value
 */

/**
 * The core text editor renderer.
 * @param {CellTextEditorArgs} args 
 */
export function renderTextEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

    let { value } = cellEditBuffer;
    let placeholder;
    if (typeof value === 'object') {
        placeholder = value.placeholder;
        if (value.readOnly) {
            args = Object.assign({}, args, {
                value: value
            });
            return renderTextDisplay(args);
        }
        value = value.text;
    }

    value = value || '';

    if (args.renderAsText) {
        return value;
    }

    return <CellTextEditor
        id = {'CellTextEditor-' + columnInfo.key}
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {value.toString()}
        placeholder = {placeholder}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer(
                args.columnIndex, 
                {
                    value: e.target.value,
                    isEdited: true,
                });
        }}
        errorMsg = {errorMsg}
    />;
}

function renderTextEditorWithTooltips(args, valueProperty) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

    const originalValue = cellEditBuffer.value || '';
    let value = originalValue;
    let placeholder;
    if (typeof value === 'object') {
        placeholder = value.placeholder;
        value = value[valueProperty];
    }
    if ((value === undefined) || (value === null)) {
        value = '';
    }

    if (args.renderAsText) {
        return value;
    }

    return <CellTextEditor
        id = {'CellTextEditor-' + columnInfo.key}
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {value.toString()}
        placeholder = {placeholder}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            if (typeof originalValue === 'object') {
                const newValue = Object.assign({}, originalValue);
                newValue[valueProperty] = e.target.value;
                setCellEditBuffer(
                    args.columnIndex,
                    {
                        value: newValue,
                        isEdited: true,
                    });

            }
            else {
                setCellEditBuffer(
                    args.columnIndex,
                    {
                        value: e.target.value,
                        isEdited: true,
                    });
            }

            const { onChange } = args;
            if (onChange) {
                onChange(e, args);
            }
        }}
        autoCompleteList = {args.autoCompleteList}
        onAutoComplete = {args.onAutoComplete}
        errorMsg = {errorMsg}
    />;
}

/**
 * @typedef {object}    CellTextValue
 * @property {string|number}    value
 * @property {string}   tooltip
 * @property {boolean}  readOnly
 */

/**
 * @typedef {object}    CellTextDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string|number|CellTextValue}  value
 */

/**
 * The core text display renderer.
 * @param {CellTextDisplayArgs} args 
 */
export function renderTextDisplay(args) {
    const { columnInfo } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    let value = args.value;
    let placeholder;
    let tooltip;
    if (typeof value === 'object') {
        placeholder = value.placeholder;
        tooltip = value.tooltip;
        value = value.value;
    }
    if ((value === undefined) || (value === null)) {
        value = '';
    }

    if (args.renderAsText) {
        return value;
    }

    const component = <CellTextDisplay
        ariaLabel = {ariaLabel}
        value = {value.toString()}
        placeholder = {placeholder}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        tooltip = {tooltip}
    />;

    return component;
}


/**
 * Editor renderer for the refNum property of {@link SplitDataItem}.
 * @param {CellTextEditorArgs}  args
 */
export const renderRefNumEditor = renderTextEditor;

/**
 * Display renderer for the refNum property of {@link SplitDataItem}.
 * @param {CellTextDisplayArgs} args
 */
export const renderRefNumDisplay = renderTextDisplay;


/**
 * Retrieves a column info for cells for the refNum property of {@link SplitDataItem}.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getRefNumColumnInfo(args) {
    return Object.assign({ key: 'refNum',
        header: {
            label: userMsg('AccountingCellEditors-refNum'),
            ariaLabel: 'Reference Number',
            classExtras: 'RowTable-header-base RefNum-base RefNum-header',
        },
        inputClassExtras: 'RefNum-base RefNum-input',
        cellClassName: 'RowTable-cell-base RefNum-base RefNum-cell',

        renderDisplayCell: renderRefNumDisplay,
        renderEditCell: renderRefNumEditor,
    },
    args);
}


/**
 * @typedef {object}    CellNameDescriptionValue
 * @property {string}   [name]
 * @property {string}   [description]
 * @property {string}   [placeholder]
 */


/**
 * @typedef {object}    CellNameEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string|CellNameDescriptionValue}   value
 */

/**
 * Editor renderer for name properties.
 * @param {CellNameEditorArgs}  args
 */
export function renderNameEditor(args) {
    return renderTextEditorWithTooltips(args, 'name');
}


/**
 * @typedef {object}    CellNameDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string|number|CellNameDescriptionValue}   value
 */

/**
 * Display renderer for name properties.
 * @param {CellNameDisplayArgs} args
 */
export function renderNameDisplay(args) {
    const { value } = args;
    if (typeof value === 'object') {
        args = Object.assign({}, args, {
            value: {
                value: value.name,
                tooltip: value.description,
                placeholder: value.placeholder,
            },
        });

    }

    return renderTextDisplay(args);
}


/**
 * Retrieves a column info for name cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getNameColumnInfo(args) {
    return Object.assign({ key: 'name',
        header: {
            label: userMsg('AccountingCellEditors-name'),
            ariaLabel: 'Name',
            classExtras: 'RowTable-header-base Name-base Name-header',
        },
        inputClassExtras: 'Name-base Name-input',
        cellClassName: 'RowTable-cell-base Name-base Name-cell',

        renderDisplayCell: renderNameDisplay,
        renderEditCell: renderNameEditor,
    },
    args);
}


/**
 * @typedef {object}    CellDescriptionMemoValue
 * @property {string}   [description]
 * @property {string}   [memo]
 */


/**
 * @typedef {object}    CellDescriptionEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string|CellDescriptionMemoValue}   value
 */

/**
 * Editor renderer for description properties.
 * @param {CellDescriptionEditorArgs}  args
 */
export function renderDescriptionEditor(args) {
    return renderTextEditorWithTooltips(args, 'description');
}


/**
 * @typedef {object}    CellDescriptionMemoDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string|number|CellDescriptionMemoValue}   value
 */

/**
 * Display renderer for description properties.
 * @param {CellDescriptionMemoDisplayArgs} args
 */
export function renderDescriptionDisplay(args) {
    const { value } = args;
    if (typeof value === 'object') {
        args = Object.assign({}, args, { 
            value: {
                value: value.description, 
                tooltip: value.memo,
                placeholder: value.placeholder,
            },
        });
    }

    return renderTextDisplay(args);
}


/**
 * Retrieves a column info for description cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getDescriptionColumnInfo(args) {
    return Object.assign({ key: 'description',
        header: {
            label: userMsg('AccountingCellEditors-description'),
            ariaLabel: 'Description',
            classExtras: 'RowTable-header-base Description-base Description-header',
        },
        inputClassExtras: 'Description-base Description-input',
        cellClassName: 'RowTable-cell-base Description-base Description-cell',

        renderDisplayCell: renderDescriptionDisplay,
        renderEditCell: renderDescriptionEditor,
    },
    args);
}


/**
 * @typedef {object}    CellDateValue
 * @property {string}   ymdDate
 * @property {EngineAccessor}   accessor
 */


/**
 * @typedef {object}    CellDateEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellDateValue}   value
 */


/**
 * Editor renderer for {@link YMDDate} properties.
 * @param {CellDateEditorArgs}  args
 */
export function renderDateEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras } = columnInfo;
    let value = cellEditBuffer.value || {};
    const { accessor } = value;
    let dateFormat = (accessor) ? accessor.getDateFormat() : undefined;

    if (args.renderAsText) {
        return value;
    }

    return <CellDateEditor
        ariaLabel = {ariaLabel}
        value = {value.ymdDate}
        inputClassExtras = {inputClassExtras}
        onChange = {(ymdDate) => {
            setCellEditBuffer(
                args.columnIndex,
                {
                    value: Object.assign({}, cellEditBuffer.value, {
                        ymdDate: ymdDate,
                    }),
                    isEdited: true,
                });
        }}
        ref = {refForFocus}
        tabIndex = {0}
        size = {columnInfo.inputSize}
        dateFormat = {dateFormat}
        errorMsg = {args.errorMsg}
    />;
}

/**
 * @typedef {object}    CellDateDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellDateValue} value
 */

/**
 * Display renderer for {@link YMDDate} properties.
 * @param {CellDateDisplayArgs} args 
 */
export function renderDateDisplay(args) {
    const { columnInfo } = args;
    
    const value = args.value || {};
    const { accessor } = value;
    let dateFormat = (accessor) ? accessor.getDateFormat() : undefined;

    if (args.renderAsText) {
        return value;
    }

    return <CellDateDisplay
        ariaLabel = {columnInfo.ariaLabel}
        value = {value.ymdDate}
        classExtras = {columnInfo.cellClassExtras}
        inputClassExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
        dateFormat = {dateFormat}
    />;
}



/**
 * Retrieves a column info for date cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getDateColumnInfo(args) {
    return Object.assign({ key: 'date',
        header: {
            label: userMsg('AccountingCellEditors-date'),
            ariaLabel: 'Date',
            classExtras: 'RowTable-header-base Date-base Date-header',
        },
        inputClassExtras: 'Date-base Date-input',
        cellClassName: 'RowTable-cell-base Date-base Date-cell',

        renderDisplayCell: renderDateDisplay,
        renderEditCell: renderDateEditor,
    },
    args);
}


/**
 * @typedef {object}    CellAccountTypeValue
 * @property {string}   accountType
 * @property {AccountType|string}   [parentAccountType] Only needed for editing.
 * @property {AccountDataItem}  [accountDataItem]   Only needed for editing.
 */


/**
 * @typedef {object}    CellAccountTypeEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellAccountTypeValue}   value
 */

/**
 * Editor renderer for {@link AccountType} properties.
 * @param {CellAccountTypeEditorArgs} args 
 */
export function renderAccountTypeEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { value } = cellEditBuffer;
    const parentAccountType = A.getAccountType(value.parentAccountType);
    if (!parentAccountType) {
        return;
    }

    const { accountDataItem } = value;
    const childAccounts = (accountDataItem) 
        ? accountDataItem.childAccounts : undefined;    

    const items = [];
    parentAccountType.allowedChildTypes.forEach((type) => {
        if (type.pricedItemType !== PI.PricedItemType.CURRENCY) {
            return;
        }

        let allowsChildren = true;
        if (childAccounts) {
            for (let i = childAccounts.length - 1; i >= 0; --i) {
                const childType = A.AccountType[childAccounts[i].type];
                if (type.allowedChildTypes.indexOf(childType) < 0) {
                    allowsChildren = false;
                    break;
                }
            }
        }
        if (!allowsChildren) {
            return;
        }
        items.push([type.name, type.description]);
    });

    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

    const selectedValue = value.accountType || A.AccountType.ASSET.name;
    if (args.renderAsText) {
        return renderCellSelectEditorAsText({
            items: items,
            selectedValue: selectedValue,
        });
    }

    return <CellSelectEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        selectedValue = {selectedValue}
        items = {items}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer(
                args.columnIndex,
                {
                    value: Object.assign({}, value, {
                        accountType: e.target.value,
                    }),
                    isEdited: true,
                });
        }}
        errorMsg = {errorMsg}
    />;
}


/**
 * @typedef {object}    CellAccountTypeDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellAccountTypeValue}   value
 */

/**
 * Display renderer for {@link AccountType} properties.
 * @param {CellAccountTypeDisplayArgs} args 
 */
export function renderAccountTypeDisplay(args) {
    const { columnInfo, value } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const accountType = A.AccountType[value.accountType];

    if (args.renderAsText) {
        return accountType.description;
    }

    return <CellSelectDisplay
        ariaLabel = {ariaLabel}
        selectedValue = {accountType.description}
        classExtras = {inputClassExtras}
        size = {inputSize}
    />;
}

/**
 * Retrieves a column info for {@link AccountType} cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getAccountTypeColumnInfo(args) {
    return Object.assign({ key: 'accountType',
        header: {
            label: userMsg('AccountingCellEditors-accountType'),
            classExtras: 'RowTable-header-base AccountType-base AccountType-header',
        },
        inputClassExtras: 'AccountType-base AccountType-input',
        cellClassName: 'RowTable-cell-base AccountType-base AccountType-cell',

        renderDisplayCell: renderAccountTypeDisplay,
        renderEditCell: renderAccountTypeEditor,
    },
    args);
}


/**
 * @callback CellAccountIdFilter
 * @param {number} accountId
 * @returns {boolean}   <code>true</code> if the account id should be included.
 */

/**
 * @typedef {object}    CellAccountIdValue
 * @property {number}   accountId
 * @property {EngineAccessor}   accessor
 * @property {CellAccountIdFilter}  [accountIdFilter]   Only needed for
 * editing and if filtering is desired.
 * @property {boolean}  readOnly
 */

/**
 * @typedef {object}    CellAccountIdEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellAccountIdValue}   value
 */

function onAccountIdChange(e, args) {
    const value = parseInt(e.target.value);
    const { cellEditBuffer, setCellEditBuffer, } = args;
    setCellEditBuffer(
        args.columnIndex,
        {
            value: Object.assign({}, cellEditBuffer.value, {
                accountId: value,
            }),
            isEdited: true,
        });
}

/**
 * Editor renderer for account id properties. Provides a list for choosing an
 * account id.
 * @param {CellAccountIdEditorArgs} args 
 */
export function renderAccountIdEditor(args) {
    const { columnInfo, cellEditBuffer, errorMsg,
        refForFocus } = args;
    const { value } = cellEditBuffer;
    if (!value || value.readOnly) {
        args = Object.assign({}, args, {
            value: value
        });
        return renderAccountIdDisplay(args);
    }

    const { accessor, accountId, } = value;
    const filter = value.accountIdFilter || (() => true);
    const rootAccountIds = accessor.getRootAccountIds();

    const accountEntries = [];
    addAccountIdsToAccountEntries({
        accessor: accessor,
        accountEntries: accountEntries,
        accountIds: rootAccountIds,
        filter: filter,
        labelCallback: AH.getShortAccountAncestorNames,
    });

    const accountItems = accountEntriesToItems({
        accessor: accessor, 
        accountEntries: accountEntries,
        noIndent: true,
    });

    if (args.renderAsText) {
        return renderCellSelectEditorAsText({
            items: accountItems,
            selectedValue: accountId,
        });
    }

    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

    return <AccountSelector
        accessor = {accessor}
        accountEntries = {accountItems}
        accountEntriesAreItems
        selectedAccountId = {accountId}
        onChange = {(e) => onAccountIdChange(e, args)}
        classExtras = {inputClassExtras}
        ariaLabel = {ariaLabel}
        size = {inputSize}
        errorMsg = {errorMsg}
        ref = {refForFocus}
    />;
}


/**
 * @typedef {object}    CellAccountIdDisplayArgs  
 * @property {ColumnInfo} columnInfo
 * @property {CellAccountIdValue}   value
 */

/**
 * Display renderer for account id properties.
 * @param {CellAccountIdDisplayArgs} args 
 */
export function renderAccountIdDisplay(args) {
    const { columnInfo, value } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const { accountId, accessor } = value;
    const name = AH.getShortAccountAncestorNames(accessor, accountId);

    if (args.renderAsText) {
        return name || '';
    }

    if (name) {
        return <CellSelectDisplay
            ariaLabel = {ariaLabel}
            selectedValue = {name}
            classExtras = {inputClassExtras}
            size = {inputSize}
        />;
    }
}

/**
 * Retrieves a column info for account id cells.
 * @param {getColumnInfoArgs} args 
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getAccountIdColumnInfo(args) {
    return Object.assign({ key: 'accountId',
        header: {
            label: userMsg('AccountingCellEditors-accountId'),
            classExtras: 'RowTable-header-base AccountId-base AccountId-header',
        },
        inputClassExtras: 'Cell CellSelectEditor-select AccountId-base AccountId-input',
        cellClassName: 'RowTable-cell-base AccountId-base AccountId-cell',

        renderDisplayCell: renderAccountIdDisplay,
        renderEditCell: renderAccountIdEditor,
    },
    args);
}


/**
 * @typedef {object}    CellReconcileStateValue
 * @property {string}   reconcileState
 * @property {boolean}  [readOnly]
 */


/**
 * @typedef {object}    CellReconcileStateEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellReconcileStateValue}   value
 */

let reconcileItems;

/**
 * Editor renderer for {@link ReconcileState} properties.
 * @param {CellReconcileStateEditorArgs}  args
 */
export function renderReconcileStateEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const { value } = cellEditBuffer;
    if (!value) {
        return;
    }

    if (value.readOnly) {
        args = Object.assign({}, args, {
            value: value
        });
        return renderReconcileStateDisplay(args);
    }

    const reconcileState = getReconcileStateName(
        value.reconcileState || ReconcileState.NOT_RECONCILED);
    if (!reconcileItems) {
        reconcileItems = [];
        for (let name in ReconcileState) {
            reconcileItems.push([
                name,
                userMsg('AccountingCellEditors-reconcile_' + name)
            ]);
        }
    }

    if (args.renderAsText) {
        return reconcileState.toString();
    }

    return <CellToggleSelectEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        selectedValue = {reconcileState.toString()}
        items = {reconcileItems}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer(
                args.columnIndex,
                {
                    value: Object.assign({}, value, {
                        reconcileState: e.target.value,
                    }),
                    isEdited: true,
                });
        }}
        errorMsg = {errorMsg}
    />;
}


/**
 * @typedef {object}    CellReconcileStateDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellReconcileStateValue}  value
 */

/**
 * Display renderer for {@link ReconcileState} properties.
 * @param {CellReconcileStateDisplayArgs} args 
 */
export function renderReconcileStateDisplay(args) {
    const { columnInfo, value } = args;
    let reconcileState;
    if (value) {
        reconcileState = value.reconcileState;
    }
    const selectedName = getReconcileStateName(
        reconcileState || ReconcileState.NOT_RECONCILED);
    const selectedValue = userMsg('AccountingCellEditors-reconcile_' + selectedName);
    if (args.renderAsText) {
        return selectedValue;
    }

    return <CellToggleSelectDisplay
        selectedValue = {selectedValue}
        ariaLabel = {columnInfo.ariaLabel}
        classExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
    />;
}


/**
 * Retrieves a column info for {@link ReconcileState} properties.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getReconcileStateColumnInfo(args) {
    return Object.assign({ key: 'reconcile',
        header: {
            label: userMsg('AccountingCellEditors-reconcile'),
            ariaLabel: 'Reconcile',
            classExtras: 'RowTable-header-base Reconcile-base Reconcile-header',
        },
        inputClassExtras: 'Reconcile-base Reconcile-input',
        cellClassName: 'RowTable-cell-base Reconcile-base Reconcile-cell',

        renderDisplayCell: renderReconcileStateDisplay,
        renderEditCell: renderReconcileStateEditor,
    },
    args);
}



/**
 * @typedef {object}    CellQuantityValue
 * @property {QuantityDefinition}   quantityDefinition
 * @property {number|string}   quantityBaseValue    This is normally a string after
 * something is typed in the editor.
 * @property {string}   [tooltip]
 * @property {boolean}  [readOnly]
 */


/**
 * @typedef {object}    CellQuantityEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellQuantityValue}    value
 */

/**
 * The core editor renderer for {@link QuantityDefinition} based
 * quantities. The value property of {@link CellQuantityEditorArgs}
 * is a quantity base value.
 * @param {CellQuantityEditorArgs} args 
 */
export function renderQuantityEditor(args) {
    const { columnInfo, cellEditBuffer, 
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value;
    if (!value) {
        return;
    }

    if (value.readOnly) {
        args = Object.assign({}, args, {
            value: value
        });
        return renderQuantityDisplay(args);
    }

    let errorMsg = args.errorMsg || value.errorMsg;

    let { quantityBaseValue, quantityDefinition, enteredText } = value;

    if (enteredText && (quantityBaseValue !== enteredText)) {
        try {
            // Use the text that was entered if it represents the
            // quantity base value.
            if (getValidQuantityBaseValue(enteredText, quantityDefinition, 
                value.accessor.evalExpression)
             === quantityBaseValue) {
                quantityBaseValue = enteredText;
            }
        }
        catch (e) {
            // Do nothing...
        }
    }

    if (args.renderAsText) {
        return renderCellQuantityEditorAsText({
            quantityDefinition: quantityDefinition,
            value: quantityBaseValue,
        });
    }

    return <CellQuantityEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => quantityEditorOnChange(e, args)}
        errorMsg = {errorMsg}
        evalExpression = {value.accessor.evalExpression}
    />;
}


function quantityEditorOnChange(e, args) {
    let quantityBaseValue = e.target.value.trim();
    const { cellEditBuffer, setCellEditBuffer, } = args;
    const { value } = cellEditBuffer;
    let { quantityDefinition, } = value;
    let { errorMsg } = args;
    try {
        quantityBaseValue = getValidQuantityBaseValue(
            quantityBaseValue,
            quantityDefinition,
            value.accessor.evalExpression,
        );
    }
    catch (e) {
        errorMsg = e.toString();
    }
    setCellEditBuffer(
        args.columnIndex,
        {
            value: Object.assign({}, value, {
                quantityBaseValue: quantityBaseValue,
                quantityDefinition: quantityDefinition,
                enteredText: e.target.value.trim(),
            }),
            errorMsg: errorMsg,
            isEdited: true,
        });
}


/**
 * Optional {@link EditableRowTable~onExitCellEdit} for quantity display.
 * @param {EditableRowTable~onEnterExitCellEditArgs} args 
 */
export function exitQuantityEditorCellEdit(args) {
    const { cellEditBuffer, setCellEditBuffer, } = args;
    const { value } = cellEditBuffer;
    let { quantityBaseValue, enteredText } = value;

    try {
        const quantityDefinition = getQuantityDefinition(value.quantityDefinition);
        if (getValidQuantityBaseValue(enteredText, quantityDefinition, 
            value.accessor.evalExpression)
         !== quantityBaseValue) {
            return;
        }

        enteredText = quantityDefinition.baseValueToValueText(quantityBaseValue);
        if (enteredText !== value.enteredText) {
            setCellEditBuffer(
                args.columnIndex,
                {
                    value: Object.assign({}, value, {
                        quantityBaseValue: quantityBaseValue,
                        quantityDefinition: quantityDefinition,
                        enteredText: enteredText,
                    }),
                    isEdited: true,
                });
        }
    }
    catch (e) {
        //
    }
}


/**
 * The core display renderer for {@link QuantityDefinition} based
 * quantities.
 * @param {CellQuantityEditorArgs} args 
 */
export function renderQuantityDisplay(args) {
    const { columnInfo, value, suffix } = args;
    if (value) {
        const { quantityBaseValue, quantityDefinition, tooltip } = value;

        if (args.renderAsText) {
            return renderCellQuantityDisplayAsText({
                quantityDefinition: quantityDefinition,
                value: quantityBaseValue,
                suffix: suffix,
            });
        }
        return <CellQuantityDisplay
            quantityDefinition = {quantityDefinition}
            value = {quantityBaseValue}
            suffix = {suffix}
            tooltip = {tooltip}
            ariaLabel = {columnInfo.ariaLabel}
            inputClassExtras = {columnInfo.inputClassExtras}
            size = {columnInfo.inputSize}
        />;
    }
}



/**
 * @typedef {object}    CellBalanceValue
 * @property {QuantityDefinition}   [quantityDefinition]
 * @property {Currency} [currency]
 * @property {number|string}   quantityBaseValue    This is normally a string
 * after something is typed in the editor.
 * @property {boolean}  [readOnly]
 */


/**
 * @typedef {object}    CellBalanceDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellBalanceValue}   value
 */

function cellBalanceValueToQuantityValue(value) {
    if (value) {
        let { currency, quantityDefinition }
            = value;
        if (!quantityDefinition && !currency) {
            currency = 'USD';
        }
        if (currency && !quantityDefinition) {
            currency = getCurrency(currency);
            if (!currency) {
                return;
            }
            quantityDefinition = currency.getQuantityDefinition();
            value = Object.assign({}, value, {
                quantityDefinition: quantityDefinition,
            });
        }
    }

    return value;
}


/**
 * Editor renderer for opening balances (the only type of balances 
 * that are editable).
 * @param {CellQuantityEditorArgs}  args
 */
export function renderBalanceEditor(args) {
    let { cellEditBuffer, } = args;
    const value = cellEditBuffer.value;
    if (!value) {
        return;
    }
    if (value.readOnly) {
        args = Object.assign({}, args, {
            value: value
        });
        return renderBalanceDisplay(args);
    }

    cellEditBuffer = Object.assign({}, args.cellEditBuffer);
    const cellEditBuffers = Array.from(args.cellEditBuffers);
    cellEditBuffers[args.columnIndex] = cellEditBuffer;
    args = Object.assign({}, args, {
        cellEditBuffer: cellEditBuffer,
        cellEditBuffers: cellEditBuffers,
    });

    const quantityValue = cellBalanceValueToQuantityValue(value);
    cellEditBuffer.value = Object.assign({}, cellEditBuffer.value, quantityValue);
    return renderQuantityEditor(args);
}


/**
 * Display renderer for balances.
 * @param {CellQuantityDisplayArgs} args
 */
export function renderBalanceDisplay(args) {
    const value = cellBalanceValueToQuantityValue(args.value);
    if (!value) {
        return;
    }

    if (value !== args.value) {
        args = Object.assign({}, args, {
            value: value,
        });
    }

    return renderQuantityDisplay(args);
}


/**
 * Retrieves a column info for balance cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getBalanceColumnInfo(args) {
    return Object.assign({ key: 'balance',
        header: {
            label: userMsg('AccountingCellEditors-balance'),
            ariaLabel: 'Balance',
            classExtras: 'RowTable-header-base Monetary-base Monetary-header '
                + 'Balance-base Balance-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input '
            + 'Balance-base Balance-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell '
            + 'Balance-base Balance-cell',

        renderDisplayCell: renderBalanceDisplay,
        renderEditCell: renderBalanceEditor,
    },
    args);
}


/**
 * Quantity base value useful for sizing balance and other currency values.
 */
export const BalanceSizingBaseValue = 9999999999999;



/**
 * @typedef {object}    CellSplitValue
 * @property {EngineAccessor}   accessor
 * @property {SplitDataItem} split
 * @property {AccountType}  accountType
 * @property {QuantityDefinition}   quantityDefinition
 * @property {'bought'|'sold'|'credit'|'debit'} splitQuantityType 
 * @property {boolean}  [readOnly]
 */

/**
 * @typedef {object}    CellSplitQuantityDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellSplitValue}    value
 */

function getSplitQuantityInfo(value) {
    const { split, accountType, splitQuantityType, } = value;

    let sign;
    switch (splitQuantityType) {
    case 'bought' :
    case 'debit' :
        sign = -1;
        break;

    case 'sold' :
    case 'credit' :
        sign = 1;
        break;

    default :
        console.error('Invalid type arg.');
        return;
    }

    let quantityBaseValue;

    const isLots = (splitQuantityType === 'bought') || (splitQuantityType === 'sold');

    const { lotChanges } = split;
    if (isLots) {
        if (!lotChanges || !lotChanges.length) {
            return;
        }

        quantityBaseValue = 0;
        for (let lotChange of lotChanges) {
            quantityBaseValue += lotChange.quantityBaseValue;
        }
    }
    else {
        quantityBaseValue = split.quantityBaseValue;
    }

    const { category } = A.getAccountType(accountType);
    sign *= category.creditSign;
    if (typeof quantityBaseValue === 'number') {
        quantityBaseValue *= sign;
    }

    return {
        sign: sign,
        isLots: isLots,
        quantityBaseValue: quantityBaseValue,
    };
}


function setSplitQuantityValue(args, quantityValue, index) {
    const isExit = (index === undefined);
    index = (index === undefined) ? args.columnIndex : index;
    const { setCellEditBuffer } = args;
    let cellEditBuffer = (index === undefined) 
        ? args.cellEditBuffer
        : args.cellEditBuffers[index];
    const { value } = cellEditBuffer;
    const { split } = value;
    const newValue = Object.assign({}, value, {
        split: Object.assign({}, split, {
            quantityBaseValue: quantityValue,
        }),
    });
    setCellEditBuffer(index,
        {
            value: newValue,
            isEdited: true,
            isExit: isExit,
        });
}


function getOtherSplitQuantityIndex(args) {
    const { columnInfo } = args;

    const { getColumnInfo } = args;
    const { oppositeColumnInfo } = columnInfo;
    if (oppositeColumnInfo && getColumnInfo) {        
        const { cellEditBuffers } = args;
        for (let i = 0; i < cellEditBuffers.length; ++i) {
            const otherColumnInfo = getColumnInfo(i);
            if (otherColumnInfo.key === oppositeColumnInfo.key) {
                return i;
            }
        }
    }
}


function onChangeSplitQuantity(e, args) {
    const otherIndex = getOtherSplitQuantityIndex(args);
    if (otherIndex !== undefined) {
        setSplitQuantityValue(args, '', otherIndex);
    }

    setSplitQuantityValue(args, e.target.value);
}


/**
 * Resolves the quantity value for a split being edited into an updated split.
 * @param {CellSplitQuantityEditorArgs} args 
 * @param {SplitDataItem} [spiltDataItem]
 * @returns {SplitDataItem}
 * @throws {Exception}  An exception is thrown on any error.
 */
export function resolveSplitQuantityEditValueToSplitDataItem(args, splitDataItem) {
    const { cellEditBuffer } = args;
    const { value } = cellEditBuffer;
    const quantityInfo = getSplitQuantityInfo(value);
    if (!quantityInfo) {
        return;
    }

    let { isLots, quantityBaseValue, sign } = quantityInfo;
    if (isLots) {
        // FIX ME!!!
        return value.split;
    }

    const quantityDefinition = getQuantityDefinition(value.quantityDefinition);
    quantityBaseValue = getValidQuantityBaseValue(quantityBaseValue, 
        quantityDefinition, 
        value.accessor.evalExpression);
    
    return Object.assign({},
        splitDataItem || value.split,
        {
            quantityBaseValue: sign * quantityBaseValue,
        });
}


function exitSplitQuantityCellEdit(args) {
    const { cellEditBuffer, } = args;
    const { value } = cellEditBuffer;

    const quantityInfo = getSplitQuantityInfo(value);
    if (!quantityInfo) {
        return;
    }
    let { isLots, quantityBaseValue, sign, } = quantityInfo;
    if (isLots) {
        // FIX ME!!!
        return value.split;
    }

    try {
        if (typeof quantityBaseValue !== 'number') {
            const quantityDefinition = getQuantityDefinition(value.quantityDefinition);
            quantityBaseValue = getValidQuantityBaseValue(quantityBaseValue, 
                quantityDefinition, 
                value.accessor.evalExpression);
        }
        //quantityBaseValue = quantityDefinition.baseValueToValueText(quantityBaseValue);

        const newValue = (quantityBaseValue === undefined) 
            ? '' 
            : (quantityBaseValue * sign);
        let oldValue = value.split.quantityBaseValue;
        if (oldValue === undefined) {
            oldValue = '';
        }
        
        if (newValue !== oldValue) {
            if (typeof newValue === 'number') {
                if (newValue * sign < 0) {
                    // Negative value, swap to the 'other'' column...
                    const otherIndex = getOtherSplitQuantityIndex(args);
                    if (otherIndex !== undefined) {
                        setSplitQuantityValue(args, '');
                        setSplitQuantityValue(args, newValue, otherIndex);
                        return;
                    }
                }
            }

            setSplitQuantityValue(args, newValue);
        }
    }
    catch (e) {
        //
    }
}

/**
 * @typedef {object}    CellSplitQuantityEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellSplitValue}    value
 */


/**
 * Editor renderer for bought/sold and credit/debit split entries.
 * We don't use {@link renderQuantityEditor} because we handle swapping between
 * credit and debit depending on the sign (handled by
 * {@link onChangeSplitQuantity})
 * @param {CellSplitQuantityEditorArgs}  args
 */
export function renderSplitQuantityEditor(args) {
    const { columnInfo, cellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const { value } = cellEditBuffer;
    if (!value) {
        return;
    }
    if (value.readOnly) {
        args = Object.assign({}, args, {
            value: value
        });
        return renderSplitQuantityDisplay(args);
    }

    const { quantityDefinition } = value;
    const quantityInfo = getSplitQuantityInfo(value);
    if (!quantityInfo) {
        return;
    }

    let { isLots, quantityBaseValue } = quantityInfo;
    if (isLots) {
        // FIX ME!!!
        return;
    }

    if ((typeof quantityBaseValue === 'number') && (quantityBaseValue <= 0)) {
        quantityBaseValue = '';
    }

    if (args.renderAsText) {
        return renderCellQuantityEditorAsText({
            quantityDefinition: quantityDefinition,
            value: quantityBaseValue,
        });
    }

    const evalExpression = (value.accessor) 
        ? value.accessor.evalExpression : undefined;

    return <CellQuantityEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => onChangeSplitQuantity(e, args)}
        errorMsg = {errorMsg}
        evalExpression = {evalExpression}
    />;
}


/**
 * Display renderer for bought/sold split entries.
 * @param {CellSplitQuantityDisplayArgs} args 
 */
export function renderSplitQuantityDisplay(args) {
    const { value } = args;
    if (!value) {
        return;
    }
    const quantityInfo = getSplitQuantityInfo(value);
    if (!quantityInfo) {
        return;
    }
    
    let { sign, isLots, quantityBaseValue } = quantityInfo;
    
    const { accessor, split, } = value;
    const { lotChanges } = split;

    if ((quantityBaseValue < 0) || Object.is(quantityBaseValue, -0)) {
        if (args.isSizeRender) {
            quantityBaseValue = -quantityBaseValue;
        }
        else {
            return;
        }
    }

    const displayComponent = renderQuantityDisplay(Object.assign({},
        args,
        {
            value: {
                quantityBaseValue: quantityBaseValue,
                quantityDefinition: args.value.quantityDefinition,
            }
        }));

    if (args.renderAsText) {
        return displayComponent;
    }

    const lotTooltipEntries = [];
    if (isLots) {
        for (let i = 0; i < lotChanges.length; ++i) {
            const lotChange = lotChanges[i];
            if (lotChange.lotId) {
                const lotDataItem = accessor.getLotDataItemWithId(lotChange.lotId);
                const pricedItemDataItem 
                    = accessor.getPricedItemDataItemWithId(lotDataItem.pricedItemId);
                if (lotDataItem && pricedItemDataItem) {
                    const quantityDefinition = getQuantityDefinition(
                        pricedItemDataItem.quantityDefinition);
                    const value = quantityDefinition.baseValueToValueText(
                        lotChange.quantityBaseValue * sign);
                    lotTooltipEntries.push(
                        <Row key = {i}>
                            <Col classExtras = "Col-auto Text-left">
                                {lotDataItem.description}
                            </Col>
                            <Col classExtras = "Text-right">
                                {value}
                            </Col>
                        </Row>);
                }
            }
        }
    }

    return <Tooltip tooltip = {lotTooltipEntries}>
        {displayComponent}
    </Tooltip>;
}

/**
 * Retrieves a column info for the credit/debit editors of a split.
 * @param {getColumnInfoArgs} args
 * @param {string}  type
 * @param {string} [label]
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getSplitQuantityColumnInfo(args, type, label) {
    label = label || userMsg('AccountingCellEditors-' + type);
    return Object.assign({ key: type,
        header: {
            label: label,
            classExtras: 'RowTable-header-base SplitQuantity-base SplitQuantity-header',
        },
        inputClassExtras: 'SplitQuantity-base SplitQuantity-input',
        cellClassName: 'RowTable-cell-base SplitQuantity-base SplitQuantity-cell',

        renderDisplayCell: renderSplitQuantityDisplay,
        renderEditCell: renderSplitQuantityEditor,
        exitCellEdit: exitSplitQuantityCellEdit,
    },
    args);
}
