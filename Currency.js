import { Quantity, DecimalDefinition } from './Quantities';

/**
 * Class defining individual currency properties. Currency objects normally should be accessed via
 * {@link Currencies} by their 3 letter currency code.
 * Currency objects are immutable.
 * @class
 */
export class Currency extends DecimalDefinition {
    constructor(options) {
        super(options);

        this._jsonNoDecimalDefinition = true;

        this._code = options.code;
        this._numericCode = options.numericCode;
        this._name = options.name;
        const formatOptions = {
            style: 'currency',
            currency: this._code,
        };
        if (options.valueToStringOptions) {
            Object.assign(formatOptions, options.valueToStringOptions);
        }
        this._valueToStringFormat = new Intl.NumberFormat(options.locale, formatOptions);

        this._valueScale = 1.0;
        for (let i = 0; i < this._decimalPlaces; ++i) {
            this._valueScale *= 10.0;
        }

        const parts = this._valueToStringFormat.formatToParts(-1234567.89);
        parts.forEach((part) => {
            switch (part.type) {
            case 'currency' :
                this._currencySymbol = part.value;
                break;
            case 'decimal' :
                this._decimalMark = part.value;
                break;
            case 'minusSign' :
                this._minusSign = part.value;
                break;
            case 'plusSign' :
                this._plusSign = part.value;
                break;
            case 'group' :
                this._groupMark = part.value;
                break;
            }
        });

        this._plusSign = this._plusSign || '+';
    }


    static fromOptions(options) {
        return (options instanceof Currency) ? options : currencyFromJSON(options);
    }


    getCode() { return this._code; }
    getNumericCode() { return this._numericCode; }
    getName() { return this._name; }


    /**
     * Converts a currency decimal value ($12.34 would be 12.34) into an internationalized currency string.
     * @param {number} value The decimal value to convert to a string.
     * @returns {string}
     */
    decimalValueToString(value) {
        return this._valueToStringFormat.format(value);
    }


    /**
     * Parses an internationalized currency string into a currency decimal value ($12.34 woudl be 12.34).
     * @param {string} string The string to parse.
     * @return {number}
     */
    decimalValueFromString(string) {
        return this.baseValueFromString(string) / this._valueScale;
    }


    /**
     * Converts a currency base value ($12.34 would be 1234) into an internationalized currency string..
     * @param {number} value The base value to convert to a string.
     * @returns {string}
     */
    baseValueToString(value) {
        return this._valueToStringFormat.format(value / this._valueScale);
    }


    /**
     * Parses an internationalized currency string into a currency base value.
     * @param {string} string The string to parse.
     * @return {number}
     */
    baseValueFromString(string) {
        let sign = 1;
        let value = 0;
        let decimalPlaces = -1;
        const length = string.length;
        for (let i = 0; i < length;) {
            if (string.startsWith(this._currencySymbol, i)) {
                i += this._currencySymbol.length;
            }
            else if (string.startsWith(this._plusSign, i)) {
                i += this._plusSign.length;
            }
            else if (string.startsWith(this._groupMark, i)) {
                i += this._groupMark.length;
            }
            else if (string.startsWith(this._minusSign, i)) {
                sign = -1;
                i += this._minusSign.length;
            }
            else if (string.startsWith(this._decimalMark, i)) {
                ++decimalPlaces;
                i += this._decimalMark.length;
            }
            else {
                const ch = string.charAt(i);
                if ((ch < '0') || (ch > '9')) {
                    throw Error('String could not be converted to a currency value.');
                }
                value = value * 10 + parseInt(ch, 10) - '0';
                if (decimalPlaces >= 0) {
                    ++decimalPlaces;
                }
                ++i;
            }
        }

        for (; decimalPlaces > this._decimalPlaces; --decimalPlaces) {
            value /= 10;
        }
        for (decimalPlaces = Math.max(decimalPlaces, 0); decimalPlaces < this._decimalPlaces; ++decimalPlaces) {
            value *= 10;
        }

        return Math.round(sign * value);
    }



