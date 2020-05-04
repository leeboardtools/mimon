import React from 'react';
import PropTypes from 'prop-types';
import { ContextMenu } from './ContextMenu';
import deepEqual from 'deep-equal';


/**
 * @readonly
 * @enum {string}
 * @property {string}   NO_EXPAND
 * @property {string}   EXPANDED
 * @property {string}   COLLAPSED
 */
export const ExpandCollapseState = {
    NO_EXPAND_COLLAPSE: 'NO_EXPAND_COLLAPSE',
    EXPANDED: 'EXPANDED',
    COLLAPSED: 'COLLAPSED',
};


//
// --------------------------------------------------------
//
function ExpandCollapseButton(props) {
    let buttonText;
    let ariaLabel;
    let onClick = () => {};
    switch (props.expandCollapseState) {
    case ExpandCollapseState.NO_EXPAND_COLLAPSE :
        buttonText = <span aria-hidden="true"> </span>;
        break;

    case ExpandCollapseState.EXPANDED :
        buttonText = <span aria-hidden="true">&minus;</span>;
        onClick = () => props.onToggleCollapse();
        ariaLabel = 'Collapse Row';
        break;

    case ExpandCollapseState.COLLAPSED :
        buttonText = <span aria-hidden="true">+</span>;
        onClick = () => props.onToggleCollapse();
        ariaLabel = 'Expand Row';
        break;
    }

    return (
        <button type="button" 
            className="close expandCollapseButton" 
            aria-label={ariaLabel} 
            onClick={onClick}
        >
            {buttonText}
        </button>
    );
}

ExpandCollapseButton.propTypes = {
    expandCollapseState: PropTypes.string,
    onToggleCollapse: PropTypes.func.isRequired,
};


//
// --------------------------------------------------------
//
function CollapsibleRowTableColumnHeading(props) {
    const { columnInfo } = props;
    return <th scope="col" className={columnInfo.className}>
        {columnInfo.label}
    </th>;
}

CollapsibleRowTableColumnHeading.propTypes = {
    columnInfo: PropTypes.object.isRequired,
};

//
// --------------------------------------------------------
//
function CollapsibleRowTableRow(props) {
    const { rowEntry, rowIndex, onRenderCell, isActive, onGetRowExtras, rowRefs } = props;

    let { onRowClick, onRowDoubleClick, 
        onGetRowExpandCollapseState, onRowToggleCollapse } = props;
    let rowExtras;
    if (onGetRowExtras) {
        rowExtras = onGetRowExtras(rowEntry, rowIndex, rowRefs);
        onRowClick = rowExtras.onRowClick || onRowClick;
        onRowDoubleClick = rowExtras.onRowDoubleClick || onRowDoubleClick;
        onRowToggleCollapse = rowExtras.onRowToggleCollapse || onRowToggleCollapse;
        onGetRowExpandCollapseState = rowExtras.onGetRowExpandCollapseState 
            || onGetRowExpandCollapseState;

        rowExtras = Object.assign({}, rowExtras);
        delete rowExtras.onRowClick;
        delete rowExtras.onRowDoubleClick;
        delete rowExtras.onRowToggleCollapse;
    }


    const cellInfo = {
        rowEntry: rowEntry,
        rowIndex: rowIndex,
        isRowActive: isActive,
    };

    const columnEntries = [];
    for (let i = 0; i < props.columnInfos.length; ++i) {
        const columnInfo = props.columnInfos[i];
        let style = {};

        cellInfo.columnIndex = i;
        cellInfo.columnInfo = columnInfo;

        let className = columnInfo.className;
        const { cellClassName } = columnInfo;
        if (cellClassName) {
            className += ' ' + cellClassName;
        }

        const cellSettings = {};
        const cell = onRenderCell(cellInfo, cellSettings);
        if (cellSettings.indent) {
            style = {
                paddingLeft: cellSettings.indent + 'rem',
            };
        }

        columnEntries.push(
            <td
                className={className}
                key={columnInfo.key}
                style={style}
            >
                {cell}
            </td>
        );
    }
    if (onGetRowExpandCollapseState && onRowToggleCollapse) {
        columnEntries.splice(0, 0, (
            <td key={rowEntry.key}>
                <ExpandCollapseButton
                    expandCollapseState={onGetRowExpandCollapseState(rowEntry)}
                    onToggleCollapse={() => onRowToggleCollapse(rowEntry)}
                />
            </td>
        ));
    }

    let rowClassName = (props.isActive) ? 'table-active' : '';
    if (props.onGetRowClassName) {
        rowClassName = props.onGetRowClassName(rowEntry, rowIndex, rowClassName);
    }

    onRowDoubleClick = onRowDoubleClick || (() => {});
    onRowClick = onRowClick || (() => {});

    return (
        <tr
            className={rowClassName}
            onDoubleClick={(event) => onRowDoubleClick(rowEntry, event)}
            onClick={(event) => onRowClick(rowEntry, event)}
            {...rowExtras}
            ref={(ref) => (rowRefs[rowIndex] = ref)}
        >
            {columnEntries}
        </tr>
    );
}

