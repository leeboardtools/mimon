/**
 * Represents a quantity of something. Quantities are strictly controlled so that the allowed math involving
 * quantities results in exact results.
 * <p>
 * Quantities are based upon a {@link QuantityDefinition}, which defines the properties of a quantity. The QuantityDefinition
 * handles the actual manipulation of the quantites.
 * <p>
 * Quantities store their value as an integer. All math is performed with integers. The QuantityDefinition determines
 * the meaning of this base value.
 * <p>
 * Quantity objects are immutable. All manipulation methods result in a new Quantity object being created.
 * @class
 */
export class Quantity {
    /**
     * @typedef {object} Quantity~Options
     * @property {number}   numberValue    The number value to be converted to the base value.
     * @property {number}   baseValue   The base value, this is rounded to an integer. This takes precedence over numberValue.
     * @property {QuantityDefinition|string}   definition  The quantity definition. If a string then {@link getQuantityDefinition} is called
     * to retrieve the definition associated with the string.
     */
    constructor(options) {
        if (options instanceof Quantity) {
            options = {
                definition: options.getDefinition(),
                baseValue: options.getBaseValue(),
            };
        }

        this._definition = QuantityDefinition.fromOptions(options.definition);

        if ((options.baseValue !== undefined) && (options.baseValue !== null)) {
            this._baseValue = Math.round(options.baseValue);
        }
        else if ((options.numberValue !== undefined) && (options.numberValue !== null)) {
            this._baseValue = this._definition.numberToBaseValue(options.numberValue);
        }
        else {
            this._baseValue = 0;
        }
    }

    static fromOptions(options) {
        return (options instanceof Quantity) ? options : new Quantity(options);
    }

    static isOptionsInvalid(options) {
        if (options instanceof Quantity) {
            return;
        }

        if (!QuantityDefinition.fromOptions(options.definition)) {
            return Error();
        }
    }

    toJSON(arg, processor, definitionLibrary) {
        const json = {
            baseValue: this._baseValue,
        };

        const definitionName = (definitionLibrary) ? definitionLibrary.getName(this._definition) : undefined;
        if (definitionName) {
            json.definitionName = definitionName;
        }
        else {
            json.definition = (processor) ? processor.objectToJSON(this._definition) : this._definition.definitionToJSON();
        }
        return json;
    }

    static preprocessFromJSON(json, processor, definitionLibrary) {
        const libraryDefinition = (definitionLibrary) ? definitionLibrary.getDefinition(json.definitionName) : undefined;
        if (libraryDefinition) {
            json.definition = libraryDefinition;
        }
        else {
            json.definition = processor.objectFromJSON(json.definition);
        }
        return json;
    }

    /**
     * Registers a simple processor supporting IdGenerator objects in a {@link JSONObjectProcessor}.
     * Note that if you extend Quantity, and have separate JSON object processing for that class,
     * you should set a <code>_jsonNoQuantity</code> property to <code>true</code> in that class.
     * @param {JSONProcessor} jsonProcessor The JSON object processor.
     * @param {QuantityDefinitionLibrary}   [definitionLibrary] Optional library of quantity definitions holding
     * pre-defined quantity definitions.
     */
    static registerWithJSONObjectProcessor(jsonProcessor, definitionLibrary) {
        jsonProcessor.addSimpleObjectProcessor({
            name: 'Quantity',
            isForObject: (object) => object instanceof Quantity && !object._jsonNoQuantity,
            fromJSON: (json, processor) => {
                Quantity.preprocessFromJSON(json, processor, definitionLibrary);
                return new Quantity(json);
            },
            toJSON: (object, processor) => object.toJSON(undefined, processor, definitionLibrary),
        });

        DecimalDefinition.registerWithJSONObjectProcessor(jsonProcessor, definitionLibrary);
    }


    /**
     * Determines if two quantities are the same, that is they have the same value and definition.
     * @param {Quantity} a
     * @param {Quantity} b
     * @returns {boolean}
     */
    static areSame(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }

        if (a._baseValue !== b._baseValue) {
            return false;
        }
        if (a._definition !== b._definition) {
            if (!a._definition.isSameDefinition(b._definition)) {
                return false;
            }
        }

