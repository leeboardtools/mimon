import { getYMDDate, getYMDDateString, YMDDate } from './YMDDate';
import { userError } from './UserMessages';


/**
 * Calculates the next repeat date for a given number of days to repeat.
 * @param {YMDDate} afterYMDDate  The date the next repetition is calculated from.
 * @param {number}  dayCount   The number of days to offset.
 * @param {WeeklyOffset} startYMDDate   The start date for the weekly offset.
 */
function nextDailyOffsetYMDDate(afterYMDDate, dayCount, startYMDDate) {
    let deltaDays = startYMDDate.daysAfterMe(afterYMDDate);
    if (deltaDays < 0) {
        return startYMDDate;
    }

    const result = deltaDays / dayCount;
    let nextOffset = Math.ceil(result) * dayCount;
    if (nextOffset === deltaDays) {
        nextOffset += dayCount;
    }

    return startYMDDate.addDays(nextOffset);
}



/**
 * @typedef {object} WeeklyOffset
 * @property {number}  dayOfWeek   The day of the week, 0 is Sunday.
 */

/**
 * Validates a weekly offset.
 * @param {WeeklyOffset} offset 
 * @returns {undefined|Error}   Returns <code>undefined</code> if valid, an
 * appropriate error if not.
 */
export function validateWeeklyOffset(offset) {
    if (offset) {
        const { dayOfWeek } = offset;
        if ((typeof dayOfWeek === 'number')
         && (dayOfWeek >= 0) && (dayOfWeek <= 6)) {
            return;
        }
    }
    return userError('Repeats-weekly_offset_dayOfWeek_invalid');
}

/**
 * Calculates the next repeat date 
 * @param {WeeklyOffset} weeklyOffset
 * @param {YMDDate} afterYMDDate  The date the next repetition is calculated from.
 * @param {number}  weekCount   The number of weeks to offset.
 * @param {WeeklyOffset} startYMDDate   The start date for the weekly offset.
 */
function nextWeeklyOffsetYMDDate(weeklyOffset, afterYMDDate, weekCount, startYMDDate) {
    startYMDDate = getYMDDate(startYMDDate);
    afterYMDDate = getYMDDate(afterYMDDate);

    const { dayOfWeek } = weeklyOffset;
    let dayOfWeekAdjustment = dayOfWeek - startYMDDate.getDayOfWeek();
    if (dayOfWeekAdjustment < 0) {
        dayOfWeekAdjustment += 7;
    }
    startYMDDate = startYMDDate.addDays(dayOfWeekAdjustment);

    return nextDailyOffsetYMDDate(afterYMDDate, weekCount * 7, startYMDDate);
}


/**
 * @typedef {object} MonthOffsetTypeDef
 * @property {string}   name    The indentifying name of the month offset.
 */

/**
 * The types of month offsets.
 * @readonly
 * @enum {MonthOffsetType}
 * @property {MonthOffsetTypeDef}   NTH_DAY If the offset is > 0 then the
 * n'th day of the month (1 is the first day of the month), otherwise the
 * n'th day from the last day of the month (0 is the last day of the month).
 * @property {MonthOffsetTypeDef}   NTH_WEEK If the offset is > 0 then the
 * n'th week of the month (1 is the first week of the month), otherwise
 * the n'th week from the last week of the month (0 is the last week of the month).
 */
export const MonthOffsetType = {
    NTH_DAY: { name: 'NTH_DAY', 
        validate: validateMonthNTH_DAY, 
        nextYMDDate: nextYMDDateMonthNTH_DAY,
    },
    NTH_WEEK: { name: 'NTH_WEEK', 
        validate: validateMonthNTH_WEEK, 
        nextYMDDate: nextYMDDateMonthNTH_WEEK,
    },
};

//
//---------------------------------------------------------
function validateMonthNTH_DAY(monthlyOffset) {
    const { offset } = monthlyOffset;
    if ((typeof offset !== 'number') || (offset >= 31) || (offset <= -31)) {
        return userError('Repeats-month_NTH_DAY_offset_invalid');
    }
}