CollapsibleRowTableRow.propTypes = {
    columnInfos: PropTypes.array.isRequired,
    rowEntry: PropTypes.object.isRequired,
    rowIndex: PropTypes.number,
    rowRefs: PropTypes.array,
    isActive: PropTypes.bool,
    onRenderCell: PropTypes.func.isRequired,
    onGetRowExtras: PropTypes.func,
    onGetRowClassName: PropTypes.func,
    onRowClick: PropTypes.func,
    onRowDoubleClick: PropTypes.func,
    onRowToggleCollapse: PropTypes.func,
    onGetRowExpandCollapseState: PropTypes.func,
};


//
// --------------------------------------------------------
//

/**
 * React component for a table that supports rows that can be collapsed/expanded.
 * The actual collapsing/expanding is handled by the owner, the component
 * presents an expand/collapse button in the appropriate state for rows that indicate
 * they are either expanded or collapsed.
 * <p>
 * Rows are managed via an array of {@link CollapsbibleRowTable~RowEntry}s. The
 * only requirement for a row entry is it must have a string key, as that
 * is used to identify individual rows.
 */
export class CollapsibleRowTable extends React.Component {
    constructor(props) {
        super(props);

        this.onContextMenu = this.onContextMenu.bind(this);
        this.onContextMenuClose = this.onContextMenuClose.bind(this);

        this.state = {};
    }


    componentDidMount() {
        const { onLoadRowEntries } = this.props;
        if (onLoadRowEntries) {
            // For now just load all row entries.
            onLoadRowEntries(0, this.props.rowEntries.length);
        }
    }

    componentDidUpdate(prevProps) {
        // For now just load all row entries.
        const { onLoadRowEntries } = this.props;
        if (onLoadRowEntries) {
            if (!deepEqual(prevProps.rowEntries, this.props.rowEntries)) {
                onLoadRowEntries(0, this.props.rowEntries.length);
            }
        }
    }


    onContextMenuClose() {
        this.setState({
            contextMenuInfo: undefined,
        });
    }


    onContextMenu(e) {
        const { onContextMenu, contextMenuItems } = this.props;
        if (onContextMenu) {
            if (contextMenuItems) {
                console.log('Both onContextMenu and contextMenuItems specified, '
                    + 'only one or the other should be used, not both.');
            }
            onContextMenu(e);
        }

        if (contextMenuItems) {
            this.setState({
                contextMenuInfo: {
                    x: e.clientX,
                    y: e.clientY,
                }
            });
        }
        else {
            this.setState({
                contextMenuInfo: undefined,
            });
        }
    }


    renderContextMenu() {
        const { contextMenuItems, onChooseContextMenuItem } = this.props;
        if (contextMenuItems) {
            const { contextMenuInfo } = this.state;
            let x;
            let y;
            let show;
            if (contextMenuInfo) {
                x = contextMenuInfo.x;
                y = contextMenuInfo.y;
                show = true;
            }

            return <ContextMenu
                x={x}
                y={y}
                show={show}
                items={contextMenuItems}
                onChooseItem={onChooseContextMenuItem}
                onMenuClose={this.onContextMenuClose}
            />;
        }
    }


