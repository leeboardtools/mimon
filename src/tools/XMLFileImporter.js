import { userError, userMsg } from '../util/UserMessages';
import * as A from '../engine/Accounts';
import * as PI from '../engine/PricedItems';
import * as T from '../engine/Transactions';
import * as L from '../engine/Lots';
import * as path from 'path';
import * as fs from 'fs';
import * as sax from 'sax';
import { YMDDate } from '../util/YMDDate';
import { SortedArray } from '../util/SortedArray';
import { getDecimalDefinition } from '../util/Quantities';
import { DefaultSplitAccountType } from './AccountHelpers';
import { makeDefaultSplitsAccountId } from './NewFileSetup';
import { StandardAccountTag } from '../engine/StandardTags';


class XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        this.importer = importer;
        this.tag = tag;
        this.onCloseProcessorCallback = onCloseProcessorCallback;
    }

    pushProcessor(processor) {
        this.importer.pushProcessor(processor);
    }

    onOpenTag(tag) {
        // This has the effect of ignoring the tag and all its children...
        this.pushProcessor(new XMLNodeProcessor(this.importer, tag));
    }

    onText(text) {
        if (!this.text) {
            this.text = [];
        }
        this.text.push(text);
    }

    onCloseTag(tagName) {
        if (tagName === this.tag.name) {
            return true;
        }
    }


    onCloseProcessor() {
        const { onCloseProcessorCallback } = this;
        if (onCloseProcessorCallback) {
            onCloseProcessorCallback(this.tag, this, this.argsOnCloseCallback);
        }
    }


    getTextAsString() {
        const { text } = this;
        if (text && text.length) {
            return text.join();
        }
    }
}


//
//---------------------------------------------------------
//
class CURRENCYNODE extends XMLNodeProcessor {
    constructor(importer, tag) {
        super(importer, tag);
    }

    onCloseProcessor() {
        const { attributes } = this.tag;
        this.importer.addCurrency({
            id: attributes.ID,
            currency: attributes.SYMBOL,
        });
    }
}


//
//---------------------------------------------------------
//
function cleanNumber(value) {
    if (typeof value === 'number') {
        return Math.round(value * 10000) / 10000;
    }
    return value;
}



//
//---------------------------------------------------------
//
function numberOrUndefined(value) {
    switch (typeof value) {
    case 'string' :
    {
        value = value.trim();
        const number = parseFloat(value);
        if (!isNaN(number)) {
            return cleanNumber(number);
        }
        break;
    }
    case 'number' :
        return value;
    }
}

function scalePriceProperty(item, name, numerator, denominator) {
    const value = item[name];
    if (typeof value !== 'number') {
        return;
    }

    // We still scale if numerator === denominator so we clean up the number.
    item[name] = cleanNumber(value * numerator / denominator);
}


//
//---------------------------------------------------------
//
class HISTORYNODES extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.prices = [];
    }

    onOpenTag(tag) {
        if (tag.name === 'SECURITYHISTORYNODE') {
            this.pushProcessor(new XMLNodeProcessor(this.importer, tag,
                (tag) => {
                    const { attributes } = tag;
                    const date = attributes.DATE;
                    const price = attributes.PRICE;
                    if ((date !== undefined) && (price !== undefined)) {
                        const close = numberOrUndefined(price);
                        if ((close !== undefined) && (close !== null)) {
                            const entry = {
                                ymdDate: date,
                                close: close,
                            };

                            const high = numberOrUndefined(attributes.HIGH);
                            if (high !== undefined) {
                                entry.high = high;
                            }

                            const low = numberOrUndefined(attributes.LOW);
                            if (low !== undefined) {
                                entry.low = low;
                            }

                            const volume = numberOrUndefined(attributes.VOLUME);
                            if (volume !== undefined) {
                                entry.volume = volume;
                            }

                            this.prices.push(entry);
                        }
                    }
                }));
        }
        else {
            return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
        }
    }

    onCloseProcessor() {
        const { onCloseProcessorCallback, prices } = this;
        if (onCloseProcessorCallback && prices.length) {
            onCloseProcessorCallback(this.tag, this, {
                attributes: this.tag.attributes,
                prices: prices,
            });
        }
    }
}


//
//---------------------------------------------------------
//
class SECURITYHISTORYEVENTS extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.events = [];
        this.argsOnCloseCallback = this.events;
    }

    onOpenTag(tag) {
        if (tag.name === 'SECURITYHISTORYEVENT') {
            this.pushProcessor(new XMLNodeProcessor(this.importer, tag,
                (tag) => {
                    const { attributes } = tag;
                    const date = attributes.DATE;
                    const type = attributes.TYPE;
                    const value = attributes.VALUE;
                    if ((date !== undefined) && (type !== undefined)
                     && (value !== undefined)) {
                        this.events.push({
                            ymdDate: date,
                            type: type,
                            value: numberOrUndefined(value),
                        });
                    }
                }));
        }
        else {
            return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
        }
    }


    onCloseProcessor() {
        const { onCloseProcessorCallback, events } = this;
        if (onCloseProcessorCallback && events.length) {
            onCloseProcessorCallback(this.tag, this, {
                attributes: this.tag.attributes,
                events: events,
            });
        }
    }
}


//
//---------------------------------------------------------
//
class SECURITYNODE extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        if (tag.ID) {
            this.id = tag.ID;

            importer.updateStatus(
                userMsg('XMLFileImporter-updatePrimaryStaus_readingPrices'));

        }
        else if (tag.REFERENCE) {
            this.id = tag.REFERENCE;
        }
        this.argsOnCloseCallback = this.id;
    }

    onOpenTag(tag) {
        switch (tag.name) {
        case 'REPORTEDCURRENCY' :
            this.pushProcessor(new XMLNodeProcessor(this.importer, tag,
                (tag) => this.currencyId = tag.attributes.REFERENCE));
            break;
        
        case 'QUOTESOURCE' :
            this.pushProcessor(new XMLNodeProcessor(this.importer, tag,
                (tag, processor) => {
                    if (processor.text && processor.text[0]) {
                        if (processor.text[0] === 'YAHOO') {
                            this.onlineUpdateType 
                                = PI.PricedItemOnlineUpdateType.YAHOO_FINANCE.name;
                        }
                    }
                }));
            break;
        
        case 'HISTORYNODES' :
            this.pushProcessor(new HISTORYNODES(this.importer, tag,
                (tag, processor, historyNodes) => {
                    this.historyNodes = historyNodes;
                }));
            break;
                
        case 'SECURITYHISTORYEVENTS' :
            this.pushProcessor(new SECURITYHISTORYEVENTS(this.importer, tag,
                (tag, processor, historyEvents) => {
                    this.historyEvents = historyEvents;
                }));
            break;
                
        default :
            return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
        }
    }

    onCloseProcessor() {
        const { attributes } = this.tag;
        const pricedItemId = attributes.ID;
        this.importer.addPricedItem({
            id: pricedItemId,
            type: PI.PricedItemType.SECURITY.name,
            currencyId: this.currencyId,
            description: attributes.DESCRIPTION,
            ticker: attributes.SYMBOL,
            onlineUpdateType: this.onlineUpdateType,
        });

        let itemPrices = [];
        const { historyNodes, historyEvents } = this;
        if (historyNodes) {
            const { prices } = historyNodes;
            itemPrices = itemPrices.concat(prices);
        }

        if (historyEvents) {
            const { events } = historyEvents;
            let isSplit;
            events.forEach((event) => {
                const { type, value, ymdDate } = event;
                if (type === 'SPLIT') {
                    const price = {
                        ymdDate: ymdDate,
                    };
                    if (value > 1) {
                        price.newCount = value;
                        price.oldCount = 1;
                    }
                    else {
                        price.newCount = 1;
                        price.oldCount = value;
                    }
                    itemPrices.push(price);
                    isSplit = true;
                }
            });

            // We need to sort and adjust prices for splits...
            if (isSplit) {
                itemPrices.forEach((price) => {
                    price.ymdDateObject = new YMDDate(price.ymdDate);
                });
                itemPrices.sort((a, b) => {
                    const result = YMDDate.compare(a.ymdDateObject, b.ymdDateObject);
                    if (!result) {
                        // Price on a split date should come after the split.
                        if (typeof a.newCount !== 'undefined') {
                            return -1;
                        }
                        else if (typeof b.newCount !== 'undefined') {
                            return 1;
                        }
                    }
                    return result;
                });
                
                let numerator = 1;
                let denominator = 1;
                for (let i = itemPrices.length - 1; i >= 0; --i) {
                    const item = itemPrices[i];
                    if (item.newCount !== item.oldCount) {
                        numerator *= item.newCount;
                        denominator *= item.oldCount;

                        if (!numerator || !denominator) {
                            // Presume this is an actual corporate split/merge,
                            // so there were no prices beforehand. For now just
                            // ditch the prices.
                            itemPrices.splice(0, i + 1);
                            break;
                        }
                    }
                    else {
                        scalePriceProperty(item, 'close', numerator, denominator);
                        scalePriceProperty(item, 'high', numerator, denominator);
                        scalePriceProperty(item, 'low', numerator, denominator);
                        scalePriceProperty(item, 'open', numerator, denominator);
                        scalePriceProperty(item, 'adjClose', numerator, denominator);
                    }

                    delete item.ymdDateObject;
                }
            }
        }

        if (itemPrices.length) {
            this.importer.addPrices({
                pricedItemId: pricedItemId,
                prices: itemPrices,
            });
        }

        return XMLNodeProcessor.prototype.onCloseProcessor.call(this);
    }
}

/*
class DumpTag extends XMLNodeProcessor {
    constructor(importer, tag) {
        super(importer, tag);

        let text = ''.padStart(importer.indent, '*') 
            + '<' + tag.name;
        const { attributes } = tag;
        if (attributes.ID) {
            text += ' id=' + attributes.ID;
        }
        else if (attributes.REFERENCE) {
            text += ' ref=' + attributes.REFERENCE;
        }

        text += '>';

        if (attributes.NAME) {
            text += ' [' + attributes.NAME + ']';
        }

        importer.log.push(text);
        ++importer.indent;
    }

    onOpenTag(tag) {
        this.importer.pushProcessor(new DumpTag(this.importer, tag));
    }

    onCloseProcessor() {
        --this.importer.indent;
    }
}
*/

//
//---------------------------------------------------------
//
function pushAccountProcessor(myProcessor, tag, onCloseProcessorCallback) {
    const { importer } = myProcessor;
    const { attributes } = tag;
    if (attributes.ID) {
        importer.pushProcessor(new AccountDefinitionProcessor(
            importer, tag, onCloseProcessorCallback));
        return true;
    }
    else if (attributes.REFERENCE) {
        importer.pushProcessor(new AccountReferenceProcessor(
            importer, tag, onCloseProcessorCallback));
        return true;
    }
}


//
//---------------------------------------------------------
//
class AttributesProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.attributes = new Map();
        this.argsOnCloseCallback = this.attributes;
    }

    onOpenTag(tag) {
        if (tag.name === 'ENTRY') {
            this.importer.pushProcessor(new AttributeEntryProcessor(
                this.importer, tag, (tag, processor, values) => {
                    if (values.length === 2) {
                        this.attributes.set(values[0], values[1]);
                    }
                }
            ));
            return;
        }
        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class AttributeEntryProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.values = [];
        this.argsOnCloseCallback = this.values;
    }

    onOpenTag(tag) {
        if (tag.name === 'STRING') {
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.values.push(processor.getTextAsString())
            ));
            return;
        }
        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class AccountProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback, accountId) {
        super(importer, tag, onCloseProcessorCallback);

        this.accountId = accountId;
        this.argsOnCloseCallback = this.accountId;
    }
}

