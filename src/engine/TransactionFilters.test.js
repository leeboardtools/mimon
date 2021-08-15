import * as ASTH from './AccountingSystemTestHelpers';

test('TransactionFilters', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const { accountingSystem } = sys;
    const filteringManager = sys.accountingSystem.getTransactionFilteringManager();
    const transactionManager = sys.accountingSystem.getTransactionManager();

    let result;
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId, {}
    );
    expect(result).toBeUndefined();


    const transA = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-10',
        description: 'Withdraw $100.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -10000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: 10000,
            }
        ]
    })).newTransactionDataItem;
    
    const transB = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-15',
        description: 'Withdraw $200.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -20000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: 20000,
            }
        ]
    })).newTransactionDataItem;

    const transC = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-15',
        description: 'Dinner',
        splits: [
            {
                accountId: sys.cashId,
                quantityBaseValue: -2000,
            },
            {
                accountId: sys.entertainmentId,
                quantityBaseValue: 2000,
            }
        ]
    })).newTransactionDataItem;

    const transD = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-20',
        description: 'Withdraw $10.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -1000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: 1000,
            }
        ]
    })).newTransactionDataItem;

    const transE = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-06',
        description: 'Phone Bill',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -5000,
            },
            {
                accountId: sys.phoneId,
                quantityBaseValue: 5000,
            }
        ]
    })).newTransactionDataItem;

    const transF = (await transactionManager.asyncAddTransaction({
        ymdDate: '2020-01-11',
        description: 'WithDraw $10.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: -1000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: 1000,
            }
        ]
    })).newTransactionDataItem;


    // Starts with, caps mismatch.
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'withdraw',
        }
    );

    // Note ordering is by date...
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);


    // mid-word
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
        }
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);


    // Add date filtering...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
            earliestYMDDate: '2020-01-11',
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
            latestYMDDate: '2020-01-11',
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
    ]);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
            earliestYMDDate: '2020-01-11',
            latestYMDDate: '2020-01-11',
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
    ]);


    //
    // With amount

    // For checking account the quantities are -
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: 10000,
            largestQuantityBaseValue: 20000,
        },
    );
    expect(result).toEqual([]);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: -20000,
            largestQuantityBaseValue: -10000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
    ]);

    // for cash account the quantities are +
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: 10000,
            largestQuantityBaseValue: 20000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
    ]);

    // smallestQuantityBaseValue limit check...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: 10001,
            largestQuantityBaseValue: 20000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
    ]);

    // largestQuantityBaseValue limit check...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: 10000,
            largestQuantityBaseValue: 19999,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
    ]);

    // Only smallestQuantityBaseValue...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            description: 'WITH',
            smallestQuantityBaseValue: 10000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
    ]);

    // Only largestQuantityBaseValue...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            description: 'WITH',
            largestQuantityBaseValue: 10000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);


    //
    // No filtering...
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.cashId,
        {
            smallestQuantityBaseValue: -5000,
            largestQuantityBaseValue: 1000,
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transC.id,      // 2020-01-15 Dinner Cash -$20.00
            transactionDataItem: transC,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);
    
    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            earliestYMDDate: '2020-01-06',
            latestYMDDate: '2020-01-15',
        },
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transE.id,      // 2020-01-06 Phone Bill $50.00
            transactionDataItem: transE,
        }),
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
    ]);


    //
    // Modify a transaction...
    filteringManager.isDebug = true;
    result = (await transactionManager.asyncModifyTransaction({
        id: transF.id,
        ymdDate: '2020-01-11',
        description: 'Deposit $10.00',
        splits: [
            {
                accountId: sys.checkingId,
                quantityBaseValue: 1000,
            },
            {
                accountId: sys.cashId,
                quantityBaseValue: -1000,
            }
        ]
    }));
    const transF2 = result.newTransactionDataItem;
    let undoId = result.undoId;

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'withdraw',
        }
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transB.id,      // 2020-01-15 Withdraw $200.00
            transactionDataItem: transB,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'DEP',
        }
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transF2.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF2,
        }),
    ]);


    //
    // Undo the modify...
    await accountingSystem.getUndoManager().asyncUndoToId(undoId);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: 'DEP',
        }
    );
    expect(result).toEqual([
    ]);


    //
    // Delete a transaction...
    result = await transactionManager.asyncRemoveTransaction(transD.id);
    undoId = result.undoId;

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
        }
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
    ]);


    //
    // Undo the delete...
    await accountingSystem.getUndoManager().asyncUndoToId(undoId);

    result = await filteringManager.asyncGetFilteredTransactionKeysForAccount(
        sys.checkingId,
        {
            description: '$10',
        }
    );
    expect(result).toEqual([
        expect.objectContaining({
            id: transA.id,      // 2020-01-10 Withdraw $100.00
            transactionDataItem: transA,
        }),
        expect.objectContaining({
            id: transF.id,      // 2020-01-11 Withdraw $10.00
            transactionDataItem: transF,
        }),
        expect.objectContaining({
            id: transD.id,      // 2020-01-20 Withdraw $10.00
            transactionDataItem: transD,
        }),
    ]);
});