import PropTypes from 'prop-types';
import deepEqual from 'deep-equal';


/**
 * Manager object for use with {@link EditableRowTable} that handles the
 * management of the cell editing using callbacks in columns defined by
 * {@link CellEditorsManager~ColumnInfo}s.
 * <p>
 * At the start of a row edit, the getCellValue callback for each column
 * is called and the result is assigned to the value property of the
 * cell edit buffer for the column.
 * Prior to the getCellValue callbacks being called the startRowEdit callback,
 * if present, is called. If the row edit buffer is to be used, this can be
 * used to initialize it.
 * <p>
 * The edit renderer for each cell is presumed to use the cell edit buffer
 * for that cell. It can also use the row edit buffer via the setRowEditBuffer()
 * callback.
 * <p>
 * When the row edit is completed, getSaveBuffer() is called to obtain a save
 * buffer that will be passed to each saveCellValue() and also to asyncSaveBuffer.
 * The rowEditBuffer is also passed to these calls, so if that is sufficient it may
 * be used.
 * 
 */
export class CellEditorsManager {
    constructor(props) {
        this.props = props;

        this.onStartRowEdit = this.onStartRowEdit.bind(this);
        this.asyncOnSaveRowEdit = this.asyncOnSaveRowEdit.bind(this);
        this.onCancelRowEdit = this.onCancelRowEdit.bind(this);
        this.onEnterCellEdit = this.onEnterCellEdit.bind(this);
        this.onExitCellEdit = this.onExitCellEdit.bind(this);

        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);
    }


    _setManagerState(state) {
        const prevState = this.props.getManagerState();
        this.props.setManagerState(Object.assign({}, prevState, state));
    }


    /**
     * Helper that calls the getSaveBuffer callback and then calls the
     * saveCellValue callbacks for each cell. This should only be called
     * when editing is active.
     * @param {EditableRowTable~onRenderEditCellArgs
     *  | EditableRowTable~onStartRowEditArgs}   args
     * @param {boolean} [ignoreErrors=false]
     * @returns {*} The save buffer returned by the the getSaveBuffer callback.
     */
    grabSaveBuffer(args, ignoreErrors) {
        const { getSaveBuffer } = this.props;
        if (!getSaveBuffer) {
            return;
        }

        const rowEntry = this.props.getRowEntry(args);
        const saveBuffer = getSaveBuffer(args);
        const rowArgs = Object.assign({}, args,
            {
                saveBuffer: saveBuffer,
                rowIndex: args.rowIndex,
                rowEntry: rowEntry,
            });
        const cellArgs = Object.assign({}, rowArgs);
        const { cellEditBuffers } = args;
        for (let i = 0; i < cellEditBuffers.length; ++i) {
            const columnInfo = this.props.getColumnInfo(i);
            const { saveCellValue } = columnInfo;
            if (saveCellValue) {
                cellArgs.columnIndex = i;
                cellArgs.columnInfo = columnInfo;
                cellArgs.cellEditBuffer = cellEditBuffers[i];
                try {
                    this.setErrorMsg(columnInfo.key, undefined);
                    saveCellValue(cellArgs);
                }
                catch (e) {
                    if (!ignoreErrors) {
                        this.setErrorMsg(columnInfo.key, e.toString());
                        return;
                    }
                }
            }
        }

        return saveBuffer;
    }


    _makeCellBufferArgs(args) {
        const rowEntry = this.props.getRowEntry(args);
        if (rowEntry === undefined) {
            return;
        }

        return Object.assign({}, args, {
            rowEntry: rowEntry,
            isEdit: true,
        });
    }


    /**
     * Helper that calls the getCellValue callbacks for each column.
     * @param {EditableRowTable~onRenderEditCellArgs
     *  | EditableRowTable~onStartRowEditArgs}   args
     */
    reloadCellEditBuffers(args) {
        const { setCellEditBuffer, cellEditBuffers } = args;
        const cellBufferArgs = this._makeCellBufferArgs(args);
        if (setCellEditBuffer && cellBufferArgs) {
            for (let i = 0; i < cellEditBuffers.length; ++i) {
                const columnInfo = this.props.getColumnInfo(i);
                const { getCellValue } = columnInfo;
                if (getCellValue) {
                    cellBufferArgs.columnIndex = i;
                    cellBufferArgs.columnInfo = columnInfo;
                    const newValue = getCellValue(cellBufferArgs);
                    if (!deepEqual(newValue, cellEditBuffers[i].value)) {
                        // Need to specify the index because setCellEditBuffer
                        // was set up to use the column index in the original args.
                        setCellEditBuffer(
                            i,
                            {
                                value: newValue,
                            });
                    }
                }
            }
        }
    }


    /**
     * @returns {boolean}   <code>true</code> if a row is actively being edited.
     */
    isEditing() {
        return this.getEditRowIndex() >= 0;
    }

    
    /**
     * @returns {number}  The index of the row actively being edited,
     * -1 if not editing.
     */
    getEditRowIndex() {
        const state = this.props.getManagerState();
        if (state) {
            const { editInfo } = state;
            if (editInfo) {
                return editInfo.rowIndex;
            }
        }
        return -1;
    }


    /**
     * Helper that calls the {@link EditableRowTable~asyncEndRowEdit} callback from
     * the editable row table.
     */
    async asyncEndRowEdit() {
        const state = this.props.getManagerState();
        if (!state) {
            return true;
        }

        const { editInfo } = state;
        if (!editInfo) {
            return true;
        }

        const { asyncEndRowEdit } = editInfo;
        if (asyncEndRowEdit) {
            return asyncEndRowEdit();
        }
    }


    /**
     * Helper that calls the {@link EditableRowTable~cancelRowEdit} callback from
     * the editable row table.
     */
    cancelRowEdit() {
        const state = this.props.getManagerState();
        if (!state) {
            return;
        }

        const { editInfo } = state;
        if (!editInfo) {
            return;
        }

        const { cancelRowEdit } = editInfo;
        if (cancelRowEdit) {
            return cancelRowEdit();
        }
    }


    onStartRowEdit(args) {
        const { asyncSaveBuffer } = this.props;
        if (!asyncSaveBuffer) {
            return;
        }

        const cellBufferArgs = this._makeCellBufferArgs(args);
        if (!cellBufferArgs) {
            return;
        }

        const { asyncEndRowEdit, cancelRowEdit,
            setRowEditBuffer, setCellEditBuffer, } = args;

        const { startRowEdit } = this.props;
        if (startRowEdit) {
            if (!startRowEdit(cellBufferArgs)) {
                return;
            }
        }

        const { cellEditBuffers } = args;
        for (let i = 0; i < cellEditBuffers.length; ++i) {
            const columnInfo = this.props.getColumnInfo(i);
            const { getCellValue } = columnInfo;
            if (getCellValue) {
                cellBufferArgs.columnIndex = i;
                cellBufferArgs.columnInfo = columnInfo;
                cellEditBuffers[i].value = getCellValue(cellBufferArgs);
            }
        }

        this._setManagerState({
            editInfo: {
                rowIndex: args.rowIndex,
                asyncEndRowEdit: asyncEndRowEdit,
                cancelRowEdit: cancelRowEdit,
                setRowEditBuffer: setRowEditBuffer, 
                setCellEditBuffer: setCellEditBuffer,
            },
            errorMsgs: {}
        });

        return true;
    }
    

    async asyncOnSaveRowEdit(args) {
        const { asyncSaveBuffer } = this.props;
        if (!asyncSaveBuffer) {
            return;
        }

        const saveBuffer = this.grabSaveBuffer(args);
        if (!saveBuffer) {
            return;
        }
        const rowEntry = this.props.getRowEntry(args);
        const rowArgs = Object.assign({}, args,
            {
                saveBuffer: saveBuffer,
                rowIndex: args.rowIndex,
                rowEntry: rowEntry,
            });

        if (!await asyncSaveBuffer(rowArgs)) {
            return;
        }

        this._setManagerState({
            editInfo: undefined,
            errorMsgs: {}
        });
        return true;
    }


    onCancelRowEdit(args) {
        this._setManagerState({
            editInfo: undefined,
            errorMsgs: {},
        });
    }


    _handleEnterExitCellEdit(args, callbackName) {
        const { columnIndex } = args;
        const columnInfo = this.props.getColumnInfo(columnIndex);
        const callback = columnInfo[callbackName];
        if (callback) {
            const cellBufferArgs = this._makeCellBufferArgs(args);
            if (!cellBufferArgs) {
                return;
            }

            cellBufferArgs.columnIndex = columnIndex;
            cellBufferArgs.columnInfo = columnInfo;
            cellBufferArgs.cellEditBuffer = args.cellEditBuffers[columnIndex];
            cellBufferArgs.getColumnInfo = this.props.getColumnInfo,
            callback(cellBufferArgs);
        }
    }


    onEnterCellEdit(args) {
        return this._handleEnterExitCellEdit(args, 'enterCellEdit');
    }

    onExitCellEdit(args) {
        return this._handleEnterExitCellEdit(args, 'exitCellEdit');
    }


    setErrorMsg(key, msg) {
        this._setManagerState({
            errorMsgs: {
                [key]: msg,
            }
        });
        return msg;
    }


    areAnyErrors() {
        const { errorMsgs } = this.props.getManagerState();
        if (errorMsgs) {
            for (let key in errorMsgs) {
                if (errorMsgs[key]) {
                    return true;
                }
            }
        }
    }


    onRenderEditCell(args) {
        const { columnIndex } = args;
        const rowEntry = this.props.getRowEntry(args);
        if (!rowEntry) {
            return;
        }

        const columnInfo = this.props.getColumnInfo(columnIndex);
        const state = this.props.getManagerState();

        const { renderEditCell, saveCellValue } = columnInfo;
        if (!args.isSizeRender && renderEditCell && saveCellValue) {
            return renderEditCell(Object.assign({}, args, { 
                columnInfo: columnInfo,
                getColumnInfo: this.props.getColumnInfo,
                rowIndex: args.rowIndex,
                rowEntry: rowEntry,
                setRowEditBuffer: (state.editInfo)
                    ? state.editInfo.setRowEditBuffer : undefined,
                setCellEditBuffer: (index, value) => {
                    if (state.editInfo && state.editInfo.setCellEditBuffer) {
                        state.editInfo.setCellEditBuffer(
                            (index === undefined) ? columnIndex : index, 
                            value);
                    }
                },
                errorMsg: state.errorMsgs[columnInfo.key],
            }));
        }

        return this.onRenderDisplayCell(args);
    }


    onRenderDisplayCell(args) {
        const { columnIndex } = args;

        const rowEntry = this.props.getRowEntry(args);
        if (!rowEntry) {
            return;
        }

        const columnInfo = this.props.getColumnInfo(columnIndex);
        const { renderDisplayCell, getCellValue } = columnInfo;
        if (renderDisplayCell && getCellValue) {
            args = Object.assign({}, args);
            args.columnInfo = columnInfo;
            args.isEdit = false;
            args.rowEntry = rowEntry;
            args.value = columnInfo.getCellValue(args);
            return renderDisplayCell(args);
        }

    }
}

