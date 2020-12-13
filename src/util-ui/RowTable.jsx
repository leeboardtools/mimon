import React from 'react';
import PropTypes from 'prop-types';
import deepEqual from 'deep-equal';
import { ContextMenu } from './ContextMenu';
import { setFocus } from '../util/ElementUtils';


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


//
// The component structure:
//
//  <div containerStyle: {width: 100%  height: 100%  overflow: hidden}
//      >>> ref = _mainRef <<<
//      <div>
//          <div "table RowTable">
//              <div "RowTableHeader">
//                  ...header...
//              </div>  // RowTableHeader
//
//              <div "RowTableBody" {
//                      overflow-y: scroll, overflow-x: hidden, 
//                      vertical-align: middle
//                  }
//                  bodyStyle: { height: bodyHeight width: bodyWidth }
//                  onScroll
//                  tabIndex: 0 
//                  onKeyDown
//                  >>> ref = _bodyRef <<<
//
//                  // The main body, this has the scroll bar and handles non-editing
//                  // focus/keyboard control.
//              >
//
//                  <div rowsContainerStyle: {
//                          height: rowCount * bodyRowHeight, 
//                          position: relative
//                      }
//                      // The rowsContainerStyle represents the full scrollable range,
//                      // rowCount * bodyRowHeight.
//                  >
//                      <div rowsInnerStyle: {
//                              transform: translateY(state.offsetY)
//                          }
//                          // The rowsInnerStyle is necessary so we can render virtual
//                          // rows and not have to render rows from the first row. 
//                      >
//                          <div "RowTableRow" { display: flex; flex-wrap: nowrap }
//                              style: { height: 36.5625px }
//                          >
//                              ...
//                          </div>  // RowTableRow
//
//                          <div "RowTableRow" { display: flex; flex-wrap: nowrap}
//                              style: { height: 36.5625px }
//                          >
//                              ...
//                          </div>  // RowTableRow
//
//                      </div>  // rowsInnerStyle
//
//                  </div>  // rowsContainerStyle
//
//              </div>  // RowTableBody
//
//              <div "RowTableFooter">   
//                  ...footer...
//              </div>  // RowTableFoooter
//          </div>  // RowTabl
//      </div>
//
//      <div hidden Render>
//      </div>
//  </div>
//


/**
 * React component for row based tables.
 */
export class RowTable extends React.Component {
    constructor(props) {
        super(props);

        this.watcher = this.watcher.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onBodyFocus = this.onBodyFocus.bind(this);
        this.onBodyBlur = this.onBodyBlur.bind(this);

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
        this.state.bottomVisibleRow = -1;

        this.state.isSizeRender = this.state.isAutoSize;
        this.state.clientWidth = this.state.clientHeight = 0;
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
            process.nextTick(() => {
                // Using nextTick() so we don't take too long in 
                // requestAnimationFrame()...
                this.updateLayout();
                window.requestAnimationFrame(this.watcher);
            });
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

        if (this.props.activeRowIndex !== prevProps.activeRowIndex) {
            if (this.makeRowRangeVisible(this.props.activeRowIndex)) {
                // updateVisibleRows() would have been called...
                return;
            }
        }

        if ((this.state.bodyHeight !== prevState.bodyHeight)
         || (this.state.bodyRowHeight !== prevState.bodyRowHeight)
         || (this.props.rowCount !== prevProps.rowCount)
         || (visibleRowIndex !== prevState.visibleRowIndex)) {
            this.updateVisibleRows();
            return;
        }
        if ((this.state.topVisibleRow !== prevState.topVisibleRow)
         || (this.state.bottomVisibleRow !== prevState.bottomVisibleRow)) {
            this.loadRows();
            return;
        }

        if (!this.state.isOnScroll && this._bodyRef.current) {
            const { current } = this._bodyRef;
            const { scrollTop } = this.state;
            if ((current.scrollTop !== scrollTop)
             && (scrollTop !== undefined)) {
                current.scrollTop = scrollTop;
            }
        }

        if (this.state.wantFocusAfterRender) {
            this.setState({
                wantFocusAfterRender: undefined,
            });
            setFocus(this._bodyRef.current);
        }
    }


