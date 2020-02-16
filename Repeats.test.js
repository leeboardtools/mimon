import * as R from './Repeats';
import { getYMDDate, YMDDate } from './YMDDate';

function checkDataItemConversion(definition) {
    const dataItem = R.getRepeatDefinitionDataItem(definition);
    expect(R.getRepeatDefinitionDataItem(dataItem)).toBe(dataItem);

    const dataItemCopy = R.getRepeatDefinitionDataItem(dataItem, true);
    expect(dataItemCopy).toEqual(dataItem);
    expect(dataItemCopy).not.toBe(dataItem);

    const back = R.getRepeatDefinition(dataItem);
    expect(back).toEqual(definition);
    expect(R.getRepeatDefinition(back)).toBe(back);

    const backCopy = R.getRepeatDefinition(back, true);
    expect(backCopy).toEqual(back);
    expect(backCopy).not.toBe(back);
}


//
//---------------------------------------------------------
//
test('Repeats-NONE', () => {
    const none = {
        type: R.RepeatType.NONE,
    };
    checkDataItemConversion(none);
    expect(R.validateRepeatDefinition(none)).toBeUndefined();
    expect(R.getNextRepeatYMDDate(none, '2000-01-01')).toBeUndefined();
});


//
//---------------------------------------------------------
//
test('Repeats-DAILY', () => {
    const simple = {
        type: R.RepeatType.DAILY,
        period: 10,
        startYMDDate: getYMDDate('2020-01-15'),
    };
    checkDataItemConversion(simple);

    expect(R.validateRepeatDefinition(simple)).toBeUndefined();

    const invalidA = { type: R.RepeatType.DAILY, period: -1, };
    expect(R.validateRepeatDefinition(invalidA)).toBeInstanceOf(Error);

    const invalidB = { type: R.RepeatType.DAILY, period: 10, startYMDDate: '1abc', };
    expect(R.validateRepeatDefinition(invalidB)).toBeInstanceOf(Error);


    expect(R.getNextRepeatYMDDate(simple, '2020-01-14')).toEqual(
        simple.startYMDDate);
    expect(R.getNextRepeatYMDDate(simple, '2020-01-15')).toEqual(
        simple.startYMDDate.addDays(simple.period));
        
    const withLastDate = {
        type: R.RepeatType.DAILY,
        period: 10,
        startYMDDate: '2020-03-01',
        lastYMDDate: '2020-03-30',
    };
    expect(R.getNextRepeatYMDDate(withLastDate, '2020-03-10')).toEqual(
        getYMDDate('2020-03-11'));
    expect(R.getNextRepeatYMDDate(withLastDate, '2020-03-11')).toEqual(
        getYMDDate('2020-03-21'));
    expect(R.getNextRepeatYMDDate(withLastDate, '2020-03-21')).toBeUndefined();

    withLastDate.lastYMDDate = '2020-03-31';
    expect(R.getNextRepeatYMDDate(withLastDate, '2020-03-21')).toEqual(
        getYMDDate('2020-03-31'));
});


//
//---------------------------------------------------------
//
test('Repeats-WEEKLY', () => {
    const definition = {
        type: R.RepeatType.WEEKLY,
        period: 2,
        offset: { dayOfWeek: 3, },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalidA = { type: R.RepeatType.WEEKLY, period: -1, };
    expect(R.validateRepeatDefinition(invalidA)).toBeInstanceOf(Error);

    const invalidB = { type: R.RepeatType.WEEKLY, period: 10, startYMDDate: '1abc', };
    expect(R.validateRepeatDefinition(invalidB)).toBeInstanceOf(Error);

    const invalidC = Object.assign({}, definition);
    invalidC.offset = undefined;
    expect(R.validateRepeatDefinition(invalidC)).toBeInstanceOf(Error);

    invalidC.offset = { dayOfWeek: 7, };
    expect(R.validateRepeatDefinition(invalidC)).toBeInstanceOf(Error);



    // Check the start date dow falling after the dow.
    // '2020-02-01 is a Saturday=7, therefore the start date is adjusted
    // to the following Wednesday, 2020-02-05
    expect(R.getNextRepeatYMDDate(definition, '2020-01-39')).toEqual(
        getYMDDate('2020-02-05')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-04')).toEqual(
        getYMDDate('2020-02-05')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-05')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-18')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-03-04')
    );

    // Check the start date dow falling on the dow.
    definition.startYMDDate = getYMDDate('2020-02-05');
    expect(R.getNextRepeatYMDDate(definition, '2020-02-04')).toEqual(
        getYMDDate('2020-02-05')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-05')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-18')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-03-04')
    );

    // Check the start date dow falling before the dow.
    definition.startYMDDate = getYMDDate('2020-02-03');
    expect(R.getNextRepeatYMDDate(definition, '2020-02-02')).toEqual(
        getYMDDate('2020-02-05')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-04')).toEqual(
        getYMDDate('2020-02-05')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-05')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-18')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-03-04')
    );


    //
    // Check with end date.
    definition.lastYMDDate = getYMDDate('2020-03-04');
    expect(R.getNextRepeatYMDDate(definition, '2020-02-18')).toEqual(
        getYMDDate('2020-02-19')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-03-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-03-03')).toEqual(
        getYMDDate('2020-03-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-03-04')).toBeUndefined();
});


