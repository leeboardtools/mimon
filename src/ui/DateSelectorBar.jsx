import React from 'react';
import PropTypes from 'prop-types';
import { CloseButton } from '../util-ui/CloseButton';
import { Row, Col } from '../util-ui/RowCols';
import { DateField } from '../util-ui/DateField';
import { Button } from '../util-ui/Button';
import { Field, FieldText } from '../util-ui/Field';
import { YMDDate } from '../util/YMDDate';
import { format } from 'date-fns';
//import { userMsg } from '../util/UserMessages';
import { resolveDateSelector } from '../util/DateSelectorDef';
import { DateSelectorDefEditor } from '../util-ui/DateSelectorDefEditor';


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
            onDateSelectorDefChanged = {(dateSelectorDef) => 
                props.onDateSelectorDefChanged(dateSelectorDef)
            }
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


    let classExtras = 'DateSelectorBar';
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



export function DateRangeSelectorBar(props) {
    let closeButton;
    if (props.onClose) {
        closeButton = <CloseButton
            onClick = {props.onClose}
        />;
    }

    let classExtras = 'DateSelectorBar DateRangeSelectorBar';
    if (props.classExtras) {
        classExtras += ' ' + props.classExtras;
    }

    let clearStartButton;
    if (props.clearStartButtonLabel) {
        clearStartButton = <Button
            classExtras = "Btn-outline-secondary"
            ariaLabel = "Earliest Button"
            onClick = {() => props.onStartYMDDateChange()}
        >
            {props.clearStartButtonLabel}
        </Button>;
    }

    let clearEndButton;
    if (props.clearEndButtonLabel) {
        clearEndButton = <Button
            classExtras = "Btn-outline-secondary"
            ariaLabel = "Latest Available Button"
            onClick = {() => props.onEndYMDDateChange()}
        >
            {props.clearEndButtonLabel}
        </Button>;
    }

    let startMaxDate;
    if (props.endYMDDate) {
        startMaxDate = props.endYMDDate;
    }
    else {
        startMaxDate = new YMDDate().toString();
    }

    let endMinDate;
    if (props.startYMDDate) {
        endMinDate = props.startYMDDate;
    }

    return <Row classExtras = {classExtras}>
        <Col classExtras = "FieldContainer-inline">
            <DateField
                prependComponent = {props.startLabel}
                appendComponent = {clearStartButton}
                inputClassExtras = {props.startEditorClassExtras}
                value = {props.startYMDDate}
                maxDate = {startMaxDate}
                placeholderText = {props.startClearPlaceholderText}
                ariaLabel = "Start Date"
                onChange = {props.onStartYMDDateChange}
                dateFormat = {props.dateFormat}
                tabIndex = {0}
            />
            <DateField
                prependComponent = {props.endLabel}
                appendComponent = {clearEndButton}
                fieldClassExtras = "Field-indent"
                inputClassExtras = {props.endEditorClassExtras}
                value = {props.endYMDDate}
                minDate = {endMinDate}
                placeholderText = {props.endClearPlaceholderText}
                ariaLabel = "End Date"
                onChange = {props.onEndYMDDateChange}
                dateFormat = {props.dateFormat}
                tabIndex = {0}
            />
        </Col>
        <Col>{closeButton}</Col>
    </Row>;
}

DateRangeSelectorBar.propTypes = {
    classExtras: PropTypes.string,
    startEditorClassExtras: PropTypes.string,
    endEditorClassExtras: PropTypes.string,
    dateFormat: PropTypes.string,

    startLabel: PropTypes.string,
    startYMDDate: PropTypes.string,
    onStartYMDDateChange: PropTypes.func.isRequired,
    clearStartButtonLabel: PropTypes.string,
    startClearPlaceholderText: PropTypes.string,

    endLabel: PropTypes.string,
    endYMDDate: PropTypes.string,
    onEndYMDDateChange: PropTypes.func.isRequired,
    clearEndButtonLabel: PropTypes.string,
    endClearPlaceholderText: PropTypes.string,

    onClose: PropTypes.func,
};