    /**
     * Converts a currency base value ($12.34 would be 1234) into an internationalized currency string leaving out selected
     * parts of the currency string.
     * @param {number} value
     * @param {string[]}    partsToSkip The array of parts to skip, these are the part types from
     * [Intl.NumberFormat.prototype.formatToParts()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat/formatToParts}.
     */
    formatBaseValueWithParts(value, partsToSkip) {
        if (!Array.isArray(partsToSkip)) {
            partsToSkip = [partsToSkip];
        }

        let text = '';
        this._valueToStringFormat.formatToParts(value / this._valueScale).map(({ type, value }) => {
            if (!partsToSkip.includes(type)) {
                text += value;
            }
        });
        return text;
    }


    /**
     * Converts a currency base value ($12.34 would be 1234) into an internationalized currency string without the currency symbol
     * or the group marker.
     * @param {number} value
     */
    baseValueToSimpleString(value) {
        return this.formatBaseValueWithParts(value, ['currency', 'group']);
    }


    /**
     * Converts a currency base value ($12.34 would be 1234) into an internationalized currency string without the currency symbol.
     * @param {number} value
     */
    baseValueToNoCurrencyString(value) {
        return this.formatBaseValueWithParts(value, ['currency']);
    }


    // From QuantityDefinition
    toValueText(quantity) {
        return this.baseValueToString(quantity.toNumber());
    }

    // From QuantityDefinition
    fromValueText(valueText) {
        try {
            const value = this.baseValueFromString(valueText);
            return this.fromNumber(value);
        }
        catch (e) {
            return undefined;
        }
    }


    _checkAddSubtractQuantities(quantities, errMsg) {
        for (let i = 0; i < quantities.length; ++i) {
            const quantity = quantities[i];
            if (!(quantity instanceof Quantity)) {
                throw Error(errMsg);
            }
            if (quantity.getDefinition().getCode() !== this.getCode()) {
                throw Error(errMsg);
            }
        }
    }

    // From QuantityDefinition
    addQuantities(quantities) {
        // Can only add quantities that all have the same currency.
        this._checkAddSubtractQuantities(quantities, 'Quantities with currencies can only be added to quantities of the same currency.');
        super.addQuantities(quantities);
    }

    // From QuantityDefinition
    subtractQuantities(quantities) {
        // Can only subtract quantities that all have the same currency.
        this._checkAddSubtractQuantities(quantities, 'Quantities with currencies can only be added to quantities of the same currency.');
        super.subtractQuantities(quantities);
    }

    // From QuantityDefinition
    multiplyQuantities(quantities) {
        // We only allow one quantity with currency in the multplication, and it must match this currency.
        let isCurrencyQuantity;
        quantities.forEach((quantity) => {
            if (quantity instanceof Quantity) {
                const definition = quantity.getDefinition();
                if (definition instanceof Currency) {
                    if (isCurrencyQuantity) {
                        throw Error('Quantities with currencies can only be multiplied by scalar values/quantities.');
                    }
                    isCurrencyQuantity = true;
                    if (definition.getCode() !== this.getCode()) {
                        throw Error('The quantity of a currency being multiplied must match the currency doing the multiplication.');
                    }
                }
            }
        });
        super.multiplyQuantities(quantities);
    }


    /**
     * Registers a simple processor supporting Currency objects in a {@link JSONObjectProcessor}.
     * Note that if you extend Currency, and have separate JSON object processing for that class,
     * you should set a <code>_jsonNoCurrency</code> property to <code>true</code> in that class.
     * @param {JSONProcessor} jsonProcessor The JSON object processor.
     */
    static registerWithJSONObjectProcessor(jsonProcessor) {
        jsonProcessor.addSimpleObjectProcessor({
            name: 'Currency',
            isForObject: (object) => object instanceof Currency && !object._jsonNoCurrency,
            fromJSON: (json) => Currencies[json],
            toJSON: (object) => object.getCode(),
        });
    }
}