//
//---------------------------------------------------------
function calcMonthlyOffsetNextYMDDate(afterYMDDate, monthsPeriod, startYMDDate, 
    domCallback) {
    // Adjust startYMDDate as needed so it has a valid DOM.
    const adjustedStartYMDDate = domCallback(startYMDDate);
    if (YMDDate.compare(startYMDDate, adjustedStartYMDDate) > 0) {
        startYMDDate = adjustedStartYMDDate.addMonths(1);
        startYMDDate = domCallback(startYMDDate);
    }
    else {
        startYMDDate = adjustedStartYMDDate;
    }

    let compare = YMDDate.compare(afterYMDDate, startYMDDate);
    if (compare < 0) {
        return startYMDDate;
    }

    const deltaMonths = startYMDDate.monthsAfterMe(afterYMDDate);
    let periods = Math.floor(deltaMonths / monthsPeriod);

    let ymdDate = startYMDDate.addMonths(periods * monthsPeriod);
    ymdDate = domCallback(ymdDate);

    compare = YMDDate.compare(afterYMDDate, ymdDate);
    if (compare >= 0) {
        ymdDate = ymdDate.addMonths(monthsPeriod);
        ymdDate = domCallback(ymdDate);
    }
    
    return ymdDate;
}


//
//---------------------------------------------------------
function nextYMDDateMonthNTH_DAY(monthlyOffset, afterYMDDate, 
    monthCount, startYMDDate) {
    
    const { offset } = monthlyOffset;
    return calcMonthlyOffsetNextYMDDate(afterYMDDate, monthCount, startYMDDate, 
        (ymdDate) => {
            let dom = ymdDate.getLastDateOfMonth();
            if (offset > 0) {
                dom = Math.min(offset, dom);
            }
            else {
                dom = Math.max(dom + offset, 1);
            }
            return new YMDDate(ymdDate.getFullYear(), ymdDate.getMonth(), dom);
        });
}


//
//---------------------------------------------------------
function validateMonthNTH_WEEK(monthlyOffset) {
    const { offset } = monthlyOffset;
    if ((typeof offset !== 'number') || (offset >= 5) || (offset <= -5)) {
        return userError('Repeats-month_NTH_WEEK_offset_invalid');
    }

    return validateWeeklyOffset(monthlyOffset);
}


//
//---------------------------------------------------------
function nextYMDDateMonthNTH_WEEK(monthlyOffset, afterYMDDate, 
    monthCount, startYMDDate) {

    const { offset, dayOfWeek } = monthlyOffset;
    return calcMonthlyOffsetNextYMDDate(afterYMDDate, monthCount, startYMDDate, 
        (ymdDate) => {
            const lastDOM = ymdDate.getLastDateOfMonth();
            let dom;
            if (offset > 0) {
                const firstOfMonth = new YMDDate(ymdDate.getFullYear(), 
                    ymdDate.getMonth(), 1);
                const firstDayOfWeek = firstOfMonth.getDayOfWeek();
                dom = 1;
                if (firstDayOfWeek < dayOfWeek) {
                    dom += dayOfWeek - firstDayOfWeek;
                }
                else if (firstDayOfWeek > dayOfWeek) {
                    dom += 7 + dayOfWeek - firstDayOfWeek;
                }

                // 1 is the first week...
                dom += (offset - 1) * 7;
                while (dom > lastDOM) {
                    dom -= 7;
                }
            }
            else {
                const lastOfMonth = new YMDDate(ymdDate.getFullYear(), 
                    ymdDate.getMonth(), lastDOM);
                const lastDayOfWeek = lastOfMonth.getDayOfWeek();
                dom = lastDOM;
                if (lastDayOfWeek < dayOfWeek) {
                    dom -= 7 + lastDayOfWeek - dayOfWeek;
                }
                else if (lastDayOfWeek > dayOfWeek) {
                    dom -= lastDayOfWeek - dayOfWeek;
                }

                // 0 is the last week...
                dom += offset * 7;
                while (dom < 1) {
                    dom += 7;
                }
            }
            return new YMDDate(ymdDate.getFullYear(), ymdDate.getMonth(), dom);
        });
        
}



/**
 * @param {(string|MonthOffsetTypeDef)} ref 
 * @returns {MonthOffsetTypeDef}    Returns the {@link MonthOffsetTypeDef} 
 * represented by ref.
 */
export function getMonthOffsetType(ref) {
    return (typeof ref === 'string') ? MonthOffsetType[ref] : ref;
}

/**
 * @param {(string|MonthOffsetTypeDef)} ref 
 * @returns {string}    Returns the name property of the {@link MonthOffsetTypeDef} 
 * represented by ref.
 */
