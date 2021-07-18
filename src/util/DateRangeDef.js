import { getYMDDate, getYMDDateString, YMDDate, } from './YMDDate';
import { PeriodType, getPeriodType, getPeriodTypeName,
    getPeriodYMDDateRange,
    getPeriodLatestYMDDate,
    getPeriodEarliestYMDDate, } from './DateRangePeriod';
import { getYMDDateRangeDataItem, makeValidYMDDateRange } from './YMDDateRange';


/**
 * @namespace DateRangeDef
 */




/**
 * @typedef {object} DateRangeDef~RelationTypeDef
 * @property {string} name
 * @property {boolean} [hasRefDate=false]
 */

/**
 * The date range relation types. These determine the relationship of the range to
 * the reference date.
 * @readonly
 * @enum {DateRangeDef~RelationTypeDef} RelationType
 * @property {DateRangeDef~RelationTypeDef} CURRENT The range consists of the single 
 * period that contains the reference date.
 * @property {DateRangeDef~RelationTypeDef} PRECEDING The range consists of one or more 
 * consecutive periods ending with the period preceeding the period containing the
 * reference date. The reference date is not included in the range.
 * @property {DateRangeDef~RelationTypeDef} FOLLOWING The range consists of one or more 
 * consecutive periods starting with the period following the period containing the
 * reference date. The reference date is not included in the range.
 * @property {DateRangeDef~RelationTypeDef} LAST The range consists of one or more
 * consecutive 'pseudo' periods ending on the reference date. The periods are evaluated
 * with the corresponding 'keepDOM' option property set to <code>true</code>, which
 * means the DOM will be kept unless the starting month does not contain the DOM.
 * The reference date is included in the range.
 * @property {DateRangeDef~RelationTypeDef} NEXT The range consists of one or more
 * consecutive 'pseudo' periods starting on the reference date. The periods are evaluated
 * with the corresponding 'keepDOM' option property set to <code>true</code>, which
 * means the DOM will be kept unless the starting month does not contain the DOM.
 * The reference date is included in the range.
 * @property {DateRangeDef~RelationTypeDef} ALL
 * @property {DateRangeDef~RelationTypeDef} CUSTOM The range is defined by two
 * reference YMD dates, either of which may be <code>undefined</code>.
*/
export const RelationType = {
    CURRENT: { name: 'CURRENT', 
        getYMDDateRange: getYMDDateRangeCURRENT,
    },

    PRECEDING: { name: 'PRECEDING', 
        getYMDDateRange: getYMDDateRangePRECEDING,
    },

    FOLLOWING: { name: 'FOLLOWING', 
        getYMDDateRange: getYMDDateRangeFOLLOWING,
    },

    LAST: { name: 'LAST', 
        getYMDDateRange: getYMDDateRangeLAST,
    },

    NEXT: { name: 'NEXT', 
        getYMDDateRange: getYMDDateRangeNEXT,
    },

    ALL: { name: 'ALL', 
        getYMDDateRange: () => { return {}; },
    },

    SPECIFIED: { name: 'SPECIFIED',
        getYMDDateRange: getYMDDateRangeSPECIFIED,
    },

};

export function getRelationType(relationType) {
    return (typeof relationType === 'string') 
        ? RelationType[relationType] : relationType;
}

export function getRelationTypeName(relationType) {
    return (typeof relationType === 'object')
        ? relationType.name : relationType;
}


/**
 * @typedef {object} DateRangeDef~RangeType
 * @property {DateRangePeriod#PeriodType} periodType
 * @property {DateRangeDef~RelationTypeDef} relationType
 * @property {DateRangeDef~ResultType} [resultType]
 * @property {number} [offset] Optional offset for the period type.
 */

/**
 * @typedef {object} DateRangeDef~RangeTypeDataItem
 * @property {string} periodType
 * @property {string} relationType
 * @property {string} [resultType]
 * @property {number} [offset] Optional offset for the period type.
 */

/**
 * Retrieves a {@link DateRangeDef~RangeType} equivalent of an
 * {@link DateRangeDef~RangeTypeDataItem}, avoids copying if the
 * arg is already a {@link DateRangeDef~RangeType}.
 * @param {DateRangeDef~RangeTypeDataItem|DateRangeDef~RangeType} rangeTypeDataItem 
 * @param {boolean} alwaysCopy If truthy a copy of rangeTypeDataItem is always
 * made.
 * @returns {DateRangeDef~RangeType|undefined}
 * @function DateRangeDef#getRangeType
 */
