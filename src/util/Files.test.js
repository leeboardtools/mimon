import * as F from './Files';

test('makeValidFileName', () => {
    expect(F.makeValidFileName()).toBeUndefined();
    expect(F.makeValidFileName('A')).toEqual('A');
    expect(F.makeValidFileName('/A')).toEqual('_A');
    expect(F.makeValidFileName('?A*', '-')).toEqual('-A-');
});