/**
 * @typedef {object}    CellEditorsManager~getCellValueArgs
 * @property {number}   rowIndex
 * @property {number}   columnIndex
 * @property {RowTable~Column}  column
 * @property {CellEditorsManager~ColumnInfo}    columnInfo
 * @property {boolean}  isEdit
 * @property {*}    rowEntry
 * @property {object}   [rowEditBuffer] Only if isEdit is <code>true</code>.
 * @property {EditableRowTable~setRowEditBuffer}    [setRowEditBuffer] Only 
 * if isEdit is <code>true</code>.
 * @property {object[]} [cellEditBuffers] Only if isEdit is <code>true</code>.
 */

/**
 * @callback CellEditorsManager~getCellValue
 * @param {CellEditorsManager~getCellValueArgs} args
 * @return {*}  Value appropriate for the {@link CellEditorsManager~renderDisplayCell}
 * and {@link CellEditorsManager~renderEditCell} callbacks.
 */

/**
 * @typedef {object}    CellEditorsManager~saveCellValueArgs
 * @property {number}   rowIndex
 * @property {number}   columnIndex
 * @property {RowTable~Column}  column
 * @property {CellEditorsManager~ColumnInfo}    columnInfo
 * @property {object}  cellEditBuffer
 * @property {*}    rowEntry
 */

