import { getQuantityDefinition } from '../util/Quantities';
import { getCurrency } from '../util/Currency';
import * as L from '../engine/Lots';
import * as LS from '../engine/LotStates';
import { YMDDate } from '../util/YMDDate';
import { userError } from '../util/UserMessages';


/**
 * @namespace GainHelpers
 */


/**
 * @typedef {object} GainHelpers~calcGainArgs
 * @property {number} inputValue
 * @property {number} outputValue
 */

/**
 * Calculates absolute gain, outputValue - inputValue.
 * @param {GainHelpers~calcGainArgs} args
 * @returns {number|undefined}
 * @memberof GainHelpers
 */
export function absoluteGain({inputValue, outputValue}) {
    if ((typeof inputValue === 'number')
     && (typeof outputValue === 'number')) {
        return outputValue - inputValue;
    }
}


/**
 * Calculates percent gain, (outputValue - inputValue) * 100 / inputValue
 * @param {GainHelpers~calcGainArgs} args
 * @returns {number|undefined}  Returns <code>undefined<code> if
 * inputValue is 0.
 * @memberof GainHelpers
 */
export function percentGain({inputValue, outputValue}) {
    if ((typeof inputValue === 'number')
     && (typeof outputValue === 'number')) {
        if (inputValue) {
            return (outputValue - inputValue) * 100 / inputValue;
        }
    }
}


/**
 * @typedef {object} GainHelpers~AccountStateInfo
 * @property {EngineAccess} accessor
 * @property {number} pricedItemId
 * @property {PriceDataItem} priceDataItem
 * @property {QuantityDefinition} sharesQuantityDefinition
 * @property {Currency} currency
 * @property {QuantityDefinition} currencyQuantityDefinition
 */


/**
 * @typedef {object} GainHelpers~createAccountStateInfoArgs
 * @property {EngineAccess} accessor
 * @property {number} accountId Either accountId or pricedItemId is required, not both.
 * @property {number} pricedItemId
 * @property {AccountStateDataItem} accountStateDataItem
 * @property {PriceDataItem} priceDataItem
 */

/**
 * Creates the {@link GainHelpers~AccountStateInfo} object used by most of the
 * gain helper functions.
 * @param {GainHelpers~createAccountStateInfoArgs} args 
 * @returns {GainHelpers~AccountStateInfo|undefined}
 * @memberof GainHelpers
 */
export function createAccountStateInfo(args) {

    const {accessor, accountId, } = args;
    let pricedItemId;

    if (accountId) {
        const accountDataItem = accessor.getAccountDataItemWithId(accountId);
        if (!accountDataItem) {
            return;
        }
        pricedItemId = accountDataItem.pricedItemId;
    }
    else {
        pricedItemId = args.pricedItemId;
    }

    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
    if (!pricedItemDataItem) {
        return;
    }

    const sharesQuantityDefinition = getQuantityDefinition(
        pricedItemDataItem.quantityDefinition
    );
    if (!sharesQuantityDefinition) {
        return;
    }

    let currency = pricedItemDataItem.currency || accessor.getBaseCurrencyCode();
    currency = getCurrency(currency);
    if (!currency) {
        return;
    }

    return Object.assign({}, args, {
        pricedItemDataItem: pricedItemDataItem,
        sharesQuantityDefinition: sharesQuantityDefinition,
        currency: currency,
        currencyQuantityDefinition: currency.getQuantityDefinition(),
    });
}


/**
 * Calculates the market value base value for a number of shares
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {number|LotStateDataItem} sharesQuantityBaseValue 
 * @returns {number|undefined}
 * @memberof GainHelper
 */
export function calcLotStateMarketValueBaseValue(
    accountStateInfo, sharesQuantityBaseValue) {

    const { sharesQuantityDefinition, currencyQuantityDefinition,
        priceDataItem } = accountStateInfo;
    if (!priceDataItem) {
        return;
    }

    if (typeof sharesQuantityBaseValue === 'object') {
        sharesQuantityBaseValue = sharesQuantityBaseValue.quantityBaseValue;
    }

    const sharesValue = sharesQuantityDefinition.baseValueToNumber(
        sharesQuantityBaseValue);
    const marketValue = sharesValue * priceDataItem.close;
    return currencyQuantityDefinition.numberToBaseValue(
        marketValue);
}


