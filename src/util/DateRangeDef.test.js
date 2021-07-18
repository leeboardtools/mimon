import { resolveDateRange, StandardRangeType } from './DateRangeDef';
import { YMDDate } from './YMDDate';



//
//---------------------------------------------------------
//
test('resolveRange-simple', () => {
    //
    // ALL
    expect(resolveDateRange({
        rangeType: StandardRangeType.ALL,
    })).toEqual({});


    //
    // CUSTOM
    expect(resolveDateRange({
        rangeType: StandardRangeType.CUSTOM,
        firstYMDDate: '2020-01-23',
    })).toEqual({
        earliestYMDDate: new YMDDate('2020-01-23'),
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CUSTOM,
        lastYMDDate: '2020-01-23',
    })).toEqual({
        latestYMDDate: new YMDDate('2020-01-23'),
    });

    // ymdDate is a string, should return a YMDDateRangeDataItem
    expect(resolveDateRange(
        {
            rangeType: StandardRangeType.CUSTOM,
            firstYMDDate: '2021-02-12',
            lastYMDDate: '2020-01-23',
        },
        '',
    )).toEqual({
        earliestYMDDate: '2020-01-23',
        latestYMDDate: '2021-02-12',
    });
});


//
//---------------------------------------------------------
//
test('resolveRange-CURRENT', () => {
    //
    // CURRENT_WEEK
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_WEEK.name,
        ymdDate: '2021-07-14',
    })).toEqual({
        earliestYMDDate: '2021-07-11',
        latestYMDDate: '2021-07-17',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_WEEK,
        ymdDate: '2021-07-14',
        options: { weekStart: 3, },
    })).toEqual({
        earliestYMDDate: '2021-07-14',
        latestYMDDate: '2021-07-20',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_WEEK.name,
        ymdDate: '2021-07-14',
        options: { weekStart: 4, },
    })).toEqual({
        earliestYMDDate: '2021-07-08',
        latestYMDDate: '2021-07-14',
    });


    //
    // CURRENT_MONTH
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_MONTH,
        ymdDate: '2021-07-14',
    })).toEqual({
        earliestYMDDate: '2021-07-01',
        latestYMDDate: '2021-07-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_MONTH,
        ymdDate: '2020-02-14',
    })).toEqual({
        earliestYMDDate: '2020-02-01',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_MONTH,
        ymdDate: '2021-02-14',
    })).toEqual({
        earliestYMDDate: '2021-02-01',
        latestYMDDate: '2021-02-28',
    });


    //
    // CURRENT_QUARTER
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-03-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-04-01',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-09-30',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-10-01',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_QUARTER,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });


    //
    // CURRENT_HALF
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2019-12-31',
    })).toEqual({
        earliestYMDDate: '2019-07-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_HALF,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-06-30',
    });


    //
    // CURRENT_YEAR
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_YEAR,
        ymdDate: '2019-12-31',
    })).toEqual({
        earliestYMDDate: '2019-01-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_YEAR,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_YEAR,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.CURRENT_YEAR,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-12-31',
    });

});



//
//---------------------------------------------------------
//
test('resolveRange-PRECEDING', () => {
    //
    // PRECEDING_WEEK
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_WEEK.name,
        ymdDate: '2021-07-14',
    })).toEqual({
        earliestYMDDate: '2021-07-04',
        latestYMDDate: '2021-07-10',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_WEEK,
        ymdDate: '2021-07-14',
        options: { weekStart: 3, },
    })).toEqual({
        earliestYMDDate: '2021-07-07',
        latestYMDDate: '2021-07-13',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_WEEK.name,
        ymdDate: '2021-07-14',
        options: { weekStart: 4, },
    })).toEqual({
        earliestYMDDate: '2021-07-01',
        latestYMDDate: '2021-07-07',
    });


    //
    // PRECEDING_MONTH
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_MONTH,
        ymdDate: '2021-07-14',
    })).toEqual({
        earliestYMDDate: '2021-06-01',
        latestYMDDate: '2021-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_MONTH,
        ymdDate: '2020-02-14',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-01-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_MONTH,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-02-01',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_MONTH,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-01-31',
    });


    //
    // PRECEDING_QUARTER
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-04-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-09-30',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-10-01',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_QUARTER,
        ymdDate: '2021-03-31',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });


    //
    // PRECEDING_HALF
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2019-07-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2021-06-30',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_HALF,
        ymdDate: '2021-07-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-06-30',
    });


    //
    // PRECEDING_YEAR
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_YEAR,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2019-01-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_YEAR,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_YEAR,
        ymdDate: '2021-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.PRECEDING_YEAR,
        ymdDate: '2022-01-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-12-31',
    });

});


