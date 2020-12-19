import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ContentFramer } from './ContentFramer';



/**
 * A component that displays a modal style page, with a cancel/OK button
 * bar at the bottom and an optional title at the top.
 */
export function ModalPage(props) {
    const body = <div className = "h-inherit ModalPage-body"
    >
        {props.children}
    </div>;

    const { title, onCancel, onDone, doneDisabled,
        actionButtons, classExtras } = props;

    let cancelBtn;
    if (onCancel) {
        const cancelLabel = props.cancelLabel || userMsg('cancel');
        cancelBtn = <button className = "btn btn-secondary m-2 mr-4"
            onClick = {onCancel}>
            {cancelLabel}
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

        titleComponent = <div className = "border-bottom p-2 ModalPage-title"
        >
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
        const doneLabel = props.doneLabel || userMsg('done');
        buttons.push(<button
            className = {btnClassName}
            key = {-1}
            onClick = {onDone}
            disabled = {doneDisabled}
        >
            {doneLabel}
        </button>
        );
    }

    const buttonBar = <div className = "mt-auto ModalPage-buttonBar">
        <div className = "row border-top m-2">
            <div className = "col text-left mt-2">
                {cancelBtn}
            </div>
            <div className = "col text-right mt-2">
                {buttons}
            </div>
        </div>
    </div>;


    let className = 'ModalPage';
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <ContentFramer
        classExtras = {className}
        onRenderHeader = {() => titleComponent}
        onRenderContent = {() => body}
        onRenderFooter = {() => buttonBar}
    />;
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
 * @property {string}   [doneLabel]
 * @property {boolean}  [doneDisabled]  Only used if onDone is specified, disables
 * the Done button.
 * @property {ModelPage-ButtonInfo[]}   [actionButtons] Optional array of button
 * definitions, these are added before the optional Done button.
 * @property {ModalPage~onCancel} [onCancel]  If specified, a Cancel button is
 * added and this is the callback called when it is chosen.
 * @property {string}   [cancelLabel]
 * @property {string}   [title] Optional title.
 * @property {*}    [children]  The form's components
 */
ModalPage.propTypes = {
    onDone: PropTypes.func,
    doneLabel: PropTypes.string,
    doneDisabled: PropTypes.bool,
    actionButtons: PropTypes.array,
    onCancel: PropTypes.func,
    cancelLabel: PropTypes.string,
    title: PropTypes.string,
    classExtras: PropTypes.string,
    children: PropTypes.any,
};
