import { createDir, cleanupDir } from '../util/FileTestHelpers';
import { EngineAccessor } from './EngineAccess';
import { asyncSetupNewFile } from './NewFileSetup';
import * as PI from '../engine/PricedItems';
import * as QD from '../util/Quantities';
import * as A from '../engine/Accounts';

const path = require('path');

test('NewFileSetup', async () => {
    const baseDir = await createDir('NewFileSetup');

    try {
        await cleanupDir(baseDir, true);

        const accessor = new EngineAccessor();
        const pathName1 = path.join(baseDir, 'test1');
        await accessor.asyncCreateAccountingFile(pathName1);

        const corePricedItemIds = Array.from(accessor.getPricedItemIds());

        const test1 = {
            baseCurrency: 'JPY',
            openingBalancesDate: '2020-01-01',
            pricedItems: {
                pricedItems: [
                    {
                        type: PI.PricedItemType.SECURITY.name,
                        currency: 'USD',
                        quantityDefinition: QD.getQuantityDefinitionName(
                            QD.getDecimalDefinition(4)),
                        name: 'AAPL',
                        description: 'Apple Computer',
                        ticker: 'AAPL',
                        onlineUpdateType: 
                            PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name,
                    },
                    {
                        type: PI.PricedItemType.REAL_ESTATE.name,
                        currency: 'EUR',
                        quantityDefinition: QD.getQuantityDefinitionName(
                            QD.getDecimalDefinition(2)),
                        name: 'My House',
                        id: 'MyHouse',
                    },
                ],
            },
            accounts: {
                ASSET: [
                    {
                        type: A.AccountType.BANK.name,
                        name: 'Checking Account',
                        openingBalance: '100.00',
                        refId: 'Checking',
                    },
                    {
                        type: A.AccountType.ASSET.name,
                        name: 'Investments',
                        description: 'All my investment accounts',
                        refId: 'Investments',
                        childAccounts: [
                            {
                                type: A.AccountType.BROKERAGE.name,
                                name: 'Brokerage A',
                                refId: 'Brokerage A',
                                currency: 'USD',
                                openingBalance: '10,000.00',
                            },
                            {
                                type: A.AccountType.BROKERAGE.name,
                                name: 'IRA',
                                refId: 'IRA',
                                currency: 'USD',
                                openingBalance: '5,000.00',
                            }
                        ],
                    },
                    {
                        type: A.AccountType.REAL_ESTATE.name,
                        name: 'House',
                        pricedItemId: 'MyHouse',
                        refId: 'House',
                        //openingBalance: 100000.00,
                    },
                ],
                LIABILITY: [
                    {
                        type: A.AccountType.CREDIT_CARD.name,
                        name: 'VISA',
                        refId: 'VISA',
                        openingBalance: -1234.56,
                    }
                ],
                INCOME: [
                    {
                        type: A.AccountType.INCOME.name,
                        name: 'Salary',
                        refId: 'Salary',
                        openingBalance: 12345.67,
                    }
                ],
                EXPENSE: [
                    {
                        type: A.AccountType.EXPENSE.name,
                        name: 'My Groceries',
                        refId: 'Groceries',
                        openingBalance: 123.45,
                    }
                ],
            },
        };
        const result1 = await asyncSetupNewFile(accessor, 
            accessor._accountingFile, test1);
        expect(result1).toEqual([]);

        expect(accessor.getBaseCurrencyCode()).toEqual('JPY');

        const pricedItemIds1 = accessor.getPricedItemIds();
        expect(pricedItemIds1.length).toEqual(2 + corePricedItemIds.length);

        const pricedItemA = accessor.getPricedItemDataItemWithId(
            pricedItemIds1[corePricedItemIds.length]);
        expect(pricedItemA).toEqual(
            expect.objectContaining(test1.pricedItems.pricedItems[0]));

        const pricedItemB = accessor.getPricedItemDataItemWithId(
            pricedItemIds1[corePricedItemIds.length + 1]);
        delete test1.pricedItems.pricedItems[1].id;
        expect(pricedItemB).toEqual(
            expect.objectContaining(test1.pricedItems.pricedItems[1]));


        const checkingA = accessor.getAccountDataItemWithRefId('Checking');
        expect(checkingA).toEqual(expect.objectContaining({
            type: A.AccountType.BANK.name,
            name: 'Checking Account',
            refId: 'Checking',
        }));

        const checkingBalanceA = accessor.getCurrentAccountStateDataItem(checkingA.id);
        expect(checkingBalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: 10000,
        });

        const brokerageAA = accessor.getAccountDataItemWithRefId('Brokerage A');
        expect(brokerageAA).toEqual(expect.objectContaining({
            type: A.AccountType.BROKERAGE.name,
            name: 'Brokerage A',
        }));

        const brokerageABalanceA 
            = accessor.getCurrentAccountStateDataItem(brokerageAA.id);
        expect(brokerageABalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: 1000000,
        });

        const iraA = accessor.getAccountDataItemWithRefId('IRA');
        expect(iraA).toEqual(expect.objectContaining({
            type: A.AccountType.BROKERAGE.name,
            name: 'IRA',
        }));

        const iraBalanceA 
            = accessor.getCurrentAccountStateDataItem(iraA.id);
        expect(iraBalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: 500000,
        });
        

        const investmentsA = accessor.getAccountDataItemWithRefId('Investments');
        expect(investmentsA).toEqual(expect.objectContaining({
            type: A.AccountType.ASSET.name,
            name: 'Investments',
            description: 'All my investment accounts',
            childAccountIds: [ brokerageAA.id, iraA.id ],
        }));


        const visaA = accessor.getAccountDataItemWithRefId('VISA');
        expect(visaA).toEqual(expect.objectContaining({
            type: A.AccountType.CREDIT_CARD.name,
            name: 'VISA',
        }));

        const visaBalanceA 
            = accessor.getCurrentAccountStateDataItem(visaA.id);
        expect(visaBalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: -123456,
        });


        const salaryA = accessor.getAccountDataItemWithRefId('Salary');
        expect(salaryA).toEqual(expect.objectContaining({
            type: A.AccountType.INCOME.name,
            name: 'Salary',
        }));

        const salaryBalanceA
            = accessor.getCurrentAccountStateDataItem(salaryA.id);
        expect(salaryBalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: 1234567,
        });


        const groceriesA = accessor.getAccountDataItemWithRefId('Groceries');
        expect(groceriesA).toEqual(expect.objectContaining({
            type: A.AccountType.EXPENSE.name,
            name: 'My Groceries',
        }));

        const groceriesBalanceA
            = accessor.getCurrentAccountStateDataItem(groceriesA.id);
        expect(groceriesBalanceA).toEqual({
            ymdDate: test1.openingBalancesDate,
            quantityBaseValue: 12345,
        });    
    }
    finally {
        // await cleanupDir(baseDir);
    }
});
