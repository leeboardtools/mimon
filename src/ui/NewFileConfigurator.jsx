import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { TabbedPages } from '../util-ui/TabbedPages';
import * as A from '../engine/Accounts';
import { NewFileAccountsEditor,
    cloneAccountDataItems, findAccountDataItemWithId, } from './NewFileAccountsEditor';
import { DropdownMenu } from '../util-ui/DropdownMenu';
import { ContentFramer } from '../util-ui/ContentFramer';
import { PageTitle } from '../util-ui/PageTitle';


/**
 * Component for configuring a new file.
 */
export class NewFileConfigurator extends React.Component {
    constructor(props) {
        super(props);

        this._tabEntries = [
            { tabId: 'assets',
                title: userMsg('NewFileConfigurator-assets_tab'),
                accountCategory: A.AccountCategory.ASSET.name,
                pageRef: React.createRef(),
            },
            { tabId: 'liabilities',
                title: userMsg('NewFileConfigurator-liabilities_tab'),
                accountCategory: A.AccountCategory.LIABILITY.name,
                pageRef: React.createRef(),
            },
            { tabId: 'income',
                title: userMsg('NewFileConfigurator-income_tab'),
                accountCategory: A.AccountCategory.INCOME.name,
                pageRef: React.createRef(),
            },
            { tabId: 'expenses',
                title: userMsg('NewFileConfigurator-expense_tab'),
                accountCategory: A.AccountCategory.EXPENSE.name,
                pageRef: React.createRef(),
            },
        ];

        this.state = {
            activeTabId: this._tabEntries[0].tabId,
        };

        this.onNewAccount = this.onNewAccount.bind(this);
        this.onRemoveAccount = this.onRemoveAccount.bind(this);
        this.onActiveRowChanged = this.onActiveRowChanged.bind(this);
        this.onMenuNeedsUpdate = this.onMenuNeedsUpdate.bind(this);

        this.onUpdateRootAccountDataItems = this.onUpdateRootAccountDataItems.bind(this);
        this.onRenderPage = this.onRenderPage.bind(this);
        this.onActivateTab = this.onActivateTab.bind(this);
        this.onPostRenderTabs = this.onPostRenderTabs.bind(this);

    }



    onNewAccount(accountCategory, parentAccountId, afterSiblingAccountId) {
        const newFileContents = Object.assign({}, this.props.newFileContents);        
        const newId = (newFileContents.nextAccountId++).toString();

        const rootAccountDataItems = cloneAccountDataItems(
            newFileContents.accounts[accountCategory]);
        newFileContents.accounts[accountCategory] = rootAccountDataItems;
    
        let childAccounts = rootAccountDataItems;
        let parentAccountDataItem;
        let newType = A.AccountCategory[accountCategory].rootAccountType.name;

        if (parentAccountId) {
            parentAccountDataItem = findAccountDataItemWithId(
                rootAccountDataItems, parentAccountId);
            if (parentAccountDataItem) {
                newType = parentAccountDataItem.type;
                if (parentAccountDataItem.childAccounts) {
                    childAccounts = parentAccountDataItem.childAccounts;
                }
            }
        }
        
        const newAccountDataItem = {
            id: newId,
            name: userMsg('NewFileAccountsEditor-new_account_name'),
            type: newType,
        };

        if (afterSiblingAccountId) {
            for (let i = 0; i < childAccounts.length; ++i) {
                if (childAccounts[i].id === afterSiblingAccountId) {
                    newAccountDataItem.type = childAccounts[i].type;
                    childAccounts.splice(i + 1, 0, newAccountDataItem);
                    break;
                }
            }
        }
        else {
            childAccounts.splice(0, 0, newAccountDataItem);
        }

        this.props.onUpdateFileContents(newFileContents);

        return newId;
    }


    onRemoveAccount(accountId) {

    }


    onActiveRowChanged(activeRowKey) {
        this.setState({
            activeRowKey: activeRowKey,
        });
    }


    onMenuNeedsUpdate() {
        this.setState((state) => {
            return {
                updateCount: (state.updateCount || 0) + 1,
            };
        });
    }


    onUpdateRootAccountDataItems(accountCategory, rootAccountDataItems) {
        const newFileContents = Object.assign({}, this.props.newFileContents);
        newFileContents.accounts[accountCategory] = rootAccountDataItems;

        this.props.onUpdateFileContents(newFileContents);
    }


    onRenderPage(tabEntry, isActive) {
        if (tabEntry.accountCategory) {
            const { accounts } = this.props.newFileContents;
            if (!accounts) {
                return;
            }

            const rootAccountDataItems = accounts[tabEntry.accountCategory];
            if (!rootAccountDataItems || !rootAccountDataItems.length) {
                return;
            }


            return <NewFileAccountsEditor
                accountCategory = {tabEntry.accountCategory}
                rootAccountDataItems = {rootAccountDataItems}
                baseCurrency = {this.props.baseCurrency}
                onUpdateRootAccountDataItems = {this.onUpdateRootAccountDataItems}
                onNewAccount = {this.onNewAccount}
                onRemoveAccount = {this.onRemoveAccount}
                onSetEndEditAsyncCallback = {this.props.onSetEndEditAsyncCallback}
                onActiveRowChanged = {this.onActiveRowChanged}
                onMenuNeedsUpdate = {this.onMenuNeedsUpdate}
                isActive = {tabEntry.tabId === this.state.activeTabId}
                
                ref = {tabEntry.pageRef}
            />;
        }
        return <div>{tabEntry.title}</div>;
    }


