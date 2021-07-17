import { getYMDDate, getYMDDateString, YMDDate, } from './YMDDate';
import { getYMDDateRangeDataItem } from './YMDDateRange';


/**
 * @namespace DateRangePeriod
 */


/**
 * @typedef {object} DateRangePeriod~PeriodTypeDef
 * @property {string} name
 */

/**
 * @typedef {object} DateRangePeriod~WEEKOptions
 * @property {number} [weekStart=0] The day of the week of the start of the week, 
 * 0 = Sunday. This should be &ge; 0 and &le; 6.
 */

/**
 * @typedef {object} DateRangePeriod~MONTHOptions
 * @property {boolean} [keepDOM=false] If truthy then the day of the month is kept
 * (if beyond the end of the month it is pinned to the end of the month), otherwise
 * for earliest the DOM is set to 1 for latest the DOM is set to the last day of the
 * month. Note that if this is truthy then {@link getPeriodEarliestYMDDate}
 * and {@link getPeriodLatestYMDDate} will both return the same date.
 */

/**
 * @typedef {object} DateRangePeriod~QUARTEROptions
 * @property {boolean} [keepDOM=false] If truthy then this is treated similar
 * to {@link DateRange#MONTH} with keepDOM also set, except the offset, if given,
 * is multiplied by 3.
 */

/**
 * @typedef {object} DateRangePeriod~HALFOptions
 * @property {boolean} [keepDOM=false] If truthy then this is treated similar
 * to {@link DateRange#MONTH} with keepDOM also set, except the offset, if given,
 * is multiplied by 6.
 */

/**
 * @typedef {object} DateRangePeriod~YEAROptions
 * @property {boolean} [keepDOM=false] If truthy then this is treated similar
 * to {@link DateRange#MONTH} with keepDOM also set, except the offset, if given,
 * is multiplied by 12.
 */

/**
 * The date range periods, with the exception of DAY they correspond
 * to typical accounting periods.
 * @readonly
 * @enum {DateRangePeriod~PeriodTypeDef}
 * @property {DateRangePeriod~PeriodTypeDef} DAY
 * @property {DateRangePeriod~PeriodTypeDef} WEEK The date retrieval functions
 * support an optional {@link DateRangePeriod~WEEKOptions} arg to support specifying
 * which day of the week is the start of the week.
 * @property {DateRangePeriod~PeriodTypeDef} MONTH The date retrieval functions
 * support an optional {@link DateRangePeriod~MONTHOptions} arg.
 * @property {DateRangePeriod~PeriodTypeDef} QUARTER The date retrieval functions
 * support an optional {@link DateRangePeriod~QUARTEROptions} arg.
 * @property {DateRangePeriod~PeriodTypeDef} HALF The date retrieval functions
 * support an optional {@link DateRangePeriod~HALFOptions} arg.
 * @property {DateRangePeriod~PeriodTypeDef} YEAR The date retrieval functions
 * support an optional {@link DateRangePeriod~YEAROptions} arg.
 * @name DateRangePeriod#PeriodType
*/
export const PeriodType = {
    DAY: { name: 'DAY',
        getEarliestYMDDate: getEarliestYMDDateDAY,
        getLatestYMDDate: getLatestYMDDateDAY,
    },

    WEEK: { name: 'WEEK',
        getEarliestYMDDate: getEarliestYMDDateWEEK,
        getLatestYMDDate: getLatestYMDDateWEEK,
    },

    MONTH: { name: 'MONTH',
        getEarliestYMDDate: getEarliestYMDDateMONTH,
        getLatestYMDDate: getLatestYMDDateMONTH,
    },

    QUARTER: { name: 'QUARTER',
        getEarliestYMDDate: getEarliestYMDDateQUARTER,
        getLatestYMDDate: getLatestYMDDateQUARTER,
    },

    HALF: { name: 'HALF',
        getEarliestYMDDate: getEarliestYMDDateHALF,
        getLatestYMDDate: getLatestYMDDateHALF,
    },

    YEAR: { name: 'YEAR',
        getEarliestYMDDate: getEarliestYMDDateYEAR,
        getLatestYMDDate: getLatestYMDDateYEAR,
    },
};

