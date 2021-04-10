import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as GH from './GainHelpers';
import * as L from '../engine/Lots';
import { getDecimalDefinition } from '../util/Quantities';
import { getYMDDate } from '../util/YMDDate';
import * as path from 'path';


let baseDir;
let accessor;
let sys;

let lotA;
let lotB;
let lotC;
let lotD;
let lotE;

let lotStatesA;
let accountStateA;
let priceA;
let argsA;
let accountStateInfoA;

let totalSharesBaseValue;
let totalShares;
let totalMarketValue;
let totalMarketValueBaseValue;
let totalCostBasisBaseValue;
let totalCostBasisValue;
let totalCashInBaseValue;
let totalCashInValue;

beforeAll(async () => {
    baseDir = await createDir('GainHelpers');
    await cleanupDir(baseDir, true);
    const pathName = path.join(baseDir, 'test');

    let result;
    result = await EATH.asyncSetupTestEngineAccess(pathName);
    accessor = result.accessor;
    sys = result.sys;

    const accountingActions = accessor.getAccountingActions();
    const aaplId = sys.aaplBrokerageAId;

    let action;
    result = accessor.getAccountDataItemWithId(aaplId);
    const aaplPricedItemId = result.pricedItemId;


    action = accountingActions.createAddLotAction({
        lotOriginType: L.LotOriginType.CASH_PURCHASE,
        pricedItemId: aaplPricedItemId,
    });
    result = await accessor.asyncApplyAction(action);
    lotA = result.newLotDataItem;


    action = accountingActions.createAddLotAction({
        lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND,
        pricedItemId: aaplPricedItemId,
    });
    result = await accessor.asyncApplyAction(action);
    lotB = result.newLotDataItem;


    action = accountingActions.createAddLotAction({
        lotOriginType: L.LotOriginType.CASH_PURCHASE,
        pricedItemId: aaplPricedItemId,
    });
    result = await accessor.asyncApplyAction(action);
    lotC = result.newLotDataItem;


    action = accountingActions.createAddLotAction({
        lotOriginType: L.LotOriginType.REINVESTED_DIVIDEND,
        pricedItemId: aaplPricedItemId,
    });
    result = await accessor.asyncApplyAction(action);
    lotD = result.newLotDataItem;


    action = accountingActions.createAddLotAction({
        lotOriginType: L.LotOriginType.CASH_PURCHASE,
        pricedItemId: aaplPricedItemId,
    });
    result = await accessor.asyncApplyAction(action);
    lotE = result.newLotDataItem;


    lotStatesA = [
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
    accountStateA = {
        ymdDate: '2020-08-27',
        quantityBaseValue: 12340000,
        lotStates: lotStatesA,
        gainLotStates: lotStatesA,
    };
    priceA = {
        ymdDate: '2020-08-31',
        close: 246.80,
    };
    argsA = {
        accessor: accessor,
        accountId: aaplId,
        priceDataItem: priceA,
    };
    accountStateInfoA = GH.createAccountStateInfo(argsA);


    const { sharesQuantityDefinition, currencyQuantityDefinition } 
        = accountStateInfoA;

    totalSharesBaseValue = lotStatesA[0].quantityBaseValue
        + lotStatesA[1].quantityBaseValue
        + lotStatesA[2].quantityBaseValue
        + lotStatesA[3].quantityBaseValue;
    totalShares = sharesQuantityDefinition.baseValueToNumber(
        totalSharesBaseValue);
    totalMarketValue = totalShares * priceA.close;
    totalMarketValueBaseValue 
        = currencyQuantityDefinition.numberToBaseValue(totalMarketValue);
    totalMarketValue = currencyQuantityDefinition.baseValueToNumber(
        totalMarketValueBaseValue);

    totalCostBasisBaseValue = lotStatesA[0].costBasisBaseValue
        + lotStatesA[1].costBasisBaseValue
        + lotStatesA[2].costBasisBaseValue
        + lotStatesA[3].costBasisBaseValue;
    totalCostBasisValue = currencyQuantityDefinition.baseValueToNumber(
        totalCostBasisBaseValue
    );

    totalCashInBaseValue = lotStatesA[0].costBasisBaseValue
        //+ lotStatesA[1].costBasisBaseValue
        + lotStatesA[2].costBasisBaseValue
        //+ lotStatesA[3].costBasisBaseValue
    ;
    totalCashInValue = currencyQuantityDefinition.baseValueToNumber(
        totalCashInBaseValue
    );
});


afterAll(async () => {
    if (accessor) {
        await accessor.asyncCloseAccountingFile();
    }
    if (baseDir) {
        return cleanupDir(baseDir);
    }
});


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
test('GainHelpers-compountAnnualGrowthRate', () => {
    let result;

    result = GH.compoundAnnualGrowthRate({
        inputValue: 123,
        outputValue: 456,
        ymdDateInput: '2020-10-11',
    });
    expect(result).toBeUndefined();

    result = GH.compoundAnnualGrowthRate({
        inputValue: 0,
        outputValue: 456,
        ymdDateInput: '2020-10-11',
        ymdDateOutput: '2020-10-11',
    });
    expect(result).toBeUndefined();

    result = GH.compoundAnnualGrowthRate({
        inputValue: 100,
        outputValue: 200,
        ymdDateInput: '2019-10-11',
        ymdDateOutput: '2020-10-11',
    });
    expect(result).toBeCloseTo(Math.pow(200 / 100, 1) - 1);

    result = GH.compoundAnnualGrowthRate({
        inputValue: 100,
        outputValue: 200,
        ymdDateInput: '2017-10-11',
        ymdDateOutput: '2020-10-11',
    });
    expect(result).toBeCloseTo(Math.pow(200 / 100, 1 / 3) - 1);

});


//
//---------------------------------------------------------
//
test('GainHelpers-distributeSharesToLotStates', () => {
    const lotStates = [
        { quantityBaseValue: 100, ymdDateCreated: '2020-10-01', },
        { quantityBaseValue: 200, ymdDateCreated: '2020-10-01', },
        { quantityBaseValue: 300, ymdDateCreated: '2020-10-01', },
    ];

    let result = GH.distributeSharesToLotStates(100, lotStates);
    expect(result).toEqual(lotStates);

    const delta_0 = Math.round(100 * 100 / 600);
    const delta_1 = Math.round(100 * 200 / 600);
    const delta_2 = 100 - delta_0 - delta_1;
    expect(lotStates).toEqual([
        { quantityBaseValue: 100 + delta_0, 
            ymdDateCreated: lotStates[0].ymdDateCreated, },
        { quantityBaseValue: 200 + delta_1, 
            ymdDateCreated: lotStates[1].ymdDateCreated, },
        { quantityBaseValue: 300 + delta_2, 
            ymdDateCreated: lotStates[2].ymdDateCreated, },
    ]);
});


//
//---------------------------------------------------------
//
test('GainHelpers-distributeNonCashInLots', () => {
    let result;

    const sortedLotStates = [
        { lotId: lotA.id, 
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100, },
        { lotId: lotC.id, 
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200, },
        { lotId: lotB.id,  // Non-cash-in
            ymdDateCreated: '2010-01-03',
            quantityBaseValue: 100, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 100, },
    ];

    result = GH.distributeNonCashInLots(accessor, sortedLotStates);
    expect(result).toEqual([
        { lotId: lotA.id,
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100 + 33, },
        { lotId: lotC.id,
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200 + 67, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 100, },
    ]);


    const nonSortedLotStates = [
        { lotId: lotB.id,  // Non-cash-in
            ymdDateCreated: '2010-01-03',
            quantityBaseValue: 100, },
        { lotId: lotC.id, 
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200, },
        { lotId: lotA.id, 
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 100, },
    ];
    result = GH.distributeNonCashInLots(accessor, nonSortedLotStates);
    expect(result).toEqual([
        { lotId: lotA.id,
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100 + 33, },
        { lotId: lotC.id,
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200 + 67, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 100, },
    ]);


    const earlyNonCashInLotStates = [
        { lotId: lotA.id, 
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100, },
        { lotId: lotC.id, 
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200, },
        { lotId: lotB.id,  // Non-cash-in
            ymdDateCreated: '2010-01-03',
            quantityBaseValue: 100, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 600, },
        { lotId: lotD.id, 
            ymdDateCreated: '2009-12-31',
            quantityBaseValue: 10000, },
    ];
    // 133 + 267 = 400
    result = GH.distributeNonCashInLots(accessor, earlyNonCashInLotStates);
    expect(result).toEqual([
        { lotId: lotA.id,
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100 + 33 + 1330, },
        { lotId: lotC.id,
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200 + 67 + 2670, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 600 + 6000, },
    ]);


    const allCashInLotStates = [
        { lotId: lotA.id, 
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 100, },
        { lotId: lotC.id, 
            ymdDateCreated: '2010-01-02',
            quantityBaseValue: 200, },
        { lotId: lotE.id, 
            ymdDateCreated: '2010-01-04',
            quantityBaseValue: 100, },
    ];
    result = GH.distributeNonCashInLots(accessor, allCashInLotStates);
    expect(result).toEqual(allCashInLotStates);

});


//
//---------------------------------------------------------
//
test('GainHelpers-calcLotStateMarketValueBaseValue', () => {
    let result;
    result = GH.calcLotStateMarketValueBaseValue(accountStateInfoA, 1000000);
    expect(result).toEqual(2468000);
});


//
//---------------------------------------------------------
//
test('GainHelpers-getLotStateSimpleGainParts', () => {
    let result;

    result = GH.getLotStateSimpleGainParts(accountStateInfoA, {
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
    result = GH.getLotStateSimpleGainParts(accountStateInfoA, {
        lotId: lotB.id,
        ymdDateCreated: '2020-01-02',
        quantityBaseValue: 1000000,
        costBasisBaseValue: 123400,
    });
    expect(result).toEqual({
        inputBaseValue: 123400,
        outputBaseValue: 2468000,
    });

});


//
//---------------------------------------------------------
//
test('GainHelpers-getLotStateCashInGainParts', () => {
    let result;
    result = GH.getLotStateCashInGainParts(accountStateInfoA, {
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
    result = GH.getLotStateCashInGainParts(accountStateInfoA, {
        lotId: lotB.id,
        ymdDateCreated: '2020-01-02',
        quantityBaseValue: 1000000,
        costBasisBaseValue: 123400,
    });
    expect(result).toEqual({
        inputBaseValue: 0,
        outputBaseValue: 2468000,
    });
});


//
//---------------------------------------------------------
//
test('GainHelpers-calcLotStateGain', () => {
    let result;

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
        gainLotStates: lotStatesA,
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
        gainLotStates: lotStatesA,
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
});


//
//---------------------------------------------------------
//
test('GainHelpers-TotalBaseValues', () => {
    let result;

    // getTotalMarketValueBaseValue
    result = GH.getTotalMarketValueBaseValue(argsA, lotStatesA);
    expect(result.quantityBaseValue).toEqual(totalMarketValueBaseValue);


    // getTotalCostBasisBaseValue
    // using argsE checks that the lotStates works from args.
    const args = Object.assign({}, argsA, {
        getGainParts: GH.getLotStateSimpleGainParts,
        calcGainFromParts: GH.percentGain,
        gainQuantityDefinition: getDecimalDefinition(1),
        lotStates: lotStatesA,
        gainLotStates: lotStatesA,
    });
    result = GH.getTotalCostBasisBaseValue(args);
    expect(result.quantityBaseValue).toEqual(totalCostBasisBaseValue);


    // getTotalCashInBaseValue
    result = GH.getTotalCashInBaseValue(argsA, lotStatesA);
    expect(result.quantityBaseValue).toEqual(totalCashInBaseValue);

});


//
//---------------------------------------------------------
//
test('GainHelpers-calcLotStatePercentAnnualGain', () => {
    let result;
    let args;

    const lotStatesB = [
        {
            lotId: lotA.id, // Cash-in
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 1000000, // 100sh
            costBasisBaseValue: 200000,  // $2000.00
        },
        {
            lotId: lotB.id, // Reinvested dividend
            ymdDateCreated: '2010-06-01',
            quantityBaseValue: 100000,  // 10sh
            costBasisBaseValue: 30000,  // $300.00
        },
        {
            lotId: lotC.id, // Cash-in
            ymdDateCreated: '2020-01-01',   // Less than a year
            quantityBaseValue: 500000, // 50sh
            costBasisBaseValue: 200000,  // $2000.00
        },
    ];

    args = Object.assign({}, argsA, {
        ymdDateRef: '2020-06-01',
        priceDataItem: {
            ymdDate: '2020-06-01',
            close: 50.00,
        }
    });
    const accountStateInfoB = GH.createAccountStateInfo(args);

    const ymdDateRef = getYMDDate(args.ymdDateRef);
    const deltaYears_B = [
        -ymdDateRef.fractionalYearsAfterMe(lotStatesB[0].ymdDateCreated),
        -ymdDateRef.fractionalYearsAfterMe(lotStatesB[1].ymdDateCreated),
        -ymdDateRef.fractionalYearsAfterMe(lotStatesB[2].ymdDateCreated),
    ];
    for (let i = 0; i < deltaYears_B.length; ++i) {
        deltaYears_B[i] = Math.max(1, deltaYears_B[i]);
    }

    const marketValueBaseValues_B = [
        GH.calcLotStateMarketValueBaseValue(
            accountStateInfoB, lotStatesB[0].quantityBaseValue),
        GH.calcLotStateMarketValueBaseValue(
            accountStateInfoB, lotStatesB[1].quantityBaseValue),
        GH.calcLotStateMarketValueBaseValue(
            accountStateInfoB, lotStatesB[2].quantityBaseValue),
    ];

    const cagrs_B = [
        Math.pow(marketValueBaseValues_B[0] / lotStatesB[0].costBasisBaseValue,
            1. / deltaYears_B[0]) - 1,
        Math.pow(marketValueBaseValues_B[1] / lotStatesB[1].costBasisBaseValue,
            1. / deltaYears_B[1]) - 1,
        Math.pow(marketValueBaseValues_B[2] / lotStatesB[2].costBasisBaseValue,
            1. / deltaYears_B[2]) - 1,
    ];

    const percentGainQuantityDefinition = accessor.getPercentGainQuantityDefinition();
    const percentAnnualGains_B = cagrs_B.map((cagr) => {
        const baseValue = percentGainQuantityDefinition.numberToBaseValue(
            cagr * 100);
        return percentGainQuantityDefinition.baseValueToNumber(baseValue);
    });

    const totalSharesBaseValue_B = lotStatesB[0].quantityBaseValue
        + lotStatesB[1].quantityBaseValue
        + lotStatesB[2].quantityBaseValue;
    
    let percentAnnualGain_B = 100
        * (cagrs_B[0] * lotStatesB[0].quantityBaseValue / totalSharesBaseValue_B
        + cagrs_B[1] * lotStatesB[1].quantityBaseValue / totalSharesBaseValue_B
        + cagrs_B[2] * lotStatesB[2].quantityBaseValue / totalSharesBaseValue_B
        );
    const percentAnnualGainBaseValue_B = percentGainQuantityDefinition
        .numberToBaseValue(percentAnnualGain_B);
    percentAnnualGain_B = percentGainQuantityDefinition.baseValueToNumber(
        percentAnnualGainBaseValue_B
    );

    result = GH.calcLotStatePercentAnnualGain(args, lotStatesB);
    delete result.accountStateInfo;

    expect(result.lotPercentAnnualGains.length).toEqual(3);
    expect(result).toEqual(expect.objectContaining({
        lotPercentAnnualGains: expect.arrayContaining([
            {
                lotState: lotStatesB[0],
                percentAnnualGain: percentAnnualGains_B[0],
                isStraightGain: undefined,
            },
            {
                lotState: lotStatesB[1],
                percentAnnualGain: percentAnnualGains_B[1],
                isStraightGain: undefined,
            },
            {
                lotState: lotStatesB[2],
                percentAnnualGain: percentAnnualGains_B[2],
                isStraightGain: true,
            },
        ]),
        percentAnnualGain: percentAnnualGain_B,
        percentAnnualGainBaseValue: percentAnnualGainBaseValue_B,
    }));
});



//
//---------------------------------------------------------
//
test('GainHelpers-calcLotStateCashInPercentAnnualGain', () => {
    let result;
    let args;

    const lotStatesB = [
        {
            lotId: lotA.id, // Cash-in
            ymdDateCreated: '2010-01-01',
            quantityBaseValue: 1000000, // 100sh
            costBasisBaseValue: 200000,  // $2000.00
        },
        {
            lotId: lotB.id, // Reinvested dividend
            ymdDateCreated: '2010-06-01',
            quantityBaseValue: 100000,  // 10sh
            costBasisBaseValue: 30000,  // $300.00
        },
        {
            lotId: lotC.id, // Cash-in
            ymdDateCreated: '2020-01-01',   // Less than a year
            quantityBaseValue: 500000, // 50sh
            costBasisBaseValue: 200000,  // $2000.00
        },
    ];

    const lotStateB_0_1 = {
        lotId: lotA.id,
        ymdDateCreated: '2010-01-01',
        quantityBaseValue: 1100000, // 100sh
        costBasisBaseValue: 200000,  // $2000.00
    };

    args = Object.assign({}, argsA, {
        ymdDateRef: '2020-06-01',
        priceDataItem: {
            ymdDate: '2020-06-01',
            close: 50.00,
        }
    });
    const accountStateInfoB = GH.createAccountStateInfo(args);

    const ymdDateRef = getYMDDate(args.ymdDateRef);
    const deltaYears_B = [
        -ymdDateRef.fractionalYearsAfterMe(lotStatesB[0].ymdDateCreated),
        0,
        //-ymdDateRef.fractionalYearsAfterMe(lotStatesB[1].ymdDateCreated),
        -ymdDateRef.fractionalYearsAfterMe(lotStatesB[2].ymdDateCreated),
    ];
    for (let i = 0; i < deltaYears_B.length; ++i) {
        deltaYears_B[i] = Math.max(1, deltaYears_B[i]);
    }

    const marketValueBaseValues_B = [
        GH.calcLotStateMarketValueBaseValue(
            accountStateInfoB, 
            lotStateB_0_1.quantityBaseValue),
        0,
        //GH.calcLotStateMarketValueBaseValue(
        //    accountStateInfoB, lotStatesB[1].quantityBaseValue),
        GH.calcLotStateMarketValueBaseValue(
            accountStateInfoB, lotStatesB[2].quantityBaseValue),
    ];

    const cagrs_B = [
        Math.pow(marketValueBaseValues_B[0] / lotStatesB[0].costBasisBaseValue,
            1. / deltaYears_B[0]) - 1,
        0,
        //Math.pow(marketValueBaseValues_B[1] / lotStatesB[1].costBasisBaseValue,
        //    1. / deltaYears_B[1]) - 1,
        Math.pow(marketValueBaseValues_B[2] / lotStatesB[2].costBasisBaseValue,
            1. / deltaYears_B[2]) - 1,
    ];

    const percentGainQuantityDefinition = accessor.getPercentGainQuantityDefinition();
    const percentAnnualGains_B = cagrs_B.map((cagr) => {
        const baseValue = percentGainQuantityDefinition.numberToBaseValue(
            cagr * 100);
        return percentGainQuantityDefinition.baseValueToNumber(baseValue);
    });

    const totalSharesBaseValue_B = lotStatesB[0].quantityBaseValue
        + lotStatesB[1].quantityBaseValue
        + lotStatesB[2].quantityBaseValue;
    
    let percentAnnualGain_B = 100
        * (cagrs_B[0] * lotStateB_0_1.quantityBaseValue / totalSharesBaseValue_B
        + cagrs_B[2] * lotStatesB[2].quantityBaseValue / totalSharesBaseValue_B
        );
    const percentAnnualGainBaseValue_B = percentGainQuantityDefinition
        .numberToBaseValue(percentAnnualGain_B);
    percentAnnualGain_B = percentGainQuantityDefinition.baseValueToNumber(
        percentAnnualGainBaseValue_B
    );

    result = GH.calcLotStateCashInPercentAnnualGain(args, lotStatesB);
    delete result.accountStateInfo;

    expect(result.lotPercentAnnualGains.length).toEqual(2);
    expect(result).toEqual(expect.objectContaining({
        lotPercentAnnualGains: expect.arrayContaining([
            {
                lotState: lotStateB_0_1,
                percentAnnualGain: percentAnnualGains_B[0],
                isStraightGain: undefined,
            },
            {
                lotState: lotStatesB[2],
                percentAnnualGain: percentAnnualGains_B[2],
                isStraightGain: true,
            },
        ]),
        percentAnnualGain: percentAnnualGain_B,
        percentAnnualGainBaseValue: percentAnnualGainBaseValue_B,
    }));
});

