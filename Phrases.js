import { SortedArray } from './SortedArray';

/**
 * @typedef {string[]} Phrase
 * An array of words in a phrase.
 */

/**
 * Converts a string into a {@link Phrase}.
 * @param {string} string 
 * @returns {Phrase}
 */
export function stringToPhrase(string) {
    if (typeof string !== 'string') {
        return string;
    }

    return string.trim().split(/\s+/);
}


function argToPhrase(arg) {
    return (typeof arg === 'string')
        ? stringToPhrase(arg)
        : arg;
}


/**
 * Compares two strings, treating <code>undefined</code>, <code>null</code>,
 * and empty strings the same.
 * @param {string|undefined} a 
 * @param {string|undefined} b 
 * @returns {number} &gt; 0 if a is after b, &lt; 0 if a is before b,
 * 0 if a is equivalent to b.
 */
export function compareStrings(a, b) {
    if (!a) {
        return (b) ? -1 : 0;
    }
    if (!b) {
        return 1;
    }
    return a.localeCompare(b);
}


/**
 * Compares two phrases.
 * @param {Phrase} a 
 * @param {Phrase} b 
 * @returns {number} &gt; 0 if a is after b, &lt; 0 if a is before b,
 * 0 if a is equivalent to b.
 */
export function comparePhrases(a, b) {
    if (!a) {
        return (b) ? -1 : 0;
    }
    else if (!b) {
        return 1;
    }

    let result = a.length - b.length;
    if (result) {
        return result;
    }

    for (let i = 0; i < a.length; ++i) {
        result = compareStrings(a[i], b[i]);
        if (result) {
            return result;
        }
    }

    return 0;
}

function comparePhraseEntries(a, b) {
    return comparePhrases(a.phrase, b.phrase);
}

function compareWordEntries(a, b) {
    return compareStrings(a.word, b.word);
}

function addPhraseEntryFromWords(wordEntries, phraseEntry, wordIndex) {
    const { phrase } = phraseEntry;
    const word = phrase[wordIndex];

    let wordEntry;
    const indexInfo = wordEntries.indexInfoOf({ word: word, });
    if (!indexInfo.isInArray) {
        // Add a new entry...
        wordEntry = {
            word: word,
            nextWords: new SortedArray(compareWordEntries, {
                duplicates: 'replace',
            }),
            phraseEntries: new SortedArray(comparePhraseEntries, {
                duplicates: 'replace',
            }),
        };

        wordEntries.add(wordEntry);
    }
    else {
        wordEntry = indexInfo.value;
    }

    ++wordIndex;
    if (wordIndex >= phrase.length) {
        // End of the line, add our entry to the phrase entries...
        wordEntry.phraseEntries.add(phraseEntry);
    }
    else {
        // Go to the next level...
        addPhraseEntryFromWords(wordEntry.nextWords, phraseEntry, wordIndex);
    }
}


function removePhraseEntryFromWords(wordEntries, phraseEntry, wordIndex) {
    const { phrase } = phraseEntry;
    const word = phrase[wordIndex];

    const indexInfo = wordEntries.indexInfoOf({ word: word, });
    if (!indexInfo.isInArray) {
        return;
    }

    const wordEntry = indexInfo.value;
    wordEntry.phraseEntries.delete(phraseEntry);

    ++wordIndex;
    if (wordIndex < phrase.length) {
        removePhraseEntryFromWords(wordEntry.nextWords, phraseEntry, wordIndex);
    }

    // If there are no phrase entries and no next words, remove the word entry.
    if (!wordEntry.phraseEntries.length && !wordEntry.nextWords.length) {
        wordEntries.deleteIndex(indexInfo.index);
    }
}


function gatherPhraseEntriesOfWordEntry(wordEntry, result) {
    wordEntry.phraseEntries.forEach((phraseEntry) => {
        result.set(phraseEntry.phrase, phraseEntry);
    });

    wordEntry.nextWords.forEach((childWordEntry) => {
        gatherPhraseEntriesOfWordEntry(childWordEntry, result);
    });
}


function findPhraseEntry(wordEntries, phrase, wordIndex, result) {
    const word = phrase[wordIndex];
    if (wordIndex + 1 === phrase.length) {
        // Final word, we're just looking for partial matches
        for (let i = wordEntries.length - 1; i >= 0; --i) {
            const wordEntry = wordEntries.at(i);
            if (wordEntry.word.startsWith(word)) {
                gatherPhraseEntriesOfWordEntry(wordEntry, result);
            }
        }
        return;
    }

    const indexInfo = wordEntries.indexInfoOf({ word: word, });
    if (indexInfo.isInArray) {
        const phraseEntry = indexInfo.value;
        findPhraseEntry(phraseEntry.nextWords, phrase, wordIndex + 1, result);
    }
}


/**
 * A collection that associates {@link Phrase}s with values and provides a
 * 'partial phrase' search feature.
 */
export class PhraseMap {

    /**
     * Constructor.
     * @param {Array|iterable} [args] An array or other iterable whose elements
     * are phrase-value pairs suhc as [[phrase1, value1], [phrase2, value2]].
     */
    constructor(args) {
        this._masterEntries = new SortedArray(comparePhraseEntries, {
            duplicates: 'replace',
        });

        this._rootWordEntries = new SortedArray(compareWordEntries, {
            duplicates: 'replace',
        });

        this[Symbol.iterator] = () => this.entries()[Symbol.iterator]();

        if (args) {
            let iterator;
            if (typeof args[Symbol.iterator] === 'function') {
                iterator = args;
            }
            if (iterator) {
                for (let result of iterator) {
                    this.set(result[0], result[1]);
                }
            }
        }
    }