//
//---------------------------------------------------------
//
class AccountDefinitionProcessor extends AccountProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback,
            tag.attributes.ID);
        
        const { attributes } = tag;
        this.account = {
            id: this.accountId,
            name: attributes.NAME,
            description: attributes.DESCRIPTION,

            // tags
            // lastReconcileYMDDate
            // lastRecnocileBalanceBaseValue
            // pendingReconcileYMDDate
            // pendingReconcileBalanceBaseValue
            // defaultSplitAccountIds
        };

        if (tag.attributes.VISIBLE === 'false') {
            this.account.isInactive = true;
        }
        if (tag.attributes.LOCKED === 'true') {
            this.account.isLocked = true;
        }

        importer.updateStatus([
            userMsg(
                'XMLFileImporter-updatePrimaryStatus_readingXMLAccount'),
            userMsg(
                'XMLFileImporter-updateSecondaryStatus_readingXMLAccount',
                this.account.id,
                this.account.name),
        ]);
    }

    onOpenTag(tag) {
        switch (tag.name) {
        case 'ACCOUNTTYPE' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) => 
                    this.account.accountType = processor.getTextAsString()
            ));
            return;

        case 'PARENTACCOUNT' :
            if (pushAccountProcessor(this, tag, 
                (tag, processor, accountId) => 
                    this.account.parentId = accountId
            )) {
                return;
            }
            break;
        
        case 'CHILDREN' :
            this.importer.pushProcessor(new ChildrenAccountProcessor(
                this.importer, tag, (tag, processor, childAccountIds) => 
                    this.account.childAccountIds = childAccountIds
            ));
            return;

        case 'TRANSACTIONS' :
            this.importer.pushProcessor(new TransactionArrayProcessor(
                this.importer, tag, (tag, processor, transactionIds) =>
                    this.account.transactionIds = transactionIds
            ));
            return;
        
        case 'SECURITIES' :
            this.importer.pushProcessor(new SecuritiesArrayProcessor(
                this.importer, tag, (tag, processor, securityIds) => 
                    this.account.securityIds = securityIds
            ));
            return;
        
        case 'EXCLUDEDFROMBUDGET' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.account.excludedFromBudget = processor.getTextAsString()
            ));
            return;
        
        case 'NOTES' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.account.notes = processor.getTextAsString()
            ));
            return;
        
        case 'CURRENCYNODE' :
            // There's probably the possibility this could be a currency
            // definition...
            this.account.currencyId = tag.attributes.REFERENCE;
            break;
        
        case 'ACCOUNTNUMBER' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.account.accountNumber = processor.getTextAsString()
            ));
            return;
        
        case 'ACCOUNTCODE' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.account.accountCode = processor.getTextAsString()
            ));
            return;
        
        case 'ATTRIBUTES' :
            this.importer.pushProcessor(new AttributesProcessor(
                this.importer, tag, (tag, processor, attributes) =>
                    this.account.attributes = attributes
            ));
            return;
        }

        return AccountProcessor.prototype.onOpenTag.call(this, tag);
    }

    onCloseProcessor() {
        this.importer.addAccount(this.account);

        AccountProcessor.prototype.onCloseProcessor.call(this);
    }
}


//
//---------------------------------------------------------
//
class AccountReferenceProcessor extends AccountProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback,
            tag.attributes.REFERENCE);
    }
}


//
//---------------------------------------------------------
//
class ChildrenAccountProcessor extends AccountProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.childAccountIds = [];
        this.argsOnCloseCallback = this.childAccountIds;
    }


    onOpenTag(tag) {
        switch (tag.name) {
        case 'ACCOUNT' :
            if (pushAccountProcessor(this, tag, 
                (tag, processor, accountId) => this.childAccountIds.push(accountId)
            )) {
                return;
            }
            break;
        }

        return AccountProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class TransactionArrayProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.transactionIds = [];
        this.argsOnCloseCallback = this.transactionIds;
    }

    onOpenTag(tag) {
        switch (tag.name) {
        case 'TRANSACTION' :
        case 'INVESTMENTTRANSACTION' :
            if (tag.attributes.REFERENCE) {
                this.importer.pushProcessor(new TransactionReferenceProcessor(
                    this.importer, tag, (tag, processor, transactionId) => 
                        this.transactionIds.push(transactionId)
                ));
                return;
            }
            else if (tag.attributes.ID) {
                this.importer.pushProcessor(new TransactionDefinitionProcessor(
                    this.importer, tag, (tag, processor, transactionId) => 
                        this.transactionIds.push(transactionId)
                ));
                return;
            }
            break;
        }

        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class TransactionReferenceProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.transactionId = tag.attributes.REFERENCE;
        this.argsOnCloseCallback = this.transactionId;
    }
}

//
//---------------------------------------------------------
//
class TransactionDefinitionProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.transactionId = tag.attributes.ID;
        this.argsOnCloseCallback = this.transactionId;

        this.transaction = {
            transactionType: tag.name,
            id: this.transactionId,
        };
    }


    onOpenTag(tag) {
        switch (tag.name) {
        case 'DATE' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.transaction.date = processor.getTextAsString()
            ));
            return;

        case 'TIMESTAMP' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.transaction.lastModifiedTimeStamp = processor.getTextAsString()
            ));
            return;

        case 'NUMBER' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.transaction.number = processor.getTextAsString()
            ));
            return;

        case 'PAYEE' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.transaction.description = processor.getTextAsString()
            ));
            return;

        case 'TRANSACTIONENTRIES' :
            this.importer.pushProcessor(new TransactionEntriesProcessor(
                this.importer, tag, (tag, processor, transactionEntries) =>
                    this.transaction.transactionEntries = transactionEntries
            ));
            return;
        }

        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }


    onCloseProcessor() {
        this.importer.addTransaction(this.transaction);

        return XMLNodeProcessor.prototype.onCloseProcessor.call(this);
    }
}


//
//---------------------------------------------------------
//
class TransactionEntriesProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.transactionEntries = [];
        this.argsOnCloseCallback = this.transactionEntries;
    }

    onOpenTag(tag) {
        if (tag.name.startsWith('TRANSACTIONENTRY')) {
            this.importer.pushProcessor(new TransactionEntryProcessor(
                this.importer, tag, (tag, processor, transactionEntry) => 
                    this.transactionEntries.push(transactionEntry)
            ));
            return;
        }

        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class TransactionEntryProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.creditEntry = {};
        this.debitEntry = {};

        this.entry = {
            entryType: tag.name,
            creditEntry: this.creditEntry,
            debitEntry: this.debitEntry,
        };
        this.argsOnCloseCallback = this.entry;
    }


    pushAccount(tag, entry) {
        return pushAccountProcessor(this, tag, 
            (tag, processor, accountId) => entry.accountId = accountId
        );
    }

    pushAmount(tag, entry) {
        this.importer.pushProcessor(new XMLNodeProcessor(
            this.importer, tag, (tag, processor) =>
                entry.amount = processor.getTextAsString()));
        return true;
    }

    pushReconciled(tag, entry) {
        this.importer.pushProcessor(new XMLNodeProcessor(
            this.importer, tag, (tag, processor) =>
                entry.reconciled = processor.getTextAsString()));
        return true;
    }


    onOpenTag(tag) {
        switch (tag.name) {
        case 'TRANSACTIONTAG' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.entry.transactionTag = processor.getTextAsString()
            ));
            return;
        
        case 'CREDITACCOUNT' :
            if (this.pushAccount(tag, this.creditEntry)) {
                return;
            }
            break;

        case 'DEBITACCOUNT' :
            if (this.pushAccount(tag, this.debitEntry)) {
                return;
            }
            break;
        
        case 'CREDITAMOUNT' :
            if (this.pushAmount(tag, this.creditEntry)) {
                return;
            }
            break;
        
        case 'DEBITAMOUNT' :
            if (this.pushAmount(tag, this.debitEntry)) {
                return;
            }
            break;
        
        case 'CREDITRECONCILED' :
            if (this.pushReconciled(tag, this.creditEntry)) {
                return;
            }
            break;
        
        case 'DEBITRECONCILED' :
            if (this.pushReconciled(tag, this.debitEntry)) {
                return;
            }
            break;
        
        case 'MEMO' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.entry.memo = processor.getTextAsString()
            ));
            return;
        
        case 'PRICE' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.entry.price = processor.getTextAsString()
            ));
            return;
        
        case 'QUANTITY' :
            this.importer.pushProcessor(new XMLNodeProcessor(
                this.importer, tag, (tag, processor) =>
                    this.entry.quantity = processor.getTextAsString()
            ));
            return;
        }

        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class SecuritiesArrayProcessor extends XMLNodeProcessor {
    constructor(importer, tag, onCloseProcessorCallback) {
        super(importer, tag, onCloseProcessorCallback);

        this.securityIds = [];
        this.argsOnCloseCallback = this.securityIds;
    }

    onOpenTag(tag) {
        switch (tag.name) {
        case 'SECURITYNODE' :
            if (tag.attributes.REFERENCE) {
                this.securityIds.push(tag.attributes.REFERENCE);
            }
            else {
                this.importer.pushProcessor(new SECURITYNODE(
                    this.importer, tag, (tag, processor, id) =>
                        this.securityIds.push(id)));
                return;
            }
            break;
        }

        return XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
    }
}


//
//---------------------------------------------------------
//
class ROOTACCOUNT extends AccountDefinitionProcessor {
    constructor(importer, tag) {
        super(importer, tag);

        importer.rootAccountId = tag.attributes.ID;
    }

    /*
    onOpenTag(tag) {
        this.importer.pushProcessor(new DumpTag(this.importer, tag));
    }
    */
    onCloseProcessor() {
        //console.log('end ROOTACCOUNT');
        return AccountDefinitionProcessor.prototype.onCloseProcessor.call(this);
    }
}


const xmlAccountTypeMappings = {
    ASSET: A.AccountType.ASSET.name,
    BANK: A.AccountType.BANK.name,
    CASH: A.AccountType.CASH.name,
    CHECKING: A.AccountType.BANK.name,
    CREDIT: A.AccountType.CREDIT_CARD.name,
    EQUITY: A.AccountType.EQUITY.name,
    EXPENSE: A.AccountType.EXPENSE.name,
    INCOME: A.AccountType.INCOME.name,
    INVEST: A.AccountType.BROKERAGE.name,
    SIMPLEINVEST: A.AccountType.BROKERAGE.name,
    LIABILITY: A.AccountType.LIABILITY.name,
    MONEYMKRT: A.AccountType.BROKERAGE.name,
    MUTUAL: A.AccountType.MUTUAL_FUND.name,
};

