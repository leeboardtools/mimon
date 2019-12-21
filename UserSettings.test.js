import { cleanupDir } from './FileTestHelpers';
import { setUserSettingsPathName, getUserSetting, setUserSetting } from './UserSettings';

const os = require('os');
const path = require('path');
const fsPromises = require('fs').promises;

async function createDir(dir) {
    const baseDir = path.join(os.tmpdir(), dir);
    try {
        await fsPromises.mkdir(baseDir);
    }
    catch (e) {
        // Ignore...
    }
    return baseDir;
}


test('UserSettings', async () => {
    const baseDir = await createDir('UserSettings');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'user.json');
        await setUserSettingsPathName(pathName);

        expect(await getUserSetting('abc')).toBeUndefined();
        expect(await getUserSetting('def', 'GHI')).toEqual('GHI');

        await setUserSetting('abc', '123');
        expect(await getUserSetting('abc')).toEqual('123');

        const valueDefA = { jkl: 123, lmn: [4, 5, 6] };
        await setUserSetting('def', valueDefA);
        expect(await getUserSetting('def')).toEqual(valueDefA);

        await setUserSetting('def', undefined);
        expect(await getUserSetting('def', 123)).toEqual(123);


        // Test 'override' mode.
        await setUserSetting('one', {
            abc: 'Abc',
            def: 'Def',
            ghi: 'Ghi',
            jkl: 'Jkl',
        });

        await setUserSetting('two', {
            abc: 'ABC',
            def: 'DEF',
        });

        await setUserSetting('three', {
            def: 'def',
            ghi: 'ghi',
            lmn: 'lmn',
        });

        const settingsA = await getUserSetting(['one', 'two', 'three']);
        expect(settingsA).toEqual({
            abc: 'ABC',
            def: 'def',
            ghi: 'ghi',
            jkl: 'Jkl',
            lmn: 'lmn',
        });

        const settingsB = await getUserSetting(['one', 'two', 'three'], { xyz: 'XyZ' });
        expect(settingsB).toEqual({
            abc: 'ABC',
            def: 'def',
            ghi: 'ghi',
            jkl: 'Jkl',
            lmn: 'lmn',
            xyz: 'XyZ',
        });

    }
    finally {
        // await cleanupDir(baseDir);
    }

});