    /**
     * The number of phrases in the map.
     */
    get size() {
        return this._masterEntries.length;
    }

    /**
     * Removes all phrases from the map.
     */
    clear() {
        this._masterEntries.clear();
        this._rootWordEntries.clear();
    }

    /**
     * Deletes a phrase from the map.
     * @param {Phrase} phrase 
     * @returns {boolean} <code>true</code> if the phrase was in the map and was deleted.
     */
    delete(phrase) {
        const indexInfo = this._masterEntries.indexInfoOf({ phrase: phrase, });
        if (!indexInfo.isInArray) {
            return;
        }

        // Remove the entry from the word tree.
        const entry = indexInfo.value;
        for (let i = 0; i < phrase.length; ++i) {
            removePhraseEntryFromWords(this._rootWordEntries, entry, i);
        }

        this._masterEntries.deleteIndex(indexInfo.index);
        return true;
    }


    /**
     * Adds or updates a phrase/value pair in the map.
     * @param {Phrase} phrase 
     * @param {*} value 
     * @returns {PhraseMap} This map.
     */
    set(phrase, value) {
        phrase = argToPhrase(phrase);
        let entry = {
            phrase: phrase,
            value: value,
        };
        const indexInfo = this._masterEntries.indexInfoOf(entry);
        if (indexInfo.isInArray) {
            entry = indexInfo.value;
            entry.value = value;
        }
        else {
            entry.phrase = Array.from(phrase);
            this._masterEntries.add(entry);

            // Add the entry to the word tree.
            for (let i = 0; i < phrase.length; ++i) {
                addPhraseEntryFromWords(this._rootWordEntries, entry, i);
            }
        }

        return this;
    }


    /**
     * Retreives the value associated with a phrase in the map, <code>undefined</code>
     * is returned if the map does not contain the phrase.
     * @param {Phrase} phrase 
     * @returns {*}
     */
    get(phrase) {
        const index = this._masterEntries.indexOf({ phrase: phrase, });
        if (index >= 0) {
            return this._masterEntries.at(index).value;
        }
    }


    /**
     * Determines if the map contains a phrase.
     * @param {Phrase} phrase 
     * @returns {boolean}
     */
    has(phrase) {
        return this._masterEntries.indexOf({ phrase: phrase, }) >= 0;
    }


    /**
     * Returns a new Iterator object that iterates over the entries of the map.
     * The iterator returns a [phrase, value] array for each element.
     * @returns {Iterator}
     */
    entries() {
        const result = [];
        this._masterEntries.forEach((phraseEntry) => 
            result.push([phraseEntry.phrase, phraseEntry.value, ]));
        return result;
    }

    /**
     * Returns a new Iteragor object that iterates over the phrases of the map.
     * @returns {Iteragor}
     */
    keys() {
        const result = [];
        this._masterEntries.forEach((phraseEntry) => 
            result.push(phraseEntry.phrase));
        return result;
    }

    /**
     * Returns a new Iteragor object that iterates over the values of the
     * elements of the map.
     * @returns {Iteragor}
     */
    values() {
        const result = [];
        this._masterEntries.forEach((phraseEntry) => 
            result.push(phraseEntry.value));
        return result;
    }



    /**
     * @typedef PhraseMap~forEachCallback
     * @param {*} value
     * @param {Phrase} phrase
     * @param {PhraseMap} phraseMap
     */


    /**
     * Executes a callback function for each phrase/value of the map.
     * @param {PhraseMap~forEachCallback} callback 
     * @param {*} [thisArg]
     */
    forEach(callback, thisArg) {
        this._masterEntries.forEach((phraseEntry) =>
            callback.call(thisArg, phraseEntry.value, phraseEntry.phrase, this));
    }


    /**
     * @typedef {Array} PhraseMap~PhraseValue
     */


    /**
     * Retrieves phrase/value entries whose phrases partially match a given
     * phrase. The matching is performed on the word sequence level,
     * with the last word of the desired phrase supporting partial matches.
     * Matches starting in the middle of the phrases of the phrase entries
     * at the word level.
     * <p>
     * For example, if the desired phrase is ['The', 'quick'], then
     * the following phrases would match:
     * <li>['The', 'quick']     Exact match
     * <li>['The', 'quickly']   Last word in desired phrase partially matches
     * <li>['The', 'quick', 'brown']    Can have words after the desired phrase
     * <li>['Not', 'The', 'quick']  Can have words before the desired phrase
     * <p>
     * while the following phrases would not match:
     * <li>['AThe', 'quick']    The words before the last word in the desired phrase 
     * must match
     * <li>['TheA', 'quick']    The words before the last word in the desired phrase
     * must fully match
     * <li>['The', 'aquick']    The last word in the desired phrase must be the start 
     * of the word
     * <li>['The', 'quic']  The last word in the desired phrase must fully appear in
     * the word.
     * @param {Phrase|string} phrase 
     * @returns {PhraseMap~PhraseValue[]} An empty array is returned if no matches 
     * were found.
     */
    findPhrasesWith(phrase) {
        phrase = argToPhrase(phrase);

        if (phrase && phrase.length) {
            const result = new Map();
            findPhraseEntry(this._rootWordEntries, phrase, 0, result);
            return Array.from(result.values());
        }

        return [];
    }
}