// From https://www.currency-iso.org/en/home/tables/table-a1.html, list_one.xls
export const Currencies = {
    AED: new Currency({ code: 'AED', numericCode: 784, name: 'UAE Dirham', decimalPlaces: 2, }),
    ALL: new Currency({ code: 'ALL', numericCode: 8, name: 'Lek', decimalPlaces: 2, }),
    AMD: new Currency({ code: 'AMD', numericCode: 51, name: 'Armenian Dram', decimalPlaces: 2, }),
    ANG: new Currency({ code: 'ANG', numericCode: 532, name: 'Netherlands Antillean Guilder', decimalPlaces: 2, }),
    AOA: new Currency({ code: 'AOA', numericCode: 973, name: 'Kwanza', decimalPlaces: 2, }),
    ARS: new Currency({ code: 'ARS', numericCode: 32, name: 'Argentine Peso', decimalPlaces: 2, }),
    AUD: new Currency({ code: 'AUD', numericCode: 36, name: 'Australian Dollar', decimalPlaces: 2, }),
    AWG: new Currency({ code: 'AWG', numericCode: 533, name: 'Aruban Florin', decimalPlaces: 2, }),
    AZN: new Currency({ code: 'AZN', numericCode: 944, name: 'Azerbaijan Manat', decimalPlaces: 2, }),
    BAM: new Currency({ code: 'BAM', numericCode: 977, name: 'Convertible Mark', decimalPlaces: 2, }),
    BBD: new Currency({ code: 'BBD', numericCode: 52, name: 'Barbados Dollar', decimalPlaces: 2, }),
    BDT: new Currency({ code: 'BDT', numericCode: 50, name: 'Taka', decimalPlaces: 2, }),
    BGN: new Currency({ code: 'BGN', numericCode: 975, name: 'Bulgarian Lev', decimalPlaces: 2, }),
    BHD: new Currency({ code: 'BHD', numericCode: 48, name: 'Bahraini Dinar', decimalPlaces: 3, }),
    BIF: new Currency({ code: 'BIF', numericCode: 108, name: 'Burundi Franc', decimalPlaces: 0, }),
    BMD: new Currency({ code: 'BMD', numericCode: 60, name: 'Bermudian Dollar', decimalPlaces: 2, }),
    BND: new Currency({ code: 'BND', numericCode: 96, name: 'Brunei Dollar', decimalPlaces: 2, }),
    BOB: new Currency({ code: 'BOB', numericCode: 68, name: 'Boliviano', decimalPlaces: 2, }),
    BOV: new Currency({ code: 'BOV', numericCode: 984, name: 'Mvdol', decimalPlaces: 2, }),
    BRL: new Currency({ code: 'BRL', numericCode: 986, name: 'Brazilian Real', decimalPlaces: 2, }),
    BSD: new Currency({ code: 'BSD', numericCode: 44, name: 'Bahamian Dollar', decimalPlaces: 2, }),
    BTN: new Currency({ code: 'BTN', numericCode: 64, name: 'Ngultrum', decimalPlaces: 2, }),
    BWP: new Currency({ code: 'BWP', numericCode: 72, name: 'Pula', decimalPlaces: 2, }),
    BYN: new Currency({ code: 'BYN', numericCode: 933, name: 'Belarusian Ruble', decimalPlaces: 2, }),
    BZD: new Currency({ code: 'BZD', numericCode: 84, name: 'Belize Dollar', decimalPlaces: 2, }),
    CAD: new Currency({ code: 'CAD', numericCode: 124, name: 'Canadian Dollar', decimalPlaces: 2, }),
    CDF: new Currency({ code: 'CDF', numericCode: 976, name: 'Congolese Franc', decimalPlaces: 2, }),
    CHE: new Currency({ code: 'CHE', numericCode: 947, name: 'WIR Euro', decimalPlaces: 2, }),
    CHF: new Currency({ code: 'CHF', numericCode: 756, name: 'Swiss Franc', decimalPlaces: 2, }),
    CHW: new Currency({ code: 'CHW', numericCode: 948, name: 'WIR Franc', decimalPlaces: 2, }),
    CLF: new Currency({ code: 'CLF', numericCode: 990, name: 'Unidad de Fomento', decimalPlaces: 4, }),
    CLP: new Currency({ code: 'CLP', numericCode: 152, name: 'Chilean Peso', decimalPlaces: 0, }),
    CNY: new Currency({ code: 'CNY', numericCode: 156, name: 'Yuan Renminbi', decimalPlaces: 2, }),
    COP: new Currency({ code: 'COP', numericCode: 170, name: 'Colombian Peso', decimalPlaces: 2, }),
    COU: new Currency({ code: 'COU', numericCode: 970, name: 'Unidad de Valor Real', decimalPlaces: 2, }),
    CRC: new Currency({ code: 'CRC', numericCode: 188, name: 'Costa Rican Colon', decimalPlaces: 2, }),
    CUC: new Currency({ code: 'CUC', numericCode: 931, name: 'Peso Convertible', decimalPlaces: 2, }),
    CUP: new Currency({ code: 'CUP', numericCode: 192, name: 'Cuban Peso', decimalPlaces: 2, }),
    CVE: new Currency({ code: 'CVE', numericCode: 132, name: 'Cabo Verde Escudo', decimalPlaces: 2, }),
    CZK: new Currency({ code: 'CZK', numericCode: 203, name: 'Czech Koruna', decimalPlaces: 2, }),
    DJF: new Currency({ code: 'DJF', numericCode: 262, name: 'Djibouti Franc', decimalPlaces: 0, }),
    DKK: new Currency({ code: 'DKK', numericCode: 208, name: 'Danish Krone', decimalPlaces: 2, }),
    DOP: new Currency({ code: 'DOP', numericCode: 214, name: 'Dominican Peso', decimalPlaces: 2, }),
    DZD: new Currency({ code: 'DZD', numericCode: 12, name: 'Algerian Dinar', decimalPlaces: 2, }),
    EGP: new Currency({ code: 'EGP', numericCode: 818, name: 'Egyptian Pound', decimalPlaces: 2, }),
    ERN: new Currency({ code: 'ERN', numericCode: 232, name: 'Nakfa', decimalPlaces: 2, }),
    ETB: new Currency({ code: 'ETB', numericCode: 230, name: 'Ethiopian Birr', decimalPlaces: 2, }),
    EUR: new Currency({ code: 'EUR', numericCode: 978, name: 'Euro', decimalPlaces: 2, }),
    FJD: new Currency({ code: 'FJD', numericCode: 242, name: 'Fiji Dollar', decimalPlaces: 2, }),
    FKP: new Currency({ code: 'FKP', numericCode: 238, name: 'Falkland Islands Pound', decimalPlaces: 2, }),
    GBP: new Currency({ code: 'GBP', numericCode: 826, name: 'Pound Sterling', decimalPlaces: 2, }),
    GEL: new Currency({ code: 'GEL', numericCode: 981, name: 'Lari', decimalPlaces: 2, }),
    GHS: new Currency({ code: 'GHS', numericCode: 936, name: 'Ghana Cedi', decimalPlaces: 2, }),
    GIP: new Currency({ code: 'GIP', numericCode: 292, name: 'Gibraltar Pound', decimalPlaces: 2, }),
    GMD: new Currency({ code: 'GMD', numericCode: 270, name: 'Dalasi', decimalPlaces: 2, }),
    GNF: new Currency({ code: 'GNF', numericCode: 324, name: 'Guinean Franc', decimalPlaces: 0, }),
    GTQ: new Currency({ code: 'GTQ', numericCode: 320, name: 'Quetzal', decimalPlaces: 2, }),
    GYD: new Currency({ code: 'GYD', numericCode: 328, name: 'Guyana Dollar', decimalPlaces: 2, }),
    HKD: new Currency({ code: 'HKD', numericCode: 344, name: 'Hong Kong Dollar', decimalPlaces: 2, }),
    HNL: new Currency({ code: 'HNL', numericCode: 340, name: 'Lempira', decimalPlaces: 2, }),
    HRK: new Currency({ code: 'HRK', numericCode: 191, name: 'Kuna', decimalPlaces: 2, }),
    HTG: new Currency({ code: 'HTG', numericCode: 332, name: 'Gourde', decimalPlaces: 2, }),
    HUF: new Currency({ code: 'HUF', numericCode: 348, name: 'Forint', decimalPlaces: 2, }),
    IDR: new Currency({ code: 'IDR', numericCode: 360, name: 'Rupiah', decimalPlaces: 2, }),
    ILS: new Currency({ code: 'ILS', numericCode: 376, name: 'New Israeli Sheqel', decimalPlaces: 2, }),
    INR: new Currency({ code: 'INR', numericCode: 356, name: 'Indian Rupee', decimalPlaces: 2, }),
    IQD: new Currency({ code: 'IQD', numericCode: 368, name: 'Iraqi Dinar', decimalPlaces: 3, }),
    IRR: new Currency({ code: 'IRR', numericCode: 364, name: 'Iranian Rial', decimalPlaces: 2, }),
    ISK: new Currency({ code: 'ISK', numericCode: 352, name: 'Iceland Krona', decimalPlaces: 0, }),
    JMD: new Currency({ code: 'JMD', numericCode: 388, name: 'Jamaican Dollar', decimalPlaces: 2, }),
    JOD: new Currency({ code: 'JOD', numericCode: 400, name: 'Jordanian Dinar', decimalPlaces: 3, }),
    JPY: new Currency({ code: 'JPY', numericCode: 392, name: 'Yen', decimalPlaces: 0, }),
    KES: new Currency({ code: 'KES', numericCode: 404, name: 'Kenyan Shilling', decimalPlaces: 2, }),
    KGS: new Currency({ code: 'KGS', numericCode: 417, name: 'Som', decimalPlaces: 2, }),
    KHR: new Currency({ code: 'KHR', numericCode: 116, name: 'Riel', decimalPlaces: 2, }),
    KMF: new Currency({ code: 'KMF', numericCode: 174, name: 'Comorian Franc ', decimalPlaces: 0, }),
    KPW: new Currency({ code: 'KPW', numericCode: 408, name: 'North Korean Won', decimalPlaces: 2, }),
    KRW: new Currency({ code: 'KRW', numericCode: 410, name: 'Won', decimalPlaces: 0, }),
    KWD: new Currency({ code: 'KWD', numericCode: 414, name: 'Kuwaiti Dinar', decimalPlaces: 3, }),
    KYD: new Currency({ code: 'KYD', numericCode: 136, name: 'Cayman Islands Dollar', decimalPlaces: 2, }),
    KZT: new Currency({ code: 'KZT', numericCode: 398, name: 'Tenge', decimalPlaces: 2, }),
    LAK: new Currency({ code: 'LAK', numericCode: 418, name: 'Lao Kip', decimalPlaces: 2, }),
    LBP: new Currency({ code: 'LBP', numericCode: 422, name: 'Lebanese Pound', decimalPlaces: 2, }),
    LKR: new Currency({ code: 'LKR', numericCode: 144, name: 'Sri Lanka Rupee', decimalPlaces: 2, }),
    LRD: new Currency({ code: 'LRD', numericCode: 430, name: 'Liberian Dollar', decimalPlaces: 2, }),
    LSL: new Currency({ code: 'LSL', numericCode: 426, name: 'Loti', decimalPlaces: 2, }),
    LYD: new Currency({ code: 'LYD', numericCode: 434, name: 'Libyan Dinar', decimalPlaces: 3, }),
    MAD: new Currency({ code: 'MAD', numericCode: 504, name: 'Moroccan Dirham', decimalPlaces: 2, }),
    MDL: new Currency({ code: 'MDL', numericCode: 498, name: 'Moldovan Leu', decimalPlaces: 2, }),
    MGA: new Currency({ code: 'MGA', numericCode: 969, name: 'Malagasy Ariary', decimalPlaces: 2, }),
    MKD: new Currency({ code: 'MKD', numericCode: 807, name: 'Denar', decimalPlaces: 2, }),
    MMK: new Currency({ code: 'MMK', numericCode: 104, name: 'Kyat', decimalPlaces: 2, }),
    MNT: new Currency({ code: 'MNT', numericCode: 496, name: 'Tugrik', decimalPlaces: 2, }),
    MOP: new Currency({ code: 'MOP', numericCode: 446, name: 'Pataca', decimalPlaces: 2, }),
    MRU: new Currency({ code: 'MRU', numericCode: 929, name: 'Ouguiya', decimalPlaces: 2, }),
    MUR: new Currency({ code: 'MUR', numericCode: 480, name: 'Mauritius Rupee', decimalPlaces: 2, }),
    MVR: new Currency({ code: 'MVR', numericCode: 462, name: 'Rufiyaa', decimalPlaces: 2, }),
    MWK: new Currency({ code: 'MWK', numericCode: 454, name: 'Malawi Kwacha', decimalPlaces: 2, }),
    MXN: new Currency({ code: 'MXN', numericCode: 484, name: 'Mexican Peso', decimalPlaces: 2, }),
    MXV: new Currency({ code: 'MXV', numericCode: 979, name: 'Mexican Unidad de Inversion (UDI)', decimalPlaces: 2, }),
    MYR: new Currency({ code: 'MYR', numericCode: 458, name: 'Malaysian Ringgit', decimalPlaces: 2, }),
    MZN: new Currency({ code: 'MZN', numericCode: 943, name: 'Mozambique Metical', decimalPlaces: 2, }),
    NAD: new Currency({ code: 'NAD', numericCode: 516, name: 'Namibia Dollar', decimalPlaces: 2, }),
    NGN: new Currency({ code: 'NGN', numericCode: 566, name: 'Naira', decimalPlaces: 2, }),
    NIO: new Currency({ code: 'NIO', numericCode: 558, name: 'Cordoba Oro', decimalPlaces: 2, }),
    NOK: new Currency({ code: 'NOK', numericCode: 578, name: 'Norwegian Krone', decimalPlaces: 2, }),
    NPR: new Currency({ code: 'NPR', numericCode: 524, name: 'Nepalese Rupee', decimalPlaces: 2, }),
    NZD: new Currency({ code: 'NZD', numericCode: 554, name: 'New Zealand Dollar', decimalPlaces: 2, }),
    OMR: new Currency({ code: 'OMR', numericCode: 512, name: 'Rial Omani', decimalPlaces: 3, }),
    PAB: new Currency({ code: 'PAB', numericCode: 590, name: 'Balboa', decimalPlaces: 2, }),
    PEN: new Currency({ code: 'PEN', numericCode: 604, name: 'Sol', decimalPlaces: 2, }),
    PGK: new Currency({ code: 'PGK', numericCode: 598, name: 'Kina', decimalPlaces: 2, }),
    PHP: new Currency({ code: 'PHP', numericCode: 608, name: 'Philippine Peso', decimalPlaces: 2, }),
    PKR: new Currency({ code: 'PKR', numericCode: 586, name: 'Pakistan Rupee', decimalPlaces: 2, }),
    PLN: new Currency({ code: 'PLN', numericCode: 985, name: 'Zloty', decimalPlaces: 2, }),
    PYG: new Currency({ code: 'PYG', numericCode: 600, name: 'Guarani', decimalPlaces: 0, }),
    QAR: new Currency({ code: 'QAR', numericCode: 634, name: 'Qatari Rial', decimalPlaces: 2, }),
    RON: new Currency({ code: 'RON', numericCode: 946, name: 'Romanian Leu', decimalPlaces: 2, }),
    RSD: new Currency({ code: 'RSD', numericCode: 941, name: 'Serbian Dinar', decimalPlaces: 2, }),
    RUB: new Currency({ code: 'RUB', numericCode: 643, name: 'Russian Ruble', decimalPlaces: 2, }),
    RWF: new Currency({ code: 'RWF', numericCode: 646, name: 'Rwanda Franc', decimalPlaces: 0, }),
    SAR: new Currency({ code: 'SAR', numericCode: 682, name: 'Saudi Riyal', decimalPlaces: 2, }),
    SBD: new Currency({ code: 'SBD', numericCode: 90, name: 'Solomon Islands Dollar', decimalPlaces: 2, }),
    SCR: new Currency({ code: 'SCR', numericCode: 690, name: 'Seychelles Rupee', decimalPlaces: 2, }),
    SDG: new Currency({ code: 'SDG', numericCode: 938, name: 'Sudanese Pound', decimalPlaces: 2, }),
    SEK: new Currency({ code: 'SEK', numericCode: 752, name: 'Swedish Krona', decimalPlaces: 2, }),
    SGD: new Currency({ code: 'SGD', numericCode: 702, name: 'Singapore Dollar', decimalPlaces: 2, }),
    SHP: new Currency({ code: 'SHP', numericCode: 654, name: 'Saint Helena Pound', decimalPlaces: 2, }),
    SLL: new Currency({ code: 'SLL', numericCode: 694, name: 'Leone', decimalPlaces: 2, }),
    SOS: new Currency({ code: 'SOS', numericCode: 706, name: 'Somali Shilling', decimalPlaces: 2, }),
    SRD: new Currency({ code: 'SRD', numericCode: 968, name: 'Surinam Dollar', decimalPlaces: 2, }),
    SSP: new Currency({ code: 'SSP', numericCode: 728, name: 'South Sudanese Pound', decimalPlaces: 2, }),
    STN: new Currency({ code: 'STN', numericCode: 930, name: 'Dobra', decimalPlaces: 2, }),
    SVC: new Currency({ code: 'SVC', numericCode: 222, name: 'El Salvador Colon', decimalPlaces: 2, }),
    SYP: new Currency({ code: 'SYP', numericCode: 760, name: 'Syrian Pound', decimalPlaces: 2, }),
    SZL: new Currency({ code: 'SZL', numericCode: 748, name: 'Lilangeni', decimalPlaces: 2, }),
    THB: new Currency({ code: 'THB', numericCode: 764, name: 'Baht', decimalPlaces: 2, }),
    TJS: new Currency({ code: 'TJS', numericCode: 972, name: 'Somoni', decimalPlaces: 2, }),
    TMT: new Currency({ code: 'TMT', numericCode: 934, name: 'Turkmenistan New Manat', decimalPlaces: 2, }),
    TND: new Currency({ code: 'TND', numericCode: 788, name: 'Tunisian Dinar', decimalPlaces: 3, }),
    TOP: new Currency({ code: 'TOP', numericCode: 776, name: 'Pa’anga', decimalPlaces: 2, }),
    TRY: new Currency({ code: 'TRY', numericCode: 949, name: 'Turkish Lira', decimalPlaces: 2, }),
    TTD: new Currency({ code: 'TTD', numericCode: 780, name: 'Trinidad and Tobago Dollar', decimalPlaces: 2, }),
    TWD: new Currency({ code: 'TWD', numericCode: 901, name: 'New Taiwan Dollar', decimalPlaces: 2, }),
    TZS: new Currency({ code: 'TZS', numericCode: 834, name: 'Tanzanian Shilling', decimalPlaces: 2, }),
    UAH: new Currency({ code: 'UAH', numericCode: 980, name: 'Hryvnia', decimalPlaces: 2, }),
    UGX: new Currency({ code: 'UGX', numericCode: 800, name: 'Uganda Shilling', decimalPlaces: 0, }),
    USD: new Currency({ code: 'USD', numericCode: 840, name: 'US Dollar', decimalPlaces: 2, }),
    USN: new Currency({ code: 'USN', numericCode: 997, name: 'US Dollar (Next day)', decimalPlaces: 2, }),
    UYI: new Currency({ code: 'UYI', numericCode: 940, name: 'Uruguay Peso en Unidades Indexadas (UI)', decimalPlaces: 0, }),
    UYU: new Currency({ code: 'UYU', numericCode: 858, name: 'Peso Uruguayo', decimalPlaces: 2, }),
    UYW: new Currency({ code: 'UYW', numericCode: 927, name: 'Unidad Previsional', decimalPlaces: 4, }),
    UZS: new Currency({ code: 'UZS', numericCode: 860, name: 'Uzbekistan Sum', decimalPlaces: 2, }),
    VES: new Currency({ code: 'VES', numericCode: 928, name: 'Bolívar Soberano', decimalPlaces: 2, }),
    VND: new Currency({ code: 'VND', numericCode: 704, name: 'Dong', decimalPlaces: 0, }),
    VUV: new Currency({ code: 'VUV', numericCode: 548, name: 'Vatu', decimalPlaces: 0, }),
    WST: new Currency({ code: 'WST', numericCode: 882, name: 'Tala', decimalPlaces: 2, }),
    XAF: new Currency({ code: 'XAF', numericCode: 950, name: 'CFA Franc BEAC', decimalPlaces: 0, }),
    XCD: new Currency({ code: 'XCD', numericCode: 951, name: 'East Caribbean Dollar', decimalPlaces: 2, }),
    XOF: new Currency({ code: 'XOF', numericCode: 952, name: 'CFA Franc BCEAO', decimalPlaces: 0, }),
    XPF: new Currency({ code: 'XPF', numericCode: 953, name: 'CFP Franc', decimalPlaces: 0, }),
    YER: new Currency({ code: 'YER', numericCode: 886, name: 'Yemeni Rial', decimalPlaces: 2, }),
    ZAR: new Currency({ code: 'ZAR', numericCode: 710, name: 'Rand', decimalPlaces: 2, }),
    ZMW: new Currency({ code: 'ZMW', numericCode: 967, name: 'Zambian Kwacha', decimalPlaces: 2, }),
    ZWL: new Currency({ code: 'ZWL', numericCode: 932, name: 'Zimbabwe Dollar', decimalPlaces: 2, }),
};

export function currencyToJSON(currency) {
    return (currency) ? (Currencies[currency.getCode()] ? currency.getCode() : currency) : undefined;
}

export function currencyFromJSON(json) {
    return (json) ? ((typeof json === 'string') ? Currencies[json] : new Currency(json)) : undefined;
}


export const USD = Currencies.USD;
export const EUR = Currencies.EUR;
