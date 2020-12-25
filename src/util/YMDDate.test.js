import { YMDDate, getYMDDate, getMonthNthDayOfWeek, getYMDDateWithDOM } from './YMDDate';

function expectYMDDate(oDate, year, month, dom) {
    expect(oDate.getFullYear()).toEqual(year);
    expect(oDate.getMonth()).toEqual(month);
    expect(oDate.getDOM()).toEqual(dom);
}


//
//-----------------------------------------------
//
test('YMDDate', () => {

    expectYMDDate(new YMDDate(2019, 8, 7), 2019, 8, 7);
    expectYMDDate(new YMDDate(new Date(2019, 8, 7)), 2019, 8, 7);
    expect(new YMDDate(2019, 8, 7).toString()).toEqual('2019-09-07');
    expectYMDDate(new YMDDate('2019-09-07'), 2019, 8, 7);

    expect(new YMDDate(2019, 10, 20).toString()).toEqual('2019-11-20');
    expectYMDDate(new YMDDate('2019-11-20'), 2019, 10, 20);

    const dateA = new YMDDate(2019, 9, 31);
    const dateB = new YMDDate(2019, 10, 1);
    expect(YMDDate.compare(dateA, dateB)).toBeLessThan(0);
    expect(YMDDate.compare(dateB, dateA)).toBeGreaterThan(0);
    expect(YMDDate.compare(dateA, dateA)).toEqual(0);

    expect(dateA.daysAfterMe(dateB)).toEqual(1);
    expect(dateB.daysAfterMe(dateA)).toEqual(-1);

    const optionsA = dateA.toOptions();
    expect(optionsA).toEqual({ year: 2019, month: 9, dom: 31 });

    const copyA = YMDDate.fromOptions(optionsA);
    expect(copyA).toEqual(dateA);
    expect(YMDDate.compare(dateA, copyA)).toEqual(0);

    const copyAA = YMDDate.fromOptions(copyA);
    expect(copyAA === copyA).toBeTruthy();


    const dateC = dateB.addDays(1);
    expect(dateC).toEqual(new YMDDate(2019, 10, 2));

    const dateD = dateB.addDays(29);
    expect(dateD).toEqual(new YMDDate(2019, 10, 30));

    const dateE = dateD.addDays(-29);
    expect(dateE).toEqual(dateB);
});

//
//-----------------------------------------------
//
test('YMDDate-addMonths', () => {
    const refDate = new YMDDate('2020-05-31');
    expect(refDate.addMonths(0)).toEqual(refDate);

    expect(refDate.addMonths(1)).toEqual(new YMDDate('2020-06-30'));
    expect(refDate.addMonths(2)).toEqual(new YMDDate('2020-07-31'));

    expect(refDate.addMonths(12)).toEqual(new YMDDate('2021-05-31'));
    expect(refDate.addMonths(13)).toEqual(new YMDDate('2021-06-30'));
    expect(refDate.addMonths(14)).toEqual(new YMDDate('2021-07-31'));

    // Subtract...
    expect(refDate.addMonths(-1)).toEqual(new YMDDate('2020-04-30'));
    expect(refDate.addMonths(-2)).toEqual(new YMDDate('2020-03-31'));
    expect(refDate.addMonths(-3)).toEqual(new YMDDate('2020-02-29'));   // Leap year!

    expect(refDate.addMonths(-12)).toEqual(new YMDDate('2019-05-31'));
    expect(refDate.addMonths(-13)).toEqual(new YMDDate('2019-04-30'));
    expect(refDate.addMonths(-14)).toEqual(new YMDDate('2019-03-31'));
    expect(refDate.addMonths(-15)).toEqual(new YMDDate('2019-02-28'));

});

//
//-----------------------------------------------
//
test('YMDDate-addYears', () => {
    const refDate = new YMDDate('2020-05-31');
    expect(refDate.addYears(0)).toEqual(refDate);

    expect(refDate.addYears(1)).toEqual(new YMDDate('2021-05-31'));
    expect(refDate.addYears(10)).toEqual(new YMDDate('2030-05-31'));
    expect(refDate.addYears(-1)).toEqual(new YMDDate('2019-05-31'));
    expect(refDate.addYears(-10)).toEqual(new YMDDate('2010-05-31'));


    const leapDate = new YMDDate('2020-02-29');
    expect(leapDate.addYears(0)).toEqual(leapDate);

    expect(leapDate.addYears(1)).toEqual(new YMDDate('2021-02-28'));
    expect(leapDate.addYears(4)).toEqual(new YMDDate('2024-02-29'));
    expect(leapDate.addYears(-1)).toEqual(new YMDDate('2019-02-28'));
    expect(leapDate.addYears(-4)).toEqual(new YMDDate('2016-02-29'));
});

