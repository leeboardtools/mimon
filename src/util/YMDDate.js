const millisecondsPerDay = 1000 * 60 * 60 * 24;

/**
 * Immutable class representing only a year, month, and day of month, no time.
 * <p>
 * This uses a {@link Date} internally to handle date management, but it does so 
 * in UTC and with hh:mm:ss:ms of 00:00:00:00 to avoid any weird problems with 
 * time zones.
 */
export class YMDDate {
    /**
     * @typedef {object}    YMDDate~Options
     * @property {number}   year    The year.
     * @property {number}   month   The month index, 0 based.
     * @property {number}   dom The day of the month, 1 based.
     */

    /**
     * @constructor
     * @param  {Date|string|...number|YMDDate~Options} args Either:
     * <li>a {@link Date}
     * <li>a string representation of a date (YYYY-MM-DD is the preferred format, 
     * which is generated by {@link YMDDate#toString}),
     * <li>a year followed by a 0 based month index, followed by a 1 based day of month,
     * <li>a single number which is the number of milliseconds since the Unix Epoch,
     * <li>a {@link YMDDate~Options} object.
     */
    constructor(...args) {
        if (args.length > 0) {
            if (args[0] instanceof Date) {
                this._setFromParts(args[0].getFullYear(), 
                    args[0].getMonth(), 
                    args[0].getDate());
            }
            else if (typeof args[0] === 'string') {
                this._parseDateString(args[0]);
            }
            else if (typeof args[0] === 'number') {
                if (args.length === 1) {
                    const date = new Date(args[0]);
                    this._setFromParts(date.getUTCFullYear(), 
                        date.getUTCMonth(), 
                        date.getUTCDate());
                }
                else {
                    this._setFromParts(args[0], args[1], args[2]);
                }
            }
            else if (typeof args[0] === 'object') {
                if (args[0].year) {
                    this._setFromParts(args[0].year, args[0].month, args[0].dom);
                }
            }
        }

        if (!this._date) {
            const date = new Date();
            this._setFromParts(date.getFullYear(), date.getMonth(), date.getDate());
        }
    }

    _setFromParts(year, month, dom) {
        this._date = new Date(year, month, dom, 0, 0, 0, 0);

        // NOTE: Set the year last, or if you're using this on New Year' Eve, the 
        // date will come out wrong!
        this._date.setUTCHours(0);
        this._date.setUTCMinutes(0);
        this._date.setUTCSeconds(0);
        this._date.setUTCMilliseconds(0);
        this._date.setUTCDate(1);   // This makes sure the dom doesn't force the month
        // to advance.
        this._date.setUTCMonth(month);
        this._date.setUTCDate(dom);
        this._date.setUTCFullYear(year);
    }

    _parseDateString(string) {
        const yearMonthSep = string.indexOf('-', 4);
        if (yearMonthSep > 0) {
            const monthDomSep = string.indexOf('-', yearMonthSep + 1);
            if (monthDomSep > 0) {
                const year = parseInt(string.slice(0, yearMonthSep));
                const month = parseInt(string.slice(yearMonthSep + 1, monthDomSep));
                const dom = parseInt(string.slice(monthDomSep + 1));
                if (!isNaN(year) && !isNaN(month) && !isNaN(dom)) {
                    this._setFromParts(year, month - 1, dom);
                    return;
                }
            }
        }

        const date = new Date(string);
        this._setFromParts(date.getFullYear(), date.getMonth(), date.getDate());
    }

    /**
     * Helper that checks an arg if it is a {@link YMDDate} instance or creates a 
     * new {@link YMDDate} instance if it isn't.
     * @param {YMDDate|object} options
     * @returns {YMDDate}
     */
    static fromOptions(options) {
        return (options instanceof YMDDate) ? options : new YMDDate(options);
    }

    /**
     * @returns {YMDDate~Options}  An options object representing this date.
     */
    toOptions() {
        return {
            year: this.getFullYear(),
            month: this.getMonth(),
            dom: this.getDOM(),
        };
    }

    /**
     * @returns {string}    The result of {@link YMDDate#toString}.
     */
    toJSON() { return this.toString(); }


    /**
     * @returns {number}    The full year.
     */
    getFullYear() { return this._date.getUTCFullYear(); }

    /**
     * @returns {number}    The 0 based month index.
     */
    getMonth() { return this._date.getUTCMonth(); }

    /**
     * @returns {number}    The day of the month, 1 is the first day of the month.
     */
    getDOM() { return this._date.getUTCDate(); }

    /**
     * @returns {number}    The day of the month, 1 is the first day of the month.
     */
    getDate() { return this._date.getUTCDate(); }

    /**
     * @returns {number}    The last day of the month, 28, 29, 30, or 31
     */
    getLastDateOfMonth() {
        const year = this.getFullYear();
        const month = this.getMonth();

        const testYMDDate = new Date(year, month, 32);
        // For 31 days DOM will be 1
        // For 30 days DOM will be 2
        // For 29 days DOM will be 3
        return 32 - testYMDDate.getDate();
    }

