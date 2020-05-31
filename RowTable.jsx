import React from 'react';
import PropTypes from 'prop-types';
import deepEqual from 'deep-equal';
import { ContextMenu } from './ContextMenu';


export const HEADER_ROW_INDEX = -1;
export const FOOTER_ROW_INDEX = -2;


/**
 * @typedef {object} RowTable~HeaderFooter
 * @property {string}   [label] If specified, text to be displayed for the header/footer,
 * the {@link RowTable~onRenderCell} callback will not be used.
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Optional extra classes to add to the class name
 * of the column header/footer container.
 */


/**
 * @typedef {object} RowTable~Column
 * @property {object|number}    key Key uniquely identifying the column within the table.
 * @property {number}   [width] Optional desired width of the column.
 * @property {number}   [minWidth]  Optional minimum width of the column.
 * @property {number}   [maxWidth]  Optional maximum width of the column.
 * @property {string}   [cellClassExtras]   Optional extra classes to add to the class
 * name of the cell container.
 * @property {RowTable~HeaderFooter}    [header]
 * @property {RowTable~HeaderFooter}    [footer]
 */



/**
 * React component for row based tables.
 */
export class RowTable extends React.Component {
    constructor(props) {
        super(props);

        this.watcher = this.watcher.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        this.onRowClick = this.onRowClick.bind(this);
        this.onRowDoubleClick = this.onRowDoubleClick.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.onContextMenuClose = this.onContextMenuClose.bind(this);
        this.onScroll = this.onScroll.bind(this);

        this._mainRef = React.createRef();
        this._bodyRef = React.createRef();
        this._rowsContainerRef = React.createRef();

        this.state = this.getStateUpdateFromColumns();

        if (props.rowHeight) {
            this.state.bodyRowHeight = props.rowHeight;
        }

        this.state.scrollTop = 0;
        this.state.visibleRowIndex = this.props.requestedVisibleRowIndex;

        this.state.topVisibleRow = 0;
        this.state.bottomVisibleRow = 0;

        this.state.isSizeRender = this.state.isAutoSize;
    }


    getStateUpdateFromColumns() {
        const { 
            columns, 
            rowHeight, 
            headerHeight,
            footerHeight,
        } = this.props;
    

        let isHeader;
        let isFooter;
        let isAutoColWidth;
        for (let column of columns) {
            isHeader |= column.header;
            isFooter |= column.footer;
            if (column.width === undefined) {
                isAutoColWidth = true;
            }
        }


        const isAutoRowHeight = (rowHeight === undefined);
        const isAutoHeaderHeight = (isHeader && (headerHeight === undefined));
        const isAutoFooterHeight = (isFooter && (footerHeight === undefined));

        const isAutoSize = isAutoColWidth || isAutoRowHeight
            || isAutoHeaderHeight || isAutoFooterHeight;

        const columnWidths = columns.map((column) => column.width);
        return {
            columnWidths: columnWidths,
            defColumnWidths: Array.from(columnWidths),
            isHeader: isHeader,
            isFooter: isFooter,
            isAutoColWidth: isAutoRowHeight,
            isAutoRowHeight: isAutoRowHeight,
            isAutoHeaderHeight: isAutoHeaderHeight,
            isAutoFooterHeight: isAutoFooterHeight,
            isAutoSize: isAutoSize,
        };
    }


    watcher() {
        if (!this._isUnmounted) {
            if (this.state.activeRowUpdated) {
                const { activeRowIndex } = this.props;
                const { topVisibleRow, bottomVisibleRow } = this.state;
                if ((this._activeRowRef && this._activeRowRef.current)
                 && (activeRowIndex >= topVisibleRow)
                 && (activeRowIndex <= bottomVisibleRow)) {
                    this._activeRowRef.current.focus();
                }
                else {
                    this._bodyRef.current.focus();
                }
                this.setState({
                    activeRowUpdated: false,
                });
            }

            this.updateLayout();
            window.requestAnimationFrame(this.watcher);
        }
    }


    componentDidMount() {
        if (!this._isUnmounted) {
            this.updateLayout();
        }

        window.requestAnimationFrame(this.watcher);
    }


    componentWillUnmount() {
        this._isUnmounted = true;
    }


