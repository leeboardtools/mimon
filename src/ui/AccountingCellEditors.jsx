import React from 'react';
import { userMsg } from '../util/UserMessages';
import { CellTextDisplay, CellTextEditor } from '../util-ui/CellTextEditor';
import { CellSelectDisplay, CellSelectEditor } from '../util-ui/CellSelectEditor';
import { CellDateDisplay } from '../util-ui/CellDateEditor';
import { CellQuantityDisplay, CellQuantityEditor } from '../util-ui/CellQuantityEditor';
import { getQuantityDefinition } from '../util/Quantities';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import { ReconcileState, getReconcileStateName } from '../engine/Transactions';
import { getCurrency } from '../util/Currency';


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
 * @typedef {object}    CellTextEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string}   value
 */

/**
 * The core text editor renderer.
 * @param {CellTextEditorArgs} args 
 */
export function renderTextEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value || '';
    return <CellTextEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {value.toString()}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: e.target.value,
            });
        }}
        errorMsg = {errorMsg}
    />;
}


/**
 * @typedef {object}    CellTextDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string|number}    value
 */

/**
 * The core text display renderer.
 * @param {CellTextDisplayArgs} args 
 */
export function renderTextDisplay(args) {
    const { columnInfo } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    let value = args.value;
    if ((value === undefined) || (value === null)) {
        value = '';
    }
    return <CellTextDisplay
        ariaLabel = {ariaLabel}
        value = {value.toString()}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
    />;
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
 * @typedef {object}    CellNameDescriptionValue
 * @property {string}   [name]
 * @property {string}   [description]
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
    const { cellEditBuffer } = args;
    if (cellEditBuffer) {
        const { value } = cellEditBuffer;
        if (typeof value === 'object') {
            args = Object.assign({}, args, {
                cellEditBuffer: {
                    value: value.name,
                }
            });
        }
    }
    return renderTextEditor(args);
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
            value: value.name
        });

        const { description } = value;
        if (description) {
            const descriptionComponent = renderTextDisplay(args);
            return <div className = "simple-tooltip">
                {descriptionComponent}
                <div className = "simple-tooltiptext">{description}</div>
            </div>;
        }
    }

    return renderTextDisplay(args);
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
    const { cellEditBuffer } = args;
    if (cellEditBuffer) {
        const { value } = cellEditBuffer;
        if (typeof value === 'object') {
            args = Object.assign({}, args, {
                cellEditBuffer: {
                    value: value.description,
                }
            });
        }
    }
    return renderTextEditor(args);
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
        args = Object.assign({}, args, { value: value.description, });

        const { memo } = value;
        if (memo) {
            const descriptionComponent = renderTextDisplay(args);
            return <div className = "simple-tooltip">
                {descriptionComponent}
                <div className = "simple-tooltiptext">{memo}</div>
            </div>;
        }
    }

    return renderTextDisplay(args);
}


/**
 * @typedef {object}    CellDateEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string}   value
 */

/**
 * Editor renderer for {@link YMDDate} properties.
 * @param {CellDateEditorArgs}  args
 */
export function renderDateEditor(args) {
    // TODO:
}

/**
 * @typedef {object}    CellDateDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string}   value
 */

/**
 * Display renderer for {@link YMDDate} properties.
 * @param {CellDateDisplayArgs} args 
 */
export function renderDateDisplay(args) {
    const { columnInfo, value } = args;

    return <CellDateDisplay
        ariaLabel = {columnInfo.ariaLabel}
        value = {value}
        classExtras = {columnInfo.inputClassExtras}
        inputClassExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
    />;
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

    return <CellSelectEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        selectedValue = {value.accountType || A.AccountType.ASSET.name}
        items = {items}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: Object.assign({}, value, {
                    accountType: e.target.value,
                }),
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
    return <CellSelectDisplay
        ariaLabel = {ariaLabel}
        selectedValue = {accountType.description}
        classExtras = {inputClassExtras}
        size = {inputSize}
    />;
}


let reconcileItems;


/**
 * @typedef {object}    CellReconcileStateEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {string}   value
 */

/**
 * Editor renderer for {@link ReconcileState} properties.
 * @param {CellReconcileStateEditorArgs}  args
 */
export function renderReconcileStateEditor(args) {
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = getReconcileStateName(
        cellEditBuffer.value || ReconcileState.NOT_RECONCILED);
    if (!reconcileItems) {
        reconcileItems = [];
        for (let name in ReconcileState) {
            reconcileItems.push([
                name,
                userMsg('CellEditors-reconcile_' + name)
            ]);
        }
    }
    return <CellSelectEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        selectedValue = {value.toString()}
        items = {reconcileItems}
        classExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: e.target.value,
            });
        }}
        errorMsg = {errorMsg}
    />;
}


/**
 * @typedef {object}    CellReconcileStateDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {string}   value
 */

/**
 * Display renderer for {@link ReconcileState} properties.
 * @param {CellReconcileStateDisplayArgs} args 
 */
