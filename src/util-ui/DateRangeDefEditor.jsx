import React from 'react';
import PropTypes from 'prop-types';
import { userMsg } from '../util/UserMessages';
import { getDateRangeDefDataItem, getRangeType, getStandardRangeType, 
    StandardRangeType } from '../util/DateRangeDef';
import { DropdownSelector } from '../util-ui/DropdownSelector';
import { CellDateEditor } from '../util-ui/CellDateEditor';
import { Row, Col } from '../util-ui/RowCols';


/**
 * React component for editing a {@link DateRangeDef~RangeDefDataItem}
 * This only supports the {@link DateRangeDef#StandardRangeType}s.
 */
export class DateRangeDefEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onRangeTypeChange = this.onRangeTypeChange.bind(this);
        this.onFirstYMDDateChange = this.onFirstYMDDateChange.bind(this);
        this.onLastYMDDateChange = this.onLastYMDDateChange.bind(this);

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
        for (const type of Object.values(StandardRangeType)) {
            const { relationType } = type;
            if (!relationType) {
                continue;
            }

            if ((excludeFuture && relationType.isFuture)
             || (excludePast && relationType.isPath)) {
                continue;
            }
            this._items.push({
                value: type.name,
                text: userMsg('DateRangeDefEditor-type_' + type.name),
            });
        }
    }


    applyChange(change) {
        const dateRangeDef = Object.assign({}, this.props.dateRangeDef, change);
        this.props.onDateRangeDefChanged(
            getDateRangeDefDataItem(dateRangeDef)
        );
    }


    onRangeTypeChange(e) {
        const rangeType = getRangeType(e.target.value);
        if (rangeType) {
            this.applyChange({
                rangeType: rangeType,
            });
        }
    }


    onFirstYMDDateChange(ymdDate) {
        this.applyChange({
            firstYMDDate: ymdDate,
        });
    }


    onLastYMDDateChange(ymdDate) {
        this.applyChange({
            lastYMDDate: ymdDate,
        });
    }


    render() {
        const { dateRangeDef, classExtras } = this.props;

        let rangeType;
        let firstYMDDate;
        let lastYMDDate;
        if (dateRangeDef) {
            rangeType = getStandardRangeType(dateRangeDef.rangeType);
            firstYMDDate = dateRangeDef.firstYMDDate;
            lastYMDDate = dateRangeDef.lastYMDDate;
        }

        let rangeTypeName;
        if (rangeType) {
            rangeTypeName = rangeType.name;
        }

        const typeComponent = <DropdownSelector
            fieldClassExtras = "DateRangeDefEditor-rangeType"
            items = {this._items}
            value = {rangeTypeName || StandardRangeType.ALL.name}
            onChange = {this.onRangeTypeChange}
        />;


        let firstYMDDateEditor;
        let lastYMDDateEditor;
        if (rangeType) {
            if (rangeType.hasFirstYMDDate) {
                firstYMDDateEditor = <CellDateEditor
                    inputClassExtras = "DateRangeDefEditor-customDate"
                    ariaLabel = "First Custom Date"
                    value = {firstYMDDate}
                    onChange = {this.onFirstYMDDateChange}
                    onDateFormat = {this.props.dateFormat}
                />;
            }
            if (rangeType.hasLastYMDDate) {
                lastYMDDateEditor = <CellDateEditor
                    inputClassExtras = "DateRangeDefEditor-customDate"
                    ariaLabel = "Last Custom Date"
                    value = {lastYMDDate}
                    onChange = {this.onLastYMDDateChange}
                    onDateFormat = {this.props.dateFormat}
                />;
            }

            // So we don't have an empty column if firstYMDDateEditor is undefined.
            if (!firstYMDDateEditor) {
                firstYMDDateEditor = lastYMDDateEditor;
                lastYMDDateEditor = undefined;
            }
        }


        let className = 'No-gutters DateSelectorDefEditor';
        if (classExtras) {
            className += ' ' + classExtras;
        }

        return <Row classExtras = {className}>
            <Col classExtras = "Col-auto">
                {typeComponent}
            </Col>
            <Col>
                {firstYMDDateEditor}
            </Col>
            <Col>
                {lastYMDDateEditor}
            </Col>
        </Row>;
    }
}

/**
 * @callback DateRangeDefEditor~onDateRangeDefChangedCallback
 * @param {DateRangeDef~RangeDefDataItem} rangeDefDataItem
 */

/**
 * @typedef {object} DateRangeDefEditor~propTypes
 * @property {string} [classExtras]
 * @property {DateRangeDef~RangeDefDataItem|DateRangeDef~RangeDef} [dateRangeDef]
 * @property {DateRangeDefEditor~onDateRangeDefChangedCallback}
 *  onDateRangeDefChanged Required callback for receiving changes.
 * @property {string} [dateFormat] Date format string compatible with 
 * {@link https://date-fns.org/v2.0.0-alpha.18/docs/I18n}
 * @property {boolean} [excludeFuture=false]
 * @property {boolean} [excludePast=false]
 */
DateRangeDefEditor.propTypes = {
    classExtras: PropTypes.string,
    dateRangeDef: PropTypes.object,
    onDateRangeDefChanged: PropTypes.func.isRequired,
    dateFormat: PropTypes.string,
    excludeFuture: PropTypes.bool,
    excludePast: PropTypes.bool,
};
