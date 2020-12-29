import { getYMDDate, getYMDDateString, YMDDate, 
    getMonthNthDayOfWeek, getYearNthDayOfWeek, getYMDDateWithDOM } from './YMDDate';
import { userError } from './UserMessages';


/**
 * @typedef {object} OccurrenceTypeDef
 * @property {string} name
 * @property {boolean} [hasOffset = undefined]
 * @property {boolean} [hasDayOfWeek = undefined]
 * @property {boolean} [isFromEnd = undefined]
 * @property {boolean} [hasSpecificMonth = undefined]
 */

/**
 * The types of specifying date occurances.
 * @readonly
 * @enum {OccurrenceTypeDef}
 * @property {OccurrenceTypeDef} DAY_OF_WEEK Date specified by the day of the week. 
 * The dayOfWeek property of {@link DateOccurrenceDefinition} is used.
 * Only the NO_REPEAT and WEEKLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_OF_MONTH Date specifed by the day of the month.
 * The offset property of {@link DateOccurrenceDefinition} is the offset of the day
 * from the first day of the month (offset 0 is the first day of the month). If the offset
 * would result in a day beyond the end of the month the last day of the month is used.
 * Only the NO_REPEAT, MONTHLY, and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_END_OF_MONTH Date specifed by the number of days
 * from the last day of the month. The offset property of 
 * {@link DateOccurrenceDefinition} is the offset of the day from the last day of
 * the month (offset 0 is the last day of the month). If the offset would result in a day
 * before the first day of the month the first day of the month is used.
 * Only the NO_REPEAT, MONTHLY, and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_OF_MONTH Date specifed as the n'th occurrence of
 * a day of the week in the month (i.e. the 2nd Sunday). The offset and dayOfWeek
 * properties of {@link DateOccurrenceDefinition} are used. The selected date is NOT
 * restricted to fall in the month.
 * Only the NO_REPEAT, MONTHLY, and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_END_OF_MONTH Date specifed as the n'th occurrence 
 * back of a day of the week from the last day of the month (i.e. the second to last 
 * Sunday). The offset and dayOfWeek properties of {@link DateOccurrenceDefinition} 
 * are used. The selected date is NOT restricted to fall in the month.
 * Only the NO_REPEAT, MONTHLY, and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_OF_SPECIFIC_MONTH Date specified in a specific
 * month. The offset and month properties of {@link DateOccurrenceDefinition} are used. 
 * The offset property is the offset from the first day of the specified month (offset
 * 0 is the first day of the month). If the offset would result in a day beyond the end 
 * of the month the last day of the month is used.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_END_OF_SPECIFIC_MONTH Date specified from the end
 * of a specific month. The offset and month properties of 
 * {@link DateOccurrenceDefinition} are used. The offset property is the offset from 
 * the last day of the specified month (offset 0 is the last day of the month). 
 * If the offset would result in a day before the first day of the month then the
 * first day of the month is used.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_OF_SPECIFIC_MONTH Date specified as the n'th 
 * occurrence of a day of the week in a specified month. The offset, dayOfWeek, and
 * month properties of {@link DateOccurrenceDefinition} are used. The selected date
 * is NOT restricted to fall in the month.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_END_OF_SPECIFIC_MONTH Date specified as the n'th 
 * occurrence back of a day of the week from the end of a specified month. The offset, 
 * dayOfWeek, and month properties of {@link DateOccurrenceDefinition} are used. 
 * The selected date is NOT restricted to fall in the month.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_OF_YEAR Date specified as an offset from the
 * first day of the year. The offset property of {@link DateOccurrenceDefinition} is
 * used. Offset of 0 is January 1 of the year.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DAY_END_OF_YEAR Date specified as an offset from the
 * last day of the year. The offset property of {@link DateOccurrenceDefinition} is
 * used. Offset of 0 is December 31 of the year.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_OF_YEAR Date specified as the n'th occurrence of
 * a day of the week from January 1. January 1 is the first occurrence of whatever
 * day of the week it falls on. The offset and dayOfWeek properties of
 * {@link DateOccurrenceDefinition} are used.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} DOW_END_OF_YEAR Date specified as the n'th occurrence of
 * a day of the week before December 31. December 31 is the first occurrence of whatever
 * day of the week it falls on. The offset and dayOfWeek properties of
 * {@link DateOccurrenceDefinition} are used.
 * Only the NO_REPEAT and YEARLY repeat types are supported.
 * @property {OccurrenceTypeDef} ON_DATE Date is specified explicitly. The startYMDDate
 * property of {@link DateOccurrenceDefinition} is used. Unlike the other types,
 * ON_DATE repeat dates are driven by the occurrenceCount property of 
 * {@link DateOccurrenceState} and not by lastOccurrenceYMDDate.
 * All the repeat types are supported.
 */
