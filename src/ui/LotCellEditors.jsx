import React from 'react';
import { userError, userMsg } from '../util/UserMessages';
import { CellSelectDisplay, CellSelectEditor } from '../util-ui/CellSelectEditor';
import * as ACE from './AccountingCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import { getCurrency } from '../util/Currency';
import { getQuantityDefinition } from '../util/Quantities';
import deepEqual from 'deep-equal';

//
// TODO:
// When the action type changes, we need to trigger an render, this implies
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
 * @property {boolean}  [noFees]
 * @property {number}   [sharesNegative]
 * @property {boolean}  [needsCostBasis]
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
        needsCostBasis: true,
    },
    SELL: { name: 'SELL', 
        fromSplitInfo: sellFromSplitInfo, 
        sharesNegative: true,
    },
    REINVESTED_DIVIDEND: { name: 'REINVESTED_DIVIDEND', 
        fromSplitInfo: reinvestedDividendFromSplitInfo,
        needsCostBasis: true,
    },
    // RETURN_OF_CAPITAL: { name: 'RETURN_OF_CAPITAL', noShares: true, },
    SPLIT: { name: 'SPLIT', 
        fromSplitInfo: splitFromSplitInfo,
        noCostBasis: true, 
        noFees: true,
    },
    REVERSE_SPLIT: { name: 'REVERSE_SPLIT', 
        fromSplitInfo: reverseSplitFromSplitInfo,
        noCostBasis: true, 
        noFees: true,
        sharesNegative: true,
    },
    ADD_SHARES: { name: 'ADD_SHARES', 
        fromSplitInfo: addSharesFromSplitInfo,
        needsCostBasis: true,
    },
    REMOVE_SHARES: { name: 'REMOVE_SHARES', 
        fromSplitInfo: removeSharesFromSplitInfo,
        sharesNegative: true,
    },
};

/*
BUY: 
shares | total amount | [fees] | price
- total amount comes from parent
- fees comes from fees expense

SELL: 
lots | total amount | [fees] | price
- total amount goes to parent
- fees comes from fees expense

REINVESTED_DIVIDENDS:
shares | total amount | [fees] | price
- total amount (or shares * price?) is income
- fees comes from fees expense

RETURN_OF_CAPITAL:
total amount

SPLIT:
shares | cash in lieu | [price]
- total shares added
- cash in lieu goes to income?
- what is price for???


REVERSE_SPLIT:
shares | cash in lieu | [price]
- total shares removed
- cash in lieu goes to income?
- what is price for???

ADD_SHARES:
shares | total amount | price
- no fees
- total amount goes to Equity


REMOVE_SHARES:
lots | total amount |  price
- no fees
- total amount goes to Equity
*/