    getRefClientSize(ref, definedHeight) {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            return { 
                width: rect.width, 
                height: (definedHeight !== undefined)
                    ? definedHeight : rect.height,
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


    getAdjustedMainRefSize() {
        const rect = this._mainRef.current.getBoundingClientRect();
        let clientWidth = rect.width;
        let clientHeight = rect.height;
        if (Math.abs(clientWidth - this.state.clientWidth) <= 2) {
            clientWidth = this.state.clientWidth;
        }
        if (Math.abs(clientHeight - this.state.clientHeight) <= 2) {
            clientHeight = this.state.clientHeight;
        }
        return {
            clientWidth: clientWidth,
            clientHeight: clientHeight,
        };
    }


    updateFromClientSize() {
        const { clientWidth, clientHeight } = this.getAdjustedMainRefSize();

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
                    width = headerCellRef.current.getBoundingClientRect().width;
                }
                if (bodyCellRef.current) {
                    width = Math.max(width, 
                        bodyCellRef.current.getBoundingClientRect().width);
                }
                if (footerCellRef.current) {
                    width = Math.max(width, 
                        footerCellRef.current.getBoundingClientRect().width);
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

        const { clientWidth, clientHeight } = this.getAdjustedMainRefSize();
        if ((clientWidth <= 0) || (clientHeight <= 0)) {
            return;
        }

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
            const rect = this._rowsContainerRef.current.getBoundingClientRect();
            const rowContainerWidth = rect.width;
            const rowContainerHeight = rect.height;
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


    _calcVisibleRowsFromScrollTop(scrollTop) {
        scrollTop = Math.round(scrollTop);

        const { bodyRowHeight, bodyHeight } = this.state;
        const lastRow = this.props.rowCount - 1;

        let topVisibleRow = scrollTop / bodyRowHeight;
        topVisibleRow = Math.max(
            0,
            Math.min(topVisibleRow, lastRow));
        
        let bottomVisibleRow = (scrollTop + bodyHeight) / bodyRowHeight;
        bottomVisibleRow = Math.max(
            topVisibleRow,
            Math.min(bottomVisibleRow, lastRow));
        
        let topFullyVisibleRow = Math.ceil(topVisibleRow);
        topFullyVisibleRow = Math.max(
            topVisibleRow,
            Math.min(topFullyVisibleRow, lastRow));
        
        let bottomFullyVisibleRow = Math.floor(bottomVisibleRow);
        if (((bottomFullyVisibleRow + 1) * bodyRowHeight - bodyHeight) >= 0.5) {
            --bottomFullyVisibleRow;
        }
        bottomFullyVisibleRow = Math.max(
            topFullyVisibleRow,
            Math.min(bottomFullyVisibleRow, lastRow));
        
        let offsetY = Math.floor(topVisibleRow) * bodyRowHeight;
        offsetY = Math.max(
            0,
            offsetY);

        return {
            scrollTop: scrollTop,
            topVisibleRow: topVisibleRow,
            bottomVisibleRow: bottomVisibleRow,
            topFullyVisibleRow: topFullyVisibleRow,
            bottomFullyVisibleRow: bottomFullyVisibleRow,
            offsetY: offsetY,
        };
    }


    updateVisibleRows(scrollTop) {
        this.setState((state) => {
            const { bodyHeight, bodyRowHeight, } = state;
            if ((bodyRowHeight !== undefined) && (bodyRowHeight > 0)
             && this._rowsContainerRef.current) {
                const { rowCount } = this.props;
                const lastRow = rowCount - 1;

                const isOnScroll = scrollTop !== undefined;
                let originalScrollTop = scrollTop;

                if (scrollTop === undefined) {
                    scrollTop = (state.scrollTop !== undefined)
                        ? state.scrollTop
                        : this.state.topVisibleRow * bodyRowHeight;
                }


                // At the maximum scroll position, we want the last row to be at the
                // bottom edge of the body.
                const scrollTopMax = rowCount * bodyRowHeight - bodyHeight;
                scrollTop = Math.round(Math.min(scrollTop, scrollTopMax));
                if (scrollTop >= scrollTopMax) {
                    // We need to enforce our scrollTopMax, otherwise the body div, which
                    // has the scroll bar, thinks the scroll range is twice as large 
                    // because of the offsetY we use for rendering the rows virtually.
                    originalScrollTop = undefined;
                }

                let visibleRows = this._calcVisibleRowsFromScrollTop(scrollTop);

                let { visibleRowIndex } = state;
                if (visibleRowIndex !== undefined) {
                    
                    visibleRowIndex = Math.max(0, Math.min(visibleRowIndex, lastRow));
                    const { topVisibleRow,
                        topFullyVisibleRow, bottomFullyVisibleRow } = visibleRows;
                    let delta;
                    if (visibleRowIndex < topFullyVisibleRow) {
                        delta = visibleRowIndex - topFullyVisibleRow;
                    }
                    else if (visibleRowIndex > bottomFullyVisibleRow) {
                        delta = visibleRowIndex - bottomFullyVisibleRow;
                    }

                    if (delta) {
                        scrollTop = Math.round((topVisibleRow + delta) * bodyRowHeight);
                        visibleRows = this._calcVisibleRowsFromScrollTop(scrollTop);
                    }
                }

                if (this._bodyRef.current
                 && (originalScrollTop === undefined)) {
                    this._bodyRef.current.scrollTop = visibleRows.scrollTop;
                }

                visibleRows.visibleRowIndex = undefined;
                visibleRows.isOnScroll = isOnScroll;

                return visibleRows;
            }
        });
    }


    loadRows() {
        const { onLoadRows, rowCount } = this.props;
        let { topVisibleRow, bottomVisibleRow } = this.state;
        if (onLoadRows) {
            topVisibleRow = Math.max(Math.floor(topVisibleRow), 0);
            bottomVisibleRow = Math.min(Math.ceil(bottomVisibleRow), rowCount - 1);
            const visibleRowCount = bottomVisibleRow - topVisibleRow;

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
            () => {
                this.updateVisibleRows(scrollTop);
            });
    }


    /**
     * Sets focus to the row table.
     */
    focus() {
        setFocus(this._bodyRef.current);
    }


    /**
     * 'Opens' the active row.
     * @param {number} [columnIndex]
     */
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
            switch (e.key) {
            case 'ArrowUp' :
                --activeRowIndex;
                e.preventDefault();
                break;

            case 'ArrowDown' :
                ++activeRowIndex;
                e.preventDefault();
                break;
            
            case 'PageUp' :
                if (this.state.topFullyVisibleRow !== undefined) {
                    if (activeRowIndex >= this.state.bottomFullyVisibleRow) {
                        activeRowIndex = this.state.topFullyVisibleRow;
                    }
                    else {
                        const pageIncrement = Math.max(1,
                            Math.floor(this.state.bottomFullyVisibleRow)
                                - this.state.topFullyVisibleRow);
                        activeRowIndex -= pageIncrement;
                    }
                }
                e.preventDefault();
                break;
            
            case 'PageDown' :
                if (this.state.bottomFullyVisibleRow !== undefined) {
                    if (activeRowIndex <= this.state.topFullyVisibleRow) {
                        activeRowIndex = this.state.bottomFullyVisibleRow;
                    }
                    else {
                        const pageIncrement = Math.max(1,
                            this.state.bottomFullyVisibleRow 
                                - Math.ceil(this.state.topFullyVisibleRow));
                        activeRowIndex += pageIncrement;
                    }
                }
                e.preventDefault();
                break;

            case 'Enter' :
                this.openActiveRow();
                break;
            }

            if (activeRowIndex !== this.props.activeRowIndex) {
                this.activateRow(activeRowIndex);
                if (document.activeElement !== this._bodyRef.current) {
                    this.setState({
                        wantFocusAfterRender: true,
                    });
                }
            }

        }
    }


    _dumpElement(e) {
        if (e) {
            if (e.id) {
                return e.id;
            }
            else if (e.classList && e.classList.length) {
                return e.classList;
            }
            else {
                return e.tagName;
            }
        }
    }

    onBodyFocus(e) {
        //console.log('onBodyFocus: ' + this._dumpElement(e.relatedTarget));
    }

    onBodyBlur(e) {
        //console.log('onBodyBlur: ' + this._dumpElement(e.relatedTarget));
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
                        flexBasis: width,
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


    renderRow(sizeRenderRefs, rowIndex) {
        const {
            rowClassExtras,
            onRenderCell,
            columns,
            activeRowIndex,
        } = this.props;

        const { 
            bodyRowHeight,
        } = this.state;

        const columnWidths = (sizeRenderRefs)
            ? this.state.defColumnWidths
            : this.state.columnWidths;

        const getRowKey = this.props.getRowKey || ((i) => i);
        const cells = [];
        for (let colIndex = 0; colIndex < columns.length; ++colIndex) {
            const column = columns[colIndex];
            const cell = onRenderCell({
                rowIndex: rowIndex, 
                columnIndex: colIndex, 
                column: column,
                isSizeRender: sizeRenderRefs,
            });

            let cellClassName = 'RowTableCell RowTableRowCell';

            if (column.cellClassExtras) {
                cellClassName += ' ' + column.cellClassExtras;
            }

            let style;
            const width = columnWidths[colIndex];
            if (width !== undefined) {
                style = {
                    flexBasis: width,
                };
            }

            let ref;
            if (sizeRenderRefs) {
                ref = sizeRenderRefs.columnRefs[colIndex].bodyCellRef;
            }

            cells.push(<div className = {cellClassName}
                style = {style}
                key = {colIndex}
                ref = {ref}
                onClick = {(e) => 
                    this.onRowClick(e, rowIndex, colIndex)}
                onDoubleClick = {(e) => 
                    this.onRowDoubleClick(e, rowIndex, colIndex)}
            >
                {cell}
            </div>);
        }

        let rowClassName = 'RowTableRow';
        if (rowIndex === activeRowIndex) {
            rowClassName += ' table-active';
        }
        if (rowClassExtras) {
            rowClassName += ' ' + rowClassExtras;
        }

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
        }

        return <div className = {rowClassName}
            key = {getRowKey(rowIndex)}
            style = {style}
            ref = {ref}
        >
            <div // TEST!!!
            >{rowIndex}</div>

            {cells}
        </div>;
    }


    renderBody(sizeRenderRefs) {
        const {
            bodyClassExtras,
            rowCount,
        } = this.props;

        const { topVisibleRow, bottomVisibleRow } = this.state;
        const { 
            bodyHeight, 
            bodyWidth,
            bodyRowHeight,
        } = this.state;
        
        const firstRow = Math.max(Math.floor(topVisibleRow), 0);
        const lastRow = (sizeRenderRefs) 
            ? firstRow 
            : Math.min(Math.ceil(bottomVisibleRow), rowCount - 1);

        const rows = [];
        if (sizeRenderRefs || (topVisibleRow >= 0)) {
            for (let rowIndex = firstRow; rowIndex <= lastRow; ++rowIndex) {
                const row = this.renderRow(sizeRenderRefs, rowIndex);
                rows.push(row);
            }
        }

        let bodyClassName = 'RowTableBody';
        if (bodyClassExtras) {
            bodyClassName += ' ' + bodyClassExtras;
        }

        let bodyStyle;
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
            }

            if (bodyRowHeight !== undefined) {
                const { offsetY } = this.state;
                rowsContainerStyle = {
                    height: bodyRowHeight * rowCount,
                    position: 'relative',
                };
                rowsInnerStyle = {
                    transform: `translateY(${offsetY}px)`
                };
    
                rowsContainerRef = this._rowsContainerRef;
            }

            bodyRef = this._bodyRef;
        }