export const OccurrenceType = {
    DAY_OF_WEEK: { name: 'DAY_OF_WEEK',
        hasDayOfWeek: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'WEEKLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-weekType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_OF_WEEK,
        makeValidOccurrence: makeValid_DAY_OF_WEEK,
    },
    DAY_OF_MONTH: { name: 'DAY_OF_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 30,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'MONTHLY',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-monthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_OF_MONTH,
        makeValidOccurrence: makeValid_DAY_OF_MONTH,
    },
    DAY_END_OF_MONTH: { name: 'DAY_END_OF_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 30,
        isFromEnd: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'MONTHLY',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-monthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_END_OF_MONTH,
        makeValidOccurrence: makeValid_DAY_END_OF_MONTH,
    },
    DOW_OF_MONTH: { name: 'DOW_OF_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 4,
        hasDayOfWeek: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'MONTHLY',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-monthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_OF_MONTH,
        makeValidOccurrence: makeValid_DOW_OF_MONTH,
    },
    DOW_END_OF_MONTH: { name: 'DOW_END_OF_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 4,
        hasDayOfWeek: true,
        isFromEnd: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'MONTHLY',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-monthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_END_OF_MONTH,
        makeValidOccurrence: makeValid_DOW_END_OF_MONTH,
    },
    DAY_OF_SPECIFIC_MONTH: { name: 'DAY_OF_SPECIFIC_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 30,
        hasSpecificMonth: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-specificMonthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_OF_SPECIFIC_MONTH,
        makeValidOccurrence: makeValid_DAY_OF_SPECIFIC_MONTH,
    },
    DAY_END_OF_SPECIFIC_MONTH: { name: 'DAY_END_OF_SPECIFIC_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 30,
        isFromEnd: true,
        hasSpecificMonth: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-specificMonthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_END_OF_SPECIFIC_MONTH,
        makeValidOccurrence: makeValid_DAY_END_OF_SPECIFIC_MONTH,
    },
    DOW_OF_SPECIFIC_MONTH: { name: 'DOW_OF_SPECIFIC_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 4,
        hasDayOfWeek: true,
        hasSpecificMonth: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-specificMonthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_OF_SPECIFIC_MONTH,
        makeValidOccurrence: makeValid_DOW_OF_SPECIFIC_MONTH,
    },
    DOW_END_OF_SPECIFIC_MONTH: { name: 'DOW_END_OF_SPECIFIC_MONTH',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 4,
        hasDayOfWeek: true,
        isFromEnd: true,
        hasSpecificMonth: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-specificMonthType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_END_OF_SPECIFIC_MONTH,
        makeValidOccurrence: makeValid_DOW_END_OF_SPECIFIC_MONTH,
    },
    DAY_OF_YEAR: { name: 'DAY_OF_YEAR',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 365,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-yearType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_OF_YEAR,
        makeValidOccurrence: makeValid_DAY_OF_YEAR,
    },
    DAY_END_OF_YEAR: { name: 'DAY_END_OF_YEAR',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 365,
        isFromEnd: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-yearType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DAY_END_OF_YEAR,
        makeValidOccurrence: makeValid_DAY_END_OF_YEAR,
    },
    DOW_OF_YEAR: { name: 'DOW_OF_YEAR',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 52,
        hasDayOfWeek: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-yearType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_OF_YEAR,
        makeValidOccurrence: makeValid_DOW_OF_YEAR,
    },
    DOW_END_OF_YEAR: { name: 'DOW_END_OF_YEAR',
        hasOffset: true,
        offsetMin: 0,
        offsetMax: 52,
        hasDayOfWeek: true,
        isFromEnd: true,
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'YEARLY',
        ],
        invalidRepeatTypesId: 'DateOccurrences-yearType_invalidRepeatType',
        validate: validateGeneralOccurrenceType,
        getNextYMDDate: getNextYMDDate_DOW_END_OF_YEAR,
        makeValidOccurrence: makeValid_DOW_END_OF_YEAR,
    },
    ON_DATE: { name: 'ON_DATE',
        allowedRepeatTypeNames: [
            'NO_REPEAT',
            'DAILY',
            'WEEKLY',
            'MONTHLY',
            'YEARLY',
        ],
        validate: validateOccurrenceType_ON_DATE,
        getNextYMDDate: getNextYMDDate_ON_DATE,
        makeValidOccurrence: makeValid_ON_DATE,
    },
};

/**
 * 
 * @param {*} type 
 * @returns {OccurrenceType|*}
 */
export function getOccurrenceType(type) {
    return (typeof type === 'string')
        ? OccurrenceType[type]
        : type;
}

/**
 * 
 * @param {*} type 
 * @returns {string|*}
 */
export function getOccurrenceTypeString(type) {
    return (typeof type === 'object')
        ? type.name
        : type;
}