/**
 * Retrieves a {@link DateRangePeriod#PeriodType} from a string.
 * @param {DateRangePeriod#PeriodType|string} periodType 
 * @returns {DateRangePeriod#PeriodType}
 */
export function getPeriodType(periodType) {
    return (typeof periodType === 'string') ? PeriodType[periodType] : periodType;
}

/**
 * Retrieves a string representation of a {@link DateRangePeriod#PeriodType} item.
 * @param {DateRangePeriod#PeriodType|string} periodType 
 * @returns {string}
 */
export function getPeriodTypeName(periodType) {
    return (typeof periodType === 'object') ? periodType.name : periodType;
}


function getEarliestYMDDateDAY(ymdDate, offset) {
    if (offset) {
        return ymdDate.addDays(offset);
    }
    return ymdDate;
}

function getEarliestYMDDateWEEK(ymdDate, offset, options) {
    let weekStart;
    if (options) {
        weekStart = options.weekStart;
    }

    if ((typeof weekStart !== 'number')
     || (weekStart < 0) || (weekStart > 6)) {
        weekStart = 0;
    }

    if (offset) {
        ymdDate = ymdDate.addDays(offset * 7);
    }

    let dayOfWeek = ymdDate.getDayOfWeek();
    if (dayOfWeek !== weekStart) {
        let deltaDays = weekStart - dayOfWeek;
        if (deltaDays > 0) {
            deltaDays -= 7;
        }
        return ymdDate.addDays(deltaDays);
    }

    return ymdDate;
}

function getEarliestYMDDateMONTH(ymdDate, offset, options) {
    if (!options || !options.keepDOM) {
        const dom = ymdDate.getDOM();
        if (dom > 1) {
            ymdDate = new YMDDate(ymdDate.getFullYear(), 
                ymdDate.getMonth(), 
                1);
        }
    }
    if (offset) {
        return ymdDate.addMonths(offset);
    }
    return ymdDate;
}

function getEarliestYMDDateQUARTER(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getEarliestYMDDateMONTH(ymdDate, (offset || 0) * 3, options);
    }

    const dom = ymdDate.getDOM();
    
    let month = ymdDate.getMonth();
    if ((dom !== 1) || (month % 3)) {
        month = Math.floor(month / 3) * 3;
        ymdDate = new YMDDate(ymdDate.getFullYear(), month, 1);
    }
    if (offset) {
        return ymdDate.addMonths(offset * 3);
    }
    return ymdDate;
}

function getEarliestYMDDateHALF(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getEarliestYMDDateMONTH(ymdDate, (offset || 0) * 6, options);
    }

    const dom = ymdDate.getDOM();
    let month = ymdDate.getMonth();
    if ((dom !== 1) || (month % 6)) {
        month = Math.floor(month / 6) * 6;
        ymdDate = new YMDDate(ymdDate.getFullYear(), month, 1);
    }
    if (offset) {
        return ymdDate.addMonths(offset * 6);
    }
    return ymdDate;
}

function getEarliestYMDDateYEAR(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getEarliestYMDDateMONTH(ymdDate, (offset || 0) * 12, options);
    }

    const dom = ymdDate.getDOM();
    const month = ymdDate.getMonth();
    if ((dom !== 1) || (month !== 0) || offset) {
        return new YMDDate(ymdDate.getFullYear() + (offset || 0), 0, 1);
    }
    return ymdDate;
}


function resolveArgs(...args) {
    if (args.length === 1) {
        return args[0];
    }
    else if (args.length) {
        return {
            periodType: args[0],
            ymdDate: args[1],
            offset: args[2],
            options: args[3],
        };
    }
    return {};
}


