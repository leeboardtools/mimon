const fsPromises = require('fs').promises;
const path = require('path');

let msgs = {};

async function tryLocalePathName(prefix, parts) {
    const myParts = Object.assign({}, parts);
    if (prefix) {
        const index = myParts.base.indexOf('-');
        const base = (index >= 0) ? myParts.base.slice(index + 1) : myParts.base;
        myParts.base = prefix + '-' + base;
    }

    const pathName = path.format(myParts);
    try {
        return {
            pathName: pathName,
            fileHandle: await fsPromises.open(pathName, 'r'),
        };
    }
    catch (e) {
        // Ignore
    }
}


/**
 * Loads the user messages from a locale specific JSON file.
 * @param {string} locale The locale.
 * @param {string} pathName The default path name, if it contains a '-' the portion of the name before the '-'
 * is presumed to be a locale and is stripped of when trying to find a locale specific file.
 * @returns {string}    The path name that was actually loaded.
 */
export async function loadLocaleMsgsFile(locale, pathName) {
    locale = locale || 'en';
    
    const parts = path.parse(pathName);

    let result;
    // Try locale-baseName
    result = await tryLocalePathName(locale, parts);

    // Try partial locale-baseName
    if (!result) {
        const index = locale.indexOf('-');
        if (index >= 0) {
            result = await tryLocalePathName(locale.slice(0, index), parts);
        }
    }

    // Try pathName
    if (!result) {
        result = await tryLocalePathName(undefined, parts);
    }

    if (result && result.fileHandle) {
        try {
            const text = await result.fileHandle.readFile({ encoding: 'utf8' });
            const json = JSON.parse(text);
            setMsgs(json);
            return result.pathName;
        }
        catch (e) {
            // Ignore.
        }
        finally {
            await result.fileHandle.close();
        }
    }
}


/**
 * Installs a messages object. The properties of the object are the keys, the values are the strings.
 * @param {object} msgsToSet The messages object.
 */
export function setMsgs(msgsToSet) {
    const prevMsgs = msgs;
    msgs = msgsToSet;
    return prevMsgs;
}


/**
 * Determines if there is a user message with a given key.
 * @param {string} key The message key.
 * @returns {string|string[]|undefined}   The message value, <code>undefined</code> if there is no message with that key.
 */
export function isUserMsg(key) {
    return msgs[key] !== undefined;
}


/**
 * Looks up and constructs a user message.
 * @param {string|string[]} key The message key or an array of message keys. If an array is specified, the keys
 * in the array are tried starting with index 0 until a message is found.
 * @param  {...any} args The arguments for the message.
 * @returns {string}    The user message.
 */
export function userMsg(key, ...args) {
    let msg;
    if (Array.isArray(key)) {
        for (const aKey of key) {
            msg = msgs[aKey];
            if (msg) {
                break;
            }
        }
    }
    else {
        msg = msgs[key];
    }
    if (msg === undefined) {
        return key;
    }

    if (Array.isArray(msg)) {
        let argsArray = args;
        if ((args.length === 1) && (args[0] instanceof ArgsClass)) {
            argsArray = args[0]._args;
        }

        let result = msg[0];
        const count = Math.min(msg.length - 1, argsArray.length);
        for (let i = 0; i < count; ++i) {
            result += argsArray[i] + msg[i + 1];
        }
        for (let i = count + 1; i < msg.length; ++i) {
            result += msg[i];
        }
        return result;
    }

    return msg;
}

class ArgsClass {
    constructor(args) {
        this._args = args;
    }
}


/**
 * Creates an {@link Error} object with the message based on {@link uMsg}. The Error object has a
 * <code>msgCode</code> field set to the key argument.
 * @param {string} key The message key.
 * @param  {...any} args
 * @returns {Error}
 */
export function userError(key, ...args) {
    const error = Error(userMsg(key, new ArgsClass(args)));
    error.msgCode = key;
    return error;
}
