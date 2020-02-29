import { createDir, cleanupDir, writeFile, expectFileToBe } from './FileTestHelpers';
import { DeleteFileAction, RenameFileAction, ReplaceFileAction, 
    performFileActions, KeepFileAction, getFullPathName, CopyFileAction 
} from './FileActions';
import { fileExists } from './Files';

const path = require('path');
const fsPromises = require('fs').promises;

test('FileNameHelpers', () => {
    const pathA = path.join('Abc', 'Def');
    const pathB = path.join(pathA, 'Ghi.TXT');
    expect(getFullPathName('XYZ.TXT', pathB)).toEqual(path.join(pathA, 'XYZ.TXT'));

    const pathC = path.join('mno', 'XYZ.TXT');
    expect(getFullPathName(pathC, pathB)).toEqual(pathC);
});


test('DeleteFileAction', async () => {
    const baseDir = await createDir('DeleteFileAction');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        const doNothingAction = new DeleteFileAction(pathA);
        await doNothingAction.apply();
        await doNothingAction.finalize();

        await writeFile(pathA, 'Hello');
        await writeFile(pathB, 'Goodbye');

        expect(await fileExists(pathA)).toBeTruthy();
        expect(await fileExists(pathB)).toBeTruthy();


        // Test finalize()
        const deleteA = new DeleteFileAction(pathA);
        await deleteA.apply();
        expect(await fileExists(pathA)).toBeFalsy();

        await deleteA.finalize();
        expect(await fileExists(pathA)).toBeFalsy();


        // Test revert()
        const deleteB = new DeleteFileAction(pathB);
        await deleteB.apply();
        expect(await fileExists(pathB)).toBeFalsy();

        await deleteB.revert();
        expect(await fileExists(pathB)).toBeTruthy();


        // Test setBackup(), finalize()
        const deleteC = new DeleteFileAction(pathB);
        deleteC.setBackupFileName(pathC);
        await deleteC.apply();
        expect(await fileExists(pathB)).toBeFalsy();
        expect(await fileExists(pathC)).toBeTruthy();

        await deleteC.finalize();
        expect(await fileExists(pathB)).toBeFalsy();
        expect(await fileExists(pathC)).toBeTruthy();

        // Test setBackup(), revert().
        const deleteD = new DeleteFileAction(pathC);
        deleteD.setBackupFileName(pathB);
        await deleteD.apply();
        expect(await fileExists(pathC)).toBeFalsy();
        expect(await fileExists(pathB)).toBeTruthy();

        await deleteD.revert();
        expect(await fileExists(pathB)).toBeFalsy();
        expect(await fileExists(pathC)).toBeTruthy();

    }
    finally {
        cleanupDir(baseDir);
    }
});


test('RenameFileAction', async () => {
    const baseDir = await createDir('RenameFileAction');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        const doNothingAction = new RenameFileAction(pathA, pathB);
        await doNothingAction.apply();
        await doNothingAction.finalize();

        await writeFile(pathA, 'Abc');

        // Test finalize()
        const renameAToB = new RenameFileAction(pathA, pathB);
        await renameAToB.apply();
        expect(await fileExists(pathA)).toBeFalsy();
        await expectFileToBe(pathB, 'Abc');

        await renameAToB.finalize();
        expect(await fileExists(pathA)).toBeFalsy();
        await expectFileToBe(pathB, 'Abc');


        // Test revert()
        await writeFile(pathC, 'C');

        const renameBToC = new RenameFileAction(pathB, pathC);
        await renameBToC.apply();
        await expectFileToBe(pathC, 'Abc');
        expect(await fileExists(pathB)).toBeFalsy();

        await renameBToC.revert();
        await expectFileToBe(pathC, 'C');
        await expectFileToBe(pathB, 'Abc');
    }
    finally {
        cleanupDir(baseDir);
    }
});


test('ReplaceFileAction', async () => {
    const baseDir = await createDir('ReplaceFileAction');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        // const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        // Test finalize, applyCallback, finalizeCallback
        let isFinalized = false;
        const actionA = new ReplaceFileAction(pathA, {
            applyCallback: async (pathName) => {
                await writeFile(pathName, 'A');
            },
            finalizeCallback: () => {
                isFinalized = true;
            },
        });

        expect(await fileExists(pathA)).toBeFalsy();

        await actionA.apply();
        await expectFileToBe(pathA, 'A');

        await actionA.revert();
        expect(await fileExists(pathA)).toBeFalsy();

        await actionA.apply();
        await actionA.finalize();
        await expectFileToBe(pathA, 'A');
        expect(isFinalized).toBeTruthy();


        // Test revert()
        const actionB = new ReplaceFileAction(pathA, async (pathName) => {
            await writeFile(pathName, 'B');
        });
        await actionB.apply();
        await expectFileToBe(pathA, 'B');

        await actionB.revert();
        await expectFileToBe(pathA, 'A');
        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);


        // Test backup file revert(), revert callback
        let isReverted = false;
        const actionC = new ReplaceFileAction(pathA, {
            applyCallback: async (pathName) => {
                await writeFile(pathName, 'C');
            },
            revertCallback: async (pathName) => {
                isReverted = true;
            }
        });
        actionC.setBackupFileName(pathC);

        await actionC.apply();
        await expectFileToBe(pathA, 'C');
        await expectFileToBe(pathC, 'A');

        await actionC.revert();
        await expectFileToBe(pathA, 'A');
        expect(await fileExists(pathC)).toBeFalsy();
        expect(isReverted).toBeTruthy();

        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);

        const pathD = path.join(baseDir, 'D.txt');
        const actionD = new ReplaceFileAction(pathD, async (pathName) => {
            await fsPromises.writeFile(pathName, 'D');
        });
        actionD.setNoFileBackupFileName('E.txt');

        const pathE = path.join(baseDir, 'E.txt');

        await actionD.apply();
        await expectFileToBe(pathD, 'D');
        await expectFileToBe(pathE, '');

        await actionD.revert();
        expect(await fileExists(pathD)).toBeFalsy();
        expect(await fileExists(pathE)).toBeFalsy();

    }
    finally {
        cleanupDir(baseDir);
    }
});


