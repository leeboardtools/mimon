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
in table form. Editing will occur in-place, with support for transactions with more than 2 
splits opening up multiple rows in the table.

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
There will be a 'Priced Items' tab for each type of priced item (securities, real estate, etc.)

'Priced Item Editor' tab - This is opened for new priced items (menu choice) or modifying an
existing priced item (menu choice or from `Priced Items` tab).

`Lot View` tab - This displays lots for priced item accounts that support lots. It would
be capable of displaying the lots for multiple accounts, in a collapsible manner.
Also have an option to display lots by priced item.

`Prices` tab - This displays prices for the different priced items. There would be a selector
for the priced item, and then all the prices for that priced item would be displayed.

??? `Price Summary` tab - This displays the last n prices for each priced item account, the
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
two main types of list/table style views:
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


### Accounts List
    - Table of accounts.
    - Can configure what columns are displayed.
    - Can filter what accounts are displayed.
    - Can have more than one Accounts Table, can save the configuration, but
    one master accounts list.


### Account Register
    - Lists the transaction for an account.
    - Newest transaction at the bottom.
    - Edit in place
    - Also support popup editing
    - x Each split has two rows 
    - Automatically open to newest transaction.
    - Auto complete for the transaction/split description when adding a new transaction.
        - Auto complete works on the description, matching it against descriptions from
        the other transactions in the account. When a auto-complete options is chosen, 
        the transaction data item from the auto-complete transaction is used as the template.
    - Can have more than one Account Register open, but only one register per account.

#### Lot Based Account Register
    - Transactions with lots are limited in what can be edited, nothing financial can be changed
    outside of the account register for the lot based account.
    - Attempting to edit lot based transaction opens transaction in account register for
    lot based account.


### Account Editor
    - For creating/modifying account settings
    - Can have more than one Account Editor open, but only one editor per account.


### Priced Items List
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
    - Lots are created when a security is purchased.


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
- Rename AccountingSystem to AccountingProject???

- Test Revert

- Test Save


- Next Up:
    - NewFileConfigurator.jsx
        - Change opening balance renderer to use a CellQuantityEditor/Display.
    

    - Account Editor


    - Accounts List
        - Custom Account Lists
        - Listen on prices for market value updates.
        - Summary rows
        - Menu options for moving a child account up or down in its sibling list.


    - Account Register
        - Auto-complete for description
        - Copy, Paste, Duplicate transaction actions
        - Actually add row to the clipboard when Copy Transaction is chosen.
            - Both HTML and text.
            - For HTML include the split drop down???
            
        - Multi-row support?

        - Multi-split tooltip with securities shows same sign for buy and sell (sell shows positive, should be negative)


    - Account Selector
        - Add a search box.

    
    - File import
        - Will not bother importing Reminders
        - Finish the Jest testing.


    - Lots List
        - Hierarchy, by security (priced items)
        - Only for securities and mutual funds?
    

    - Lot selection editor
        - Add context menu to support resetting column widths.
        - Columns for cost-basis, gain, ref number
        - Add summary info.
        - Figure out what to do about undo/redo and changing column widths.
            - Maybe just get rid of undo/redo support for editor?
            - Or undo/redo support for changing column widths in editor?
            - Or just don't allow column resizing.


    - Multi-splits editor
        - Add context menu to support resetting column widths.
        - Or don't allow column resizing.


    - Priced Item List
        - Custom Priced Item Lists


    - Priced Item Editor


    - Securites/Mutual Fund List


    - Prices List
        - Changing column width of prices list then undoing/redoing does not
        properly resize other open tabs that are not active.


    - Price Retrieval Window
        - Add a new security?


    - Reconciler
        - Add column width support.


    - Reminders Editor


    - Reminders List
        - Clicking enabled button does nothing.
        - Add Apply now command.


    - Printing
        - Only print contents of active tab, not full window.
        - Somehow fit to page so it doesn't get clipped.


- Menus
    - Scroll menu vertically if it doesn't fit.


- RowTable To Do:
    - Sort by columns

    - Users of RowTable et al:
        - RowTable
            - ReconcilerWindow
            - RemindersList
        
        - CollapsibleRowTable
            - AccountsList
            - PricedItemsList

        - EditableRowTable
            - AccountRegister
            - LotsSelectionEditor
            - MultiSplitsEditor
            - PricesList


- CollapsibleRowTable
    - Need to tweak the expand/collapse indenting.


- PricedItemsEditor:
    - Double click needs to open priced item editor???
    

- Splits List:
    - Need to test appropriate sign with mortgages, etc.


- Add an Imbalance account?
    - Root Imbalance account for the default currency.
    - Additional imbalance accounts as needed for other currencies.


