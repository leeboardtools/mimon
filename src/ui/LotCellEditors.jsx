import React from 'react';
import { userMsg, userError } from '../util/UserMessages';
import { CellSelectDisplay, CellSelectEditor } from '../util-ui/CellSelectEditor';
import * as ACE from './AccountingCellEditors';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import { getCurrency } from '../util/Currency';
import { getQuantityDefinition } from '../util/Quantities';

//
// TODO:
// When the action changes, we need to trigger an render, this implies
// we have a callback for doing so.

/**
 * The lot cell editors are a bit different from the Accounting Cell Editors,
 * this is necessary because the lot cell editors need to work in concert with each other
 * while the accounting cell editors are independent.
 */

/**
 * @typedef {object}    LotActionTypeDef
 * @property {string}   name
 * @property {string}   description
 * @property {boolean}  [noShares]
 * @property {boolean}  [noCostBasis]
 */


/**
 * Enumeration for the lot action types
 * @readonly
 * @enum {LotActionType}
 * @property {LotActionTypeDef}   BUY
 * @property {LotActionTypeDef}   SELL
 * @property {LotActionTypeDef}   REINVESTED_DIVIDEND
 * @property {LotActionTypeDef}   SPLIT
 * @property {LotActionTypeDef}   REVERSE_SPLIT
 * @property {LotActionTypeDef}   ADD_SHARES
 * @property {LotActionTypeDef}   REMOVE_SHARES
 */
export const LotActionType = {
    BUY: { name: 'BUY', 
        fromSplitInfo: buyFromSplitInfo, 
    },
    SELL: { name: 'SELL', 
        fromSplitInfo: sellFromSplitInfo, 
    },
    REINVESTED_DIVIDEND: { name: 'REINVESTED_DIVIDEND', 
        fromSplitInfo: reinvestedDividendFromSplitInfo,
    },
    // RETURN_OF_CAPITAL: { name: 'RETURN_OF_CAPITAL', noShares: true, },
    SPLIT: { name: 'SPLIT', 
        fromSplitInfo: splitFromSplitInfo,
        noCostBasis: true, 
    },
    REVERSE_SPLIT: { name: 'REVERSE_SPLIT', 
        fromSplitInfo: reverseSplitFromSplitInfo,
        noCostBasis: true, },
    ADD_SHARES: { name: 'ADD_SHARES', 
        fromSplitInfo: addSharesFromSplitInfo,
    },
    REMOVE_SHARES: { name: 'REMOVE_SHARES', 
        fromSplitInfo: removeSharesFromSplitInfo,
    },
};


//
//---------------------------------------------------------
//
function loadLotCellEditors() {
    if (!LotActionType.BUY.description) {
        for (const action of Object.values(LotActionType)) {
            action.description = userMsg('LotCellEditors-action-' + action.name);
        }
    }
}


//
//---------------------------------------------------------
//
function lotActionTypeFromTransactionInfo(splitDataItem) {
    if (!splitDataItem) {
        return;
    }

    switch (splitDataItem.lotTransactionType) {
    case T.LotTransactionType.BUY_SELL.name :
        return (splitDataItem.quantityBaseValue > 0)
            ? LotActionType.BUY
            : LotActionType.SELL;
    
    case T.LotTransactionType.REINVESTED_DIVIDEND.name :
        return LotActionType.REINVESTED_DIVIDEND;
    
    case T.LotTransactionType.RETURN_OF_CAPITAL.name :
        return LotActionType.RETURN_OF_CAPITAL;
    
    case T.LotTransactionType.SPLIT.name :
    {
        const { lotChanges } = splitDataItem;
        for (let i = 0; i < lotChanges.length; ++i) {
            return (lotChanges[i].quantityBaseValue > 0)
                ? LotActionType.SPLIT
                : LotActionType.REVERSE_SPLIT;
        }
    }
    }
}


/**
 * @typedef {object} LotCellEditors~Lots
 * @property {number}   quantityBaseValue
 * @property {QuantityDefinition}   quantityDefinition
 */

