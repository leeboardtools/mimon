import React from 'react';
import PropTypes from 'prop-types';


/**
 * React component for a dropdown selector. A DropdownSelector differs from a 
 * {@link DropdownMenu} in that the selector is a control, it displays the 
 * selected value in the button, and selections call a callback prop.
 * @class
 */
export class DropdownSelector extends React.Component {
    constructor(props) {
        super(props);

        this._dropdownRef = React.createRef();
    }

    focus() {
        if (this._dropdownRef.current) {
            this._dropdownRef.current.focus();
        }
    }

    render() {
        const { props } = this;
        const { id, ariaLabel, classExtras, 
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
                    value = {value} 
                    key = {value} 
                    className = {className}
                    style = {style}
                    onClick = {(e) => {
                        e.target.value = value;
                        onChange(e);
                    }}
                >
                    {component}
                </a>
            );
        });

        const menu = <div className = "dropdown-menu scrollable-menu"
            aria-labelledby = {id}
        >
            {itemComponents}
        </div>;

        let buttonClassName = 'btn btn-block border ';
        const button = <button className = {buttonClassName} 
            type = "button"
            data-toggle = "dropdown"
            aria-haspopup = "true"
            aria-expanded = "false"
            disabled={disabled}
        >
            <div className = "d-flex justify-content-between">
                <span>{valueText}</span>
                <span className = "text-right pl-2">&#x25BE;</span>
            </div>
        </button>;


        let className = 'dropdown DropdownSelector';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <div
            id={id}
            className = {className}
            aria-label = {ariaLabel}
            onFocus = {onFocus}
            onBlur = {onBlur}
            ref = {this._dropdownRef}
        >
            {button}
            {menu}
        </div>;
    }
}



/**
 * @callback {DropdownSelector~onRenderItem}
 * @param {DropdownSelector~Item}  item
 * @returns {object|undefined}  The React component representing the item.
 */

/**
 * @typedef {object} DropdownSelector~Item
 * @property {string}   value
 * @property {string}   [text]
 * @property {string}   [classExtras]   Class names to add to the item's class list.
 * @property {DropdownSelector~onRenderItem}   [onRenderItem]
 * @property {number}   [indent]
 */


/**
 * @typedef {object} DropdownSelector~propTypes
 * @property {string}   [ariaLabel]
 * @property {DropdownSelector~Item[]} items
 * @property {string}   [value]
 * @property {string}   [classExtras]
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
DropdownSelector.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    items: PropTypes.array.isRequired,
    value: PropTypes.any,
    classExtras: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};