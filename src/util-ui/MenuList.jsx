import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';
import * as EU from '../util/ElementUtils';


/**
 * Component for a menu list. This is used by {@link DropdownMenu} for its drop down
 * menu and by {@link ContextMenu} for the menu.
 * @class
 */
export class MenuList extends React.Component {
    constructor(props) {
        super(props);

        this.closeMenu = this.closeMenu.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.backgroundCheckForClose = this.backgroundCheckForClose.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onCloseSubMenu = this.onCloseSubMenu.bind(this);

        this._popupRef = React.createRef();
        this._containerRef = React.createRef();
        this._openSubMenuRef = React.createRef();

        this.state = {
        };
    }


    componentDidMount() {
        if (!this.props.parentRef) {
            window.requestAnimationFrame(this.backgroundCheckForClose);
        }
    }


    componentWillUnmount() {
        this._isUnmounting = true;
    }


    backgroundCheckForClose() {
        const topRef = this._containerRef;
        const { activeElement } = document;

        if (topRef.current) {
            if (activeElement && !EU.isElementAncestor(topRef.current, activeElement)) {
                this.closeMenu();
                return;
            }

        }

        if (!this._isUnmounting) {
            window.requestAnimationFrame(this.backgroundCheckForClose);
        }
    }


    componentDidUpdate(prevProps, prevState) {
        if ((this.state.openSubMenu && !prevState.openSubMenu)
         || (this.props.show && !prevProps.show)) {
            this.focus();
        }
    }


    getBoundingClientRect() {
        return this._popupRef.current.getBoundingClientRect();
    }



    focus() {
        if (EU.setFocus(this._openSubMenuRef.current)) {
            return;
        }
        if (EU.setFocus(this._containerRef.current)) {
            return;
        }
    }


    closeMenu(chosenItem) {
        this.setState({
            isClosing: true,
        });

        const { onMenuClose } = this.props;
        if (onMenuClose) {
            onMenuClose(chosenItem ? chosenItem.id : undefined);
        }
    }


    openSubMenu(item) {
        this.setState({
            openSubMenu: item,
        });
        this._isSubMenuClose = false;
    }

    closeSubMenu() {
        this.setState({
            openSubMenu: undefined,
        });
    }

    onCloseSubMenu(subMenuItem, chosenId) {
        if (subMenuItem === this.state.openSubMenu) {
            this.closeSubMenu();
        }
        else {
            this._isSubMenuClose = true;
        }

        if (chosenId !== undefined) {
            this.closeMenu();
        }
        else {
            window.requestAnimationFrame(() => this.focus());
        }
    }


    onBlur(e) {
        if (!e.currentTarget.contains(e.relatedTarget)
         && !this._isSubMenuClose) {
            // Focus leaving self...
            this.closeMenu();
        }
        this._isSubMenuClose = false;
    }


    activateItem(item) {
        const index = this.props.items.indexOf(item);
        this.activateItemAtIndex(index);
    }


    activateItemAtIndex(index, delta) {
        const { items } = this.props;

        if (delta) {
            if (index >= items.length) {
                index = 0;
            }
            else if (index < 0) {
                index = items.length - 1;
            }

            if (index >= 0) {
                const startIndex = index;
                while (items[index].disabled || !items[index].id) {
                    if (delta > 0) {
                        ++index;
                        if (index >= items.length) {
                            index = 0;
                        }
                    }
                    else {
                        --index;
                        if (index < 0) {
                            index = items.length - 1;
                        }
                    }
                    if (index === startIndex) {
                        index = -1;
                        break;
                    }
                }
            }
        }

        this.setState((state) => {
            const newState = {
                activeIndex: index,
            };
            if ((index >= 0) && (index < items.length)) {
                if (state.openSubMenu && !items[index].subMenuItems) {
                    newState.openSubMenu = undefined;
                }
            }
            return newState;
        });
    }