export function getMonthOffsetTypeName(ref) {
    return ((ref === undefined) || (typeof ref === 'string')) ? ref : ref.name;
}


/**
 * @typedef {object} MonthlyOffset
 * @property {string} type    The name property of the type of monthly offset,
 * one of {@link MonthlyOffsetType}.
 * @property {number}   offset  The offset value, depends upon type.
 * @property {number}   [dayOfWeek] The day of the week for the
 * NTH_WEEK type. This along with the offset value may be interpreted
 * along the lines of 'second Tuesday' or 'last Thursday'.
 */


/**
 * Retrieves a {@link MonthlyOffset} representation of a {@link MonthlyOffsetDataItem}
 * @param {(MonthlyOffsetDataItem|MonthlyOffset)} monthlyOffsetDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {MonthlyOffset}
 */
export function getMonthlyOffset(monthlyOffsetDataItem, alwaysCopy) {
    if (monthlyOffsetDataItem) {
        const type = getMonthOffsetType(monthlyOffsetDataItem.type);
        if (alwaysCopy || (type !== monthlyOffsetDataItem.type)) {
            monthlyOffsetDataItem = Object.assign({}, monthlyOffsetDataItem);
            monthlyOffsetDataItem.type = type;
            return monthlyOffsetDataItem;
        }
    }
    return monthlyOffsetDataItem;
}

/**
 * Retrieves a {@link MonthlyOffsetDataItem} representation of a {@link MonthlyOffset}.
 * @param {(MonthlyOffset|MonthlyOffsetDataItem)} monthlyOffset 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {MonthlyOffsetDataItem}
 */
export function getMonthlyOffsetDataItem(monthlyOffset, alwaysCopy) {
    if (monthlyOffset) {
        const type = getMonthOffsetTypeName(monthlyOffset.type);
        if (alwaysCopy || (type !== monthlyOffset.type)) {
            monthlyOffset = Object.assign({}, monthlyOffset);
            monthlyOffset.type = type;
            return monthlyOffset;
        }
    }
    return monthlyOffset;
}


/**
 * Validates a {@link MonthlyOffset}
 * @param {MonthlyOffset} monthlyOffset 
 * @returns {undefined|Error}   Returns <code>undefined</code> if valid,
 * an Error otherwise.
 */
export function validateMonthlyOffset(monthlyOffset) {
    const type = getMonthOffsetType(monthlyOffset.type);
    if (type) {
        return type.validate(monthlyOffset);
    }

    return userError('Repeats-monthly_offset_type_missing');
}


//
//---------------------------------------------------------
function nextMonthlyOffsetYMDDate(monthlyOffset, afterYMDDate, monthCount, startYMDDate) {
    const type = getMonthOffsetType(monthlyOffset.type);
    if (!type) {
        throw userError('Repeats-monthly_offset_type_missing');
    }

    startYMDDate = getYMDDate(startYMDDate);
    return type.nextYMDDate(monthlyOffset, afterYMDDate, monthCount, startYMDDate);
}


/**
 * @typedef {object} YearOffsetTypeDef
 * @property {string}   name    The indentifying name of the month offset.
 */

/**
 * The types of yearly offsets.
 * @readonly
 * @enum {YearOffsetTypeDef}
 * @property {YearOffsetTypeDef}    NTH_DAY If the offset is > 0 then the
 * n'th day of the year (1 is January 1), otherwise the
 * n'th day from the last day of the year (0 is December 31).
 * If a month property is present then the days are relative to the specified
 * month, which is 0 based (0 is January).
 * @property {YearOffsetTypeDef}    NTH_WEEK If the offset is > 0 then the
 * n'th week of the year (1 is the first week of the year), otherwise
 * the n'th week from the last week of the year (0 is the last week of the year).
 * If a month property is present then the days are relative to the specified
 * month, which is 0 based (0 is January).
 */
export const YearOffsetType = {
    NTH_DAY: { name: 'NTH_DAY', 
        validate: validateYearNTH_DAY, 
        nextYMDDate: nextYMDDateYearNTH_DAY,
    },
    NTH_WEEK: { name: 'NTH_WEEK', 
        validate: validateYearNTH_WEEK,
        nextYMDDate: nextYMDDateYearNTH_WEEK,
    },
};


