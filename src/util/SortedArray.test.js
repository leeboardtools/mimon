import { SortedArray } from './SortedArray';

function letterCompare(a, b) {
    return a.localeCompare(b);
}

test('SortedArray', () => {
    const arrayNoDupl = new SortedArray(letterCompare);

    expect(arrayNoDupl.add('abc')).toEqual(0);
    expect(arrayNoDupl.add('yyy')).toEqual(1);
    expect(arrayNoDupl.add('def')).toEqual(1);
    expect(arrayNoDupl.add('abc')).toEqual(-1);
    expect(arrayNoDupl.length).toEqual(3);
    expect(arrayNoDupl.getValues()).toEqual(['abc', 'def', 'yyy']);

    expect(arrayNoDupl.indexOf('abc')).toEqual(0);
    expect(arrayNoDupl.indexOf('def')).toEqual(1);
    expect(arrayNoDupl.indexOf('yyy')).toEqual(2);
    expect(arrayNoDupl.at(0)).toEqual('abc');

    expect(arrayNoDupl.indexLE('aaa')).toEqual(-1);
    expect(arrayNoDupl.indexLE('abc')).toEqual(0);
    expect(arrayNoDupl.indexLE('abd')).toEqual(0);
    expect(arrayNoDupl.indexLE('dee')).toEqual(0);
    expect(arrayNoDupl.indexLE('def')).toEqual(1);
    expect(arrayNoDupl.indexLE('deg')).toEqual(1);
    expect(arrayNoDupl.indexLE('yyy')).toEqual(2);
    expect(arrayNoDupl.indexLE('yyz')).toEqual(2);

    expect(arrayNoDupl.indexGE('aaa')).toEqual(0);
    expect(arrayNoDupl.indexGE('abc')).toEqual(0);
    expect(arrayNoDupl.indexGE('yyy')).toEqual(2);
    expect(arrayNoDupl.indexGE('yyz')).toEqual(3);

    expect(arrayNoDupl.delete('xyz')).toBeFalsy();
    expect(arrayNoDupl.delete('abc')).toBeTruthy();
    expect(arrayNoDupl.getValues()).toEqual(['def', 'yyy']);

    const arrayNoDupl2 = new SortedArray(letterCompare, {
        initialValues: ['abc', 'def', 'yyy', 'def'],
    });
    expect(arrayNoDupl2.getValues()).toEqual(['abc', 'def', 'yyy']);


    const arrayDupl = new SortedArray(letterCompare, {
        duplicates: 'allow',
        initialValues: ['abc', 'def', 'yyy', 'abc'],
    });
    expect(arrayDupl.getValues()).toEqual(['abc', 'abc', 'def', 'yyy']);
    expect(arrayDupl.indexOf('abc')).toEqual(0);
    expect(arrayDupl.indexOf('def')).toEqual(2);
    expect(arrayDupl.add('def')).toEqual(2);
    expect(arrayDupl.delete('abc')).toBeTruthy();
    expect(arrayDupl.getValues()).toEqual(['abc', 'def', 'def', 'yyy']);
    expect(arrayDupl.indexLE('def')).toEqual(1);
    expect(arrayDupl.indexGE('def')).toEqual(2);
    expect(arrayDupl.indexGE('deg')).toEqual(3);


    
    const arrayClone = new SortedArray(arrayDupl);
    expect(arrayClone).toEqual(arrayDupl);
});
