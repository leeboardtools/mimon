import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from '../tools/EngineAccessTestHelpers';
import * as LCE from './LotCellEditors';
import * as T from '../engine/Transactions';
import * as path from 'path';


function removeLotIds(transactionDataItem) {
    transactionDataItem.splits.forEach((split) => {
        const { lotChanges } = split;
        if (lotChanges) {
            lotChanges.forEach((lotChange) => {
                delete lotChange.lotId;
            });
        }
    });
}



//
//---------------------------------------------------------
//
test('LotCellEditors-Basic', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'basic');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName, {
            isReopen: true,
            includeReverseSplit: true,
        });

        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        

        let transactionId;
        let transactionDataItem;
        let splitInfo;

        let accountStates;
        let accountState;

        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];
        const lotFId = sys['Lot FLotId'];

        //
        // A: Buy 50 sh for lot A
        //  { ymdDate: '2005-02-18', close: 1.55, },
        transactionId = transactionIdsByYMDDateString.get('2005-02-18');

        // splitInfo tested in 'LotCellEditors-BUY' test

        // On 2005-02-18 have
        // A: 2005-02-18: 50.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );

        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 500000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                })
            ]),
            quantityBaseValue: 500000,
            ymdDate: '2005-02-18',
        }));

        //
        // 2 for 1 split
        // '2005-02-28'
        transactionId = transactionIdsByYMDDateString.get('2005-02-28');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(500000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        // On 2005-02-28 have
        // A: 2005-02-28: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                })
            ]),
            quantityBaseValue: 1000000,
            ymdDate: '2005-02-28',
        }));


        //
        // Buy 200 shares for lotC
        // { ymdDate: '2005-03-11', close: 1.44, },
        transactionId = transactionIdsByYMDDateString.get('2005-03-11');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(2000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(806895);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(403200);
        

        // On 2014-03-11 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 200.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 2000000,
                    costBasisBaseValue: 806895,
                    ymdDateCreated: '2005-03-11',
                }),
            ]),
            quantityBaseValue: 3000000,
            ymdDate: '2005-03-11',
        }));



        //
        // Sell 50 shares LIFO
        // { ymdDate: '2014-05-19', close: 21.59, },
        transactionId = transactionIdsByYMDDateString.get('2014-05-19');

        // splitInfo tested in LotCellEditors-SELL_LIFO

        // On 2014-05-19 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 150.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 1500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
            ]),
            quantityBaseValue: 2500000,
            ymdDate: '2014-05-19',
        }));


        //
        // 7 for 1 split
        transactionId = transactionIdsByYMDDateString.get('2014-06-09');

        // splitInfo tested in LotCellEditors-SPLIT
        
        // On 2014-06-09 have
        // A: 2005-02-18: 700.0000
        // C: 2005-03-11: 1050.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 7000000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
            ]),
            quantityBaseValue: 17500000,
            ymdDate: '2014-06-09',
        }));


        //
        // Buy 100 shares for lotB
        // { ymdDate: '2014-06-10', close: 23.56, },
        transactionId = transactionIdsByYMDDateString.get('2014-06-10');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(942400);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(942400);

        
        // On 2014-06-10 have
        // A: 2005-02-18: 700.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-10: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 7000000,
                    costBasisBaseValue: 434495,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
            ]),
            quantityBaseValue: 18500000,
            ymdDate: '2014-06-10',
        }));



        //
        // Sell 15 shares FIFO
        //  { ymdDate: '2014-06-20', close: 22.73, },
        transactionId = transactionIdsByYMDDateString.get('2014-06-20');

        // splitInfo tested in LotCellEditors-SELL_FIFO test.
        
        // On 2014-06-20 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 425184,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
            ]),
            quantityBaseValue: 18350000,
            ymdDate: '2014-06-20',
        }));



        //
        // Reinvested Dividends
        // Dividend paid $0.1175
        // 1485 sh * 0.1175 = $174.49
        // { ymdDate: '2014-08-14', close: 24.38, },
        transactionId = transactionIdsByYMDDateString.get('2014-08-14');

        // splitInfo tested in LotCellEditors-REINVESTED_DIVIDEND test

        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 425184,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 18421571,
            ymdDate: '2014-08-14',
        }));

        
        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570

        //
        // Add 100 sh for lotF
        // { ymdDate: '2014-08-18', close: 24.79, },
        transactionId = transactionIdsByYMDDateString.get('2014-08-18');

        // splitInfo tested by LotCellEditors-ADD_SHARES test.
        
        // On 2014-08-18 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1571
        // F: 2014-08-18: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 425184,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
                expect.objectContaining({
                    lotId: lotFId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 991600,
                    ymdDateCreated: '2014-08-18'
                }),
            ]),
            quantityBaseValue: 19421571,
            ymdDate: '2014-08-18',
        }));

    
        //
        // Remove 25 sh of lotF
        // { ymdDate: '2015-03-12', close: 30.92, },
        transactionId = transactionIdsByYMDDateString.get('2015-03-12');

        // splitInfo tested in LotCellEditors-REMOVE_SHARES_BY_LOTS
        
        // On 2015-03-12 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1571
        // F: 2014-08-18: 75.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 425184,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
                expect.objectContaining({
                    lotId: lotFId,
                    quantityBaseValue: 750000,
                    costBasisBaseValue: 991600 * 3 / 4,
                    ymdDateCreated: '2014-08-18'
                }),
            ]),
            quantityBaseValue: 19171571,
            ymdDate: '2015-03-12',
        }));



        //
        // Remove the rest of lotF via LIFO
        //  { ymdDate: '2019-11-12', close: 65.49, },
        transactionId = transactionIdsByYMDDateString.get('2019-11-12');

        // splitInfo tested in LotCellEditors-REMOVE_SHARES_LIFO
        
        // On 2019-11-12 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1571
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6850000,
                    costBasisBaseValue: 425184,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 1000000,
                    costBasisBaseValue: 942400,
                    ymdDateCreated: '2014-06-10'
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 18421571,
            ymdDate: '2019-11-12',
        }));


        //
        // Sell 10 shares from lotB, 20 shares from lotA
        // on { ymdDate: '2020-01-24', close: 79.58, },
        transactionId = transactionIdsByYMDDateString.get('2020-01-24');

        // splitInfo tested in LotCellEditors-SELL_BY_LOTS test.
        
        // On 2020-01-24 have
        // A: 2005-02-18: 665.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 90.0000
        // E: 2014-08-14: 7.1570
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6650000,
                    costBasisBaseValue: 412770,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotBId,
                    quantityBaseValue: 900000,
                    costBasisBaseValue: 848160,
                    ymdDateCreated: '2014-06-10'
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 18121571,
            ymdDate: '2020-01-24',
        }));


        //
        // Sell all of lotB
        //  { ymdDate: '2020-01-31', close: 77.38, }
        transactionId = transactionIdsByYMDDateString.get('2020-01-31');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_BY_LOTS);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(900000);
        expect(splitInfo.editStates.shares.lotChanges).toEqual([
            expect.objectContaining({
                quantityBaseValue: -900000,
            }),
        ]);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(2785680);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(3095200);


        // On 2020-01-31 have
        // A: 2005-02-18: 665.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6650000,
                    costBasisBaseValue: 412770,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 17221571,
            ymdDate: '2020-01-31',
        }));


        //
        // Remove 15 sh FIFO
        //  { ymdDate: '2020-02-04', close: 79.71, },
        transactionId = transactionIdsByYMDDateString.get('2020-02-04');

        // splitInfo tested in LotCellEditors-REMOVE_SHARES_FIFO

        // On 2020-02-04 have
        // A: 2005-02-18: 650.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6500000,
                    costBasisBaseValue: 403459,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 17071571,
            ymdDate: '2020-02-04',
        }));


        //
        // 4 for 1 split
        transactionId = transactionIdsByYMDDateString.get('2020-08-31');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(51214713);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();

        // The cost bases coming in are:
        // Lot A: 4034.59
        // Lot C: 6051.71
        // Lot E: 697.96
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );

        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 26000000,
                    costBasisBaseValue: 403459,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 42000000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 286284,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 68286284,
            ymdDate: '2020-08-31',
        }));


        //
        // Reverse split
        // '2020-09-15'
        transactionId = transactionIdsByYMDDateString.get('2020-09-15');

        // splitInfo tested in LotCellEditors-REVERSE_SPLIT

        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionId
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 6500000,
                    costBasisBaseValue: 403459,
                    ymdDateCreated: '2005-02-18',
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: 10500000,
                    costBasisBaseValue: 605171,
                    ymdDateCreated: '2005-03-11',
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: 71571,
                    costBasisBaseValue: 69796,
                    ymdDateCreated: '2014-08-14'
                }),
            ]),
            quantityBaseValue: 17071571,
            ymdDate: '2020-09-15',
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});