        return true;
    }


    /**
     * @returns {number}    The quantity's base value, which is always an integer.
     */
    getBaseValue() {
        return this._baseValue;
    }

    /**
     * @returns {QuantityDefinition}    The quantity's definition.
     */
    getDefinition() {
        return this._definition;
    }

    /**
     * @returns {number}    The number representation of the quantity, this is most likely not exact.
     */
    toNumber() {
        return this._definition.baseValueToNumber(this._baseValue);
    }

    /**
     * Creates a {@link Quantity} with this quantity's definition that most closely matches a given number.
     * @param {number} number The number of interest.
     * @returns {Quantity}
     */
    fromNumber(number) {
        return this._definition.quantityFromNumber(number);
    }


    /**
     * @returns {string}    A text representation of the quantity. This is parseable back into a similar quantity
     * via {@link Quantity#fromValueText} if the definition is the same.
     */
    toValueText() {
        return this._definition.baseValueToValueText(this._baseValue);
    }

    /**
     * @typedef {object}    Quantity~ParseResult    The result of parsing a quantity.
     * @property {Quantity} quantity    The parsed quantity with the current definition.
     * @property {Quantity} fullQuantity    The parsed quantity in full resolution if the value text represented a higher
     * resolution quantity, otherwise it is the same as quantity.
     * @property {string}   remainingText   The text following the parsed quantity.
     */

    /**
     * Parses a value text string generated by {@link Quantity#toValueText} back into a {@link Quantity}.
     * @param {string} valueText The value text to parse.
     * @returns {Quantity#ParseResult|undefined}    The parse result, <code>undefined</code> if valueText could not be parsed.
     */
    fromValueText(valueText) {
        return this._definition.fromValueText(valueText);
    }


    /**
     * Finds the quantity in an array of quantities whose definition has the highest resolution.
     * If multiple quantities have the same resolution the first one is returned.
     * @param {Quantity[]} quantities The array of quantities to go over. Elements may be a number, in which case they are ignored.
     * @returns {Quantity}  The quantity with the highest resolution.
     */
    static getHighestResolutionQuantity(quantities) {
        let quantity;
        let definition;
        let i = 0;
        for (; i < quantities.length; ++i) {
            if (quantities[i] instanceof Quantity) {
                quantity = quantities[i];
                definition = quantity.getDefinition();
                break;
            }
        }
        for (++i; i < quantities.length; ++i) {
            if (!(quantities[i] instanceof Quantity)) {
                continue;
            }

            if (definition.compareDefinitionResolution(quantities[i].getDefinition()) < 0) {
                quantity = quantities[i];
                definition = quantity.getDefinition();
            }
        }

        return quantity;
    }


    /**
     * Adds several quantities together. The result is set to the definition of the highest resolution quantity.
     * @param {(Quantity[]|...Quantity)} args The quantities to be added, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}
     */
    static addQuantities(args) {
        if (!Array.isArray(args)) {
            return Quantity.addQuantities(Array.prototype.slice.call(arguments));
        }

        const quantities = args;
        const refQuantity = Quantity.getHighestResolutionQuantity(quantities);
        return refQuantity._definition.addQuantities(quantities);
    }

    /**
     * Adds one or more quantities to this quantity. The result has the same definition as this quantity.
     * @param {(Quantity[]|...Quantity)} args The quantities to be added to this quantity, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}
     */
    add(args) {
        if ((args instanceof Quantity) && (arguments.length === 1)) {
            return this._definition.addQuantities([this, args]);
        }
        else if (!Array.isArray(args)) {
            return this.add(Array.prototype.slice.call(arguments));
        }
        return this._definition.addQuantities([this].concat(args));
    }


    /**
     * Subtracts one or more quantities from a quantity. The result is set to the definition of the highest resolution quantity.
     * @param {(Quantity[]|...Quantity)} args The quantities to be subtracted, either an array of {@link Quantity}s or as individual parameters.
     * All quantities after the first quantity are subtracted from the first quantity.
     * @returns {Quantity}
     */
    static subtractQuantities(args) {
        if (!Array.isArray(args)) {
            return Quantity.subtractQuantities(Array.prototype.slice.call(arguments));
        }

        const quantities = args;
        const refQuantity = Quantity.getHighestResolutionQuantity(quantities);
        return refQuantity._definition.subtractQuantities(quantities);
    }

    /**
     * Subtracts one or more quantities from this quantity. The result has the same definition as this quantity.
     * @param {(Quantity[]|...Quantity)} args The quantities to be subtacted from this quantity, either an array of {@link Quantity}s or as individual parameters.
     * Individual elements may be numbers.
     * @returns {Quantity}
     */
    subtract(args) {
        if ((args instanceof Quantity) && (arguments.length === 1)) {
            return this._definition.subtractQuantities([this, args]);
        }
        else if (!Array.isArray(args)) {
            return this.subtract(Array.prototype.slice.call(arguments));
        }
        return this._definition.subtractQuantities([this].concat(args));
    }


    /**
     * @returns {Quantity}  The negative of this quantity.
     */
    negate() {
        return this._definition.negateQuantity(this);
    }


    /**
     * Multiplies several quantities together. The result uses the definition of the highest resolution quantity.
     * Note that multiplication is typically a lossy operation.
     * @param {(Quantity[]|...Quantity)} args The quantities to be multiplied, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}
     */
    static multiplyQuantities(args) {
        if (!Array.isArray(args)) {
            return Quantity.multiplyQuantities(Array.prototype.slice.call(arguments));
        }

        const quantities = args;
        const refQuantity = Quantity.getHighestResolutionQuantity(quantities);
        return refQuantity._definition.multiplyQuantities(quantities);
    }

    /**
     * Multiplies one or more quantities with this quantity. The result has the same definition as this quantity.
     * Note that multiplication is typically a lossy operation.
     * @param {(Quantity[]|...Quantity)} args The quantities to be multiplied with this quantity, either an array of {@link Quantity}s or as individual parameters.
     * Individual elements may be numbers.
     * @returns {Quantity}
     */
    multiply(args) {
        if ((args instanceof Quantity) && (arguments.length === 1)) {
            return this._definition.multiplyQuantities([this, args]);
        }
        else if (!Array.isArray(args)) {
            return this.multiply(Array.prototype.slice.call(arguments));
        }
        return this._definition.multiplyQuantities([this].concat(args));
    }


    /**
     * Subdivides the quantity into several quantities according to a set of proportions.
     * Note that the final quantity is adjusted as necessary so that the sum of all the sub-divided quantities
     * is the same as this quantity.
     * @param {(number[]|...number)} args Defines the proportions, may be an array of numbers or a list of numbers as individual parameters.
     * The total number of subdivided quantities is the number of proportion values, each subdivided quantity is approximately
     * proportion[i] / proportionSum of the original value, with the exception of the final subdivided quantity, which is always
     * set so that the sum of all the subdivided quantities equals this quantity.
     * @returns {Quantity[]}    The array of the subdivided quantities, all the quantities have the same definition as this quantity.
     */
    subdivide(args) {
        if ((args instanceof Quantity) && (arguments.length === 1)) {
            return this._definition.subDivideQuantity(this, [args]);
        }
        else if (!Array.isArray(args)) {
            return this.subdivide(Array.prototype.slice.call(arguments));
        }

        const baseValues = this._definition.subdivideBaseValue(this._baseValue, args);
        return baseValues.map((baseValue) => new Quantity({ baseValue: baseValue, definition: this._definition }));
    }
}