    componentDidUpdate(prevProps, prevState) {
        if (this.props.requestedVisibleRowIndex !== prevProps.requestedVisibleRowIndex) {
            this.setState({
                visibleRowIndex: this.props.requestedVisibleRowIndex
            });
        }

        if (!deepEqual(prevProps.columns, this.props.columns)) {
            this.setState(this.getStateUpdateFromColumns());
        }

        let visibleRowIndex = (this.state.visibleRowIndex === undefined)
            ? prevState.visibleRowIndex : this.state.visibleRowIndex;

        if ((this.state.bodyHeight !== prevState.bodyHeight)
         || (this.state.bodyRowHeight !== prevState.bodyRowHeight)
         || (this.props.rowCount !== prevProps.rowCount)
         || (visibleRowIndex !== prevState.visibleRowIndex)) {
            this.updateVisibleRows();
        }
        // else if because no use loading the rows if the visible rows are 
        // going to trigger a visible row change.
        else if ((this.state.topVisibleRow !== prevState.topVisibleRow)
         || (this.state.bottomVisibleRow !== prevState.bottomVisibleRow)) {
            this.loadRows();
        }
    }


    getRefClientSize(ref, definedHeight) {
        if (ref.current) {
            return { 
                width: ref.current.clientWidth, 
                height: (definedHeight !== undefined)
                    ? definedHeight : ref.current.clientHeight,
            };
        }
        else {
            return {
                width: 0,
                height: (definedHeight !== undefined)
                    ? definedHeight : 0,
            };
        }
    }


    updateFromClientSize() {
        const { clientWidth, clientHeight } = this._mainRef.current;

        let {
            headerHeight,
            footerHeight,
            rowHeight,
        } = this.props;

        let { columnWidths } = this.state;
        const { sizeRenderRefs } = this.state;
        if (sizeRenderRefs) {
            // We've rendered the sizes, we can now grab the various sizes needed.
            const headerSize = this.getRefClientSize(sizeRenderRefs.headerRowRef, 
                headerHeight);
            const footerSize = this.getRefClientSize(sizeRenderRefs.footerRowRef,
                footerHeight);
            const bodyRowSize = this.getRefClientSize(sizeRenderRefs.bodyRowRef,
                rowHeight);

            headerHeight = headerSize.height;
            footerHeight = footerSize.height;
            rowHeight = bodyRowSize.height;

            // Figure out the column widths...
            const { columns } = this.props;
            const { columnRefs } = sizeRenderRefs;
            columnWidths = [];
            for (let i = 0; i < columns.length; ++i) {
                const { headerCellRef, bodyCellRef, footerCellRef } = columnRefs[i];
                let width = 0;
                if (headerCellRef.current) {
                    width = headerCellRef.current.clientWidth;
                }
                if (bodyCellRef.current) {
                    width = Math.max(width, bodyCellRef.current.clientWidth);
                }
                if (footerCellRef.current) {
                    width = Math.max(width, footerCellRef.current.clientWidth);
                }
                columnWidths[i] = width;
            }
        }

        this.setState({
            columnWidths: columnWidths,

            headerBlockHeight: headerHeight,
            footerBlockHeight: footerHeight,
            bodyRowHeight: rowHeight,

            bodyWidth: clientWidth,
            bodyHeight: clientHeight - headerHeight - footerHeight,

            clientWidth: clientWidth,
            clientHeight: clientHeight,

            sizeRenderRefs: undefined,
            isSizeRender: false,
        });
    }


    updateLayout() {
        if (!this._mainRef.current) {
            return;
        }

        const { clientWidth, clientHeight } = this._mainRef.current;
        if ((clientWidth === this.state.clientWidth)
         && (clientHeight === this.state.clientHeight)) {
            if (this.state.isSizeRender) {
                this.updateFromClientSize();
            }
        }
        else {
            const { isAutoSize } = this.state;
            if (isAutoSize) {
                const { columns } = this.props;
                const sizeRenderRefs = {
                    headerRowRef: React.createRef(),
                    bodyRowRef: React.createRef(),
                    footerRowRef: React.createRef(),
                    columnRefs: columns.map((column) => {
                        return {
                            headerCellRef: React.createRef(),
                            bodyCellRef: React.createRef(),
                            footerCellRef: React.createRef(),
                        };
                    }),
                };
    
                this.setState({
                    sizeRenderRefs: sizeRenderRefs,
                    isSizeRender: true,
    
                    clientWidth: clientWidth,
                    clientHeight: clientHeight,
                });

                // Gotta wait for next render now...
                return;
            }
            else {
                this.updateFromClientSize();
            }
        }


        if (this._rowsContainerRef.current
         && !this.state.sizeRenderRefs) {
            const element = this._rowsContainerRef.current;
            const rowContainerWidth = element.clientWidth;
            const rowContainerHeight = element.clientHeight;
            if ((rowContainerWidth !== this.state.rowContainerWidth)
             || (rowContainerHeight !== this.state.rowContainerHeight)) {
                this.setState({
                    headerBlockWidth: rowContainerWidth,
                    footerBlockWidth: rowContainerWidth,
                    rowContainerWidth: rowContainerWidth,
                    rowContainerHeight: rowContainerHeight,
                });
            }
        }
    }


