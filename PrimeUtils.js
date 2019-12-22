/**
 * Prime numbers up to 1000.
 * Generated via [node primes](https://www.npmjs.com/package/primes)
 */
export const SimplePrimes = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
    101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199,
    211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293,
    307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397,
    401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499,
    503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599,
    601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691,
    701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797,
    809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887,
    907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997
];

/**
 * @typedef {object} reductToSimplPrimes_Result
 * @property {number}   sign    The sign of the overall value, 1 or -1.
 * @property {number}   remainder   Any remainder that wasn't converted into primes.
 * @property {Map<number,number>}   primes  Map whose keys are the prime numbers and values are the power to which the prime is raised.
 */

/**
 * Reduces a number to a list of prime numbers.
 * @param {number|number[]} number May be an array, in which case the elements are presumed to be multipled by each other.
 * @returns {reductToSimplPrimes_Result}
 */
export function reduceToSimplePrimes(number) {
    if (Array.isArray(number)) {
        let sign = 1;
        let remainder = 1;
        const primes = new Map();
        let isZero = false;

        number.forEach((value) => {
            if (!value) {
                isZero = true;
                return;
            }
            const result = reduceToSimplePrimes(value * remainder);
            sign *= result.sign;
            remainder = result.remainder;
            result.primes.forEach((power, prime) => {
                const newPower = (primes.get(prime) || 0) + power;
                primes.set(prime, newPower);
            });
        });

        if (isZero) {
            remainder = 0;
        }

        return { sign: sign, remainder: remainder, primes: primes };
    }

    const primes = new Map();

    let sign;
    if (number < 0) {
        sign = -1;
        number = -number;
    }
    else {
        sign = 1;
    }

    for (let i = 0; i < SimplePrimes.length; ++i) {
        const prime = SimplePrimes[i];
        if (prime > number) {
            break;
        }

        let count = 0;
        let fraction = number / prime;
        while (fraction === Math.floor(fraction)) {
            ++count;
            number = fraction;
            fraction = number / prime;
            if (fraction === 1) {
                break;
            }
        }
        if (count) {
            primes.set(prime, count);
        }
    }

    return {
        primes: primes,
        sign: sign,
        remainder: number,
    };
}

