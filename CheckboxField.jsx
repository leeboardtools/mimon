import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';
import { Checkbox } from './Checkbox';


/**
 * React component for basic number editing in a field.
 * @class
 */
export const CheckboxField = React.forwardRef(
    function CheckboxFieldImpl(props, ref) {
        const { inputClassExtras, ariaLabel, value,
            fieldClassExtras,
            checkboxText,
            onChange, onFocus, onBlur,
            disabled, tabIndex,
            ...passThroughProps } = props;

        return <Field
            {...passThroughProps}
            fieldClassExtras = {'CheckboxField ' + (fieldClassExtras || '')}
            editorClassExtras = {inputClassExtras}
            onRenderEditor = {(inputClassName) =>
                <Checkbox
                    id = {props.id}
                    classExtras = {'Field-editor CheckboxField-editor ' 
                        + (inputClassName || '')}
                    aria-label = {ariaLabel}
                    value = {value || ''}
                    label = {checkboxText}
                    onChange = {onChange}
                    onFocus = {onFocus}
                    onBlur = {onBlur}
                    disabled = {disabled}
                    tabIndex = {tabIndex}
                    ref = {ref}
                />
            }
        />;
    }
);



/**
 * @typedef {object} CheckboxField~propTypes
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
 * @property {Checkbox~onChangeCallback} [onChange]  onChange callback. Note the arg
 * is the new value.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 * @property {object} [prependComponent] Optional component to appear before
 * the editor.
 * @property {object} [appendComponent] Optional component to appear after the editor.
 */
CheckboxField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    value: PropTypes.any,
    checkboxText: PropTypes.string,
    fieldClassExtras: PropTypes.string,
    inputClassExtras: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    tabIndex: PropTypes.number,
    prependComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    appendComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
};
