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

Transactions are what change the quantity state of accounts. The [Transaction](#transaction) data item represents individual transactions. A transaction is composed of two or more entries, each entry is called a [Split](#split). Each split represents an action applied to a particular account. The splits of a transaction must be such that they represent a balanced transaction. The engine ensures this is so.

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


### Undoing Actions
The engine supports the ability to undo modifications to the database. This is done via an instance of [UndoManager](#undomanager) maintained by the [AccountingSystem](#accountingsystem).

Modifications to the database are performed via method calls to manager objects for the various data items. These include [AccountManager](#accountmanager),
[TransactionManager](#transactionmanager), [PricedItemManager](#priceditemmanager), [PricesManager](#pricesmanager), and [LotManager](#lotmanager).

[AccountingSystem](#accountingsystem) maintains an instance of each of these managers. For most of the managers there are three methods for modifying
the set of managed items:
    - asyncAdd___ for adding new items.
    - asyncRemove___ for removing existing items.
    - asyncModify___ for modifying existing items.

The one exception is [PricesManager](#pricesmanager), which does not support a modify.

Each of these editing methods returns an object. The objects contain information pertinent to the action performed:
    - asyncAdd returns copies of the newly added data item(s).
    - asyncRemove returns copies of the data items that were removed.
    - asyncModify returns copies of the original data item and the new data item.

The object also contains an undoId property. The undoId may be passed to the [UndoManager](#undomanager), which will result in the state of the database being rewound to the point immediately before the action that generated the undoId. This includes undoing of any modifications after the modifcation that generated the undo id. Once an undoId has been paseed to [UndoManager](#undomanager), all undoIds that were generated between the undoId being acted upon and the time it is passed to the UndoManager become invalid.

When an editing method of a data item manager is called, the method creates an object that contains enough information to undo the modification and registers that object with the undo manager. The undo manager returns an id for that object, and keeps track of all the objects registered with it. Each data item manager
also registers callback methods with the undo manager.

When the undo manager is called to undo to a given undo id, the undo manager walks through the list of registered objects, starting with the most recently registered object, and calls the callback associated with the undo object. It does this sequentially until the object with the given id is reached and processed. This ensures that the state of the database remains consistent.

The undo objects registered by the various data item managers are pure data objects and are directly JSON'able. The storage and retrieval of the registered undo objects is handled via a handler, similar to how the other data item managers use handlers to interact with the underlying storage.

This means that the undoable history of the editing of the database may be maintained if the [AccountingFile](#accountingfile) implementation wishes to do so.


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
- [LotStates](#lotstate) (only for accounts that support lots)

Account states are managed by the [TransactionManager](#transactionmanager).


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
The data item used to define a lot. A lot has the following properties:
- PricedItemId
- Description (optional)

Lots are managed by a [LotManager](#lotmanager)

### LotManager
Manages all the lots in an accounting system.


### LotChange
Represents a change to a lot in a [Split](#split).
There are effectively three types of changes:
- Add lot for adding a new lot. It has the following properties:
    - lotId
    - quantityBaseValue The quantity for the new lot, must be > 0.
    - costBasisBaseValue    The cost basis of the new lot, must be >= 0.

- Sell lot for removing a portion of or all of a lot. It has the following properties:
    - lotId
    - quantityBaseValue The quantity to sell, must be < 0.

- Split/Merge lot for representing a split or a merge. The original lot is pretty much redefined. It has the following properties:
    - lotId
    - quantityBaseValue The amount to change the current lot quantity.
    - costBasisBaseValue    Optional, the new cost basis of the lot if given, otherwise the cost basis is not changed.


### LotState
Represents the quantity of a lot in an [AccountState](#accountstate). It has the following properties:
- lotId
- quantityBaseValue The quantity of the lot.
- costBasisBaseValue    The cost basis of the quantity.

There are other properties used to apply or remove [LotChange](#lotchange)s from the lot state.

Lot states are managed as part of [AccountState](#accountstate)s, which are managed by the [TransactionManager](#transactionmanager).


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

### UndoManager

### YMDDate


## TODOs
- Add test transactions to AccountingSystemTestHelpers.js, then test transactions in JSONGzipAccountingFile.test.js

- Add a undo mechanism.
    - After an action, there is an undo state available. Maybe part of the return from the action?
    - Have an applyUndo().
        - Would need to be sequentially controlled.

    - Why not just do the opposite of the action?
        - Add -> Remove
        - Remove -> Add
        - Modify -> Modify

    - The only problem is that we want to retain the object id. Let's think about this:
        - Add -> creates an id.
            - Undo -> remove id
            - Redo -> add back. Would like to add back with the same id. Why? Because if there
            were actions after the add, they would be relying upon the id returned by the Add.
            - Without keeping the id, would need to regenerate all the after actions.

        - Modify -> Not a problem, the id doesn't change.

        - Could we just have a Restore counterpart to Add?

        - Would be simpler at the Action level to have a common LastActionReverter or something like that.
        - When the Action acts, it performs the action, and saves the LastActionReverter.
        - When the Action reverts, it can just pass the LastActionReverter to the manager.
        - What about Redo?
            - Well, the Action has all the information from the original Do, so it can just redo itself.


- How will this work?
    - add/modify/remove in all the managers now return an object, so one property can be set to the undoState.
    - Only the latest undoState can be undone, but once the latest undoState is undone, the previous undoState
    may be undone. Therefore keep track of undo state ids and a stack of those ids.
    - The manager will then need to track their different undo states.
    - Should there be a master undo manager?
        - Maybe, since the order in which actions are performed may be important across subsystems.
        - Could we make it all managed by AccountingSystem?
            - AccountingSystem would have an applyUndoState(), where it would verify that the action is correct
            in the undo sequence, and then delegate it to the appropriate manager.
            - Undo States should be pure data, so they can be JSON'd out.

- How does this fit in with actions?
    - Actions are on a higher level.
    - An action may perform multiple DB activities, it would just need to keep track of the first undo data item ids.
    - Actions would perform the forward part. The undo manager/undo data item ids would handle the undo part.
    - Once an action is undone the undo id is no longer valid.

        // TODO: Get rid of the ability to move accounts listed as child accounts to accounts
        // being added by asyncAddAccount(), this was originally to support undoing of asyncRemoveAccount()
        // but now that we have an undo mechanism, we don't need that.

