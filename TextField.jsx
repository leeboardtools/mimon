import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';


/**
 * React component for basic text editing
 * @class
 */
export const TextField = React.forwardRef(
    function TextFieldImpl(props, ref) {
        const { ariaLabel, value, inputClassExtras, placeholder,
            onChange, onFocus, onBlur, onKeyDown, disabled, 
            ...passThroughProps } = props;

        return <Field
            {...passThroughProps}
            editorClassExtras = {inputClassExtras}
            onRenderEditor = {(inputClassName) =>
                <input type="text"
                    id = {props.id}
                    className = {'Field-editor TextField-editor' 
                        + (inputClassName || '')}
                    aria-label = {ariaLabel}
                    value = {value || ''}
                    placeholder = {placeholder}
                    disabled = {disabled}
                    onChange = {onChange}
                    onFocus = {onFocus}
                    onBlur = {onBlur}
                    onKeyDown = {onKeyDown}
                    ref = {ref}
                />
            }
        />;
    }
);


/**
 * @typedef {object} TextField~propTypes
 * @property {string}   [id]
 * @property {string}   [ariaLabel]
 * @property {string}   [label]
 * @property {string}   [value]
 * @property {string}   [placeholder]
 * @property {string}   [fieldClassExtras] If specified additional CSS
 * classes to add to the outer field container.
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
 * @property {function} [onKeyDown]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onkeydown}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 * @property {object} [prependComponent] Optional component to appear before
 * the editor.
 * @property {object} [appendComponent] Optional component to appear after the editor.
 */
TextField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onKeyDown: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    prependComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    appendComponent: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
};
