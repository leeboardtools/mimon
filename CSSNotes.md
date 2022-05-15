
Form-row - Not actually used
    - Part of Row if form property set.

CellSelectEditor-display - Not used

Close - Not used

Container - Not used

Row-align-items-start, Row-align-items-end, Row-align-items-stretch - Not used

Row-justify-content-start, Row-justify-content-end, Row-justify-content-stretch, Row-justify-content-between, Row-justify-content-around, Row-justify-content-evenly - Not used

Flex-row - Not used

Justify-content-center - Not used

Fade - Not used

Dropleft, Dropright, Dropup - Not used



Alert
    - ErrorReporter: "Alert Alert-danger Alert-dismissible fade show"


Bg-light
    - TabbedPages background of tabs nav bar: "Nav Nav-tabs Bg-light"


Border, Border-top, Border-left, Border-bottom, Border-right
    - DropdownSelector button: "Btn Btn-block Border DropdownSelector-button"
    - FileSelector, bekow file name bar: "P-2 Border-bottom W-100 FileSelector-name_bar"
    - FileSelector, above filter bar: "P-2 Border-top FileSelector-fileFilter_bar"
    - FileSelector, below dir components: "P-2 Border-bottom FileSelector-dir_bar"
    - ModalPage, bottom of title: "Border-bottom P-2 ModalPage-title"
    - ModalPage, above button bar: "Border-top M-2"
    - PageTitle, separator below title: "Border-top M-2"

    - There is a SeparatorBar component/class


Btn
    - All sorts of places
    - Button
    - DropdownSelector button: "Btn Btn-block Border DropdownSelector-button"
    - FileSelector current Dir button: "Btn Btn-outline-secondary Btn-sm FileSelector-dir_button"
    - FileSelector OK, cancel buttons: "Btn Btn-primary M-2"
    - ModalPage cancel button: "Btn Btn-secondary M-2 Mr-4"
    - ModalPage done button: "Btn Btn-primary M-2"
    - QuestionPrompter, button: "Btn M-2', Btn-primary or Btn-secondary"


Container-fluid
    - ContentFramer outer: "Container-fluid P-0 FlexC FlexC-column H-100 Overflow-hidden ContentFramer-container"
    - ContentFramer content: "Container-fluid Pl-0 Pr-0 ContentFramer-content"
    - ErrorReporter: "Container-fluid Mt-5"
    - FileSelector: "Container-fluid Text-left FileSelector-list"
    - Page: "Container-fluid"
    - RowColContainer: "Container-fluid"


Col, Col-auto, Col-1 through Col-12
    - All sorts of places for Col, Col-auto
    - Col-8 for file list in App Opening Screen


Row-justify-content-center
    - App opening screen MRU: "Row-justify-content-center Mb-2"
    - LotSelectionEditor summary: "Row-justify-content-center LotsSelectionEditor-summary"
    - PriceRetrieverWindow retrieve buttons bar: "Py-2 Row-justify-content-center PriceRetrieverWindow-controls"
    - ReconcilerWindow main container: "ModalPage-inner_rows_container Row-justify-content-center"
    - ReconcilerWindow no transactions message container: "ModalPage-inner_rows_container Row-justify-content-center"


Row-justify-content-between
    - ReconcilerWindow totals row: "Row-justify-content-between"
    - ModalPage, title row: "Row-justify-content-between"


Row-align-items-center
    - DateSelectorBar main container: "Row-align-items-center No-gutters DateSelectorBar"
    - DateRangeBar, main container: "Row-align-items-center No-gutters DateRangeBar"
    - ReminderEditor first row of page body: "Row-align-items-center Mt-2"

    - DateRangeDefEditor main container: "Row-align-items-center No-gutters DateRangeDefEditor"
    - DateSelectorDefEditor main container: "Row-align-items-center No-gutters DateSelectorDefEditor"




FlexC, FlexI
    - App Main container: "FlexC W-100 H-100 P-1 Mx-auto FlexC-column"
    - MainWindow, NewFileConfigurator menu container: "FlexC", 
        - "FlexI-grow-1"
    - PriceRetrieverWindow ticker container: "FlexC FlexC-row W-inherit H-inherit M-1", 
        - "FlexI-grow-1 Pl-3 Pb-2 H-inherit"

    - ContentFramer outer container: "Container-fluid P-0 FlexC FlexC-column H-100 Overflow-hidden ContentFramer-container"
    - DropdownSelector button text container: "FlexC FlexC-justify-content-between"