//
//-----------------------------------------------
//
test('YMDDate-getLastDateOfMonth', () => {
    expect(new YMDDate('2020-01-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-02-15').getLastDateOfMonth()).toEqual(29); // Leap year!
    expect(new YMDDate('2019-02-15').getLastDateOfMonth()).toEqual(28);
    expect(new YMDDate('2020-03-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-04-15').getLastDateOfMonth()).toEqual(30);
    expect(new YMDDate('2020-05-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-06-15').getLastDateOfMonth()).toEqual(30);
    expect(new YMDDate('2020-07-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-08-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-09-15').getLastDateOfMonth()).toEqual(30);
    expect(new YMDDate('2020-10-15').getLastDateOfMonth()).toEqual(31);
    expect(new YMDDate('2020-11-15').getLastDateOfMonth()).toEqual(30);
    expect(new YMDDate('2020-12-15').getLastDateOfMonth()).toEqual(31);
});

//
//-----------------------------------------------
//
test('YMDDate-monthsAfterMe', () => {
    const refYMDDate = new YMDDate('2020-06-15');
    expect(refYMDDate.monthsAfterMe(new YMDDate('2020-06-15'))).toEqual(0);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2020-07-15'))).toEqual(1);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2020-08-15'))).toEqual(2);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2020-05-15'))).toEqual(-1);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2020-04-15'))).toEqual(-2);

    // Year differences
    expect(refYMDDate.monthsAfterMe(new YMDDate('2021-06-15'))).toEqual(12);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2021-07-15'))).toEqual(13);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2019-06-15'))).toEqual(-12);
    expect(refYMDDate.monthsAfterMe(new YMDDate('2019-05-15'))).toEqual(-13);
});

//
//-----------------------------------------------
//
test('YMDDate-quarter', () => {
    expect(getYMDDate('2019-01-01').getCalendarQuarter()).toEqual(1);
    expect(getYMDDate('2019-03-31').getCalendarQuarter()).toEqual(1);
    expect(getYMDDate('2019-04-01').getCalendarQuarter()).toEqual(2);
    expect(getYMDDate('2019-06-30').getCalendarQuarter()).toEqual(2);
    expect(getYMDDate('2019-07-01').getCalendarQuarter()).toEqual(3);
    expect(getYMDDate('2019-09-30').getCalendarQuarter()).toEqual(3);
    expect(getYMDDate('2019-10-01').getCalendarQuarter()).toEqual(4);
    expect(getYMDDate('2019-12-31').getCalendarQuarter()).toEqual(4);
});


//
//-----------------------------------------------
//
test('YMDDate-orderYMDDatePair', () => {
    const dateA = new YMDDate(2019, 10, 11);
    const dateB = new YMDDate(2019, 10, 12);
    expect(YMDDate.orderYMDDatePair(dateA, dateB)).toEqual([dateA, dateB]);
    expect(YMDDate.orderYMDDatePair(dateB, dateA)).toEqual([dateA, dateB]);

    expect(YMDDate.orderYMDDatePair([dateA, dateB])).toEqual([dateA, dateB]);
    expect(YMDDate.orderYMDDatePair([dateB, dateA])).toEqual([dateA, dateB]);
    expect(YMDDate.orderYMDDatePair(dateA)).toEqual([dateA, dateA]);

});


//
//-----------------------------------------------
//
test('YMDDate-isYearLeapYear', () => {
    expect(YMDDate.isYearLeapYear(2016)).toBeTruthy();
    expect(YMDDate.isYearLeapYear(2017)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2018)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2019)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2020)).toBeTruthy();

    // eslint-disable-next-line max-len
    // Per https://docs.microsoft.com/en-us/office/troubleshoot/excel/determine-a-leap-year
    expect(YMDDate.isYearLeapYear(1700)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(1800)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(1900)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2100)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2200)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2300)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2500)).toBeFalsy();
    expect(YMDDate.isYearLeapYear(2600)).toBeFalsy();

    expect(YMDDate.isYearLeapYear(1600)).toBeTruthy();
    expect(YMDDate.isYearLeapYear(2000)).toBeTruthy();
    expect(YMDDate.isYearLeapYear(2400)).toBeTruthy();


    // isAfterFebruary28()...
    expect(new YMDDate('2020-01-01').isAfterFebruary28()).toBeFalsy();
    expect(new YMDDate('2020-02-28').isAfterFebruary28()).toBeFalsy();
    expect(new YMDDate('2020-02-29').isAfterFebruary28()).toBeTruthy();
    expect(new YMDDate('2020-03-01').isAfterFebruary28()).toBeTruthy();
    expect(new YMDDate('2020-12-31').isAfterFebruary28()).toBeTruthy();
});


