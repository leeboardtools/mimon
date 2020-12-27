import React from 'react';
import PropTypes from 'prop-types';
import { MenuList } from './MenuList';

import Popper from 'popper.js';

// This is to keep the drop down from being blurry...
// See https://github.com/twbs/bootstrap/issues/27955
Popper.Defaults.modifiers.computeStyle.gpuAcceleration = false;

/**
 * Component for a dropdown menu.
 * @class
 */
export function DropdownMenu(props) {
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
        <MenuList
            items={props.items}
            menuClassExtras={props.menuClassExtras}
            itemClassExtras={props.itemClassExtras}
            onChooseItem={props.onChooseItem}
        />
        {props.children}
    </div>;
}


/**
 * @typedef {object} DropdownMenu~PropTypes
 * @property {string|object}    title   The title of the dropdown, if an object then
 * it must be a react component.
 * @property {string}   [id]
 * @property {string}   [ariaLabel]
 * @property {MenuList~Item[]}  items
 * @property {boolean} [disabled]
 * @property {string}   [topClassExtras]    Extra classes to add to the top level.
 * @property {boolean} [noArrow]    If truthy no dropdrown arrow is displayed.
 * @property {string} [buttonClassExtras]   Extra classes to add to the button.
 * @property {string} [menuClassExtras] Extra classes to add to the menu item container
 * @property {string} [itemClassExtras] Extra classes to add to the individual items.
 * @property {MenuList~onChooseItem}    [onChooseItem] Callback called when an item
 * is chosen if the item does not have an onChooseItem property.
 */
DropdownMenu.propTypes = {
    title: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]).isRequired,
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    items: PropTypes.array.isRequired,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    topClassExtras: PropTypes.string,
    noArrow: PropTypes.bool,
    buttonClassExtras: PropTypes.string,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
    children: PropTypes.any,
};
