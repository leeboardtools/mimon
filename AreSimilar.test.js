import { areSimilar } from './AreSimilar';

test('areSimilar', () => {
    // Numbers
    expect(areSimilar(1, 1)).toBeTruthy();
    expect(areSimilar(1, 2)).toBeFalsy();

    // Strings
    expect(areSimilar('abc', 'abc')).toBeTruthy();
    expect(areSimilar('Abc', 'abc')).toBeFalsy();

    // undefined, etc.
    expect(areSimilar(undefined, null)).toBeTruthy();
    expect(areSimilar(undefined, '')).toBeTruthy();
    expect(areSimilar('', null)).toBeTruthy();

    // Arrays
    expect(areSimilar(['a', 123, undefined, null, '', 456 ],
        ['a', 123, undefined, null, '', 456 ]))
        .toBeTruthy();
    expect(areSimilar(['a', 123, null, '', undefined, 456 ],
        ['a', 123, undefined, null, '', 456 ]))
        .toBeTruthy();
    expect(areSimilar(['a', 123, undefined, null, '', 456 ],
        ['a', 123, undefined, null, 'a', 456 ]))
        .toBeFalsy();
    expect(areSimilar(['a', 123, null, '', undefined, 456 ],
        ['a', 123, undefined, null, '', 456, 789 ]))
        .toBeFalsy();
    expect(areSimilar(['a', 123, null, '', undefined, 456, null, '' ],
        ['a', 123, undefined, null, '', 456 ]))
        .toBeTruthy();
    expect(areSimilar(['a', 123, null, '', undefined, 456 ],
        ['a', 123, undefined, null, '', 456, null, '' ]))
        .toBeTruthy();
    
    // Objects
    expect(areSimilar(
        { 
            a: 123, 
            b: undefined,
            c: 'abc',
            d: null,
            e: [ 1, 'a', { d: 123 }, ],
            f: '',
        },
        { 
            a: 123, 
            b: '',
            c: 'abc',
            d: undefined,
            e: [ 1, 'a', { d: 123 }, ],
            f: null,
        },
    )).toBeTruthy();

    expect(areSimilar(
        { 
            a: 123, 
            b: undefined,
            c: 'abc',
            d: null,
            e: [ 1, 'a', { d: 123 }, ],
            f: '',
        },
        { 
            a: 123, 
            b: '',
            c: 'abc',
            e: [ 1, 'a', { d: 123 }, ],
        },
    )).toBeTruthy();

    expect(areSimilar(
        { 
            a: 123, 
            b: undefined,
            c: 'abc',
            d: null,
            e: [ 1, 'a', { d: 123 }, ],
            f: '',
        },
        { 
            a: 123, 
            b: '',
            c: 'abc',
            d: undefined,
            e: [ 1, 'a', { d: 123 }, ],
            f: null,
            g: 'a',
        },
    )).toBeFalsy();

    expect(areSimilar(
        { 
            a: 123, 
            b: undefined,
            c: 'abc',
            d: null,
            e: [ 1, 'a', { d: 123 }, ],
            f: '',
        },
        { 
            a: 123, 
            b: '',
            c: 'abc',
            d: undefined,
            e: [ 1, 'a', { d: 123, e: undefined }, ],
            f: null,
        },
    )).toBeTruthy();

    expect(areSimilar(
        { 
            a: 123, 
            b: undefined,
            c: 'abc',
            d: null,
            e: [ 1, 'a', { d: 123 }, ],
            f: '',
        },
        { 
            a: 123, 
            b: '',
            c: 'abc',
            d: undefined,
            e: [ 1, 'a', { d: 123, e: 'x' }, ],
            f: null,
        },
    )).toBeFalsy();
});