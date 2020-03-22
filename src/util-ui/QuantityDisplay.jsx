import React from 'react';
import PropTypes from 'prop-types';
import { getQuantityDefinition } from '../util/Quantities';


export function QuantityDisplay(props) {
    const quantityDefinition 
        = getQuantityDefinition(props.quantityDefinition);
    const { quantityBaseValue } = props;
    
    if (quantityDefinition && (quantityBaseValue !== undefined)) {
        let text = quantityDefinition.baseValueToValueText(quantityBaseValue);
        return <div className="text-right">
            {text}
        </div>;
    }
}

QuantityDisplay.propTypes = {
    quantityBaseValue: PropTypes.number,
    quantityDefinition: PropTypes.oneOf([
        PropTypes.string,
        PropTypes.object,
    ]),
};