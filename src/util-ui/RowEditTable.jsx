import React from 'react';
import PropTypes from 'prop-types';
import { CollapsibleRowTable } from './CollapsibleRowTable';
import { activeRowTable } from './ActiveRowTable';


/**
 * React HOC function that adds row editing support to a table component. 
 * This also adds active row support via {@link ActiveRowTable}. 
 * The caller must maintain the active row.
 * Adds {@link RowEditTable~Props} to the wrapped table's properties.
 * <p>
 * Editing occurs on a row by row basis, meaning that an entire row is edited
 * at one time. The edit is normally temporary until the row is exited.
 * Editing starts with first the row being activated via a call to
 * the {@link ActiveRowTable~onActivateRow} callback.
 * That is followed by a call to the {@link RowEditTable~onStartEditRow}
 * callback.
 * <p>
 * Two edit buffers are passed on to onStartEditRow, these buffers are
 * stored in the table's state. The cellEditBuffers buffer is an array 
 * intended to hold any temporary state for the individual cells as they 
 * perform their editing. The rowEditBuffer is a buffer for the full row,
 * it gets passed to the {@link RowEditTable~onRenderEditCell} callback,
 * <p>
 * The actual editing is entirely dependent upon the React objects returned
 * by the {@link RowEditTable~onRenderEditCell} callback,
 * Rows that are not being edited have the {@link RowEditTable~onRenderDisplayCell}
 * callback called.
 * <p>
 * When editing is complete and to be saved the 
 * {@link RowEditTable~asyncOnSaveEditRow} callback is called. 
 * If editing is to be canceled, the {@link RowEditTable~onCancelEditRow}
 * callback is called if present.
 * @name RowEditTable
 * @class
 */
