/**
 * @module CSVUtils
 */

/**
 * Encloses a string in quotes, escaping any existing quotes with a double quote.
 * @param {string} cell 
 * @returns {string}
 */
export function encloseInQuotes(cell) {
    let result = '"';

    if (cell) {
        let lastIndex = 0;

        let fromIndex = cell.indexOf('"');
        while (fromIndex >= 0) {
            result += cell.slice(lastIndex, fromIndex) + '"';
            lastIndex = fromIndex;
            fromIndex = cell.indexOf('"', fromIndex + 1);
        }

        if (lastIndex < cell.length) {
            result += cell.slice(lastIndex, cell.length);
        }
    }

    result += '"';
    return result;
}


/**
 * Makes a string a valid CSV cell by enclosing it in quotes via 
 * {@link module:CSVUtils#encloseInQuotes} if it contains a comma, '\n', or double quote.
 * @param {string} cell 
 * @returns {string}
 */
export function makeValidCell(cell) {
    if (!cell) {
        return '';
    }

    if ((cell.charAt(0) === '"') && (cell.charAt(cell.length - 1) === '"')) {
        // If we start and end in quotes, we're good to go if either there are no
        // quotes in between, or all quotes are escaped.
        let innerQuoteIndex = cell.indexOf('"', 1);
        const lastIndex = cell.length - 1;

        // Make sure inner quotes are escaped.
        let lastEscapedQuoteIndex = -1;
        while ((innerQuoteIndex < lastIndex) && (innerQuoteIndex >= 0)) {
            lastEscapedQuoteIndex = innerQuoteIndex + 1;
            if (cell.charAt(lastEscapedQuoteIndex) !== '"') {
                return encloseInQuotes(cell);
            }
            innerQuoteIndex = cell.indexOf('"', innerQuoteIndex + 2);
        }

        if (lastEscapedQuoteIndex === lastIndex) {
            // Can't have the last quote escaped...
            return encloseInQuotes(cell);
        }

        return cell;
    }

    for (let i = 0; i < cell.length; ++i) {
        switch (cell.charAt(i)) {
        case ',' :
        case '\n' :
        case '"' :
            return encloseInQuotes(cell);
        }
    }

    return cell;
}


/**
 * @interface WriteStream
 */

/**
 * @function
 * @name module:CSVUtils~WriteStream#write
 * @param {string} text
 */

/**
 * @callback WriteCallback
 * @param {string} text
 */


/**
 * Writes an array of string arrays as CSV.
 * @param {string[][]} rows 
 * @param {module:CSVUtils~WriteStream|module:CSVUtils~WriteCallback} stream 
 */
export function stringArrayToCSVStream(rows, stream) {
    if (typeof stream === 'object') {
        stream = (string) => stream.write(string);
    }
    rows.forEach((row) => {
        if (row.length) {
            stream(makeValidCell(row[0]));

            for (let i = 1; i < row.length; ++i) {
                stream(',' + makeValidCell(row[i]));
            }
        }

        stream('\n');
    });
}
