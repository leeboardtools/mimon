import * as LTH from './LotTransactionHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as T from '../engine/Transactions';

import { createDir, cleanupDir } from '../util/FileTestHelpers';
const path = require('path');


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
