import React from 'react';
import PropTypes from 'prop-types';
import { getCurrency } from '../util/Currency';


export function CurrencyDisplay(props) {
    const currency = getCurrency(props.currency);
    const { quantityBaseValue, displayCurrencySymbol } = props;
    if (currency && (quantityBaseValue !== undefined)) {
        let text;
        if (displayCurrencySymbol) {
            text = currency.baseValueToString(quantityBaseValue);
        }
        else {
            text = currency.baseValueToNoCurrencyString(quantityBaseValue);
        }
        return <div className="text-right">
            {text}
        </div>;
    }
}

CurrencyDisplay.propTypes = {
    quantityBaseValue: PropTypes.number.isRequired,
    currency: PropTypes.oneOf([
        PropTypes.string,
        PropTypes.object]).isRequired,
    displayCurrencySymbol: PropTypes.bool,
};