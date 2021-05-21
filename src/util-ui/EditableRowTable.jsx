import React from 'react';
import PropTypes from 'prop-types';
import { RowTable } from './RowTable';
import { setFocus } from '../util/ElementUtils';

let id = 1;

export function editableRowTable(WrappedTable) {
    class _EditableRowTable extends React.Component {
        constructor(props) {
            super(props);

            this.id = id++;

            this.monitorActiveColumn = this.monitorActiveColumn.bind(this);

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


        componentDidMount() {
            window.addEventListener('focus', this.monitorActiveColumn, true);
        }

        componentWillUnmount() {
            window.removeEventListener('focus', this.monitorActiveColumn);
        }


        monitorActiveColumn() {        
            const { onEnterCellEdit, onExitCellEdit } = this.props;
            if (!onEnterCellEdit && !onExitCellEdit) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (!activeEditInfo) {
                return;
            }

            let { activeColumnIndex, refsForFocus } = activeEditInfo;
            if (!refsForFocus) {
                return;
            }

            let activeColumnElement;
            if (activeColumnIndex >= 0) {
                activeColumnElement = refsForFocus[activeColumnIndex].current;
            }

            const { activeElement } = document;

            // We only care if the active column changes to another column.
            if (activeElement) {
                if (!activeColumnElement 
                 || !activeColumnElement.contains(activeElement)) {
                    // Look for the new active element, if any.
                    let newActiveColumnIndex = activeColumnIndex;
                    for (let i = 0; i < refsForFocus.length; ++i) {
                        const ref = refsForFocus[i];
                        if (!ref) {
                            continue;
                        }

                        const { current } = ref;
                        if (!current || (typeof current.contains !== 'function')) {
                            continue;
                        }

                        if (current.contains(activeElement)) {
                            newActiveColumnIndex = i;
                            break;
                        }
                    }

                    if ((newActiveColumnIndex !== activeColumnIndex)
                     && (newActiveColumnIndex >= 0)) {
                        const args = {
                            rowIndex: activeEditInfo.rowIndex,
                            columnIndex: activeColumnIndex,
                            rowEditBuffer: activeEditInfo.rowEditBuffer,
                            cellEditBuffers: activeEditInfo.cellEditBuffers,
                            asyncEndRowEdit: this.asyncEndRowEdit,
                            cancelRowEdit: this.cancelRowEdit,
                            setRowEditBuffer: this.setRowEditBuffer,
                            setCellEditBuffer: this.setCellEditBuffer,
                        };
                        if (onExitCellEdit && (activeColumnIndex >= 0)) {
                            onExitCellEdit(args);
                        }


                        if (onEnterCellEdit) {
                            args.columnIndex = newActiveColumnIndex;
                            onEnterCellEdit(args);
                        }

                        this.setActiveEditInfo({
                            activeColumnIndex: newActiveColumnIndex,
                        });
                    }
                }
            }
        }


        componentDidUpdate(prevProps, prevState) {
            const { props, state } = this;
            if (props.requestedActiveRowIndex !== undefined) {
                if (props.requestedActiveRowIndex !== this.state.activeRowIndex) {
                    this.setState({
                        activeRowIndex: props.requestedActiveRowIndex,
                    });
                    return;
                }
            }

            if (props.requestOpenActiveRow) {
                const { activeEditInfo } = state;
                if (!activeEditInfo && this._rowTableRef.current) {
                    this._rowTableRef.current.openActiveRow();
                    return;
                }
            }
        }


        async asyncEndRowEdit() {
            if (this._isSaving) {
                return;
            }
            if (await this.asyncSaveRowEdit({
                reason: 'endRowEdit',
            })) {
                this.cancelRowEdit();
                return true;
            }
        }


        setActiveEditInfo(changes) {
            if (!changes) {
                this.setState({
                    activeEditInfo: undefined,
                });
            }
            else {
                this.setState((state) => {
                    const newActiveEditInfo = Object.assign({},
                        state.activeEditInfo || {},
                        changes);
                    return {
                        activeEditInfo: newActiveEditInfo,
                    };
                });
            }
        }


        setRowEditBuffer(bufferChanges, callback) {
            let setStateCallback;
            if (callback) {
                setStateCallback = () => {
                    const { activeEditInfo } = this.state;
                    callback(activeEditInfo.rowEditBuffer);
                };
            }
            this.setState((state) => {
                const { activeEditInfo } = state;
                if (activeEditInfo) {
                    const newRowEditBuffer = Object.assign({}, 
                        activeEditInfo.rowEditBuffer, 
                        bufferChanges);
                    if (typeof newRowEditBuffer.changeId === 'number') {
                        ++newRowEditBuffer.changeId;
                    }
                    const newActiveEditInfo = Object.assign({},
                        activeEditInfo,
                        {
                            rowEditBuffer: newRowEditBuffer,
                        });
                    return {
                        activeEditInfo: newActiveEditInfo,
                    };
                }
            },
            setStateCallback);
        }


        setCellEditBuffer(columnIndex, bufferChanges) {
            this.setState((state) => {
                const { activeEditInfo } = state;
                if (activeEditInfo) {
                    const newCellEditBuffers = Array.from(activeEditInfo.cellEditBuffers);
                    const newCellEditBuffer = Object.assign({},
                        newCellEditBuffers[columnIndex], bufferChanges);
                    if (typeof newCellEditBuffer.changeId === 'number') {
                        ++newCellEditBuffer.changeId;
                    }

                    newCellEditBuffers[columnIndex] = newCellEditBuffer;
                    const newActiveEditInfo = Object.assign({},
                        activeEditInfo,
                        {
                            cellEditBuffers: newCellEditBuffers,
                        });
                    return {
                        activeEditInfo: newActiveEditInfo,
                    };
                }
            });
        }


        updateForNewEdit() {
            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { refsForFocus } = activeEditInfo;

                let refForFocus;
                const columnIndex = activeEditInfo.columnIndex || 0;

                //let focusColumnIndex;
                for (let i = columnIndex; i < refsForFocus.length; ++i) {
                    if (this.canRefFocus(refsForFocus[i])) {
                        refForFocus = refsForFocus[i];
                        //focusColumnIndex = i;
                        break;
                    }
                }

                if (!refForFocus) {
                    for (let i = 0; i < columnIndex; ++i) {
                        if (this.canRefFocus(refsForFocus[i])) {
                            refForFocus = refsForFocus[i];
                            //focusColumnIndex = i;
                        }
                    }
                }
                
                this.focusToRef(refForFocus);

            }
        }


        startRealRowEdit({ rowIndex, columnIndex, }) {
            const { onStartRowEdit, columns } = this.props;
            if (onStartRowEdit) {
                const newRowEditBuffer = {
                    changeId: 0,
                };
                const newCellEditBuffers = columns.map((item) => { 
                    return { }; 
                });

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
                        columnIndex: columnIndex,
                        rowEditBuffer: newRowEditBuffer,
                        cellEditBuffers:    newCellEditBuffers,
                        refsForFocus: columns.map(() => React.createRef()),
                        activeColumnIndex: -1,
                    });

                    process.nextTick(() => this.updateForNewEdit());
                    return true;
                }
            }

            this.setActiveEditInfo();
        }


        async asyncSaveRowEdit(args) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { asyncOnSaveRowEdit } = this.props;
                if (asyncOnSaveRowEdit) {
                    this._isSaving = true;
                    try {
                        if (!await asyncOnSaveRowEdit(Object.assign({},
                            activeEditInfo, args))) {
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


        startRowEdit(args) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                this.asyncSaveRowEdit({
                    reason: 'startRowEdit',
                }).then((result) => {
                    if (result) {
                        this.startRealRowEdit(args);
                    }
                });
            }
            else {
                this.startRealRowEdit(args);
            }
        }

        
        /**
         * Public method that cancels editing if there is editing going on.
         */
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


        /**
         * Requests a particular row be made the active row.
         * @param {number} activeRowIndex 
         */
        activateRow(rowIndex, callback) {
            this.cancelRowEdit();

            const { onActiveRowChanged } = this.props;
            if (onActiveRowChanged) {
                onActiveRowChanged(rowIndex);
            }

            this.setState({
                activeRowIndex: rowIndex,
            },
            callback);
        }



        /**
         * 'Opens' the active row.
         * @param {number} [columnIndex]
         */
        openActiveRow(columnIndex) {
            this._rowTableRef.current.openActiveRow(columnIndex);
        }


        onActivateRow(rowIndex) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo
             && (activeEditInfo.rowIndex !== rowIndex)) {
                this.asyncSaveRowEdit({
                    reason: 'activateRow',
                }).then((result) => {
                    if (result) {
                        this.activateRow(rowIndex);
                    }
                });
            }
            else {
                this.activateRow(rowIndex);
            }
        }


        onOpenActiveRow(args) {
            this.startRowEdit(args);
        }


        findCellFocus(startIndex, increment) {
            let { activeEditInfo } = this.state;
            if (activeEditInfo) {
                const { refsForFocus } = activeEditInfo;
                const endIndex = (increment > 0) 
                    ? refsForFocus.length 
                    : -1;
                for (let i = startIndex; i !== endIndex; i += increment) {
                    if (this.canRefFocus(refsForFocus[i])) {
                        return refsForFocus[i];
                    }
                }
            }
        }

        getFirstCellFocus() {
            return this.findCellFocus(0, 1);
        }

        getLastCellFocus() {
            return this.findCellFocus(this.props.columns.length - 1, -1);
        }


        getColumnIndexWithFocus() {
            const currentFocus = document.activeElement;
            let { activeEditInfo } = this.state;
            if (activeEditInfo && currentFocus) {
                const { refsForFocus } = activeEditInfo;
                for (let i = 0; i < refsForFocus.length; ++i) {
                    if (currentFocus === refsForFocus[i].current) {
                        return i;
                    }
                }
            }
        }


        getNextCellFocus() {
            const columnIndex = this.getColumnIndexWithFocus();
            if (columnIndex !== undefined) {
                return this.findCellFocus(columnIndex + 1, 1);
            }
        }

        getPrevCellFocus() {
            const columnIndex = this.getColumnIndexWithFocus();
            if (columnIndex !== undefined) {
                return this.findCellFocus(columnIndex - 1, -1);
            }
        }


        canRefFocus(ref) {
            if (ref && ref.current) {
                if (typeof ref.current.tabIndex === 'number') {
                    return ref.current.tabIndex >= 0;
                }
                if ((typeof ref.current.props === 'object')
                 && (typeof ref.current.props.tabIndex === 'number')) {
                    return ref.current.props.tabIndex >= 0;
                }
            }
        }

        focusToRef(ref) {
            if (ref && ref.current) {
                if (typeof ref.current.focus === 'function') {
                    ref.current.focus();
                }
                if (typeof ref.current.setFocus === 'function') {
                    ref.current.setFocus();
                }
            }
        }


        onKeyDown(e) {
            if (this._isSaving) {
                return;
            }

            const { activeEditInfo } = this.state;
            if (activeEditInfo) {
                switch (e.key) {
                case 'Escape' :
                    this.cancelRowEdit();
                    setFocus(this._rowTableRef.current);
                    e.preventDefault();
                    break;

                case 'Enter' :
                    if (e.shiftKey) {
                        let newFocus = this.getPrevCellFocus();
                        if (!newFocus) {
                            newFocus = this.getLastCellFocus();
                        }
                        this.focusToRef(newFocus);
                    }
                    else {
                        let newFocus = this.getNextCellFocus();
                        if (!newFocus) {
                            this.asyncSaveRowEdit({
                                reason: 'Enter',
                            }).then((result) => {
                                if (result) {
                                    this.cancelRowEdit();
                                    this._rowTableRef.current.activateRow(
                                        activeEditInfo.rowIndex + 1);
                                }
                            });
                        }
                        else {
                            this.focusToRef(newFocus);
                        }
                    }
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
                        cellEditBuffers: activeEditInfo.cellEditBuffers,
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
                onOuterRenderCell,
                // eslint-disable-next-line react/prop-types
                onRenderCell,
                ...passThroughProps
            } = this.props;

            onRenderCell;

            const { state } = this;

            const { activeEditInfo } = state;

            let myOnRenderCell = this.onRenderCell;
            if (onOuterRenderCell) {
                myOnRenderCell = (args) => onOuterRenderCell(args, this.onRenderCell);
            }

            return <WrappedTable
                {...passThroughProps}

                activeRowIndex = {state.activeRowIndex}
                onActivateRow = {this.onActivateRow}

                requestedVisibleRowIndex = {state.activeRowIndex}

                onOpenActiveRow = {this.onOpenActiveRow}
                onKeyDown = {this.onKeyDown}
                onRenderCell = {myOnRenderCell}
                noActiveRowFocus = {activeEditInfo !== undefined}

                ref = {this._rowTableRef}
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
     * Callback for an outer {@link RowTable~onRenderCell}, see 
     * {@link CollapsibleRowTable~propTypes} for an example. The callback
     * should at some point call the onRenderCell arg passed in.
     * @callback EditableRowTable~onOuterRenderCell
     * @param {RowTable~onRenderCellArgs}   args
     * @property {RowTable~onRenderCell}    onRenderCell
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
     * @property {object[]} cellEditBuffers
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
     * @returns {boolean}   <code>true</code> if editing ended, that is, the
     * asyncOnSaveRowEdit callback returned <code>true</code>.
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to cancel editing.
     * @callback EditableRowTable~cancelRowEdit
     */

    /**
     * @callback EditableRowTable~setRowEditBufferCallback
     * @param {*}   rowEditBuffer
     */


    /**
     * Callback passed to EditableRowTable~onStartRowEdit that allows the creator
     * to modify rowEditBuffer. This is needed to trigger renders
     * @callback EditableRowTable~setRowEditBuffer
     * @param {object} rowEditBufferChanges The changes to be made to rowEditBuffer,
     * this is like React's setState() in that only specified properties are modified.
     * @param {EditableRowTable~setRowEditBufferCallback}    [callback]  Optional 
     * callback to be called after the row edit buffer has been updated.
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
     * @property {string}   reason Possible reasons for asyncOnSaveRowEdit being
     * called are:
     * <li>endRowEdit
     * <li>startRowEdit
     * <li>activateRow
     * <li>Enter
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
     * @typedef {object}    EditableRowTable~onEnterExitCellEditArgs
     * The same as {@link EditableRowTable~onStartRowEditArgs}, with columnIndex
     * appropriately set.
     */

    /**
     * @callback EditableRowTable~onEnterCellEdit
     * @param {EditableRowTable~onEnterExitCellEditArgs}    args
     */

    /**
     * @callback EditableRowTable~onExitCellEdit
     * @param {EditableRowTable~onEnterExitCellEditArgs}    args
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
     * @property {boolean}  [requestOpenActiveRow]  If specified the active row ought
     * to be opened.
     * @property {EditableRowTable~onStartRowEdit}  onStartRowEdit  Callback for
     * when editing is about to start on a row.
     * @property {EditableRowTable~asyncOnSaveRowEdit}  asyncOnSaveRowEdit  Callback
     * for when editing of a row should be completed, saving the contents.
     * @property {EditableRowTable~onCancelRowEdit} onCancelRowEdit Callback
     * for when editing of a row should be canceled and no changes made.
     * @property {EditableRowTable~onEnterCellEdit} [onEnterCellEdit] Optional callback
     * when a cell receives focus. This is not guaranteed to be called.
     * @property {EditableRowTable~onEnterCellEdit} [onExitCellEdit] Optional callback
     * when a cell that had focus gives up focus to another cell. This is not guaranteed
     * to be called.
     * @property {EditableRowTable~onOuterRenderCell}    [onOuterRenderCell] Optional
     * special callback used to encapsulate the editable row table's onRenderCell.
     */
    _EditableRowTable.propTypes = {
        // From RowTable...
        columns: PropTypes.array,

        onRenderDisplayCell: PropTypes.func.isRequired,
        onRenderEditCell: PropTypes.func.isRequired,

        requestedActiveRowIndex: PropTypes.number,
        onActiveRowChanged: PropTypes.func,

        requestOpenActiveRow: PropTypes.bool,

        onStartRowEdit: PropTypes.func,
        asyncOnSaveRowEdit: PropTypes.func,
        onCancelRowEdit: PropTypes.func,

        onEnterCellEdit: PropTypes.func,
        onExitCellEdit: PropTypes.func,

        onOuterRenderCell: PropTypes.func,
    };

    return _EditableRowTable;
}

/**
 * @class
 */
export const EditableRowTable = editableRowTable(RowTable);