//
//---------------------------------------------------------
//
test('Repeats-MONTHLY_NTH_DAY', () => {
    const definition = {
        type: R.RepeatType.MONTHLY,
        period: 2,
        offset: {
            typeName: R.MonthOffsetType.NTH_DAY.name,
            offset: 3,
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);
    invalid.offset = undefined;
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { offset: 3};
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: 'abc', offset: 3, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.MonthOffsetType.NTH_DAY.name, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.MonthOffsetType.NTH_DAY.name, offset: 32, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);


    //
    // Specific day of month
    definition.offset.offset = 30;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-29')
    );

    // The resolved start date is '2020-02-29'.
    expect(R.getNextRepeatYMDDate(definition, '2020-02-28')).toEqual(
        getYMDDate('2020-02-29')
    );

    expect(R.getNextRepeatYMDDate(definition, '2020-02-29')).toEqual(
        getYMDDate('2020-04-30')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-04-29')).toEqual(
        getYMDDate('2020-04-30')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-04-30')).toEqual(
        getYMDDate('2020-06-30')
    );


    //
    // Days from end of month.
    definition.offset.offset = -29;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-01')
    );

    expect(R.getNextRepeatYMDDate(definition, '2020-02-01')).toEqual(
        getYMDDate('2020-04-01')
    );

    expect(R.getNextRepeatYMDDate(definition, '2020-08-01')).toEqual(
        getYMDDate('2020-08-02')
    );
});


//
//---------------------------------------------------------
//
test('Repeats-MONTHLY_NTH_WEEK', () => {
    const definition = {
        type: R.RepeatType.MONTHLY,
        period: 2,
        offset: {
            typeName: R.MonthOffsetType.NTH_WEEK.name,
            offset: 3,
            dayOfWeek: 2,   // Tuesday
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);
    invalid.offset = undefined;
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { offset: 3};
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: 'abc', offset: 3, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.MonthOffsetType.NTH_WEEK.name, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.MonthOffsetType.NTH_WEEK.name, 
        dayOfWeek: 2, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.object = { typeName: R.MonthOffsetType.NTH_WEEK.name,
        dayOfWeek:2,
        offset: 6, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    
    //
    // Second Wednesday.
    definition.offset.offset = 2;
    definition.offset.dayOfWeek = 3;

    // For 2020-02 second Wednesday is 2020-02-12
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-12')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-11')).toEqual(
        getYMDDate('2020-02-12')
    );

    // For 2020-04 second Wednesday is 2020-04-08
    expect(R.getNextRepeatYMDDate(definition, '2020-02-12')).toEqual(
        getYMDDate('2020-04-08')
    );


    // Check startYMDDate before dayOfWeek.
    definition.startYMDDate = new YMDDate('2020-02-03');
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-12')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-11')).toEqual(
        getYMDDate('2020-02-12')
    );

    // For 2020-04 second Wednesday is 2020-04-08
    expect(R.getNextRepeatYMDDate(definition, '2020-02-12')).toEqual(
        getYMDDate('2020-04-08')
    );


    //
    // Second to last Thursday.
    definition.offset.offset = -1;
    definition.offset.dayOfWeek = 4;

    // For 2020-02 second to last Thursday is 2020-02-20
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-20')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-02-20')
    );

    // For 2020-04 second to last Thursday is 2020-04-23
    expect(R.getNextRepeatYMDDate(definition, '2020-02-20')).toEqual(
        getYMDDate('2020-04-23')
    );


    // Check startYMDDate after dayOfWeek.
    definition.startYMDDate = new YMDDate('2020-02-01');
    // For 2020-02 second to last Thursday is 2020-02-20
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-20')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-19')).toEqual(
        getYMDDate('2020-02-20')
    );

    // For 2020-04 second to last Thursday is 2020-04-23
    expect(R.getNextRepeatYMDDate(definition, '2020-02-20')).toEqual(
        getYMDDate('2020-04-23')
    );
});


