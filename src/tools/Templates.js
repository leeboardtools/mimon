import defTemplates from '../locales/en-templates.json';


let loadedTemplates;
let templatesByType = new Map();

async function asyncLoadTemplates() {
    loadedTemplates = defTemplates;

    templatesByType.clear();
    loadedTemplates.forEach((template) => {
        let templates = templatesByType.get(template.type);
        if (!templates) {
            templates = [];
            templatesByType.set(template.type, templates);
        }

        templates.push(template);
    });
}


export async function asyncGetTemplatesWithType(type) {
    if (!loadedTemplates) {
        await asyncLoadTemplates();
    }

    return templatesByType.get(type);
}


function addIdsToAccounts(accounts, nextId) {
    if (accounts) {
        accounts.forEach((account) => {
            if (!account.id) {
                account.id = (nextId++).toString();
            }
            nextId = addIdsToAccounts(account.childAccounts, nextId);
        });
    }
    return nextId;
}

function addIdsToPricedItems(pricedItems, nextId) {
    if (pricedItems) {
        pricedItems.forEach((pricedItem) => {
            if (!pricedItem.id) {
                pricedItem.id = (nextId++).toString();
            }
        });
    }
    return nextId;
}


export async function asyncGetNewFileTemplates() {
    const templates = await asyncGetTemplatesWithType('newFileTemplate');
    if (templates) {
        templates.forEach((template) => {
            template.nextPricedItemId = addIdsToPricedItems(template.pricedItems, 1);

            const { accounts } = template;
            if (accounts) {
                let nextId = 1;
                nextId = addIdsToAccounts(accounts.ASSET, nextId);
                nextId = addIdsToAccounts(accounts.LIABILITY, nextId);
                nextId = addIdsToAccounts(accounts.INCOME, nextId);
                nextId = addIdsToAccounts(accounts.EXPENSE, nextId);
                nextId = addIdsToAccounts(accounts.EQUITY, nextId);
    
                template.nextAccountId = nextId;
            }
        });
    }

    return templates;
}
