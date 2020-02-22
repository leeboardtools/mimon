import { YMDDate } from './YMDDate';


/**
 * @typedef {object} FormatPartDef
 * @property {string}   name    The identifying name of the format part.
 */


/**
 * The classes of accounts.
 * @readonly
 * @enum {FormatPartDef}
 * @property {FormatPartDef} YEAR_4_DIGIT   Four digit year.
 * @property {FormatPartDef} YEAR_2_DIGIT   Two digit year (not recommeded, 
 * remember Y2K!)
 * @property {FormatPartDef} MONTH_2_DIGIT  2 digit month, leading 0 added as needed.
 * @property {FormatPartDef} MONTH_ANY_DIGIT    1 or 2 digit month.
 * @property {FormatPartDef} DATE_2_DIGIT   2 digit date, leading 0 added as needed.
 * @property {FormatPartDef} DATE_ANY_DIGIT 1 or 2 digit date.
 */
export const FormatPart = {
    YEAR_4_DIGIT: { name: 'YEAR_4_DIGIT',
        format: formatYear4Digit,
        parse: parseYear4Digit,
    },
    YEAR_2_DIGIT: { name: 'YEAR_2_DIGIT',
        format: formatYear2Digit,
        parse: parseYear2Digit,
    },
    MONTH_2_DIGIT: { name: 'MONTH_2_DIGIT',
        format: formatMonth2Digit,
        parse: parseMonth2Digit,
    },
    MONTH_ANY_DIGIT: { name: 'MONTH_ANY_DIGIT',
        format: formatMonthAnyDigit,
        parse: parseMonthAnyDigit,
    },
    DATE_2_DIGIT: { name: 'DATE_2_DIGIT',
        format: formatDate2Digit,
        parse: parseDate2Digit,
    },
    DATE_ANY_DIGIT: { name: 'DATE_ANY_DIGIT',
        format: formatDateAnyDigit,
        parse: parseDateAnyDigit,
    },
};


function parseNextToken(parsee) {
    const { text } = parsee;
    if (!text) {
        return;
    }
    let char = text.charAt(0);
    let digit = parseInt(char);
    if (isNaN(digit)) {
        let i = 1;
        for (; i < text.length; ++i) {
            if (!isNaN(parseInt(text.charAt(i)))) {
                break;
            }
        }

        const result = text.slice(0, i);
        parsee.text = parsee.text.slice(i);
        return result;
    }
    else {
        let value = digit;
        let i = 1;
        for (; i < text.length; ++i) {
            digit = parseInt(text.charAt(i));
            if (isNaN(digit)) {
                break;
            }
            value = value * 10 + digit;
        }

        parsee.text = parsee.text.slice(i);
        return value;
    }
}

function parseNextNumber(parsee) {
    let result = parseNextToken(parsee);
    if (typeof result === 'string') {
        result = parseNextToken(parsee);
    }
    return result;
}


function formatYear4Digit(ymdDate) {
    return ymdDate.getFullYear().toString();
}

function parseYear4Digit(parsee) {
    parsee.year = parseNextNumber(parsee);
}

function formatYear2Digit(ymdDate) {
    return ('0' + ymdDate.getFullYear()).slice(-2);
}

function parseYear2Digit(parsee) {
    parsee.year = parseNextNumber(parsee);

    const currentCentury = Math.floor(new Date().getFullYear() / 100);
    if (parsee.year >= 50) {
        parsee.year += (currentCentury - 1) * 100;
    }
    else {
        parsee.year += currentCentury * 100;
    }
}

function formatMonth2Digit(ymdDate) {
    return ('0' + (ymdDate.getMonth() + 1)).slice(-2);
}

function parseMonth2Digit(parsee) {
    parsee.month = parseNextNumber(parsee);
}

function formatMonthAnyDigit(ymdDate) {
    return (ymdDate.getMonth() + 1).toString();
}

function parseMonthAnyDigit(parsee) {
    parsee.month = parseNextNumber(parsee);
}

function formatDate2Digit(ymdDate) {
    return ('0' + ymdDate.getDate()).slice(-2);
}

function parseDate2Digit(parsee) {
    parsee.date = parseNextNumber(parsee);
}

function formatDateAnyDigit(ymdDate) {
    return ymdDate.getDate().toString();
}

function parseDateAnyDigit(parsee) {
    parsee.date = parseNextNumber(parsee);
}


/**
 * A simple class for specifying a particular date format for {@link YMDDate} 
 * and regular Date objects.
 * Will also provide parsing.
 */