//
//---------------------------------------------------------
//
test('Repeats-YEARLY_NTH_DAY', () => {
    const definition = {
        type: R.RepeatType.YEARLY,
        period: 2,
        offset: {
            typeName: R.YearOffsetType.NTH_DAY,
            offset: 3,
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);
    invalid.offset = undefined;
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { offset: 3};
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: 'abc', offset: 3, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_DAY, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_DAY, offset: 367, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);


    //
    // + offset
    definition.offset.typeName = R.YearOffsetType.NTH_DAY;
    definition.offset.offset = 1 + new YMDDate('2020-01-01')
        .daysAfterMe(getYMDDate('2020-02-24'));
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-24')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-23')).toEqual(
        getYMDDate('2020-02-24')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-24')).toEqual(
        getYMDDate('2022-02-24')
    );

    //
    // + offset leap day.
    definition.offset.offset = 1 + new YMDDate('2020-01-01')
        .daysAfterMe(getYMDDate('2020-02-29'));
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-29')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-28')).toEqual(
        getYMDDate('2020-02-29')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-29')).toEqual(
        getYMDDate('2022-03-01')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-03-01')).toEqual(
        getYMDDate('2024-02-29')
    );

    //
    // - offset.
    definition.offset.offset = new YMDDate('2020-12-31')
        .daysAfterMe(getYMDDate('2020-02-29'));
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-29')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-28')).toEqual(
        getYMDDate('2020-02-29')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-29')).toEqual(
        getYMDDate('2022-02-28')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-27')).toEqual(
        getYMDDate('2022-02-28')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-28')).toEqual(
        getYMDDate('2024-02-29')
    );
        
});


//
//---------------------------------------------------------
//
test('Repeats-YEARLY_NTH_DAY_month', () => {
    const definition = {
        type: R.RepeatType.YEARLY,
        period: 2,
        offset: {
            typeName: R.YearOffsetType.NTH_DAY,
            offset: 3,
            month: 4,
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);
    invalid.offset.month = -5;
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);


    //
    // + offset
    definition.offset.typeName = R.YearOffsetType.NTH_DAY;
    definition.offset.month = 1;
    definition.offset.offset = 29;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-29')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-28')).toEqual(
        getYMDDate('2020-02-29')
    );

    expect(R.getNextRepeatYMDDate(definition, '2020-02-29')).toEqual(
        getYMDDate('2022-02-28')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-27')).toEqual(
        getYMDDate('2022-02-28')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-28')).toEqual(
        getYMDDate('2024-02-29')
    );


    //
    // - offset
    definition.offset.offset = -28; // Feb 1 of a leap year.
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-01')
    );

    expect(R.getNextRepeatYMDDate(definition, '2020-02-01')).toEqual(
        getYMDDate('2022-02-01')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-01-31')).toEqual(
        getYMDDate('2022-02-01')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-01')).toEqual(
        getYMDDate('2024-02-01')
    );
});


//
//---------------------------------------------------------
//
test('Repeats-YEARLY_NTH_WEEK', () => {
    const definition = {
        type: R.RepeatType.YEARLY,
        period: 2,
        offset: {
            typeName: R.YearOffsetType.NTH_WEEK,
            offset: 3,
            dayOfWeek: 4,
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);
    invalid.offset = undefined;
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { offset: 3};
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: 'abc', offset: 3, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_WEEK, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_WEEK, offset: 53, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_WEEK, offset: 50, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    invalid.offset = { typeName: R.YearOffsetType.NTH_WEEK, 
        offset: 53, 
        dayOfWeek: -1, };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    //
    // + offset
    // 2020-01-01 is a Wednesday.
    // 2020-12-31 is a Thursday.
    definition.startYMDDate = new YMDDate('2020-01-01');
    definition.offset.typeName = R.YearOffsetType.NTH_WEEK;
    definition.offset.offset = 4;
    definition.offset.dayOfWeek = 2;    // 4th Tuesday of the year.
    expect(R.getNextRepeatYMDDate(definition, '2020-01-27')).toEqual(
        getYMDDate('2020-01-28')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-01-28')).toEqual(
        getYMDDate('2022-01-25')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-01-24')).toEqual(
        getYMDDate('2022-01-25')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-01-25')).toEqual(
        getYMDDate('2024-01-23')
    );

    // Check Thursday
    definition.offset.dayOfWeek = 4;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-22')).toEqual(
        getYMDDate('2020-01-23')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-01-23')).toEqual(
        getYMDDate('2022-01-27')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-01-26')).toEqual(
        getYMDDate('2022-01-27')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-01-28')).toEqual(
        getYMDDate('2024-01-25')
    );

    //
    // - offset
    definition.offset.offset = -3;
    definition.offset.dayOfWeek = 2;
    expect(R.getNextRepeatYMDDate(definition, '2016-01-01')).toEqual(
        getYMDDate('2020-12-08')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-07')).toEqual(
        getYMDDate('2020-12-08')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-08')).toEqual(
        getYMDDate('2022-12-06')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-12-05')).toEqual(
        getYMDDate('2022-12-06')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-12-06')).toEqual(
        getYMDDate('2024-12-10')
    );

    // Check Friday
    definition.offset.dayOfWeek = 5;
    expect(R.getNextRepeatYMDDate(definition, '2016-01-01')).toEqual(
        getYMDDate('2020-12-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-03')).toEqual(
        getYMDDate('2020-12-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-04')).toEqual(
        getYMDDate('2022-12-09')
    );
});



