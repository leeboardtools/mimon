import React from 'react';
import PropTypes from 'prop-types';


PageBody.propTypes = {
    classExtras: PropTypes.string,
    children: PropTypes.any,
};


/**
 * React component for page bodies, for common formatting.
 * Use with {@link PageTitle}. Normally use as a child of {@link Page}.
 * @name PageBody
 * @class
 */
export function PageBody(props) {
    let className = 'H-inherit text-left PageBody';
    const { classExtras } = props;
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <div className = {className}>
        {props.children}
    </div>;
}
