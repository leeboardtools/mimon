import { getDecimalDefinition, Quantity, getQuantityDefinition } from './Quantities';


function expectToValue(quantity, baseValue, number, valueText) {
    expect(quantity.getBaseValue()).toEqual(baseValue);
    expect(quantity.toNumber()).toBeCloseTo(number);
    expect(quantity.toValueText()).toEqual(valueText);
}

test('DecimalQuantities-toValueText', () => {
    const def0 = getDecimalDefinition(0);
    expect(def0.getDecimalPlaces()).toEqual(0);

    const def2 = getDecimalDefinition(2);
    expect(def2.getDecimalPlaces()).toEqual(2);

    const def3 = getDecimalDefinition({ decimalPlaces: 3 });
    expect(def3.getDecimalPlaces()).toEqual(3);

    const p123p40 = def2.quantityFromNumber(123.4);
    expectToValue(p123p40, 12340, 123.4, '123.40');

    const m123p46 = def2.quantityFromNumber(-123.456);
    expectToValue(m123p46, -12346, -123.46, '-123.46');

    const m0p012 = def3.quantityFromNumber(-0.012);
    expectToValue(m0p012, -12, -0.012, '-0.012');

    const p0p012 = def3.quantityFromNumber(0.012);
    expectToValue(p0p012, 12, 0.012, '0.012');

    const p0p00 = def2.quantityFromNumber(0);
    expectToValue(p0p00, 0, 0.00, '0.00');

    const p1234 = def0.quantityFromNumber(1234.4);
    expectToValue(p1234, 1234, 1234, '1234');

    const m56 = def0.quantityFromNumber(-55.6);
    expectToValue(m56, -56, -56, '-56');


    const resultA = def2.fromValueText('12.34');
    const quantityA = def2.quantityFromNumber(12.34);
    expect(resultA).toEqual({
        quantity: quantityA,
        fullQuantity: quantityA,
        remainingText: '',
    });

    const resultB = def2.fromValueText('-12.3abc');
    const quantityB = def2.quantityFromNumber(-12.3);
    expect(resultB).toEqual({
        quantity: quantityB,
        fullQuantity: quantityB,
        remainingText: 'abc',
    });

    const resultC = def2.fromValueText('-.456');
    const quantityC = def2.quantityFromNumber(-0.46);
    const quantityCFull = def3.quantityFromNumber(-0.456);
    expect(resultC).toEqual({
        quantity: quantityC,
        fullQuantity: quantityCFull,
        remainingText: '',
    });


    // negative decimal places...
    const defm2 = getDecimalDefinition(-2);
    const p1200 = defm2.quantityFromNumber(1234);
    expectToValue(p1200, 12, 1200, '1200');

    const m3400 = defm2.quantityFromNumber(-3356);
    expectToValue(m3400, -34, -3400, '-3400');

    expectToValue(defm2.quantityFromNumber(0), 0, 0, '000');

    const resultM = defm2.fromValueText('1234.56');
    const quantityM = defm2.quantityFromNumber(1234.56);
    const quantityMFull = def2.quantityFromNumber(1234.56);
    expect(resultM).toEqual({
        quantity: quantityM,
        fullQuantity: quantityMFull,
        remainingText: '',
    });


    // Check degenerate parse cases...
    expect(def2.fromValueText('abc')).toBeUndefined();
    expect(def2.fromValueText('-')).toBeUndefined();
    expect(def2.fromValueText('-.')).toBeUndefined();
    expect(def2.fromValueText('.')).toBeUndefined();

});