const registeredDefinitions = new Map();


/**
 * Interface for the objects used to define the resolution of {@link Quantity}s.
 * Note that most methods that take a single {@link Quantity} argument presume that the definition
 * being called is the definition of the quantity.
 * @interface
 */
class QuantityDefinition {
    static fromOptions(options) {
        return (options instanceof QuantityDefinition) ? options : getQuantityDefinition(options);
    }


    /**
     * The name of the quantity definition. The name is based upon the quantity definition's properties.
     * Calling {@link getQuantityDefinition} with a given name will return an instance of the appropriate quantity
     * definition. These instances are shared.
     * @returns {string}
     */
    getName() {
        throw Error('QuantityDefinition::getName() - Abstract method!');
    }


    /**
     * Compares the resolution of this definition against another definition.
     * @abstract
     * @param {QuantityDefinition} otherDefinition The definition to compare to.
     * @returns {number}    < 0 if this definition is lower than otherDefinition's, 0 if the same,
     * > 0 if higher than otherDefinition's.
     * @throws An exception if otherDefinition is not compatible with this definition.
     */
    compareDefinitionResolution(otherDefinition) {
        throw Error('QuantityDefinition::compareDefinitionResolution() - Abstract method!');
    }

    /**
     * Creates a {@link Quantity} with this as its definition that's the closest representation of a number.
     * @param {number} number The number of interest.
     * @returns {Quantity}
     */
    quantityFromNumber(number) {
        return new Quantity({
            numberValue: number,
            definition: this,
        });
    }