/**
 * @callback CellEditorsManager~saveCellValue
 * @param {CellEditorsManager~saveCellValueArgs}    args
 * @throws {Error}  An error may be thrown, in which case the error text is installed
 * as the error message for the cell editor.
 */

/**
 * @typedef {object}    CellEditorsManager~renderDisplayCellArgs
 * {@link RowTable~onRenderCellArgs} plus:
 * @property {*}    rowEntry
 * @property {*}    value
 */

/**
 * @callback CellEditorsManager~renderDisplayCell
 * @param {CellEditorsManager~renderDisplayCellArgs}    args
 */

/**
 * @typedef {object}    CellEditorsManager~renderEditCellArgs
 * {@link EditableRowTable~onRenderEditCellArgs} plus:
 * @property {ColumnInfo} columnInfo
 * @property {*}    rowEntry
 * @property {EditableRowTable~setRowEditBuffer}    setRowEditBuffer
 * @property {EditableRowTable~setCellEditBuffer}   setCellEditBuffer
 * @property {string}   [errorMsg]
 */

/**
 * @callback CellEditorsManager~renderEditCell
 * @param {CellEditorsManager~renderEditCellArgs}   args
 */


/**
 * @typedef {object}    CellEditorsManager~ColumnInfo
 * {@link ColumnInfo} plus:
 * @property {CellEditorsManager~getCellValue}  getCellValue
 * @property {CellEditorsManager~saveCellValue} saveCellValue
 * @property {CellEditorsManager~renderDisplayCell} renderDisplayCell
 * @property {CellEditorsManager~renderEditCell}    renderEditCell
 */

