import { userError } from '../util/UserMessages';
import * as T from '../engine/Transactions';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import * as AH from './AccountHelpers';


async function asyncGetAccountStates(args) {
    const { accessor, accountId, transactionId } = args;
    let { ymdDate } = args;

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

    return accountStates;
}


/**
 * @typedef {object} LotTransactionHelpers~asyncCreateSplitDataItemForSPLITArgs
 * @property {EngineAccessor}   accessor
 * @property {number}   accountId
 * @property {number|string}   [transactionId] Either transactionId or ymdDate 
 * is required, only one can be specified.
 * @property {YMDDate|string}   [ymdDate]
 * @property {number}   deltaSharesBaseValue    The change in the total number of 
 * shares, > 0 for a stock split, < 0 for a reverse stock split.
 */

/**
 * Constructs a {@link SplitDataItem} for a {@link LotTransactionType.SPLIT} transasction.
 * @param {LotTransactionHelpers~asyncCreateSplitDataItemForSPLITArgs} args 
 * @returns {SplitDataItem}
 */
export async function asyncCreateSplitDataItemForSPLIT(args) {
    const { accessor, accountId, transactionId, 
        deltaSharesBaseValue } = args;

    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (!accountDataItem) {
        throw userError('LotTransactionHelpers-invalid_account', accountId);
    }
    
    let accountStates = await asyncGetAccountStates(args);
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
            lotShareBaseValues[i] * deltaSharesBaseValue / totalSharesBaseValue);
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



/**
 * @typedef {object} 
 *  LotTransactionHelpers~asyncCreateTransactionDataItemForRETURN_OF_CAPITALArgs
 * @property {EngineAccessor}   accessor
 * @property {number}   accountId
 * @property {number|string}   [transactionId] Either transactionId or ymdDate 
 * is required, only one can be specified.
 * @property {YMDDate|string}   [ymdDate]
 * @property {number}   rocBaseValue    The amount of capital returned, must be &gt; 0.
 */

//
//---------------------------------------------------------
//
function createROCLotChangeForLotState(args, lotState) {
    let rocToAllocate;
    if (args.allocateAll) {
        rocToAllocate = args.remainingROCBaseValue;
    }
    else {
        rocToAllocate = Math.round(args.rocBaseValue
            * lotState.quantityBaseValue / args.totalSharesBaseValue);
        args.remainingROCBaseValue -= rocToAllocate;
    }

    if (rocToAllocate <= 0) {
        return;
    }

    const lotChange = {
        lotId: lotState.lotId,        
    };

    if (rocToAllocate > lotState.costBasisBaseValue) {
        // Have some capital gains...
        const capitalGainsBaseValue = rocToAllocate - lotState.costBasisBaseValue;
        if (args.accessor.isLongTermCapitalGains(args.accountId, 
            lotState.ymdDateCreated,
            args.ymdDate)) {
            args.longTermCapitalGainsBaseValue += capitalGainsBaseValue;
        }
        else {
            args.shortTermCapitalGainsBaseValue += capitalGainsBaseValue;
        }

        lotChange.costBasisBaseValue = -lotState.costBasisBaseValue;
    }
    else {
        lotChange.costBasisBaseValue = -rocToAllocate;
    }

    return lotChange;
}

//
//---------------------------------------------------------
//
function createCapitalGainsSplitDataItem(accessor, accountId,
    splitAccountType, capitalGainsBaseValue) {
    const capitalGainsAccountId = AH.getDefaultSplitAccountId(
        accessor, accountId, splitAccountType);
    
    const category = accessor.getCategoryOfAccountId(capitalGainsAccountId);

    return {
        accountId: capitalGainsAccountId,
        quantityBaseValue: -category.creditSign * capitalGainsBaseValue,
    };
}

/**
 * Creates a transaction data item for a return of capital transaction.
 * @param {LotTransactionHelpers~asyncCreateTransactionDataItemForRETURN_OF_CAPITALArgs} 
 *  args 
 * @returns {TransactionDataItem}
 */