//
//---------------------------------------------------------
//
test('LotCellEditors-BUY', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'BUY');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const brokerageAccountId = sys['ASSET-Investments-Brokerage AccountAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.fees.editorBaseValue = 500;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 123500;

        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2014-05-06',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: -123500,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 123000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [
                        {
                            quantityBaseValue: 1000000,
                            costBasisBaseValue: 123500,
                        }
                    ]
                }),
                expect.objectContaining({
                    accountId: feesAccountId,
                    quantityBaseValue: 500,
                })
            ]),
        }));


        //
        // Existing transaction

        // A: Buy 50 sh for lot A
        //  { ymdDate: '2005-02-18', close: 1.55, },
        const transactionId = transactionIdsByYMDDateString.get('2005-02-18');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(500000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(434495);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(868000);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);

        // Simple copySplitInfo() test.
        expect(originalSplitInfo).toEqual(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 123000;
        splitInfo.editStates.fees.editorBaseValue = '';

        // Quick test of copySplitInfo()'s copying of editStates.
        expect(splitInfo.editStates.shares.editorBaseValue)
            .not.toEqual(originalSplitInfo.editStates.shares.editorBaseValue);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .not.toEqual(originalSplitInfo.editStates.monetaryAmount.editorBaseValue);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .not.toEqual(originalSplitInfo.editStates.fees.editorBaseValue);


        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: -123000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 123000,
                    lotChanges: [
                        {
                            quantityBaseValue: 1000000,
                            costBasisBaseValue: 123000,
                        }
                    ]
                }),
            ]),
        }));


        //
        // Test updateSplitInfoValues()


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});


