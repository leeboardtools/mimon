import React from 'react';
import { userError, userMsg } from '../util/UserMessages';
import { CellSelectDisplay, CellSelectEditor } from '../util-ui/CellSelectEditor';
import * as ACE from './AccountingCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as LTH from '../tools/LotTransactionHelpers';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as LS from '../engine/LotStates';
import { getCurrency } from '../util/Currency';
import { getQuantityDefinition } from '../util/Quantities';
import { CellButton } from '../util-ui/CellButton';
import deepEqual from 'deep-equal';
import { LotsSelectionEditor } from './LotsSelectionEditor';

//
// TODO:
// When the action type changes, we need to trigger a render, this implies
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
 * @property {boolean}  [noMonetaryAmount]
 * @property {boolean}  [noFees]
 * @property {boolean}  [noSplitQuantity]
 * @property {number}   [sharesNegative]
 * @property {boolean}  [needsCostBasis]
 * @property {boolean}  [hasSelectedLots]
 * @property {boolean}  [hasLotChanges]
 * @property {boolean}  [hasModifyLotIds]
 * @property {AutoLotType}  [autoLotType]
 * @property {boolean}  [monetaryAmountIsCostBasisChanges]
 */


/**
 * Enumeration for the lot action types
 * @readonly
 * @enum {LotActionType}
 * @property {LotActionTypeDef}   BUY
 * @property {LotActionTypeDef}   SELL_FIFO
 * @property {LotActionTypeDef}   SELL_LIFO
 * @property {LotActionTypeDef}   SELL_BY_LOTS
 * @property {LotActionTypeDef}   REINVESTED_DIVIDEND
 * @property {LotActionTypeDef}   SPLIT
 * @property {LotActionTypeDef}   REVERSE_SPLIT
 * @property {LotActionTypeDef}   ADD_SHARES
 * @property {LotActionTypeDef}   REMOVE_SHARES_FIFO
 * @property {LotActionTypeDef}   REMOVE_SHARES_LIFO
 * @property {LotActionTypeDef}   REMOVE_SHARES_BY_LOTS
 * @property {LotActionTypeDef}   RETURN_OF_CAPITAL
 */
