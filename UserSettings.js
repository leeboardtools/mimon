import * as path from 'path';
import { promises as fsPromises } from 'fs';
import deepEqual from 'deep-equal';

let userSettingsPathName;
let createDirIfNecessary = true;

/**
 * Sets the path name for the JSON file where user settings are stored.
 * @param {string} pathName The path name for the JSON file.
 */
export async function setUserSettingsPathName(pathName) {
    userSettingsPathName = pathName;
    createDirIfNecessary = true;
}

async function getUserSettingsJSON() {
    try {
        const fileHandle = await fsPromises.open(userSettingsPathName, 'r');
        const fileContents = await fileHandle.readFile({ encoding: 'utf8' });
        await fileHandle.close();

        return JSON.parse(fileContents);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return undefined;
        }
        console.error('Error reading user settings JSON file. ' + e);
    }
}

async function setUserSettingsJSON(json) {
    try {
        // Create the directory if necessary.
        if (createDirIfNecessary) {
            const parts = path.parse(userSettingsPathName);
            try {
                await fsPromises.mkdir(parts.dir, { recursive: true });
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }
            createDirIfNecessary = false;
        }

        const fileHandle = await fsPromises.open(userSettingsPathName, 'w+');
        await fileHandle.writeFile(JSON.stringify(json), { encoding: 'utf8' });
        await fileHandle.close();
        return true;
    }
    catch (e) {
        console.error('Error writing user settings JSON file. ' + e);
    }
}


/**
 * Retrieves a user setting.
 * @param {string|string[]} key The key of interest, or an array of keys. If it is 
 * an array of keys, the settings is first set to defValue, then any settings 
 * obtained from key[0] is Object.assign()'d to those settings, and so forth. The 
 * intended effect is to provide default settings that are overridable by keys with 
 * higher indices.
 * @param {object} [defValue=undefined]   Optional value to return if the key is 
 * not defined.
 */
export async function getUserSetting(key, defValue) {
    if (!userSettingsPathName) {
        return defValue;
    }

    const json = await getUserSettingsJSON();
    if (json && json.userSettings) {
        if (Array.isArray(key)) {
            const value = Object.assign({}, defValue);
            key.forEach((key) => {
                const settings = json.userSettings[key];
                if (settings) {
                    Object.assign(value, settings);
                }
            });
            return value;
        }
        else {
            const value = json.userSettings[key];
            return (value === undefined) ? defValue : value;
        }
    }

    return defValue;
}


/**
 * Sets the value of a user setting.
 * @param {string} key The key of interest.
 * @param {object} value The value to set, if <code>undefined</code> then the key 
 * is deleted, and the next time
 * {@link getUserSetting} is called, the default value will be returned.
 */
export async function setUserSetting(key, value) {
    if (!userSettingsPathName) {
        return;
    }

    const json = await getUserSettingsJSON() || {};
    if (!json.userSettings) {
        json.userSettings = {};
    }

    if (!deepEqual(json.userSettings[key], value)) {
        if (value === undefined) {
            delete json.userSettings[key];
        }
        else {
            json.userSettings[key] = value;
        }

        return setUserSettingsJSON(json);
    }
}