//
//---------------------------------------------------------
//
test('LotCellEditors-SELL_FIFO', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'SELL_FIFO');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const brokerageAccountId = sys['ASSET-Investments-Brokerage AccountAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        //const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.SELL_FIFO;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000 - 495);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 1230000 - 495,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.FIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
                expect.objectContaining({
                    accountId: feesAccountId,
                    quantityBaseValue: 495,
                }),
            ]),
        }));


        //
        // Existing transaction

        // On 2014-06-10 have
        // A: 2005-02-18: 700.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-10: 100.0000

        // Sell 15 shares FIFO
        //  { ymdDate: '2014-06-20', close: 22.73, },
        const transactionId = transactionIdsByYMDDateString.get('2014-06-20');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(150000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(136380);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(909200);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 495;

        // Quick tests of updateSplitInfoValues()
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.shares.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.fees.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);


        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(3);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 12300000 - 495,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -12300000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.FIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
                expect.objectContaining({
                    accountId: feesAccountId,
                    quantityBaseValue: 495,
                }),
            ]),
        }));


        //
        // Tests of updateSplitInfoValues(), no fees
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = undefined;


        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.shares.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        

        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});



//
//---------------------------------------------------------
//
test('LotCellEditors-SELL_LIFO', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'SELL_LIFO');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const brokerageAccountId = sys['ASSET-Investments-Brokerage AccountAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        //const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.SELL_LIFO;
        //splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_LIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        //expect(splitInfo.editStates.fees.editorBaseValue)
        //    .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 1230000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.LIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
            ]),
        }));


        //
        // Existing transaction

        // On 2014-03-11 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 200.0000

        // Sell 50 shares LIFO
        // { ymdDate: '2014-05-19', close: 21.59, },
        const transactionId = transactionIdsByYMDDateString.get('2014-05-19');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_LIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(500000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(3022105);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(6045200);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(3);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 12300000 - 495,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -12300000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.LIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
                expect.objectContaining({
                    accountId: feesAccountId,
                    quantityBaseValue: 495,
                }),
            ]),
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});




