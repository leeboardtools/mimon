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
 * React component for the column resizer bar that is dragged.
 */
class RowTableColumnDragger extends React.Component {
    constructor(props) {
        super(props);

        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onGlobalKeyEvent = this.onGlobalKeyEvent.bind(this);

        this.onFocus = this.onFocus.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this._myRef = React.createRef();

        this.state = {

        };
    }


    componentWillUnmount() {
        if (this.props.isEnabledCallback) {
            window.removeEventListener('keydown', this.onGlobalKeyEvent);
            window.removeEventListener('keyup', this.onGlobalKeyEvent);
        }
    }


    componentDidUpdate(prevProps, prevState) {
        if (this.props.isCancel && !prevProps.isCancel) {
            this.stopTracking();
        }
        
        if (this.state.isDisabled && !prevState.isDisabled) {
            this.stopTracking();
        }
    }


    _handleEnabledCallback(e) {
        if (this.props.isEnabledCallback) {
            this.setState({
                isDisabled: !this.props.isEnabledCallback(e),
            });
        }
    }

    onMouseEnter(e) {
        if (this.props.isEnabledCallback) {
            window.addEventListener('keydown', this.onGlobalKeyEvent);
            window.addEventListener('keyup', this.onGlobalKeyEvent);

            this._handleEnabledCallback(e);
        }
    }

    onMouseLeave(e) {
        if (this.props.isEnabledCallback) {
            window.removeEventListener('keydown', this.onGlobalKeyEvent);
            window.removeEventListener('keyup', this.onGlobalKeyEvent);
        }
    }

    onGlobalKeyEvent(e) {
        this._handleEnabledCallback(e);
    }



    onFocus(e) {
        this.setState({
            savedFocus: e.relatedTarget,
        });
    }