    getActiveTabEntry() {
        const { activeTabId } = this.state;
        for (let i = 0; i < this._tabEntries.length; ++i) {
            if (this._tabEntries[i].tabId === activeTabId) {
                return this._tabEntries[i];
            }
        }
    }
    

    renderMenu() {
        const activeTabEntry = this.getActiveTabEntry();

        let undoItem;
        let redoItem;
        let mainMenuItems = [];
        if (activeTabEntry && activeTabEntry.pageRef) {
            const pageImpl = activeTabEntry.pageRef.current;
            if (pageImpl && pageImpl.getMenuItems) {
                const menuItems = pageImpl.getMenuItems();
                if (menuItems) {
                    for (let i = 0; i < menuItems.length; ++i) {
                        const menuItem = menuItems[i];
                        switch (menuItem.id) {
                        case 'undo' :
                            undoItem = menuItem;
                            break;
                        
                        case 'redo' :
                            redoItem = menuItem;
                            break;
                        
                        default :
                            mainMenuItems.push(menuItem);
                        }
                    }
                }
            }
        }

        // Have the undo/redo buttons...
        const baseClassName = 'Nav Nav-link Px-2';

        let undoClassName = baseClassName + ' Undo-tooltip';
        let undoLabel;
        let undoOnClick;
        if (undoItem) {
            undoLabel = undoItem.label;
            undoOnClick = undoItem.onChooseItem;
            if (undoItem.disabled) {
                undoClassName += ' disabled';
            }
        }
        else {
            undoClassName += ' disabled';
        }

        let undo = <a
            className = {undoClassName}
            onClick = {undoOnClick}
            aria-label = "Undo"
            href = "#"
            role = "button"
        >
            <i className = "material-icons">undo</i>
            <span className = "Undo-tooltip-text">{undoLabel}</span>
        </a>;


        let redoClassName = baseClassName + ' Undo-tooltip';
        let redoLabel;
        let redoOnClick;
        if (redoItem) {
            redoLabel = redoItem.label;
            redoOnClick = redoItem.onChooseItem;
            if (redoItem.disabled) {
                redoClassName += ' disabled';
            }
        }
        else {
            redoClassName += ' disabled';
        }
        const redo = <a
            className = {redoClassName}
            onClick = {redoOnClick}
            aria-label = "Redo"
            href = "#"
            role = "button"
        >
            <i className = "material-icons">redo</i>
            <span className = "Undo-tooltip-text">{redoLabel}</span>
        </a>;


        const mainMenuTitle = <i className = "material-icons">menu</i>;

        const mainMenu = <DropdownMenu
            title = {mainMenuTitle}
            items = {mainMenuItems}
            topClassExtras = "Mt-2 Ml-2"
            noArrow
            menuClassExtras = "Dropdown-menu-right"
        />;

        return <div className = "Btn-group Btn-group-sm" role = "group">
            {undo}
            {redo}
            {mainMenu}
        </div>;
    }


    onPostRenderTabs(tabs) {
        const menu = this.renderMenu();
        return <div className = "FlexC">
            <div className = "FlexI-grow-1">
                {tabs}
            </div>
            {menu}
        </div>;
    }


    onActivateTab(tabId) {
        this.setState({
            activeTabId: tabId,
        });
    }


    render() {
        const tabbedPages = <TabbedPages
            tabEntries = {this._tabEntries}
            activeTabId = {this.state.activeTabId}
            onRenderPage = {this.onRenderPage}
            onActivateTab = {this.onActivateTab}
            onPostRenderTabs = {this.onPostRenderTabs}
        />;

        const titleBar = <PageTitle>
            {userMsg('NewFileAccountsEditor-heading')}
        </PageTitle>;
        return <ContentFramer
            onRenderHeader = {() => titleBar}
            onRenderContent = {() => tabbedPages}
        />;
    }
}

/**
 * @callback NewFileConfigurator~onUpdateFileContents
 * @param {NewFileContents}  newFileContents
 */

/**
 * @callback NewFileConfigurator~asyncEndEditCallback
 * @param {boolean} saveChanges
 * @async
 */

/**
 * @callback NewFileConfigurator~onSetEndEditAsyncCallback
 * @param {NewFileConfigurator~asyncEndEditCallback|undefined}    callback
 */

/**
 * @typedef {object} NewFileConfigurator~propTypes
 * @property {EngineAccessor}   accessor
 * @property {NewFileContents}   newFileContents
 * @property {NewFileConfigurator~onUpdateFileContents} onUpdateFileContents
 * @property {NewFileConfigurator~onSetEndEditAsyncCallback}    onSetEndEditAsyncCallback
 * @property {string}   [baseCurrency]
 */
NewFileConfigurator.propTypes = {
    accessor: PropTypes.object.isRequired,
    newFileContents: PropTypes.object.isRequired,
    onUpdateFileContents: PropTypes.func.isRequired,
    onSetEndEditAsyncCallback: PropTypes.func.isRequired,
    baseCurrency: PropTypes.string,
};
