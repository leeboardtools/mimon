import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { PageTitle } from './PageTitle';


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
    let titleComponent;
    if (title) {
        titleComponent = <PageTitle>
            {title}
        </PageTitle>;
    }

    if (!Array.isArray(message)) {
        message = [message];
    }
    const components = [];
    for (let i = 0; i < message.length; ++i) {
        components.push(<li className="list-group-item"
            key={i}>{message[i]}</li>);
    }
    const messageComponent = <ul className="list-group">
        {components}
    </ul>;

    return <div className="d-flex w-100 h-100 p-1 mx-auto flex-column">
        {titleComponent}
        <div className="container">
            {messageComponent}
        </div>
        <div className="mt-auto">
            <div className="row border-top m-2">
                <div className="col text-right mt-2">
                    <button className="btn btn-primary"
                        onClick={props.onClose}
                    >
                        {userMsg('ok')}
                    </button>
                </div>
            </div>
        </div>
    </div>;
}