export function renderReconcileStateDisplay(args) {
    const { columnInfo, value } = args;
    const selectedValue = getReconcileStateName(
        value || ReconcileState.NOT_RECONCILED);
    return <CellSelectDisplay
        selectedValue = {userMsg('CellEditors-reconcile_' + selectedValue)}
        ariaLabel = {columnInfo.ariaLabel}
        classExtras = {columnInfo.inputClassExtras}
        size = {columnInfo.inputSize}
    />;
}



/**
 * @typedef {object}    CellQuantityValue
 * @property {QuantityDefinition}   quantityDefinition
 * @property {number|string}   quantityBaseValue    This is normally a string after
 * something is typed in the editor.
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
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value;
    if (!value) {
        return;
    }

    const { quantityBaseValue, quantityDefinition } = value;

    return <CellQuantityEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: {
                    quantityBaseValue: e.target.value,
                    quantityDefinition: quantityDefinition,
                },
            });
        }}
        errorMsg = {errorMsg}
    />;
}

/**
 * The core display renderer for {@link QuantityDefinition} based
 * quantities.
 * @param {CellQuantityEditorArgs} args 
 */
export function renderQuantityDisplay(args) {
    const { columnInfo, value } = args;
    if (value) {
        const { quantityBaseValue, quantityDefinition } = value;
        return <CellQuantityDisplay
            quantityDefinition = {quantityDefinition}
            quantityBaseValue = {quantityBaseValue}
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
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value;
    if (!value) {
        return;
    }

    const quantitytValue = cellBalanceValueToQuantityValue(value);
    const { quantityBaseValue, quantityDefinition } = quantitytValue;

    return <CellQuantityEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {quantityBaseValue}
        quantityDefinition = {quantityDefinition}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: Object.assign({}, value, {
                    quantityBaseValue: e.target.value,
                }),
            });
        }}
        errorMsg = {errorMsg}
    />;
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
 * Editor renderer for share quantities.
 * @param {CellQuantityEditorArgs}  args
 */
export const renderSharesEditor = renderQuantityEditor;

/**
 * Display renderer for share quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderSharesDisplay = renderQuantityDisplay;


/**
 * @typedef {object}    CellSplitValue
 * @property {EngineAccessor}   accessor
 * @property {SpitDataItem} split
 * @property {AccountType}  accountType
 * @property {QuantityDefinition}   quantityDefinition
 * @property {'bought'|'sold'|'credit'|'debit'} splitQuantityType 
 */



/**
 * @typedef {object}    CellSplitQuantityDisplayArgs
 * @property {ColumnInfo} columnInfo
 * @property {CellSplitValue}    value
 */

function getSplitQuantityInfo(args, value) {
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

    const { category } = accountType;
    sign *= category.creditSign;
    quantityBaseValue *= sign;

    return {
        sign: sign,
        isLots: isLots,
        quantityBaseValue: quantityBaseValue,
    };
}

/**
 * @typedef {object}    CellSplitQuantityEditorArgs
 * {@link CellEditorArgs} where the cellEditBuffer's value property is:
 * @property {CellSplitValue}    value
 */


/**
 * Editor renderer for bought/sold and credit/debit split entries.
 * @param {CellSplitQuantityEditorArgs}  args
 */
export function renderSplitQuantityEditor(args) {
    /*
    const { columnInfo, cellEditBuffer, setCellEditBuffer, errorMsg,
        refForFocus } = args;
    const { ariaLabel, inputClassExtras, inputSize } = columnInfo;
    const value = cellEditBuffer.value;
    if (!value) {
        return;
    }

    const { accessor, split, accountType, splitQuantityType, } = args.value;

    return <CellQuantityEditor
        ariaLabel = {ariaLabel}
        ref = {refForFocus}
        value = {quantityBaseValue}
        inputClassExtras = {inputClassExtras}
        size = {inputSize}
        onChange = {(e) => {
            setCellEditBuffer({
                value: {
                    quantityBaseValue: e.target.value,
                    quantityDefinition: quantityDefinition,
                },
            });
        }}
        errorMsg = {errorMsg}
    />;
    */
}


/**
 * Display renderer for bought/sold split entries.
 * @param {CellSplitQuantityDisplayArgs} args 
 */
export function renderSplitQuantityDisplay(args) {
    if (!args.value) {
        return;
    }
    
    let { sign, isLots, quantityBaseValue } = getSplitQuantityInfo(args,
        args.value);
    
    const { accessor, split, } = args.value;
    const { lotChanges } = split;

    if (quantityBaseValue < 0) {
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
                    lotTooltipEntries.push(<div className = "row" key = {i}>
                        <div className = "col col-sm-auto text-left">
                            {lotDataItem.description}
                        </div>
                        <div className = "col text-right">
                            {value}
                        </div>
                    </div>);
                }
            }
        }
    }

    if (lotTooltipEntries.length) {
        return <div className = "simple-tooltip">
            {displayComponent}
            <div className = "simple-tooltiptext">
                {lotTooltipEntries}
            </div>
        </div>;
    }
    return displayComponent;
}

