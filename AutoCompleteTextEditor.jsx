import React from 'react';
import PropTypes from 'prop-types';


class AutoCompleteTextEditorImpl extends React.Component {
    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onInput = this.onInput.bind(this);

        this.state = {};
    }


    onKeyDown(e) {
        if (e.key) {
            this._lastKey = e.key;
        }
        else {
            this._lastKey = undefined;
        }
    }


    onChange(e) {
        const { onChange } = this.props;

        if (onChange) {
            onChange(e);
        }
    }


    onInput(e) {
        const { autoCompleteList, onAutoComplete } = this.props;
        if (onAutoComplete && (this._lastKey === 'Unidentified')) {
            let { value } = e.target;
            if (value) {
                value = value.toUpperCase();
                for (let i = 0; i < autoCompleteList.length; ++i) {
                    if (autoCompleteList[i].toUpperCase() === value) {
                        onAutoComplete(i, autoCompleteList);
                        return;
                    }
                }
            }
        }
    }


    render() {
        const { props } = this;
        const { inputClassExtras, autoCompleteList } = props;
        
        let className = 'AutoCompleteTextEditor';
        if (inputClassExtras) {
            className += ' ' + inputClassExtras;
        }

        let listComponent;
        let listComponentId;
        if (autoCompleteList && autoCompleteList.length) {
            const options = [];
            for (let i = 0; i < autoCompleteList.length; ++i) {
                options.push(
                    <option 
                        key = {i} 
                        value = {autoCompleteList[i]}
                    >
                        {autoCompleteList[i]}
                    </option>);
            }

            listComponentId = (props.id || 'AutoCompleteTextEditorImpl') + '-datalist';
            listComponent = <datalist 
                id = {listComponentId} 
            >
                {options}
            </datalist>;
        }

        const inputType = props.inputType || 'text';
        const inputComponent = <input type = {inputType}
            id = {props.id}
            list = {listComponentId}
            className = {className}
            aria-label = {props.ariaLabel}
            placeholder = {props.placeholder}
            value = {props.value || ''}
            size = {props.size}
            disabled = {props.disabled}
            onChange = {this.onChange}
            onFocus = {props.onFocus}
            onBlur = {props.onBlur}
            onKeyDown = {this.onKeyDown}
            onInput = {this.onInput}
            ref = {props.innerRef}
        />;

        if (listComponent) {
            return <React.Fragment>
                {inputComponent}
                {listComponent}
            </React.Fragment>;
        }
        else {
            return inputComponent;
        }
    }
}

AutoCompleteTextEditorImpl.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputType: PropTypes.string,
    placeholder: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    autoCompleteList: PropTypes.arrayOf(PropTypes.string),
    onAutoComplete: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    innerRef: PropTypes.any,
};


/**
 * React complete for editing text that supports a dropdown list of auto-complete
 * items.
 * @class
 */
export const AutoCompleteTextEditor = React.forwardRef((props, ref) =>
    <AutoCompleteTextEditorImpl
        innerRef = {ref}
        {...props}
    />);


/**
 * @callback AutoCompleteTextEditor~onAutoComplete
 * @param {number} index    The index of the selected item from the auto-complete
 * list.
 * @param {string[]} [autoCompleteList]
 */

/**
 * @typedef {object} AutoCompleteTextEditor~propTypes
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
 * @property {string[]} [autoCompleteList] If present an array of auto-complete items.
 * @property {AutoCompleteTextEditor~onAutoComplete} [onAutoComplete] Callback for 
 * auto-complete selections. If not present and an item is selected from 
 * autoCompleteList the selected item will be passed to onChange().
 * @property {boolean}  [disabled]  If <code>true</code> the editor is disabled.
 */
AutoCompleteTextEditor.propTypes = {
    id: PropTypes.string,
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputType: PropTypes.string,
    placeholder: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    autoCompleteList: PropTypes.arrayOf(PropTypes.string),
    onAutoComplete: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};