    /**
     * Creates a {@link Quantity} with this as its definition and with a given base value.
     * @param {number} baseValue
     * @returns {Quantity}
     */
    fromBaseValue(baseValue) {
        return new Quantity({
            baseValue: baseValue,
            definition: this,
        });
    }

    /**
     * Returns the representative numerical value of a base value.
     * @abstract
     * @param {number} baseValue
     * @returns {number}
     */
    baseValueToNumber(baseValue) {
        throw Error('QuantityDefinition::baseValueToNumber() - Abstract method!');
    }

    /**
     * Converts a number value to a base value.
     * @param {number} number The number value.
     * @returns {number}    The base value equivalent, which is an integer.
     */
    numberToBaseValue(number) {
        throw Error('QuantityDefinition::numberToBaseValue() - Abstract method!');
    }

    /**
     * Returns a text representation of the numerical value of a quantity. The text represntation can be
     * parsed back via {@link QuantityDefinition#fromValueText} into an equivalent quantity.
     * @param {number} baseValue
     * @returns {string}
     */
    baseValueToValueText(baseValue) {
        throw Error('QuantityDefinition::baseValueToValueText() - Abstract method!');
    }

    /**
     * Parses a value text string generated by {@link Quantity#baseValueToValueText} back into a {@link Quantity}.
     * @param {string} valueText The value text to parse.
     * @returns {Quantity#ParseResult|undefined}    The parse result, <code>undefined</code> if valueText could not be parsed.
     */
    fromValueText(quantity) {
        throw Error('QuantityDefinition::fromValueText() - Abstract method!');
    }

    /**
     * Adds several quantities together. The resulting quantity has this definition.
     * @param {(Quantity[]|...Quantity)} args The quantities to be added, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}  The resulting quantity, it has this as its definition.
     */
    addQuantities(quantities) {
        throw Error('QuantityDefinition::addQuantities() - Abstract method!');
    }

    /**
     * Subtracts several quantities from the first quantity. The resulting quantity has this definition.
     * @param {(Quantity[]|...Quantity)} args The quantities to be subtracted, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}  The resulting quantity, it has this as its definition.
     */
    subtractQuantities(quantities) {
        throw Error('QuantityDefinition::subtractQuantities() - Abstract method!');
    }

    /**
     * Creates a {@link Quantity} that's the negative of a quantity.
     * @param {Quantity} quantity   The quantity to be negated.
     * @returns {Quantity}  The negated quantity, it has this as its definition.
     */
    negateQuantity(quantity) {
        throw Error('QuantityDefinition::negatetQuantity() - Abstract method!');
    }


    /**
     * Multiplies several quantities together. The multiplication is done using the definition of the quantity with the highest resolution,
     * then converted as needed to this definition.
     * Note that multiplication is typically a lossy operation.
     * @param {(Quantity[]|...Quantity)} args The quantities to be multiplied, either an array of {@link Quantity}s or as individual parameters.
     * @returns {Quantity}  The product of the quantities, it has this as its definition.
     */
    multiplyQuantities(quantities) {
        throw Error('QuantityDefinition::multiplyQuantities() - Abstract method!');
    }



