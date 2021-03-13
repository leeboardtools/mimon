import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';

/**
 * React container component that supports an optional simple tooltip, its children
 * are what normally get displayed.
 * @class
 */
export function Tooltip(props) {
    let { tooltip, children } = props;
    
    if (Array.isArray(tooltip)) {
        if (!tooltip.length) {
            tooltip = undefined;
        }
        else {
            if (typeof tooltip[0] === 'string') {
                // Want to format this as a list.
                for (let i = 0; i < tooltip.length; ++i) {
                    tooltip[i] = <div className = "Row no-gutters" key = {i}>
                        <div className="col">{tooltip[i]}</div>
                    </div>;
                }
            }
        }
    }
    
    if (tooltip) {
        let { side } = props;
        let hAlignParent;
        let hAlignPopup;
        let vAlignParent;
        let vAlignPopup;

        switch (side) {
        case 'left' :
            hAlignParent = 'left';
            hAlignPopup = 'right';
            vAlignParent = 'center';
            vAlignPopup = 'center';
            break;
        
        case 'right' :
            hAlignParent = 'right';
            hAlignPopup = 'left';
            vAlignParent = 'center';
            vAlignPopup = 'center';
            break;
        
        case 'top' :
            hAlignParent = 'center';
            hAlignPopup = 'center';
            vAlignParent = 'top';
            vAlignPopup = 'bottom';
            break;
        
        case 'bottom' :
        default :
            hAlignParent = 'center';
            hAlignPopup = 'center';
            vAlignParent = 'bottom';
            vAlignPopup = 'top';
            break;
        }

        return <div className = "Tooltip">
            <div className = "Tooltip-detector">
                {children}
            </div>
            <Popup
                id = {props.id}
                classExtras = "Tooltip-popup"
                hAlignParent = {hAlignParent}
                hAlignPopup = {hAlignPopup}
                vAlignParent = {vAlignParent}
                vAlignPopup = {vAlignPopup}
                isPointer = {true}
                show = {true}
            >
                <div className = "Tooltip-content">
                    {tooltip}
                </div>
            </Popup>        
        </div>;
    }

    return children;
}

/**
 * @typedef {object} Tooltip~propTypes
 * @property {string|object|string[]} [tooltip] The contents of the tooltip, if
 * <code>undefined</code> children is rendered directly.
 * @property {side} [side='left'] Optional side of the main element to which the tooltip
 * is to appear.
 * @property {*} [children] The element(s) to which the tooltip is associated.
 */
Tooltip.propTypes = {
    id: PropTypes.any,
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
        PropTypes.array,
    ]),
    side: PropTypes.oneOf(['left', 'top', 'right', 'bottom']),
    children: PropTypes.any,
};