    updateVisibleRows(scrollTop) {
        this.setState((state) => {
            const { bodyHeight, bodyRowHeight, } = state;
            if ((bodyRowHeight !== undefined) && (bodyRowHeight > 0)
             && this._rowsContainerRef.current) {
                const { rowCount, activeRowIndex } = this.props;
                const lastRow = rowCount - 1;

                if (scrollTop === undefined) {
                    scrollTop = state.scrollTop || 0;
                }

                let { topVisibleRow, bottomVisibleRow } = state;
                let wasActiveRowVisible;
                if (activeRowIndex !== undefined) {
                    wasActiveRowVisible = (activeRowIndex >= topVisibleRow)
                         && (activeRowIndex <= bottomVisibleRow);
                }

                let visibleRowCount = Math.trunc(bodyHeight / bodyRowHeight);
                const fullyVisibleRowCount = Math.max(visibleRowCount, 
                    Math.min(1, rowCount));

                if (visibleRowCount * bodyRowHeight < bodyHeight) {
                    ++visibleRowCount;
                }

                // We have scrollTop and scrollTopMax...
                // When scrollTop === scrollTopMax we have:
                //      topVisibleRow = rowCount - fullyVisibleRowCount
                // When scrollTop === 0 we have:
                //      topVisibleRow = 0
                const maxTopVisibleRow = rowCount - fullyVisibleRowCount;
                let { scrollTopMax } = this._rowsContainerRef.current;
                if (scrollTopMax === undefined) {
                    scrollTopMax = this._rowsContainerRef.current.clientHeight
                        - bodyHeight;
                }
                topVisibleRow = Math.round(scrollTop 
                    * maxTopVisibleRow / scrollTopMax);

                topVisibleRow = Math.max(0, topVisibleRow);
                topVisibleRow = Math.min(topVisibleRow, lastRow);


                bottomVisibleRow = Math.min(topVisibleRow + visibleRowCount - 1, 
                    lastRow);
                let bottomFullyVisibleRow = Math.min(
                    topVisibleRow + fullyVisibleRowCount - 1,
                    lastRow);

                let { visibleRowIndex } = state;
                if (visibleRowIndex !== undefined) {
                    let delta = 0;
                    visibleRowIndex = Math.min(Math.max(0, visibleRowIndex), lastRow);
                    if (visibleRowIndex < topVisibleRow) {
                        delta = visibleRowIndex - topVisibleRow;
                    }
                    else if (visibleRowIndex > bottomFullyVisibleRow) {
                        delta = visibleRowIndex - bottomFullyVisibleRow;
                    }
                    topVisibleRow += delta;
                    bottomVisibleRow += delta;
                    bottomFullyVisibleRow += delta;
                    scrollTop += delta * bodyRowHeight;

                    if (this._bodyRef.current) {
                        this._bodyRef.current.scrollTop = scrollTop;
                        visibleRowIndex = undefined;
                    }

                    bottomVisibleRow = Math.min(bottomVisibleRow, lastRow);
                    bottomFullyVisibleRow = Math.min(bottomFullyVisibleRow, lastRow);
                }

                let { activeRowUpdated } = state;
                if (activeRowIndex !== undefined) {
                    const isActiveRowVisible = (activeRowIndex >= topVisibleRow)
                        && (activeRowIndex <= bottomVisibleRow);
                    if (!isActiveRowVisible && wasActiveRowVisible) {
                        activeRowUpdated = true;
                    }
                }

                return {
                    activeRowUpdated: activeRowUpdated,
                    scrollTop: scrollTop,
                    topVisibleRow: topVisibleRow,
                    bottomVisibleRow: bottomVisibleRow,
                    bottomFullyVisibleRow: bottomFullyVisibleRow,
                    visibleRowIndex: visibleRowIndex,
                };
            }
        });
    }


