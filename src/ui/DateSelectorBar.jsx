import React from 'react';
import PropTypes from 'prop-types';
import { CloseButton } from '../util-ui/CloseButton';
import { Row, Col } from '../util-ui/RowCols';
import { DateField } from '../util-ui/DateField';
import { Button } from '../util-ui/Button';
import { YMDDate } from '../util/YMDDate';

export function DateSelectorBar(props) {
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
        <Col>
            <DateField 
                prependComponent = {props.label}
                //appendComponent = {clearButton}
                fieldClassExtras = {props.fieldClassExtras}
                inputClassExtras = {props.editorClassExtras}
                ariaLabel = "Date"
                value = {props.ymdDate}
                placeholderText = {props.clearPlaceholderText}
                onChange = {props.onYMDDateChange}
                dateFormat = {props.dateFormat}
                tabIndex = {0}
            />
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
    ymdDate: PropTypes.string,
    onYMDDateChange: PropTypes.func.isRequired,
    clearPlaceholderText: PropTypes.string,

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
