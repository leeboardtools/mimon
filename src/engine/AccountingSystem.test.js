import { AccountingSystem, InMemoryAccountingSystemHandler } from './AccountingSystem';
import { InMemoryUndoHandler } from '../util/Undo';
import { InMemoryAccountsHandler } from './Accounts';
import { InMemoryPricedItemsHandler } from './PricedItems';
import { InMemoryPricesHandler } from './Prices';
import { InMemoryRemindersHandler } from './Reminders';
import { InMemoryTransactionsHandler } from './Transactions';
import { InMemoryLotsHandler } from './Lots';

test('AccountingSystem', async () => {
    const handler = new InMemoryAccountingSystemHandler();
    
    const initialOptions = {
        a: { 
            b: {
                b1: 1,
            },
            c: [ 1, 2, 3],
        },
        b: [ 10, 20, 30],
    };
    await handler.asyncSetOptions(initialOptions);

    const accountingSystem = new AccountingSystem(
        { handler: handler, 
            undoManager: { handler: new InMemoryUndoHandler(), },
            accountManager: { handler: new InMemoryAccountsHandler(), },
            pricedItemManager: { handler: new InMemoryPricedItemsHandler(), },
            priceManager: { handler: new InMemoryPricesHandler(), },
            reminderManager: { handler: new InMemoryRemindersHandler(), },
            lotManager: { handler: new InMemoryLotsHandler(), },
            transactionManager: { handler: new InMemoryTransactionsHandler(), },
        });

    const undoManager = accountingSystem.getUndoManager();

    let result;

    //
    // Test the options.
    let setOptionsEventResult;
    expect(accountingSystem.getOptions()).toEqual(initialOptions);

    accountingSystem.on('optionsModify', 
        (result) => { setOptionsEventResult = result; });
    
    const optionsChange = {
        a: {
            b: {
                b2: 123,
            },
            c: [1, 2, 3],
        },
        c: 'abc',
    };

    const newOptions = {
        a: {
            b: {
                b2: 123,
            },
            c: [1, 2, 3],
        },
        b: [10, 20, 30],
        c: 'abc',
    };
    result = await accountingSystem.asyncModifyOptions(optionsChange);
    expect(result.newOptions).toEqual(newOptions);
    expect(result.oldOptions).toEqual(initialOptions);
    expect(accountingSystem.getOptions()).toEqual(newOptions);

    expect(setOptionsEventResult).toEqual({
        oldOptions: initialOptions,
        newOptions: newOptions,
    });

    await undoManager.asyncUndoToId(result.undoId);
    expect(accountingSystem.getOptions()).toEqual(initialOptions);

    expect(setOptionsEventResult).toEqual({
        oldOptions: newOptions,
        newOptions: initialOptions,
    });


    accountingSystem.shutDownFromUse();
});