//
//---------------------------------------------------------
//
function validateGeneralOccurrenceType(definition, occurrenceType) {
    if (occurrenceType.hasOffset) {
        const { offset } = definition;
        const offsetMin = occurrenceType.offsetMin || 0;
        const offsetMax = (occurrenceType.offsetMax === undefined)
            ? Number.MAX_SAFE_INTEGER : occurrenceType.offsetMax;
        if ((typeof offset !== 'number')
         || (offset < offsetMin) || (offset > offsetMax)) {
            if (offsetMax === Number.MAX_SAFE_INTEGER) {
                return userError('DateOccurrences-definition_offset_invalid_min', 
                    offsetMin);
            }
            return userError('DateOccurrences-definition_offset_invalid_min_max', 
                offsetMin, offsetMax);
        }
    }

    if (occurrenceType.hasDayOfWeek) {
        const { dayOfWeek } = definition;
        if ((typeof dayOfWeek !== 'number')
         || (dayOfWeek < 0) || (dayOfWeek >= 7)) {
            return userError('DateOccurrences-definition_dayOfWeek_invalid');
        }
    }

    if (occurrenceType.hasSpecificMonth) {
        const { month } = definition;
        if ((typeof month !== 'number')
         || (month < 0) || (month >= 12)) {
            return userError('DateOccurrences-definition_month_invalid');
        }
    }

    const { repeatDefinition } = definition;
    const { allowedRepeatTypeNames } = occurrenceType;
    if (allowedRepeatTypeNames && repeatDefinition) {
        const { repeatType } = repeatDefinition;
        let isFound;
        for (let i = 0; i < allowedRepeatTypeNames.length; ++i) {
            if (allowedRepeatTypeNames[i] === repeatType.name) {
                isFound = true;
            }
        }

        if (!isFound) {
            return userError(definition.invalidRepeatTypesId);
        }
    }

    const { startYMDDate } = definition;
    if (startYMDDate) {
        if (!YMDDate.isValidDate(getYMDDate(startYMDDate))) {
            return userError('DateOccurrences-definition_startYMDDate_invalid');
        }
    }
}

//
//---------------------------------------------------------
//
function validateOccurrenceType_ON_DATE(definition, occurrenceType) {
    const { startYMDDate } = definition;
    if (!YMDDate.isValidDate(getYMDDate(startYMDDate))) {
        return userError('DateOccurrences-definition_startYMDDate_required');
    }
}


//
//---------------------------------------------------------
//

function makeValidDayOfWeek(definition, refYMDDate) {
    const { dayOfWeek } = definition;
    if ((typeof dayOfWeek !== 'number')
     || (dayOfWeek < 0) || (dayOfWeek >= 7)) {
        definition.dayOfWeek = refYMDDate.getDayOfWeek();
    }
}

function makeValidMonth(definition, refYMDDate) {
    const { month } = definition;
    if ((typeof month !== 'number')
     || (month < 0) || (month >= 12)) {
        definition.month = refYMDDate.getMonth();
    }
}

function isOffsetInRange(definition) {
    const { occurrenceType } = definition;
    let { offsetMin, offsetMax } = occurrenceType;
    if (offsetMin === undefined) {
        offsetMin = -Number.MAX_SAFE_INTEGER;
    }
    if (offsetMax === undefined) {
        offsetMax = Number.MAX_SAFE_INTEGER;
    }

    const { offset } = definition;
    return (typeof offset === 'number')
     && (offset >= offsetMin) && (offset <= offsetMax);
}

function makeValidGeneralRepeatDefinition(repeatDefinition, allowedRepeatTypeNames) {
    if (!repeatDefinition) {
        return {
            repeatType: OccurrenceRepeatType.NO_REPEAT,
            period: 1,
        };
    }

    let isTypeValid;
    const { repeatType } = repeatDefinition;
    if (repeatType) {
        const repeatTypeName = repeatType.name;
        for (let i = 0; i < allowedRepeatTypeNames.length; ++i) {
            if (repeatTypeName === allowedRepeatTypeNames[i]) {
                isTypeValid = true;
                break;
            }
        }
    }

    if (!isTypeValid) {
        repeatDefinition.repeatType = OccurrenceRepeatType[
            allowedRepeatTypeNames[0]];
    }

    const { period } = repeatDefinition;
    if (!period || period < 0) {
        repeatDefinition.period = 1;
    }

    return repeatDefinition;
}


/**
 * @typedef {object} OccurrenceRepeatTypeDef
 * @property {string} name
 */

/**
 * The types of specifying repeat frequency.
 * @readonly
 * @enum {OccurrenceRepeatTypeDef}
 * @property {OccurrenceRepeatTypeDef} NO_REPEAT
 * @property {OccurrenceRepeatTypeDef} DAILY
 * @property {OccurrenceRepeatTypeDef} WEEKLY
 * @property {OccurrenceRepeatTypeDef} MONTHLY
 * @property {OccurrenceRepeatTypeDef} YEARLY
 */
