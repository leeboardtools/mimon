import { getQuantityDefinition } from '../util/Quantities';
import { getCurrency } from '../util/Currency';
import * as AS from '../engine/AccountStates';
import * as A from '../engine/Accounts';
import * as L from '../engine/Lots';
import * as LS from '../engine/LotStates';
import { getYMDDate, YMDDate } from '../util/YMDDate';
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
// KEEP
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
// KEEP
export function percentGain({inputValue, outputValue}) {
    if ((typeof inputValue === 'number')
     && (typeof outputValue === 'number')) {
        if (inputValue) {
            return (outputValue - inputValue) * 100 / inputValue;
        }
    }
}


/**
 * @typedef {object} GainHelpers~compoundAnnualGrowthRateArgs
 * @property {number}   inputValue
 * @property {number}   outputValue
 * @property {YMDDate|string}   ymdDateInput
 * @property {YMDDate|string}   ymdDateOutput
 */

/**
 * Computes compound annual growth rate (CAGR)
 * @param {GainHelpers~compoundAnnualGrowthRateArgs} args
 * @returns {number|undefined} Returns <code>undefined</code> if inputValue
 * is 0 or the dates are not valid.
 */
// KEEP
export function compoundAnnualGrowthRate(
    {inputValue, ymdDateInput, outputValue, ymdDateOutput }) {

    ymdDateInput = getYMDDate(ymdDateInput);
    ymdDateOutput = getYMDDate(ymdDateOutput);

    if ((typeof inputValue === 'number')
     && (typeof outputValue === 'number')
     && inputValue
     && (ymdDateInput instanceof YMDDate)
     && (ymdDateOutput instanceof YMDDate)) {
        const years = ymdDateInput.fractionalYearsAfterMe(ymdDateOutput);
        return Math.pow(outputValue / inputValue, 1 / years) - 1;
    }
}


/**
 * @typedef {object} GainHelpers~AccountGainsStateDataItem
 * {@link AccountStateDataItem} with the following added:
 * @property {number} marketValueBaseValue
 * @property {number} costBasisBaseValue
 * @property {number} cashInBaseValue
 * @property {LotStateDataItem[]} [cashInLotStates] Only present if lotStates is also
 * present, the lot states adjusted to reflect the cash-in state.
 * @property {boolean} isQuantityShares This is true if the quantityBaseValue property
 * represents shares. This is needed so we can accumulate gain state values into an
 * outer gain state value that does not necessarily represent shares by concatenating 
 * the various lotState arrays.
 * @property {boolean} [isExcludeFromGain=false]
 */


/**
 * @typedef {object} GainHelpers~convertAccountStateForGainsArgs
 * @property {EngineAccess} accessor
 * @property {number} accountId
 * @property {AccountStateDataItem} accountState,
 * @property {PriceDataItem} priceDataItem
 * @property {boolean} [isExcludeFromGain=false]
 * @returns {GainHelpers~AccountGainsStateDataItem}
 */

