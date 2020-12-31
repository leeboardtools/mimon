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
export class ContextMenu extends React.Component {
    constructor(props) {
        super(props);

        this.handleMenuHide = this.handleMenuHide.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        this._menuRef = React.createRef();

        this.state = {
            left: this.props.x,
            top: this.props.y,
        };
    }


    handleMenuHide() {
        if (this.props.show) {
            const { onMenuClose } = this.props;
            if (onMenuClose) {
                onMenuClose();
            }
        }
    }


    onKeyDown(e) {
        if (this.props.show) {
            if (e.key === 'Escape') {
                this.handleMenuHide();
            }
        }
    }


    componentDidMount() {
        document.addEventListener('click', this.handleMenuHide);
        document.addEventListener('touchstart', this.handleMenuHide);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleMenuHide);
        document.removeEventListener('touchstart', this.handleMenuHide);
        document.removeEventListener('keydown', this.onKeyDown);
    }


    componentDidUpdate(prevProps) {
        if (this.props.show && this._menuRef.current) {
            const menu = this._menuRef.current;
            const menuRect = menu.getBoundingClientRect();
            const menuWidth = menuRect.width;
            const menuHeight = menuRect.height;

            const { innerWidth, innerHeight } = window;
            const maxRight = innerWidth - 2;
            const maxBottom = innerHeight - 2;

            let left = this.props.x;
            let top = this.props.y;
            let right = left + menuWidth;
            let bottom = top + menuHeight;

            if (right > maxRight) {
                right = maxRight;
                left = Math.max(maxRight - menuWidth, 0);
            }
            if (bottom > maxBottom) {
                bottom = maxBottom;
                top = Math.max(maxBottom - menuHeight, 0);
            }

            const width = right - left;
            const height = bottom - top;

            left += window.scrollX;
            top += window.scrollY;
            right += window.scrollX;
            bottom += window.scrollY;

            if ((this.state.left !== left) || (this.state.top !== top)
             || (this.state.right !== right) || (this.state.bottom !== bottom)) {
                this.setState({
                    left: left,
                    top: top,
                    right: right,
                    bottom: bottom,
                    width: width,
                    height: height,
                });
            }
        }
    }


    render() {
        const { show, items, itemClassExtras, onChooseItem } = this.props;

        let { menuClassExtras } = this.props;
        menuClassExtras = menuClassExtras || '';

        const style = {
            position: 'absolute',
            top: this.state.top,
            left: this.state.left,
        };

        let menuComponent;
        if (show) {
            menuClassExtras += ' show';
            menuComponent = <MenuList
                items={items}
                menuClassExtras={'Scrollable-menu ' + menuClassExtras}
                itemClassExtras={itemClassExtras}
                onChooseItem={onChooseItem}
                ref={this._menuRef}
                alwaysFocus
            />;
        }

        return <div style={style} className="contextMenu"
        >
            {menuComponent}
        </div>;
    }
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