//
//---------------------------------------------------------
//
test('LotCellEditors-SELL_BY_LOTS', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'SELL_BY_LOTS');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const brokerageAccountId = sys['ASSET-Investments-Brokerage AccountAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.SELL_BY_LOTS;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        //splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.shares.lotChanges = [
            {
                lotId: lotAId,
                quantityBaseValue: -100000,
            },
            {
                lotId: lotBId,
                quantityBaseValue: -900000,
            }
        ];

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_BY_LOTS);
        //expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000 - 495);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        
        //
        // Test asyncTransactionDataItemFromSplitInfo()

        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(3);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 1230000 - 495,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            quantityBaseValue: -100000,
                        },
                        {
                            lotId: lotBId,
                            quantityBaseValue: -900000,
                        }
                    ]),
                }),
                expect.objectContaining({
                    accountId: feesAccountId,
                    quantityBaseValue: 495,
                }),
            ]),
        }));


        //
        // Existing transaction

        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570


        // Sell 10 shares from lotB, 20 shares from lotA
        // on { ymdDate: '2020-01-24', close: 79.58, },
        const transactionId = transactionIdsByYMDDateString.get('2020-01-24');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_BY_LOTS);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(300000);
        expect(splitInfo.editStates.shares.lotChanges).toEqual([
            expect.objectContaining({
                quantityBaseValue: -100000,
            }),
            expect.objectContaining({
                quantityBaseValue: -200000,
            })
        ]);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(954960);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(3183200);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = '';
        splitInfo.editStates.shares.lotChanges[0].lotId = lotAId;
        splitInfo.editStates.shares.lotChanges[0].quantityBaseValue = -1500000;
        splitInfo.editStates.shares.lotChanges[1].lotId = lotBId;
        splitInfo.editStates.shares.lotChanges[1].quantityBaseValue = -500000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 0;
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';

        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: brokerageAccountId,
                    quantityBaseValue: 24600000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -24600000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: expect.arrayContaining([
                        { 
                            lotId: lotAId,
                            quantityBaseValue: -1500000,
                        },
                        { 
                            lotId: lotBId,
                            quantityBaseValue: -500000,
                        },
                    ]),
                }),
            ]),
        }));



        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});



//
//---------------------------------------------------------
//
test('LotCellEditors-REINVESTED_DIVIDEND', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'REINVESTED_DIVIDEND');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const dividendsAccountId = sys['INCOME-DividendsAccountId'];
        const brokerageAccountId = sys['ASSET-Investments-Brokerage AccountAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        //const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];
        //const lotEId = sys['Lot ELotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND.name,
                    lotChanges: [],
                },
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REINVESTED_DIVIDEND);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        splitInfo.editStates.shares.editorBaseValue = 12345;
        splitInfo.editStates.fees.editorBaseValue = 0;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 2469;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REINVESTED_DIVIDEND);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(12345);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(2469);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(0);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(200000);

        
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);
        
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2014-05-06',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: dividendsAccountId,
                    quantityBaseValue: 2469,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 2469,
                    lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND.name,
                    lotChanges: [
                        {
                            quantityBaseValue: 12345,
                            costBasisBaseValue: 2469,
                        }
                    ]
                }),
            ]),
        }));
        

        //
        // Existing transaction

        // Reinvested Dividends
        // Dividend paid $0.1175
        // 1485 sh * 0.1175 = $174.49
        // { ymdDate: '2014-08-14', close: 24.38, },
        const transactionId = transactionIdsByYMDDateString.get('2014-08-14');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REINVESTED_DIVIDEND);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(71571);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(69796);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(975199);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);

        // Simple copySplitInfo() test.
        expect(originalSplitInfo).toEqual(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 12345;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 2469;
        splitInfo.editStates.fees.editorBaseValue = 0;
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);


        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: dividendsAccountId,
                    quantityBaseValue: 2469,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 2469,
                    lotChanges: [
                        {
                            quantityBaseValue: 12345,
                            costBasisBaseValue: 2469,
                        }
                    ]
                }),
            ]),
        }));
        


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});

// ADD_SHARES