    loadRows() {
        const { onLoadRows, rowCount } = this.props;
        const { topVisibleRow, bottomVisibleRow } = this.state;
        if (onLoadRows) {
            const visibleRowCount = bottomVisibleRow - topVisibleRow + 1;

            const loadArgs = {
                firstRowIndex: Math.max(topVisibleRow - visibleRowCount, 0),
                lastRowIndex: Math.min(bottomVisibleRow + visibleRowCount, 
                    rowCount - 1),
            };

            onLoadRows(loadArgs);
        }
    }


    onScroll(e) {
        const scrollTop = e.target.scrollTop;
        window.requestAnimationFrame(
            () => this.updateVisibleRows(scrollTop));
    }


    openActiveRow(columnIndex) {
        const { onOpenActiveRow, activeRowIndex, rowCount } = this.props;
        if (onOpenActiveRow 
         && (activeRowIndex !== undefined)
         && (activeRowIndex >= 0) && (activeRowIndex < rowCount)) {
            onOpenActiveRow({
                rowIndex: activeRowIndex, 
                columnIndex: columnIndex,
            });
        }
    }


    /**
     * Requests a particular row be made the active row.
     * @param {number} activeRowIndex 
     */
    activateRow(activeRowIndex) {
        const lastRowIndex = this.props.rowCount - 1;
        activeRowIndex = Math.max(0, Math.min(activeRowIndex, lastRowIndex));

        if (activeRowIndex !== this.props.activeRowIndex) {
            const { onActivateRow } = this.props;
            if (onActivateRow) {
                onActivateRow(activeRowIndex);

                this.setState({
                    activeRowUpdated: true,
                });
            }
        }
    }


    onKeyDown(e) {
        const { onKeyDown } = this.props;
        if (onKeyDown) {
            const result = onKeyDown(e);
            if ((result === 'default') || e.defaultPrevented) {
                return;
            }
        }

        let { activeRowIndex } = this.props;
        if (activeRowIndex !== undefined) {
            let pageIncrement = 0;
            if (this.state.bottomFullyVisibleRow !== undefined) {
                pageIncrement = this.state.bottomFullyVisibleRow 
                    - this.state.topVisibleRow;
            }
            switch (e.key) {
            case 'ArrowUp' :
                this.activateRow(--activeRowIndex);
                e.preventDefault();
                break;

            case 'ArrowDown' :
                this.activateRow(++activeRowIndex);
                e.preventDefault();
                break;
            
            case 'PageUp' :
                this.activateRow(activeRowIndex - pageIncrement);
                e.preventDefault();
                break;
            
            case 'PageDown' :
                this.activateRow(activeRowIndex + pageIncrement);
                e.preventDefault();
                break;

            case 'Enter' :
                this.openActiveRow();
                break;
            }

        }
    }


