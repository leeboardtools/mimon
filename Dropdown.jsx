import React from 'react';
import PropTypes from 'prop-types';


/**
 * Component for a dropdown.
 * @class
 */
export function Dropdown(props) {
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

        return <a className={className}
            key={item.id}
            href="#"
            onClick={onClick}
        >
            {itemComponent}
        </a>;
    });


    let topClassName = 'dropdown';
    const { topClassExtras } = props;
    if (topClassExtras) {
        topClassName += ' ' + topClassExtras;
    }
    
    let buttonClassName = (props.noArrow) ? '' : 'dropdown-toggle ';
    const { buttonClassExtras } = props;
    if (buttonClassExtras) {
        buttonClassName += ' ' + buttonClassExtras;
    }

    let menuClassName = 'dropdown-menu ';
    const { menuClassExtras } = props;
    if (menuClassExtras) {
        menuClassName += ' ' + menuClassExtras;
    }

    return <div className={topClassName}>
        <a className={buttonClassName}
            data-toggle="dropdown"
            href="#"
            role="button"
            aria-label={props.ariaLabel}
            aria-haspopup="true"
            aria-expanded="false"
            disabled={props.disabled}
        >
            {props.title}
        </a>
        <div className={menuClassName}>
            {items}
        </div>
    </div>;
}


/**
 * @callback Dropdown~onChooseItem
 * @param {*}   id  The id of the chosen item.
 */

/**
 * @callback Dropdown~onRenderItem
 * @param {Dropdown~Item} item
 * @returns {object}
 */

/**
 * @typedef {object} Dropdown~Item
 * @property {*}    [id]  The id, if falsy then the item represents a separator.
 * @property {string}   [label] If onRender is not given, the label that's rendered.
 * @property {string}   [classExtras]   Class names to add to the item's class list.
 * @property {boolean} [disabled]
 * @property {Dropdown~onChooseItem} [onChooseItem]   If specified the callback called
 * when the item is selected, otherwise the dropdown's onChooseItem is called.
 * @property {Dropdown~onRenderItem}    [onRender]  If specified called to render 
 * the item, otherwise the item should have a label property, which is displayed.
 */

/**
 * @typedef {object} Dropdown~PropTypes
 * @property {string|object}    title   The title of the dropdown, if an object then
 * it must be a react component.
 * @property {string}   [id]
 * @property {string}   [ariaLabel]
 * @property {Dropdown~Item[]}  items
 * @property {boolean} [disabled]
 * @property {string}   [topClassExtras]    Extra classes to add to the top level.
 * @property {boolean} [noArrow]    If truthy no dropdrown arrow is displayed.
 * @property {string} [buttonClassExtras]   Extra classes to add to the button.
 * @property {string} [menuClassExtras] Extra classes to add to the menu item container
 * @property {string} [itemClassExtras] Extra classes to add to the individual items.
 * @property {Dropdown~onChooseItem}    [onChooseItem] Callback called when an item
 * is chosen if the item does not have an onChooseItem property.
 */
Dropdown.propTypes = {
    title: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]).isRequired,
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    items: PropTypes.array.isRequired,
    disabled: PropTypes.bool,
    topClassExtras: PropTypes.string,
    noArrow: PropTypes.bool,
    buttonClassExtras: PropTypes.string,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
};
