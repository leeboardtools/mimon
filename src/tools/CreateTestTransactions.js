import * as T from '../engine/Transactions';
import { getDecimalDefinition } from '../util/Quantities';


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
                description: 'First paycheck',
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
                description: 'Lunch with Dinah',
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
            { ymdDate: '2005-02-04', close: 1.41, },
            { ymdDate: '2005-02-11', close: 1.45, },
            { ymdDate: '2005-02-18', close: 1.55, },
            { ymdDate: '2005-02-25', close: 1.59, },
            // 2 for 1 split...
            { ymdDate: '2005-02-28', close: 1.60, },
            { ymdDate: '2005-03-04', close: 1.53, },
            { ymdDate: '2005-03-11', close: 1.44, },

            // Dividend paid $0.1175
            { ymdDate: '2014-05-15', close: 21.03, },
            { ymdDate: '2014-05-19', close: 21.59, },

            { ymdDate: '2014-06-04', close: 23.03, },
            { ymdDate: '2014-06-05', close: 23.12, },
            { ymdDate: '2014-06-06', close: 23.06, },
            // 7 for 1 split...
            { ymdDate: '2014-06-09', close: 23.42, },
            { ymdDate: '2014-06-10', close: 23.56, },
            { ymdDate: '2014-06-13', close: 22.82, },
            { ymdDate: '2014-06-20', close: 22.73, },

            // Dividend paid $0.1175
            { ymdDate: '2014-08-14', close: 24.38, },
            { ymdDate: '2014-08-15', close: 24.50, },

            { ymdDate: '2015-03-12', close: 30.92, },

            { ymdDate: '2020-01-24', close: 79.58, },
            { ymdDate: '2020-01-31', close: 77.38, },

            // 4 for 1 split...
            { ymdDate: '2020-08-31', close: 129.04, },
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


        const baseArgs = {
            accountId: accountId,
            lots: lots,
            transactions: transactions,
            pricedItemId: 'AAPL',
            otherAccountId: brokerageAccountId,
        };

        //
        // A: Buy 50 sh for lot A
        //  { ymdDate: '2005-02-18', close: 1.55, },
        const lotA = 'Lot A';
        const aaplQuantityBaseValueA = 500000;
        addLotTransaction(baseArgs,
            {
                ymdDate: '2005-02-18',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotId: lotA,
                commissionBaseValue: 495,
                lotBaseValue: aaplQuantityBaseValueA,
                priceBaseValue: 155,
                splitRatio: 2 * 7 * 4,
            });

        // On 2005-02-18 have
        // A: 2005-02-18: 50.0000

        // Buy 200 shares for lotC
        // { ymdDate: '2005-03-11', close: 1.44, },
        const lotC = 'Lot C';
        const aaplQuantityBaseValueC = 2000000;
        addLotTransaction(baseArgs,
            {
                ymdDate: '2005-03-11',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotId: lotC,
                commissionBaseValue: 495,
                lotBaseValue: aaplQuantityBaseValueC,
                priceBaseValue: 144,
                splitRatio: 7 * 4,
            });
        
        // On 2014-03-11 have
        // A: 2005-02-18: 50.0000
        // C: 2005-03-11: 200.0000

        // Sell 50 shares LIFO
        // { ymdDate: '2014-05-19', close: 21.59, },
        const aaplQuantityBaseValueD = -500000;
        addLotTransaction(baseArgs,
            {
                ymdDate: '2014-05-19',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                commissionBaseValue: 495,
                autoLotType: T.AutoLotType.LIFO,
                lotBaseValue: aaplQuantityBaseValueD,
                priceBaseValue: 2159,
                splitRatio: 7 * 4,
            });
        
        // On 2014-05-19 have
        // A: 2005-02-18: 50.0000
        // C: 2005-03-11: 150.0000


        // 7 for 1 split
        const aaplChangeSplit2014_06_09 = { 
            lotId: lotA, 
            quantityBaseValue: 6 * (aaplQuantityBaseValueA 
                + aaplQuantityBaseValueC
                + aaplQuantityBaseValueD), 
        };
        transactions.push({
            ymdDate: '2014-06-09',
            description: '7 for 1 split',
            splits: [
                {
                    accountId: accountId,
                    quantityBaseValue: 0,
                    lotTransactionType: T.LotTransactionType.SPLIT,
                    lotChanges: [ aaplChangeSplit2014_06_09 ],
                }
            ],
        });
        
        // On 2014-06-09 have
        // A: 2005-02-18: 350.0000
        // C: 2005-03-11: 1050.0000


        // Buy 100 shares for lotB
        // { ymdDate: '2014-06-10', close: 23.56, },
        const lotB = 'Lot B';
        const aaplQuantityBaseValueB = 1000000;
        addLotTransaction(baseArgs,
            {
                ymdDate: '2014-06-10',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotId: lotB,
                //commissionBaseValue: 495,
                lotBaseValue: aaplQuantityBaseValueB,
                priceBaseValue: 2356,
                splitRatio: 4,
            });
        
        // On 2014-06-10 have
        // A: 2005-02-18: 350.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-10: 100.0000

        // Sell 15 shares FIFO
        //  { ymdDate: '2014-06-20', close: 22.73, },
        addLotTransaction(baseArgs,
            {
                ymdDate: '2014-06-20',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                //commissionBaseValue: 495,
                autoLotType: T.AutoLotType.FIFO,
                lotBaseValue: -150000,
                priceBaseValue: 2273,
                splitRatio: 4,
            });
        
        // On 2014-06-20 have
        // A: 2005-02-18: 335.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000


        // Reinvested Dividends
        // Dividend paid $0.1175
        // 1485 sh * 0.1175 = $174.49
        // { ymdDate: '2014-08-14', close: 24.38, },
        const lotE = 'Reinvested Dividend E';
        const aaplQuantityBaseValueE = 71571;
        addLotTransaction(baseArgs,
            {
                otherAccountId: 'INCOME-Dividends',
                ymdDate: '2014-08-14',
                lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND,
                lotId: lotE,
                lotBaseValue: aaplQuantityBaseValueE,
                priceBaseValue: 2438,
                splitRatio: 4,
            });
        
        // On 2014-08-14 have
        // A: 2005-02-18: 335.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 100.0000
        // E: 2014-08-14: 7.1570


        // Sell 10 shares from lotB, 20 shares from lotA
        // on { ymdDate: '2020-01-24', close: 79.58, },
        addLotTransaction(baseArgs,
            {
                ymdDate: '2020-01-24',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotsToSell: [
                    {
                        lotId: lotB,
                        quantityBaseValue: -100000,
                    },
                    {
                        lotId: lotA,
                        quantityBaseValue: -200000,
                    }
                ],
                //commissionBaseValue: 495,
                priceBaseValue: 7958,
                splitRatio: 4,
            });

        
        // On 2020-01-24 have
        // A: 2005-02-18: 315.0000
        // C: 2005-03-11: 1050.0000
        // B: 2014-06-13: 90.0000
        // E: 2014-08-14: 7.1570


        // Sell all of lotB
        //  { ymdDate: '2020-01-31', close: 77.38, }
        addLotTransaction(baseArgs,
            {
                ymdDate: '2020-01-31',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotsToSell: [
                    {
                        lotId: lotB,
                        quantityBaseValue: -900000,
                    },
                ],
                //commissionBaseValue: 495,
                priceBaseValue: 7738,
                splitRatio: 4,
            });

        
        // On 2020-01-31 have
        // A: 2005-02-18: 315.0000
        // C: 2005-03-11: 1050.0000
        // E: 2014-08-14: 7.1571

        // 4 for 1 split
        const aaplChangeSplit2020_08_31 = { 
            lotId: lotA, 
            quantityBaseValue: 3 * (3150000
                + 10500000
                + 71571), 
        };
        transactions.push({
            ymdDate: '2020-08-31',
            description: '4 for 1 split',
            splits: [
                {
                    accountId: accountId,
                    quantityBaseValue: 0,
                    lotTransactionType: T.LotTransactionType.SPLIT,
                    lotChanges: [ aaplChangeSplit2020_08_31 ],
                }
            ],
        });


        // Need a return of capital example...
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


