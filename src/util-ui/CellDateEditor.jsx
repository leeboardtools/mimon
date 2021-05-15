import React, { useState } from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import { getYMDDate, getYMDDateString, YMDDate } from '../util/YMDDate';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { Tooltip } from './Tooltip';


/**
 * Simple date formatter, uses date-fns.
 * Placing this here and not in YMDDate so we don't force in date-fns.
 * @param {YMDDate|string} ymdDate 
 * @param {string} dateFormat Date format string compatible with 
 * {@link https://date-fns.org/v2.0.0-alpha.18/docs/I18n}
 * @param {string} locale 
 * @returns {string}
 */
export function formatDate(ymdDate, dateFormat, locale) {
    ymdDate = getYMDDate(ymdDate);
    if (!ymdDate) {
        return;
    }

    if (dateFormat) {
        const localDate = ymdDate.toLocalDate();
        let localeArg;
        if (typeof locale === 'object') {
            // locale has to be a date-fns locale, not a locale string.
            localeArg = {
                locale: locale
            };
        }
        return format(localDate, dateFormat, localeArg);
    }
    return ymdDate.toString();
}

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
            tabIndex, placeholderText,
            dateFormat, locale } = props;

        const divClassName = '';
        let className = 'Cell CellDateEditor-textInput ' 
            + (inputClassExtras || '');

        const [ state, setState ] = useState({
            isCalendarOpen: false,
        });

        let { value } = props;
        if (placeholderText === undefined) {
            value = value || new YMDDate();
        }
        const valueDate = (value) 
            ? getYMDDate(value).toLocalDate()
            : '';

        let datePicker = <DatePicker
            className = {className}
            selected = {valueDate}
            placeholderText = {placeholderText}
            minDate = {props.minDate}
            maxDate = {props.maxDate}
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
            tabIndex = {tabIndex}
            ref = {ref}
            preventOpenOnFocus = "true"
            open = {state.openCalendar}
            enableTabLoop = "false"
            dropdownMode = "select"
            showYearDropdown
        />;

        if (errorMsg) {
            datePicker = <React.Fragment>
                <div className = "Is-invalid">
                    {datePicker}
                </div>
                <div className="Invalid-feedback">
                    {errorMsg}
                </div>
            </React.Fragment>;
        }

        return <div className = {divClassName}>
            {datePicker}            
        </div>;
    }
);


/**
 * @callback CellDateEditor~onChange
 * @param {string}  ymdDate
 */


/**
 * @typedef {object} CellDateEditor~propTypes
 * @property {string}   [ariaLabel]
 * @property {string}   [value]
 * @property {string}   [minDate]
 * @property {string}   [maxDate]
 * @property {string}   [placeholderText]
 * @property {string}   [inputClassExtras]  If specified additional CSS
 * classes to add to the &lt;input&gt; entity.
 * @property {string}   [errorMsg]  If specified an error message to be displayed
 * below the input box.
 * @property {CellDateEditor~onChange} [onChange]  onChange callback. Note the arg
 * is the modified date string.
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
    minDate: PropTypes.string,
    maxDate: PropTypes.string,
    placeholderText: PropTypes.string,
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    errorMsg: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    dateFormat: PropTypes.string,
    locale: PropTypes.string,
    tabIndex: PropTypes.number,
};


/**
 * React component that's a display representation of {@link CellDateEditor}.
 * @param {*} props 
 */
export function CellDateDisplay(props) {
    const { ariaLabel, inputClassExtras, dateFormat, locale } = props;
    const inputType = props.inputType || 'text';
    let { value, size } = props;
    value = getYMDDateString(value);
    value = value || '';
    if (size) {
        if (size < 0) {
            size = Math.max(-size, value.length);
        }
    }

    if (dateFormat && value) {
        value = formatDate(value, dateFormat, locale);
    }

    const divClassName = '';
    const className = 'Cell CellTextEditor-textInput CellTextEditor-textDisplay ' 
        + (inputClassExtras || '');

    return <Tooltip tooltip={props.tooltip}>
        <div className={divClassName}>
            <input type={inputType}
                className={className}
                aria-label={ariaLabel}
                style={{backgroundColor: 'inherit'}}
                size={size}
                disabled
                value={value}
                onChange={() => {}}
            />
        </div>
    </Tooltip>;
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
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    inputClassExtras: PropTypes.string,
    size: PropTypes.number,
    inputType: PropTypes.string,
    dateFormat: PropTypes.string,
    locale: PropTypes.string,
    tooltip: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
        PropTypes.array,
    ]),
};


