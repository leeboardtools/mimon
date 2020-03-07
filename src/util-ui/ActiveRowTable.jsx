import React from 'react';
import PropTypes from 'prop-types';
import { CollapsibleRowTable } from './CollapsibleRowTable';


/**
 * React HOC function that adds keyboard and mouse support to a table component 
 * for tracking an active row. The caller must maintain the active row.
 * Adds {@link ActiveRowTable~Props} to the wrapped table's properties.
 * @name ActiveRowTable
 * @class
 */
export function activeRowTable(WrappedTable) {
    class _ActiveRowTable extends React.Component {
        constructor(props) {
            super(props);

            this.handleRowClick = this.handleRowClick.bind(this);
            this.handleRowDoubleClick = this.handleRowDoubleClick.bind(this);

            this.handleKeyDown = this.handleKeyDown.bind(this);

            this.onGetRowExtras = this.onGetRowExtras.bind(this);
        }



        activateRowAtIndex(rowIndex) {
            const { onGetRowAtIndex } = this.props;
            if (onGetRowAtIndex) {
                const newRow = onGetRowAtIndex(rowIndex);
                if (newRow) {
                    this.activateRow(newRow);
                    return rowIndex;
                }
            }
        }


        /**
         * Similar to {@link TableHandler#activateRowAtIndex} except that it also
         * sets the focus to the row.
         * @param {number} rowIndex
         * @param {object[]} rowRefs Array containing the React Refs for each row, 
         * used to assign the focus.
         */
        activateRowAtIndexWithFocus(rowIndex, rowRefs) {
            rowIndex = this.activateRowAtIndex(rowIndex);
            if (rowRefs && (rowIndex !== undefined)) {
                const ref = rowRefs[rowIndex];
                if (ref) {
                    ref.focus();
                }
            }
        }


        /**
         * Basic row activation.
         * @param {CollapsibleRowTable~RowEntry} rowEntry
         */
        activateRow(rowEntry) {
            const { onActivateRow } = this.props;
            if (onActivateRow) {
                onActivateRow(rowEntry);
            }
        }

        openRow(rowEntry) {
            const { onOpenRow } = this.props;
            if (onOpenRow) {
                onOpenRow(rowEntry);
            }
        }

        performToggleCollapse(rowEntry) {
            // We're peeking into the properties for the wrapped table...
            const { onRowToggleCollapse } = this.props;
            if (onRowToggleCollapse) {
                onRowToggleCollapse(rowEntry);
            }
        }


        handleRowClick(rowEntry, event) {
            this.activateRow(rowEntry);
        }

        handleRowDoubleClick(rowEntry, event) {
            this.openRow(rowEntry);
        }


        handleEnter(event, rowEntry, rowIndex, rowRefs) {
            if (event.ctrlKey) {
                this.openRow(rowEntry);
            }
            else {
                const delta = (event.shiftKey) ? -1 : 1;
                this.activateRowAtIndexWithFocus(rowIndex + delta, rowRefs);
            }
            event.preventDefault();
        }


        handleKeyDown(event, rowEntry, rowIndex, rowRefs) {
            const { onKeyDown } = this.props;
            if (onKeyDown) {
                const result = onKeyDown(event, rowEntry, rowIndex, rowRefs);
                if ((result === 'default') || event.defaultPrevented) {
                    return;
                }
            }

            switch (event.key) {
            case 'ArrowUp' :
                this.activateRowAtIndexWithFocus(rowIndex - 1, rowRefs);
                event.preventDefault();
                break;

            case 'ArrowDown' :
                this.activateRowAtIndexWithFocus(rowIndex + 1, rowRefs);
                event.preventDefault();
                break;

            case ' ' :
                this.performToggleCollapse(rowEntry);
                event.preventDefault();
                break;

            case 'Enter' :
                this.handleEnter(event, rowEntry, rowIndex, rowRefs);
                break;

            default :
                break;
            }
        }


        /**
         * Pass this function as the onGetRowExtras property of CollapsbileRowTable.
         * @param {CollapsibleRowTable~RowEntry} rowEntry
         * @param {number} rowIndex
         * @param {object[]} rowRefs
         */
        onGetRowExtras(rowEntry, rowIndex, rowRefs) {
            const rowExtras = {
                onRowClick: (event) => this.handleRowClick(rowEntry),
                onRowDoubleClick: (event) => this.handleRowDoubleClick(rowEntry),
                // onRowToggleCollapse: (event) => this.handleRowToggleCollapse(row),
                tabIndex: 1,
                onKeyDown: (event) => this.handleKeyDown(event, 
                    rowEntry, rowIndex, rowRefs),
            };

            return rowExtras;
        }


        render() {
            // Don't yet have the spread operator working for:
            // const { onGetRowAtIndex, onActivateRow, onOpenRow, onRowToggleCollapse, 
            // ...passThroughProps } = this.props;
            const passThroughProps = Object.assign({}, this.props);
            delete passThroughProps.onGetRowAtIndex;
            delete passThroughProps.onActivateRow;
            delete passThroughProps.onOpenRow;
            // delete passThroughProps.onRowToggleCollapse;

            return (
                <WrappedTable
                    {...passThroughProps}
                    onGetRowExtras={this.onGetRowExtras}
                />);
        }
    }

    /**
     * @callback ActiveRowTable~onGetRowAtIndex
     * @param {number}  index
     * @returns {number}
     */

    /**
     * @callback ActiveRowTable~onActivateRow
     * @param {CollapsibleRowTable~RowEntry}  rowEntry
     */

    /**
     * @callback ActiveRowTable~onOpenRow
     * @param {CollapsibleRowTable~RowEntry}  rowEntry
     */

    /**
     * @callback ActiveRowTable~onKeyDown
     * @param {Event}   event
     * @param {CollapsibleRowTable~RowEntry}  rowEntry
     * @param {number}  rowIndex
     * @param {object[]}    rowRefs
     * @returns {string|undefined}  If 'default' is returned, the event is 
     * ignored by ActiveRowTable and is processed normally.
     */

    /**
     * @typedef {object} ActiveRowTable~Props
     *
     * @property {ActiveRowTable~onGetRowAtIndex} onGetRowAtIndex This is used primarily 
     * to obtain the next or previous row when handling arrow and enter keys.
     *
     * @property {ActiveRowTable~onActivateRow} onActivateRow This is called when a 
     * row is to be made active. The owner should update its active row state and set 
     * the activeRowKey property of table appropriately. The callback argument is the 
     * row entry.
     *
     * @property {ActiveRowTable~onOpenRow} [onOpenRow] This is called on double-clicks 
     * and enter key press on the active row.
     *
     * @property {ActiveRowTable~onKeyDown} [onKeyDown] This is called on key down 
     * events before the active row table processes the event.
     *
     */

    _ActiveRowTable.propTypes = {
        onGetRowAtIndex: PropTypes.func.isRequired,
        onActivateRow: PropTypes.func.isRequired,
        onOpenRow: PropTypes.func,
        onKeyDown: PropTypes.func,

        // From CollapsibleRowTable
        onRowToggleCollapse: PropTypes.func,
    };

    return _ActiveRowTable;
}


/**
 * React component applying the {@link activeRowTable} HOC to the table 
 * {@link CollapsibleRowTable}.
 */
export const ActiveRowCollapsibleTable = activeRowTable(CollapsibleRowTable);