// KEEP
export function accountStateToAccountGainsState(args) {
    const { 
        accessor, 
        accountId,
        isExcludeFromGain,
    } = args;

    let { accountState, } = args;
    if (!accountState) {
        return;
    }

    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (!accountDataItem) {
        return;
    }

    accountState = AS.getAccountStateDataItem(accountState, true);
    accountState.isQuantityShares = A.getAccountType(accountDataItem.type).hasLots;

    let { lotStates } = accountState;
    if (lotStates) {
        const accountStateInfo = createAccountStateInfo(args);

        let totalMarketValueBaseValue = 0;
        let totalCostBasisBaseValue = 0;
        for (let i = 0; i < lotStates.length; ++i) {
            const lotState = LS.getLotStateDataItem(lotStates[i], true);
            lotState.marketValueBaseValue = calcMarketValueBaseValueFromLotState(
                accountStateInfo, lotState);
            if (lotState.marketValueBaseValue) {
                totalMarketValueBaseValue += lotState.marketValueBaseValue;
            }
            if (lotState.costBasisBaseValue) {
                totalCostBasisBaseValue += lotState.costBasisBaseValue;
            }
            lotStates[i] = lotState;
        }

        accountState.lotStates = lotStates;

        const cashInLotStates = distributeNonCashInLots(
            accessor, lotStates);

        let totalCashInBaseValue = 0;
        cashInLotStates.forEach((lotState) => {
            lotState.marketValueBaseValue = calcMarketValueBaseValueFromLotState(
                accountStateInfo, lotState);
            if (lotState.costBasisBaseValue) {
                totalCashInBaseValue += lotState.costBasisBaseValue;
            }
        });

        accountState.cashInLotStates = cashInLotStates;

        accountState.marketValueBaseValue = totalMarketValueBaseValue;
        accountState.costBasisBaseValue = totalCostBasisBaseValue;
        accountState.cashInBaseValue = totalCashInBaseValue;
    }
    else {
        accountState.marketValueBaseValue 
            = accountState.quantityBaseValue;
    }

    accountState.isExcludeFromGain = isExcludeFromGain;

    return accountState;
}


/**
 * Creates a copy of an account gains state.
 * @param {GainHelpers~AccountGainsStateDataItem} accountGainsState 
 * @returns {GainHelpers~AccountGainsStateDataItem}
 */
// KEEP!
export function cloneAccountGainsState(accountGainsState) {
    if (!accountGainsState) {
        return;
    }
    
    const toAccountGainsState = AS.getAccountStateDataItem(accountGainsState, true);
    if (accountGainsState.lotStates) {
        toAccountGainsState.lotStates 
            = Array.from(accountGainsState.lotStates);
    }
    if (accountGainsState.cashInLotStates) {
        toAccountGainsState.cashInLotStates 
            = Array.from(accountGainsState.cashInLotStates);
    }

    return toAccountGainsState;
}


/**
 * Adds the contents of fromAccountGainsState to toAccountGainsState, returning a copy
 * of fromAccountGainsState if toAccountGainsState is undefined.
 * @param {GainHelpers~AccountGainsStateDataItem} toAccountGainsState 
 * @param {GainHelpers~AccountGainsStateDataItem} fromAccountGainsState 
 * @returns {GainHelpers~AccountGainsStateDataItem}
 */
// KEEP!
export function addAccountGainsState(toAccountGainsState, fromAccountGainsState) {
    if (!fromAccountGainsState) {
        return toAccountGainsState;
    }

    if (!toAccountGainsState) {
        toAccountGainsState = AS.getAccountStateDataItem(fromAccountGainsState, true);
        if (fromAccountGainsState.lotStates) {
            toAccountGainsState.lotStates 
                = Array.from(fromAccountGainsState.lotStates);
        }
        if (fromAccountGainsState.cashInLotStates) {
            toAccountGainsState.cashInLotStates 
                = Array.from(fromAccountGainsState.cashInLotStates);
        }
    }
    else {
        if (!fromAccountGainsState.isExcludeFromGain) {
            if (fromAccountGainsState.lotStates) {
                toAccountGainsState.lotStates 
                    = (toAccountGainsState.lotStates || []).concat(
                        fromAccountGainsState.lotStates);
            }

            if (fromAccountGainsState.cashInLotStates) {
                toAccountGainsState.cashInLotStates 
                    = (toAccountGainsState.cashInLotStates || []).concat(
                        fromAccountGainsState.cashInLotStates);
            }
        }

        if (fromAccountGainsState.quantityBaseValue
         && ((!toAccountGainsState.isQuantityShares && !fromAccountGainsState.lotStates)
          || (toAccountGainsState.isQuantityShares && fromAccountGainsState.lotStates)
         )) {
            toAccountGainsState.quantityBaseValue
                = (toAccountGainsState.quantityBaseValue || 0)
                    + fromAccountGainsState.quantityBaseValue;
        }

        if (fromAccountGainsState.marketValueBaseValue) {
            toAccountGainsState.marketValueBaseValue 
                = (toAccountGainsState.marketValueBaseValue || 0)
                    + fromAccountGainsState.marketValueBaseValue;
        }

        if (fromAccountGainsState.costBasisBaseValue) {
            toAccountGainsState.costBasisBaseValue
                = (toAccountGainsState.costBasisBaseValue || 0)
                    + fromAccountGainsState.costBasisBaseValue;
        }

        if (fromAccountGainsState.cashInBaseValue) {
            toAccountGainsState.cashInBaseValue
                = (toAccountGainsState.cashInBaseValue || 0)
                    + fromAccountGainsState.cashInBaseValue;
        }
    }

    return toAccountGainsState;
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
// KEEP
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

    let currency = accessor.getBaseCurrencyCode();
    let sharesQuantityDefinition = accessor.getDefaultSharesQuantityDefinition();

    const pricedItemDataItem = accessor.getPricedItemDataItemWithId(pricedItemId);
    if (pricedItemDataItem) {
        sharesQuantityDefinition = getQuantityDefinition(
            pricedItemDataItem.quantityDefinition);
        currency = pricedItemDataItem.currency;
    }
    currency = getCurrency(currency);

    if (!sharesQuantityDefinition || !currency) {
        return;
    }

    return Object.assign({}, args, {
        pricedItemDataItem: pricedItemDataItem,
        sharesQuantityDefinition: sharesQuantityDefinition,
        currency: currency,
        currencyQuantityDefinition: currency.getQuantityDefinition(),
    });
}


