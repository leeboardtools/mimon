import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from './Tooltip';


/**
 * Component for a cell that offers a drop-down list to choose from.
 * @class
 */
export const CellSelectEditor = React.forwardRef(
    function myCellSelectEditor(props, ref) {
        const { selectedValue, items, errorMsg, ariaLabel, classExtras, 
            size,
            onChange, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellSelectEditor-select ' + classExtras;

        let optionComponents;
        if (items.length && (typeof items[0] === 'string')) {
            optionComponents = items.map((option) =>
                <option key = {option}>{option}</option>);
        }
        else {
            optionComponents = items.map(([key, option]) =>
                <option key = {key} value = {key}>{option}</option>);
        }

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className = "invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className = {divClassName}>
            <select
                className = {className}
                aria-label = {ariaLabel}
                value = {selectedValue}
                disabled = {disabled}
                size = {size}
                onChange = {onChange}
                onFocus = {onFocus}
                onBlur = {onBlur}
                ref = {ref}
            >
                {optionComponents}
            </select>
            {errorMsgComponent}
        </div>;
    }
);


/**
 * @typedef {object} CellSelectEditor~propTypes
 * @property {string}   [selectedValue]
 * @property {string[]|Array[]} items The array of items to be displayed. This may either
 * be an array of the strings to display or an array of two element sub-arrays, the
 * first element is the key and the second element is the text to display for that
 * item.
 * @property {string}   [errorMsg]  If defined an error message to be displayed
 * beneath the selector.
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 * @property {number}   [size]
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
CellSelectEditor.propTypes = {
    selectedValue: PropTypes.any,
    items: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.array),
    ]).isRequired,
    errorMsg: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    size: PropTypes.number,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};



/**
 * Component for the display only version of {@link CellSelectEditor}.
 * @class
 */
export function CellSelectDisplay(props) {
    const { selectedValue, ariaLabel, classExtras, size, } = props;

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + classExtras;

    return <Tooltip tooltip = {props.tooltip}>
        <div className = {divClassName}>
            <input type = "text"
                className = {className}
                aria-label = {ariaLabel}
                style = {{backgroundColor: 'inherit'}}
                size = {size}
                disabled
                value = {selectedValue || ''}
                onChange = {() => {}}
            />
        </div>
    </Tooltip>;
}

/**
 * @typedef {object} CellSelectDisplay~propTypes
 * @property {string|number}   [selectedValue]
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 */
CellSelectDisplay.propTypes = {
    selectedValue: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    size: PropTypes.number,
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
};



/**
 * Component for a cell that toggles through a list of options.
 * This should normally not be used for more than a handful of options.
 * @class
 */
export const CellToggleSelectEditor = React.forwardRef(
    function myCellSelectEditor(props, ref) {
        const { selectedValue, items, errorMsg, ariaLabel, classExtras, 
            onChange, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellButton cellToggleSelectEditor-button ' 
            + classExtras;

        let value = selectedValue;
        let nextKey;
        if (items.length && (typeof items[0] === 'string')) {
            for (let i = 0; i < items.length; ++i) {
                if (items[i] === selectedValue) {
                    nextKey = ((i + 1) === items.length)
                        ? items[0]
                        : items[i + 1];
                }
            }
        }
        else {
            for (let i = 0; i < items.length; ++i) {
                if (items[i][0] === selectedValue) {
                    value = items[i][1];
                    nextKey = ((i + 1) === items.length)
                        ? items[0][0]
                        : items[i + 1][0];
                }
            }
        }

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className = "invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className = {divClassName}>
            <button type = "button"
                className = {className}
                aria-label = {ariaLabel}
                value = {selectedValue}
                disabled = {disabled}
                onClick = {(e) => {
                    if (onChange) {
                        e = Object.assign({}, e, {
                            target: {
                                value: nextKey
                            }
                        });
                        onChange(e);
                    }
                }}
                onFocus = {onFocus}
                onBlur = {onBlur}
                ref = {ref}
            >
                {value}
            </button>
            {errorMsgComponent}
        </div>;
    }
);


/**
 * @typedef {object} CellToggleSelectEditor~propTypes
 * @property {*}   [selectedValue]
 * @property {string[]|Array[]} items The array of items to be displayed. This may either
 * be an array of the strings to display or an array of two element sub-arrays, the
 * first element is the key and the second element is the text to display for that
 * item.
 * @property {string}   [errorMsg]  If defined an error message to be displayed
 * beneath the selector.
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
CellToggleSelectEditor.propTypes = {
    selectedValue: PropTypes.any,
    items: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.array),
    ]).isRequired,
    errorMsg: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


export const CellToggleSelectDisplay = CellSelectDisplay;