export function getRangeType(rangeTypeDataItem, alwaysCopy) {
    if (rangeTypeDataItem) {
        const periodType = getPeriodType(rangeTypeDataItem.periodType);
        const relationType = getRelationType(rangeTypeDataItem.relationType);
        const resultType = getResultType(rangeTypeDataItem.resultType);

        if (alwaysCopy
         || (periodType !== rangeTypeDataItem.periodType)
         || (relationType !== rangeTypeDataItem.relationType)
         || (resultType !== rangeTypeDataItem.resultType)) {
            const rangeType = Object.assign({}, rangeTypeDataItem, {
                periodType: periodType,
                relationType: relationType,
            });

            if (resultType) {
                rangeType.resultType = resultType;
            }

            return rangeType;
        }
    }

    return rangeTypeDataItem;
}


/**
 * Retrieves a {@link DateRangeDef~RangeTypeDataItem} equivalent of an
 * {@link DateRangeDef~RangeType}, avoids copying if the
 * arg is already a {@link DateRangeDef~RangeTypeDataItem}.
 * @param {DateRangeDef~RangeType|DateRangeDef~RangeTypeDataItem} rangeTypeDataItem 
 * @param {boolean} alwaysCopy If truthy a copy of rangeTypeDataItem is always
 * made.
 * @returns {DateRangeDef~RangeTypeDataItem|undefined}
 * @function DateRangeDef#getRangeTypeDataItem
 */
export function getRangeTypeDataItem(rangeType, alwaysCopy) {
    if (rangeType) {
        const periodType = getPeriodTypeName(rangeType.periodType);
        const relationType = getRelationTypeName(rangeType.relationType);
        const resultType = getResultTypeName(rangeType.resultType);

        if (alwaysCopy
         || (periodType !== rangeType.periodType)
         || (relationType !== rangeType.relationType)
         || (resultType !== rangeType.resultType)) {
            const rangeTypeDataItem = Object.assign({}, rangeType, {
                periodType: periodType,
                relationType: relationType,
            });

            if (resultType) {
                rangeTypeDataItem.resultType = resultType;
            }

            return rangeTypeDataItem;
        }
    }
    return rangeType;
}


/**
 * @typedef DateRangeDef~ResultTypeDef
 * @property {string} name
 */

/**
 * Optional result type that can be assigned to the resultType
 * property of {@link DateRangeDef~RangeDef}
 * @readonly
 * @enum {DateRangeDef~ResultTypeDef}
 * 
 */
export const ResultType = {
    RANGE: { name: 'RANGE', },
    EARLIEST_ONLY: { name: 'EARLIEST_ONLY', },
    LATEST_ONLY: { name: 'LATEST_ONLY', },
};

export function getResultType(name) {
    return (typeof name === 'string') ? ResultType[name] : name;
}

export function getResultTypeName(type) {
    return (typeof type === 'object') ? type.name : type;
}


/**
 * @typedef {object} DateRangeDef~RangeDefDataItem
 * Defines a particular range definition.
 * @property {string} rangeType
 * @property {string} [firstYMDDate] Used by RangeDef.SPECIFIED, assigned to the
 * earliestYMDDate unless it is later than lastYMDDate, in which case they are swapped.
 * @property {string} [lastYMDDate] Used by RangeDef.SPECIFIED, assigned to the
 * latestYMDDate unless it is later than lastYMDDate, in which case they are swapped.
 */

/**
 * @typedef {object} DateRangeDef~RangeDef
 * Defines a particular range definition.
 * @property {DateRangeDef~RangeType} rangeType
 * @property {YMDDate} [firstYMDDate] Used by RangeDef.SPECIFIED, assigned to the
 * earliestYMDDate unless it is later than lastYMDDate, in which case they are swapped.
 * @property {YMDDate} [lastYMDDate] Used by RangeDef.SPECIFIED, assigned to the
 * latestYMDDate unless it is later than lastYMDDate, in which case they are swapped.
 */


/**
 * Retrieves a {@link DateRangeDef~RangeDef} equivalent of an
 * {@link DateRangeDef~RangeDefDataItem}, avoids copying if the
 * arg is already a {@link DateRangeDef~RangeDef}.
 * @param {DateRangeDef~RangeDefDataItem|DateRangeDef~RangeDef} rangeDefDataItem 
 * @param {boolean} alwaysCopy If truthy a copy of rangeTypeDataItem is always
 * made.
 * @returns {DateRangeDef~RangeDef|undefined}
 * @function DateRangeDef#getRangeDef
 */
