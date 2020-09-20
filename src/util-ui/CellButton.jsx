import React from 'react';
import PropTypes from 'prop-types';



/**
 * Component for a cell that's a button.
 * @class
 */
export const CellButton = React.forwardRef(
    function myCellButton(props, ref) {
        const { value, errorMsg, ariaLabel, classExtras, 
            onClick, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellButton ' + classExtras;

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className = "invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className = {divClassName}>
            <button type = "button"
                className = {className}
                aria-label = {ariaLabel}
                value = {value}
                disabled = {disabled}
                onClick = {onClick}
                onFocus = {onFocus}
                onBlur = {onBlur}
                ref = {ref}
            >
                {value}
            </button>
            {errorMsgComponent}
        </div>;
    }
);


/**
 * @typedef {object} CellButton~propTypes
 * @property {string}   [errorMsg]  If defined an error message to be displayed
 * beneath the selector.
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
CellButton.propTypes = {
    value: PropTypes.string,
    errorMsg: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    onClick: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


//export const CellToggleSelectDisplay = CellSelectDisplay;
