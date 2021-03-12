import React from 'react';
import PropTypes from 'prop-types';


/**
 * Simple React component encapsulating <button>.
 */
export class Button extends React.Component {
    constructor(props) {
        super(props);

        this._buttonRef = React.createRef();
    }

    focus() {
        if (this._buttonRef.current) {
            this._buttonRef.current.focus();
        }
    }

    render() {
        const { classExtras, ariaLabel, children,
            ...passThroughProps } = this.props;

        let className = 'Btn';
        if (classExtras) {
            className += ' ' + classExtras;

            if (classExtras.startsWith('btn ')) {
                className = classExtras;
            }
        }

        return <button type = "button" 
            className = {className}
            aria-label = {ariaLabel}
            {...passThroughProps}
            ref = {this._buttonRef}
        >
            {children}
        </button>;
    }
}

/**
 * @typedef {object} Button~propTypes
 * @property {string} [classExtras]
 * @property {string} [ariaLabel] Using 'aria-label' also works.
 * @property {*} [children]
 */
Button.propTypes = {
    classExtras: PropTypes.string,
    ariaLabel: PropTypes.string,
    children: PropTypes.any,
};