        return <div className = {bodyClassName}
            style = {bodyStyle}
            onScroll = {this.onScroll}
            tabIndex = {0}
            onKeyDown = {this.onKeyDown}
            onFocus = {this.onBodyFocus}
            onBlur = {this.onBodyBlur}
            ref = {bodyRef}
        >
            <div 
                // This container sets the overall size of the table so the body 
                // container can scroll it.
                style = {rowsContainerStyle}
                ref = {rowsContainerRef}
            >
                <div 
                    // This container is where the rows are placed. Since we're
                    // generating virtual rows, we need to translateY the container
                    // where the rows go so the first row rendered lines up properly
                    // with the scrolled position.
                    style = {rowsInnerStyle}
                >
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

        const { topFullyVisibleRow, bottomFullyVisibleRow } = this.state;
        if ((activeRowIndex < topFullyVisibleRow)
         || (activeRowIndex > bottomFullyVisibleRow)) {
            this.makeRowRangeVisible(activeRowIndex);
        }
    }


    /**
     * @typedef {object} RowTable~VisibleRowRange
     * @property {number}   topVisibleRow
     * @property {number}   bottomVisibleRow
     * @property {number}   topFullyVisibleRow
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
            topFullyVisibleRow: state.topFullyVisibleRow,
            bottomFullyVisibleRow: state.bottomFullyVisibleRow,
        };
    }

    /**
     * Attempts to make a range of rows visible. Preference is given to ensuring
     * the smaller row index is made visible.
     * @param {number} rowIndexA 
     * @param {number} [rowIndexB =rowIndexA]
     * @returns {boolean} <code>true</code> if the visible row range needed updating.
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

        const { bodyRowHeight, topFullyVisibleRow, bottomFullyVisibleRow, } = this.state;
        if (!bodyRowHeight) {
            return;
        }

        let newVisibleRow;
        if (rowIndexA < topFullyVisibleRow) {
            newVisibleRow = rowIndexA;
        }
        else if (rowIndexB > bottomFullyVisibleRow) {
            const fullyVisibleRows = bottomFullyVisibleRow - topFullyVisibleRow;
            let newTopRow = rowIndexB - fullyVisibleRows;
            if (rowIndexA < newTopRow) {
                // Always want rowIndexA visible...
                newVisibleRow = rowIndexA + fullyVisibleRows - 1;
            }
            else {
                newVisibleRow = rowIndexB;
            }
        }

        if (newVisibleRow !== undefined) {
            this.setState({
                visibleRowIndex: newVisibleRow
            },
            () => {
                this.updateVisibleRows();
            });
            return true;
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
