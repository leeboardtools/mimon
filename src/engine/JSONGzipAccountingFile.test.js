import { createDir, cleanupDir, expectFileToBe } from '../util/FileTestHelpers';
import { JSONGzipAccountingFileFactory } from './JSONGzipAccountingFile';
import * as A from './Accounts';
import * as ASTH from './AccountingSystemTestHelpers';

const path = require('path');

test('JSONGzipAccountingFile-simple', async () => {
    const baseDir = await createDir('JSONGzipAccountingFile-simple');

    try {
        await cleanupDir(baseDir, true);

        const factory = new JSONGzipAccountingFileFactory();
        
        const pathName1 = path.join(baseDir, 'test1');
        const file1 = await factory.asyncCreateFile(pathName1);
        const accountingSystem1 = file1.getAccountingSystem();

        const sys = ASTH.asyncSetupBasicAccounts(accountingSystem1);

        const accountManager1 = accountingSystem1.getAccountManager();

        // Assets
        const checking = accountManager1.getAccountDataItemWithId(sys.checkingId);
        const brokerageA = accountManager1.getAccountDataItemWithId(sys.brokerageAId);
        const aaplBrokerageA = accountManager1.getAccountDataItemWithId(sys.aaplBrokerageAId);

        // Liabilities
        const autoLoan = accountManager1.getAccountDataItemWithId(sys.autoLoanId);

        // Income
        const salary = accountManager1.getAccountDataItemWithId(sys.salaryId);

        // Expense
        const groceries = accountManager1.getAccountDataItemWithId(sys.groceriesId);
        const federalTaxes = accountManager1.getAccountDataItemWithId(sys.federalTaxesId);

        // Priced items
        const pricedItemManager1 = accountingSystem1.getPricedItemManager();

        const aaplPricedItem = pricedItemManager1.getPricedItemDataItemWithId(sys.aaplPricedItemId);
        const housePricedItem = pricedItemManager1.getPricedItemDataItemWithId(sys.housePricedItemId);

        await file1.asyncWriteFile();
        await file1.asyncCloseFile();


        const file2 = await factory.asyncOpenFile(pathName1);
        const accountingSystem2 = file2.getAccountingSystem();
        const accountManager2 = accountingSystem2.getAccountManager();

        expect(accountManager2.getAccountDataItemWithId(sys.checkingId)).toEqual(checking);
        expect(accountManager2.getAccountDataItemWithId(sys.brokerageAId)).toEqual(brokerageA);
        expect(accountManager2.getAccountDataItemWithId(sys.aaplBrokerageAId)).toEqual(aaplBrokerageA);

        expect(accountManager2.getAccountDataItemWithId(sys.autoLoanId)).toEqual(autoLoan);

        expect(accountManager2.getAccountDataItemWithId(sys.salaryId)).toEqual(salary);

        expect(accountManager2.getAccountDataItemWithId(sys.groceriesId)).toEqual(groceries);
        expect(accountManager2.getAccountDataItemWithId(sys.federalTaxesId)).toEqual(federalTaxes);


        const pricedItemManager2 = accountingSystem2.getPricedItemManager();
        expect(pricedItemManager2.getPricedItemDataItemWithId(sys.aaplPricedItemId)).toEqual(aaplPricedItem);
        expect(pricedItemManager2.getPricedItemDataItemWithId(sys.housePricedItemId)).toEqual(housePricedItem);

        await file2.asyncCloseFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }
});