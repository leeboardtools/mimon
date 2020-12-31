import React from 'react';
import PropTypes from 'prop-types';

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
                    tooltip[i] = <div className = "row" key = {i}>
                        <div className="col">{tooltip[i]}</div>
                    </div>;
                }
            }
        }
    }
    
    if (tooltip) {
        return <div className = "Simple-tooltip w-100"> 
            {children}
            <div className = "Simple-tooltiptext">
                {tooltip}
            </div>
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
