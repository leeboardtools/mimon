
/**
 * @typedef {object}    ColumnInfo
 * @property {string}   [ariaLabel]
 * @property {string}   [inputClassExtras]
 * @property {number}   [inputSize]
 */

/**
 * @typedef {object}    columnInfosToColumnsArgs
 * @property {ColumnInfo[]} columnInfos The array of column infos.
 * @property {number[]} [columnWidths]
 */

/**
 * Generates an array of {@link RowTable~Column} from an array of 
 * {@link ColumnInfo} and optional widths.
 * <p>
 * This also adds the columnInfo as a property named columnInfo to the
 * {@link RowTable~Column}.
 * @param {columnInfosToColumnsArgs} args
 * @returns {RowTable~Column[]}
 */
export function columnInfosToColumns({ columnInfos, columnWidths }) {
    if (!Array.isArray(columnInfos) && (typeof columnInfos === 'object')) {
        const array = [];
        for (const name in columnInfos) {
            array.push(columnInfos[name]);
        }
        columnInfos = array;
    }

    const columns = columnInfos.map((columnInfo) => {
        return {
            key: columnInfo.key,
            // width
            // minWidth
            // maxWidth
            cellClassExtras: columnInfo.cellClassName,
            header: columnInfo.header,
            footer: columnInfo.footer,
            columnInfo: columnInfo,
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


/**
 * Retrieves the column with a given key value.
 * @param {RowTable~Column[]} columns 
 * @param {string} key 
 * @returns {RowTable~Column|undefined}
 */
export function getColumnWithKey(columns, key) {
    for (let i = 0; i < columns.length; ++i) {
        if (columns[i].key === key) {
            return columns[i];
        }
    }
}


/**
 * Retrieves the index of a column with a given key value.
 * @param {RowTable~Column[]} columns 
 * @param {string} key 
 * @returns {RowTable~Column|undefined}
 */
export function getIndexOfColumnWithKey(columns, key) {
    for (let i = 0; i < columns.length; ++i) {
        if (columns[i].key === key) {
            return i;
        }
    }
    return -1;
}


/**
 * Retrieves all the columns that have an isVisible property that's truthy.
 * @param {RowTable~Column[]} columns
 * @returns {RowTable~Column[]}
 */
export function getVisibleColumns(columns) {
    const visibleColumns = [];
    columns.forEach((column) => {
        if (column.isVisible) {
            visibleColumns.push(column);
        }
    });
    return visibleColumns;
}


/**
 * Retrieves the keys of all the columns that have an isVisible property 
 * that's truthy.
 * @param {RowTable~Column[]} columns
 * @returns {string[]}
 */
export function getVisibleColumnKeys(columns) {
    const visibleColumns = [];
    columns.forEach((column) => {
        if (column.isVisible) {
            visibleColumns.push(column.key);
        }
    });
    return visibleColumns;
}


/**
 * Updates the isVisible property of columns based on the column key being
 * present in an array of visible column keys. The counterpart of 
 * {@link getVisibleColumnKeys}
 * @param {RowTable-Column[]} columns 
 * @param {string[]} visibleColumns 
 * @returns {RowTable-Column[]} Returns columns.
 */
export function updateColumnsFromVisibleColumnList(columns, visibleColumns) {
    if (visibleColumns) {
        visibleColumns = new Set(visibleColumns);
        columns.forEach((column) => {
            column.isVisible = visibleColumns.has(column.key);
        });
    }
    return columns;
}


export function stateUpdateFromSetColumnWidth({ columnIndex, columnWidth, }, state) {
    const columns = Array.from(state.columns);
    columns[columnIndex] = Object.assign({}, columns[columnIndex], {
        width: columnWidth,
    });
    return {
        columns: columns,
    };
}
