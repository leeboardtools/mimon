import * as JSONUtils from './JSONUtils';

test('JSONUtils.toCleanJSON', () => {
    const a = {
        a: 'Abc',
        b: undefined,
        c: 'Def',
        d: 0,
        e: null,
        f: 123,
    };
    const cleanA = JSONUtils.toCleanJSON(a);
    expect(cleanA).toEqual({
        a: 'Abc',
        c: 'Def',
        d: 0,
        e: null,
        f: 123,
    });
});


test('JSONUtils.map', () => {
    const refMap = new Map([[123, 'Abc'], [234, 'XYZ'], ['mno', { a: 'A', b: 'Bee' }]]);
    const json = JSONUtils.mapToJSON(refMap);
    const testMap = JSONUtils.jsonToMap(json);
    expect(testMap).toEqual(refMap);
});

test('JSONUtils.set', () => {
    const refSet = new Set([123, 'Abc', 456]);
    const json = JSONUtils.setToJSON(refSet);
    const testSet = JSONUtils.jsonToSet(json);
    expect(testSet).toEqual(refSet);
});