export async function asyncCreateTransactionDataItemForRETURN_OF_CAPITAL(args) {
    const { accessor, accountId, transactionId, 
        rocBaseValue } = args;
    
    if ((typeof rocBaseValue !== 'number') || (rocBaseValue <= 0)) {
        throw userError('LotTransactionHelpers-invalid_roc_value');
    }

    const accountDataItem = accessor.getAccountDataItemWithId(accountId);
    if (!accountDataItem) {
        throw userError('LotTransactionHelpers-invalid_account_roc', accountId);
    }
    
    let accountStates = await asyncGetAccountStates(args);
    if (!accountStates || !accountStates.length) {
        throw userError('LotTransactionHelpers-no_account_states_roc', transactionId);
    }

    const accountState = accountStates[accountStates.length - 1];
    const { lotStates } = accountState;
    if (!lotStates || !lotStates.length) {
        throw userError('LotTransactionHelpers-no_lots_roc');
    }

    let totalSharesBaseValue = 0;
    for (let i = 0; i < lotStates.length; ++i) {
        const { quantityBaseValue } = lotStates[i];
        totalSharesBaseValue += quantityBaseValue;
    }

    let { ymdDate } = args;
    if (!ymdDate) {
        const transactionDataItem 
            = await accessor.asyncGetTransactionDataItemWithId(transactionId);
        ymdDate = transactionDataItem.ymdDate;
    }

    const workingArgs = {
        totalSharesBaseValue: totalSharesBaseValue,
        longTermCapitalGainsBaseValue: 0,
        shortTermCapitalGainsBaseValue: 0,
        rocBaseValue: rocBaseValue,
        remainingROCBaseValue: rocBaseValue,

        accessor: args.accessor,
        accountId: accountId,
        ymdDate: getYMDDate(ymdDate),
    };

    const lotChanges = [];
    const lastIndex = lotStates.length - 1;
    for (let i = 0; i < lastIndex; ++i) {
        const lotChange = createROCLotChangeForLotState(
            workingArgs, lotStates[i]);
        if (lotChange) {
            lotChanges.push(lotChange);
        }
    }

    workingArgs.allocateAll = true;
    const lotChange = createROCLotChangeForLotState(
        workingArgs, lotStates[lastIndex]);
    if (lotChange) {
        lotChanges.push(lotChange);
    }

    const splits = [];
    const splitDataItem = {
        accountId: accountId,
        lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
        lotChanges: lotChanges,
        quantityBaseValue: rocBaseValue - workingArgs.longTermCapitalGainsBaseValue
            - workingArgs.shortTermCapitalGainsBaseValue,
    };
    if (!splitDataItem.quantityBaseValue) {
        // Just so we don't have to worry about -0.
        splitDataItem.quantityBaseValue = 0;
    }

    splits.push(splitDataItem);

    if (workingArgs.longTermCapitalGainsBaseValue) {
        splits.push(createCapitalGainsSplitDataItem(accessor, accountId,
            AH.DefaultSplitAccountType.LONG_TERM_CAPITAL_GAINS_INCOME,
            workingArgs.longTermCapitalGainsBaseValue,
        ));
    }
    if (workingArgs.shortTermCapitalGainsBaseValue) {
        splits.push(createCapitalGainsSplitDataItem(accessor, accountId,
            AH.DefaultSplitAccountType.SHORT_TERM_CAPITAL_GAINS_INCOME,
            workingArgs.shortTermCapitalGainsBaseValue,
        ));
    }
    if (workingArgs.ordinaryIncomeBaseValue) {
        splits.push(createCapitalGainsSplitDataItem(accessor, accountId,
            AH.DefaultSplitAccountType.ORDINARY_INCOME,
            workingArgs.ordinaryIncomeBaseValue,
        ));
    }

    splits.push({
        accountId: accountDataItem.parentAccountId,
        quantityBaseValue: rocBaseValue,
    });

    const transactionDataItem = {
        ymdDate: ymdDate,
        splits: splits,
    };
    if (transactionId) {
        transactionDataItem.id = transactionId;
    }
    
    return transactionDataItem;
}