export function getRangeDef(rangeDefDataItem, alwaysCopy) {
    if (rangeDefDataItem) {
        const rangeType = getRangeType(rangeDefDataItem.rangeType);
        const firstYMDDate = getYMDDate(rangeDefDataItem.firstYMDDate);
        const lastYMDDate = getYMDDate(rangeDefDataItem.lastYMDDate);
        if (alwaysCopy
         || (rangeType !== rangeDefDataItem.rangeType)
         || (firstYMDDate !== rangeDefDataItem.firstYMDDate)
         || (lastYMDDate !== rangeDefDataItem.lastYMDDate)) {
            const rangeDef = Object.assign({}, rangeDefDataItem, {
                rangeType: rangeType,
            });
            if (firstYMDDate) {
                rangeDef.firstYMDDate = firstYMDDate;
            }
            if (lastYMDDate) {
                rangeDef.lastYMDDate = lastYMDDate;
            }
            return rangeDef;
        }
    }

    return rangeDefDataItem;
}


/**
 * Retrieves a {@link DateRangeDef~RangeDefDataItem} equivalent of an
 * {@link DateRangeDef~RangeDef}, avoids copying if the
 * arg is already a {@link DateRangeDef~RangeDefDataItem}.
 * @param {DateRangeDef~RangeDef|DateRangeDef~RangeDefDataItem} rangeDef
 * @param {boolean} alwaysCopy If truthy a copy of rangeTypeDataItem is always
 * made.
 * @returns {DateRangeDef~RangeDefDataItem|undefined}
 * @function DateRangeDef#getRangeDefDataItem
 */
export function getRangeDefDataItem(rangeDef, alwaysCopy) {
    if (rangeDef) {
        const rangeType = getRangeTypeDataItem(rangeDef.rangeType);
        const firstYMDDate = getYMDDateString(rangeDef.firstYMDDate);
        const lastYMDDate = getYMDDateString(rangeDef.lastYMDDate);
        if (alwaysCopy
         || (rangeType !== rangeDef.rangeType)
         || (firstYMDDate !== rangeDef.firstYMDDate)
         || (lastYMDDate !== rangeDef.lastYMDDate)) {
            rangeDef = Object.assign({}, rangeDef, {
                rangeType: rangeType,
            });
            if (firstYMDDate) {
                rangeDef.firstYMDDate = firstYMDDate;
            }
            if (lastYMDDate) {
                rangeDef.lastYMDDate = lastYMDDate;
            }
        }
    }

    return rangeDef;
}


function getYMDDateRangeCURRENT({ periodType, ymdDate, options, resultType, }) {
    if (periodType) {
        const args = {
            periodType: periodType, 
            ymdDate: ymdDate,
            options: options,
        };
        if (resultType === ResultType.EARLIEST_ONLY) {
            return getPeriodEarliestYMDDate(args);
        }
        else if (resultType === ResultType.LATEST_ONLY) {
            return getPeriodLatestYMDDate(args);
        }
        return getPeriodYMDDateRange(args);
    }
}


function getYMDDateRangePRECEDING({ periodType, ymdDate, options, resultType, }) {
    if (periodType) {
        const args = {
            periodType: periodType, 
            ymdDate: ymdDate,
            offset: -1,
            options: options,
        };
        if (resultType === ResultType.EARLIEST_ONLY) {
            return getPeriodEarliestYMDDate(args);
        }
        else if (resultType === ResultType.LATEST_ONLY) {
            return getPeriodLatestYMDDate(args);
        }
        return getPeriodYMDDateRange(args);
    }
}


function getYMDDateRangeFOLLOWING({ periodType, ymdDate, options, resultType, }) {
    if (periodType) {
        const args = {
            periodType: periodType, 
            ymdDate: ymdDate,
            offset: 1,
            options: options,
        };
        if (resultType === ResultType.EARLIEST_ONLY) {
            return getPeriodEarliestYMDDate(args);
        }
        else if (resultType === ResultType.LATEST_ONLY) {
            return getPeriodLatestYMDDate(args);
        }
        return getPeriodYMDDateRange(args);
    }
}


