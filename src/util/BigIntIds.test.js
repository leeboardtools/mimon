import { BigIntIdGenerator } from './BigIntIds';

test('BigIntIdGenerator', () => {

    const genA = new BigIntIdGenerator();
    expect(genA.peekGenerateId()).toEqual(1n.toString());

    const veryBigNumber = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

    genA.fromJSON({
        lastId: veryBigNumber.toString(),
    });
    const jsonString = JSON.stringify(genA);

    expect(genA.peekGenerateId()).toEqual((veryBigNumber + 1n).toString());
    expect(genA.generateId()).toEqual((veryBigNumber + 1n).toString());

    expect(genA.peekGenerateId()).toEqual((veryBigNumber + 2n).toString());

    // Restore via JSON
    const json = JSON.parse(jsonString);
    genA.fromJSON(json);

    expect(genA.peekGenerateId()).toEqual((veryBigNumber + 1n).toString());
    expect(genA.generateId()).toEqual((veryBigNumber + 1n).toString());
    expect(genA.peekGenerateId()).toEqual((veryBigNumber + 2n).toString());
    expect(genA.generateId()).toEqual((veryBigNumber + 2n).toString());


    // Numeric arg for constructor...
    let genB = new BigIntIdGenerator(1);
    expect(genB.peekGenerateId()).toEqual('2');
    expect(genB.generateId()).toEqual('2');
    expect(genB.peekGenerateId()).toEqual('3');


    // String arg for constructor...
    genB = new BigIntIdGenerator(veryBigNumber.toString());
    expect(genB.peekGenerateId()).toEqual((veryBigNumber + 1n).toString());
    expect(genB.generateId()).toEqual((veryBigNumber + 1n).toString());
    expect(genB.peekGenerateId()).toEqual((veryBigNumber + 2n).toString());
    expect(genB.generateId()).toEqual((veryBigNumber + 2n).toString());


    // Options object arg for constructor...
    genB = new BigIntIdGenerator({ lastId: 1, });
    expect(genB.peekGenerateId()).toEqual('2');
    expect(genB.generateId()).toEqual('2');
    expect(genB.peekGenerateId()).toEqual('3');
});