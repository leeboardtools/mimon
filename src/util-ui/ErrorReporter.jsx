import React from 'react';
import PropTypes from 'prop-types';
import { CloseButton } from './CloseButton';

/**
 * @callback ErrorReporter~onClose
 */


/**
 * @typedef {object} ErrorReporter~propTypes
 * @property {string}   message The message to be displayed.
 * @property {ErrorReporter~onClose}    onClose Called when the close button
 * is chosen.
 */
ErrorReporter.propTypes = {
    message: PropTypes.oneOfType([PropTypes.string.isRequired, 
        PropTypes.instanceOf(Error)]),
    onClose: PropTypes.func.isRequired,
};

/**
 * Very simple reporting of an error.
 * @name ErrorReporter
 * @class
 */
export function ErrorReporter(props) {
    return <div className="container-fluid mt-5">
        <div className="alert alert-error alert-dismissible fade show" role="alert">
            {props.message.toString()}
            <CloseButton onClick={props.onClose}/>
        </div>
    </div>;
}
