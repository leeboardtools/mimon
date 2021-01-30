import { dataChange } from './DataChange';

test('dataChange', () => {
    let result;

    const a = {
        abc: 'abc',
        def: 'def',
        ghi: 'ghi',
    };

    // Some degenerate cases...
    result = dataChange(a);
    expect(result).toEqual({
        newObject: a,
    });
    expect(result.newObject).not.toBe(a);

    result = dataChange(a, {});
    expect(result).toEqual({
        newObject: a,
        oldChangedValues: {},
    });
    expect(result.newObject).not.toBe(a);


    result = dataChange(a, {
        def: 'DEF',
        xyz: 'XYZ',
    });
    expect(result).toEqual({
        newObject: {
            abc: 'abc',
            def: 'DEF',
            ghi: 'ghi',
            xyz: 'XYZ',
        },
        oldChangedValues: {
            def: 'def',
            xyz: undefined,
        },
    });

    result = dataChange(result.newObject, result.oldChangedValues);
    expect(result).toEqual({
        newObject: a,
        oldChangedValues: {
            def: 'DEF',
            xyz: 'XYZ',
        },
    });


    const b = {
        abc: 'abc',
        def: undefined,
        ghi: 'ghi',
    };
    result = dataChange(b, { def: 'DEF', });
    expect(result).toEqual({
        newObject: {
            abc: 'abc',
            def: 'DEF',
            ghi: 'ghi',
        },
        oldChangedValues: {
            def: undefined,
        }
    });

    result = dataChange(result.newObject, result.oldChangedValues);
    expect(result).toEqual({
        newObject: {
            abc: 'abc',
            ghi: 'ghi',
        },
        oldChangedValues: {
            def: 'DEF',
        },
    });
});