import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import * as DO from '../util/DateOccurrences';
import { userMsg, numberToOrdinalString, getUserMsgLocale } from '../util/UserMessages';
import { DropdownField } from './DropdownField';
import { NumberField } from './NumberField';
import { parseExactInt } from '../util/NumberUtils';
import { DateField } from './DateField';
import { CheckboxField } from './CheckboxField';
import { getDaysOfTheWeekText, getMonthsText, getYMDDateString, YMDDate, } 
    from '../util/YMDDate';

function addEditorsToFields(fields, editors) {
    if (editors) {
        if (Array.isArray(editors)) {
            editors.forEach((editor) => {
                if (editor) { fields.push(editor); }
            });
        }
        else {
            fields.push(editors);
        }
    }
    return fields;
}



/**
 * React component for editing {@link OccurrenceRepeatDefinition}
 */
export class OccurrenceRepeatDefinitionEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onTypeChange = this.onTypeChange.bind(this);
        this.onPeriodChange = this.onPeriodChange.bind(this);

        this.onFinalDateCheckboxChange = this.onFinalDateCheckboxChange.bind(this);
        this.onFinalDateSelected = this.onFinalDateSelected.bind(this);

        this.onMaxRepeatsCheckboxChange = this.onMaxRepeatsCheckboxChange.bind(this);
        this.onMaxRepeatsChange = this.onMaxRepeatsChange.bind(this);

        const { repeatDefinition } = this.props;
        const { finalYMDDate, maxRepeats } = repeatDefinition;

        this.state = {
            editedFinalYMDDate: 
                getYMDDateString(finalYMDDate || new YMDDate().addYears(1)),
            editedMaxRepeats: maxRepeats || '1',
        };
    }

    componentDidMount() {
        this.updateLimits();
    }

    componentDidUpdate(prevProps, prevState) {
        const { repeatDefinition } = this.props;
        const prevRepeatDefinition = prevProps.repeatDefinition;
        if ((repeatDefinition.finalYMDDate !== prevRepeatDefinition.finalYMDDate)
         || (repeatDefinition.maxRepeats !== prevRepeatDefinition.maxRepeats)) {
            this.updateLimits();
        }
    }

    updateLimits() {
        const { repeatDefinition } = this.props;
        const { finalYMDDate, maxRepeats } 
            = DO.getOccurrenceRepeatDefinition(repeatDefinition);

        this.setState({
            isFinalYMDDate: (finalYMDDate !== undefined),
            isMaxRepeats: (maxRepeats !== undefined),
        });
    }


    makeId(id) {
        const idBase = this.props.id || 'OccurrenceRepeatDefinitionEditor';
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
            repeatType: e.target.value,
        });
    }

    renderTypeSelector(repeatDefinitionDataItem) {
        let { allowedRepeatTypeNames } = this.props;
        if (!allowedRepeatTypeNames) {
            allowedRepeatTypeNames = [];
            for (let typeName in DO.OccurrenceRepeatType) {
                allowedRepeatTypeNames.push(typeName);
            }
        }

        const items = [];
        for (let type of allowedRepeatTypeNames) {
            const typeName = DO.getOccurrenceRepeatTypeString(type);
            items.push({
                value: typeName,
                text: userMsg('OccurrenceRepeatDefinitionEditor-typeSelector_' 
                    + typeName),
            });
        }
        if (!items || !items.length
         || ((items.length === 1)
          && (items[0].value === DO.OccurrenceRepeatType.NO_REPEAT.name))) {
            return;
        }

        return <DropdownField
            id = {this.makeId('TypeSelector')}
            ariaLabel = "Type Selector"
            items = {items}
            value = {repeatDefinitionDataItem.repeatType}
            onChange = {this.onTypeChange}
            fieldClassExtras = "Field-postSpace"
        />;
    }


    onPeriodChange(e, value) {
        if (isNaN(value)) {
            value = e.target.value;
        }
        this.updateDefinition({
            period: value,
        });
    }

    renderPeriodEditor({ id, value, prefix, suffix, }) {
        const key = this.makeId('PeriodEditor_' + (id || ''));

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue;
            }
        }

        if ((typeof value !== 'number')
         || (value <= 0)) {
            errorMsg = userMsg('OccurrenceRepeatEditor-periodEditor_period_invalid');
        }

        return <NumberField 
            key = {key}
            id = {key}
            ariaLabel = "Period"
            value = {value}
            errorMsg = {errorMsg}
            onChange = {this.onPeriodChange}
            prependComponent = {prefix}
            appendComponent = {suffix}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
        />;
    }


    onFinalDateCheckboxChange(isCheck) {
        this.setState({
            isFinalYMDDate: isCheck,
        });
        this.updateDefinition({
            finalYMDDate: (isCheck) ? this.state.editedFinalYMDDate : undefined,
        });
    }

    onFinalDateSelected(ymdDate) {
        this.setState({
            editedFinalYMDDate: ymdDate,
            isFinalYMDDate: true,
        });
        this.updateDefinition({
            finalYMDDate: ymdDate,
        });
    }

    renderFinalDateEditor(repeatDefinitionDataItem) {
        const checkboxId = this.makeId('FinalDateCheckbox');
        const dateCheckbox = <CheckboxField 
            key = {checkboxId}
            id = {checkboxId}
            ariaLabel = "Final Date Checkbox"
            value = {this.state.isFinalYMDDate}
            checkboxText = {
                userMsg('OccurrenceRepeatDefinitionEditor-finalDateEditorCheckbox_text')}
            fieldClassExtras = "Field-indent"
            onChange = {this.onFinalDateCheckboxChange}
        />;

        const selectorId = this.makeId('FinalDateSelector');
        const dateSelector = <DateField 
            key = {selectorId}
            id = {selectorId}
            value = {this.state.editedFinalYMDDate}
            onChange = {this.onFinalDateSelected}
            inputClassExtras = "OccurrenceRepeatDefinitionEditor-FinalDateSelector"
            tabIndex = {0}
        />;

        return [
            dateCheckbox,
            dateSelector,
        ];
    }



    onMaxRepeatsCheckboxChange(isCheck) {
        this.setState({
            isMaxRepeats: isCheck,
        });
        this.updateDefinition({
            maxRepeats: (isCheck) ? this.state.editedMaxRepeats : undefined,
        });
    }

    onMaxRepeatsChange(e, value) {
        if (isNaN(value)) {
            value = e.target.value;
        }

        this.setState({
            editedMaxRepeats: value,
            isMaxRepeats: true,
        });
        this.updateDefinition({
            maxRepeats: value,
        });
    }

    renderMaxRepeatsEditor(repeatDefinitionDataItem) {
        const checkboxId = this.makeId('MaxRepeatsCheckbox');
        const checkbox = <CheckboxField 
            key = {checkboxId}
            id = {checkboxId}
            ariaLabel = "Max Repeats Checkbox"
            value = {this.state.isMaxRepeats}
            checkboxText = {
                userMsg('OccurrenceRepeatDefinitionEditor-maxRepeatsEditorCheckbox_text')}
            fieldClassExtras = "Field-indent"
            onChange = {this.onMaxRepeatsCheckboxChange}
        />;


        const countId = this.makeId('MaxRepeatsEditor');
        let value = this.state.editedMaxRepeats;

        let errorMsg;
        if (typeof value === 'string') {
            const numericValue = parseExactInt(value);
            if (!isNaN(numericValue)) {
                value = numericValue;
            }
        }

        if ((typeof value !== 'number')
         || (value <= 0)) {
            errorMsg = userMsg('OccurrenceRepeatEditor-maxRepeatsEditor_count_invalid');
        }

        const countEditor = <NumberField 
            key = {countId}
            id = {countId}
            ariaLabel = "Max Repeat Count"
            value = {value}
            errorMsg = {errorMsg}
            onChange = {this.onMaxRepeatsChange}
            prependComponent = {userMsg(
                'OccurrenceRepeatDefinitionEditor-maxRepeatsEditor_prefix')}
            appendComponent = {userMsg(
                'OccurrenceRepeatDefinitionEditor-maxRepeatsEditor_suffix')}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
        />;

        return [
            checkbox,
            countEditor,
        ];
    }


    renderLimitEditors(repeatDefinitionDataItem) {
        const editors = [];
        const finalDateEditor = this.renderFinalDateEditor(repeatDefinitionDataItem);
        addEditorsToFields(editors, finalDateEditor);

        const maxRepeatsEditor = this.renderMaxRepeatsEditor(repeatDefinitionDataItem);
        addEditorsToFields(editors, maxRepeatsEditor);

        return editors;
    }


    addLimitEditors(fields, repeatDefinitionDataItem) {
        const limitEditors = this.renderLimitEditors(repeatDefinitionDataItem);
        fields = addEditorsToFields(fields, limitEditors);

        return fields;
    }

    renderDAILY(repeatDefinitionDataItem) {
        const periodEditor = this.renderPeriodEditor({
            id: 'DAILY',
            value: repeatDefinitionDataItem.period,
            prefix: userMsg(
                'OccurrenceRepeatDefinitionEditor-DAILY_periodEditor_prefix'),
            suffix: userMsg(
                'OccurrenceRepeatDefinitionEditor-DAILY_periodEditor_suffix'),
        });

        return this.addLimitEditors([periodEditor], repeatDefinitionDataItem);
    }

    renderWEEKLY(repeatDefinitionDataItem) {
        const periodEditor = this.renderPeriodEditor({
            id: 'WEEKLY',
            value: repeatDefinitionDataItem.period,
            prefix: userMsg(
                'OccurrenceRepeatDefinitionEditor-WEEKLY_periodEditor_prefix'),
            suffix: userMsg(
                'OccurrenceRepeatDefinitionEditor-WEEKLY_periodEditor_suffix'),
        });

        return this.addLimitEditors([periodEditor], repeatDefinitionDataItem);
    }

    renderMONTHLY(repeatDefinitionDataItem) {
        const periodEditor = this.renderPeriodEditor({
            id: 'MONTHLY',
            value: repeatDefinitionDataItem.period,
            prefix: userMsg(
                'OccurrenceRepeatDefinitionEditor-MONTHLY_periodEditor_prefix'),
            suffix: userMsg(
                'OccurrenceRepeatDefinitionEditor-MONTHLY_periodEditor_suffix'),
        });

        return this.addLimitEditors([periodEditor], repeatDefinitionDataItem);
    }

    renderYEARLY(repeatDefinitionDataItem) {
        const periodEditor = this.renderPeriodEditor({
            id: 'YEARLY',
            value: repeatDefinitionDataItem.period,
            prefix: userMsg(
                'OccurrenceRepeatDefinitionEditor-YEARLY_periodEditor_prefix'),
            suffix: userMsg(
                'OccurrenceRepeatDefinitionEditor-YEARLY_periodEditor_suffix'),
        });

        return this.addLimitEditors([periodEditor], repeatDefinitionDataItem);
    }


    render() {
        const repeatDefinitionDataItem = DO.getOccurrenceRepeatDefinitionDataItem(
            this.props.repeatDefinition);

        const typeSelector = this.renderTypeSelector(repeatDefinitionDataItem);
        if (!typeSelector) {
            return null;
        }

        let fields = [];
        switch (repeatDefinitionDataItem.repeatType) {
        case DO.OccurrenceRepeatType.NO_REPEAT.name :
            break;

        case DO.OccurrenceRepeatType.DAILY.name :
            fields = this.renderDAILY(repeatDefinitionDataItem);
            break;

        case DO.OccurrenceRepeatType.WEEKLY.name :
            fields = this.renderWEEKLY(repeatDefinitionDataItem);
            break;

        case DO.OccurrenceRepeatType.MONTHLY.name :
            fields = this.renderMONTHLY(repeatDefinitionDataItem);
            break;

        case DO.OccurrenceRepeatType.YEARLY.name :
            fields = this.renderYEARLY(repeatDefinitionDataItem);
            break;
        }

        return <div className = "FieldContainer-inline">
            {typeSelector}
            {fields}
        </div>;
    }
}

