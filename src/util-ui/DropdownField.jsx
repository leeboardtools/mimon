import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';


/**
 * React component for basic text editing
 * @class
 */
export const DropdownField = React.forwardRef(
    function DropdownFieldImpl(props, ref) {
        const { label, id, ariaLabel, value, inputClassExtras, errorMsg, 
            onChange, onFocus, onBlur, disabled, items } = props;
        
        const itemComponents = [];
        items.forEach((item) => {
            const { value, text, classExtras, onRenderItem, indent } = item;
            let component;
            if (onRenderItem) {
                component = onRenderItem(item);
            }
            else {
                component = ((indent) ? '-'.repeat(indent) : '') + text;
            }

            let style;
            if (indent) {
                style = {
                    paddingLeft: indent + 'rem',
                };
            }

            itemComponents.push(
                <option 
                    value={value} 
                    key={value} 
                    className={classExtras}
                    style={style}
                >
                    {component}
                </option>
            );
        });

        return <Field
            id={id}
            label={label}
            errorMsg={errorMsg}
            editorClassExtras={inputClassExtras}
            onRenderEditor={(inputClassName) =>
                <select
                    id={id}
                    className={inputClassName}
                    aria-label={ariaLabel}
                    value={value || ''}
                    disabled={disabled}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    ref={ref}
                >
                    {itemComponents}
                </select>
            }
        />;
    }
);


/**
 * @callback {DropdownField~onRenderItem}
 * @param {DropdownField~Item}  item
 * @returns {object|undefined}  The React component representing the item.
 */

/**
 * @typedef {object} DropdownField~Item
 * @property {string}   value
 * @property {string}   [text]
 * @property {string}   [classExtras]   Class names to add to the item's class list.
 * @property {DropdownField~onRenderItem}   [onRenderItem]
 * @property {number}   [indent]
 */


/**
 * @typedef {object} DropdownField~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [label]
 * @property {DropdownFiled~Item[]}
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;select&gt; entity.
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
DropdownField.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    items: PropTypes.array.isRequired,
    value: PropTypes.any,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
};