export const OccurrenceRepeatType = {
    NO_REPEAT: { name: 'NO_REPEAT',
        validate: validateRepeatType_NO_REPEAT,
        getNextRepeatYMDDate: () => {},
    },
    DAILY: { name: 'DAILY', 
        validate: validateRepeatType_hasPeriod,
        getNextRepeatYMDDate: (repeatDefinition, refYMDDate, count) => 
            refYMDDate.addDays(repeatDefinition.period * count),
    },
    WEEKLY: { name: 'WEEKLY', 
        validate: validateRepeatType_hasPeriod,
        getNextRepeatYMDDate: (repeatDefinition, refYMDDate, count) => 
            refYMDDate.addDays(repeatDefinition.period * 7 * count),
    },
    MONTHLY: { name: 'MONTHLY', 
        validate: validateRepeatType_hasPeriod,
        getNextRepeatYMDDate: (repeatDefinition, refYMDDate, count) => 
            refYMDDate.addMonths(repeatDefinition.period * count),
    },
    YEARLY: { name: 'YEARLY', 
        validate: validateRepeatType_hasPeriod,
        getNextRepeatYMDDate: (repeatDefinition, refYMDDate, count) => 
            refYMDDate.addYears(repeatDefinition.period * count),
    },
};

function validateRepeatType_NO_REPEAT(repeatDefinition) {
    // Always valid...
}

function validateRepeatType_hasPeriod(repeatDefinition) {
    const { period } = repeatDefinition;
    if ((typeof period !== 'number')
     || (period < 0)) {
        return userError('DateOccurrences-repeatDefinition_period_required');
    }

    const { finalYMDDate } = repeatDefinition;
    if (finalYMDDate) {
        if (!YMDDate.isValidDate(getYMDDate(finalYMDDate))) {
            return userError('DateOccurrences-repeatDefinition_finalYMDDate_invalid');
        }
    }

    const { maxRepeats } = repeatDefinition;
    if (maxRepeats !== undefined) {
        if ((typeof maxRepeats !== 'number')
         || (maxRepeats < 0)) {
            return userError('DateOccurrences-repeatDefinition_maxRepeats_invalid');
        }
    }
}



/**
 * 
 * @param {*} type 
 * @returns {OccurrenceRepeatType|*}
 */
export function getOccurrenceRepeatType(type) {
    return (typeof type === 'string')
        ? OccurrenceRepeatType[type]
        : type;
}

/**
 * 
 * @param {*} type 
 * @returns {string|*}
 */
export function getOccurrenceRepeatTypeString(type) {
    return (typeof type === 'object')
        ? type.name
        : type;
}


/**
 * @typedef {object} OccurrenceRepeatDefinition
 * @property {OccurrenceRepeatType} repeatType
 * @property {number} [period]
 * @property {YMDDate} [finalYMDDate] If specified the occurrence is not to
 * be repeated after this date.
 * @property {number} [maxRepeats] If specified the occurrence is not to be
 * repeated more than this many times. maxRepeats = 0 means the occurrence is
 * to happen only once and not be repeated.
 */

/**
 * @typedef {object} OccurrenceRepeatDefinitionDataItem
 * @property {string} repeatType
 * @property {number} [period]
 * @property {string} [finalYMDDate] If specified the occurrence is not to
 * be repeated after this date.
 * @property {number} [maxRepeats] If specified the occurrence is not to be
 * repeated more than this many times. maxRepeats = 0 means the occurrence is
 * to happen only once and not be repeated.
 */

/**
 * 
 * @param {*} definition 
 * @param {boolean} [alwaysCopy]
 * @returns {OccurrenceRepeatDefinition}
 */
export function getOccurrenceRepeatDefinition(definition, alwaysCopy) {
    if (definition) {
        const repeatType = getOccurrenceRepeatType(definition.repeatType);
        const finalYMDDate = getYMDDate(definition.finalYMDDate);
        if (alwaysCopy
         || (repeatType !== definition.repeatType)
         || (finalYMDDate !== definition.finalYMDDate)) {
            definition = Object.assign({}, definition);
            if (repeatType !== undefined) {
                definition.repeatType = repeatType;
            }
            if (finalYMDDate !== undefined) {
                definition.finalYMDDate = finalYMDDate;
            }
        }
    }
    return definition;
}

/**
 * 
 * @param {*} definition 
 * @param {boolean} [alwaysCopy]
 * @returns {OccurrenceRepeatDefinitionDataItem}
 */
export function getOccurrenceRepeatDefinitionDataItem(definition, alwaysCopy) {
    if (definition) {
        const repeatType = getOccurrenceRepeatTypeString(definition.repeatType);
        const finalYMDDate = getYMDDateString(definition.finalYMDDate);
        if (alwaysCopy
         || (repeatType !== definition.repeatType)
         || (finalYMDDate !== definition.finalYMDDate)) {
            definition = Object.assign({}, definition);
            if (repeatType !== undefined) {
                definition.repeatType = repeatType;
            }
            if (finalYMDDate !== undefined) {
                definition.finalYMDDate = finalYMDDate;
            }
        }
    }
    return definition;
}


/**
 * Validates a repeat definition.
 * @param {OccurrenceRepeatDefinition|OccurrenceRepeatDefinition} 
 *      repeatDefinition 
 * @returns {undefined|Error} <code>undefined</code> is returned if repeatDefinition
 * is valid.
 */
