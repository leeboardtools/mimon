import { AccountingSystem } from './AccountingSystem';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryAccountsHandler } from './Accounts';


export async function asyncCreateAccountingSystem(options) {
    options = options || {};
    options = Object.assign(
        {
            accountManager: {
                handler: new InMemoryAccountsHandler(),
            },

            pricedItemManager: {
                handler: new InMemoryPricedItemsHandler(),
            },
            priceManager: {

            },

            transactionManager: {

            },
        },
        options);

    const accountingSystem = new AccountingSystem(options);
    await accountingSystem.asyncSetupForUse();
    return accountingSystem;
}