    onKeyDown(e) {
        if (this.state.isTracking) {
            if (e.key === 'Escape') {
                this.stopTracking();
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }


    stopTracking() {
        if (this.state.isTracking) {
            this._myRef.current.releasePointerCapture(this.state.pointerId);

            if (this.state.savedFocus) {
                setFocus(this.state.savedFocus);
            }
            else {
                const { defaultFocusRef } = this.props;
                if (defaultFocusRef && defaultFocusRef.current) {
                    setFocus(defaultFocusRef.current);
                }
            }

            this.setState({
                isTracking: false,
                pointerId: undefined,
                savedFocus: undefined,
            },
            () => {
                const { onTrackingStopped } = this.props;
                if (onTrackingStopped) {
                    onTrackingStopped(this.state.currentPos);
                }
            });
        }
    }


    onPointerDown(e) {
        if (!this.state.isTracking) {
            this.setState({
                isTracking: true,
                pointerId: e.pointerId,
                startPos: e.pageX,
                currentPos: e.pageX,
            },
            () => {
                const { onTrackingStarted } = this.props;
                if (onTrackingStarted) {
                    onTrackingStarted(this.state.currentPos);
                }

                this._myRef.current.setPointerCapture(this.state.pointerId);
            });
        }
    }


    onPointerMove(e) {
        if (this.state.isTracking) {
            this.setState({
                currentPos: e.pageX,
            },
            () => {
                const { onTrackingMoved } = this.props;
                if (onTrackingMoved) {
                    onTrackingMoved(this.state.currentPos);
                }
            });
        }
    }


    onPointerUp(e) {
        if (this.state.isTracking) {
            this.props.onEndAction({
                pageX: e.pageX,
                clientX: e.clientX,
                delta: e.clientX - this.state.startPos,
            });
            this.stopTracking();
        }
    }


    render() {
        const { props, state } = this;

        let draggerClassName = 'RowTableColumnDragger';
        let isDisabled = state.isDisabled || !props.onEndAction;
        if (!isDisabled) {
            draggerClassName += ' enabled';
        }
        if (state.isTracking) {
            draggerClassName += ' active';
        }

        const { classExtras } = props;

        let onMouseEnter;
        let onMouseLeave;
        if (props.isEnabledCallback) {
            onMouseEnter = this.onMouseEnter;
            onMouseLeave = this.onMouseLeave;
        }

        let onPointerDown; 
        let onPointerMove; 
        let onPointerUp;
        let onKeyDown;
        if (!isDisabled) {
            onPointerDown = this.onPointerDown;
            onPointerUp = this.onPointerUp;
        }

        let tabIndex = -1;
        if (this.state.isTracking) {
            onKeyDown = this.onKeyDown;
            onPointerMove = this.onPointerMove;
            tabIndex = 0;

            draggerClassName += ' tracking';
        }

        if (classExtras) {
            draggerClassName += ' ' + classExtras;
        }

        return <div className = {draggerClassName}
            onMouseEnter = {onMouseEnter}
            onMouseLeave = {onMouseLeave}
            onPointerDown = {onPointerDown}
            onPointerMove = {onPointerMove}
            onPointerUp = {onPointerUp}
            onFocus = {this.onFocus}
            onKeyDown = {onKeyDown}
            ref = {this._myRef}
            tabIndex = {tabIndex}
        >
            {this.props.children}
        </div>;
    }
}

RowTableColumnDragger.propTypes = {
    classExtras: PropTypes.string,
    onEndAction: PropTypes.func,
    isCancel: PropTypes.bool,
    isEnabledCallback: PropTypes.func,
    onTrackingStarted: PropTypes.func,
    onTrackingMoved: PropTypes.func,
    onTrackingStopped: PropTypes.func,
    defaultFocusRef: PropTypes.object,
    children: PropTypes.any,
};


/**
 * React component for the bars used to highlight column resizing and dragging,
 * this is used to highlight the full column in the table.
 */
class RowTableColumnDraggerTracker extends React.Component {
    constructor(props) {
        super(props);
        this._myRef = React.createRef();
    }

    render() {
        const { classExtras, pageX, width, show } = this.props;
        const style = {
            position: 'absolute',
            display: (show) ? 'block' : 'none',
        };

        if (this._myRef.current && (pageX !== undefined)) {
            const { parentElement } = this._myRef.current;
            if (parentElement) {
                const boundingRect = parentElement.getBoundingClientRect();
                style.left = pageX - boundingRect.left;
                style.width = width || 1;
                style.top = boundingRect.top;
                style.height = boundingRect.height;
            }
        }

        let className = 'RowTableColumnDraggerTracker';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <div className = {className}
            style = {style}
            ref = {this._myRef}
        >
            {this.props.children}
        </div>;
    }
}

RowTableColumnDraggerTracker.propTypes = {
    classExtras: PropTypes.string,
    pageX: PropTypes.number,
    width: PropTypes.number,
    show: PropTypes.bool,
    children: PropTypes.any,
};


function RowTableColumnResizerCell(props) {
    const { classExtras, children, ...resizerProps } = props;

    let className = 'RowTableColumnResizerCell';
    if (classExtras) {
        className += ' ' + props.classExtras;
    }

    return <div className = {className}>
        <div className = "RowTableColumnResizerCell-cell">
            {children}
        </div>
        <RowTableColumnDragger {...resizerProps} 
            classExtras = "RowTableColumnResizer"
        />
    </div>;
}

RowTableColumnResizerCell.propTypes = {
    onEndAction: PropTypes.func,
    isCancel: PropTypes.bool,
    onTrackingStarted: PropTypes.func,
    onTrackingMoved: PropTypes.func,
    onTrackingStopped: PropTypes.func,
    defaultFocusRef: PropTypes.object,
    children: PropTypes.any,
    classExtras: PropTypes.string,
};


function RowTableColumnMoverCell(props) {
    const { children, ...draggerProps } = props;

    return <RowTableColumnDragger {...draggerProps}
        classExtras = "RowTableColumnMover"
        isEnabledCallback = {(e) => 
            e.ctrlKey && !e.shiftKey && !e.altKey}
    >
        {children}
    </RowTableColumnDragger>;
}

RowTableColumnMoverCell.propTypes = {
    onEndAction: PropTypes.func,
    isCancel: PropTypes.bool,
    onTrackingStarted: PropTypes.func,
    onTrackingMoved: PropTypes.func,
    onTrackingStopped: PropTypes.func,
    defaultFocusRef: PropTypes.object,
    children: PropTypes.any,
    classExtras: PropTypes.string,
};


/**
 * React component for row based tables.
 */
export class RowTable extends React.Component {
    constructor(props) {
        super(props);

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onBodyFocus = this.onBodyFocus.bind(this);
        this.onBodyBlur = this.onBodyBlur.bind(this);

        this.onRowClick = this.onRowClick.bind(this);
        this.onRowDoubleClick = this.onRowDoubleClick.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.onContextMenuClose = this.onContextMenuClose.bind(this);
        this.onScroll = this.onScroll.bind(this);

        this.onColumnResizeTrackingStarted 
            = this.onColumnResizeTrackingStarted.bind(this);
        this.onColumnResizeTrackingMoved 
            = this.onColumnResizeTrackingMoved.bind(this);
        this.onColumnResizeTrackingStopped 
            = this.onColumnResizeTrackingStopped.bind(this);

        this.onColumnMoveTrackingStarted 
            = this.onColumnMoveTrackingStarted.bind(this);
        this.onColumnMoveTrackingMoved 
            = this.onColumnMoveTrackingMoved.bind(this);
        this.onColumnMoveTrackingStopped 
            = this.onColumnMoveTrackingStopped.bind(this);

        this._mainRef = React.createRef();
        this._bodyRef = React.createRef();
        this._rowsContainerRef = React.createRef();
        
        this._headerRowRef = React.createRef();
        this._bodyRowRef = React.createRef();
        this._footerRowRef = React.createRef();

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

        this._renderCount = 0;
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
            isAutoColWidth: isAutoColWidth,
            isAutoRowHeight: isAutoRowHeight,
            isAutoHeaderHeight: isAutoHeaderHeight,
            isAutoFooterHeight: isAutoFooterHeight,
            isAutoSize: isAutoSize,
        };
    }


    componentDidMount() {
        this._resizeObserver = new ResizeObserver(() => this.updateLayout());
        this._resizeObserver.observe(this._mainRef.current);

        process.nextTick(() => this.updateLayout());
    }


    componentWillUnmount() {
        this._resizeObserver.disconnect();
    }


    componentDidUpdate(prevProps, prevState) {
        if (this.props.requestedVisibleRowIndex !== prevProps.requestedVisibleRowIndex) {
            this.setState({
                visibleRowIndex: this.props.requestedVisibleRowIndex
            });
        }

        if (!deepEqual(prevProps.columns, this.props.columns)) {
            this.setState(this.getStateUpdateFromColumns(),
                () => this.updateLayout(true));
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
        const { clientWidth, clientHeight, } = this.getAdjustedMainRefSize();

        let { columnWidths } = this.state;

        let {
            headerHeight,
            footerHeight,
            rowHeight,
        } = this.props;

        const { isSizeRender, sizeRenderRefs } = this.state;
        if (isSizeRender && sizeRenderRefs) {
            // Figure out the column widths...
            const { columns } = this.props;
            const { columnRefs } = sizeRenderRefs;
            columnWidths = [];
            for (let i = 0; i < columns.length; ++i) {
                const { bodyCellRef } = columnRefs[i];
                let width = 0;
                if (bodyCellRef.current) {
                    width = bodyCellRef.current.getBoundingClientRect().width;
                }
                columnWidths[i] = width;
            }

            // We've rendered the sizes, we can now grab the various sizes needed.
            headerHeight = this.getRefClientSize(this._headerRowRef, 
                headerHeight).height;

            footerHeight = this.getRefClientSize(this._footerRowRef,
                footerHeight).height;

            rowHeight = this.getRefClientSize(this._bodyRowRef,
                rowHeight).height;
        }
        else {
            headerHeight = (headerHeight === undefined) 
                ? this.state.headerBlockHeight : headerHeight;
            footerHeight = (footerHeight === undefined)
                ? this.state.footerBlockHeight : footerHeight;
            rowHeight = (rowHeight === undefined)
                ? this.state.bodyRowHeight : rowHeight;
        }

        this.setState({
            columnWidths: columnWidths,
            bodyWidth: clientWidth,
            clientWidth: clientWidth,

            headerBlockHeight: headerHeight,
            footerBlockHeight: footerHeight,
            bodyRowHeight: rowHeight,

            bodyHeight: clientHeight - headerHeight - footerHeight,

            clientHeight: clientHeight,

            sizeRenderRefs: undefined,
            isSizeRender: false,
        });
    }


    updateLayout(forceUpdate) {
        if (!this._mainRef.current) {
            return;
        }

        const { clientWidth, clientHeight } = this.getAdjustedMainRefSize();
        if ((clientWidth <= 0) || (clientHeight <= 0)) {
            return;
        }

        const { state } = this;
        if ((clientWidth === state.clientWidth)
         && (clientHeight === state.clientHeight)
         && !forceUpdate) {
            if (state.isSizeRender) {
                this.updateFromClientSize();
            }
        }
        else {
            const { isAutoSize } = state;
            if (isAutoSize) {
                if (!forceUpdate && (clientWidth === state.clientWidth)) {
                    this.updateFromClientSize();
                    this.updateVisibleRows();
                }
                else {
                    const { columns } = this.props;
                    const sizeRenderRefs = {
                        //bodyRowRef: React.createRef(),
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
            }
            else {
                this.updateFromClientSize();
            }
        }


        if (this._rowsContainerRef.current
         && !this.state.isSizeRender) {
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
        let originalTopVisibleRow;
        let originalBottomVisibleRow;

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
                        : state.topVisibleRow * bodyRowHeight;
                }

                originalTopVisibleRow = state.topVisibleRow;
                originalBottomVisibleRow = state.bottomVisibleRow;


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
        },
        () => {
            if ((this.state.topVisibleRow !== originalTopVisibleRow)
             || (this.state.bottomVisibleRow !== originalBottomVisibleRow)) {
                this.loadRows();
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


    onColumnResize(delta, columnIndex) {
        const { onSetColumnWidth } = this.props;
        let columnWidth = this.state.columnWidths[columnIndex];

        if (onSetColumnWidth && (columnWidth !== undefined)) {
            const columnWidths = Array.from(this.state.columnWidths);
            columnWidths[columnIndex] += delta;
            onSetColumnWidth({
                columnIndex: columnIndex,
                columnWidth: this.state.columnWidths[columnIndex] + delta,
                column: this.props.columns[columnIndex]
            });
        }
    }


    onColumnResizeTrackingStarted(pageX) {
        this.setState({
            isColumnResizeTracking: true,
            pageX: pageX,
            trackingWidth: 1,
            trackingClassExtras: 'RowTableColumnResizerTracker',
        });
    }

    onColumnResizeTrackingMoved(pageX) {
        this.setState({
            isColumnResizeTracking: true,
            pageX: pageX,
        });
    }

    onColumnResizeTrackingStopped() {
        this.setState({
            isColumnResizeTracking: false,
            trackingWidth: undefined,
            trackingClassExtras: undefined,
        });
    }


    onColumnMove(args, columnIndex) {
        const { onMoveColumn } = this.props;
        if (!onMoveColumn) {
            return;
        }

        const { columnWidths } = this.state;

        let newColumnIndex = columnIndex;
        const x = args.pageX;
        let edge = 0;
        for (let i = 0; i < columnWidths.length; ++i) {
            edge += columnWidths[i];
            if (x <= edge) {
                newColumnIndex = i;
                break;
            }
        }

        if (newColumnIndex !== columnIndex) {
            onMoveColumn({
                originalColumnIndex: columnIndex, 
                newColumnIndex: newColumnIndex,
                column: this.props.columns[columnIndex],
            });
        }
    }


    onColumnMoveTrackingStarted(pageX, columnIndex) {
        const { columnWidths } = this.state;
        const columnWidth = columnWidths[columnIndex];
        let columnStart = 0;
        for (let i = 0; i < columnIndex; ++i) {
            columnStart += columnWidths[i];
        }

        this.setState({
            isColumnMoveTracking: true,
            pageX: columnStart,
            trackingOffset: pageX - columnStart,
            trackingWidth: columnWidth,
            trackingClassExtras: 'RowTableColumnMoverTracker',
        });
    }

    onColumnMoveTrackingMoved(pageX) {
        this.setState((state) => {
            return {
                isColumnMoveTracking: true,
                pageX: pageX - state.trackingOffset,
            };
        });
    }

    onColumnMoveTrackingStopped() {
        this.setState({
            isColumnMoveTracking: false,
            trackingWidth: undefined,
            trackingClassExtras: undefined,
        });
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
                sizeRenderRefs,
                isSizeRender,
            } = this.state;

            const { 
                cellClassName, 
                rowIndex, 
                rowClassExtras, 
                height,
                blockWidth,
                blockHeight,
                getCellRef, 
            } = args;

            const {
                onRenderCell,
            } = this.props;

            const { columnWidths } = this.state;

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
                            isSizeRender: isSizeRender,
                        });
                    }
                }

                if (this.props.onMoveColumn) {
                    cell = <RowTableColumnMoverCell
                        onEndAction = {(args) => this.onColumnMove(args, c)}
                        onTrackingStarted = {(pageX) => 
                            this.onColumnMoveTrackingStarted(pageX, c)}
                        onTrackingMoved = {this.onColumnMoveTrackingMoved}
                        onTrackingStopped = {this.onColumnMoveTrackingStopped}
                        defaultFocusRef = {this._bodyRef}
                    >
                        {cell}
                    </RowTableColumnMoverCell>;
                }

                if (this.props.onSetColumnWidth && ((c + 1) < columns.length)) {
                    cell = <RowTableColumnResizerCell
                        onEndAction = {({delta}) => this.onColumnResize(delta, c)}
                        onTrackingStarted = {this.onColumnResizeTrackingStarted}
                        onTrackingMoved = {this.onColumnResizeTrackingMoved}
                        onTrackingStopped = {this.onColumnResizeTrackingStopped}
                        defaultFocusRef = {this._bodyRef}
                    >
                        {cell}
                    </RowTableColumnResizerCell>;
                }

                let style;
                const width = columnWidths[c];
                if (width !== undefined) {
                    // Setting both minWidth and maxWidth to the desired width
                    // forces flexbox to use the width...
                    style = {
                        maxWidth: width,
                        minWidth: width,
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

            if (isSizeRender) {
                rowClassName += ' Visibility-hidden';
            }

            let style = {};
            if ((height !== undefined) || (blockWidth !== undefined)) {
                if (height !== undefined) {
                    style.height = height;
                }
                else if (!isSizeRender && (blockHeight !== undefined)) {
                    style.height = blockHeight;
                }
                if (!isSizeRender && (blockWidth !== undefined)) {
                    style.width = blockWidth;
                }
            }

            const ref = (isSizeRender) ? args.rowRef : undefined;

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



    renderHeader() {
        return this.renderHeaderFooter({
            getHeaderFooter: (column) => column.header,
            getCellRef: (columnRef) => columnRef.headerCellRef,
            rowRef: this._headerRowRef,
            cellClassName: 'RowTableHeaderCell',
            rowIndex: HEADER_ROW_INDEX,
            containerClassName: 'RowTableHeader',
            rowClassName: 'RowTableHeaderRow',
            rowClassExtras: this.props.headerClassExtras,
            height: this.props.headerHeight,
            blockWidth: this.state.headerBlockWidth,
            blockHeight: this.state.headerBlockHeight,
        });
    }


    renderFooter() {
        return this.renderHeaderFooter({
            getHeaderFooter: (column) => column.footer,
            getCellRef: (columnRef) => columnRef.footerCellRef,
            rowRef: this._footerRowRef,
            cellClassName: 'RowTableFooterCell',
            rowIndex: FOOTER_ROW_INDEX,
            containerClassName: 'RowTableFooter',
            rowClassName: 'RowTableFooterRow',
            rowClassExtras: this.props.footerClassExtras,
            height: this.props.footerHeight,
            blockWidth: this.state.footerBlockWidth,
            blockHeight: this.state.footerBlockHeight,
        });
    }


    renderRow(rowIndex) {
        const {
            rowClassExtras,
            onRenderCell,
            columns,
            activeRowIndex,
        } = this.props;

        const {
            sizeRenderRefs,
            isSizeRender,
            bodyRowHeight,
        } = this.state;

        const columnWidths = (isSizeRender)
            ? this.state.defColumnWidths
            : this.state.columnWidths;

        const getRowKey = this.props.getRowKey || ((i) => i);
        const cells = [];
        for (let colIndex = 0; colIndex < columns.length; ++colIndex) {
            const column = columns[colIndex];
            let cell = onRenderCell({
                rowIndex: rowIndex, 
                columnIndex: colIndex, 
                column: column,
                isSizeRender: isSizeRender,
            });

            let cellClassName = 'RowTableCell RowTableRowCell';

            if (column.cellClassExtras) {
                cellClassName += ' ' + column.cellClassExtras;
            }

            let style;
            const width = columnWidths[colIndex];
            if (width !== undefined) {
                // Setting both minWidth and maxWidth to the desired width
                // forces flexbox to use the width...
                style = {
                    maxWidth: width,
                    minWidth: width,
                };
            }

            let ref;
            if (sizeRenderRefs) {
                ref = sizeRenderRefs.columnRefs[colIndex].bodyCellRef;
            }

            if (this.props.onMoveColumn) {
                cell = <RowTableColumnMoverCell>{cell}</RowTableColumnMoverCell>;
            }

            if (this.props.onSetColumnWidth && ((colIndex + 1) < columns.length)) {
                cell = <RowTableColumnResizerCell>{cell}</RowTableColumnResizerCell>;
            }

            cell = <div className = {cellClassName}
                style = {style}
                key = {colIndex}
                ref = {ref}
                onClick = {(e) => 
                    this.onRowClick(e, rowIndex, colIndex)}
                onDoubleClick = {(e) => 
                    this.onRowDoubleClick(e, rowIndex, colIndex)}
            >
                {cell}
            </div>;

            cells.push(cell);
        }

        let rowClassName = 'RowTableRow';
        if (rowIndex === activeRowIndex) {
            rowClassName += ' table-active';
        }
        if (rowClassExtras) {
            rowClassName += ' ' + rowClassExtras;
        }
        if (isSizeRender) {
            rowClassName += ' ' + 'Visibility-hidden';
        }

        let style;
        let ref;
        if (isSizeRender) {
            ref = this._bodyRowRef;
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
            {cells}
        </div>;
    }


    renderBody() {
        const {
            bodyClassExtras,
            rowCount,
        } = this.props;

        const { topVisibleRow, bottomVisibleRow } = this.state;
        const { 
            isSizeRender,
            bodyHeight, 
            bodyWidth,
            bodyRowHeight,
        } = this.state;
        
        const firstRow = Math.max(Math.floor(topVisibleRow), 0);
        const lastRow = (isSizeRender) 
            ? firstRow 
            : Math.min(Math.ceil(bottomVisibleRow), rowCount - 1);

        const rows = [];
        if (isSizeRender || (topVisibleRow >= 0)) {
            for (let rowIndex = firstRow; rowIndex <= lastRow; ++rowIndex) {
                const row = this.renderRow(rowIndex);
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

        if (!isSizeRender) {
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
        else {
            bodyClassName += ' Visibility-hidden';
        }

        /*
        console.log({
            renderCount: ++this._renderCount,
            isSizeRender: isSizeRender,
            topVisibleRow: topVisibleRow,
            bottomVisibleRow: bottomVisibleRow,
            rowCount: this.props.rowCount,
        })
        */

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


    renderAll(style) {
        const {
            classExtras
        } = this.props;

        const header = this.renderHeader();
        const body = this.renderBody();
        const footer = this.renderFooter();

        let className = 'table RowTable';
        if (classExtras) {
            className += ' ' + classExtras;
        }


        const { state } = this;

        const trackingBar = <RowTableColumnDraggerTracker
            classExtras = {state.trackingClassExtras}
            width = {state.trackingWidth}
            pageX = {state.pageX}
            show = {state.isColumnResizeTracking || state.isColumnMoveTracking}
        />;

        return <div className = {className}
            style = {style}
        >
            {header}
            {body}
            {footer}
            {trackingBar}
        </div>;
    }


    render() {
        const regularRender = this.renderAll();

        // The context menu needs to be included in the sizing rendering...
        const contextMenu = this.renderContextMenu();

        const containerStyle = {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
        };
        return <div style = {containerStyle}
            ref = {this._mainRef}
            onContextMenu={(e) => this.onContextMenu(e)}
        >
            <div
            >
                {regularRender}
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
 * @typedef {object} RowTable~onMoveColumnArgs
 * @property {number} originalColumnIndex
 * @property {number} newColumnIndex
 * @property {RowTable~Column}  column
 */

/**
 * @callback RowTable~onMoveColumn
 * @param {RowTable~onMoveColumnArgs} args
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
    onMoveColumn: PropTypes.func,

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

    id: PropTypes.string,
};