    renderTableHeader() {
        const columns = this.props.columnInfos.map((columnInfo) =>
            <CollapsibleRowTableColumnHeading
                key={columnInfo.key || columnInfo}
                columnInfo={columnInfo}
            />);
        if (this.props.onGetRowExpandCollapseState) {
            columns.splice(0, 0, <th scope="col" key="0" />);
        }
        return <thead><tr>{columns}</tr></thead>;
    }

    renderTableBody() {
        let rowIndex = 0;
        const rowRefs = [];
        const rows = this.props.rowEntries.map((rowEntry) => {
            return (
                <CollapsibleRowTableRow
                    key={rowEntry.key}
                    columnInfos={this.props.columnInfos}
                    rowEntry={rowEntry}
                    rowIndex={rowIndex++}
                    rowRefs={rowRefs}
                    isActive={rowEntry.key === this.props.activeRowKey}
                    onRenderCell={this.props.onRenderCell}
                    onGetRowExtras={this.props.onGetRowExtras}
                    onGetRowClassName={this.props.onGetRowClassName}
                    onRowClick={this.props.onRowClick}
                    onRowDoubleClick={this.props.onRowDoubleClick}
                    onRowToggleCollapse={this.props.onRowToggleCollapse}
                    onGetRowExpandCollapseState={this.props.onGetRowExpandCollapseState}
                />
            );
        });
        return <tbody>{rows}</tbody>;
    }

    render() {
        const tableHeader = this.renderTableHeader();
        const tableBody = this.renderTableBody();
        const contextMenu = this.renderContextMenu();

        const tableClassName = 'table table-sm text-left table-hover pl-0 pr-0 '
            + (this.props.tableClassExtras || '');

        return <div className=""
            onContextMenu={(e) => this.onContextMenu(e)}
        >
            <table className={tableClassName}
            >
                {tableHeader}
                {tableBody}
            </table>
            {contextMenu}
        </div>;
    }
}


/**
 * @typedef {object} CollapsibleRowTable~ColInfo
 * @property {string}   label   The text to appear in the column heading.
 * @property {string}   key Unique identifier for the column, used by React.
 * @property {string}   [className]   Optional class name for the &lt;th&gt; 
 * and &lt;td&gt; entries.
 * @property {string}   [cellClassName] Optional class name for the &lt;td&gt;
 * entity.
 */

/**
 * Each row has one of these.
 * @typedef {object} CollapsibleRowTable~RowEntry
 * @property {string} key Unique identifier for the row, used by React and also to
 * identify rows.
 */

/**
 * Information pertaining to an individual cell in calls to onRenderCell.
 * @typedef {object} CollapsibleRowTable~CellInfo
 * @param {CollapsibleRowTable~RowEntry}  rowEntry
 * @param {number}  columnIndex
 * @param {CollapsibleRowTable~ColInfo}  columnInfo
 * @param {boolean} isRowActive
 */

/**
 * This is used to pass back additional cell information from the render function.
 * @typedef {object} CollapsibleRowTable~CellSettings
 * @property {number}   [indent=undefined]  If specified, the number of indent 
 * positions to render the cell. This is used to indicate hierarchy and should 
 * normally only be set on the first column, as that is the column adjacent to the 
 * expand/collapse button.
 */

/**
 * The callback for rendering cells
 * @callback CollapsibleRowTable~onRenderCell
 * @param {CollapsibleRowTable~CellInfo} cellInfo
 * @param {CollapsibleRowTable~CellSettings} cellSettings
 * @returns {object|string}    A React component or text string.
 */

/**
 * The callback for obtaining the {@link ExpandCollapseState} for a row.
 * @callback CollapsibleRowTable~onGetRowExpandCollapseState
 * @param {CollapsibleRowTable~RowEntry}    rowEntry The row of interest.
 * @returns {ExpandCollapseState}
 */

/**
 * The basic event handler callback.
 * @callback CollapsibleRowTable~RowEventHandler
 * @param {CollapsibleRowTable~RowEntry} rowEntry
 * @param {Event}   event
 */