const incomeAccountTagMappings = [
    {
        regexp: /\bINTEREST/,
        tags: [ StandardAccountTag.INTEREST.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.INTEREST_INCOME,
        childAccountTypes: [ 
            A.AccountType.BANK.name, 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.SECURITY.name, 
            A.AccountType.MUTUAL_FUND.name, 
            A.AccountType.REAL_ESTATE.name, 
            A.AccountType.PROPERTY.name, 
            A.AccountType.CREDIT_CARD.name, 
            A.AccountType.LOAN.name, 
            A.AccountType.MORTGAGE.name, 
        ],
    },
    {
        regexp: /\bDIVIDENDS*/,
        tags: [ StandardAccountTag.DIVIDENDS.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.DIVIDENDS_INCOME,
        childAccountTypes: [ 
            A.AccountType.BANK.name, 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.SECURITY.name, 
            A.AccountType.MUTUAL_FUND.name, 
        ],
    },
];

const expenseAccountTagMappings = [
    {
        regexp: /\bINTEREST/,
        tags: [ StandardAccountTag.INTEREST.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.INTEREST_EXPENSE,
        childAccountTypes: [ 
            A.AccountType.BANK.name, 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.SECURITY.name, 
            A.AccountType.MUTUAL_FUND.name, 
            A.AccountType.REAL_ESTATE.name, 
            A.AccountType.PROPERTY.name, 
            A.AccountType.CREDIT_CARD.name, 
            A.AccountType.LOAN.name, 
            A.AccountType.MORTGAGE.name, 
        ],
    },
    {
        regexp: /\bFEES/,
        tags: [ StandardAccountTag.FEES.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.FEES_EXPENSE,
        childAccountTypes: [ 
            A.AccountType.BANK.name, 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.SECURITY.name, 
            A.AccountType.MUTUAL_FUND.name, 
            A.AccountType.REAL_ESTATE.name, 
            A.AccountType.PROPERTY.name, 
            A.AccountType.CREDIT_CARD.name, 
            A.AccountType.LOAN.name, 
            A.AccountType.MORTGAGE.name, 
        ],
    },
    {
        regexp: /\bBANK\bFEES/,
        tags: [StandardAccountTag.BANK_FEES.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.FEES_EXPENSE,
        childAccountTypes: [ 
            A.AccountType.BANK.name, 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.CREDIT_CARD.name, 
            A.AccountType.LOAN.name, 
            A.AccountType.MORTGAGE.name, 
        ],
    },
    {
        regexp: /\bCOMMISSIONS/,
        tags: [ StandardAccountTag.BROKERAGE_COMMISSIONS.name, ],
        defaultSplitAccountType: DefaultSplitAccountType.FEES_EXPENSE,
        childAccountTypes: [ 
            A.AccountType.BROKERAGE.name, 
            A.AccountType.SECURITY.name, 
            A.AccountType.MUTUAL_FUND.name, 
            A.AccountType.REAL_ESTATE.name, 
        ],
    },
    {
        regexp: /\bTAXES/,
        tags: [
            StandardAccountTag.TAXES.name,
        ],
    }
];


//
//---------------------------------------------------------
//
class XMLFileImporterImpl {
    constructor(options) {
        const { accessor, pathNameToImport, newProjectPathName, 
            newFileContents, verbose, } = options;

        this.options = options;
        this.accessor = accessor;
        this.pathNameToImport = pathNameToImport,
        this.newProjectPathName = newProjectPathName;
        this.verbose = verbose;

        this.onOpenTag_OBJECT_STREAM = this.onOpenTag_OBJECT_STREAM.bind(this);
        this.onCloseTag_OBJECT_STREAM = this.onCloseTag_OBJECT_STREAM.bind(this);

        this.onOpenTag_LIST = this.onOpenTag_LIST.bind(this);
        this.onCloseTag_LIST = this.onCloseTag_LIST.bind(this);

        this.onOpenTag_TOP_LEVEL = this.onOpenTag_TOP_LEVEL.bind(this);
        this.onCloseTag_TOP_LEVEL = this.onCloseTag_TOP_LEVEL.bind(this);

        this.onOpenTag_PROCESSOR_STACK = this.onOpenTag_PROCESSOR_STACK.bind(this);
        this.onText_PROCESSOR_STACK = this.onText_PROCESSOR_STACK.bind(this);
        this.onCloseTag_PROCESSOR_STACK = this.onCloseTag_PROCESSOR_STACK.bind(this);

        this.state = 'OBJECT_STREAM';

        this.jsonExtras = options.jsonExtras || {};
        this.accountExtras = this.jsonExtras.accounts || {};
        this.pricedItemExtras = this.jsonExtras.pricedItems || {};
        this.applyToChildAccountsExtras = this.jsonExtras.applyToChildAccounts || {};

        this.processorStack = [];
        this.warnings = [];

        this.indent = 0;
        this.log = [];

        this.statusCallback = options.statusCallback;

        this.currenciesById = new Map();
        this.securitiesById = new Map();

        this.accountEntriesById = new Map();
        this.transactionsById = new Map();

        // Each entry is a SortedArray of the lots for the account id sorted by
        // creation date. The entries of the SortedArray are {ymdDate, lotEntries}
        // lotEntries is an array of {lot, quantity}
        this.lotsDateEntriesByAccountId = new Map();

        // The entries in lotsDateEntriesByAccountId mapped by lot id
        this.lotEntriesByLotId = new Map();

        this.newFileContents = Object.assign({
            pricedItems: {
                pricedItems: [],
            },
            lots: {
                lots: [],
            },
            prices: {
                prices: [],
            },
            accounts: {
                ASSET: [],
                LIABILITY: [],
                INCOME: [],
                EXPENSE: [],
                EQUITY: [],
            },
            transactions: {
                transactions: [],
            },
            reminders: {
                reminders: [],
            }
        },
        newFileContents);
    }


    onError(e) {
        console.log('error! ' + e);
    }


    onOpenTag_OBJECT_STREAM(tag) {
        if (tag.name === 'OBJECT-STREAM') {
            this.state = 'LIST';
        }
    }

    onCloseTag_OBJECT_STREAM(tagName) {
        if (tagName === 'OBJECT-STREAM') {
            this.state = 'DONE';
        }
    }


    onOpenTag_LIST(tag) {
        if (tag.name === 'LIST') {
            this.state = 'TOP_LEVEL';
        }
    }

    onCloseTag_LIST(tagName) {
        if (tagName === 'LIST') {
            this.state = 'OBJECT_STREAM';
        }
    }


    onOpenTag_TOP_LEVEL(tag) {
        let processor;
        switch (tag.name) {
        case 'CURRENCYNODE' :
            processor = new CURRENCYNODE(this, tag);
            break;
        
        case 'SECURITYNODE' :
            processor = new SECURITYNODE(this, tag);
            break;

        case 'ROOTACCOUNT' :
            processor = new ROOTACCOUNT(this, tag);
            break;
        
        default :
            processor = new XMLNodeProcessor(this, tag);
            break;
        }

        this.pushProcessor(processor);
    }

    onCloseTag_TOP_LEVEL(tagName) {
        if (tagName === 'LIST') {
            this.state = 'OBJECT_STREAM';
        }
    }


    pushProcessor(processor) {
        this.processorStack.push({
            prevState: this.state,
            processor: processor,
        });
        this.state = 'PROCESSOR_STACK';
    }

    popProcessor() {
        const { processorStack } = this;
        if (processorStack.length) {
            const entry = processorStack[processorStack.length - 1];
            entry.processor.onCloseProcessor();
            this.state = entry.prevState;
            --processorStack.length;
        }
    }


    onOpenTag_PROCESSOR_STACK(tag) {
        const { processorStack } = this;
        if (processorStack.length) {
            const entry = processorStack[processorStack.length - 1];
            entry.processor.onOpenTag(tag);
        }
    }

    onText_PROCESSOR_STACK(text) {
        const { processorStack } = this;
        if (processorStack.length) {
            const entry = processorStack[processorStack.length - 1];
            entry.processor.onText(text);
        }
    }

    onCloseTag_PROCESSOR_STACK(tag) {
        const { processorStack } = this;
        if (processorStack.length) {
            const entry = processorStack[processorStack.length - 1];
            if (entry.processor.onCloseTag(tag)) {
                this.popProcessor();
            }
        }
    }


    handleException(e) {
        this._error = e;
    }


    onOpenTag(tag) {
        if (this._error) {
            return;
        }

        const func = this['onOpenTag_' + this.state];
        if (func) {
            try {
                return func(tag);
            }
            catch (e) {
                this.handleException(e);
            }
        }
    }

    onText(text) {
        const func = this['onText_' + this.state];
        if (func) {
            return func(text);
        }
    }

    onCloseTag(tagName) {
        const func = this['onCloseTag_' + this.state];
        if (func) {
            try {
                return func(tagName);
            }
            catch (e) {
                this.handleException(e);
            }
        }
    }


    onEnd() {
        const { processorStack } = this;
        while (processorStack.length) {
            this.popProcessor();
        }
    }



    addCurrency({ id, currency }) {
        if (currency !== this.newFileContents.baseCurrency) {
            this.addPricedItem({
                id: id,
                type: PI.PricedItemType.CURRENCY.name,
                currency: currency,
            });
        }
        else {
            this.baseCurrencyId = id;
        }

        this.currenciesById.set(id, currency);
    }

    addPricedItem(pricedItem) {
        if (pricedItem.type !== PI.PricedItemType.CURRENCY.name) {
            if (pricedItem.currencyId) {
                pricedItem.currency = this.currenciesById.get(pricedItem.currencyId);
                delete pricedItem.currencyId;
            }
        }
        
        if (pricedItem.type === PI.PricedItemType.SECURITY.name) {
            this.securitiesById.set(pricedItem.id, pricedItem);

            const { securityPrefixMarksInactive } = this.options;
            if (securityPrefixMarksInactive) {
                const { ticker } = pricedItem;
                if (ticker && (ticker.charAt(0) === securityPrefixMarksInactive)) {
                    pricedItem.isInactive = true;
                }
            }
        }

        const extras = this.pricedItemExtras[pricedItem.id];
        if (extras) {
            Object.assign(pricedItem, extras);
        }

        this.newFileContents.pricedItems.pricedItems.push(pricedItem);
    }

    addPrices(pricesItem) {
        this.newFileContents.prices.prices.push(pricesItem);
    }


    addAccount(account) {
        this.accountEntriesById.set(account.id, account);
    }
    
    addTransaction(transaction) {
        this.transactionsById.set(transaction.id, transaction);
    }


    addReminder(reminder) {
        this.newFileContents.reminders.reminders.push(reminder);
    }


    updateStatus(msg) {
        if (this.statusCallback) {
            if (this.statusCallback(msg)) {
                this.isUserAbort = true;
                throw userError('XMLFileImporter-userCanceled');
            }
        }
    }


    recordLog(entry) {
        if (this.options.isLog) {
            this.log.push(entry);
        }
    }

    recordLogIndent(indent, entry) {
        if (this.options.isLog) {
            if (indent) {
                entry = '\t'.repeat(indent) + entry;
            }
            this.recordLog(entry);
        }
    }


    logAccount(entry, indent) {
        const prefix = (entry.context || 'Account') + ':\t'
            + entry.accountType + '\t';
        if (this.options.isLogAccountNames) {
            this.recordLogIndent(indent, prefix + entry.id + ' ' + entry.name);
        }
        else {
            this.recordLogIndent(indent, prefix + entry.id);
        }
    }


    logLot(entry) {
        if (this.options.isLogLots) {
            this.recordLog('Lot:\t' + entry);
        }
    }

    logTransaction(type, entry) {
        if (this.options.isLogTransactions) {
            const { xmlTransaction, splits, extra } = entry;
            let text = 'Transaction_' + type
                + '\t' + xmlTransaction.date
                + '\t' + xmlTransaction.description
                + '\t[';
            
            if (splits) {
                splits.forEach((split) => {
                    text += '\t' + split.accountId
                        + '\t' + split.quantity
                        + ';';
                });
            }
            
            text += '\t]';

            if (extra) {
                text += extra;
            }

            this.recordLog(text);
        }
    }


    recordWarning(warning) {
        this.warnings.push(warning);
    }

    makeFullAccountName(xmlAccounts, leafXMLAccount) {
        let fullName = '';
        if (xmlAccounts && xmlAccounts.length) {
            fullName = xmlAccounts[0].name;
            for (let i = 1; i < xmlAccounts.length; ++i) {
                fullName += '>' + xmlAccounts[i].name;
            }
        }

        if (leafXMLAccount) {
            if (fullName) {
                fullName += '>';
            }
            fullName += leafXMLAccount.name;
        }

        return fullName;
    }


    processXMLAccount(accounts, xmlAccount, depth, parentXMLAccounts) {
        // Figure out the priced item id...
        // If there's a security, use that.
        const account = {
            id: xmlAccount.id,
            name: xmlAccount.name,
            description: xmlAccount.description,
        };
        if (xmlAccount.isHidden) {
            account.isHidden = true;
        }
        if (xmlAccount.isInactive) {
            account.isInactive = true;
        }
        if (xmlAccount.isLocked) {
            account.isLocked = true;
        }
        if (xmlAccount.excludedFromBudget === 'true') {
            account.isExcludedFromBudget = true;
        }
        if (xmlAccount.notes) {
            account.notes = xmlAccount.notes;
        }
        if (xmlAccount.accountNumber && this.options.includeAccountNumbers) {
            // Account numbers are opt-in...
            account.accountNumber = xmlAccount.accountNumber;
        }
        if (xmlAccount.accountCode) {
            account.accountCode = xmlAccount.accountCode;
        }

        this.logAccount(xmlAccount, depth);


        const parentXMLAccount = parentXMLAccounts.length
            ? parentXMLAccounts[parentXMLAccounts.length - 1]
            : undefined;

        const { securityIds } = xmlAccount;
        if (securityIds && securityIds.length) {
            const security = this.securitiesById.get(securityIds[0]);
            if (!security) {
                this.recordWarning(userMsg('XMLFileImporter-securityId_not_found',
                    this.makeFullAccountName(parentXMLAccounts, xmlAccount),
                    securityIds[0]));
                return;
            }
            if (securityIds.length > 1) {
                this.recordWarning(userMsg('XMLFileImporter-multiple_securityIds',
                    this.makeFullAccountName(parentXMLAccounts, xmlAccount),
                    security.ticker,
                ));
            }

            account.type = A.AccountType.SECURITY.name;
            account.pricedItemId = securityIds[0];
        }
        else {
            // Need to map the account type.
            const type = xmlAccountTypeMappings[xmlAccount.accountType];
            if (!type) {
                this.recordWarning(userMsg(
                    'XMLFileImporter-unsupported_account_type',
                    this.makeFullAccountName(parentXMLAccounts, xmlAccount),
                    xmlAccount.accountType,
                ));
            }
            account.type = type;

            const { currencyId } = xmlAccount;
            if (currencyId && (currencyId !== this.baseCurrencyId)) {
                const currency = this.currenciesById.get(currencyId);
                if (!currency) {
                    this.recordWarning(userMsg(
                        'XMLFileImporter-account_currency_not_found',
                        this.makeFullAccountName(parentXMLAccounts, xmlAccount),
                        currencyId));
                }
                account.pricedItemId = currencyId;
            }
        }

        const { childAccountIds: xmlChildAccountIds } = xmlAccount;
        if (xmlChildAccountIds) {
            const childAccounts = [];
            xmlChildAccountIds.forEach((childAccountId) => {
                const childXMLAccount = this.accountEntriesById.get(childAccountId);
                if (!childXMLAccount) {
                    this.recordWarning(userMsg('XMLFileImporter-child_account_not_found',
                        this.makeFullAccountName(parentXMLAccounts, xmlAccount), 
                        childAccountId,
                    ));
                }
                else {
                    const newParentXMLAccounts = Array.from(parentXMLAccounts);
                    newParentXMLAccounts.push(xmlAccount);
                    this.processXMLAccount(childAccounts, childXMLAccount, 
                        depth + 1, newParentXMLAccounts);
                    
                    const childAccount = childAccounts[childAccounts.length - 1];
                    if (childAccount.type === A.AccountType.SECURITY.name) {
                        account.type = A.AccountType.BROKERAGE.name;
                    }
                }
            });

            account.childAccounts = childAccounts;
        }

        const { attributes: xmlAttributes } = xmlAccount;
        if (xmlAttributes) {
            // Reconcile info...
            const lastSuccessDateNumber = numberOrUndefined(
                xmlAttributes.get('Reconcile.LastSuccessDate'));
            const lastStatementDateNumber = numberOrUndefined(
                xmlAttributes.get('Reconcile.LastStatementDate'));
            // We don't convert the balances to numbers so they don't get treated
            // as quantity base values in NewFileSetup.
            const lastOpeningBalance = xmlAttributes.get('Reconcile.LastOpeningBalance');
            const lastClosingBalance = xmlAttributes.get('Reconcile.LastClosingBalance');
            /*
            const lastAttemptDate = numberOrUndefined(
                xmlAttributes.get('Reconcile.LastAttemptDate'));
            */
            if (lastSuccessDateNumber) {
                account.lastReconcileYMDDate = new YMDDate(lastSuccessDateNumber);
                if (lastOpeningBalance) {
                    account.lastReconcileBalance = lastOpeningBalance;
                }
                if (lastClosingBalance) {
                    account.pendingReconcileBalance = lastClosingBalance;
                }
            }
            if (lastStatementDateNumber
             && (lastStatementDateNumber !== lastSuccessDateNumber)) {
                account.pendingReconcileYMDDate = new YMDDate(lastStatementDateNumber);
                if (lastClosingBalance) {
                    account.pendingReconcileBalance = lastClosingBalance;
                }
            }
        }

        xmlAccount.account = account;

        if (parentXMLAccount) {
            const applyToChildExtras 
                = this.applyToChildAccountsExtras[parentXMLAccount.id];
            if (applyToChildExtras) {
                Object.assign(account, applyToChildExtras);
            }
        }

        const extras = this.accountExtras[account.id];
        if (extras) {
            Object.assign(account, extras);
        }
        
        accounts.push(account);

        return true;
    }


    finalizeXMLAccount(xmlAccount) {
        // Make sure we're in the parent's child list.
        const { id, parentId } = xmlAccount;
        const parentAccount = this.accountEntriesById.get(parentId);

        if (parentAccount) {
            const { childAccountIds } = parentAccount;
            if (!childAccountIds) {
                parentAccount.childAccountIds = [ id ];
            }
            else {
                let index;
                for (index = 0; index < childAccountIds.length; ++index) {
                    if (childAccountIds[index] === id) {
                        break;
                    }
                }
                childAccountIds[index] = id;
            }
        }
    }


    postProcessAccounts() {
        const { newFileContents } = this;
        const { accounts } = newFileContents;

        this.accountEntriesById.forEach((xmlAccount) => 
            this.finalizeXMLAccount(xmlAccount));


        const rootAccount = this.accountEntriesById.get(this.rootAccountId);

        const rootXMLAccountsToProcess = {
            ASSET: [],
            LIABILITY: [],
            INCOME: [],
            EXPENSE: [],
            EQUITY: [],
        };

        rootAccount.childAccountIds.forEach((childAccountId) => {
            const xmlAccount = this.accountEntriesById.get(childAccountId);
            if (!xmlAccount) {
                this.recordWarning(userMsg('XMLFileImporter-root_account_not_found', 
                    childAccountId));
                return;
            }

            this.recordLog('Root child: ' 
                + xmlAccount.accountType + ' ' + childAccountId);

            const rootXMLAccounts = rootXMLAccountsToProcess[xmlAccount.accountType];
            if (!rootXMLAccounts) {
                this.recordWarning(userMsg('XMLFileImporter-root_account_type_invalid',
                    xmlAccount.name, xmlAccount.accountType,
                ));
            }
                
            // If the account has any transactions, we want to treat the account
            // as a child of our root account, otherwise, add its children to our
            // root account.
            const { transactionIds, childAccountIds } = xmlAccount;
            if (transactionIds && transactionIds.length) {
                this.logAccount({
                    context: 'Straight Root',
                    id: xmlAccount.id,
                    name: xmlAccount.name,
                });
                rootXMLAccounts.push(xmlAccount);
            }
            else if (childAccountIds) {
                this.recordLog('Root child accounts: ' + childAccountIds.length);

                childAccountIds.forEach((childAccountId) => {
                    const childXMLAccount = this.accountEntriesById.get(childAccountId);
                    if (!childXMLAccount) {
                        this.recordWarning(userMsg(
                            'XMLFileImporter-root_account_type_invalid',
                            xmlAccount.name, xmlAccount.accountType,
                        ));
                        return;
                    }
                    rootXMLAccounts.push(childXMLAccount);

                    this.logAccount({
                        context: 'Root account child',
                        id: childAccountId,
                        name: childXMLAccount.name,
                    });
                });
            } 
        });

        for (let accountType in rootXMLAccountsToProcess) {
            const rootXMLAccounts = rootXMLAccountsToProcess[accountType];
            let rootAccounts = accounts[accountType];
            if (!rootAccounts) {
                rootAccounts = [];
                accounts[accountType] = rootAccounts;
            }

            this.recordLog('Adding ' + accountType + ' accounts.');

            rootXMLAccounts.forEach((xmlAccount) => {
                this.processXMLAccount(rootAccounts, xmlAccount, 1, []);
            });
        }

        // Try to tag income and expense accounts.
        this.tagIncomeAccounts();
        this.tagExpenseAccounts();
    }

    tagIncomeAccounts() {
        const { newFileContents } = this;
        const { accounts } = newFileContents;
        this.applyAccountTags(accounts.INCOME, incomeAccountTagMappings);
    }

    tagExpenseAccounts() {
        const { newFileContents } = this;
        const { accounts } = newFileContents;
        this.applyAccountTags(accounts.EXPENSE, expenseAccountTagMappings);
    }


    applyAccountTags(accounts, tagMappings) {
        accounts.forEach((account) => {
            tagMappings.forEach((mapping) => {
                if (mapping.regexp) {
                    if (mapping.regexp.test(account.name.toUpperCase())) {
                        if (!account.tags) {
                            account.tags = [];
                        }
                        account.tags = account.tags.concat(mapping.tags);

                        if (mapping.defaultSplitAccountType
                         && mapping.childAccountTypes
                         && account.childAccounts) {
                            this.applyDefaultSplitAccountTypes(account.childAccounts,
                                mapping);
                        }
                    }
                }
            });
        });
    }

    applyDefaultSplitAccountTypes(accounts, mapping, parentAccountNames) {
        accounts.forEach((account) => {
            // Apply the child accounts first so they get priority of
            // the children of the asset accounts.
            parentAccountNames = parentAccountNames || [];

            const assetAccount = this.findAssetAccountWithName(account.name, 
                parentAccountNames);
            if (account.childAccounts) {
                const grandparentAccountNames = Array.from(parentAccountNames);
                grandparentAccountNames.push(account.name);
                this.applyDefaultSplitAccountTypes(account.childAccounts, mapping,
                    grandparentAccountNames);
            }

            if (assetAccount) {
                if (mapping.childAccountTypes.indexOf(assetAccount.type) >= 0) {
                    // Match!
                    const { property } = mapping.defaultSplitAccountType;
                    this.applyDefaultSplitAccountIds(assetAccount, property, account.id);

                    // Use this account as the default for any children that don't
                    // have their own accounts....
                    const { childAccounts } = assetAccount;
                    if (childAccounts) {
                        childAccounts.forEach((childAccount) => {
                            this.applyDefaultSplitAccountIds(childAccount, 
                                property, account.id);
                        });
                    }
                }
            }
        });
    }

    applyDefaultSplitAccountIds(assetAccount, property, accountId) {
        let { defaultSplitAccountIds } = assetAccount;
        if (!defaultSplitAccountIds) {
            defaultSplitAccountIds = {};
            assetAccount.defaultSplitAccountIds = defaultSplitAccountIds;
        }

        if (!defaultSplitAccountIds[property]) {   
            defaultSplitAccountIds[property]
                = accountId;
        }
    }


    findAssetAccountWithName(name, parentAccountNames) {
        const { newFileContents } = this;
        const { accounts } = newFileContents;
        const assetAccounts = accounts.ASSET;
        return this.findAccountWithName(assetAccounts, name, parentAccountNames);
    }

    findAccountWithName(accounts, name, parentAccountNames) {
        if (!name) {
            return;
        }

        if (parentAccountNames && parentAccountNames.length) {
            const parentAccount = this.findAccountWithName(accounts,
                parentAccountNames[parentAccountNames.length - 1],
                parentAccountNames.slice(0, parentAccountNames.length - 1));
            if (parentAccount) {
                accounts = parentAccount.childAccounts;
            }
        }

        name = name.toUpperCase();
        for (let i = 0; i < accounts.length; ++i) {
            const account = accounts[i];
            if (account.name && (account.name.toUpperCase() === name)) {
                return accounts[i];
            }

            if (account.childAccounts) {
                const childAccount = this.findAccountWithName(
                    account.childAccounts, name);
                if (childAccount) {
                    return childAccount;
                }
            }
        }
    }


    getEquityAccountId(accountId) {
        return 'EQUITY';
    }


    getFeesAccountId(accountId) {
        return makeDefaultSplitsAccountId(
            DefaultSplitAccountType.FEES_EXPENSE.name, accountId);
    }


    getDividendsAccountId(accountId) {
        return makeDefaultSplitsAccountId(
            DefaultSplitAccountType.DIVIDENDS_INCOME.name, accountId);
    }


    createSplitFromCreditDebitEntry(entry, xmlTransaction) {
        const split = {
            accountId: entry.accountId,
            quantity: entry.amount,
        };

        const accountEntry = this.accountEntriesById.get(entry.accountId);
        if (!accountEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_accountId_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                entry.accountId,
            ));
            return;
        }

        const accountType = A.getAccountType(accountEntry.account.type);
        if (accountType.hasLots) {
            // Gotta use the parent.
            this.recordWarning(userMsg(
                'XMLFileImporter-lotTransaction_cash_uses_parent',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            split.accountId = accountEntry.parentId;
        }

        if (entry.reconciled === 'RECONCILED') {
            split.reconcileState = T.ReconcileState.RECONCILED.name;
        }
        else if (entry.reconciled === 'CLEARED') {
            split.reconcileState = T.ReconcileState.PENDING.name;
        }

        if (entry.description) {
            split.description = entry.memo;
        }


        return split;
    }


    makeLotId(accountId, lotId) {
        return accountId + '-' + lotId;
    }


    isCreditDebitEntryExpenseAccount(entry) {
        const { accountId } = entry;
        let accountEntry = this.accountEntriesById.get(accountId);
        if (!accountEntry) {
            return;
        }

        const type = A.getAccountType(accountEntry.account.type);
        return type.category === A.AccountCategory.EXPENSE;
    }


    isCreditDebitEntryInvesmentAccount(entry) {
        const { accountId } = entry;
        let accountEntry = this.accountEntriesById.get(accountId);
        if (!accountEntry) {
            return;
        }

        const type = A.getAccountType(accountEntry.account.type);
        return type.hasLots;
    }

    getCreditDebitEntryWithInvestmentAccount(xmlTransactionEntry) {
        if (this.isCreditDebitEntryInvesmentAccount(
            xmlTransactionEntry.creditEntry)) {
            return xmlTransactionEntry.creditEntry;
        }
        else if (this.isCreditDebitEntryInvesmentAccount(
            xmlTransactionEntry.debitEntry)) {
            return xmlTransactionEntry.debitEntry;
        }
    }


    addLot(xmlTransaction, xmlTransactionEntry, lotOriginType) {
        const investmentEntry = this.getCreditDebitEntryWithInvestmentAccount(
            xmlTransactionEntry
        );
        if (!investmentEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const accountId = investmentEntry.accountId;

        let lotsDateEntries = this.lotsDateEntriesByAccountId.get(accountId);
        if (lotsDateEntries === undefined) {
            lotsDateEntries = new SortedArray((a, b) => 
                YMDDate.compare(a.ymdDate, b.ymdDate));
            this.lotsDateEntriesByAccountId.set(accountId, lotsDateEntries);
        }


        let lotId;
        const { memo } = xmlTransactionEntry;
        if (memo) {
            const lotItems = this.parseStringToLotIds(memo);
            if (lotItems && lotItems.length) {
                lotId = lotItems[0].lotId;
            }
        }

        const specifiedLotId = lotId;
        if (!lotId) {
            // The transaction date is yyyy-mm-dd
            // We want Lot ids to be mm/dd/yy
            const dateParts = xmlTransaction.date.split('-');
            lotId = dateParts[1] + '/' + dateParts[2] 
                + '/' + dateParts[0].slice(2);
        }

        lotId = this.makeLotId(accountId, lotId);

        let lotsDateEntry = {
            ymdDate: new YMDDate(xmlTransaction.date),
            lotEntries: [],
        };

        if (lotsDateEntries.add(lotsDateEntry) < 0) {
            // Already an entry.
            const index = lotsDateEntries.indexOf(lotsDateEntry);
            lotsDateEntry = lotsDateEntries.at(index);

            // Need a unique date.
            if (!specifiedLotId && lotsDateEntry.lotEntries.length) {
                lotId += '-' + lotsDateEntry.lotEntries.length;
            }
        }

        const accountEntry = this.accountEntriesById.get(accountId);
        const lot = {
            id: lotId,
            pricedItemId: accountEntry.account.pricedItemId,
            lotOriginType: lotOriginType,
        };

        let lotEntry = {
            lot: lot,
            quantity: numberOrUndefined(xmlTransactionEntry.quantity),
        };
        lotsDateEntry.lotEntries.push(lotEntry);


        this.logLot('accountId: ' + accountId
            + '\tdate: ' + lotsDateEntry.ymdDate.toString()
            + '\tlotId: ' + lotId
            + '\tquantity:' + lotEntry.quantity);

        this.lotEntriesByLotId.set(lotId, lotEntry);

        return lotId;
    }


    //
    // Returns an array of { lotId, shares }, where shares may be undefined.
    parseStringToLotIds(text) {
        if (!text) {
            return;
        }

        const lotItems = [];

        const entries = text.split(';').map(entry => entry.trim().toUpperCase());
        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            let contents;
            if (entry.startsWith('LOT:') || entry.startsWith('LOT ')) {
                contents = entry.slice(4).trim();
            }
            else {
                continue;
            }

            const lotItem = {};

            const lastSpaceIndex = contents.lastIndexOf(' ');
            if (lastSpaceIndex > 0) {
                const shares = parseFloat(contents.slice(lastSpaceIndex));
                if (!isNaN(shares)) {
                    contents = contents.slice(0, lastSpaceIndex).trim();
                    lotItem.shares = shares;
                }
            }

            lotItem.lotId = contents;
            lotItems.push(lotItem);
        }

        if (lotItems.length) {
            return lotItems;
        }
    }


    //
    //-----------------------------------------------------
    //
    numberToCurrencyText(number) {
        number = Math.round(number * 100) / 100;
        return number.toString();
    }



    //
    //-----------------------------------------------------
    //
    getTransactionEntryCostBasis(transactionEntry) {
        if ((transactionEntry.price !== undefined)
         && (transactionEntry.quantity !== undefined)) {
            let costBasis = parseFloat(transactionEntry.price)
                * parseFloat(transactionEntry.quantity);
            if (!isNaN(costBasis)) {
                return this.numberToCurrencyText(costBasis);
            }
        }
    }


    //
    //-----------------------------------------------------
    //
    addInvestmentFeesSplit({
        splits, xmlTransaction, costBasis, }) {
        const { transactionEntries } = xmlTransaction;
        if (transactionEntries.length <= 1) {
            return costBasis;
        }

        // Look for the INVESTMENT_FEE tag.
        let feeEntry;
        for (let i = 0; i < transactionEntries.length; ++i) {
            if (transactionEntries[i].transactionTag === 'INVESTMENT_FEE') {
                feeEntry = transactionEntries[i];
                break;
            }
        }

        if (feeEntry === undefined) {
            // Just warn for now.
            this.recordWarning(userMsg(
                'XMLFileImporter-extra_investment_transaction_entries',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
        }
        else {
            const { creditEntry, debitEntry } = feeEntry;
            let entry = feeEntry.creditEntry;
            let fee;
            let amount;
            let accountId;
            if (creditEntry.accountId === debitEntry.accountId) {
                // This happens if the security sale goes back into the security account.
                // We want to send it to expenses.
                let creditFee = numberOrUndefined(creditEntry.amount);
                let debitFee = numberOrUndefined(debitEntry.amount);
                if (creditFee > 0) {
                    fee = creditFee;
                    entry = creditEntry;
                }
                else if (debitFee > 0) {
                    fee = debitFee;
                    entry = debitEntry;
                }
                else {
                    fee = Math.abs(creditFee);
                    amount = this.numberToCurrencyText(fee);
                }

                accountId = this.getFeesAccountId(creditEntry.accountId);

                this.recordWarning(userMsg(
                    'XMLFileImporter-investment_fees_to_investment',
                    xmlTransaction.date,
                    xmlTransaction.description,
                ));
            }
            else if (this.isCreditDebitEntryExpenseAccount(feeEntry.creditEntry)) {
                entry = feeEntry.creditEntry;
            }
            else if (this.isCreditDebitEntryExpenseAccount(feeEntry.debitEntry)) {
                entry = feeEntry.debitEntry;
            }
            else if (this.isCreditDebitEntryInvesmentAccount(feeEntry.creditEntry)) {
                entry = feeEntry.debitEntry;
            }
            else {
                entry = feeEntry.creditEntry;
            }
            if (accountId === undefined) {
                accountId = entry.accountId;
            }
            if (amount === undefined) {
                amount = entry.amount;
            }

            if (fee === undefined) {
                fee = numberOrUndefined(entry.amount);
            }
            if (fee === undefined) {
                this.recordWarning(userMsg(
                    'XMLFileImporter-investment_transaction_invalid_fee',
                    xmlTransaction.date,
                    xmlTransaction.description,
                    amount,
                ));
            }
            else {
                costBasis = numberOrUndefined(costBasis);
                costBasis -= fee;
                costBasis = this.numberToCurrencyText(costBasis);

                splits.push({
                    quantity: amount,
                    accountId: accountId,
                });
            }
        }

        return costBasis;
    }


    //
    //-----------------------------------------------------
    //
    processTransactionEntryAddX({ splits, xmlTransaction, mainEntry }) {
        const lotId = this.addLot(xmlTransaction, mainEntry,
            L.LotOriginType.CASH_PURCHASE.name);
        if (!lotId) {
            return;
        }

        const { accountId } = mainEntry.creditEntry;
        const costBasis = this.getTransactionEntryCostBasis(mainEntry);
        splits.push({
            quantity: costBasis,
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.BUY_SELL.name,
            lotChanges: [
                {
                    lotId: lotId,
                    quantity: mainEntry.quantity,
                    costBasis: costBasis,
                }
            ]
        });
        splits.push({
            quantity: '-' + costBasis,
            accountId: this.getEquityAccountId(accountId),
        });

        this.logTransaction('AddX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
                extra: '\t' + mainEntry.quantity + '@' + mainEntry.price,
            });
        return true;
    }


    updateDecimalPlacesFromInvestmentCreditDebitEntry(mainEntry, accountEntry) {
        if (typeof accountEntry === 'string') {
            accountEntry = this.accountEntriesById.get(accountEntry);
        }

        const { quantity } = mainEntry;
        if (accountEntry.quantityDefinitionChecked || !quantity) {
            return;
        }

        const security = this.securitiesById.get(accountEntry.account.pricedItemId);
        if (!security) {
            return;
        }

        const decimalIndex = quantity.indexOf('.');
        if (decimalIndex < 0) {
            return;
        }

        const decimalPlaces = quantity.slice(decimalIndex + 1).length;
        if ((decimalPlaces < 4) || (decimalPlaces > 8)) {
            return;
        }

        if (!security.decimalPlaces || (decimalPlaces > security.decimalPlaces)) {
            security.decimalPlaces = decimalPlaces;
            security.quantityDefinition = getDecimalDefinition(decimalPlaces).getName();
        }
    }


    handleESPPMemo({splits, mainEntry, xmlTransaction, accountEntry, }) {
        let grantYMDDate;
        let grantDateFMVPrice;
        let purchaseDateFMVPrice;

        const { memo } = mainEntry;
        if (memo) {
            const parts = memo.split(';').map(entry => entry.trim().toUpperCase());
            for (let i = 0; i < parts.length; ++i) {
                const part = parts[i];
                if (part.startsWith('SDATE:') || part.startsWith('SDATE ')) {
                    grantYMDDate = part.slice(6).trim();
                }
                else if (part.startsWith('SFMV:') || part.startsWith('SFMV ')
                    || part.startsWith('GFMV:') || part.startsWith('GFMV')) {
                    grantDateFMVPrice = Number.parseFloat(part.slice(5).trim());
                }
                else if (part.startsWith('PFMV:') || part.startsWith('PFMV ')) {
                    purchaseDateFMVPrice = Number.parseFloat(part.slice(5).trim());
                }
            }

            if (Number.isNaN(grantDateFMVPrice)) {
                grantDateFMVPrice = undefined;
            }
            else if (Number.isNaN(purchaseDateFMVPrice)) {
                purchaseDateFMVPrice = undefined;
            }
        }

        const { account } = accountEntry;

        if (grantYMDDate
         && (typeof grantDateFMVPrice === 'number')
         && (typeof purchaseDateFMVPrice === 'number')) {
            splits[0].esppBuyInfo = {
                grantYMDDate: grantYMDDate,
                grantDateFMVPrice: grantDateFMVPrice,
                purchaseDateFMVPrice: purchaseDateFMVPrice,
            };

            // Switch the account to ESPP if necessary.
            account.type = A.AccountType.ESPP_SECURITY.name;
        }
        else if (account.type === A.AccountType.ESPP_SECURITY.name) {
            // Need all that info...
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_esppBuyInfo_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        return true;
    }


    //
    //-----------------------------------------------------
    //
    processTransactionEntryBuyX(args) {
        const { splits, xmlTransaction, mainEntry } = args;
        const lotId = this.addLot(xmlTransaction, mainEntry,
            L.LotOriginType.CASH_PURCHASE.name);
        if (!lotId) {
            return;
        }

        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const { accountId } = investmentCreditDebitEntry;
        const accountEntry = this.accountEntriesById.get(accountId);

        this.updateDecimalPlacesFromInvestmentCreditDebitEntry(
            mainEntry, accountEntry);

        let costBasis = this.getTransactionEntryCostBasis(mainEntry);
        splits.push({
            quantity: costBasis,
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.BUY_SELL.name,
            lotChanges: [
                {
                    lotId: lotId,
                    quantity: mainEntry.quantity,
                    costBasis: costBasis,
                }
            ]
        });

        costBasis = this.addInvestmentFeesSplit({
            splits: splits,
            xmlTransaction: xmlTransaction,
            costBasis: '-' + costBasis
        });
        if (!costBasis) {
            return;
        }

        // Need to update the cost basis of the lot with the fee.
        // The first character is '-'...
        splits[0].lotChanges[0].costBasis = costBasis.slice(1);

        let fundingQuantity = costBasis;
        let fundingAccountId = accountEntry.parentId;

        const otherCreditDebitEntry 
            = (investmentCreditDebitEntry === mainEntry.creditEntry)
                ? mainEntry.debitEntry
                : mainEntry.creditEntry;
        if ((accountId !== otherCreditDebitEntry.accountId)
         && otherCreditDebitEntry.amount) {
            fundingAccountId = otherCreditDebitEntry.accountId;
        }

        splits.push({
            quantity: fundingQuantity,
            accountId: fundingAccountId,
        });

        if (!this.handleESPPMemo({
            splits: splits,
            xmlTransaction: xmlTransaction,
            mainEntry: mainEntry,
            accountEntry: accountEntry,
        })) {
            return;
        }

        this.logTransaction('BuyX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
                extra: '\t' + mainEntry.quantity + '@' + mainEntry.price,
            });
        return true;
    }
    
    

    //
    //-----------------------------------------------------
    //
    processTransactionEntryDividendX({ splits, xmlTransaction, mainEntry, }) {
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }
        
        const accountEntry = this.accountEntriesById.get(
            investmentCreditDebitEntry.accountId);
        if (!accountEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-dividend_account_id_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                investmentCreditDebitEntry.accountId,
            ));
            return;
        }

        splits.push({
            accountId: accountEntry.parentId,
            quantity: investmentCreditDebitEntry.amount,
        });

        const dividendCreditDebitEntry 
            = (investmentCreditDebitEntry === mainEntry.creditEntry)
                ? mainEntry.debitEntry
                : mainEntry.creditEntry;
        const dividendAccountEntry = this.accountEntriesById.get(
            dividendCreditDebitEntry.accountId);
        if (!dividendAccountEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-dividend_account_id_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                dividendCreditDebitEntry.accountId,
            ));
            return;
        }

        splits.push({
            accountId: dividendAccountEntry.id,
            quantity: dividendCreditDebitEntry.amount,
        });


        this.logTransaction('DividendX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
            });
        return true;
    }


    //
    //-----------------------------------------------------
    //
    processTransactionEntryReinvestDivX({ splits, xmlTransaction, mainEntry, }) {
        const lotId = this.addLot(xmlTransaction, mainEntry,
            L.LotOriginType.REINVESTED_DIVIDEND.name);
        if (!lotId) {
            return;
        }

        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const { accountId } = investmentCreditDebitEntry;

        this.updateDecimalPlacesFromInvestmentCreditDebitEntry(
            mainEntry, accountId);


        let costBasis = this.getTransactionEntryCostBasis(mainEntry);
        splits.push({
            quantity: costBasis,
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.REINVESTED_DIVIDEND.name,
            lotChanges: [
                {
                    lotId: lotId,
                    quantity: mainEntry.quantity,
                    costBasis: costBasis,
                }
            ]
        });

        costBasis = this.addInvestmentFeesSplit({
            splits: splits,
            xmlTransaction: xmlTransaction,
            costBasis: '-' + costBasis
        });
        if (!costBasis) {
            return;
        }

        // Need to update the cost basis of the lot with the fee.
        // The first character is '-'...
        splits[0].lotChanges[0].costBasis = costBasis.slice(1);

        splits.push({
            quantity: costBasis,
            accountId: this.getDividendsAccountId(accountId),
        });

        this.logTransaction('ReinvestDivX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
                extra: '\t' + mainEntry.quantity + '@' + mainEntry.price,
            });
        return true;
    }


    //
    //-----------------------------------------------------
    //
    removeFIFOQuantityFromLots(
        { accountId, quantity, lotChanges, xmlTransaction, }) {

        if (lotChanges) {
            lotChanges.length = 0;
        }
        if (quantity <= 0) {
            return;
        }

        const lotsDateEntries = this.lotsDateEntriesByAccountId.get(accountId);
        if (!lotsDateEntries) {
            this.recordWarning(userMsg(
                'XMLFileImporter-removeFIFO_lot_account_id_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                accountId,
            ));
            return;
        }

        const originalQuantity = quantity;
        const originalQuantities = [];
        if (this.options.isLogTransactions) {
            lotsDateEntries.forEach((lotsDateEntry) => {
                lotsDateEntry.lotEntries.forEach((entry) => {
                    originalQuantities.push(entry.quantity);
                });
            });
        }

        let i = 0;
        for (; i < lotsDateEntries.length; ++i) {
            const lotsDateEntry = lotsDateEntries.at(i);
            const { lotEntries } = lotsDateEntry;
            for (let l = 0; l < lotEntries.length; ++l) {
                const lotEntry = lotEntries[l];
                if (lotEntry.quantity > 0) {
                    const toRemove = Math.min(lotEntry.quantity, quantity);
                    lotEntry.quantity -= toRemove;
                    quantity -= toRemove;

                    lotEntry.quantity = cleanNumber(lotEntry.quantity);
                    quantity = cleanNumber(quantity);

                    if (lotChanges) {
                        lotChanges.push({
                            lotId: lotEntry.lot.id,
                            quantity: toRemove,
                        });
                    }

                    if (quantity <= 0) {
                        break;
                    }
                }
            }

            if (quantity <= 0) {
                break;
            }
        }

        if (quantity > 0) {
            this.recordWarning(userMsg(
                'XMLFileImporter-removeFIFO_not_enough_lot_shares',
                xmlTransaction.date,
                xmlTransaction.description,
                quantity,
            ));

            if (this.options.isLogTransactions) {
                let extra = '\t' + originalQuantity + '\t' + quantity + '\t'
                    + originalQuantities.join(', ');
                this.logTransaction('NOT_ENOUGH_SHARES',
                    {
                        xmlTransaction: xmlTransaction,
                        extra: extra,
                    });
            }
            return;
        }

        return true;
    }


    //
    //-----------------------------------------------------
    //
    removeLotQuantitiesFromSpecificLots(
        { accountId, xmlTransaction, xmlTransactionEntry, lots, lotChanges, }) {

        let quantityRemaining = numberOrUndefined(xmlTransactionEntry.quantity);

        const lotEntryUpdates = [];

        for (let i = 0; i < lots.length; ++i) {
            const lot = lots[i];
            const lotId = this.makeLotId(accountId, lot.lotId);
            const lotChange = {
                lotId: lotId,
            };

            const lotEntry = this.lotEntriesByLotId.get(lotId);
            if (!lotEntry) {
                this.recordWarning(userMsg(
                    'XMLFileImporter-sellLot_lotId_invalid',
                    xmlTransaction.date,
                    xmlTransaction.description,
                    lotId,
                ));
                return;
            }

            let currentLotQuantity = lotEntry.quantity;

            let lotQuantity;
            if (lot.shares !== undefined) {
                lotChange.quantity = '-' + lot.shares;
                lotQuantity = numberOrUndefined(lot.shares);
            }
            else {
                lotQuantity = Math.min(quantityRemaining, currentLotQuantity);

                lotChange.quantity = '-' + lotQuantity;
            }
            quantityRemaining -= lotQuantity;
            currentLotQuantity -= lotQuantity;

            if (currentLotQuantity < 0) {
                this.recordWarning(userMsg(
                    'XMLFileImporter-sellLot_lot_quantity_negative',
                    xmlTransaction.date,
                    xmlTransaction.description,
                    lotId,
                ));

                this.logTransaction('LOT_QUANTITY_NEGATIVE',
                    {
                        xmlTransaction: xmlTransaction,
                    });
                return;
            }

            lotEntryUpdates.push([lotEntry, currentLotQuantity]);

            lotChanges.push(lotChange);
        }

        lotEntryUpdates.forEach(([lotEntry, quantity]) => 
            lotEntry.quantity = quantity);

        return true;
    }


    //
    //-----------------------------------------------------
    //
    createLotRemovalSplit(
        { splits, xmlTransaction, mainEntry, dstAccountId, logType }) {
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const { accountId } = investmentCreditDebitEntry;

        let costBasis = this.getTransactionEntryCostBasis(mainEntry);
        const mainSplit = {
            quantity: '-' + costBasis,
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.BUY_SELL.name,
            lotChanges: [],
        };

        // Do we have lots identified?
        let lots = this.parseStringToLotIds(mainEntry.memo);
        if (lots && lots.length) {
            if (!this.removeLotQuantitiesFromSpecificLots({ 
                accountId: accountId, 
                xmlTransaction: xmlTransaction, 
                xmlTransactionEntry: mainEntry, 
                lots: lots, 
                lotChanges: mainSplit.lotChanges,
            })) {
                return;
            }
        }
        else {
            if (!this.removeFIFOQuantityFromLots({
                accountId: accountId, 
                quantity: numberOrUndefined(mainEntry.quantity),
                xmlTransaction: xmlTransaction, 
                xmlTransactionEntry: mainEntry, 
            })) {
                return;
            }
            mainSplit.sellAutoLotType = T.AutoLotType.FIFO.name;
            mainSplit.sellAutoLotQuantity = mainEntry.quantity;
        }

        splits.push(mainSplit);


        costBasis = this.addInvestmentFeesSplit({
            splits: splits,
            xmlTransaction: xmlTransaction,
            costBasis: costBasis
        });
        if (!costBasis) {
            return;
        }

        splits.push({
            quantity: costBasis,
            accountId: dstAccountId,
        });

        this.logTransaction(logType,
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
                extra: '\t' + mainEntry.quantity + '@' + mainEntry.price,
            });
        return true;
    }

    //
    //-----------------------------------------------------
    //
    processTransactionEntryRemoveX(args) {
        const { xmlTransaction, mainEntry, } = args;
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        args = Object.assign({}, args, {
            dstAccountId: this.getEquityAccountId(mainEntry.accountId),
            logType: 'RemoveX',
        });
        return this.createLotRemovalSplit(args);
    }

    //
    //-----------------------------------------------------
    //
    processTransactionEntrySellX(args) {
        const { xmlTransaction, mainEntry, } = args;
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }


        const { accountId } = investmentCreditDebitEntry;
        const accountEntry = this.accountEntriesById.get(accountId);

        this.updateDecimalPlacesFromInvestmentCreditDebitEntry(
            mainEntry, accountEntry);

        args = Object.assign({}, args, {
            dstAccountId: accountEntry.parentId,
            logType: 'SellX',
        });

        const otherCreditDebitEntry 
            = (investmentCreditDebitEntry === mainEntry.creditEntry)
                ? mainEntry.debitEntry : mainEntry.creditEntry;
        if (otherCreditDebitEntry.accountId !== accountId) {
            const dstAccount = this.accountEntriesById.get(
                otherCreditDebitEntry.accountId);
            if (dstAccount) {
                args.dstAccountId = otherCreditDebitEntry.accountId;
            }
        }

        return this.createLotRemovalSplit(args);
    }


    //
    //-----------------------------------------------------
    //
    getAccountQuantityDefinition(accountId) {
        return getDecimalDefinition(4);
    }


    //
    //-----------------------------------------------------
    //
    adjustLotsForSplitMerge(
        { accountId, xmlTransaction, xmlTransactionEntry, lotChanges,
            sign, }) {

        const accountLotsDateEntries = this.lotsDateEntriesByAccountId.get(accountId);
        if (!accountLotsDateEntries) {
            this.recordWarning(userMsg(
                'XMLFileImporter-mergeSplit_account_id_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                accountId,
            ));
            return;
        }

        const quantityDefinition = this.getAccountQuantityDefinition(accountId);

        const quantityRemaining = numberOrUndefined(xmlTransactionEntry.quantity);
        let remainingSharesBaseValue = quantityDefinition.numberToBaseValue(
            quantityRemaining
        );

        let totalSharesBaseValue = 0;
        const lotSharesBaseValues = [];
        accountLotsDateEntries.forEach((lotsDateEntry) => {
            lotsDateEntry.lotEntries.forEach((lotEntry) => {
                const quantityBaseValue = quantityDefinition.numberToBaseValue(
                    lotEntry.quantity);
                lotSharesBaseValues.push(quantityBaseValue);
                totalSharesBaseValue += quantityBaseValue;
            });
        });
        
        remainingSharesBaseValue *= sign;
        const deltaSharesBaseValue = remainingSharesBaseValue;
        if (totalSharesBaseValue + deltaSharesBaseValue < 1) {
            this.recordWarning(userError(
                'XMLFileImporter-merge_too_large',
                xmlTransaction.date,
                xmlTransaction.description,
                xmlTransaction.quantity,
                quantityDefinition.baseValueToNumber(totalSharesBaseValue),
            ));
            return;
        }

        let lotEntries = [];
        accountLotsDateEntries.forEach((lotsDateEntry) => {
            lotEntries = lotEntries.concat(lotsDateEntry.lotEntries);
        });

        const lastIndex = lotEntries.length - 1;
        for (let i = 0; i < lastIndex; ++i) {
            let deltaQuantityBaseValue = Math.round(
                lotSharesBaseValues[i] * deltaSharesBaseValue 
                    / totalSharesBaseValue);
            if (deltaQuantityBaseValue + lotSharesBaseValues[i] < 0) {
                deltaQuantityBaseValue = 0;
            }
            
            if (deltaQuantityBaseValue) {
                const lotEntry = lotEntries[i];
                lotChanges.push({
                    lotId: lotEntry.lot.id,
                    quantityBaseValue: deltaQuantityBaseValue,
                });
                remainingSharesBaseValue -= deltaQuantityBaseValue;

                lotEntry.quantity = quantityDefinition.baseValueToValueText(
                    lotSharesBaseValues[i] + deltaQuantityBaseValue);
            }
        }

        if (remainingSharesBaseValue) {
            const lotEntry = lotEntries[lastIndex];
            lotChanges.push({
                lotId: lotEntry.lot.id,
                quantityBaseValue: remainingSharesBaseValue,
            });

            lotEntry.quantity = quantityDefinition.baseValueToValueText(
                lotSharesBaseValues[lastIndex] + remainingSharesBaseValue);
        }
    }



    //
    //-----------------------------------------------------
    //
    processTransactionEntryMergeX(
        { splits, xmlTransaction, mainEntry, }) {
        // We have the new number of shares, need to proportionally apply this to all
        // lots.
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const { accountId } = investmentCreditDebitEntry;
        const lotChanges = [];
        splits.push({
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: lotChanges,
        });

        this.adjustLotsForSplitMerge({ 
            accountId: accountId, 
            xmlTransaction: xmlTransaction, 
            xmlTransactionEntry: mainEntry, 
            lotChanges: lotChanges,
            sign: -1,
        });

        this.logTransaction('MergeX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
            });

        return true;
    }


    //
    //-----------------------------------------------------
    //
    processTransactionEntrySplitX(
        { splits, xmlTransaction, mainEntry, }) {
        // We have the new number of shares, need to proportionally apply this to all
        // lots.
        const investmentCreditDebitEntry 
            = this.getCreditDebitEntryWithInvestmentAccount(mainEntry);
        if (!investmentCreditDebitEntry) {
            this.recordWarning(userMsg(
                'XMLFileImporter-transactionEntry_investment_entry_missing',
                xmlTransaction.date,
                xmlTransaction.description,
            ));
            return;
        }

        const { accountId } = investmentCreditDebitEntry;
        const lotChanges = [];
        splits.push({
            accountId: accountId,
            lotTransactionType: T.LotTransactionType.SPLIT.name,
            lotChanges: lotChanges,
        });

        this.adjustLotsForSplitMerge({ 
            accountId: accountId, 
            xmlTransaction: xmlTransaction, 
            xmlTransactionEntry: mainEntry, 
            lotChanges: lotChanges,
            sign: 1,
        });


        this.logTransaction('SplitX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
            });
        return true;
    }


    //
    //-----------------------------------------------------
    //
    processInvestmentXMLTransactionSplits(args) {
        const { xmlTransaction, } = args;
        const { transactionEntries } = xmlTransaction;
        let transactionType = transactionEntries[0].entryType;
        let mainEntry;
        for (let i = 0; i < transactionEntries.length; ++i) {
            if (transactionEntries[i].entryType !== 'TRANSACTIONENTRY') {
                transactionType = transactionEntries[i].entryType;
                mainEntry = transactionEntries[i];
                break;
            }
        }

        args = Object.assign({}, args, {
            mainEntry: mainEntry,
        });

        switch (transactionType) {
        case 'TRANSACTIONENTRYADDX' :
            return this.processTransactionEntryAddX(args);
        
        case 'TRANSACTIONENTRYBUYX' :
            return this.processTransactionEntryBuyX(args);
        
        case 'TRANSACTIONENTRYDIVIDENDX' :
            return this.processTransactionEntryDividendX(args);
        
        case 'TRANSACTIONENTRYMERGEX' :
            return this.processTransactionEntryMergeX(args);
        
        case 'TRANSACTIONENTRYREINVESTDIVX' :
            return this.processTransactionEntryReinvestDivX(args);

        case 'TRANSACTIONENTRYREMOVEX' :
            return this.processTransactionEntryRemoveX(args);
        
        case 'TRANSACTIONENTRYSELLX' :
            return this.processTransactionEntrySellX(args);
        
        case 'TRANSACTIONENTRYSPLITX' :
            return this.processTransactionEntrySplitX(args);

        default :
            this.recordWarning(userMsg(
                'XMLFileImporter-investmentTransactionEntry_invalid',
                xmlTransaction.date,
                xmlTransaction.description,
                transactionType,
            ));
            return false;
        }
    }


    processNormalXMLTransactionSplits(args) {
        const { xmlTransaction, splits } = args;
        const { transactionEntries } = xmlTransaction;

        /*
        Transaction tags:
            BANK
            DIVIDEND
            FEES_OFFSET
            GAIN_LOSS
            GAINS_OFFSET
            INVESTMENT
            INVESTMENT_FEE
            INVESTMENT_CASH_TRANSFER
            VAT
        */


        // If there's a single transaction entry it's simple, otherwise
        // we have to do a bit more work.
        if (transactionEntries.length === 1) {
            const xmlEntry = transactionEntries[0];
            const { creditEntry, debitEntry } = xmlEntry;

            const split0 = this.createSplitFromCreditDebitEntry(
                debitEntry, xmlTransaction);
            if (!split0) {
                return;
            }
            splits.push(split0);

            const split1 = this.createSplitFromCreditDebitEntry(
                creditEntry, xmlTransaction);
            if (!split1) {
                return;
            }
            split1.isCredit = true;
            splits.push(split1);

            if (xmlTransaction.number !== undefined) {
                split0.refNum = xmlTransaction.number;
                split1.refNum = xmlTransaction.number;
            }
        }
        else {
            const instanceCountsByAccountIds = new Map();
            transactionEntries.forEach((xmlEntry) => {
                // There should be one common account, and it will have one instance
                // in either the credit or debit side.
                // This will be the first split.
                // The remaining transaction entries will fill in the rest.
                const { creditEntry, debitEntry } = xmlEntry;
                let instanceCounts = instanceCountsByAccountIds.get(
                    creditEntry.accountId);
                if (!instanceCounts) {
                    instanceCounts = [0, 0 ];
                    instanceCountsByAccountIds.set(creditEntry.accountId, 
                        instanceCounts);
                }
                ++instanceCounts[0];

                instanceCounts = instanceCountsByAccountIds.get(debitEntry.accountId);
                if (!instanceCounts) {
                    instanceCounts = [0, 0 ];
                    instanceCountsByAccountIds.set(debitEntry.accountId, 
                        instanceCounts);
                }
                ++instanceCounts[1];
            });

            let baseAccountId;
            let isBaseAccountCredit;
            for (const [id, instanceCounts] of instanceCountsByAccountIds) {
                if (instanceCounts[0] + instanceCounts[1]
                    === transactionEntries.length) {
                    baseAccountId = id;
                    isBaseAccountCredit = (instanceCounts[0] === 1);
                    break;
                }
            }

            let baseSum = 0;
            transactionEntries.forEach((xmlEntry) => {
                const { creditEntry, debitEntry } = xmlEntry;

                let baseEntry;
                let entry;
                if (debitEntry.accountId === baseAccountId) {
                    baseEntry = debitEntry;
                    entry = creditEntry;
                }
                else {
                    baseEntry = creditEntry;
                    entry = debitEntry;
                }

                const split = this.createSplitFromCreditDebitEntry(entry,
                    xmlTransaction);
                if (!split) {
                    return;
                }
                if (entry === creditEntry) {
                    split.isCredit = true;
                }

                const amount = numberOrUndefined(baseEntry.amount);
                if (amount) {
                    baseSum += amount;
                }

                splits.push(split);
            });

            // Add the base entry...
            const baseSplit = {
                accountId: baseAccountId,
                quantity: baseSum.toString(),
                isCredit: isBaseAccountCredit,
            };
            splits.splice(0, 0, baseSplit);

            if (!baseAccountId) {
                this.recordWarning(userMsg(
                    'XMLFileImporter-transaction_entry_account_ids_inconsistent',
                    xmlTransaction.date,
                    xmlTransaction.description,
                ));
                return;
            }
        }

        this.logTransaction('NormalX',
            {
                xmlTransaction: xmlTransaction,
                splits: splits,
            });
        return true;
    }


    //
    //-----------------------------------------------------
    //
    processXMLTransaction(transactions, xmlTransaction) {
        const splits = [];
        const { transactionEntries } = xmlTransaction;
        if (!transactionEntries || !transactionEntries.length) {
            return;
        }

        if (xmlTransaction.transactionType === 'INVESTMENTTRANSACTION') {
            if (!this.processInvestmentXMLTransactionSplits({
                splits: splits, 
                xmlTransaction: xmlTransaction,
            })) {
                return;
            }
        }
        else {
            if (!this.processNormalXMLTransactionSplits({
                splits: splits, 
                xmlTransaction: xmlTransaction,
            })) {
                return;
            }
        }

        const transaction = {
            ymdDate: xmlTransaction.date,
            lastModifiedTimeStamp: 
                numberOrUndefined(xmlTransaction.lastModifiedTimeStamp),
            description: xmlTransaction.description,
            splits: splits,
        };
        transactions.push(transaction);
    }



    //
    //-----------------------------------------------------
    //
    getXMLTransactionPriority(xmlTransaction) {
        if (xmlTransaction.transactionType === 'INVESTMENTTRANSACTION') {
            // Only care about investment transactions...
            const { transactionEntries } = xmlTransaction;
            for (let i = 0; i < transactionEntries.length; ++i) {
                let subPriority;

                const transactionEntry = transactionEntries[i];
                switch (transactionEntry.entryType) {
                case 'TRANSACTIONENTRYADDX' :
                    subPriority = 10;
                    break;
                
                case 'TRANSACTIONENTRYBUYX' :
                    subPriority = 10;
                    break;
                
                case 'TRANSACTIONENTRYDIVIDENDX' :
                    continue;
                
                case 'TRANSACTIONENTRYMERGEX' :
                    subPriority = 10;
                    break;
                
                case 'TRANSACTIONENTRYREINVESTDIVX' :
                    subPriority = 10;
                    break;
                
                case 'TRANSACTIONENTRYREMOVEX' :
                    subPriority = 100;
                    break;
                
                case 'TRANSACTIONENTRYSELLX' :
                    subPriority = 100;
                    break;
                                
                case 'TRANSACTIONENTRYSPLITX' :
                    subPriority = 10;
                    break;
                
                default :
                    continue;
                }

                return subPriority;
            }
        }

        return 0;
    }



    //
    //-----------------------------------------------------
    //
    xmlTransactionCompare(a, b) {
        let result = YMDDate.compare(a.ymdDate, b.ymdDate);
        if (result) {
            return result;
        }

        // If either has investment transactions...
        // Sell transactions should come after buy transactions? This would
        // really depend upon lots...
        const aPriority = this.getXMLTransactionPriority(a);
        const bPriority = this.getXMLTransactionPriority(b);
        result = aPriority - bPriority;
        if (result) {
            return result;
        }

        return a.id.localeCompare(b.id);
    }



    //
    //-----------------------------------------------------
    //
    postProcessTransactions() {
        const { newFileContents } = this;
        if (!newFileContents.transactions) {
            newFileContents.transactions = {};
        }

        let { transactions } = newFileContents.transactions;
        if (!transactions) {
            transactions = [];
            newFileContents.transactions.transactions = transactions;
        }

        const xmlTransactions = Array.from(this.transactionsById.values());
        xmlTransactions.forEach((xmlTransaction) => {
            xmlTransaction.ymdDate = new YMDDate(xmlTransaction.date);
        });

        xmlTransactions.sort((a, b) => this.xmlTransactionCompare(a, b));

        xmlTransactions.forEach((xmlTransaction) => 
            this.processXMLTransaction(transactions, xmlTransaction));
    }



    //
    //-----------------------------------------------------
    //
    postProcessLots() {
        if (!this.lotsDateEntriesByAccountId.size) {
            return;
        }

        const { newFileContents } = this;
        if (!newFileContents.lots) {
            newFileContents.lots = {};
        }

        let { lots } = newFileContents.lots;
        if (!lots) {
            lots = [];
            newFileContents.lots.lots = lots;
        }

        this.lotsDateEntriesByAccountId.forEach((lotsDateEntry) => {
            lotsDateEntry.forEach((entry) => {
                entry.lotEntries.forEach((lotEntry) => lots.push(lotEntry.lot));
            });
        });
    }


    //
    //-----------------------------------------------------
    //
    async asyncFinalizeImport() {
        this.updateStatus(userMsg(
            'XMLFileImporter-updatePrimaryStatus_processingAccountAndTransactions',
            this.accountEntriesById.size,
            this.transactionsById.size));

        this.postProcessAccounts();
        this.postProcessTransactions();
        this.postProcessLots();

        if (this.verbose) {
            if (this.warnings.length) {
                console.log(this.warnings);
            }
        }

        //this.newFileContents.isDebug = true;

        if (this.log.length) {
            const parts = path.parse(this.pathNameToImport);
            const logPathName = path.join(parts.dir, 
                'XMLFileImporter-log.txt');
            const stream = fs.createWriteStream(logPathName);
            this.log.forEach((entry) => stream.write(entry + '\n'));
            stream.end();
        }

        if (this.warnings.length) {
            const parts = path.parse(this.pathNameToImport);
            const logPathName = path.join(parts.dir, 
                'XMLFileImporter-warnings.txt');
            const stream = fs.createWriteStream(logPathName);
            this.warnings.forEach((entry) => stream.write(entry + '\n'));
            stream.end();
        }

        if (this.options.isWriteIntermediateJSON) {
            const parts = path.parse(this.pathNameToImport);
            const logPathName = path.join(parts.dir, 
                'XMLFileImporter-newFileContents.json');
            const stream = fs.createWriteStream(logPathName);
            stream.write(JSON.stringify(this.newFileContents));
            stream.end();
        }

        return this.accessor.asyncCreateAccountingFile(
            this.newProjectPathName, 
            {
                initialContents: this.newFileContents,
                isStrictImport: false,
                statusCallback: this.statusCallback,
                priorWarnings: this.warnings,
            });
    }
}