D-none:
    - Hides an element.


No-gutters:
    - DateSelectorBar main container:  "Row-align-items-center No-gutters DateSelectorBar"
    - DateRangeBar main container: "Row-align-items-center No-gutters DateRangeBar"
    - DateRangeDefEditor main container: "Row-align-items-center No-gutters DateRangeDefEditor"
    - DateSelectorDefEditor main container: "Row-align-items-center No-gutters DateSelectorDefEditor"
    - Row if noGutters property set: "Form-row No-gutters" or "Row No-gutters"
    - Tooltip items: "Row No-gutters"


Dropdown-menu-right
    - MainWindow, NewFileConfigurator DropDownMenu: "Dropdown-menu-right"


Table
    - RowTable main render container (excludes context menu): "Table RowTable"


Cell, CellButton, CellDateEditor-textInput, CellTextEditor-textInput, CellTextEditor-textDisplay, CellSelectEditor-select, 
    - AccountId editor: "Cell CellSelectEditor-select AccountId-base AccountId-input"
    - AccountRegister split editor: "Splits-base Splits-input Cell CellSelectEditor-select AccountId-base AccountId-input"
    - RemindersList enabled checkbox: "Cell"

    - CellButton button: "Cell CellButton"
    - CellDateDisplay input element class name: "Cell CellTextEditor-textInput CellTextEditor-textDisplay"
    - CellDateEditor DatePicker class name: "Cell CellDateEditor-textInput"
    - CellSelectDisplay input element class name: "Cell CellTextEditor-textInput CellTextEditor-textDisplay"
    - CellSelectEditor select element class name: "Cell CellSelectEditor-select"
    - CellTextDisplay input element class name: "Cell CellTextEditor-textInput CellTextEditor-textDisplay"
    - CellTextEditor AutoCompleteTextEditor input class name: "Cell CellTextEditor-textInput"
    - CurrencySelector select element class name: "Cell CellSelectEditor-select"


Checkbox, Checkbox-label
    - Checkbox button: "Checkbox Text-center"
    - Checkbox label: "Checkbox-label"


CheckboxField-editor
    - CheckboxField Field: "CheckboxField "
    - CheckboxField Checkbox: "Field-editor CheckboxField-editor"


Cell.Checkbox



DateField-editor
    - DateField CellDateEditor input class extras: "Field-editor DateField-editor"


DateOccurrenceEditor-NumberField
    - DateOccurrenceEditor NumberFields: "DateOccurrenceEditor-NumberField"


Dropdown
    - MainWindow, NewFileConfigurator DropdownMenu menuClassExtras: "Dropdown-menu-right"
    
    - DropdownMenu outer div: "Dropdown"


Dropdown-item, AutoComplete-item
    - DropdownSelector item a element: "Dropdown-item"
    - AutoCompleteTextEditor item a element: "AutoComplete-item"


Dropdown-toggle
    - DropdownMenu item a element: "Dropdown-toggle"
    - MenuList submenu item a element: "Dropdown-toggle"
    - TabbedPages tab item a element: "Dropdown-toggle"


DropdownSelector-dropdownList
    - DropdownSelector items container: "Scrollable-menu DropdownSelector-dropdownList"


Scrollable-menu AutoComplete-popupList
    - AutoCompleteTextEditor popup list items container: "Scrollable-menu AutoComplete-popupList"


Field-input-form-control
    - Field onRender class extras: "Field-input-form-control"


Field-indent
    - DateOccurrenceEditor CheckboxField class extras: "Field-indent"


Field-postIndent
    - DateOccurrenceEditor type DropdownField class extras: "Field-postIndent"


Field-postSpace
    - ReminderEditor description field class extras: "Field-postSpace TransactionTemplateEditor-descriptionField"
    - ReminderEditor memo field class extras: "Field-postSpace TransactionTemplateEditor-memoField"
    - ReminderEditor account selector field class extras: "Field-postSpace TransactionTemplateEditor-splitsSelectorField"
    - ReminderEditor debit field quantity editor class extras: "Field-postSpace"

    - OccurrenceRepeatDefinitionEditor type DropdownField class extras: "Field-postSpace"