    /**
     * Subdivides a quantity into several quantities according to a set of proportions.
     * Note that the final quantity is adjusted as necessary so that the sum of all the sub-divided quantities
     * is the same as the original quantity.
     * @param {number} baseValue
     * @param {(number[]|...number)} args An array containing the proportions to allocate to each subdivided quantity.
     * The total number of subdivided quantities is the number of proportion values, each subdivided quantity is approximately
     * proportion[i] / proportionSum of the original value, with the exception of the final subdivided quantity, which is always
     * set so that the sum of all the subdivided quantities equals this quantity.
     * @returns {number[]}    The array of the subdivided base values.
    */
    subdivideBaseValue(baseValue, portions) {
        throw Error('QuantityDefinition::subdivideBaseValue() - Abstract method!');
    }

    isSameDefinition(other) {
        throw Error('QuantityDefinition::isSameDefinition() - Abstract method!');
    }

}


const MINUS_CHAR_CODE = '-'.charCodeAt(0);
const DECIMAL_CHAR_CODE = '.'.charCodeAt(0);
const ZERO_CHAR_CODE = '0'.charCodeAt(0);

/**
 * {@link QuantityDefinition} for decimal numbers with a fixed number of digits after the decimal point.
 * <p>
 * The number of decimal places may be negative, in which case the quantities are in chunks of powers of 10. For example,
 * setting the number of decimal places to -2 has the effect of making quantities be in terms of hundreds. That is, there will
 * always be two zeros before the decimal point for non-zero values. Note that for 0 this would result in a valueText of '000'.
 * <p>
 * DecimalDefinitions are immutable. DecimalDefinitions are created by calling {@link getDecimalDefinition}.
 * @class
 */
class DecimalDefinition extends QuantityDefinition {
    /**
     * @typedef {object}    DecimalDefinition~Options   The options for the constructor.
     * @property {number}   decimalPlaces   The number of digits after the decimal point. If negative then represents
     * the number of zeroes before the decimal point.
     * @property {string}   [groupMark] Optional group separator mark use to separate the value into thousands, millions, etc.
     */

    /**
     * @constructor
     * @param {DecimalDefinition~Options} options The options.
     */
    constructor(options) {
        if (options !== undefined) {
            if (typeof options === 'number') {
                options = { decimalPlaces: options };
            }
        }
        else {
            options = {};
        }

        super(options);

        this._decimalPlaces = Math.round(options.decimalPlaces || 0);
        this._groupMark = options.groupMark;

        this._name = 'DecimalDefinition_' + this._decimalPlaces;
        if (this._groupMark) {
            this._name += '_' + this._groupMark;
        }

        // We need to use numerator and denominator values so the multiplication/division
        // is always done with an integer, this avoids roundoff errors with decimal arithmetic.
        if (this._decimalPlaces >= 0) {
            this._numPow10 = 1;
            this._denPow10 = Math.pow(10, this._decimalPlaces);
        }
        else {
            this._numPow10 = Math.pow(10, -this._decimalPlaces);
            this._denPow10 = 1;
        }
    }

    getName() {
        return this._name;
    }

    static fromName(name) {
        const prefix = 'DecimalDefinition_';
        if (!name.startsWith(prefix)) {
            return;
        }

        let decimalPlacesEnd = name.indexOf('_', prefix.length);
        if (decimalPlacesEnd < 0) {
            decimalPlacesEnd = name.length;
        }

        const decimalPlaces = parseInt(name.substring(prefix.length, decimalPlacesEnd));
        if (isNaN(decimalPlaces)) {
            return;
        }

        let groupMark;
        if (decimalPlacesEnd < name.length) {
            groupMark = name.substring(decimalPlacesEnd + 1);
        }

        return new DecimalDefinition({ deicmalPlaces: decimalPlaces, groupMark: groupMark });
    }

    toJSON(arg) {
        const json = {
            decimalPlaces: this._decimalPlaces,
        };
        if (this._groupMark) {
            json.groupMark = this._groupMark;
        }
        return json;
    }



    /**
     * @returns {number}    The number of decimal places.
     */
    getDecimalPlaces() {
        return this._decimalPlaces;
    }

    /**
     * @returns {string|undefined}  The mark used to dilineate groups of thousands.    
     */
    getGroupMark() {
        return this._groupMark;
    }


