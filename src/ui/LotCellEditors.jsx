import React from 'react';
import { userError, userMsg } from '../util/UserMessages';
import { CellSelectDisplay, CellSelectEditor, 
    renderCellSelectEditorAsText } from '../util-ui/CellSelectEditor';
import * as ACE from './AccountingCellEditors';
import * as AH from '../tools/AccountHelpers';
import * as LTH from '../tools/LotTransactionHelpers';
import * as A from '../engine/Accounts';
import * as T from '../engine/Transactions';
import * as LS from '../engine/LotStates';
import * as GH from '../tools/GainHelpers';
import { isLotStateCashIn } from '../tools/GainHelpers';
import { Currency, getCurrency } from '../util/Currency';
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
 * @namespace LotCellEditors
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
 * @property {boolean}  [monetaryAmountIsMaxSplitQuantityBaseValue]
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
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-BUY',
        needsCostBasis: true,
        hasModifyLotIds: true,
        hasESPPBuyInfo: true,
    },
    SELL_FIFO: { name: 'SELL_FIFO', 
        fromSplitInfo: sellFromSplitInfo, 
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-SELL',
        sharesNegative: true,
        autoLotType: T.AutoLotType.FIFO,
    },
    SELL_LIFO: { name: 'SELL_LIFO', 
        fromSplitInfo: sellFromSplitInfo, 
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-SELL',
        sharesNegative: true,
        autoLotType: T.AutoLotType.LIFO,
    },
    SELL_BY_LOTS: { name: 'SELL_BY_LOTS', 
        fromSplitInfo: sellFromSplitInfo, 
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-SELL',
        sharesNegative: true,
        hasSelectedLots: true,
        hasLotChanges: true,
    },
    REINVESTED_DIVIDEND: { name: 'REINVESTED_DIVIDEND', 
        fromSplitInfo: reinvestedDividendFromSplitInfo,
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 
            'LotCellEditors-transactionDescription-REINVESTED_DIVIDEND',
        needsCostBasis: true,
        hasModifyLotIds: true,
    },
    SPLIT: { name: 'SPLIT', 
        fromSplitInfo: asyncSplitFromSplitInfo,
        formatTransactionDescription: formatSplitMergeTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-SPLIT',
        noCostBasis: true, 
        noMonetaryAmount: true,
        noFees: true,
        noSplitQuantity: true,
        hasLotChanges: true,
    },
    REVERSE_SPLIT: { name: 'REVERSE_SPLIT', 
        fromSplitInfo: asyncSplitFromSplitInfo,
        formatTransactionDescription: formatSplitMergeTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-REVERSE_SPLIT',
        noCostBasis: true, 
        noMonetaryAmount: true,
        noFees: true,
        noSplitQuantity: true,
        hasLotChanges: true,
        sharesNegative: true,
    },
    ADD_SHARES: { name: 'ADD_SHARES', 
        fromSplitInfo: addSharesFromSplitInfo,
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-ADD_SHARES',
        needsCostBasis: true,
        hasModifyLotIds: true,
        hasESPPBuyInfo: true,
    },
    REMOVE_SHARES_FIFO: { name: 'REMOVE_SHARES_FIFO', 
        fromSplitInfo: removeSharesFromSplitInfo,
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-REMOVE_SHARES',
        sharesNegative: true,
        autoLotType: T.AutoLotType.FIFO,
    },
    REMOVE_SHARES_LIFO: { name: 'REMOVE_SHARES_LIFO', 
        fromSplitInfo: removeSharesFromSplitInfo,
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-REMOVE_SHARES',
        sharesNegative: true,
        autoLotType: T.AutoLotType.LIFO,
    },
    REMOVE_SHARES_BY_LOTS: { name: 'REMOVE_SHARES_BY_LOTS', 
        fromSplitInfo: removeSharesFromSplitInfo,
        formatTransactionDescription: formatSharesAtPriceTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-REMOVE_SHARES',
        sharesNegative: true,
        hasSelectedLots: true,
        hasLotChanges: true,
    },
    RETURN_OF_CAPITAL: { name: 'RETURN_OF_CAPITAL', 
        fromSplitInfo: asyncReturnOfCapitalFromSplitInfo,
        formatTransactionDescription: formatReturnOfCapitalTransactionDescription,
        formatTransactionMsgId: 'LotCellEditors-transactionDescription-RETURN_OF_CAPITAL',
        noShares: true, 
        noCostBasis: true,
        noFees: true,
        monetaryAmountIsMaxSplitQuantityBaseValue: true,
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
 * @typedef {object} LotCellEditors~YMDDateEditState
 * @property {string} ymdDate
 * @property {boolean} [isESPP=false]
 */


/**
 * @typedef {object} LotCellEditors~QuantityEditState
 * @private
 * @property {number}   editHit
 * @property {number|undefined} editorBaseValue
 * @property {QuantityDefinition} quantityDefinition
 * @property {string}   enteredText
 * @property {boolean} [isESPP=false]
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
 * @property {LotCellEdtiros~YMDDateEditState} grantYMDDate
 * @property {LotCellEditors~QuantityEditState} grantDateFMVPrice
 * @property {LotCellEditors~QuantityEditState} purchaseDateFMVPrice
 */

/**
 * @typedef {object} LotCellEditors~SplitInfo
 * @property {EngineAccessor}   accessor
 * @property {TransactionDataItem}  transactionDataItem
 * @property {PricedItemDataItem}   pricedItemDataItem
 * @property {number}   splitIndex
 * @property {LotActionType}    actionType
 * @property {QuantityDefinition}   currencyQuantityDefinition
 * @property {Currency} currency    The currency for market value, cost basis, etc.
 * @property {QuantityDefinition}   priceQuantityDefinition
 * @property {Currency} priceCurrency   The currency for prices.
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

    const priceQuantityDefinition = accessor.getPriceQuantityDefinitionForPricedItem(
        pricedItemDataItem.id);

    let priceCurrency = currency;
    if (typeof priceQuantityDefinition.getDecimalPlaces === 'function') {
        const decimalPlaces = priceQuantityDefinition.getDecimalPlaces();
        if (decimalPlaces !== currency.getDecimalPlaces()) {
            priceCurrency = new Currency({
                currency: currency,
                decimalPlaces: decimalPlaces,
            });
        }
    }

    const splitInfo = Object.assign({}, args, {
        currencyQuantityDefinition: currencyQuantityDefinition,
        sharesQuantityDefinition: sharesQuantityDefinition,
        priceQuantityDefinition: priceQuantityDefinition,
        currency: currency,

        pricedItemDataItem: pricedItemDataItem,
        priceCurrency: priceCurrency,

        actionType: actionType,

        editStates: {},
    });

    setupSplitInfoEditStates(splitInfo);

    if (A.getAccountType(splitAccountDataItem.type).isESPP) {
        let { esppBuyInfo } = splitDataItem;
        if (!esppBuyInfo) {
            esppBuyInfo = {
                grantYMDDate: transactionDataItem.ymdDate,
            };
        }

        const { editStates } = splitInfo;
        editStates.grantYMDDate = {
            name: 'grantYMDDate',
            ymdDate: esppBuyInfo.grantYMDDate,
            isESPP: true,
        };

        editStates.grantDateFMVPrice = { editHit: 0, 
            quantityDefinition: priceQuantityDefinition,
            name: 'grantDateFMVPrice',
            editorBaseValue: (typeof esppBuyInfo.grantDateFMVPrice === 'number')
                ? priceQuantityDefinition.numberToBaseValue(
                    esppBuyInfo.grantDateFMVPrice)
                : '',
            isESPP: true,
        };

        editStates.purchaseDateFMVPrice = { editHit: 0, 
            quantityDefinition: priceQuantityDefinition,
            name: 'purchaseDateFMVPrice',
            editorBaseValue: (typeof esppBuyInfo.purchaseDateFMVPrice === 'number')
                ? priceQuantityDefinition.numberToBaseValue(
                    esppBuyInfo.purchaseDateFMVPrice)
                : '',
            isESPP: true,
        };
    }

    return splitInfo;
}


//
//---------------------------------------------------------
//
function setupSplitInfoEditStates(splitInfo) {
    const { splitIndex, 
        sharesQuantityDefinition,
        currencyQuantityDefinition,
        priceQuantityDefinition,
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

    if (actionType.monetaryAmountIsMaxSplitQuantityBaseValue) {
        monetaryAmountBaseValue = splits[0].quantityBaseValue;
        for (let i = 1; i < splits.length; ++i) {
            monetaryAmountBaseValue = Math.max(monetaryAmountBaseValue,
                splits[i].quantityBaseValue);
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
        priceBaseValue = priceQuantityDefinition.numberToBaseValue(priceValue);
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
        quantityDefinition: priceQuantityDefinition,
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
        priceQuantityDefinition,
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
            priceValue = priceQuantityDefinition.baseValueToNumber(
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
        if (editState.isESPP) {
            continue;
        }
        
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
                priceState.editorBaseValue = priceQuantityDefinition.numberToBaseValue(
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
function formatSharesAtPriceTransactionDescription({
    splitInfo,
    actionType,
    ticker,
    sharesBaseValue,
    priceBaseValue,
}) {
    const { sharesQuantityDefinition, }
        = splitInfo;
    let sharesValue;
    if (typeof sharesBaseValue === 'number') {
        sharesValue = sharesQuantityDefinition.baseValueToValueText(
            Math.abs(sharesBaseValue)
        );
    }

    let priceValue;
    if (typeof priceBaseValue === 'number') {
        priceValue = splitInfo.priceCurrency.baseValueToString(priceBaseValue);
    }

    if ((typeof sharesValue === 'string') && (typeof priceValue === 'string')) {
        return userMsg(actionType.formatTransactionMsgId, 
            ticker, sharesValue, priceValue);
    }
}


//
//---------------------------------------------------------
//
function formatSplitMergeTransactionDescription({
    actionType,
    ticker,
    totalSharesIn,
    totalSharesOut,
}) {
    if ((typeof totalSharesIn === 'number') && (typeof totalSharesOut === 'number')) {
        return userMsg(actionType.formatTransactionMsgId, 
            ticker, totalSharesOut, totalSharesIn);
    }
}


//
//---------------------------------------------------------
//
function formatReturnOfCapitalTransactionDescription({
    actionType,
    ticker,
    monetaryAmount,
}) {
    return userMsg(actionType.formatTransactionMsgId, ticker, monetaryAmount);
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
        fees, price, esppBuyInfo, } = valuesToUse;

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

    if (esppBuyInfo) {
        splitDataItem.esppBuyInfo = esppBuyInfo;
    }


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

            sharesBaseValue = 0;
            lots.lotChanges.forEach((lotChange) => 
                sharesBaseValue += lotChange.quantityBaseValue);
        }
        else if (actionType.autoLotType) {
            splitDataItem.sellAutoLotType = actionType.autoLotType.name;
            splitDataItem.sellAutoLotQuantityBaseValue = lots.editorBaseValue;
            sharesBaseValue = lots.editorBaseValue;
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

    let priceBaseValue;
    if (price) {
        priceBaseValue = price.editorBaseValue;
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

    const { formatTransactionDescription } = actionType;
    if (formatTransactionDescription) {
        const { pricedItemDataItem } = splitInfo;
        newTransactionDataItem.description = formatTransactionDescription({
            accessor: accessor,
            splitAccountDataItem: splitAccountDataItem,
            splitInfo: splitInfo,
            actionType: actionType,
            newSplits: newSplits,
            splitIndex: splitIndex,
            ticker: pricedItemDataItem.ticker,
            sharesBaseValue: sharesBaseValue,
            priceBaseValue: priceBaseValue,
            // totalSharesIn
            // totalSharesOut
            monetaryAmount: monetaryAmount,
        });
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
function esppBuyInfoFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates, } = splitInfo;
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const accountDataItem = accessor.getAccountDataItemWithId(splitDataItem.accountId);

    const accountType = A.getAccountType(accountDataItem.type);

    if (accountType.isESPP) {
        try {
            const { priceQuantityDefinition } = splitInfo;
            const esppBuyInfo = {
                grantYMDDate: editStates.grantYMDDate.ymdDate,
                grantDateFMVPrice: priceQuantityDefinition.baseValueToNumber(
                    editStates.grantDateFMVPrice.editorBaseValue),
                purchaseDateFMVPrice: priceQuantityDefinition.baseValueToNumber(
                    editStates.purchaseDateFMVPrice.editorBaseValue),
            };

            T.validateESPPBuyInfo(esppBuyInfo, splitInfo.transactionDataItem.ymdDate);
            return esppBuyInfo;
        }
        catch (e) {
            const { msgCode } = e;
            if (msgCode && msgCode.which) {
                return errorWithColumnInfoKey(e,
                    msgCode.which);
            }
            return e;
        }
    }
}


//
//---------------------------------------------------------
//
function buyFromSplitInfo(splitInfo, transactionDataItem) {
    const { accessor, splitIndex, editStates, } = splitInfo;
    const splitDataItem = splitInfo.transactionDataItem.splits[splitIndex];
    const accountDataItem = accessor.getAccountDataItemWithId(splitDataItem.accountId);

    // Validate ESPP buy info now if needed.
    let esppBuyInfo = esppBuyInfoFromSplitInfo(splitInfo, transactionDataItem);
    if (esppBuyInfo instanceof Error) {
        return esppBuyInfo;
    }

    let sourceAccountId = accountDataItem.parentAccountId;
    const accountType = A.getAccountType(accountDataItem.type);
    if (accountType.isStockGrant) {
        sourceAccountId = AH.getDefaultSplitAccountId(accessor, accountDataItem,
            AH.DefaultSplitAccountType.STOCK_GRANTS_INCOME);
        
        if (!accessor.getAccountDataItemWithId(sourceAccountId)) {
            sourceAccountId = accountDataItem.parentAccountId;
        }
    }

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            shares: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: sourceAccountId,
            fees: editStates.fees,
            price: editStates.price,
            esppBuyInfo: esppBuyInfo,
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

    // Validate ESPP buy info now if needed.
    let esppBuyInfo = esppBuyInfoFromSplitInfo(splitInfo, transactionDataItem);
    if (esppBuyInfo instanceof Error) {
        return esppBuyInfo;
    }

    return updateTransactionDataItem(splitInfo, transactionDataItem,
        {
            lotType: T.LotTransactionType.BUY_SELL,
            shares: editStates.shares,
            monetaryAmount: editStates.monetaryAmount,
            monetaryAmountAccountId: equityAccountId,
            fees: editStates.fees,
            price: editStates.price,
            esppBuyInfo: esppBuyInfo,
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

    const { pricedItemDataItem } = splitInfo;
    transactionDataItem.description = formatReturnOfCapitalTransactionDescription({
        actionType: LotActionType.RETURN_OF_CAPITAL,
        ticker: pricedItemDataItem.ticker,
        monetaryAmount: editStates.monetaryAmount,
    });

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


function setModal(args, columnInfoArgs, modal, reason) {
    const { setModal } = columnInfoArgs;
    if (setModal) {
        return setModal(args, modal, reason);
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

        if (args.renderAsText) {
            return actionType.description;
        }

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

        if (args.renderAsText) {
            return renderCellSelectEditorAsText({
                items: items,
                selectedValue: splitInfo.actionType.name,
            });
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
            classExtras: 'RowTable-header-base ActionType-base ActionType-header',
        },
        inputClassExtras: 'ActionType-base ActionType-input',
        cellClassName: 'RowTable-cell-base ActionType-base ActionType-cell',

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
                    accessor: splitInfo.accessor,
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

function getQuantityEditorSetCellEditBuffer(
    editorName, args, columnInfoArgs, readOnlyFilter) {

    const { setCellEditBuffer } = args;
    return (index, cellEditBuffer) => {
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
                if ((editorState.editorBaseValue !== value.quantityBaseValue)
                 || (editorState.enteredText !== value.enteredText)) {
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

        setCellEditBuffer(index, cellEditBuffer);
    };
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

    args = Object.assign({}, args, {
        setCellEditBuffer: getQuantityEditorSetCellEditBuffer(
            editorName, args, columnInfoArgs, readOnlyFilter),
    });
    
    return ACE.renderQuantityEditor(args);
}


//
//---------------------------------------------------------
//
function exitQuantityEditorCellEdit(editorName, args, columnInfoArgs, readOnlyFilter) {
    args = Object.assign({}, args, {
        setCellEditBuffer: getQuantityEditorSetCellEditBuffer(
            editorName, args, columnInfoArgs, readOnlyFilter),
    });
    return ACE.exitQuantityEditorCellEdit(args);
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
            classExtras: 'RowTable-header-base ' + className + '-base '
                + className + '-header' + headerClassExtras,
        },
        inputClassExtras: className + '-base ' + className + '-input' + inputClassExtras,
        cellClassName: 'RowTable-cell-base ' + className + '-base ' + className + '-cell'
            + cellClassExtras,

        getCellValue: (args) => 
            getQuantityEditorCellValue(editorName, args, columnInfoArgs),
        saveCellValue: (args) => 
            saveQuantityEditorCellValue(editorName, args, columnInfoArgs),
        renderDisplayCell: (args) => 
            renderQuantityDisplay(editorName, args, columnInfoArgs),
        renderEditCell: (args) => 
            renderQuantityEditor(editorName, args, columnInfoArgs, readOnlyFilter),
        exitCellEdit: (args) =>
            exitQuantityEditorCellEdit(editorName, args, columnInfoArgs, readOnlyFilter),
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

    setModal(args, columnInfoArgs, undefined, 'done');
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
            classExtras = {inputClassExtras + ' Button-input'}
            size = {inputSize}
            onClick = {(e) => handleSellByLots(args, columnInfoArgs)}
            errorMsg = {errorMsg}
            ref = {args.refForFocus}
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
    return Object.assign(getQuantityEditorColumnInfo('shares', args, 'Shares'), {
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
    return getQuantityEditorColumnInfo('monetaryAmount', args, 'Monetary',
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
    return getQuantityEditorColumnInfo('fees', args, 'Monetary',
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
            headerClassExtras: 'Fees-header',
        });
}


/**
 * Retrieves a column info for share price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getPriceColumnInfo(args) {
    return getQuantityEditorColumnInfo('price', args, 'Monetary',
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
            headerClassExtras: 'Price-header',
        });
}



/**
 * Retrieves a column info for grant date cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getGrantDateColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'grantYMDDate',
        header: {
            label: userMsg('LotCellEditors-grantYMDDate'),
            ariaLabel: 'Grant Date',
            classExtras: 'RowTable-header-base Date-base Date-header',
        },
        inputClassExtras: 'Date-base Date-input',
        cellClassName: 'RowTable-cell-base Date-base Date-cell',

        renderDisplayCell: ACE.renderDateDisplay,
        renderEditCell: (args) => renderGrantDateEditor(args, columnInfoArgs),

        getCellValue: (args) => getGrantDateCellValue(args, columnInfoArgs),
        saveCellValue: (args) => saveGrantDateCellValue(args, columnInfoArgs),
    },
    args);
}

function getGrantDateCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        if (splitInfo.actionType.hasESPPBuyInfo) {
            const { grantYMDDate } = splitInfo.editStates;
            if (grantYMDDate) {
                return {
                    ymdDate: grantYMDDate.ymdDate,
                    accessor: splitInfo.accessor,
                };
            }
        }
    }
}

function saveGrantDateCellValue(args, columnInfoArgs) {
}


function renderGrantDateEditor(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo && !splitInfo.actionType.hasESPPBuyInfo) {
        return;
    }
    
    args = Object.assign({}, args, {
        setCellEditBuffer: getDateEditorSetCellEditBuffer(
            'grantYMDDate', args, columnInfoArgs),
    });

    return ACE.renderDateEditor(args);
}


//
//---------------------------------------------------------
//

function getDateEditorSetCellEditBuffer(
    editorName, args, columnInfoArgs) {

    const { setCellEditBuffer } = args;
    return (index, cellEditBuffer) => {
        const { isEdited } = cellEditBuffer;
        delete cellEditBuffer.isEdited;

        const { value } = cellEditBuffer;
        let originalSplitInfo = getSplitInfo(args, columnInfoArgs);
        if (isEdited && originalSplitInfo) {
            const splitInfo = copySplitInfo(originalSplitInfo);

            const { editStates, } = splitInfo;
            const editorState = editStates[editorName];
            if (!editorState) {
                return;
            }

            editorState.ymdDate = value.ymdDate;
            updateSplitInfoValues(splitInfo);

            if (!deepEqual(splitInfo, originalSplitInfo)) {
                updateSplitInfo(args, columnInfoArgs, splitInfo);
            }
        }

        setCellEditBuffer(index, cellEditBuffer);
    };
}


/**
 * Retrieves a column info for grant date FMV price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getGrantDateFMVPriceColumnInfo(args) {
    return getESPPFMVPriceColumnInfo(args, 'grantDateFMVPrice');
}


/**
 * Retrieves a column info for grant date FMV price cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getPurchaseDateFMVPriceColumnInfo(args) {
    return getESPPFMVPriceColumnInfo(args, 'purchaseDateFMVPrice');
}


function getESPPFMVPriceColumnInfo(args, property) {
    return getQuantityEditorColumnInfo(property, args, 'Monetary',
        esppFMVPriceReadOnlyFilter,
        {
            headerClassExtras: 'Price-header',
        });
}

function esppFMVPriceReadOnlyFilter(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (!splitInfo || !splitInfo.actionType.hasESPPBuyInfo) {
        return true;
    }
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
            classExtras: 'RowTable-header-base Shares-base Shares-header',
        },
        inputClassExtras: 'Shares-base Shares-input',
        cellClassName: 'RowTable-cell-base Shares-base Shares-cell',

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
                accessor: splitInfo.accessor,
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
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',

        getCellValue: (args) => 
            getTotalMarketValueCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalMarketValueDisplay,
    },
    args);
}

function getTotalMarketValueCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { accountStateDataItem, editStates,
            currencyQuantityDefinition, 
            sharesQuantityDefinition,
            priceQuantityDefinition,
        } = splitInfo;
        let priceBaseValue = (editStates && editStates.price)
            ? editStates.price.editorBaseValue
            : undefined;
        if (typeof priceBaseValue !== 'number') {
            priceBaseValue = splitInfo.referencePriceBaseValue;
        }
        if (accountStateDataItem
         && (typeof priceBaseValue === 'number')) {
            const sharesValue = sharesQuantityDefinition.baseValueToNumber(
                accountStateDataItem.quantityBaseValue);
            const priceValue = priceQuantityDefinition.baseValueToNumber(
                priceBaseValue);
            const marketValue = sharesValue * priceValue;

            const sharesValueText = sharesQuantityDefinition.baseValueToValueText(
                accountStateDataItem.quantityBaseValue);
            const priceValueText = priceQuantityDefinition.baseValueToValueText(
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
                accessor: accessor,
                quantityBaseValue: currencyQuantityDefinition.numberToBaseValue(
                    marketValue),
                quantityDefinition: currencyQuantityDefinition,
                tooltip: tooltip,
            };
        }
    }
}


/**
 * Display renderer for total cost basis value quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderTotalCostBasisDisplay = ACE.renderQuantityDisplay;


/**
 * Retrieves a column info for total cost basis cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalCostBasisColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'totalCostBasis',
        header: {
            label: userMsg('LotCellEditors-totalCostBasis'),
            ariaLabel: 'Total Cost Basis',
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',

        getCellValue: (args) => 
            getTotalCostBasisCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalCostBasisDisplay,
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
                accessor: splitInfo.accessor,
                quantityBaseValue: costBasisBaseValue,
                quantityDefinition: splitInfo.currencyQuantityDefinition,
            };
        }
    }
}


/**
 * Display renderer for total cash-in value quantities.
 * @param {CellQuantityDisplayArgs} args
 */
export const renderTotalCashInDisplay = ACE.renderQuantityDisplay;


/**
 * Retrieves a column info for total cash-in cells.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalCashInColumnInfo(args) {
    const columnInfoArgs = args;
    return Object.assign({ key: 'totalCashIn',
        header: {
            label: userMsg('LotCellEditors-totalCashIn'),
            ariaLabel: 'Total Cash-In',
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',

        getCellValue: (args) => 
            getTotalCashInCellValue(args, columnInfoArgs),
        renderDisplayCell: renderTotalCashInDisplay,
    },
    args);
}

function getTotalCashInCellValue(args, columnInfoArgs) {
    const splitInfo = getSplitInfo(args, columnInfoArgs);
    if (splitInfo) {
        const { accountStateDataItem, accessor,
        } = splitInfo;
        if (accountStateDataItem && accountStateDataItem.lotStates) {
            let cashInBaseValue = 0;
            accountStateDataItem.lotStates.forEach((lotState) => {
                if (isLotStateCashIn(accessor, lotState)) {
                    cashInBaseValue += lotState.costBasisBaseValue;
                }
            });
            return {
                accessor: splitInfo.accessor,
                quantityBaseValue: cashInBaseValue,
                quantityDefinition: splitInfo.currencyQuantityDefinition,
            };
        }
    }
}


/**
 * Retrieves a column info for total gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalGainColumnInfo(args) {
    return Object.assign({ key: 'totalGain',
        header: {
            label: userMsg('LotCellEditors-totalGain'),
            ariaLabel: 'Total Gain',
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',
    },
    args);
}


function calcGainBalanceValue(args) {
    const result = GH.calcLotStateGain(args);
    if (!result) {
        return;
    }

    const { accountStateInfo } = result;
    const { currencyQuantityDefinition } = accountStateInfo;
    const { accessor } = args;

    const value = {
        quantityBaseValue: currencyQuantityDefinition.numberToBaseValue(
            result.gainValue
        ),
        quantityDefinition: currencyQuantityDefinition,
    };

    if (value.quantityBaseValue !== undefined) {
        // Add tooltips
        const { currency } = accountStateInfo;

        const { inputMsgId, } = args;

        const tooltips = [];

        if (args.calcGainFromParts === GH.absoluteGain) {
            const percentQuantityDefinition 
                = accessor.getPercentGainQuantityDefinition();
            const percentGainValue = GH.percentGain(result);
            const percentGainBaseValue 
                = percentQuantityDefinition.numberToBaseValue(percentGainValue);
            tooltips.push(userMsg('LotCellEditors-percentGain_tooltip',
                percentQuantityDefinition.baseValueToValueText(percentGainBaseValue)
            ));
        }
        else {
            tooltips.push(userMsg('LotCellEditors-absoluteGain_tooltip',
                currency.baseValueToString(result.outputBaseValue - result.inputBaseValue)
            ));
        }

        tooltips.push(userMsg('LotCellEditors-marketValue_tooltip',
            currency.baseValueToString(result.outputBaseValue)
        ));
        tooltips.push(userMsg(inputMsgId,
            currency.baseValueToString(result.inputBaseValue)
        ));

        const { accountGainsState } = accountStateInfo;
        if (accountGainsState && accountGainsState.gainTotals) {
            const reinvestedGain = accountGainsState.gainTotals.costBasisBaseValue
                - accountGainsState.gainTotals.cashInBaseValue;
            if (reinvestedGain) {
                tooltips.push(userMsg('LotCellEditors-reinvestedGain_tooltip',
                    currency.baseValueToString(reinvestedGain)));
            }
        }

        const { priceDataItem } = accountStateInfo;
        if (priceDataItem) {
            tooltips.push(userMsg('LotCellEditors-price_date_tooltip',
                accountStateInfo.priceCurrency.decimalValueToString(
                    priceDataItem.close),
                accessor.formatDate(priceDataItem.ymdDate)
            ));
        }

        value.tooltip = tooltips;
    }

    return value;
}


/**
 * Calculates the simple gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcSimpleGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getGainPartsOfAccountGainsState: GH.getAccountGainsStateSimpleGainParts,
        calcGainFromParts: GH.absoluteGain,
        inputMsgId: 'LotCellEditors-costBasis_tooltip',
    });

    return calcGainBalanceValue(args);
}


/**
 * Retrieves a column info for simple percent gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalSimplePercentGainColumnInfo(args) {
    return Object.assign({ key: 'totalPercentGain',
        header: {
            label: userMsg('LotCellEditors-totalPercentGain'),
            ariaLabel: 'Total Percent Gain',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    },
    args);
}


/**
 * Calculates the simple percent gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcSimplePercentGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getGainPartsOfAccountGainsState: GH.getAccountGainsStateSimpleGainParts,
        calcGainFromParts: GH.percentGain,
        inputMsgId: 'LotCellEditors-costBasis_tooltip',
    });

    return calcGainBalanceValue(args);
}


/**
 * Retrieves a column info for total gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalCashInGainColumnInfo(args) {
    return Object.assign({ key: 'totalCashInGain',
        header: {
            label: userMsg('LotCellEditors-totalCashInGain'),
            ariaLabel: 'Total Cash In Gain',
            classExtras: 'RowTable-header-base Monetary-base Monetary-header',
        },
        inputClassExtras: 'Monetary-base Monetary-input',
        cellClassName: 'RowTable-cell-base Monetary-base Monetary-cell',
    },
    args);
}


/**
 * Calculates the cash-in gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcCashInGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getGainPartsOfAccountGainsState: GH.getAccountGainsStateCashInGainParts,
        calcGainFromParts: GH.absoluteGain,
        inputMsgId: 'LotCellEditors-cashIn_tooltip',
    });

    return calcGainBalanceValue(args);
}


/**
 * Retrieves a column info for cash-in percent gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalCashInPercentGainColumnInfo(args) {
    return Object.assign({ key: 'totalCashInPercentGain',
        header: {
            label: userMsg('LotCellEditors-totalCashInPercentGain'),
            ariaLabel: 'Total Cash In Percent Gain',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    },
    args);
}


/**
 * Calculates the cash-in percent gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcCashInPercentGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getGainPartsOfAccountGainsState: GH.getAccountGainsStateCashInGainParts,
        calcGainFromParts: GH.percentGain,
        inputMsgId: 'LotCellEditors-cashIn_tooltip',
    });

    return calcGainBalanceValue(args);
}


/**
 * Retrieves a column info for annual percent gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalAnnualPercentGainColumnInfo(args) {
    return Object.assign({ key: 'totalAnnualPercentGain',
        header: {
            label: userMsg('LotCellEditors-totalAnnualPercentGain'),
            ariaLabel: 'Total Annual Percent Gain',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    },
    args);
}


/**
 * Calculates the annual percent gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcAnnualPercentGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getLotStatesFromAccountGainsState: GH.getAccountGainsStateSimpleGainLotStates,
        inputMsgId: 'LotCellEditors-costBasis_tooltip',
        inputBaseValuePropertyName: 'costBasisBaseValue',
    });
    const result = GH.calcAccountGainsStatePercentAnnualGain(args);
    return annualGainResultToBalanceValue(args, result);
}


//
//---------------------------------------------------------
//
function annualGainResultToBalanceValue(args, result) {
    if (!result) {
        return;
    }

    const { percentAnnualGainBaseValue, } = result;
    if ((typeof percentAnnualGainBaseValue !== 'number')
     || Number.isNaN(percentAnnualGainBaseValue)) {
        return;
    }

    const { accessor, inputBaseValuePropertyName } = args;
    const percentQuantityDefinition = accessor.getPercentGainQuantityDefinition();

    // Tooltips:
    const tooltips = [];
    const { accountStateInfo, } = result;
    if (accountStateInfo && inputBaseValuePropertyName) {
        const { currency, accountGainsState } = accountStateInfo;
        if (accountGainsState && accountGainsState.gainTotals) {
            tooltips.push(userMsg('LotCellEditors-marketValue_tooltip',
                currency.baseValueToString(
                    accountGainsState.gainTotals.marketValueBaseValue)
            ));

            const { inputMsgId } = args;
            if (inputMsgId) {
                tooltips.push(userMsg(inputMsgId,
                    currency.baseValueToString(
                        accountGainsState.gainTotals[inputBaseValuePropertyName]),
                ));
            }

            const reinvestedGain = accountGainsState.gainTotals.costBasisBaseValue
                - accountGainsState.gainTotals.cashInBaseValue;
            if (reinvestedGain) {
                tooltips.push(userMsg('LotCellEditors-reinvestedGain_tooltip',
                    currency.baseValueToString(reinvestedGain)));
            }

            const { priceDataItem, priceCurrency } = accountStateInfo;
            if (priceDataItem) {
                tooltips.push(userMsg('LotCellEditors-price_date_tooltip',
                    priceCurrency.decimalValueToString(priceDataItem.close),
                    accessor.formatDate(priceDataItem.ymdDate)
                ));
            }
        }
    }

    return {
        quantityBaseValue: percentAnnualGainBaseValue,
        quantityDefinition: percentQuantityDefinition,
        tooltip: tooltips,
    };
}


/**
 * Retrieves a column info for annual cash-in percent gain.
 * @param {getColumnInfoArgs} args
 * @returns {CellEditorsManager~ColumnInfo}
 */
export function getTotalAnnualCashInPercentGainColumnInfo(args) {
    return Object.assign({ key: 'totalAnnualCashInPercentGain',
        header: {
            label: userMsg('LotCellEditors-totalAnnualCashInPercentGain'),
            ariaLabel: 'Total Annual Cash-In Percent Gain',
            classExtras: 'RowTable-header-base Percent-base Percent-header',
        },
        inputClassExtras: 'Percent-base Percent-input',
        cellClassName: 'RowTable-cell-base Percent-base Percent-cell',
    },
    args);
}


/**
 * Calculates the annual cash-in percent gain for {@link LotState}s in the form of
 * a {@link CellBalanceValue}.
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @returns {CellBalanceValue}
 */
export function calcAnnualCashInPercentGainBalanceValue(args) {
    args = Object.assign({}, args, {
        getLotStatesFromAccountGainsState: GH.getAccountGainsStateCashInLotStates,
        inputMsgId: 'LotCellEditors-cashIn_tooltip',
        inputBaseValuePropertyName: 'cashInBaseValue',
    });
    const result = GH.calcAccountGainsStatePercentAnnualGain(args);

    return annualGainResultToBalanceValue(args, result);
}