- Should we be able to disable lots?
    - By this mean if you turn off lots, then buying and selling securities
    does not use lots.


- Set default interest, dividends, fees accounts in account editing.


- Tooltips


- Need means of formatting negative numbers:
    - Red
    - Enclose in parenthesis
    - Italicized?
    - Which one is user option, should be able to use CSS classes.


- Add rounding option for accounts (specific accounts might round up or down).


Bootstarp classes in ui:
    - active: TickerSelector
    - alert: App
    - alert-primary: App
    - align-items-center: PriceRetrieverWindow
    - align-items-end: ReminderEditor
    - align-middle: PriceRetrieverWindow

    - btn: AccountEditor, App, FileCreator, PriceRetrieverWindow, ReconcilerWindow
    - btn-block: App
    - btn-group: MainWindow, NewFileConfigurator
    - btn-group-sm: MainWindow, NewFileConfigurator
    - btn-outline-primary: App
    - btn-outline-secondary: AccountEditor, App, FileCreator, ReconcilerWindow

    - btn-primary: PriceRetrieverWindow
    - btn-secondary: App, LotSelectionEditor, MultiSplitsEditor, PriceRetrieverWindow, ReconcilerWindow

    - btn-sm: App, ReconcilerWindow

    - col: AccountEditor, AccountingCellEditors, AccountRegister, App, LotSelectionEditor, PricedItemEditor, ReconcilerWindow, ReminderEditor, TickerSelector
    - col-6: PricedItemEditor
    - col-8: App
    - col-auto: ReminderEditor
    - col-form-label: LotSelectionEditor
    - col-sm-auto: AccountingCellEditors, AccountRegister
    - container: App, LotSelectionEditor
    - container-fluid: App, FileCreator

    - d-flex: App, MainWindow, NewFileConfigurator, PriceRetrieverWindow
    - d-none: AccountRegister, PricesList
    - disabled: MainWindow, NewFileConfigurator, TickerSelector

    - flex-column: App
    - flex-grow-1: MainWindow, NewFileConfigurator, PriceRetrieverWindow
    - flex-row: PriceRetrieverWindow
    - form-check-input: TickerSelector
    - form-control: FileCreator
    - form-group: FileCreator
    - form-row: LotSelectionEditor

    - h-100: AccountRegister, App, PriceRetrieverWindow, PricesList

    - input-group: FileCreator
    - input-group-append: FileCreator
    - invalid-feedback: FileCreator
    - is-invalid: FileCreator

    - justify-content-between: ReconcilerWindow
    - justify-content-center: LotSelectionEditor, PriceRetrieverWindow, ReconcilerWindow
    - justify-content-md-center: App

    - m-0: PricedItemsList, RemindersList
    - m-1: PriceRetrieverWindow
    - m-4: PriceRetrieverWindow
    - mb-auto: FileCreator
    - mb-0: FileCreator
    - mb-2: App
    - mb-4: App
    - ml-1: ReconcilerWindow
    - ml-2: MainWindow, NewFileConfigurator
    - ml-3: App
    - mr-1: ReconcilerWindow
    - mr-4: ReminderEditor
    - mt-auto: App, FileCreator
    - mt-1: PriceRetrieverWindow
    - mt-2: LotSelectionEditor, MainWindow, NewFileConfigurator
    - mt-4: App
    - mx-auto: App

    - nav: MainWindow, NewFileConfigurator
    - nav-link: MainWindow, NewFileConfigurator

    - p-1: App
    - pb-2: PriceRetrieverWindow
    - pl-1: ReconcilerWindow
    - pl-2: MainWindow, NewFileConfigurator
    - pl-3: PriceRetrieverWindow
    - pr-1: ReconcilerWindow
    - pr-2: MainWindow, NewFileConfigurator
    - pt-2: PriceRetrieverWindow
    
    - row: AccountEditor, AccountingCellEditors, AccountRegister, App, PricedItemEditor, PriceRetrieverWindow, ReconcilerWindow, ReminderEditor, TickerSelector

    - table-striped: AccountRegister, LotSelectionEditor, MultiSplitsEditor, PricesList
    - text-center: App, PricedItemsList, ReconcilerWindow, RemindersList
    - text-left: AccountingCellEditors, AccountRegister, FileCreator, PricedItemsList, PriceRetrieverWindow, RemindersList
    - text-right: AccountingCellEditors, AccountRegister, PriceRetrieverWindow, RemindersList

    - w-100: AccountRegister, App, PriceRetrieverWindow, PricesList
    - w-40: PricedItemsList
    - w-50: ReconcilerWindow


