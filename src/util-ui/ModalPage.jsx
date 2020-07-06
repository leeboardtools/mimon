import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';



/**
 * A component that displays a modal style page, with a cancel/OK button
 * bar at the bottom and an optional title at the top.
 */
export class ModalPage extends React.Component {
    constructor(props) {
        super(props);

        this.watcher = this.watcher.bind(this);

        this._mainRef = React.createRef();
        this._buttonBarRef = React.createRef();

        this.state = {
        };
    }


    watcher() {
        if (!this._isUnmounted) {
            if (this._buttonBarRef.current) {
                this.updateLayout();
                window.requestAnimationFrame(this.watcher);
            }
        }
    }


    componentDidMount() {
        if (!this._isUnmounted) {
            this.updateLayout();
        }

        window.requestAnimationFrame(this.watcher);
    }

    componentWillUnmount() {
        this._isUnmounted = true;
    }


    updateLayout() {
        if (this._mainRef.current && this._buttonBarRef.current) {
            const mainHeight = this._mainRef.current.clientHeight;
            const buttonBarHeight = this._buttonBarRef.current.clientHeight;
            const bodyHeight = mainHeight - buttonBarHeight;
            if ((bodyHeight > 0) && (bodyHeight !== this.state.bodyHeight)) {
                this.setState({
                    bodyHeight: bodyHeight,
                });
            }
        }
    }


    renderBody() {
        let style;
        const { bodyHeight } = this.state;
        if (bodyHeight !== undefined) {
            style = {
                height: bodyHeight,
            };
        }

        return <div className = "container-fluid pl-0 pr-0 ModalPage-body"
            style = {style}
        >
            {this.props.children}
        </div>;
    }


    render() {
        const body = this.renderBody();

        const { title, onCancel, onDone, doneDisabled,
            actionButtons, classExtras } = this.props;

        let cancelBtn;
        if (onCancel) {
            cancelBtn = <button className = "btn btn-secondary m-2 mr-4"
                onClick = {onCancel}>
                {userMsg('cancel')}
            </button>;
        }

        let titleComponent;
        if (title) {
            let titleCloseBtn;
            if (cancelBtn) {
                titleCloseBtn = <button type = "button" 
                    className = "close" 
                    aria-label = "Close"
                    onClick = {onCancel}
                >
                    <span aria-hidden = "true">&times;</span>
                </button>;
            }

            titleComponent = <div className = "border-bottom m-2 ModalPage-title">
                <div className = "row justify-content-between">
                    <div className = "col-11 text-center">
                        <h4 className = "">{title}</h4>
                    </div>
                    <div className = "col">
                        {titleCloseBtn}
                    </div>
                </div>
            </div>;
        }

        let buttons = [];
        const btnClassName = 'btn btn-primary m-2';
        if (actionButtons) {
            buttons = [];
            for (let i = 0; i < actionButtons.length; ++i) {
                const actionButton = actionButtons[i];
                buttons.push(<button 
                    className = {btnClassName + ' ' + actionButton.classExtras}
                    key = {i}
                    onClick = {actionButton.onClick}
                    disabled = {actionButton.disabled}
                >
                    {actionButton.label}
                </button>);
            }
        }

        if (onDone) {
            buttons.push(<button
                className = {btnClassName}
                key = {-1}
                onClick = {onDone}
                disabled = {doneDisabled}
            >
                {userMsg('done')}
            </button>
            );
        }

        const className = 'd-flex w-100 h-100 mx-auto flex-column ModalPage';

        return <div 
            className = {className + ' ' + classExtras}
            ref = {this._mainRef}
        >
            {titleComponent}
            {body}
            <div className = "mt-auto ModalPage-buttonBar"
                ref = {this._buttonBarRef}
            >
                <div className = "row border-top m-2">
                    <div className = "col text-left mt-2">
                        {cancelBtn}
                    </div>
                    <div className = "col text-right mt-2">
                        {buttons}
                    </div>
                </div>
            </div>
        </div>;
    }
}

/**
 * @callback ModalPage~onDone
 */

/**
 * @callback ModalPage~onCancel
 */

/**
 * @typedef {object}    ModelPage~ButtonInfo
 * @property {string}   label   The button's label.
 * @property {ModalPage~onDone} onClick Callback for when the button is chosen.
 * @property {string}   [classExtras]
 * @property {boolean}  [disabled]
 */

/**
 * @typedef {object} ModalPage~propTypes
 * @property {ModalPage~onDone} [onDone]    If specified, a Done button is added
 * and this is the callback called when it is chosen.
 * @property {boolean}  [doneDisabled]  Only used if onDone is specified, disables
 * the Done button.
 * @property {ModelPage-ButtonInfo[]}   [actionButtons] Optional array of button
 * definitions, these are added before the optional Done button.
 * @property {ModalPage~onCancel} [onCancel]  If specified, a Cancel button is
 * added and this is the callback called when it is chosen.
 * @property {string}   [title] Optional title.
 * @property {*}    [children]  The form's components
 */
ModalPage.propTypes = {
    onDone: PropTypes.func,
    doneDisabled: PropTypes.bool,
    actionButtons: PropTypes.array,
    onCancel: PropTypes.func,
    title: PropTypes.string,
    classExtras: PropTypes.string,
    children: PropTypes.any,
};