export function validateOccurrenceRepeatDefinition(repeatDefinition) {
    const repeatType = getOccurrenceRepeatType(repeatDefinition.repeatType);
    if (!repeatType || !repeatType.validate) {
        return userError('DateOccurrences-repeatType_invalid');
    }
    return repeatType.validate(repeatDefinition);
}


/**
 * 
 * @param {OccurrenceRepeatDefinition|OccurrenceRepeatDefinition} 
 *      repeatDefinition 
 * @param {YMDDate|string} refYMDDate The reference date, the next repeating date after
 * this date is returned.
 * @param {number} occurrenceCount The number of occurrences so far.
 * @returns {YMDDate|undefined} <code>undefined</code> is returned if the
 * new date is after the final date of the definition, if any, or if 
 * occurrenceCount is greater than the maxRepeats in the definition.
 */
export function getNextRepeatDefinitionYMDDate(repeatDefinition, refYMDDate, 
    occurrenceCount, periodCount = 1) {

    refYMDDate = getYMDDate(refYMDDate);

    if (!occurrenceCount) {
        return refYMDDate;
    }

    repeatDefinition = getOccurrenceRepeatDefinition(repeatDefinition);
    if (!repeatDefinition
     || (repeatDefinition.repeatType === OccurrenceRepeatType.NO_REPEAT)) {
        return undefined;
    }

    const repeatType = getOccurrenceRepeatType(repeatDefinition.repeatType);
    if (!repeatType || !repeatType.getNextRepeatYMDDate) {
        throw userError('DateOccurrences-repeatType_invalid');
    }

    const { maxRepeats } = repeatDefinition;
    if ((occurrenceCount !== undefined) && (maxRepeats !== undefined)) {
        if (occurrenceCount >= maxRepeats) {
            // All done.
            return undefined;
        }
    }

    let ymdDate = repeatType.getNextRepeatYMDDate(repeatDefinition, 
        refYMDDate, periodCount);
    if (ymdDate) {
        const { finalYMDDate } = repeatDefinition;
        if (finalYMDDate) {
            if (YMDDate.compare(ymdDate, finalYMDDate) > 0) {
                // All done.
                return undefined;
            }
        }
    }

    return ymdDate;
}



//
//---------------------------------------------------------
//
function isRepeatDefinitionRepeat(repeatDefinition) {
    if (repeatDefinition
     && (repeatDefinition.repeatType !== OccurrenceRepeatType.NO_REPEAT)) {
        return true;
    }
}

//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_OF_WEEK(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the week.
    const { dayOfWeek, repeatDefinition } = definition;

    const refDayOfWeek = refYMDDate.getDayOfWeek();
    if (refDayOfWeek !== dayOfWeek) {
        let deltaDays = dayOfWeek - refDayOfWeek;
        if (deltaDays < 0) {
            if (!isRepeatDefinitionRepeat(repeatDefinition)) {
                // If we have a repeat we want the next valid date after
                // the repeat, so we go backwards.
                deltaDays += 7;
            }
        }
        refYMDDate = refYMDDate.addDays(deltaDays);
    }

    return getNextRepeatDefinitionYMDDate(repeatDefinition, refYMDDate, occurrenceCount);
}

function makeValid_DAY_OF_WEEK(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_OF_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const refOffset = refYMDDate.getDOM() - 1;
        if (refOffset > offset) {
            refYMDDate = refYMDDate.addDays(offset - refOffset);
            // If we're not a repeat, we need to advance to the following month
            // since we need to be after the original refYMDDate...
            if (!isRepeat) {
                refYMDDate = refYMDDate.addMonths(1);
            }
        }
        else if (refOffset < offset) {
            // We need to make sure we don't go beyond the last date.
            let newDOM = offset + 1;
            const lastDOM = refYMDDate.getLastDateOfMonth();
            if (newDOM > lastDOM) {
                newDOM = lastDOM;
            }
            refYMDDate = refYMDDate.addDays(newDOM - refYMDDate.getDOM());
        }
    }

    return refYMDDate;
}

function makeValid_DAY_OF_MONTH(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = refYMDDate.getDOM() - 1;
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_END_OF_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const lastDOM = refYMDDate.getLastDateOfMonth();
        const newDOM = Math.max(lastDOM - offset, 1);
        const currentDOM = refYMDDate.getDOM();

        refYMDDate = new YMDDate(refYMDDate.getFullYear(), refYMDDate.getMonth(),
            newDOM);
        if ((newDOM < currentDOM) && !isRepeat) {
            // The offset is before the original refYMDDate, we need to be on or after
            // the original refYMDDate...
            refYMDDate = refYMDDate.addMonths(1);
        }
    }

    return refYMDDate;
}

