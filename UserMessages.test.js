import { setMsgs, userMsg, userError } from './UserMessages';

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

    }
    finally {
        setMsgs(prevMsgs);
    }

});
