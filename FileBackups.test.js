import { parseDecimalInteger, defMakeBackupFileName, defParseBackupFileName, 
    FileBackups } from './FileBackups';
import { createDir, cleanupDir, writeFile, expectFileToBe } from './FileTestHelpers';
import { ReplaceFileAction, DeleteFileAction, performFileActions, 
    asyncFileExists } from './FileActions';
import * as path from 'path';


test('parseDecimalInteger', () => {
    expect(parseDecimalInteger('1234')).toEqual(1234);
    expect(parseDecimalInteger('-2')).toEqual(-2);
    expect(parseDecimalInteger('  34')).toEqual(34);
    expect(parseDecimalInteger('  -34')).toEqual(-34);

    expect(parseDecimalInteger('abc')).toBeUndefined();
    expect(parseDecimalInteger('12c')).toBeUndefined();
});


test('defMakeBackupFileName', () => {
    expect(defMakeBackupFileName('Abc.TXT', new Date(2019, 0, 4)))
        .toEqual('BAK_20190104_Abc.TXT');

//    expect(defMakeBackupLogFileName('/abc', new Date(2019, 0, 4)))
//      .toEqual('BAKLOG_20190104_Log.json');
});


test('defParseBackupFileName', () => {
    expect(defParseBackupFileName('BAK_20190104_Test.TXT')).toEqual({
        date: new Date(2019, 0, 4),
        originalFileName: 'Test.TXT',
    });
    expect(defParseBackupFileName('BAK_20190104_BAK_20181004_Test.TXT')).toEqual({
        date: new Date(2019, 0, 4),
        originalFileName: 'BAK_20181004_Test.TXT',
    });

    // Missing separators.
    expect(defParseBackupFileName('BAK20190104_Test.TXT')).toBeUndefined();
    expect(defParseBackupFileName('BAK_20190104Test.TXT')).toBeUndefined();

    // Check invalid dates.
    expect(defParseBackupFileName('BAK_20191304_Test.TXT')).toBeUndefined();
    expect(defParseBackupFileName('BAK_20190229_Test.TXT')).toBeUndefined();

    // Leap year...
    expect(defParseBackupFileName('BAK_20200229_Test.TXT')).toEqual({
        date: new Date(2020, 1, 29),
        originalFileName: 'Test.TXT',
    });
});


test('FileBackups', async () => {
    const baseDir = await createDir('FileBackups');
    try {
        await cleanupDir(baseDir, true);

        const fileBackups = new FileBackups({ maxBackups: 2 });

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');

        const fileActionsA = [
            new ReplaceFileAction(pathA, async (pathName) => {
                await writeFile(pathName, 'A');
            }),
            new ReplaceFileAction(pathB, async (pathName) => {
                await writeFile(pathName, 'B');
            }),
        ];

        const dateA = new Date(2018, 1, 2);
        await fileBackups.applyToFileActions(fileActionsA, dateA);
        await performFileActions(fileActionsA);

        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'B');



        const fileActionsB = [
            new ReplaceFileAction(pathA, async (pathName) => {
                await writeFile(pathName, 'A1');
            }),
            new DeleteFileAction(pathB),
        ];

        const dateB = new Date(2018, 2, 3);
        await fileBackups.applyToFileActions(fileActionsB, dateB);
        await performFileActions(fileActionsB);


        const backupsB = await fileBackups.getBackups(baseDir);

        expect(backupsB).toEqual([
            {
                date: dateB,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20180303_A.txt'),
                        originalFileName: 'A.txt',
                    },
                    {
                        pathName: path.join(baseDir, 'BAK_20180303_B.txt'),
                        originalFileName: 'B.txt',
                    },
                ]
            }
        ]);


        const fileActionsC = [
            new ReplaceFileAction(pathA, async (pathName) => {
                await writeFile(pathName, 'A2');
            }),
            new ReplaceFileAction(pathB, async (pathName) => {
                await writeFile(pathName, 'B2');
            }),
        ];

        const dateC = new Date(2019, 1, 4);
        await fileBackups.applyToFileActions(fileActionsC, dateC);
        await performFileActions(fileActionsC);

        const backupsC = await fileBackups.getBackups(baseDir);
        expect(backupsC).toEqual([
            {
                date: dateC,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20190204_A.txt'),
                        originalFileName: 'A.txt',
                    },
                ]
            },
            {
                date: dateB,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20180303_A.txt'),
                        originalFileName: 'A.txt',
                    },
                    {
                        pathName: path.join(baseDir, 'BAK_20180303_B.txt'),
                        originalFileName: 'B.txt',
                    },
                ]
            },
        ]);


        // At this point we have:
        // A.txt
        // B.txt
        // BAK_20180303_A.txt
        // BAK_20180303_B.txt
        // BAK_20190204_A.txt

        const governedFiles = ['A.txt', 'B.txt'];
        await fileBackups.restoreBackup(backupsC[1], governedFiles);
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'B');

        await fileBackups.restoreBackup(backupsC[0], governedFiles);
        await expectFileToBe(pathA, 'A1');
        expect(await asyncFileExists(pathB)).toBeFalsy();

        await fileBackups.restoreBackup(backupsC[1], governedFiles);
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'B');

        // Check removal of obsolete backup files.
        await fileBackups.restoreBackup(backupsC[0], governedFiles);
        await expectFileToBe(pathA, 'A1');
        expect(await asyncFileExists(pathB)).toBeFalsy();

        const fileActionsD = [
            new ReplaceFileAction(pathA, async (pathName) => {
                await writeFile(pathName, 'Z');
            }),
        ];
        await fileBackups.applyToFileActions(fileActionsD, dateB);
        await performFileActions(fileActionsD);

        const backupsD = await fileBackups.getBackups(baseDir);
        expect(backupsD).toEqual([
            {
                date: dateC,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20190204_A.txt'),
                        originalFileName: 'A.txt',
                    },
                ]
            },
            {
                date: dateB,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20180303_A.txt'),
                        originalFileName: 'A.txt',
                    },
                ]
            },
        ]);

        // Test auto-deleting of backups.
        const dateD = new Date(2019, 4, 6);
        const fileActionsE = [
            new ReplaceFileAction(pathA, async (pathName) => {
                await writeFile(pathName, 'X');
            }),
        ];
        await fileBackups.applyToFileActions(fileActionsE, dateD);
        await performFileActions(fileActionsE);

        const backupsE = await fileBackups.getBackups(baseDir);
        expect(backupsE).toEqual([
            {
                date: dateD,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20190506_A.txt'),
                        originalFileName: 'A.txt',
                    },
                ]
            },
            {
                date: dateC,
                fileNames: [
                    {
                        pathName: path.join(baseDir, 'BAK_20190204_A.txt'),
                        originalFileName: 'A.txt',
                    },
                ]
            },
        ]);
    }
    finally {
        // cleanupDir(baseDir);
    }
});
