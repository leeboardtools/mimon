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
- A Prices File - this holds all the [Price](#price) data items. The original plan was to batch
the prices similar to the journal files, but I decided that the price data items are compact enough
to store in one big file.
- Several History Files - these are for the modifications performed on the database. There is a summary file and then separate batch files for large groups of items (currently 10000). The items stored
are the undo data items for every modification and the action data item that was performed. With this information you can backtrack to a past history to either view the sequence of changes or to undo the database to that state.

To handle retrieving and saving data items between a file system and the engine, the various data item managers ([AccountManager](#accountmanager), [TransactionManager](#transactionmanager), etc) employ a handler object. File system implementations will implement the different handler objects.

When an accounting file is first created or opened, it creates the [AccountingSystem](#accountingsystem) represented by the file. When it does, it passes in the various handlers to the accounting system's constructor, which then passes them on to the various managers.

Since both [AccountManager](#accountmanager) and [PricedItemManager](#priceditemmanager) have predefined objects (the root accounts for AccountManager, the USD, EUR, and a base currency for PriceManager), these managers retrieve from their handlers the list of accounts/priced items when the managers are constructed. This means that when opening an existing file, the handlers must be pre-loaded before the accounting system can be created.

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


### Actions
The engine is supports the managing of actions using an [ActionManager](#actionmanager), accessible via the [AccountingSystem](#accountingsystem). The action manager works with ActionDataItems, which are applied and may be undone. Undone actions may be reapplied. The sequence of the action application/undoing/reapplying is strictly maintained.

All actions are data items and are therefore convertible to JSON. Similar to the other data item managers, the action manager utilizes a handler to provide action storage. Accounting file implementations may therefore save applied actions.

The actions supported by the engine are provided via [AccountingActions](#accountingactions), which is an object accessible via [AccountingSystem](#accountingsystem). AccountingActions creates action data items which may be applied via the action manager. AccountingActions doesn't actually apply the actions, though it does handle the implementations.


## Tool Concepts
The tools includes the various items that are useful for manipulating the accounting database via the engine, but neither fall within the scope of the engine nor are UI specific.

The [EngineAccessor](#engineaccessor) object serves as the central point of access to the engine from the tools and UI. One of the main features of EngineAccessor is that it can provide a filtering mechanism for data items retrieved from or passed to the engine. This is primarily used by the [Reconciler](#reconciler) to present a temporarily updated state as transaction splits are marked as reconciled without commiting the changes to the engine.

Another feature of EngineAccessor is it provides a central point for listening for events emitted by the various managers of the engine.

The [Reconciler](#reconciler) tool offers reconciliation functionality in a work-in-progress fashion, filtering split data items via EngineAccessor as the state of splits for an account are marked as reconciled. Reconciler manages temporary reconcile states for the splits of a transaction until they are finalized.

Reports will probably also fall under Tools, at least the data gathering portion.



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
An enumeration used to define account types and their properties.
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


### AccountingActions
A class instantiated as a property of [AccountingSystem](#accountingsystem), this provides methods for generating
action objects for performing the various edit actions on the database.


### AccountingFile
Base class for the main objects that associate a [AccountingSystem](#accountingsystem) with storage


### AccountingSystem
The central object that represents an accounting system. This instantiates and holds the various managers.


### AccountManager
Manages all the [Account](#account)s in an accounting system.


### Transaction
The main transaction data item. A transaction has the following properties:
- [YMDDate](#ymddate)
- Description (optional)
- Memo (optional)
- [Split](#split)[]

Transactions are managed by a [TransactionManager](#transactionmanager)


#### Split
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


### PriceRetriever
    - Module for retrieving [Prices](#price) from online.


### Reminder
A reminder represents a transaction that is repeated at defined periods of time. A reminder has the following properties:
- [RepeatDefinition](#repeatdefinition)
- [Transaction](#transaction) template.
- isEnabled
- lastAppliedDate

### ReminderManager
Manages all the [Reminder](#reminder)s in an accounting system.


## Tools

### EngineAccessor
Single point access to the engine. Provides data item filtering capabilities.

### Reconciler
    - Reconciles an account.



## Utility Entities and Objects

### ActionManager
Utility class for working action data items. Works with [UndoManager](#undomanager) to support undo/redo.

Similar in design to [UndoManager](#undomanager), the action manager requires things that support actions to register
an applier with the manager. Actions are represented as entirely data so they can be JSON'ified. When an action is applied
the current undo id is recorded and the action applied via the applier. The manager maintains ordered lists of the actions
that have been applied and actions that have been undone, supporting multiple undos and redos.

The manager employs a handler to provide the underlying storage system. This allows the storage of the action history.

### Currency

### QuantityDefinition

### Ratio

### NumericIdGenerator

### Repeats

### UndoManager
Utility class for managing undo. Things that support undo register an applier with the manager, then when something they can undo occurs, they register an undo data item with the manager.

The manager manages an ordered list of the registered undo data items, and supports undoing multiple items. When it is desired to undo to a given point, the manager sequentially passes the undo data items to the appropriate appliers to perform the actual undo.

The manager employs a handler to provide the underlying storage system. This allows the storage of the undo history.

### YMDDate
Represents a year-month-date. Currently uses a Date object to manage the actual date.


## TODOs
- Auto complete
    - This will be performed on an account basis, basically look for an existing transaction.
    - Therefore it should come out of TransactionManager.
    - Based on the transaction name.

- Add accounting action for:
    - Price retrieval???

- Action Recovery
    - Option to save applied actions to a recovery file.

- YMDDate
    - Add locale based toString(). Maybe add to UserMessages.js instead of YMDDate.js


- dataDeepCopy
    - Add support for Set and Map, prevent recursion.


- Account, Priced Item removal
    - Prevent removal if the account/priced items are in use.
    - How? At the action level?
        - Could check at the action level:
        - Accounts: Transactions referring to it.
        - Priced Items: Accounts, Prices referring to it.
        - Could add special actions that delete all the
        transactions, accounts, etc.


- Rethink Opening Balances.
    - Problem with using transactions:
        - Transactions are dated.
        -

- EngineAccessor
    - Update pricedItemQuantityTextToBaseValue() to support
    currency, commas, simple equations.

