import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from '../tools/EngineAccessTestHelpers';
import * as LCE from './LotCellEditors';
const path = require('path');

test('LotCellEditors', async () => {
    const baseDir = await createDir('Reconciler');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupWithTestTransactions(pathName);

        const aaplAccountId = sys['ASSET-Investments-Brokerage Account-AAPLAccountId'];
        const transactionKeys = await accessor.asyncGetSortedTransactionKeysForAccount(
            aaplAccountId);
        
        let index = 0;
        let transactionDataItem;
        let splitInfo;


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
        // A: 2005-02-18: 50.0000
        // C: 2005-03-11: 200.0000

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
        // A: 2005-02-18: 50.0000
        // C: 2005-03-11: 150.0000

        // 7 for 1 split
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(12000000);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.fees.editorBaseValue)
            .toBeUndefined();
        expect(splitInfo.editStates.price.editorBaseValue)
            .toBeUndefined();

        
        // On 2014-06-09 have
        // A: 2005-02-18: 350.0000
        // C: 2005-03-11: 1050.0000

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
        // A: 2005-02-18: 350.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-10: 100.0000

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
        // A: 2005-02-18: 335.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000

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
        // A: 2005-02-18: 335.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570

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
        // A: 2005-02-18: 315.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 90.0000
        // E: 2014-08-14: 7.1570

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
        // A: 2005-02-18: 315.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571

        // 4 for 1 split
        transactionDataItem = await accessor.asyncGetTransactionDataItemWithId(
            transactionKeys[index].id
        );
        ++index;

        splitInfo = LCE.createSplitInfo(transactionDataItem, 0, accessor);
        expect(splitInfo.actionType).toEqual(LCE.LotActionType.SPLIT);
        expect(splitInfo.editStates.shares.editorBaseValue).toEqual(41164713);
        expect(splitInfo.editStates.monetaryAmount.editorBaseValue)
            .toBeUndefined();
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