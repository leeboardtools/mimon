import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { DateSelectorType, getDateSelectorType,
    getDateSelectorDefDataItem, } from '../util/DateSelectorDef';
import { DropdownSelector } from '../util-ui/DropdownSelector';
import { CellDateEditor } from '../util-ui/CellDateEditor';
import { Row, Col } from '../util-ui/RowCols';


export class DateSelectorDefEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onSelectorTypeChange = this.onSelectorTypeChange.bind(this);
        this.onYMDDateChange = this.onYMDDateChange.bind(this);

        this.loadItems();
    }


    componentDidUpdate(prevProps) {
        const { props } = this;
        if ((prevProps.excludeFuture !== props.excludeFuture)
         || (prevProps.excludePast !== props.excludePast)) {
            this.loadItems();
        }
    }


    loadItems() {
        this._items = [];
        const { excludeFuture, excludePast } = this.props;
        for (const type of Object.values(DateSelectorType)) {
            if ((excludeFuture && type.isFuture)
             || (excludePast && type.isPath)) {
                continue;
            }
            this._items.push({
                value: type.name,
                text: userMsg('DateSelectorDefEditor-type_' + type.name),
            });
        }
    }


    onSelectorTypeChange(e) {
        const selectedType = getDateSelectorType(e.target.value);
        if (selectedType) {
            const selectorDef = Object.assign({}, this.props.dateSelectorDef, {
                dateSelectorType: selectedType,
            });
            this.props.onDateSelectorDefChanged(
                getDateSelectorDefDataItem(selectorDef));
        }
    }


    onYMDDateChange(ymdDate) {
        const selectorDef = Object.assign({}, this.props.dateSelectorDef, {
            customYMDDate: ymdDate,
        });
        if (!selectorDef.dateSelectorType) {
            selectorDef.dateSelectorType = DateSelectorType.CUSTOM;
        }
        this.props.onDateSelectorDefChanged(getDateSelectorDefDataItem(selectorDef));
    }


    render() {
        const { dateSelectorDef, classExtras } = this.props;

        let selectorType;
        let customYMDDate;
        if (dateSelectorDef) {
            selectorType = getDateSelectorType(dateSelectorDef.dateSelectorType);
            customYMDDate = dateSelectorDef.customYMDDate;
        }

        let selectorTypeName;
        if (selectorType) {
            selectorTypeName = selectorType.name;
        }

        const selectorComponent = <DropdownSelector
            fieldClassExtras = "DateSelectorDefEditor-selectorType"
            items = {this._items}
            value = {selectorTypeName || DateSelectorType.TODAY.name}
            onChange = {this.onSelectorTypeChange}
        />;

        let ymdDateEditor;
        if (selectorType && selectorType.hasCustomYMDDate) {
            ymdDateEditor = <CellDateEditor
                inputClassExtras = "DateSelectorDefEditor-customDate"
                ariaLabel = "Custom Date"
                value = {customYMDDate}
                onChange = {this.onYMDDateChange}
                onDateFormat = {this.props.dateFormat}
            />;
        }

        let className = 'No-gutters DateSelectorDefEditor';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <Row classExtras = {className}>
            <Col classExtras = "Col-auto">
                {selectorComponent}
            </Col>
            <Col>
                {ymdDateEditor}
            </Col>
        </Row>;
    }
}

DateSelectorDefEditor.propTypes = {
    classExtras: PropTypes.string,
    dateSelectorDef: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    onDateSelectorDefChanged: PropTypes.func.isRequired,
    dateFormat: PropTypes.string,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,
};
