import { RingBuffer } from './RingBuffer';

test('RingBuffer', () => {
    let test = [];

    const buffer = new RingBuffer(3);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.elementCount()).toEqual(0);
    expect(buffer.indexOf(1)).toEqual(-1);
    expect(Array.from(buffer)).toEqual([]);
    // first: 0
    // next: 0

    buffer.push(1234);
    // first: 0
    // next: 1
    expect(buffer.elementCount()).toEqual(1);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual(1234);
    expect(buffer.at(-1)).toEqual(1234);
    expect(buffer.at(-2)).toBeUndefined();
    expect(buffer.indexOf(1234)).toEqual(0);
    expect(Array.from(buffer)).toEqual([
        1234,
    ]);


    buffer.push('abc');
    // first: 0
    // next: 2
    expect(buffer.elementCount()).toEqual(2);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual(1234);
    expect(buffer.at(1)).toEqual('abc');
    expect(buffer.at(2)).toBeUndefined();
    expect(buffer.at(-1)).toEqual('abc');
    expect(buffer.at(-2)).toEqual(1234);
    expect(buffer.at(-3)).toBeUndefined();
    expect(buffer.indexOf(1234)).toEqual(0);
    expect(buffer.indexOf('abc')).toEqual(1);
    expect(Array.from(buffer)).toEqual([
        1234,
        'abc',
    ]);

    test = [];
    buffer.forEach((value, index) => {
        test[buffer.elementCount() - 1 - index] = value;
    });
    expect(test).toEqual([
        'abc',
        1234,
    ]);


    buffer.push('def');
    // first: 0
    // next: 0
    expect(buffer.elementCount()).toEqual(3);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual(1234);
    expect(buffer.at(1)).toEqual('abc');
    expect(buffer.at(2)).toEqual('def');
    expect(buffer.at(3)).toBeUndefined();
    expect(buffer.at(-1)).toEqual('def');
    expect(buffer.at(-2)).toEqual('abc');
    expect(buffer.at(-3)).toEqual(1234);
    expect(buffer.at(-4)).toBeUndefined();
    expect(buffer.indexOf(1234)).toEqual(0);
    expect(buffer.indexOf('abc')).toEqual(1);
    expect(buffer.indexOf('def')).toEqual(2);
    expect(buffer.indexOf('zzz')).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
        1234,
        'abc',
        'def',
    ]);


    buffer.push(987);
    // first: 1
    // next: 1
    expect(buffer.elementCount()).toEqual(3);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual('abc');
    expect(buffer.at(1)).toEqual('def');
    expect(buffer.at(2)).toEqual(987);
    expect(buffer.at(-1)).toEqual(987);
    expect(buffer.at(-2)).toEqual('def');
    expect(buffer.at(-3)).toEqual('abc');
    expect(buffer.at(-4)).toBeUndefined();
    expect(buffer.indexOf(1234)).toEqual(-1);
    expect(buffer.indexOf('abc')).toEqual(0);
    expect(buffer.indexOf('def')).toEqual(1);
    expect(buffer.indexOf(987)).toEqual(2);
    expect(buffer.indexOf('zzz')).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
        'abc',
        'def',
        987,
    ]);


    buffer.push(-111);
    // first: 2
    // next: 2
    expect(buffer.elementCount()).toEqual(3);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual('def');
    expect(buffer.at(1)).toEqual(987);
    expect(buffer.at(2)).toEqual(-111);
    expect(buffer.at(-1)).toEqual(-111);
    expect(buffer.at(-2)).toEqual(987);
    expect(buffer.at(-3)).toEqual('def');
    expect(buffer.at(-4)).toBeUndefined();
    expect(buffer.indexOf('abc')).toEqual(-1);
    expect(buffer.indexOf('def')).toEqual(0);
    expect(buffer.indexOf(987)).toEqual(1);
    expect(buffer.indexOf(-111)).toEqual(2);
    expect(buffer.indexOf('zzz')).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
        'def',
        987,
        -111,
    ]);

    
    test = [];
    let testBuffer;
    buffer.forEach((value, index, buffer) => {
        test[2 - index] = value;
        testBuffer = buffer;
    });
    expect(test).toEqual([
        -111,
        987,
        'def',
    ]);
    expect(testBuffer).toEqual(buffer);

    test = {
        values: [],
        abc: function (value, index) {
            this.values[index] = value;
        }
    };

    buffer.forEach(test.abc, test);
    expect(test.values).toEqual([
        'def',
        987,
        -111,
    ]);


    expect(buffer.popOldest()).toEqual('def');
    expect(buffer.elementCount()).toEqual(2);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual(987);
    expect(buffer.at(1)).toEqual(-111);
    expect(buffer.at(2)).toBeUndefined();
    expect(buffer.at(-1)).toEqual(-111);
    expect(buffer.at(-2)).toEqual(987);
    expect(buffer.at(-3)).toBeUndefined();
    expect(buffer.indexOf('abc')).toEqual(-1);
    expect(buffer.indexOf('def')).toEqual(-1);
    expect(buffer.indexOf(987)).toEqual(0);
    expect(buffer.indexOf(-111)).toEqual(1);
    expect(buffer.indexOf('zzz')).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
        987,
        -111,
    ]);
    expect(Array.from(buffer.values())).toEqual([
        987,
        -111,
    ]);


    expect(buffer.popOldest()).toEqual(987);
    expect(buffer.elementCount()).toEqual(1);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toEqual(-111);
    expect(buffer.at(1)).toBeUndefined();
    expect(buffer.at(-1)).toEqual(-111);
    expect(buffer.at(-2)).toBeUndefined();
    expect(buffer.indexOf(987)).toEqual(-1);
    expect(buffer.indexOf(-111)).toEqual(0);
    expect(buffer.indexOf('zzz')).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
        -111,
    ]);


    expect(buffer.popOldest()).toEqual(-111);
    expect(buffer.elementCount()).toEqual(0);
    expect(buffer.bufferSize()).toEqual(3);
    expect(buffer.at(0)).toBeUndefined();
    expect(buffer.indexOf(-111)).toEqual(-1);
    expect(Array.from(buffer)).toEqual([
    ]);

});