//
//-----------------------------------------------
//
test('YMDDate-fractionalYearsAfterMe', () => {
    let ymdDateA;
    let ymdDateB;

    ymdDateA = new YMDDate('2020-01-01');
    ymdDateB = new YMDDate('2020-01-02');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 / 366);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-1 / 366);

    ymdDateA = new YMDDate('2019-01-01');
    ymdDateB = new YMDDate('2019-01-02');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 / 365);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-(1 / 365));

    ymdDateA = new YMDDate('2019-03-01');
    ymdDateB = new YMDDate('2020-03-01');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-1);

    // From 2020-03-01 to 2021-03-01 is 365 days
    ymdDateA = new YMDDate('2019-03-01');
    ymdDateB = new YMDDate('2020-03-02');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 + 1 / 365);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-(1 + 1 / 365));

    // From 2019-03-01 to 2020-03-01 is 366 days
    ymdDateA = new YMDDate('2019-03-01');
    ymdDateB = new YMDDate('2020-02-29');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 - 1 / 366);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-(1 - 1 / 366));

    // From 2020-02-29 to 2020-03-01 is 366 days
    ymdDateA = new YMDDate('2020-02-29');
    ymdDateB = new YMDDate('2020-03-01');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 / 365);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-(1 / 365));

    // From 2020-02-29 to 2020-03-01 is 366 days
    ymdDateA = new YMDDate('2020-02-29');
    ymdDateB = new YMDDate('2021-03-01');
    expect(ymdDateA.fractionalYearsAfterMe(ymdDateB)).toEqual(1 + 1 / 365);
    expect(ymdDateB.fractionalYearsAfterMe(ymdDateA)).toEqual(-(1 + 1 / 365));

});


//
//-----------------------------------------------
//
test('YMDDate-getMonthNthDayOfWeek', () => {
    //
    // From Start of Month...
    // 2020-12-01 is Tuesday...
    //
    // DOW before the first day
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        1,
        2,
    )).toEqual('2020-12-01');

    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),   // Thursday
        5,
        2,
    )).toEqual(getYMDDate('2020-12-29'));

    // Past end of month
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        6,
        2,
    )).toEqual('2021-01-05');


    // DOW on the first day
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        1,
        3,
    )).toEqual('2020-12-02');

    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        5,
        3,
    )).toEqual('2020-12-30');

    // Past end of month
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        6,
        3,
    )).toEqual('2021-01-06');


    // DOW before the after day
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        1,
        4,
    )).toEqual('2020-12-03');

    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        5,
        4,
    )).toEqual('2020-12-31');

    // Past end of month
    expect(getMonthNthDayOfWeek(
        '2020-12-24',   // Thursday
        6,
        4,
    )).toEqual('2021-01-07');

    //
    // From end of month...
    // 2020-12-31 is Thursday...
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -1,
        5,
    )).toEqual(getYMDDate('2020-12-25'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -3,
        5,
    )).toEqual(getYMDDate('2020-12-11'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -5,
        5,
    )).toEqual(getYMDDate('2020-11-27'));

    // Same DOW as end of month
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -1,
        4,
    )).toEqual(getYMDDate('2020-12-31'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -3,
        4,
    )).toEqual(getYMDDate('2020-12-17'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -5,
        4,
    )).toEqual(getYMDDate('2020-12-03'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -6,
        4,
    )).toEqual(getYMDDate('2020-11-26'));

    // DOW before end of month
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -1,
        3,
    )).toEqual(getYMDDate('2020-12-30'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -3,
        3,
    )).toEqual(getYMDDate('2020-12-16'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -5,
        3,
    )).toEqual(getYMDDate('2020-12-02'));
    expect(getMonthNthDayOfWeek(
        getYMDDate('2020-12-24'),
        -6,
        3,
    )).toEqual(getYMDDate('2020-11-25'));

});


//
//-----------------------------------------------
//
test('YMDDate-getYMDDateWithDOM', () => {
    expect(getYMDDateWithDOM('2020-02-20', 29))
        .toEqual('2020-02-29');
    expect(getYMDDateWithDOM('2021-02-20', 29))
        .toEqual('2021-02-28');
});
