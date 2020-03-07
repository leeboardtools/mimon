import React from 'react';
import PropTypes from 'prop-types';



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
        const items = this.props.tabEntries.map((tabEntry) => {
            let className = 'nav-item nav-link tabText';
            if (tabEntry.tabId === this.state.activeTabId) {
                className += ' active';
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

            const ariaLabel = tabEntry.title + ' Tab';
            return (
                <div key={tabEntry.tabId} className={className}>
                    <a href="#" onClick={() => this.handleTabClick(tabEntry)}
                        aria-label={ariaLabel}
                    >
                        {tabEntry.title}
                    </a>
                    {closeButton}
                </div>
            );
        });

        let className = this.props.tabClassName || 'nav nav-tabs fixed-top bg-light';
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

        return <div className="container-fluid pl-0 pr-0">{pages}</div>;
    }


    render() {
        const tabs = this.renderTabs();
        const body = this.renderBody();

        return <div className="container-fluid tabPage pl-1 pr-1">
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
 * @callback {TabbedPages~onRenderPage}
 * @param {TappedPages~TabEntry}    tabEntry    The tab entry to be rendered.
 * @param {boolean} isActive    If <code>true</code> the page is the active page.
 * @returns {object}
 */

/**
 * @callback {TabbedPages~onCloseTab}
 * @param {TappedPages~TabEntry}    tabEntry    The tab entry to be closed.
 */

/**
 * @callback {TabbedPages~onActivateTab}
 * @param {TappedPages~TabEntry}    tabEntry    The tab entry to be closed.
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
 */
TabbedPages.propTypes = {
    tabEntries: PropTypes.array.isRequired,
    activeTabId: PropTypes.any,
    onRenderPage: PropTypes.func.isRequired,
    onCloseTab: PropTypes.func,
    onActivateTab: PropTypes.func,
    tabClassName: PropTypes.string,
    tabExtras: PropTypes.string,
};