//
//---------------------------------------------------------
function calcYearlyOffsetNextYMDDate(afterYMDDate, yearsPeriod, startYMDDate, 
    yearCallback) {
    // Adjust startYMDDate as needed so it has a valid DOM.
    let year = startYMDDate.getFullYear();
    const adjustedStartYMDDate = yearCallback(year);
    if (YMDDate.compare(startYMDDate, adjustedStartYMDDate) > 0) {
        startYMDDate = adjustedStartYMDDate.addYears(1);
        startYMDDate = yearCallback(year);
    }
    else {
        startYMDDate = adjustedStartYMDDate;
    }

    let compare = YMDDate.compare(afterYMDDate, startYMDDate);
    if (compare < 0) {
        return startYMDDate;
    }

    const deltaYears = afterYMDDate.getFullYear() - startYMDDate.getFullYear();
    let periods = Math.floor(deltaYears / yearsPeriod);

    year = startYMDDate.getFullYear() + periods * yearsPeriod;
    let ymdDate = yearCallback(year);

    compare = YMDDate.compare(afterYMDDate, ymdDate);
    if (compare >= 0) {
        ymdDate = yearCallback(year + yearsPeriod);
    }
    
    return ymdDate;
}

//
//---------------------------------------------------------
function validateYearNTH_DAY(yearlyOffset) {
    const { offset, month } = yearlyOffset;

    if (typeof offset !== 'number') {
        return userError('Repeats-year_NTH_DAY_offset_invalid');
    }

    if (month !== undefined) {        
        if ((month < 0) || (month >= 12)) {
            return userError('Repeats-year_NTH_DAY_month_invalid');
        }
        if ((offset < -31) || (offset > 31)) {
            return userError('Repeats-year_NTH_DAY_offset_invalid');
        }
    }
    else {
        if ((offset < -365) || (offset > 365)) {
            return userError('Repeats-year_NTH_DAY_offset_invalid');
        }
    }
}

//
//---------------------------------------------------------
function nextYMDDateYearNTH_DAY(yearlyOffset, afterYMDDate, 
    yearCount, startYMDDate) {
    const { offset } = yearlyOffset;
    let { month } = yearlyOffset;
    let isMonth;
    if (month === undefined) {
        month = (offset > 0) ? 0 : 11;
        isMonth = false;
    }
    else {
        isMonth = true;
    }

    return calcYearlyOffsetNextYMDDate(afterYMDDate, yearCount, startYMDDate, 
        (year) => {
            if (offset > 0) {
                const firstYMDDate = new YMDDate(year, month, 1);
                let ymdDate = firstYMDDate.addDays(offset - 1);

                if (isMonth) {
                    if (ymdDate.getMonth() !== month) {
                        ymdDate = new YMDDate(year, month, 
                            firstYMDDate.getLastDateOfMonth());
                    }
                }

                if (ymdDate.getFullYear() > year) {
                    return new YMDDate(year, 11, 31);
                }
                return ymdDate;
            }
            else {
                const lastDateOfMonth = new YMDDate(year, month, 1).getLastDateOfMonth();
                let ymdDate = new YMDDate(year, month, lastDateOfMonth).addDays(offset);

                if (isMonth) {
                    if (ymdDate.getMonth() !== month) {
                        ymdDate = new YMDDate(year, month, 1);
                    }
                }

                if (ymdDate.getFullYear() < year) {
                    return new YMDDate(year, 0, 1);
                }
                return ymdDate;
            }
        });
}


//
//---------------------------------------------------------
function validateYearNTH_WEEK(yearlyOffset) {
    const { offset, month, dayOfWeek } = yearlyOffset;
    if (typeof offset !== 'number') {
        return userError('Repeats-year_NTH_WEEK_offset_invalid');
    }

    if (month !== undefined) {
        if ((month < 0) || (month >= 12)) {
            return userError('Repeats-year_NTH_WEEK_month_invalid');
        }
        if ((offset < -5) || (offset > 5)) {
            return userError('Repeats-year_NTH_WEEK_offset_invalid');
        }
    }
    else {
        if ((offset < -52) || (offset > 52)) {
            return userError('Repeats-year_NTH_WEEK_offset_invalid');
        }
    }

    if ((dayOfWeek === undefined) || (dayOfWeek < 0) || (dayOfWeek >= 7)) {
        return userError('Repeats-year_NTH_WEEK_dayOfWeek_invalid');
    }
}

