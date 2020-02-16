import { YMDDate, getYMDDate } from './YMDDate';

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