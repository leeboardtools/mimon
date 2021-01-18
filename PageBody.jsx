import React from 'react';
import PropTypes from 'prop-types';


PageBody.propTypes = {
    children: PropTypes.any,
};


/**
 * React component for page bodies, for common formatting.
 * Use with {@link PageTitle}.
 * @name PageBody
 * @class
 */
export function PageBody(props) {
    return <div className = "H-inherit text-left PageBody">
        {props.children}
    </div>;
}