//
//---------------------------------------------------------
function nextYMDDateYearNTH_WEEK(yearlyOffset, afterYMDDate, 
    yearCount, startYMDDate) {
    const { offset, dayOfWeek, } = yearlyOffset;
    let { month } = yearlyOffset;
    let isMonth;
    if (month === undefined) {
        month = (offset > 0) ? 0 : 11;
        isMonth = false;
    }
    else {
        isMonth = true;
    }

    return calcYearlyOffsetNextYMDDate(afterYMDDate, yearCount, startYMDDate, 
        (year) => {
            if (offset >= 0) {
                let firstOfYear = new YMDDate(year, month, 1);
                let dayOfWeekAdjustment = dayOfWeek - firstOfYear.getDayOfWeek();
                if (dayOfWeekAdjustment < 0) {
                    dayOfWeekAdjustment += 7;
                }

                let ymdDate = firstOfYear.addDays(
                    dayOfWeekAdjustment + (offset - 1) * 7);
                
                if (isMonth) {
                    const lastOfMonth = new YMDDate(year, month, 
                        firstOfYear.getLastDateOfMonth());
                    if (YMDDate.compare(ymdDate, lastOfMonth) > 0) {
                        ymdDate = lastOfMonth;
                    }
                }

                if (ymdDate.getFullYear() > year) {
                    return new YMDDate(year, 11, 31);
                }
                return ymdDate;
            }
            else {
                const lastDateOfMonth = new YMDDate(year, month, 1).getLastDateOfMonth();
                const lastOfYear = new YMDDate(year, month, lastDateOfMonth);
                let dayOfWeekAdjustment = dayOfWeek - lastOfYear.getDayOfWeek();
                if (dayOfWeekAdjustment > 0) {
                    dayOfWeekAdjustment -= 7;
                }
                let ymdDate = lastOfYear.addDays(dayOfWeekAdjustment + offset * 7);
                if (isMonth) {
                    if (ymdDate.getMonth() !== month) {
                        ymdDate = new YMDDate(year, month, 1);
                    }
                }
                if (ymdDate.getFullYear() < year) {
                    return new YMDDate(year, 0, 1);
                }
                return ymdDate;
            }
        });
}



/**
 * @param {(string|YearOffsetTypeDef)} ref 
 * @returns {YearOffsetTypeDef}    Returns the {@link YearOffsetTypeDef} 
 * represented by ref.
 */
export function getYearOffsetType(ref) {
    return (typeof ref === 'string') ? YearOffsetType[ref] : ref;
}

/**
 * @param {(string|YearOffsetTypeDef)} ref 
 * @returns {string}    Returns the name property of the {@link YearOffsetTypeDef} 
 * represented by ref.
 */
export function getYearOffsetTypeName(ref) {
    return ((ref === undefined) || (typeof ref === 'string')) ? ref : ref.name;
}


/**
 * @typedef {object} YearlyOffset
 * @property {YearlyOffsetType} type    The name property of the 
 * type of yearly offset, one of {@link YearOffsetType}.
 * @property {number}    offset  The offset, depends on the type.
 * @property {number}   [month] Optional 0 based month, restricts the offset
 * to a specific month.
 */


/**
 * Retrieves a {@link YearlyOffset} representation of a {@link YearlyOffsetDataItem}
 * @param {(YearlyOffsetDataItem|YearlyOffset)} yearlyOffsetDataItem 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {YearlyOffset}
 */
export function getYearlyOffset(yearlyOffsetDataItem, alwaysCopy) {
    if (yearlyOffsetDataItem) {
        const type = getYearOffsetType(yearlyOffsetDataItem.type);
        if (alwaysCopy || (type !== yearlyOffsetDataItem.type)) {
            yearlyOffsetDataItem = Object.assign({}, yearlyOffsetDataItem);
            yearlyOffsetDataItem.type = type;
            return yearlyOffsetDataItem;
        }
    }
    return yearlyOffsetDataItem;
}

/**
 * Retrieves a {@link YearlyOffsetDataItem} representation of a {@link YearlyOffset}.
 * @param {(YearlyOffset|YearlyOffsetDataItem)} yearlyOffset 
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will 
 * always be created.
 * @returns {YearlyOffsetDataItem}
 */
export function getYearlyOffsetDataItem(yearlyOffset, alwaysCopy) {
    if (yearlyOffset) {
        const type = getYearOffsetTypeName(yearlyOffset.type);
        if (alwaysCopy || (type !== yearlyOffset.type)) {
            yearlyOffset = Object.assign({}, yearlyOffset);
            yearlyOffset.type = type;
            return yearlyOffset;
        }
    }
    return yearlyOffset;
}

