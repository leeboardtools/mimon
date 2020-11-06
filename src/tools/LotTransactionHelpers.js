import { userError } from '../util/UserMessages';
import * as T from '../engine/Transactions';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import * as AH from './AccountHelpers';


/**
 * @typedef {object} LotTransactionHelpers~asyncCreateSplitDataItemForSPLITArgs
 * @property {EngineAccessor}   accessor
 * @property {number}   accountId
 * @property {number}   [transactionId] Either transactionId or ymdDate is required,
 * only one can be specified.
 * @property {YMDDate|string}   [ymdDate]
 * @property {number}   deltaSharesBaseValue
 */

/**
 * Constructs a {@link SplitDataItem} for a {@link LotTransactionType.SPLIT} transasction.
 * @param {LotTransactionHelpers~asyncCreateSplitDataItemForSPLITArgs} args 
 * @returns {SplitDataItem}
 */
export async function asyncCreateSplitDataItemForSPLIT(args) {
    const { accessor, accountId, transactionId, 
        deltaSharesBaseValue } = args;
    let { ymdDate } = args;

    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (!accountDataItem) {
        throw userError('LotTransactionHelpers-invalid_account', accountId);
    }
    
    let accountStates;
    if (ymdDate) {
        // This scenario would occur for new transactions...
        ymdDate = getYMDDate(ymdDate);
        if (!(ymdDate instanceof YMDDate)) {
            throw userError('LotTransactionHelpers-invalid_date', ymdDate);
        }

        const ymdDateRange = await accessor.asyncGetTransactionDateRange(accountId);
        const transactionDataItems 
            = await accessor.asyncGetTransactionDataItemsInDateRange(
                accountId,
                ymdDateRange[0],
                ymdDate,
            );
        
        const ymdDateString = ymdDate.toString();
        let previousTransactionId;
        for (let i = transactionDataItems.length - 1; i >= 0; --i) {
            if (transactionDataItems[i].ymdDate !== ymdDateString) {
                previousTransactionId = transactionDataItems[i].id;
                break;
            }
        }

        if (!previousTransactionId) {
            throw userError('LotTransactionHelpers-no_base_transaction');
        }

        // At this point previousTransactionId is the transaction that's immediately
        // before the date.
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            accountId, previousTransactionId
        );
    }
    else {
        accountStates = await accessor.asyncGetAccountStateDataItemsBeforeTransaction(
            accountId, transactionId
        );
    }
    if (!accountStates || !accountStates.length) {
        throw userError('LotTransactionHelpers-no_account_states', transactionId);
    }

    const accountState = accountStates[accountStates.length - 1];
    const { lotStates } = accountState;
    if (!lotStates || !lotStates.length) {
        throw userError('LotTransactionHelpers-no_lots');
    }

    let totalSharesBaseValue = 0;
    const lotShareBaseValues = [];
    for (let i = 0; i < lotStates.length; ++i) {
        const { quantityBaseValue } = lotStates[i];
        lotShareBaseValues.push(quantityBaseValue);
        totalSharesBaseValue += quantityBaseValue;
    }

    if (totalSharesBaseValue + deltaSharesBaseValue < 1) {
        const quantityDefinition = AH.getQuantityDefinitionForAccountId(accountId);
        throw userError('LotTransactionHelpers-merge_too_large',
            quantityDefinition.baseValueToValueText(deltaSharesBaseValue), 
            quantityDefinition.baseValueToValueText(totalSharesBaseValue));
    }

    const lotChanges = [];
    const lastIndex = lotStates.length - 1;
    let remainingSharesBaseValue = deltaSharesBaseValue;
    for (let i = 0; i < lastIndex; ++i) {
        let deltaQuantityBaseValue = Math.round(
            lotShareBaseValues[i] * deltaSharesBaseValue / totalSharesBaseValue, 0);
        if (deltaQuantityBaseValue + lotStates[i].quantityBaseValue < 0) {
            deltaQuantityBaseValue = 0;
        }
        
        if (deltaQuantityBaseValue) {
            lotChanges.push({
                lotId: lotStates[i].lotId,
                quantityBaseValue: deltaQuantityBaseValue,
            });
            remainingSharesBaseValue -= deltaQuantityBaseValue;
        }
    }

    if (remainingSharesBaseValue) {
        lotChanges.push({
            lotId: lotStates[lastIndex].lotId,
            quantityBaseValue: remainingSharesBaseValue,
        });
    }

    const splitDataItem = {
        accountId: accountId,
        lotTransactionType: T.LotTransactionType.SPLIT.name,
        lotChanges: lotChanges,
    };
    return splitDataItem;
}
