import * as DR from './DateRangePeriod';
import { YMDDate } from './YMDDate';


//
//---------------------------------------------------------
//
test('getPeriodEarliestYMDDate', () => {
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.DAY, '2021-02-03')).toEqual(
        '2021-02-03'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.DAY, '2021-02-03', 4)).toEqual(
        '2021-02-07'
    );


    //
    // Week:

    // 2021-07-11 => Sunday
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-11')).toEqual(
        '2021-07-11'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-11', 0,
        { weekStart: 1, })).toEqual(
        '2021-07-05'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.WEEK, 
        ymdDate: '2021-07-11',
        offset: -3,
    })).toEqual('2021-06-20');

    // 2021-07-06 => Tuesday
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-06')).toEqual(
        '2021-07-04'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 1, })).toEqual(
        '2021-07-05'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 2, })).toEqual(
        '2021-07-06'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 3, })).toEqual(
        '2021-06-30'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.WEEK, 
        ymdDate: '2021-07-06',
        options: { weekStart: 3, },
        offset: 2,
    })).toEqual('2021-07-14');


    //
    // Month:
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.MONTH, '2021-07-01')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.MONTH, '2021-07-02')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.MONTH, '2021-07-31')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.MONTH, '2021-07-02', -13)).toEqual(
        '2020-06-01'
    );

    //
    // keepDOM option
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.MONTH,
        ymdDate: '2021-07-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2021-04-15'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.MONTH,
        ymdDate: '2021-07-31',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2021-04-30'
    );


    //
    // Quarter:
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-01-01')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-03-31')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-04-01')).toEqual(
        '2021-04-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-06-30')).toEqual(
        '2021-04-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-07-01')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-09-30')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-10-01')).toEqual(
        '2021-10-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-12-31')).toEqual(
        '2021-10-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.QUARTER, '2021-10-01', -8)).toEqual(
        '2019-10-01'
    );

    //
    // keepDOM option
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.QUARTER,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-11-15'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.QUARTER,
        ymdDate: '2021-01-31',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-04-30'
    );


    //
    // Half:
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.HALF, '2021-01-01')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.HALF, '2021-06-30')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.HALF, '2021-07-01')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.HALF, '2021-12-31')).toEqual(
        '2021-07-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.HALF, '2021-07-01', -3)).toEqual(
        '2020-01-01'
    );

    //
    // keepDOM option
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.HALF,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-02-15'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.HALF,
        ymdDate: '2020-02-29',
        offset: -2,
        options: { keepDOM: true, },
    })).toEqual(
        '2019-02-28'
    );


    //
    // Year:
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.YEAR, '2021-01-01')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.YEAR, '2021-12-31')).toEqual(
        '2021-01-01'
    );
    expect(DR.getPeriodEarliestYMDDate(DR.PeriodType.YEAR, '2021-12-31', -3)).toEqual(
        '2018-01-01'
    );

    //
    // keepDOM option
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2018-08-15'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2020-02-29',
        offset: -5,
        options: { keepDOM: true, },
    })).toEqual(
        '2015-02-28'
    );
    expect(DR.getPeriodEarliestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2020-02-29',
        offset: -4,
        options: { keepDOM: true, },
    })).toEqual(
        '2016-02-29'
    );
});


