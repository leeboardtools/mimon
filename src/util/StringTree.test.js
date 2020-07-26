import { StringTree } from './StringTree';

test('StringTree', () => {
    const tree = new StringTree();
    expect(tree.size).toEqual(0);
    expect(tree.get('abc')).toBeUndefined();
    expect(tree.has('abc')).toBeFalsy();
    expect(Array.from(tree.keys())).toEqual([]);
    expect(Array.from(tree.values())).toEqual([]);
    expect(Array.from(tree.entries())).toEqual([]);

    // Simple root tests...
    expect(tree.set('', 123)).toEqual(tree);
    expect(tree.size).toEqual(1);
    expect(tree.get('')).toEqual(123);
    expect(tree.has('')).toBeTruthy();

    expect(Array.from(tree.keys())).toEqual(['']);
    expect(Array.from(tree.values())).toEqual([123]);
    expect(Array.from(tree.entries())).toEqual([['', 123]]);

    expect(tree.set('', undefined)).toEqual(tree);
    expect(tree.size).toEqual(1);
    expect(tree.get('')).toEqual(undefined);
    expect(tree.has('')).toBeTruthy();

    expect(tree.delete('abc')).toBeFalsy();
    expect(tree.size).toEqual(1);

    expect(tree.delete('')).toBeTruthy();
    expect(tree.size).toEqual(0);
    expect(tree.has('')).toBeFalsy();

    expect(tree.set('m', 2)).toEqual(tree);
    expect(tree.size).toEqual(1);
    expect(tree.get('m')).toEqual(2);
    expect(tree.has('m')).toBeTruthy();

    expect(tree.set('mno', undefined)).toEqual(tree);
    expect(tree.size).toEqual(2);
    expect(tree.get('mno')).toEqual(undefined);
    expect(tree.has('mno')).toBeTruthy();

    expect(tree.get('m')).toEqual(2);

    expect(tree.set('mnop', 'zzz')).toEqual(tree);
    expect(tree.size).toEqual(3);
    expect(tree.get('mnop')).toEqual('zzz');
    expect(tree.has('mnop')).toBeTruthy();

    expect(tree.set('mnkp', 3)).toEqual(tree);
    expect(tree.size).toEqual(4);
    expect(tree.get('mnkp')).toEqual(3);
    expect(tree.has('mnkp')).toBeTruthy();

    expect(tree.set('jkl', 4)).toEqual(tree);
    expect(tree.size).toEqual(5);
    expect(tree.get('jkl')).toEqual(4);
    expect(tree.has('jkl')).toBeTruthy();

    expect(tree.set('jkl', 5)).toEqual(tree);
    expect(tree.size).toEqual(5);
    expect(tree.get('jkl')).toEqual(5);
    expect(tree.has('jkl')).toBeTruthy();

    expect(tree.set('mnos', 60)).toEqual(tree);
    expect(tree.size).toEqual(6);
    expect(tree.get('mnos')).toEqual(60);
    expect(tree.has('mnos')).toBeTruthy();

    // Tree is now:
    //  -j
    //      -k
    //          -l (5)
    //  -m (2)
    //      -n
    //          -k
    //              -p (3)
    //          -o (undefined)
    //              -p ('zzz')
    //              -s (60)
    let result = tree.getNodePath('mno');
    let { nodePath } = result;
    expect(result.isPartial).toBeFalsy();
    expect(nodePath.length).toEqual(3);
    expect(nodePath[0].parentNode.key).toEqual(''); // root
    expect(nodePath[0].childIndex).toEqual(1);

    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);


    result = tree.getNodePath('mnop');
    expect(result.isPartial).toBeFalsy();
    nodePath = result.nodePath;
    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);

    expect(nodePath[3].parentNode.key).toEqual('mno');
    expect(nodePath[3].childIndex).toEqual(0);


    result = tree.getNodePath('mnoq');
    expect(result.isPartial).toBeTruthy();
    nodePath = result.nodePath;
    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);

    expect(nodePath[3].parentNode.key).toEqual('mno');
    expect(nodePath[3].childIndex).toEqual(0);


    result = tree.getNodePath('mnoo');
    expect(result.isPartial).toBeTruthy();
    nodePath = result.nodePath;
    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);

    expect(nodePath[3].parentNode.key).toEqual('mno');
    expect(nodePath[3].childIndex).toEqual(-1);


    result = tree.getNodePath('mnos');
    expect(result.isPartial).toBeFalsy();
    nodePath = result.nodePath;
    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);

    expect(nodePath[3].parentNode.key).toEqual('mno');
    expect(nodePath[3].childIndex).toEqual(1);


    result = tree.getNodePath('mnot');
    expect(result.isPartial).toBeTruthy();
    nodePath = result.nodePath;
    expect(nodePath[1].parentNode.key).toEqual('m');
    expect(nodePath[1].childIndex).toEqual(0);

    expect(nodePath[2].parentNode.key).toEqual('mn');
    expect(nodePath[2].childIndex).toEqual(1);

    expect(nodePath[3].parentNode.key).toEqual('mno');
    expect(nodePath[3].childIndex).toEqual(1);


    // Tree is now:
    //  -j
    //      -k
    //          -l (5)
    //  -m (2)
    //      -n
    //          -k
    //              -p (3)
    //          -o (undefined)
    //              -p ('zzz')
    //              -s (60)
    expect(tree.delete('mn')).toBeFalsy();
    expect(tree.size).toEqual(6);

    expect(tree.delete('m')).toBeTruthy();
    expect(tree.size).toEqual(5);
    expect(tree.get('m')).toBeUndefined();
    expect(tree.get('jkl')).toEqual(5);
    expect(tree.get('mnkp')).toEqual(3);
    expect(tree.get('mnop')).toEqual('zzz');
    expect(tree.get('mnos')).toEqual(60);

    expect(tree.delete('m')).toBeFalsy();

    expect(tree.delete('jkl')).toBeTruthy();
    expect(tree.size).toEqual(4);
    expect(tree.get('jkl')).toBeUndefined();
    expect(tree.get('mnkp')).toEqual(3);
    expect(tree.get('mnop')).toEqual('zzz');
    expect(tree.get('mnos')).toEqual(60);

    // Tree is now:
    //  -m
    //      -n
    //          -k
    //              -p (3)
    //          -o (undefined)
    //              -p ('zzz')
    //              -s (60)
    expect(Array.from(tree.keys())).toEqual(['mnkp', 'mno', 'mnop', 'mnos']);
    expect(Array.from(tree.values())).toEqual([3, undefined, 'zzz', 60]);
    expect(Array.from(tree.entries())).toEqual([
        ['mnkp', 3], 
        ['mno', undefined],
        ['mnop', 'zzz'],
        ['mnos', 60]]);
});