OccurrenceRepeatDefinitionEditor.propTypes = {
    id: PropTypes.string,
    repeatDefinition: PropTypes.object.isRequired,
    allowedRepeatTypeNames: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object,
        ])),
    onChange: PropTypes.func.isRequired,
};


/**
 * React component for editing a {@link DateOccurrenceDefinition}
 */
export class DateOccurrenceEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onTypeChange = this.onTypeChange.bind(this);

        this.onStartDateCheckboxChange = this.onStartDateCheckboxChange.bind(this);
        this.onStartDateSelected = this.onStartDateSelected.bind(this);

        this.onDayOfWeekSelected = this.onDayOfWeekSelected.bind(this);
        this.onDayOfMonthSelected = this.onDayOfMonthSelected.bind(this);
        this.onDayEndOfMonthSelected = this.onDayOfMonthSelected;
        this.onDOWOffsetSelected = this.onDayOfMonthSelected;
        this.onDOWEndOffsetSelected = this.onDOWOffsetSelected;
        this.onSpecificMonthSelected = this.onSpecificMonthSelected.bind(this);
        this.onDayOfYearChange = this.onDayOfYearChange.bind(this);
        this.onDayEndOfYearChange = this.onDayEndOfYearChange.bind(this);
        this.onDOWYearOffsetChange = this.onDOWYearOffsetChange.bind(this);
        this.onDOWEndYearOffsetChange = this.onDOWEndYearOffsetChange.bind(this);
        this.onDateSelected = this.onDateSelected.bind(this);

        this.onRepeatDefinitionChange = this.onRepeatDefinitionChange.bind(this);

        this.state = {
        };

        const occurrenceDefinitionDataItem = DO.getDateOccurrenceDefinitionDataItem(
            this.props.occurrenceDefinition);
        if (occurrenceDefinitionDataItem.occurrenceType
         !== DO.OccurrenceType.ON_DATE.name) {
            this.state.isStartYMDDate = occurrenceDefinitionDataItem.startYMDDate;
            this.state.editedStartYMDDate = occurrenceDefinitionDataItem.startYMDDate;
        }
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
        const key = this.makeId('DayOfMonthSelector_' + (id || ''));

        return <DropdownField 
            key = {key}
            id = {key}
            items = {items}
            value = {value}
            onChange = {(e, value) => onChange(value)}
            prependComponent = {prefix}
            appendComponent = {suffix}
        />;
    }


    onStartDateCheckboxChange(isCheck) {
        this.setState({
            isStartYMDDate: isCheck,
        });
        this.updateDefinition({
            occurrenceDefinition: {
                startYMDDate: (isCheck) ? this.state.editedStartYMDDate : undefined,
            },
        });
    }

    onStartDateSelected(ymdDate) {
        this.setState({
            editedStartYMDDate: ymdDate,
            isStartYMDDate: true,
        });
        this.updateDefinition({
            occurrenceDefinition: {
                startYMDDate: ymdDate,
            },
        });
    }

    renderStartDateEditor(occurrenceDefinition) {
        const checkboxId = this.makeId('StartDateCheckbox');
        const dateCheckbox = <CheckboxField 
            key = {checkboxId}
            id = {checkboxId}
            ariaLabel = "Start Date Checkbox"
            value = {this.state.isStartYMDDate}
            checkboxText = {
                userMsg('DateOccurrenceEditor-startDateEditorCheckbox_text')}
            fieldClassExtras = "Field-indent"
            onChange = {this.onStartDateCheckboxChange}
        />;

        const selectorId = this.makeId('StartDateSelector');
        const dateSelector = <DateField 
            key = {selectorId}
            id = {selectorId}
            value = {this.state.editedStartYMDDate}
            onChange = {this.onStartDateSelected}
            inputClassExtras = "DateOccurrenceEditor-StartDateSelector"
            tabIndex = {0}
        />;

        return [
            dateCheckbox,
            dateSelector,
        ];
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

        const editors = [ dayOfWeekSelector ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ dayOfMonthSelector ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ dayEndOfMonthSelector ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [dowOffsetSelector, dayOfWeekSelector];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [dowEndOffsetSelector, dayOfWeekSelector];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ specificMonthSelector, dayOfMonthSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ dayEndOfMonthSelector, specificMonthSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ dowOffsetSelector, dayOfWeekSelector, specificMonthSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
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

        const editors = [ dowEndOffsetSelector, dayOfWeekSelector, 
            specificMonthSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
    }


    renderDayOfYearEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
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
            prependComponent = {prefix}
            appendComponent = {suffix}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
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

        const editors = [ dayOfYearEditor ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
    }


    renderDayEndOfYearEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
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
            prependComponent = {prefix}
            appendComponent = {suffix}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
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

        const editors = [ dayEndOfYearEditor ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
    }


    renderDOWYearOffsetEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
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
            prependComponent = {prefix}
            appendComponent = {suffix}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
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

        const editors = [dowYearOffsetEditor, dayOfWeekSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
    }


    renderDOWEndYearOffsetEditor({ id, ariaLabel, value, onChange, prefix, suffix, }) {
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
            prependComponent = {prefix}
            appendComponent = {suffix}
            inputClassExtras = "DateOccurrenceEditor-NumberField"
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

        const editors = [dowEndYearOffsetEditor, dayOfWeekSelector, ];
        addEditorsToFields(editors, this.renderStartDateEditor());
        return editors;
    }


    renderDateSelector({id, value, onChange, prefix, suffix}) {
        value = getYMDDateString(value);

        const key = this.makeId('DateSelector_' + (id || ''));

        return <DateField 
            key = {key}
            id = {key}
            value = {value}
            onChange = {onChange}
            inputClassExtras = "DateOccurrenceEditor-DateSelector"
            tabIndex = {0}
            prependComponent = {prefix}
            appendComponent = {suffix}
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


    onRepeatDefinitionChange(changes) {
        const repeatDefinition = Object.assign({}, 
            this.props.occurrenceDefinition.repeatDefinition,
            changes);
        this.updateDefinition({
            occurrenceDefinition: {
                repeatDefinition: repeatDefinition,
            }
        });
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

        const repeatDefinitionEditor = <OccurrenceRepeatDefinitionEditor
            id = {this.makeId('OccurrenceRepeatDefinitionEditor')}
            allowedRepeatTypeNames 
                = {occurrenceDefinition.occurrenceType.allowedRepeatTypeNames}
            repeatDefinition = {occurrenceDefinition.repeatDefinition}
            onChange = {this.onRepeatDefinitionChange}
        />;

        return <Fragment>
            <div className = "FieldContainer-inline">
                {typeSelector}
                {fields}
            </div>
            {repeatDefinitionEditor}
        </Fragment>;
    }
}

DateOccurrenceEditor.propTypes = {
    id: PropTypes.string,
    occurrenceDefinition: PropTypes.object.isRequired,
    lastOccurrenceState: PropTypes.object,
    onChange: PropTypes.func.isRequired,
};