//
//---------------------------------------------------------
//
test('resolveRange-FOLLOWING', () => {
    //
    // FOLLOWING_WEEK
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_WEEK.name,
        ymdDate: '2021-07-07',
    })).toEqual({
        earliestYMDDate: '2021-07-11',
        latestYMDDate: '2021-07-17',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_WEEK,
        ymdDate: '2021-07-07',
        options: { weekStart: 3, },
    })).toEqual({
        earliestYMDDate: '2021-07-14',
        latestYMDDate: '2021-07-20',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_WEEK.name,
        ymdDate: '2021-07-07',
        options: { weekStart: 4, },
    })).toEqual({
        earliestYMDDate: '2021-07-08',
        latestYMDDate: '2021-07-14',
    });


    //
    // FOLLOWING_MONTH
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_MONTH,
        ymdDate: '2021-06-30',
    })).toEqual({
        earliestYMDDate: '2021-07-01',
        latestYMDDate: '2021-07-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_MONTH,
        ymdDate: '2020-01-31',
    })).toEqual({
        earliestYMDDate: '2020-02-01',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_MONTH,
        ymdDate: '2021-01-01',
    })).toEqual({
        earliestYMDDate: '2021-02-01',
        latestYMDDate: '2021-02-28',
    });


    //
    // FOLLOWING_QUARTER
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2019-10-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2019-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-03-31',
    })).toEqual({
        earliestYMDDate: '2020-04-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-04-01',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_QUARTER,
        ymdDate: '2020-09-30',
    })).toEqual({
        earliestYMDDate: '2020-10-01',
        latestYMDDate: '2020-12-31',
    });


    //
    // FOLLOWING_HALF
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2019-06-30',
    })).toEqual({
        earliestYMDDate: '2019-07-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2019-07-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2019-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2020-06-30',
    })).toEqual({
        earliestYMDDate: '2020-07-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_HALF,
        ymdDate: '2020-07-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-06-30',
    });


    //
    // FOLLOWING_YEAR
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_YEAR,
        ymdDate: '2018-12-31',
    })).toEqual({
        earliestYMDDate: '2019-01-01',
        latestYMDDate: '2019-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_YEAR,
        ymdDate: '2019-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_YEAR,
        ymdDate: '2019-12-31',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.FOLLOWING_YEAR,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-12-31',
    });

});


//
//---------------------------------------------------------
//
test('resolveRange-LAST', () => {
    //
    // LAST_DAYS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_7,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-02-24',
        latestYMDDate: '2020-03-01',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_7,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-23',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_30,
        ymdDate: '2021-03-31',
    })).toEqual({
        earliestYMDDate: '2021-03-02',
        latestYMDDate: '2021-03-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_60,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2021-01-01',
        latestYMDDate: '2021-03-01',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_90,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2020-12-02',
        latestYMDDate: '2021-03-01',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_DAYS_180,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2020-09-03',
        latestYMDDate: '2021-03-01',
    });


    //
    // LAST_WEEKS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_WEEKS_2,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-02-17',
        latestYMDDate: '2020-03-01',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_WEEKS_4,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-02-03',
        latestYMDDate: '2020-03-01',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_WEEKS_8,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-01-06',
        latestYMDDate: '2020-03-01',
    });



    //
    // LAST_MONTHS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_MONTHS_3,
        ymdDate: '2020-12-15',
    })).toEqual({
        earliestYMDDate: '2020-09-15',
        latestYMDDate: '2020-12-15',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_MONTHS_3,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-09-30',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_MONTHS_6,
        ymdDate: '2020-12-15',
    })).toEqual({
        earliestYMDDate: '2020-06-15',
        latestYMDDate: '2020-12-15',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_MONTHS_9,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-03-31',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_MONTHS_12,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2019-02-28',
        latestYMDDate: '2020-02-29',
    });


    //
    // LAST_YEARS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_YEARS_1,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2019-02-28',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_YEARS_2,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2018-02-28',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_YEARS_3,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2017-02-28',
        latestYMDDate: '2020-02-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_YEARS_5,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2015-12-31',
        latestYMDDate: '2020-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.LAST_YEARS_10,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2010-01-01',
        latestYMDDate: '2020-01-01',
    });
});


//
//---------------------------------------------------------
//
test('resolveRange-NEXT', () => {
    //
    // NEXT_DAYS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_7,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-03-01',
        latestYMDDate: '2020-03-07',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_7,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-29',
        latestYMDDate: '2020-03-06',
    });

    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_30,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2021-03-01',
        latestYMDDate: '2021-03-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_60,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2021-03-01',
        latestYMDDate: '2021-04-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_90,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2021-03-01',
        latestYMDDate: '2021-05-29',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_DAYS_180,
        ymdDate: '2021-03-01',
    })).toEqual({
        earliestYMDDate: '2021-03-01',
        latestYMDDate: '2021-08-27',
    });


    //
    // NEXT_WEEKS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_WEEKS_2,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-03-01',
        latestYMDDate: '2020-03-14',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_WEEKS_4,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-03-01',
        latestYMDDate: '2020-03-28',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_WEEKS_8,
        ymdDate: '2020-03-01',
    })).toEqual({
        earliestYMDDate: '2020-03-01',
        latestYMDDate: '2020-04-25',
    });


    //
    // NEXT_MONTHS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_MONTHS_3,
        ymdDate: '2020-12-15',
    })).toEqual({
        earliestYMDDate: '2020-12-15',
        latestYMDDate: '2021-03-15',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_MONTHS_3,
        ymdDate: '2020-03-31',
    })).toEqual({
        earliestYMDDate: '2020-03-31',
        latestYMDDate: '2020-06-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_MONTHS_6,
        ymdDate: '2021-01-15',
    })).toEqual({
        earliestYMDDate: '2021-01-15',
        latestYMDDate: '2021-07-15',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_MONTHS_9,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-12-31',
        latestYMDDate: '2021-09-30',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_MONTHS_12,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-29',
        latestYMDDate: '2021-02-28',
    });


    //
    // NEXT_YEARS_
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_YEARS_1,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-29',
        latestYMDDate: '2021-02-28',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_YEARS_2,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-29',
        latestYMDDate: '2022-02-28',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_YEARS_3,
        ymdDate: '2020-02-29',
    })).toEqual({
        earliestYMDDate: '2020-02-29',
        latestYMDDate: '2023-02-28',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_YEARS_5,
        ymdDate: '2020-12-31',
    })).toEqual({
        earliestYMDDate: '2020-12-31',
        latestYMDDate: '2025-12-31',
    });
    expect(resolveDateRange({
        rangeType: StandardRangeType.NEXT_YEARS_10,
        ymdDate: '2020-01-01',
    })).toEqual({
        earliestYMDDate: '2020-01-01',
        latestYMDDate: '2030-01-01',
    });
});