    compareDefinitionResolution(otherDefinition) {
        if (!(otherDefinition instanceof DecimalDefinition)) {
            throw Error('Incompatible definition!');
        }
        return this._decimalPlaces - otherDefinition._decimalPlaces;
    }


    baseValueToNumber(baseValue) {
        return baseValue * this._numPow10 / this._denPow10;
    }


    numberToBaseValue(number) {
        return Math.round(number * this._denPow10 / this._numPow10);
    }


    baseValueToValueText(baseValue) {
        let text = baseValue.toString();
        if (!this._decimalPlaces) {
            return text;
        }

        let sign;
        if (baseValue < 0.0) {
            text = text.slice(1);
            sign = '-';
        }
        else {
            sign = '';
        }

        const decimalPos = text.length - this._decimalPlaces;
        if (decimalPos < 0) {
            // Need leading 0s.
            return sign + '0.' + '0'.repeat(-decimalPos) + text;
        }

        let result;
        if (decimalPos > text.length) {
            // Need trailing 0s.
            result = text + '0'.repeat(decimalPos - text.length);
        }
        else {
            result = text.slice(0, decimalPos) + '.' + text.slice(decimalPos);
        }

        if (this._groupMark) {
            // Need to insert the group mark.
            let index = result.indexOf('.');
            if (index < 0) {
                index = result.length;
            }

            index -= 3;
            while (index > 0) {
                result = result.slice(0, index) + this._groupMark + result.slice(index);
                index -= 3;
            }
        }

        return sign + result;
    }


    fromValueText(valueText) {
        let sign = 1;
        let value = 0;

        valueText = valueText.trimStart();

        let i = 0;
        if (valueText.charCodeAt(i) === MINUS_CHAR_CODE) {
            sign = -1;
            ++i;
        }

        let isValue;
        let decimalIndex;
        for (; i < valueText.length; ++i) {
            const code = valueText.charCodeAt(i);
            if (code === DECIMAL_CHAR_CODE) {
                decimalIndex = i;
                break;
            }
            const digit = code - ZERO_CHAR_CODE;
            if ((digit < 0) || (digit > 9)) {
                if (valueText.charAt(i) === this._groupMark) {
                    continue;
                }
                break;
            }
            value = value * 10 + digit;
            isValue = true;
        }

        if (decimalIndex !== undefined) {
            let fraction = 0;
            let fractionScale = 1;
            for (++i; i < valueText.length; ++i) {
                const digit = valueText.charCodeAt(i) - ZERO_CHAR_CODE;
                if ((digit < 0) || (digit > 9)) {
                    if (valueText.charAt(i) === this._groupMark) {
                        continue;
                    }
                    break;
                }
                fraction = fraction * 10 + digit;
                fractionScale /= 10;
                isValue = true;
            }

            value += fraction * fractionScale;
        }
        else {
            decimalIndex = i - 1;
        }

        if (!isValue) {
            return undefined;
        }

        value *= sign;

        const result = {
            quantity: this.quantityFromNumber(value),
        };

        const fullDecimalPlaces = i - 1 - decimalIndex;
        if (fullDecimalPlaces > this._decimalPlaces) {
            const fullDefinition = new DecimalDefinition(fullDecimalPlaces);
            result.fullQuantity = fullDefinition.quantityFromNumber(value);
        }
        else {
            result.fullQuantity = result.quantity;
        }

        result.remainingText = valueText.slice(i);

        return result;
    }


    changeQuantityDefinition(quantity) {
        if (typeof quantity === 'number') {
            return this.quantityFromNumber(quantity);
        }

        const compare = this.compareDefinitionResolution(quantity.getDefinition());
        if (compare < 0) {
            // We're losing resolution...
            return this.quantityFromNumber(quantity.toNumber());
        }
        else if (compare > 0) {
            const baseValue = quantity.getBaseValue() * Math.pow(10, (this._decimalPlaces - quantity.getDefinition()._decimalPlaces));
            return new Quantity({
                baseValue: baseValue,
                definition: this,
            });
        }
        else {
            return quantity;
        }
    }


    addQuantities(quantities) {
        let baseValue = 0;
        quantities.forEach((quantity) => {
            quantity = this.changeQuantityDefinition(quantity);
            baseValue += quantity.getBaseValue();
        });

        return new Quantity(
            {
                baseValue: baseValue,
                definition: this,
            }
        );
    }