Bootstrap classes in use in util-ui:
    - active: DropdownSelector, FileSelector, MenuList, RowTable, TabbedPages
    - alert: ErrorReporter
    - alert-dismissible: ErrorReporter
    - alert-error: ErrorReporter

    - bg-light: TabbedPages
    - border: DropdownSelector
    - border-bottom: FileSelector, ModalPage, PageTitle
    - btn: DropdownSelector, FileSelector, ModalPage, QuestionPrompter
    - btn-block: DropdownSelector
    - btn-outline-secondary: FileSelector
    - btn-primary: FileSelector, ModalPage, QuestionPrompter
    - btn-secondary: ModalPage, QuestionPrompter
    - btn-sm: FileSelector

    - close: CloseButton
    - col: ModalPage, Tooltip
    - col-11: ModalPage
    - col-form-label: FieldPrefix, FieldSuffix
    - container
    - container-fluid: ContentFramer, ErrorReporter, FileSelector, Page

    - d-flex: ContentFramer, DropdownSelector
    - d-none: SequentialPages, TabbedPages
    - disabled: DropdownSelector, MenuList
    - dropdown: DropdownMenu
    - dropdown-item: DropdownSelector
    - dropdown-toggle: DropdownMenu, MenuList, TabbedPages

    - enabled: RowTable

    - fade: ErrorReporter
    - flex-column: ContentFramer
    - form-control: CellButton, CellDateDisplay, CellDateEditor, CellSelectDisplay, CellSelectEditor, CellToggleSelectEditor, CellTextDisplay, CellTextEditor, CurrencySelector, Field
    - form-group: Field

    - h-100: ContentFramer, SequentialPages, TabbedPages

    - input-group: CellButton, CellToggleSelectEditor, CellTextDisplay, CellTextEditor, Checkbox, CurrencySelector, Field
    - input-group-prepend: Field
    - input-group-append: Field
    - invalid-feedback: CellButton, CellDateEditor, CellSelectEditor, CellToggleSelectEditor, CellTextEditor, Field
    - is-invalid: CellButton, CellDateEditor, CellSelectEditor, CellToggleSelectEditor, CellTextEditor, Field

    - justify-content-between: DropdownSelector, ModalPage

    - list-group-item: FileSelector, InfoReporter
    - list-group-item-action: FileSelector, InfoReporter

    - m-2: FileSelector, ModalPage
    - mb-0: CellButton, CellToggleSelectEditor, CellTextDisplay, CellTextEditor, CurrencySelector
    - mb-4: PageTitle
    - media: FileSelector
    - media-body: FileSelector
    - modal-body: FileSelector, QuestionPrompter
    - modal-content: FileSelector, QuestionPrompter
    - modal-dialog: FileSelector, QuestionPrompter
    - modal-dialog-scrollable: FileSelector
    - modal-header: FileSelector, QuestionPrompter
    - modal-footer: FileSelector, QuestionPrompter
    - modal-title: FileSelector, QuestionPrompter
    - mr-1: FileSelector
    - mr-4: ModalPage
    - mt-2: ModalPage
    - mt-5: ErrorReporter
    - mt-auto: ModalPage

    - nav: TabbedPages
    - nav-item: TabbedPages
    - nav-link: TabbedPages
    - nav-tabs: TabbedPages
    - no-gutters: Tooltip

    - overflow-hidden: ContentFramer, TabbedPages

    - p-0: ContentFramer
    - p-2: FileSelector, ModalPage
    - pb-3: PageTitle
    - pl-0: ContentFramer
    - pl-2: FieldPrefix, DropdownSelector
    - pr-0: ContentFramer
    - pr-2: FieldSuffix
    - pt-3: PageTitle

    - row: ModalPage, Tooltip

    - show: ErrorReporter, Popup

    - table: RowTable
    - table-active: RowTable
    - text-left: FileSelector, ModalPage, PageBody, QuestionPrompter
    - text-center: ModalPage, ProgressReporter
    - text-right: DropdownSelector, ModalPage

    - tracking: RowTable

Notes:
Column sorting in RowTable:
    - Column may or may not be sortable.
    - If sortable, can be in one of these states:
        - Not sorted
        - Sorted ascending
        - Sorted descending
        - ??? Filter ???


- Immediate TODO:
    - Add column sorting to RowTable.

    - Prices List
        - Changing column width of prices list then undoing/redoing does not
        properly resize other open tabs that are not active.

    - Reminders List
        - Clicking enabled button does nothing.
        - Add Apply now command.

    - Reconciler
        - Add column width support.

    - Lot selection editor
        - Add summary info.
    
