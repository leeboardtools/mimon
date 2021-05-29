import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';
import * as EU from '../util/ElementUtils';
import deepEqual from 'deep-equal';
import { KeysContextSelector } from '../util/KeyContextSelector';


/**
 * React component for a dropdown selector. A DropdownSelector differs from a 
 * {@link DropdownMenu} in that the selector is a control, it displays the 
 * selected value in the button, and selections call a callback prop.
 */
export class DropdownSelector extends React.Component {
    constructor(props) {
        super(props);

        this.closeDropdown = this.closeDropdown.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onDropdownListBlur = this.onDropdownListBlur.bind(this);
        this.onItemClick = this.onItemClick.bind(this);
        this.onSelectFromKeys = this.onSelectFromKeys.bind(this);
        this.onBlur = this.onBlur.bind(this);

        this._outerRef = React.createRef();
        this._buttonRef = React.createRef();
        this._dropdownListRef = React.createRef();
        this._activeItemRef = React.createRef();

        this._keysContextSelector = new KeysContextSelector({
            onSelectFromKeys: this.onSelectFromKeys,
        });

        this.state = {
            isDropdownListShown: false,
        };
    }


    focus() {
        if (this.state.isDropdownListShown) {
            // Can't focus to the active item because it doesn't handle keys (for now...)
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
        const { props, state } = this;
        if (prevState.isDropdownListShown !== state.isDropdownListShown) {
            // If we have focus we need to update who actually has focus...
            if (EU.isElementAncestor(this._outerRef.current, document.activeElement)) {
                this.focus();
            }
            if (state.isDropdownListShown) {
                this.positionActiveItem();
            }
        }
        
        if ((props.value !== prevProps.value)
         || (!deepEqual(props.items, prevProps.items))) {
            this.updateActiveValue();
        }

        if (state.activeIndex !== state.positionedActiveIndex) {
            this.positionActiveItem();
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
            positionedActiveIndex: -1,
            originalActiveIndex: activeIndex,
        });
    }


    positionActiveItem() {
        const { activeIndex } = this.state;

        const container = this._dropdownListRef.current;
        const element = this._activeItemRef.current;
        if (container && element) {
            const containerTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const scrollHeight = container.scrollHeight;

            if (scrollHeight > containerHeight ) {
                const scrollBottom = containerHeight + container.scrollTop;
                const elementBottom = element.offsetTop + element.offsetHeight;
                if (elementBottom > scrollBottom) {
                    container.scrollTop = elementBottom - containerHeight;
                }
                else if (element.offsetTop < containerTop) {
                    container.scrollTop = element.offsetTop;
                }
            }

            this.setState({
                positionedActiveIndex: activeIndex,
            });
        }

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
                index = itemValues.length - 1;
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
        let { activeIndex } = this.state;

        switch (e.key) {
        case 'Enter' :
            if (!this.state.isDropdownListShown) {
                this.setState({ 
                    isDropdownListShown: true,
                });
            }
            else {
                if (typeof activeIndex !== 'number') {
                    this.onItemClick(e, this.props.value);
                }
                else {
                    this.onItemClick(e, this.state.itemValues[activeIndex]);
                }
            }
            e.preventDefault();
            e.stopPropagation();
            break;

        case 'Escape' :
            this.setState({
                activeIndex: this.state.originalActiveIndex,
            });
            if (this.state.isDropdownListShown) {
                this.closeDropdown();
                e.preventDefault();
                e.stopPropagation();
            }
            break;
        
        case 'ArrowUp' :
            if (typeof activeIndex !== 'number') {
                activeIndex = 1;
            }
            this.activateItemAtIndex(activeIndex - 1);
            e.preventDefault();
            e.stopPropagation();
            break;

        case 'ArrowDown' :
            if (typeof activeIndex !== 'number') {
                activeIndex = 1;
            }
            this.activateItemAtIndex(activeIndex + 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        
        case 'Home' :
            this.activateItemAtIndex(0);
            e.preventDefault();
            e.stopPropagation();
            break;

        case 'End' :
            this.activateItemAtIndex(this.state.itemValues.length - 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        
        default :
            {
                const { onKeyDown } = this.props;
                if (onKeyDown) {
                    onKeyDown(e);
                    if (e.isDefaultPrevented || e.isPropagationStopped) {
                        return;
                    }
                }

                this._keysContextSelector.onKeyDown(e);
            }
            break;
        }
    }


    onSelectFromKeys(keysSoFar, e) {
        let { activeIndex, itemValues } = this.state;
        if (typeof activeIndex !== 'number') {
            activeIndex = 0;
        }

        let match = this.findMatchInRange(keysSoFar, activeIndex + 1, itemValues.length);
        if (match === undefined) {
            match = this.findMatchInRange(keysSoFar, 0, activeIndex);
        }
        if (match !== undefined) {
            this.activateItemAtIndex(match);
        }

        e.preventDefault();
        e.stopPropagation();
    }

    findMatchInRange(keysSoFar, startIndex, endIndex) {
        const { items } = this.props;
        if (items) {
            for (let i = startIndex; i < endIndex; ++i) {
                // 
                const item = items[i];
                const text = item.text || item.value;
                if (text && !text.toUpperCase().indexOf(keysSoFar)) {
                    return i;
                }
            }
        }
    }


    onDropdownListBlur() {
        if (this.state.isDropdownListShown) {
            this.closeDropdown();
        }
    }


    onBlur(e) {
        if (e.relatedTarget && this._outerRef.current) {
            if (this._outerRef.current.contains(e.relatedTarget)) {
                return;
            }
        }

        const { activeIndex, itemValues } = this.state;
        if (itemValues 
         && (activeIndex >= 0) && (activeIndex < itemValues.length)) {
            let { value } = this.props;
            if (itemValues[activeIndex] !== value) {
                value = itemValues[activeIndex];
                const changeEvent = {
                    target: {
                        value: value,
                    }
                };
                this.props.onChange(changeEvent, value);
            }
        }

        const { onBlur } = this.props;
        if (onBlur) {
            onBlur(e);
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

            let className = 'Dropdown-item ';
            let itemRef;
            if (activeIndexValue === value) {
                className += 'active ';
                valueText = text;
                itemRef = this._activeItemRef;
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
                    ref = {itemRef}
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
            onFocus, disabled, } = props;

        const { isDropdownListShown } = this.state;

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


        let buttonClassName = 'Btn Btn-block Border DropdownSelector-button';
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
                <span className = "Text-right Pl-2">&#x25BE;</span>
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
            onKeyDown = {this.onKeyDown}
            onBlur = {this.onBlur}
            ref = {this._outerRef}
        >
            {button}
            <Popup
                show = {isDropdownListShown}
                onClose = {this.closeDropdown}
                isDebug = {props.isDebug}
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
 * @property {function} [onKeyDown] onKeyDown event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onkeydown},
 * this is only called for the keys not handled by the dropdown. This is called before
 * any key context processing, to ignore the key context processing either 
 * e.preventDefault() or e.stopPropagation() should be called.
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
    onKeyDown: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    isDebug: PropTypes.bool,
};