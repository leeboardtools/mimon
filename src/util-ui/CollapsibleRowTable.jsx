import React from 'react';
import PropTypes from 'prop-types';
import { RowTable } from './RowTable';
import deepEqual from 'deep-equal';



/**
 * Helper that looks for the {@link CollapsibleRowTable~RowInfo} with
 * a given key.
 * @param {CollapsibleRowTable~RowInfo[]}    rowInfos
 * @param {*} key 
 * @returns {CollapsibleRowTable~RowInfo|undefined}
 */
export function findRowInfoWithKey(rowInfos, key) {
    for (let i = 0; i < rowInfos.length; ++i) {
        const rowInfo = rowInfos[i];
        if (rowInfo.key === key) {
            return rowInfo;
        }
        
        const { childRowInfos } = rowInfo;
        if (childRowInfos) {
            const foundRowInfo = findRowInfoWithKey(childRowInfos,
                key);
            if (foundRowInfo) {
                return foundRowInfo;
            }
        }
    }
}


/**
 * Updates an individual row info within a row info tree.
 * @param {CollapsibleRowTable~RowInfo[]}    rowInfos
 * @param {CollapsibleRowTable~RowInfo} updatedRowInfo 
 * @returns {CollapsibleRowTable~RowInfo[]}
 */
export function updateRowInfo(rowInfos, updatedRowInfo) {
    for (let i = 0; i < rowInfos.length; ++i) {
        let rowInfo = rowInfos[i];
        if (rowInfo.key === updatedRowInfo.key) {
            if (!deepEqual(rowInfo, updatedRowInfo)) {
                const rowInfosCopy = Array.from(rowInfos);
                rowInfosCopy[i] = updatedRowInfo;
                return rowInfosCopy;
            }
            else {
                // No change...
                return rowInfos;
            }
        }

        if (rowInfo.childRowInfos) {
            const childRowInfos = updateRowInfo(
                rowInfo.childRowInfos, updatedRowInfo);
            if (childRowInfos !== rowInfo.childRowInfos) {
                const rowInfosCopy = Array.from(rowInfos);
                rowInfosCopy[i] = Object.assign({}, rowInfo, {
                    childRowInfos: childRowInfos,
                });
                return rowInfosCopy;
            }
        }
    }
    return rowInfos;
}


/**
 * Flattens out a row infos tree into an array.
 * Items that are not expanded do not have their children added.
 * @param {CollapsibleRowTable~RowInfo[]} rowInfos 
 * @param {Set} [keysToIgnore=undefined]    If defined, a set containing
 * the keys that should not be added. These keys and any of their children
 * are not added.
 * @returns {CollapsibleRowTable~RowInfo[]}
 */
export function rowInfosTreeToArray(rowInfos, keysToIgnore) {
    const rowInfosArray = [];
    addRowInfosToArray(rowInfos, rowInfosArray, keysToIgnore);
    return rowInfosArray;
}

function addRowInfosToArray(rowInfos, rowInfosArray, keysToIgnore) {
    for (let i = 0; i < rowInfos.length; ++i) {
        const rowInfo = rowInfos[i];
        if (keysToIgnore) {
            if (keysToIgnore.has(rowInfo.key)) {
                continue;
            }
        }

        rowInfosArray.push(rowInfo);

        if (rowInfo.expandCollapseState === ExpandCollapseState.EXPANDED) {
            if (rowInfo.childRowInfos) {
                addRowInfosToArray(rowInfo.childRowInfos, rowInfosArray);
            }
        }
    }
}


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