export function rowEditTable(WrappedTable) {
    const ActiveRowWrappedTable = activeRowTable(WrappedTable);

    class _RowEditTable extends React.Component {
        constructor(props) {
            super(props);

            this.asyncEndEdit = this.asyncEndEdit.bind(this);

            this.onKeyDown = this.onKeyDown.bind(this);
            this.onOpen = this.onOpen.bind(this);
            this.onRenderCell = this.onRenderCell.bind(this);

            this.state = {
                activeEditRowKey: undefined,
                cellEditBuffers: [],
                rowEditBuffer: {},
                cellRefs: [],
                focusCellIndex: -1,
                focusSubCellIndex: -1,
            };
        }


        _buildValidCellRefs() {
            const { activeEditRowKey, cellRefs, 
                focusCellIndex, focusSubCellIndex } = this.state;
            if (activeEditRowKey) {
                const validEditCellInfos = [];
                let validEditCellInfoIndex = -1;
                for (let cellIndex = 0; cellIndex < cellRefs.length; ++cellIndex) {
                    const refs = cellRefs[cellIndex];
                    if (refs) {
                        for (let subCellIndex = 0; subCellIndex < refs.length; 
                            ++subCellIndex) {

                            const subCellRef = refs[subCellIndex];
                            if (subCellRef) {
                                if ((focusCellIndex === cellIndex)
                                 && (focusSubCellIndex === subCellIndex)) {
                                    validEditCellInfoIndex = validEditCellInfos.length;
                                }
                                validEditCellInfos.push({
                                    ref: subCellRef,
                                    cellIndex: cellIndex,
                                    subCellIndex: subCellIndex,
                                });
                            }
                        }
                    }
                }

                return {
                    validEditCellInfos: validEditCellInfos,
                    validEditCellInfoIndex: validEditCellInfoIndex,
                };
            }
        }


        getBackEditCell() {
            const result = this._buildValidCellRefs();
            if (result) {
                const { validEditCellInfos, validEditCellInfoIndex } = result;
                let nextIndex = (validEditCellInfoIndex >= 0) 
                    ? (validEditCellInfoIndex - 1) 
                    : 0;
                if (nextIndex < 0) {
                    nextIndex = validEditCellInfos.length - 1;
                }

                return {
                    editCellInfo: validEditCellInfos[nextIndex],
                };
            }
        }


        getForwardEditCell() {
            const result = this._buildValidCellRefs();
            if (result) {
                const { validEditCellInfos, validEditCellInfoIndex } = result;
                let nextIndex = (validEditCellInfoIndex + 1);
                if (nextIndex >= validEditCellInfos.length) {
                    nextIndex = 0;
                }

                return {
                    editCellInfo: validEditCellInfos[nextIndex],
                    wasLastEditCell: nextIndex === 0,
                };
            }
        }


        activateEditCell(editCellInfo) {
            if (!editCellInfo) {
                // eslint-disable-next-line max-len
                console.error('setCellRef was not called for any edit components in the active row.');
            }
            if (editCellInfo.ref) {
                editCellInfo.ref.focus();
            }
        }


        handleEditTab(event, rowEntry) {
            const result = (event.shiftKey) 
                ? this.getBackEditCell() 
                : this.getForwardEditCell();
            if (result) {
                this.activateEditCell(result.editCellInfo);
                event.preventDefault();
                return;
            }
            return 'default';
        }


        handleEditEnter(event, rowEntry, rowIndex, rowRefs) {
            const result = (event.shiftKey) 
                ? this.getBackEditCell() 
                : this.getForwardEditCell();
            if (result) {
                if (result.wasLastEditCell || event.ctrlKey) {
                    rowIndex += (event.shiftKey) ? -1 : 1;
                    if (rowIndex >= rowRefs.length) {
                        rowIndex = 0;
                    }
                    else if (rowIndex < 0) {
                        rowIndex = rowRefs.length - 1;
                    }

                    const nextRow = this.props.onGetRowAtIndex(rowIndex);
                    process.nextTick(async () => { await this.asyncStartEdit(nextRow); });
                    event.preventDefault();
                    return;
                }

                this.activateEditCell(result.editCellInfo);
                event.preventDefault();
                return;
            }

            return 'default';
        }


        handleEditEscape(event, rowEntry, rowIndex, rowRefs) {
            process.nextTick(async () => { await this.asyncEndEdit(false); });
            event.preventDefault();
        }


        onKeyDown(event, rowEntry, rowIndex, rowRefs) {
            // Only if editing...
            if (!this.state.activeEditRowKey) {
                return;
            }

            switch (event.key) {
            case 'Tab' :
                return this.handleEditTab(event, rowEntry, rowIndex, rowRefs);

            case 'Enter' :
                return this.handleEditEnter(event, rowEntry, rowIndex, rowRefs);

            case 'Escape' :
                return this.handleEditEscape(event, rowEntry, rowIndex, rowRefs);
            }

            return 'default';
        }


        async asyncEndEdit(isSave) {
            const { activeEditRow, cellEditBuffers, rowEditBuffer } = this.state;
            if (activeEditRow) {
                if (isSave) {
                    const { asyncOnSaveEditRow } = this.props;
                    if (asyncOnSaveEditRow) {
                        const errorMsg = await asyncOnSaveEditRow({
                            rowEntry: activeEditRow, 
                            cellEditBuffers: cellEditBuffers, 
                            rowEditBuffer: rowEditBuffer,
                        });
                        if (errorMsg) {
                            this.setState({ errorMsg: errorMsg });
                            return false;
                        }
                    }

                }
                else {
                    const { onCancelEditRow } = this.props;
                    if (onCancelEditRow) {
                        onCancelEditRow({
                            rowEntry: activeEditRow, 
                            cellEditBuffers: cellEditBuffers, 
                            rowEditBuffer: rowEditBuffer
                        });
                    }
                }
                this.setState({
                    activeEditRowKey: undefined,
                    activeEditRow: undefined,
                    cellEditBuffers: undefined,
                    rowEditBuffer: undefined,
                    cellRefs: [],
                });
            }
            return true;
        }


        async asyncStartEdit(rowEntry) {
            const { activeEditRowKey } = this.state;
            if (activeEditRowKey) {
                // End the edit.
                if (!await this.asyncEndEdit(true)) {
                    return;
                }
            }

            const { onActivateRow } = this.props;
            if (onActivateRow) {
                onActivateRow(rowEntry);
            }

            const { onStartEditRow } = this.props;
            const cellEditBuffers = [];
            const rowEditBuffer = {};
            if (onStartEditRow) {
                onStartEditRow({
                    rowEntry: rowEntry, 
                    cellEditBuffers: cellEditBuffers, 
                    rowEditBuffer: rowEditBuffer, 
                    asyncEndEdit: async (isSave) => this.asyncEndEdit(isSave),
                });
            }

            this.setState({
                activeEditRowKey: rowEntry.key,
                activeEditRow: rowEntry,
                cellEditBuffers: cellEditBuffers,
                rowEditBuffer: rowEditBuffer,
                cellRefs: [],
            });
        }


        onOpen(rowEntry, event) {
            const { activeEditRowKey } = this.state;
            if (activeEditRowKey !== rowEntry.key) {
                process.nextTick(async () => { await this.asyncStartEdit(rowEntry); });
            }
        }


        updateCellEditBuffer(newCellEditBuffer, columnIndex) {
            const newState = Object.assign({}, this.state);
            newState.cellEditBuffers = Array.from(newState.cellEditBuffers);
            newState.cellEditBuffers[columnIndex] = Object.assign({}, 
                newState.cellEditBuffers[columnIndex], newCellEditBuffer);
            this.setState(newState);
        }


        handleCellFocus(event, rowEntry, columnIndex) {
            const { cellRefs } = this.state;
            const refs = cellRefs[columnIndex];
            if (refs) {
                for (let i = 0; i < refs.length; ++i) {
                    if (refs[i] === event.target) {
                        this.setState({ focusCellIndex: columnIndex, 
                            focusSubCellIndex: i,
                        });
                    }
                }
            }
        }


        handleCellBlur(event, rowEntry, columnIndex) {
            this.setState({ focusCellIndex: -1, focusSubCellIndex: -1, });
        }


        setCellRef(cellRef, refIndex, columnIndex) {
            const { cellRefs } = this.state;
            if (!cellRefs[columnIndex]) {
                cellRefs[columnIndex] = [];
            }
            cellRefs[columnIndex][refIndex || 0] = cellRef;
        }


        onRenderCell({ cellInfo, cellSettings }) {
            const { rowEntry, columnIndex } = cellInfo;
            if (this.state.activeEditRowKey === rowEntry.key) {
                const { cellEditBuffers, rowEditBuffer } = this.state;
                if (cellEditBuffers) {
                    const cellEditBuffer = cellEditBuffers[columnIndex];
                    if (cellEditBuffer !== undefined) {
                        const renderArgs = {
                            cellInfo: cellInfo,
                            cellSettings: cellSettings,
                            cellEditBuffer: cellEditBuffer,
                            rowEditBuffer: rowEditBuffer,
                            updateCellEditBuffer: (newCellEditBuffer) => { 
                                this.updateCellEditBuffer(newCellEditBuffer, 
                                    columnIndex); 
                            },
                            updateRowEditBuffer: (newRowEditBuffer) => { 
                                this.setState({ rowEditBuffer: newRowEditBuffer }); 
                            },
                            setCellRef: (ref, refIndex) => { 
                                this.setCellRef(ref, refIndex, columnIndex); 
                            },
                            onFocus: (event) => { 
                                this.handleCellFocus(event, rowEntry, columnIndex); 
                            },
                            onBlur: (event) => { 
                                this.handleCellBlur(event, rowEntry, columnIndex); 
                            },
                        };
                        return this.props.onRenderEditCell({
                            cellInfo, 
                            cellSettings, 
                            renderArgs,
                        });
                    }
                }
            }

            return this.props.onRenderDisplayCell({
                cellInfo, 
                cellSettings
            });
        }


        render() {
            // eslint-disable-next-line no-unused-vars
            const { onRenderDisplayCell, onRenderEditCell, onStartEditRow, 
                // eslint-disable-next-line no-unused-vars
                asyncOnSaveEditRow, ...passThroughProps } = this.props;

            return (
                <ActiveRowWrappedTable
                    {...passThroughProps}
                    onKeyDown={this.onKeyDown}
                    onOpenRow={this.onOpen}
                    onRenderCell={this.onRenderCell}
                />
            );
        }
    }

    /**
     * @callback RowEditTable~updateCellEditBuffer
     * @param {object}  cellBuffer
     * @param {number}  colIndex
     */

    /**
     * @callback RowEditTable~updateRowEditBuffer
     * @param {object} rowEditBuffer
     */

    /**
     * @callback RowEditTable~setCellRef
     * This is normally called from the 'ref' property of an edit component in
     * a row. See {@link https://reactjs.org/docs/refs-and-the-dom.html#callback-refs}.
     * @param {object}  ref
     * @param {number}  [refIndex=0]    If a column has more than one editor, this
     * is the index of the editor within the column.
     */

    /**
     * @typedef {object}    RowEditTable~renderArgs
     * Used to pass all sorts of info for editing a row.
     *
     * @property {CollapsibleRowTable~CellInfo} cellInfo
     * @property {CollapsibleRowTable~CellSettings} cellSettings
     * @property {object}  cellEditBuffer
     * @property {object}  rowEditBuffer
     * @property {RowEditTable~updateCellEditBuffer}    updateCellEditBuffer
     * Call to change the contents of an individual cell edit buffer.
     * @property {RowEditTable~updateRowEditBuffer}     updateRowEditBuffer
     * Call to change the contents of the row edit buffer.
     * @property {RowEditTable~setCellRef} setCellRef   This should be called
     * for each edit component in the row, it's used to manage tab focus.
     * @property {function} onFocus
     * @property {function} onBlur
     */

    /**
     * Callback passed as an arg to {@link RowEditTable~onStartEditRow} that
     * can be used to end editing.
     * @callback RowEditTable~asyncEndEditRow
     * @param {boolean} isSave  Set to <code>true</code> to save the current edit
     * contents, the {@link RowEditTable~asyncOnSaveEditRow} callback from the props
     * will eventually be called. If <code>false</code> then the current edit
     * contents will be discarded, and the {@link RowEditTable~onCancelEditRow}
     * callback, if present, will be called.
     * @returns {boolean}   <code>false</code> if isSave was <code>true</code>
     * and the {@link RowEditTable~asyncOnSaveEditRow} callback failed.
     */

    /**
     * @typedef {object} RowEditTable~onStartEditRowArgs
     * @property {CollapsibleRowTable~RowEntry}  rowEntry
     * @property {RowEditTable~renderArgs} renderArgs
     * @property {object[]}   cellEditBuffers Array whose elements correspond 
     * to the individual cells, the editable cells should use the appropriate 
     * element to store in-progress edit information.
     * Note that cells that do edit do need to store an object in 
     * cellEditBuffers at their corresponding index.
     * @property {object}  rowEditBuffer   Object that may be used to pass 
     * information to the {@link RowEditTable~onRenderEditCell} callback.
     * @property {RowEditTable~asyncEndEditRow}    asyncEndEditRow Callback 
     * that can be used to end the editing started by this.
     */

    /**
     * @callback RowEditTable~onStartEditRow
     * @param {RowEditTable~onStartEditRowArgs} args
     */

    
    /**
     * @typedef {object} RowEditTable~onCancelEditRowArgs
     * @property {CollapsibleRowTable~RowEntry}  rowEntry
     * @property {object[]}   cellEditBuffers Edit buffer array that was 
     * passed to {@link RowEditTable~onStartEditRow}
     * @property {object}  rowEditBuffer   The row edit buffer that was 
     * passed to {@link RowEditTable~onStartEditRow}, may be a copy.
     */

    /**
     * @callback RowEditTable~onCancelEditRow
     * @param {RowEditTable~onCancelEditRowArgs} args
     */

    
    /**
     * @typedef {object} RowEditTable~asyncOnSaveEditRowArgs
     * @property {CollapsibleRowTable~RowEntry}  rowEntry
     * @property {object[]}   cellEditBuffers The edit buffer array that was 
     * passed to {@link RowEditTable~onStartEditRow} and may have been 
     * modified during cell editing.
     * @property {object}  rowEditBuffer   The row edit buffer that was 
     * passed to {@link RowEditTable~onStartEditRow}, may be a copy.
     */

    /**
     * Callback used to save the current edit state.
     * @callback RowEditTable~asyncOnSaveEditRow
     * @param {RowEditTable~asyncOnSaveEditRowArgs} args
     * @returns {string|undefined}   If a non-empty string is returned, 
     * it is an error message that should be displayed.
     */


    /**
     * @typedef {object} RowEditTable~onRenderDisplayCellArgs
     * @property {CollapsibleRowTable~CellInfo} cellInfo
     * @property {CollapsibleRowTable~CellSettings} cellSettings
     */
    
    /**
     * The callback for rendering cells
     * @callback RowEditTable~onRenderDisplayCell
     * @param {RowEditTable~onRenderDisplayCellArgs} args
     * @returns {object|string}    A React component or text string.
     */

    
    /**
     * @typedef {object} RowEditTable~onRenderEditCellArgs
     * @property {CollapsibleRowTable~CellInfo} cellInfo
     * @property {CollapsibleRowTable~CellSettings} cellSettings
     * @property {RowEditTable~renderArgs} renderArgs
     */
    
    /**
     * Callback used to render a cell when it is in edit mode.
     * @callback RowEditTable~onRenderEditCell
     * @param {RowEditTable~onRenderEditCellArgs} args
     * @returns {object|string}    A React component or text string.
     */


    /**
     * @typedef {object}    RowEditTable~Props
     *
     * @property {RowEditTable~onRenderDisplayCell} onRenderDisplayCell
     * @property {RowEditTable~onRenderEditCell} onRenderEditCell
     * @property {RowEditTable~onStartEditRow} onStartEditRow
     * @property {RowEditTable~onCancelEditRow} [onCancelEditRow]
     * @property {RowEditTable~asyncOnSaveEditRow} asyncOnSaveEditRow
     */

    _RowEditTable.propTypes = {
        onRenderDisplayCell: PropTypes.func.isRequired,
        onRenderEditCell: PropTypes.func.isRequired,
        onStartEditRow: PropTypes.func.isRequired,
        onCancelEditRow: PropTypes.func,
        asyncOnSaveEditRow: PropTypes.func.isRequired,

        // From ActiveRowTable...
        onGetRowAtIndex: PropTypes.func.isRequired,
        onActivateRow: PropTypes.func.isRequired,
    };

    return _RowEditTable;
}


/**
 * React component applying the {@link rowEditTable} HOC to the table 
 * {@link CollapsibleRowTable}.
 */
export const RowEditCollapsibleTable = rowEditTable(CollapsibleRowTable);

