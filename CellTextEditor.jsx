import React from 'react';
import PropTypes from 'prop-types';
import { AutoCompleteTextEditor } from './AutoCompleteTextEditor';
import { Tooltip } from './Tooltip';


/**
 * React component for editing text in a table cell.
 * @class
 */
export const CellTextEditor = React.forwardRef(
    function CellTextEditorImpl(props, ref) {
        const { id, ariaLabel, value, inputClassExtras, errorMsg, size,
            onChange, onFocus, onBlur, onPaste, disabled, placeholder,
            autoCompleteList, onAutoComplete } = props;

        const divClassName = 'Input-group Mb-0 ';
        let className = 'Cell CellTextEditor-textInput ' 
            + (inputClassExtras || '');

        const inputType = props.inputType || 'text';

        const inputComponent = <AutoCompleteTextEditor
            id = {id}
            type = {inputType}
            inputClassExtras = {className}
            ariaLabel = {ariaLabel}
            placeholder = {placeholder}
            value = {value || ''}
            size = {size}
            disabled = {disabled}
            onChange = {onChange}
            onFocus = {onFocus}
            onBlur = {onBlur}
            onPaste = {onPaste}
            autoCompleteList = {autoCompleteList}
            onAutoComplete = {onAutoComplete}
            ref = {ref}
        />;

        let errorMsgComponent;
        if (errorMsg) {
            className += ' Is-invalid';
            errorMsgComponent = <div className="Invalid-feedback">
                {errorMsg}
            </div>;
        }

        return <div className = {divClassName}>
            {inputComponent}
            {errorMsgComponent}
        </div>;
    }
);


/**
 * @typedef {object} CellTextEditor~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputType] The type attribute for the input element.
 * @property {string}   [placeholder]
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
 * @property {function} [onPaste]    onPaste event handler
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/onpaste}.
 * @property {string[]} [autoCompleteList] If present an array of auto-complete items.
 * @property {AutoCompleteTextEditor~onAutoComplete} [onAutoComplete] Callback for 
 * auto-complete selections. If not present and an item is selected from 
 * autoCompleteList the selected item will be passed to onChange().
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
CellTextEditor.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputType: PropTypes.string,
    placeholder: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onPaste: PropTypes.func,
    autoCompleteList: PropTypes.arrayOf(PropTypes.string),
    onAutoComplete: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


/**
 * React component that's a display representation of {@link CellTextEditor}.
 * @param {*} props 
 */
export function CellTextDisplay(props) {
    const { ariaLabel, inputClassExtras, placeholder, tooltip } = props;
    const inputType = props.inputType || 'text';

    let { value, size } = props;
    value = value || '';
    if (size) {
        if (size < 0) {
            size = Math.max(-size, value.length);
        }
    }

    const divClassName = 'Input-group Mb-0 ';
    const className = 'Cell CellTextEditor-textInput CellTextEditor-textDisplay ' 
        + (inputClassExtras || '');

    const component = <div className = {divClassName}>
        <input type = {inputType}
            className = {className}
            aria-label = {ariaLabel}
            placeholder = {placeholder}
            style = {{backgroundColor: 'inherit'}}
            size = {size}
            disabled
            value = {value}
            onChange = {() => {}}
        />
    </div>;

    return <Tooltip tooltip = {tooltip}>
        {component}
    </Tooltip>;
}


/**
 * @typedef {object} CellTextDisplay~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {string}   [tooltip]
 */
CellTextDisplay.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    inputType: PropTypes.string,
    placeholder: PropTypes.string,
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
        PropTypes.array,
    ]),
};
