import React from 'react';
import PropTypes from 'prop-types';
import { MenuList } from './MenuList';

/**
 * Simple context menu component.
 * <p>
 * To use, in a onContextMenu handler, set the parent component's state
 * to indicate to its render function that the context menu should be popped
 * up, and in the render function set the ContextMenu with the x and y
 * properties set to the clientX and clientY properties of the event
 * passed to the onContextMenu handler.
 * <p>
 * The onMenuClose callback is required, in this callback the parent component
 * should update its state to indicate to its render function to not show
 * the ContextMenu.
 */
export function ContextMenu(props) {
    return <MenuList
        {...props}
    />;
}

/**
 * @callback {ContextMenu~onMenuClose}
 */


/**
 * @typedef {object} {ContextMenu~propTypes}
 * @property {number}   [x] The client x coordinate.
 * @property {number}   [y] The client y coordinate.
 * @property {boolean}  [show]  Set to <code>true</code> to display the
 * context menu.
 * @property {MenuList~Item[]}  items   The menu items.
 * @property {string} [menuClassExtras] Extra classes to add to the menu item container
 * @property {string} [itemClassExtras] Extra classes to add to the individual items.
 * @property {MenuList~onChooseItem}    [onChooseItem] Callback called when an item
 * is chosen if the item does not have an onChooseItem property.
 * @property {ContextMenu~onMenuClose}  onMenuClose Callback called when the menu 
 * is closed.
 */
ContextMenu.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    show: PropTypes.bool,
    items: PropTypes.array.isRequired,
    menuClassExtras: PropTypes.string,
    itemClassExtras: PropTypes.string,
    onChooseItem: PropTypes.func,
    onMenuClose: PropTypes.func.isRequired,
};