test('DecimalQuantity-add-subtract-negate', () => {

    const def2 = getDecimalDefinition(2);
    const def3 = getDecimalDefinition(3);

    let result;

    const p12p34 = def2.quantityFromNumber(12.34);
    const p23p45 = def2.quantityFromNumber(23.45);
    const p34p56 = def2.quantityFromNumber(34.56);

    // Add
    const addDef2 = def2.quantityFromNumber(12.34 + 23.45 + 34.56);
    result = Quantity.addQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(addDef2);

    result = Quantity.addQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(addDef2);

    result = p12p34.add([p23p45, p34p56]);
    expect(result).toEqual(addDef2);

    result = p12p34.add(p23p45, p34p56);
    expect(result).toEqual(addDef2);

    // Single arg add() test...
    expect(p12p34.add(p23p45)).toEqual(def2.quantityFromNumber(12.34 + 23.45));


    // Subtract
    const subDef2 = def2.quantityFromNumber(12.34 - 23.45 - 34.56);
    result = Quantity.subtractQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(subDef2);

    result = Quantity.subtractQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(subDef2);

    result = p12p34.subtract([p23p45, p34p56]);
    expect(result).toEqual(subDef2);

    result = p12p34.subtract(p23p45, p34p56);
    expect(result).toEqual(subDef2);

    // Single arg subtract() test...
    expect(p12p34.subtract(p23p45)).toEqual(def2.quantityFromNumber(12.34 - 23.45));


    // Multiply...
    const multDef2 = def2.quantityFromNumber(12.34 * 23.45 * 34.56);
    result = Quantity.multiplyQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(multDef2);

    result = Quantity.multiplyQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(multDef2);

    result = p12p34.multiply([p23p45, p34p56]);
    expect(result).toEqual(multDef2);

    result = p12p34.multiply(p23p45, p34p56);
    expect(result).toEqual(multDef2);

    // Single arg multiply() test...
    expect(p12p34.multiply(p23p45)).toEqual(def2.quantityFromNumber(12.34 * 23.45));


    // Different resolutions...
    const m1p234 = def3.quantityFromNumber(-1.234);
    const pSumDef3 = def3.quantityFromNumber(12.34 + 23.45 - 1.234 + 34.56);
    expect(Quantity.addQuantities(p12p34, p23p45, m1p234, p34p56)).toEqual(pSumDef3);
    expect(Quantity.subtractQuantities(p12p34, p23p45, m1p234, p34p56))
        .toEqual(def3.quantityFromNumber(12.34 - 23.45 - -1.234 - 34.56));
    expect(Quantity.multiplyQuantities(p12p34, p23p45, m1p234, p34p56))
        .toEqual(def3.quantityFromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // Make sure add(), subtract() keep the originating quantity's definition.
    expect(p12p34.add(p23p45, m1p234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 + 23.45 - 1.234 + 34.56));
    expect(p12p34.subtract(p23p45, m1p234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 - 23.45 - -1.234 - 34.56));
    expect(p12p34.multiply(p23p45, m1p234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // Numeric arg test...
    expect(p12p34.add(p23p45, -1.234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 + 23.45 + -1.234 + 34.56));
    expect(p12p34.subtract(p23p45, -1.234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 - 23.45 - -1.234 - 34.56));

    // Note: can't use -1.234 as test for multiply() as multiply() can't figure 
    // out that it's the highest resolution.
    expect(p12p34.multiply(23.45, m1p234, p34p56))
        .toEqual(def2.quantityFromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // negate()
    expect(m1p234.negate()).toEqual(def3.quantityFromNumber(1.234));
});


test('DecimalQuantities-subdivide', () => {
    const def2 = getDecimalDefinition(2);
    const quantity = def2.quantityFromNumber(1);

    // Check last subdivided quantity handles round-off error.
    const resultA = quantity.subdivide([1, 1, 1]);
    expect(resultA).toEqual([def2.quantityFromNumber(0.33), 
        def2.quantityFromNumber(0.33), def2.quantityFromNumber(0.34)]);
    expect(def2.addQuantities(resultA)).toEqual(quantity);

    const resultB = quantity.subdivide([2, 1, 1]);
    expect(resultB).toEqual([def2.quantityFromNumber(0.5), 
        def2.quantityFromNumber(0.25), def2.quantityFromNumber(0.25)]);

    // Degenerate cases.
    expect(quantity.subdivide([4])).toEqual([quantity]);
});


test('DecimalQuantities-groupMark', () => {
    const def2Comma = getDecimalDefinition({
        decimalPlaces: 2,
        groupMark: ',',
    });

    expect(def2Comma.quantityFromNumber(1234.56).toValueText()).toEqual('1,234.56');
    expect(def2Comma.quantityFromNumber(123.45).toValueText()).toEqual('123.45');
    expect(def2Comma.quantityFromNumber(-1234.56).toValueText()).toEqual('-1,234.56');
    expect(def2Comma.quantityFromNumber(-123.45).toValueText()).toEqual('-123.45');
    expect(def2Comma.quantityFromNumber(-123456.78).toValueText()).toEqual('-123,456.78');
    expect(def2Comma.quantityFromNumber(1234567.8).toValueText()).toEqual('1,234,567.80');

    expect(def2Comma.fromValueText('1,234.56').quantity)
        .toEqual(def2Comma.quantityFromNumber(1234.56));
    expect(def2Comma.fromValueText('-1,234,567.89').quantity)
        .toEqual(def2Comma.quantityFromNumber(-1234567.89));


    const defm2Comma = getDecimalDefinition({
        decimalPlaces: -2,
        groupMark: ','
    });

    expect(defm2Comma.quantityFromNumber(100).toValueText()).toEqual('100');
    expect(defm2Comma.quantityFromNumber(1000).toValueText()).toEqual('1,000');
    expect(defm2Comma.quantityFromNumber(100000).toValueText()).toEqual('100,000');
    expect(defm2Comma.quantityFromNumber(-1000000).toValueText()).toEqual('-1,000,000');
    expect(defm2Comma.fromValueText('1,000,000').quantity)
        .toEqual(defm2Comma.quantityFromNumber(1000000));
});


test('QuantityDefinition-singletons', () => {
    const defA = getDecimalDefinition(-2);
    const defB = getDecimalDefinition(-2);
    expect(defA === defB).toBeTruthy();

    const defC = getDecimalDefinition(3);
    expect(defC === defA).toBeFalsy();

    const defD = getDecimalDefinition({ decimalPlaces: -2, groupMark: ',' });
    expect(defD === defA).toBeFalsy();
    expect(defD.getDecimalPlaces()).toBe(-2);
    expect(defD.getGroupMark()).toBe(',');

    const defE = getQuantityDefinition(defD.getName());
    expect(defE === defD).toBeTruthy();

    const defF = getQuantityDefinition(defC.getName());
    expect(defF === defC).toBeTruthy();
});


test('QuantityDefinition-displaText', () => {
    expect(getDecimalDefinition(1).getDisplayText()).toEqual('x.x');

    expect(getDecimalDefinition(2).getDisplayText()).toEqual('x.xx');

    expect(getDecimalDefinition(-4).getDisplayText()).toEqual('x0000');

    expect(getDecimalDefinition(0).getDisplayText()).toEqual('x');

    const defD = getDecimalDefinition({
        decimalPlaces: -4,
        groupMark: ','
    });
    expect(defD.getDisplayText()).toEqual('x0,000');
});