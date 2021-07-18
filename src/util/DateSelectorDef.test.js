import { resolveDateSelector, DateSelectorType, } from './DateSelectorDef';
import { YMDDate } from './YMDDate';

//
//---------------------------------------------------------
//
test('resolveDateSelector-basic', () => {

    //
    // TODAY
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.TODAY,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-17');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.TODAY,
        ymdDate: new YMDDate('2021-07-17'),
    })).toEqual(new YMDDate('2021-07-17'));


    //
    // CUSTOM

    // Separate args
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.CUSTOM,
        customYMDDate: '2021-01-02',
    },
    '2021-07-17'),
    ).toEqual('2021-01-02');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.CUSTOM,
        customYMDDate: '2021-01-02',
        ymdDate: '2021-07-17',
    }),
    ).toEqual('2021-01-02');

});


//
//---------------------------------------------------------
//
test('resolveDateSelector-Current', () => {
    //
    // WEEK_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_START,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-11');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_START,
        ymdDate: '2021-07-11',
    })).toEqual('2021-07-11');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_START,
        ymdDate: '2021-07-17',
        options: { weekStart: 2, },
    })).toEqual('2021-07-13');

    //
    // WEEK_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_END,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-17');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_END,
        ymdDate: '2021-07-11',
    })).toEqual('2021-07-17');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WEEK_END,
        ymdDate: '2021-07-17',
        options: { weekStart: 2, },
    })).toEqual('2021-07-19');


    //
    // WORK_WEEK_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_START,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-12');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_START,
        ymdDate: '2021-07-16',
    })).toEqual('2021-07-12');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_START,
        ymdDate: '2021-07-11',
    })).toEqual('2021-07-12');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_START,
        ymdDate: '2021-07-12',
    })).toEqual('2021-07-12');

    //
    // WORK_WEEK_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_END,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-16');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_END,
        ymdDate: '2021-07-16',
    })).toEqual('2021-07-16');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_END,
        ymdDate: '2021-07-11',
    })).toEqual('2021-07-16');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.WORK_WEEK_END,
        ymdDate: '2021-07-12',
    })).toEqual('2021-07-16');


    //
    // MONTH_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_START,
        ymdDate: '2021-07-17',
    })).toEqual('2021-07-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_START,
        ymdDate: '2021-07-01',
    })).toEqual('2021-07-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_START,
        ymdDate: '2021-07-31',
    })).toEqual('2021-07-01');

    //
    // MONTH_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_END,
        ymdDate: '2021-02-17',
    })).toEqual('2021-02-28');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_END,
        ymdDate: '2021-02-28',
    })).toEqual('2021-02-28');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.MONTH_END,
        ymdDate: '2020-02-28',
    })).toEqual('2020-02-29');


    //
    // QUARTER_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-01-01',
    })).toEqual('2021-01-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-03-31',
    })).toEqual('2021-01-01');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-04-01',
    })).toEqual('2021-04-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-06-30',
    })).toEqual('2021-04-01');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-07-01',
    })).toEqual('2021-07-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-09-30',
    })).toEqual('2021-07-01');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-10-01',
    })).toEqual('2021-10-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_START,
        ymdDate: '2021-12-31',
    })).toEqual('2021-10-01');


    //
    // QUARTER_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-01-01',
    })).toEqual('2021-03-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-03-31',
    })).toEqual('2021-03-31');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-04-01',
    })).toEqual('2021-06-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-06-30',
    })).toEqual('2021-06-30');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-07-01',
    })).toEqual('2021-09-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-09-30',
    })).toEqual('2021-09-30');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-10-01',
    })).toEqual('2021-12-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.QUARTER_END,
        ymdDate: '2021-12-31',
    })).toEqual('2021-12-31');


    //
    // HALF_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_START,
        ymdDate: '2021-01-01',
    })).toEqual('2021-01-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_START,
        ymdDate: '2021-06-30',
    })).toEqual('2021-01-01');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_START,
        ymdDate: '2021-07-01',
    })).toEqual('2021-07-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_START,
        ymdDate: '2021-12-31',
    })).toEqual('2021-07-01');

    //
    // HALF_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_END,
        ymdDate: '2021-01-01',
    })).toEqual('2021-06-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_END,
        ymdDate: '2021-06-30',
    })).toEqual('2021-06-30');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_END,
        ymdDate: '2021-07-01',
    })).toEqual('2021-12-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.HALF_END,
        ymdDate: '2021-12-31',
    })).toEqual('2021-12-31');


    //
    // YEAR_START
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.YEAR_START,
        ymdDate: '2021-01-01',
    })).toEqual('2021-01-01');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.YEAR_START,
        ymdDate: '2021-12-31',
    })).toEqual('2021-01-01');

    //
    // YEAR_END
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.YEAR_END,
        ymdDate: '2021-01-01',
    })).toEqual('2021-12-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.YEAR_END,
        ymdDate: '2021-12-31',
    })).toEqual('2021-12-31');
});


//
//---------------------------------------------------------
//
test('resolveDateSelector-Preceding', () => {
    //
    // PRECEDING_MONTH_END,
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_MONTH_END,
        ymdDate: '2021-03-31',
    })).toEqual('2021-02-28');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_MONTH_END,
        ymdDate: '2021-03-01',
    })).toEqual('2021-02-28');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_MONTH_END,
        ymdDate: '2020-03-01',
    })).toEqual('2020-02-29');


    //
    // PRECEDING_QUARTER_END,
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-03-31',
    })).toEqual('2020-12-31');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-04-01',
    })).toEqual('2021-03-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-06-30',
    })).toEqual('2021-03-31');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-07-01',
    })).toEqual('2021-06-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-09-30',
    })).toEqual('2021-06-30');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-10-01',
    })).toEqual('2021-09-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_QUARTER_END,
        ymdDate: '2021-12-31',
    })).toEqual('2021-09-30');


    //
    // PRECEDING_HALF_END,
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_HALF_END,
        ymdDate: '2021-01-01',
    })).toEqual('2020-12-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_HALF_END,
        ymdDate: '2021-06-30',
    })).toEqual('2020-12-31');

    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_HALF_END,
        ymdDate: '2021-07-01',
    })).toEqual('2021-06-30');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_HALF_END,
        ymdDate: '2021-12-31',
    })).toEqual('2021-06-30');


    //
    // PRECEDING_YEAR_END,
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_YEAR_END,
        ymdDate: '2021-01-01',
    })).toEqual('2020-12-31');
    expect(resolveDateSelector({
        dateSelectorType: DateSelectorType.PRECEDING_YEAR_END,
        ymdDate: '2021-12-31',
    })).toEqual('2020-12-31');
});