//
//---------------------------------------------------------
//
function loadLotCellEditors() {
    if (!LotActionType.BUY.description) {
        for (const actionType of Object.values(LotActionType)) {
            actionType.description = userMsg('LotCellEditors-actionType-' 
                + actionType.name);
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
        return ((splitDataItem.quantityBaseValue > 0)
         || !splitDataItem.quantityBaseValue)   // The undefined/new transaction case...
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
 * @typedef {object} LotCellEditors~QuantityEditState
 * @private
 * @property {number}   editHit
 * @property {number|undefined} editorBaseValue
 * @property {QuantityDefinition} quantityDefinition
 */

/**
 * @typedef {object} LotCellEditors~LotsEditState
 * ???
 * @private
 */

/**
 * @typedef {object} LotCellEditors~EditStates
 * @private
 * @property {LotCellEditors~QuantityEditState} shares
 * @property {LotCellEditors~QuantityEditState} monetaryAmount
 * @property {LotCellEditors~QuantityEditState} fees
 * @property {LotCellEditors~QuantityEditState} price
 * @property {LotCellEditors`LotEditState} lots
 */

/**
 * @typedef {object} LotCellEditors~SplitInfo
 * @property {EngineAccessor}   accessor
 * @property {TransactionDataItem}  transactionDataItem
 * @property {number}   splitIndex
 * @property {LotActionType}    actionType
 * @property {QuantityDefinition}   currencyQuantityDefinition
 * @property {QuantityDefinition}   sharesQuantityDefinition
 * @property {LotCellEditors~EditStates} editStates
 * @property {number}   nextQuantityEditHit
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

    const actionType = lotActionTypeFromTransactionInfo(splitDataItem);
    if (!actionType) {
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

    const sharesQuantityDefinition = getQuantityDefinition(
        pricedItemDataItem.quantityDefinition);

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
        currencyQuantityDefinition: currencyQuantityDefinition,
        sharesQuantityDefinition: sharesQuantityDefinition,

        actionType: actionType,

        editStates: {},
    };

    setupSplitInfoEditStates(splitInfo);
    return splitInfo;
}


//
//---------------------------------------------------------
//
function setupSplitInfoEditStates(splitInfo) {
    const { splitIndex, 
        sharesQuantityDefinition,
        currencyQuantityDefinition,
        editStates,
        actionType,
    } = splitInfo;

    const { splits } = splitInfo.transactionDataItem;
    const splitDataItem = splits[splitIndex];

    const sharesSign = actionType.sharesNegative ? -1 : 1;

    let sharesBaseValue;
    let monetaryAmountBaseValue;
    let feesBaseValue;
    let priceBaseValue;

    const { lotChanges } = splitDataItem;
    if (lotChanges && lotChanges.length) {
        sharesBaseValue = 0;
        for (let lotChange of lotChanges) {
            sharesBaseValue += lotChange.quantityBaseValue;
        }

        sharesBaseValue *= sharesSign;
    }

    if (splitDataItem.quantityBaseValue !== undefined) {
        monetaryAmountBaseValue = splitDataItem.quantityBaseValue
            * sharesSign;
    }

    const feesSplitIndex = getFeesSplitIndex(splitInfo);
    if (feesSplitIndex >= 0) {
        feesBaseValue = splits[feesSplitIndex].quantityBaseValue;
    }

    if (sharesBaseValue && (monetaryAmountBaseValue !== undefined)) {
        let sharesValue = sharesQuantityDefinition.baseValueToNumber(
            sharesBaseValue);

        let monetaryAmountValue = currencyQuantityDefinition.baseValueToNumber(
            monetaryAmountBaseValue);

        let feesValue = (feesBaseValue)
            ? currencyQuantityDefinition.baseValueToNumber(feesBaseValue)
            : 0;

        let priceValue = (monetaryAmountValue - feesValue) / sharesValue;
        priceBaseValue = currencyQuantityDefinition.quantityFromNumber(priceValue)
            .getBaseValue();
    }

    // Need to initialize...
    editStates.shares = { editHit: 0, 
        editorBaseValue: sharesBaseValue, 
        quantityDefinition: sharesQuantityDefinition,
        name: 'shares',
    };
    editStates.monetaryAmount = { editHit: 0, 
        editorBaseValue: monetaryAmountBaseValue, 
        quantityDefinition: currencyQuantityDefinition,
        name: 'monetaryAmount',
    };
    editStates.fees = { editHit: 0, 
        editorBaseValue: feesBaseValue, 
        quantityDefinition: currencyQuantityDefinition,
        name: 'fees',
    };
    editStates.price = { editHit: -1, 
        editorBaseValue: priceBaseValue, 
        quantityDefinition: currencyQuantityDefinition,
        name: 'price',
    };

    splitInfo.nextQuantityEditHit = 1;
}


//
//---------------------------------------------------------
//
function updateSplitInfoValues(splitInfo) {
    const {
        actionType,
        sharesQuantityDefinition,
        currencyQuantityDefinition,
        editStates,
    } = splitInfo;



    const sharesState = editStates.shares;
    const monetaryAmountState = editStates.monetaryAmount;
    const feesState = editStates.fees;
    const priceState = editStates.price;


    let sharesValue;
    if (typeof sharesState.editorBaseValue === 'number') {
        sharesValue = sharesQuantityDefinition.baseValueToNumber(
            sharesState.editorBaseValue);
    }

    let monetaryAmountValue;
    if (typeof monetaryAmountState.editorBaseValue === 'number') {
        monetaryAmountValue = currencyQuantityDefinition.baseValueToNumber(
            monetaryAmountState.editorBaseValue);
    }

    let feesValue;
    if (typeof feesState.editorBaseValue === 'number') {
        feesValue = currencyQuantityDefinition.baseValueToNumber(
            feesState.editorBaseValue);
    }
    else if (feesState.editorBaseValue === undefined) {
        feesValue = 0;
    }

    let priceValue;
    if (typeof priceState.editorBaseValue === 'number') {
        priceValue = currencyQuantityDefinition.baseValueToNumber(
            priceState.editorBaseValue);
    }


    // We want a ranking based on the hits...
    let mostRecentEditState = editStates.shares;
    let oldestEditState = editStates.shares;

    for (let name in editStates) {
        const editState = editStates[name];
        if (editState.editHit > mostRecentEditState.editHit) {
            mostRecentEditState = editState;
        }
        else if (editState.editHit < oldestEditState.editHit) {
            oldestEditState = editState;
        }
        editState.errorMsg = undefined;
    }


    switch (mostRecentEditState.name) {
    case 'shares' :
        if ((sharesValue !== undefined) && (sharesValue < 0)) {
            mostRecentEditState.errorMsg = userMsg('LotCellEditors-shares_lt_zero');
            return;
        }
        break;

    case 'monetaryAmount' :
        if ((monetaryAmountValue !== undefined) && (monetaryAmountValue < 0)) {
            mostRecentEditState.errorMsg = userMsg(
                'LotCellEditors-monetaryAmount_lt_zero');
            return;
        }
        break;

    case 'fees' :
        break;

    case 'price' :
        if ((priceValue !== undefined) && (priceValue < 0)) {
            mostRecentEditState.errorMsg = userMsg('LotCellEditors-price_lt_zero');
            return;
        }
        break;
    }


    let editStateToCalc;

    if ((sharesValue === undefined)
     && !actionType.noShares) {
        editStateToCalc = editStates.shares;
    }
    else if ((monetaryAmountValue === undefined)
     && !actionType.noCostBasis) {
        editStateToCalc = editStates.monetaryAmount;
    }
    else if ((feesValue === undefined)
     && !actionType.noFees) {
        editStateToCalc = editStates.fees;
    }
    else if ((priceValue === undefined)
     && !actionType.noCostBasis) {
        editStateToCalc = editStates.price;
    }
    else {
        editStateToCalc = oldestEditState;

        switch (mostRecentEditState.name) {
        case 'shares' :
            if (monetaryAmountState.editHit
                && (monetaryAmountState.editHit >= priceState.editHit)) {
                editStateToCalc = priceState;
            }
            else {
                editStateToCalc = monetaryAmountState;
            }
            break;
        
        case 'monetaryAmount' :
            if (feesState
                && (feesState.editHit > sharesState.editHit)
                && (feesState.editHit > priceState.editHit)) {
                editStateToCalc = (sharesState.editHit >= priceState.editHit)
                    ? priceState
                    : sharesState;
            }
            break;
        
        case 'fees' :
            editStateToCalc = monetaryAmountState;
            break;
        
        case 'price' :
            if (monetaryAmountState.editHit > sharesState.editHit) {
                editStateToCalc = sharesState;
            }
            else {
                editStateToCalc = (!feesState
                    || (feesState.editHit >= monetaryAmountState.editHit))
                    ? monetaryAmountState
                    : feesState;
            }
            break;
        }
    }

    // Basic equation:
    // costBasisValue = monetaryAmountValue = sharesValue * priceValue + feesValue

    switch (editStateToCalc.name) {
    case 'shares' :
        if (priceValue
         && (monetaryAmountValue !== undefined)
         && (feesValue !== undefined)) {
            sharesValue = (monetaryAmountValue - feesValue) / priceValue;
            sharesState.editorBaseValue = sharesQuantityDefinition.numberToBaseValue(
                sharesValue);
        }
        break;
    
    case 'monetaryAmount' :
        if ((sharesValue !== undefined)
         && (priceValue !== undefined)
         && (feesValue !== undefined)) {
            monetaryAmountValue = sharesValue * priceValue + feesValue;
            monetaryAmountState.editorBaseValue 
                = currencyQuantityDefinition.numberToBaseValue(
                    monetaryAmountValue);
        }
        break;
    
    case 'fees' :
        if ((monetaryAmountValue !== undefined)
         && (sharesValue !== undefined)
         && (priceValue !== undefined)) {
            feesValue = monetaryAmountValue - sharesValue * priceValue;
            feesState.editorBaseValue = currencyQuantityDefinition.numberToBaseValue(
                feesValue);
        }
        break;
    
    case 'price' :
        if (sharesValue
         && (monetaryAmountValue !== undefined)
         && (feesValue !== undefined)) {
            priceValue = (monetaryAmountValue - feesValue) / sharesValue;
            priceState.editorBaseValue = currencyQuantityDefinition.numberToBaseValue(
                priceValue);
        }
        break;

    }

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
            editStates: Object.assign({}, splitInfo.editStates),
        });
    }
}


//
//---------------------------------------------------------
//
/*
function throwError(columnInfoKey, error) {
    error.columnInfoKey = columnInfoKey;
    throw error;
}
*/


//
//---------------------------------------------------------
//
function getFeesSplitIndex(splitInfo, transactionDataItem) {
    transactionDataItem = transactionDataItem || splitInfo.transactionDataItem;
    const { accessor } = splitInfo;

    const { splits } = transactionDataItem;
    for (let i = 0; i < splits.length; ++i) {
        const split = splits[i];
        const category = accessor.getCategoryOfAccountId(split.accountId);
        if (category === A.AccountCategory.EXPENSE) {
            return i;
        }
    }

    return -1;
}



//
//---------------------------------------------------------
//
function errorWithColumnInfoKey(error, key) {
    error.columnInfoKey = key;
    return error;
}

//
//---------------------------------------------------------
//
function updateTransactionDataItem(splitInfo, transactionDataItem,
    valuesToUse) {

    const { accessor, actionType } = splitInfo;
    let { splitIndex } = splitInfo;
    const { lotType, shares, monetaryAmount, monetaryAmountAccountId,
        fees, price, } = valuesToUse;

    const { splits } = transactionDataItem;

    const feesSplitIndex = getFeesSplitIndex(splitInfo, transactionDataItem);
    let feesBaseValue = (fees) ? fees.editorBaseValue : 0;
    if (feesBaseValue) {
        // Are fees, set the appropriate split.
        if (feesSplitIndex >= 0) {
            splits[feesSplitIndex].quantityBaseValue = feesBaseValue;
        }
        else {
            const splitAccountDataItem 
                = accessor.getAccountDataItemWithId(splitDataItem.accountId);

            splits.push({
                accountId: AH.getDefaultSplitAccountId(accessor, 
                    splitAccountDataItem,
                    AH.DefaultSplitAccountType.FEES_EXPENSE),
                quantityBaseValue: feesBaseValue,
            });
        }
    }
    else {
        // No fees, remove the spilt if there is one.
        if (feesSplitIndex >= 0) {
            splits.splice(feesSplitIndex, 1);
            if (splitIndex > feesSplitIndex) {
                --splitIndex;
            }
        }

        feesBaseValue = 0;
    }

    const splitDataItem = splits[splitIndex];

    splitDataItem.lotTransactionType = lotType;

    const sharesSign = actionType.sharesNegative ? -1 : 1;
    let sharesBaseValue;
    if (shares) {
        const { editorBaseValue } = shares;
        if (typeof editorBaseValue !== 'number') {
            if (monetaryAmount) {
                return errorWithColumnInfoKey(
                    userError('LotCellEditors-shares_monetaryAmount_required'),
                    'shares');
            }
            return errorWithColumnInfoKey(
                userError('LotCellEditors-shares_required'),
                'shares');
        }

        sharesBaseValue = editorBaseValue * sharesSign;
        if (!splitDataItem.lotChanges[0]) {
            splitDataItem.lotChanges[0] = {};
        }
        splitDataItem.lotChanges[0].quantityBaseValue = sharesBaseValue;
    }

    if (monetaryAmount) {
        const { editorBaseValue } = monetaryAmount;
        if (typeof editorBaseValue !== 'number') {
            if (shares) {
                return errorWithColumnInfoKey(
                    userError('LotCellEditors-shares_monetaryAmount_required'),
                    'monetaryAmount');
            }
            return errorWithColumnInfoKey(
                userError('LotCellEditors-monetaryAmount_required'),
                'monetaryAmount');
        }

        let monetaryAmountSplitDataItem;
        if (monetaryAmountAccountId === splitDataItem.accountId) {
            monetaryAmountSplitDataItem = splitDataItem;
        }
        else {
            for (let i = 0; i < splits.length; ++i) {
                const split = splits[i];
                if (split.accountId === monetaryAmountAccountId) {
                    monetaryAmountSplitDataItem = split;
                    break;
                }
            }
        }

        const category = accessor.getCategoryOfAccountId(
            monetaryAmountAccountId);
        monetaryAmountSplitDataItem.quantityBaseValue = monetaryAmount.editorBaseValue
            * category.creditSign;

        
        if (shares) {
            splitDataItem.quantityBaseValue 
                = (monetaryAmount.editorBaseValue - feesBaseValue)
                    * sharesSign;
            
            if (actionType.needsCostBasis) {
                splitDataItem.lotChanges[0].costBasisBaseValue
                    = monetaryAmount.editorBaseValue;
            }
        }
    }

    if (price) {
        // 
    }

    return splitIndex;
}


//
//---------------------------------------------------------
//
function buyFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates } = splitInfo;
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const accountDataItem = accessor.getAccountDataItemWithId(splitDataItem.accountId);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            shares: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: accountDataItem.parentAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
}


//
//---------------------------------------------------------
//
function sellFromSplitInfo(splitInfo, transactionDataItem) {
    // TODO:
    return splitInfo.splitIndex;
}


//
//---------------------------------------------------------
//
function reinvestedDividendFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates } = splitInfo;
    
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const dividendsAccountId = AH.getDefaultSplitAccountId(accessor, 
        splitDataItem.accountId,
        AH.DefaultSplitAccountType.DIVIDENDS_INCOME);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.REINVESTED_DIVIDEND,
            shares: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: dividendsAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
}


