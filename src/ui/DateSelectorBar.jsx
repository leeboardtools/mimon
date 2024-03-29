import React from 'react';
import PropTypes from 'prop-types';
import { CloseButton } from '../util-ui/CloseButton';
import { Row, Col } from '../util-ui/RowCols';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import { format } from 'date-fns';
import { userMsg } from '../util/UserMessages';
import { resolveDateSelector } from '../util/DateSelectorDef';
import { DateSelectorDefEditor } from '../util-ui/DateSelectorDefEditor';
import { resolveDateRange } from '../util/DateRangeDef';
import { DateRangeDefEditor } from '../util-ui/DateRangeDefEditor';
import { CellTextDisplay } from '../util-ui/CellTextEditor';


/**
 * React component that displays a resolved {@link DateSelectorDef~SelectorDef}
 * date along with an editor for it in a bar with a close button.
 * @class
 */
export function DateSelectorBar(props) {
    
    let dateString;

    const ymdDate = resolveDateSelector(props.dateSelectorDef) || new YMDDate();
    if (ymdDate) {
        const { dateFormat } = props;
        const localDate = ymdDate.toLocalDate();
        dateString = format(localDate, dateFormat);

        if (props.label !== undefined) {
            dateString = props.label + ' ' + dateString;
        }
        else {
            dateString = userMsg('DateSelectorBar-date_label', dateString);
        }
    }


    let editComponent;
    if (props.onDateSelectorDefChange) {
        editComponent = <DateSelectorDefEditor
            dateSelectorDef = {props.dateSelectorDef}
            onDateSelectorDefChange = {props.onDateSelectorDefChange}
            excludeFuture = {props.excludeFuture}
            excludePast = {props.excludePast}
            dateFormat = {props.dateFormat}
            tabIndex = {0}
        />;
    }

    let closeButton;
    if (props.onClose) {
        closeButton = <CloseButton
            onClick = {props.onClose}
        />;
    }


    let classExtras = 'Row-align-items-center No-gutters DateSelectorBar';
    if (props.classExtras) {
        classExtras += ' ' + props.classExtras;
    }

    return <Row classExtras = {classExtras}>
        <Col classExtras = "Col-auto DateSelectorBar-date">
            <CellTextDisplay
                ariaLabel = "Date"
                value = {dateString}
            />
        </Col>
        <Col classExtras = "Col-auto">
            {editComponent}
        </Col>
        <Col>{closeButton}</Col>
    </Row>;
}


/**
 * @typedef {object} DateSelectorBar~propTypes
 * @property {string} [classExtras]
 * @property {DateSelectorDef~SelectorDefDataItem|DateSelectorDef~SelectorDef} 
 *  [dateSelectorDef]
 * @property {DateSelectorDefEditor~onDateSelectorDefChangeCallback}
 *  onDateSelectorDefChange Required callback for receiving changes.
 * @property {string} [dateFormat] Date format string compatible with 
 * {@link https://date-fns.org/v2.0.0-alpha.18/docs/I18n}
 * @property {boolean} [excludeFuture=false]
 * @property {boolean} [excludePast=false]
 * @property {function} [onClose] If defined a close button is displayed and this
 * callback is called when the button is chosen.
 */
DateSelectorBar.propTypes = {
    classExtras: PropTypes.string,
    dateFormat: PropTypes.string,

    label: PropTypes.string,
    dateSelectorDef: PropTypes.object,
    onDateSelectorDefChange: PropTypes.func.isRequired,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,

    onClose: PropTypes.func,
};



/**
 * React component that displays a resolved {@link DateRangeDef~RangeDef}
 * date range along with an editor for it in a bar with a close button.
 * @class
 */
export function DateRangeBar(props) {
    
    let earliestDateString;
    let latestDateString;

    const range = resolveDateRange(props.dateRangeDef);
    if (range) {
        const { dateFormat } = props;
        if (range.earliestYMDDate) {
            earliestDateString = format(
                getYMDDate(range.earliestYMDDate).toLocalDate(),
                dateFormat);
        }
        if (range.latestYMDDate) {
            latestDateString = format(
                getYMDDate(range.latestYMDDate).toLocalDate(),
                dateFormat);
        }
    }

    let dateString;
    if (earliestDateString) {
        if (latestDateString) {
            dateString = userMsg('DateRangeBar-dateRange_label',
                earliestDateString,
                latestDateString,
            );
        }
        else {
            dateString = userMsg('DateRangeBar-daysAfter_label',
                earliestDateString,
            );
        }
    }
    else if (latestDateString) {
        dateString = userMsg('DateRangeBar-daysBefore_label',
            latestDateString,
        );
    }
    else {
        dateString = userMsg('DateRangeBar-allDays_label');
    }


    let editComponent;
    if (props.onDateRangeDefChange) {
        editComponent = <DateRangeDefEditor
            dateRangeDef = {props.dateRangeDef}
            onDateRangeDefChange = {props.onDateRangeDefChange}
            excludeFuture = {props.excludeFuture}
            excludePast = {props.excludePast}
            dateFormat = {props.dateFormat}
            tabIndex = {0}
        />;
    }


    let closeButton;
    if (props.onClose) {
        closeButton = <CloseButton
            onClick = {props.onClose}
        />;
    }


    let classExtras = 'Row-align-items-center No-gutters DateRangeBar';
    if (props.classExtras) {
        classExtras += ' ' + props.classExtras;
    }

    return <Row classExtras = {classExtras}>
        <Col classExtras = "Col-auto DateRangeBar-dateCol">
            <CellTextDisplay
                ariaLabel = "Date"
                value = {dateString}
            />
        </Col>
        <Col classExtras = "Col-auto DateRangeBar-editorCol">
            {editComponent}
        </Col>
        <Col>{closeButton}</Col>
    </Row>;
}



/**
 * @typedef {object} DateRangeBar~propTypes
 * @property {string} [classExtras]
 * @property {DateRangeDef~RangeDefDataItem|DateRangeDef~RangeDef} [dateRangeDef]
 * @property {DateRangeDefEditor~onDateRangeDefChangeCallback}
 *  onDateRangeDefChange Required callback for receiving changes.
 * @property {string} [dateFormat] Date format string compatible with 
 * {@link https://date-fns.org/v2.0.0-alpha.18/docs/I18n}
 * @property {boolean} [excludeFuture=false]
 * @property {boolean} [excludePast=false]
 * @property {function} [onClose] If defined a close button is displayed and this
 * callback is called when the button is chosen.
 */
DateRangeBar.propTypes = {
    classExtras: PropTypes.string,
    dateFormat: PropTypes.string,

    dateRangeDef: PropTypes.object.isRequired,
    onDateRangeDefChange: PropTypes.func,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,

    onClose: PropTypes.func,
};
