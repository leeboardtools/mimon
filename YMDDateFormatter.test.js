import * as F from './YMDDateFormatter';
import * as YMD from './YMDDate';

test('YMDDateFormatter-format', () => {

    const ymdDateA = YMD.getYMDDate('2001-02-03');
    const dateA = new Date(2001, 1, 3);

    let json;
    let result;

    const formatterA = new F.YMDDateFormatter(
        F.FormatPart.DATE_2_DIGIT, 
        '/', 
        F.FormatPart.MONTH_2_DIGIT, 
        '/', 
        F.FormatPart.YEAR_2_DIGIT);
    expect(formatterA.formatDate(ymdDateA)).toEqual('03/02/01');
    expect(formatterA.formatDate(dateA)).toEqual('03/02/01');

    json = formatterA.toJSON();
    expect(F.YMDDateFormatter.fromJSON(json).formatDate(ymdDateA)).toEqual('03/02/01');

    result = formatterA.parseText('03/02/01');
    expect(result).toEqual(ymdDateA);


    const formatterB = new F.YMDDateFormatter([
        F.FormatPart.MONTH_ANY_DIGIT, 
        '-',
        F.FormatPart.DATE_ANY_DIGIT,
        '-',
        F.FormatPart.YEAR_4_DIGIT, 
    ]);
    expect(formatterB.formatDate(ymdDateA)).toEqual('2-3-2001');
    expect(formatterB.formatDate(dateA)).toEqual('2-3-2001');

    json = formatterB.toJSON();
    expect(F.YMDDateFormatter.fromJSON(json).formatDate(ymdDateA)).toEqual('2-3-2001');

    result = formatterB.parseText('2-3-2001');
    expect(result).toEqual(ymdDateA);

    expect(formatterB.parseText('2-2001')).toBeUndefined();


    // Default
    const formatterC = new F.YMDDateFormatter();
    const defaultRef = new Intl.DateTimeFormat().format(dateA);
    expect(formatterC.formatDate(ymdDateA)).toEqual(defaultRef);
    expect(formatterC.formatDate(dateA)).toEqual(defaultRef);
    
    json = formatterC.toJSON();
    expect(F.YMDDateFormatter.fromJSON(json).formatDate(ymdDateA)).toEqual(defaultRef);

    // Note that it's quite possible for parseText to fail.
    result = formatterC.parseText(defaultRef);
    expect(result).toEqual(ymdDateA);


    // Locale
    const localeGB = 'en-GB';
    const formatterD = new F.YMDDateFormatter(localeGB);
    const localeGBRef = new Intl.DateTimeFormat(localeGB).format(dateA);
    expect(formatterD.formatDate(ymdDateA)).toEqual(localeGBRef);
    expect(formatterD.formatDate(dateA)).toEqual(localeGBRef);

    json = formatterD.toJSON();
    expect(F.YMDDateFormatter.fromJSON(json).formatDate(ymdDateA)).toEqual(localeGBRef);

    const localeUS = 'en-US';
    const formatterE = new F.YMDDateFormatter(localeUS);
    const localeUSRef = new Intl.DateTimeFormat(localeUS).format(dateA);
    expect(formatterE.formatDate(ymdDateA)).toEqual(localeUSRef);
    expect(formatterE.formatDate(dateA)).toEqual(localeUSRef);


});