/**
 * @typedef {object} DateRangePeriod~PeriodArgs
 * @property {DateRangePeriod~PeriodTypeDef|string} periodType 
 * @property {YMDDate|string} [ymdDate] The reference date, if undefined 
 * today will be used.
 * @property {*} [options] Options specific to the period type.
 * @property {number} [offset=0] Number of periods to offset from the period
 * containing ymdDate.
 */

/**
 * Retrieves the earliest date of the period that contains a date.
 * <p>The arguments may either be a single {@link DateRangePeriod~PeriodArgs}
 * or the following:
 * @param {DateRangePeriod~PeriodTypeDef|string} periodType 
 * @param {YMDDate|string} [ymdDate] The reference date, if undefined 
 * today will be used.
 * @param {number} [offset=0] Number of periods to offset from the period
 * containing ymdDate.
 * @param {*} options Options specific to the period type.
 * @returns {YMDDate|string} This will be a string if ymdDate was a string.
 * @function DateRangePeriod#getPeriodEarliestYMDDate
 */
export function getPeriodEarliestYMDDate(...args) {
    let { periodType, ymdDate, options, offset } = resolveArgs(...args);

    periodType = getPeriodType(periodType);
    if (!periodType || !periodType.getEarliestYMDDate) {
        return ymdDate;
    }

    const originalRefYMDDate = ymdDate;
    ymdDate = getYMDDate(ymdDate) || new YMDDate();

    const result = periodType.getEarliestYMDDate(ymdDate, offset, options);
    if (typeof originalRefYMDDate === 'string') {
        return getYMDDateString(result);
    }
    return result;
}


function getLatestYMDDateDAY(ymdDate, offset) {
    if (offset) {
        return ymdDate.addDays(offset);
    }
    return ymdDate;
}

function getLatestYMDDateWEEK(ymdDate, offset, options) {
    let weekStart;
    if (options) {
        weekStart = options.weekStart;
    }

    if ((typeof weekStart !== 'number')
     || (weekStart < 0) || (weekStart > 6)) {
        weekStart = 0;
    }
    const weekEnd = (weekStart + 6) % 7;

    if (offset) {
        ymdDate = ymdDate.addDays(offset * 7);
    }

    let dayOfWeek = ymdDate.getDayOfWeek();
    if (dayOfWeek !== weekEnd) {
        let deltaDays = weekEnd - dayOfWeek;
        if (deltaDays < 0) {
            deltaDays += 7;
        }
        return ymdDate.addDays(deltaDays);
    }

    return ymdDate;
}

function getLatestYMDDateMONTH(ymdDate, offset, options) {
    if (offset) {
        ymdDate = ymdDate.addMonths(offset);
    }

    if (!options || !options.keepDOM) {
        const lastDOM = ymdDate.getLastDateOfMonth();
        const dom = ymdDate.getDOM();
        if (dom !== lastDOM) {
            ymdDate = new YMDDate(ymdDate.getFullYear(), 
                ymdDate.getMonth(), 
                lastDOM);
        }
    }
    return ymdDate;
}

function getLatestYMDDateQUARTER(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getLatestYMDDateMONTH(ymdDate, (offset || 0) * 3, options);
    }

    if (offset) {
        ymdDate = ymdDate.addMonths(offset * 3);
    }

    let lastDOM = ymdDate.getLastDateOfMonth();
    const dom = ymdDate.getDOM();
    let month = ymdDate.getMonth();
    if ((dom !== lastDOM) || ((month % 3) !== 2)) {
        const newMonth = Math.floor(month / 3) * 3 + 2;
        if (newMonth !== month) {
            // If the month changes we need to use the last day of the month 
            // of the new month.
            ymdDate = new YMDDate(ymdDate.getFullYear(), newMonth, 1);
            lastDOM = ymdDate.getLastDateOfMonth();
        }
        ymdDate = new YMDDate(ymdDate.getFullYear(), newMonth, lastDOM);
    }

    return ymdDate;
}

