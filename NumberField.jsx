import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from './TextField';


function parseExactInt(value) {
    if (typeof value === 'number') {
        return Math.round(value);
    }

    // eslint-disable-next-line max-len
    // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
    if (/^[-+]?(\d+|Infinity)$/.test(value)) {
        return Number(value);
    } 
    else {
        return NaN;
    }

}

function valueToNumber(value, isFloat) {
    return (isFloat) ? parseFloat(value) : parseExactInt(value);
}


function numberFieldOnKeyDown(e, value, isFloat, increment, onChange) {
    increment = increment || 1;
    switch (e.key) {
    case 'UpArrow' :
        value = valueToNumber(value, isFloat);
        if (!isNaN(value)) {
            value += increment;
            e.target.value = value;
            onChange(e, value);
            e.preventDefault();
        }
        break;
    
    case 'DownArrow' :
        value = valueToNumber(value, isFloat);
        if (!isNaN(value)) {
            value -= increment;
            e.target.value = value;
            onChange(e, value);
            e.preventDefault();
        }
        break;
    }
}

function numberFieldOnChange(e, value, isFloat, increment, onChange) {
    // TODO:
    // Resolve any simple math operations.
    let newValue = valueToNumber(e.target.value, isFloat);
    if (!isNaN(newValue)) {
        e.target.value = newValue;
    }
    onChange(e, newValue);
}

/**
 * React component for basic number editing in a field.
 * @class
 */
export const NumberField = React.forwardRef(
    function NumberFieldImpl(props, ref) {
        const { isFloat, increment, onChange, value,
            ...passThroughProps } = props;

        return <TextField
            {...passThroughProps}
            value = {value.toString()}
            onChange = {(e) => numberFieldOnChange(e, value,
                isFloat, increment, onChange)}
            onKeyDown = {(e) => numberFieldOnKeyDown(e, value,
                isFloat, increment, onChange)}
        />;
    }
);

/**
 * @callback NumberField~onChange
 * @param {Event} e The change event. e.target.value is the entered text if the
 * text is not a valid number.
 * @param {number} newValue The number entered, if the text entered was not a valid
 * number this is NaN.
 */


/**
 * @typedef {object} NumberField~propTypes
 * @property {string}   [id]
 * @property {string}   [ariaLabel]
 * @property {string}   [label]
 * @property {string}   [value]
 * @property {string}   [fieldClassExtras] If specified additional CSS
 * classes to add to the outer field container.
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {NumberField~onChange} [onChange]  onChange event handler.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 * @property {boolean} [isFloat]    If <code>true</code> the values are restricted to
 * integers.
 * @property {number} [increment]   The amount to increment/decrement the value when
 * the up or down arrow keys are pressed. (not yet working...)
 * @property {object} [prependComponent] Optional component to appear before
 * the editor.
 * @property {object} [appendComponent] Optional component to appear after the editor.
 */
NumberField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),

    isFloat: PropTypes.bool,
    increment: PropTypes.number,
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};