function getYMDDateRangeLAST(
    { rangeType, periodType, ymdDate, options, resultType, }) {
        
    if (!periodType) {
        return;
    }

    const myOptions = {
        keepDOM: true,
    };
    if (options) {
        Object.assign(myOptions, options);
    }

    const latestYMDDate = getPeriodLatestYMDDate({
        periodType: periodType,
        ymdDate: ymdDate,
        options: myOptions,
    });
    if (!latestYMDDate) {
        return;
    }

    const earliestYMDDate = getPeriodEarliestYMDDate({
        periodType: periodType,
        ymdDate: latestYMDDate,
        options: myOptions,
        offset: rangeType.offset,
    });

    if (resultType === ResultType.EARLIEST_ONLY) {
        return earliestYMDDate;
    }
    else if (resultType === ResultType.LATEST_ONLY) {
        return latestYMDDate;
    }

    return {
        latestYMDDate: latestYMDDate,
        earliestYMDDate: earliestYMDDate,
    };
}


function getYMDDateRangeNEXT(
    { rangeType, periodType, ymdDate, options, resultType, }) {
        
    if (!periodType) {
        return;
    }

    const myOptions = {
        keepDOM: true,
    };
    if (options) {
        Object.assign(myOptions, options);
    }

    const earliestYMDDate = getPeriodEarliestYMDDate({
        periodType: periodType,
        ymdDate: ymdDate,
        options: myOptions,
    });
    if (!earliestYMDDate) {
        return;
    }

    const latestYMDDate = getPeriodLatestYMDDate({
        periodType: periodType,
        ymdDate: earliestYMDDate,
        options: myOptions,
        offset: rangeType.offset,
    });

    if (resultType === ResultType.EARLIEST_ONLY) {
        return earliestYMDDate;
    }
    else if (resultType === ResultType.LATEST_ONLY) {
        return latestYMDDate;
    }

    return {
        earliestYMDDate: earliestYMDDate,
        latestYMDDate: latestYMDDate,
    };
}



function getYMDDateRangeSPECIFIED({ rangeDef, resultType, }) {
    if (resultType === ResultType.EARLIEST_ONLY) {
        return rangeDef.firstYMDDate;
    }
    else if (resultType === ResultType.LATEST_ONLY) {
        return rangeDef.latestYMDDate;
    }
    return makeValidYMDDateRange(rangeDef.firstYMDDate, rangeDef.lastYMDDate);
}


/**
 * @typedef {object} DateRangeDef~resolveRangeArgs
 * A {@link DateRangeDef~RangeDef} or {@link DateRangeDef~RangeDefDataItem}
 * with the following additional properties.
 * @property {YMDDate|string} [ymdDate] The reference date, if 
 * <code>undefined</code> today is used.
 * @property {object} [options] Optional options for use with the {@link DataRangePeriod}
 * of the range type.
 */


/**
 * Resolves a range from a range definition and a reference date.
 * <p>
 * This can take a single {@link DateRangeDef~resolveRangeArgs} or the following
 * separate arguments:
 * @param {DateRangeDef~RangeDef} rangeDef 
 * @property {YMDDate|string} [ymdDate] The reference date, if 
 * <code>undefined</code> today is used.
 * @property {object} [options] Optional options for use with the {@link DataRangePeriod}
 * of the range type.
 * @returns {YMDDateRange|YMDDateRangeDataItem} A range data item is returned if
 * the reference date is a string.
 * @function DateRangeDef#resolveRange
 */
export function resolveRange(rangeDef, ymdDate, options) {
    if (!rangeDef) {
        return {};
    }

    let { rangeType } = rangeDef;
    if (!rangeType) {
        return {};
    }

    rangeType = getStandardRangeType(rangeType);

    const relationType = getRelationType(rangeType.relationType);
    if (!relationType) {
        return {};
    }

    const periodType = getPeriodType(rangeType.periodType);

    const { getYMDDateRange } = relationType;
    if (!getYMDDateRange) {
        return {};
    }

    if (ymdDate === undefined) {
        ymdDate = rangeDef.ymdDate;
    }
    if (options === undefined) {
        options = rangeDef.options;
    }

    const wantStringYMDDates = (typeof ymdDate === 'string');
    ymdDate = getYMDDate(ymdDate) || new YMDDate();

    const resultType = getResultType(rangeDef.rangeType.resultType)
        || ResultType.RANGE;

    const result = getYMDDateRange({
        rangeDef: rangeDef, 
        rangeType: rangeType,
        relationType: relationType,
        periodType: periodType,
        ymdDate: ymdDate, 
        options: options,
        resultType: resultType,
    });
    
    if (!result) {
        return {};
    }

    if (wantStringYMDDates) {
        if (resultType === ResultType.RANGE) {
            return getYMDDateRangeDataItem(result);
        }
        else {
            return result.toString();
        }
    }
    return result;
}