// KEEP
function calcMarketValueBaseValueFromLotState(
    accountStateInfo, lotStateDataItem) {

    const { sharesQuantityDefinition, currencyQuantityDefinition,
        priceDataItem } = accountStateInfo;
    if (!priceDataItem) {
        return lotStateDataItem.costBasisBaseValue;
    }

    const sharesValue = sharesQuantityDefinition.baseValueToNumber(
        lotStateDataItem.quantityBaseValue);
    const marketValue = sharesValue * priceDataItem.close;
    return currencyQuantityDefinition.numberToBaseValue(
        marketValue);
}


/**
 * Adds the marketValueBaseValue property to an array of lot states.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem[]} lotStates 
 */
export function addMarketValueBaseValueToLotStates(accountStateInfo, lotStates) {
    lotStates.forEach((lotState) => {
        lotState.marketValueBaseValue = calcLotStateMarketValueBaseValue(accountStateInfo,
            lotState.quantityBaseValue);
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

    let lotState;
    if (typeof sharesQuantityBaseValue === 'object') {
        lotState = sharesQuantityBaseValue;
        if (typeof sharesQuantityBaseValue.marketValueBaseValue === 'number') {
            return sharesQuantityBaseValue.marketValueBaseValue;
        }
        
        sharesQuantityBaseValue = sharesQuantityBaseValue.quantityBaseValue;
    }

    const { sharesQuantityDefinition, currencyQuantityDefinition,
        priceDataItem } = accountStateInfo;
    if (!priceDataItem) {
        return (lotState) ? lotState.costBasisBaseValue : undefined;
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
 * Retrieves the gain parts for simple gain from an 
 * {@link GainHelpers~AccountGainsState}
 * @param {GainHelpers~AccountGainsState} accountGainsState 
 * @returns {GainHelpers~GainParts}
 */
// KEEP
export function getAccountGainsStateSimpleGainParts(accountGainsState) {
    if (accountGainsState) {
        return {
            inputBaseValue: accountGainsState.costBasisBaseValue,
            outputBaseValue: accountGainsState.marketValueBaseValue,
        };
    }
}

/**
 * Retrieves the lot state array for cash-in gain from an
 * {@link GainHelpers~AccountGainsState}
 * @param {GainHelpers~AccountGainsState} accountGainsState 
 * @returns {LotStateDataItem[]}
 */
// KEEP
export function getAccountGainsStateSimpleGainLotStates(accountGainsState) {
    if (accountGainsState) {
        return accountGainsState.lotStates;
    }
}

/**
 * Calculates the gain parts for simple gain, which uses the full cost basis.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {GainHelpers~GainParts|undefined}
 * @memberof GainHelpers
 */
// GOES AWAY
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
// KEEP
export function isLotStateCashIn(accessor, lotStateDataItem) {
    if (lotStateDataItem) {
        const lotDataItem = accessor.getLotDataItemWithId(lotStateDataItem.lotId);
        if (lotDataItem) {
            return lotDataItem.lotOriginType === L.LotOriginType.CASH_PURCHASE.name;
        }
    }
}



/**
 * Retrieves the gain parts for cash-in gain from an 
 * {@link GainHelpers~AccountGainsState}
 * @param {GainHelpers~AccountGainsState} accountGainsState 
 * @returns {GainHelpers~GainParts}
 */
// KEEP
export function getAccountGainsStateCashInGainParts(accountGainsState) {
    if (accountGainsState) {
        return {
            inputBaseValue: accountGainsState.cashInBaseValue,
            outputBaseValue: accountGainsState.marketValueBaseValue,
        };
    }
}

/**
 * Retrieves the lot state array for cash-in gain from an
 * {@link GainHelpers~AccountGainsState}
 * @param {GainHelpers~AccountGainsState} accountGainsState 
 * @returns {LotStateDataItem[]}
 */
// KEEP
export function getAccountGainsStateCashInLotStates(accountGainsState) {
    if (accountGainsState) {
        return accountGainsState.cashInLotStates;
    }
}


/**
 * Calculates the gain parts for cash-in gain, which only includes lots for which
 * {@link GainHelpers.isLotStateCashIn} returns <code>true<.code>.
 * @param {GainHelpers~AccountStateInfo} accountStateInfo 
 * @param {LotStateDataItem} lotStateDataItem 
 * @returns {GainHelpers~GainParts}
 * @memberof GainHelpers
 */
// GOES AWAY
export function getLotStateCashInGainParts(accountStateInfo, lotStateDataItem) {
    return {
        inputBaseValue: getLotStateCashInBaseValue(accountStateInfo,
            lotStateDataItem),
        outputBaseValue: calcLotStateMarketValueBaseValue(accountStateInfo,
            lotStateDataItem),
    };
}


function resolveLotStatesFromArgs(args, lotStates, lotStatesName) {
    const { accountGainsState } = args;
    if (accountGainsState) {
        return accountGainsState[lotStatesName];
    }

    lotStatesName = lotStatesName || 'lotStates';
    if (lotStates) {
        if (lotStates[lotStatesName]) {
            // it's an AccountStateDataItem...
            lotStates = lotStates[lotStatesName];
        }
    }
    else {
        lotStates = args[lotStatesName];
    }
    if (!lotStates) {
        const { accountStateDataItem } = args;
        if (accountStateDataItem) {
            lotStates = accountStateDataItem[lotStatesName];
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
 * @param {GainHelpers~calcLotStateGainArgs} args
 * @param {LotStateDataItem[]|AccountStateDataItem}  [lotStates]
 * @returns {GainHelpers~LotStateGainResult}
 * @memberof GainHelpers
 */
// KEEP
export function calcLotStateGain(args, lotStates) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    const { getGainPartsOfAccountGainsState, getGainParts, calcGainFromParts } = args;
    if (!getGainPartsOfAccountGainsState && !getGainParts) {
        return;
    }


    let inputBaseValue = 0;
    let outputBaseValue = 0;
    let isGain;

    // Clean Up!
    const { accountGainsState } = args;
    if (accountGainsState && getGainPartsOfAccountGainsState) {
        if (accountGainsState.isExcludeFromGain) {
            return;
        }

        const result = getGainPartsOfAccountGainsState(accountGainsState);
        if (!result) {
            return;
        }

        inputBaseValue = result.inputBaseValue;
        outputBaseValue = result.outputBaseValue;
        isGain = inputBaseValue !== 0;
    }
    else {
        lotStates = resolveLotStatesFromArgs(args, lotStates, 'gainLotStates');
    }
    if (lotStates) {

        lotStates.forEach((lotState) => {
            const gainParts = getGainParts(accountStateInfo, lotState);
            if (gainParts 
             && (gainParts.inputBaseValue !== undefined)
             && (gainParts.outputBaseValue !== undefined)) {
                inputBaseValue += gainParts.inputBaseValue;
                outputBaseValue += gainParts.outputBaseValue;
                isGain = true;
            }
        });
    }

    if (!isGain) {
        return;
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
            gainValue = gainQuantityDefinition.cleanupNumber(gainValue);
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


/**
 * @typedef {object} GainHelpers~calcLotStatePercentAnnualGainArgs
 * {@link GainHelpers~createAccountStateInfoArgs} plus the following:
 * @property {YMDDate|string} [ymdDateRef] If specified the reference date for the
 * annual gain, otherwise today will be used.
 * @property {LotStateDataItem[]} [lotStates] Either lotStates or accuontStateDataItem
 * may be specified, if lotStates is not then accountStateDataItem should be or
 * passed as the second arg to {@link calcLotStatePercentAnnualGainArgs}.
 * @property {AccountStateDataItem} [accountStateDataItem]
 */

/**
 * @typedef {object} GainHelpers~LotPercentAnnualGainInfo
 * @property {LotStateDataItem} lotState
 * @property {number}   percentAnnualGain
 * @property {boolean}  isStraightGain This is <code>true</code> if 
 * percentAnnualGain is just the straight gain.
 */

/**
 * @typedef {object} GainHelpers~LotStatePercentAnnualGainResult
 * @property {GainHelpers~AccountStateInfo} accountStateInfo
 * @property {GainHelpers~LotPercentAnnualGainInfo[]} lotPercentAnnualGains
 * @property {number} percentAnnualGain
 * @property {number} percentAnnualGainBaseValue
 */

export function calcAccountGainsStatePercentAnnualGain(args) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    const { accountGainsState, getLotStatesFromAccountGainsState } = args;
    if (!accountGainsState || !getLotStatesFromAccountGainsState
     || accountGainsState.isExcludeFromGain) {
        return;
    }

    const lotStates = getLotStatesFromAccountGainsState(accountGainsState);
    if (!lotStates) {
        return;
    }

    let { ymdDateRef } = args;
    if (!ymdDateRef) {
        ymdDateRef = new YMDDate();
    }
    else {
        ymdDateRef = getYMDDate(ymdDateRef);
    }
    const ymdDateYearOld = ymdDateRef.addYears(-1);

    let totalSharesBaseValue = 0;
    lotStates.forEach((lotState) => totalSharesBaseValue += lotState.quantityBaseValue);

    const lotPercentAnnualGains = [];
    let percentAnnualGain = 0;

    const percentQuantityDefinition 
        = accountStateInfo.accessor.getPercentGainQuantityDefinition();

    for (let i = 0; i < lotStates.length; ++i) {
        const lotState = lotStates[i];
        const ymdDateCreated = getYMDDate(lotState.ymdDateCreated);

        const { marketValueBaseValue } = lotState;

        let percentGainValue;
        let isStraightGain;
        if (YMDDate.compare(ymdDateYearOld, ymdDateCreated) < 0) {
            // Too soon, just do straight percentage
            // OK to use base values...
            percentGainValue = percentGain({
                inputValue: lotState.costBasisBaseValue,
                outputValue: marketValueBaseValue,
            });
            isStraightGain = true;
        }
        else {
            // Do CAGR
            percentGainValue = compoundAnnualGrowthRate({
                inputValue: lotState.costBasisBaseValue,
                outputValue: marketValueBaseValue,
                ymdDateInput: lotState.ymdDateCreated,
                ymdDateOutput: ymdDateRef,
            }) * 100;
        }

        percentGainValue = percentQuantityDefinition.cleanupNumber(percentGainValue);

        lotPercentAnnualGains.push({
            lotState: lotState,
            percentAnnualGain: percentGainValue,
            isStraightGain: isStraightGain,
        });

        if (percentAnnualGain !== undefined) {
            percentAnnualGain += percentGainValue * lotState.quantityBaseValue
                / totalSharesBaseValue;
        }
    }

    const percentAnnualGainBaseValue 
        = percentQuantityDefinition.numberToBaseValue(percentAnnualGain);
    percentAnnualGain = percentQuantityDefinition.baseValueToNumber(
        percentAnnualGainBaseValue
    );

    return {
        accountStateInfo: accountStateInfo,
        lotPercentAnnualGains: lotPercentAnnualGains,
        percentAnnualGain: percentAnnualGain,
        percentAnnualGainBaseValue: percentAnnualGainBaseValue,
        ymdDateRef: ymdDateRef.toString(),
    };
}



/**
 * Calculates the weighted percent annual gain for lot states.
 * <p>
 * Note that for any lots that are less than a year old the straight gain 
 * is used to avoid having those unduly influencing the overall gain.
 * @param {GainHelpers~LotPercentAnnualGainInfo} args 
 * @param {LotStateDataItem[]|AccountStateDataItem}  [lotStates]
 * @returns {GainHelpers~LotStatePercentAnnualGainResult}
 * @memberof GainHelpers
 */
// GOES AWAY
export function calcLotStatePercentAnnualGain(args, lotStates) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    lotStates = resolveLotStatesFromArgs(args, lotStates, 'gainLotStates');
    if (!lotStates) {
        return;
    }

    let { ymdDateRef } = args;
    if (!ymdDateRef) {
        ymdDateRef = new YMDDate();
    }
    else {
        ymdDateRef = getYMDDate(ymdDateRef);
    }
    const ymdDateYearOld = ymdDateRef.addYears(-1);

    let totalSharesBaseValue = 0;
    lotStates.forEach((lotState) => totalSharesBaseValue += lotState.quantityBaseValue);

    const lotPercentAnnualGains = [];
    let percentAnnualGain = 0;

    const percentQuantityDefinition 
        = accountStateInfo.accessor.getPercentGainQuantityDefinition();

    for (let i = 0; i < lotStates.length; ++i) {
        const lotState = lotStates[i];
        const ymdDateCreated = getYMDDate(lotState.ymdDateCreated);

        const marketValueBaseValue = calcLotStateMarketValueBaseValue(
            accountStateInfo, lotState);

        let percentGainValue;
        let isStraightGain;
        if (YMDDate.compare(ymdDateYearOld, ymdDateCreated) < 0) {
            // Too soon, just do straight percentage
            // OK to use base values...
            percentGainValue = percentGain({
                inputValue: lotState.costBasisBaseValue,
                outputValue: marketValueBaseValue,
            });
            isStraightGain = true;
        }
        else {
            // Do CAGR
            percentGainValue = compoundAnnualGrowthRate({
                inputValue: lotState.costBasisBaseValue,
                outputValue: marketValueBaseValue,
                ymdDateInput: lotState.ymdDateCreated,
                ymdDateOutput: ymdDateRef,
            }) * 100;
        }

        percentGainValue = percentQuantityDefinition.cleanupNumber(percentGainValue);

        lotPercentAnnualGains.push({
            lotState: lotState,
            percentAnnualGain: percentGainValue,
            isStraightGain: isStraightGain,
        });

        if (percentAnnualGain !== undefined) {
            percentAnnualGain += percentGainValue * lotState.quantityBaseValue
                / totalSharesBaseValue;
        }
    }

    const percentAnnualGainBaseValue 
        = percentQuantityDefinition.numberToBaseValue(percentAnnualGain);
    percentAnnualGain = percentQuantityDefinition.baseValueToNumber(
        percentAnnualGainBaseValue
    );

    return {
        accountStateInfo: accountStateInfo,
        lotPercentAnnualGains: lotPercentAnnualGains,
        percentAnnualGain: percentAnnualGain,
        percentAnnualGainBaseValue: percentAnnualGainBaseValue,
        ymdDateRef: ymdDateRef.toString(),
    };
}


/**
 * Calculates the weighted percent annual cash-in gain for lot states. 
 * Non-cash-in lots are distributed using 
 * {@link distributeNonCashInLots}.
 * <p>
 * Note that for any lots that are less than a year old the straight gain 
 * is used to avoid having those unduly influencing the overall gain.
 * @param {GainHelpers~LotPercentAnnualGainInfo} args 
 * @param {LotStateDataItem[]|AccountStateDataItem}  [lotStates]
 * @returns {GainHelpers~LotStatePercentAnnualGainResult}
 * @memberof GainHelpers
 */
// GOES AWAY
export function calcLotStateCashInPercentAnnualGain(args, lotStates) {
    lotStates = resolveLotStatesFromArgs(args, lotStates, 'gainLotStates');
    if (!lotStates) {
        return;
    }

    lotStates = distributeNonCashInLots(args.accessor, lotStates);
    return calcLotStatePercentAnnualGain(args, lotStates);
}


/**
 * Distributes any non-cash-in lot states among all older lot states 
 * based on shares in the lot states.
 * @param {EngineAccessor} accessor 
 * @param {LotStateDataItem[]} lotStateDataItems This is not modified.
 * @returns {LotStateDataItem[]}    Will return lotStates if lotStates
 * does not have any non-cash-in lot states.
 * @throws Error
 * @memberof GainHelpers
 */
// KEEP
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
 * @memberof GainHelpers
 */
// KEEP
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
// GOES AWAY
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
 * @typedef {object} GainHelpers~LotStateDataItemWithMarketValue
 * A {@link LotStateDataItem} with the following additional properties:
 * @property {number} marketValueBaseValue
 */


/**
 * @typedef {object} GainHelpers~getTotalMarketValueBaseValueResult
 * @property {number} quantityBaseValue
 * @property {string} quantityDefinition
 * @property {GainHelpers~LotStateDataItemWithMarketValue[]} lotStatesWithMarketValue
 */

/**
 * Calculates the market value of an array of {@link LotState}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {GainHelpers~getTotalMarketValueBaseValueResult|undefined}
 * @memberof GainHelpers
 */
// GOES AWAY
export function getTotalMarketValueBaseValue(args, lotStates) {
    const accountStateInfo = createAccountStateInfo(args);
    if (!accountStateInfo) {
        return;
    }

    let sumBaseValue = 0;

    let lotStatesWithMarketValue;
    lotStates = resolveLotStatesFromArgs(args, lotStates);
    if (lotStates) {
        lotStatesWithMarketValue = [];

        lotStates.forEach((lotState) => {
            const marketValueBaseValue = calcLotStateMarketValueBaseValue(
                accountStateInfo, lotState);
            if (marketValueBaseValue === undefined) {
                return;
            }

            sumBaseValue += marketValueBaseValue;
            lotStatesWithMarketValue.push(Object.assign({}, lotState, {
                marketValueBaseValue: marketValueBaseValue,
            }));
        });
    }

    const { sumQuantityDefinition } = args;
    const quantityDefinition = sumQuantityDefinition 
        || accountStateInfo.currencyQuantityDefinition;

    return {
        quantityBaseValue: sumBaseValue,
        quantityDefinition: quantityDefinition,
        lotStatesWithMarketValue: lotStatesWithMarketValue,
    };
}


/**
 * Calculates the cost basis of an array of {@link LotState}s.
 * @param {GainHelpers~sumLotStatePartArgs} args 
 * @param {LotStateDataItem[]|AccountStateDataItem} [lotStates=undefined]
 * If this is specified then it is the lot state array or account state
 * to sum over, otherwise args is expected to have the lot state array
 * or account state.
 * @returns {number|undefined}
 * @memberof GainHelpers
 */
// GOES AWAY
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
 * @memberof GainHelpers
 */
// GOES AWAY
export function getTotalCashInBaseValue(args, lotStates) {
    return sumLotStatePart(Object.assign({}, args, {
        getLotStatePart: getLotStateCashInBaseValue,
    }),
    lotStates);
}