function getLatestYMDDateHALF(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getLatestYMDDateMONTH(ymdDate, (offset || 0) * 6, options);
    }
    
    if (offset) {
        ymdDate = ymdDate.addMonths(offset * 6);
    }

    let lastDOM = ymdDate.getLastDateOfMonth();
    const dom = ymdDate.getDOM();
    let month = ymdDate.getMonth();
    if ((dom !== lastDOM) || ((month % 6) !== 5)) {
        const newMonth = Math.floor(month / 6) * 6 + 5;
        if (newMonth !== month) {
            // If the month changes we need to use the last day of the month 
            // of the new month.
            ymdDate = new YMDDate(ymdDate.getFullYear(), newMonth, 1);
            lastDOM = ymdDate.getLastDateOfMonth();
        }
        ymdDate = new YMDDate(ymdDate.getFullYear(), newMonth, lastDOM);
    }

    return ymdDate;
}

function getLatestYMDDateYEAR(ymdDate, offset, options) {
    if (options && options.keepDOM) {
        return getLatestYMDDateMONTH(ymdDate, (offset || 0) * 12, options);
    }
    
    const dom = ymdDate.getDOM();
    const month = ymdDate.getMonth();
    if ((dom !== 31) || (month !== 11) || offset) {
        return new YMDDate(ymdDate.getFullYear() + (offset || 0), 11, 31);
    }
    return ymdDate;
}


/**
 * Retrieves the latest date of the period that contains a date.
 * <p>The arguments may either be a single {@link DateRangePeriod~PeriodArgs}
 * or the following:
 * @param {DateRangePeriod~PeriodTypeDef|string} periodType 
 * @param {YMDDate|string} [ymdDate] The reference date, if undefined 
 * today will be used.
 * @param {number} [offset=0] Number of periods to offset from the period
 * containing ymdDate.
 * @param {*} options Options specific to the period type.
 * @returns {YMDDate|string} This will be a string if ymdDate was a string.
 * @function DateRangePeriod#getPeriodLatestYMDDate
 */
export function getPeriodLatestYMDDate(...args) {
    let { periodType, ymdDate, options, offset } = resolveArgs(...args);

    periodType = getPeriodType(periodType);
    if (!periodType || !periodType.getLatestYMDDate) {
        return ymdDate;
    }

    const originalRefYMDDate = ymdDate;
    ymdDate = getYMDDate(ymdDate) || new YMDDate();

    const result = periodType.getLatestYMDDate(ymdDate, offset, options);
    if (typeof originalRefYMDDate === 'string') {
        return getYMDDateString(result);
    }
    return result;
}


/**
 * Retrieves a {@link YMDDateRange} representing the period that contains a date.
 * <p>The arguments may either be a single {@link DateRangePeriod~PeriodArgs}
 * or the following:
 * @param {DateRangePeriod~PeriodTypeDef|string} periodType 
 * @param {YMDDate|string} [ymdDate] The reference date, if undefined 
 * today will be used.
 * @param {number} [offset=0] Number of periods to offset from the period
 * containing ymdDate.
 * @param {*} options Options specific to the period type.
 * @returns {YMDDateRange|YMDDateRangeDataItem} This will be a 
 * {@link YMDDateRangeDataItem} if ymdDate is a string.
 * @function DateRangePeriod#getPeriodYMDDateRange
 */
export function getPeriodYMDDateRange(...args) {
    let { periodType, ymdDate, options, offset } = resolveArgs(...args);

    periodType = getPeriodType(periodType);
    if (!periodType || !periodType.getLatestYMDDate) {
        return ymdDate;
    }

    const originalRefYMDDate = ymdDate;
    ymdDate = getYMDDate(ymdDate) || new YMDDate();

    const result = {
        earliestYMDDate: periodType.getEarliestYMDDate(ymdDate, offset, options),
        latestYMDDate: periodType.getLatestYMDDate(ymdDate, offset, options),
    };
    if (typeof originalRefYMDDate === 'string') {
        return getYMDDateRangeDataItem(result);
    }
    return result;
}
