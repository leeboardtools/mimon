import React from 'react';
import PropTypes from 'prop-types';


/**
 * Component for a menu list. This is used by {@link Dropdown} for its drop down
 * menu and by {@link ContextMenu} for the menu.
 * @class
 */
export class MenuList extends React.Component {
    constructor(props) {
        super(props);

        this._menuRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.alwaysFocus) {
            this._menuRef.current.focus();
        }
    }

    componentWillUnmount() {
    }


    getBoundingClientRect() {
        return this._menuRef.current.getBoundingClientRect();
    }


    render() {
        const { props } = this;
        const itemClassExtras = props.itemClassExtras || '';

        let dividerCount = 0;
        const items = props.items.map((item) => {
            if (!item.id) {
                ++dividerCount;
                return <div className="dropdown-divider" key={dividerCount}></div>;
            }

            let className = 'dropdown-item ' + itemClassExtras;
            if (item.classExtras) {
                className += ' ' + item.classExtras;
            }

            if (item.checked) {
                className += ' dropdown-item-checked';
            }

            let onClick;
            if (item.disabled) {
                className += ' disabled';
            }
            else {
                onClick = (item.onChooseItem) 
                    ? () => item.onChooseItem(item.id)
                    : ((props.onChooseItem)
                        ? () => props.onChooseItem(item.id)
                        : undefined);
            }

            let itemComponent;
            if (item.onRender) {
                itemComponent = item.onRender(item);
            }
            else {
                itemComponent = item.label;
            }

            if (item.subMenuItems) {
                // TODO: Not yet supported, remove the disabled once submenus work...
                return <div className="dropdown-submenu"
                    key={item.id}
                >
                    <a className="dropdown-item dropdown-toggle disabled" href="#">
                        {itemComponent}</a>
                    <MenuList 
                        items={item.subMenuItems}
                    />
                </div>;
            }

            return <a className={className}
                key={item.id}
                href="#"
                onClick={onClick}
            >
                {itemComponent}
            </a>;
        });

        let menuClassName = 'dropdown-menu ';
        const { menuClassExtras } = props;
        if (menuClassExtras) {
            menuClassName += ' ' + menuClassExtras;
        }

        return <div className={menuClassName}
            ref={this._menuRef}
        >
            {items}
        </div>;
    }
}


/**
 * @callback MenuList~onChooseItem
 * @param {*}   id  The id of the chosen item.
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
 * @property {string} [menuClassExtras] Extra classes to add to the menu item container
 * @property {string} [itemClassExtras] Extra classes to add to the individual items.
 * @property {Dropdown~onChooseItem}    [onChooseItem] Callback called when an item
 * is chosen if the item does not have an onChooseItem property.
 */
MenuList.propTypes = {
    items: PropTypes.array.isRequired,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
    alwaysFocus: PropTypes.bool,
};