    onKeyDown(e) {
        let { activeIndex } = this.state;

        switch (e.key) {
        case 'Enter' :
            if (typeof activeIndex === 'number') {
                const activeItem = this.props.items[activeIndex];
                if (activeItem) {
                    this.onChooseItem(activeItem);
                }
            }
            break;

        case 'Escape' :
            this.closeMenu();
            break;
        
        case 'ArrowUp' :
            if (typeof activeIndex !== 'number') {
                activeIndex = 1;
            }
            this.activateItemAtIndex(activeIndex - 1, -1);
            break;

        case 'ArrowDown' :
            if (typeof activeIndex !== 'number') {
                activeIndex = -1;
            }
            this.activateItemAtIndex(activeIndex + 1, 1);
            break;
        
        case 'ArrowRight' :
            // If the active item is a sub menu, we want to show the submenu.
            if (typeof activeIndex === 'number') {
                const activeItem = this.props.items[activeIndex];
                if (activeItem && !activeItem.disabled && activeItem.subMenuItems) {
                    this.openSubMenu(activeItem);
                }
            }
            break;
        
        case 'Home' :
            this.activateItemAtIndex(0, 1);
            break;

        case 'End' :
            this.activateItemAtIndex(this.state.itemValues.length - 1, -1);
            break;

        default :
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
    }


    onChooseItem(item) {
        this.closeMenu(item);

        const onChooseItem = (item.onChooseItem)
            ? item.onChooseItem
            : this.props.onChooseItem;
        if (onChooseItem) {
            onChooseItem(item.id);
        }
    }


    render() {
        const { props } = this;
        const itemClassExtras = props.itemClassExtras || '';

        const activeItem = props.items[this.state.activeIndex];

        let dividerCount = 0;
        const items = props.items.map((item) => {
            if (!item.id) {
                ++dividerCount;
                return <div className="MenuList-divider" key={dividerCount}></div>;
            }

            let className = 'MenuList-item ' + itemClassExtras;
            if (item.classExtras) {
                className += ' ' + item.classExtras;
            }

            if (item.checked) {
                className += 'MenuList-item-checked';
            }

            let onClick;
            if (item.disabled) {
                className += ' disabled';
            }
            else {
                if (item === activeItem) {
                    className += ' active';
                }

                onClick = () => this.onChooseItem(item);
            }

            let itemComponent;
            if (item.onRender) {
                itemComponent = item.onRender(item);
            }
            else {
                itemComponent = item.label;
            }

            if (item.subMenuItems) {
                // Dropdown-toggle displays the arrow...
                className += ' Dropdown-toggle';

                let subMenuRef;
                let showSubMenu;
                if (item === this.state.openSubMenu) {
                    showSubMenu = true;
                    subMenuRef = this._openSubMenuRef;
                    className += ' active';
                }

                const parentRef = this.props.parentRef
                    || this._containerRef;

                return <div className="MenuList-submenu"
                    key={item.id}
                >
                    <a className = {className}
                        href="#"
                        onMouseEnter = {() => {
                            this.activateItem(item);
                            this.openSubMenu(item);
                        }}
                        tabIndex = {-1}
                    >
                        {itemComponent}</a>
                    <MenuList 
                        id = {item.id}
                        items = {item.subMenuItems}
                        onMenuClose = {(chosenItem) => this.onCloseSubMenu(
                            item, chosenItem
                        )}
                        show = {showSubMenu}
                        parentRef = {parentRef}
                        ref = {subMenuRef}
                    />
                </div>;
            }

            return <a className={className}
                key={item.id}
                href="#"
                onClick={onClick}
                onMouseEnter = {() => this.activateItem(item)}
                onMouseLeave = {() => this.activateItem()}
                tabIndex = {-1}
            >
                {itemComponent}
            </a>;
        });

        let className = 'MenuList';
        const { menuClassExtras } = props;
        if (menuClassExtras) {
            className += ' ' + menuClassExtras;
        }

        const { x, y } = props;
    
        let hAlignParent;
        let hAlignPopup;
        let vAlignParent;
        let vAlignPopup;
        if (this.props.parentRef) {
            hAlignParent = 'right';
            hAlignPopup = 'left';
            vAlignParent = 'top';
            vAlignPopup = 'top';
        }
        else if (x === undefined) {
            hAlignParent = 'left';
            hAlignPopup = 'left';
            vAlignParent = 'bottom';
            vAlignPopup = 'top';
        }

        return <Popup
            classExtras = {className}
            x = {x}
            y = {y}
            hAlignParent = {hAlignParent}
            hAlignPopup = {hAlignPopup}
            vAlignParent = {vAlignParent}
            vAlignPopup = {vAlignPopup}
            show = {this.props.show}
            onClose = {this.closeMenu}
            ref = {this._popupRef}
        >
            <div
                className = "MenuList-itemsContainer"
                onKeyDown = {this.onKeyDown}
                onBlur = {this.onBlur}
                tabIndex = {0}
                ref = {this._containerRef}
            >
                {items}
            </div>
        </Popup>;
    }
}


/**
 * @callback MenuList~onChooseItem
 * @param {*}   id  The id of the chosen item.
 */

/**
 * @callback MenuList~onMenuClose
 * @param {*} [closeId] The id of the chosen item causing the menu to close if it there
 * was a chose item, otherwise <code>undefined</code>.
 */

/**
 * @callback MenuList~onRenderItem
 * @param {MenuList~Item} item
 * @returns {object}
 */

/**
 * @typedef {object} MenuList~Item
 * @property {*}    [id]  The id, if falsy then the item represents a separator.
 * @property {string}   [label] If onRender is not given, the label that's rendered.
 * @property {string}   [classExtras]   Class names to add to the item's class list.
 * @property {boolean} [disabled]
 * @property {MenuList~onChooseItem} [onChooseItem]   If specified the callback called
 * when the item is selected, otherwise the dropdown's onChooseItem is called.
 * @property {MenuList~onRenderItem}    [onRender]  If specified called to render 
 * the item, otherwise the item should have a label property, which is displayed.
 */

/**
 * @typedef {object} MenuList~propTypes
 * @property {MenuList~Item[]}  items
 * @property {boolean} [show] 
 * @property {number} [x] For popup menus, the x location.
 * @property {number} [y] For popup menus, the y location.
 * @property {string} [menuClassExtras] Extra classes to add to the menu item container
 * @property {string} [itemClassExtras] Extra classes to add to the individual items.
 * @property {MenuList~onChooseItem} [onChooseItem] Callback called when an item
 * is chosen if the item does not have an onChooseItem property.
 * @property {MenuList~onMenuClose} [onMenuClose] Callback called when the menu is closed.
 * @property {object} [parentRef] Only for use by MenuList, used to tell the submenus
 * of their parent...
 */
MenuList.propTypes = {
    items: PropTypes.array.isRequired,
    show: PropTypes.bool,
    x: PropTypes.number,
    y: PropTypes.number,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
    onMenuClose: PropTypes.func,
    alwaysFocus: PropTypes.bool,
    parentRef: PropTypes.object,
    id: PropTypes.any,
};

