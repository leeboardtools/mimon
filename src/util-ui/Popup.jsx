import React from 'react';
import PropTypes from 'prop-types';
import { getPositionedAncestor } from '../util/ElementUtils';

/**
 * React component that pops up. Serious work in progress,
 * used by {@link DropdownSelector}.
 * <p>
 * TODO:
 * Improve positioning, want to be able to say where the popup
 * should be positioned relative to the reference component, 
 * ie left, left-bottom, bottom-left, bottom, bottom-right, right-bottom,
 * right, right-top, top-right, top, top-left, left-top
 * Need to update position if window size changes or scrolls
 */
export class Popup extends React.Component {
    constructor(props) {
        super(props);

        this.onKeyDown = this.onKeyDown.bind(this);

        this._popupRef = React.createRef();
        this._containerRef = React.createRef();

        this.state = {
            left: this.props.x,
            top: this.props.y,
        };
    }

    componentDidMount() {
        this._popupRef.current.focus();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.show && this._containerRef.current) {
            const container = this._containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            const { innerWidth, innerHeight } = window;
            const maxRight = innerWidth - 2;
            const maxBottom = innerHeight - 2;

            let left = this.props.x;
            let top = this.props.y;

            let refElement;
            const { parentElement } = this._popupRef.current;
            refElement = parentElement;
            if (parentElement) {
                const { children } = parentElement;
                if (children) {
                    for (let i = 0; i < children.length; ++i) {
                        const child = children[i];
                        if (child !== this._popupRef.current) {
                            // TODO: Should probably check if the child is visible!
                            refElement = child;
                            break;
                        }
                    }
                }
            }
            const refRect = (refElement) ? refElement.getBoundingClientRect() 
                : undefined;
            if (refRect) {
                if (left === undefined) {
                    // Try to line up with the parent's left side.
                    left = refRect.left;
                }
                if (top === undefined) {
                    // Try to line up with the parent's bottom side.
                    top = refRect.bottom;
                }
            }

            let right = left + containerWidth;
            let bottom = top + containerHeight;

            if (right > maxRight) {
                right = maxRight;
                left = Math.max(maxRight - containerWidth, 0);
            }
            if (bottom > maxBottom) {
                bottom = maxBottom;
                top = Math.max(maxBottom - containerHeight, 0);
            }

            const width = right - left;
            const height = bottom - top;

            left += window.scrollX;
            top += window.scrollY;
            right += window.scrollX;
            bottom += window.scrollY;

            const positionedAncestor = getPositionedAncestor(this._popupRef.current);
            if (positionedAncestor) {
                const frameRect = positionedAncestor.getBoundingClientRect();
                left -= frameRect.left;
                right -= frameRect.left;
                top -= frameRect.top;
                bottom -= frameRect.top;
            }

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


    close() {
        if (this.props.show) {
            const { onClose } = this.props;
            if (onClose) {
                onClose();
            }
        }
    }


    onKeyDown(e) {
        if (this.props.show) {
            if (e.key === 'Escape') {
                this.close();
            }
        }
    }


    render() {
        const { show, children, classExtras, tabIndex } = this.props;

        const style = {
            position: 'absolute',
            top: this.state.top,
            left: this.state.left,
            width: this.state.width,
            height: this.state.height,
        };

        let className = 'Popup';
        if (show) {
            className += ' show';
        }
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <div className = {className}
            style = {style}
            onKeyDown = {this.onKeyDown}
            tabIndex = {tabIndex}
            ref = {this._popupRef}
        >
            <div className = "Popup-container"
                ref = {this._containerRef}
            >
                {children}
            </div>
        </div>;
    }
}

Popup.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    show: PropTypes.bool,
    onClose: PropTypes.func,
    tabIndex: PropTypes.number,
    classExtras: PropTypes.string,
    children: PropTypes.any,
};