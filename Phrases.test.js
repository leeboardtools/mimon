import { comparePhrases, PhraseMap, stringToPhrase } from './Phrases';

test('stringToPhrase', () => {
    expect(stringToPhrase()).toBeUndefined();
    expect(stringToPhrase('Abc')).toEqual(['Abc']);
    expect(stringToPhrase('Abc Def')).toEqual(['Abc', 'Def']);
    expect(stringToPhrase('    Abc     Def')).toEqual(['Abc', 'Def']);
    expect(stringToPhrase('    Abc \t\n  Def\n\n')).toEqual(['Abc', 'Def']);
});


test('comparePhrases', () => {
    const phraseA = ['A', 'B', ];
    const phraseB = ['A', 'B', 'C', ];
    const phraseC = ['A', 'B', 'c', ];
    const phraseD = ['A', 'B', ];

    expect(comparePhrases(undefined, undefined)).toBe(0);
    expect(comparePhrases(undefined, phraseA)).toBeLessThan(0);
    expect(comparePhrases(phraseA, undefined)).toBeGreaterThan(0);

    expect(comparePhrases(phraseA, phraseB)).toBeLessThan(0);
    expect(comparePhrases(phraseB, phraseA)).toBeGreaterThan(0);

    expect(comparePhrases(phraseB, phraseC)).toBeGreaterThan(0);
    expect(comparePhrases(phraseC, phraseB)).toBeLessThan(0);

    expect(comparePhrases(phraseA, phraseA)).toBe(0);
    expect(comparePhrases(phraseA, phraseD)).toBe(0);
});


