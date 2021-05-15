import { Currency, USD } from './Currency';
//import { Currency, Currencies } from './Currency';
//import { JSONProcessor } from './JSONProcessor';

test('Currency-decimalValueToString', () => {
    let result = USD.decimalValueToString(123.45);
    expect(result).toEqual('$123.45');

    result = USD.decimalValueToString(-0.12);
    expect(result).toEqual('-$0.12');

    result = USD.decimalValueToString(1234567.89);
    expect(result).toEqual('$1,234,567.89');

    result = USD.decimalValueToString(123.45678, 4);
    expect(result).toEqual('$123.4568');

    result = USD.decimalValueToString(123.456446, 4);
    expect(result).toEqual('$123.4564');

    result = USD.decimalValueToString(100);
    expect(result).toEqual('$100.00');

    result = USD.decimalValueToString(100, 0);
    expect(result).toEqual('$100');

    result = USD.decimalValueToString(100, 3);
    expect(result).toEqual('$100.000');
});

test('Currency-decimalValueFromString', () => {
    let result;
    result = USD.decimalValueFromString('$1.23');
    expect(result).toEqual(1.23);

    result = USD.decimalValueFromString('-$12');
    expect(result).toEqual(-12.00);

    result = USD.decimalValueFromString('+$123.456');
    expect(result).toEqual(123.46);
});

test('Currency-baseValueToString', () => {
    let result = USD.baseValueToString(123);
    expect(result).toEqual('$1.23');

    result = USD.baseValueToString(-12);
    expect(result).toEqual('-$0.12');

    result = USD.baseValueToString(123456789);
    expect(result).toEqual('$1,234,567.89');
});

test('Currency-baseValueFromString', () => {
    let result;
    result = USD.baseValueFromString('$1.23');
    expect(result).toEqual(123);

    result = USD.baseValueFromString('-$12');
    expect(result).toEqual(-1200);

    result = USD.baseValueFromString('+$123.456');
    expect(result).toEqual(12346);
});

test('Currency-baseValueToSimpleString', () => {
    let result = USD.baseValueToSimpleString(123);
    expect(result).toEqual('1.23');

    result = USD.baseValueToSimpleString(-12);
    expect(result).toEqual('-0.12');

    result = USD.baseValueToSimpleString(123456789);
    expect(result).toEqual('1234567.89');
});

test('Currency-baseValueToNoCurrencyString', () => {
    let result = USD.baseValueToNoCurrencyString(123);
    expect(result).toEqual('1.23');

    result = USD.baseValueToNoCurrencyString(-12);
    expect(result).toEqual('-0.12');

    result = USD.baseValueToNoCurrencyString(123456789);
    expect(result).toEqual('1,234,567.89');
});

test('Currency Simple JSON', () => {
/*    const processor = new JSONProcessor();
    Currency.registerWithJSONObjectProcessor(processor);
    processor.addCollectionObjectProcessors();

    const currencies = [Currencies.EUR, Currencies.CRC, Currencies.USD];
    const json = processor.objectToJSON(currencies);

    const result = processor.objectFromJSON(json);
    expect(result).toEqual(currencies);
*/
});


test('Currency-copyConstructor', () => {
    let currency = new Currency({ currency: USD, 
        name: 'USD Stock Price',
        decimalPlaces: 4, 
    });
    expect(currency.getCode()).toEqual('USD');
    expect(currency.getNumericCode()).toEqual(USD.getNumericCode());
    expect(currency.getName()).toEqual('USD Stock Price');
    expect(currency.getDecimalPlaces()).toEqual(4);

    let result = currency.decimalValueToString(123);
    expect(result).toEqual('$123.0000');
});