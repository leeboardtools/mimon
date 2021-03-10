import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';
import * as EU from '../util/ElementUtils';
import deepEqual from 'deep-equal';


/**
 * React component for a dropdown selector. A DropdownSelector differs from a 
 * {@link DropdownMenu} in that the selector is a control, it displays the 
 * selected value in the button, and selections call a callback prop.
 * @class
 */
export class DropdownSelector extends React.Component {
    constructor(props) {
        super(props);

        this.closeDropdown = this.closeDropdown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onDropdownListBlur = this.onDropdownListBlur.bind(this);
        this.onItemClick = this.onItemClick.bind(this);

        this._outerRef = React.createRef();
        this._buttonRef = React.createRef();
        this._dropdownListRef = React.createRef();

        this.state = {
            isDropdownListShown: false,
        };
    }


    focus() {
        if (this.state.isDropdownListShown) {
            if (EU.setFocus(this._dropdownListRef.current)) {
                return;
            }
        }

        EU.setFocus(this._buttonRef.current);
    }


    componentDidMount() {
        this.updateActiveValue();
    }


    componentDidUpdate(prevProps, prevState) {
        if (prevState.isDropdownListShown !== this.state.isDropdownListShown) {
            // If we have focus we need to update who actually has focus...
            if (EU.isElementAncestor(this._outerRef.current, document.activeElement)) {
                this.focus();
            }
        }
        
        if ((this.props.value !== prevProps.value)
         || (!deepEqual(this.props.items, prevProps.items))) {
            this.updateActiveValue();
        }
    }


    updateActiveValue() {
        const { items } = this.props;
        const activeValue = this.props.value;
        const itemValues = [];

        let activeIndex = -1;
        for (let i = 0; i < items.length; ++i) {
            const { value } = items[i];
            itemValues.push(value);
            if (activeIndex < 0) {
                if (value === activeValue) {
                    activeIndex = i;
                }
            }
        }

        this.setState({
            itemValues: itemValues,
            activeIndex: activeIndex,
            originalActiveIndex: activeIndex,
        });
    }


    closeDropdown() {
        this.setState({
            isDropdownListShown: false,
        });
    }


    activateItemAtIndex(index) {
        this.setState((state) => {
            const { itemValues } = state;
            if (index < 0) {
                index = itemValues.length;
            }
            else if (index >= itemValues.length) {
                index = 0;
            }
            return {
                activeIndex: index,
            };
        });
    }


    onKeyDown(e) {
        if (!this.state.isDropdownListShown) {
            return;
        }

        let { activeIndex } = this.state;

        switch (e.key) {
        case 'Enter' :
            if (typeof activeIndex !== 'number') {
                this.onItemClick(e, this.props.value);
            }
            else {
                this.onItemClick(e, this.state.itemValues[activeIndex]);
            }
            e.preventDefault();
            break;

        case 'Escape' :
            this.setState({
                activeIndex: this.state.originalActiveIndex,
            });
            this.closeDropdown();
            e.preventDefault();
            break;
        
        case 'ArrowUp' :
            if (typeof activeIndex !== 'number') {
                activeIndex = 1;
            }
            this.activateItemAtIndex(activeIndex - 1);
            e.preventDefault();
            break;

        case 'ArrowDown' :
            if (typeof activeIndex !== 'number') {
                activeIndex = 1;
            }
            this.activateItemAtIndex(activeIndex + 1);
            e.preventDefault();
            break;
        
        case 'Home' :
            this.activateItemAtIndex(0);
            break;

        case 'End' :
            this.activateItemAtIndex(this.state.itemValues.length - 1);
            break;
        }
    }


    onDropdownListBlur() {
        if (this.state.isDropdownListShown) {
            this.closeDropdown();
        }
    }


    onItemClick(e, value) {
        e.target.value = value;
        this.props.onChange(e, value);
        this.closeDropdown();
    }


    renderItems() {
        const { items } = this.props;

        const itemComponents = [];
        let valueText = '';

        let activeIndexValue = this.props.value;
        const { activeIndex, itemValues } = this.state;
        if (activeIndex >= 0) {
            activeIndexValue = itemValues[activeIndex];
        }

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
            if (activeIndexValue === value) {
                className += 'active ';
                valueText = text;
            }
            if (item.disabled) {
                className += 'disabled ';
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
                        if (!item.disabled) {
                            this.onItemClick(e, value);
                        }
                    }}
                >
                    {component}
                </a>
            );
        });

        return {
            itemComponents: itemComponents,
            valueText: valueText,
        };
    }


    render() {
        const { props } = this;
        const { id, ariaLabel, classExtras, 
            onFocus, onBlur, disabled, } = props;

        const { itemComponents, valueText } = this.renderItems();

        const dropdownList = <div 
            className = "Scrollable-menu DropdownSelector-dropdownList"
            aria-labelledby = {id}
            onKeyDown = {this.onKeyDown}
            onBlur = {this.onDropdownListBlur}
            tabIndex = {0}
            ref = {this._dropdownListRef}
        >
            {itemComponents}
        </div>;


        const { isDropdownListShown } = this.state;

        let buttonClassName = 'btn btn-block border DropdownSelector-button';
        const button = <button className = {buttonClassName} 
            type = "button"
            aria-haspopup = "true"
            aria-expanded = "false"
            onClick = {() => this.setState({ isDropdownListShown: !isDropdownListShown })}
            disabled={disabled}
            ref = {this._buttonRef}
        >
            <div className = "FlexC FlexC-justify-content-between">
                <span>{valueText}</span>
                <span className = "Text-right pl-2">&#x25BE;</span>
            </div>
        </button>;


        let className = 'DropdownSelector';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <div
            id={id}
            className = {className}
            aria-label = {ariaLabel}
            onFocus = {onFocus}
            onBlur = {onBlur}
            ref = {this._outerRef}
        >
            {button}
            <Popup
                show = {isDropdownListShown}
                onClose = {this.closeDropdown}
            >
                {dropdownList}
            </Popup>
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
 * @property {boolean}  [disabled=false]
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
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};