//
//---------------------------------------------------------
//
test('getPeriodLatestYMDDate', () => {
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.DAY, '2021-02-03')).toEqual(
        '2021-02-03'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.DAY, '2021-02-03', -4)).toEqual(
        '2021-01-30'
    );


    //
    // Week:

    // 2021-07-11 => Sunday
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-11')).toEqual(
        '2021-07-17'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-11', 0,
        { weekStart: 1, })).toEqual(
        '2021-07-11'
    );

    // 2021-07-06 => Tuesday
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06')).toEqual(
        '2021-07-10'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 1, })).toEqual(
        '2021-07-11'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 2, })).toEqual(
        '2021-07-12'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 3, })).toEqual(
        '2021-07-06'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 0,
        { weekStart: 4, })).toEqual(
        '2021-07-07'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.WEEK, '2021-07-06', 3,
        { weekStart: 4, })).toEqual(
        '2021-07-28'
    );


    //
    // Month:
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-07-01')).toEqual(
        '2021-07-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-07-02')).toEqual(
        '2021-07-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-07-31')).toEqual(
        '2021-07-31'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-07-31', -13)).toEqual(
        '2020-06-30'
    );

    // Leap Year
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2020-02-01')).toEqual(
        '2020-02-29'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2020-02-28')).toEqual(
        '2020-02-29'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2020-02-29')).toEqual(
        '2020-02-29'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2019-02-28', 12)).toEqual(
        '2020-02-29'
    );

    // Non-leap year
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-02-01')).toEqual(
        '2021-02-28'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2021-02-28')).toEqual(
        '2021-02-28'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.MONTH, '2020-02-29', -12)).toEqual(
        '2019-02-28'
    );

    //
    // keepDOM option
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.MONTH,
        ymdDate: '2021-07-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2021-04-15'
    );
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.MONTH,
        ymdDate: '2021-07-31',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2021-04-30'
    );


    //
    // Quarter:
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-01-01')).toEqual(
        '2021-03-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-03-31')).toEqual(
        '2021-03-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-04-01')).toEqual(
        '2021-06-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-06-30')).toEqual(
        '2021-06-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-07-01')).toEqual(
        '2021-09-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-09-30')).toEqual(
        '2021-09-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-10-01')).toEqual(
        '2021-12-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-12-31')).toEqual(
        '2021-12-31'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.QUARTER, '2021-12-31', -7)).toEqual(
        '2020-03-31'
    );

    //
    // keepDOM option
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.QUARTER,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-11-15'
    );
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.QUARTER,
        ymdDate: '2021-01-31',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-04-30'
    );


    //
    // Half:
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2021-01-01')).toEqual(
        '2021-06-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2021-06-30')).toEqual(
        '2021-06-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2021-07-01')).toEqual(
        '2021-12-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2021-12-31')).toEqual(
        '2021-12-31'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2021-07-01', 3)).toEqual(
        '2023-06-30'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.HALF, '2023-06-30', -3)).toEqual(
        '2021-12-31'
    );

    //
    // keepDOM option
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.HALF,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2020-02-15'
    );
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.HALF,
        ymdDate: '2020-02-29',
        offset: -2,
        options: { keepDOM: true, },
    })).toEqual(
        '2019-02-28'
    );


    //
    // Year:
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.YEAR, '2021-01-01')).toEqual(
        '2021-12-31'
    );
    expect(DR.getPeriodLatestYMDDate(DR.PeriodType.YEAR, '2021-12-31')).toEqual(
        '2021-12-31'
    );
    // Offset
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.YEAR, 
        ymdDate: '2021-12-31',
        offset: -10,
    })).toEqual(
        '2011-12-31'
    );

    //
    // keepDOM option
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2021-08-15',
        offset: -3,
        options: { keepDOM: true, },
    })).toEqual(
        '2018-08-15'
    );
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2020-02-29',
        offset: -5,
        options: { keepDOM: true, },
    })).toEqual(
        '2015-02-28'
    );
    expect(DR.getPeriodLatestYMDDate({
        periodType: DR.PeriodType.YEAR,
        ymdDate: '2020-02-29',
        offset: -4,
        options: { keepDOM: true, },
    })).toEqual(
        '2016-02-29'
    );

});