    onRowClick(e, rowIndex) {
        this.activateRow(rowIndex);
    }

    
    onRowDoubleClick(e, rowIndex, columnIndex) {
        const { onRowDoubleClick } = this.props;
        if (onRowDoubleClick) {
            const result = onRowDoubleClick(e, rowIndex, columnIndex);
            if ((result === 'default') || e.defaultPrevented) {
                return;
            }
        }

        this.openActiveRow(columnIndex);
    }

    
    onContextMenu(e) {
        const { onContextMenu, contextMenuItems } = this.props;
        if (onContextMenu) {
            if (contextMenuItems) {
                console.warn('Both onContextMenu and contextMenuItems specified, '
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


    onContextMenuClose() {
        this.setState({
            contextMenuInfo: undefined,
        });
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


    renderHeaderFooter(args) {
        const { getHeaderFooter, } = args;
        const { columns } = this.props;

        let isHeaderFooter;
        for (let i = 0; i < columns.length; ++i) {
            if (getHeaderFooter(columns[i])) {
                isHeaderFooter = true;
                break;
            }
        }

        if (isHeaderFooter) {
            const { 
                cellClassName, 
                rowIndex, 
                rowClassExtras, 
                height,
                blockWidth,
                blockHeight,
                getCellRef, 
                getRowRef,
                sizeRenderRefs,
            } = args;

            const {
                onRenderCell,
            } = this.props;

            const columnWidths = (sizeRenderRefs)
                ? this.state.defColumnWidths
                : this.state.columnWidths;

            const baseClassName = 'RowTableCell ' + cellClassName;
            const cells = [];
            for (let c = 0; c < columns.length; ++c) {
                const column = columns[c];
                const headerFooter = getHeaderFooter(column);

                let className = baseClassName;

                let cell;
                if (headerFooter) {
                    const { classExtras, label, ariaLabel } = headerFooter;
                    if (classExtras) {
                        className += ' ' + classExtras;
                    }
                    if (label) {
                        cell = <span aria-label = {ariaLabel}>
                            {label}
                        </span>;
                    }
                    else {
                        cell = onRenderCell({
                            rowIndex: rowIndex, 
                            columnIndex: c, 
                            column: column,
                            isSizeRender: sizeRenderRefs,
                        });
                    }
                }

                let style;
                const width = columnWidths[c];
                if (width !== undefined) {
                    style = {
                        width: width,
                    };
                }

                let ref;
                if (sizeRenderRefs && getCellRef) {
                    ref = getCellRef(sizeRenderRefs.columnRefs[c]);
                }

                cells.push(<div className = {className}
                    key = {column.key}
                    style = {style}
                    ref = {ref}
                >
                    {cell}
                </div>);
            }

            const { containerClassName } = args;
            let { rowClassName } = args;
            if (rowClassExtras) {
                rowClassName += ' ' + rowClassExtras;
            }

            let style = {};
            if ((height !== undefined) || (blockWidth !== undefined)) {
                if (height !== undefined) {
                    style.height = height;
                }
                else if (!sizeRenderRefs && (blockHeight !== undefined)) {
                    style.height = blockHeight;
                }
                if (!sizeRenderRefs && (blockWidth !== undefined)) {
                    style.width = blockWidth;
                }
            }

            let ref;
            if (sizeRenderRefs && getRowRef) {
                ref = getRowRef(sizeRenderRefs);
            }

            return <div className = {containerClassName}>
                <div className = {rowClassName}
                    style = {style}
                    ref = {ref}
                >
                    {cells}
                </div>
            </div>;
        }
    }


    renderHeader(sizeRenderRefs) {
        return this.renderHeaderFooter({
            getHeaderFooter: (column) => column.header,
            getCellRef: (columnRef) => columnRef.headerCellRef,
            getRowRef: (renderRefs) => renderRefs.headerRowRef,
            cellClassName: 'RowTableHeaderCell',
            rowIndex: HEADER_ROW_INDEX,
            containerClassName: 'RowTableHeader',
            rowClassName: 'RowTableHeaderRow',
            rowClassExtras: this.props.headerClassExtras,
            height: this.props.headerHeight,
            blockWidth: this.state.headerBlockWidth,
            blockHeight: this.state.headerBlockHeight,
            sizeRenderRefs: sizeRenderRefs,
        });
    }


    renderFooter(sizeRenderRefs) {
        return this.renderHeaderFooter({
            getHeaderFooter: (column) => column.footer,
            getCellRef: (columnRef) => columnRef.footerCellRef,
            getRowRef: (renderRefs) => renderRefs.footerRowRef,
            cellClassName: 'RowTableFooterCell',
            rowIndex: FOOTER_ROW_INDEX,
            containerClassName: 'RowTableFooter',
            rowClassName: 'RowTableFooterRow',
            rowClassExtras: this.props.footerClassExtras,
            height: this.props.footerHeight,
            blockWidth: this.state.footerBlockWidth,
            blockHeight: this.state.footerBlockHeight,
            sizeRenderRefs: sizeRenderRefs,
        });
    }


    renderBody(sizeRenderRefs) {
        const {
            bodyClassExtras,
            rowClassExtras,
            onRenderCell,
            columns,
            activeRowIndex,
            rowCount,
        } = this.props;

        const getRowKey = this.props.getRowKey || ((i) => i);

        const { topVisibleRow, bottomVisibleRow } = this.state;
        const { 
            bodyHeight, 
            bodyWidth,
            bodyRowHeight,
        } = this.state;
        
        const columnWidths = (sizeRenderRefs)
            ? this.state.defColumnWidths
            : this.state.columnWidths;

        const firstRow = topVisibleRow || 0;
        const lastRow = (sizeRenderRefs) 
            ? firstRow 
            : Math.min(bottomVisibleRow, rowCount - 1);

        if (!sizeRenderRefs) {
            this._activeRowRef = undefined;
        }

        const rows = [];
        for (let i = firstRow; i <= lastRow; ++i) {
            const cells = [];
            for (let c = 0; c < columns.length; ++c) {
                const column = columns[c];
                const cell = onRenderCell({
                    rowIndex: i, 
                    columnIndex: c, 
                    column: column,
                    isSizeRender: sizeRenderRefs,
                });

                let cellClassName = 'RowTableCell RowTableRowCell';

                if (column.cellClassExtras) {
                    cellClassName += ' ' + column.cellClassExtras;
                }

                let style;
                const width = columnWidths[c];
                if (width !== undefined) {
                    style = {
                        width: width,
                    };
                }

                let ref;
                if (sizeRenderRefs) {
                    ref = sizeRenderRefs.columnRefs[c].bodyCellRef;
                }

                cells.push(<div className = {cellClassName}
                    style = {style}
                    key = {c}
                    ref = {ref}
                    onClick = {(e) => this.onRowClick(e, i, c)}
                    onDoubleClick = {(e) => this.onRowDoubleClick(e, i, c)}
                >
                    {cell}
                </div>);
            }

            let rowClassName = 'RowTableRow';
            if (i === activeRowIndex) {
                rowClassName += ' table-active';
            }
            if (rowClassExtras) {
                rowClassName += ' ' + rowClassExtras;
            }

            let tabIndex = -1;
            let style;
            let ref;
            if (sizeRenderRefs) {
                ref = sizeRenderRefs.bodyRowRef;
            }
            else {
                if (bodyRowHeight !== undefined) {
                    style = {
                        height: bodyRowHeight,
                    };
                }
                if (i === activeRowIndex) {
                    tabIndex = 0;
                    this._activeRowRef = React.createRef();
                    ref = this._activeRowRef;
                }
            }

            rows.push(<div className = {rowClassName}
                key = {getRowKey(i)}
                style = {style}
                ref = {ref}
                tabIndex = {tabIndex}
                onKeyDown = {this.onKeyDown}
            >
                {cells}
            </div>);

            if (sizeRenderRefs) {
                // If we're fixed height rows only render a single row.
                break;
            }
        }

        let bodyClassName = 'RowTableBody';
        if (bodyClassExtras) {
            bodyClassName += ' ' + bodyClassExtras;
        }

        let bodyStyle;
        let bodyTabIndex = -1;
        let bodyOnKeyDown;
        let bodyRef;
        let rowsContainerStyle;
        let rowsInnerStyle;
        let rowsContainerRef;

        if (!sizeRenderRefs) {
            if (bodyHeight || bodyWidth) {
                bodyStyle = {};
                if (bodyHeight !== undefined) {
                    bodyStyle.height = bodyHeight;
                }
                if (bodyWidth !== undefined) {
                    bodyStyle.width = bodyWidth;
                }
    
                if (!this._activeRowRef) {
                    bodyTabIndex = 0;
                    bodyOnKeyDown = this.onKeyDown;
                }
            }

            if (bodyRowHeight !== undefined) {
                //const offsetY = topVisibleRow * bodyRowHeight;
                const offsetY = this.state.scrollTop;
                rowsContainerStyle = {
                    height: bodyRowHeight * rowCount,
                    willChange: 'transform',
                    position: 'relative',
                };
    
                rowsInnerStyle = {
                    willChange: 'transform',
                    transform: `translateY(${offsetY}px)`
                };
    
                rowsContainerRef = this._rowsContainerRef;
            }

            bodyRef = this._bodyRef;
        } 

        return <div className = {bodyClassName}
            style = {bodyStyle}
            onScroll = {this.onScroll}
            tabIndex = {bodyTabIndex}
            onKeyDown = {bodyOnKeyDown}
            ref = {bodyRef}
        >
            <div
                style = {rowsContainerStyle}
                ref = {rowsContainerRef}
            >
                <div style = {rowsInnerStyle}>
                    {rows}
                </div>
            </div>
        </div>;
    }


    renderAll(sizeRenderRefs, style) {
        const {
            classExtras
        } = this.props;

        const header = this.renderHeader(sizeRenderRefs);
        const body = this.renderBody(sizeRenderRefs);
        const footer = this.renderFooter(sizeRenderRefs);

        let className = 'table RowTable';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <div className = {className}
            style = {style}
        >
            {header}
            {body}
            {footer}
        </div>;
    }


    render() {
        const regularRender = this.renderAll();

        const { sizeRenderRefs } = this.state;

        let hiddenRender;
        if (sizeRenderRefs) {
            hiddenRender = this.renderAll(sizeRenderRefs);
        }

        // The context menu needs to be included in the sizing rendering...
        const contextMenu = this.renderContextMenu();

        const containerStyle = {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
        };
        const hiddenStyle = {
            visibility: 'hidden',
            width: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
        };
        return <div style = {containerStyle}
            ref = {this._mainRef}
            onContextMenu={(e) => this.onContextMenu(e)}
        >
            <div
            >
                {regularRender}
            </div>
            <div style = {hiddenStyle}>
                {hiddenRender}
            </div>
            {contextMenu}
        </div>;
    }


    /**
     * Sets focus to the active row, the active row is made visible if it is not
     * visible.
     */
    focusActiveRow() {
        const { activeRowIndex } = this.props;
        if (activeRowIndex === undefined) {
            return;
        }

        const { topVisibleRow, bottomFullyVisibleRow } = this.state;
        if ((activeRowIndex < topVisibleRow)
         || (activeRowIndex > bottomFullyVisibleRow)) {
            this.makeRowRangeVisible(activeRowIndex);
        }
        this.setState({
            activeRowUpdated: true,
        });
    }


    /**
     * @typedef {object} RowTable~VisibleRowRange
     * @property {number}   topVisibleRow
     * @property {number}   bottomVisibleRow
     * @property {number}   bottomFullyVisibleRow
     */

    /**
     * @returns {RowTable~VisibleRowRange}  The range of currently visible rows.
     */
    getVisibleRowRange() {
        const { state } = this;
        return {
            topVisibleRow: state.topVisibleRow,
            bottomVisibleRow: state.bottomVisibleRow,
            bottomFullyVisibleRow: state.bottomFullyVisibleRow,
        };
    }

    /**
     * Attempts to make a range of rows visible. Preference is given to ensuring
     * the smaller row index is made visible.
     * @param {number} rowIndexA 
     * @param {number} [rowIndexB =rowIndexA]
     */
    makeRowRangeVisible(rowIndexA, rowIndexB) {
        if (rowIndexB === undefined) {
            rowIndexB = rowIndexA;
        }
        if (rowIndexA === undefined) {
            rowIndexA = rowIndexB;
        }
        if (rowIndexA === undefined) {
            return;
        }

        if (rowIndexA > rowIndexB) {
            [ rowIndexA, rowIndexB ] = [ rowIndexB, rowIndexA ];
        }

        const { rowCount } = this.props;

        rowIndexA = Math.max(0, rowIndexA);
        rowIndexB = Math.min(rowCount - 1, rowIndexB);
        if (rowIndexA > rowIndexB) {
            // Must be no rows...
            return;
        }

        const { bodyRowHeight, topVisibleRow, bottomFullyVisibleRow, } = this.state;
        if (!bodyRowHeight) {
            return;
        }

        let newTopVisibleRow = topVisibleRow;
        if (rowIndexA < topVisibleRow) {
            newTopVisibleRow = rowIndexA;
        }
        else if (rowIndexB > bottomFullyVisibleRow) {
            newTopVisibleRow = rowIndexB - (bottomFullyVisibleRow - topVisibleRow);
            newTopVisibleRow = Math.min(rowIndexA, newTopVisibleRow);
        }

        if (newTopVisibleRow !== topVisibleRow) {
            this.updateVisibleRows(newTopVisibleRow * bodyRowHeight);            
        }
    }
}


/**
 * @typedef {object} RowTable~onLoadRowsArgs
 * @property {number}   firstRowIndex
 * @property {number}   lastRowIndex
 */

/**
 * @callback RowTable~onLoadRows
 * @param {RowTable~onLoadRowsArgs} args
 */

/**
 * @typedef {object} RowTable~onRenderCellArgs
 * @property {number}   rowIndex
 * @property {number}   columnIndex
 * @property {RowTable~Column}  column
 * @property {boolean}  isSizeRender
 */


/**
 * Callback for rendering cells. This will only be called for rendering a header
 * or footer cell if the {@link RowTable~HeaderFooter} does not have a label specified.
 * This will be called with isSizeRender true when the component first
 * mounts if either row heights are unknown or a column width is unknown.
 * In that case this should render what it would consider a typical cell for the requested
 * row so things can be sized appropriately.
 * @callback RowTable~onRenderCell
 * @param {RowTable~onRenderCellArgs}   args
 */

/**
 * @callback RowTable~getRowKey
 * @param {number}  rowIndex
 * @returns {any}   The key associated with the row at rowIndex.
 */


/**
 * @callback RowTable~onActivateRow
 * @param {number}  rowIndex
 */

/**
 * @typedef {object} RowTable~onSetColumnWidthArgs
 * @property {number}  columnIndex
 * @property {number}  columnWidth
 * @property {RowTable~Column}  column
 */

/**
 * @callback RowTable~onSetColumnWidth
 * @param {RowTable~onSetColumnWidthArgs}   args
 */

/**
 * @typedef {object} RowTable~onOpenActiveRowArgs
 * @property {number}   rowIndex
 * @property {number}   [columnIndex=undefined] The index of the column that was 
 * double clicked on if this is being called from a double click, otherwise
 * it is <code>undefined</code>.
 */
/**
 * Called when a row the Enter key is pressed or the active row is double clicked.
 * @callback RowTable~onOpenActiveRow
 * @param {RowTable~onOpenActiveRowArgs}    args
 */

/**
 * @callback RowTable~onKeyDown
 * @param {Event}  e
 * @returns {string|undefined}  If 'default' is returned, the event is 
 * ignored by RowTable and is processed normally.
 */

/**
 * @callback RowTable~onRowDoubleClick
 * @param {Event}  e
 * @param {number}  rowIndex
 * @param {number}  columnIndex
 * @returns {string|undefined}  If 'default' is returned, the event is 
 * ignored by RowTable and is processed normally.
 */

/**
 * @typedef {RowTable~propTypes}
 * @property {RowTable~Column[]}    columns Array of the column definitions.
 * 
 * @property {number}   rowCount    The number of rows.
 * @property {RowTable~getRowKey}   [getRowKey] Optional callback for retrieving a unique
 * key for identifiying a row, if not specified the row index is used.
 * @property {RowTable~onLoadRows}  [onLoadRows]    Optional callback that's called to
 * allow rows to pre-load, use for virtual rows.
 * 
 * @property {RowTable~onRenderCell}    onRenderCell    Callback for rendering 
 * individual cells.
 * 
 * @property {number}   [requestedVisibleRowIndex]   If specified the index of a row to 
 * try to keep visible.
 * @property {RowTable~onSetColumnWidth}    [onSetColumnWidth]  If specified the columns
 * will be resizable and this callback will be called whenever a column's width
 * is changed.
 * 
 * @property {number}   [rowHeight] Optional height of each row, if not specified
 * then onRenderCell is called with isSizeRender to generate a dummy row for sizing.
 * @property {number}   [headerHeight] Optional height of the header row, if not specified
 * then onRenderCell is called with isSizeRender to generate a dummy row for sizing.
 * @property {number}   [footerHeight] Optional height of the footer row, if not specified
 * then onRenderCell is called with isSizeRender to generate a dummy row for sizing.
 *
 * @property {number}   [activeRowIndex]    If specified the index of the row that
 * is active.
 * @property {RowTable~onActivateRow}   [onActivateRow] Callback called to activate
 * a row.
 * @property {boolean}  [noActiveRowFocus]  Set to <code>true</code> if the active row
 * should not get focus. This would normally be set if the active row is open for editing
 * so a cell within the row has focus.
 * 
 * @property {RowTable~onOpenActiveRow}   [onOpenActiveRow] If specified this is called 
 * when a row is 'opened', which is either it is double-clicked or ENTER is pressed when 
 * the row is the active row.
 * 
 * @property {RowTable~onKeyDown}   [onKeyDown] Optional hook for key down events.
 * @property {RowTable~onRowDoubleClick}   [onRowDoubleClick] Optional hook for 
 * double click events on a row.
 * 
 * @property {string}   [classExtras]
 */
RowTable.propTypes = {
    columns: PropTypes.array.isRequired,

    rowCount: PropTypes.number.isRequired,
    getRowKey: PropTypes.func,

    onLoadRows: PropTypes.func,

    onRenderCell: PropTypes.func.isRequired,

    requestedVisibleRowIndex: PropTypes.number,

    onSetColumnWidth: PropTypes.func,

    rowHeight: PropTypes.number,
    headerHeight: PropTypes.number,
    footerHeight: PropTypes.number,

    activeRowIndex: PropTypes.number,
    onActivateRow: PropTypes.func,
    noActiveRowFocus: PropTypes.bool,

    onOpenActiveRow: PropTypes.func,

    onKeyDown: PropTypes.func,
    onRowDoubleClick: PropTypes.func,

    onContextMenu: PropTypes.func,
    contextMenuItems: PropTypes.array,
    onChooseContextMenuItem: PropTypes.func,

    classExtras: PropTypes.string,
    headerClassExtras: PropTypes.string,
    bodyClassExtras: PropTypes.string,
    rowClassExtras: PropTypes.string,
    footerClassExtras: PropTypes.string,
};