//
//---------------------------------------------------------
//
test('Repeats-YEARLY_NTH_WEEK_month', () => {
    const definition = {
        type: R.RepeatType.YEARLY,
        period: 2,
        offset: {
            typeName: R.YearOffsetType.NTH_WEEK,
            offset: 3,
            dayOfWeek: 4,
            month: 1,
        },
        startYMDDate: getYMDDate('2020-02-01'),
    };
    checkDataItemConversion(definition);

    expect(R.validateRepeatDefinition(definition)).toBeUndefined();

    const invalid = Object.assign({}, definition);

    invalid.offset = { typeName: R.YearOffsetType.NTH_WEEK, 
        offset: 53, 
        dayOfWeek: 1,
        month: -1,
    };
    expect(R.validateRepeatDefinition(invalid)).toBeInstanceOf(Error);

    //
    // + offset
    // 2020-01-01 is a Wednesday.
    // 2020-12-31 is a Thursday.
    definition.startYMDDate = new YMDDate('2020-01-01');
    definition.offset.typeName = R.YearOffsetType.NTH_WEEK;
    // 3rd Tuesday of February.
    definition.offset.offset = 3;
    definition.offset.dayOfWeek = 2;
    definition.offset.month = 1;
    expect(R.getNextRepeatYMDDate(definition, '2020-02-17')).toEqual(
        getYMDDate('2020-02-18')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-18')).toEqual(
        getYMDDate('2022-02-15')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-14')).toEqual(
        getYMDDate('2022-02-15')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-15')).toEqual(
        getYMDDate('2024-02-20')
    );

    // 4th Thursday of February
    definition.offset.offset = 4;
    definition.offset.dayOfWeek = 4;
    expect(R.getNextRepeatYMDDate(definition, '2020-02-26')).toEqual(
        getYMDDate('2020-02-27')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-27')).toEqual(
        getYMDDate('2022-02-24')
    );


    //
    // - offset
    // 4th from last Thursday in February
    definition.offset.offset = -3;
    expect(R.getNextRepeatYMDDate(definition, '2020-02-05')).toEqual(
        getYMDDate('2020-02-06')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-06')).toEqual(
        getYMDDate('2022-02-03')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-02')).toEqual(
        getYMDDate('2022-02-03')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-03')).toEqual(
        getYMDDate('2024-02-08')
    );

    // 5th from last Thursday in February
    definition.offset.offset = -4;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-01')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-02-03')).toEqual(
        getYMDDate('2024-02-01')
    );

    // 4th from last Tuesday in February
    definition.offset.offset = -3;
    definition.offset.dayOfWeek = 2;
    expect(R.getNextRepeatYMDDate(definition, '2020-01-31')).toEqual(
        getYMDDate('2020-02-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-03')).toEqual(
        getYMDDate('2020-02-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-02-04')).toEqual(
        getYMDDate('2022-02-01')
    );
/*
    //
    // - offset
    definition.offset.offset = -3;
    definition.offset.dayOfWeek = 2;
    expect(R.getNextRepeatYMDDate(definition, '2016-01-01')).toEqual(
        getYMDDate('2020-12-08')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-07')).toEqual(
        getYMDDate('2020-12-08')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-08')).toEqual(
        getYMDDate('2022-12-06')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-12-05')).toEqual(
        getYMDDate('2022-12-06')
    );
    expect(R.getNextRepeatYMDDate(definition, '2022-12-06')).toEqual(
        getYMDDate('2024-12-10')
    );

    // Check Friday
    definition.offset.dayOfWeek = 5;
    expect(R.getNextRepeatYMDDate(definition, '2016-01-01')).toEqual(
        getYMDDate('2020-12-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-03')).toEqual(
        getYMDDate('2020-12-04')
    );
    expect(R.getNextRepeatYMDDate(definition, '2020-12-04')).toEqual(
        getYMDDate('2022-12-09')
    );
*/
});