/**
 * Imports an XML file into the current project in an accessor.
 * @param {EngineAccessor} accessor 
 * @param {string} pathNameToImport 
 * @param {string} newProjectPathName
 * @param {NewFileContents} newFileContents
 */
export async function asyncImportXMLFile(args) {
    const strict = false;
    const saxOptions = {};
    const saxStream = sax.createStream(strict, saxOptions);

    const importer = new XMLFileImporterImpl(args);

    saxStream.on('error', (e) => {
        importer.onError(e);
        this._parser.error = null;
        this._parser.resume();
    });
    saxStream.on('text', (text) => {
        importer.onText(text);
    });
    saxStream.on('opentag', (tag) => {
        importer.onOpenTag(tag);
    });
    saxStream.on('closetag', (tagName) => {
        importer.onCloseTag(tagName);
    });
    saxStream.on('end', () => {
        importer.onEnd();
    });

    const { statusCallback } = args;
    if (statusCallback) {
        statusCallback(userMsg('XMLFileImporter-statusUpdate_readingFile'));
    }

    return new Promise((resolve, reject) => {
        try {
            const readStream = fs.createReadStream(args.pathNameToImport);
            importer._readStream = readStream;
            importer._saxStream = saxStream;

            readStream.pipe(saxStream)
                .on('error', (err) => reject(err))
                .on('end', () => {
                    if (importer._error) {
                        reject(importer._error);
                    }
                    else {
                        resolve();
                    }
                });
        }
        catch (e) {
            reject(e);
        }
    }).then(() => importer.asyncFinalizeImport());
}