export class YMDDateFormatter {
    /**
     * Constructor.
     * @param  {...any} args May be <code>undefined</code>, a standard locale 
     * indentifier string (see the Intl page}),
     * a combination of individual {@link FormatPart} objects and separator strings,
     * or an array of {@link FormatPart} objects and separator strings.
     */
    constructor(...args) {
        this._formatParts = [];

        if (args.length && args[0].type) {
            const json = args[0];
            switch (json.type) {
            case 'default':
                args = undefined;
                break;
            
            case 'locale':
                args[0] = json.locale;
                break;
            
            case 'Intl.DateTimeFormat':
                args[0] = new Intl.DateTimeFormat(json.dateTimeFormat);
                break;
            
            case 'parts':
                args = json.parts;
                break;
            }
        }


        if (!args || !args.length) {
            // Default...
            this._type = 'default';
            this._setupFromDateTimeFormat(new Intl.DateTimeFormat());
        }
        else if (typeof args[0] === 'string') {
            // Presume args[0] is the locale.
            this._type = 'locale';
            this._locale = args[0];
            this._setupFromDateTimeFormat(new Intl.DateTimeFormat(args[0]));
        }
        else if (args[0] instanceof Intl.DateTimeFormat) {
            this._type = 'Intl.DateTimeFormat';
            this._dateTimeFormat = args[0].resolvedOptions();
            this._setupFromDateTimeFormat(args[0]);
        }
        else {
            this._type = 'parts';
            if (Array.isArray(args[0])) {
                args = args[0];
            }
            
            args.forEach((part) => {
                if (typeof part === 'string') {
                    this._formatParts.push(part);
                }
                else if (part.name) {
                    part = FormatPart[part.name];
                    if (part) {
                        this._formatParts.push(part);
                    }
                }
            });
        }
    }

    _setupFromDateTimeFormat(dateTimeFormat) {
        const parts = dateTimeFormat.formatToParts(new Date(2001, 0, 1));

        this._formatParts = [];
        parts.forEach((part) => {
            switch (part.type) {
            case 'day' :
                if (part.value.length > 1) {
                    this._formatParts.push(FormatPart.DATE_2_DIGIT);
                }
                else {
                    this._formatParts.push(FormatPart.DATE_ANY_DIGIT);
                }
                break;

            case 'dayPeriod' :
                break;

            case 'era' :
                break;

            case 'fractionalSecond' :
                break;

            case 'hour' :
                break;

            case 'literal' :
                this._formatParts.push(part.value);
                break;

            case 'minute' :
                break;

            case 'month' :
                if (part.value.length > 1) {
                    this._formatParts.push(FormatPart.MONTH_2_DIGIT);
                }
                else {
                    this._formatParts.push(FormatPart.MONTH_ANY_DIGIT);
                }
                break;

            case 'second' :
                break;

            case 'timeZoneName' :
                break;

            case 'weekday' :
                break;

            case 'year' :
                if (part.value.length > 2) {
                    this._formatParts.push(FormatPart.YEAR_4_DIGIT);
                }
                else {
                    this._formatParts.push(FormatPart.YEAR_2_DIGIT);
                }
                break;
            }
        });
    }


    /**
     * @returns {object}
     */
    toJSON() {
        const json = { type: this._type, };
        switch (this._type) {
        case 'default':
            break;
        
        case 'locale':
            json.locale = this._locale;
            break;
        
        case 'Intl.DateTimeFormat':
            json.dateTimeFormat = this._dateTimeFormat;
            break;
        
        case 'parts':
            {
                const parts = [];
                this._formatParts.forEach((part) => {
                    if (typeof part === 'string') {
                        parts.push(part);
                    }
                    else if (part) {
                        parts.push({ name: part.name });
                    }
                });
                json.parts = parts;
            }
            break;
        }
        return json;
    }

    /**
     * @param {object} json 
     * @returns {YMDDateFormatter}
     */
    static fromJSON(json) {
        return new YMDDateFormatter(json);
    }


    /**
     * 
     * @param {YMDDate|Date} date 
     * @returns {string}
     */
    formatDate(date) {
        if (!this._formatParts.length) {
            return date.toString();
        }

        let text = '';
        this._formatParts.forEach((part) => {
            if (typeof part === 'string') {
                text += part;
            }
            else if (part.format) {
                text += part.format(date);
            }
        });
        return text;
    }


    /**
     * @returns {Array} An array containing the {@link FormatPart} and separator
     * strings used to format dates.
     */
    getFormatParts() {
        return this._formatParts.map((part) => Object.assign({}, part));
    }


    /**
     * Parses a string into a {@link YMDDate} using the order of the parts in
     * the formatter. Note that this may fail to parse formats based upon
     * Intl.DateTimeFormat.
     * @param {string} text 
     * @returns {YMDDate|undefined}
     */
    parseText(text) {
        if (!this._formatParts.length) {
            return new YMDDate(text);
        }

        const parsee = { text: text };
        for (let i = 0; i < this._formatParts.length; ++i) {
            const part = this._formatParts[i];
            if (part.parse) {
                part.parse(parsee);
                if (!parsee.text) {
                    break;
                }
            }
        }

        if ((parsee.year === undefined)
         || (parsee.month === undefined)
         || (parsee.date === undefined)) {
            return undefined;
        }

        return new YMDDate(parsee.year, parsee.month - 1, parsee.date);
    }
}
