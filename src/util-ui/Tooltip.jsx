import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';

/**
 * React container component that supports an optional simple tooltip, its children
 * are what normally get displayed.
 * @param {*} props 
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
                    tooltip[i] = <div className = "row no-gutters" key = {i}>
                        <div className="col">{tooltip[i]}</div>
                    </div>;
                }
            }
        }
    }
    
    if (tooltip) {
        return <div className = "Tooltip">
            {children}
            <Popup
                classExtras = ""
                hAlignParent = "center"
                hAlignPopup = "center"
                vAlignParent = "bottom"
                vAlignPopup = "top"
                show = {true}
            >
                <div className = "Tooltiptext">
                    {tooltip}
                </div>
            </Popup>        
        </div>;
    }

    return children;
}

Tooltip.propTypes = {
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
        PropTypes.array,
    ]),
};
