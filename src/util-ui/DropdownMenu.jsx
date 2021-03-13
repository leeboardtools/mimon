import React from 'react';
import PropTypes from 'prop-types';
import * as EU from '../util/ElementUtils';
import { MenuList } from './MenuList';

/**
 * React component for a dropdown menu. A DropdownMenu differs from a 
 * {@link DropdownSelector} in that the menu normally performs an action 
 * when an item is chosen, and the items are {@link MenuList~Item}s.
 * @class
 */

export class DropdownMenu extends React.Component {
    constructor(props) {
        super(props);

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onMenuClose = this.onMenuClose.bind(this);

        this._menuListRef = React.createRef();

        this.state = {
            isMenuListShown: false,
        };
    }


    componentDidUpdate(prevProps, prevState) {
        if (!prevState.isMenuListShown && this.state.isMenuListShown) {
            EU.setFocus(this._menuListRef.current);
        }
    }


    onMenuClose() {
        this.setState({
            isShowOnMouseUp: false,
            isMenuListShown: false,
        });
    }


    onMouseDown() {
        this.setState({
            isShowOnMouseUp: true,
        });
    }

    onClick() {
        // isShowOnMouseUp is used because if the menu is already up and we're clicked,
        // that triggers the menu to close when the menu loses focus, so we get
        // an onMenuClose(). Our onMenuClose() cancels the isShowOnMouseUp so we don't
        // end up toggling the menu back open.
        if (this.state.isShowOnMouseUp) {
            this.setState((state) => {
                return {
                    isShowOnMouseUp: false,
                    isMenuListShown: !state.isMenuListShown,
                };
            });
        }
    }

    
    render() {
        const { props } = this;

        let topClassName = 'Dropdown';
        const { topClassExtras } = props;
        if (topClassExtras) {
            topClassName += ' ' + topClassExtras;
        }
        
        let buttonClassName = (props.noArrow) ? '' : 'Dropdown-toggle ';
        const { buttonClassExtras } = props;
        if (buttonClassExtras) {
            buttonClassName += ' ' + buttonClassExtras;
        }

        return <div className={topClassName}>
            <a className={buttonClassName}
                href="#"
                role="button"
                aria-label={props.ariaLabel}
                aria-haspopup="true"
                aria-expanded="false"
                disabled={props.disabled}
                onMouseDown = {this.onMouseDown}
                onClick = {this.onClick}
            >
                {props.title}
            </a>
            <MenuList
                items = {props.items}
                show = {this.state.isMenuListShown}
                menuClassExtras = {props.menuClassExtras}
                itemClassExtras = {props.itemClassExtras}
                onChooseItem = {props.onChooseItem}
                onMenuClose = {this.onMenuClose}

                ref = {this._menuListRef}
            />
            {props.children}
        </div>;
    }
}

//export const DropdownMenu = DropdownMenu2;

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
