/**
 * Exception for bugs.
 */
export class BugException {
    constructor(msg) {
        this.msg = msg;
    }

    toString() {
        return 'BUG: ' + this.msg;
    }
}

/**
 * A function for reporting a bug.
 * @param {string} msg 
 * @throws {BugException}
 */
export function Bug(msg) {
    console.log('BUG: ' + msg);
    return new BugException(msg);
}
