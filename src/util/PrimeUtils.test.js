/* eslint-disable max-len */
import { reduceToSimplePrimes } from './PrimeUtils';

function expectResult(result, ref) {
    expect(result.sign).toEqual(ref.sign);
    expect(result.remainder).toEqual(ref.remainder);
    expect(result.primes).toEqual(ref.primes);
}

test('reduceToSimplePrimes', () => {
    expectResult(reduceToSimplePrimes(1), { sign: 1, remainder: 1, primes: new Map()});
    expectResult(reduceToSimplePrimes(-1), { sign: -1, remainder: 1, primes: new Map()});

    expectResult(reduceToSimplePrimes(2 * 2 * 2 * 5 * 5 * 23), { sign: 1, remainder: 1, primes: new Map([[2, 3], [5, 2], [23, 1]])});
    expectResult(reduceToSimplePrimes(-2 * 2 * 2 * 5 * 5 * 23), { sign: -1, remainder: 1, primes: new Map([[2, 3], [5, 2], [23, 1]])});

    // Our simple primes are only to 1000.
    // 104729 is prime according to https://primes.utm.edu/lists/small/10000.txt
    expectResult(reduceToSimplePrimes(-5 * 5 * 23 * 23 * 23 * 104729), { sign: -1, remainder: 104729, primes: new Map([[5, 2], [23, 3]])});
    expectResult(reduceToSimplePrimes(5 * 5 * 23 * 23 * 23 * 104729 * 104729), { sign: 1, remainder: 104729 * 104729, primes: new Map([[5, 2], [23, 3]])});

    expectResult(reduceToSimplePrimes([ 5 * 5 * 23 * 23 * 23 * 104729 * 104729 ]), { sign: 1, remainder: 104729 * 104729, primes: new Map([[5, 2], [23, 3]])});

    expectResult(reduceToSimplePrimes([ 5 * 5 * 23 * 104729, 7 * 5 * 23, -7 ]), { sign: -1, remainder: 104729, primes: new Map([[5, 3], [7, 2], [23, 2]])});


    // Handling of 0.
    expectResult(reduceToSimplePrimes(0), { sign: 1, remainder: 0, primes: new Map()});
    expectResult(reduceToSimplePrimes([2 * 3, 0, 3 * 5]), { sign: 1, remainder: 0, primes: new Map([[2, 1], [3, 2], [5, 1]])});
});