FieldContainer-inline
    - ReminderEditor primary account row div: "FieldContainer-inline TransactionTemplateEditor-primaryRow"
    - ReminderEditor second row div: "FieldContainer-inline TransactionTemplateEditor-secondRow"

    - OccurrenceRepeatDefinitionEditor container div: "FieldContainer-inline"
    - DateOccurrenceEditor container Fragment: "FieldContainer-inline"


Field-editor
    - ReminderEditor last occurrence date div: "Field-editor"

    - CheckboxField Checkbox class extras: "Field-editor CheckboxField-editor"
    - DateField CellDateEditor input class extras: "Field-editor DateField-editor"
    - DropdownField editor class extras: "Field-editor DropdownField-editor"
    - TextField input element: "Field-editor TextField-editor"


Field-inline-text
    - LotSelectionEditor total shares QuantityDisplay class extras: "Field-inline-text"
    - FieldPrefix div element: "Field-inline-text Pr-2"
    - FieldText div element: "Field-inline-text"
    - FieldSuffix div element: "Field-inline-text Pl-2"


Form-group
    - FileCreator base dir selector div element: "Form-group Text-left" contains label, input
    - FileCreator project name editor div element: "Form-group Text-left" contains label, input
    - ReminderEditor enabled Checkbox class extras: "Form-group Pb-1"

    - Field outer div element: "Form-group"


Form-control
    - FileCreator base dir input element: "Form-control"
    - FileCreator project name editor input element: "Form-control"
    - FileCreator opening balance date editor input element: "Form-control"

    - Field onRender input class extras: "Form-control"


Is-invalid, Invalid-feedback, Invalid-tooltip, Was-validated
    - ?


Input-group
    - FileCreator base dir selector editor container div: "Input-group Mb-0"
    - FileCreator base dir selector browse button container div: "Input-group-append"
    - FileCreator project name editor container div: "Input-group Mb-0"
    - RemindersList enabled checkbox container div: "Input-group Mb-0"

    - CellButton outer container div: "Input-group Mb-0"
    - CellSelectEditor outer container div: "Input-group Mb-0"
    - CellSelectDisplay outer container div: "Input-group Mb-0"
    - CellToggleSelectEditor outer container div: "Input-group Mb-0"
    - CellTextEditor outer container div: "Input-group Mb-0 "
    - CellTextDisplay outer container div: "Input-group Mb-0 "
    - Checkbox outer container div: "Input-group"
    - CurrencySelector outer container div: "Input-group Mb-0 "
    - Field prepend container div: "Input-group-prepend"
    - Field append container div: "Input-group-append"
    - Field input component container div when prepend/append: "Input-group nowrap"


InfoReporter-body
    - InfoReporter PageBody class extras: "InfoReporter-body"



List-group
    - InfoReporter message component ul element: "List-group"


List-group-item
    - FileSelector directory/file list item a element: "List-group-item List-group-item-action"
    - InfoReporter message item li element: "List-group-item List-group-item-action"


Media
    - FileSelector media container around folder image in div element: "Media"


Media-body
    - FileSelector text for folder image item: "Media-body"


MenuList-itemsContainer
    -MenuList outer-most div element in Popup component: "MenuList-itemsContainer"

    
MenuList-item, MenuList-item-checked
    - MenuList item a element: "MenuList-item"


MenuList-submenu
    - MenuList submenu item outer div element for submenu a element and MenuList component: "MenuList-submenu"


MenuList-divider
    - MenuList divider item div element: "MenuList-divider"


Modal-dialog
Modal-dialog-scrollable
    - FileSelector outer div container: "Modal-dialog Modal-dialog-scrollable Modal-full-height"
    - QuestionPrompter outer div container: "Modal-dialog"


Modal-content
    - FileSelector container div of body and buttons: "Modal-content"
    - QuestionPrompter container div of body and buttons: "Modal-content"


Modal-body
    - FileSelector container div of item lists, list is in a child container div: "Modal-body"
    - QuestionPrompter container div of the messages: "Modal-body Text-left"


Modal-header
    - FileSelector container div for title and title close button: "Modal-header"
    - QuestionPrompter container div for title and title close button: "Modal-header"


Modal-footer
    - FileSelector container div for the buttons: "Modal-footer"
    - QuestionPrompter container div for the buttons: "Modal-footer"