//
//---------------------------------------------------------
//
function splitFromSplitInfo(splitInfo, transactionDataItem) {
    const { editStates } = splitInfo;
    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.SPLIT,
            shares: editStates.shares,
            fees: editStates.fees,
        });
}


//
//---------------------------------------------------------
//
function reverseSplitFromSplitInfo(splitInfo, transactionDataItem) {
    const { editStates } = splitInfo;
    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.SPLIT,
            shares: editStates.shares,
            sharesSign: -1,
            fees: editStates.fees,
        });
}


//
//---------------------------------------------------------
//
function addSharesFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates } = splitInfo;
    
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const equityAccountId = AH.getDefaultSplitAccountId(accessor, 
        splitDataItem.accountId,
        AH.DefaultSplitAccountType.EQUITY);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            shares: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: equityAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
}


//
//---------------------------------------------------------
//
function removeSharesFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates } = splitInfo;
    
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const equityAccountId = AH.getDefaultSplitAccountId(accessor, 
        splitDataItem.accountId,
        AH.DefaultSplitAccountType.EQUITY);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            shares: editStates.shares,
            sharesSign: -1,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: equityAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
}


/**
 * @typedef {object}    LotCellEditors~Error
 * The error object returned by transactionDataItemFromSplitInfo, this is
 * an {@link Error} with the following additional properties:
 * @property {string}   columnInfoKey   The key of the column most closely
 * associated with the error, basically where the error ought to be reported.
 */

