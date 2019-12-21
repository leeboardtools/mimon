import { YMDate } from './YMDate';

function expectODate(oDate, year, month, dom) {
    expect(oDate.getFullYear()).toEqual(year);
    expect(oDate.getMonth()).toEqual(month);
    expect(oDate.getDOM()).toEqual(dom);
}


//
//-----------------------------------------------
//
test('YMDate', () => {

    expectODate(new YMDate(2019, 8, 7), 2019, 8, 7);
    expectODate(new YMDate(new Date(2019, 8, 7)), 2019, 8, 7);
    expect(new YMDate(2019, 8, 7).toString()).toEqual('2019-09-07');
    expectODate(new YMDate('2019-09-07'), 2019, 8, 7);

    expect(new YMDate(2019, 10, 20).toString()).toEqual('2019-11-20');
    expectODate(new YMDate('2019-11-20'), 2019, 10, 20);

    const dateA = new YMDate(2019, 9, 31);
    const dateB = new YMDate(2019, 10, 1);
    expect(YMDate.compare(dateA, dateB)).toBeLessThan(0);
    expect(YMDate.compare(dateB, dateA)).toBeGreaterThan(0);
    expect(YMDate.compare(dateA, dateA)).toEqual(0);

    expect(dateA.daysAfterMe(dateB)).toEqual(1);
    expect(dateB.daysAfterMe(dateA)).toEqual(-1);

    const optionsA = dateA.toOptions();
    expect(optionsA).toEqual({ year: 2019, month: 9, dom: 31 });

    const copyA = YMDate.fromOptions(optionsA);
    expect(copyA).toEqual(dateA);
    expect(YMDate.compare(dateA, copyA)).toEqual(0);

    const copyAA = YMDate.fromOptions(copyA);
    expect(copyAA === copyA).toBeTruthy();


    const dateC = dateB.addDays(1);
    expect(dateC).toEqual(new YMDate(2019, 10, 2));

    const dateD = dateB.addDays(29);
    expect(dateD).toEqual(new YMDate(2019, 10, 30));

    const dateE = dateD.addDays(-29);
    expect(dateE).toEqual(dateB);
});

//
//-----------------------------------------------
//
test('YMDate-orderYMDatePair', () => {
    const dateA = new YMDate(2019, 10, 11);
    const dateB = new YMDate(2019, 10, 12);
    expect(YMDate.orderYMDatePair(dateA, dateB)).toEqual([dateA, dateB]);
    expect(YMDate.orderYMDatePair(dateB, dateA)).toEqual([dateA, dateB]);

    expect(YMDate.orderYMDatePair([dateA, dateB])).toEqual([dateA, dateB]);
    expect(YMDate.orderYMDatePair([dateB, dateA])).toEqual([dateA, dateB]);
    expect(YMDate.orderYMDatePair(dateA)).toEqual([dateA, dateA]);

});