import { compare, MultiCompare } from './MultiCompare';

test('compare', () => {
    const objectA = {
        a: 123,
        b: {
            c: 'def',
        },
        d: 'ghi',
    };

    // Different ordering of keys
    const objectA1 = {
        b: {
            c: 'def',
        },
        d: 'ghi',
        a: 123,
    };

    // values differ
    const objectB = {
        a: 123,
        b: {
            c: 'def1',
        },
        d: 'ghi',
    };

    // keys differ
    const objectC = {
        a: 123,
        b: {
            c: 'def',
        },
        e: 'ghi',
    };

    // different number of keys
    const objectD = {
        a: 123,
        b: {
            c: 'def',
        },
        d: 'ghi',
        e: 123,
    };


    //
    // undefined
    expect(compare(undefined, undefined)).toEqual(0);

    expect(compare(undefined, null)).toBeLessThan(0);
    expect(compare(null, undefined)).toBeGreaterThan(0);

    expect(compare(undefined, 1)).toBeLessThan(0);
    expect(compare(1, undefined)).toBeGreaterThan(0);

    expect(compare(undefined, '1')).toBeLessThan(0);
    expect(compare('1', undefined)).toBeGreaterThan(0);

    expect(compare(undefined, [])).toBeLessThan(0);
    expect(compare([], undefined)).toBeGreaterThan(0);

    expect(compare(undefined, objectA)).toBeLessThan(0);
    expect(compare(objectA, undefined)).toBeGreaterThan(0);


    //
    // null
    expect(compare(null, null)).toEqual(0);
    expect(compare(null, 1)).toBeLessThan(0);
    expect(compare(1, null)).toBeGreaterThan(0);

    expect(compare(null, '1')).toBeLessThan(0);
    expect(compare('1', null)).toBeGreaterThan(0);

    expect(compare(null, [])).toBeLessThan(0);
    expect(compare([], null)).toBeGreaterThan(0);

    expect(compare(null, objectA)).toBeLessThan(0);
    expect(compare(objectA, null)).toBeGreaterThan(0);


    //
    // numbers
    expect(compare(1, 1)).toEqual(0);
    expect(compare(1, 2)).toBeLessThan(0);
    expect(compare(2, 1)).toBeGreaterThan(0);

    expect(compare(1, '1')).toBeLessThan(0);
    expect(compare('1', 1)).toBeGreaterThan(0);

    expect(compare(1, [])).toBeLessThan(0);
    expect(compare([], 1)).toBeGreaterThan(0);

    expect(compare(1, objectA)).toBeLessThan(0);
    expect(compare(objectA, 1)).toBeGreaterThan(0);


    //
    // strings
    expect(compare('1', '1')).toEqual(0);
    expect(compare('1', '2')).toBeLessThan(0);
    expect(compare('2', '1')).toBeGreaterThan(0);

    expect(compare('1', [])).toBeLessThan(0);
    expect(compare([], '1')).toBeGreaterThan(0);

    expect(compare('1', objectA)).toBeLessThan(0);
    expect(compare(objectA, '1')).toBeGreaterThan(0);


    //
    // arrays
    const arrayA = [ 'a', 1, objectA ];
    const arrayA1 = [ 'a', 1, objectA ];
    const arrayB = [ 'a', 1, objectA, 1 ];
    const arrayC = [ 'a', 1, objectB, ];
    expect(compare(arrayA, arrayA1)).toEqual(0);
    expect(compare(arrayA1, arrayA)).toEqual(0);
    expect(compare(arrayA, arrayB)).toBeLessThan(0);
    expect(compare(arrayB, arrayA)).toBeGreaterThan(0);
    expect(compare(arrayA, arrayC)).toBeLessThan(0);
    expect(compare(arrayC, arrayA)).toBeGreaterThan(0);

    expect(compare(arrayA, objectA)).toBeLessThan(0);
    expect(compare(objectA, arrayA)).toBeGreaterThan(0);


    //
    // objects
    expect(compare(objectA, objectA1)).toEqual(0);
    expect(compare(objectA1, objectA)).toEqual(0);
    expect(compare(objectA, objectB)).toBeLessThan(0);
    expect(compare(objectB, objectA)).toBeGreaterThan(0);

    expect(compare(objectA, objectC)).toBeLessThan(0);
    expect(compare(objectC, objectA)).toBeGreaterThan(0);

    expect(compare(objectA, objectD)).toBeLessThan(0);
    expect(compare(objectD, objectA)).toBeGreaterThan(0);
});


