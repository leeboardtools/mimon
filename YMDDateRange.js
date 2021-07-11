import { getYMDDate, getYMDDateString, isValidYMDDate, YMDDate, } from './YMDDate';


/**
 * @typedef {object} YMDDateRange
 * If both earliestYMDDate and latestYMDDate are defined then earliestYMDDate must 
 * be on or before latestYMDDate.
 * @property {YMDDate} [earliestYMDDate]
 * @property {YMDDate} [latestYMDDate]
 */

/**
 * @typedef {object} YMDDateRangeDataItem
 * If both earliestYMDDate and latestYMDDate are defined then earliestYMDDate must 
 * be on or before latestYMDDate.
 * @property {string} [earliestYMDDate]
 * @property {string} [latestYMDDate]
 */

/**
 * Retrieves a {@link YMDDateRange} from either a {@link YMDDateRange} or a
 * {@link YMDDateRangeDataItem}. If ymdDateRangeDataItem is already a {@link YMDDateRange}
 * and alwaysCopy is <code>false</code> then a copy is not made.
 * @param {YMDDateRangeDataItem|YMDDateRange} ymdDateRangeDataItem 
 * @param {boolean} alwaysCopy 
 * @returns {YMDDateRange|undefined}
 */
export function getYMDDateRange(ymdDateRangeDataItem, alwaysCopy) {
    if (ymdDateRangeDataItem) {
        const earliestYMDDate = getYMDDate(ymdDateRangeDataItem.earliestYMDDate);
        const latestYMDDate = getYMDDate(ymdDateRangeDataItem.latestYMDDate);
        if (alwaysCopy
         || (earliestYMDDate !== ymdDateRangeDataItem.earliestYMDDate)
         || (latestYMDDate !== ymdDateRangeDataItem.latestYMDDate)) {
            const ymdDateRange = Object.assign({}, ymdDateRangeDataItem);
            if (earliestYMDDate) {
                ymdDateRange.earliestYMDDate = earliestYMDDate;
            }
            if (latestYMDDate) {
                ymdDateRange.latestYMDDate = latestYMDDate;
            }
            return ymdDateRange;
        }
    }

    return ymdDateRangeDataItem;
}


/**
 * Retrieves a {@link YMDDateRangeDataItem} from either a {@link YMDDateRange} or a
 * {@link YMDDateRangeDataItem}. If ymdDateRange is already a {@link YMDDateRangeDataItem}
 * and alwaysCopy is <code>false</code> then a copy is not made.
 * @param {YMDDateRangeDataItem|YMDDateRange} ymdDateRange
 * @param {boolean} alwaysCopy 
 * @returns {YMDDateRangeDataItem|undefined}
 */
export function getYMDDateRangeDataItem(ymdDateRange, alwaysCopy) {
    if (ymdDateRange) {
        const earliestYMDDate = getYMDDateString(ymdDateRange.earliestYMDDate);
        const latestYMDDate = getYMDDateString(ymdDateRange.latestYMDDate);
        if (alwaysCopy
         || (earliestYMDDate !== ymdDateRange.earliestYMDDate)
         || (latestYMDDate !== ymdDateRange.latestYMDDate)) {
            ymdDateRange = Object.assign({}, ymdDateRange);
            if (earliestYMDDate) {
                ymdDateRange.earliestYMDDate = earliestYMDDate;
            }
            if (latestYMDDate) {
                ymdDateRange.latestYMDDate = latestYMDDate;
            }
        }
    }

    return ymdDateRange;
}

/**
 * Determines if a date is within a date range.
 * <p>
 * If earliestYMDDate is defined and ymdDate is before earliestYMDDate, it
 * is not within the range.
 * <p>
 * If latestYMDDate is defined and ymdDate is after latestYMDDate, it is
 * not within the range.
 * <p>
 * If ymdDate is <code>undefined</code> it is not within the range.
 * @param {YMDDateRange|YMDDateRangeDataItem} ymdDateRange 
 * @param {YMDDate|string} ymdDate 
 * @returns {boolean} <code>true</code> if ymdDate is within the range.
 */
