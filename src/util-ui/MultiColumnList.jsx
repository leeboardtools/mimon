import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isElementAncestor, setFocus } from '../util/ElementUtils';


export class MultiColumnList extends React.Component {
    constructor(props) {
        super(props);

        this._mainRef = React.createRef();

        this.onFocus = this.onFocus.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        this.state = {
            itemRefs: [],
        };
    }


    componentDidUpdate(prevProps, prevState) {
        const { itemCount } = this.props;
        const { itemRefs } = this.state;
        if (itemCount !== itemRefs.length) {
            const newItemRefs = Array.from(itemRefs);
            if (itemCount < newItemRefs.length) {
                newItemRefs.length = itemCount;
            }
            else {
                for (let i = newItemRefs.length; i < itemCount; ++i) {
                    newItemRefs.push(React.createRef());
                }
            }

            this.setState({
                itemRefs: newItemRefs,
            });
        }

        const { focusItemIndex } = this.state;
        if ((focusItemIndex !== undefined)
         && (focusItemIndex !== prevState.focusItemIndex)) {
            this.setState({
                focusItemIndex: undefined,
            });

            const focusElement = document.activeElement;
            if (isElementAncestor(this._mainRef.current, focusElement)) {
                const itemRef = this.state.itemRefs[focusItemIndex];
                if (itemRef) {
                    setFocus(itemRef.current);
                }
            }
        }
    }


    focus() {
        if (this._mainRef.current) {
            this._mainRef.current.focus();
        }
    }


    focusToActiveItem() {
        const { activeItemIndex, itemCount } = this.props;
        if ((activeItemIndex >= 0) && (activeItemIndex < itemCount)) {
            const { current } = this.state.itemRefs[activeItemIndex];
            setFocus(current);
        }
    }


    onFocus(e) {
        if (!isElementAncestor(this._mainRef.current, e.relatedTarget)) {
            this.focusToActiveItem();
            e.preventDefault();
        }
    }


    getItemInNextColumn(index, dir) {
        const { current } = this._mainRef;
        if (!current) {
            return index;
        }

        const { children } = current;
        if (children.length !== this.props.itemCount) {
            return index;
        }

        const indexRect = children[index].getBoundingClientRect();
        const indexYCenter = (indexRect.top + indexRect.bottom) / 2;

        // Find the adjacent column.
        let endIndex;
        if (dir >= 0) {
            endIndex = children.length;
            dir = 1;
        }
        else {
            endIndex = -1;
            dir = -1;
        }

        let nextColumnStart;
        for (let i = index + dir; i !== endIndex; i += dir) {
            const childRect = children[i].getBoundingClientRect();
            const childXCenter = (childRect.left + childRect.right) / 2;
            if ((childXCenter >= indexRect.right) || (childXCenter <= indexRect.left)) {
                nextColumnStart = i;
                break;
            }
        }

        if (nextColumnStart === undefined) {
            return index;
        }

        let closestY = Number.MAX_VALUE;
        let closestIndex = index;

        for (let i = nextColumnStart; i !== endIndex; i += dir) {
            const childRect = children[i].getBoundingClientRect();
            const childYCenter = (childRect.top + childRect.bottom) / 2;
            const deltaY = Math.abs(childYCenter - indexYCenter);
            if (deltaY < closestY) {
                closestY = deltaY;
                closestIndex = i;
            }
            else {
                // Moving away, we found the index...
                break;
            }
        }

        return closestIndex;
    }


    makeItemVisible(index) {
        const { current } = this._mainRef;
        if (!current) {
            return;
        }

        const { children } = current;
        if ((index < 0) || (index >= children.length)) {
            return;
        }

        const mainRect = current.getBoundingClientRect();
        const childRect = children[index].getBoundingClientRect();

        if (childRect.right > mainRect.right) {
            const deltaX = mainRect.right - childRect.right;
            if ((childRect.left + deltaX) >= mainRect.left) {
                current.scrollLeft -= deltaX;
            }
        }
        else if (childRect.left < mainRect.left) {
            const deltaX = mainRect.left - childRect.left;
            if ((childRect.right + deltaX) <= mainRect.right) {
                current.scrollLeft -= deltaX;
            }
        }
    }


    onKeyDown(e) {
        const { onKeyDown, itemCount, activeItemIndex } = this.props;
        if (onKeyDown) {
            const result = onKeyDown(e);
            if ((result === 'default') || e.defaultPrevented) {
                return;
            }
        }

        let newActiveItemIndex = activeItemIndex;
        switch (e.key) {
        case 'ArrowUp' :
            if (newActiveItemIndex !== undefined) {
                --newActiveItemIndex;
                if (newActiveItemIndex < 0) {
                    newActiveItemIndex = itemCount - 1;
                }
            }
            e.preventDefault();
            break;

        case 'ArrowDown' :
            if (newActiveItemIndex !== undefined) {
                ++newActiveItemIndex;
                if (newActiveItemIndex >= itemCount) {
                    newActiveItemIndex = 0;
                }
            }
            e.preventDefault();
            break;

        case 'ArrowLeft' :
            if (newActiveItemIndex !== undefined) {
                newActiveItemIndex = this.getItemInNextColumn(newActiveItemIndex, -1);
            }
            e.preventDefault();
            break;

        case 'ArrowRight' :
            if (newActiveItemIndex !== undefined) {
                newActiveItemIndex = this.getItemInNextColumn(newActiveItemIndex, 1);
            }
            e.preventDefault();
            break;
        
        case 'Home' :
            newActiveItemIndex = 0;
            e.preventDefault();
            break;
        
        case 'End' :
            newActiveItemIndex = itemCount - 1;
            e.preventDefault();
            break;
        }

        if ((newActiveItemIndex !== activeItemIndex)
         && (newActiveItemIndex >= 0)
         && (newActiveItemIndex < itemCount)) {
            const { onActivateItem } = this.props;
            if (onActivateItem) {
                onActivateItem(newActiveItemIndex);
            }

            this.makeItemVisible(newActiveItemIndex);

            this.setState({
                focusItemIndex: newActiveItemIndex,
            });
        }
    }


    render() {
        const items = [];
        const { itemCount, onRenderItem } = this.props;
        const getItemKey = this.props.getItemKey || ((index) => index);
        const { activeItemIndex } = this.props;

        if (onRenderItem) {
            const { itemRefs } = this.state;
            for (let i = 0; i < itemCount; ++i) {
                const item = <Fragment key = {getItemKey(i)}>
                    {onRenderItem(i, (i === activeItemIndex), itemRefs[i])}
                </Fragment>;
                items.push(item);
            }
        }

        return <div className = "MultiColumnList"
            tabIndex = {0}
            onKeyDown = {this.onKeyDown}
            onFocus = {this.onFocus}
            ref = {this._mainRef}
        >
            {items}
        </div>;
    }
}

MultiColumnList.propTypes = {
    itemCount: PropTypes.number.isRequired,

    getItemKey: PropTypes.func,

    onRenderItem: PropTypes.func,

    requestedVisibleItemIndex: PropTypes.number,
    
    activeItemIndex: PropTypes.number,
    onActivateItem: PropTypes.func,
    noActiveItemFocus: PropTypes.bool,

    onKeyDown: PropTypes.func,

    classExtras: PropTypes.string,
};