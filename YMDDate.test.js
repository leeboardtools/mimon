import { YMDDate, getYMDDate } from './YMDDate';

function expectODate(oDate, year, month, dom) {
    expect(oDate.getFullYear()).toEqual(year);
    expect(oDate.getMonth()).toEqual(month);
    expect(oDate.getDOM()).toEqual(dom);
}


//
//-----------------------------------------------
//
test('YMDDate', () => {

    expectODate(new YMDDate(2019, 8, 7), 2019, 8, 7);
    expectODate(new YMDDate(new Date(2019, 8, 7)), 2019, 8, 7);
    expect(new YMDDate(2019, 8, 7).toString()).toEqual('2019-09-07');
    expectODate(new YMDDate('2019-09-07'), 2019, 8, 7);

    expect(new YMDDate(2019, 10, 20).toString()).toEqual('2019-11-20');
    expectODate(new YMDDate('2019-11-20'), 2019, 10, 20);

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