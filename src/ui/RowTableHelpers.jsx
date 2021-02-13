import { userMsg } from '../util/UserMessages';
import * as CI from '../util-ui/ColumnInfo';
import { dataDeepCopy } from '../util/DataDeepCopy';
import deepEqual from 'deep-equal';


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
     * @callback RowTableHandler~getState
     * Callback for retrieving a state object for a given state id.
     * @param {string} stateId
     * @returns {object}
     */

    /**
     * @callback RowTableHandler~setState
     * Callback for updating the state object for a given state id.
     * @param {string} stateId
     * @param {*} changes Changes to the state object, normally this should be
     * treated as newState = Object.assign({}, oldState, changes)
     */

    /**
     * @callback RowTableHandler~setProjectSettings
     * Callback for updating the project settings.
     * @param {string} projectSettingsId The project settings id, this is either
     * the projectSettingsId property from the state object if the state object
     * has one, or the state id.
     * @param {object} changes The changes to be made to the project settings.
     * @param {string} actionLabel The label for the action.
     */

    /**
     * @callback RowTableHandler~updateStateFromModifiedProjectSettings
     * Optional handler method for performing additional state updating
     * when the project settings are modified.
     * @param {string} stateId
     * @param {object} newState
     * @param {*} projectSettings
     */

    /**
     * @typedef {object} RowTableHandler~props
     * @property {RowTableHandler~getState} getState
     * @property {RowTableHandler~setState} setState
     * @property {RowTableHandler~setProjectSettings} setProjectSettings
     * @property {RowTableHandler~updateStateFromModifiedProjectSettings} 
     * [setProjectSettings]
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
        this.updateStateFromModifiedProjectSettings
            = props.updateStateFromModifiedProjectSettings;

        this._onProjectSettingsModified 
            = this._onProjectSettingsModified.bind(this);

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



    _setupNewStateFromSettings(newState, settings) {
        const { columns } = newState;

        newState.defaultColumnStates = columnStatesFromColumns(columns);
        if (settings.columnStates) {
            updateColumnsFromColumnStates(columns, settings.columnStates,
                newState.defaultColumnStates);
        }

        return newState;
    }


    _onProjectSettingsModified(stateId, projectSettingsId, 
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
        this._setupNewStateFromSettings(tabEntry, settings);

        tabEntry.rowTableHelpers = {
            onCloseTab: tabEntry.onCloseTab,
            // We use a separate function for each tabEntry so the listeners are unique.
            onTabIdProjectSettingsModify: (projectSettingsId, 
                projectSettings, originalChanges) => {
                this._onProjectSettingsModified(
                    tabEntry.tabId, projectSettingsId, projectSettings, originalChanges);
            },
        };
        tabEntry.onCloseTab = this.onCloseTab;

        this._handler.on('tabIdProjectSettingsModify', 
            tabEntry.rowTableHelpers.onTabIdProjectSettingsModify);

        return tabEntry;
    }

}


/**
 * Row handler that directly interacts with {@link EngineAccessor} for
 * saving the column to project settings.
 * <p>
 * This is normally used by the modal pages.
 */
export class AccessorRowTableHandler extends RowTableHandler {


    /**
     * @typedef {object} AccessorRowTableHandler~props
     * {@link RowTableHandler~props} with the following:
     * @property {EngineAccessor} accessor
     */

    /**
     * Constructor.
     * @param {AccessorRowTableHandler~props} props 
     */
    constructor(props) {
        super(props);

        this._accessor = props.accessor;

        this._onModifyProjectSettings = this._onModifyProjectSettings.bind(this);
        this.setProjectSettings = this.setProjectSettings 
            || this._setProjectSettings.bind(this);

        this._stateIds = new Set();

        this.props.accessor.on('modifyProjectSettings', this._onModifyProjectSettings);
    }


    /**
     * Call from the React component's componentWillUnmount()
     */
    shutdownHandler() {
        this.props.accessor.off('modifyProjectSettings', this._onModifyProjectSettings);

        this.props = undefined;
        this._accessor = undefined;
    }


    makeBaseChangesPath() {
        const { projectSettingsPath } = this.props;

        if (projectSettingsPath) {
            return (Array.isArray(projectSettingsPath))
                ? projectSettingsPath
                : [projectSettingsPath];
        }
        return [];
    }


    _setProjectSettings(stateId, projectSettings, actionName) {
        const { accessor, } = this.props;

        let changesPath = this.makeBaseChangesPath();
        if (stateId) {
            changesPath = changesPath.concat(stateId);
        }

        const action = accessor.createModifyProjectSettingsAction({
            name: actionName,
            changes: projectSettings,
            changesPath: changesPath,
            assignChanges: true,
        });

        process.nextTick(async () => {
            try {
                await accessor.asyncApplyAction(action);
            }
            catch (e) {
                // FIX ME!!!
                console.log('Could not save project settings: ' + e);
            }
        });
    }

    
    _onModifyProjectSettings(result) {
        const { originalAction } = result;
        if (!originalAction) {
            return;
        }

        const baseChangesPath = this.makeBaseChangesPath();

        const { changes, changesPath } = originalAction;
        if (!changesPath || !changesPath.length) {
            return;
        }

        let pathIndex = 0;
        if (baseChangesPath.length) {
            if (changesPath.length <= baseChangesPath.length) {
                return;
            }
            for (let i = 0; i < baseChangesPath.length; ++i) {
                if (changesPath[i] !== baseChangesPath[i]) {
                    return;
                }
            }

            pathIndex = baseChangesPath.length;
        }

        // Look for a matching state id...
        const stateId = changesPath[pathIndex];
        if (!this._stateIds.has(stateId)) {
            return;
        }


        let currentSettings = this.props.accessor.getProjectSettings(
            changesPath
        );
        
        if (!deepEqual(changes, currentSettings)
            && !Array.isArray(changes) && !Array.isArray(currentSettings)) {
            // Make sure currentSettings has the same set of properties as
            // changes, this way any changes that were added will be available
            // for removal.
            currentSettings = Object.assign({}, currentSettings);
            for (const name in changes) {
                if (!Object.prototype.hasOwnProperty.call(currentSettings, name)) {
                    if (Array.isArray(changes[name])) {
                        currentSettings[name] = [];
                    }
                    else {
                        currentSettings[name] = undefined;
                    }
                }
            }
        }

        this._onProjectSettingsModified(stateId, currentSettings, changes);
    }


    /**
     * Call to initialize a state object.
     * @param {*} stateId Set to <code>untitled</code> if individual state objects are
     * not needed for the handler.
     * @param {*} newState The state object to initialize.
     * @param {*} settings The project settings to load from.
     */
    setupNewStateFromSettings(stateId, newState, settings) {
        this._setupNewStateFromSettings(newState, settings);
        this._stateIds.add(stateId);

        return newState;
    }


    /**
     * If state ids were passed to 
     * {@link AccessorRowTableHandler#setupNewStateFromSettings} this should be called
     * when the state id is no longer in use.
     * @param {*} stateId 
     */
    shutdownState(stateId) {
        this._stateIds.delete(stateId);
    }
}