test('KeepFileAction', async () => {
    const baseDir = await createDir('KeepFileAction');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        const doNothingAction = new KeepFileAction(pathA);
        await doNothingAction.apply();
        await doNothingAction.finalize();

        expect(await fsPromises.readdir(baseDir)).toEqual([]);


        // No backup finalize.
        await writeFile(pathA, 'A');
        const actionA = new KeepFileAction(pathA);
        await actionA.apply();
        await expectFileToBe(pathA, 'A');
        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);

        await actionA.finalize();
        await expectFileToBe(pathA, 'A');
        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);


        // No backup revert.
        const actionB = new KeepFileAction(pathA);
        await actionB.apply();
        await expectFileToBe(pathA, 'A');
        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);

        await actionB.revert();
        await expectFileToBe(pathA, 'A');
        expect(await fsPromises.readdir(baseDir)).toEqual(['A.txt']);


        // Backup revert.
        const actionC = new KeepFileAction(pathA);
        actionC.setBackupFileName(pathB);
        await actionC.apply();
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'A');

        await actionC.revert();
        await expectFileToBe(pathA, 'A');
        expect(await fileExists(pathB)).toBeFalsy();


        // Backup finalize.
        const actionD = new KeepFileAction(pathA);
        actionD.setBackupFileName(pathC);
        await actionD.apply();
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathC, 'A');

        await actionD.finalize();
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathC, 'A');

    }
    finally {
        cleanupDir(baseDir);
    }

});


test('performFileActions', async () => {
    const baseDir = await createDir('performFileActions');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        await writeFile(pathA, 'A');
        await writeFile(pathB, 'B');

        const actionA = new DeleteFileAction(pathA);
        const actionB = new RenameFileAction(pathB, pathA);
        const actionC = new ReplaceFileAction(pathC, async (pathName) => {
            await writeFile(pathName, 'C');
        });

        const actions = [actionA, actionB, actionC];
        await performFileActions(actions);

        expect(await fileExists(pathB)).toBeFalsy();
        await expectFileToBe(pathA, 'B');
        await expectFileToBe(pathC, 'C');


        await cleanupDir(baseDir, true);
        const actionD = new ReplaceFileAction(pathC, async (pathName) => {
            throw Error('TEST_FAIL');
        });
        actionD.isDebug = true;

        await writeFile(pathA, 'A');
        await writeFile(pathB, 'B');

        try {
            await performFileActions([actionA, actionB, actionC, actionD]);
        }
        catch (e) {
            expect(e.message).toEqual('TEST_FAIL');
        }

        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'B');
    }
    finally {
        cleanupDir(baseDir);
    }
});



test('CopyFileAction', async () => {
    const baseDir = await createDir('CopyFileAction');
    try {
        await cleanupDir(baseDir, true);

        const pathA = path.join(baseDir, 'A.txt');
        const pathB = path.join(baseDir, 'B.txt');
        const pathC = path.join(baseDir, 'C.txt');

        await writeFile(pathA, 'A');

        const actionA = new CopyFileAction(pathA, 'B.txt');
        await actionA.apply();
        await expectFileToBe(pathB, 'A');

        // Test finalize()
        await actionA.finalize();
        await expectFileToBe(pathA, 'A');
        await expectFileToBe(pathB, 'A');

        // Test revert()
        // Also test path specified on new file, not original file name.
        const actionB = new CopyFileAction('B.txt', pathC);
        await actionB.apply();
        await expectFileToBe(pathC, 'A');

        await actionB.revert();
        await expectFileToBe(pathB, 'A');
        expect(await fileExists(pathC)).toBeFalsy();

        // Test setBackup(), finalize()
        const pathD = path.join(baseDir, 'D.txt');
        await writeFile(pathB, 'B');
        const actionC = new CopyFileAction(pathA, pathB);

        actionC.setBackupFileName(pathD);
        await actionC.apply();
        await expectFileToBe(pathD, 'B');
        await expectFileToBe(pathB, 'A');

        await actionC.finalize();
        await expectFileToBe(pathD, 'B');

        // Test setBackup(), revert().
        await writeFile(pathB, 'B');
        await fsPromises.unlink(pathD);

        const actionD = new CopyFileAction(pathA, pathB);
        actionD.setBackupFileName(pathD);
        await actionD.apply();
        await expectFileToBe(pathD, 'B');
        await expectFileToBe(pathB, 'A');

        await actionD.revert();
        await expectFileToBe(pathB, 'B');
        expect(await fileExists(pathD)).toBeFalsy();

    }
    finally {
        cleanupDir(baseDir);
    }
});
