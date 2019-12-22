import { Ratio } from './Ratios';

test('Ratio', () => {
    const a = new Ratio(10, 11);
    const b = new Ratio(11, 10);

    const c = a.multiply(b);
    expect(c.toValue()).toEqual(1);

    const [ numC, denC ] = c.getReducedNumeratorDenominator();
    expect(numC).toEqual(1);
    expect(denC).toEqual(1);

    const d = new Ratio(20, 2);
    const e = c.multiply(d);
    expect(e.getNumerators()).toEqual([ 10, 11, 20 ]);
    expect(e.getDenominators()).toEqual([ 11, 10, 2 ]);

    const [ numE, denE ] = e.getReducedNumeratorDenominator();
    expect(numE).toEqual(10);
    expect(denE).toEqual(1);

    const f = new Ratio(-33, 3);
    const g = c.multiply(f);
    expect(g.getNumerators()).toEqual([ 10, 11, -33 ]);
    expect(g.getDenominators()).toEqual([ 11, 10, 3 ]);

    const [ numG, denG ] = g.getReducedNumeratorDenominator();
    expect(numG).toEqual(-11);
    expect(denG).toEqual(1);


    // Demonstrate that this is actually useful...
    const ten_three = 1000000000. / 3.;
    const three_ten = 3. / 10.;
    expect(ten_three * three_ten).not.toBe(100000000.); // Result is 99999999.99999999

    const m1 = new Ratio(-1000000000, 3);
    const m2 = new Ratio(3, -10);
    const m1_m2 = m1.multiply(m2);
    expect(m1_m2.toValue()).toBe(100000000);

    const p1 = new Ratio(1000000000, 3);
    const p2 = new Ratio(3, 10);
    const p1_p2 = p1.multiply(p2);
    expect(p1_p2.toValue()).toBe(100000000);

    const m1_p2 = m1.multiply(p2);
    expect(m1_p2.toValue()).toBe(-100000000);

    const p1_m2 = p1.multiply(m2);
    expect(p1_m2.toValue()).toBe(-100000000);
});
