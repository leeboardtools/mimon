function findAccountEntry(newFileContents, accountPath) {
    const accountNames = accountPath.split('-');
    if (!accountNames.length) {
        return;
    }
    const rootAccount = newFileContents.accounts[accountNames[0]];
    if (!rootAccount || (accountNames.length === 1)) {
        return rootAccount;
    }

    let childAccounts = rootAccount;
    let account;
    for (let nameIndex = 1; nameIndex < accountNames.length; ++nameIndex) {
        account = undefined;
        for (let i = 0; i < childAccounts.length; ++i) {
            if (childAccounts[i].name === accountNames[nameIndex]) {
                account = childAccounts[i];
                break;
            }
        }
        if (!account) {
            return;
        }
        childAccounts = account.childAccounts;
    }

    return account;
}


export function createTestTransactions(newFileContents) {
    const transactions = [];
    newFileContents.transactions = transactions;

    transactions.push({
        ymdDate: '2020-01-03',
        description: 'Paycheck',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: 60000,
                description: 'Paycheck',
                reconcileState: 'RECONCILED',
            },
            {
                accountId: 'INCOME-Salary',
                quantityBaseValue: 100000,
            },
            {
                accountId: 'INCOME-Bonus',
                quantityBaseValue: 20000,
                description: 'A bonus',
            },
            {
                accountId: 'ASSET-Investments-401(k) Account',
                quantityBaseValue: 20000,
            },
            {
                accountId: 'EXPENSE-Taxes-Federal Income Tax',
                quantityBaseValue: 20000,
            },
            {
                accountId: 'EXPENSE-Taxes-State Income Tax',
                quantityBaseValue: 10000,
            },
            {
                accountId: 'EXPENSE-Taxes-Social Security',
                quantityBaseValue: 7000,
            },
            {
                accountId: 'EXPENSE-Taxes-Medicare',
                quantityBaseValue: 3000,
            },
        ]
    });

    transactions.push({
        ymdDate: '2020-01-03',
        description: 'Cash',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -10000,
                reconcileState: 'RECONCILED',
            },
            { 
                accountId: 'ASSET-Current Assets-Cash',
                quantityBaseValue: 10000,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2020-01-10',
        description: 'Phone Bill',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -5000,
                reconcileState: 'PENDING',
            },
            { 
                accountId: 'EXPENSE-Utilities-Phone',
                quantityBaseValue: 5000,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2020-01-05',
        description: 'Lunch',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Cash',
                quantityBaseValue: -500,
            },
            { 
                accountId: 'EXPENSE-Dining',
                quantityBaseValue: 500,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2020-01-17',
        description: 'Paycheck',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: 60000,
                description: 'Paycheck',
            },
            {
                accountId: 'INCOME-Salary',
                quantityBaseValue: 100000,
            },
            {
                accountId: 'EXPENSE-Taxes-Federal Income Tax',
                quantityBaseValue: 20000,
            },
            {
                accountId: 'EXPENSE-Taxes-State Income Tax',
                quantityBaseValue: 10000,
            },
            {
                accountId: 'EXPENSE-Taxes-Social Security',
                quantityBaseValue: 7000,
            },
            {
                accountId: 'EXPENSE-Taxes-Medicare',
                quantityBaseValue: 3000,
            },
        ]
    });

    transactions.push({
        ymdDate: '2020-01-30',
        description: 'Rent',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -50000,
                refNum: 1001,
            },
            { 
                accountId: 'EXPENSE-Rent',
                quantityBaseValue: 50000,
            },
        ] 
    });

    for (let i = 1; i <= 29; ++i) {
        let date = '2020-02-';
        if (i < 10) {
            date += '0';
        }
        date += i.toString();

        transactions.push({
            ymdDate: date,
            description: 'Coffee ' + i,
            splits: [
                { 
                    accountId: 'ASSET-Current Assets-Cash',
                    quantityBaseValue: -300,
                },
                { 
                    accountId: 'EXPENSE-Dining',
                    quantityBaseValue: 300,
                },
            ] 
        });
    }


    //
    // Add some stock transactions...
    // First have to add some stocks...
    const { pricedItems } = newFileContents.pricedItems;
    
    pricedItems.push({
        'type': 'SECURITY',
        'ticker': 'AAPL',
        'name': 'Apple Computer, Inc.',
        'onlineUpdateType': 'YAHOO_FINANCE',
    });
    pricedItems.push({
        'type': 'SECURITY',
        'ticker': 'MSFT',
        'name': 'Microsoft Corporation',
        'onlineUpdateType': 'YAHOO_FINANCE',
    });
    pricedItems.push({
        'type': 'SECURITY',
        'ticker': 'IBM',
        'name': 'International Business Machines, Inc.',
        'onlineUpdateType': 'YAHOO_FINANCE',
    });

    const prices = [];
    newFileContents.prices = {
        prices: prices,
    };
    prices.push({
        pricedItemId: 'AAPL',
        prices: [
            { ymdDate: '2005-02-04', close: 5.63 * 2 * 7, },
            { ymdDate: '2005-02-11', close: 5.80 * 2 * 7, },
            { ymdDate: '2005-02-18', close: 6.20 * 2 * 7, },
            { ymdDate: '2005-02-25', close: 6.36 * 2 * 7, },
            // 2 for 1 split...
            { ymdDate: '2005-02-28', close: 6.41 * 7, },
            { ymdDate: '2005-03-04', close: 6.12 * 7, },
            { ymdDate: '2005-03-11', close: 5.75 * 7, },

            { ymdDate: '2014-06-04', close: 92.12 * 7, },
            { ymdDate: '2014-06-05', close: 92.48 * 7, },
            { ymdDate: '2014-06-06', close: 92.22 * 7, },
            // 7 for 1 split...
            { ymdDate: '2014-06-09', close: 93.70, },
            { ymdDate: '2014-06-10', close: 94.25, },
            { ymdDate: '2014-06-13', close: 91.28, },
            { ymdDate: '2014-06-20', close: 90.91, },

            { ymdDate: '2015-03-12', close: 124.45, },

            { ymdDate: '2020-01-24', close: 318.31, },
            { ymdDate: '2020-01-31', close: 309.51, },

        ],
    });

    prices.push({
        pricedItemId: 'MSFT',
        prices: [
            { ymdDate: '2005-02-04', close: 26.32, },
            { ymdDate: '2005-02-11', close: 25.97, },
            { ymdDate: '2005-02-18', close: 25.48, },
            { ymdDate: '2005-02-25', close: 25.25, },
            { ymdDate: '2005-02-28', close: 25.16, },
            { ymdDate: '2005-03-04', close: 25.17, },
            { ymdDate: '2005-03-11', close: 25.09, },

            { ymdDate: '2014-06-04', close: 40.32, },
            { ymdDate: '2014-06-10', close: 41.11, },
            { ymdDate: '2014-06-13', close: 41.23, },
            { ymdDate: '2014-06-20', close: 41.68, },

            { ymdDate: '2015-03-12', close: 41.02, },

            { ymdDate: '2020-01-24', close: 165.04, },
            { ymdDate: '2020-01-31', close: 170.23, },
        ],
    });


    transactions.push({
        ymdDate: '2010-01-30',
        description: 'Opening Balance',
        splits: [
            { 
                accountId: 'ASSET-Investments-Brokerage Account',
                quantityBaseValue: 5000000,
            },
            { 
                accountId: 'EQUITY-Opening Balances',
                quantityBaseValue: 5000000,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2010-01-30',
        description: 'Opening Balance',
        splits: [
            { 
                accountId: 'ASSET-Investments-IRA Account',
                quantityBaseValue: 500000,
            },
            { 
                accountId: 'EQUITY-Opening Balances',
                quantityBaseValue: 500000,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2010-01-30',
        description: 'Opening Balance',
        splits: [
            { 
                accountId: 'ASSET-Investments-401(k) Account',
                quantityBaseValue: 100000000,
            },
            { 
                accountId: 'EQUITY-Opening Balances',
                quantityBaseValue: 100000000,
            },
        ] 
    });


    const lots = [];
    newFileContents.lots = {
        lots: lots,
    };

    const brokerageAccountId = 'ASSET-Investments-Brokerage Account';
    const brokerageAccount = findAccountEntry(newFileContents,
        brokerageAccountId);
    if (brokerageAccount) {
        const childAccounts = brokerageAccount.childAccounts || [];
        brokerageAccount.childAccounts = childAccounts;
        childAccounts.push({
            type: 'SECURITY',
            name: 'AAPL',
            pricedItemId: 'AAPL'
        });
        const accountId = 'ASSET-Investments-Brokerage Account-AAPL';

        // { ymdDate: '2014-06-04', close: 92.12 * 7, },
        const lotA = '50 sh 2014-06-04';   
        lots.push({
            pricedItemId: 'AAPL',
            description: lotA,
        });

        // { ymdDate: '2014-06-13', close: 91.28, },
        const lotB = '100 sh 2014-06-13';
        lots.push({
            pricedItemId: 'AAPL',
            description: lotB,
        });

        const commissionBaseValueA = 495;
        const aaplQuantityBaseValueA = 500000;
        const stockBaseValueA = 50 * 9212 * 7;
        const costBasisBaseValueA = commissionBaseValueA + stockBaseValueA;
        const aaplLotChangeA = { lotId: lotA, 
            quantityBaseValue: aaplQuantityBaseValueA, 
            costBasisBaseValue: costBasisBaseValueA,
        };
        transactions.push({
            ymdDate: '2014-06-04',
            description: 'Buy 50sh AAPL',
            splits: [
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: -costBasisBaseValueA,
                },
                {
                    accountId: accountId,
                    quantityBaseValue: stockBaseValueA,
                    lotChanges: [aaplLotChangeA],
                },
                {
                    accountId: 'EXPENSE-Commissions',
                    quantityBaseValue: commissionBaseValueA,
                },
            ],
        });

        const aaplChangeSplit2014_06_09 = { 
            lotId: lotA, 
            isSplitMerge: true, 
            quantityBaseValue: 6 * (aaplQuantityBaseValueA), 
        };
        transactions.push({
            ymdDate: '2014-06-09',
            description: '7 for 1 split',
            splits: [
                {
                    accountId: accountId,
                    quantityBaseValue: 0,
                    lotChanges: [ aaplChangeSplit2014_06_09 ],
                }
            ],
        });

        const commissionBaseValueB = 495;
        const stockBaseValueB = 100 * 9128;
        const costBasisBaseValueB = commissionBaseValueB + stockBaseValueB;
        const aaplLotChangeB = { lotId: lotB, 
            quantityBaseValue: 1000000, 
            costBasisBaseValue: costBasisBaseValueB,
        };
        transactions.push({
            ymdDate: '2014-06-13',
            description: 'Buy 100sh AAPL',
            splits: [
                {
                    accountId: brokerageAccountId,
                    quantityBaseValue: -costBasisBaseValueB,
                },
                {
                    accountId: accountId,
                    quantityBaseValue: stockBaseValueB,
                    lotChanges: [aaplLotChangeB],
                },
                {
                    accountId: 'EXPENSE-Commissions',
                    quantityBaseValue: commissionBaseValueB,
                },
            ],
        });


        // Sell 10 shares from lotB on { ymdDate: '2020-01-24', close: 165.04, },
        const aaplQuantityC = -10;
        const aaplQuantityBaseValueC = aaplQuantityC * 10000;
        const aaplCostBasisBaseValueC = aaplQuantityC * 16504;
        const aaplLotChangeC = {
            lotId: lotB,
            quantityBaseValue: aaplQuantityBaseValueC,
            costBasisBaseValue: aaplCostBasisBaseValueC,
        };

        const aaplQuantityD = -20;
        const applQuantityBaseValueD = aaplQuantityC * 20000;
        const aaplCostBasisBaseValueD = aaplQuantityD * 16504;
        const aaplLotChangeD = {
            lotId: lotA,
            quantityBaseValue: applQuantityBaseValueD,
            costBasisBaseValue: aaplCostBasisBaseValueD,
        };

        transactions.push({
            ymdDate: '2020-01-24',
            description: 'Sell 30sh AAPL',
            splits: [
                { accountId: brokerageAccountId, 
                    quantityBaseValue: -aaplCostBasisBaseValueC
                        - aaplCostBasisBaseValueD, 
                },
                { accountId: accountId, 
                    quantityBaseValue: aaplCostBasisBaseValueC
                        + aaplCostBasisBaseValueD, 
                    lotChanges: [ aaplLotChangeC, aaplLotChangeD ],
                },
                
            ]
        });
    }

    const iraAccount = findAccountEntry(newFileContents,
        'ASSET-Investments-IRA Account');
    if (iraAccount) {
        // 
    }

    const fourOhOneKAccount = findAccountEntry(newFileContents,
        'ASSET-Investments-401(k) Account');
    if (fourOhOneKAccount) {
        // 
    }
}