//
//---------------------------------------------------------
//
test('LotCellEditors-ADD_SHARES', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'ADD_SHARES');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: equityAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.ADD_SHARES);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        splitInfo.editStates.shares.editorBaseValue = 1000000;
        //splitInfo.editStates.fees.editorBaseValue = 500;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 123000;

        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2014-05-06',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: 123000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 123000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [
                        {
                            quantityBaseValue: 1000000,
                            costBasisBaseValue: 123000,
                        }
                    ]
                }),
            ]),
        }));


        //
        // Existing transaction

        // Add 100 sh for lotF
        // { ymdDate: '2014-08-18', close: 24.79, },
        const transactionId = transactionIdsByYMDDateString.get('2014-08-18');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.ADD_SHARES);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(991600);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(991600);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);

        // Simple copySplitInfo() test.
        expect(originalSplitInfo).toEqual(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);

        
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 123000;
        splitInfo.editStates.fees.editorBaseValue = '';

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: 123000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: 123000,
                    lotChanges: [
                        {
                            quantityBaseValue: 1000000,
                            costBasisBaseValue: 123000,
                        }
                    ]
                }),
            ]),
        }));



        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});



//
//---------------------------------------------------------
//
test('LotCellEditors-REMOVE_SHARES_FIFO', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'REMOVE_SHARES_FIFO');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        //const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: equityAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);

        // The action type is ADD_SHARES due to the equity account id.
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.ADD_SHARES);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.REMOVE_SHARES_FIFO;
        //splitInfo.editStates.fees.editorBaseValue = undefined;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()
        
        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -1230000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.FIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
            ]),
        }));

        
        //
        // Existing transaction

        // On 2020-01-31 have
        // A: 2005-02-18: 665.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571

        // Remove 15 sh FIFO
        //  { ymdDate: '2020-02-04', close: 79.71, },
        const transactionId = transactionIdsByYMDDateString.get('2020-02-04');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(150000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(478260);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(3188400);

        
        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 0;

        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -12300000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -12300000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.FIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
            ]),
        }));

        //
        // Tests of updateSplitInfoValues(), no fees
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = undefined;


        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.shares.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();



        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});




//
//---------------------------------------------------------
//
test('LotCellEditors-REMOVE_SHARES_LIFO', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'REMOVE_SHARES_LIFO');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        //const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: equityAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.ADD_SHARES);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.REMOVE_SHARES_LIFO;
        //splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_LIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        //expect(splitInfo.editStates.fees.editorBaseValue)
        expect(splitInfo.editStates.price.editorBaseValue)
        //    .toEqual(495);
            .toEqual(1230000);
        
        
        //
        // Test asyncTransactionDataItemFromSplitInfo()

        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -1230000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.LIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
            ]),
        }));


        //
        // Existing transaction

        // On 2015-03-12 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570
        // F: 2014-08-18: 75.0000


        //
        // Remove the rest of lotF via LIFO
        //  { ymdDate: '2019-11-12', close: 65.49, },
        const transactionId = transactionIdsByYMDDateString.get('2019-11-12');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_LIFO);

        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(750000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(75 * 6549 * 4);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(6549 * 4 * 100);

        
        const originalSplitInfo = LCE.copySplitInfo(splitInfo);

        
        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        // We do lose any lot ids...
        removeLotIds(transactionDataItem);
        expect(newTransactionDataItem).toEqual(transactionDataItem);

        
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 0;
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -12300000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -12300000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    sellAutoLotType: T.AutoLotType.LIFO.name,
                    sellAutoLotQuantityBaseValue: 1000000,
                    lotChanges: [],
                }),
            ]),
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});



