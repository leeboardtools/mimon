import React from 'react';
import PropTypes from 'prop-types';
import { Currencies, USD, EUR } from '../util/Currency';

/**
 * A component for choosing a {@link Currency} from a drop-down list of all the
 * currencies in {@link Currencies}.
 * @class
 */
export function CurrencySelector(props) {
    const { id, value, onChange, ariaLabel, classExtras, disabled } = props;

    const divClassName = 'input-group mb-0 ';
    let className = 'Cell CellSelectEditor-select ' + classExtras;

    let optionComponents = [];
    optionComponents.push(
        <option key="USD-1" value="USD">{'USD - ' + USD.getName()}</option>
    );
    optionComponents.push(
        <option key="EUR-1" value="EUR">{'EUR - ' + EUR.getName()}</option>
    );
    
    for (let code in Currencies) {
        const currency = Currencies[code];
        optionComponents.push(
            <option
                key={code}
                value={code}
            >
                {currency.getCode() + ' - ' + currency.getName()}
            </option>
        );
    }

    return <div className={divClassName}>
        <select
            className={className}
            id={id}
            aria-label={ariaLabel}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
        >
            {optionComponents}
        </select>
    </div>;
}

/**
 * @callback CurrencySelector~onChange
 * @param {string}  value   The chosen value.
 */

/**
 * @typedef {object} CurrencySelector~propTypes
 * @property {string}   [id]
 * @property {string}   value   The currently selected currency.
 * @property {CurrencySelector~onChange} onChange
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 * @property {boolean}  [disabled]
 */
CurrencySelector.propTypes = {
    id: PropTypes.string,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};
