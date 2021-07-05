import { cleanSpaces, buildFromList } from './StringUtils';

test('cleanSpaces', () => {
    expect(cleanSpaces()).toBeUndefined();
    expect(cleanSpaces(' the quick brown fox... ')).toEqual('the quick brown fox...');
    expect(cleanSpaces('the  quick\t \nbrown fox...')).toEqual('the quick\nbrown fox...');
});


test('buildFromList', () => {
    expect(buildFromList(undefined, { opening: 'A', separator: 'B', closing: 'C'}))
        .toEqual('AC');
    expect(buildFromList([], { opening: 'A', separator: 'B', closing: 'C'}))
        .toEqual('AC');
    
    expect(buildFromList(['A'], {})).toEqual('A');
    
    expect(buildFromList(['A', 'B'])).toEqual('A,B');
        
    expect(buildFromList(['A', 'B'], { opening: '[', separator: '; ', closing: ']'}))
        .toEqual('[A; B]');
        
    expect(buildFromList(['A'], { opening: '[', separator: '; ', closing: ']'}))
        .toEqual('[A]');

});