//
//---------------------------------------------------------
//
test('LotCellEditors-REMOVE_SHARES_BY_LOTS', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'REMOVE_SHARES_BY_LOTS');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        //const lotCId = sys['Lot CLotId'];
        const lotFId = sys['Lot FLotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: [],
                },
                {
                    accountId: equityAccountId,
                    quantityBaseValue: '',
                }
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.ADD_SHARES);
        expect(splitInfo.editStates.shares.editorBaseValue).toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.REMOVE_SHARES_BY_LOTS;
        //splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        //splitInfo.editStates.shares.editorBaseValue = 1000000;
        splitInfo.editStates.shares.lotChanges = [
            {
                lotId: lotFId,
                quantityBaseValue: -1000000,
            },
        ];

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_BY_LOTS);
        //expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        
        //
        // Test asyncTransactionDataItemFromSplitInfo()
        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -1230000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -1230000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotFId,
                            quantityBaseValue: -1000000,
                        },
                    ]),
                }),
            ]),
        }));

        
        //
        // Existing transaction

        // On 2014-08-18 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570
        // F: 2014-08-18: 100.0000

        //
        // Remove 25 sh of lotF
        // { ymdDate: '2015-03-12', close: 30.92, },
        const transactionId = transactionIdsByYMDDateString.get('2015-03-12');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );
        
        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REMOVE_SHARES_BY_LOTS);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(250000);
        expect(splitInfo.editStates.shares.lotChanges).toEqual([
            expect.objectContaining({
                lotId: lotFId,
                quantityBaseValue: -250000,
            }),
        ]);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(25 * 3092 * 4);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(3092 * 4 * 100);


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(transactionDataItem);

        
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue = '';
        splitInfo.editStates.shares.lotChanges[0].lotId = lotAId;
        splitInfo.editStates.shares.lotChanges[0].quantityBaseValue = -1500000;
        splitInfo.editStates.shares.lotChanges[1] = {};
        splitInfo.editStates.shares.lotChanges[1].lotId = lotBId;
        splitInfo.editStates.shares.lotChanges[1].quantityBaseValue = -500000;
        splitInfo.editStates.price.editorBaseValue = 12300000;
        splitInfo.editStates.fees.editorBaseValue = 0;
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';

        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
            ymdDate: '2001-10-12',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(2);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2001-10-12',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: equityAccountId,
                    quantityBaseValue: -24600000,
                }),
                expect.objectContaining({
                    accountId: aaplAccountId,
                    quantityBaseValue: -24600000,
                    lotTransactionType: T.LotTransactionType.BUY_SELL.name,
                    lotChanges: expect.arrayContaining([
                        { 
                            lotId: lotAId,
                            quantityBaseValue: -1500000,
                        },
                        { 
                            lotId: lotBId,
                            quantityBaseValue: -500000,
                        },
                    ]),
                }),
            ]),
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});




//
//---------------------------------------------------------
//
test('LotCellEditors-SPLIT', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'SPLIT');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        //const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: [
                        {
                            lotId: lotAId,
                            quantityBaseValue: 1000000,
                        }
                    ],
                },
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.SPLIT;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        // Nothing should change for the split.
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        
        
        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // For SPLITs the transaction is actually based upon the account state/
        // lots at the time of the transaction.
        // So for 2020-01-01 the state was:
        // On 2019-11-12 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1571
        //
        // Total shares: 1842.1571
        // For a 4 to 1 split we want to add 3 * 1842.1571 = 5526.4713 shares
        let lotASharesBaseValue = 6850000;
        let lotCSharesBaseValue = 10500000;
        let lotBSharesBaseValue = 1000000;
        let lotESharesBaseValue = 71571;
        let totalPreSplitSharesBaseValue = lotASharesBaseValue + lotCSharesBaseValue
            + lotBSharesBaseValue + lotESharesBaseValue;
        let sharesToAdd = 3 * totalPreSplitSharesBaseValue;
        splitInfo.editStates.shares.editorBaseValue = sharesToAdd;

        newTransactionDataItem = {
            ymdDate: '2020-01-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(1);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-01-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            quantityBaseValue: 3 * lotASharesBaseValue,
                        },
                        {
                            lotId: lotCId,
                            quantityBaseValue: 3 * lotCSharesBaseValue,
                        },
                        {
                            lotId: lotBId,
                            quantityBaseValue: 3 * lotBSharesBaseValue,
                        },
                        {
                            lotId: lotEId,
                            quantityBaseValue: 3 * lotESharesBaseValue,
                        },
                    ]),
                }),
            ]),
        }));

        //
        // Existing transaction

        // On 2014-05-19 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 150.0000


        // 7 for 1 split
        lotASharesBaseValue = 1000000;
        lotCSharesBaseValue = 1500000;
        totalPreSplitSharesBaseValue = lotASharesBaseValue + lotCSharesBaseValue;

        //  { ymdDate: '2014-06-09', close: 23.42, },
        const transactionId = transactionIdsByYMDDateString.get('2014-06-09');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(totalPreSplitSharesBaseValue * 6);
        expect(splitInfo.editStates.shares.lotChanges).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: lotASharesBaseValue * 6,
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: lotCSharesBaseValue * 6,
                }),
            ]));
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(transactionDataItem);


        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        splitInfo.editStates.shares.editorBaseValue 
            = totalPreSplitSharesBaseValue * 3;

        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(1);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2014-06-09',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: expect.arrayContaining([
                        { 
                            lotId: lotAId,
                            quantityBaseValue: lotASharesBaseValue * 3,
                        },
                        { 
                            lotId: lotCId,
                            quantityBaseValue: lotCSharesBaseValue * 3,
                        },
                    ]),
                }),
            ]),
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});



