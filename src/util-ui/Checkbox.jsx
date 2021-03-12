import React from 'react';
import PropTypes from 'prop-types';


/**
 * A simple checkbox React component, supports a built-in label to the right
 * of the check box.
 * @class
 */
export function Checkbox(props) {
    const onChange = props.onChange || (() => {});
    const { value, label, tabIndex, classExtras, children } = props;
    let ariaLabel = props.ariaLabel || label;
    let buttonClassName = 'Checkbox Text-center';
    if (value) {
        buttonClassName += ' Checkbox-checked';
    }

    if (!label && !children && classExtras) {
        buttonClassName += ' ' + classExtras;
    }

    const button = <div className = {buttonClassName}
        aria-label = {ariaLabel}
        onClick = {(e) => onChange(!value)}
        onKeyDown = {(e) => {
            if (e.key === ' ') {
                onChange(!value);
            }
        }}
        tabIndex = {tabIndex}
    ></div>;
    if (!label && !children) {
        return button;
    }

    let containerClassName = 'Input-group';
    if (classExtras) {
        containerClassName += ' ' + classExtras;
    }

    let labelComponent;
    if (label) {
        labelComponent = <div className = "Checkbox-label">
            {label}
        </div>;
    }

    return <div className = {containerClassName}>
        {button}
        {labelComponent}
        {children}
    </div>;
}

/**
 * @callback Checkbox~onChangeCallback
 * @param {bool} isCheck The new state for the checkbox.
 */

/**
 * @typedef {object} Checkbox~propTypes
 * @property {*} [value] If truthy the checkbox is checked.
 * @property {string} [label]
 * @property {string} [ariaLabel]
 * @property {number} [tabIndex]
 * @property {string} [classExtras]
 * @property {Checkbox~onChangeCallback} [onChange]
 * @property {*} [children]
 */
Checkbox.propTypes = {
    value: PropTypes.any,
    label: PropTypes.string,
    ariaLabel: PropTypes.string,
    tabIndex: PropTypes.number,
    classExtras: PropTypes.string,
    onChange: PropTypes.func,
    children: PropTypes.any,
};