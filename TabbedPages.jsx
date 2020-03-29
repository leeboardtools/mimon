import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from './Dropdown';



/**
 * A component with tabs along the top and individual child pages
 * corresponding to each tab.
 */
export class TabbedPages extends React.Component {
    constructor(props) {
        super(props);

        this.handleTabClick = this.handleTabClick.bind(this);

        this.state = {
            activeTabId: this.props.activeTabId || this.props.tabEntries[0].tabId,
        };
    }


    componentDidUpdate(oldProps) {
        if (oldProps.activeTabId !== this.props.activeTabId) {
            // This is necessary if the parent wants to change the active tab, as
            // we need to keep track of the active tab ourselves as well.
            this.setState({
                activeTabId: this.props.activeTabId,
            });
        }
    }

    handleTabClick(tabEntry) {
        let tabId = tabEntry.tabId;
        if (this.props.onActivateTab) {
            tabId = this.props.onActivateTab(tabId);
            tabId = (tabId === undefined) ? tabEntry.tabId : tabId;
        }
        this.setState({
            activeTabId: tabId,
        });
    }


    renderTabs() {
        console.log('tabs: ' + this.state.activeTabId);
        const items = this.props.tabEntries.map((tabEntry) => {
            const ariaLabel = tabEntry.title + ' Tab';

            let className = 'nav-item nav-link tabText';
            let tabComponent;
            let isActive;
            if (tabEntry.tabId === this.state.activeTabId) {
                className += ' active';
                isActive = true;

            }
            
            const { dropdownInfo } = tabEntry;

            if (dropdownInfo) {
                // We only want the menu enabled if we're the active tab, so when
                // you click on an inactive tab the menu doesn't drop down.
                if (isActive) {
                    tabComponent = <Dropdown
                        title={tabEntry.title}
                        aria-label={ariaLabel}
                        items={dropdownInfo.items}
                    />;
                }
                else {
                    tabComponent = <a href="#" 
                        className="dropdown-toggle"
                        onClick={() => this.handleTabClick(tabEntry)}
                        aria-label={ariaLabel}
                    >
                        {tabEntry.title}
                    </a>;
                }
            }


            if (!tabComponent) {
                tabComponent = <a href="#" onClick={() => this.handleTabClick(tabEntry)}
                    aria-label={ariaLabel}
                >
                    {tabEntry.title}
                </a>;
            }

            let closeButton;
            if (tabEntry.hasClose && this.props.onCloseTab) {
                closeButton = <button type="button" 
                    className="close tabCloseButton" 
                    data-dismiss="modal" 
                    aria-label="Close Tab" 
                    onClick={() => this.onCloseTab(tabEntry.tabId)}>
                    <span aria-hidden="true">&times;</span>
                </button>;
            }

            return (
                <div key={tabEntry.tabId} className={className}>
                    {tabComponent}
                    {closeButton}
                </div>
            );
        });

        let className = this.props.tabClassName || 'nav nav-tabs bg-light';
        if (this.props.tabExtras) {
            className += ' ' + this.props.tabExtras;
        }
        return (
            <nav className={className}>
                {items}
            </nav>
        );
    }


    renderBody() {
        const pages = [];
        this.props.tabEntries.forEach((tabEntry) => {
            const isActive = (tabEntry.tabId === this.state.activeTabId);
            const page = this.props.onRenderPage(tabEntry, isActive);
            const className = (isActive ? '' : 'd-none');
            pages.push((
                <div className={className} key={tabEntry.tabId}>{page}</div>
            ));
        });

        return <div className="container-fluid pl-0 pr-0 mt-3">{pages}</div>;
    }


    render() {
        let tabs = this.renderTabs();

        const { onPostRenderTabs } = this.props;
        if (onPostRenderTabs) {
            tabs = onPostRenderTabs(tabs);
        }

        const body = this.renderBody();

        return <div className="container-fluid pl-1 pr-1">
            {tabs}
            {body}
        </div>;
    }
}

/**
 * @typedef {object}    TabbedPages~TabEntry
 * @property {string}   tabId
 * @property {string}   title   The text that appears in the tab.
 * @property {boolean}  [hasClose=false]    If <code>true</code> the tab has a
 * close button.
 */

/**
 * @callback TabbedPages~onRenderPage
 * @param {TappedPages~TabEntry}    tabEntry    The tab entry to be rendered.
 * @param {boolean} isActive    If <code>true</code> the page is the active page.
 * @returns {object}
 */

/**
 * @callback TabbedPages~onCloseTab
 * @param {string}    tabId    The id of tab entry to be closed.
 */

/**
 * @callback TabbedPages~onActivateTab
 * @param {string}    tabId    The id of tab entry that was activated.
 */

/**
 * @callback TabbedPages~onPostRenderTabs
 * This can be used to add things like menu buttons to the tab bar.
 * @param {object}    tabs  The component representing the tabs.
 * @return {object} The component to render, this would normally be a parent component
 * around tabs.
 */

/**
 * @typedef {object} TabbedPages~TabDropdownInfo
 * @property {Dropdown~Item[]}  items
 * @property {Dropdown~onChooseItem}    onChooseItem
 */

/**
 * @typedef {object}    TabbedPages~PropTypes
 * @property {TabbedPages~TabEntry[]}   tabEntries  The array of the tab entries.
 * @property {string}   [activeTabId]   The tabId of the active tab entry.
 * @property {TabbedPages~onRenderPage}  onRenderPage Called to render
 * the page for a tab.
 * @property {TabbedPages~onCloseTab}   [onCloseTab]    Called when a tab's close
 * button is chosen.
 * @property {TabbedPages~onActivateTab}    [onActivateTab] Called when a tab's
 * page becomes active. This is only called when the tab is chosen, not for
 * the initially active page.
 * @property {string}   [tabClassName]  Initial class for individual tabs, Bootstrap
 * classes added to this.
 * @property {string}   [tabExtras] Extra classes to add for individual tabs after
 * the Bootstrap classes.
 * @property {TabbedPages~onPostRenderTabs} [onPostRenderTabs] Callback that allows
 * processing of the tabs component to render.
 */
TabbedPages.propTypes = {
    tabEntries: PropTypes.array.isRequired,
    activeTabId: PropTypes.any,
    onRenderPage: PropTypes.func.isRequired,
    onCloseTab: PropTypes.func,
    onActivateTab: PropTypes.func,
    tabClassName: PropTypes.string,
    tabExtras: PropTypes.string,
    onPostRenderTabs: PropTypes.func,
};