//
//---------------------------------------------------------
//
test('LotCellEditors-REVERSE_SPLIT', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'REVERSE_SPLIT');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName,
            {
                includeReverseSplit: true,
            });

        //const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: [
                        {
                            lotId: lotAId,
                            quantityBaseValue: -1000000,
                        }
                    ],
                },
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REVERSE_SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.REVERSE_SPLIT;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        // Nothing should change for the split.
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REVERSE_SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);
        

        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // For REVERSE_SPLITs the transaction is actually based upon the account state/
        // lots at the time of the transaction.
        // On 2020-08-31 have
        // A: 2005-02-18: 2600.0000
        // C: 2005-03-11: 4200.0000
        // E: 2014-08-14: 28.6284
        //
        // after a 1 to 4 split, before then it was
        //
        // On 2020-02-04 have
        // A: 2005-02-18: 650.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571

        let lotASharesBaseValue = 26000000;
        let lotCSharesBaseValue = 42000000;
        let lotESharesBaseValue = 286284;
        let totalPreReverseSplitSharesBaseValue = lotASharesBaseValue 
            + lotCSharesBaseValue + lotESharesBaseValue;
        let sharesToRemoveBaseValue = 3 * totalPreReverseSplitSharesBaseValue / 4;
        splitInfo.editStates.shares.editorBaseValue = sharesToRemoveBaseValue;

        newTransactionDataItem = {
            ymdDate: '2020-09-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(1);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            ymdDate: '2020-09-01',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            quantityBaseValue: -3 * lotASharesBaseValue / 4,
                        },
                        {
                            lotId: lotCId,
                            quantityBaseValue: -3 * lotCSharesBaseValue / 4,
                        },
                        {
                            lotId: lotEId,
                            quantityBaseValue: -3 * lotESharesBaseValue / 4,
                        },
                    ]),
                }),
            ]),
        }));


        //
        // Existing transaction

        // On 2020-08-31 have
        // A: 2005-02-18: 2600.0000
        // C: 2005-03-11: 4200.0000
        // E: 2014-08-14: 28.6284

        // On 2020-09-15 have:
        // A: 2005-02-18: 650.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571

        const transactionId = transactionIdsByYMDDateString.get('2020-09-15');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REVERSE_SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(totalPreReverseSplitSharesBaseValue * 3 / 4);
        expect(splitInfo.editStates.shares.lotChanges).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: -lotASharesBaseValue * 3 / 4,
                }),
                expect.objectContaining({
                    lotId: lotCId,
                    quantityBaseValue: -lotCSharesBaseValue * 3 / 4,
                }),
                expect.objectContaining({
                    lotId: lotEId,
                    quantityBaseValue: -lotESharesBaseValue * 3 / 4,
                }),
            ]));
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();



        const originalSplitInfo = LCE.copySplitInfo(splitInfo);


        //
        // Test asyncTransactionDataItemFromSplitInfo()

        // Straight through...
        newTransactionDataItem = {};
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(transactionDataItem);

        
        splitInfo = LCE.copySplitInfo(originalSplitInfo);
        sharesToRemoveBaseValue 
            = Math.round(totalPreReverseSplitSharesBaseValue * 4 / 5);
        splitInfo.editStates.shares.editorBaseValue 
            = sharesToRemoveBaseValue;

        let lotASharesToRemoveBaseValue = Math.round(lotASharesBaseValue * 4 / 5);
        let lotCSharesToRemoveBaseValue = Math.round(lotCSharesBaseValue * 4 / 5);
        let lotESharesToRemoveBaseValue = sharesToRemoveBaseValue
            - lotASharesToRemoveBaseValue - lotCSharesToRemoveBaseValue;

        LCE.updateSplitInfoValues(splitInfo);

        newTransactionDataItem = {
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem.splits.length).toEqual(1);
        expect(newTransactionDataItem.splits[result].accountId).toEqual(aaplAccountId);
        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: splitInfo.transactionDataItem.id,
            ymdDate: '2020-09-15',
            splits: expect.arrayContaining([
                expect.objectContaining({
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.SPLIT.name,
                    lotChanges: expect.arrayContaining([
                        { 
                            lotId: lotAId,
                            quantityBaseValue: -lotASharesToRemoveBaseValue,
                        },
                        { 
                            lotId: lotCId,
                            quantityBaseValue: -lotCSharesToRemoveBaseValue,
                        },
                        { 
                            lotId: lotEId,
                            quantityBaseValue: -lotESharesToRemoveBaseValue,
                        },
                    ]),
                }),
            ]),
        }));


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});





