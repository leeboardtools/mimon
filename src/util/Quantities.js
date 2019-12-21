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
     * @property {QuantityDefinition}   definition  The quantity definition.
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
        return this._definition.toNumber(this);
    }

    /**
     * Creates a {@link Quantity} with this quantity's definition that most closely matches a given number.
     * @param {number} number The number of interest.
     * @returns {Quantity}
     */
    fromNumber(number) {
        return this._definition.fromNumber(number);
    }


    /**
     * @returns {string}    A text representation of the quantity. This is parseable back into a similar quantity
     * via {@link Quantity#fromValueText} if the definition is the same.
     */
    toValueText() {
        return this._definition.toValueText(this);
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
        return this._definition.subdivideQuantity(this, args);
    }
}


const registeredDefinitions = new Map();


/**
 * Interface for the objects used to define the resolution of {@link Quantity}s.
 * Note that most methods that take a single {@link Quantity} argument presume that the definition
 * being called is the definition of the quantity.
 * @interface
 */
export class QuantityDefinition {
    static fromOptions(options) {
        return (options instanceof QuantityDefinition) ? options : QuantityDefinition.definitionFromJSON(options);
    }


    /**
     * @returns {string}    The name, which should normally be the class name, to associate the particular quantity definition implementation
     * with a callback handler for working with JSON.
     */
    getJSONName() {
        throw Error('QuantityDefinition::getJSONName() - Abstract method!');
    }

    /**
     * @callback QuantityDefinition~creatorCallback
     * @param {string} name The name that was registered for the callback.
     * @param {object} json The JSON object to be processed.
     * @returns {QuantityDefinition}    The quantity definition represented by the json object.
     */

    /**
     * Registers a callback function for creating a particular {@link QuantityDefinition} object from a JSON object.
     * This uses the name returend by the object's {@link QuantityDefinition~getJSONName} to associate the object
     * with a given callback.
     * @param {string} name The name returned by the definition's {@link QuantityDefinition~getJSONName} method.
     * @param {QuantityDefinition~creatorCallback} creatorCallback The callback function.
     */
    static registerDefinitionJSONHandler(name, creatorCallback) {
        registeredDefinitions.set(name, creatorCallback);
    }

    definitionToJSON() {
        return {
            name: this.getJSONName(),
            value: this.toJSON(),
        };
    }