export function isYMDDateInRange(ymdDateRange, ymdDate) {
    ymdDateRange = getYMDDateRange(ymdDateRange);
    ymdDate = getYMDDate(ymdDate);
    if (!ymdDate) {
        return false;
    }

    const { earliestYMDDate, latestYMDDate } = ymdDateRange;
    if (earliestYMDDate) {
        if (YMDDate.compare(ymdDate, earliestYMDDate) < 0) {
            return false;
        }
    }
    if (latestYMDDate) {
        if (YMDDate.compare(ymdDate, latestYMDDate) > 0) {
            return false;
        }
    }

    return true;
}


/**
 * Constructs a valid {@link YMDDateRange} from two date arguments.
 * <p>
 * If no arguments are given then an 'accept all' range is returned.
 * <p>
 * If a single argument is given and it can be resolved to a {@link YMDDate},
 * then a single date range is returned.
 * <p>
 * If two arguments are given, then the arguments are presumed to be two dates
 * which may be <code>undefined</code>. If either argument cannot be resolved
 * to a {@link YMDDate} then it is treated as if <code>undefined</code> were
 * specified in its place.
 * <p>
 * If both the arguments are {@link YMDDate}s then they will be assigned to the
 * earliestYMDDate and latestYMDDate properties based upon their ordering,
 * otherwise the first argument is treated as the earliestYMDDate and the
 * second argument is treated as the latestYMDDate.
 * @param {YMDDate|string} [ymdDateA]
 * @param {YMDDate|string} [ymdDateB]
 * @returns {YMDDateRange}
 */
export function makeValidYMDDateRange(...args) {
    const ymdDateRange = {};

    if (!args.length) {
        return ymdDateRange;
    }
    if (args.length === 1) {
        const ymdDate = getYMDDate(args[0]);
        if (isValidYMDDate(ymdDate)) {
            ymdDateRange.earliestYMDDate = ymdDateRange.latestYMDDate
                = ymdDate;
        }
        return ymdDateRange;
    }

    let ymdDateA = getYMDDate(args[0]);
    let ymdDateB = getYMDDate(args[1]);

    if (!isValidYMDDate(ymdDateA)) {
        ymdDateA = undefined;
    }
    if (!isValidYMDDate(ymdDateB)) {
        ymdDateB = undefined;
    }

    if (ymdDateA && ymdDateB) {
        if (YMDDate.compare(ymdDateA, ymdDateB) > 0) {
            [ymdDateA, ymdDateB] = [ymdDateB, ymdDateA];
        }
    }

    if (ymdDateA) {
        ymdDateRange.earliestYMDDate = ymdDateA;
    }
    if (ymdDateB) {
        ymdDateRange.latestYMDDate = ymdDateB;
    }

    return ymdDateRange;
}


/**
 * Constructs a valid {@link YMDDateRangeDataItem} from two date arguments.
 * <p>
 * If no arguments are given then an 'accept all' range is returned.
 * <p>
 * If a single argument is given and it can be resolved to a {@link YMDDate},
 * then a single date range is returned.
 * <p>
 * If two arguments are given, then the arguments are presumed to be two dates
 * which may be <code>undefined</code>. If either argument cannot be resolved
 * to a {@link YMDDate} then it is treated as if <code>undefined</code> were
 * specified in its place.
 * <p>
 * If both the arguments are {@link YMDDate}s then they will be assigned to the
 * earliestYMDDate and latestYMDDate properties based upon their ordering,
 * otherwise the first argument is treated as the earliestYMDDate and the
 * second argument is treated as the latestYMDDate.
 * @param {YMDDate|string} [ymdDateA] If ymdDateB is <code>undefined</code> this
 * is the earliestYMDDate property.
 * @param {YMDDate|string} [ymdDateB] If ymdDateA is <code>undefined</code> this
 * is the latestYMDDate property.
 * @returns {YMDDateRangeDataItem}
 */
export function makeValidYMDDateRangeDataItem(...args) {
    return getYMDDateRangeDataItem(makeValidYMDDateRange(...args));
}