//
//---------------------------------------------------------
//
test('LotCellEditors-RETURN_OF_CAPITAL', async () => {
    const baseDir = await createDir('LotCellEditors');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'RETURN_OF_CAPITAL');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName,
            {
                includeReturnOfCapital: true,
            });
        const accountingActions = accessor.getAccountingActions();

        //const equityAccountId = sys['EQUITYAccountId'];
        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        //const feesAccountId = sys['EXPENSE-Brokerage CommissionsAccountId'];
        const longTermCGAccountId 
            = sys['INCOME-Capital Gains-Long Term Capital GainsAccountId'];

        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        
        const lotAId = sys['Lot ALotId'];
        //const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        let newTransactionDataItem = {};
        let transactionDataItem;
        let splitInfo;
        let result;

        // A brand new transaction data item...
        transactionDataItem = {
            ymdDate: '2014-05-06',
            splits: [
                {
                    accountId: aaplAccountId,
                    quantityBaseValue: '',
                    lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
                    lotChanges: [
                    ],
                },
            ]
        };
        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.RETURN_OF_CAPITAL);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.actionType = LCE.LotActionType.RETURN_OF_CAPITAL;
        splitInfo.editStates.fees.editorBaseValue = 495;
        splitInfo.editStates.price.editorBaseValue = 1230000;
        splitInfo.editStates.monetaryAmount.editorBaseValue = 1230000;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        // The only change that applies is the monetary amount.
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.RETURN_OF_CAPITAL);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(1230000);


        //
        // Test asyncTransactionDataItemFromSplitInfo()
        
        // RETURN_OF_CAPITAL's transaction is based upon the account state/lots at the
        // time of hte transaction.

        // On 2020-08-31 have
        // A: 2005-02-18: 2600.0000, cb: 4034.59
        // C: 2005-03-11: 4200.0000, cb: 6051.71
        // E: 2014-08-14: 28.6284, cb: 697.96

        splitInfo.editStates.monetaryAmount.editorBaseValue = 500000;

        newTransactionDataItem = {
            ymdDate: '2020-09-01',
        };
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);
        
        expect(newTransactionDataItem).toEqual({
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


        //
        // Existing transaction

        const transactionId = transactionIdsByYMDDateString.get('2020-10-01');
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionId,
        );

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);

        expect(splitInfo.actionType).toEqual(LCE.LotActionType.RETURN_OF_CAPITAL);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(500000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();


        splitInfo.editStates.monetaryAmount.editorBaseValue = 1000000;
        newTransactionDataItem = T.getTransactionDataItem(transactionDataItem, true);
        result = await LCE.asyncTransactionDataItemFromSplitInfo(splitInfo, 
            newTransactionDataItem);

        expect(newTransactionDataItem).toEqual(expect.objectContaining({
            id: transactionDataItem.id,
            ymdDate: transactionDataItem.ymdDate,
            splits: expect.arrayContaining([
                {
                    accountId: aaplAccountId,
                    lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL.name,
                    lotChanges: expect.arrayContaining([
                        {
                            lotId: lotAId,
                            costBasisBaseValue: -380750,
                        },
                        {
                            lotId: lotCId,
                            costBasisBaseValue: -605171,
                        },
                        {
                            lotId: lotEId,
                            costBasisBaseValue: -4192,
                        },
                    ]),
                    quantityBaseValue: -9887,
                },
                expect.objectContaining({
                    accountId: longTermCGAccountId,
                    quantityBaseValue: -9887,
                }),
            ]),
        }));


        //
        // Test existing capital gains transaction
        const actionA = await accountingActions.asyncCreateModifyTransactionAction(
            newTransactionDataItem);
        result = await accessor.asyncApplyAction(actionA);


        splitInfo = LCE.createSplitInfo(newTransactionDataItem, 0, accessor);

        expect(splitInfo.actionType).toEqual(LCE.LotActionType.RETURN_OF_CAPITAL);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();



        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});
