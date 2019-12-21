import { namedEnumFromOption, namedEnumToOption } from './Enums';

const TestEnum = {
    A: { name: 'A', },
    B: { name: 'B', },
};

test('namedEnum', () => {
    const a = TestEnum.A;

    const options = namedEnumToOption(a);
    expect(options).toEqual(TestEnum.A.name);

    let enumValue;
    enumValue = namedEnumFromOption(TestEnum, options);
    expect(enumValue === TestEnum.A).toBeTruthy();

    enumValue = namedEnumFromOption(TestEnum, TestEnum.A);
    expect(enumValue === TestEnum.A).toBeTruthy();

    const jsonText = JSON.stringify(a);
    const json = JSON.parse(jsonText);
    expect(json === TestEnum.A).toBeFalsy();

    enumValue = namedEnumFromOption(TestEnum, json);
    expect(enumValue === TestEnum.A).toBeTruthy();
});