/**
 * The callback for a row being expanded or collapsed.
 * @callback CollapsibleRowTable~onRowToggleCollapse
 * @param {CollapsibleRowTable~RowEntry} rowEntry
 * @param {ExpandCollapseState} newExpandCollapseState
 */

/**
 * The callback for retrieving extra row handler. 
 * See {@link TableHandler#onGetRowExtras} for usage.
 * @callback CollapsibleRowTable~onGetRowExtras
 * @param {CollapsibleRowTable~RowEntry} rowEntry
 * @param {number}  rowIndex
 * @param {object[]}    rowRefs An array containing the React refs of each row.
 * @returns {CollapsibleRowTable~RowExtras}
 */

/**
 * Object returned by {@link CollapsibleRowTable~onGetRowExtras}.
 * @typedef CollapsibleRowTable~RowExtras
 * @property {CollapsibleRowTable~RowEventHandler} [onRowClick]
 * @property {CollapsibleRowTable~RowEventHandler} [onRowDoubleClick]
 * @property {CollapsibleRowTable~onRowToggleCollapse} [onRowToggleCollapse]
 * @property {function} ...args Additional event handlers and other such stuff to pass to
 * the React component.
 */

/**
 * The callback for modifying the class name for the row.
 * @callback CollapsbileRowTable~onGetRowClassName
 * @param {CollapsibleRowTable~RowEntry} rowEntry
 * @param {number}  rowIndex
 * @param {string}  className
 * @returns {string}    The class name to use.
 */

/**
 * Callback if present used to load row entries prior to rendering. This
 * is used for virtual rows.
 * @callback CollapsbileRowTable~onLoadRowEntries
 * @param {number}  startRowIndex
 * @param {number}  rowCount
 */

/**
 * @typedef {object} CollapsibleRowTable~propTypes
 * @property {CollapsibleRowTable~ColInfo[]}  columnInfos    Information for the columns, 
 * primarily the heading row information.
 * @property {CollapsibleRowTable~RowEntry[]}    rowEntries  The individual rows.
 * @property {string} [activeRowKey]  The key of the active row.  A key is 
 * used instead of the row object itself to avoid any problems with rowEntry objects 
 * being changed.
 * @property {CollapsibleRowTable~onRenderCell} onRenderCell The cell rendering callback.
 * @property {CollapsbileRowTable~onGetRowExpandCollapseState} 
 * [onGetRowExpandCollapseState] Optional callback for retrieving the 
 * {@link ExpandCollapseState} of rows. If <code>undefined</code> then the 
 * expand/collapse button column is disabled.
 * @property {CollapsibleRowTable~onGetRowExtras} [onGetRowExtras]
 * @property {CollapsbileRowTable~onGetRowClassName}  [onGetRowClassName]
 * @property {CollapsibleRowTable~RowEventHandler} [onRowClick]
 * @property {CollapsibleRowTable~RowEventHandler} [onRowDoubleClick]
 * @property {CollapsibleRowTable~onRowToggleCollapse} [onRowToggleCollapse]
 * @property {function} [onContextMenu] Event handler for 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event}
 * @property {MenuList~Item[]}  [contextMenuItems]
 * @property {Dropdown~onChooseItem}    [onChooseContextMenuItem]
 * @property {CollapsibleRowTable~onLoadRowEntries} [onLoadRowEntries]
 */
CollapsibleRowTable.propTypes = {
    columnInfos: PropTypes.array.isRequired,
    rowEntries: PropTypes.array.isRequired,
    activeRowKey: PropTypes.string,
    tableClassExtras: PropTypes.string,
    onRenderCell: PropTypes.func.isRequired,
    onGetRowExpandCollapseState: PropTypes.func,
    onGetRowExtras: PropTypes.func,
    onGetRowClassName: PropTypes.func,
    onRowClick: PropTypes.func,
    onRowDoubleClick: PropTypes.func,
    onRowToggleCollapse: PropTypes.func,
    onContextMenu: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,
    onLoadRowEntries: PropTypes.func,
};