function addLotTransaction(args, args2) {
    if (args2) {
        args = Object.assign({}, args, args2);
    }

    const {
        otherAccountId,
        accountId,
        lots,
        transactions,
        ymdDate,
        lotTransactionType,
        autoLotType,
        pricedItemId,
        lotId,
        commissionBaseValue, 
        lotsToSell,
        lotBaseValue,
        splitRatio,
        priceBaseValue,
    } = args;

    const currencyOD = getDecimalDefinition({
        decimalPlaces: 2,
    });
    const lotQD = getDecimalDefinition({
        decimalPlaces: 4,
    });


    const splits = [];
    const lotChanges = [];


    const priceValue = (priceBaseValue)
        ? currencyOD.baseValueToNumber(priceBaseValue)
        : 0;


    let lotQuantity = 0;
    if (lotsToSell) {
        let lotBaseValue = 0;
        lotsToSell.forEach((lotEntry) => {
            lotChanges.push(lotEntry);
            lotBaseValue += lotEntry.quantityBaseValue;
        });
        lotQuantity = lotQD.baseValueToNumber(lotBaseValue);
    }
    else {
        lotQuantity = lotQD.baseValueToNumber(lotBaseValue);
    }

    let lotValue = (lotQuantity || 0) * priceValue;
    if (splitRatio) {
        lotValue *= splitRatio;
    }

    const lotValueBaseValue = currencyOD.numberToBaseValue(lotValue);
    let costBasisBaseValue = lotValueBaseValue;
    if (commissionBaseValue) {
        costBasisBaseValue += commissionBaseValue;
    }

    if (!lotTransactionType.noShares && !autoLotType && !lotsToSell) {
        lots.push({ 
            pricedItemId: pricedItemId, 
            description: lotId, 
        });

        const lotChange = {
            lotId: lotId,
            quantityBaseValue: lotBaseValue,
            costBasisBaseValue: costBasisBaseValue,
        };
        lotChanges.push(lotChange);
    }


    let description;

    switch (lotTransactionType) {
    case T.LotTransactionType.BUY_SELL :
        if (lotValueBaseValue > 0) {
            description = 'Buy ' + lotQuantity + 'sh ' + pricedItemId;
        }
        else {
            description = 'Sell ' + lotQuantity + 'sh ' + pricedItemId;
        }
        splits.push({
            accountId: otherAccountId,
            quantityBaseValue: -costBasisBaseValue,
        });

        if (autoLotType) {
            splits.push({
                accountId: accountId,
                quantityBaseValue: lotValueBaseValue,
                lotTransactionType: lotTransactionType,
                sellAutoLotType: autoLotType,
                sellAutoLotQuantityBaseValue: -lotBaseValue,
                lotChanges: lotChanges,
            });
        }
        else {
            splits.push({
                accountId: accountId,
                quantityBaseValue: lotValueBaseValue,
                lotTransactionType: lotTransactionType,
                lotChanges: lotChanges,
            });
        }
        break;
    
    case T.LotTransactionType.REINVESTED_DIVIDEND :
        description = 'Reinvested Dividend ' + lotQuantity + 'sh ' + pricedItemId;
        splits.push({
            accountId: otherAccountId,
            quantityBaseValue: costBasisBaseValue,
        });
        splits.push({
            accountId: accountId,
            quantityBaseValue: lotValueBaseValue,
            lotTransactionType: lotTransactionType,
            lotChanges: lotChanges,
        });
        break;
    
    case T.LotTransactionType.RETURN_OF_CAPITAL :
        break;

    case T.LotTransactionType.SPLIT :
        break;
    }


    if (commissionBaseValue) {
        splits.push({
            accountId: 'EXPENSE-Brokerage Commissions',
            quantityBaseValue: commissionBaseValue,
        });
    }


    transactions.push({
        ymdDate: ymdDate,
        description: description,
        splits: splits,
    });
}