import React from 'react';
import PropTypes from 'prop-types';

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
    message: PropTypes.string.isRequired,
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
            {props.message}
            <button type="button" 
                className="close" 
                aria-label="Close"
                onClick={props.onClose}>
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    </div>;
}