    static definitionFromJSON(json) {
        if (json) {
            const callback = registeredDefinitions.get(json.name);
            if (callback) {
                return callback(json.name, json.value);
            }
        }
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
     * Returns the representative numerical value of a quantity.
     * @abstract
     * @param {Quantity} quantity The quantity of interest.
     * @returns {number}
     */
    toNumber(quantity) {
        throw Error('QuantityDefinition::toNumber() - Abstract method!');
    }

    /**
     * Creates a {@link Quantity} with this as its definition that's the closest representation of a number.
     * @param {number} number The number of interest.
     * @returns {Quantity}
     */
    fromNumber(number) {
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
     * @param {Quantity} quantity The quantity of interest.
     * @returns {string}
     */
    toValueText(quantity) {
        throw Error('QuantityDefinition::toValueText() - Abstract method!');
    }

    /**
     * Parses a value text string generated by {@link Quantity#toValueText} back into a {@link Quantity}.
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
     * @param {(number[]|...number)} args An array containing the proportions to allocate to each subdivided quantity.
     * The total number of subdivided quantities is the number of proportion values, each subdivided quantity is approximately
     * proportion[i] / proportionSum of the original value, with the exception of the final subdivided quantity, which is always
     * set so that the sum of all the subdivided quantities equals this quantity.
     * @returns {Quantity[]}    The array of the subdivided quantities, all the quantities have this as their definition.
    */
    subdivideQuantity(quantity, portions) {
        throw Error('QuantityDefinition::subdivideQuantity() - Abstract method!');
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
 * DecimalDefinitions are immutable.
 * @class
 */
export class DecimalDefinition extends QuantityDefinition {
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

    toJSON(arg) {
        const json = {
            decimalPlaces: this._decimalPlaces,
        };
        if (this._groupMark) {
            json.groupMark = this._groupMark;
        }
        return json;
    }

    getJSONName() { return 'DecimalDefinition'; }


    /**
     * @returns {number}    The number of decimal places.
     */
    getDecimalPlaces() {
        return this._decimalPlaces;
    }


    compareDefinitionResolution(otherDefinition) {
        if (!(otherDefinition instanceof DecimalDefinition)) {
            throw Error('Incompatible definition!');
        }
        return this._decimalPlaces - otherDefinition._decimalPlaces;
    }


    toNumber(quantity) {
        const baseValue = (typeof quantity === 'number') ? quantity : quantity.getBaseValue();
        return baseValue * this._numPow10 / this._denPow10;
    }


    numberToBaseValue(number) {
        return Math.round(number * this._denPow10 / this._numPow10);
    }


    toValueText(quantity) {
        let text = quantity.getBaseValue().toString();
        if (!this._decimalPlaces) {
            return text;
        }

        let sign;
        if (quantity.getBaseValue() < 0.0) {
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
            quantity: this.fromNumber(value),
        };

        const fullDecimalPlaces = i - 1 - decimalIndex;
        if (fullDecimalPlaces > this._decimalPlaces) {
            const fullDefinition = new DecimalDefinition(fullDecimalPlaces);
            result.fullQuantity = fullDefinition.fromNumber(value);
        }
        else {
            result.fullQuantity = result.quantity;
        }

        result.remainingText = valueText.slice(i);

        return result;
    }


    changeQuantityDefinition(quantity) {
        if (typeof quantity === 'number') {
            return this.fromNumber(quantity);
        }

        const compare = this.compareDefinitionResolution(quantity.getDefinition());
        if (compare < 0) {
            // We're losing resolution...
            return this.fromNumber(quantity.toNumber());
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


    subdivideQuantity(quantity, proportions) {
        if (!proportions || (proportions.length <= 1)) {
            return [this.changeQuantityDefinition(quantity)];
        }

        let sum = 0;
        proportions.forEach((value) => { sum += value; });

        const originalValue = quantity.toNumber();
        let baseValueSum = 0;
        const result = [];
        const end = proportions.length - 1;
        for (let i = 0; i < end; ++i) {
            const newQuantity = this.fromNumber(originalValue * proportions[i] / sum);
            result.push(newQuantity);
            baseValueSum += newQuantity.getBaseValue();
        }

        // Last quantity cleans things up.
        quantity = this.changeQuantityDefinition(quantity);
        result.push(new Quantity({
            baseValue: quantity.getBaseValue() - baseValueSum,
            definition: this,
        }));

        return result;
    }


    /**
     * Registers a simple processor supporting DecimalDefinition objects in a {@link JSONObjectProcessor}.
     * Note that if you extend DecimalDefinition, and have separate JSON object processing for that class,
     * you should set a <code>_jsonNoDecimalDefinition</code> property to <code>true</code> in that class.
     * @param {JSONProcessor} jsonProcessor The JSON object processor.
     */
    static registerWithJSONObjectProcessor(jsonProcessor, definitionLibrary) {
        jsonProcessor.addSimpleObjectProcessor({
            name: 'DecimalDefinition',
            isForObject: (object) => object instanceof DecimalDefinition && !object._jsonNoDecimalDefinition,
            fromJSON: (json) => {
                if (definitionLibrary) {
                    const definition = definitionLibrary.definitionFromOptions(json);
                    if (definition) {
                        return definition;
                    }
                }
                return new DecimalDefinition(json);
            },
            toJSON: (object) => {
                if (definitionLibrary) {
                    return definitionLibrary.definitionToOptions(object);
                }
                return object.toJSON();
            }
        });
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

QuantityDefinition.registerDefinitionJSONHandler('DecimalDefinition', (name, json) => {
    return new DecimalDefinition(json);
});


export class QuantityDefinitionLibrary {
    constructor() {
        this._definitionsByName = new Map();
        this._namesByDefinitions = new Map();
    }

    definitionFromOptions(options) {
        if (typeof options === 'string') {
            return this.getDefinition(options);
        }
        return QuantityDefinition.fromOptions(options);
    }

    definitionToOptions(definition) {
        if (definition) {
            const name = this.getName(definition);
            if (name) {
                return name;
            }
            return definition.toJSON();
        }
    }

    addDefinition(name, definition) {
        this._definitionsByName.set(name, definition);
        this._namesByDefinitions.set(definition, name);
    }

    deleteDefinition(definition) {
        const name = this._namesByDefinitions.get(definition);
        if (name) {
            this._definitionsByName.delete(name);
            this._namesByDefinitions.delete(definition);
        }
    }

    deleteName(name) {
        const definition = this._definitionsByName.get(name);
        if (definition) {
            this._definitionsByName.delete(name);
            this._namesByDefinitions.delete(definition);
        }
    }

    getDefinition(name) {
        return this._definitionsByName.get(name);
    }

    getName(definition) {
        return this._namesByDefinitions.get(definition);
    }
}

