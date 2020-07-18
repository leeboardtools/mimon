import React, { useState } from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import { getYMDDate, YMDDate } from '../util/YMDDate';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

//
// How do we want to do this?
// Very simple.
//  - Edit directly
//      - Left, right arrow changes active field.
//      - Up, down arrow changes increments/decrements date.
//      
//  - Drop down calendar
//      - Space bar toggles
//      - Home, end back, forward year
//      - PgUp, PgDn back, forward month
//      - Up, down back, forward week
//      - Left, right back, forward day


function adjustDate(ymdDate, delta, onChange) {
    ymdDate = getYMDDate(ymdDate);
    if (ymdDate) {
        onChange(ymdDate.addDays(delta).toString());
    }
}

function onKeyDown(e, ymdDate, onChange, state, setState) {
    const { isCalendarOpen } = state;
    if (isCalendarOpen) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            return;
        }
    }

    switch (e.key) {
    case ' ' :
        setState({
            openCalendar: !isCalendarOpen,
        });
        e.stopPropagation();
        e.preventDefault();
        break;
    
    case '=' :
        adjustDate(ymdDate, 1, onChange);
        e.stopPropagation();
        e.preventDefault();
        break;
    
    case '-' :
        adjustDate(ymdDate, -1, onChange);
        e.stopPropagation();
        e.preventDefault();
        break;
    }
}


/**
 * React component for editing text in a table cell.
 * @class
 */

export const CellDateEditor = React.forwardRef(
    function CellDateEditorImpl(props, ref) {
        const { ariaLabel, inputClassExtras, errorMsg,
            onChange, onFocus, onBlur, disabled, size,
            dateFormat, locale } = props;

        const divClassName = 'input-group mb-0 ';
        let className = 'form-control cellDateEditor-textInput ' 
            + (inputClassExtras || '');

        let errorMsgComponent;
        if (errorMsg) {
            className += ' is-invalid';
            errorMsgComponent = <div className="invalid-feedback">
                {errorMsg}
            </div>;
        }

        const [ state, setState ] = useState({
            isCalendarOpen: false,
        });

        let { value } = props;
        value = value || new YMDDate();
        const valueDate = getYMDDate(value).toLocalDate();

        return <div className = {divClassName}>
            <DatePicker
                className = {className}
                selected = {valueDate}
                onChange = {(e) => {
                    const newDate = new Date(e);
                    onChange(YMDDate.fromLocalDate(newDate).toString());
                }}
                onKeyDown = {(e) => {
                    onKeyDown(e, value, onChange, state, setState);
                }}
                onCalendarOpen = {() => setState({ 
                    isCalendarOpen: true, 
                    openCalendar: undefined, 
                })}
                onCalendarClose = {() => setState({ 
                    isCalendarOpen: false,
                    openCalendar: undefined,
                })}
                onBlur = {onBlur}
                onFocus = {onFocus}
                disabled = {disabled || !onChange}
                aria-label = {ariaLabel}
                dateFormat = {dateFormat}
                locale = {locale}
                size = {size}
                ref = {ref}
                preventOpenOnFocus = "true"
                open = {state.openCalendar}
                enableTabLoop = "false"
                dropdownMode = "select"
            />
            {errorMsgComponent}
        </div>;
    }
);


/**
 * @typedef {object} CellDateEditor~propTypes
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
CellDateEditor.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    dateFormat: PropTypes.string,
    locale: PropTypes.string,
};


/**
 * React component that's a display representation of {@link CellDateEditor}.
 * @param {*} props 
 */
export function CellDateDisplay(props) {
    const { ariaLabel, inputClassExtras, dateFormat, locale } = props;
    const inputType = props.inputType || 'text';
    let { value, size } = props;
    value = value || '';
    if (size) {
        if (size < 0) {
            size = Math.max(-size, value.length);
        }
    }

    if (dateFormat && value) {
        const localDate = getYMDDate(value).toLocalDate();
        let localeArg;
        if (locale) {
            localeArg = {
                locale: locale
            };
        }
        value = format(localDate, dateFormat, localeArg);
    }

    const divClassName = 'input-group mb-0 ';
    const className = 'form-control cellTextEditor-textInput cellTextEditor-textDisplay ' 
        + (inputClassExtras || '');

    return <div className={divClassName}>
        <input type={inputType}
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
 * @typedef {object} CellDateDisplay~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 */
CellDateDisplay.propTypes = {
    ariaLabel: PropTypes.string,
    value: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    inputType: PropTypes.string,
    dateFormat: PropTypes.string,
    locale: PropTypes.string,
};
