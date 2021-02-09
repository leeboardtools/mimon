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
 */
export class RowTableHandler {

    /**
     * @callback RowTableHandler~updateStateFromModifiedProjectSettings
     * Optional handler method for performing additional state updating
     * when the project settings are modified.
     * @param {string} stateId
     * @param {object} newState
     * @param {*} projectSettings
     */


    /**
     * Constructor.
     * @param {RowTableHandler~props} props 
     */
    constructor(props) {
        this.props = props;

        this.getState = props.getState;
        this.setState = props.setState;
        this.setProjectSettings = props.setProjectSettings;

        this.onProjectSettingsModified 
            = this.onProjectSettingsModified.bind(this);

        this.onSetColumnWidth = this.onSetColumnWidth.bind(this);
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


    _onToggleColumn(stateId, columnName) {
        const state = this.getState(stateId);

        const columns = Array.from(state.columns);

        const index = CI.getIndexOfColumnWithKey(columns, columnName);
        if (index >= 0) {
            const column = Object.assign({}, columns[index]);
            column.isVisible = !column.isVisible;
            columns[index] = column;

            const newState = Object.assign({}, state, {
                columns: columns,
            });

            this.setState(stateId, newState);

            const columnStates = columnStatesFromColumns(columns);

            let actionNameId = (column.isVisible)
                ? 'RowTableHandler-action_showColumn'
                : 'RowTableHandler-action_hideColumn';
            const actionName = userMsg(actionNameId,
                this.getColumnLabel(columns, columnName)
            );

            const projectSettingsId = state.projectSettingsId || stateId;
            this.setProjectSettings(projectSettingsId, 
                {
                    columnStates: columnStates,
                },
                actionName);
        }
    }

    _createToggleColumnMenuItem(stateId, columns, name) {
        return { id: 'toggleColumn_' + name,
            label: this.getColumnLabel(columns, name),
            checked: CI.getColumnWithKey(columns, name).isVisible,
            onChooseItem: () => this._onToggleColumn(
                stateId, name),
        };
    }


    /**
     * Creates an array of menu items for toggling columns on or off.
     * @param {string} stateId 
     * @param {RowTable~Column[]} columns 
     * @returns {MenuList~Item[]}
     */
    createToggleColumnMenuItems(stateId, columns) {
        const toggleColumnsMenuItems = [];
        columns.map((column) => {
            toggleColumnsMenuItems.push(
                this._createToggleColumnMenuItem(
                    stateId, columns, column.key)
            );
        });

        return toggleColumnsMenuItems;
    }


    /**
     * Creates a menu item for resetting all the column widths.
     * @param {string} stateId 
     * @returns {MenuList~Item}
     */
    createResetColumnWidthsMenuItem(stateId, state) {
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
                stateId),
        };
    }

    _onResetColumnWidths(stateId) {
        const state = this.getState(stateId);

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


        this.setState(stateId, newState);

        const columnStates = columnStatesFromColumns(columns);

        const actionName = userMsg('RowTableHandler-action_resetColumnWidth');

        const projectSettingsId = state.projectSettingsId || stateId;
        this.setProjectSettings(projectSettingsId, 
            {
                columnStates: columnStates,
            },
            actionName);
    }



    /**
     * @param {*} newState 
     * @param {*} settings 
     */
    setupNewStateFromSettings(newState, settings) {
        const { columns } = newState;

        newState.defaultColumnStates = columnStatesFromColumns(columns);
        if (settings.columnStates) {
            updateColumnsFromColumnStates(columns, settings.columnStates,
                newState.defaultColumnStates);
        }

        return newState;
    }


    onProjectSettingsModified(stateId, projectSettingsId, 
        projectSettings, originalChanges) {

        const state = this.getState(stateId);

        if (state.projectSettingsId) {
            if (state.projectSettingsId !== projectSettingsId) {
                return;
            }
        }
        else if (stateId !== projectSettingsId) {
            return;
        }

        let newState;
        if (projectSettings.columnStates || originalChanges.columnStates) {
            newState = Object.assign({}, state);
            newState.columns = dataDeepCopy(newState.columns);

            updateColumnsFromColumnStates(newState.columns, 
                projectSettings.columnStates,
                state.defaultColumnStates);
        }
        else {
            newState = Object.assign({}, state, projectSettings);
        }

        const { updateStateFromModifiedProjectSettings } = this;
        if (updateStateFromModifiedProjectSettings) {
            updateStateFromModifiedProjectSettings(stateId, newState, projectSettings);
        }

        this.setState(stateId, newState);
    }


    /**
     * The {@link RowTable~onSetColumnWidth} for the {@link RowTable}'s
     * onSetColumnWidth property.
     * @param {string} stateId 
     * @param {RowTable~onSetColumnWidthArgs} args 
     */
    onSetColumnWidth(stateId, args) {
        const state = this.getState(stateId);

        const { columnWidth, columnIndex } = args;

        const columns = Array.from(state.columns);

        const newColumn = Object.assign({}, columns[columnIndex], {
            width: columnWidth,
        });
        columns[columnIndex] = newColumn;

        const newState = Object.assign({}, state, {
            columns: columns,
        });

        this.setState(stateId, newState);

        const columnStates = columnStatesFromColumns(columns);

        const actionName = userMsg('RowTableHandler-action_setColumnWidth',
            this.getColumnLabel(columns, newColumn.key)
        );

        const projectSettingsId = state.projectSettingsId || stateId;
        this.setProjectSettings(projectSettingsId, 
            {
                columnStates: columnStates,
            },
            actionName);
    }
}


