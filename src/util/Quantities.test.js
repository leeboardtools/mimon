import { DecimalDefinition, Quantity } from './Quantities';
//import { QuantityDefinitionLibrary } from './Quantities';
//import { JSONProcessor } from './JSONProcessor';


function expectToValue(quantity, baseValue, number, valueText) {
    expect(quantity.getBaseValue()).toEqual(baseValue);
    expect(quantity.toNumber()).toBeCloseTo(number);
    expect(quantity.toValueText()).toEqual(valueText);
}

test('DecimalQuantities-toValueText', () => {
    const def0 = new DecimalDefinition(0);
    expect(def0.getDecimalPlaces()).toEqual(0);

    const def2 = new DecimalDefinition(2);
    expect(def2.getDecimalPlaces()).toEqual(2);

    const def3 = new DecimalDefinition({ decimalPlaces: 3 });
    expect(def3.getDecimalPlaces()).toEqual(3);

    const p123p40 = def2.fromNumber(123.4);
    expectToValue(p123p40, 12340, 123.4, '123.40');

    const m123p46 = def2.fromNumber(-123.456);
    expectToValue(m123p46, -12346, -123.46, '-123.46');

    const m0p012 = def3.fromNumber(-0.012);
    expectToValue(m0p012, -12, -0.012, '-0.012');

    const p0p012 = def3.fromNumber(0.012);
    expectToValue(p0p012, 12, 0.012, '0.012');

    const p0p00 = def2.fromNumber(0);
    expectToValue(p0p00, 0, 0.00, '0.00');

    const p1234 = def0.fromNumber(1234.4);
    expectToValue(p1234, 1234, 1234, '1234');

    const m56 = def0.fromNumber(-55.6);
    expectToValue(m56, -56, -56, '-56');


    const resultA = def2.fromValueText('12.34');
    const quantityA = def2.fromNumber(12.34);
    expect(resultA).toEqual({
        quantity: quantityA,
        fullQuantity: quantityA,
        remainingText: '',
    });

    const resultB = def2.fromValueText('-12.3abc');
    const quantityB = def2.fromNumber(-12.3);
    expect(resultB).toEqual({
        quantity: quantityB,
        fullQuantity: quantityB,
        remainingText: 'abc',
    });

    const resultC = def2.fromValueText('-.456');
    const quantityC = def2.fromNumber(-0.46);
    const quantityCFull = def3.fromNumber(-0.456);
    expect(resultC).toEqual({
        quantity: quantityC,
        fullQuantity: quantityCFull,
        remainingText: '',
    });


    // negative decimal places...
    const defm2 = new DecimalDefinition(-2);
    const p1200 = defm2.fromNumber(1234);
    expectToValue(p1200, 12, 1200, '1200');

    const m3400 = defm2.fromNumber(-3356);
    expectToValue(m3400, -34, -3400, '-3400');

    expectToValue(defm2.fromNumber(0), 0, 0, '000');

    const resultM = defm2.fromValueText('1234.56');
    const quantityM = defm2.fromNumber(1234.56);
    const quantityMFull = def2.fromNumber(1234.56);
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

    const def2 = new DecimalDefinition(2);
    const def3 = new DecimalDefinition(3);

    let result;

    const p12p34 = def2.fromNumber(12.34);
    const p23p45 = def2.fromNumber(23.45);
    const p34p56 = def2.fromNumber(34.56);

    // Add
    const addDef2 = def2.fromNumber(12.34 + 23.45 + 34.56);
    result = Quantity.addQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(addDef2);

    result = Quantity.addQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(addDef2);

    result = p12p34.add([p23p45, p34p56]);
    expect(result).toEqual(addDef2);

    result = p12p34.add(p23p45, p34p56);
    expect(result).toEqual(addDef2);

    // Single arg add() test...
    expect(p12p34.add(p23p45)).toEqual(def2.fromNumber(12.34 + 23.45));


    // Subtract
    const subDef2 = def2.fromNumber(12.34 - 23.45 - 34.56);
    result = Quantity.subtractQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(subDef2);

    result = Quantity.subtractQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(subDef2);

    result = p12p34.subtract([p23p45, p34p56]);
    expect(result).toEqual(subDef2);

    result = p12p34.subtract(p23p45, p34p56);
    expect(result).toEqual(subDef2);

    // Single arg subtract() test...
    expect(p12p34.subtract(p23p45)).toEqual(def2.fromNumber(12.34 - 23.45));


    // Multiply...
    const multDef2 = def2.fromNumber(12.34 * 23.45 * 34.56);
    result = Quantity.multiplyQuantities(p12p34, p23p45, p34p56);
    expect(result).toEqual(multDef2);

    result = Quantity.multiplyQuantities([p12p34, p23p45, p34p56]);
    expect(result).toEqual(multDef2);

    result = p12p34.multiply([p23p45, p34p56]);
    expect(result).toEqual(multDef2);

    result = p12p34.multiply(p23p45, p34p56);
    expect(result).toEqual(multDef2);

    // Single arg multiply() test...
    expect(p12p34.multiply(p23p45)).toEqual(def2.fromNumber(12.34 * 23.45));


    // Different resolutions...
    const m1p234 = def3.fromNumber(-1.234);
    const pSumDef3 = def3.fromNumber(12.34 + 23.45 - 1.234 + 34.56);
    expect(Quantity.addQuantities(p12p34, p23p45, m1p234, p34p56)).toEqual(pSumDef3);
    expect(Quantity.subtractQuantities(p12p34, p23p45, m1p234, p34p56)).toEqual(def3.fromNumber(12.34 - 23.45 - -1.234 - 34.56));
    expect(Quantity.multiplyQuantities(p12p34, p23p45, m1p234, p34p56)).toEqual(def3.fromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // Make sure add(), subtract() keep the originating quantity's definition.
    expect(p12p34.add(p23p45, m1p234, p34p56)).toEqual(def2.fromNumber(12.34 + 23.45 - 1.234 + 34.56));
    expect(p12p34.subtract(p23p45, m1p234, p34p56)).toEqual(def2.fromNumber(12.34 - 23.45 - -1.234 - 34.56));
    expect(p12p34.multiply(p23p45, m1p234, p34p56)).toEqual(def2.fromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // Numeric arg test...
    expect(p12p34.add(p23p45, -1.234, p34p56)).toEqual(def2.fromNumber(12.34 + 23.45 + -1.234 + 34.56));
    expect(p12p34.subtract(p23p45, -1.234, p34p56)).toEqual(def2.fromNumber(12.34 - 23.45 - -1.234 - 34.56));

    // Note: can't use -1.234 as test for multiply() as multiply() can't figure out that it's the highest resolution.
    expect(p12p34.multiply(23.45, m1p234, p34p56)).toEqual(def2.fromNumber(12.34 * 23.45 * -1.234 * 34.56));

    // negate()
    expect(m1p234.negate()).toEqual(def3.fromNumber(1.234));
});


test('DecimalQuantities-subdivide', () => {
    const def2 = new DecimalDefinition(2);
    const quantity = def2.fromNumber(1);

    // Check last subdivided quantity handles round-off error.
    const resultA = quantity.subdivide([1, 1, 1]);
    expect(resultA).toEqual([def2.fromNumber(0.33), def2.fromNumber(0.33), def2.fromNumber(0.34)]);
    expect(def2.addQuantities(resultA)).toEqual(quantity);

    const resultB = quantity.subdivide([2, 1, 1]);
    expect(resultB).toEqual([def2.fromNumber(0.5), def2.fromNumber(0.25), def2.fromNumber(0.25)]);

    // Degenerate cases.
    expect(quantity.subdivide([4])).toEqual([quantity]);
});


test('DecimalQuantities-groupMark', () => {
    const def2Comma = new DecimalDefinition({
        decimalPlaces: 2,
        groupMark: ',',
    });

    expect(def2Comma.fromNumber(1234.56).toValueText()).toEqual('1,234.56');
    expect(def2Comma.fromNumber(123.45).toValueText()).toEqual('123.45');
    expect(def2Comma.fromNumber(-1234.56).toValueText()).toEqual('-1,234.56');
    expect(def2Comma.fromNumber(-123.45).toValueText()).toEqual('-123.45');
    expect(def2Comma.fromNumber(-123456.78).toValueText()).toEqual('-123,456.78');
    expect(def2Comma.fromNumber(1234567.8).toValueText()).toEqual('1,234,567.80');

    expect(def2Comma.fromValueText('1,234.56').quantity).toEqual(def2Comma.fromNumber(1234.56));
    expect(def2Comma.fromValueText('-1,234,567.89').quantity).toEqual(def2Comma.fromNumber(-1234567.89));


    const defm2Comma = new DecimalDefinition({
        decimalPlaces: -2,
        groupMark: ','
    });

    expect(defm2Comma.fromNumber(100).toValueText()).toEqual('100');
    expect(defm2Comma.fromNumber(1000).toValueText()).toEqual('1,000');
    expect(defm2Comma.fromNumber(100000).toValueText()).toEqual('100,000');
    expect(defm2Comma.fromNumber(-1000000).toValueText()).toEqual('-1,000,000');
    expect(defm2Comma.fromValueText('1,000,000').quantity).toEqual(defm2Comma.fromNumber(1000000));
});


test('Quantity-Simple JSON Processor', () => {
/*    const def2 = new DecimalDefinition(2);
    const def3 = new DecimalDefinition(3);
    const def3Mark = new DecimalDefinition({
        decimalPlaces: 3,
        groupMark: ',',
    });

    const library = new QuantityDefinitionLibrary();

    const processor = new JSONProcessor();
    processor.addCollectionObjectProcessors();
    Quantity.registerWithJSONObjectProcessor(processor, library);

    const quantityA = def2.fromNumber(123.45);
    const quantityB = def3.fromNumber(-34.567);
    const quantityC = def3Mark.fromNumber(12345.67);
    library.addDefinition('quantityB', quantityB.getDefinition());

    const refA = [quantityA, quantityB, quantityC];
    const jsonA = processor.objectToJSON(refA);

    const testA = processor.objectFromJSON(jsonA);
    expect(testA).toEqual(refA);

    // Library definition should return the actual definition objects.
    expect(testA[0].getDefinition() === refA[0].getDefinition()).toBeFalsy();
    expect(testA[1].getDefinition() === refA[1].getDefinition()).toBeTruthy();


    // Straight JSON:
    const straightJSONA = quantityA.toJSON();
    const testStraightA = new Quantity(straightJSONA);
    expect(testStraightA).toEqual(quantityA);
*/
});

