
/**
 * @typedef {object}    ColumnInfo
 * @property {string}   [ariaLabel]
 * @property {string}   [inputClassExtras]
 * @property {number}   [inputSize]
 */

/**
 * @typedef {object}    columnInfosToColumnsArgs
 * @property {ColumnInfo[]} columnInfos The array of column infos.
 * @property {number[]} [columnWidths
 */

/**
 * Generates an array of {@link RowTable~Column} from an array of 
 * {@link ColumnInfo} and optional widths.
 * @param {columnInfosToColumnsArgs} args
 * @returns {RowTable~Column[]}
 */
export function columnInfosToColumns({ columnInfos, columnWidths }) {
    const columns = columnInfos.map((columnInfo) => {
        return {
            key: columnInfo.key,
            // width
            // minWidth
            // maxWidth
            cellClassExtras: columnInfo.cellClassName,
            header: columnInfo.header,
            footer: columnInfo.footer,
        };
    });

    if (columnWidths) {
        const count = Math.min(columnWidths.length, columns.length);
        for (let i = 0; i < count; ++i) {
            if (columnWidths[i] !== undefined) {
                columns[i].width = columnWidths[i];
            }
        }
    }

    return columns;
}


export function stateUpdateFromSetColumnWidth({ columnIndex, columnWidth, }, state) {
    const columnWidths = Array.from(state.columnWidths || []);
    columnWidths[columnIndex] = columnWidth;
    return {
        columnWidths: columnWidths,
        columns: columnInfosToColumns({
            columnInfos: state.columnInfos,
            columnWidths: columnWidths, }),
    };
}
