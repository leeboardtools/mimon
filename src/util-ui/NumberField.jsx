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


export function numberFieldOnKeyDown(e, value, isFloat, increment, onChange) {
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

export function numberFieldOnChange(e, value, isFloat, increment, onChange) {
    // TODO:
    // Resolve any simple math operations.
    let newValue = valueToNumber(e.target.value, isFloat);
    if (!isNaN(newValue)) {
        e.target.value = newValue;
    }
    onChange(e, newValue);
}


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