export function collapsibleRowTable(WrappedTable) {
    class _CollapsibleRowTable extends React.Component {
        constructor(props) {
            super(props);

            this.onActivateRow = this.onActivateRow.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onRenderCell = this.onRenderCell.bind(this);
            this._onRenderCellImpl = this._onRenderCellImpl.bind(this);
            
            this.getRowKey = this.getRowKey.bind(this);

            this.state = {
                activeRowIndex: undefined,
                maxDepth: 1,
                rowEntries: [],
                rowIndicesByKey: new Map(),
            };

            this.state = Object.assign(this.state, this.getStateUpdateForRowEntries());
        }


        getStateUpdateForRowEntries() {
            const { rowInfos } = this.props;
            const newRowEntries = [];
            const newRowIndicesByKey = new Map();

            const maxDepth = this.addRowInfosToEntries(rowInfos, 0, 
                newRowEntries, newRowIndicesByKey);
            
            return {
                rowEntries: newRowEntries,
                rowIndicesByKey: newRowIndicesByKey,
                activeRowIndex: newRowIndicesByKey.get(this.props.activeRowKey),
                maxDepth: Math.max(maxDepth, 1),
            };
        }


        updateRowEntries() {
            this.setState(this.getStateUpdateForRowEntries());
        }


        addRowInfosToEntries(rowInfos, depth, newRowEntries, newRowIndicesByKey) {
            let maxDepth = 0;
            rowInfos.forEach((rowInfo) => {
                const thisDepth = this.addRowInfoToEntries(rowInfo, depth, 
                    newRowEntries, newRowIndicesByKey);
                maxDepth = Math.max(maxDepth, thisDepth);
            });
            return maxDepth;
        }


        addRowInfoToEntries(rowInfo, depth, newRowEntries, newRowIndicesByKey) {
            const rowEntry = {
                rowInfo: rowInfo,
                depth: depth,
            };
            const rowIndex = newRowEntries.length;
            newRowEntries.push(rowEntry);
            newRowIndicesByKey.set(rowInfo.key, rowIndex);

            if (rowInfo.expandCollapseState === ExpandCollapseState.EXPANDED) {
                if (rowInfo.childRowInfos) {
                    return this.addRowInfosToEntries(rowInfo.childRowInfos, depth + 1,
                        newRowEntries, newRowIndicesByKey);
                }
            }
            
            return depth;
        }


        getRowKey(rowIndex) {
            return this.state.rowEntries[rowIndex].rowInfo.key;
        }


        componentDidUpdate(prevProps, prevState) {
            const { props } = this;

            if (!deepEqual(props.rowInfos, prevProps.rowInfos)) {
                this.updateRowEntries();
            }
            else if (!deepEqual(props.activeRowKey, prevProps.activeRowKey)) {
                this.setState((state) => {
                    return {
                        activeRowIndex: state.rowIndicesByKey.get(props.activeRowKey),
                    };
                });
            }
        }


        onActivateRow(rowIndex) {
            const { onActivateRow } = this.props;
            if (onActivateRow) {
                const rowEntry = this.state.rowEntries[rowIndex];
                let rowInfo;
                if (rowEntry) {
                    rowInfo = rowEntry.rowInfo;
                }

                onActivateRow({
                    rowIndex: rowIndex,
                    rowInfo: rowInfo,
                });
            }
        }


        onKeyDown(e) {
            const { onExpandCollapseRow } = this.props;
            const { activeRowIndex } = this.state;

            if ((activeRowIndex !== undefined) && onExpandCollapseRow) {
                const rowEntry = this.state.rowEntries[activeRowIndex];
                const rowInfo = rowEntry.rowInfo;
                let newState;

                switch (rowInfo.expandCollapseState) {
                case ExpandCollapseState.EXPANDED :
                    newState = ExpandCollapseState.COLLAPSED;
                    break;
                
                case ExpandCollapseState.COLLAPSED :
                    newState = ExpandCollapseState.EXPANDED;
                    break;
                }

                switch (e.key) {
                case ' ' :
                    if (newState) {
                        onExpandCollapseRow({
                            rowIndex: activeRowIndex,
                            rowInfo: rowInfo,
                            expandCollapseState: newState,
                        });
                    }
                    e.preventDefault();
                    break;
                }
            }
        }


        _onRenderCellImpl(args, onRenderCell) {
            args = Object.assign({}, args);

            const rowEntry = this.state.rowEntries[args.rowIndex];
            args.rowInfo = rowEntry.rowInfo;
            args.depth = rowEntry.depth;
            let cell = onRenderCell(args);

            if (!args.columnIndex) {
                const buttonStyle = {
                    width: this.state.maxDepth + 'rem',
                    paddingLeft: rowEntry.depth + 'rem',
                };

                const cellStyle = {
                    paddingLeft: buttonStyle.paddingLeft,
                };

                let button;
                const { onExpandCollapseRow } = this.props;
                if (onExpandCollapseRow) {
                    let buttonText;
                    let newState;
                    switch (rowEntry.rowInfo.expandCollapseState) {
                    case ExpandCollapseState.EXPANDED :
                        buttonText = '-';
                        newState = ExpandCollapseState.COLLAPSED;
                        break;
                    
                    case ExpandCollapseState.COLLAPSED :
                        buttonText = '+';
                        newState = ExpandCollapseState.EXPANDED;
                        break;
                    }
    
                    if (buttonText) {
                        button = <button type="button"
                            className = "CollapsibleRowTable-expand-collapse-button"
                            tabIndex = "-1"
                            onClick = {() => {
                                onExpandCollapseRow({
                                    rowIndex: args.rowIndex,
                                    rowInfo: rowEntry.rowInfo,
                                    expandCollapseState: newState,
                                });
                            }}
                        >{buttonText}</button>;
                    }
                }

                cell = <div className = "CollapsibleRowTable-expand-collapse-container">
                    <div style = {buttonStyle}>
                        {button}
                    </div>
                    <div style = {cellStyle}>
                        {cell}
                    </div>
                </div>;
            }
            
            return cell;
        }


        onRenderCell(args) {
            return this._onRenderCellImpl(args, this.props.onRenderCell);
        }


        render() {
            const {
                onActivateRow,
                onKeyDown,
                onRenderCell,
                ...passThroughProps
            } = this.props;

            onActivateRow,
            onKeyDown;
            
            let onOuterRenderCell;
            if (!onRenderCell) {
                // Presume the wrapped table is something like EditableRowTable
                onOuterRenderCell = this._onRenderCellImpl;
            }

            return <WrappedTable
                {...passThroughProps}

                rowCount = {this.state.rowEntries.length}
                requestedVisibleRowIndex = {this.state.activeRowIndex}
                activeRowIndex = {this.state.activeRowIndex}
                onActivateRow = {this.onActivateRow}
                onKeyDown = {this.onKeyDown}
                onRenderCell = {this.onRenderCell}
                onOuterRenderCell = {onOuterRenderCell}
                getRowKey = {this.getRowKey}
            >

            </WrappedTable>;
        }
        

        /**
         * Retrieves the {@link CollapsibleRowTable~RowInfo} for a given row index.
         * @param {number} rowIndex 
         * @returns {CollapsibleRowTable~RowInfo}
         */
        getRowInfoForIndex(rowIndex) {
            const rowEntry = this.state.rowEntries[rowIndex];
            return (rowEntry) ? rowEntry.rowInfo : undefined;
        }

        /**
         * Retrieves the row index of the row info with a given key.
         * @param {*} key 
         * @returns {number}
         */
        getRowIndexForInfoKey(key) {
            return this.state.rowIndicesByKey.get(key);
        }
    }


    /**
     * @typedef {object} CollapsibleRowTable~onRenderCellArgs
     * Extends {@link RowTable~onRenderCellArgs} with the following:
     * @property {CollapsbileRowTable~RowInfo}  rowInfo
     */


    /**
     * Callback for rendering cells. See {@link RowTable~onRenderCell}.
     * @callback CollapsbileRowTable~onRenderCell
     * @param {CollapsbileRowTable~onRenderCellArgs}   args
     */


    /**
     * @typedef {object}    CollapsibleRowTable~RowInfo
     * @property {*}    key
     * @property {ExpandCollapseState}  [expandCollapseState]
     * @property {CollapsbileRowTable~RowInfo[]}    [childRowInfos]
     */

    
    /**
     * @typedef {object} CollapsibleRowTable~onExpandCollapseRowArgs
     * @property {number}   rowIndex
     * @property {CollapsibleRowTable~RowInfo}  rowInfo
     * @property {ExpandCollapseState} expandCollapseState
     */


    /**
     * @callback CollapsibleRowTable~onExpandCollapseRow
     * @param {CollapsibleRowTable~onExpandCollapseRowArgs} args
     */


    /**
     * @typedef {object}    CollapsibleRowTable~onActivateRowArgs
     * @property {number}   rowIndex
     * @property {CollapsibleRowTable~RowInfo}  rowInfo
     */

    /**
     * @callback {CollapsibleRowTable~onActivateRow}
     * @param {CollapsibleRowTable~onActivateRowArgs}   args
     */


    /**
     * @typedef {object}    CollapsibleRowTable~propTypes
     * @property {CollapsibleRowTable~RowInfo[]}    rowInfos
     * @property {CollapsibleRowTable~onExpandCollapseRow}  onExpandCollapseRow
     * @property {*}    [activeRowKey]
     * @property {CollapsibleRowTable~onActivateRow}    onActivateRow
     * 
     * @property {RowTable~Column[]}    columns Array of the column definitions.
     * @property {CollapsbileRowTable~onRenderCell} onRenderCell Replacement for
     * {@link RowTable}'s onRenderCell.
     * @property {RowTable~onKeyDown}   [onKeyDown] Optional hook for key down events.
     * 
     */
    _CollapsibleRowTable.propTypes = {
        rowInfos: PropTypes.array.isRequired,
        onExpandCollapseRow: PropTypes.func.isRequired,

        activeRowKey:   PropTypes.any,
        onActivateRow: PropTypes.func,

        // From RowTable...
        columns: PropTypes.array.isRequired,
        onRenderCell: PropTypes.func,
        onKeyDown: PropTypes.func,

    };

    return _CollapsibleRowTable;
}

export const CollapsibleRowTable = collapsibleRowTable(RowTable);
