import React from 'react';
import PropTypes from 'prop-types';

/**
 * React component for editing text in a table cell. Works with 
 * {@link RowEditCollapsibleTable}, return from the
 * {@link RowEditTable~onRenderEditCell} callback. {@link CellTextDisplay} 
 * would then normally be returned from the
 * {@link RowEditTable~onRenderDisplayCell} callback.
 * @class
 */
export const CellTextEditor = React.forwardRef(
    function CellTextEditorImpl(props, ref) {
        const { ariaLabel, value, inputClassExtras, errorMsg, 
            onChange, onFocus, onBlur, disabled } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellTextEditor-textInput ' + inputClassExtras;

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className="invalid-feedback">
                {errorMsg}
            </div>;
        }
        return <div className={divClassName}>
            <input type="text"
                className={className}
                aria-label={ariaLabel}
                value={value || ''}
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


/**
 * @typedef {object} CellTextEditor~propTypes
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
CellTextEditor.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
};


/**
 * React component that's a display representation of {@link CellTextEditor},
 * for use with {@link RowEditCollapsibleTable~onRenderDisplayCell}.
 * @param {*} props 
 */
export function CellTextDisplay(props) {
    const { ariaLabel, value, inputClassExtras, } = props;

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + inputClassExtras;

    return <div className={divClassName}>
        <input type="text"
            className={className}
            aria-label={ariaLabel}
            style={{backgroundColor: 'inherit'}}
            disabled
            value={value || ''}
            onChange={() => {}}
        />
    </div>;
}


/**
 * @typedef {object} CellTextDisplay~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 */
CellTextDisplay.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
};
