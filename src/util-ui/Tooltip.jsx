import React from 'react';
import PropTypes from 'prop-types';

/**
 * React container component that supports an optional simple tooltip, its children
 * are what normally get displayed.
 * @param {*} props 
 */
export function Tooltip(props) {
    let { tooltip, children } = props;
    if (tooltip) {
        if (typeof tooltip === 'string') {
            tooltip = <div className = "simple-tooltiptext">
                {tooltip}
            </div>;
        }
        return <div className = "simple-tooltip w-100"> 
            {children}
            {tooltip}
        </div>;
    }

    return children;
}

Tooltip.propTypes = {
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
};
