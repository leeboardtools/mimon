import { encloseInQuotes, makeValidCell, stringTableToCSV,
} from './CSVUtils';

test('encloseInQuotes', () => {
    expect(encloseInQuotes()).toEqual('""');
    expect(encloseInQuotes('')).toEqual('""');
    expect(encloseInQuotes('A')).toEqual('"A"');
    expect(encloseInQuotes('A"B')).toEqual('"A""B"');
    expect(encloseInQuotes('"A"B"')).toEqual('"""A""B"""');
    expect(encloseInQuotes('A""B')).toEqual('"A""""B"');
    expect(encloseInQuotes('""A""B""')).toEqual('"""""A""""B"""""');
});


test('makeValidCell', () => {
    expect(makeValidCell()).toEqual('');
    expect(makeValidCell('')).toEqual('');
    expect(makeValidCell(',')).toEqual('","');
    expect(makeValidCell('A,b\nC"d')).toEqual('"A,b\nC""d"');

    expect(makeValidCell('"Abc"')).toEqual('"Abc"');

    // Check for properly escaped inner quotes.
    expect(makeValidCell('"A"bc"')).toEqual('"""A""bc"""');
    expect(makeValidCell('"A""bc"')).toEqual('"A""bc"');
    expect(makeValidCell('"A""bc"""')).toEqual('"A""bc"""');

    expect(makeValidCell('"""A""bc"')).toEqual('"""A""bc"');

    // Escaping beginning or end quote not valid...
    expect(makeValidCell('""A""bc"')).toEqual('"""""A""""bc"""');
    expect(makeValidCell('"A""bc""')).toEqual('"""A""""bc"""""');
});


test('stringTableToCSV', () => {
    let result = '';
    stringTableToCSV([
        ['Abc', undefined, 'Def,Ghi'],
        [],
        ['"Jkl"', ],
    ],
    (text) => result += text);
    expect(result).toEqual('Abc,,"Def,Ghi"\n\n"Jkl"\n');

    // No stream, should generate a string.
    result = stringTableToCSV([
        ['Abc', undefined, 'Def,Ghi'],
        [],
        ['"Jkl"', ],
    ]);
    expect(result).toEqual('Abc,,"Def,Ghi"\n\n"Jkl"\n');
});