import * as ASTH from './AccountingSystemTestHelpers';
import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from '../tools/EngineAccessTestHelpers';
import { accessSync } from 'fs';

const path = require('path');


test('AutoCompleteSplitsManager-getSplitInfos', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const acsManager = sys.accountingSystem.getAutoCompleteSplitsManager();
    const transactionManager = sys.accountingSystem.getTransactionManager();

    expect(acsManager.getSplitInfos(sys.checkingId, 'A test')).toEqual([]);

    //
    // Test Add...
    const transA = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-02',
        description: 'Withdraw $100.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -10000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: 10000,
            }
        ]
    })).newTransactionDataItem;
    expect(acsManager.getSplitInfos(sys.checkingId, '')).toEqual([]);
    expect(acsManager.getSplitInfos(sys.checkingId, 'A test')).toEqual([]);

    let result;
    result = acsManager.getSplitInfos(sys.checkingId, 'withdraw  $1');
    expect(result).toEqual([
        {
            description: transA.description,
            transactionId: transA.id,
            splitIndex: 0,
        }
    ]);

    result = acsManager.getSplitInfos(sys.cashId, 'W');
    expect(result).toEqual([
        {
            description: transA.description,
            transactionId: transA.id,
            splitIndex: 1,
        }
    ]);

    expect(acsManager.getSplitInfos(sys.savingsId, 'Withdraw')).toEqual([]);


    const transB = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-03',
        description: 'Weekly Paycheck',
        splits: [
            {
                accountId: sys.salaryId,
                quantityBaseValue: 200000,
            },
            {
                accountId: sys.checkingId,
                quantityBaseValue: 100000,
            },
            {
                accountId: sys.federalTaxesId,
                quantityBaseValue: 70000,
            },
            {
                accountId: sys.stateTaxesId,
                quantityBaseValue: 20000,
            },
            {
                accountId: sys.medicareTaxesId,
                quantityBaseValue: 2000,
            },
            {
                accountId: sys.socSecTaxesId,
                quantityBaseValue: 8000,
            },
        ]
    })).newTransactionDataItem;

    result = acsManager.getSplitInfos(sys.stateTaxesId, ' We');
    expect(result).toEqual([
        {
            description: transB.description,
            transactionId: transB.id,
            splitIndex: 3,
        }
    ]);

    result = acsManager.getSplitInfos(sys.checkingId, 'W');
    expect(result).toEqual([
        {
            description: transB.description,
            transactionId: transB.id,
            splitIndex: 1,
        },
        {
            description: transA.description,
            transactionId: transA.id,
            splitIndex: 0,
        },
    ]);

    result = acsManager.getSplitInfos(sys.checkingId, 'We');
    expect(result).toEqual([
        {
            description: transB.description,
            transactionId: transB.id,
            splitIndex: 1,
        },
    ]);


    //
    // Test modify
    const transA1 = (await transactionManager.asyncModifyTransaction(
        {
            id: transA.id,
            description: '  Weekend cash',
        }
    )).newTransactionDataItem;

    result = acsManager.getSplitInfos(sys.checkingId, 'We');
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        {
            description: transB.description,
            transactionId: transB.id,
            splitIndex: 1,
        },
        {
            description: transA1.description,
            transactionId: transA1.id,
            splitIndex: 0,
        },
    ]));

    result = acsManager.getSplitInfos(sys.checkingId, 'Weeke');
    expect(result.length).toEqual(1);
    expect(result).toEqual(expect.arrayContaining([
        {
            description: transA1.description,
            transactionId: transA1.id,
            splitIndex: 0,
        },
    ]));


    result = acsManager.getSplitInfos(sys.checkingId, 'Withdraw');
    expect(result).toEqual([]);


    //
    // Remove
    await transactionManager.asyncRemoveTransaction(transB.id);

    result = acsManager.getSplitInfos(sys.checkingId, 'W');
    expect(result.length).toEqual(1);
    expect(result).toEqual(expect.arrayContaining([
        {
            description: transA1.description,
            transactionId: transA1.id,
            splitIndex: 0,
        },
    ]));
});


test('AutoCompleteSplits-Handler', async () => {
    const baseDir = await createDir('AutoCompleteSplits');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupTestEngineAccess(pathName);

        let result;
        result = accessor.getAutoCompleteSplitInfos(sys.checkingId, 'Char');
        expect(result.length).toEqual(3);
        expect(result).toEqual(expect.arrayContaining([
            { description: 'Charity donation',
                transactionId: sys.transLId,
                splitIndex: 1,
            },
            { description: 'Charity donation',
                transactionId: sys.transMId,
                splitIndex: 1,
            },
            { description: 'Charity donation',
                transactionId: sys.transNId,
                splitIndex: 1,
            },
        ]));

        const accountingActions = accessor.getAccountingActions();
        const modifyTransMAction = accountingActions.createModifyTransactionAction({
            id: sys.transMId,
            description: 'Char1 donation',
        });
        await accessor.asyncApplyAction(modifyTransMAction);

        const removeTransLAction = accountingActions.createRemoveTransactionAction(
            sys.transLId
        );
        await accessor.asyncApplyAction(removeTransLAction);


        result = accessor.getAutoCompleteSplitInfos(sys.checkingId, 'Char');
        expect(result.length).toEqual(2);
        expect(result).toEqual(expect.arrayContaining([
            { description: 'Char1 donation',
                transactionId: sys.transMId,
                splitIndex: 1,
            },
            { description: 'Charity donation',
                transactionId: sys.transNId,
                splitIndex: 1,
            },
        ]));

        result = accessor.getAutoCompleteSplitInfos(sys.checkingId, 'Charity');
        expect(result.length).toEqual(1);
        expect(result).toEqual(expect.arrayContaining([
            { description: 'Charity donation',
                transactionId: sys.transNId,
                splitIndex: 1,
            },
        ]));

        await accessor.asyncWriteAccountingFile();
        await accessor.asyncCloseAccountingFile();


        await accessor.asyncOpenAccountingFile(pathName);

        result = accessor.getAutoCompleteSplitInfos(sys.checkingId, 'Char');

        expect(result.length).toEqual(2);
        expect(result).toEqual(expect.arrayContaining([
            { description: 'Char1 donation',
                transactionId: sys.transMId,
                splitIndex: 1,
            },
            { description: 'Charity donation',
                transactionId: sys.transNId,
                splitIndex: 1,
            },
        ]));

        result = accessor.getAutoCompleteSplitInfos(sys.checkingId, 'Charity');
        expect(result.length).toEqual(1);
        expect(result).toEqual(expect.arrayContaining([
            { description: 'Charity donation',
                transactionId: sys.transNId,
                splitIndex: 1,
            },
        ]));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }

});