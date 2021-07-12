import * as DR from './YMDDateRange';
import { YMDDate } from './YMDDate';


//
//---------------------------------------------------------
//
test('isYMDDateInRange', () => {
    let result;

    const rangeA = {
        earliestYMDDate: new YMDDate('2020-02-27'),
        latestYMDDate: new YMDDate('2020-03-01'),
    };
    // Already YMDDateRange, no copy
    expect(DR.getYMDDateRange(rangeA)).toBe(rangeA);

    // Always copy
    result = DR.getYMDDateRange(rangeA, true);
    expect(result).toEqual(rangeA);
    expect(result).not.toBe(rangeA);


    const rangeADataItem = {
        earliestYMDDate: '2020-02-27',
        latestYMDDate: '2020-03-01',
    };

    // Already YMDDateRangeDataItem, no copy
    expect(DR.getYMDDateRangeDataItem(rangeADataItem)).toBe(rangeADataItem);

    // Always copy
    result = DR.getYMDDateRangeDataItem(rangeADataItem, true);
    expect(result).toEqual(rangeADataItem);
    expect(result).not.toBe(rangeADataItem);

    expect(DR.getYMDDateRangeDataItem(rangeA)).toEqual(rangeADataItem);
    expect(DR.getYMDDateRange(rangeADataItem)).toEqual(rangeA);


    expect(DR.isYMDDateInRange(rangeA, '2020-02-26')).toBeFalsy();
    expect(DR.isYMDDateInRange(rangeA, '2020-02-27')).toBeTruthy();
    expect(DR.isYMDDateInRange(rangeADataItem, '2020-02-29')).toBeTruthy();
    expect(DR.isYMDDateInRange(rangeA, '2020-03-01')).toBeTruthy();
    expect(DR.isYMDDateInRange(rangeA, '2020-03-02')).toBeFalsy();


    //
    // No earliest.
    const noEarliestRange = {
        latestYMDDate: '2020-02-29',
    };
    expect(DR.isYMDDateInRange(noEarliestRange, '1900-01-01')).toBeTruthy();
    expect(DR.isYMDDateInRange(noEarliestRange, '2020-02-29')).toBeTruthy();
    expect(DR.isYMDDateInRange(noEarliestRange, '2020-03-01')).toBeFalsy();


    //
    // No latest.
    const noLatestRange = {
        earliestYMDDate: '2020-02-29',
    };
    expect(DR.isYMDDateInRange(noLatestRange, '1900-01-01')).toBeFalsy();
    expect(DR.isYMDDateInRange(noLatestRange, '2020-02-29')).toBeTruthy();
    expect(DR.isYMDDateInRange(noLatestRange, '2020-03-01')).toBeTruthy();
    expect(DR.isYMDDateInRange(noLatestRange, '2900-01-01')).toBeTruthy();


    //
    // No earliest nor latest.
    expect(DR.isYMDDateInRange({}, '1900-01-01')).toBeTruthy();
    expect(DR.isYMDDateInRange({}, '2900-01-01')).toBeTruthy();
});


//
//---------------------------------------------------------
//
test('makeValidYMDDateRange', () => {
    // No args
    expect(DR.makeValidYMDDateRangeDataItem()).toEqual({});

    // Single arg
    expect(DR.makeValidYMDDateRangeDataItem('2020-02-02')).toEqual({
        earliestYMDDate: '2020-02-02',
        latestYMDDate: '2020-02-02',
    });


    // Single invalid arg.
    expect(DR.makeValidYMDDateRangeDataItem('2020-02-abc')).toEqual({
    });

    //
    // Two dates
    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-02-02', '2020-02-02',
    )).toEqual({
        earliestYMDDate: '2020-02-02',
        latestYMDDate: '2020-02-02',
    });

    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-02-02', '2020-02-03',
    )).toEqual({
        earliestYMDDate: '2020-02-02',
        latestYMDDate: '2020-02-03',
    });

    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-02-03', '2020-02-02',
    )).toEqual({
        earliestYMDDate: '2020-02-02',
        latestYMDDate: '2020-02-03',
    });


    // Undefined
    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-02-02', undefined,
    )).toEqual({
        earliestYMDDate: '2020-02-02',
    });

    expect(DR.makeValidYMDDateRangeDataItem(
        undefined, '2020-02-02',
    )).toEqual({
        latestYMDDate: '2020-02-02',
    });



    // Invalid
    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-02-02', '2020-03-abc',
    )).toEqual({
        earliestYMDDate: '2020-02-02',
    });

    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-03-abc', '2020-02-02',
    )).toEqual({
        latestYMDDate: '2020-02-02',
    });

    expect(DR.makeValidYMDDateRangeDataItem(
        '2020-03-abc', '2020-02-def',
    )).toEqual({
    });


});
