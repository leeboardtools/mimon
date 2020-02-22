import { setMsgs, userMsg, userError, 
    userDateString, setDateFormatter } from './UserMessages';
import { YMDDate } from './YMDDate';

test('UserMessages', () => {
    const msgs = {
        'Simple-Msg': 'A simple message.',
        'Message-With-Arg': ['Prefix-', '-Suffix'],
        // eslint-disable-next-line quote-props
        'Abc': ['', ' def ', ' ghi ', ''],
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
    }
    finally {
        setMsgs(prevMsgs);
    }

});
