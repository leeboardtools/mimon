import { parseExactInt } from './NumberUtils';

test('parseExactInt', () => {
    expect(parseExactInt(1)).toEqual(1);
    expect(parseExactInt('1')).toEqual(1);
    expect(parseExactInt(-1)).toEqual(-1);
    expect(parseExactInt('-1')).toEqual(-1);

    expect(parseExactInt(' 1 ')).toEqual(1);
    expect(parseExactInt(' 1a ')).toEqual(NaN);
    expect(parseExactInt(' 1 a')).toEqual(NaN);
    expect(parseExactInt('1.')).toEqual(NaN);
    expect(parseExactInt({value: 123})).toEqual(NaN);
});