function makeValid_DAY_END_OF_MONTH(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = refYMDDate.getLastDateOfMonth() - refYMDDate.getDOM();
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_OF_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = getMonthNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a month.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addMonths(1);
                refYMDDate = getMonthNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_OF_MONTH(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round((refYMDDate.getDOM() - 1) / 7);
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_END_OF_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = getMonthNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a month.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addMonths(1);
                refYMDDate = getMonthNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_END_OF_MONTH(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round(
            (refYMDDate.getLastDateOfMonth() - refYMDDate.getDOM()) / 7);
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_OF_SPECIFIC_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, month, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), month, 1);
        refYMDDate = getYMDDateWithDOM(refYMDDate, offset + 1);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DAY_OF_SPECIFIC_MONTH(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = refYMDDate.getDOM() - 1;
    }

    makeValidMonth(definition, refYMDDate);
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_END_OF_SPECIFIC_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, month, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), month, 1);
        refYMDDate = getYMDDateWithDOM(refYMDDate, 
            refYMDDate.getLastDateOfMonth() - offset);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DAY_END_OF_SPECIFIC_MONTH(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = refYMDDate.getLastDateOfMonth() - refYMDDate.getDOM();
    }

    makeValidMonth(definition, refYMDDate);
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_OF_SPECIFIC_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, month, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), month, 1);
        refYMDDate = getMonthNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
                refYMDDate = getMonthNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_OF_SPECIFIC_MONTH(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round((refYMDDate.getDOM() - 1) / 7);
    }

    makeValidMonth(definition, refYMDDate);
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_END_OF_SPECIFIC_MONTH(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, month, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), month, 1);
        refYMDDate = getMonthNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
                refYMDDate = getMonthNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_END_OF_SPECIFIC_MONTH(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round(
            (refYMDDate.getLastDateOfMonth() - refYMDDate.getDOM()) / 7);
    }

    makeValidMonth(definition, refYMDDate);
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_OF_YEAR(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), 0, 1);
        refYMDDate = refYMDDate.addDays(offset);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = new YMDDate(refYMDDate.getFullYear() + 1, 0, 1);
                refYMDDate = refYMDDate.addDays(offset);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DAY_OF_YEAR(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = new YMDDate(refYMDDate.getFullYear(), 0, 1)
            .daysAfterMe(refYMDDate);
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DAY_END_OF_YEAR(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = new YMDDate(refYMDDate.getFullYear(), 11, 31);
        refYMDDate = refYMDDate.addDays(-offset);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = new YMDDate(refYMDDate.getFullYear() + 1, 11, 31);
                refYMDDate = refYMDDate.addDays(-offset);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DAY_END_OF_YEAR(definition, refYMDDate) {
    if (!isOffsetInRange(definition)) {
        definition.offset = refYMDDate
            .daysAfterMe(new YMDDate(refYMDDate.getFullYear(), 11, 31));
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_OF_YEAR(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = getYearNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
                refYMDDate = getYearNthDayOfWeek(refYMDDate, offset + 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_OF_YEAR(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round(
            new YMDDate(refYMDDate.getFullYear(), 0, 1)
                .daysAfterMe(refYMDDate) / 7);
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_DOW_END_OF_YEAR(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {

    // Adjust refYMDDate to satisfy the day of the month.
    const { offset, dayOfWeek, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);

    // We want to advance to the date as-is so we get the appropriate month.
    refYMDDate = getNextRepeatDefinitionYMDDate(repeatDefinition, 
        refYMDDate, occurrenceCount);

    if (refYMDDate) {
        const originalYMDDate = refYMDDate;
        refYMDDate = getYearNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
        if (!isRepeat) {
            // If the new date is before the original one we need to advance a year.
            if (YMDDate.compare(originalYMDDate, refYMDDate) > 0) {
                refYMDDate = refYMDDate.addYears(1);
                refYMDDate = getYearNthDayOfWeek(refYMDDate, -offset - 1, dayOfWeek);
            }
        }        
    }

    return refYMDDate;
}

function makeValid_DOW_END_OF_YEAR(definition, refYMDDate) {
    makeValidDayOfWeek(definition, refYMDDate);
    if (!isOffsetInRange(definition)) {
        definition.offset = Math.round(refYMDDate
            .daysAfterMe(new YMDDate(refYMDDate.getFullYear(), 11, 31)) / 7);
    }
}


//
//---------------------------------------------------------
//
function getNextYMDDate_ON_DATE(definition, occurrenceType, 
    refYMDDate, occurrenceCount) {
    const { startYMDDate, repeatDefinition } = definition;

    const isRepeat = isRepeatDefinitionRepeat(repeatDefinition);
    if (!isRepeat) {
        if (YMDDate.compare(refYMDDate, startYMDDate) <= 0) {
            return startYMDDate;
        }
        return;
    }

    // Repeats are relative to startYMDDate, not refYMDDate.
    return getNextRepeatDefinitionYMDDate(repeatDefinition, 
        startYMDDate, occurrenceCount, occurrenceCount);
}

function makeValid_ON_DATE(definition, refYMDDate) {
    const { startYMDDate } = definition;
    if (!YMDDate.isValidDate(getYMDDate(startYMDDate))) {
        definition.startYMDDate = refYMDDate;
    }
}


/**
 * @typedef {object} DateOccurrenceDefinition
 * @property {OccurrenceType} occurrenceType
 * @property {number} offset
 * @property {number} [dayOfWeek] 0 - Sunday, 1 - Monday...
 * @property {number} [month] 0 based month
 * @property {YMDDate} [startYMDDate] Required for ON_DATE, for all else
 * optional.
 * @property {OccurrenceRepeatDefinition} [repeatDefinition]
 */

/**
 * @typedef {object} DateOccurrenceDefinitionDataItem
 * @property {string} occurrenceType
 * @property {number} offset
 * @property {number} [dayOfWeek] 0 - Sunday, 1 - Monday...
 * @property {number} [month] 0 based month
 * @property {YMDDate} [string] Required for ON_DATE, for all else
 * optional.
 * @property {OccurrenceRepeatDefinitionDataItem} [repeatDefinition]
 */

/**
 * 
 * @param {*} definition 
 * @param {boolean} [alwaysCopy]
 * @returns {DateOccurrenceDefinition}
 */
export function getDateOccurrenceDefinition(definition, alwaysCopy) {
    if (definition) {
        const occurrenceType = getOccurrenceType(definition.occurrenceType);
        const startYMDDate = getYMDDate(definition.startYMDDate);
        const repeatDefinition = getOccurrenceRepeatDefinition(
            definition.repeatDefinition);
        if (alwaysCopy
         || (occurrenceType !== definition.occurrenceType)
         || (startYMDDate !== definition.startYMDDate)
         || (repeatDefinition !== definition.repeatDefinition)) {
            definition = Object.assign({}, definition);
            if (occurrenceType !== undefined) {
                definition.occurrenceType = occurrenceType;
            }
            if (startYMDDate !== undefined) {
                definition.startYMDDate = startYMDDate;
            }
            if (repeatDefinition !== undefined) {
                definition.repeatDefinition = repeatDefinition;
            }
        }
    }
    return definition;
}

/**
 * 
 * @param {*} definition 
 * @param {boolean} [alwaysCopy]
 * @returns {DateOccurrenceDefinitionDataItem}
 */
export function getDateOccurrenceDefinitionDataItem(definition, alwaysCopy) {
    if (definition) {
        const occurrenceType = getOccurrenceTypeString(definition.occurrenceType);
        const startYMDDate = getYMDDateString(definition.startYMDDate);
        const repeatDefinition = getOccurrenceRepeatDefinitionDataItem(
            definition.repeatDefinition, 
            alwaysCopy);
        if (alwaysCopy
         || (occurrenceType !== definition.occurrenceType)
         || (startYMDDate !== definition.startYMDDate)
         || (repeatDefinition !== definition.repeatDefinition)) {
            definition = Object.assign({}, definition);
            if (occurrenceType !== undefined) {
                definition.occurrenceType = occurrenceType;
            }
            if (startYMDDate !== undefined) {
                definition.startYMDDate = startYMDDate;
            }
            if (repeatDefinition !== undefined) {
                definition.repeatDefinition = repeatDefinition;
            }
        }
    }
    return definition;
}


/**
 * Determines if an occurrence definition is valid.
 * @param {DateOccurrenceDefinition|DateOccurrenceDefinitionDataItem} definition 
 * @returns {undefined|Error} <code>undefined</code> is returned if definition
 * is valid.
 */
export function validateDateOccurrenceDefinition(definition) {
    definition = getDateOccurrenceDefinition(definition);
    const occurrenceType = getOccurrenceType(definition.occurrenceType);
    if (!occurrenceType || !occurrenceType.validate) {
        return userError('DateOccurrences-occurrenceType_invalid');
    }

    let result = occurrenceType.validate(definition, occurrenceType);
    if (!result) {
        const repeatDefinition = getOccurrenceRepeatDefinition(
            definition.repeatDefinition);
        if (repeatDefinition) {
            result = validateOccurrenceRepeatDefinition(repeatDefinition);
        }
    }

    return result;
}


/**
 * Adjusts an occurrence definition as necessary so it is valid based on
 * the occurrence type. If the occurrence type is not valid it is set
 * to DAY_OF_MONTH.
 * @param {DateOccurrenceDefinition|DateOccurrenceDefinitionDataItem} definition 
 * @param {YMDDate|string} [refYMDDate] Date used to obtain default values.
 * @returns {DateOccurrenceDefinition|DateOccurrenceDefinitionDataItem}
 */
export function makeValidDateOccurrenceDefinition(definition, refYMDDate) {
    if (!definition) {
        definition = {
            occurrenceType: OccurrenceType.DAY_OF_MONTH,
        };
    }
    else {
        if (!validateDateOccurrenceDefinition(definition)) {
            return definition;
        }
    }

    const originalDefinition = definition;
    definition = getDateOccurrenceDefinition(definition);

    let occurrenceType = getOccurrenceType(definition.occurrenceType);
    if (!occurrenceType) {
        occurrenceType = definition.occurrenceType = OccurrenceType.DAY_OF_MONTH;
    }

    refYMDDate = getYMDDate(refYMDDate);
    if (!YMDDate.isValidDate(refYMDDate)) {
        refYMDDate = new YMDDate();
    }

    occurrenceType.makeValidOccurrence(definition, refYMDDate);
    
    definition.repeatDefinition = makeValidGeneralRepeatDefinition(
        definition.repeatDefinition, 
        occurrenceType.allowedRepeatTypeNames);

    // Return the same object type as the original definition.
    return (originalDefinition === definition) 
        ? definition
        : getDateOccurrenceDefinitionDataItem(definition);
}


/**
 * @typedef {object} DateOccurrenceState
 * This is used to keep track of when and how often an occurrence definition has occurred.
 * @property {YMDDate} [lastOccurrenceYMDDate]
 * @property {number} [occurrenceCount = 0]
 * @property {boolean} [isDone = false]
 */


/**
 * @typedef {object} DateOccurrenceStateDataItem
 * This is used to keep track of when and how often an occurrence definition has occurred.
 * @property {string} [lastOccurrenceYMDDate]
 * @property {number} [occurrenceCount = 0]
 * @property {boolean} [isDone = false]
 */

/**
 * 
 * @param {*} state 
 * @param {boolean} alwaysCopy 
 * @returns {DateOccurrenceState}
 */
export function getDateOccurrenceState(state, alwaysCopy) {
    if (state) {
        const lastOccurrenceYMDDate = getYMDDate(state.lastOccurrenceYMDDate);
        if (alwaysCopy
         || (lastOccurrenceYMDDate !== state.lastOccurrenceYMDDate)) {
            state = Object.assign({}, state);
            if (lastOccurrenceYMDDate) {
                state.lastOccurrenceYMDDate = lastOccurrenceYMDDate;
            }
        }
    }
    return state;
}

/**
 * 
 * @param {*} state 
 * @param {boolean} alwaysCopy 
 * @returns {DateOccurrenceStateDataItem}
 */
export function getDateOccurrenceStateDataItem(state, alwaysCopy) {
    if (state) {
        const lastOccurrenceYMDDate = getYMDDateString(state.lastOccurrenceYMDDate);
        if (alwaysCopy
         || (lastOccurrenceYMDDate !== state.lastOccurrenceYMDDate)) {
            state = Object.assign({}, state);
            if (lastOccurrenceYMDDate) {
                state.lastOccurrenceYMDDate = lastOccurrenceYMDDate;
            }
        }
    }
    return state;
}


/**
 * Determines the next {@link YMDDate} at which a occurrence is to occur, if it is
 * to occur.
 * <p>
 * The general behavior depends upon whether or not the occurrence definition is set
 * to repeat (the repeatDefinition property is defined and the repeatType is not
 * OccurrenceRepeatType.NO_REPEAT).
 * <p>
 * First off, a reference {@link YMDDate} is obtained from 
 * state.lastOccurrenceYMDDate if both state and lastOccurrenceYMDDate are defined,
 * otherwise the reference date is set to 'today'.
 * <p>
 * If the occurrence definition is not set to repeat, or if state is defined and
 * state.occurrenceCount is 0 or not defined, then the reference date is adjusted
 * to match the occurrence definition. If the adjusted date would be before
 * the reference date it is advanced to the next week/month/year as determined
 * by the occurrence type.
 * <p>
 * If the occurrence definition is set to repeat and state.occurrenceCount is greater
 * than 0, then the reference date is first advanced according to the repeat 
 * definition. After being advanced it is then adjusted to match the occurrence 
 * definition.
 * <p>
 * Note that if it is not set to repeat and state.occurrenceCount is > 0 then all
 * occurrences are done and the state.isDone is set to <code>true</code>.
 * <p>
 * @param {DateOccurrenceDefinition|DateOccurrenceDefinitionDataItem} definition 
 * @param {DateOccurrenceState|DateOccurrenceStateDataItem} lastState 
 * @returns {DateOccurrenceState} 
 */
export function getNextDateOccurrenceState(definition, lastState) {
    definition = getDateOccurrenceDefinition(definition);

    if (lastState) {
        // Check lastState to make sure we're not already done...
        lastState = getDateOccurrenceState(lastState, true);
        if (lastState.isDone) {
            return lastState;
        }

    }
    else {
        lastState = {
            lastOccurrenceYMDDate: new YMDDate(),
            occurrenceCount: 0,
            isDone: false,
        };
    }

    let refYMDDate = lastState.lastOccurrenceYMDDate;
    const { occurrenceCount } = lastState;
    let refOccurrenceCount = occurrenceCount || 0;

    const { occurrenceType } = definition;
    const nextYMDDate = occurrenceType.getNextYMDDate(definition, occurrenceType, 
        refYMDDate, refOccurrenceCount);

    if (!nextYMDDate) {
        // All done...
        lastState.occurrenceCount = lastState.occurrenceCount || 1;
        lastState.isDone = true;
        return lastState;
    }

    return {
        lastOccurrenceYMDDate: nextYMDDate,
        occurrenceCount: refOccurrenceCount + 1,
        isDone: false,
    };
}
