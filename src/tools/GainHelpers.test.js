import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as GH from './GainHelpers';
import * as L from '../engine/Lots';
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
let priceA;
let argsA;
let accountStateInfoA;

let totalSharesBaseValue;
let totalShares;
let totalMarketValue;
let totalMarketValueBaseValue;

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
