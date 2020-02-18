import { JSONGzipAccountingFileFactory } from '../engine/JSONGzipAccountingFile';
import { EngineAccessor } from './EngineAccess';
import * as ASTH from '../engine/AccountingSystemTestHelpers';


export async function asyncSetupTestEngineAccess(pathName) {
    // Create a test JSONGzip file.
    const factory = new JSONGzipAccountingFileFactory();

    const originalFile = await factory.asyncCreateFile(pathName);
    const accountingSystem = originalFile.getAccountingSystem();
    const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem);
    await ASTH.asyncAddOpeningBalances(sys);
    await ASTH.asyncAddBasicTransactions(sys);

    await originalFile.asyncWriteFile();
    await originalFile.asyncCloseFile();

    const accessor = new EngineAccessor();
    await accessor.asyncOpenAccountingFile(pathName);

    return {
        accessor: accessor,
        sys: sys,
    };
}