test('PhraseMap', () => {
    const mapA = new PhraseMap();

    const phraseA = ['Abc', 'Bcd'];
    const valueA = [123, 456, ];

    expect(mapA.size).toBe(0);
    expect(mapA.get(phraseA)).toBeUndefined();
    expect(mapA.has(phraseA)).toBeFalsy();

    expect(mapA.set(phraseA, valueA)).toBe(mapA);


    expect(mapA.size).toEqual(1);
    expect(mapA.get(phraseA)).toEqual(valueA);
    expect(mapA.has(phraseA)).toBeTruthy();

    expect(mapA.findPhrasesWith()).toEqual([]);
    expect(mapA.findPhrasesWith(phraseA)).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);

    // First word tests...
    expect(mapA.findPhrasesWith(['A'])).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);
    expect(mapA.findPhrasesWith(['Abc'])).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);
    expect(mapA.findPhrasesWith(['Abcd'])).toEqual([]);

    expect(mapA.findPhrasesWith(['Abc', 'B'])).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);
    expect(mapA.findPhrasesWith(['Abc', 'Bcd'])).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);
    // Second word doesn't match...
    expect(mapA.findPhrasesWith(['Abc', 'Bcde'])).toEqual([]);


    // Second word tests...
    expect(mapA.findPhrasesWith(['B'])).toEqual([
        { phrase: phraseA, value: valueA, }
    ]);

    // First word doesn't match.
    expect(mapA.findPhrasesWith(['A', 'Bcd'])).toEqual([]);


    // delete
    expect(mapA.delete(phraseA)).toBeTruthy();
    expect(mapA.size).toEqual(0);
    expect(mapA.get(phraseA)).toBeUndefined();
    expect(mapA.has(phraseA)).toBeFalsy();

    expect(mapA.findPhrasesWith()).toEqual([]);
    expect(mapA.findPhrasesWith(phraseA)).toEqual([]);

    expect(mapA.findPhrasesWith(['A'])).toEqual([]);
    expect(mapA.findPhrasesWith(['Abc'])).toEqual([]);
    expect(mapA.findPhrasesWith(['Abcd'])).toEqual([]);

    expect(mapA.findPhrasesWith(['Abc', 'B'])).toEqual([]);
    expect(mapA.findPhrasesWith(['Abc', 'Bcd'])).toEqual([]);

    expect(mapA.findPhrasesWith(['B'])).toEqual([]);


    expect(mapA.set(phraseA, valueA)).toBe(mapA);


    //
    // Multiple entries...
    const phraseB = ['Bcd', 'Abc', 'Bcd', 'Abc', 'Def', ];
    const valueB = 'valueB';
    
    mapA.set(phraseB, valueB);
    expect(mapA.size).toEqual(2);

    expect(mapA.has(phraseA)).toBeTruthy();
    expect(mapA.get(phraseA)).toEqual(valueA);

    expect(mapA.has(phraseB)).toBeTruthy();
    expect(mapA.get(phraseB)).toEqual(valueB);


    const phraseC = ['123', 'Abc', ];
    const valueC = 'ValueC';

    mapA.set(phraseC, valueC);
    expect(mapA.size).toEqual(3);

    expect(mapA.has(phraseC)).toBeTruthy();
    expect(mapA.get(phraseC)).toEqual(valueC);


    let result;
    result = mapA.findPhrasesWith('Abc');
    expect(result.length).toEqual(3);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseA, value: valueA, },
        { phrase: phraseB, value: valueB, },
        { phrase: phraseC, value: valueC, },
    ]));


    result = mapA.findPhrasesWith('Abc Bcd');
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseA, value: valueA, },
        { phrase: phraseB, value: valueB, },
    ]));


    result = mapA.findPhrasesWith(['12']);
    expect(result.length).toEqual(1);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseC, value: valueC, },
    ]));

    result = mapA.findPhrasesWith('Abc Def');
    expect(result.length).toEqual(1);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseB, value: valueB, },
    ]));

    expect(mapA.findPhrasesWith('Abcd')).toEqual([]);


    //
    // Replace a value.
    const valueB1 = 'valueB1';
    expect(mapA.set(phraseB, valueB1)).toBe(mapA);

    result = mapA.findPhrasesWith('Abc Bcd');
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseA, value: valueA, },
        { phrase: phraseB, value: valueB1, },
    ]));


    //
    // Delete a phrase...
    expect(mapA.delete('Abcd')).toBeFalsy();
    expect(mapA.delete(phraseB)).toBeTruthy();

    result = mapA.findPhrasesWith('Abc');
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseA, value: valueA, },
        { phrase: phraseC, value: valueC, },
    ]));

    result = mapA.findPhrasesWith('Abc Bcd');
    expect(result.length).toEqual(1);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: phraseA, value: valueA, },
    ]));

    expect(mapA.findPhrasesWith('Abc Def')).toEqual([]);


    //
    // Test the basic Map stuff...
    result = Array.from(mapA.entries());
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        [ phraseA, valueA, ],
        [ phraseC, valueC, ],
    ]));

    result = Array.from(mapA.keys());
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        phraseA,
        phraseC,
    ]));

    result = Array.from(mapA.values());
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        valueA,
        valueC,
    ]));


    //
    // forEach()
    result = [];
    mapA.forEach((value, phrase) => {
        result.push([phrase, value]);
    });
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        [ phraseA, valueA, ],
        [ phraseC, valueC, ],
    ]));


    //
    // forEach() with thisArg
    result = {
        answer: [],
    };
    
    mapA.forEach(function (value, phrase) {
        this.answer.push([phrase, value]);
    },
    result);
    expect(result.answer.length).toEqual(2);
    expect(result.answer).toEqual(expect.arrayContaining([
        [ phraseA, valueA, ],
        [ phraseC, valueC, ],
    ]));


    //
    // iterator
    result = Array.from(mapA[Symbol.iterator]());
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        [ phraseA, valueA, ],
        [ phraseC, valueC, ],
    ]));

    result = [];
    for (const item of mapA) {
        result.push(item);
    }
    expect(result.length).toEqual(2);
    expect(result).toEqual(expect.arrayContaining([
        [ phraseA, valueA, ],
        [ phraseC, valueC, ],
    ]));


    //
    // And finally...
    mapA.clear();
    expect(mapA.size).toEqual(0);
    expect(mapA.has(phraseA)).toBeFalsy();
});


test('PhraseMap-docTest', () => {
    // Test what's documented for findPhrasesWith().
    // Also test constructor taking an iterator arg.
    const map = new PhraseMap([
        [['The', 'quick'], 'The quick'],
        [['The', 'quickly'], 'The quickly'],
        [['The', 'quick', 'brown'], 'The quick brown'],
        [['Not', 'The', 'quick'], 'Not The quick'],

        [['AThe', 'quick'], 'AThe quick'],
        [['TheA', 'quick'], 'TheA quick'],
        [['The', 'aquick'], 'The aquick'],
        [['The', 'quic'], 'The quic'],
    ]);

    const result = map.findPhrasesWith(['The', 'quick']);
    expect(result.length).toEqual(4);
    expect(result).toEqual(expect.arrayContaining([
        { phrase: ['The', 'quick'], value: 'The quick', },
        { phrase: ['The', 'quickly'], value: 'The quickly', },
        { phrase: ['The', 'quick', 'brown'], value: 'The quick brown', },
        { phrase: ['Not', 'The', 'quick'], value: 'Not The quick', },
    ]));
});