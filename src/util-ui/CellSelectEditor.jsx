import React from 'react';
import PropTypes from 'prop-types';


/**
 * Component normally used with {@link RowEditTable} for a cell that offers a drop-down
 * list to choose from in edit mode, return from the {@link RowEditTable~onRenderEditCell}
 * callback. {@link CellSelectDisplay} is normally returned from the
 * {@link RowEditTable~onRenderDisplayCell} callback.
 * @class
 */
export const CellSelectEditor = React.forwardRef(
    function myCellSelectEditor(props, ref) {
        const { selectedValue, items, errorMsg, ariaLabel, classExtras, 
            onChange, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellSelectEditor-select ' + classExtras;

        let optionComponents;
        if (items.length && (typeof items[0] === 'string')) {
            optionComponents = items.map((option) =>
                <option key={option}>{option}</option>);
        }
        else {
            optionComponents = items.map(([key, option]) =>
                <option key={key} value={key}>{option}</option>);
        }

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className="invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className={divClassName}>
            <select
                className={className}
                aria-label={ariaLabel}
                value={selectedValue}
                disabled={disabled}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                ref={ref}
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
 * @property {function} [onChange]  onChange event handler 
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event}.
 * @property {function} [onFocus]   onFocus event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}.
 * @property {function} [onBlur]    onBlur event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}.
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
CellSelectEditor.propTypes = {
    selectedValue: PropTypes.string,
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
    disabled: PropTypes.bool,
};



/**
 * Component normally used with {@link RowEditTable} for a cell that offers a drop-down
 * list to choose from in display mode, return from the 
 * {@link RowEditTable~onRenderDisplayCell} callback.
 * @class
 */
export function CellSelectDisplay(props) {
    const { selectedValue, ariaLabel, classExtras, size, } = props;

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + classExtras;

    return <div className={divClassName}>
        <input type="text"
            className={className}
            aria-label={ariaLabel}
            style={{backgroundColor: 'inherit'}}
            size={size}
            disabled
            value={selectedValue || ''}
            onChange={() => {}}
        />
    </div>;
}

/**
 * @typedef {object} CellSelectDisplay~propTypes
 * @property {string}   [selectedValue]
 * @property {string}   [ariaLabel]
 * @property {string}   [classExtras]   Extra classes to add to the component.
 */
CellSelectDisplay.propTypes = {
    selectedValue: PropTypes.string,
    ariaLabel: PropTypes.string,
    classExtras: PropTypes.string,
    size: PropTypes.number,
};