/**
 * Returns the cost basis base value for a {@link LotStateDataItem}.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem
 * @returns {number}
 * @memberof GainHelper
 */
export function getLotStateCostBasisBaseValue(accountStateInfo, lotStateDataItem) {
    return lotStateDataItem.costBasisBaseValue;
}


/**
 * Returns the cash-in base value for a {@link LotStateDataItem}. Returns 0
 * if the lot state is not cash-in.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem
 * @returns {number}
 * @memberof GainHelper
 */
export function getLotStateCashInBaseValue(accountStateInfo, lotStateDataItem) {
    const { accessor } = accountStateInfo;
    return (isLotStateCashIn(accessor, lotStateDataItem))
        ? lotStateDataItem.costBasisBaseValue
        : 0;
}


/**
 * @typedef {object} GainHelpers~GainParts
 * @property {number}   inputBaseValue
 * @property {number}   outputBaseValue
 */

/**
 * Calculats the gain parts for simple gain, which uses the full cost basis.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {GainHelpers~GainParts|undefined}
 * @memberof GainHelpers
 */
export function getLotStateSimpleGainParts(accountStateInfo, lotStateDataItem) {
    return {
        inputBaseValue: getLotStateCostBasisBaseValue(accountStateInfo,
            lotStateDataItem),
        outputBaseValue: calcLotStateMarketValueBaseValue(accountStateInfo,
            lotStateDataItem),
    };
}


/**
 * Determines if the lot underlying a lotState is a cash-in lot.
 * @param {EngineAccessor} accessor 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {boolean}
 * @memberof GainHelpers
 */
export function isLotStateCashIn(accessor, lotStateDataItem) {
    if (lotStateDataItem) {
        const lotDataItem = accessor.getLotDataItemWithId(lotStateDataItem.lotId);
        if (lotDataItem) {
            return lotDataItem.lotOriginType === L.LotOriginType.CASH_PURCHASE.name;
        }
    }
}


/**
 * Calculats the gain parts for cash-in gain, which only includes lots for which
 * {@link GainHelpers.isLotStateCashIn} returns <code>true<.code>.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {GainHelpers~GainParts}
 * @memberof GainHelpers
 */
export function getLotStateCashInGainParts(accountStateInfo, lotStateDataItem) {
    return {
        inputBaseValue: getLotStateCashInBaseValue(accountStateInfo,
            lotStateDataItem),
        outputBaseValue: calcLotStateMarketValueBaseValue(accountStateInfo,
            lotStateDataItem),
    };
}


function resolveLotStatesFromArgs(args, lotStates) {
    if (lotStates) {
        if (lotStates.lotStates) {
            // it's an AccountStateDataItem...
            lotStates = lotStates.lotStates;
        }
    }
    else {
        lotStates = args.lotStates;
    }
    if (!lotStates) {
        const { accountStateDataItem } = args;
        if (accountStateDataItem) {
            lotStates = accountStateDataItem.lotStates;
        }
    }

    return lotStates;
}


/**
 * @callback GainHelpers~getGainPartsCallback
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {GainHelpers~GainParts}
 */


/**
 * @callback GainHelpers~calcGainFromPartsCallback
 * @param {GainHelpers~calcGainArgs} args
 * @returns {number|undefined}
 */


/**
 * @typedef {object} GainHelpers~calcLotStateGainArgs
 * {@link GainHelpers~createAccountStateInfoArgs} plus the following:
 * @property {LotStateDataItem[]} [lotStates] Either lotStates or accuontStateDataItem
 * may be specified, if lotStates is not then accountStateDataItem should be.
 * @property {AccountStateDataItem} [accountStateDataItem]
 * @property {GainHelpers~getGainPartsCallback} getGainParts
 * @property {GainHelpers~calcGainFromPartsCallback} [calcGainFromParts]
 * @property {QuantityDefinition} [gainQuantityDefinition] If specified this
 * is used to basically clean up the gainValue property of
 * {@link GainHelpers~LotStateGainResult}
 */

/**
 * @typedef {object} GainHelpers~LotStateGainResult
 * @property {GainHelpers~AccountStateInfo} accountStateInfo
 * @property {number} inputBaseValue
 * @property {number} outputBaseValue
 * @property {number} inputValue
 * @property {number} outputValue
 * @property {number} [gainValue]
 */