export const LotActionType = {
    BUY: { name: 'BUY', 
        fromSplitInfo: buyFromSplitInfo, 
        needsCostBasis: true,
        hasModifyLotIds: true,
    },
    SELL_FIFO: { name: 'SELL_FIFO', 
        fromSplitInfo: sellFromSplitInfo, 
        sharesNegative: true,
        autoLotType: T.AutoLotType.FIFO,
    },
    SELL_LIFO: { name: 'SELL_LIFO', 
        fromSplitInfo: sellFromSplitInfo, 
        sharesNegative: true,
        autoLotType: T.AutoLotType.LIFO,
    },
    SELL_BY_LOTS: { name: 'SELL_BY_LOTS', 
        fromSplitInfo: sellFromSplitInfo, 
        sharesNegative: true,
        hasSelectedLots: true,
        hasLotChanges: true,
    },
    REINVESTED_DIVIDEND: { name: 'REINVESTED_DIVIDEND', 
        fromSplitInfo: reinvestedDividendFromSplitInfo,
        needsCostBasis: true,
        hasModifyLotIds: true,
    },
    SPLIT: { name: 'SPLIT', 
        fromSplitInfo: asyncSplitFromSplitInfo,
        noCostBasis: true, 
        noMonetaryAmount: true,
        noFees: true,
        noSplitQuantity: true,
        hasLotChanges: true,
    },
    REVERSE_SPLIT: { name: 'REVERSE_SPLIT', 
        fromSplitInfo: asyncSplitFromSplitInfo,
        noCostBasis: true, 
        noMonetaryAmount: true,
        noFees: true,
        noSplitQuantity: true,
        hasLotChanges: true,
        sharesNegative: true,
    },
    ADD_SHARES: { name: 'ADD_SHARES', 
        fromSplitInfo: addSharesFromSplitInfo,
        needsCostBasis: true,
        hasModifyLotIds: true,
    },
    REMOVE_SHARES_FIFO: { name: 'REMOVE_SHARES_FIFO', 
        fromSplitInfo: removeSharesFromSplitInfo,
        sharesNegative: true,
        autoLotType: T.AutoLotType.FIFO,
    },
    REMOVE_SHARES_LIFO: { name: 'REMOVE_SHARES_LIFO', 
        fromSplitInfo: removeSharesFromSplitInfo,
        sharesNegative: true,
        autoLotType: T.AutoLotType.LIFO,
    },
    REMOVE_SHARES_BY_LOTS: { name: 'REMOVE_SHARES_BY_LOTS', 
        fromSplitInfo: removeSharesFromSplitInfo,
        sharesNegative: true,
        hasSelectedLots: true,
        hasLotChanges: true,
    },
    RETURN_OF_CAPITAL: { name: 'RETURN_OF_CAPITAL', 
        fromSplitInfo: asyncReturnOfCapitalFromSplitInfo,
        noShares: true, 
        noCostBasis: true,
        noFees: true,
        monetaryAmountIsCostBasisChanges: true,
    },
};


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
function lotActionTypeFromTransactionInfo(transactionDataItem, splitIndex, accessor) {
    const { splits } = transactionDataItem;
    const splitDataItem = splits[splitIndex];
    if (!splitDataItem) {
        return;
    }

    switch (splitDataItem.lotTransactionType) {
    case T.LotTransactionType.BUY_SELL.name :
    {
        let typeFIFO = LotActionType.SELL_FIFO;
        let typeLIFO = LotActionType.SELL_LIFO;
        let typeByLots = LotActionType.SELL_BY_LOTS;
        let typeBuy = LotActionType.BUY;
        for (let i = 0; i < splits.length; ++i) {
            if (i === splitIndex) {
                continue;
            }

            const split = splits[i];
            const category = accessor.getCategoryOfAccountId(
                split.accountId);
            if (category === A.AccountCategory.EQUITY) {
                typeFIFO = LotActionType.REMOVE_SHARES_FIFO;
                typeLIFO = LotActionType.REMOVE_SHARES_LIFO;
                typeByLots = LotActionType.REMOVE_SHARES_BY_LOTS;
                typeBuy = LotActionType.ADD_SHARES;
                break;
            }
        }

        if (splitDataItem.quantityBaseValue < 0) {
            switch (splitDataItem.sellAutoLotType) {
            case T.AutoLotType.FIFO.name :
                return typeFIFO;

            case T.AutoLotType.LIFO.name :
                return typeLIFO;
            
            default :
                return (splitDataItem.lotChanges.length)
                    ? typeByLots
                    : typeFIFO;
            }
        }
        return typeBuy;
    }
    
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
 * @property {string}   enteredText
 */

/**
 * @typedef {object} LotCellEditors~SharesEditState
 * A {@link LotCellEditors~QuantityEditState} with the following additional
 * properties:
 * @private
 * @property {LotChangeDataItem[]}  lotChanges
 */

/**
 * @typedef {object} LotCellEditors~EditStates
 * @private
 * @property {LotCellEditors~SharesEditState} shares
 * @property {LotCellEditors~QuantityEditState} monetaryAmount
 * @property {LotCellEditors~QuantityEditState} fees
 * @property {LotCellEditors~QuantityEditState} price
 */

/**
 * @typedef {object} LotCellEditors~SplitInfo
 * @property {EngineAccessor}   accessor
 * @property {TransactionDataItem}  transactionDataItem
 * @property {number}   splitIndex
 * @property {LotActionType}    actionType
 * @property {QuantityDefinition}   currencyQuantityDefinition
 * @property {Currency} currency
 * @property {QuantityDefinition}   sharesQuantityDefinition
 * @property {LotCellEditors~EditStates} editStates
 * @property {number}   nextQuantityEditHit
 */

/**
 * @typedef {object} LotCellEditors~createSplitInfoArgs
 * @property {TransactionDataItem}  transactionDataItem
 * @property {number}   splitIndex
 * @property {EngineAccessor}   accessor
 * @property {AccountStateDataItem} [accountStateDataItem]
 * @property {number} [referencePriceBaseValue] The price base value to use
 * for calculating the market value if the split does not have a price,
 * normally used for SPLIT and REVERSE_SPLIT.
 * @property {string|YMDDate}   [referenceYMDDate] The date of 
 * referencePriceBaseValue.
 */

/**
 * Determines if the share price for a transaction can be calculated from the
 * information passed to {@link createSplitInfo}.
 * @param {LotCellEditors~createSplitInfoArgs} args 
 * @returns {boolean}
 */
export function canCalcPrice(args) {
    const { transactionDataItem, splitIndex } = args;
    if (transactionDataItem) {
        const { splits } = transactionDataItem;
        const split = splits[splitIndex];
        switch (split.lotTransactionType) {
        case T.LotTransactionType.BUY_SELL.name :
        case T.LotTransactionType.REINVESTED_DIVIDEND.name :
            return true;
        }
    }
}


/**
 * Creates the {@link LotCellEditors~SplitInfo} object used by the lot cell editors.
 * @param {LotCellEditors~createSplitInfoArgs} args
 * @returns {LotCellEditors~SplitInfo}
 */
export function createSplitInfo(transactionDataItem, splitIndex, accessor, args) {
    if (arguments.length === 1) {
        args = transactionDataItem;

        transactionDataItem = args.transactionDataItem;
        splitIndex = args.splitIndex;
        accessor = args.accessor;
    }
    else {
        args = Object.assign({}, {
            transactionDataItem: transactionDataItem,
            splitIndex: splitIndex,
            accessor: accessor,
        },
        args || {});
    }

    if (!transactionDataItem || !accessor) {
        return;
    }

    transactionDataItem = T.getTransactionDataItem(transactionDataItem, true);

    const { splits } = transactionDataItem;

    const splitDataItem = splits[splitIndex];
    if (!splitDataItem) {
        return;
    }

    const actionType = lotActionTypeFromTransactionInfo(
        transactionDataItem, splitIndex, accessor);
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

    const splitInfo = Object.assign({}, args, {
        currencyQuantityDefinition: currencyQuantityDefinition,
        sharesQuantityDefinition: sharesQuantityDefinition,
        currency: currency,

        actionType: actionType,

        editStates: {},
    });

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
        accountStateDataItem,
        accessor,
    } = splitInfo;

    const { splits } = splitInfo.transactionDataItem;
    const splitDataItem = splits[splitIndex];

    const sharesSign = actionType.sharesNegative ? -1 : 1;

    let sharesBaseValue;
    let totalCostBasisBaseValue;
    let sharesLotChanges;
    let monetaryAmountBaseValue;
    let feesBaseValue;
    let priceBaseValue;

    let sharesTooltip;
    let lotStatesByLotId;
    if (accountStateDataItem && actionType.hasSelectedLots) {
        lotStatesByLotId = new Map();
        const { lotStates } = accountStateDataItem;
        lotStates.forEach((lotState) =>
            lotStatesByLotId.set(lotState.lotId, lotState));
        const { removedLotStates } = accountStateDataItem;
        if (removedLotStates) {
            removedLotStates.forEach(([lotId, lotState]) =>
                lotStatesByLotId.set(lotId, lotState));
        }
    }

    const { lotChanges } = splitDataItem;
    if (lotChanges && lotChanges.length) {
        for (let lotChange of lotChanges) {
            if (lotChange.quantityBaseValue) {
                sharesBaseValue = sharesBaseValue || 0;
                sharesBaseValue += lotChange.quantityBaseValue;

                if (lotStatesByLotId) {
                    const lotState = lotStatesByLotId.get(lotChange.lotId);
                    if (lotState) {
                        const msg = userMsg('LotCellEditors-shares_date',
                            sharesQuantityDefinition.baseValueToValueText(
                                lotChange.quantityBaseValue),
                            accessor.formatDate(lotState.ymdDateCreated),
                        );

                        if (!sharesTooltip) {
                            sharesTooltip = [];
                        }
                        sharesTooltip.push(
                            <div key = {lotChange.lotId}>{msg}</div>
                        );
                    }
                }
            }   

            if (lotChange.costBasisBaseValue) {
                totalCostBasisBaseValue = totalCostBasisBaseValue || 0;
                totalCostBasisBaseValue += lotChange.costBasisBaseValue;
            }
        }

        if (sharesBaseValue) {
            sharesBaseValue *= sharesSign;
        }
    }
    else {
        if (actionType.autoLotType) {
            sharesBaseValue = splitDataItem.sellAutoLotQuantityBaseValue;
        }
    }
    sharesLotChanges = LS.getLotChangeDataItems(lotChanges, true);

    splitInfo.sharesTooltip = sharesTooltip;

    if (actionType.monetaryAmountIsCostBasisChanges) {
        if (typeof totalCostBasisBaseValue === 'number') {
            // Also need to add the quantities of the other splits, which
            // are capital gains that were distributed due to ROC being > the 
            // lot cost basis.
            for (let i = 0; i < splitIndex; ++i) {
                totalCostBasisBaseValue += splits[i].quantityBaseValue;
            }
            for (let i = splitIndex + 1; i < splits.length; ++i) {
                totalCostBasisBaseValue += splits[i].quantityBaseValue;
            }
            
            monetaryAmountBaseValue = -totalCostBasisBaseValue;
        }
    }
    else if (!actionType.noMonetaryAmount) {
        if (typeof splitDataItem.quantityBaseValue === 'number') {
            monetaryAmountBaseValue = splitDataItem.quantityBaseValue
                * sharesSign;
        }
    }

    const feesSplitIndex = getFeesSplitIndex(splitInfo);
    if (feesSplitIndex >= 0) {
        feesBaseValue = splits[feesSplitIndex].quantityBaseValue;
    }

    if (typeof monetaryAmountBaseValue === 'number') {
        if (feesBaseValue) {
            monetaryAmountBaseValue += feesBaseValue * sharesSign;
        }
    }

    if (sharesBaseValue && (typeof monetaryAmountBaseValue === 'number')
     && !actionType.noCostBasis) {
        let sharesValue = sharesQuantityDefinition.baseValueToNumber(
            sharesBaseValue);

        let monetaryAmountValue = currencyQuantityDefinition.baseValueToNumber(
            monetaryAmountBaseValue);

        let feesValue = (feesBaseValue)
            ? currencyQuantityDefinition.baseValueToNumber(feesBaseValue)
            : 0;

        let priceValue = (monetaryAmountValue - sharesSign * feesValue) / sharesValue;
        priceBaseValue = currencyQuantityDefinition.quantityFromNumber(priceValue)
            .getBaseValue();
    }


    editStates.shares = { editHit: 0, 
        editorBaseValue: sharesBaseValue, 
        quantityDefinition: sharesQuantityDefinition,
        name: 'shares',
        lotChanges: sharesLotChanges,
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
/**
 * @private
 * @param {LotCellEditors~SplitInfo} splitInfo 
 */
export function updateSplitInfoValues(splitInfo) {
    const {
        actionType,
        sharesQuantityDefinition,
        currencyQuantityDefinition,
        editStates,
    } = splitInfo;

    const sharesSign = actionType.sharesNegative ? -1 : 1;

    const sharesState = editStates.shares;
    const { lotChanges } = sharesState;
    const monetaryAmountState = editStates.monetaryAmount;
    const feesState = editStates.fees;
    const priceState = editStates.price;


    let sharesValue;
    if (!actionType.noShares) {
        if (typeof sharesState.editorBaseValue === 'number') {
            sharesValue = sharesQuantityDefinition.baseValueToNumber(
                sharesState.editorBaseValue);
        }
        else if (lotChanges && lotChanges.length) {
            let sharesBaseValue = 0;
            lotChanges.forEach((lotChange) => 
                sharesBaseValue += lotChange.quantityBaseValue);
            sharesValue = sharesSign * sharesQuantityDefinition.baseValueToNumber(
                sharesBaseValue);

            // Always make the shares state for lots the most recently edited.
            sharesState.editHit = splitInfo.nextQuantityEditHit++;
        }
    }

    let monetaryAmountValue;
    if (!actionType.noMonetaryAmount) {
        if (typeof monetaryAmountState.editorBaseValue === 'number') {
            monetaryAmountValue = currencyQuantityDefinition.baseValueToNumber(
                monetaryAmountState.editorBaseValue);
        }
    }

    let feesValue;
    if (actionType.noFees) {
        feesValue = 0;
    }
    else if (typeof feesState.editorBaseValue === 'number') {
        feesValue = currencyQuantityDefinition.baseValueToNumber(
            feesState.editorBaseValue);
        feesValue *= sharesSign;
    }
    else if (feesState.editorBaseValue === undefined) {
        feesValue = 0;
    }

    let priceValue;
    if (!actionType.noCostBasis) {
        if (typeof priceState.editorBaseValue === 'number') {
            priceValue = currencyQuantityDefinition.baseValueToNumber(
                priceState.editorBaseValue);
        }
    }

    // We want a ranking based on the hits...
    let mostRecentEditState = sharesState;
    let oldestEditState = sharesState;
    let secondOldestEditState = monetaryAmountState
        || feesState || priceState;

    for (let name in editStates) {
        const editState = editStates[name];
        if (editState.editHit > mostRecentEditState.editHit) {
            mostRecentEditState = editState;
        }
        else if (editState.editHit < oldestEditState.editHit) {
            secondOldestEditState = oldestEditState;
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

    if (!actionType.noCostBasis) {
        let editStateToCalc;

        if ((sharesValue === undefined)
        && !actionType.noShares
        && !actionType.hasSelectedLots) {
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
            if (actionType.hasSelectedLots) {
                if (oldestEditState.name === 'shares') {
                    oldestEditState = secondOldestEditState;
                }
            }
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
                    editStateToCalc = editStateToCalc || feesState;
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
                // Note that we apply sharesSign to feesValue if fees are specified...
                feesValue = sharesSign * (monetaryAmountValue - sharesValue * priceValue);
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
        const newSplitInfo = Object.assign({}, splitInfo, {
            editStates: Object.assign({}, splitInfo.editStates),
        });

        const { editStates } = newSplitInfo;
        for (let editStateName in editStates) {
            const newEditState = Object.assign({},
                splitInfo.editStates[editStateName]);
            editStates[editStateName] = newEditState;

            if (newEditState.lotChanges) {
                newEditState.lotChanges = LS.getLotChangeDataItems(
                    newEditState.lotChanges, true);
            }
        }

        return newSplitInfo;
    }
}


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
function updateTransactionDataItem(splitInfo, newTransactionDataItem,
    valuesToUse) {

    const { accessor, actionType, transactionDataItem } = splitInfo;
    let { splitIndex } = splitInfo;
    const { lotType, shares, lots, monetaryAmount, monetaryAmountAccountId,
        fees, price, } = valuesToUse;

    const { splits } = transactionDataItem;
    let splitDataItem = T.getSplitDataItem(splits[splitIndex], true);
    const { accountId: lotsAccountId } = splitDataItem;

    const splitAccountDataItem 
        = accessor.getAccountDataItemWithId(lotsAccountId);

    let feesSplit;
    let feesBaseValue = (fees) ? fees.editorBaseValue : 0;
    if (feesBaseValue) {
        // Are fees, set the appropriate split.
        feesSplit = {
            accountId: AH.getDefaultSplitAccountId(accessor, 
                splitAccountDataItem,
                AH.DefaultSplitAccountType.FEES_EXPENSE),
            quantityBaseValue: feesBaseValue,
        };
    }
    else {
        feesBaseValue = 0;
    }


    splitDataItem.lotTransactionType = lotType.name;

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
    else if (lots) {
        if (actionType.hasLotChanges) {
            splitDataItem.lotChanges = lots.lotChanges;
        }
        else if (actionType.autoLotType) {
            splitDataItem.sellAutoLotType = actionType.autoLotType.name;
            splitDataItem.sellAutoLotQuantityBaseValue = lots.editorBaseValue;
        }
    }


    let monetaryAmountSplit;
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

        if (monetaryAmountAccountId === lotsAccountId) {
            if (!actionType.noSplitQuantity) {
                monetaryAmountSplit = splitDataItem;
            }
        }
        else {
            for (let i = 0; i < splits.length; ++i) {
                const split = splits[i];
                if (split.accountId === monetaryAmountAccountId) {
                    monetaryAmountSplit = T.getSplitDataItem(split, true);
                    break;
                }
            }
            if (!monetaryAmountSplit) {
                monetaryAmountSplit = {
                    accountId: monetaryAmountAccountId,
                };
            }
        }

        if (monetaryAmountSplit) {
            const category = accessor.getCategoryOfAccountId(
                monetaryAmountAccountId);
            monetaryAmountSplit.quantityBaseValue = monetaryAmount.editorBaseValue
                * category.creditSign * sharesSign;

            if (shares || lots) {
                splitDataItem.quantityBaseValue 
                    = monetaryAmount.editorBaseValue * sharesSign - feesBaseValue;
                
                if (actionType.needsCostBasis) {
                    splitDataItem.lotChanges[0].costBasisBaseValue
                        = monetaryAmount.editorBaseValue;
                }
            }

            if (monetaryAmountSplit === splitDataItem) {
                monetaryAmountSplit = undefined;
            }
        }
    }

    if (price) {
        // 
    }
    
    const newSplits = [];

    // Try to match up the old splits indices with the new splits
    const feesAccountId = (feesSplit) ? feesSplit.accountId : undefined;

    for (let i = 0; i < splits.length; ++i) {
        const split = splits[i];
        const { accountId } = split;
        let splitToPush;
        if (feesAccountId === accountId) {
            splitToPush = feesSplit;
            feesSplit = undefined;
        }
        else if (monetaryAmountSplit && (monetaryAmountSplit.accountId === accountId)) {
            splitToPush = monetaryAmountSplit;
            monetaryAmountSplit = undefined;
        }
        else if (accountId === lotsAccountId) {
            splitIndex = newSplits.length;
            splitToPush = splitDataItem;
            splitDataItem = undefined;
        }

        if (splitToPush) {
            const newSplit = Object.assign({}, split, splitToPush);
            const { lotChanges } = newSplit;
            if (lotChanges && !actionType.hasLotChanges
             && (!actionType.hasModifyLotIds || !newTransactionDataItem.id)) {
                lotChanges.forEach((lotChange) => {
                    delete lotChange.lotId;
                });
            }
            newSplits.push(newSplit);
        }
    }

    if (splitDataItem) {
        splitIndex = newSplits.length;
        newSplits.push(splitDataItem);
    }
    if (monetaryAmountSplit) {
        newSplits.push(monetaryAmountSplit);
    }
    if (feesSplit) {
        newSplits.push(feesSplit);
    }

    newTransactionDataItem.id 
        = newTransactionDataItem.id || transactionDataItem.id;
    newTransactionDataItem.ymdDate 
        = newTransactionDataItem.ymdDate || transactionDataItem.ymdDate;
    newTransactionDataItem.description
        = newTransactionDataItem.description || transactionDataItem.description;

    newTransactionDataItem.splits = newSplits;

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
    const { accessor, splitIndex, editStates } = splitInfo;
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const accountDataItem = accessor.getAccountDataItemWithId(splitDataItem.accountId);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            lots: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: accountDataItem.parentAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
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
async function asyncSplitFromSplitInfo(splitInfo, transactionDataItem) {
    const { editStates, splitIndex, actionType } = splitInfo;
    const args = {
        accessor: splitInfo.accessor,
        accountId: splitInfo.transactionDataItem.splits[splitIndex].accountId,
        deltaSharesBaseValue: editStates.shares.editorBaseValue,
    };
    if (actionType.sharesNegative) {
        args.deltaSharesBaseValue = -args.deltaSharesBaseValue;
    }

    const { id } = splitInfo.transactionDataItem;
    if (id) {
        args.transactionId = id;
    }
    else {
        args.ymdDate = transactionDataItem.ymdDate 
            || splitInfo.transactionDataItem.ymdDate;
    }

    const splitDataItem = await LTH.asyncCreateSplitDataItemForSPLIT(args);

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.SPLIT,
            lots: {
                lotChanges: splitDataItem.lotChanges,
            },
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
            lots: editStates.shares,
            sharesSign: -1,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: equityAccountId,
            fees: editStates.fees,
            price: editStates.price,
        });
}


//
//---------------------------------------------------------
//
async function asyncReturnOfCapitalFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates } = splitInfo;    
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const args = {
        accessor: accessor,
        accountId: splitDataItem.accountId,
        rocBaseValue: editStates.monetaryAmount.editorBaseValue,
    };
    if (transactionDataItem.id) {
        args.transactionId = transactionDataItem.id;
    }
    else {
        args.ymdDate = transactionDataItem.ymdDate;
    }

    Object.assign(transactionDataItem, 
        await LTH.asyncCreateTransactionDataItemForRETURN_OF_CAPITAL(args));

    // split[0] is always the ROC split...
    return 0;
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
 * @returns {number}    The split index of the main split.
 * @throws {LotCellEditors~Error}
 */
export async function asyncTransactionDataItemFromSplitInfo(
    splitInfo, transactionDataItem) {
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


function setModal(args, columnInfoArgs, modal) {
    const { setModal } = columnInfoArgs;
    if (setModal) {
        return setModal(args, modal);
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
function renderQuantityEditor(editorName, args, columnInfoArgs, readOnlyFilter) {
    if (readOnlyFilter) {
        if (readOnlyFilter(args, columnInfoArgs)) {
            return renderQuantityDisplay(editorName, args, columnInfoArgs);
        }
    }

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
function getQuantityEditorColumnInfo(editorName, args, className, readOnlyFilter, 
    extras) {

    className = className || editorName;
    const columnInfoArgs = args;
    const label = userMsg('LotCellEditors-' + editorName);
    let headerClassExtras = '';
    let inputClassExtras = '';
    let cellClassExtras = '';
    if (extras) {
        if (extras.headerClassExtras) {
            headerClassExtras = ' ' + extras.headerClassExtras;
        }
        if (extras.inputClassExtras) {
            inputClassExtras = ' ' + extras.inputClassExtras;
        }
        if (extras.cellClassExtras) {
            cellClassExtras = ' ' + extras.cellClassExtras;
        }
    }
    return Object.assign({ key: editorName,
        header: {
            label: label,
            ariaLabel: label,
            classExtras: 'header-base ' + className + '-base '
                + className + '-header' + headerClassExtras,
        },
        inputClassExtras: className + '-base ' + className + '-input' + inputClassExtras,
        cellClassName: 'cell-base ' + className + '-base ' + className + '-cell'
            + cellClassExtras,

        getCellValue: (args) => 
            getQuantityEditorCellValue(editorName, args, columnInfoArgs),
        saveCellValue: (args) => 
            saveQuantityEditorCellValue(editorName, args, columnInfoArgs),
        renderDisplayCell: (args) => 
            renderQuantityDisplay(editorName, args, columnInfoArgs),
        renderEditCell: (args) => 
            renderQuantityEditor(editorName, args, columnInfoArgs, readOnlyFilter),
    },
    args);
}


//
//---------------------------------------------------------
//
function getSharesCellValue(args, columnInfoArgs) {
    const result = getQuantityEditorCellValue('shares', args, columnInfoArgs);

    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { sharesTooltip } = splitInfo;
        if (sharesTooltip) {
            result.tooltip = sharesTooltip;
        }
    }
    return result;
}

//
//---------------------------------------------------------
//
function renderSharesDisplay(args, columnInfoArgs) {
    return renderQuantityDisplay('shares', args, columnInfoArgs);
}



//
//---------------------------------------------------------
//
function onSellByLotsDone(args, columnInfoArgs, result) {
    const originalSplitInfo = getSplitInfo(args, columnInfoArgs);
    const splitInfo = copySplitInfo(originalSplitInfo);
    const { editStates, nextQuantityEditHit, actionType } = splitInfo;
    const sharesState = editStates.shares;

    const { lotChanges, priceBaseValue } = result;
    const priceState = editStates.price;

    if (!deepEqual(lotChanges, sharesState.lotChanges)
     || ((priceBaseValue
     !== undefined) && (priceState.editorBaseValue !== priceBaseValue))) {
        if (priceBaseValue !== undefined) {
            priceState.editorBaseValue = priceBaseValue;
            priceState.enteredText = undefined;
            priceState.editHit = nextQuantityEditHit;
            ++splitInfo.nextQuantityEditHit;
        }

        const sharesSign = actionType.sharesNegative ? -1 : 1;
        let sharesQuantityBaseValue = 0;
        for (let lotChange of lotChanges) {
            sharesQuantityBaseValue += lotChange.quantityBaseValue;
        }
        sharesState.editorBaseValue = sharesSign * sharesQuantityBaseValue;
        sharesState.enteredText = undefined;
        sharesState.lotChanges = lotChanges;

        sharesState.editHit = nextQuantityEditHit;
        ++splitInfo.nextQuantityEditHit;

        updateSplitInfoValues(splitInfo);
        updateSplitInfo(args, columnInfoArgs, splitInfo);
    }

    setModal(args, columnInfoArgs, undefined);
}


//
//---------------------------------------------------------
//
function handleSellByLots(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    const { accessor, transactionDataItem, splitIndex, editStates } = splitInfo;

    const accountId = transactionDataItem.splits[splitIndex].accountId;

    const sharesState = editStates.shares;
    const { lotChanges } = sharesState;

    const priceState = editStates.price;
    let priceBaseValue = priceState.editorBaseValue;

    setModal(args, columnInfoArgs,
        (ref) => {
            return <LotsSelectionEditor
                accessor = {accessor}
                accountId = {accountId}
                transactionId = {transactionDataItem.id}
                lotChanges = {lotChanges}
                priceBaseValue = {priceBaseValue}
                ymdDate = {transactionDataItem.ymdDate}
                onDone = {(result) => onSellByLotsDone(
                    args, columnInfoArgs, result)
                }
                onCancel = {() => {
                    setModal(args, columnInfoArgs, undefined);
                }}
                ref = {ref}
            />;
        });
}

//
//---------------------------------------------------------
//
function renderSharesEditor(args, columnInfoArgs) {
    let splitInfo = getSplitInfo(args, columnInfoArgs);
    if (!splitInfo) {
        return renderSharesDisplay(args, columnInfoArgs);
    }

    const { actionType } = splitInfo;
    if (actionType.noShares) {
        return;
    }
    
    if (actionType.hasSelectedLots) {
        const { editStates } = splitInfo;
        const { shares } = editStates;
        const { ariaLabel, inputClassExtras, inputSize } = args.columnInfo;
        const errorMsg = args.errorMsg || shares.errorMsg;
        const value = shares.enteredText
            || shares.quantityDefinition.baseValueToValueText(shares.editorBaseValue)
            || userMsg('LotCellEditors-selectShares');
        return <CellButton
            value = {value}
            ariaLabel = {ariaLabel}
            classExtras = {inputClassExtras + ' button-input'}
            size = {inputSize}
            onClick = {(e) => handleSellByLots(args, columnInfoArgs)}
            errorMsg = {errorMsg}
        />;
    }

    return renderQuantityEditor('shares', args, columnInfoArgs);
}

/**
 * Retrieves a column info for share quantity cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getSharesColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign(getQuantityEditorColumnInfo('shares', args), {
        getCellValue: (args) =>
            getSharesCellValue(args, columnInfoArgs),
        renderDisplayCell: (args) =>
            renderSharesDisplay(args, columnInfoArgs),
        renderEditCell: (args) =>
            renderSharesEditor(args, columnInfoArgs),
    });
}


/**
 * Retrieves a column info for monetary amount cells.
 * This is primarily the total currency amount.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getMonetaryAmountColumnInfo(args) {
    return getQuantityEditorColumnInfo('monetaryAmount', args, 'monetary',
        (args, columnInfoArgs) => {
            const splitInfo = getSplitInfo(args, columnInfoArgs);
            if (splitInfo) {
                const { actionType } = splitInfo;
                if (actionType && actionType.noMonetaryAmount) {
                    return true;
                }
            }
        });
}


/**
 * Retrieves a column info for fees/commissions cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getFeesColumnInfo(args) {
    return getQuantityEditorColumnInfo('fees', args, 'monetary',
        (args, columnInfoArgs) => {
            const splitInfo = getSplitInfo(args, columnInfoArgs);
            if (splitInfo) {
                const { actionType } = splitInfo;
                if (actionType && actionType.noFees) {
                    return true;
                }
            }
        },
        {
            headerClassExtras: 'fees-header',
        });
}


/**
 * Retrieves a column info for share price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getPriceColumnInfo(args) {
    return getQuantityEditorColumnInfo('price', args, 'monetary',
        (args, columnInfoArgs) => {
            const splitInfo = getSplitInfo(args, columnInfoArgs);
            if (splitInfo) {
                const { actionType } = splitInfo;
                if (actionType && actionType.noCostBasis) {
                    return true;
                }
            }
        },
        {
            headerClassExtras: 'price-header',
        });
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
    const columnInfoArgs = args;
    return Object.assign({ key: 'totalShares',
        header: {
            label: userMsg('LotCellEditors-totalShares'),
            ariaLabel: 'Total Shares',
            classExtras: 'header-base shares-base shares-header',
        },
        inputClassExtras: 'shares-base shares-input',
        cellClassName: 'cell-base shares-base shares-cell',

        getCellValue: (args) => 
            getTotalSharesCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalSharesDisplay,
    },
    args);
}

function getTotalSharesCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { accountStateDataItem } = splitInfo;
        if (accountStateDataItem) {
            return {
                quantityBaseValue: accountStateDataItem.quantityBaseValue,
                quantityDefinition: splitInfo.sharesQuantityDefinition,
            };
        }
    }
}



/**
 * Display renderer for total market value quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderTotalMarketValueDisplay = ACE.renderQuantityDisplay;


/**
 * Retrieves a column info for market value totals cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalMarketValueColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'totalMarketValue',
        header: {
            label: userMsg('LotCellEditors-totalMarketValue'),
            ariaLabel: 'Total Shares',
            classExtras: 'header-base monetary-base monetary-header',
        },
        inputClassExtras: 'monetary-base monetary-input',
        cellClassName: 'cell-base monetary-base monetary-cell',

        getCellValue: (args) => 
            getTotalMarketValueCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalSharesDisplay,
    },
    args);
}

function getTotalMarketValueCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { accountStateDataItem, editStates,
            currencyQuantityDefinition, sharesQuantityDefinition,
            currency,
        } = splitInfo;
        let priceBaseValue = editStates.price.editorBaseValue;
        if (typeof priceBaseValue !== 'number') {
            priceBaseValue = splitInfo.referencePriceBaseValue;
        }
        if (accountStateDataItem
         && (typeof priceBaseValue === 'number')) {
            const sharesValue = sharesQuantityDefinition.baseValueToNumber(
                accountStateDataItem.quantityBaseValue);
            const priceValue = currencyQuantityDefinition.baseValueToNumber(
                priceBaseValue);
            const marketValue = sharesValue * priceValue;

            const sharesValueText = sharesQuantityDefinition.baseValueToValueText(
                accountStateDataItem.quantityBaseValue);
            const priceValueText = currency.baseValueToString(
                priceBaseValue);

            let tooltip;
            const { referenceYMDDate, accessor } = splitInfo;
            if (referenceYMDDate) {
                tooltip = userMsg('LotCellEditors-shares_price_date',
                    sharesValueText, priceValueText, 
                    accessor.formatDate(referenceYMDDate));
            }
            else {
                tooltip = userMsg('LotCellEditors-shares_price',
                    sharesValueText, priceValueText);
            }

            return {
                quantityBaseValue: currencyQuantityDefinition.numberToBaseValue(
                    marketValue),
                quantityDefinition: currencyQuantityDefinition,
                tooltip: tooltip,
            };
        }
    }
}


/**
 * Retrieves a column info for cost basis totals cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalCostBasisColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'totalCostBasis',
        header: {
            label: userMsg('LotCellEditors-totalCostBasis'),
            ariaLabel: 'Total Shares',
            classExtras: 'header-base monetary-base monetary-header',
        },
        inputClassExtras: 'monetary-base monetary-input',
        cellClassName: 'cell-base monetary-base monetary-cell',

        getCellValue: (args) => 
            getTotalCostBasisCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalSharesDisplay,
    },
    args);
}

function getTotalCostBasisCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { accountStateDataItem,
        } = splitInfo;
        if (accountStateDataItem && accountStateDataItem.lotStates) {
            let costBasisBaseValue = 0;
            accountStateDataItem.lotStates.forEach((lotState) => {
                costBasisBaseValue += lotState.costBasisBaseValue;
            });
            return {
                quantityBaseValue: costBasisBaseValue,
                quantityDefinition: splitInfo.currencyQuantityDefinition,
            };
        }
    }
}