test('RingBuffer-lastIndexOf', () => {
    const buffer = new RingBuffer([1, 2, 3, 1, 2, 3, 1, 2, 3]);
    expect(buffer.bufferSize()).toEqual(9);
    expect(buffer.elementCount()).toEqual(9);
    expect(Array.from(buffer)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);

    // firstIndex: 0
    // nextIndex: 0
    expect(buffer.lastIndexOf(3)).toEqual(8);
    expect(buffer.lastIndexOf(2)).toEqual(7);
    expect(buffer.lastIndexOf(3, 7)).toEqual(5);

    buffer.push(11);
    buffer.push(12);
    buffer.push(13);
    // firstIndex: 3
    // nextIndex: 3
    // Now have: [1, 2, 3, 1, 2, 3, 11, 12, 13]
    // buffer:   [11, 12, 13, 1, 2, 3, 1, 2, 3]
    expect(buffer.lastIndexOf(13)).toEqual(8);
    expect(buffer.lastIndexOf(11)).toEqual(6);
    expect(buffer.lastIndexOf(3)).toEqual(5);
    expect(buffer.lastIndexOf(2, 3)).toEqual(1);

    buffer.popOldest();
    // Now have: [2, 3, 1, 2, 3, 11, 12, 13]
    expect(buffer.lastIndexOf(13)).toEqual(7);
    expect(buffer.lastIndexOf(11)).toEqual(5);
    expect(buffer.lastIndexOf(3)).toEqual(4);
    expect(buffer.lastIndexOf(2, 3)).toEqual(3);
    expect(buffer.lastIndexOf(2, 2)).toEqual(0);

    expect(buffer.popNewest()).toEqual(13);
    // Now have: [2, 3, 1, 2, 3, 11, 12]
    expect(Array.from(buffer)).toEqual([2, 3, 1, 2, 3, 11, 12]);
    expect(buffer.lastIndexOf(13)).toEqual(-1);
    expect(buffer.lastIndexOf(12)).toEqual(6);
    expect(buffer.lastIndexOf(3, 1)).toEqual(1);

    expect(buffer.popNewest()).toEqual(12);
    expect(Array.from(buffer)).toEqual([2, 3, 1, 2, 3, 11, ]);

    expect(buffer.popNewest()).toEqual(11);
    expect(Array.from(buffer)).toEqual([2, 3, 1, 2, 3, ]);

    buffer.push(1);
    expect(Array.from(buffer)).toEqual([2, 3, 1, 2, 3, 1, ]);

    expect(buffer.popNewest()).toEqual(1);
    expect(buffer.popNewest()).toEqual(3);
    expect(buffer.popNewest()).toEqual(2);
    expect(buffer.popNewest()).toEqual(1);
    expect(Array.from(buffer)).toEqual([2, 3, ]);

    expect(buffer.popNewest()).toEqual(3);
    expect(buffer.elementCount()).toEqual(1);

    expect(buffer.popNewest()).toEqual(2);
    expect(buffer.popNewest()).toBeUndefined();
    expect(buffer.elementCount()).toEqual(0);
});