import React from 'react';
import PropTypes from 'prop-types';

/**
 * React component for the 'close' button, which is normally an 'X'.
 * @name CloseButton
 * @class
 */
export function CloseButton(props) {
    const { classExtras, ariaLabel, onClick } = props;

    let className = 'Close';
    if (classExtras) {
        className += ' ' + classExtras;
    }

    let { disabled } = props;
    if (!onClick) {
        disabled = true;
    }

    return <button
        type = "button"
        className = {className}
        aria-label = {ariaLabel || 'Close'}
        onClick = {onClick}
        disabled = {disabled}
        tabIndex = {props.tabIndex}
    >
        <span aria-hidden="true">&times;</span>
    </button>;
}


/**
 * @typedef {object} CloseButton~propTypes
 * @property {string} [classExtras]
 * @property {string} [ariaLabel]
 * @property {function} [onClick] If not specified the button is disabled.
 * @property {boolean} [disabled=false]
 * @property {number} [tabIndex]
 */
CloseButton.propTypes = {
    classExtras: PropTypes.string,
    ariaLabel: PropTypes.string,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    tabIndex: PropTypes.number,
};