/**
 * @typedef {object} LotCellEditors~Monetary
 * @property {QuantityDefinition}   quantityDefintion
 * @property {number}   marketValueBaseValue
 * @property {number}   costBasisBaseValue
 * @property {number}   priceBaseValue
 */


/**
 * @typedef {object} LotCellEditors~SplitInfo
 * @property {EngineAccessor}   accessor
 * @property {TransactionDataItem}  transactionDataItem
 * @property {number}   splitIndex
 * @property {SplitDataItem}    splitDataItem
 * @property {SplitDataItem}    feesSplitDataItem
 * @property {LotActionType}    lotActionType
 * @property {AccountDataItem}  splitAccountDataItem
 * @property {PricedItemDataItem}   pricedItemDataItem
 * @property {LotCellEditors~Lots}  lots
 * @property {LotCellEditors~Monetary}  monetary
 */

/**
 * Creates the {@link LotCellEditors~SplitInfo} object used by the lot cell editors.
 * @param {TransactionDataItem} transactionDataItem 
 * @param {number} splitIndex 
 * @param {EngineAccessor} accessor 
 * @returns {LotCellEditors~SplitInfo}
 */
export function createSplitInfo(transactionDataItem, splitIndex, accessor) {
    if (!transactionDataItem || !accessor) {
        return;
    }

    transactionDataItem = T.getTransactionDataItem(transactionDataItem, true);

    const { splits } = transactionDataItem;

    const splitDataItem = splits[splitIndex];
    if (!splitDataItem) {
        return;
    }

    const action = lotActionTypeFromTransactionInfo(splitDataItem);
    if (!action) {
        return;
    }

    const splitAccountDataItem 
        = accessor.getAccountDataItemWithId(splitDataItem.accountId);
    if (!splitAccountDataItem) {
        return;
    }

    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(
        splitAccountDataItem.pricedItemId);
    if (!pricedItemDataItem) {
        return;
    }

    let currency = pricedItemDataItem.currency || accessor.getBaseCurrencyCode();
    currency = getCurrency(currency);
    if (!currency) {
        return;
    }
    const currencyQuantityDefinition = currency.getQuantityDefinition();

    const splitInfo = {
        accessor: accessor,
        transactionDataItem: transactionDataItem,
        splitIndex: splitIndex,
        splitDataItem: splitDataItem,
        action: action,
        splitAccountDataItem: splitAccountDataItem,
        pricedItemDataItem: pricedItemDataItem,
        lots: {
            quantityDefinition: pricedItemDataItem.quantityDefinition,
        },
        monetary: {
            quantityDefinition: currencyQuantityDefinition,
        },
    };

    return updateSplitInfoValues(splitInfo);
}


//
//---------------------------------------------------------
//
function updateSplitInfoValues(splitInfo) {
    const { splitIndex, accessor, action,
        splitDataItem, pricedItemDataItem,
        lots, monetary,
    } = splitInfo;
    const { splits } = splitInfo.transactionDataItem;

    let sharesBaseValue = 0;
    const { lotChanges } = splitDataItem;
    if (lotChanges) {
        for (let lotChange of lotChanges) {
            sharesBaseValue += lotChange.quantityBaseValue;
        }
    }

    let feesSplitDataItem;
    for (let i = 0; i < splits.length; ++i) {
        if (i === splitIndex) {
            continue;
        }

        const split = splits[i];
        const accountDataItem = accessor.getAccountDataItemWithId(split.accountId);
        const accountType = A.getAccountType(accountDataItem.type);
        if (accountType.category === A.AccountCategory.EXPENSE) {
            feesSplitDataItem = split;
            break;
        }
    }

    const currencyQuantityDefinition = monetary.quantityDefinition;
    let costBasisBaseValue;
    let priceBaseValue;
    if (!action.noCostBasis) {
        //
        // Computation rules:
        // Have:
        //  - shares, costBasis => calc priceBaseValue
        //  - shares, price => costBasis
        //  - costBasis, price => shares

        costBasisBaseValue = splitDataItem.quantityBaseValue;
        if (feesSplitDataItem) {
            costBasisBaseValue += feesSplitDataItem.quantityBaseValue;
        }

        if (sharesBaseValue) {
            // priceBaseValue calculated...
            const lotQuantityDefinition = getQuantityDefinition(
                pricedItemDataItem.quantityDefinition);
            const lotQuantity = lotQuantityDefinition.fromBaseValue(
                sharesBaseValue);

            let totalPriceQuantity = currencyQuantityDefinition.fromBaseValue(
                splitDataItem.quantityBaseValue);
            
            const price = totalPriceQuantity.toNumber() / lotQuantity.toNumber();
            priceBaseValue = currencyQuantityDefinition.quantityFromNumber(price)
                .getBaseValue();
        }
    }

    let marketValueBaseValue = 0;
    lots.quantityBaseValue = sharesBaseValue;
    monetary.marketValueBaseValue = marketValueBaseValue;
    monetary.costBasisBaseValue = costBasisBaseValue;
    monetary.priceBaseValue = priceBaseValue;

    splitInfo.feesSplitDataItem = feesSplitDataItem;


    return splitInfo;
}