/**
 * Standard range definitions that can be passed as the range type to
 * {@link resolveRange}. For these {@link resolveRange} will return a
 * {@link YMDDateRange}
 * @readonly
 * @enum {DateRangeDef~RangeType}
 * @property {DateRangeDef~RangeType} ALL
 * @property {DateRangeDef~RangeType} CUSTOM The date range is between the
 * firstYMDDate and lastYMDDate properties of the range definition, inclusive.
 * If firstYMDDate is <code>undefined</code> the earliestYMDDate property of the range
 * is set to <code>undefined</code>. If lastYMDDate is <code>undefined</code> the
 * latestYMDDate property of the range is set to <code>undefined</code>.
 * @property {DateRangeDef~RangeType} CURRENT_WEEK The calendar week that includes
 * the reference date. {@link DateRangePeriod~WEEKOptions} can be passed as
 * the options to change the starting day of the week.
 * @property {DateRangeDef~RangeType} CURRENT_MONTH The calendar month that includes
 * the reference date.
 * @property {DateRangeDef~RangeType} CURRENT_QUARTER The calendar quarter that includes
 * the reference date.
 * @property {DateRangeDef~RangeType} CURRENT_HALF The calendar half that includes
 * the reference date.
 * @property {DateRangeDef~RangeType} CURRENT_YEAR The calendar year that includes
 * the reference date.
 * 
 * @property {DateRangeDef~RangeType} PRECEDING_WEEK The calendar week prior to the
 * calendar week that includes the reference date. {@link DateRangePeriod~WEEKOptions} 
 * can be passed as the options to change the starting day of the week.
 * @property {DateRangeDef~RangeType} PRECEDING_MONTH The calendar month prior to the
 * calendar month that includes the reference date.
 * @property {DateRangeDef~RangeType} PRECEDING_QUARTER The calendar quarter prior to the
 * calendar quarter that includes the reference date.
 * @property {DateRangeDef~RangeType} PRECEDING_HALF The calendar half prior to the
 * calendar half that includes the reference date.
 * @property {DateRangeDef~RangeType} PRECEDING_YEAR The calendar year prior to the
 * calendar year that includes the reference date.
 *
 * @property {DateRangeDef~RangeType} FOLLOWING_WEEK The calendar month after to the
 * calendar month that includes the reference date. {@link DateRangePeriod~WEEKOptions} 
 * can be passed as the options to change the starting day of the week.
 * @property {DateRangeDef~RangeType} FOLLOWING_MONTH The calendar month after to the
 * calendar month that includes the reference date.
 * @property {DateRangeDef~RangeType} FOLLOWING_QUARTER The calendar quarter after to the
 * calendar quarter that includes the reference date.
 * @property {DateRangeDef~RangeType} FOLLOWING_HALF The calendar half after to the
 * calendar half that includes the reference date.
 * @property {DateRangeDef~RangeType} FOLLOWING_YEAR The calendar year after to the
 * calendar year that includes the reference date.
 *
 * @property {DateRangeDef~RangeType} LAST_DAYS_7 The seven days prior to and including
 * the reference date.
 * @property {DateRangeDef~RangeType} LAST_DAYS_30 The 30 days prior to and including
 * the reference date.
 * @property {DateRangeDef~RangeType} LAST_DAYS_60 The 60 days prior to and including
 * the reference date.
 * @property {DateRangeDef~RangeType} LAST_DAYS_90 The 90 days prior to and including
 * the reference date.
 * @property {DateRangeDef~RangeType} LAST_DAYS_180 The 180 days prior to and including
 * the reference date.
 *
 * @property {DateRangeDef~RangeType} LAST_WEEKS_2 The 2 weeks (14 days) prior to and 
 * including the reference date. The earliest date will have a day of the week one
 * day after the reference date.
 * @property {DateRangeDef~RangeType} LAST_WEEKS_4 The 4 weeks (28 days) prior to and 
 * including the reference date. The earliest date will have a day of the week one
 * day after the reference date.
 * @property {DateRangeDef~RangeType} LAST_WEEKS_8 The 8 weeks (56 days) prior to and 
 * including the reference date. The earliest date will have a day of the week one
 * day after the reference date.
 *
 * @property {DateRangeDef~RangeType} LAST_MONTHS_3 The 3 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date, unless the month does not have enough days, in which case it will
 * have the last day of the month.
 * @property {DateRangeDef~RangeType} LAST_MONTHS_6 The 6 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date, unless the month does not have enough days, in which case it will
 * have the last day of the month.
 * @property {DateRangeDef~RangeType} LAST_MONTHS_9 The 9 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date, unless the month does not have enough days, in which case it will
 * have the last day of the month.
 * @property {DateRangeDef~RangeType} LAST_MONTHS_12 The 12 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date, unless the month does not have enough days, in which case it will
 * have the last day of the month.
 *
 * @property {DateRangeDef~RangeType} LAST_YEARS_1 The 12 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date unless the reference date is February 29 of a leap year, in which
 * case the earliest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} LAST_YEARS_2 The 24 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date unless the reference date is February 29 of a leap year, in which
 * case the earliest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} LAST_YEARS_3 The 36 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date unless the reference date is February 29 of a leap year, in which
 * case the earliest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} LAST_YEARS_5 The 60 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date unless the reference date is February 29 of a leap year, in which
 * case the earliest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} LAST_YEARS_10 The 120 months prior to and including
 * the reference date. The earliest date will have the same day of the month as the
 * reference date unless the reference date is February 29 of a leap year, in which
 * case the earliest date will be February 28 of that year.
 *
 * @property {DateRangeDef~RangeType} NEXT_DAYS_7 The seven days starting from and
 * including the reference date.
 * @property {DateRangeDef~RangeType} NEXT_DAYS_30 The 30 days starting from and
 * including the reference date.
 * @property {DateRangeDef~RangeType} NEXT_DAYS_60 The 60 days starting from and
 * including the reference date.
 * @property {DateRangeDef~RangeType} NEXT_DAYS_90 The 90 days starting from and
 * including the reference date.
 * @property {DateRangeDef~RangeType} NEXT_DAYS_180 The 180 days starting from and
 * including the reference date.
 *
 * @property {DateRangeDef~RangeType} NEXT_WEEKS_2 The 2 weeks (14 days) starting from
 * and including the reference date. The day of the week of the latest
 * date will be one day before the day of the week of the reference date.
 * @property {DateRangeDef~RangeType} NEXT_WEEKS_4 The 4 weeks (28 days) starting from
 * and including the reference date. The day of the week of the latest
 * date will be one day before the day of the week of the reference date.
 * @property {DateRangeDef~RangeType} NEXT_WEEKS_8 The 8 weeks (56 days) starting from
 * and including the reference date. The day of the week of the latest
 * date will be one day before the day of the week of the reference date.
 *
 * @property {DateRangeDef~RangeType} NEXT_MONTHS_3 The 3 months starting from 
 * and including the reference date. The latest date will have the same day of the 
 * month as the reference date, unless the month does not have enough days, in 
 * which case it will have the last day of the month.
 * @property {DateRangeDef~RangeType} NEXT_MONTHS_6 The 6 months starting from 
 * and including the reference date. The latest date will have the same day of the 
 * month as the reference date, unless the month does not have enough days, in 
 * which case it will have the last day of the month.
 * @property {DateRangeDef~RangeType} NEXT_MONTHS_9 The 9 months starting from 
 * and including the reference date. The latest date will have the same day of the 
 * month as the reference date, unless the month does not have enough days, in 
 * which case it will have the last day of the month.
 * @property {DateRangeDef~RangeType} NEXT_MONTHS_12 The 12 months starting from 
 * and including the reference date. The latest date will have the same day of the 
 * month as the reference date, unless the month does not have enough days, in 
 * which case it will have the last day of the month.
 *
 * @property {DateRangeDef~RangeType} NEXT_YEARS_1 The 12 months starting from and 
 * including the reference date. The latest date will have the same day of the 
 * month as the reference date unless the reference date is February 29 of a leap 
 * year, in which case the latest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} NEXT_YEARS_2 The 24 months starting from and 
 * including the reference date. The latest date will have the same day of the 
 * month as the reference date unless the reference date is February 29 of a leap 
 * year, in which case the latest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} NEXT_YEARS_3 The 36 months starting from and 
 * including the reference date. The latest date will have the same day of the 
 * month as the reference date unless the reference date is February 29 of a leap 
 * year, in which case the latest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} NEXT_YEARS_5 The 60 months starting from and 
 * including the reference date. The latest date will have the same day of the 
 * month as the reference date unless the reference date is February 29 of a leap 
 * year, in which case the latest date will be February 28 of that year.
 * @property {DateRangeDef~RangeType} NEXT_YEARS_10 The 120 months starting from and 
 * including the reference date. The latest date will have the same day of the 
 * month as the reference date unless the reference date is February 29 of a leap 
 * year, in which case the latest date will be February 28 of that year.
 * @name DateRangeDef#StandardRangeType
 */
