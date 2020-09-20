import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { getQuantityDefinition } from '../util/Quantities';
import { CellTextEditor, CellTextDisplay } from './CellTextEditor';

/**
 * React component for editing a quantity in a table cell.
 * Want this to be an editor that attempts to format the value like
 * CellQuantityDisplay, and if it fails and there is no other error
 * displays an error.
 * Also onChange handler?
 * @class
 */

export const CellQuantityEditor = React.forwardRef(
    function CellQuantityEditorImpl(props, ref) {
        const { ariaLabel, inputClassExtras, size,
            onChange, onFocus, onBlur, disabled } = props;

        let { value, errorMsg } = props;
        const quantityDefinition 
            = getQuantityDefinition(props.quantityDefinition);
        if (!quantityDefinition) {
            return null;
        }

        if (typeof value === 'number') {
            value = quantityDefinition.baseValueToValueText(value);
        }
        else if (!errorMsg) {
            // Validate the value.
            if (value !== '') {
                if (quantityDefinition.fromValueText(value) === undefined) {
                    errorMsg = userMsg('CellQuantityEditor-invalid_value', 
                        quantityDefinition.getDisplayText());
                }
            }
        }

        return <CellTextEditor
            ariaLabel = {ariaLabel}
            value = {value}
            inputClassExtras = {inputClassExtras}
            size = {size}
            errorMsg = {errorMsg}
            onChange = {onChange}
            onFocus = {onFocus}
            onBlur = {onBlur}
            disabled = {disabled}
            ref = {ref}
        />;
    }
);


/**
 * @typedef {object} CellQuantityEditor~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
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
CellQuantityEditor.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    quantityDefinition: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


/**
 * React component that's a display representation of {@link CellQuantityEditor}.
 * @param {*} props 
 */
export function CellQuantityDisplay(props) {
    const { ariaLabel, quantityBaseValue, 
        inputClassExtras } = props;
    if (!props.quantityDefinition) {
        return null;
    }

    const quantityDefinition 
        = getQuantityDefinition(props.quantityDefinition);

    let { size } = props;
    let value;
    if (!quantityDefinition || (quantityBaseValue === undefined)) {
        value = '';
    }
    else {
        if (typeof quantityBaseValue === 'number') {
            value = quantityDefinition.baseValueToValueText(quantityBaseValue);
        }
        else {
            value = quantityBaseValue;
        }
        if (size && (size < 0)) {
            size = Math.max(value.length, -size);
        }
    }

    return <CellTextDisplay
        ariaLabel = {ariaLabel}
        value = {value}
        inputClassExtras = {inputClassExtras}
        size = {size}
    />;
}


/**
 * @typedef {object} CellQuantityDisplay~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {number}   [size]  If specified and &lt; 0 then this is
 * the default size for the input field and will be enlarged to fit
 * the number of characters in the quantity as needed.
 */
CellQuantityDisplay.propTypes = {
    ariaLabel: PropTypes.string,
    quantityBaseValue: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
    ]),
    quantityDefinition: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    inputType: PropTypes.string,
};