/**
 * Creates a copy of a split info object.
 * @param {LotCellEditors~SplitInfo} splitInfo 
 * @returns {LotCellEditors~SplitInfo}
 */
export function copySplitInfo(splitInfo) {
    if (splitInfo) {
        return Object.assign({}, splitInfo, {
            lots: Object.assign({}, splitInfo.lots),
            monetary: Object.assign({}, splitInfo.monetary),
        });
    }
}


//
//---------------------------------------------------------
//
function updateFeesFromSplitInfo(splitInfo, transactionDataItem) {
    // Fees or no fees?
    // If fees,
    //      add a new split item if necessary.
    // No fees
    //      If there's fees, remove that split item.
}


//
//---------------------------------------------------------
//
function buyFromSplitInfo(splitInfo, transactionDataItem) {
    updateFeesFromSplitInfo(splitInfo, transactionDataItem);

    // Update lot changes
    // Update 
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function sellFromSplitInfo(splitInfo, transactionDataItem) {
    updateFeesFromSplitInfo(splitInfo, transactionDataItem);
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function reinvestedDividendFromSplitInfo(splitInfo, transactionDataItem) {
    updateFeesFromSplitInfo(splitInfo, transactionDataItem);
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function splitFromSplitInfo(splitInfo, transactionDataItem) {
    updateFeesFromSplitInfo(splitInfo, transactionDataItem);
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function reverseSplitFromSplitInfo(splitInfo, transactionDataItem) {
    updateFeesFromSplitInfo(splitInfo, transactionDataItem);
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function addSharesFromSplitInfo(splitInfo, transactionDataItem) {
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function removeSharesFromSplitInfo(splitInfo, transactionDataItem) {
    return splitInfo.splitIndex;
}


/**
 * Updates a transaction from the current state of a split info.
 * @param {LotCellEditors~splitInfo} splitInfo 
 * @param {TransactionDataItem} transactionDataItem 
 * @throws Error
 */
export function transactionDataItemFromSplitInfo(splitInfo, transactionDataItem) {
    return splitInfo.action.fromSplitInfo(
        splitInfo, transactionDataItem);
}


//
//---------------------------------------------------------
//
function getSplitInfo(args, columnInfoArgs) {
    const { getSplitInfo } = columnInfoArgs;
    if (getSplitInfo) {
        return getSplitInfo(args);
    }
}


function updateSplitInfo(args, columnInfoArgs, newSplitInfo) {
    const { updateSplitInfo } = columnInfoArgs;
    if (updateSplitInfo) {
        return updateSplitInfo(args, newSplitInfo);
    }
}


//
//---------------------------------------------------------
//
function getActionCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        return splitInfo.action;
    }
}


//
//---------------------------------------------------------
//
function renderActionDisplay(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {

        const { columnInfo, } = args;
        const { ariaLabel, inputSize } = columnInfo;
        let classExtras = columnInfo.inputClassExtras;
        const { action } = splitInfo;
        return <CellSelectDisplay
            selectedValue = {action.description}
            ariaLabel = {ariaLabel}
            classExtras = {classExtras}
            size = {inputSize}
        />;
    }
}


function saveActionCellValue(args, columnInfoArgs) {

}

function onActionChange(e, args, columnInfoArgs) {
    const oldSplitInfo = getSplitInfo(args, columnInfoArgs);
    const newAction = LotActionType[e.target.value];
    if (newAction && (newAction !== oldSplitInfo.action)) {
        const newSplitInfo = copySplitInfo(oldSplitInfo);
        newSplitInfo.action = newAction;
        updateSplitInfo(args, columnInfoArgs, newSplitInfo);
    }
}


//
//---------------------------------------------------------
//
function renderActionEditor(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { 
            columnInfo, 
            //cellEditBuffer, 
            errorMsg,
            refForFocus 
        } = args;

        const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

        const items = [];
        for (const action of Object.values(LotActionType)) {
            items.push([action.name, action.description]);
        }

        return <CellSelectEditor
            ariaLabel = {ariaLabel}
            ref = {refForFocus}
            selectedValue = {splitInfo.action.name}
            items = {items}
            classExtras = {inputClassExtras}
            size = {inputSize}
            onChange = {(e) => onActionChange(e, args, columnInfoArgs)}
            errorMsg = {errorMsg}
        />;
    }
}

/**
 * Retrieves a column info for lot action cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getActionColumnInfo(args) {
    loadLotCellEditors();

    const columnInfoArgs = args;
    return Object.assign({ key: 'action',
        header: {
            label: userMsg('LotCellEditors-action'),
            ariaLabel: 'Action',
            classExtras: 'header-base action-base action-header',
        },
        inputClassExtras: 'action-base action-input',
        cellClassName: 'cell-base action-base action-cell',

        getCellValue: (args) => getActionCellValue(args, columnInfoArgs),
        saveCellValue: (args) => saveActionCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderActionDisplay(args, columnInfoArgs),
        renderEditCell: (args) => renderActionEditor(args, columnInfoArgs),
    },
    args);
}



//
//---------------------------------------------------------
//
function getSharesCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { lots } = splitInfo;
        return {
            quantityBaseValue: Math.abs(lots.quantityBaseValue),
            quantityDefinition: lots.quantityDefinition,
        };
    }
}


//
//---------------------------------------------------------
//
function isSharesUsed(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { action } = splitInfo;
        return !action.noShares;
    }
}


//
//---------------------------------------------------------
//
function renderQuantityEditor(editor, args, columnInfoArgs) {

    const { setCellEditBuffer } = args;
    args = Object.assign({}, args, {
        setCellEditBuffer: (value, index) => {
            setCellEditBuffer(value, index);

            let splitInfo = getSplitInfo(args, columnInfoArgs);
            if (splitInfo) {
                if (editor !== splitInfo.lastEditor) {
                    splitInfo = copySplitInfo(splitInfo);
                    splitInfo.secondToLastEditor = splitInfo.lastEditor;
                    splitInfo.lastEditor = editor;
                    updateSplitInfo(args, columnInfoArgs, splitInfo);
                }
            }
        }
    });
    
    return ACE.renderQuantityEditor(args);
}


//
//---------------------------------------------------------
//
function saveSharesCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        let { value } = args.cellEditBuffer;
        splitInfo.lots.quantityBaseValue = value.quantityBaseValue;
    }
}


//
//---------------------------------------------------------
//
function renderSharesDisplay(args, columnInfoArgs) {
    if (isSharesUsed(args, columnInfoArgs)) {
        return ACE.renderQuantityDisplay(args);
    }
}


//
//---------------------------------------------------------
//
function renderSharesEditor(args, columnInfoArgs) {
    if (isSharesUsed(args, columnInfoArgs)) {
        return renderQuantityEditor('shares', args, columnInfoArgs);
    }
}


/**
 * Retrieves a column info for share quantity cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getSharesColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'shares',
        header: {
            label: userMsg('LotCellEditors-shares'),
            ariaLabel: 'Shares',
            classExtras: 'header-base shares-base shares-header',
        },
        inputClassExtras: 'shares-base shares-input',
        cellClassName: 'cell-base shares-base shares-cell',

        getCellValue: (args) => getSharesCellValue(args, columnInfoArgs),
        saveCellValue: (args) => saveSharesCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderSharesDisplay(args, columnInfoArgs),
        renderEditCell: (args) => renderSharesEditor(args, columnInfoArgs),
    },
    args);
}


//
//---------------------------------------------------------
//
function getMonetaryAmountCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { monetary } = splitInfo;
        if (monetary.costBasisBaseValue !== undefined) {
            return {
                quantityBaseValue: Math.abs(monetary.costBasisBaseValue),
                quantityDefinition: monetary.quantityDefinition,
            };
        }
    }
}

function saveMonetaryAmountCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    const { cellEditBuffer, saveBuffer } = args;
    if (splitInfo && saveBuffer) {
        let { value } = cellEditBuffer;
        splitInfo.monetary.costBasisBaseValue = value.quantityBaseValue;
        if (splitInfo.action === LotActionType.SELL) {
            splitInfo.monetary.costBasisBaseValue 
                = -splitInfo.monetary.costBasisBaseValue;
        }
    }
}


//
//---------------------------------------------------------
//
function renderMonetaryAmountDisplay(args, columnInfoArgs) {
    return ACE.renderQuantityDisplay(args);
}


//
//---------------------------------------------------------
//
function renderMonetaryAmountEditor(args, columnInfoArgs) {
    return renderQuantityEditor('monetaryAmount', args, columnInfoArgs);    
}


/**
 * Retrieves a column info for monetary amount cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getMonetaryAmountColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'monetaryAmount',
        header: {
            label: userMsg('LotCellEditors-monetaryAmount'),
            ariaLabel: 'Price',
            classExtras: 'header-base monetary-base + monetary-header '
                + 'monetaryAmount-base monetaryAmount-header',
        },
        inputClassExtras: 'monetary-base monetary-input ' 
            + ' monetaryAmount-base monetaryAmount-input',
        cellClassName: 'cell-base monetary-base + monetary-cell '
            + ' monetaryAmount-base monetaryAmount-cell',

        getCellValue: (args) => getMonetaryAmountCellValue(args, columnInfoArgs),
        saveCellValue: (args) => saveMonetaryAmountCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderMonetaryAmountDisplay(args, columnInfoArgs),
        renderEditCell: (args) => renderMonetaryAmountEditor(args, columnInfoArgs),
    },
    args);
}


//
//---------------------------------------------------------
//
function getFeesCommissionsCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo && splitInfo.feesSplitDataItem) {
        const { feesSplitDataItem, monetary } = splitInfo;
        return {
            quantityBaseValue: Math.abs(feesSplitDataItem.quantityBaseValue),
            quantityDefinition: monetary.quantityDefinition,
        };
    }
}


//
//---------------------------------------------------------
//
function saveFeesCommissionsCellValue(args, columnInfoArgs) {
    const { cellEditBuffer, saveBuffer } = args;
    if (saveBuffer) {
        console.log('saveFeesCommissionsCellValue: ' + JSON.stringify(cellEditBuffer));
        //const { newTransactionDataItem } = saveBuffer;
        //let { value } = cellEditBuffer;
        //newTransactionDataItem.ymdDate = value.ymdDate;
    }

}


//
//---------------------------------------------------------
//
function renderFeesCommissionsDisplay(args, columnInfoArgs) {
    return ACE.renderQuantityDisplay(args);
}


//
//---------------------------------------------------------
//
function renderFeesCommissionsEditor(args, columnInfoArgs) {
    return ACE.renderQuantityEditor(args);
}


/**
 * Retrieves a column info for fees/commissions cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getFeesCommissionsColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'fees',
        header: {
            label: userMsg('LotCellEditors-fees'),
            ariaLabel: 'Fees and Commissions',
            classExtras: 'header-base monetary-base monetary-header '
                + 'fees-base fees-header',
        },
        inputClassExtras: 'monetary-base monetary-input '
            + 'fees-base fees-input',
        cellClassName: 'cell-base monetary-base monetary-cell '
            + 'fees-base fees-cell',

        getCellValue: (args) => getFeesCommissionsCellValue(args, columnInfoArgs),
        saveCellValue: (args) => saveFeesCommissionsCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderFeesCommissionsDisplay(args, columnInfoArgs),
        renderEditCell: (args) => renderFeesCommissionsEditor(args, columnInfoArgs),
    },
    args);
}


//
//---------------------------------------------------------
//
function getPriceCellValue(args, columnInfoArgs) {
    if (isSharesUsed(args, columnInfoArgs)) {
        const splitInfo = getSplitInfo(args, columnInfoArgs);
        const { monetary } = splitInfo;
        if (monetary.priceBaseValue) {
            return {
                quantityBaseValue: Math.abs(monetary.priceBaseValue),
                quantityDefinition: monetary.quantityDefinition,
            };
        }
    }

}


//
//---------------------------------------------------------
//
function renderPriceDisplay(args, columnInfoArgs) {
    return ACE.renderQuantityDisplay(args);    
}


//
//---------------------------------------------------------
//
function renderPriceEditor(args, columnInfoArgs) {
    if (isSharesUsed(args, columnInfoArgs)) {
        return renderQuantityEditor('price', args, columnInfoArgs);
    }
}


/**
 * Retrieves a column info for share price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getPriceColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'price',
        header: {
            label: userMsg('LotCellEditors-price'),
            ariaLabel: 'Price',
            classExtras: 'header-base monetary-base monetary-header '
                + 'price-base price-header',
        },
        inputClassExtras: 'monetary-base monetary-input '
            + 'price-base price-input',
        cellClassName: 'cell-base monetary-base monetary-cell '
            + 'price-base price-cell',

        getCellValue: (args) => getPriceCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderPriceDisplay(args, columnInfoArgs),
        renderEditCell: (args) => renderPriceEditor(args, columnInfoArgs),
    },
    args);
}


//
//---------------------------------------------------------
//
function getMarketValueCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { monetary } = splitInfo;
        return {
            quantityBaseValue: monetary.marketValueBaseValue,
            quantityDefinition: monetary.quantityDefinition,
        };
    }
}


//
//---------------------------------------------------------
//
const renderMarketValueDisplay = ACE.renderQuantityDisplay;
//function renderMarketValueDisplay(args, columnInfoArgs) {}


//
//---------------------------------------------------------
//
// No editing of market value
//function renderMarketValueEditor(args, columnInfoArgs) {}

/**
 * Retrieves a column info for market value cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getMarketValueColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'marketValue',
        header: {
            label: userMsg('LotCellEditors-marketValue'),
            ariaLabel: 'Market Value',
            classExtras: 'header-base monetary-base monetary-header '
                + 'marketValue-base marketValue-header',
        },
        inputClassExtras: 'monetary-base monetary-input '
            + 'marketValue-base marketValue-input',
        cellClassName: 'cell-base monetary-base monetary-cell '
            + 'marketValue-base marketValue-cell',

        getCellValue: (args) => getMarketValueCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) => renderMarketValueDisplay(args, columnInfoArgs),
        //renderEditCell: (args) => renderMarketValueEditor(args, columnInfoArgs),
    },
    args);
}



/**
 * Display renderer for share quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderTotalSharesDisplay = ACE.renderQuantityDisplay;


/**
 * Retrieves a column info for share totals cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalSharesColumnInfo(args) {
    return Object.assign({ key: 'totalShares',
        header: {
            label: userMsg('LotCellEditors-totalShares'),
            ariaLabel: 'Total Shares',
            classExtras: 'header-base shares-base shares-header',
        },
        inputClassExtras: 'shares-base shares-input',
        cellClassName: 'cell-base shares-base shares-cell',

        renderDisplayCell: renderTotalSharesDisplay,
    },
    args);
}