//
//---------------------------------------------------------
//
test('getPeriodYMDDateRange', () => {
    //
    // Day
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.DAY, '2020-02-03')).toEqual({
        earliestYMDDate: '2020-02-03',
        latestYMDDate: '2020-02-03',
    });

    expect(DR.getPeriodYMDDateRange(DR.PeriodType.DAY, new YMDDate('2020-02-03')))
        .toEqual({
            earliestYMDDate: new YMDDate('2020-02-03'),
            latestYMDDate: new YMDDate('2020-02-03'),
        });
    // Offset
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.DAY, '2020-02-03', 4)).toEqual({
        earliestYMDDate: '2020-02-07',
        latestYMDDate: '2020-02-07',
    });
    

    //
    // Week
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.WEEK, '2021-07-12'))
        .toEqual({
            earliestYMDDate: '2021-07-11',
            latestYMDDate: '2021-07-17',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.WEEK, '2021-07-12', 0,
        { weekStart: 1, }))
        .toEqual({
            earliestYMDDate: '2021-07-12',
            latestYMDDate: '2021-07-18',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.WEEK, '2021-07-12', 0,
        { weekStart: 2, }))
        .toEqual({
            earliestYMDDate: '2021-07-06',
            latestYMDDate: '2021-07-12',
        });
    expect(DR.getPeriodYMDDateRange({
        periodType: DR.PeriodType.WEEK, 
        ymdDate: '2021-07-12', 
        options: { weekStart: 3, },
    }))
        .toEqual({
            earliestYMDDate: '2021-07-07',
            latestYMDDate: '2021-07-13',
        });
    // Offset
    expect(DR.getPeriodYMDDateRange({
        periodType: DR.PeriodType.WEEK, 
        ymdDate: '2021-07-12', 
        offset: -2,
        options: { weekStart: 3, },
    }))
        .toEqual({
            earliestYMDDate: '2021-06-23',
            latestYMDDate: '2021-06-29',
        });
    

    //
    // Month
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.MONTH.name, '2020-02-28'))
        .toEqual({
            earliestYMDDate: '2020-02-01',
            latestYMDDate: '2020-02-29',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.MONTH.name, '2020-02-29'))
        .toEqual({
            earliestYMDDate: '2020-02-01',
            latestYMDDate: '2020-02-29',
        });
    // Offset
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.MONTH.name, '2020-02-29', -8 * 12))
        .toEqual({
            earliestYMDDate: '2012-02-01',
            latestYMDDate: '2012-02-29',
        });

    
    //
    // Quarter
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.QUARTER, '2020-01-01'))
        .toEqual({
            earliestYMDDate: '2020-01-01',
            latestYMDDate: '2020-03-31',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.QUARTER, '2020-03-31'))
        .toEqual({
            earliestYMDDate: '2020-01-01',
            latestYMDDate: '2020-03-31',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.QUARTER, '2020-04-01'))
        .toEqual({
            earliestYMDDate: '2020-04-01',
            latestYMDDate: '2020-06-30',
        });
    // Offset
    expect(DR.getPeriodYMDDateRange({
        periodType: DR.PeriodType.QUARTER, 
        ymdDate: '2020-04-01',
        offset: -4,
    }))
        .toEqual({
            earliestYMDDate: '2019-04-01',
            latestYMDDate: '2019-06-30',
        });
    

    //
    // Half
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.HALF, '2021-06-30'))
        .toEqual({
            earliestYMDDate: '2021-01-01',
            latestYMDDate: '2021-06-30',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.HALF, '2021-07-01'))
        .toEqual({
            earliestYMDDate: '2021-07-01',
            latestYMDDate: '2021-12-31',
        });
    // Offset
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.HALF, '2021-07-01', 1))
        .toEqual({
            earliestYMDDate: '2022-01-01',
            latestYMDDate: '2022-06-30',
        });
    
    
    //
    // Year
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.YEAR, '2020-12-31'))
        .toEqual({
            earliestYMDDate: '2020-01-01',
            latestYMDDate: '2020-12-31',
        });
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.YEAR, '2021-01-01'))
        .toEqual({
            earliestYMDDate: '2021-01-01',
            latestYMDDate: '2021-12-31',
        });
    // Offset
    expect(DR.getPeriodYMDDateRange(DR.PeriodType.YEAR.name, '2020-02-29', -8))
        .toEqual({
            earliestYMDDate: '2012-01-01',
            latestYMDDate: '2012-12-31',
        });
});