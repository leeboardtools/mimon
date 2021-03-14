import React from 'react';
import PropTypes from 'prop-types';


/**
 * React component for a container for {@link Row} and {@link Col}
 * components.
 * @name RowColContainer
 * @class
 */
export function RowColContainer(props) {
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
 * @typedef {object} RowColContainer~propTypes
 * @property {string} [classExtras]
 * @property {*} children
 */
RowColContainer.propTypes = {
    classExtras: PropTypes.string,
    children: PropTypes.any,
};


/**
 * React component for a row of {@link Col} components. This should be a 
 * child of a {@link RowColContainer}
 * @name Row
 * @class
 */
export function Row(props) {
    const { classExtras, noGutters, form, children } = props;

    let className = (form) ? 'Form-row' : 'Row';
    if (noGutters) {
        className += ' No-gutters';
    }
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <div className = {className}>
        {children}
    </div>;
}

/**
 * @typedef {object} Row~propTypes
 * @property {string} [classExtras]
 * @property {boolean} [noGutters=false] If truthy, the row ends will be
 * indented, otherwise the end columns will line up with the ends of the
 * row.
 * @property {boolean} [form=false] If truthy, the row end gutters will 
 * be for a form.
 * @property {*} children
 */
Row.propTypes = {
    classExtras: PropTypes.string,
    noGutters: PropTypes.bool,
    form: PropTypes.bool,
    children: PropTypes.any,
};


/**
 * React component for a column cell within a {@link Row} component.
 * @name Col
 * @class
 */
export function Col(props) {
    const { classExtras, children } = props;

    let className = 'col';
    if (classExtras) {
        className += ' ' + classExtras;
    }

    return <div className = {className}>
        {children}
    </div>;
}


/**
 * @typedef {object} Col~propTypes
 * @property {string} [classExtras]
 * @property {*} children
 */
Col.propTypes = {
    classExtras: PropTypes.string,
    children: PropTypes.any,
};