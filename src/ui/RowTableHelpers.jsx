import { userMsg } from '../util/UserMessages';
import * as CI from '../util-ui/ColumnInfo';
import { dataDeepCopy } from '../util/DataDeepCopy';


function updateColumnsFromColumnStates(columns, columnStates, defaultColumnStates) {
    columns.forEach((column) => {
        const { key } = column;
        const columnState = (columnStates ? columnStates[key] : undefined)
            || (defaultColumnStates ? defaultColumnStates[key] : undefined);
        if (columnState) {
            column.isVisible = columnState.isVisible;
            column.width = columnState.width;
        }
    });
}


function columnStatesFromColumns(columns) {
    const columnStates = {};
    columns.forEach((column) => {
        columnStates[column.key] = {
            isVisible: column.isVisible,
            width: column.width,
        };
    });
    return columnStates;
}


/**
 * Handler for use by main window handler implementations that support
 * {@link RowTable}s.
 * <p>
 * The main window handler implementation must implement the following methods:
 * <li>getTabDropdownInfo 
 * <p>
 * The main window handler implementation may optionally implement the following
 * methods:
 * <li>updateStateFromModifiedProjectSettings
 * <p>
 * RowTableHandler's constructor should be called AFTER the main window handler
 * binds any methods.
 * <p>
 * {@link RowTableHandler#shutdownHandler} should be called from the main window
 * handler's shutdownHandler() method.
 * <p>
 * Normally the project settings are stored using the tabId. This can be overridden
 * by adding a projectSettingsId property with the desired id to the tab state.
 */
export class RowTableHandler {

    /**
     * @callback RowTableHandler~getTabDropdownInfo
     * Handler method for updating the tab's dropdown info.
     * @param {string} tabId
     * @param {object} newState
     */

    /**
     * @callback RowTableHandler~updateStateFromModifiedProjectSettings
     * Optional handler method for performing additional tab id state updating
     * when the project settings are modified.
     * @param {string} tabId
     * @param {object} newState
     * @param {*} projectSettings
     */

    /**
     * @typedef {MainWindowHandlerBase} RowTableHandler~MainWindowHandler
     * @property {RowTableHandler~getTabDropdownInfo} getTabDropdownInfo
     * @property {RowTableHandler~updateStateFromModifiedProjectSettings}
     *  [updateStateFromModifiedProjectSettings]
     */

    /**
     * @typedef {object} RowTableHandler~props
     * @property {RowTableHandler~MainWindowHandler} mainWindowHandler The 
     * main window handler that's using this.
     */

