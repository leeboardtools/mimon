import React from 'react';
import PropTypes from 'prop-types';


PageTitle.propTypes = {
    classExtras: PropTypes.string,
    children: PropTypes.any,
};

/**
 * React component for page titles, for common formatting.
 * Use with {@link PageBody} Normally use as a child of {@link Page}.
 * @name PageTitle
 * @class
 */
export function PageTitle(props) {
    let className = 'Pt-3 Pb-3 Mb-4 Border-bottom PageTitle';
    const { classExtras } = props;
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <h4 className={className}>
        {props.children}
    </h4>;
}