import React from 'react';
import PropTypes from 'prop-types';
import { CloseButton } from '../util-ui/CloseButton';
import { Row, Col } from '../util-ui/RowCols';
import { Field, FieldText } from '../util-ui/Field';
import { YMDDate, getYMDDate } from '../util/YMDDate';
import { format } from 'date-fns';
import { userMsg } from '../util/UserMessages';
import { resolveDateSelector } from '../util/DateSelectorDef';
import { DateSelectorDefEditor } from '../util-ui/DateSelectorDefEditor';
import { resolveDateRange } from '../util/DateRangeDef';
import { DateRangeDefEditor } from '../util-ui/DateRangeDefEditor';


export function DateSelectorBar(props) {
    
    let dateComponent;

    let dateString;

    const ymdDate = resolveDateSelector(props.dateSelectorDef) || new YMDDate();
    if (ymdDate) {
        const { dateFormat } = props;
        const localDate = ymdDate.toLocalDate();
        if (dateFormat) {
            dateString = format(localDate, dateFormat);
        }
        else {
            dateString = new Intl.DateTimeFormat().format(localDate);
        }
    }
    dateComponent = <Field
        prependComponent = {props.label}
        fieldClassExtras = "Field-postSpace"
    >
        <FieldText>{dateString}</FieldText>
    </Field>;


    let editComponent;
    if (props.onDateSelectorDefChanged) {
        editComponent = <DateSelectorDefEditor
            dateSelectorDef = {props.dateSelectorDef}
            onDateSelectorDefChanged = {props.onDateSelectorDefChanged}
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


    let classExtras = 'No-gutters DateSelectorBar';
    if (props.classExtras) {
        classExtras += ' ' + props.classExtras;
    }

    return <Row classExtras = {classExtras}>
        <Col classExtras = "FieldContainer-inline">
            {dateComponent}
            <Field classExtras = "Field-indent">
                {editComponent}
            </Field>
        </Col>
        <Col>{closeButton}</Col>
    </Row>;
}

DateSelectorBar.propTypes = {
    classExtras: PropTypes.string,
    fieldClassExtras: PropTypes.string,
    editorClassExtras: PropTypes.string,
    dateFormat: PropTypes.string,

    label: PropTypes.string,
    dateSelectorDef: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    onDateSelectorDefChanged: PropTypes.func,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,

    changeButtonLabel: PropTypes.string,
    applyButtonLabel: PropTypes.string,

    onClose: PropTypes.func,
};



export function DateRangeBar(props) {
    
    let dateComponent;

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

    dateComponent = <Field
        prependComponent = {props.label}
        fieldClassExtras = "Field-postSpace"
    >
        <FieldText>{dateString}</FieldText>
    </Field>;


    let editComponent;
    if (props.onDateRangeDefChanged) {
        editComponent = <DateRangeDefEditor
            dateRangeDef = {props.dateRangeDef}
            onDateRangeDefChanged = {props.onDateRangeDefChanged}
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


    let classExtras = 'No-gutters DateRangeBar';
    if (props.classExtras) {
        classExtras += ' ' + props.classExtras;
    }

    return <Row classExtras = {classExtras}>
        <Col classExtras = "FieldContainer-inline">
            {dateComponent}
            <Field classExtras = "Field-indent">
                {editComponent}
            </Field>
        </Col>
        <Col>{closeButton}</Col>
    </Row>;
}

DateRangeBar.propTypes = {
    classExtras: PropTypes.string,
    fieldClassExtras: PropTypes.string,
    editorClassExtras: PropTypes.string,
    dateFormat: PropTypes.string,

    label: PropTypes.string,
    dateRangeDef: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    onDateRangeDefChanged: PropTypes.func,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,

    changeButtonLabel: PropTypes.string,
    applyButtonLabel: PropTypes.string,

    onClose: PropTypes.func,
};
