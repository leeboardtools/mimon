import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as T from '../engine/Transactions';
import { getYMDDate } from '../util/YMDDate';
const path = require('path');

test('Reconciler', async () => {
    const baseDir = await createDir('Reconciler');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupTestEngineAccess(pathName);

        // opening balance              +100000     R   i0
        //  - transB    2000-01-24       -10000     R   i0
        //  - transD    2000-01-25        -5000     P   i1
        //  - transE    2000-01-25        -7000     R   i1
        //  - transF    2000-01-26       +60000     N   i6
        //  - transL    2010-12-01       -5000      R   i1
        //  - transM    2011-12-10       -15000     N   i1
        //  - transI    2013-12-15       -20000     N   i1
        // The reconciled total is then +78000
        // The expected reconciled balance for 2011-12-09 is +133000
        // The expected reconciled balance for 2011-12-10 is +118000
        result = await accessor.asyncGetTransactionDataItemWithId(sys.transDId);
        expect(result.splits[1].reconcileState).toEqual(
            T.ReconcileState.PENDING.name);
        
        const reconcilerA = await accessor.asyncGetAccountReconciler(sys.checkingId);
        expect(reconcilerA.isReconcileStarted()).toBeFalsy();

        expect(reconcilerA.getLastClosingInfo()).toEqual({
            closingYMDDate: getYMDDate(
                sys.checkingLastReconcileInfo.lastReconcileYMDDate),
            closingBalanceBaseValue:
                sys.checkingLastReconcileInfo.lastReconcileBalanceBaseValue,
        });


        //
        // asyncEstimateNextClosingInfo()...
        result = await reconcilerA.asyncEstimateNextClosingInfo();
        expect(result).toEqual({
            closingYMDDate: getYMDDate(
                sys.checkingLastReconcileInfo.lastReconcileYMDDate).addMonths(1),
            closingBalanceBaseValue:
                100000      // Opening balance
                - 10000     // 2000-01-24
                - 5000      // 2000-01-25
                - 7000      // 2000-01-25
                + 60000     // 2000-01-26
                - 5000      // 2010-12-01
            ,
        });

        result = await reconcilerA.asyncEstimateNextClosingInfo('2011-12-10');
        expect(result).toEqual({
            closingYMDDate: getYMDDate('2011-12-10'),
            closingBalanceBaseValue:
                100000      // Opening balance
                - 10000     // 2000-01-24
                - 5000      // 2000-01-25
                - 7000      // 2000-01-25
                + 60000     // 2000-01-26
                - 5000      // 2010-12-01
                - 15000     // 2011-12-10
            ,
        });
        


        await reconcilerA.asyncStartReconcile('2011-12-09', 133000);
        expect(reconcilerA.isReconcileStarted()).toBeTruthy();

        result = await reconcilerA.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);

        expect(await reconcilerA.asyncCanApplyReconcile()).toBeFalsy();

        let result;
        result = await reconcilerA.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
        ]));

        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }
        );
        expect(result).toBeTruthy();

        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: sys.transFId, splitIndex: 6, }
        );
        expect(result).toBeFalsy();

    
        // Mark a pending as not, make sure it's updated.
        await reconcilerA.asyncSetTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }, false);
    
        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }
        );
        expect(result).toBeFalsy();
            
        result = await reconcilerA.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000 - -5000);

        result = await accessor.asyncGetTransactionDataItemWithId(sys.transDId);
        expect(result.splits[1].reconcileState).toEqual(
            T.ReconcileState.NOT_RECONCILED.name);
        
        // Should be fine doing this again.
        await reconcilerA.asyncSetTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }, false);

        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }
        );
        expect(result).toBeFalsy();

        // Mark reconciled.
        await reconcilerA.asyncSetTransactionSplitMarkedReconciled(
            { transactionId: sys.transFId, splitIndex: 6, }, true);

        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: sys.transFId, splitIndex: 6, }
        );
        expect(result).toBeTruthy();

        result = await reconcilerA.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000 - -5000 + 60000);

        result = await accessor.asyncGetTransactionDataItemWithId(sys.transFId);
        expect(result.splits[6].reconcileState).toEqual(
            T.ReconcileState.PENDING.name);


        await reconcilerA.asyncSetTransactionSplitMarkedReconciled(
            { transactionId: sys.transDId, splitIndex: 1, }, true);
        expect(await reconcilerA.asyncCanApplyReconcile()).toBeTruthy();

        
        // Make sure asyncGetAccountReconciler() returns an already open reconciler.
        expect(await accessor.asyncGetAccountReconciler(sys.checkingId))
            .toBe(reconcilerA);

        // Cancel, should be back to where we were.
        reconcilerA.cancelReconcile();

        result = await accessor.asyncGetTransactionDataItemWithId(sys.transDId);
        expect(result.splits[1].reconcileState).toEqual(
            T.ReconcileState.PENDING.name);

        result = await accessor.asyncGetTransactionDataItemWithId(sys.transFId);
        expect(result.splits[6].reconcileState).toEqual(
            T.ReconcileState.NOT_RECONCILED.name);


        
        const reconcilerB = await accessor.asyncGetAccountReconciler(sys.checkingId);
        await reconcilerB.asyncStartReconcile('2011-12-10', +118000);

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);

        // Explicitly set transFId to reconciled.
        // Tests modify transaction
        let action;
        const accountingActions = accessor.getAccountingActions();
        result = await accessor.asyncGetTransactionDataItemWithId(sys.transFId);
        result.splits[6].reconcileState = T.ReconcileState.RECONCILED;
        action = await accountingActions.asyncCreateModifyTransactionAction(result);
        await accessor.asyncApplyAction(action);

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            //{ transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000 + 60000);


        await accessor.asyncUndoLastAppliedAction();

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);
        

        // Test add a transaction.
        action = accountingActions.createAddTransactionAction({
            ymdDate: '2010-12-01',
            splits: [
                { accountId: sys.checkingId, quantityBaseValue: -7500, },
                { accountId: sys.cashId, quantityBaseValue: 7500, },
            ],
        });
        await accessor.asyncApplyAction(action);
        const transZId = accessor.getLastAppliedActionResult().newTransactionDataItem.id;

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            { transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);

        await accessor.asyncUndoLastAppliedAction();

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            // { transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        await accessor.asyncReapplyLastUndoneAction();

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            { transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        result = reconcilerA.isTransactionSplitMarkedReconciled(
            { transactionId: transZId, splitIndex: 0, }
        );
        expect(result).toBeFalsy();

        await reconcilerB.asyncSetTransactionSplitMarkedReconciled(
            { transactionId: transZId, splitIndex: 0, }, true
        );
        result = reconcilerB.isTransactionSplitMarkedReconciled(
            { transactionId: transZId, splitIndex: 0, }
        );
        expect(result).toBeTruthy();

        result = await accessor.asyncGetTransactionDataItemWithId(transZId);
        expect(result.splits[0].reconcileState).toEqual(
            T.ReconcileState.PENDING.name);

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000 + -7500);


        // Remove transZ
        // Once we remove a transaction we lose the marked state.
        action = await accountingActions.asyncCreateRemoveTransactionAction(transZId);
        await accessor.asyncApplyAction(action);
    
        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            //{ transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);

        await accessor.asyncUndoLastAppliedAction();

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            { transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(73000);


        await accessor.asyncReapplyLastUndoneAction();
        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: false, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: false, },
            //{ transactionId: transZId, splitIndex: 0, markReconciled: false, },
        ]));

        
        await expect(reconcilerB.asyncApplyReconcile()).rejects.toThrow(Error);

        // OK, reconcile...
        reconcilerB.isDebug = true;
        await reconcilerB.asyncSetTransactionSplitMarkedReconciled(
            [
                { transactionId: sys.transDId, splitIndex: 1, },
                { transactionId: sys.transFId, splitIndex: 6, },
                { transactionId: sys.transMId, splitIndex: 1, },
            ],
            true
        );

        result = await reconcilerB.asyncGetNonReconciledSplitInfos();
        expect(result).toEqual(expect.arrayContaining([
            { transactionId: sys.transDId, splitIndex: 1, markReconciled: true, },
            { transactionId: sys.transFId, splitIndex: 6, markReconciled: true, },
            { transactionId: sys.transMId, splitIndex: 1, markReconciled: true, },
        ]));

        result = await reconcilerB.asyncGetMarkedReconciledBalanceBaseValue();
        expect(result).toEqual(118000);

        expect(await reconcilerB.asyncCanApplyReconcile()).toBeTruthy();


        // Application time
        await reconcilerB.asyncApplyReconcile();
        expect(reconcilerB.getAccountId()).toBeUndefined();

        result = await accessor.asyncGetTransactionDataItemWithId(sys.transDId);
        expect(result.splits[1].reconcileState).toEqual(T.ReconcileState.RECONCILED.name);
        
        result = await accessor.asyncGetTransactionDataItemWithId(sys.transFId);
        expect(result.splits[6].reconcileState).toEqual(T.ReconcileState.RECONCILED.name);
        
        result = await accessor.asyncGetTransactionDataItemWithId(sys.transMId);
        expect(result.splits[1].reconcileState).toEqual(T.ReconcileState.RECONCILED.name);

        result = accessor.getAccountDataItemWithId(sys.checkingId);
        expect(result.lastReconcileYMDDate).toEqual('2011-12-10');
        expect(result.lastReconcileBalanceBaseValue).toEqual(+118000);


        await accessor.asyncCloseAccountingFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }
});
