import React from 'react';
import PropTypes from 'prop-types';
import { DropdownField } from './DropdownField';
import { getDecimalDefinition, getQuantityDefinitionName } from '../util/Quantities';


/**
 * A component for choosing a {@link QuantityDefinition} from a list.
 * @class
 */
export function QuantityDefinitionField(props) {
    let { minDecimalPlaces, maxDecimalPlaces, ...passThroughProps } = props;

    if (minDecimalPlaces === undefined) {
        minDecimalPlaces = 0;
    }
    if (maxDecimalPlaces === undefined) {
        maxDecimalPlaces = 6;
    }
    if (minDecimalPlaces > minDecimalPlaces) {
        [ minDecimalPlaces, maxDecimalPlaces ] = [maxDecimalPlaces, minDecimalPlaces];
    }

    const items = [];
    for (let decimalPlaces = minDecimalPlaces; 
        decimalPlaces <= maxDecimalPlaces; 
        ++decimalPlaces) {
        const quantityDefinition = getDecimalDefinition(decimalPlaces);
        const value = getQuantityDefinitionName(quantityDefinition);
        items.push({
            value: value,
            text: quantityDefinition.getDisplayText(),
        });
    }

    return <DropdownField
        {...passThroughProps}
        items={items}
    />;
}


/**
 * @typedef {object} QuantityDefinitionField~propTypes
 * @property {string}   [id]
 * @property {string}   [value]   The currently selected quantity definition.
 * @property {number}   [minDecimalPlaces=0]  The minimum number of decimal places
 * to select from.
 * @property {number}   [maxDecimalPlaces=6]  The maximum number of decimal places
 * to select from.
 * @property {string}   [label]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;select&gt; entity.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {QuantityDefinitionField~onChange} onChange
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 */
QuantityDefinitionField.propTypes = {
    id: PropTypes.string,
    value: PropTypes.string,
    minDecimalPlaces: PropTypes.number,
    maxDecimalPlaces: PropTypes.number,
    ariaLabel: PropTypes.string,
    label: PropTypes.string,
    selectedPricedItemId: PropTypes.number,
    shortNames: PropTypes.bool,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    prependComponent: PropTypes.object,
    appendComponent: PropTypes.object,
};