    /**
     * @returns {number}    The day of the week, 0 is Sunday.
     */
    getDayOfWeek() { return this._date.getUTCDay(); }

    /**
     * @returns {number}
     */
    valueOf() { return this._date.valueOf(); }

    /**
     * @returns {Date}  A {@link Date} representation of this date. Note that the
     * YMD date is UTC.
     */
    toDate() { return new Date(this._date.valueOf()); }

    /**
     * Creates a date only object from a {@link Date}. The YMD date is the UTC
     * date.
     * @param {Date} date
     * @returns {YMDDate}
     */
    static fromDate(date) {
        return new YMDDate(date);
    }


    /**
     * @returns {Date}  A {@link Date} representation of this date that is in
     * local date/time, the default of Date.
     */
    toLocalDate() {
        const date = new Date();
        date.setDate(1);    // Need to set the date to 1 to make sure it's not an
        // invalid date for the month when setMonth() is called.
        date.setFullYear(this.getFullYear());
        date.setMonth(this.getMonth());
        date.setDate(this.getDate());
        return date;
    }


    /**
     * Creates a YMDDate object from a {@link Date}, using the local date.
     * Note that the YMDDate object will represent the date internally using UTC,
     * so the date returned by {@link YMDDate#toDate} will not be the same
     * as the date passed to this unless the time zone offset is 0.
     * @param {Date} date 
     * @returns {YMDDate}
     */
    static fromLocalDate(date) {
        return new YMDDate(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }


    /**
     * @returns {string}    The date in the form of yyyy-mm-dd, where leading 0s are 
     * added so yyyy is at least 4 digits, mm is 2 digits, and dd is 2 digits. 
     * Negative years are indicated with a leading minus sign.
     */
    toString() {
        let year = this.getFullYear();
        const month = this.getMonth() + 1;
        const dom = this.getDOM();

        let string;
        if (year < 0) {
            string = '-';
            year = -year;
        }
        else {
            string = '';
        }
        if (year < 10) {
            string += '000';
        }
        else if (year < 100) {
            string += '00';
        }
        else if (year < 1000) {
            string += '0';
        }
        string += year + '-';

        if (month < 10) {
            string += '0';
        }
        string += month + '-';

        if (dom < 10) {
            string += '0';
        }
        string += dom;

        return string;
    }



    /**
     * @returns {number}    The one based quarter to which the date belongs, 
     * Q1 is Jan-Feb-Mar.
     */
    getCalendarQuarter() {
        return Math.floor(this._date.getUTCMonth() / 3) + 1;
    }


    /**
     * Determines if a year is a leap year.
     * @param {number} year 
     * @return {boolean}
     */
    static isYearLeapYear(year) {
        if (!(year % 4)) {
            if (!(year % 100)) {
                if (!(year % 400)) {
                    return true;
                }
            }
            else {
                return true;
            }
        }
    }

    /**
     * Determines if the year is a leap year.
     * @return {boolean}
     */
    isLeapYear() {
        return YMDDate.isYearLeapYear(this.getFullYear());
    }

    /**
     * Determines if the date is after February 28.
     */
    isAfterFebruary28() {
        const month = this.getMonth();
        if (month >= 2) {
            return true;
        }
        else if (month === 1) {
            return this.getDate() > 28;
        }
    }


    /**
     * Creates a new date only object a given number of days away from this date.
     * Will return <code>this</code> if days is zero.
     * @param {number} days The number of days to add.
     * @returns {YMDDate}
     */
    addDays(days) {
        if (!days) { 
            return this; 
        }
        return new YMDDate(this.valueOf() + millisecondsPerDay * days);
    }


    /**
     * Creates a new date only object a given number of months away from this date.
     * If the date of the month of this date falls beyond the end of the offset month,
     * the last date of the offset month is returned. For example, adding one month
     * to 2020-05-31 will return 2020-06-30, not 2020-07-01.
     * Will return <code>this</code> if months is zero.
     * @param {number} months 
     * @returns {YMDDate}
     */
    addMonths(months) {
        if (!months) {
            return this;
        }

        let totalMonth = Math.round(this.getMonth() + months);
        const yearAdjust = Math.floor(totalMonth / 12);

        const year = this.getFullYear() + yearAdjust;
        const month = totalMonth - yearAdjust * 12;

        let dom = this.getDOM();
        let newYMDDate = new YMDDate(year, month, dom);
        if (newYMDDate.getMonth() !== month) {
            // Need to pin to the desired month.
            newYMDDate = new YMDDate(year, month, dom - newYMDDate.getDOM());
        }

        return newYMDDate;
    }


    /**
     * Creates a new date only object a given number of years away from this date.
     * If the current date is Feb. 29 and the adjusted year is not a leap
     * year this will return Feb. 28.
     * Will return <code>this</code> if years is zero.
     * @param {number} years 
     */
    addYears(years) {
        if (!years) {
            return this;
        }

        const month = this.getMonth();
        let newYMDDate = new YMDDate(this.getFullYear() + years, month, this.getDOM());
        if (newYMDDate.getMonth() !== month) {
            return new YMDDate(this.getFullYear() + years, month, 28);
        }
        return newYMDDate;
    }


    /**
     * Determines the number of days ymdDate is after this date.
     * @param {YMDDate} ymdDate
     * @return {number} The number of days ymdDate is after this date, if ymdDate is 
     * before this date then the value is negative.
     */
    daysAfterMe(ymdDate) {
        return Math.round((ymdDate.valueOf() - this.valueOf()) / millisecondsPerDay);
    }


    /**
     * Determines the number of calendar months ymdDate is after this date. The day of
     * the months are ignored.
     * @param {YMDDate} ymdDate 
     * @returns {number}    The number of months ymdDate is after this date, if ymdDate
     * is before this date then the value is negative.
     */
    monthsAfterMe(ymdDate) {
        const compare = ymdDate.valueOf() - this.valueOf();
        if (compare < 0) {
            return -ymdDate.monthsAfterMe(this);
        }
        else if (!compare) {
            return 0;
        }

        return ymdDate.getMonth() - this.getMonth()
            + 12 * (ymdDate.getFullYear() - this.getFullYear());
    }


    /**
     * Returns the number of years, including fractional portions, ymdDate is after 
     * this date. Years are based on the month and day of month.
     * <p>
     * Note that if ymdDate is before this date, this simply returns 
     * -ymdDate.fractionalYearsAfterMe(this).
     * @param {YMDDate} ymdDate 
     * @returns {number}
     */
    fractionalYearsAfterMe(ymdDate) {
        const compare = ymdDate.valueOf() - this.valueOf();
        if (compare < 0) {
            return -ymdDate.fractionalYearsAfterMe(this);
        }
        else if (!compare) {
            return 0;
        }

        // At this point ymdDate is after this...
        const myFullYear = this.getFullYear();
        const theirFullYear = ymdDate.getFullYear();
        let years = theirFullYear - myFullYear;

        let theirYearYMDDate;
        if (years) {
            theirYearYMDDate = this.addYears(years);
        }
        else {
            theirYearYMDDate = this;
        }

        let deltaDays = theirYearYMDDate.daysAfterMe(ymdDate);
        if (deltaDays < 0) {
            theirYearYMDDate = theirYearYMDDate.addYears(-1);
            --years;
            deltaDays = theirYearYMDDate.daysAfterMe(ymdDate);
        }

        if (deltaDays) {
            // Need to adjust for leap years...
            const nextYear = theirYearYMDDate.addYears(1);
            const daysInYear = theirYearYMDDate.daysAfterMe(nextYear);

            years += deltaDays / daysInYear;
        }

        return years;
    }


    /**
     * Compares two {@link YMDDate} objects.
     * @param {YMDDate} a
     * @param {YMDDate} b
     * @returns {number}    &lt; 0 if a is before b, &gt; 0 if a is after b, 0 if a 
     * and b represent the same date.
     */
    static compare(a, b) {
        if (a === b) {
            return 0;
        }
        if (!a) {
            return -1;
        }
        else if (!b) {
            return 1;
        }
        return a._date.valueOf() - b._date.valueOf();
    }

    /**
     * Determines if two {@link YMDDate}s represent the same date.
     * @param {YMDDate} a
     * @param {YMDDate} b
     */
    static areSame(a, b) {
        return YMDDate.compare(a, b) === 0;
    }

    /**
     * Returns an array such that YMDDate.compare(result[0], result[1]) <= 0.
     * @param {YMDDate|YMDDate[]} a   The first date, or an array of two dates.
     * @param {YMDDate} [b=a]  If <code>undefined</code> it will be set to a.
     * @returns {YMDDate[]}
     */
    static orderYMDDatePair(a, b) {
        if (Array.isArray(a)) {
            [b, a] = a;
        }
        
        if (b === undefined) {
            return [a, a];
        }
        if (a === undefined) {
            return [b, b];
        }
        if (YMDDate.compare(a, b) <= 0) {
            return [a, b];
        }
        return [b, a];
    }

    /**
     * Determines if an object represent a valid YMD date.
     * @param {object} ymdDate 
     * @returns {boolean}
     */
    static isValidDate(ymdDate) {
        if (ymdDate instanceof YMDDate) {
            return !isNaN(ymdDate.valueOf());
        }
    }
}


/**
 * Returns either the arg if the arg is a {@link YMDDate} or converts the arg to a 
 * {@link YMDDate}.
 * @param {(string|YMDDate)} date 
 * @returns {YMDDate|undefined} <code>undefined</code> is returned if date is
 * <code>undefined</code>.
 */
export function getYMDDate(date) {
    return ((date instanceof YMDDate) || (date === undefined)) ? date : new YMDDate(date);
}

/**
 * Returns either the arg if the arg is not a {@link YMDDate} or returns the result 
 * of {@link YMDDate#toString} if it is.
 * @param {(YMDDate|string)} date 
 * @returns {string}
 */
export function getYMDDateString(date) {
    return (date instanceof YMDDate) ? date.toString() : date;
}