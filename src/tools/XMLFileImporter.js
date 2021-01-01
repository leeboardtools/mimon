import { userError } from '../util/UserMessages';
import * as PI from '../engine/PricedItems';
import * as path from 'path';
import * as fs from 'fs';
import * as sax from 'sax';


class XMLNodeProcessor {
    constructor(importer, tag) {
        this.importer = importer;
        this.tag = tag;
    }

    pushProcessor(processor) {
        this.importer.pushProcessor(processor);
    }

    onOpenTag(tag) {
        // This has the effect of ignoring the tag and all its children...
        this.pushProcessor(new XMLNodeProcessor(this.importer, tag));
    }

    onText(text) {        
    }

    onCloseTag(tagName) {
        if (tagName === this.tag.name) {
            return true;
        }
    }


    onCloseProcessor() {
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
class REPORTEDCURRENCY extends XMLNodeProcessor {
    constructor(importer, tag, closeCallback) {
        super(importer, tag);

        this.closeCallback = closeCallback;
    }

    onCloseProcessor() {
        const { closeCallback } = this;
        if (closeCallback) {
            closeCallback(this.tag.attributes.REFERENCE);
        }
    }
}


//
//---------------------------------------------------------
//
class SECURITYNODE extends XMLNodeProcessor {
    constructor(importer, tag) {
        super(importer, tag);
    }

    onOpenTag(tag) {
        switch (tag.name) {
        case 'REPORTEDCURRENCY' :
            this.pushProcessor(new REPORTEDCURRENCY(this.importer, tag,
                (currencyId) => this.currencyId = currencyId));
            break;
        
        case 'QUOTESOURCE' :
        case 'HISTORYNODES' :
        case 'SECURITYHISTORYEVENTS' :
        default :
            XMLNodeProcessor.prototype.onOpenTag.call(this, tag);
            break;
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
        });

        const { historyNode } = this;
        if (historyNode) {
            const { prices } = historyNode;
            if (prices.length) {
                const { attributes } = historyNode;
                this.importer.addPrices({
                    id: attributes.ID,
                    pricedItemId: pricedItemId,
                    prices: prices,
                });
            }
        }
    }
}


//
//---------------------------------------------------------
//
class ROOTACCOUNT extends XMLNodeProcessor {
    constructor(importer, tag) {
        super(importer, tag);
    }

    onOpenTag(tag) {

    }

    onCloseProcessor() {
    }
}


//
//---------------------------------------------------------
//
class XMLFileImporterImpl {
    constructor(accessor, newProjectPathName, newFileContents) {
        this.accessor = accessor;
        this.newProjectPathName = newProjectPathName;

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

        this.processorStack = [];
        this.warnings = [];

        this.currenciesById = new Map();

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



    onOpenTag(tag) {
        const func = this['onOpenTag_' + this.state];
        if (func) {
            return func(tag);
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
            return func(tagName);
        }
    }


    onEnd() {
        const { processorStack } = this;
        while (processorStack.length) {
            this.popProcessor();
        }

        console.log('end');
    }



    addCurrency({ id, currency }) {
        if (currency !== this.newFileContents.baseCurrency) {
            this.addPricedItem({
                id: id,
                type: PI.PricedItemType.CURRENCY.name,
                currency: currency,
            });
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

        this.newFileContents.pricedItems.pricedItems.push(pricedItem);
    }

    addPrices(pricesItem) {
        this.newFileContents.prices.prices.push(pricesItem);
    }

    addLot(lot) {
        this.newFileContents.lots.lots.push(lot);
    }

    // For addAccount(), want to determine which category to add it to.
    
    addTransaction(transaction) {
        this.newFileContents.transactions.transactions.push(transaction);
    }

    addReminder(reminder) {
        this.newFileContents.reminders.reminders.push(reminder);
    }


    recordWarning(warning) {
        this.warnings.push(warning);
    }


    async asyncFinalizeImport() {
        return this.accessor.asyncCreateAccountingFile(
            this.newProjectPathName, undefined, this.newFileContents);
    }
}


/**
 * Imports an XML file into the current project in an accessor.
 * @param {EngineAccessor} accessor 
 * @param {string} fileNameToImport 
 * @param {string} newProjectPathName
 * @param {NewFileContents} newFileContents
 */
export async function asyncImportXMLFile(accessor, 
    fileNameToImport, newProjectPathName, newFileContents) {

    const strict = false;
    const saxOptions = {};
    const saxStream = sax.createStream(strict, saxOptions);

    const importer = new XMLFileImporterImpl(accessor, 
        newProjectPathName, newFileContents);

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

    return new Promise((resolve, reject) => {
        fs.createReadStream(fileNameToImport)
            .pipe(saxStream)
            .on('error', (err) => reject(err))
            .on('end', () => resolve());
    }).then(() => importer.asyncFinalizeImport());
}


/**
 * File importer for XML files.
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


    async asyncImportFile(fileNameToImport, newProjectPathName, newFileContents) {
        return asyncImportXMLFile(this.accessor, 
            fileNameToImport, newProjectPathName, newFileContents);
    }
}