/**
 * Validates a {@link YearlyOffset}
 * @param {MonthlyOffset} yearlyOffset 
 * @returns {undefined|Error}   Returns <code>undefined</code> if valid,
 * an Error otherwise.
 */
export function validateYearlyOffset(yearlyOffset) {
    const type = getYearOffsetType(yearlyOffset.type);
    if (type) {
        return type.validate(yearlyOffset);
    }

    return userError('Repeats-yearly_offset_type_missing');
}


//
//---------------------------------------------------------
function nextYearlyOffsetYMDDate(yearlyOffset, afterYMDDate, monthCount, startYMDDate) {
    const type = getYearOffsetType(yearlyOffset.type);
    if (!type) {
        throw userError('Repeats-yearly_offset_type_missing');
    }

    startYMDDate = getYMDDate(startYMDDate);
    return type.nextYMDDate(yearlyOffset, afterYMDDate, monthCount, startYMDDate);
}


/**
 * @typedef {object} RepeatTypeDef
 * @property {string}   name    The identifying name of the repeat type.
 * @property {string}   description The user description of the account class.
 */

/**
 * The types of repeating.
 * @readonly
 * @enum {RepeatTypeDef}
 * @property {RepeatTypeDef} DAILY  Repeats on a daily or number of days basis.
 * The period property is the number of days until the next repeat, a value of 1 
 * indicates repeat daily. The offset property is not used.
 * @property {RepeatTypeDef} WEEKLY Repeats on a weekly or number of weeks basis.
 * The offset property is a {@link WeeklyOffset}.
 * @property {RepeatTypeDef} MONTHLY    Repeats on a monthly or number of months basis.
 * The offset property is a {@link MonthlyOffset}.
 * @property {RepeatTypeDef} YEARLY   Repeats on a year or number of years basis.
 * The offset property is a {@link YearlyOffset}.
 */
export const RepeatType = {
    DAILY: { name: 'DAILY', 
        validate: validateDaily, 
        nextRepeatYMDDate: nextDailyRepeatYMDDate, 
        getOffset: getDailyOffset,
        getOffsetDataItem: getDailyOffsetDataItem,
    },
    WEEKLY: { name: 'WEEKLY', 
        validate: validateWeekly,
        nextRepeatYMDDate: nextWeeklyRepeatYMDDate, 
        getOffset: getWeeklyOffset,
        getOffsetDataItem: getWeeklyOffsetDataItem,
    },
    MONTHLY: { name: 'MONTHLY', 
        validate: validateMonthly,
        nextRepeatYMDDate: nextMonthlyRepeatYMDDate, 
        getOffset: getMonthlyOffset,
        getOffsetDataItem: getMonthlyOffsetDataItem,
    },
    YEARLY: { name: 'YEARLY', 
        validate: validateYearly,
        nextRepeatYMDDate: nextYearlyRepeatYMDDate, 
        getOffset: getYearlyOffset,
        getOffsetDataItem: getYearlyOffsetDataItem,
    },
};




//
//---------------------------------------------------------
function validateDaily(definition) {
    // No validation needed, the period is already validated.
}

//
//---------------------------------------------------------
function nextDailyRepeatYMDDate(definition, afterYMDDate) {
    return nextDailyOffsetYMDDate(afterYMDDate, definition.period, 
        definition.startYMDDate);
}

//
//---------------------------------------------------------
function getDailyOffset(offsetDataItem, alwaysCopy) {
    return (alwaysCopy && (typeof offsetDataItem === 'object')) 
        ? Object.assign({}, offsetDataItem) : offsetDataItem;
}

//
//---------------------------------------------------------
function getDailyOffsetDataItem(offset, alwaysCopy) {
    return (alwaysCopy && (typeof offset === 'object')) 
        ? Object.assign({}, offset) : offset;
}


//
//---------------------------------------------------------
function validateWeekly(definition) {
    return validateWeeklyOffset(definition.offset);
}

//
//---------------------------------------------------------
function nextWeeklyRepeatYMDDate(definition, afterYMDDate) {
    return nextWeeklyOffsetYMDDate(definition.offset, afterYMDDate, 
        definition.period, definition.startYMDDate);
}