function onSetSubLogValue(options, optionName, value) {
    if (value) {
        options.isLog = true;
    }
}

/**
 * @typedef {object} XMLFileImporter~accountExtras
 * This is an object whose properties are the XML account id as the name and the
 * property value any extra {@link AccountDataItem} properties to add to the
 * account.
 */

/**
 * @typedef {object} XMLFileImporter~applyToChildAccountsExtras
 * This is an object whose properties are the XML account id as the name and the
 * property value any extra {@link AccountDataItem} properties to add to the
 * children accounts. One use of this is to assign the same default split account id
 * to all the child accounts.
 */

/**
 * @typedef {object} XMLFileImporter~pricedItemExtras
 * This is an object whose properties are the XML priced item id as the name and the
 * property value any extra {@link PricedItemDataItem} properties to add to the
 * priced item.
 */

/**
 * File importer for XML files.
 * <p>
 * Supports a JSON extras file with the following object entries:
 * <li>{@link XMLFileImporter~accountExtras}
 * <li>{@link XMLFileImporter~applyToChildAccountsExtras}
 * <li>{@link XMLFileImporter~pricedItemExtras}
 */
export class XMLFileImporter {
    constructor(accessor) {
        this.accessor = accessor;
    }


    isFileNamePossibleImport(filePathName) {
        const ext = path.extname(filePathName).toUpperCase();
        if (ext === '.XML') {
            return true;
        }
    }