Modal-title
    - FileSelector title h4 element: "Modal-title"
    - QuestionPrompter title h5 element: "Modal-title"


MultiColumnList
    - MultiColumnList outer div container: "MultiColumnList"


Nav
    - MainWindow container div for the undo, redo menus: "Nav Nav-link Px-2"
    - NewFileConfigurator container div for the undo, redo menus: "Nav Nav-link Px-2"

    - TabbedPages nav element: "Nav Nav-tabs Bg-light"


Nav-tabs
    - TabbedPages nav element: "Nav Nav-tabs Bg-light"


Nav-item
    - TabbedPages outer div for individual tab: "Nav-item Nav-link tabText"


Nav-link
    - MainWindow container div for the undo, redo menus: "Nav Nav-link Px-2"
    - NewFileConfigurator container div for the undo, redo menus: "Nav Nav-link Px-2"
    - TabbedPages outer div for individual tab: "Nav-item Nav-link tabText"


PageBody
    - PageBody outer container div: "H-inherit Text-left PageBody"


Popup
    - Popup outer container div: "Popup-pointerContainer"


Popup-container
    - Popup container div of the main contents: "Popup-pointerContainer"


Popup-pointer
    - Popup div of the pointer: "Popup-pointer"


Popup-pointerContainer
    - Popup container div of the pointer + main contents: "Popup-pointer"


ProgressReporter-body
    - ProgressReporter PageBody class extras: "Text-center ProgressReporter-body"


Prompter-body
    - StringPrompter PageBody class extras: "Prompter-body"


RowTableContainer
RowTable
RowTableCell
RowTableHeader
RowTableHeaderRow
RowTableHeaderCell
RowTableBody
RowTableRow
RowTableRow.No-border
RowTable-striped
RowTableFooter
RowTableFooterRow
RowTableFooterCell
RowTableColumnResizerCell
RowTableColumnResizerCell-cell
RowTableColumnDragger
RowTableColumnResizer
RowTableColumnResizerTracker
RowTableColumnMover
RowTableColumnMoverTracker
RowTable-header-base
RowTable-cell-base
RowTableColumnSorter
RowTableColumnSorterSortArrowsContainer



SortArrows
SortArrows-none
SortArrows-increase
SortArrows-decrease
SortArrows-secondary
SortArrows-tertiary



CollapsibleRowTable-expand-collapse-container
CollapsibleRowTable-expand-collapse-button
CollapsibleRowTable-expand-collapse-cell-container



QuantityDisplay
SeparatorBar
TabCloseButton



Tooltip
Tooltip-popup
Tooltip-detector
Tooltip-content



Overflow-auto
Overflow-clip
Overflow-hidden
Overflow-scroll
Overflow-visible


Text-center
Text-justify
Text-justify-all
Text-left
Text-right
Text-start
Text-end


VAlign-baseline
VAlign-bottom
VAlign-middle
VAlign-sub
VAlign-super
VAlign-text-bottom
VAlign-text-top
VAlign-top
Visibility-hidden


M-auto
Ml-auto
Mr-auto
Mx-auto
Mt-auto
My-auto
Mb-auto
My-auto

M-0 through 5
Ml-0 through 5
Mx-0 through 5
Mr-0 through 5
Mx-0 through 5
Mt-0 through 5
My-0 through 5
Mb-0 through 5
My-0 through 5


P-auto
Pl-auto
Px-auto
Pr-auto
Px-auto
Pt-auto
Py-auto
Pb-auto
Py-auto

P-0 through 4
Pl-0 through 4
Px-0 through 4
Pr-0 through 4
Px-0 through 4
Pt-0 through 4
Py-0 through 4
Pb-0 through 4
Py-0 through 4


H-25
H-50
H-75
H-100


W-10
W-15
W-20
W-25
W-30
W-40
W-50
W-60
W-70
W-75
W-80
W-90
W-100


H-inherit
W-inherit


CheckboxField


DateSelectorBar-apply_button
DateSelectorBar-change_button


FileSelector-dir_button
FileSelector-dir_button:first-child
FileSelector-dir_button:last-child


FileSelector-dir_bar
FileSelector-name_field
FileSelector-fileFilter_field
FileSelector-dialog



PageTitle


Undo-tooltip
Undo-tooltip-text


