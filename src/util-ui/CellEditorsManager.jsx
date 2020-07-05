import PropTypes from 'prop-types';


/**
 * Manager object for use with {@link EditableRowTable} that handles the
 * management of the cell editing using callbacks in columns defined by
 * {@link CellEditorsManager~ColumnInfo}s.
 */
export class CellEditorsManager {
    constructor(props) {
        this.props = props;

        this.onStartRowEdit = this.onStartRowEdit.bind(this);
        this.asyncOnSaveRowEdit = this.asyncOnSaveRowEdit.bind(this);
        this.onCancelRowEdit = this.onCancelRowEdit.bind(this);

        this.onRenderDisplayCell = this.onRenderDisplayCell.bind(this);
        this.onRenderEditCell = this.onRenderEditCell.bind(this);
    }


    _setManagerState(state) {
        const prevState = this.props.getManagerState();
        this.props.setManagerState(Object.assign({}, prevState, state));
    }


    onStartRowEdit(args) {
        const { getSaveBuffer, asyncSaveBuffer } = this.props;
        if (!getSaveBuffer || !asyncSaveBuffer) {
            return;
        }

        const rowEntry = this.props.getRowEntry(args);
        if (rowEntry === undefined) {
            return;
        }

        const { cellEditBuffers, asyncEndRowEdit, cancelRowEdit,
            setRowEditBuffer, setCellEditBuffer, } = args;

        const cellBufferArgs = {
            rowEditBuffer: args.rowEditBuffer,
            setRowEditBuffer: setRowEditBuffer,
            rowEntry: rowEntry,
            cellEditBuffers: cellEditBuffers,
            isEdit: true,
        };
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
        const { getSaveBuffer, asyncSaveBuffer } = this.props;
        if (!getSaveBuffer || !asyncSaveBuffer) {
            return;
        }

        const rowEntry = this.props.getRowEntry(args);
        const saveBuffer = getSaveBuffer(args);
        const rowArgs = Object.assign({}, args,
            {
                saveBuffer: saveBuffer,
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
                    this.setErrorMsg(columnInfo.key, e.toString());
                    return;
                }
            }
        }

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
                rowEntry: rowEntry,
                setCellEditBuffer: (value, index) => {
                    state.editInfo.setCellEditBuffer(
                        (index === undefined) ? columnIndex : index, value);
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
 * @property {CellEditorsManager~getSaveBuffer} getSaveBuffer
 * @property {CellEditorsManager~asyncSaveBuffer}   asyncSaveBuffer
 */
CellEditorsManager.propTypes = {
    getRowEntry: PropTypes.func.isRequired,
    getColumnInfo: PropTypes.func.isRequired,
    setManagerState: PropTypes.func.isRequired,
    getManagerState: PropTypes.func.isRequired,
    getSaveBuffer: PropTypes.func,
    asyncSaveBuffer: PropTypes.func,
};