    isDirNamePossibleImport(dirPathName) {
    }


    getOptionDefs() {
        return {
            isLog: { 
                value: false, 
                description: userMsg('XMLFileImporter-option_isLog_description'),
            },
            isLogAccountNames: {
                value: false,
                description: userMsg(
                    'XMLFileImporter-option_isLogAccountNames_description'),
                onSetValue: onSetSubLogValue,
            },
            isLogLots: {
                value: false,
                description: userMsg('XMLFileImporter-option_isLogLots_description'),
                onSetValue: onSetSubLogValue,
            },
            isLogTransactions: {
                value: false,
                description: userMsg(
                    'XMLFileImporter-option_isLogTransactions_description'),
                onSetValue: onSetSubLogValue,
            },
            includeAccountNumbers: {
                value: false,
                description: userMsg(
                    'XMLFileImporter-option_includeAccountNumbers_description'),
            },
            isWriteIntermediateJSON: {
                value: false,
                description: userMsg(
                    'XMLFileImporter-option_isWriteIntermediateJSON_description'),
            },
        };
    }


    /**
     * @typedef {object} XMLFileImporter~ImportFileArgs
     * @property {string} pathNameToImport
     * @property {string} newProjectPathName
     * @property {NewFileContents} newFileContents
     * @property {boolean} [verbose]
     * @property {boolean} [isLog]
     * @property {boolean} [isLogAccountNames]
     * @property {boolean} [isLogLots]
     * @property {boolean} [isLogTransactions]
     * @property {boolean} [includeAccountNumbers]
     * @property {boolean} [isWriteIntermediateJSON]
     * @property {StatusCallback} [statusCallback]
     */

    async asyncImportFile(args) {
        args = Object.assign({}, args, {
            accessor: this.accessor,
        });
        return asyncImportXMLFile(args);
    }
}
