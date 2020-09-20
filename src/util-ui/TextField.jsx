import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';


/**
 * React component for basic text editing
 * @class
 */
export const TextField = React.forwardRef(
    function TextFieldImpl(props, ref) {
        const { label, id, ariaLabel, value, inputClassExtras, errorMsg, 
            onChange, onFocus, onBlur, disabled } = props;

        return <Field
            id={id}
            label={label}
            errorMsg={errorMsg}
            editorClassExtras={inputClassExtras}
            onRenderEditor={(inputClassName) =>
                <input type="text"
                    id={id}
                    className={inputClassName}
                    aria-label={ariaLabel}
                    value={value || ''}
                    disabled={disabled}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    ref={ref}
                />
            }
        />;
    }
);


/**
 * @typedef {object} TextField~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [label]
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
TextField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};
