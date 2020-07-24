import { bSearchNumberArray, bSearch } from './BinarySearch';

test('bSearchNumberArray', () => {
    expect(bSearchNumberArray([-10, 0, 10], -11)).toEqual(-1);
    expect(bSearchNumberArray([-10, 0, 10], -10)).toEqual(0);
    expect(bSearchNumberArray([-10, 0, 10], -9)).toEqual(0);
    expect(bSearchNumberArray([-10, 0, 10], -1)).toEqual(0);
    expect(bSearchNumberArray([-10, 0, 10], 0)).toEqual(1);
    expect(bSearchNumberArray([-10, 0, 10], 1)).toEqual(1);
    expect(bSearchNumberArray([-10, 0, 10], 9)).toEqual(1);
    expect(bSearchNumberArray([-10, 0, 10], 10)).toEqual(2);
    expect(bSearchNumberArray([-10, 0, 10], 11)).toEqual(2);

    expect(bSearchNumberArray([10], 9)).toEqual(-1);
    expect(bSearchNumberArray([10], 10)).toEqual(0);
    expect(bSearchNumberArray([10], 11)).toEqual(0);

    expect(bSearchNumberArray([-10, 0], -11)).toEqual(-1);
    expect(bSearchNumberArray([-10, 0], -10)).toEqual(0);
    expect(bSearchNumberArray([-10, 0], -9)).toEqual(0);
    expect(bSearchNumberArray([-10, 0], -1)).toEqual(0);
    expect(bSearchNumberArray([-10, 0], 0)).toEqual(1);
    expect(bSearchNumberArray([-10, 0], 1)).toEqual(1);

    expect(bSearchNumberArray([10, 10, 20], 9)).toEqual(-1);
    expect(bSearchNumberArray([10, 10, 20], 10)).toEqual(0);
    expect(bSearchNumberArray([10, 10, 20], 11)).toEqual(0);
    expect(bSearchNumberArray([10, 10, 20], 19)).toEqual(0);
    expect(bSearchNumberArray([10, 10, 20], 20)).toEqual(2);
    expect(bSearchNumberArray([10, 10, 20], 21)).toEqual(2);

    expect(bSearchNumberArray([-10, 0, 10, 10, 20], -11)).toEqual(-1);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], -10)).toEqual(0);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], -9)).toEqual(0);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 0)).toEqual(1);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 9)).toEqual(1);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 10)).toEqual(2);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 11)).toEqual(2);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 20)).toEqual(4);
    expect(bSearchNumberArray([-10, 0, 10, 10, 20], 21)).toEqual(4);
});


function stringCompare(value, arrayValue, array, index) {
    return value.localeCompare(arrayValue);
}

test('bSearchCompare', () => {
    const arrayA = ['K', 'M', 'M', 'MQ', 'P'];
    expect(bSearch(arrayA, 'J', stringCompare)).toEqual(-1);
    expect(bSearch(arrayA, 'K', stringCompare)).toEqual(0);
    expect(bSearch(arrayA, 'L', stringCompare)).toEqual(0);
    expect(bSearch(arrayA, 'M', stringCompare)).toEqual(1);
    expect(bSearch(arrayA, 'MA', stringCompare)).toEqual(1);
    expect(bSearch(arrayA, 'MQ', stringCompare)).toEqual(3);
    expect(bSearch(arrayA, 'MR', stringCompare)).toEqual(3);
    expect(bSearch(arrayA, 'P', stringCompare)).toEqual(4);
    expect(bSearch(arrayA, 'Q', stringCompare)).toEqual(4);

    const arrayB = ['K', 'M'];
    expect(bSearch(arrayB, 'K', stringCompare)).toEqual(0);
    expect(bSearch(arrayB, 'M', stringCompare)).toEqual(1);
    expect(bSearch(arrayB, 'N', stringCompare)).toEqual(1);
});