/**
 * Calculates gain for the {@link LotStateDataItem}s in an {@link AccountStateDataItem}
 * using callbacks to define the actual computations.
 * @param {GainHelpers~calcLotStateGainArgs} args {
 * @returns {GainHelpers~LotStateGainResult}
 * @memberof GainHelpers
 */
export function calcLotStateGain(args, lotStates) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    const { getGainParts, calcGainFromParts } = args;
    if (!getGainParts) {
        return;
    }


    let inputBaseValue = 0;
    let outputBaseValue = 0;

    lotStates = resolveLotStatesFromArgs(args, lotStates);
    if (lotStates) {

        lotStates.forEach((lotState) => {
            const gainParts = getGainParts(accountStateInfo, lotState);
            if (gainParts) {
                inputBaseValue += gainParts.inputBaseValue;
                outputBaseValue += gainParts.outputBaseValue;
            }
        });
    }

    const { currencyQuantityDefinition, gainQuantityDefinition } = accountStateInfo;
    const inputValue = currencyQuantityDefinition.baseValueToNumber(inputBaseValue);
    const outputValue = currencyQuantityDefinition.baseValueToNumber(outputBaseValue);

    let gainValue;
    
    if (calcGainFromParts) {
        gainValue = calcGainFromParts({
            inputValue: inputValue, 
            outputValue: outputValue,
        });

        if ((typeof gainValue === 'number') && gainQuantityDefinition) {
            const gainBaseValue = gainQuantityDefinition.numberToBaseValue(gainValue);
            gainValue = gainQuantityDefinition.baseValueToNumber(gainBaseValue);
        }
    }

    return {
        accountStateInfo: accountStateInfo,
        inputBaseValue: inputBaseValue,
        outputBaseValue: outputBaseValue,
        inputValue: inputValue,
        outputValue: outputValue,
        gainValue: gainValue,
    };
}


//
// Percent Annual Cash-In Gain:
// Sort the lot states by date
// Allocate non-cash-in lots to all prior lots
// For each lot:
//      Calculate CAGR
//      Weigh by #shares
// Have minimum lot age, or if lot less than a year old
// then use percent gain as-is, not CAGR.
//
// Percent Annual Gain:
// Non-cash-in shares are not distributed.
//
// function distributeNonCashInLots(lotStates)
//  Sorts lotStates by date then distributes non-cash-in lots to all
//  older lots.

/**
 * Distributes any non-cash-in lot states among all older lot states 
 * based on shares in the lot states.
 * @param {EngineAccessor} accessor 
 * @param {LotStateDataItem[]} lotStateDataItems This is not modified.
 * @returns {LotStateDataItem[]}    Will return lotStates if lotStates
 * does not have any non-cash-in lot states.
 * @throws Error
 */
export function distributeNonCashInLots(accessor, lotStateDataItems) {
    if (lotStateDataItems.length <= 1) {
        return lotStateDataItems;
    }

    const workingLotStates = [];

    let needsSorting;
    let hasNonCashIn;
    for (let i = 0; i < lotStateDataItems.length; ++i) {
        const workingLotState = LS.getLotState(lotStateDataItems[i], true);
        workingLotStates[i] = workingLotState;
        if (isLotStateCashIn(accessor, lotStateDataItems[i])) {
            workingLotState._isCashIn = true;
        }
        else {
            workingLotState._isCashIn = false;
            hasNonCashIn = true;
        }

        if (i > 0) {
            if (YMDDate.compare(workingLotState.ymdDateCreated, 
                workingLotStates[i - 1].ymdDateCreated) < 0) {
                needsSorting = true;
            }
        }
    }

    if (!hasNonCashIn) {
        return lotStateDataItems;
    }

    if (needsSorting) {
        workingLotStates.sort((a, b) => 
            YMDDate.compare(a.ymdDateCreated, b.ymdDateCreated));
    }

    let undistributedSharesBaseValue = 0;
    let result = [];
    for (let i = 0; i < workingLotStates.length; ++i) {
        const workingLotState = workingLotStates[i];
        if (!workingLotState._isCashIn) {
            // Distribute the shares...
            if (result.length) {
                distributeSharesToLotStates(workingLotState.quantityBaseValue, result);
            }
            else {
                // Nothing older to distribute to, distribute it to everyone later.
                undistributedSharesBaseValue += workingLotState.quantityBaseValue;
            }
        }
        else {
            delete workingLotState._isCashIn;
            result.push(LS.getLotStateDataItem(workingLotState));
        }
    }

    if (undistributedSharesBaseValue) {
        if (!result.length) {
            throw userError('GainHelpers-no_cash_in_accounts');
        }
        distributeSharesToLotStates(undistributedSharesBaseValue, result);
    }

    return result;
}


