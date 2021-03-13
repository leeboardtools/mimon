import React from 'react';
import PropTypes from 'prop-types';
import { PageBody } from './PageBody';
import { ModalPage } from './ModalPage';


/**
 * @callback InfoReporter~onClose
 */


/**
 * @typedef {object} InfoReporter~propTypes
 * @property {string}   [title] Optional title.
 * @property {string|string[]}   message The message to be displayed, may be an
 * array of messages, in which case each message is listed separately.
 * @property {InfoReporter~onClose}    onClose Called when the close button
 * is chosen.
 */
InfoReporter.propTypes = {
    title: PropTypes.string,
    message: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
    onClose: PropTypes.func.isRequired,
};


/**
 * Reports one or more messages.
 * @name InfoReporter
 * @class
 */
export function InfoReporter(props) {
    let { title, message } = props;
 
    if (!Array.isArray(message)) {
        message = [message];
    }
    const components = [];
    for (let i = 0; i < message.length; ++i) {
        components.push(<li className="List-group-item"
            key={i}>{message[i]}</li>);
    }
    const messageComponent = <ul className="List-group">
        {components}
    </ul>;

    return <ModalPage
        title = {title}
        onDone = {props.onClose}
    >
        <PageBody classExtras = "InfoReporter-body">
            {messageComponent}
        </PageBody>
    </ModalPage>;
}