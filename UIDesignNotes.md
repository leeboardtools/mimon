# Design Notes for the UI
- React is used for managing UI compoents.
- Bootstrap will be used for styling.

## The Big Picture
There are basically two main modes:
- Startup
- Running

Startup is simply choosing/creating the accounting system file.

Running is where all the day-to-day action happens.

### Startup Mode
One goal with the startup mode is to allow the quick selection among multiple
accounting system files. As such a most recently used (MRU) list is the primary focus.

Of course, if this is the first time the app is being run there won't be an MRU list.

On a typical startup with an MRU list available, the list appears most prominently.
There will also be options for bringing up a file open dialog box for selecting an
accounting system file and for creating a new accounting system file.

Creating a new accounting system file will eventually allow for the use of templates
and editing accounts, including opening balances.


### Running Mode
The running mode is where most time is spent.

The current design will make use of a single tabbed Main Window.

There will be a primary `Accounts` tab presenting the account list. This will be the launching
point for opening account registers and reconciling accounts. Accounts will be displayed in
table form. The tab will be configurable, with
options for:
- Determining which accounts are displayed.
- What information is displayed.

Multiple `Accounts` tabs may be supported, each with a different configuration. If this is
implemented, a separate `Master Accounts` tab may be included that will always be available.

From an `Accounts` tab an individual account may be chosen and an `Account Register` tab for
that account opened. There is only one `Account Register` tab per account.

The `Account Register` tab represents each transaction split that refers to the account
in table form, with each split taking up two rows as in a checkbook register. Editing will
occur in-place, with support for transactions with more than 2 splits opening up multiple
rows in the table.

The `Account Register` tab for accounts that support lots will have additional support for
lots, particularly for the sale of any lots.

From an `Accounts` tab an account may be reconciled (if the account supports reconciliation,
currently lot based accounts do not support reconciliation). This brings up a `Reconcile`
tab for the account. There is only one `Reconcile` tab per account.

The reconcile state of the `Reconcile` tab is not permanent until explicitly made permanent.
Reconciliation can only be completed if the reconciler says so.
During a reconciliation, transactions that are marked in the tab are marked Pending, which
is automatically reflected in any `Account Register` tab displaying the transaction split.
This should happen automatically due to the reconciler.

From menu choices a number of other tabs or modal windows may be opened. These include:

'Account Editor' - This is opened for new accounts (menu choice) or modifying an existing account
(menu choice or from `Accounts` tab).

The decision of whether to use modal windows or just support `Account Editor` tabs has not
been made.

`Priced Items` tab - This is along the lines of the `Accounts` tab except for priced items.
There would also only be one `Priced Items` tab (there may be separate ones for securities
versus real estate, etc.)

'Priced Item Editor' tab - This is opened for new priced items (menu choice) or modifying an
existing priced item (menu choice or from `Priced Items` tab).

`Lot View` tab - This displays lots for priced item accounts that support lots. It would
be capable of displaying the lots for multiple accounts, in a collapsible manner.
Also have an option to display lots by priced item.

`Prices` tab - This displays prices for the different priced items. There would be a selector
for the priced item, and then all the prices for that priced item would be displayed.

`Price Summary` tab - This displays the last n prices for each priced item account, the
idea would be to allow for simple manual updating of all prices for a given date (i.e.
Yahoo finance is not available).

`Due Reminders` tab - This displays reminders that are currently due. It offers options for
applying each reminder. For reminders that do not have a quantity this will prompt for the
quantity.

`Reminders` tab - This is for adding, removing, or modifying reminders. This tab
displays all the reminders, sortable by date, name, account, etc.

`Reminder Editor` tab - This is opened for new reminders or modifying an existing reminder.

`Settings` tab - This is for changing user defined settings. Some settings include:
- Date format.
- Auto open last opened accounting file.
- ???


`Reports` - TBD. Reports are really just customizable read-only tab views.


Modal Operation: Regular modal dialogs for editing (as opposed to message boxes) in 
Bootstrap are somewhat of a kludge. It's difficult to control the appearance of the dialog boxes. 
To get around this, modality is implemented on the tab basis. This means that the tab view will 
change modes to reflect any modality.



## The Architecture
All UI specific code (more specifically React code) is in src/ui.

The main React component is App, in App.jsx.

App in turn manages the two main modes, the Opening Screen and the Running modes.
App's primary responsibility is the management of the accounting file that's open.
It provides the EngineAccessor for the rest of the UI.

App delegates the main opening screen to the OpeningScreen component. It handles the
File Open dialog box, and delegates the UI for creating and initially configuring
an accounting file to the CreateAccountingFile component.

When it enters the Running mode it delegates the running mode to the MainWindow component.

