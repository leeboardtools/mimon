import { dataDeepCopy } from './DataDeepCopy';

test('dataDeepCopy', () => {
    let original;
    let result;

    // string
    original = 'abc';
    expect(dataDeepCopy(original)).toBe(original);

    // number
    original = 123;
    expect(dataDeepCopy(original)).toBe(original);

    // boolean
    original = true;
    expect(dataDeepCopy(original)).toBe(original);

    // Symbol
    original = Symbol();
    expect(dataDeepCopy(original)).toBe(original);

    // undefined
    original = undefined;
    expect(dataDeepCopy(original)).toBe(original);

    // function
    original = () => {};
    expect(dataDeepCopy(original)).toBe(original);

    // Arrays
    original = [1, 2, 'abc', ];
    result = dataDeepCopy(original);
    expect(result).not.toBe(original);
    expect(result).toEqual(original);

    // Objects
    original = {
        a: {
            b: 'c',
            d: 123,
            e: [1, 2, 3, ],
        },
        f: [ 9, 8, 7, ],
        g: undefined,
        h: null,
    };
    result = dataDeepCopy(original);
    expect(result).not.toBe(original);
    expect(result).toEqual(original);

    expect(result.a).not.toBe(original.a);
    expect(result.a).toEqual(original.a);

    // value is string, so will be same object.
    expect(result.a.b).toBe(original.a.b);

    expect(result.a.e).not.toBe(original.a.e);
    expect(result.a.e).toEqual(original.a.e);

    expect(result).toHaveProperty('g');
    expect(result.g).toEqual(original.g);

    expect(result).toHaveProperty('h');
    expect(result.h).toEqual(original.h);


    // Array of objects.
    original = [
        {
            a: {
                b: 'bbb',
            },
            c: 123,
        },
        456,
        {
            d: {
                e: [ 
                    {
                        f: 'fff',
                    },
                ],
                g: {
                    h: () => {},
                }
            }
        }
    ];
    result = dataDeepCopy(original);

    expect(result).not.toBe(original);
    expect(result).toEqual(original);

    expect(result.length).toEqual(original.length);

    expect(result[0]).not.toBe(original[0]);
    expect(result[0]).toEqual(original[0]);

    expect(result[0].a).not.toBe(original[0].a);
    expect(result[0].a).toEqual(original[0].a);

    // b is a string...
    expect(result[0].a.b).toBe(original[0].a.b);

    // c is a number...
    expect(result[0].a.c).toBe(original[0].a.c);

    // [1] is a number...
    expect(result[1]).toBe(original[1]);

    expect(result[2].d).not.toBe(original[2].d);
    expect(result[2].d).toEqual(original[2].d);


    // circular, multiple references....
    const a = {
        b: {
            c: 'ccc',
        },
    };
    const b = {
        a: a,
        b: {
            c: 'CCC',
            d: a,
        },
    };

    a.d = [b, a];

    result = dataDeepCopy(b);
    expect(result).not.toBe(b);
    expect(result).toEqual(b);

    expect(result.a).not.toBe(b.a);
    expect(result.a).toEqual(b.a);

    expect(result.a.d).not.toBe(b.a.d);
    expect(result.a.d).toEqual(b.a.d);

    // Single copy repeated
    expect(result.a).toBe(result.b.d);
    expect(result.a.d[0]).toBe(result);
    expect(result.a.d[1]).toBe(result.a);


    // Date
    original = new Date();
    expect(dataDeepCopy(original)).toBe(original);


    // Set
    original = new Set([
        1, 
        { 
            a: 'AAA', 
            b: {
                c: 'CCC',
            }
        },
    ]);
    result = dataDeepCopy(original);
    expect(result).not.toBe(original);
    expect(result.values()).toEqual(original.values());

    let originalValues = Array.from(original.values());
    let resultValues = Array.from(result.values());
    expect(resultValues[1]).not.toBe(originalValues[1]);
    expect(resultValues[1]).toEqual(originalValues[1]);


    // Map
    const m = {
        m: {
            n: 'N',
            o: [1, 2, 3, ],
        },
    };
    original = new Map([
        [
            'abc', 
            {
                a: 'A',
                b: {
                    c: 'C',
                },
            }
        ],
        [
            { 
                d: {
                    e: 123,
                },
            },
            m,
        ],
        [
            m,
            123,
        ],
    ]);

    result = dataDeepCopy(original);
    expect(result).not.toBe(original);
    expect(result.entries()).toEqual(original.entries());

    let originalEntries = Array.from(original.entries());
    let resultEntries = Array.from(result.entries());

    expect(resultEntries[0][0]).toBe(originalEntries[0][0]);
    expect(resultEntries[0][1]).not.toBe(originalEntries[0][1]);
    expect(resultEntries[0][1]).toEqual(originalEntries[0][1]);

    expect(resultEntries[1][0]).not.toBe(originalEntries[1][0]);
    expect(resultEntries[1][0]).toEqual(originalEntries[1][0]);

    expect(resultEntries[1][1]).not.toBe(originalEntries[1][1]);
    expect(resultEntries[1][1]).toEqual(originalEntries[1][1]);

    expect(resultEntries[1][1]).toBe(resultEntries[2][0]);
});