/**
 * Distributes shares among lot states based upon the number of shares in the
 * individual lot states. Note that the signs of the shares and the quantities
 * in the lot states are presumed to be the same, no check is made.
 * @param {number} sharesBaseValue 
 * @param {LotStateDataItem[]} lotStateDataItems The lot states are modified in place.
 * @returns {LotStateDataItem[]} Returns lotStateDataItems
 */
export function distributeSharesToLotStates(sharesBaseValue, lotStateDataItems) {
    let totalSharesBaseValue = 0;
    lotStateDataItems.forEach((lotState) => 
        totalSharesBaseValue += lotState.quantityBaseValue);

    if (totalSharesBaseValue) {
        let remianingSharesBaseValue = sharesBaseValue;
        const last = lotStateDataItems.length - 1;
        for (let i = 0; i < last; ++i) {
            const lotState = lotStateDataItems[i];
            const thisSharesBaseValue = Math.round(
                sharesBaseValue * lotState.quantityBaseValue / totalSharesBaseValue);
            lotState.quantityBaseValue += thisSharesBaseValue;
            remianingSharesBaseValue -= thisSharesBaseValue;
        }

        lotStateDataItems[last].quantityBaseValue += remianingSharesBaseValue;
    }

    return lotStateDataItems;
}


/**
 * @callback GainHelpers~getLotStatePart
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem
 * @returns {GainHelpers~getLotStatePart}
 */

/**
 * @typedef {object} GainHelpers~sumLotStatePartArgs
 * {@link GainHelpers~createAccountStateInfoArgs} plus the following:
 * @property {LotStateDataItem[]} [lotStates] Either lotStates or accuontStateDataItem
 * may be specified, if lotStates is not then accountStateDataItem should be.
 * @property {AccountStateDataItem} [accountStateDataItem]
 * @property {GainHelpers~getLotStatePart} getLotStatePart
 */

/**
 * Sums a part from an array of {@link LotStateDataItem}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {number|undefined}
 * @memberof GainHelpers
 */
export function sumLotStatePart(args, lotStates) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    const { getLotStatePart } = args;
    if (!getLotStatePart) {
        return;
    }

    let sumBaseValue = 0;

    lotStates = resolveLotStatesFromArgs(args, lotStates);
    if (lotStates) {
        lotStates.forEach((lotState) => {
            const baseValue = getLotStatePart(accountStateInfo, lotState);
            if (baseValue) {
                sumBaseValue += baseValue;
            }
        });
    }

    const { sumQuantityDefinition } = args;
    const quantityDefinition = sumQuantityDefinition 
        || accountStateInfo.currencyQuantityDefinition;

    return {
        quantityBaseValue: sumBaseValue,
        quantityDefinition: quantityDefinition,
    };
}


/**
 * Calculates the market value of an array of {@link LotState}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {number|undefined}
 */
export function getTotalMarketValueBaseValue(args, lotStates) {
    return sumLotStatePart(Object.assign({}, args, {
        getLotStatePart: calcLotStateMarketValueBaseValue,
    }),
    lotStates);
}


/**
 * Calculates the cost basis of an array of {@link LotState}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {number|undefined}
 */
export function getTotalCostBasisBaseValue(args, lotStates) {
    return sumLotStatePart(Object.assign({}, args, {
        getLotStatePart: getLotStateCostBasisBaseValue,
    }),
    lotStates);
}


/**
 * Calculates the cash-in of an array of {@link LotState}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {number|undefined}
 */
export function getTotalCashInBaseValue(args, lotStates) {
    return sumLotStatePart(Object.assign({}, args, {
        getLotStatePart: getLotStateCashInBaseValue,
    }),
    lotStates);
}

