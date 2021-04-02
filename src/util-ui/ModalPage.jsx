import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { ContentFramer } from './ContentFramer';
import { CloseButton } from './CloseButton';
import { Row, Col } from './RowCols';



/**
 * A component that displays a modal style page, with a cancel/OK button
 * bar at the bottom and an optional title at the top.
 */
export function ModalPage(props) {
    const body = <div className = "H-inherit ModalPage-body"
    >
        {props.children}
    </div>;

    const { title, onCancel, cancelDisabled, onDone, doneDisabled,
        actionButtons, classExtras, onButtonFocus } = props;

    let cancelBtn;
    if (onCancel) {
        const cancelLabel = props.cancelLabel || userMsg('cancel');
        let onFocus;
        if (onButtonFocus) {
            onFocus = (e) => onButtonFocus(e, 'cancel');
        }
        cancelBtn = <button className = "Btn Btn-secondary M-2 Mr-4"
            onClick = {onCancel}
            onFocus = {onFocus}
            disabled = {cancelDisabled}
        >
            {cancelLabel}
        </button>;
    }

    let titleComponent;
    if (title) {
        let titleCloseBtn;
        if (cancelBtn) {
            titleCloseBtn = <CloseButton onClick = {onCancel}/>;
        }

        titleComponent = <div className = "Border-bottom P-2 ModalPage-title"
        >
            <Row classExtras = "Row-justify-content-between">
                <Col classExtras = "Text-center">
                    <h4 className = "">{title}</h4>
                </Col>
                <Col classExtras = "Col-auto">
                    {titleCloseBtn}
                </Col>
            </Row>
        </div>;
    }


    let buttons = [];
    const btnClassName = 'Btn Btn-primary M-2';
    if (actionButtons) {
        buttons = [];
        for (let i = 0; i < actionButtons.length; ++i) {
            const actionButton = actionButtons[i];
            let onFocus;
            if (onButtonFocus) {
                onFocus = (e) => onButtonFocus(e, actionButton.id);
            }
            buttons.push(<button 
                className = {btnClassName + ' ' + actionButton.classExtras}
                key = {i}
                onClick = {actionButton.onClick}
                onFocus = {onFocus}
                disabled = {actionButton.disabled}
            >
                {actionButton.label}
            </button>);
        }
    }

    if (onDone) {
        const doneLabel = props.doneLabel || userMsg('done');
        let onFocus;
        if (onButtonFocus) {
            onFocus = (e) => onButtonFocus(e, 'done');
        }
        buttons.push(<button
            className = {btnClassName}
            key = {-1}
            onClick = {onDone}
            onFocus = {onFocus}
            disabled = {doneDisabled}
        >
            {doneLabel}
        </button>
        );
    }

    const buttonBar = <div className = "Mt-auto ModalPage-buttonBar">
        <Row classExtras = "Border-top M-2">
            <Col classExtras = "Text-left Mt-2">
                {cancelBtn}
            </Col>
            <Col classExtras = "Text-right Mt-2">
                {buttons}
            </Col>
        </Row>
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
 * @callback ModalPage~onButtonFocus
 * @param {Event} event
 * @param {*} id The id, for the cancel button this is 'cancel', for the
 * done button this is 'done', for the action buttons it is the id property
 * of the {@link ModelPage~ButtonInfo}
 */

/**
 * @typedef {object}    ModelPage~ButtonInfo
 * @property {string}   label   The button's label.
 * @property {ModalPage~onDone} onClick Callback for when the button is chosen.
 * @property {string}   [classExtras]
 * @property {boolean}  [disabled]
 * @property {*} [id] Optional id passed to onButtonFocus if given.
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
 * @property {boolean}  [cancelDisabled]
 * @property {string}   [title] Optional title.
 * @property {ModalPage~onButtonFocus} [onButtonFocus]
 * @property {*}    [children]  The form's components
 */
ModalPage.propTypes = {
    onDone: PropTypes.func,
    doneLabel: PropTypes.string,
    doneDisabled: PropTypes.bool,
    actionButtons: PropTypes.array,
    onCancel: PropTypes.func,
    cancelLabel: PropTypes.string,
    cancelDisabled: PropTypes.bool,
    title: PropTypes.string,
    classExtras: PropTypes.string,
    onButtonFocus: PropTypes.func,
    children: PropTypes.any,
};