//
//---------------------------------------------------------
function getWeeklyOffset(offsetDataItem, alwaysCopy) {
    return (alwaysCopy && (typeof offsetDataItem === 'object')) 
        ? Object.assign({}, offsetDataItem) : offsetDataItem;
}

//
//---------------------------------------------------------
function getWeeklyOffsetDataItem(offset, alwaysCopy) {
    return (alwaysCopy && (typeof offset === 'object')) 
        ? Object.assign({}, offset) : offset;
}


//
//---------------------------------------------------------
function validateMonthly(definition) {
    if (!definition.offset) {
        return userError('Repeats-monthly_offset_type_missing');
    }
    return validateMonthlyOffset(definition.offset);
}

//
//---------------------------------------------------------
function nextMonthlyRepeatYMDDate(definition, afterYMDDate) {
    return nextMonthlyOffsetYMDDate(definition.offset, afterYMDDate, 
        definition.period, definition.startYMDDate);
}


//
//---------------------------------------------------------
function validateYearly(definition) {
    if (!definition.offset) {
        return userError('Repeats-yearly_offset_type_missing');
    }
    return validateYearlyOffset(definition.offset);
}

//
//---------------------------------------------------------
function nextYearlyRepeatYMDDate(definition, afterYMDDate) {
    return nextYearlyOffsetYMDDate(definition.offset, afterYMDDate, 
        definition.period, definition.startYMDDate);
}



/**
 * @param {(string|RepeatTypeDef)} ref 
 * @returns {RepeatTypeDef}    Returns the {@link RepeatTypeDef} represented by ref.
 */
export function getRepeatType(ref) {
    return (typeof ref === 'string') ? RepeatType[ref] : ref;
}

export function getRepeatTypeName(type) {
    return ((type === undefined) || (typeof type === 'string')) ? type : type.name;
}


/**
 * @typedef {object}    RepeatDefinition
 * @property {RepeatType}   type    The repeat type.
 * @property {number}   period  The period between repetitions, defined by the type.
 * @property {number|WeeklyOffset|MonthlyOffset|YearlyOffset}   offset
 * Defines when in the repeat type the repetition occurs.
 * @property {YMDDate}  startYMDDate   The starting date for the repetition,
 * this serves as the reference poit.
 * @property {YMDDate}  [finalYMDDate]   Optional final date, repetitions are not
 * performed after this date.
 * @property {number}   [repeatCount]   Optional number of times to repeat.
 */


/**
 * Retrieves a {@link RepeatDefinition} representation of a
 * {@link RepeatDefinitionDataItem}, avoids copying if the arg is already a 
 * {@link RepeatDefinition}
 * @param {(RepeatDefinitionDataItem|RepeatDefinition)} definitionDataItem
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {RepeatDefinition}
 */
export function getRepeatDefinition(definitionDataItem, alwaysCopy) {
    if (definitionDataItem) {
        const type = getRepeatType(definitionDataItem.type);
        let offset;
        if (type) {
            offset = type.getOffset(definitionDataItem.offset, alwaysCopy);
        }
        const startYMDDate = getYMDDate(definitionDataItem.startYMDDate);
        const finalYMDDate = getYMDDate(definitionDataItem.finalYMDDate);
        if (alwaysCopy || (type !== definitionDataItem.type)
         || (offset !== definitionDataItem.offset)
         || (startYMDDate !== definitionDataItem.startYMDDate)
         || (finalYMDDate !== definitionDataItem.finalYMDDate)) {
            definitionDataItem = Object.assign({}, definitionDataItem);
            definitionDataItem.type = type;
            if (offset !== undefined) {
                definitionDataItem.offset = offset;
            }
            if (startYMDDate) {
                definitionDataItem.startYMDDate = startYMDDate;
            }
            if (finalYMDDate) {
                definitionDataItem.finalYMDDate = finalYMDDate;
            }
            return definitionDataItem;
        }
    }
    return definitionDataItem;
}


/**
 * @typedef {object}    RepeatDefinitionDataItem
 * @property {string}   type    The repeat type.
 * @property {number}   period  The period between repetitions, defined by the type.
 * @property {number|WeeklyOffset|MonthlyOffset|YearlyOffset}   offset
 * Defines when in the repeat type the repetition occurs.
 * @property {string}  startYMDDate   The starting date for the repetition,
 * this serves as the reference point.
 * @property {string}  [finalYMDDate]   Optional final date, repetitions are not
 * performed after this date.
 * @property {number}   [repeatCount]   Optional number of times to repeat.
 */