/**
 * Updates a transaction from the current state of a split info.
 * @param {LotCellEditors~splitInfo} splitInfo 
 * @param {TransactionDataItem} transactionDataItem 
 * @returns {number}
 * @throws {LotCellEditors~Error}
 */
export function transactionDataItemFromSplitInfo(splitInfo, transactionDataItem) {
    return splitInfo.actionType.fromSplitInfo(
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
        return splitInfo.actionType;
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
        const { actionType } = splitInfo;
        return <CellSelectDisplay
            selectedValue = {actionType.description}
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
    if (newAction && (newAction !== oldSplitInfo.actionType)) {
        const newSplitInfo = copySplitInfo(oldSplitInfo);
        newSplitInfo.actionType = newAction;
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
            errorMsg,
            refForFocus 
        } = args;

        const { ariaLabel, inputClassExtras, inputSize } = columnInfo;

        const items = [];
        for (const actionType of Object.values(LotActionType)) {
            items.push([actionType.name, actionType.description]);
        }

        return <CellSelectEditor
            ariaLabel = {ariaLabel}
            ref = {refForFocus}
            selectedValue = {splitInfo.actionType.name}
            items = {items}
            classExtras = {inputClassExtras}
            size = {inputSize}
            onChange = {(e) => onActionChange(e, args, columnInfoArgs)}
            errorMsg = {errorMsg}
        />;
    }
}