    subtractQuantities(quantities) {
        let baseValue = this.changeQuantityDefinition(quantities[0]).getBaseValue();
        for (let i = 1; i < quantities.length; ++i) {
            const quantity = this.changeQuantityDefinition(quantities[i]);
            baseValue -= quantity.getBaseValue();
        }

        return new Quantity(
            {
                baseValue: baseValue,
                definition: this,
            }
        );
    }


    negateQuantity(quantity) {
        quantity = this.changeQuantityDefinition(quantity);

        return new Quantity({
            baseValue: -quantity.getBaseValue(),
            definition: this,
        });
    }


    multiplyQuantities(quantities) {
        // For multiplication, we want to perform the multiplication at the highest resolution, then
        // down convert.
        const highestResQuantity = Quantity.getHighestResolutionQuantity(quantities);
        const highestResDefinition = highestResQuantity.getDefinition();

        let baseValue = highestResDefinition.changeQuantityDefinition(quantities[0]).getBaseValue();
        for (let i = 1; i < quantities.length; ++i) {
            const quantity = highestResDefinition.changeQuantityDefinition(quantities[i]);
            baseValue *= quantity.getBaseValue();
        }

        baseValue *= Math.pow(10, -(quantities.length - 1) * highestResDefinition._decimalPlaces);
        const quantity = new Quantity({
            baseValue: baseValue,
            definition: highestResDefinition,
        });
        return this.changeQuantityDefinition(quantity);
    }


    subdivideBaseValue(baseValue, proportions) {
        if (!proportions || (proportions.length <= 1)) {
            return [baseValue];
        }

        let sum = 0;
        proportions.forEach((value) => { sum += value; });

        const originalValue = this.baseValueToNumber(baseValue);
        let baseValueSum = 0;
        const result = [];
        const end = proportions.length - 1;
        for (let i = 0; i < end; ++i) {
            const subBaseValue = this.numberToBaseValue(originalValue * proportions[i] / sum);
            result.push(subBaseValue);
            baseValueSum += subBaseValue;
        }

        // Last quantity cleans things up.
        result.push(baseValue - baseValueSum);

        return result;
    }


    isSameDefinition(other) {
        if (!(other instanceof DecimalDefinition)) {
            return false;
        }
        if (this._decimalPlaces !== other._decimalPlaces) {
            return false;
        }
        if (this._groupMark !== other._groupMark) {
            return false;
        }
        return true;
    }
}


/**
 * Retrieves a {@link DecimalDefinition}. Any given set of options always returns the same quantity definition object.
 * @param {DecimalDefinition~Options} options 
 * @returns {DecimalDefinition}
 */
export function getDecimalDefinition(options) {
    const definition = new DecimalDefinition(options);
    const name = definition.getName();
    const existingDefinition = registeredDefinitions.get(name);
    if (!existingDefinition) {
        registeredDefinitions.set(name, definition);
        return definition;
    }
    return existingDefinition;
}

/**
 * Retrieves a {@link QuantityDefinition} object whose {@link QuantityDefinition~getName} would match a given name.
 * For any given name the same quantity definition object is returned.
 * @param {(string|QuantityDefinition)} name 
 * @returns {QuantityDefinition}
 */
export function getQuantityDefinition(name) {
    if (name instanceof QuantityDefinition) {
        return name;
    }

    const existingDefinition = registeredDefinitions.get(name);
    if (existingDefinition) {
        return existingDefinition;
    }

    const decimalDefinition = DecimalDefinition.fromName(name);
    if (decimalDefinition) {
        registeredDefinitions.set(name, decimalDefinition);
        return decimalDefinition;
    }
}

/**
 * Retrieves the name from a {@link QuantityDefinition} if the argument is a {@link QuantityDefinition}, otherwise returns
 * the argument.
 * @param {(string|QuantityDefinition)} definition 
 * @returns {string}
 */
export function getQuantityDefinitionName(definition) {
    return ((definition === undefined) || (typeof definition === 'string')) ? definition : definition.getName();
}
