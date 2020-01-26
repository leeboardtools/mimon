import { createDir, cleanupDir } from '../util/FileTestHelpers';
import { JSONGzipAccountingFileFactory } from './JSONGzipAccountingFile';
import * as A from './Accounts';
import * as PI from './PricedItems';
import * as ASTH from './AccountingSystemTestHelpers';
import { getDecimalDefinition } from '../util/Quantities';

const path = require('path');

test('JSONGzipAccountingFile-simple', async () => {
    const baseDir = await createDir('JSONGzipAccountingFile-simple');

    try {
        await cleanupDir(baseDir, true);

        const factory = new JSONGzipAccountingFileFactory();
        
        const pathName1 = path.join(baseDir, 'test1');
        const file1 = await factory.asyncCreateFile(pathName1);
        const accountingSystem1 = file1.getAccountingSystem();

        expect(file1.isModified()).toBeFalsy();

        const sys = await ASTH.asyncSetupBasicAccounts(accountingSystem1);

        expect(file1.isModified()).toBeTruthy();

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

        // Gonna remove this later to make sure remove works fine.
        const newAccountA = (await accountManager1.asyncAddAccount({
            parentAccountId: sys.currentAssetsId, type: A.AccountType.BANK, pricedItemId: checking.pricedItemId, name: 'New Account A'
        })).newAccountDataItem;


        // Priced items
        const pricedItemManager1 = accountingSystem1.getPricedItemManager();

        const aaplPricedItem = pricedItemManager1.getPricedItemDataItemWithId(sys.aaplPricedItemId);
        const housePricedItem = pricedItemManager1.getPricedItemDataItemWithId(sys.housePricedItemId);

        const newPricedItemA = (await pricedItemManager1.asyncAddPricedItem({
            type: PI.PricedItemType.PROPERTY, currency: 'USD', name: 'PricedItemA', quantityDefinition: getDecimalDefinition(-4),
        })).newPricedItemDataItem;


        await file1.asyncWriteFile();
        expect(file1.isModified()).toBeFalsy();

        await file1.asyncCloseFile();


        const file2 = await factory.asyncOpenFile(pathName1);
        expect(file2.isModified()).toBeFalsy();

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

        expect(accountManager2.getAccountDataItemWithId(newAccountA.id)).toEqual(newAccountA);
        await accountManager2.asyncRemoveAccount(newAccountA.id);
        expect(accountManager2.getAccountDataItemWithId(newAccountA.id)).toBeUndefined();

        expect(pricedItemManager2.getPricedItemDataItemWithId(newPricedItemA.id)).toEqual(newPricedItemA);
        await pricedItemManager2.asyncRemovePricedItem(newPricedItemA.id);
        expect(pricedItemManager2.getPricedItemDataItemWithId(newPricedItemA.id)).toBeUndefined();

        expect(file2.isModified()).toBeTruthy();

        await file2.asyncWriteFile();
        expect(file2.isModified()).toBeFalsy();
        
        await file2.asyncCloseFile();


        const file3 = await factory.asyncOpenFile(pathName1);
        const accountingSystem3 = file3.getAccountingSystem();
        const accountManager3 = accountingSystem3.getAccountManager();
        expect(accountManager3.getAccountDataItemWithId(newAccountA.id)).toBeUndefined();

        const pricedItemManager3 = accountingSystem3.getPricedItemManager();
        expect(pricedItemManager3.getPricedItemDataItemWithId(newPricedItemA.id)).toBeUndefined();

        await file3.asyncCloseFile();
    }
    finally {
        // await cleanupDir(baseDir);
    }
});