/**
 * @typedef {object}    CellEditorsManager~getRowEntryArgs
 * @property {number}  rowIndex
 * @property {boolean}  [isSizeRender]
 */

/**
 * @callback CellEditorsManager~getRowEntry
 * @param {CellEditorsManager~getRowEntryArgs}  args
 * @returns {*} Row entry object for use by the {@link ColumnInfo} callbacks.
 */


/**
 * @callback CellEditorsManager~getColumnInfo
 * @param {number}  columnIndex
 * @returns {CellEditorsManager~ColumnInfo}
 */

/**
 * @callback CellEditorsManager~setManagerState
 * @param {object}  state
 */

/**
 * @callback CellEditorsManager~getManagerState
 * @returns {object}    The last state sent to 
 * {@link CellEditorsManager~setManagerState}.
 */

/**
 * @callback CellEditorsMaanger~startRowEdit
 * @param {CellEditorsManager~getCellValueArgs} args
 * @returns {boolean}   <code>false</code> if editing is not allowed.
 */

/**
 * @callback CellEditorsManager~getSaveBuffer
 * @param {EditableRowTable~onSaveRowEditArgs}  args
 * @returns {object}    The save buffer to be passed to the
 * {@link CellEditorsManager~saveCellValue} callbacks of each
 * edited column and to the {@link CellEditorsManager~asyncSaveBuffer}
 * callback.
 */

/**
 * @typedef {object}    CellEditorsManager~asyncSaveBufferArgs
 * {@link EditableRowTable~onSaveRowEditArgsr} plus:
 * @property {*}    rowEntry
 * @property {object}   saveBuffer
 */

/**
 * @callback CellEditorsManager~asyncSaveBuffer
 * @param {CellEditorsManager~asyncSaveBufferArgs}  args
 */

/**
 * @typedef {object}    CellEditorsManager~propTypes
 * @property {CellEditorsManager~getRowEntry}   getRowEntry
 * @property {CellEditorsManager~getColumnInfo} getColumnInfo
 * @property {CellEditorsManager~setManagerState}   setManagerState
 * @property {CellEditorsManager~getManagerState}   getManagerState
 * @property {CellEditorsMaanger~setupRowEditBuffer}    [startRowEdit]
 * @property {CellEditorsManager~getSaveBuffer} [getSaveBuffer]
 * @property {CellEditorsManager~asyncSaveBuffer}   asyncSaveBuffer
 */
CellEditorsManager.propTypes = {
    getRowEntry: PropTypes.func.isRequired,
    getColumnInfo: PropTypes.func.isRequired,
    setManagerState: PropTypes.func.isRequired,
    getManagerState: PropTypes.func.isRequired,
    startRowEdit: PropTypes.func,
    getSaveBuffer: PropTypes.func,
    asyncSaveBuffer: PropTypes.func,
};
