import React from 'react';
import PropTypes from 'prop-types';
import { getQuantityDefinition } from '../util/Quantities';


/**
 * Component for displaying a {@link QuantityDefinition}'s quantityBaseValue.
 * @class
 */
export function QuantityDisplay(props) {
    const quantityDefinition 
        = getQuantityDefinition(props.quantityDefinition);
    const { quantityBaseValue } = props;
    
    if (quantityDefinition && (quantityBaseValue !== undefined)) {
        const { ariaLabel, classExtras } = props;
        let className = 'quantityDisplay ';
        if (classExtras) {
            className += classExtras;
        }
        let text = quantityDefinition.baseValueToValueText(quantityBaseValue);
        return <div 
            className={className}
            aria-label={ariaLabel}
        >
            {text}
        </div>;
    }
}

/**
 * @typedef {object}    QuantityDisplay~propTypes
 * @property {number}   [quantityBaseValue]
 * @property {string|QuantityDefinition}    [quantityDefinition]
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 */
QuantityDisplay.propTypes = {
    quantityBaseValue: PropTypes.number,
    quantityDefinition: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
};