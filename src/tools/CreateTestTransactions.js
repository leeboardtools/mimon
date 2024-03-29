/* eslint-disable max-len */
import * as T from '../engine/Transactions';
import { getDecimalDefinition } from '../util/Quantities';
import * as DO from '../util/DateOccurrences';


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


export function createTestTransactions(newFileContents, options) {
    options = options || {};
    const transactions = [];
    newFileContents.transactions = {
        transactions: transactions,
    };

    

    transactions.push({
        ymdDate: '2010-01-30',
        description: 'Opening Balance',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: 500000,
            },
            { 
                accountId: 'EQUITY-Opening Balances',
                quantityBaseValue: 500000,
            },
        ] 
    });



    transactions.push({
        ymdDate: '2015-01-03',
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
                accountId: 'EXPENSE-Taxes-Social Security',
                quantityBaseValue: 7000,
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
                accountId: 'EXPENSE-Taxes-Medicare',
                quantityBaseValue: 3000,
            },
            {
                accountId: 'INCOME-Bonus',
                quantityBaseValue: 20000,
                description: 'A bonus',
            },
        ]
    });

    transactions.push({
        ymdDate: '2015-01-03',
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
        ymdDate: '2015-01-10',
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
        ymdDate: '2015-01-05',
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
        ymdDate: '2015-01-17',
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
        ymdDate: '2015-01-30',
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

    transactions.push({
        ymdDate: '2015-01-24',
        description: 'Power Bill',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -7000,
            },
            { 
                accountId: 'EXPENSE-Utilities-Power',
                quantityBaseValue: 7000,
            },
        ] 
    });

    transactions.push({
        ymdDate: '2015-01-24',
        description: 'Gas Bill',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -10000,
            },
            { 
                accountId: 'EXPENSE-Utilities-Gas',
                quantityBaseValue: 10000,
            },
        ] 
    });

    for (let i = 1; i <= 29; ++i) {
        let date = '2015-02-';
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

    transactions.push({
        ymdDate: '2015-06-30',
        description: 'House Mortgage',
        splits: [
            { 
                accountId: 'ASSET-Fixed Assets-House',
                quantityBaseValue: 40000000,
            },
            { 
                accountId: 'LIABILITY-Loans-Home Mortgage',
                quantityBaseValue: 40000000,
            },
        ] 
    });


    transactions.push({
        ymdDate: '2015-07-30',
        description: 'Mortgage',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -100000,
            },
            { 
                accountId: 'LIABILITY-Loans-Home Mortgage',
                quantityBaseValue: -20000,
            },
            { 
                accountId: 'EXPENSE-Interest-Mortgage Interest',
                quantityBaseValue: 70000,
            },
            { 
                accountId: 'ASSET-Other-Mortgage Escrow',
                quantityBaseValue: 10000,
            },
        ] 
    });


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
    pricedItems.push({
        'type': 'SECURITY',
        'ticker': 'INTC',
        'name': 'Intel Corporation',
        'onlineUpdateType': 'YAHOO_FINANCE',
    });

    const prices = [];
    newFileContents.prices = {
        prices: prices,
    };
    prices.push({
        pricedItemId: 'AAPL',
        prices: [
            { ymdDate: '2005-02-04', close: 1.41 * 2 * 7 * 4, },
            { ymdDate: '2005-02-11', close: 1.45 * 2 * 7 * 4, },
            { ymdDate: '2005-02-18', close: 1.55 * 2 * 7 * 4, },
            { ymdDate: '2005-02-25', close: 1.59 * 2 * 7 * 4, },
            // 2 for 1 split...
            { ymdDate: '2005-02-28', newCount: 2, oldCount: 1, },
            { ymdDate: '2005-02-28', close: 1.60 * 7 * 4, },
            { ymdDate: '2005-03-04', close: 1.53 * 7 * 4, },
            { ymdDate: '2005-03-11', close: 1.44 * 7 * 4, },

            // Dividend paid $0.1175
            { ymdDate: '2014-05-15', close: 21.03 * 7 * 4, },
            { ymdDate: '2014-05-19', close: 21.59 * 7 * 4, },

            { ymdDate: '2014-06-04', close: 23.03 * 7 * 4, },
            { ymdDate: '2014-06-05', close: 23.12 * 7 * 4, },
            { ymdDate: '2014-06-06', close: 23.06 * 7 * 4, },
            // 7 for 1 split...
            { ymdDate: '2014-06-09', newCount: 7, oldCount: 1, },
            { ymdDate: '2014-06-09', close: 23.42 * 4, },
            { ymdDate: '2014-06-10', close: 23.56 * 4, },
            { ymdDate: '2014-06-13', close: 22.82 * 4, },
            { ymdDate: '2014-06-20', close: 22.73 * 4, },

            // Dividend paid $0.1175
            { ymdDate: '2014-08-14', close: 24.38 * 4, },
            { ymdDate: '2014-08-15', close: 24.50 * 4, },
            { ymdDate: '2014-08-18', close: 24.79 * 4, },

            { ymdDate: '2015-03-12', close: 30.92 * 4, },

            { ymdDate: '2019-11-12', close: 65.49 * 4, },
            { ymdDate: '2019-11-13', close: 66.12 * 4, },
            { ymdDate: '2019-11-14', close: 65.66 * 4, },

            { ymdDate: '2020-01-24', close: 79.58 * 4, },
            { ymdDate: '2020-01-31', close: 77.38 * 4, },
            { ymdDate: '2020-02-04', close: 79.71 * 4, },

            // 4 for 1 split...
            { ymdDate: '2020-08-31', newCount: 4, oldCount: 1, },
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

    prices.push({
        pricedItemId: 'INTC',
        prices: [
            { ymdDate: '2018-01-01', close: 48.14, open: 46.38, low: 42.44, high:  50.85, },
            { ymdDate: '2018-02-01', close: 49.29, open: 47.7, low: 42.04, high:  50.9, },
            { ymdDate: '2018-03-01', close: 52.08, open: 49.5, low: 46.96, high:  53.78, },
            { ymdDate: '2018-04-01', close: 51.62, open: 51.69, low: 47.29, high:  55.79, },
            { ymdDate: '2018-05-01', close: 55.2, open: 51.64, low: 51, high:  56.2, },
            { ymdDate: '2018-06-01', close: 49.71, open: 55.84, low: 48.5, high:  57.6, },
            { ymdDate: '2018-07-01', close: 48.1, open: 49.04, low: 46.43, high:  53.3, },
            { ymdDate: '2018-08-01', close: 48.43, open: 48.06, low: 46.19, high:  50.6, },
            { ymdDate: '2018-09-01', close: 47.29, open: 48.38, low: 44.06, high:  48.43, },
            { ymdDate: '2018-10-01', close: 46.88, open: 46.79, low: 42.36, high:  49.72, },
            { ymdDate: '2018-11-01', close: 49.31, open: 46.95, low: 46.52, high:  49.32, },
            { ymdDate: '2018-12-01', close: 46.93, open: 50, low: 43.51, high:  50.5, },
            { ymdDate: '2019-01-01', close: 47.12, open: 45.96, low: 44.39, high:  50.04, },
            { ymdDate: '2019-02-01', close: 52.96, open: 47.06, low: 47.01, high:  53.61, },
            { ymdDate: '2019-03-01', close: 53.7, open: 53.44, low: 51.7, high:  54.99, },
            { ymdDate: '2019-04-01', close: 51.04, open: 54.34, low: 50.87, high:  59.59, },
            { ymdDate: '2019-05-01', close: 44.04, open: 51.1, low: 42.86, high:  51.82, },
            { ymdDate: '2019-06-01', close: 47.87, open: 44.25, low: 43.2, high:  48.48, },
            { ymdDate: '2019-07-01', close: 50.55, open: 49.29, low: 47.07, high:  53.5, },
            { ymdDate: '2019-08-01', close: 47.41, open: 50.52, low: 44.8, high:  51.89, },
            { ymdDate: '2019-09-01', close: 51.53, open: 47.12, low: 46.5, high:  53.33, },
            { ymdDate: '2019-10-01', close: 56.53, open: 51.97, low: 48.53, high:  57.24, },
            { ymdDate: '2019-11-01', close: 58.05, open: 55.94, low: 55.62, high:  59.13, },
            { ymdDate: '2019-12-01', close: 59.85, open: 58.55, low: 55.75, high:  60.48, },
            { ymdDate: '2020-01-01', close: 63.93, open: 60.24, low: 58.52, high:  69.29, },
            { ymdDate: '2020-02-01', close: 55.52, open: 64.46, low: 53.6, high:  68.09, },
            { ymdDate: '2020-03-01', close: 54.12, open: 55.79, low: 43.63, high:  59.02, },
            { ymdDate: '2020-04-01', close: 59.98, open: 52.5, low: 51.22, high:  62.13, },
            { ymdDate: '2020-05-01', close: 62.93, open: 58.83, low: 56.1, high:  64.14, },
            { ymdDate: '2020-06-01', close: 59.83, open: 62.49, low: 56.76, high:  65.11, },
            { ymdDate: '2020-07-01', close: 47.73, open: 59.91, low: 46.97, high:  61.93, },
            { ymdDate: '2020-08-01', close: 50.95, open: 48.27, low: 47.7, high:  51.5, },
            { ymdDate: '2020-09-01', close: 51.78, open: 50.91, low: 48.42, high:  52.68, },
            { ymdDate: '2020-10-01', close: 44.28, open: 52.4, low: 43.61, high:  56.23, },
            { ymdDate: '2020-11-01', close: 48.35, open: 44.96, low: 44.24, high:  48.5, },
            { ymdDate: '2020-12-01', close: 49.82, open: 48.75, low: 45.24, high:  52.65, },
            { ymdDate: '2021-01-01', close: 55.51, open: 49.89, low: 49.33, high:  63.95, },
            { ymdDate: '2021-02-01', close: 60.78, open: 55.95, low: 55.71, high:  63.54, },
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

        {
            // AAPL
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
            let aaplQuantityBaseValueA = 500000;
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

            // 2 for 1 split
            // '2005-02-28'
            const aaplChangeSplit2005_02_28 = { 
                lotId: lotA, 
                quantityBaseValue: 1 * (aaplQuantityBaseValueA), 
            };
            transactions.push({
                ymdDate: '2005-02-28',
                description: '2 for 1 split',
                splits: [
                    {
                        accountId: accountId,
                        quantityBaseValue: 0,
                        lotTransactionType: T.LotTransactionType.SPLIT,
                        lotChanges: [ aaplChangeSplit2005_02_28 ],
                    }
                ],
            });
            aaplQuantityBaseValueA *= 2;

            // On 2005-02-28 have
            // A: 2005-02-28: 100.0000
            

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
            // A: 2005-02-18: 100.0000
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
            // A: 2005-02-18: 100.0000
            // C: 2005-03-11: 150.0000


            // 7 for 1 split
            //  { ymdDate: '2014-06-09', close: 23.42, },
            const aaplChangeSplit2014_06_09_LotA = { 
                lotId: lotA, 
                quantityBaseValue: 6 * (aaplQuantityBaseValueA), 
            };
            const aaplChangeSplit2014_06_09_LotC = { 
                lotId: lotC, 
                quantityBaseValue: 6 * (aaplQuantityBaseValueC
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
                        lotChanges: [ 
                            aaplChangeSplit2014_06_09_LotA,
                            aaplChangeSplit2014_06_09_LotC,
                        ],
                    }
                ],
            });
            
            // On 2014-06-09 have
            // A: 2005-02-18: 700.0000
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
            // A: 2005-02-18: 700.0000
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
            // A: 2005-02-18: 685.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 100.0000


            // Reinvested Dividends
            // Dividend paid $0.1175
            // 1485 sh * 0.1175 = $174.49
            // { ymdDate: '2014-08-14', close: 24.38, },
            const lotE = 'Lot E';
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
            // A: 2005-02-18: 685.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 100.0000
            // E: 2014-08-14: 7.1571

            
            //
            // Add 100 sh for lotF
            // { ymdDate: '2014-08-18', close: 24.79, },
            
            const lotF = 'Lot F';
            const aaplQuantityBaseValueF = 1000000;
            addLotTransaction(baseArgs,
                {
                    otherAccountId: 'EQUITY',
                    costBasisSign: 1,
                    ymdDate: '2014-08-18',
                    lotTransactionType: T.LotTransactionType.BUY_SELL,
                    lotId: lotF,
                    //commissionBaseValue: 495,
                    lotBaseValue: aaplQuantityBaseValueF,
                    priceBaseValue: 2479,
                    splitRatio: 4,
                });

            
            // On 2014-08-18 have
            // A: 2005-02-18: 685.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 100.0000
            // E: 2014-08-14: 7.1571
            // F: 2014-08-18: 100.0000


            //
            // Remove 25 sh of lotF
            // { ymdDate: '2015-03-12', close: 30.92, },
            addLotTransaction(baseArgs,
                {
                    otherAccountId: 'EQUITY',
                    costBasisSign: 1,
                    ymdDate: '2015-03-12',
                    lotTransactionType: T.LotTransactionType.BUY_SELL,
                    lotsToSell: [
                        {
                            lotId: lotF,
                            quantityBaseValue: -250000,
                        },
                    ],
                    //commissionBaseValue: 495,
                    priceBaseValue: 3092,
                    splitRatio: 4,
                });
            
            
            // On 2015-03-12 have
            // A: 2005-02-18: 685.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 100.0000
            // E: 2014-08-14: 7.1571
            // F: 2014-08-18: 75.0000


            //
            // Remove the rest of lotF via LIFO
            //  { ymdDate: '2019-11-12', close: 65.49, },
            addLotTransaction(baseArgs,
                {
                    otherAccountId: 'EQUITY',
                    costBasisSign: 1,
                    ymdDate: '2019-11-12',
                    lotTransactionType: T.LotTransactionType.BUY_SELL,
                    //commissionBaseValue: 495,
                    autoLotType: T.AutoLotType.LIFO,
                    lotBaseValue: -750000,
                    priceBaseValue: 6549,
                    splitRatio: 4,
                });

            // On 2019-11-12 have
            // A: 2005-02-18: 685.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 100.0000
            // E: 2014-08-14: 7.1571



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
            // A: 2005-02-18: 665.0000
            // C: 2005-03-11: 1050.0000
            // B: 2014-06-13: 90.0000
            // E: 2014-08-14: 7.1571


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
            // A: 2005-02-18: 665.0000
            // C: 2005-03-11: 1050.0000
            // E: 2014-08-14: 7.1571

            // Remove 15 sh FIFO
            //  { ymdDate: '2020-02-04', close: 79.71, },
            addLotTransaction(baseArgs,
                {
                    otherAccountId: 'EQUITY',
                    costBasisSign: 1,
                    ymdDate: '2020-02-04',
                    lotTransactionType: T.LotTransactionType.BUY_SELL,
                    //commissionBaseValue: 495,
                    autoLotType: T.AutoLotType.FIFO,
                    lotBaseValue: -150000,
                    priceBaseValue: 7971,
                    splitRatio: 4,
                });

            // On 2020-02-04 have
            // A: 2005-02-18: 650.0000
            // C: 2005-03-11: 1050.0000
            // E: 2014-08-14: 7.1571


            
            // 4 for 1 split
            const aaplChangeSplit2020_08_31_LotA = { 
                lotId: lotA, 
                quantityBaseValue: 3 * 6500000, 
            };
            const aaplChangeSplit2020_08_31_LotC = { 
                lotId: lotC, 
                quantityBaseValue: 3 * 10500000, 
            };
            const aaplChangeSplit2020_08_31_LotE = { 
                lotId: lotE, 
                quantityBaseValue: 3 * 71571, 
            };
            transactions.push({
                ymdDate: '2020-08-31',
                description: '4 for 1 split',
                splits: [
                    {
                        accountId: accountId,
                        quantityBaseValue: 0,
                        lotTransactionType: T.LotTransactionType.SPLIT,
                        lotChanges: [ 
                            aaplChangeSplit2020_08_31_LotA,
                            aaplChangeSplit2020_08_31_LotC,
                            aaplChangeSplit2020_08_31_LotE,
                        ],
                    }
                ],
            });

            //}
            
            // On 2020-08-31 have
            // A: 2005-02-18: 2600.0000, cb: 4034.59
            // C: 2005-03-11: 4200.0000, cb: 6051.71
            // E: 2014-08-14: 28.6284, cb: 697.96


            //
            // The following are pure test transactions with no grounding in reality...
            if (options.includeReverseSplit) {
                // Reverse split
                // '2020-09-15'
                const aaplChangeReverseSplit2020_08_31_LotA = { 
                    lotId: lotA, 
                    quantityBaseValue: -3 * 6500000, 
                };
                const aaplChangeReverseSplit2020_08_31_LotC = { 
                    lotId: lotC, 
                    quantityBaseValue: -3 * 10500000, 
                };
                const aaplChangeReverseSplit2020_08_31_LotE = { 
                    lotId: lotE, 
                    quantityBaseValue: -3 * 71571, 
                };
                transactions.push({
                    ymdDate: '2020-09-15',
                    description: '1 for 4 reverse split',
                    splits: [
                        {
                            accountId: accountId,
                            quantityBaseValue: 0,
                            lotTransactionType: T.LotTransactionType.SPLIT,
                            lotChanges: [ 
                                aaplChangeReverseSplit2020_08_31_LotA,
                                aaplChangeReverseSplit2020_08_31_LotC,
                                aaplChangeReverseSplit2020_08_31_LotE,
                            ],
                        }
                    ],
                });

                // Put back the split...
                transactions.push({
                    ymdDate: '2020-09-20',
                    description: '4 for 1 split',
                    splits: [
                        {
                            accountId: accountId,
                            quantityBaseValue: 0,
                            lotTransactionType: T.LotTransactionType.SPLIT,
                            lotChanges: [ 
                                aaplChangeSplit2020_08_31_LotA,
                                aaplChangeSplit2020_08_31_LotC,
                                aaplChangeSplit2020_08_31_LotE,
                            ],
                        }
                    ],
                });
            }


            if (options.includeReturnOfCapital) {
                transactions.push({
                    ymdDate: '2020-10-01',
                    description: 'Return of Capital No Capital Gains',
                    splits: [
                        {
                            accountId: accountId,
                            lotTransactionType: T.LotTransactionType.RETURN_OF_CAPITAL,
                            lotChanges: [
                                {
                                    lotId: lotA,
                                    costBasisBaseValue: -190375,
                                },
                                {
                                    lotId: lotC,
                                    costBasisBaseValue: -307529,
                                },
                                {
                                    lotId: lotE,
                                    costBasisBaseValue: -2096,
                                },
                            ],
                            quantityBaseValue: 190375 + 307529 + 2096,
                        },
                        {
                            accountId: brokerageAccountId,
                            quantityBaseValue: 190375 + 307529 + 2096,
                        }
                    ],
                });
            }
        }   // End AAPL

        {
            // MSFT
            childAccounts.push({
                type: 'SECURITY',
                name: 'MSFT',
                pricedItemId: 'MSFT'
            });
            const accountId = 'ASSET-Investments-Brokerage Account-MSFT';


            const baseArgs = {
                accountId: accountId,
                lots: lots,
                transactions: transactions,
                pricedItemId: 'MSFT',
                otherAccountId: brokerageAccountId,
            };

            //
            // A: Buy 50 sh for lot A
            //  { ymdDate: '2005-02-18', close: 1.55, },
            const lotA = 'Lot A';
            let msftQuantityBaseValueA = 1000000;
            addLotTransaction(baseArgs,
                {
                    ymdDate: '2005-02-18',
                    lotTransactionType: T.LotTransactionType.BUY_SELL,
                    lotId: lotA,
                    commissionBaseValue: 495,
                    lotBaseValue: msftQuantityBaseValueA,
                    priceBaseValue: 2548,
                    splitRatio: 1,
                });
        }
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


    // ESPP account
    const investmentsAccount = findAccountEntry(newFileContents,
        'ASSET-Investments');
    
    const intcESPPAccount = {
        type: 'ESPP_SECURITY',
        name: 'INTC',
        pricedItemId: 'INTC',
    };
    const esppAccount = {
        type: 'BROKERAGE',
        name: 'Intel ESPP',
        childAccounts: [
            intcESPPAccount,
        ],
    };
    const esppId = 'ASSET-Investments-Intel ESPP';

    investmentsAccount.childAccounts.push(esppAccount);
    const intcESPPId = esppId + '-INTC';
    if (intcESPPId) {
        // INTC ESPP?: Feb 1, Aug 1, 15% discount, FMV is average of high and low,
        // last business day before beginning, last business day of subscription.

        let balance = 0;
        const esppContribution = 100;

        // Some ESPP paychecks...
        const esppPaycheck = {
            description: 'Paycheck (ESPP)',
            splits: [
                { 
                    accountId: 'ASSET-Current Assets-Checking Account',
                    quantityBaseValue: 60000,
                    description: 'Paycheck',
                },
                {
                    accountId: 'INCOME-Salary',
                    quantityBaseValue: 130000,
                },
                {
                    accountId: 'EXPENSE-Taxes-Social Security',
                    quantityBaseValue: 7000,
                },
                {
                    accountId: 'ASSET-Investments-401(k) Account',
                    quantityBaseValue: 20000,
                },
                {
                    accountId: esppId,
                    quantityBaseValue: esppContribution * 100,
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
                    accountId: 'EXPENSE-Taxes-Medicare',
                    quantityBaseValue: 3000,
                },
            ]
        };

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-02-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-03-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-04-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-05-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-06-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-07-03';
        transactions.push(Object.assign({}, esppPaycheck));

        // ESPP Purchase...
        const baseArgs = {
            accountId: intcESPPId,
            lots: lots,
            transactions: transactions,
            pricedItemId: 'INTC',
            otherAccountId: esppId,
        };

        // We're just going to use the close, and the day of the subscription
        // 2018-02-01: close: 49.29
        // 2018-08-01: close: 48.43
        // therefore use 85% of 48.43
        // $600 balance in ESPP account.
        const lotA = 'Lot 2018-08-01';
        const priceA = .85 * 48.43;
        const sharesA = Math.floor(balance / priceA);
        balance -= Math.round(sharesA * priceA, 2);

        const sharesA_QuantityBaseValue = sharesA * 10000;
        addLotTransaction(baseArgs, {
            ymdDate: '2018-08-01',
            lotTransactionType: T.LotTransactionType.BUY_SELL,
            lotId: lotA,
            lotBaseValue: sharesA_QuantityBaseValue,
            priceBaseValue: priceA * 100,
            esppBuyInfo: {
                grantYMDDate: '2018-02-01',
                grantDateFMVPrice: 49.29,
                purchaseDateFMVPrice: 48.43,
            },
        });


        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-08-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-09-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-10-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-11-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2018-12-03';
        transactions.push(Object.assign({}, esppPaycheck));

        balance += esppContribution;
        esppPaycheck.ymdDate = '2019-01-03';
        transactions.push(Object.assign({}, esppPaycheck));

        // 2018-08-01: close: 48.43
        // 2019-02-01: close: 52.96
        // therefore use 85% of 48.43
        // $600 balance in ESPP account.
        const lotB = 'Lot 2019-02-01';
        const priceB = .85 * 48.43;
        const sharesB = Math.floor(balance / priceB);
        balance -= Math.round(sharesB * priceB, 2);

        const sharesB_QuantityBaseValue = sharesB * 10000;
        addLotTransaction(baseArgs, {
            ymdDate: '2019-02-01',
            lotTransactionType: T.LotTransactionType.BUY_SELL,
            lotId: lotB,
            lotBaseValue: sharesB_QuantityBaseValue,
            priceBaseValue: priceB * 100,
            esppBuyInfo: {
                grantYMDDate: '2018-08-01',
                grantDateFMVPrice: 48.43,
                purchaseDateFMVPrice: 52.96,
            },
        });


    }


    // RSU account
    const intcRSUAccount = {
        type: 'STOCK_GRANT_SECURITY',
        name: 'INTC',
        pricedItemId: 'INTC',
        defaultSplitAccountIds: {
            stockGrantsIncomeId: 'INCOME-Stock Grants'
        }
    };
    const rsuAccount = {
        type: 'BROKERAGE',
        name: 'Intel RSU',
        childAccounts: [
            intcRSUAccount,
        ],
    };
    const rsuId = 'ASSET-Investments-Intel RSU';

    investmentsAccount.childAccounts.push(rsuAccount);
    const intcRSUId = rsuId + '-INTC';
    if (intcRSUId) {
        /*
        const baseArgs = {
            accountId: intcRSUId,
            lots: lots,
            transactions: transactions,
            pricedItemId: 'INTC',
            otherAccountId: 'INCOME-Stock Grants',
        };

        const lotA = 'Lot A';
        let intcQuantityBaseValueA = 1000000;
        addLotTransaction(baseArgs,
            {
                ymdDate: '2020-10-01',
                lotTransactionType: T.LotTransactionType.BUY_SELL,
                lotId: lotA,
                lotBaseValue: intcQuantityBaseValueA,
                priceBaseValue: 12345,
            });
        */
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
        esppBuyInfo,
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
            id: lotId,
            pricedItemId: pricedItemId, 
            description: lotId, 
            lotOriginType: lotTransactionType.lotOriginType,
        });

        const lotChange = {
            lotId: lotId,
            quantityBaseValue: lotBaseValue,
            costBasisBaseValue: costBasisBaseValue,
        };
        lotChanges.push(lotChange);
    }


    let description;
    const costBasisSign = args.costBasisSign || -1;

    switch (lotTransactionType) {
    case T.LotTransactionType.BUY_SELL :
        if (lotValueBaseValue > 0) {
            description = 'Buy ' + lotQuantity + 'sh ' + pricedItemId;
        }
        else {
            description = 'Sell ' + -lotQuantity + 'sh ' + pricedItemId;
        }
        splits.push({
            accountId: otherAccountId,
            quantityBaseValue: costBasisBaseValue * costBasisSign,
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

        if (esppBuyInfo) {
            splits[splits.length - 1].esppBuyInfo = esppBuyInfo;
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


export function createTestReminders(newFileContents, options) {
    options = options || {};
    const reminders = [];
    newFileContents.reminders = {
        reminders: reminders,
    };

    const paycheckTemplate = {
        description: 'Paycheck',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: 60000,
                description: 'First paycheck',
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
    };
    reminders.push({
        isEnabled: true,
        transactionTemplate: paycheckTemplate,
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_WEEK,
            dayOfWeek: 5,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.WEEKLY,
                period: 2,
            },
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2020-01-17',
            occurrenceCount: 3,
        },
    });


    const rentTemplate = {
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                quantityBaseValue: -50000,
                description: 'Rent',
            },
            { 
                accountId: 'EXPENSE-Rent',
                quantityBaseValue: 50000,
            },
        ] 
    };
    reminders.push({
        isEnabled: true,
        transactionTemplate: rentTemplate,
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_END_OF_MONTH,
            offset: 2,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY,
                period: 1,
            }
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2020-01-30',
            occurrenceCount: 25,
        },
    });


    const phoneTemplate = {
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
    };
    reminders.push({
        transactionTemplate: phoneTemplate,
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_MONTH,
            offset: 15,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY,
                period: 1,
            }
        },
        lastOccurrenceState: {
            lastOccurrenceYMDDate: '2020-01-30',
            occurrenceCount: 5,
        },
    });


    const powerTemplate = {
        description: 'Power Bill',
        splits: [
            { 
                accountId: 'ASSET-Current Assets-Checking Account',
                //quantityBaseValue: -5000,
                //reconcileState: 'PENDING',
            },
            { 
                accountId: 'EXPENSE-Utilities-Power',
                //quantityBaseValue: 5000,
            },
        ] 
    };
    reminders.push({
        isEnabled: true,
        transactionTemplate: powerTemplate,
        occurrenceDefinition: {
            occurrenceType: DO.OccurrenceType.DAY_OF_MONTH,
            offset: 24,
            repeatDefinition: {
                repeatType: DO.OccurrenceRepeatType.MONTHLY,
                period: 1,
            }
        },
        lastOccurrenceState: {
        },
    });

}
