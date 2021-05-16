import React from 'react';
import PropTypes from 'prop-types';
import { userError } from '../util/UserMessages';
import { getQuantityDefinition } from '../util/Quantities';
import { TextField } from './TextField';

/**
 * General expression evaluation callback. If 'expression' does not evaluate
 * to a number, this should throw an exception.
 * @callback EvalExpressionCallback
 * @param {string} expression
 * @returns {number}
 * @throws Error
 */


/**
 * Retrieves the quantity base value of a value from a quantity cell editor.
 * @param {number|string|undefined} value 
 * @param {QuantityDefinition} quantityDefinition 
 * @param {EvalExpressionCallback} [evalExpression] If specified the value is
 * passed to this if it is a string.
 * @returns {number|undefined}  <code>undefined</code> is returned if value is the
 * empty string (after any trimming)
 * @throws {Error}
 */
export function getValidQuantityBaseValue(value, quantityDefinition,
    evalExpression) {

    switch (typeof value) {
    case 'number' :
        return quantityDefinition.numberToBaseValue(value);

    case 'string' :
        value = value.trim();
        if (value !== '') {
            let result;
            try {
                if (evalExpression) {
                    value = quantityDefinition.cleanValueText(value);
                    value = evalExpression(value).toString();
                }
                result = quantityDefinition.fromValueText(value);
            }
            catch (e) {
                //
                console.log('invalidExpression: ' + value + ' ' + e);
            }
            
            if ((result !== undefined) && !result.remainingText) {
                return result.quantity.getBaseValue();
            }
        }
        else {
            return;
        }
        break;
    }

    throw userError('QuantityField-invalid_value', 
        quantityDefinition.getDisplayText());
}

function quantityFieldOnChange(e, value, quantityDefinition, onChange) {
    // TODO:
    // Resolve any simple math operations.
    let newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
        //e.target.value = newValue;
    }
    onChange(e, newValue);
}

/**
 * React component for editing a quantity in a table cell.
 * Want this to be an editor that attempts to format the value like
 * CellQuantityDisplay, and if it fails and there is no other error
 * displays an error.
 * Also onChange handler?
 * @class
 */
export const QuantityField = React.forwardRef(
    function QuantityFieldImpl(props, ref) {
        let { onChange, value, quantityDefinition, errorMsg,
            inputClassExtras,
            ...passThroughProps } = props;

        let inputClassName = 'QuantityField-editor';
        if (inputClassExtras) {
            inputClassName += ' ' + inputClassExtras;
        }

        quantityDefinition 
            = getQuantityDefinition(quantityDefinition);
        if (!quantityDefinition) {
            return null;
        }

        if (typeof value === 'number') {
            value = quantityDefinition.baseValueToValueText(value);
        }
        else if (props.allowEmpty && (!value || !value.trim())) {
            // OK to be empty...
        }
        else if (!errorMsg) {
            // Validate the value.
            try {
                getValidQuantityBaseValue(value, quantityDefinition);
            }
            catch (e) {
                errorMsg = e.toString();
            }
        }

        return <TextField
            value = {value}
            inputClassExtras = {inputClassName}
            errorMsg = {errorMsg}
            onChange = {(e) => quantityFieldOnChange(
                e, value, quantityDefinition, onChange)}
            {...passThroughProps}
            ref = {ref}
        />;
    }
);


/**
 * @typedef {object} QuantityField~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [placeholder]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 */
QuantityField.propTypes = {
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    quantityDefinition: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),

    isFloat: PropTypes.bool,
    increment: PropTypes.number,
    prependComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    appendComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    allowEmpty: PropTypes.bool,
};