/**
 * Handler for use by the tab id based main window handler implementations that support
 * {@link RowTable}s.
 * <p>
 * The main window handler implementations normally implement the following methods:
 * <li>getTabDropdownInfo 
 * <p>
 * The main window handler implementation may optionally implement the following
 * methods:
 * <li>updateStateFromModifiedProjectSettings
 * <p>
 * TabIdRowTableHandler's constructor should be called AFTER the main window handler
 * binds any methods.
 * <p>
 * {@link TabIdRowTableHandler#shutdownHandler} should be called from the main window
 * handler's shutdownHandler() method.
 * <p>
 * Normally the project settings are stored using the tabId. This can be overridden
 * by adding a projectSettingsId property with the desired id to the tab state.
 */
export class TabIdRowTableHandler extends RowTableHandler {

    /**
     * @callback TabIdRowTableHandler~getTabDropdownInfo
     * Handler method for updating the tab's dropdown info.
     * @param {string} tabId
     * @param {object} newState
     */

    /**
     * @callback TabIdRowTableHandler~updateStateFromModifiedProjectSettings
     * Optional handler method for performing additional tab id state updating
     * when the project settings are modified.
     * @param {string} tabId
     * @param {object} newState
     * @param {*} projectSettings
     */

    /**
     * @typedef {MainWindowHandlerBase} TabIdRowTableHandler~MainWindowHandler
     * @property {TabIdRowTableHandler~getTabDropdownInfo} getTabDropdownInfo
     * @property {TabIdRowTableHandler~updateStateFromModifiedProjectSettings}
     *  [updateStateFromModifiedProjectSettings]
     */

    /**
     * @typedef {object} TabIdRowTableHandler~props
     * @property {TabIdRowTableHandler~MainWindowHandler} mainWindowHandler The 
     * main window handler that's using this.
     */

    /**
     * Constructor.
     * @param {TabIdRowTableHandler~props} props 
     */
    constructor(props) {
        super(props);

        this.props = props;

        const handler = props.mainWindowHandler;
        this._handler = handler;

        this.getState = handler.getTabIdState;
        this.setState = this._setState.bind(this);
        this.setProjectSettings = handler.setTabIdProjectSettings;


        this.getTabIdState = handler.getTabIdState;
        this.setTabIdState = handler.setTabIdState;
        this.setTabIdProjectSettings = handler.setTabIdProjectSettings;

        this.getTabDropdownInfo = handler.getTabDropdownInfo;

        this._onCloseTab = this._onCloseTab.bind(this);
    }

    /**
     * Call from the main window handler.
     */
    shutdownHandler() {
        this._handler = undefined;
    }


    _setState(tabId, newState) {
        if (this.getTabDropdownInfo) {
            newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);
        }
        this.setTabIdState(tabId, newState);
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
        this.setupNewStateFromSettings(tabEntry, settings);

        tabEntry.rowTableHelpers = {
            onCloseTab: tabEntry.onCloseTab,
            // We use a separate function for each tabEntry so the listeners are unique.
            onTabIdProjectSettingsModify: (projectSettingsId, 
                projectSettings, originalChanges) => {
                this.onProjectSettingsModified(
                    tabEntry.tabId, projectSettingsId, projectSettings, originalChanges);
            },
        };
        tabEntry.onCloseTab = this.onCloseTab;

        this._handler.on('tabIdProjectSettingsModify', 
            tabEntry.rowTableHelpers.onTabIdProjectSettingsModify);

        return tabEntry;
    }

}