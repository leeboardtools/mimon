import React from 'react';
import PropTypes from 'prop-types';
import { getCurrency } from '../util/Currency';

/**
 * Component for displaying a quantityBaseValue in a given {@link Currency}.
 * @class
 */
export function CurrencyDisplay(props) {
    const currency = getCurrency(props.currency);
    const { quantityBaseValue, displayCurrencySymbol } = props;
    if (currency && (quantityBaseValue !== undefined)) {
        const { ariaLabel, classExtras } = props;
        let className = 'QuantityDisplay ';
        if (classExtras) {
            className += classExtras;
        }

        let text;
        if (displayCurrencySymbol) {
            text = currency.baseValueToString(quantityBaseValue);
        }
        else {
            text = currency.baseValueToNoCurrencyString(quantityBaseValue);
        }
        return <div 
            className={className}
            aria-label={ariaLabel}
        >
            {text}
        </div>;
    }
}

/**
 * @typedef {object} CurrencyDisplay~propTypes
 * @property {number}   [quantityBaseValue]   The quantity base value to be displayed.
 * @property {string|Currency}  [currency]
 * @property {boolean}  [displayCurrencySymbol]
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 */
CurrencyDisplay.propTypes = {
    quantityBaseValue: PropTypes.number,
    currency: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object]),
    displayCurrencySymbol: PropTypes.bool,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
};