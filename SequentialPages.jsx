import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ModalPage } from '../util-ui/ModalPage';


/**
 * A Wizard style component, for advancing sequentially through child pages,
 * with Back, Next, and an optional Cancel buttons along the bottom of the component.
 */
export class SequentialPages extends React.Component {
    constructor(props) {
        super(props);

        this.onClickBack = this.onClickBack.bind(this);
        this.onClickNext = this.onClickNext.bind(this);

        this.state = {
            activePageIndex: this.props.activePageIndex || 0,
        };
    }


    onClickBack(event) {
        this.setState((state, props) => {
            const newPageIndex = state.activePageIndex - 1;
            if (newPageIndex >= 0) {
                const { onActivatePage } = props;
                if (onActivatePage) {
                    onActivatePage(newPageIndex);
                }
                return { activePageIndex: newPageIndex };
            }
        });
    }


    onClickNext() {
        this.setState((state, props) => {
            const newPageIndex = state.activePageIndex + 1;
            if (newPageIndex < props.pageCount) {
                const { onActivatePage } = props;
                if (onActivatePage) {
                    onActivatePage(newPageIndex);
                }
                return { activePageIndex: newPageIndex };
            }
            else {
                props.onFinish();
            }
        });
    }


    renderBody() {
        const { pageCount } = this.props;
        const { activePageIndex } = this.state;

        const pages = [];
        for (let i = 0; i < pageCount; ++i) {
            const isActive = (i === activePageIndex);
            const pageComponent = this.props.onRenderPage(i, isActive);
            const className = 'H-100 SequentialPages-page ' + (isActive ? '' : 'D-none');
            pages.push((
                <div className = {className} key = {i}>{pageComponent}</div>
            ));
        }

        return <React.Fragment>
            {pages}
        </React.Fragment>;
    }


    render() {
        const body = this.renderBody();

        const { pageCount, title, onCancel,
            isNextDisabled, isBackDisabled } = this.props;
        const { activePageIndex } = this.state;

        const nextText = ((activePageIndex + 1) < pageCount)
            ? userMsg('SequentialPages-next_btn') 
            : userMsg('SequentialPages-finish-btn');

        const actionButtons = [];
        if (pageCount > 1) {
            actionButtons.push({
                label: userMsg('SequentialPages-back_btn'),
                onClick: this.onClickBack,
                disabled: isBackDisabled || !activePageIndex,
            });
        }
        actionButtons.push({
            label: nextText,
            onClick: this.onClickNext,
            disabled: isNextDisabled,
        });

        return <ModalPage
            title = {title}
            onCancel = {onCancel}
            actionButtons = {actionButtons}
            classExtras = "SequentialPages"
        >
            {body}
        </ModalPage>;
    }
}

/**
 * @callback SequentialPages~onRenderPage
 * @param {number}  pageIndex   The index of the page to be rendered.
 * @param {boolean} isActive    <code>true</code> if the page is the active page.
 * @returns {object}
 */

/**
 * @callback SequentialPages~onActivatePage
 * @param {number}  pageIndex   The index of the page becoming active.
 */

/**
 * @callback SequentialPages~onFinish
 * Called when the Finish (Next) button is chosen when the last page is active.
 */

/**
 * @callback SequentialPages~onCancel
 * Called when the Cancel button is chosen.
 */

/**
 * @typedef {object} SequentialPages~propTypes
 * @property {number}   pageCount   The number of pages.
 * @property {number}   [activePageIndex]   The index of the active page
 * @property {SequentialPages~onRenderPage} onRenderPage    The page rendering
 * callback.
 * @property {SequentialPages~onActivatePage}   [onActivatePage]    Called when
 * the active page changes.
 * @property {SequentialPages~onFinish} onFinish    Called when the Next button
 * is chosen when the last page is active.
 * @property {SequentialPages~onCancel} [onCancel]  Called when the Cancel button
 * is chosen. If this is <code>undefined</code> no Cancel button is displayed.
 * @property {boolean}  [isNextDisabled]    If <code>true</code> the Next button
 * is disabled.
 * @property {boolean}  [isBackDisabled]    If <code>true</code> the Back button
 * is disabled.
 * @property {string}   [title] Optional title.
 */
SequentialPages.propTypes = {
    pageCount: PropTypes.number.isRequired,
    activePageIndex: PropTypes.number,
    onRenderPage: PropTypes.func.isRequired,
    onActivatePage: PropTypes.func,
    onFinish: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    isNextDisabled: PropTypes.bool,
    isBackDisabled: PropTypes.bool,
    title: PropTypes.string,
};
