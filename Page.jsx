import React from 'react';
import PropTypes from 'prop-types';


/**
 * React component for a page container for {@link PageTitle} and {@link PageBody}.
 * @name Page
 * @class
 */
export function Page(props) {
    const { classExtras, children } = props;

    let className = 'Container-fluid';
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <div className = {className}>
        {children}
    </div>;
}

/**
 * @typedef {object} Page~propTypes
 * @property {string} [classExtras]
 * @property {*} children
 */
Page.propTypes = {
    classExtras: PropTypes.string,
    children: PropTypes.any,
};