# Design Notes for the UI
- React is used for managing UI compoents.
- Bootstrap will be used for styling.

## Opening Window
    - MRU list of files.
    - Open button
    - Create button

### Create Window
    - Template accounts?
    - File Save As at some point.

### Open Window
    - Standard File Open?

## Main Window
    - List of accounts
    - Can filter the list of accounts
    - Can choose what to display for each account
        - Account name
        - Account type
        - Account description
        - Account balance
        - Account shares
    - Collapsible list for viewing child accounts.
    - Save the state of the main window.

## Account Register
    - Lists the transaction for an account.
    - Newest transaction at the bottom.
    - Edit in place
    - Also support popup editing
    - Each split has two rows
    - Automatically open to newest transaction.
    - Auto complete for the transaction/split description when adding a new transaction.
        - Auto complete works on the description, matching it against descriptions from
        the other transactions. When a auto-complete options is chosen, the transaction
        data item from the auto-complete transaction is used as the template.

## Account Editor
    - For creating/modifying account settings

## Priced Item Editor
    - For creating/modifying priced items

## Prices Editor
    - Linked to the priced item editor for adding new securities.

## Lot Viewer
    - TBD
    - Lots are normally created when a security is purchased.

## Reconcile Window
    - Can have multiple reconcile windows open, but only one per account.

## Reminders Window
    - Lists the reminders that are due.

## Reminders Editor
    - For editing reminders.

