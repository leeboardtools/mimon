import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from '../tools/EngineAccessTestHelpers';
import * as LCE from './LotCellEditors';
import * as T from '../engine/Transactions';
const path = require('path');


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
    const baseDir = await createDir('Reconciler');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'basic');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        const transactionIdsByYMDDateString = new Map();

        transactionKeys.forEach(({id, ymdDate, }) => 
            transactionIdsByYMDDateString.set(ymdDate.toString(), id));
        

        let index = 0;
        let transactionDataItem;
        let splitInfo;

        let accountStates;
        let accountState;

        const lotAId = sys['Lot ALotId'];
        const lotBId = sys['Lot BLotId'];
        const lotCId = sys['Lot CLotId'];
        const lotEId = sys['Lot ELotId'];

        //
        // A: Buy 50 sh for lot A
        //  { ymdDate: '2005-02-18', close: 1.55, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(500000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(434495);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(8680);


        // On 2005-02-18 have
        // A: 2005-02-18: 50.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // 2 for 1 split
        // '2005-02-28'
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

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
            aaplAccountId, transactionDataItem.id
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


        // Buy 200 shares for lotC
        // { ymdDate: '2005-03-11', close: 1.44, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(2000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(806895);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(4032);
        

        // On 2014-03-11 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 200.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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



        // Sell 50 shares LIFO
        // { ymdDate: '2014-05-19', close: 21.59, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_LIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(500000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(3022105);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(60452);
        

        // On 2014-05-19 have
        // A: 2005-02-18: 100.0000
        // C: 2005-03-11: 150.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // 7 for 1 split
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(15000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();

        
        // On 2014-06-09 have
        // A: 2005-02-18: 700.0000
        // C: 2005-03-11: 1050.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // Buy 100 shares for lotB
        // { ymdDate: '2014-06-10', close: 23.56, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.BUY);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(942400);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(9424);

        
        // On 2014-06-10 have
        // A: 2005-02-18: 700.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-10: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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



        // Sell 15 shares FIFO
        //  { ymdDate: '2014-06-20', close: 22.73, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(150000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(136380);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(9092);


        
        // On 2014-06-20 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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



        // Reinvested Dividends
        // Dividend paid $0.1175
        // 1485 sh * 0.1175 = $174.49
        // { ymdDate: '2014-08-14', close: 24.38, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 1, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.REINVESTED_DIVIDEND);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(71571);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(69796);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(9752);
        

        // On 2014-08-14 have
        // A: 2005-02-18: 685.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // Sell 10 shares from lotB, 20 shares from lotA
        // on { ymdDate: '2020-01-24', close: 79.58, },
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

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
            .toEqual(31832);

        
        // On 2020-01-24 have
        // A: 2005-02-18: 665.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 90.0000
        // E: 2014-08-14: 7.1570
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // Sell all of lotB
        //  { ymdDate: '2020-01-31', close: 77.38, }
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

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
            .toEqual(30952);


        // On 2020-01-31 have
        // A: 2005-02-18: 665.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
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


        // 4 for 1 split
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(51664713);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();

        // The cost bases coming in are:
        // Lot A: 4127.70
        // Lot C: 6051.71
        // Lot E: 697.96
        accountStates = await accessor.asyncGetAccountStateDataItemsAfterTransaction(
            aaplAccountId, transactionDataItem.id
        );
        accountState = accountStates[0];
        expect(accountState).toEqual(expect.objectContaining({
            lotStates: expect.arrayContaining([
                expect.objectContaining({
                    lotId: lotAId,
                    quantityBaseValue: 26600000,
                    costBasisBaseValue: 412770,
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
            quantityBaseValue: 68886284,
            ymdDate: '2020-08-31',
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
    const baseDir = await createDir('Reconciler');

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
            .toEqual(8680);


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
    const baseDir = await createDir('Reconciler');

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
        splitInfo.editStates.price.editorBaseValue = 12300;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_FIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000 - 495);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300);
        

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
            .toEqual(9092);


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
        splitInfo.editStates.price.editorBaseValue = 123000;
        splitInfo.editStates.fees.editorBaseValue = 495;

        // Quick tests of updateSplitInfoValues()
        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.shares.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toEqual(495);
        
        splitInfo.editStates.fees.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000 - 495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
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
        splitInfo.editStates.price.editorBaseValue = 123000;
        splitInfo.editStates.fees.editorBaseValue = undefined;


        splitInfo.editStates.monetaryAmount.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.shares.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        
        splitInfo.editStates.price.editorBaseValue = '';
        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.editStates.shares.editorBaseValue)
            .toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(12300000);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(123000);
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
    const baseDir = await createDir('Reconciler');

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
        splitInfo.editStates.price.editorBaseValue = 12300;
        splitInfo.editStates.shares.editorBaseValue = 1000000;

        LCE.updateSplitInfoValues(splitInfo);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SELL_LIFO);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(1000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toEqual(1230000);
        //expect(splitInfo.editStates.fees.editorBaseValue)
        //    .toEqual(495);
        expect(splitInfo.editStates.price.editorBaseValue)
            .toEqual(12300);
        

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
            .toEqual(60452);


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
        splitInfo.editStates.price.editorBaseValue = 123000;
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
    const baseDir = await createDir('Reconciler');

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
        const lotCId = sys['Lot CLotId'];

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
        splitInfo.editStates.price.editorBaseValue = 12300;
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
            .toEqual(12300);
        
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
            .toEqual(31832);


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
        splitInfo.editStates.price.editorBaseValue = 123000;
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

// REINVESTED_DIVIDENDS

// ADD_SHARES

// REMOVE_SHARES_FIFO

// REMOVE_SHARES_LIFO

// REMOVE_SHARES_BY_LOTS
