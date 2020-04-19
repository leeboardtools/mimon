import React from 'react';
import PropTypes from 'prop-types';
import { Field } from './Field';


/**
 * React component for basic text editing
 * @class
 */
export const DropdownField = React.forwardRef(
    function DropdownFieldImpl(props, ref) {
        const { label, id, ariaLabel, inputClassExtras, errorMsg, 
            onChange, onFocus, onBlur, disabled, items } = props;

        const itemComponents = [];
        let valueText = '';

        items.forEach((item) => {
            const { value, text, classExtras, onRenderItem, indent } = item;
            let component;
            if (onRenderItem) {
                component = onRenderItem(item);
            }
            else {
                component = text;
            }

            let style;
            if (indent !== undefined) {
                style = {
                    paddingLeft: indent + 0.5 + 'rem',
                };
            }

            let className = 'dropdown-item ';
            if (props.value === value) {
                className += 'active ';
                valueText = text;
            }
            if (classExtras) {
                className += classExtras;
            }

            itemComponents.push(
                <a 
                    value={value} 
                    key={value} 
                    className={className}
                    style={style}
                    onClick={(e) => {
                        e.target.value = value;
                        onChange(e);
                    }}
                >
                    {component}
                </a>
            );
        });

        const menu = <div className="dropdown-menu scrollable-menu"
            aria-labelledby={id}
        >
            {itemComponents}
        </div>;

        let buttonClassName = 'btn btn-block border ';
        const button = <button className={buttonClassName} 
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
        >
            <div className="d-flex justify-content-between">
                <span>{valueText}</span><span className="text-right">&#x25BE;</span>
            </div>
        </button>;

        return <Field
            id={id}
            label={label}
            errorMsg={errorMsg}
            editorClassExtras={inputClassExtras}
            onRenderEditor={(inputClassName) =>
                <div
                    id={id}
                    className={'dropdown' + inputClassName}
                    aria-label={ariaLabel}
                    disabled={disabled}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    ref={ref}
                >
                    {button}
                    {menu}
                </div>
            }
            prependComponent={props.prependComponent}
            appendComponent={props.appendComponent}
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
 * @property {DropdownField~Item[]} items
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
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};
