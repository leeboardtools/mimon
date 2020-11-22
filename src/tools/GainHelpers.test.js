import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as GH from './GainHelpers';
import * as L from '../engine/Lots';
import { getDecimalDefinition } from '../util/Quantities';

const path = require('path');


//
//---------------------------------------------------------
//
test('GainHelpers-absoluteGain', () => {
    let result;

    result = GH.absoluteGain({});
    expect(result).toBeUndefined();

    result = GH.absoluteGain({ inputValue: 123, outputValue: 456 });
    expect(result).toEqual(456 - 123);
});


//
//---------------------------------------------------------
//
test('GainHelpers-percentGain', () => {
    let result;

    result = GH.percentGain({});
    expect(result).toBeUndefined();

    result = GH.percentGain({ inputValue: 123, outputValue: 456, });
    expect(result).toEqual((456 - 123) * 100 / 123);

    result = GH.percentGain({ inputValue: 0, outputValue: 100, });
    expect(result).toBeUndefined();
});


//
//---------------------------------------------------------
//
test('GainHelpers-AccountInfo', async () => {
    const baseDir = await createDir('GainHelpers');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupTestEngineAccess(pathName);

        const accountingActions = accessor.getAccountingActions();
        const aaplId = sys.aaplBrokerageAId;

        let action;
        let result;

        result = accessor.getAccountDataItemWithId(aaplId);
        const aaplPricedItemId = result.pricedItemId;


        action = accountingActions.createAddLotAction({
            lotOriginType: L.LotOriginType.CASH_PURCHASE,
            pricedItemId: aaplPricedItemId,
        });
        result = await accessor.asyncApplyAction(action);
        const lotA = result.newLotDataItem;


        action = accountingActions.createAddLotAction({
            lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND,
            pricedItemId: aaplPricedItemId,
        });
        result = await accessor.asyncApplyAction(action);
        const lotB = result.newLotDataItem;


        action = accountingActions.createAddLotAction({
            lotOriginType: L.LotOriginType.CASH_PURCHASE,
            pricedItemId: aaplPricedItemId,
        });
        result = await accessor.asyncApplyAction(action);
        const lotC = result.newLotDataItem;


        action = accountingActions.createAddLotAction({
            lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND,
            pricedItemId: aaplPricedItemId,
        });
        result = await accessor.asyncApplyAction(action);
        const lotD = result.newLotDataItem;


        const lotStatesA = [
            {
                lotId: lotA.id, // CASH_PURCHASE
                ymdDateCreated: '2020-01-02',
                quantityBaseValue: 1000000,
                costBasisBaseValue: 123400,
            },
            {
                lotId: lotB.id, // REINVESTED_DIVIDEND
                ymdDateCreated: '2020-01-02',
                quantityBaseValue: 2000000,
                costBasisBaseValue: 123400 * 2,
            },
            {
                lotId: lotC.id, // CASH_PURCHASE
                ymdDateCreated: '2020-01-02',
                quantityBaseValue: 3000000,
                costBasisBaseValue: 123400 * 3 + 100,
            },
            {
                lotId: lotD.id, // REINVESTED_DIVIDEND
                ymdDateCreated: '2020-01-02',
                quantityBaseValue: 4000000,
                costBasisBaseValue: 123400 * 4,
            },
        ];
        const accountStateA = {
            ymdDate: '2020-08-27',
            quantityBaseValue: 12340000,
            lotStates: lotStatesA,
        };
        const priceA = {
            ymdDate: '2020-08-31',
            close: 246.80,
        };
        const argsA = {
            accessor: accessor,
            accountId: aaplId,
            priceDataItem: priceA,
        };
        const accountStateInfo = GH.createAccountStateInfo(argsA);


        //
        // Market value
        result = GH.calcLotStateMarketValueBaseValue(accountStateInfo, 1000000);
        expect(result).toBeCloseTo(2468000);



        //
        // getLotStateSimpleGainParts
        result = GH.getLotStateSimpleGainParts(accountStateInfo, {
            lotId: lotA.id,
            ymdDateCreated: '2020-01-02',
            quantityBaseValue: 1000000,
            costBasisBaseValue: 123400,
        });
        expect(result).toEqual({
            inputBaseValue: 123400,
            outputBaseValue: 2468000,
        });

        // lotB is REINVESTED_DIVIDENDS
        result = GH.getLotStateSimpleGainParts(accountStateInfo, {
            lotId: lotB.id,
            ymdDateCreated: '2020-01-02',
            quantityBaseValue: 1000000,
            costBasisBaseValue: 123400,
        });
        expect(result).toEqual({
            inputBaseValue: 123400,
            outputBaseValue: 2468000,
        });



        //
        // getLotStateCashInGainParts
        result = GH.getLotStateCashInGainParts(accountStateInfo, {
            lotId: lotA.id,
            ymdDateCreated: '2020-01-02',
            quantityBaseValue: 1000000,
            costBasisBaseValue: 123400,
        });
        expect(result).toEqual({
            inputBaseValue: 123400,
            outputBaseValue: 2468000,
        });

        // lotB is REINVESTED_DIVIDENDS
        result = GH.getLotStateCashInGainParts(accountStateInfo, {
            lotId: lotB.id,
            ymdDateCreated: '2020-01-02',
            quantityBaseValue: 1000000,
            costBasisBaseValue: 123400,
        });
        expect(result).toEqual({
            inputBaseValue: 0,
            outputBaseValue: 2468000,
        });


        //
        // calcLotStateGain
        const { sharesQuantityDefinition, currencyQuantityDefinition } 
            = accountStateInfo;

        const totalSharesBaseValue = lotStatesA[0].quantityBaseValue
            + lotStatesA[1].quantityBaseValue
            + lotStatesA[2].quantityBaseValue
            + lotStatesA[3].quantityBaseValue;
        const totalShares = sharesQuantityDefinition.baseValueToNumber(
            totalSharesBaseValue);
        let totalMarketValue = totalShares * priceA.close;
        const totalMarketValueBaseValue 
            = currencyQuantityDefinition.numberToBaseValue(totalMarketValue);
        totalMarketValue = currencyQuantityDefinition.baseValueToNumber(
            totalMarketValueBaseValue);

        const totalCostBasisBaseValue = lotStatesA[0].costBasisBaseValue
            + lotStatesA[1].costBasisBaseValue
            + lotStatesA[2].costBasisBaseValue
            + lotStatesA[3].costBasisBaseValue;
        const totalCostBasisValue = currencyQuantityDefinition.baseValueToNumber(
            totalCostBasisBaseValue
        );

        const totalCashInBaseValue = lotStatesA[0].costBasisBaseValue
            //+ lotStatesA[1].costBasisBaseValue
            + lotStatesA[2].costBasisBaseValue
            //+ lotStatesA[3].costBasisBaseValue
        ;
        const totalCashInValue = currencyQuantityDefinition.baseValueToNumber(
            totalCashInBaseValue
        );

        // simple
        // no gain
        const argsB = Object.assign({}, argsA, {
            getGainParts: GH.getLotStateSimpleGainParts,
            accountStateDataItem: accountStateA,
        });
        result = GH.calcLotStateGain(argsB);

        expect(result).toEqual(expect.objectContaining({
            inputBaseValue: totalCostBasisBaseValue,
            outputBaseValue: totalMarketValueBaseValue,
            inputValue: totalCostBasisValue,
            outputValue: totalMarketValue,
            gainValue: undefined,
        }));


        // cash-in
        // absoluteGain
        const argsC = Object.assign({}, argsA, {
            getGainParts: GH.getLotStateCashInGainParts,
            calcGainFromParts: GH.absoluteGain,
            lotStates: lotStatesA,
        });
        result = GH.calcLotStateGain(argsC);

        expect(result).toEqual(expect.objectContaining({
            inputBaseValue: totalCashInBaseValue,
            outputBaseValue: totalMarketValueBaseValue,
            inputValue: totalCashInValue,
            outputValue: totalMarketValue,
            gainValue: totalMarketValue - totalCashInValue,
        }));

        
        // cash-in
        // percentGain
        const argsD = Object.assign({}, argsA, {
            getGainParts: GH.getLotStateCashInGainParts,
            calcGainFromParts: GH.percentGain,
        });
        result = GH.calcLotStateGain(argsD, lotStatesA);

        expect(result).toEqual(expect.objectContaining({
            inputBaseValue: totalCashInBaseValue,
            outputBaseValue: totalMarketValueBaseValue,
            inputValue: totalCashInValue,
            outputValue: totalMarketValue,
        }));
        expect(result.gainValue).toBeCloseTo(
            (totalMarketValue - totalCashInValue) * 100 / totalCashInValue);


        // simple
        // percentGain, 1 decimal place.
        const argsE = Object.assign({}, argsA, {
            getGainParts: GH.getLotStateSimpleGainParts,
            calcGainFromParts: GH.percentGain,
            gainQuantityDefinition: getDecimalDefinition(1),
            lotStates: lotStatesA,
        });
        result = GH.calcLotStateGain(argsE);

        expect(result).toEqual(expect.objectContaining({
            inputBaseValue: totalCostBasisBaseValue,
            outputBaseValue: totalMarketValueBaseValue,
            inputValue: totalCostBasisValue,
            outputValue: totalMarketValue,
        }));

        let gain;
        gain = (totalMarketValue - totalCostBasisValue) * 100 / totalCostBasisValue;
        gain = Math.round(gain * 10) / 10;
        expect(result.gainValue).toBeCloseTo(gain);


        // getTotalMarketValueBaseValue
        result = GH.getTotalMarketValueBaseValue(argsA, lotStatesA);
        expect(result.quantityBaseValue).toEqual(totalMarketValueBaseValue);


        // getTotalCostBasisBaseValue
        // using argsE checks that the lotStates works from args.
        result = GH.getTotalCostBasisBaseValue(argsE);
        expect(result.quantityBaseValue).toEqual(totalCostBasisBaseValue);


        // getTotalCashInBaseValue
        result = GH.getTotalCashInBaseValue(argsA, lotStatesA);
        expect(result.quantityBaseValue).toEqual(totalCashInBaseValue);


        //
        // All done...
        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});
