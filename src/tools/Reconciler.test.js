import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import { getYMDDate } from '../util/YMDDate';
const path = require('path');

test('Reconciler', async () => {
    const baseDir = await createDir('Reconciler');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupTestEngineAccess(pathName);

        const reconcilerA = await accessor.asyncGetAccountReconciler(sys.checkingId);
        expect(reconcilerA.isReconcileStarted()).toBeFalsy();

        // opening balance              +100000     R   i0
        //  - transB    2000-01-24       -10000     R   i0
        //  - transD    2000-01-25        -5000     R   i1
        //  - transE    2000-01-25        -7000     R   i1
        //  - transF    2000-01-26       +60000     N   i6
        //  - transL    2010-12-01       -5000      P   i1
        //  - transM    2011-12-10       -15000     N   i1
        //  - transI    2013-12-15       -20000     N   i1
        // The reconciled total is then +78000
        // The expected reconciled balance for 2011-12-09 is 133000
        // The expected reconciled balance for 2011-12-10 is 118000
        expect(reconcilerA.getLastClosingInfo()).toEqual({
            closingYMDDate: getYMDDate(
                sys.checkingLastReconcileInfo.lastReconcileYMDDate),
            closingBalanceBaseValue:
                sys.checkingLastReconcileInfo.lastReconcileBalanceBaseValue,
        });

        await reconcilerA.asyncStartReconcile('2011-12-09', 133000);
        expect(reconcilerA.isReconcileStarted()).toBeTruthy();
        expect(await reconcilerA.asyncCanApplyReconcile()).toBeFalsy();

        let result;
        result = await reconcilerA.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transLId, splitIndex: 1, markReconciled: true, },
        ]));

        await accessor.asyncCloseAccountingFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }
});
