import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';
import { CellDateEditor } from './CellDateEditor';


/**
 * React component for basic number editing in a field.
 * @class
 */
export const DateField = React.forwardRef(
    function DateFieldImpl(props, ref) {
        const { inputClassExtras, ariaLabel, value, errorMsg,
            onChange, onFocus, onBlur,
            disabled, dateFormat, locale, tabIndex,
            ...passThroughProps } = props;

        return <Field
            {...passThroughProps}
            editorClassExtras={inputClassExtras}
            onRenderEditor={(inputClassName) =>
                <CellDateEditor
                    id={props.id}
                    className={inputClassName}
                    aria-label={ariaLabel}
                    value={value || ''}
                    errorMsg={errorMsg}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={disabled}
                    dateFormat = {dateFormat}
                    locale = {locale}
                    tabIndex = {tabIndex}
                    ref={ref}
                />
            }
        />;
    }
);

/**
 * @callback DateField~onChange
 * @param {Event} e The change event. e.target.value is the entered text if the
 * text is not a valid number.
 * @param {number} newValue The number entered, if the text entered was not a valid
 * number this is NaN.
 */


/**
 * @typedef {object} DateField~propTypes
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
 * @property {DateField~onChange} [onChange]  onChange event handler.
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
DateField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    dateFormat: PropTypes.string,
    locale: PropTypes.string,
    tabIndex: PropTypes.number,
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};