import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';
import { DropdownSelector } from './DropdownSelector';


/**
 * React component for basic text editing
 * @class
 */
export const DropdownField = React.forwardRef(
    function DropdownFieldImpl(props, ref) {
        const { label, id, fieldClassExtras, inputClassExtras, errorMsg, 
            ...selectorProps } = props;
        const selector = <DropdownSelector
            classExtras = {inputClassExtras}
            {...selectorProps}
            ref = {ref}
        />;

        return <Field
            id={id}
            label={label}
            errorMsg={errorMsg}
            fieldClassExtras = {fieldClassExtras}
            editorClassExtras={inputClassExtras}
            onRenderEditor={() => selector}
            prependComponent={props.prependComponent}
            appendComponent={props.appendComponent}
        />;
    }
);


/**
 * @typedef {object} DropdownField~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [label]
 * @property {DropdownSelector~Item[]} items
 * @property {string}   [value]
 * @property {string}   [fieldClassExtras]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the {@link DropdownSelector}.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
DropdownField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    items: PropTypes.array.isRequired,
    value: PropTypes.any,
    fieldClassExtras: PropTypes.string,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};
