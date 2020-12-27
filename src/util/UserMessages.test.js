import { setMsgs, userMsg, userError, 
    userDateString, setDateFormatter, numberToOrdinalString } from './UserMessages';
import { YMDDate } from './YMDDate';

test('UserMessages', () => {
    const msgs = {
        'Simple-Msg': 'A simple message.',
        'Message-With-Arg': ['Prefix-', '-Suffix'],
        // eslint-disable-next-line quote-props
        'Abc': ['', ' def ', ' ghi ', ''],
        'UserMessages-Ordinal_one_suffix': 'st',
        'UserMessages-Ordinal_two_suffix': 'nd',
        'UserMessages-Ordinal_few_suffix': 'rd',
        'UserMessages-Ordinal_other_suffix': 'th',
    };
    const prevMsgs = setMsgs(msgs);

    try {
        expect(userMsg('Simple-Msg')).toEqual(msgs['Simple-Msg']);
        expect(userMsg('Message-With-Arg', 1234)).toEqual('Prefix-1234-Suffix');
        expect(userMsg('Message-With-Arg')).toEqual('Prefix--Suffix');
        expect(userMsg('Message-With-Arg', 1234, 456)).toEqual('Prefix-1234-Suffix');
        expect(userMsg('Abc', 'ZYX', 'MNO', 'QRS')).toEqual('ZYX def MNO ghi QRS');
        expect(userMsg(['ZZZ', 'Abc'], 'ZYX', 'MNO', 'QRS'))
            .toEqual('ZYX def MNO ghi QRS');
        expect(userMsg(['Simple-Msg', 'Abc'])).toEqual(msgs['Simple-Msg']);

        const testError = Error('ZYX def MNO ghi QRS');
        testError.mscCode = 'Abc';
        expect(userError('Abc', 'ZYX', 'MNO', 'QRS')).toEqual(testError);


        const ymdDateA = new YMDDate('2020-02-13');
        expect(userDateString(ymdDateA)).toEqual(ymdDateA.toString());

        const dateA = new Date(2020, 1, 13);
        expect(userDateString(dateA)).toEqual(dateA.toString());

        setDateFormatter((date) => {
            return '' + (date.getMonth() + 1) 
                + '/' + date.getDate() 
                + '/' + date.getFullYear();
        });
        expect(userDateString(ymdDateA)).toEqual('2/13/2020');
        expect(userDateString(dateA)).toEqual('2/13/2020');


        expect(numberToOrdinalString(0)).toEqual('0th');
        expect(numberToOrdinalString(1)).toEqual('1st');
        expect(numberToOrdinalString(2)).toEqual('2nd');
        expect(numberToOrdinalString(3)).toEqual('3rd');
        expect(numberToOrdinalString(4)).toEqual('4th');
        expect(numberToOrdinalString(21)).toEqual('21st');
        expect(numberToOrdinalString(22)).toEqual('22nd');
        expect(numberToOrdinalString(23)).toEqual('23rd');
        expect(numberToOrdinalString(24)).toEqual('24th');

    }
    finally {
        setMsgs(prevMsgs);
    }

});