    /**
     * Constructor.
     * @param {RowTableHandler~props} props 
     */
    constructor(props) {
        this.props = props;

        const handler = props.mainWindowHandler;
        this._handler = handler;

        this.getTabIdState = handler.getTabIdState;
        this.setTabIdState = handler.setTabIdState;
        this.setTabIdProjectSettings = handler.setTabIdProjectSettings;

        this.getTabDropdownInfo = handler.getTabDropdownInfo;

        this._onCloseTab = this._onCloseTab.bind(this);
        this._onTabIdProjectSettingsModified 
            = this._onTabIdProjectSettingsModified.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);

    }

    /**
     * Call from the main window handler.
     */
    shutdownHandler() {
        this._handler = undefined;
    }


    getColumnLabel(columns, columnName) {
        const column = CI.getColumnWithKey(columns, columnName);
        const { header } = column;
        if (header && header.label) {
            return header.label;
        }

        const { footer } = column;
        if (footer && footer.label) {
            return footer.label;
        }

        const { userIdBase } = this.props;
        if (userIdBase) {
            return userMsg(userIdBase + '-col_' + columnName);
        }
    }


    _onToggleColumn(tabId, columnName) {
        const state = this.getTabIdState(tabId);
        const columns = Array.from(state.columns);

        const index = CI.getIndexOfColumnWithKey(columns, columnName);
        if (index >= 0) {
            const column = Object.assign({}, columns[index]);
            column.isVisible = !column.isVisible;
            columns[index] = column;

            const newState = Object.assign({}, state, {
                columns: columns,
            });
            newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

            this.setTabIdState(tabId, newState);

            const columnStates = columnStatesFromColumns(columns);

            let actionNameId = (column.isVisible)
                ? 'RowTableHandler-action_showColumn'
                : 'RowTableHandler-action_hideColumn';
            const actionName = userMsg(actionNameId,
                this.getColumnLabel(columns, columnName)
            );

            const projectSettingsId = state.projectSettingsId || tabId;
            this.setTabIdProjectSettings(projectSettingsId, 
                {
                    columnStates: columnStates,
                },
                actionName);
        }
    }

    _createToggleColumnMenuItem(tabId, columns, name) {
        return { id: 'toggleColumn_' + name,
            label: this.getColumnLabel(columns, name),
            checked: CI.getColumnWithKey(columns, name).isVisible,
            onChooseItem: () => this._onToggleColumn(
                tabId, name),
        };
    }


    /**
     * Creates an array of menu items for toggling columns on or off.
     * @param {string} tabId 
     * @param {RowTable~Column[]} columns 
     * @returns {MenuList~Item[]}
     */
    createToggleColumnMenuItems(tabId, columns) {
        const toggleColumnsMenuItems = [];
        columns.map((column) => {
            toggleColumnsMenuItems.push(
                this._createToggleColumnMenuItem(
                    tabId, columns, column.key)
            );
        });

        return toggleColumnsMenuItems;
    }


    /**
     * Creates a menu item for resetting all the column widths.
     * @param {string} tabId 
     * @returns {MenuList~Item}
     */
    createResetColumnWidthsMenuItem(tabId, state) {
        let disabled = true;
        const { columns, defaultColumnStates } = state;
        if (columns) {
            for (let i = 0; i < columns.length; ++i) {
                const column = columns[i];
                if (column.width !== undefined) {
                    if (defaultColumnStates && defaultColumnStates[column.key]) {
                        if (defaultColumnStates[column.key].width === column.width) {
                            continue;
                        }
                    }

                    disabled = false;
                    break;
                }
            }
        }
        
        return {
            id: 'resetColumnWidths',
            label: userMsg('RowTableHandler-resetColumnWidth'),
            disabled: disabled,
            onChooseItem: () => this._onResetColumnWidths(
                tabId),
        };
    }

    _onResetColumnWidths(tabId) {
        const state = this.getTabIdState(tabId);
        const columns = Array.from(state.columns);

        const { defaultColumnStates } = state;

        for (let i = 0; i < columns.length; ++i) {
            let column = columns[i];

            const { key } = column;
            let defaultWidth;
            if (defaultColumnStates && defaultColumnStates[key]) {
                defaultWidth = defaultColumnStates[key].width;
            }

            if (defaultWidth !== column.width) {
                column = Object.assign({}, column);
                if (defaultWidth !== undefined) {
                    column.width = defaultWidth;
                }
                else {
                    delete column.width;
                }

                columns[i] = column;
            }
        }

        const newState = Object.assign({}, state, {
            columns: columns,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        const columnStates = columnStatesFromColumns(columns);

        const actionName = userMsg('RowTableHandler-action_resetColumnWidth');

        const projectSettingsId = state.projectSettingsId || tabId;
        this.setTabIdProjectSettings(projectSettingsId, 
            {
                columnStates: columnStates,
            },
            actionName);
    }


    _onCloseTab(tabId, tabEntry) {
        const { onTabIdProjectSettingsModify } = tabEntry.rowTableHelpers;
        if (onTabIdProjectSettingsModify) {
            this._handler.off('tabIdProjectSettingsModify', onTabIdProjectSettingsModify);
        }
    }


    /**
     * Normally called from the main window handler's createTabEntry after the columns
     * property has been set up with default values, sets up column stuff in a tab 
     * entry from settings.
     * @param {*} tabEntry 
     * @param {*} settings 
     */
    setupTabEntryFromSettings(tabEntry, settings) {
        const { columns } = tabEntry;

        tabEntry.defaultColumnStates = columnStatesFromColumns(columns);
        if (settings.columnStates) {
            updateColumnsFromColumnStates(columns, settings.columnStates,
                tabEntry.defaultColumnStates);
        }

        tabEntry.rowTableHelpers = {
            onCloseTab: tabEntry.onCloseTab,
            // We use a separate function for each tabEntry so the listeners are unique.
            onTabIdProjectSettingsModify: (projectSettingsId, 
                projectSettings, originalChanges) => {
                this._onTabIdProjectSettingsModified(
                    tabEntry.tabId, projectSettingsId, projectSettings, originalChanges);
            },
        };
        tabEntry.onCloseTab = this.onCloseTab;

        this._handler.on('tabIdProjectSettingsModify', 
            tabEntry.rowTableHelpers.onTabIdProjectSettingsModify);
        //tabEntry.onTabIdProjectSettingsModified = this._onTabIdProjectSettingsModified;

        return tabEntry;
    }


    _onTabIdProjectSettingsModified(tabId, projectSettingsId, 
        projectSettings, originalChanges) {
        const state = this.getTabIdState(tabId);

        if (state.projectSettingsId) {
            if (state.projectSettingsId !== projectSettingsId) {
                return;
            }
        }
        else if (tabId !== projectSettingsId) {
            return;
        }

        let newState;
        if (projectSettings.columnStates || originalChanges.columnStates) {
            newState = Object.assign({}, state);
            newState.columns = dataDeepCopy(newState.columns);

            updateColumnsFromColumnStates(newState.columns, 
                projectSettings.columnStates,
                state.defaultColumnStates);
            
            console.log({
                tabId: tabId,
                columnStates: projectSettings.columnStates,
                defaultColumnStates: state.defaultColumnStates,
            });
        }
        else {
            newState = Object.assign({}, state, projectSettings);
        }

        const { updateStateFromModifiedProjectSettings } = this._handler;
        if (updateStateFromModifiedProjectSettings) {
            updateStateFromModifiedProjectSettings(tabId, newState, projectSettings);
        }

        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);
    }


    /**
     * The {@link RowTable~onSetColumnWidth} for the {@link RowTable}'s
     * onSetColumnWidth property.
     * @param {string} tabId 
     * @param {RowTable~onSetColumnWidthArgs} args 
     */
    onSetColumnWidth(tabId, args) {
        const { columnWidth, columnIndex } = args;
        const state = this.getTabIdState(tabId);
        const columns = Array.from(state.columns);

        const newColumn = Object.assign({}, columns[columnIndex], {
            width: columnWidth,
        });
        columns[columnIndex] = newColumn;

        const newState = Object.assign({}, state, {
            columns: columns,
        });
        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);

        const columnStates = columnStatesFromColumns(columns);

        const actionName = userMsg('RowTableHandler-action_setColumnWidth',
            this.getColumnLabel(columns, newColumn.key)
        );

        const projectSettingsId = state.projectSettingsId || tabId;
        this.setTabIdProjectSettings(projectSettingsId, 
            {
                columnStates: columnStates,
            },
            actionName);
    }
}