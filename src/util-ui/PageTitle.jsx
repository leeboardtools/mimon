import React from 'react';
import PropTypes from 'prop-types';


PageTitle.propTypes = {
    children: PropTypes.any,
};

/**
 * React component for page titles, for common formatting.
 * @name PageTitle
 * @class
 */
export function PageTitle(props) {
    return <h4 className="PageTitle pt-3 pb-3 mb-4 border-bottom">
        {props.children}
    </h4>;
}