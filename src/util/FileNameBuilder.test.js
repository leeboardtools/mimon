import { FileNameBuilder } from './FileNameBuilder';


test('FileNameBuilder', () => {
    const builderA = new FileNameBuilder({
        prefix: 'A',
        suffix: 'b',
        ext: 'C',
    });

    expect(builderA.buildFileName('123')).toEqual('A123b.C');
    expect(builderA.parseFileName('A123b.C')).toEqual('123');
    expect(builderA.parseFileName('123b.C')).toBeUndefined();
    expect(builderA.parseFileName('A123.C')).toBeUndefined();
    expect(builderA.parseFileName('A123b')).toBeUndefined();

    const builderB = new FileNameBuilder({
        ext: '.EXT'
    });
    expect(builderB.buildFileName('123')).toEqual('123.EXT');
    expect(builderB.parseFileName('123.EXT')).toEqual('123');

    const builderC = new FileNameBuilder({
        suffix: 'XYZ'
    });
    expect(builderC.buildFileName('123XYZ')).toEqual('123XYZXYZ');
    expect(builderC.parseFileName('123XYZXYZ')).toEqual('123XYZ');
});
