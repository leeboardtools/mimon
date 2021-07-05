/**
 * Determines if a character is one of the 25 Unicode white space characters.
 * @param {number|string} char If a string then will only return <code>true</code> if the
 * string has one character and that character is whitespace.
 * @returns {boolean}
 */
export function isSpace(char) {
    if (typeof char === 'string') {
        if (char.length === 1) {
            char = char.codePointAt(0);
        }
    }

    // From https://en.wikipedia.org/wiki/Whitespace_character
    switch (char) {
    case 0x0009 :   // TAB
    case 0x000A :   // LINE FEED
    case 0x000B :   // VERTICAL LINE FEED
    case 0x000C :   // FORM FEED
    case 0x000D :   // CARRIAGE RETURN
    case 0x0020 :   // SPACE
    case 0x0085 :   // NEXT LINE
    case 0x00A0 :   // NO-BREAK SPACE
    case 0x1680 :   // OGHAM SPACE MARK
    case 0x2000 :   // EN QUAD
    case 0x2001 :   // EM QUAD
    case 0x2002 :   // EN SPACE
    case 0x2003 :   // EM SPACE
    case 0x2004 :   // THREE-PER-EM SPACE
    case 0x2005 :   // FOUR-PER-EM SPACE
    case 0x2006 :   // SIX-PER-EM SPACE
    case 0x2007 :   // FIGURE SPACE
    case 0x2008 :   // PUNCTUATION SPACE
    case 0x2009 :   // THIN SPACE
    case 0x200A :   // HAIR SPACE
    case 0x2028 :   // LINE SEPARATOR
    case 0x2029 :   // PARAGRAPH SEPARATOR
    case 0x202F :   // NARROW-NO-BREAK SPACE
    case 0x205F :   // MEDIUM MATHEMATICAL SPACE
    case 0x3000 :   // IDEOGRAPHIC SPACE
        return true;
    }

    return false;
}


/**
 * Removes leading, trailing, and duplicate intermediate whitespace characters
 * as identified by {@link isSpace}
 * @param {string} string 
 * @returns {string}
 */
export function cleanSpaces(string) {
    if (string) {
        string = string.trim();

        let isNewString;
        const newStringCodePoints = [];

        let lastSpaceIndex = -1;
        for (let i = 0; i < string.length; ++i) {
            const code = string.codePointAt(i);
            if (isSpace(code)) {
                if (lastSpaceIndex < 0) {
                    lastSpaceIndex = i;
                    newStringCodePoints.push(code);
                }
                else {
                    // Want to keep '\n' for the space character if there is one.
                    if (code === 0x0A) {
                        newStringCodePoints[newStringCodePoints.length - 1] = code;
                    }
                    isNewString = true;
                }
            }
            else {
                newStringCodePoints.push(code);
                lastSpaceIndex = -1;
            }
        }

        if (isNewString) {
            return String.fromCodePoint(...newStringCodePoints);
        }
    }

    return string;
}


/**
 * @typedef {object} buildFromListArgs
 * @property {string} [opening=''] The string to start the string with.
 * @property {string} [separator=','] The string to place between items.
 * @property {string} [closing] The string to end the string with.
 */

/**
 * Builds a string from strings in an iterable, with an optional starting, ending
 * and separator specified.
 * @param {Iterator} list 
 * @param {buildFromListArgs} args
 * @returns {string}
 */
export function buildFromList(list, args = {}) {
    const { opening = '', separator = ',', closing, } = args;
    let text = opening;
    if (list) {
        let isFirst = true;
        list.forEach((item) => {
            if (!isFirst) {
                text += separator;
            }
            else {
                isFirst = false;
            }
            text += item;
        });
    }

    if (closing) {
        text += closing;
    }

    return text;
}