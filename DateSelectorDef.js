import { PeriodType } from './DateRangePeriod';
import { RelationType, ResultType, resolveRange } from './DateRangeDef';
import { getYMDDate, getYMDDateString } from './YMDDate';


/**
 * @namespace DateSelectorDef
 */


/**
 * @typedef {object} DateSelectorDef~DateSelectorTypeDef
 * A {@link DateRangeDef~RangeType} with the following additional properties:
 * @property {boolean} [isWorkWeek=false]
 */


/**
 * The date selection types that can be assigned to the dateSelectorType
 * property of {@link DateSelectorDef~SelectorDef}, the return value of
 * {@link resolveDateSelector} is described.
 * @readonly
 * @enum {DateSelectorDef~DateSelectorTypeDef}
 * @property {DateSelectorDef~DateSelectorTypeDef} TODAY The reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} CUSTOM The customYMDDate property
 * of the {@link DateSelectorDef~SelectorDef} is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} WEEK_START The first day of the week
 * containing the reference date is returned. {@link DateRangePeriod~WEEKOptions} can be 
 * passed as the options to change the starting day of the week.
 * @property {DateSelectorDef~DateSelectorTypeDef} WEEK_END The last day of the week
 * containing the reference date is returned. {@link DateRangePeriod~WEEKOptions} can be 
 * passed as the options to change the starting day of the week.
 * @property {DateSelectorDef~DateSelectorTypeDef} WORK_WEEK_START The Monday on or 
 * before the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} WORK_WEEK_END The Friday on or after
 * the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} MONTH_START The first day of the 
 * reference date's month is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} MONTH_END The last day of the 
 * reference date's month is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} QUARTER_START The first day of
 * the calendar quarter containing the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} QUARTER_END The last day of the
 * calendar quarter containing the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} HALF_START The first day of the
 * calendar half containing the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} HALF_END The last day of the
 * calendar half containing the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} YEAR_START The first day of the
 * reference date's year is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} YEAR_END The last day of the
 * reference date's year is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} PRECEDING_MONTH_END The last day
 * of the month immediately preceding the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} PRECEDING_QUARTER_END The last day
 * of the calendar quarter immediately before the calendar quarter containing
 * the reference date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} PRECEDING_HALF_END The last day
 * of the calendar half immediately before the calendar half containing the reference
 * date is returned.
 * @property {DateSelectorDef~DateSelectorTypeDef} PRECEDING_YEAR_END The last day
 * of the calendar year immedately before the reference date's year is returned.
 * @name DateSelectorDef#DateSelectorType
 */
export const DateSelectorType = {
    TODAY: { name: 'TODAY',
        periodType: PeriodType.DAY,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },

    CUSTOM: { name: 'CUSTOM', 
        relationType: RelationType.SPECIFIED,
        resultType: ResultType.EARLIEST_ONLY,
    },

    WEEK_START: { name: 'WEEK_START', 
        periodType: PeriodType.WEEK,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },
    WEEK_END: { name: 'WEEK_END', 
        periodType: PeriodType.WEEK,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
    },

    WORK_WEEK_START: { name: 'WORK_WEEK_START', 
        periodType: PeriodType.WEEK,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
        isWorkWeek: true,
    },
    WORK_WEEK_END: { name: 'WORK_WEEK_END', 
        periodType: PeriodType.WEEK,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
        isWorkWeek: true,
    },

    MONTH_START: { name: 'MONTH_START', 
        periodType: PeriodType.MONTH,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },
    MONTH_END: { name: 'MONTH_END', 
        periodType: PeriodType.MONTH,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
    },

    QUARTER_START: { name: 'QUARTER_START', 
        periodType: PeriodType.QUARTER,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },
    QUARTER_END: { name: 'QUARTER_END', 
        periodType: PeriodType.QUARTER,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
    },

    HALF_START: { name: 'HALF_START', 
        periodType: PeriodType.HALF,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },
    HALF_END: { name: 'HALF_END', 
        periodType: PeriodType.HALF,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
    },

    YEAR_START: { name: 'YEAR_START', 
        periodType: PeriodType.YEAR,
        relationType: RelationType.CURRENT,
        resultType: ResultType.EARLIEST_ONLY,
    },
    YEAR_END: { name: 'YEAR_END', 
        periodType: PeriodType.YEAR,
        relationType: RelationType.CURRENT,
        resultType: ResultType.LATEST_ONLY,
    },

    PRECEDING_MONTH_END: { name: 'PRECEDING_MONTH_END', 
        periodType: PeriodType.MONTH,
        relationType: RelationType.PRECEDING,
        resultType: ResultType.LATEST_ONLY,
    },

    PRECEDING_QUARTER_END: { name: 'PRECEDING_QUARTER_END', 
        periodType: PeriodType.QUARTER,
        relationType: RelationType.PRECEDING,
        resultType: ResultType.LATEST_ONLY,
    },

    PRECEDING_HALF_END: { name: 'PRECEDING_HALF_END', 
        periodType: PeriodType.HALF,
        relationType: RelationType.PRECEDING,
        resultType: ResultType.LATEST_ONLY,
    },

    PRECEDING_YEAR_END: { name: 'PRECEDING_YEAR_END', 
        periodType: PeriodType.YEAR,
        relationType: RelationType.PRECEDING,
        resultType: ResultType.LATEST_ONLY,
    },

};

