import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';


/**
 * A Wizard style component, for advancing sequentially through child pages,
 * with Back, Next, and an optional Cancel buttons along the bottom of the component.
 */
export class SequentialPages extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            activePageIndex: this.props.activePageIndex || 0,
        };

        this.onClickBack = this.onClickBack.bind(this);
        this.onClickNext = this.onClickNext.bind(this);
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
                this.props.onFinish();
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
            const className = (isActive ? '' : 'd-none');
            pages.push((
                <div className={className} key={i}>{pageComponent}</div>
            ));
        }

        return <div className="container-fluid pl-0 pr-0">{pages}</div>;
    }


    render() {
        const body = this.renderBody();

        const { pageCount } = this.props;
        const { activePageIndex } = this.state;

        let cancelBtn;
        if (this.props.onCancel) {
            cancelBtn = <button className="btn btn-secondary m-2 mr-4"
                onClick={this.props.onCancel}>
                {userMsg('cancel')}
            </button>;
        }

        const btnClassName = 'btn btn-primary m-2';
        let nextBtnDisabled;
        if (this.props.isNextDisabled) {
            nextBtnDisabled = 'disabled';
        }

        const nextText = ((activePageIndex + 1) < pageCount)
            ? userMsg('SequentialPages-next_btn') 
            : userMsg('SequentialPages-finish-btn');

        let backBtnDisabled;
        if (this.props.isBackDisabled || !activePageIndex) {
            backBtnDisabled = 'disabled';
        }

        return <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
            {body}
            <div className="mt-auto">
                <div className="row border-top m-2">
                    <div className="col text-left mt-2">
                        {cancelBtn}
                    </div>
                    <div className="col text-right mt-2">
                        <button className={btnClassName}
                            onClick={this.onClickBack}
                            disabled={backBtnDisabled}>
                            {userMsg('SequentialPages-back_btn')}
                        </button>
                        <button className={btnClassName}
                            onClick={this.onClickNext} 
                            disabled={nextBtnDisabled}>
                            {nextText}
                        </button>
                    </div>
                </div>
            </div>
        </div>;
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
};
