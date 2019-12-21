import { USD } from './Currency';
//import { Currency, Currencies } from './Currency';
//import { JSONProcessor } from './JSONProcessor';

test('Currency-decimalValueToString', () => {
    let result = USD.decimalValueToString(123.45);
    expect(result).toEqual('$123.45');

    result = USD.decimalValueToString(-0.12);
    expect(result).toEqual('-$0.12');

    result = USD.decimalValueToString(1234567.89);
    expect(result).toEqual('$1,234,567.89');
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