export function getDateSelectorType(name) {
    return (typeof name === 'string') ? DateSelectorType[name] : name;
}

export function getDateSelectorTypeName(selectorType) {
    return (typeof selectorType === 'object') ? selectorType.name : selectorType;
}


/**
 * @typedef {object} DateSelectorDef~SelectorDef
 * @property {DateSelectorDef#DateSelectorType} dateSelectorType
 * @property {YMDDate} customYMDDate
 */


/**
 * @typedef {object} DateSelectorDef~SelectorDefDataItem
 * @property {string} dateSelectorType
 * @property {string} customYMDDate
 */

/**
 * Retrieves a {@link DateSelectorDef~SelectorDef} that's equivalent to a
 * {@link DateSelectorDef~SelectorDefDataItem} avoiding copying if the arg
 * is already a selector def.
 * @param {DateSelectorDef~SelectorDefDataItem|DateSelectorDef~SeletorDef} 
 *  selectorDefDataItem 
 * @param {boolean} alwaysCopy 
 * @returns {DateSelectorDef~SelectorDef}
 * @name DateSelectorDef#getSelectorDef
 */
export function getSelectorDef(selectorDefDataItem, alwaysCopy) {
    if (selectorDefDataItem) {
        const dateSelectorType = getDateSelectorType(
            selectorDefDataItem.dateSelectorType);
        const customYMDDate = getYMDDate(selectorDefDataItem.customYMDDate);
        if (alwaysCopy
         || (dateSelectorType !== selectorDefDataItem.dateSelectorType)
         || (customYMDDate !== selectorDefDataItem.customYMDDate)) {
            const selectorDef = Object.assign({}, selectorDefDataItem, {
                dateSelectorType: dateSelectorType,
            });

            if (customYMDDate) {
                selectorDef.customYMDDate = customYMDDate;
            }

            return selectorDef;
        }
    }
    return selectorDefDataItem;
}


/**
 * Retrieves a {@link DateSelectorDef~SelectorDefDataItem} that's equivalent to a
 * {@link DateSelectorDef~SelectorDef} avoiding copying if the arg
 * is already a selector def.
 * @param {DateSelectorDef~SelectorDef|DateSelectorDef~SeletorDefDataItem} 
 *  selectorDef
 * @param {boolean} alwaysCopy 
 * @returns {DateSelectorDef~SelectorDefDataItem}
 * @name DateSelectorDef#getSelectorDefDataItem
 */
export function getSelectorDefDataItem(selectorDef, alwaysCopy) {
    if (selectorDef) {
        const dateSelectorType = getDateSelectorTypeName(
            selectorDef.dateSelectorType);
        const customYMDDate = getYMDDateString(selectorDef.customYMDDate);
        if (alwaysCopy
         || (dateSelectorType !== selectorDef.dateSelectorType)
         || (customYMDDate !== selectorDef.customYMDDate)) {
            const selectorDefDataItem = Object.assign({}, selectorDef, {
                dateSelectorType: dateSelectorType,
            });
            if (customYMDDate) {
                selectorDefDataItem.customYMDDate = customYMDDate;
            }
            return selectorDefDataItem;
        }
    }
    return selectorDef;
}


/**
 * @typedef {object} DateSelectorDef~resolveDateSelectorArgs
 * A {@link DateSelectorDef~SelectorDef} or {@link DateSelectorDef~SelectorDefDataItem}
 * with the following additional properties:
 * @property {YMDDate|string} [ymdDate] The reference date, if 
 * <code>undefined</code> today is used.
 * @property {object} [options] Optional options for use with the {@link DataRangePeriod}
 * of the range type.
 */


/**
 * Resolves a {@link DateSelectorDef~SelectorDef} or 
 * {@link DateSelectorDef~SelectorDefDataItem} for a given reference date.
 * <p>
 * This can take a single {@link DateSelectorDef~resolveDateSelectorArgs} or the following
 * separate arguments:
 * @param {DateSelectorDef~SelectorDef|DateSelectorDef~SelectorDefDataItem} selectorDef 
 * @param {YMDDate|string} [ymdDate] The reference date, if 
 * <code>undefined</code> today is used.
 * @param {object} [options] Optional options for use with the {@link DataRangePeriod}
 * of the range type.
 * @returns {YMDDate|string} A string representation of the {@link YMDDate} item is 
 * returned if the reference date is a string.
 * @name DateSelectorDef#resolveDateSelector
 */
export function resolveDateSelector(selectorDef, ymdDate, options) {
    if (!selectorDef) {
        return;
    }

    const args = Object.assign({}, selectorDef, {
        rangeType: selectorDef.dateSelectorType,
        firstYMDDate: selectorDef.customYMDDate,
    });
    if (ymdDate) {
        args.ymdDate = ymdDate;
    }
    if (options) {
        args.options = options;
    }

    const result = resolveRange(args);
    if (result) {
        const { dateSelectorType } = selectorDef;
        if (dateSelectorType.isWorkWeek) {
            let resultYMDDate = getYMDDate(result);
            const dow = resultYMDDate.getDayOfWeek();
            if (dow === 0) {
                resultYMDDate = resultYMDDate.addDays(1);
            }
            else if (dow === 6) {
                resultYMDDate = resultYMDDate.addDays(-1);
            }
            else {
                return result;
            }
            if (typeof result === 'string') {
                return resultYMDDate.toString();
            }
            return resultYMDDate;
        }
    }
    
    return result;
}
