import React from 'react';
import PropTypes from 'prop-types';
import * as DO from '../util/DateOccurrences';
import { userMsg, numberToOrdinalString, getUserMsgLocale } from '../util/UserMessages';
import { DropdownField } from './DropdownField';
import { NumberField } from './NumberField';
import { parseExactInt } from '../util/NumberUtils';
import { DateField } from './DateField';
import { FieldPrefix, FieldSuffix } from './Field';
import { getDaysOfTheWeekText, getMonthsText, getYMDDateString } from '../util/YMDDate';


export class DateOccurrenceEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onTypeChange = this.onTypeChange.bind(this);

        this.onDayOfWeekSelected = this.onDayOfWeekSelected.bind(this);
        this.onDayOfMonthSelected = this.onDayOfMonthSelected.bind(this);
        this.onDayEndOfMonthSelected = this.onDayOfMonthSelected;
        this.onDOWOffsetSelected = this.onDayOfMonthSelected;
        this.onDOWEndOffsetSelected = this.onDOWOffsetSelected;
        this.onDayOfYearChange = this.onDayOfYearChange.bind(this);
        this.onDayEndOfYearChange = this.onDayEndOfYearChange.bind(this);
        this.onDOWYearOffsetChange = this.onDOWYearOffsetChange.bind(this);
        this.onDOWEndYearOffsetChange = this.onDOWEndYearOffsetChange.bind(this);
        this.onDateSelected = this.onDateSelected.bind(this);

        this.state = {

        };
    }


    makeId(id) {
        const idBase = this.props.id || 'DateOccurrenceEditor';
        return idBase + '_' + id;
    }


    updateDefinition(changes) {
        const { onChange } = this.props;
        if (onChange) {
            onChange(changes);
        }
    }


    onTypeChange(e) {
        this.updateDefinition({
            occurrenceDefinition: {
                occurrenceType: e.target.value,
            }
        });
    }


    renderTypeSelector() {
        const occurrenceDefinitionDataItem = DO.getDateOccurrenceDefinitionDataItem(
            this.props.occurrenceDefinition);

        if (!this._occurrenceTypeItems) {
            const items = [];
            for (let name in DO.OccurrenceType) {
                items.push({
                    value: name,
                    text: userMsg('DateOccurrenceEditor-typeSelector_' + name),
                });
            }
            this._occurrenceTypeItems = items;
        }

        return <DropdownField
            id = {this.makeId('TypeSelector')}
            ariaLabel = "Type Selector"
            items = {this._occurrenceTypeItems}
            value = {occurrenceDefinitionDataItem.occurrenceType}
            onChange = {this.onTypeChange}
            fieldClassExtras = "Field-postIndent"
        />;
    }


    renderDropDownSelector({ id, items, value, onChange, prefix, suffix}) {
        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DayOfMonthSelector_' + (id || ''));

        return <DropdownField 
            key = {key}
            id = {key}
            items = {items}
            value = {value}
            onChange = {(e, value) => onChange(value)}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
        />;
    }


    renderDayOfWeekSelector(args) {
        if (!this._dayOfWeekItems) {
            const items = [];

            const daysOfTheWeek = getDaysOfTheWeekText(getUserMsgLocale());
            for (let i = 0; i < daysOfTheWeek.length; ++i) {
                items.push({
                    value: i,
                    text: daysOfTheWeek[i],
                });
            }
            this._dayOfWeekItems = items;
        }

        args = Object.assign({}, args, { items: this._dayOfWeekItems });
        return this.renderDropDownSelector(args);
    }

    renderSpecificMonthSelector(args) {
        if (!this._monthItems) {
            const items = [];

            const months = getMonthsText(getUserMsgLocale());
            for (let i = 0; i < months.length; ++i) {
                items.push({
                    value: i,
                    text: months[i],
                });
            }
            this._monthItems = items;
        }

        args = Object.assign({}, args, { items: this._monthItems });
        return this.renderDropDownSelector(args);
    }

    onDayOfWeekSelected(value) {
        this.updateDefinition({
            occurrenceDefinition: {
                dayOfWeek: value,
            }
        });
    }

    renderDAY_OF_WEEK(occurrenceDefinition) {
        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg('DateOccurrenceEditor-DAY_OF_WEEK_dayOfWeekSelector_prefix'),
            suffix: userMsg('DateOccurrenceEditor-DAY_OF_WEEK_dayOfWeekSelector_suffix'),
        });

        return dayOfWeekSelector;
    }


    renderDayOfMonthSelector(args) {
        if (!this._dayOfMonthItems) {
            const items = [];
            for (let i = 0; i < 31; ++i) {
                items.push({
                    value: i,
                    text: numberToOrdinalString(i + 1),
                });
            }
            this._dayOfMonthItems = items;
        }

        args = Object.assign({}, args, { items: this._dayOfMonthItems });
        return this.renderDropDownSelector(args);
    }


    onDayOfMonthSelected(value) {
        this.updateDefinition({
            occurrenceDefinition: {
                offset: value,
            }
        });
    }

    renderDAY_OF_MONTH(occurrenceDefinition) {
        const dayOfMonthSelector = this.renderDayOfMonthSelector({
            id: 'dayOfMonth',
            value: occurrenceDefinition.offset,
            onChange: this.onDayOfMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_OF_MONTH_dayOfMonthSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_OF_MONTH_dayOfMonthSelector_suffix'),
        });

        return dayOfMonthSelector;
    }


    renderDayEndOfMonthSelector(args) {
        if (!this._dayEndOfMonthItems) {
            const items = [];
            items.push({
                value: 0,
                text: userMsg('DateOccurrenceEditor-dayEndOfMonthSelector_last')
            });

            for (let i = 1; i < 31; ++i) {
                items.push({
                    value: i,
                    text: userMsg('DateOccurrenceEditor-dayEndOfMonthSelector_fromLast',
                        numberToOrdinalString(i + 1)),
                });
            }
            this._dayEndOfMonthItems = items;
        }

        args = Object.assign({}, args, { items: this._dayEndOfMonthItems });
        return this.renderDropDownSelector(args);
    }


    renderDAY_END_OF_MONTH(occurrenceDefinition) {
        const dayEndOfMonthSelector = this.renderDayEndOfMonthSelector({
            id: 'dayEndOfMonth',
            value: occurrenceDefinition.offset,
            onChange: this.onDayEndOfMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_END_OF_MONTH_dayEndOfMonthSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_END_OF_MONTH_dayEndOfMonthSelector_suffix'),
        });

        return dayEndOfMonthSelector;
    }


    renderDOWOffsetSelector(args) {
        if (!this._dowOffsetItems) {
            const items = [];
            for (let i = 0; i < 4; ++i) {
                items.push({
                    value: i,
                    text: numberToOrdinalString(i + 1),
                });
            }
            this._dowOffsetItems = items;
        }

        args = Object.assign({}, args, { items: this._dowOffsetItems });
        if (args.value >= this._dowOffsetItems.length) {
            args.value = 0;
        }

        return this.renderDropDownSelector(args);
    }

    renderDOW_OF_MONTH(occurrenceDefinition) {
        const dowOffsetSelector = this.renderDOWOffsetSelector({
            id: 'dowOffset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWOffsetSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_MONTH_dowOffsetSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_MONTH_dowOffsetSelector_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_MONTH_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_MONTH_dayOfWeekSelector_suffix'),
        });

        return [dowOffsetSelector, dayOfWeekSelector];
    }


    renderDOWEndOffsetSelector(args) {
        if (!this._dowEndOffsetItems) {
            const items = [];
            items.push({
                value: 0,
                text: userMsg('DateOccurrenceEditor-dowEndOffsetSelector_last'),
            });
            for (let i = 1; i < 4; ++i) {
                items.push({
                    value: i,
                    text: userMsg('DateOccurrenceEditor-dowEndOffsetSelector_fromLast',
                        numberToOrdinalString(i + 1)),
                });
            }
            this._dowEndOffsetItems = items;
        }

        args = Object.assign({}, args, { items: this._dowEndOffsetItems });
        if (args.value >= this._dowEndOffsetItems.length) {
            args.value = 0;
        }

        return this.renderDropDownSelector(args);
    }


    renderDOW_END_OF_MONTH(occurrenceDefinition) {
        const dowEndOffsetSelector = this.renderDOWEndOffsetSelector({
            id: 'dowEndOffset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWEndOffsetSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_MONTH_dowEndOffsetSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_MONTH_dowEndOffsetSelector_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_MONTH_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_MONTH_dayOfWeekSelector_suffix'),
        });

        return [dowEndOffsetSelector, dayOfWeekSelector];
    }


    onSpecificMonthSelected(value) {
        this.updateDefinition({
            occurrenceDefinition: {
                month: value,
            }
        });
    }

    renderDAY_OF_SPECIFIC_MONTH(occurrenceDefinition) {
        const dayOfMonthSelector = this.renderDayOfMonthSelector({
            id: 'dayOfMonth',
            value: occurrenceDefinition.offset,
            onChange: this.onDayOfMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_OF_SPECIFIC_MONTH_dayOfMonthSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_OF_SPECIFIC_MONTH_dayOfMonthSelector_suffix'),
        });

        const specificMonthSelector = this.renderSpecificMonthSelector({
            id: 'specificMonth',
            value: occurrenceDefinition.month,
            onChange: this.onSpecificMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_OF_SPECIFIC_MONTH_specificMonthSelector_prefix'
            ),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_OF_SPECIFIC_MONTH_specificMonthSelector_suffix'
            ),
        });

        return [ specificMonthSelector, dayOfMonthSelector, ];
    }

    renderDAY_END_OF_SPECIFIC_MONTH(occurrenceDefinition) {
        const dayEndOfMonthSelector = this.renderDayEndOfMonthSelector({
            id: 'dayEndOfMonth',
            value: occurrenceDefinition.offset,
            onChange: this.onDayOfMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-'
                + 'DAY_END_OF_SPECIFIC_MONTH_dayEndOfMonthSelector_prefix'
            ),
            suffix: userMsg(
                'DateOccurrenceEditor-'
                + 'DAY_END_OF_SPECIFIC_MONTH_dayEndOfMonthSelector_suffix'
            ),
        });

        const specificMonthSelector = this.renderSpecificMonthSelector({
            id: 'specificMonth',
            value: occurrenceDefinition.month,
            onChange: this.onSpecificMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-'
                + 'DAY_END_OF_SPECIFIC_MONTH_specificMonthSelector_prefix'
            ),
            suffix: userMsg(
                'DateOccurrenceEditor-'
                + 'DAY_END_OF_SPECIFIC_MONTH_specificMonthSelector_suffix'
            ),
        });

        return [ dayEndOfMonthSelector, specificMonthSelector, ];
    }

    renderDOW_OF_SPECIFIC_MONTH(occurrenceDefinition) {
        const dowOffsetSelector = this.renderDOWOffsetSelector({
            id: 'dowOffset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWOffsetSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_dowOffsetSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_dowOffsetSelector_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_dayOfWeekSelector_suffix'),
        });

        const specificMonthSelector = this.renderSpecificMonthSelector({
            id: 'specificMonth',
            value: occurrenceDefinition.month,
            onChange: this.onSpecificMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_specificMonthSelector_prefix'
            ),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_SPECIFIC_MONTH_specificMonthSelector_suffix'
            ),
        });

        return [ dowOffsetSelector, dayOfWeekSelector, specificMonthSelector, ];
    }

    renderDOW_END_OF_SPECIFIC_MONTH(occurrenceDefinition) {
        const dowEndOffsetSelector = this.renderDOWEndOffsetSelector({
            id: 'dowOffset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWEndOffsetSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_dowOffsetSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_dowOffsetSelector_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_dayOfWeekSelector_suffix'),
        });

        const specificMonthSelector = this.renderSpecificMonthSelector({
            id: 'specificMonth',
            value: occurrenceDefinition.month,
            onChange: this.onSpecificMonthSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_specificMonthSelector_prefix'
            ),
            suffix: userMsg(
                'DateOccurrenceEditor-'
                + 'DOW_END_OF_SPECIFIC_MONTH_specificMonthSelector_suffix'
            ),
        });

        return [ dowEndOffsetSelector, dayOfWeekSelector, specificMonthSelector, ];
    }


    renderDayOfYearEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DayOfYearEditor_' + (id || ''));

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue - 1;
            }
        }

        if ((typeof value !== 'number')
         || (value < 0) || (value >= 366)) {
            errorMsg = userMsg('DateOccurrenceEditor-DayOfYearEditor_dayOfYear_invalid');
        }
        if (typeof value === 'number') {
            ++value;
        }

        return <NumberField 
            key = {key}
            id = {key}
            ariaLabel = {ariaLabel}
            value = {value}
            errorMsg = {errorMsg}
            onChange = {onChange}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
            inputClassExtras = "DateOccurrenceEditor-DayOfYearEditor"
        />;
    }

    onDayOfYearChange(e, value) {
        if (!isNaN(value)) {
            --value;
        }
        else {
            value = e.target.value;
        }

        this.updateDefinition({
            occurrenceDefinition: {
                offset: value,
            }
        });
    }

    renderDAY_OF_YEAR(occurrenceDefinition) {
        const dayOfYearEditor = this.renderDayOfYearEditor({
            id: 'dayOfYear',
            ariaLabel: 'Day offset',
            value: occurrenceDefinition.offset,
            onChange: this.onDayOfYearChange,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_OF_YEAR_dayOfYearEditor_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_OF_YEAR_dayOfYearEditor_suffix'),
        });

        return [dayOfYearEditor];
    }


    renderDayEndOfYearEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DayEndOfYearEditor_' + (id || ''));

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue;
            }
        }

        if ((typeof value !== 'number')
         || (value < 0) || (value >= 366)) {
            errorMsg = userMsg(
                'DateOccurrenceEditor-DayEndOfYearEditor_dayOfYear_invalid');
        }

        return <NumberField 
            key = {key}
            id = {key}
            ariaLabel = {ariaLabel}
            value = {value}
            errorMsg = {errorMsg}
            onChange = {onChange}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
            inputClassExtras = "DateOccurrenceEditor-DayEndOfYearEditor"
        />;
    }

    onDayEndOfYearChange(e, value) {
        if (isNaN(value)) {
            value = e.target.value;
        }

        this.updateDefinition({
            occurrenceDefinition: {
                offset: value,
            }
        });
    }

    renderDAY_END_OF_YEAR(occurrenceDefinition) {
        const dayEndOfYearEditor = this.renderDayEndOfYearEditor({
            id: 'dayEndOfYear',
            ariaLabel: 'Day offset',
            value: occurrenceDefinition.offset,
            onChange: this.onDayEndOfYearChange,
            prefix: userMsg(
                'DateOccurrenceEditor-DAY_END_OF_YEAR_dayOfYearEditor_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DAY_END_OF_YEAR_dayOfYearEditor_suffix'),
        });

        return [dayEndOfYearEditor];
    }


    renderDOWYearOffsetEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DOWYearOffsetEditor_' + (id || ''));

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue - 1;
            }
        }

        if ((typeof value !== 'number')
         || (value < 0) || (value >= 52)) {
            errorMsg = userMsg(
                'DateOccurrenceEditor-DOWYearOffsetEditor_dowYearOffset_invalid');
        }
        if (typeof value === 'number') {
            ++value;
        }

        return <NumberField 
            key = {key}
            id = {key}
            ariaLabel = {ariaLabel}
            value = {value}
            errorMsg = {errorMsg}
            onChange = {onChange}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
            inputClassExtras = "DateOccurrenceEditor-DOWYearOffsetEditor"
        />;
    }

    onDOWYearOffsetChange(e, value) {
        if (!isNaN(value)) {
            --value;
        }
        else {
            value = e.target.value;
        }

        this.updateDefinition({
            occurrenceDefinition: {
                offset: value,
            }
        });
    }

    renderDOW_OF_YEAR(occurrenceDefinition) {
        const dowYearOffsetEditor = this.renderDOWYearOffsetEditor({
            id: 'dowYearOffset',
            ariaLabel: 'Day of week offset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWYearOffsetChange,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_YEAR_dowYearOffsetEditor_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_YEAR_dowYearOffsetEditor_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_OF_YEAR_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_OF_YEAR_dayOfWeekSelector_suffix'),
        });

        return [dowYearOffsetEditor, dayOfWeekSelector, ];
    }


    renderDOWEndYearOffsetEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DOWEndYearOffsetEditor_' + (id || ''));

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue;
            }
        }

        if ((typeof value !== 'number')
         || (value < 0) || (value >= 52)) {
            errorMsg = userMsg(
                'DateOccurrenceEditor-DOWEndYearOffsetEditor_dowEndYearOffset_invalid');
        }

        return <NumberField 
            key = {key}
            id = {key}
            ariaLabel = {ariaLabel}
            value = {value}
            errorMsg = {errorMsg}
            onChange = {onChange}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
            inputClassExtras = "DateOccurrenceEditor-DOWEndYearOffsetEditor"
        />;
    }

    onDOWEndYearOffsetChange(e, value) {
        if (isNaN(value)) {
            value = e.target.value;
        }

        this.updateDefinition({
            occurrenceDefinition: {
                offset: value,
            }
        });
    }

    renderDOW_END_OF_YEAR(occurrenceDefinition) {
        const dowEndYearOffsetEditor = this.renderDOWEndYearOffsetEditor({
            id: 'dowEndYearOffset',
            ariaLabel: 'Day of week offset',
            value: occurrenceDefinition.offset,
            onChange: this.onDOWEndYearOffsetChange,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_YEAR_dowEndYearOffsetEditor_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_YEAR_dowEndYearOffsetEditor_suffix'),
        });

        const dayOfWeekSelector = this.renderDayOfWeekSelector({
            id: 'dayOfWeek',
            value: occurrenceDefinition.dayOfWeek,
            onChange: this.onDayOfWeekSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_YEAR_dayOfWeekSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-DOW_END_OF_YEAR_dayOfWeekSelector_suffix'),
        });

        return [dowEndYearOffsetEditor, dayOfWeekSelector, ];
    }


    renderDateSelector({id, value, onChange, prefix, suffix}) {
        value = getYMDDateString(value);

        let prependComponent;
        if (prefix) {
            prependComponent = <FieldPrefix>{prefix}</FieldPrefix>;
        }
        
        let appendComponent;
        if (suffix) {
            appendComponent = <FieldSuffix>{suffix}</FieldSuffix>;
        }

        const key = this.makeId('DateSelector_' + (id || ''));

        return <DateField 
            key = {key}
            id = {key}
            value = {value}
            onChange = {onChange}
            inputClassExtras = "DateOccurrenceEditor-DateSelector"
            tabIndex = {0}
            prependComponent = {prependComponent}
            appendComponent = {appendComponent}
        />;
    }

    onDateSelected(ymdDate) {
        this.updateDefinition({
            occurrenceDefinition: {
                startYMDDate: ymdDate,
            }
        });
    }

    renderON_DATE(occurrenceDefinition) {
        const dateSelector = this.renderDateSelector({
            id: 'date',
            value: occurrenceDefinition.startYMDDate,
            onChange: this.onDateSelected,
            prefix: userMsg(
                'DateOccurrenceEditor-ON_DATE_dateSelector_prefix'),
            suffix: userMsg(
                'DateOccurrenceEditor-ON_DATE_dateSelector_suffix'),
        });

        return dateSelector;
    }


    render() {
        const occurrenceDefinition = DO.getDateOccurrenceDefinition(
            this.props.occurrenceDefinition);

        const typeSelector = this.renderTypeSelector();
        
        const { occurrenceType } = occurrenceDefinition;
        let fields = [];

        switch (occurrenceType) {
        case DO.OccurrenceType.DAY_OF_WEEK:
            fields = this.renderDAY_OF_WEEK(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_OF_MONTH:
            fields = this.renderDAY_OF_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_END_OF_MONTH:
            fields = this.renderDAY_END_OF_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_OF_MONTH:
            fields = this.renderDOW_OF_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_END_OF_MONTH:
            fields = this.renderDOW_END_OF_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_OF_SPECIFIC_MONTH:
            fields = this.renderDAY_OF_SPECIFIC_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_END_OF_SPECIFIC_MONTH:
            fields = this.renderDAY_END_OF_SPECIFIC_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_OF_SPECIFIC_MONTH:
            fields = this.renderDOW_OF_SPECIFIC_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_END_OF_SPECIFIC_MONTH:
            fields = this.renderDOW_END_OF_SPECIFIC_MONTH(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_OF_YEAR:
            fields = this.renderDAY_OF_YEAR(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DAY_END_OF_YEAR:
            fields = this.renderDAY_END_OF_YEAR(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_OF_YEAR:
            fields = this.renderDOW_OF_YEAR(occurrenceDefinition);
            break;

        case DO.OccurrenceType.DOW_END_OF_YEAR:
            fields = this.renderDOW_END_OF_YEAR(occurrenceDefinition);
            break;

        case DO.OccurrenceType.ON_DATE:
            fields = this.renderON_DATE(occurrenceDefinition);
            break;
        }

        return <div className = "FieldContainer-inline">
            {typeSelector}
            {fields}
        </div>;
    }
}

DateOccurrenceEditor.propTypes = {
    id: PropTypes.string,
    occurrenceDefinition: PropTypes.object.isRequired,
    lastOccurrenceState: PropTypes.object,
    onChange: PropTypes.func.isRequired,
};