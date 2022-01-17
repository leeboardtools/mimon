import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from './Popup';


function arrayElementsSame(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }

    for (let i = a.length - 1; i >= 0; --i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}


class AutoCompleteTextEditorImpl extends React.Component {
    constructor(props) {
        super(props);

        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onClosePopup = this.onClosePopup.bind(this);

        this._popupRef = React.createRef();

        this.state = {};
    }


    componentDidMount() {
        this._buildPopupItemsList();
    }


    componentDidUpdate(prevProps, prevState) {
        const { props } = this;

        let rebuildPopupItems;
        if (!arrayElementsSame(prevProps.autoCompleteList, props.autoCompleteList)) {
            rebuildPopupItems = true;
        }

        const currentValue = props.value || '';
        const prevValue = prevProps.value || '';
        if (currentValue.toUpperCase() !== prevValue.toUpperCase()) {
            rebuildPopupItems = true;

            this.setState({
                activeEntryIndex: undefined,
                isPopupListShown: true,
            });
        }

        if (rebuildPopupItems) {
            this._buildPopupItemsList();
        }
        else {
            if (!arrayElementsSame(prevState.popupEntries, this.state.popupEntries)) {
                if (this._popupRef.current) {
                    this._popupRef.current.updateLayout();
                }
            }
        }
    }


    _buildPopupItemsList() {
        const { props } = this;
        const { autoCompleteList, onAutoComplete } = props;

        let popupEntries = [];
        if (autoCompleteList && onAutoComplete && props.value) {
            const value = (props.value || '').toUpperCase();
            for (let i = 0; i < autoCompleteList.length; ++i) {
                const item = autoCompleteList[i];
                const uItem = item.toUpperCase();

                if (uItem.includes(value)) {
                    popupEntries.push({
                        value: i,
                        item: item,
                        uItem: uItem,
                    });
                }
            }
        }

        this.setState({
            popupEntries: (popupEntries.length) ? popupEntries : undefined,
        });
    }


    performAutoComplete(entryIndex) {
        if (entryIndex === undefined) {
            return;
        }

        const { onAutoComplete, autoCompleteList } = this.props;
        const { popupEntries } = this.state;

        this.onClosePopup();

        if (onAutoComplete && popupEntries && popupEntries[entryIndex]) {
            onAutoComplete(popupEntries[entryIndex].value, autoCompleteList);
            return true;
        }
    }



    onKeyDown(e) {
        const { popupEntries } = this.state;
        if (popupEntries) {
            let { activeEntryIndex } = this.state;
            switch (e.key) {
            case 'Tab':
            case 'Enter':
                if (this.performAutoComplete(activeEntryIndex)) {
                    e.preventDefault();
                    e.stopPropagation();        
                }
                break;
            
            case 'Escape':
                if (activeEntryIndex !== undefined) {
                    this.onClosePopup();
                    e.preventDefault();
                    e.stopPropagation();        
                }
                break;
            
            case 'ArrowUp':
                activeEntryIndex = (activeEntryIndex || 0) - 1;
                if (activeEntryIndex < 0) {
                    activeEntryIndex = popupEntries.length - 1;
                }
                this.setState({
                    activeEntryIndex: activeEntryIndex,
                });
                e.preventDefault();
                e.stopPropagation();        
                break;
        
            case 'ArrowDown':
                if (activeEntryIndex === undefined) {
                    activeEntryIndex = 0;
                }
                else {
                    ++activeEntryIndex;
                    if (activeEntryIndex >= popupEntries.length) {
                        activeEntryIndex = 0;
                    }
                }
                this.setState({
                    activeEntryIndex: activeEntryIndex,
                });
                e.preventDefault();
                e.stopPropagation();        
                break;
            
            case 'End':
                if (activeEntryIndex !== undefined) {
                    this.setState({
                        activeEntryIndex: popupEntries.length - 1,
                    });
                    e.preventDefault();
                    e.stopPropagation();        
                }
                break;
            }
        }
    }


    onFocus(e) {
        const { onFocus } = this.props;

        if (onFocus) {
            onFocus(e);
        }
    }

    onBlur(e) {
        this.onClosePopup();

        const { onBlur } = this.props;

        if (onBlur) {
            onBlur(e);
        }
    }


    onClick(e) {
        if (this.state.popupEntries) {
            this.setState({
                isPopupListShown: !this.state.isPopupListShown,
            });
        }
    }


    onClosePopup() {
        this.setState({
            activeEntryIndex: undefined,
            isPopupListShown: false,
        });
    }


    renderListComponent() {
        const { popupEntries, activeEntryIndex } = this.state;
        const { onAutoComplete } = this.props;

        if (popupEntries && popupEntries.length && onAutoComplete) {
            const items = [];
            for (let i = 0; i < popupEntries.length; ++i) {
                const entry = popupEntries[i];

                let className = 'AutoComplete-item';
                if (activeEntryIndex === i) {
                    className += ' active';
                }
                items.push(
                    <li 
                        className = {className}
                        key = {entry.value}
                        value = {entry.value}
                        onClick = {(e) => this.performAutoComplete(i)}
                        // For some reason onClick doesn't get received.
                        onMouseDown = {(e) => this.performAutoComplete(i)}
                    >
                        {entry.item}
                    </li>
                );
            }

            const popupList = <div 
                className = "Scrollable-menu AutoComplete-popupList"
            >
                {items}
            </div>;

            return <Popup
                show = {this.state.isPopupListShown}
                onClose = {this.onClosePopup}
                ref = {this._popupRef}
                isDebug = {true}
            >
                {popupList}
            </Popup>;

        }
    }


    render() {
        const { props } = this;
        const { inputClassExtras } = props;
        
        let className = 'AutoCompleteTextEditor';
        if (inputClassExtras) {
            className += ' ' + inputClassExtras;
        }

        let listComponent = this.renderListComponent();

        let onKeyDown;
        let onClick;
        let { onFocus, onBlur, } = props;
        if (listComponent) {
            onFocus = this.onFocus;
            onBlur = this.onBlur;
            onKeyDown = this.onKeyDown;
            onClick = this.onClick;
        }

        const inputType = props.inputType || 'text';
        const inputComponent = <input type = {inputType}
            id = {props.id}
            className = {className}
            aria-label = {props.ariaLabel}
            placeholder = {props.placeholder}
            value = {props.value || ''}
            size = {props.size}
            disabled = {props.disabled}
            onChange = {props.onChange}
            onFocus = {onFocus}
            onBlur = {onBlur}
            onPaste = {props.onPaste}
            onKeyDown = {onKeyDown}
            onClick = {onClick}
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
    onPaste: PropTypes.func,
    autoCompleteList: PropTypes.arrayOf(PropTypes.string),
    onAutoComplete: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    innerRef: PropTypes.any,
};


/**
 * React component for editing text that supports a dropdown list of 
 * auto-complete items.
 * @class
 */
export const AutoCompleteTextEditor = React.forwardRef((props, ref) =>
    <AutoCompleteTextEditorImpl
    //<AutoCompleteTextEditorImplDataList
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