/**
 * Retrieves a column info for lot actionType cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getActionColumnInfo(args) {
    loadLotCellEditors();

    const columnInfoArgs = args;
    return Object.assign({ key: 'actionType',
        header: {
            label: userMsg('LotCellEditors-actionType'),
            ariaLabel: 'Action',
            classExtras: 'header-base actionType-base actionType-header',
        },
        inputClassExtras: 'actionType-base actionType-input',
        cellClassName: 'cell-base actionType-base actionType-cell',

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
function getQuantityEditorCellValue(editorName, args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { editStates } = splitInfo;
        if (editStates) {
            const editorState = editStates[editorName];
            if (editorState) {
                const { editorBaseValue } = editorState;
                return {
                    quantityBaseValue: (editorBaseValue === undefined)
                        ? '' : editorBaseValue,
                    quantityDefinition: editorState.quantityDefinition,
                    enteredText: editorState.enteredText,
                    errorMsg: editorState.errorMsg,
                };
            }
        }
    }
}

function saveQuantityEditorCellValue(editorName, args, columnInfoArgs) {
    // splitInfo is already updated...
}


//
//---------------------------------------------------------
//
function renderQuantityDisplay(editorName, args, columnInfoArgs) {
    return ACE.renderQuantityDisplay(args);
}


//
//---------------------------------------------------------
//
function renderQuantityEditor(editorName, args, columnInfoArgs) {

    const { setCellEditBuffer } = args;
    args = Object.assign({}, args, {
        setCellEditBuffer: (cellEditBuffer, index) => {
            const { isEdited } = cellEditBuffer;
            delete cellEditBuffer.isEdited;

            const { value } = cellEditBuffer;
            let originalSplitInfo = getSplitInfo(args, columnInfoArgs);
            if (isEdited && originalSplitInfo) {
                const splitInfo = copySplitInfo(originalSplitInfo);

                const { editStates, nextQuantityEditHit } = splitInfo;
                const editorState = editStates[editorName];
                if (typeof value.quantityBaseValue === 'number') {
                    // Valid value, try updating things...
                    if (editorState.editorBaseValue !== value.quantityBaseValue) {
                        editorState.editorBaseValue = value.quantityBaseValue;
                        editorState.enteredText = value.enteredText;

                        editorState.editHit = nextQuantityEditHit;
                        ++splitInfo.nextQuantityEditHit;

                        updateSplitInfoValues(splitInfo);
                    }
                }
                else {
                    // Invalid value, mark editor as potentially getting update.
                    editorState.editHit = -1;
                }

                if (!deepEqual(splitInfo, originalSplitInfo)) {
                    updateSplitInfo(args, columnInfoArgs, splitInfo);
                }
            }

            setCellEditBuffer(cellEditBuffer, index);
        }
    });
    
    return ACE.renderQuantityEditor(args);
}


//
//---------------------------------------------------------
//
function getQuantityEditorColumnInfo(editorName, args, className) {
    className = className || editorName;
    const columnInfoArgs = args;
    const label = userMsg('LotCellEditors-' + editorName);
    return Object.assign({ key: editorName,
        header: {
            label: label,
            ariaLabel: label,
            classExtras: 'header-base ' + className + '-base '
                + className + '-header',
        },
        inputClassExtras: className + '-base ' + className + '-input',
        cellClassName: 'cell-base ' + className + '-base ' + className + '-cell',

        getCellValue: (args) => 
            getQuantityEditorCellValue(editorName, args, columnInfoArgs),
        saveCellValue: (args) => 
            saveQuantityEditorCellValue(editorName, args, columnInfoArgs),
        renderDisplayCell: (args) => 
            renderQuantityDisplay(editorName, args, columnInfoArgs),
        renderEditCell: (args) => 
            renderQuantityEditor(editorName, args, columnInfoArgs),
    },
    args);
}


/**
 * Retrieves a column info for share quantity cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getSharesColumnInfo(args) {
    return getQuantityEditorColumnInfo('shares', args);
}


/**
 * Retrieves a column info for monetary amount cells.
 * This is primarily the total currency amount.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getMonetaryAmountColumnInfo(args) {
    return getQuantityEditorColumnInfo('monetaryAmount', args, 'monetary');
}


/**
 * Retrieves a column info for fees/commissions cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getFeesColumnInfo(args) {
    return getQuantityEditorColumnInfo('fees', args, 'monetary');
}


/**
 * Retrieves a column info for share price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getPriceColumnInfo(args) {
    return getQuantityEditorColumnInfo('price', args, 'monetary');
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