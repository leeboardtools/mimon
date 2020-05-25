import React from 'react';
import PropTypes from 'prop-types';
import { RowTable } from './RowTable';

export function editableRowTable(WrappedTable) {
    class _EditableRowTable extends React.Component {
        constructor(props) {
            super(props);

            this.asyncEndRowEdit = this.asyncEndRowEdit.bind(this);
            this.cancelRowEdit = this.cancelRowEdit.bind(this);
            this.setRowEditBuffer = this.setRowEditBuffer.bind(this);
            this.setCellEditBuffer = this.setCellEditBuffer.bind(this);

            this.onActivateRow = this.onActivateRow.bind(this);
            this.onOpenActiveRow = this.onOpenActiveRow.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onRenderCell = this.onRenderCell.bind(this);

            this._rowTableRef = React.createRef();

            this.state = {
                activeRowIndex: this.props.requestedActiveRowIndex || 0,
            };
        }


        componentDidUpdate(prevProps, prevState) {
            const { props } = this;
            if (props.requestedActiveRowIndex !== undefined) {
                if (props.requestedActiveRowIndex !== this.state.activeRowIndex) {
                    this.setState({
                        activeRowIndex: props.requestedActiveRowIndex,
                    });
                }
            }
        }


        async asyncEndRowEdit() {
            if (this._isSaving) {
                return;
            }
            if (await this.asyncSaveRowEdit()) {
                this.cancelRowEdit();
            }
        }


        setActiveEditInfo(changes) {
            let newActiveEditInfo;
            if (changes) {
                newActiveEditInfo = Object.assign({}, 
                    this.state.activeEditInfo || {},
                    changes);
            }
            this.setState({
                activeEditInfo: newActiveEditInfo,
            });
        }


        setRowEditBuffer(bufferChanges) {
            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const newRowEditBuffer = Object.assign({}, 
                    activeEditInfo.rowEditBuffer, 
                    bufferChanges);
                this.setActiveEditInfo({
                    rowEditBuffer: newRowEditBuffer,
                });
            }
        }


        setCellEditBuffer(columnIndex, bufferChanges) {
            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const newCellEditBuffers = Array.from(activeEditInfo.cellEditBuffers);
                newCellEditBuffers[columnIndex] = Object.assign({},
                    newCellEditBuffers[columnIndex], bufferChanges);
                this.setActiveEditInfo({
                    cellEditBuffers: newCellEditBuffers,
                });
            }
        }


        startRealRowEdit(rowIndex, columnIndex) {
            console.log('startRealRowEdit: ' + rowIndex);

            const { onStartRowEdit, columns } = this.props;
            if (onStartRowEdit) {
                const newRowEditBuffer = {};
                const newCellEditBuffers = columns.map((item) => { return {}; });

                if (onStartRowEdit({
                    rowIndex: rowIndex,
                    columnIndex: columnIndex,
                    rowEditBuffer: newRowEditBuffer,
                    cellEditBuffers:    newCellEditBuffers,
                    asyncEndRowEdit: this.asyncEndRowEdit,
                    cancelRowEdit: this.cancelRowEdit,
                    setRowEditBuffer: this.setRowEditBuffer,
                    setCellEditBuffer: this.setCellEditBuffer,
                })) {
                    this.setActiveEditInfo({
                        rowIndex: rowIndex,
                        rowEditBuffer: newRowEditBuffer,
                        cellEditBuffers:    newCellEditBuffers,
                        refsForFocus: columns.map(() => React.createRef()),
                    });
                    return true;
                }
            }

            this.setActiveEditInfo();
        }


        async asyncSaveRowEdit() {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { asyncOnSaveRowEdit } = this.props;
                if (asyncOnSaveRowEdit) {
                    this._isSaving = true;
                    try {
                        if (!await asyncOnSaveRowEdit(activeEditInfo)) {
                            return false;
                        }
                    }
                    finally {
                        this._isSaving = false;
                    }
                }
            }

            return true;
        }


        startRowEdit(rowIndex, columnIndex) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                this.asyncSaveRowEdit().then((result) => {
                    if (result) {
                        this.startRealRowEdit(rowIndex, columnIndex);
                    }
                });
            }
            else {
                this.startRealRowEdit(rowIndex, columnIndex);
            }
        }

        
        cancelRowEdit() {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { onCancelRowEdit } = this.props;
                if (onCancelRowEdit) {
                    onCancelRowEdit(activeEditInfo);
                }
                    
                this.setActiveEditInfo();
            }
        }


        activateRow(rowIndex) {
            this.cancelRowEdit();

            const { onActiveRowChanged } = this.props;
            if (onActiveRowChanged) {
                onActiveRowChanged(rowIndex);
            }

            this.setState({
                activeRowIndex: rowIndex,
            });
        }


        onActivateRow(rowIndex) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo
             && (activeEditInfo.rowIndex !== rowIndex)) {
                this.asyncSaveRowEdit().then((result) => {
                    if (result) {
                        this.activateRow(rowIndex);
                    }
                });
            }
            else {
                this.activateRow(rowIndex);
            }
        }


        onOpenActiveRow(rowIndex, columnIndex) {
            this.startRowEdit(rowIndex, columnIndex);
        }


        onKeyDown(e) {
            if (this._isSaving) {
                return;
            }

            let { activeEditInfo } = this.state;
            if (activeEditInfo) {
                switch (e.key) {
                case 'Escape' :
                    this.cancelRowEdit();
                    e.preventDefault();
                    break;

                case 'Enter' :
                    e.preventDefault();
                    break;
                }
            }
        }


        onRenderCell(args) {
            const { onRenderDisplayCell, onRenderEditCell } = this.props;
            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { rowIndex, columnIndex } = args;
                if (rowIndex === activeEditInfo.rowIndex) {
                    args = Object.assign({}, args, {
                        rowEditBuffer: activeEditInfo.rowEditBuffer,
                        cellEditBuffer: activeEditInfo.cellEditBuffers[columnIndex],
                        refForFocus: activeEditInfo.refsForFocus[columnIndex],
                    });
                    return onRenderEditCell(args);
                }
            }

            return onRenderDisplayCell(args);
        }


        render() {
            const {
                ...passThroughProps
            } = this.props;

            const { state } = this;

            const { activeRowEditIndex } = state;

            return <WrappedTable
                {...passThroughProps}

                activeRowIndex={state.activeRowIndex}
                onActivateRow={this.onActivateRow}

                requestedVisibleRowIndex={state.activeRowIndex}

                onOpenActiveRow={this.onOpenActiveRow}
                onKeyDown={this.onKeyDown}
                onRenderCell={this.onRenderCell}
                noActiveRowFocus={activeRowEditIndex !== undefined}

                ref={this._rowTableRef}
            >

            </WrappedTable>;
        }


        getVisibleRowRange() {
            const { current } = this._rowTableRef;
            if (current) {
                return current.getVisibleRowRange();
            }
        }

        makeRowRangeVisible(rowIndexA, rowIndexB) {
            const { current } = this._rowTableRef;
            if (current) {
                return current.makeRowRangeVisible(rowIndexA, rowIndexB);
            }
        }
        
    }


    /**
     * @callback EditableRowTable~onActiveRowChanged
     * @param {number}  activeRowIndex
     */


    /**
     * @callback EditableRowTable~onRenderDisplayCell
     * @param {RowTable~onRenderCellArgs}   args
     */

    /**
     * @typedef {object}    EditableRowTable~onRenderEditCellArgs
     * @property {number}   rowIndex
     * @property {number}   columnIndex
     * @property {RowTable~Column}  column
     * @property {boolean}  isSizeRender
     * @property {object}   rowEditBuffer
     * @property {object}   cellEditBuffer
     * @property {React.Ref}    refForFocus This is used to set focus to the appropriate
     * editor when a cell is double-clicked.
     */

    /**
     * @callback EditableRowTable~onRenderEditCell
     * @param {EditableRowTable~onRenderEditCellArgs}   args
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to end editing with save.
     * @callback EditableRowTable~asyncEndRowEdit
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to cancel editing.
     * @callback EditableRowTable~cancelRowEdit
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to modify rowEditBuffer. This is needed to trigger renders
     * @callback EditableRowTable~setRowEditBuffer
     * @param {object} rowEditBufferChanges The changes to be made to rowEditBuffer,
     * this is like React's setState() in that only specified properties are modified.
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to modify a cellEditBuffer for a cell. This is needed to trigger renders
     * @callback EditableRowTable~setCellEditBuffer
     * @param {number}  columnIndex The column index of the cell.
     * @param {object}  bufferChanges The changes to be made to cellEditBuffers,
     * this is like React's setState() in that only specified properties are modified.
     */


    /**
     * @typedef {object} EditableRowTable~onStartRowEditArgs
     * @property {number}   rowIndex
     * @property {number}   [columnIndex=undefined] If this is specified then it is
     * the column index of the column that was double-clicked on.
     * @property {object}   rowEditBuffer
     * @property {object[]} cellEditBuffers Array holding the edit buffers for the 
     * individual cells. These are normally used to hold the current edit value
     * between renders, and should be updated in the cell editor's onChange handler
     * by calling setCellEditBuffer.
     * @property {EditableRowTable~asyncEndRowEdit} asyncEndRowEdit Callback that can be
     * called to programatically end the editing with save.
     * @property {EditableRowTable~cancelRowEdit}   cancelRowEdit   Callback that can be
     * called to programatically cancel editing.
     * @property {EditableRowTable~setRowEditBuffer}    setRowEditBuffer    Callback that
     * should be called when the row edit buffer needs updating. Note that within
     * onStartRowEdit() rowEditBuffer should be set directly, not vial setRowEditBuffer().
     * @property {EditableRowTable~setCellEditBuffer}   setCellEditBuffer   Callback that
     * should be called when a cell edit buffer needs updating. Note that within
     * onStartRowEdit() cellEditBuffers should be set directly, not via 
     * setCellEditBuffer().
     */

    /**
     * @callback EditableRowTable~onStartRowEdit
     * @param {EditableRowTable~onStartRowEditArgs} args
     * @returns {boolean}   <code>true</code> if row editing has successfully started.
     */

    /**
     * @typedef {object}    EditableRowTable~onSaveRowEditArgs
     * @property {number}   rowIndex
     * @property {object}   rowEditBuffer
     * @property {object[]} cellEditBuffers
     */

    /**
     * @callback EditableRowTable~asyncOnSaveRowEdit
     * @param {EditableRowTable~onSaveRowEditArgs}
     */

    /**
     * @typedef {object}    EditableRowTable~onCancelRowEditArgs
     * @property {number}  rowIndex
     * @property {object}   rowEditBuffer
     */

    /**
     * @callback EditableRowTable~onCancelRowEdit
     * @param {EditableRowTable~onCancelRowEditArgs}    args
     */


    /**
     * @typedef {object}    EditableRowTable~propTypes
     * @property {EditableRowTable~onRenderDisplayCell} onRenderDisplayCell Callback
     * for rendering a cell when the cell's row is not being edited.
     * @property {EditableRowTable~onRenderEditCell}    onRenderEditCell    Callback
     * for rendering a cell when the cell's row is being edited.
     * @property {number}   [requestedActiveRowIndex]   If specified the row that
     * ought to be made the active row.
     * @property {EditableRowTable~onActiveRowChanged}  [onActiveRowChanged]    Callback
     * for whenever the active row is changed.
     * @property {EditableRowTable~onStartRowEdit}  onStartRowEdit  Callback for
     * when editing is about to start on a row.
     * @property {EditableRowTable~asyncOnSaveRowEdit}  asyncOnSaveRowEdit  Callback
     * for when editing of a row should be completed, saving the contents.
     * @property {EditableRowTable~onCancelRowEdit} onCancelRowEdit Callback
     * for when editing of a row should be canceled and no changes made.
     */
    _EditableRowTable.propTypes = {
        // From RowTable...
        columns: PropTypes.array,

        onRenderDisplayCell: PropTypes.func.isRequired,
        onRenderEditCell: PropTypes.func.isRequired,

        requestedActiveRowIndex: PropTypes.number,
        onActiveRowChanged: PropTypes.func,

        onStartRowEdit: PropTypes.func,
        asyncOnSaveRowEdit: PropTypes.func,
        onCancelRowEdit: PropTypes.func,
    };

    return _EditableRowTable;
}

export const EditableRowTable = editableRowTable(RowTable);
