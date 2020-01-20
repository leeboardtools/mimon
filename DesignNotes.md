# Architecture
- Separate the UI from the engine, use a single object API between the UI and the engine.
- Most objects are immutable.
- Objects on the client side are just data, not classes, to simplify passing them around.


## Engine
All persistent actions go through the engine. The engine controls the database access and ensures the data remains consistent and valid.

There are a number of data entities provided by the engine, these entities are controlled by entity specific managers.
The data entities are just data, while the managers are classes.

### Main Data Entities
The main data entities are:

- [Account](#account) - The key data entitity
- [Transaction](#transaction) - Transactions between accounts
- [Lot](#lot) - Tracks individual lots of items that are bought or sold.
- [PricedItem](#priceditem) - Represents an item that has a possibly fluctuating price.
- [Price](#price) - Represents the price of a priced item at specific instance of time. Also an exchange rate.
- [History](#history) - Records the changes that have been made to the accounting system and supports rewinding.

### Supporting Items
In addition to the main data entities, the engine also provides supporting functionality. This includes:

- [AccountingSystem](#accountingsystem) - Gathers together the various managers for the data entities of an accounting system
- [AccountingFile](#accountingfile) - Interface for the underlying file system of an accounting system.
- [PriceRetriever](#priceretriever) - Utility for retrieving online prices.
- [Reconciler](#reconciler) - Utility for tracking and updating the reconciliation state of the transactions of an account.


### Engine Concepts
An [AccountingSystem](#accountingsystem) object is used to represent a single accounting system for some financial entity (i.e. your personal finances). The AccountingSystem object holds the various managers and provides the interface to the underlying [AccountingFile](#accountingfile). AccountingFile is an interface for the database system behind an accounting system.

Since accounting requires exactness, normal numbers and arithmatic cannot be used due to round-off errors in representing actual numbers. To avoid these issues, [QuantityDefinitions](#quantitydefinition) are used to handle quantities. Currently the only quantity definitions are DecimalDefinitions, which define how many decimal places is used to represent a quantity. QuantityDefinitions use a base value, which is always an integer, to represent quantities. This allows exact arithmetic.

Each account in an accounting system is represented by an [Account](#account) data item.

An account represents a quantity of 'something'. This something may be a monetary value such as dollars, which is really a quantity of a currency. The something may also be a stock, or some real estate. All these 'something's are represented by [PricedItem](#priceditem) data items.

A PricedItem defines characteristics of the item. All priced items have a [Currency](#currency) associated with it. The currency defines the currency used when pricing the item. For example, a priced item representing a stock listed on Nasdaq would have a currency of USD.

PricedItems representing a currency would have another Currency associated with it, this currency defines the currency represented by the PricedItem.

PricedItems representing other items would have a [QuantityDefinition](#quantitydefinition) property. The QuantityDefinition defines the fundamental quantity of the item. For example, a US stock may be available from a particular brokerage in units of 1/1000 shares.

The quantity of 'something' represented by an account is tracked via an [AccountState](#accountstate) data item. An AcccountState represents the state of the account at a particular date. An AccountState has a quantity base value, the quantity definition defining the quantity is the quantity definition from the account's priced item. For accounts associated with PricedItems representing things with the concept of a 'lot', such as a stock, the account state also maintains a list of the lots in the account at a particular date. Lots are represented by [Lot](#lot) data items.

Transactions are what change the quantity state of accounts. The [Transaction](#transaction) data item represents individual transactions. A transaction is composed of two or more entries, each entry represents an action applied to a particular account. The entries of a transaction must be such that they represent a balanced transaction. The engine ensures this is so.

When a transaction involves accounts whose underlying quantities represented are not the same (ie. purchasing a security, or an exchange between accounts with different currencies), there is an exchange rate involved. An exchange rate is really just the ratio of the two items in the exchange. For example, the exchange rate for the purchase of a stock would be the price per share. When this occurs, the transaction also contains the current exchange rates of the various items involved.

Prices are represented by [Price](#price) data items. A Price has a date stamp and a value. Prices may also have additional items, depending on what the price represents. For example, stock prices may include opening and closing prices.

To handle the references of different data items to other data items, the engine identifies the major data items with numeric ids generated via [NumericIdGenerators](#numericidgenerator). Generated ids are unique amongst a particular type of data items. For example, accounts will all have unique ids, managed by the account manager, while transactions will have their own set of unique ids, managed by the transaction manager.

There are actually two forms of most data items. The first form has properties that are objects, such as [Currencies](#currency), [QuantityDefinitions](#quantitydefinition), and [YMDDates](#ymddate). The second form is pure primitive data, and as such can be directly converted to and from JSON strings. The various data items have simple conversion functions for converting between the two.

Of all the data items, Transactions and Prices have the potential of have a large quantity of the data items. As such the AccountingFile interface supports asynchronous loading of those data items. This requires that retrieval of transactions and prices be done via async functions.

### File Storage System
The underlying file storage system is for the most part transparent outside the engine. However, there are several presumptions about the file system:
- Any actions that involve adding, modifying, or removing data items are immediately saved.
- Any actions that involve adding, modifying, or removing data items are asynchronous.

All file system implementations extend the [AccountingFile](#accountingfile) class.

The base file system is folder based and consists of a number of Gzipped JSON files in a common folder. These files include:
- A Ledger File - this holds all the [Account](#account), and [PricedItem](#priceditem) data items.
- Several Journal Files - these are for the transactions. There is a summary file and then for each year a separate file containing the transactions belonging to that year.
- Several Prices Files - these are for the prices. Similar to the Journal Files, there is a summary file and then for each year a separate file containing the prices belong to that year.

To handle retrieving and saving data items between a file system and the engine, the various data item managers ([AccountManager](#accountmanager), [TransactionManager](#transactionmanager), etc) employ a handler object. File system implementations will implement the different handler objects.

When an accounting file is first created or opened, it creates the [AccountingSystem](#accountingsystem) represented by the file. When it does, it passes in the various handlers to the accounting system's constructor, which then passes them on to the various managers.

Since both [AccountManager](#accountmanager) and [PricedItemManager](#priceditemmanager) have predefined objects (the root accounts for AccountManager, the USD, EUR, and accounting system's base currency for PriceManager), these managers retrieve from their handlers the list of accounts/priced items when the managers are constructed. This means that when opening an existing file, the handlers must be pre-loaded before the accounting system can be created.

[TransactionManager](#transactionmanager) and [PriceManager](#pricemanager) on the other hand don't have predefined objects, they work directly with the handlers 
so don't really need pre-loading.


## Entities and Objects

### Account
The main account data item. An account has the following properties:
- [Account Type](#accounttype)
- [PricedItem](#priceditem)
- Name (optional)
- Description (optional)
- [AccountState](#accountstate)

Accounts are managed by an [AccountManager](#accountmanager)


#### AccountType
A [NamedEnum](#namedenum) used to define account types and their properties.
Some account types:
- Asset
- Liability
- Income
- Expense
- Bank
- Brokerage
- Cash
- Loan
- Security
- Mortgage
- Property


#### AccountState
Represents the quantity state of an account at a particular date. An account state has the following properties:
- [YMDDate](#ymddate)
- quantityBaseValue This represents the quantity of the priced item's currency.
- [Lots](#lot) (only for accounts that support lots)


### AccountManager
Manages all the accounts in an accounting system.


### Transaction
The main transaction data item. A transaction has the following properties:
- [YMDDate](#ymddate)
- Description (optional)
- Memo (optional)
- [Split](#split)[]

Transactions are managed by a [TransactionManager](#transactionmanager)


### Split
The data item used to define the involvement of an account in a transaction. In any one transaction there may be multiple entries referring to the same account. Entries have the following properties:
- AccountId
- quantityBaseValue
- LotChanges[][] (only for entries referring to accounts that have lots)
- ReconciledState


### TransactionManager
Manages all the transactions in an accounting system.


### Lot
The data item used to define a loat. A lot has the following properties:
- PurcaseDate
- Description (optional)
- quantityBaseValue
- CostBasisBaseValue

Thinking about this.
A lot hsa a current state that may change over time. This state includes:
- [YMDDate](#ymddate)
- quantityBaseValue
- costBasisBaseValue

It also has the following more static values:
- PurchaseDate
- Description

Whenever a split changes a lot, the change must be reflected in the state of all
future splits that refer to the lot.

In order to simplify the requirement of keeping things atomic, lot states should
remain part of the account state. What needs to change is having a lot id.

When a split adds a new lot, a lot id must be generated. The split doesn't have to be
aware of this, the id is just part of the lot's state.

What's the scenario when a split that created a lot is modified?
- If the lot goes away, then the lot id becomes invalid.
- If the lot properties are changed, then the lot properties must be updated.
- A lot cannot go away if other splits refer to the lot.

AccountStates and Lots
- AccountState has a list of lot states.
    - Each lot state consists of the quantityBaseValue and costBasisBaseValue (the date is already part of the account state)
    - Must also have the lot id.


Maybe should separate lots from account state entirely.
    - The transaction manager would then be responsible for updating the lot states.
    - This makes lots transportable between accounts.
    - But an account state would still need to contain the ids of the lots in the account at that state.
    - Should AccountState actually be part of TransactionManager?
        - Maybe, as TransactionManager is the one that actively manages the account state anyway.


AccountStates are read-only, only TransactionManager can update them.



### PricedItem
The data item used to represent the 'something' an account refers to. PricedItems have the following properties:
- [PricedItemType](#priceditemtype)
- [Currency](#currency)
- [QuantityDefinition](#quantitydefinition)
- Name (optional)
- Description (optional)

PricedItems are managed by a [PricedItemManager](#priceditemmanager)


### PricedItemManager
Manages all the priced items in an accounting system. Also manages lots for each priced item.


### PricedItemType
An [NamedEnum](#namedenum) item used to define priced item types and the properties specific to those types. The types:
- Currency
- Stock
- Bond
- MutualFund
- RealEstate
- Property


### Price
The data item used to define the price of a PricedItem at a particular point in time. A price has the following properties:
- [YMDDate](#ymddate)
- value

Prices are managed by a [PriceManager](#pricemanager)


### PriceManager
Manages all the [Prices](#prices) in an accounting system.

Prices are managed on a per [PricedItem](#priceditem) basis. That is, the price manager will add, retrieve, or update prices for a particular PricedItem at one time.


### History
    - Manages the action history.



### PriceRetriever
    - Module for retrieving [Prices](#price) from online.


### Reconciler
    - Reconciles an account.


### AccountingSystem
    - Holds together everything.


### AccountingFile
    - Repository for an AccountingSystem.


### Currency

### QuantityDefinition

### NamedEnum

### Ratio

### NumericIdGenerator

### YMDDate


## TODOs
- Add test transactions to AccountingSystemTestHelpers.js, then test transactions in JSONGzipAccountingFile.test.js

- Need to add lot validation for modify transactions.
    - Unwind state to before earlier transaction.
    - Grab all future transactions.
    - Replace the appropriate transaction.
    - Verify all transactions going forward are valid.

- Need to address undoing actions like remove account/transaction. What happens to the id? Do we reassign a new one,
or do we keep the old one?
    - This may become a matter of what exactly do we want undo to mean.
        - Could be a full revert to the particular state of the system (probaly the ideal)
        - Could be a revert to a similar state of the system.
        - The advantage of a full revert is that any extemparaneous links, say from a report,
        will work after the undo.
    - Since the transaction id may end up being used for sorting, we need to keep the old id.

- Lot Management:
    - The Lot fundamentals:
        - id
        - pricedItemId
        - purchaseYMDDate
        - description
    - The Lot state:
        - ymdDate
        - quantityBaseValue
        - costBasisBaseValue
    
    - Lots become somewhat like Accounts.
    - The one big difference is the existence of a lot may be entirely controlled
    by the transaction manager.

    - So a non-lot split has:
        - accountId
        - quantityBaseValue
    
    - For a purchase a lot split has:
        - accountId
        - quantityBaseValue -> this becomes the costBasisBaseValue
        - lotId
        - lotQuantityBaseValue
        - pricedItemId
        - Special rule: Can only have one purchase per lot.
    
    - For a sale a lot split has:
        - accountId
        - quantityBaseValue
        - lotId
        - lotQuantityBaseValue - the quantity sold. Can lots go negative? I suppose so.