/**
 * Retrieves a {@link RepeatDefinitionDataItem} representation of a
 * {@link RepeatDefinition}, avoids copying if the arg is already a 
 * {@link RepeatDefinitionDataItem}
 * @param {(RepeatDefinitionDataItem|RepeatDefinition)} definition
 * @param {boolean} [alwaysCopy=false]  If <code>true</code> a new object will always 
 * be created.
 * @returns {RepeatDefinitionDataItem}
 */
export function getRepeatDefinitionDataItem(definition, alwaysCopy) {
    if (definition) {
        const type = getRepeatTypeName(definition.type);
        let offset;
        if (type) {
            const typeObject = getRepeatType(definition.type);
            if (typeObject) {
                offset = typeObject.getOffsetDataItem(definition.offset, alwaysCopy);
            }
        }
        const startYMDDate = (definition.startYMDDate)
            ? getYMDDateString(definition.startYMDDate)
            : undefined;
        const finalYMDDate = (definition.finalYMDDate)
            ? getYMDDateString(definition.finalYMDDate)
            : undefined;
        if (alwaysCopy || (type !== definition.type)
         || (offset !== definition.offset)
         || (startYMDDate !== definition.startYMDDate)
         || (finalYMDDate !== definition.finalYMDDate)) {
            definition = Object.assign({}, definition);
            definition.type = type;
            if (offset !== undefined) {
                definition.offset = offset;
            }
            if (startYMDDate) {
                definition.startYMDDate = startYMDDate;
            }
            if (finalYMDDate) {
                definition.finalYMDDate = finalYMDDate;
            }
            return definition;
        }
    }
    return definition;
}


/**
 * Validates a repeat definition.
 * @param {RepeatDefinition|RepeatDefinitionDataItem} definition 
 * @returns {undefined|Error}   Returns <code>undefined</code> if the
 * definition is valid, an Error if not.
 */
export function validateRepeatDefinition(definition) {
    definition = getRepeatDefinition(definition);
    if (!definition.type) {
        return userError('Repeats-validate_type_missing');
    }

    if (!definition.period || (Math.floor(definition.period) <= 0)
     || (typeof definition.period !== 'number')) {
        return userError('Repeats-period_invalid');
    }

    if (!YMDDate.isValidDate(definition.startYMDDate)) {
        return userError('Repeats-start_date_invalid');
    }

    switch (typeof definition.repeatCount) {
    case 'undefined':
    case 'number':
        break;

    default :
        return userError('Repeats-repeatCount_invalid');
    }

    return definition.type.validate(definition);
}


/**
 * Determines the repetition date defined by a repeat definition given
 * a reference date.
 * @param {RepeatDefinition|RepeatDefinitionDataItem} definition 
 * @param {YMDDate|string} afterYMDDate The reference date, the repeat date 
 * immediately following this date, if any, is returned. If this date is
 * before the startYMDDate, then the first valid repeat date on or
 * after startYMDDate is returned.
 * @param {boolean} [appliedCount] If specified, this is checked against the
 * definition's repeatCount property, if present, and if >= to the repeat
 * count <code>undefined</code> is returned.
 * @returns {YMDDate|undefined} The next repeat date, <code>undefined</code>
 * if there is no repeat date following afterYMDDate.
 */
export function getNextRepeatYMDDate(definition, afterYMDDate, appliedCount) {
    definition = getRepeatDefinition(definition);
    if (afterYMDDate === undefined) {
        afterYMDDate = definition.startYMDDate.addDays(-1);
    }

    if ((typeof appliedCount === 'number')
     && (typeof definition.repeatCount === 'number')) {
        if (appliedCount >= definition.repeatCount) {
            return;
        }
    }
    
    afterYMDDate = getYMDDate(afterYMDDate);
    if (definition.finalYMDDate) {
        // We want the date after afterYMDDate, so if afterYMDDate is the last date
        // then there isn't another one.
        if (YMDDate.compare(afterYMDDate, definition.finalYMDDate) >= 0) {
            return;
        }
    }

    const nextYMDDate = definition.type.nextRepeatYMDDate(definition, afterYMDDate);
    if (nextYMDDate) {
        if (definition.finalYMDDate) {
            if (YMDDate.compare(nextYMDDate, definition.finalYMDDate) > 0) {
                return;
            }
        }
        return nextYMDDate;
    }
}
