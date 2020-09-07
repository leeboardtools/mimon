import { cleanSpaces} from './StringUtils';

test('cleanSpaces', () => {
    expect(cleanSpaces()).toBeUndefined();
    expect(cleanSpaces(' the quick brown fox... ')).toEqual('the quick brown fox...');
    expect(cleanSpaces('the  quick\t \nbrown fox...')).toEqual('the quick\nbrown fox...');
});