test('MultiCompare', () => {
    const multiCompare = new MultiCompare([
        {
            key: 'a',
            compare: (a, b) => compare(a.a, b.a),
        },
        {
            key: 'b',
            compare: (a, b) => compare(a.b, b.b),
        },
        {
            key: 'c',
            compare: (a, b) => compare(a.c, b.c),
        },
    ]);

    const a = {
        a: 1,
        b: {
            x: 123,
        },
        c: 'abc',
    };

    const b = {
        a: 2,
        b: {
            x: 122,
        },
        c: 'abc',
    };

    const c = {
        a: 1,
        b: {
            x: 123,
        },
        c: 'def',
    };

    const d = {
        a: 1,
        b: {
            x: 123,
        },
        c: 'def',
    };

    const e = {
        a: 1,
        b: {
            x: 122,
        },
        c: 'def',
    };

    //
    // No comparison order set, should match compare().
    expect(multiCompare.compare(a, b)).toEqual(compare(a, b));
    expect(multiCompare.compare(a, c)).toEqual(compare(a, c));

    multiCompare.setCompareOrder([
        { key: 'b', }
    ]);
    expect(multiCompare.compare(a, b)).toBeGreaterThan(0);

    // b is same, comparison depends on 'c'...
    expect(multiCompare.compare(a, c)).toBeLessThan(0);


    //
    // Reverse compare order...
    multiCompare.setCompareOrder({ key: 'b', sortSign: -1, });
    expect(multiCompare.compare(a, b)).toBeLessThan(0);

    // b is same, sign doesn't matter.
    expect(multiCompare.compare(a, c)).toBeLessThan(0);

    //
    // Reverse final compare...
    multiCompare.setCompareOrder([
        { key: 'b', sortSign: -1, },
        { sortSign: -1, },
    ]);
    expect(multiCompare.compare(a, b)).toBeLessThan(0);
    expect(multiCompare.compare(a, c)).toBeGreaterThan(0);


    //
    // Multi-level
    multiCompare.setCompareOrder([
        { key: 'c', sortSign: -1, },
        { key: 'b', sortSign: 1, },
    ]);
    expect(multiCompare.compare(a, c)).toBeGreaterThan(0);
    expect(multiCompare.compare(c, d)).toEqual(0);
    expect(multiCompare.compare(d, c)).toEqual(0);
    expect(multiCompare.compare(d, e)).toBeGreaterThan(0);
    expect(multiCompare.compare(e, d)).toBeLessThan(0);


    //
    // Make sure sign is applied to correct item...
    multiCompare.setCompareOrder([
        { key: 'c', sortSign: 1, },
        { key: 'b', sortSign: -1, },
    ]);
    expect(multiCompare.compare(a, c)).toBeLessThan(0);
    expect(multiCompare.compare(c, a)).toBeGreaterThan(0);
    expect(multiCompare.compare(c, d)).toEqual(0);
    expect(multiCompare.compare(d, c)).toEqual(0);
    expect(multiCompare.compare(d, e)).toBeLessThan(0);
    expect(multiCompare.compare(e, d)).toBeGreaterThan(0);


    //
    // Clear compare order...
    multiCompare.setCompareOrder([]);
    expect(multiCompare.compare(a, b)).toEqual(compare(a, b));
    expect(multiCompare.compare(a, c)).toEqual(compare(a, c));
});
