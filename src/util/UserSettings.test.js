import { cleanupDir } from './FileTestHelpers';
import { setUserSettingsPathName, asyncGetUserSetting, 
    asyncSetUserSetting } from './UserSettings';
import * as path from 'path';
import * as os from 'os';
import { promises as fsPromises } from 'fs';


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

        expect(await asyncGetUserSetting('abc')).toBeUndefined();
        expect(await asyncGetUserSetting('def', 'GHI')).toEqual('GHI');

        await asyncSetUserSetting('abc', '123');
        expect(await asyncGetUserSetting('abc')).toEqual('123');

        const valueDefA = { jkl: 123, lmn: [4, 5, 6] };
        await asyncSetUserSetting('def', valueDefA);
        expect(await asyncGetUserSetting('def')).toEqual(valueDefA);

        await asyncSetUserSetting('def', undefined);
        expect(await asyncGetUserSetting('def', 123)).toEqual(123);


        // Test 'override' mode.
        await asyncSetUserSetting('one', {
            abc: 'Abc',
            def: 'Def',
            ghi: 'Ghi',
            jkl: 'Jkl',
        });

        await asyncSetUserSetting('two', {
            abc: 'ABC',
            def: 'DEF',
        });

        await asyncSetUserSetting('three', {
            def: 'def',
            ghi: 'ghi',
            lmn: 'lmn',
        });

        const settingsA = await asyncGetUserSetting(['one', 'two', 'three']);
        expect(settingsA).toEqual({
            abc: 'ABC',
            def: 'def',
            ghi: 'ghi',
            jkl: 'Jkl',
            lmn: 'lmn',
        });

        const settingsB = await asyncGetUserSetting(
            ['one', 'two', 'three'], { xyz: 'XyZ' });
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
