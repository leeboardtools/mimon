import React from 'react';
import PropTypes from 'prop-types';
import { getPositionedAncestor, getParentClipBounds } from '../util/ElementUtils';


const HALIGN = {
    left: 'min',
    center: 'center',
    right: 'max',
    none: 'none',
};

const VALIGN = {
    top: 'min',
    center: 'center',
    bottom: 'max',
    none: 'none',
};

function calcAlignPoint({ align, alignEnum, lowerValue, upperValue, }) {
    switch (alignEnum[align]) {
    case 'min' :
    default :
        return lowerValue;
    
    case 'center' :
        return 0.5 * (lowerValue + upperValue);
    
    case 'max' :
        return upperValue;
    }
}

function calcAlignment({ refArgs, popupArgs, minLowerValue, maxUpperValue, }) {
    if (popupArgs.align === 'none') {
        return popupArgs.lowerValue;
    }

    const refAlignPoint = calcAlignPoint(refArgs);
    const popupAlignPoint = calcAlignPoint(popupArgs);

    let lowerValue = popupArgs.lowerValue + refAlignPoint - popupAlignPoint;
    let upperValue = lowerValue + popupArgs.upperValue - popupArgs.lowerValue;

    if (minLowerValue !== undefined) {
        const span = upperValue - lowerValue;
        if (lowerValue < minLowerValue) {
            if (upperValue === refArgs.lowerValue) {
                // The popup right edge aligned to the ref left edge,
                // try flipping to the other side.
                if (refArgs.upperValue + span <= maxUpperValue) {
                    // We're good to adjust...
                    lowerValue = refArgs.upperValue;
                    upperValue = lowerValue + span;
                }
            }
            if (lowerValue < minLowerValue) {
                upperValue = Math.min(maxUpperValue, minLowerValue + span);
                lowerValue = minLowerValue;
            }
        }

        if (upperValue > maxUpperValue) {
            if (lowerValue === refArgs.upperValue) {
                if (refArgs.lowerValue - span >= minLowerValue) {
                    lowerValue = refArgs.lowerValue - span;
                    upperValue = refArgs.lowerValue;
                }
            }
            if (upperValue > maxUpperValue) {
                lowerValue = Math.max(minLowerValue, maxUpperValue - span);
                upperValue = maxUpperValue;
            }
        }
    }

    return {
        lowerValue: lowerValue,
        upperValue: upperValue,
    };
}


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

            const boundsRect = getParentClipBounds(this._popupRef.current);
            const minLeft = boundsRect.left + 2;
            const minTop = boundsRect.top + 2;
            const maxRight = boundsRect.right - 2;
            const maxBottom = boundsRect.bottom - 2;


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

            let right;
            let bottom;

            const refRect = (refElement) ? refElement.getBoundingClientRect() 
                : undefined;
            if (refRect) {
                if (left === undefined) {
                    const result = calcAlignment({
                        refArgs: {
                            align: this.props.hAlignParent || 'left',
                            alignEnum: HALIGN,
                            lowerValue: refRect.left,
                            upperValue: refRect.right,
                        },
                        popupArgs: {
                            align: this.props.hAlignPopup || 'left',
                            alignEnum: HALIGN,
                            lowerValue: 0,
                            upperValue: containerWidth,
                        },
                        minLowerValue: minLeft,
                        maxUpperValue: maxRight,
                    });

                    left = result.lowerValue;
                    right = result.upperValue;
                }

                if (top === undefined) {
                    const result = calcAlignment({
                        refArgs: {
                            align: this.props.vAlignParent || 'bottom',
                            alignEnum: VALIGN,
                            lowerValue: refRect.top,
                            upperValue: refRect.bottom,
                        },
                        popupArgs: {
                            align: this.props.vAlignPopup || 'top',
                            alignEnum: VALIGN,
                            lowerValue: 0,
                            upperValue: containerHeight,
                        },
                        minLowerValue: minTop,
                        maxUpperValue: maxBottom,
                    });

                    top = result.lowerValue;
                    bottom = result.upperValue;
                }
            }

            if (right === undefined) {
                right = left + containerWidth;
                if (right > maxRight) {
                    right = maxRight;
                    left = Math.max(maxRight - containerWidth, minLeft);
                }
            }
            if (bottom === undefined) {
                bottom = top + containerHeight;
                if (bottom > maxBottom) {
                    bottom = maxBottom;
                    top = Math.max(maxBottom - containerHeight, minTop);
                }
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


    getBoundingClientRect() {
        return this._popupRef.current.getBoundingClientRect();
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


/**
 * Callback called when the popup is closed.
 * @callback Popup~onClose
 */

/**
 * @typedef {object} Popup~propTypes
 * @property {number} [x]
 * @property {number} [y]
 * @property {string} [hAlignParent='left'] Where on the parent to align horizontally, 
 * 'left', 'center', or 'right'
 * @property {string} [hAlignPopup='left'] Where on the popup to align with the parent
 * hAlignParent alignment point, one of 'left', 'center', or 'right'.
 * @property {string} [vAlignParent='top'] Where on the parent to align vertically, 
 * 'top', 'center', or 'bottom'
 * @property {string} [vAlignPopup='top'] Where on the popup to align with the parent
 * vAlignParent alignment point, one of 'top', 'center', or 'bottom'.
 * @property {boolean} [show]
 * @property {Popup~onClose} [onClose]
 * @property {number} [tabIndex]
 * @property {string} [classExtras]
 */
Popup.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    hAlignParent: PropTypes.string,
    hAlignPopup: PropTypes.string,
    vAlignParent: PropTypes.string,
    vAlignPopup: PropTypes.string,
    show: PropTypes.bool,
    onClose: PropTypes.func,
    tabIndex: PropTypes.number,
    classExtras: PropTypes.string,
    children: PropTypes.any,
};
