import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';


/**
 * Component that displays a question and one or more answer buttons.
 * @name QuestionPrompter
 * @class
 */
export function QuestionPrompter(props) {
    let { title, message, buttons, onButton } = props;
    let titleComponent;
    if (title) {
        let titleButton;
        for (let i = 0; i < buttons.length; ++i) {
            if (buttons[i].id === 'cancel') {
                titleButton = <button type="button" 
                    className="close" 
                    aria-label="Close"
                    onClick={() => onButton(buttons[i].id)}
                >
                    <span aria-hidden="true">&times;</span>
                </button>;
            }
        }
        titleComponent = <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            {titleButton}
        </div>;
    }

    if (!Array.isArray(message)) {
        message = [message];
    }

    const components = [];
    for (let i = 0; i < message.length; ++i) {
        const messages = message[i].split('\n');
        messages.forEach((text) => {
            components.push(<div
                key={components.length}>{text}</div>);
        });
    }
    const messageComponent = <React.Fragment>
        {components}
    </React.Fragment>;


    const buttonsComponents = [];
    for (let i = buttons.length - 1; i >= 0; --i) {
        const button = buttons[i];
        let className = 'btn ';
        if (i === 0) {
            className += ' btn-primary';
        }
        else {
            className += ' btn-secondary';
        }
        const component = <button type="button"
            className={className}
            key={button.id}
            onClick={() => onButton(button.id)}
        >
            {button.label || userMsg(button.labelId)}
        </button>;
        buttonsComponents.push(component);
    }

    return <div className="modal-dialog" role="document">
        <div className="modal-content">
            {titleComponent}
            <div className="modal-body text-left">
                {messageComponent}
            </div>
            <div className="modal-footer">
                {buttonsComponents}
            </div>
        </div>
    </div>;
}


/**
 * @callback QuestionPrompter~onButton
 * @param {string}  buttonId
 */

/**
 * @typedef {object} QuestionPrompter~propTypes
 * @property {string}   [title] Optional title.
 * @property {string|string[]}   message The message to be displayed, may be an
 * array of messages, in which case each message is listed separately.
 * @property {QuestionPrompter~onButton}    onButton Called when a button
 * is chosen.
 */
QuestionPrompter.propTypes = {
    title: PropTypes.string,
    message: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
    onButton: PropTypes.func.isRequired,
    buttons: PropTypes.arrayOf(PropTypes.object).isRequired,
};


/**
 * @typedef {QuestionPrompter~ButtonDef}
 * @property {string}   id
 * @property {string}   [label] If specified, the label.
 * @property {string}   [labelId]   If sepcified, the id to pass to {@link userMsg}
 */

/**
 * @enum {QuestionPrompter~ButtonDef} StandardButton
 * @readonly
 * @property {QuestionPrompter~ButtonDef} YES_NO_CANCEL
 * @property {QuestionPrompter~ButtonDef} YES_NO
 * @property {QuestionPrompter~ButtonDef} YES_CANCEL
 * @property {QuestionPrompter~ButtonDef} OK_CANCEL
 * @property {QuestionPrompter~ButtonDef} OK
 */
export const StandardButton = {
    YES_NO_CANCEL: [
        { id: 'yes', labelId: 'yes', },
        { id: 'no', labelId: 'no', },
        { id: 'cancel', labelId: 'cancel', },
    ],
    YES_NO: [
        { id: 'yes', labelId: 'yes', },
        { id: 'no', labelId: 'no', },
    ],
    YES_CANCEL: [
        { id: 'yes', labelId: 'yes', },
        { id: 'cancel', labelId: 'cancel', },
    ],
    OK_CANCEL: [
        { id: 'ok', labelId: 'ok', },
        { id: 'cancel', labelId: 'cancel', },
    ],
    OK: [
        { id: 'ok', labelId: 'ok', },
    ]
};