export const StandardRangeType = {
    ALL: { name: 'ALL',
        relationType: RelationType.ALL,
    },

    CUSTOM: { name: 'CUSTOM',
        relationType: RelationType.SPECIFIED,
    },


    CURRENT_WEEK: { name: 'CURRENT_WEEK',
        periodType: PeriodType.WEEK,
        relationType: RelationType.CURRENT,
    },

    CURRENT_MONTH: { name: 'CURRENT_MONTH',
        periodType: PeriodType.MONTH,
        relationType: RelationType.CURRENT,
    },

    CURRENT_QUARTER: { name: 'CURRENT_QUARTER',
        periodType: PeriodType.QUARTER,
        relationType: RelationType.CURRENT,
    },

    CURRENT_HALF: { name: 'CURRENT_HALF',
        periodType: PeriodType.HALF,
        relationType: RelationType.CURRENT,
    },

    CURRENT_YEAR: { name: 'CURRENT_YEAR',
        periodType: PeriodType.YEAR,
        relationType: RelationType.CURRENT,
    },


    PRECEDING_WEEK: { name: 'PRECEDING_WEEK',
        periodType: PeriodType.WEEK,
        relationType: RelationType.PRECEDING,
    },

    PRECEDING_MONTH: { name: 'PRECEDING_MONTH',
        periodType: PeriodType.MONTH,
        relationType: RelationType.PRECEDING,
    },

    PRECEDING_QUARTER: { name: 'PRECEDING_QUARTER',
        periodType: PeriodType.QUARTER,
        relationType: RelationType.PRECEDING,
    },

    PRECEDING_HALF: { name: 'PRECEDING_HALF',
        periodType: PeriodType.HALF,
        relationType: RelationType.PRECEDING,
    },

    PRECEDING_YEAR: { name: 'PRECEDING_YEAR',
        periodType: PeriodType.YEAR,
        relationType: RelationType.PRECEDING,
    },


    FOLLOWING_WEEK: { name: 'FOLLOWING_WEEK',
        periodType: PeriodType.WEEK,
        relationType: RelationType.FOLLOWING,
    },

    FOLLOWING_MONTH: { name: 'FOLLOWING_MONTH',
        periodType: PeriodType.MONTH,
        relationType: RelationType.FOLLOWING,
    },

    FOLLOWING_QUARTER: { name: 'FOLLOWING_QUARTER',
        periodType: PeriodType.QUARTER,
        relationType: RelationType.FOLLOWING,
    },

    FOLLOWING_HALF: { name: 'FOLLOWING_HALF',
        periodType: PeriodType.HALF,
        relationType: RelationType.FOLLOWING,
    },

    FOLLOWING_YEAR: { name: 'FOLLOWING_YEAR',
        periodType: PeriodType.YEAR,
        relationType: RelationType.FOLLOWING,
    },


    LAST_DAYS_7: { name: 'LAST_DAYS_7',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -6,
    },

    LAST_DAYS_30: { name: 'LAST_DAYS_30',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -29,
    },

    LAST_DAYS_60: { name: 'LAST_DAYS_60',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -59,
    },

    LAST_DAYS_90: { name: 'LAST_DAYS_90',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -89,
    },

    LAST_DAYS_180: { name: 'LAST_DAYS_180',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -179,
    },


    LAST_WEEKS_2: { name: 'LAST_WEEKS_2',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -13,
    },

    LAST_WEEKS_4: { name: 'LAST_WEEKS_4',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -27,
    },

    LAST_WEEKS_8: { name: 'LAST_WEEKS_8',
        periodType: PeriodType.DAY,
        relationType: RelationType.LAST,
        offset: -55,
    },



    LAST_MONTHS_3: { name: 'LAST_MONTHS_3',
        periodType: PeriodType.MONTH,
        relationType: RelationType.LAST,
        offset: -3,
    },

    LAST_MONTHS_6: { name: 'LAST_MONTHS_6',
        periodType: PeriodType.MONTH,
        relationType: RelationType.LAST,
        offset: -6,
    },

    LAST_MONTHS_9: { name: 'LAST_MONTHS_9',
        periodType: PeriodType.MONTH,
        relationType: RelationType.LAST,
        offset: -9,
    },

    LAST_MONTHS_12: { name: 'LAST_MONTHS_12',
        periodType: PeriodType.MONTH,
        relationType: RelationType.LAST,
        offset: -12,
    },



    LAST_YEARS_1: { name: 'LAST_YEARS_1',
        periodType: PeriodType.YEAR,
        relationType: RelationType.LAST,
        offset: -1,
    },

    LAST_YEARS_2: { name: 'LAST_YEARS_2',
        periodType: PeriodType.YEAR,
        relationType: RelationType.LAST,
        offset: -2,
    },

    LAST_YEARS_3: { name: 'LAST_YEARS_3',
        periodType: PeriodType.YEAR,
        relationType: RelationType.LAST,
        offset: -3,
    },

    LAST_YEARS_5: { name: 'LAST_YEARS_5',
        periodType: PeriodType.YEAR,
        relationType: RelationType.LAST,
        offset: -5,
    },

    LAST_YEARS_10: { name: 'LAST_YEARS_10',
        periodType: PeriodType.YEAR,
        relationType: RelationType.LAST,
        offset: -10,
    },


    NEXT_DAYS_7: { name: 'NEXT_DAYS_7',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 6,
    },

    NEXT_DAYS_30: { name: 'NEXT_DAYS_30',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 29,
    },

    NEXT_DAYS_60: { name: 'NEXT_DAYS_60',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 59,
    },

    NEXT_DAYS_90: { name: 'NEXT_DAYS_90',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 89,
    },

    NEXT_DAYS_180: { name: 'NEXT_DAYS_180',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 179,
    },


    NEXT_WEEKS_2: { name: 'NEXT_WEEKS_2',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 13,
    },

    NEXT_WEEKS_4: { name: 'NEXT_WEEKS_4',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 27,
    },

    NEXT_WEEKS_8: { name: 'NEXT_WEEKS_8',
        periodType: PeriodType.DAY,
        relationType: RelationType.NEXT,
        offset: 55,
    },


    NEXT_MONTHS_3: { name: 'NEXT_MONTHS_3',
        periodType: PeriodType.MONTH,
        relationType: RelationType.NEXT,
        offset: 3,
    },

    NEXT_MONTHS_6: { name: 'NEXT_MONTHS_6',
        periodType: PeriodType.MONTH,
        relationType: RelationType.NEXT,
        offset: 6,
    },

    NEXT_MONTHS_9: { name: 'NEXT_MONTHS_9',
        periodType: PeriodType.MONTH,
        relationType: RelationType.NEXT,
        offset: 9,
    },

    NEXT_MONTHS_12: { name: 'NEXT_MONTHS_12',
        periodType: PeriodType.MONTH,
        relationType: RelationType.NEXT,
        offset: 12,
    },



    NEXT_YEARS_1: { name: 'NEXT_YEARS_1',
        periodType: PeriodType.YEAR,
        relationType: RelationType.NEXT,
        offset: 1,
    },

    NEXT_YEARS_2: { name: 'NEXT_YEARS_2',
        periodType: PeriodType.YEAR,
        relationType: RelationType.NEXT,
        offset: 2,
    },

    NEXT_YEARS_3: { name: 'NEXT_YEARS_3',
        periodType: PeriodType.YEAR,
        relationType: RelationType.NEXT,
        offset: 3,
    },

    NEXT_YEARS_5: { name: 'NEXT_YEARS_5',
        periodType: PeriodType.YEAR,
        relationType: RelationType.NEXT,
        offset: 5,
    },

    NEXT_YEARS_10: { name: 'NEXT_YEARS_10',
        periodType: PeriodType.YEAR,
        relationType: RelationType.NEXT,
        offset: 10,
    },
};


export function getStandardRangeType(rangeType) {
    return (typeof rangeType === 'string') ? StandardRangeType[rangeType] : rangeType;
}

export function getStandardRangeTypeName(rangeType) {
    return (typeof rangeType === 'object') ? rangeType.name : rangeType;
}

