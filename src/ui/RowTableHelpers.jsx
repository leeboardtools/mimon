import { userMsg } from '../util/UserMessages';
import * as CI from '../util-ui/ColumnInfo';
import { dataDeepCopy } from '../util/DataDeepCopy';


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
 */
export class RowTableHandler {
    constructor(props) {
        this.props = props;

        const handler = props.mainWindowHandler;
        this._handler = handler;

        this.getTabIdState = handler.getTabIdState;
        this.setTabIdState = handler.setTabIdState;
        this.setTabIdProjectSettings = handler.setTabIdProjectSettings;

        this.getTabDropdownInfo = handler.getTabDropdownInfo;

        this._onTabIdProjectSettingsModified 
            = this._onTabIdProjectSettingsModified.bind(this);


    }

    /**
     * Call from the main window handler.
     */
    shutdownHandler() {
        this._handler = undefined;
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

            const visibleColumns = CI.getVisibleColumnKeys(columns);

            let actionNameId = (column.isVisible)
                ? 'RowTableHandler-action_showColumn'
                : 'RowTableHandler-action_hideColumn';
            const actionName = userMsg(actionNameId,
                userMsg(this.props.userIdBase + '-col_' + columnName)
            );

            this.setTabIdProjectSettings(tabId, 
                {
                    visibleColumns: visibleColumns,
                },
                actionName);
        }
    }

    _createToggleColumnMenuItem(tabId, columns, name) {
        return { id: 'toggleColumn_' + name,
            label: userMsg(this.props.userIdBase + '-col_' + name),
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
     * Sets up column stuff in a tab entry from settings. The columns property must
     * already be set 
     * @param {*} tabEntry 
     * @param {*} settings 
     */
    setupTabEntryFromSettings(tabEntry, settings) {
        const { columns } = tabEntry;

        tabEntry.defaultVisibleColumns = CI.getVisibleColumnKeys(columns);
        CI.updateColumnsFromVisibleColumnList(columns,
            settings.visibleColumns);

        tabEntry.onTabIdProjectSettingsModified = this._onTabIdProjectSettingsModified;

        return tabEntry;
    }


    /**
     * Callback passed as the onTabIdProjectSettingsModified property of the
     * tab entry, used to sync up the updated project settings with the
     * tab id state. Automatically installed by 
     * {@link RowTableHandler#setupTabEntryFromSettings}.
     * @param {*} tabId 
     * @param {*} projectSettings 
     * @param {*} originalChanges 
     */
    _onTabIdProjectSettingsModified(tabId, projectSettings, originalChanges) {
        const state = this.getTabIdState(tabId);
        const newState = Object.assign({}, state, projectSettings);
        if (projectSettings.visibleColumns) {
            newState.columns = dataDeepCopy(newState.columns);
            
            const visibleColumns = (projectSettings.visibleColumns.length)
                ? projectSettings.visibleColumns
                : state.defaultVisibleColumns;
            CI.updateColumnsFromVisibleColumnList(
                newState.columns, visibleColumns);
        }

        const { updateStateFromModifiedProjectSettings } = this._handler;
        if (updateStateFromModifiedProjectSettings) {
            updateStateFromModifiedProjectSettings(tabId, newState, projectSettings);
        }

        newState.dropdownInfo = this.getTabDropdownInfo(tabId, newState);

        this.setTabIdState(tabId, newState);
    }



    onUpdateColumns({ tabId, labelId, columns, columnIndex, }) {
        let columnName = '';
        const { columnInfo } = columns[columnIndex];
        if (columnInfo) {
            if (columnInfo.header && columnInfo.header.label) {
                columnName = columnInfo.header.label;
            }
            else if (columnInfo.footer && columnInfo.footer.label) {
                columnName = columnInfo.footer.label;
            }
        }

        //const name = userMsg(labelId, columnName);
        //this.setTabIdProjectSettings(tabId, changes, actionName);
    }
}