MainWindow takes over management of the UI once an accounting file has been opened.

MainWindow provides the tab structure. It also provides all the callbacks to the various
other React components. These callbacks are primarily for performing actions on the
accounting file. The other components all rely on these callbacks to generate appropriate
actions.

MainWindow also provides the mechanism for reporting messages and prompts.

There is quite a bit of commonality between the different views. There appears to be
to main types of list/table style views:
- The Summary List
    - This is represented by the Accounts List, Priced Items List
    - The main features are:
        - Items are fully represented on each row, possibly with hierarchy 
        (i.e. collabsible)
        - Properties of each item are displayed in columns.
        - The items displayed may be filtered.
        - Outside of hierarchy the items are independent of each other.

- The Itemized List
    - This is represented by the Account Register, Prices List,
    - The main features are:
        - Items are mostly editable in place.
        - There may be lots and lots of items.
        - The items have a default ordering, mostly by date.

Some of the other tab views:
    - Reminder List - this shares properties of both list/table types.
        - There is an inherent organization by date.
        - But may also want to organize by account, or by name.

    - Reports:
        - Reports can be either one. A transaction report would obviously be
        an itemized list.
        - Most other reports would probably be more like Summary Lists.

Are the lists really two separate styles? Or can they be combined into one?

### Menu Management
Startup Mode will not have any menus, as it is an entirely modal operation.

Runtime Mode will have menus that will always be available, and other
menus that will only appear when a specific tab is active.

Common menus:
- File
    - Create Accounting System...
    - Open Accounting System...
    - Recent Accounting Systems
        - MRU list...
    - Save...
    - Save As...
    - Close
    - Exit

- Edit
    - Undo
    - Redo

    - Cut
    - Copy
    - Paste
    - Delete

    - Preferences

- Action
    - New
        - Account
        - Transaction
        - Priced Item
        - Lot
        - Reminder

    - Modify
        - Account
        - Transaction
        - Priced Item
        - Lot
        - Reminder
    
    - Delete

- View
    - Accounts List
    - Account Register
    - Priced Items List
    - Lots List
    - Reminders
    - Reminders
    - Transactions List???

- Reports



## The Screens

### Opening Screen
    - MRU list of files.
    - Open button
    - Create button

#### Create Accounting File
    - Template accounts?
    - File Save As at some point.

#### Open Accounting File Window
    - Standard File Open?


### Main Window
    - The main window for Running Mode, provides a frame for the tabbed views of
    all the other running mode windows.


### Accounts Table
    - Table of accounts.
    - Can configure what columns are displayed.
    - Can filter what accounts are displayed.
    - Can have more than one Accounts Table, can save the configuration.


### Account Register
    - Lists the transaction for an account.
    - Newest transaction at the bottom.
    - Edit in place
    - Also support popup editing
    - Each split has two rows
    - Automatically open to newest transaction.
    - Auto complete for the transaction/split description when adding a new transaction.
        - Auto complete works on the description, matching it against descriptions from
        the other transactions in the account. When a auto-complete options is chosen, 
        the transaction data item from the auto-complete transaction is used as the template.
    - Can have more than one Account Register open, but only one register per account.


### Account Editor
    - For creating/modifying account settings
    - Can have more than one Account Editor open, but only one editor per account.


### Priced Items Table
    - Table of priced items.
    - Will use same underlying implementation as Accounts Table, so will have similar
    features. The big difference is Priced Items do not have hierarchy.
    - Could have artificial hierarchy of priced item types.


### Priced Item Editor
    - For creating/modifying priced items.
    - Can have more than one Priced Item editor open, but only one per priced item.
    - Security priced items will have extra fields (ticker, etc.)


### Transactions List
    - Table of transactions.
    - Will use same underlying implementation as Accounts Register, so will have similar
    features.


### Prices Table
    - Table of prices.

### Prices Editor
    - Linked to the priced item editor for adding new securities.

### Lot Viewer
    - TBD
    - Lots are normally created when a security is purchased.


### Reconcile Window
    - Can have multiple reconcile windows open, but only one per account.
    - Can switch between straight list view and separate credit/debit view.


### Reminders List
    - Lists the reminders.
    - Reminders that are due are highlighted.
    - Could also have overdue reminders extra highlighted?

### Reminders Editor
    - For creating/editing a reminder.
    - Would like to be able to edit more than one reminder at a time.



## TODO
- Move main menu out of App.jsx

- Add a FrameHandler.
    - Handles the main menus.
    - Handles the system dialogs.
    - At the App level, but would be passed around to the components.

- Redo SequentialPages to have Back, Next, Finish, Cancel buttons along the bottom.
Should it be renamed Wizard? No, keep SequentialPages.