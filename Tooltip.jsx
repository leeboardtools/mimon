import React from 'react';
import PropTypes from 'prop-types';

/**
 * React container component that supports an optional simple tooltip, its children
 * are what normally get displayed.
 * @param {*} props 
 */
export function Tooltip(props) {
    let { tooltip, children } = props;
    if (Array.isArray(tooltip) && !tooltip.length) {
        tooltip = undefined;
    }
    
    if (tooltip) {
        return <div className = "simple-tooltip w-100"> 
            {children}
            <div className = "simple-tooltiptext">
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
