import * as LTH from './LotTransactionHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as T from '../engine/Transactions';

import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as path from 'path';


test('asyncCreateSplitDataItemForSPLIT', async () => {
    const baseDir = await createDir('LotTransactionHelpers');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'asyncCreateSplitDataItemForSPLIT');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);
        
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);

        const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        let result;

        //
        // Single lot tests...

        // ymdDate
        result = await LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            ymdDate: '2005-02-19',
            deltaSharesBaseValue: 500000,
        });

        expect(result).toEqual({
            accountId: aaplAccountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: [
                {
                    lotId: lotAId,
                    quantityBaseValue: 500000,
                }
            ]
        });
        
        // transaction id
        result = await LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            transactionId: transactionKeys[1].id,
            deltaSharesBaseValue: 500000,
        });

        expect(result).toEqual({
            accountId: aaplAccountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: [
                {
                    lotId: lotAId,
                    quantityBaseValue: 500000,
                }
            ]
        });

        // Merge
        result = await LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            transactionId: transactionKeys[1].id,
            deltaSharesBaseValue: -250000,
        });

        expect(result).toEqual({
            accountId: aaplAccountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: [
                {
                    lotId: lotAId,
                    quantityBaseValue: -250000,
                }
            ]
        });

        // Merge too big
        await expect(LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            transactionId: transactionKeys[1].id,
            deltaSharesBaseValue: -500000,
        })).rejects.toThrow();


        //
        // Multiple lots:
        result = await LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            ymdDate: '2020-08-30',
            deltaSharesBaseValue: 51214713,
        });
        expect(result).toEqual({
            accountId: aaplAccountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: [
                {
                    lotId: lotAId,
                    quantityBaseValue: 26000000 - 6500000,
                },
                {
                    lotId: lotCId,
                    quantityBaseValue: 42000000 - 10500000,
                },
                {
                    lotId: lotEId,
                    quantityBaseValue: 286284 - 71571,
                },
            ]
        });


        // No lots...
        await expect(LTH.asyncCreateSplitDataItemForSPLIT({
            accessor: accessor,
            accountId: aaplAccountId,
            transactionId: transactionKeys[0].id,
            deltaSharesBaseValue: 500000,
        })).rejects.toThrow();


        //
        // All done...
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }

});


test('asyncCreateTransactionDataItemForRETURN_OF_CAPITAL', async () => {
    const baseDir = await createDir('LotTransactionHelpers');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 
            'asyncCreateTransactionDataItemForRETURN_OF_CAPITAL');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName,
            {
                noReverseSplits: true,
            });
        
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const longTermCGAccountId 
            = sys['INCOME-Capital Gains-Long Term Capital GainsAccountId'];
        const shortTermCGAccountId 
            = sys['INCOME-Capital Gains-Short Term Capital GainsAccountId'];
        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);

        const transactionIdsByYMDDateString = new Map();
        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));

        const accountingActions = accessor.getAccountingActions();

        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        let result;
        //let transactionId;

        // On 2020-08-31 have
        // A: 2005-02-18: 2600.0000, cb: 4034.59
        // C: 2005-03-11: 4200.0000, cb: 6051.71
        // E: 2014-08-14: 28.6284, cb: 697.96

        result = await LTH.asyncCreateTransactionDataItemForRETURN_OF_CAPITAL({
            accessor: accessor,
            accountId: aaplAccountId,
            ymdDate: '2020-09-01',
            rocBaseValue: 500000,
        });

        expect(result).toEqual({
            ymdDate: '2020-09-01',
            splits: [
                {
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            costBasisBaseValue: -190375,
                        },
                        {
                            lotId: lotCId,
                            costBasisBaseValue: -307529,
                        },
                        {
                            lotId: lotEId,
                            costBasisBaseValue: -2096,
                        },
                    ]),
                    quantityBaseValue: 0,
                }
            ]
        });


        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000, cb: 4251.84
        // C: 2005-03-11: 1050.0000, cb: 6051.71
        // B: 2014-06-13: 100.0000, cb: 9424.00
        // E: 2014-08-14: 7.1571, cb: 697.96

        // Test capital gains and losses...

        result = await LTH.asyncCreateTransactionDataItemForRETURN_OF_CAPITAL({
            accessor: accessor,
            accountId: aaplAccountId,
            ymdDate: '2014-08-15',
            rocBaseValue: 17500000,
        });

        expect(result).toEqual({
            ymdDate: '2014-08-15',
            splits: expect.arrayContaining([
                {
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            costBasisBaseValue: -425184,
                        },
                        {
                            lotId: lotCId,
                            costBasisBaseValue: -605171,
                        },
                        {
                            lotId: lotBId,
                            costBasisBaseValue: -942400,
                        },
                        {
                            lotId: lotEId,
                            costBasisBaseValue: -67991,
                        },
                    ]),
                    quantityBaseValue: -15459254,
                },
                {
                    accountId: longTermCGAccountId,
                    quantityBaseValue: -15451681,
                },
                {
                    accountId: shortTermCGAccountId,
                    quantityBaseValue: -7573,
                },
            ]),
        });
        
        const actionA = accountingActions.createAddTransactionAction(result);
        result = await accessor.asyncApplyAction(actionA);
        const transA = result.newTransactionDataItem;

        result = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transA.id,
        );
        result = result[0];
        expect(result).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2014-06-10',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 1805,
                    ymdDateCreated: '2014-08-14',
                }),
            ]),
            quantityBaseValue: 18421571,
            ymdDate: '2014-08-15',
        }));


        //
        // Update existing transaction...

        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000, cb: 4251.84
        // C: 2005-03-11: 1050.0000, cb: 6051.71
        // B: 2014-06-13: 100.0000, cb: 9424.00
        // E: 2014-08-14: 7.1571, cb: 697.96

        result = await LTH.asyncCreateTransactionDataItemForRETURN_OF_CAPITAL({
            accessor: accessor,
            accountId: aaplAccountId,
            transactionId: transA.id,
            rocBaseValue: 1000000,
        });

        expect(result.splits.length).toEqual(1);
        expect(result).toEqual({
            id: transA.id,
            ymdDate: '2014-08-15',
            splits: expect.arrayContaining([
                {
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            costBasisBaseValue: -371847,
                        },
                        {
                            lotId: lotCId,
                            costBasisBaseValue: -569984,
                        },
                        {
                            lotId: lotBId,
                            costBasisBaseValue: -54284,
                        },
                        {
                            lotId: lotEId,
                            costBasisBaseValue: -3885,
                        },
                    ]),
                    quantityBaseValue: 0,
                },
            ]),
        });

        const actionB = await accountingActions.asyncCreateModifyTransactionsAction(
            result);
        result = await accessor.asyncApplyAction(actionB);

        result = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transA.id,
        );
        result = result[0];
        expect(result).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 53337,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 35187,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 888116,
                    ymdDateCreated: '2014-06-10',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 65911,
                    ymdDateCreated: '2014-08-14',
                }),
            ]),
            quantityBaseValue: 18421571,
            ymdDate: '2014-08-15',
        }));


        // Make sure undo works...
        await accessor.asyncUndoLastAppliedAction();
        
        result = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transA.id,
        );
        result = result[0];
        expect(result).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 0,
                    ymdDateCreated: '2014-06-10',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 1805,
                    ymdDateCreated: '2014-08-14',
                }),
            ]),
            quantityBaseValue: 18421571,
            ymdDate: '2014-08-15',
        }));


        //
        // All done...
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }

});
