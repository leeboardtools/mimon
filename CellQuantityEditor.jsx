import React from 'react';
import PropTypes from 'prop-types';
import { getQuantityDefinition } from '../util/Quantities';

/**
 * React component for editing text in a table cell. Works with 
 * {@link RowEditCollapsibleTable}, return from the
 * {@link RowEditTable~onRenderEditCell} callback. {@link CellQuantityDisplay} 
 * would then normally be returned from the
 * {@link RowEditTable~onRenderDisplayCell} callback.
 * @class
 */
/*
export const CellQuantityEditor = React.forwardRef(
    function CellQuantityEditorImpl(props, ref) {
        const { ariaLabel, value, inputClassExtras, errorMsg, size,
            onChange, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellQuantityEditor-textInput ' 
            + (inputClassExtras || '');

        const inputType = props.inputType || 'text';

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className="invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className={divClassName}>
            <input type={inputType}
                className={className}
                aria-label={ariaLabel}
                value={value || ''}
                size={size}
                disabled={disabled}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                ref={ref}
            />
            {errorMsgComponent}
        </div>;
    }
);
*/


/**
 * @typedef {object} CellQuantityEditor~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 * @property {boolean} [disabled]
 */
/*
CellQuantityEditor.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputType: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
};
*/

/**
 * React component that's a display representation of {@link CellQuantityEditor},
 * for use with {@link RowEditCollapsibleTable~onRenderDisplayCell}.
 * @param {*} props 
 */
export function CellQuantityDisplay(props) {
    const { ariaLabel, quantityBaseValue, 
        inputClassExtras } = props;
    if (!props.quantityDefinition) {
        return null;
    }

    const quantityDefinition 
        = getQuantityDefinition(props.quantityDefinition);

    let { size } = props;
    let value;
    if (!quantityDefinition || (quantityBaseValue === undefined)) {
        value = '';
    }
    else {
        value = quantityDefinition.baseValueToValueText(quantityBaseValue);
        if (size && (size < 0)) {
            size = Math.max(value.length, -size);
        }
    }

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + (inputClassExtras || '');
    
    return <div className={divClassName}>
        <input type="text"
            className={className}
            aria-label={ariaLabel}
            style={{backgroundColor: 'inherit'}}
            size={size}
            disabled
            value={value}
            onChange={() => {}}
        />
    </div>;
}


/**
 * @typedef {object} CellQuantityDisplay~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {number}   [size]  If specified and &lt; 0 then this is
 * the default size for the input field and will be enlarged to fit
 * the number of characters in the quantity as needed.
 */
CellQuantityDisplay.propTypes = {
    ariaLabel: PropTypes.string,
    quantityBaseValue: PropTypes.number,
    quantityDefinition: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    inputType: PropTypes.string,
};
