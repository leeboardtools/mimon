import React from 'react';
import PropTypes from 'prop-types';


ErrorReporter.propTypes = {
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

export function ErrorReporter(props) {
    return <div className="container-fluid mt-5">
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
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
