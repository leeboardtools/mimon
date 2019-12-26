import { FileNameBuilder } from './FileNameBuilder';
import { bSearch } from './BinarySearch';
import { getFilesOnlyInDir } from './Files';
import { ReplaceFileAction, DeleteFileAction, fileExists, KeepFileAction, performFileActions } from './FileActions';

const path = require('path');

export const Errors = {
    GROUP_FILE_READ: 'EntryGroupFile.GROUP_FILE_READ',
    GROUP_FILE_WRITE: 'EntryGroupFile.GROUP_FILE_WRITE',
    GROUP_FILE_NOT_FOUND: 'EntryGroupFile.GROUP_FILE_NOT_FOUND',
};

/**
 * Represents an entry group.
 * @class
 */
class EntryGroup {
    constructor(manager, groupKey) {
        this._manager = manager;
        this._groupKey = groupKey;
        this._entriesByKeys = [];
        this._isLoaded = false;
        this._isModified = false;
    }

    getGroupKey() {
        return this._groupKey;
    }

    toJSON() {
        return {
            groupKey: this._groupKey,
            entriesByKeys: this._entriesByKeys,
            isLoaded: this._isLoaded,
            isModified: this._isModified,
        };
    }

    /**
     * Sets the entries.
     * @param {object[]} entriesWithKeys Array containing two element sub-arrays, whose first element is the entry key and the second element
     * the entry. The array must be sored by the entry keys.
     */
    setEntriesWithKeys(entriesWithKeys) {
        this._entriesByKeys = [];
        let currentChunk;
        for (const [key, entry] of entriesWithKeys) {
            if (!currentChunk || (this._manager.compareEntryKeys(currentChunk[0], key) !== 0)) {
                currentChunk = [key, []];
                this._entriesByKeys.push(currentChunk);
            }
            currentChunk[1].push(entry);
        }

        this._isLoaded = true;
        this._isModified = true;
    }


    /**
     * Updates the entries from an array of update entries.
     * @param {object[]} entryUpdatesWithKeys Array whose elements are two element sub-arrays whose elements in turn are also two element sub arrays.
     * The format is something like this:
     * <pre><code>
     *  entryUpdatesWithKeys[i] = [ [newEntryKey, newEntry], [oldEntryKey, oldEntry]]
     * </pre></code>
     */
    addEntryUpdates(entryUpdatesWithKeys) {
        if (!entryUpdatesWithKeys.length) {
            return;
        }

        // for each entry update...
        for (const [newPair, oldPair] of entryUpdatesWithKeys) {
            const oldKey = (oldPair) ? oldPair[0] : undefined;
            const newKey = (newPair) ? newPair[0] : undefined;
            if (oldKey !== undefined) {
                const oldEntry = oldPair[1];
                if (newKey !== undefined) {
                    const newEntry = newPair[1];
                    if (this._manager.compareEntryKeys(oldKey, newKey) === 0) {
                        // Just replacing the entry...
                        // But we need to find the entry.
                        const entries = this.getEntriesOfKey(oldKey);
                        if (entries) {
                            for (let i = 0; i < entries.length; ++i) {
                                if (this._manager.areEntriesTheSame(entries[i], oldEntry)) {
                                    entries[i] = newEntry;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // Need to delete the old entry,
                        this.removeEntry(oldKey, oldEntry);

                        // Insert the new entry.
                        this.insertEntry(newKey, newEntry);
                    }
                }
                else {
                    // Deleting
                    this.removeEntry(oldKey, oldEntry);
                }
            }
            else if (newKey !== undefined) {
                // Adding.
                const newEntry = newPair[1];
                this.insertEntry(newKey, newEntry);
            }
        }

        this._isModified = true;
    }


    getKeyIndex(key) {
        return bSearch(this._entriesByKeys, [key], (value, element) => this._manager.compareEntryKeys(value[0], element[0]));
    }

    getEntriesOfKey(key) {
        const index = this.getKeyIndex(key);
        if (index >= 0) {
            return this._entriesByKeys[index][1];
        }
    }

    // Tested.
    removeEntry(key, entry) {
        const index = this.getKeyIndex(key);
        if (index < 0) {
            return;
        }
        const entries = this._entriesByKeys[index][1];
        for (let i = 0; i < entries.length; ++i) {
            if (this._manager.areEntriesTheSame(entry, entries[i])) {
                entries.splice(i, 1);
                if (!entries.length) {
                    // Nothing left, get rid of the key entry.
                    this._entriesByKeys.splice(index, 1);
                }
                return true;
            }
        }

    }

    // Tested.
    insertEntry(key, entry) {
        const index = this.getKeyIndex(key);
        if ((index >= 0) && this._manager.compareEntryKeys(this._entriesByKeys[index][0], key) === 0) {
            // We have a valid key, just insert into its entry list.
            this._entriesByKeys[index][1].push(entry);
        }
        else {
            this._entriesByKeys.splice(index + 1, 0, [key, [entry]]);
        }
    }

    isLoaded() { return this._isLoaded; }
    setIsLoaded(isLoaded) { this._isLoaded = isLoaded; }

    isModified() { return this._isModified; }
    setIsModified(isModified) { this._isModified = isModified; }

    hasEntries() { return this._entriesByKeys.length > 0; }

    getOldestEntryKey() { return (this._entriesByKeys.length) ? this._entriesByKeys[0][0] : undefined; }
    getNewestEntryKey() { return (this._entriesByKeys.length) ? this._entriesByKeys[this._entriesByKeys.length - 1][0] : undefined; }

    getEntries(sortedEnds) {
        let entries = [];
        if (sortedEnds) {
            const earliestKey = sortedEnds[0];
            const latestKey = sortedEnds[1];
            for (const [key, keyEntries] of this._entriesByKeys) {
                if ((earliestKey !== undefined) && this._manager.compareEntryKeys(key, earliestKey) < 0) {
                    continue;
                }
                if ((latestKey !== undefined) && this._manager.compareEntryKeys(key, latestKey) > 0) {
                    continue;
                }

                entries = entries.concat(keyEntries);
            }
        }
        else {
            for (const [, keyEntries] of this._entriesByKeys) {
                entries = entries.concat(keyEntries);
            }
        }
        return entries;
    }
}


/**
 * Manages a set of file based grouped entries. Each entry group is stored in a separate file. Each entry group
 * is identified by a key, which represents a contiguous range of entry keys.
 * <p>
 * A typical use is to have the entry keys a date, and then the group keys say the years.
 * Note that entry keys do not uniquely identify entries, they only serve to group together entries.
 * <p>
 * For flexibility a class implementing {@Grouper} is used to handle the entry key - group key management.
 * <p>
 * The class can either be used as-is by supplying a {@link EntryHandler} in the constructor, or be used as
 * a base class, in which case a number of methods (see the methods in EntryHandler) would need to be overridden.
 * @class
 */
export class EntryGroupFiles {
    constructor(options) {
        options = options || {};
        this._grouper = options.grouper;
        if (options.fileNamePrefix || options.fileNameNoBasisName || options.fileNameSuffix || options.fileNameExt) {
            this._fileNameBuilder = new FileNameBuilder(
                {
                    prefix: options.fileNamePrefix,
                    noBasisName: options.fileNameNoBasisName,
                    suffix: options.fileNameSuffix,
                    ext: options.fileNameExt,
                }
            );
        }
        else {
            this._fileNameBuilder = options.fileNameBuilder;
        }
        this._entryHandler = options.entryHandler || new EntryHandler();

        // Simple array of EntryGroup objects.
        this._entryGroups = [];
    }


    /**
     * @returns {EntryHandler}  The entry handler.
     */
    getEntryHandler() { return this._entryHandler; }


    /**
     * @returns {number}    The total number of entries available across all the groups.
     */
    getTotalEntryCount() {
        return this._totalEntryCount;
    }

    /**
     * @returns {object}    The entry key of the oldest entry available.
     */
    getOldestEntryKey() {
        return this._oldestEntryKey;
    }

    /**
     * @returns {object}    The entry key of the newest entry available.
     */
    getNewestEntryKey() {
        return this._newestEntryKey;
    }


    /**
     * Retrieves the entries within two entry keys.
     * @param {object} end1 The entry key of one end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getOldestEntryKey} will be used.
     * @param {object} end2 The entry key of the other end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getNewestEntryKey} will be used.
     * @returns {object[]}  Array containing the entries between end1 and end2, inclusive.
     */
    async getEntriesInRange(end1, end2) {
        let entries = [];
        await this.applyToEntryGroupsInRange(end1, end2, async (entryGroup, sortedEnds) => {
            const groupEntries = await this.getEntryGroupEntries(entryGroup, sortedEnds);
            entries = entries.concat(groupEntries);
        });

        return entries;
    }


    /**
     * Generates an array of {@link FileAction}s for writing out the entry group to files in a directory.
     * The array is normally eventually passed to {@link performFileActions} for actual execution.
     * @param {string} dir The directory where the files are eventually going.
     * @returns {FileAction[]}  The array containing the file actions to be peformed. If no modifications
     * have been made the array will be empty.
     */
    async generateWriteFileActions(dir) {
        const fileActions = [];

        // Make sure we need updating...
        const currentFileNames = new Set();
        const toUpdate = new Map();
        const toKeep = new Map();

        const summaryFileName = this.getSummaryFileName();
        const summaryPathName = path.join(dir, summaryFileName);
        let anyNeedsUpdating = !await fileExists(summaryPathName);

        currentFileNames.add(summaryFileName);
        const summaryGroupEntries = [];

        for (let i = 0; i < this._entryGroups.length; ++i) {
            const entryGroup = this._entryGroups[i];
            const fileName = this.buildEntryGroupFileName(entryGroup.getGroupKey());
            currentFileNames.add(fileName);

            const fullPathName = path.join(dir, fileName);
            if (entryGroup.isModified() || !await fileExists(fullPathName)) {
                anyNeedsUpdating = true;
                toUpdate.set(fileName, entryGroup);
            }
            else {
                toKeep.set(fileName, entryGroup);
            }

            summaryGroupEntries.push({
                fileName: fileName,
                groupKey: entryGroup.getGroupKey(),
            });
        }
        if (!anyNeedsUpdating) {
            return [];
        }

        const summaryFileAction = new ReplaceFileAction(
            summaryPathName,
            async (pathName) => { await this.writeSummaryFile(pathName, summaryGroupEntries); }
        );
        fileActions.push(summaryFileAction);

        const existingFiles = await this.getEntryGroupFileNamesInDir(dir);
        existingFiles.forEach((fileName) => {
            if (!toUpdate.has(fileName) && !toKeep.has(fileName)) {
                const fullPathName = path.join(dir, fileName);
                fileActions.push(new DeleteFileAction(fullPathName));
            }
        });

        toUpdate.forEach((entryGroup, fileName) => {
            const fileAction = new ReplaceFileAction(
                path.join(dir, fileName),
                {
                    applyCallback: async (pathName) => this.writeEntryGroup(entryGroup, pathName),
                    finalizeCallback: async (pathName) => entryGroup.setIsModified(false),
                }
            );
            fileActions.push(fileAction);
        });

        toKeep.forEach((entryGroup, fileName) => {
            const fileAction = new KeepFileAction(path.join(dir, fileName));
            fileActions.push(fileAction);
        });

        return fileActions;
    }


    /**
     * Writes out the modified entry group files.
     * @param {string} dir The directory to write into.
     */
    async write(dir) {
        const fileActions = await this.generateWriteFileActions(dir);
        await performFileActions(fileActions);
    }


    /**
     * Performs a quick read of the entry group files. This obtains the basic information such as
     * the number of entries, the key of the earliest entry, and loads up the entry groups.
     * @param {string} dir The directory containing the group files.
     */
    async quickRead(dir) {
        const summaryFileName = this.getSummaryFileName(dir);
        const summaryPathName = path.join(dir, summaryFileName);
        const summaryInfo = await this.readSummaryFile(summaryPathName);

        const existingEntryGroupFiles = new Set(await this.getEntryGroupFileNamesInDir(dir));

        // Let's make sure each entry group file exists.
        summaryInfo.summaryGroupEntries.forEach((entry) => {
            if (!existingEntryGroupFiles.has(entry.fileName)) {
                const error = Error('The group file \'' + entry.fileName + '\' is missing.');
                error.code = Errors.GROUP_FILE_NOT_FOUND;
                throw error;
            }
        });

        // Once we've done the basic validation we can clear our state.
        this._dir = dir;
        this._entryGroups = [];
        this._totalEntryCount = 0;
        this._oldestEntryKey = undefined;
        this._newestEntryKey = undefined;

        // Load entry groups for each entry group.
        summaryInfo.summaryGroupEntries.forEach((entry) => {
            const entryGroup = this.createEntryGroup(entry.groupKey);
            this._entryGroups.push(entryGroup);
        });

        this._entryGroups.sort((a, b) => this._grouper.compareGroupKeys(a.getGroupKey(), b.getGroupKey()));

        // Update the total entry count and the oldest and newest entries.
        this._totalEntryCount = summaryInfo.totalEntryCount;
        await this._updateEndEntryKeys();
    }


    /**
     * Retrieves the base file name (name.ext) for the summary file.
     * @returns {string}    The summary file's base file name.
     */
    getSummaryFileName() {
        return this._fileNameBuilder.buildFileName('');
    }

    /**
     * Retrieves the base file names (name.ext) for the group files needed to represent the group.
     * @returns {string[]}  The array of base file names.
     */
    getGroupFileNames() {
        const fileNames = [];
        for (const entryGroup of this._entryGroups) {
            fileNames.push(this.buildEntryGroupFileName(entryGroup.getGroupKey()));
        }
        return fileNames;
    }


    /**
     * Sets the entries of the entry group file.
     * @param {object[]} entries The array of entries to install. These replace any existing entries.
     */
    setEntryGroupsFromEntries(entries) {
        this._entryGroups = [];
        this._totalEntryCount = 0;
        this._oldestEntryKey = undefined;
        this._newestEntryKey = undefined;

        if (!entries || !entries.length) {
            return;
        }

        const sortedEntriesWithKeys = [];
        for (const entry of entries) {
            const entryKey = this.getEntryKeyFromEntry(entry);
            sortedEntriesWithKeys.push([entryKey, entry]);
        }
        this.sortEntriesWithKeys(sortedEntriesWithKeys);


        let currentGroupKey;
        let currentEntryGroup;
        const entriesWithKeysForCurrentGroup = [];
        for (const keyAndEntry of sortedEntriesWithKeys) {
            const [key] = keyAndEntry;
            const groupKey = this.getGroupKeyForEntryKey(key);
            if (groupKey !== currentGroupKey) {
                if (currentEntryGroup) {
                    currentEntryGroup.setEntriesWithKeys(entriesWithKeysForCurrentGroup);
                    entriesWithKeysForCurrentGroup.length = 0;
                }
                currentEntryGroup = this.createEntryGroup(groupKey);
                this._entryGroups.push(currentEntryGroup);
                currentGroupKey = groupKey;
            }

            entriesWithKeysForCurrentGroup.push(keyAndEntry);
        }

        if (entriesWithKeysForCurrentGroup.length) {
            currentEntryGroup.setEntriesWithKeys(entriesWithKeysForCurrentGroup);
        }

        this._totalEntryCount = sortedEntriesWithKeys.length;
        this._oldestEntryKey = sortedEntriesWithKeys[0][0];
        this._newestEntryKey = sortedEntriesWithKeys[sortedEntriesWithKeys.length - 1][0];
    }


    /**
     * Retrieves the entry key of an entry.
     * @abstract
     * @param {object} entry The entry of interest.
     * @returns {object}    The entry key associated with entry.
     */
    getEntryKeyFromEntry(entry) {
        return this._entryHandler.getEntryKeyFromEntry(entry);
    }



    /**
     * Retrieves the entries of an entry group from its file.
     * @abstract
     * @protected
     * @param {object} groupKey The group key of the group.
     * @param {string} pathName The full path name of the entry group file.
     * @returns {object[]}  An array containing the entries of the entry group from the file.
     */
    async loadEntriesForGroup(groupKey, pathName) {
        return this._entryHandler.loadEntriesForGroup(groupKey, pathName);
    }

    /**
     * Writes out the entries of an entry group to a file.
     * @param {object} groupKey The group key of the group.
     * @param {object[]} entries The array of entries to be written.
     * @param {string} pathName The full path name of the entry group file.
     */
    async writeEntriesForGroup(groupKey, entries, pathName) {
        return this._entryHandler.writeEntriesForGroup(groupKey, entries, pathName);
    }


    /**
     * Determines if two entries represent the same entry.
     * @abstract
     * @param {object} entryA The first entry.
     * @param {object} entryB The second entry.
     */
    areEntriesTheSame(entryA, entryB) {
        return this._entryHandler.areEntriesTheSame(entryA, entryB);
    }

    /**
     * Compares two entry keys.
     * @param {object} entryKeyA    The first entry key.
     * @param {object} entryKeyB    The second entry key.
     * @returns {number}    &lt; 0 if entryKeyA comes before entryKeyB, 0 if entryKeyA and entryKeyB are the same,
     * &gt; if entryKeyA comes after entryKeyB.
     */
    compareEntryKeys(entryKeyA, entryKeyB) {
        return this._grouper.compareEntryKeys(entryKeyA, entryKeyB);
    }

    /**
     * Retrieves a list of the base file names of all the possible entry group files in a directory.
     * @param {string} dir The directory of interest.
     * @returns {string[]}  The array containing the base file names (name.ext).
     */
    async getEntryGroupFileNamesInDir(dir) {
        const fileNames = [];
        const fileNamesInDir = await getFilesOnlyInDir(dir);
        fileNamesInDir.forEach((name) => {
            if (this.parseFileNameForEntryGroup(name)) {
                fileNames.push(name);
            }
        });
        return fileNames;
    }

    /**
     * Constructs the base file name (name + extension, no directory) for the file representing a specific group key.
     * @param {object} groupKey The group key.
     * @returns {string}    The file name.
     */
    buildEntryGroupFileName(groupKey) {
        return this._fileNameBuilder.buildFileName(groupKey);
    }

    /**
     * Parses a file name for a group key, also used to determine if a file name is in fact an entry group file.
     * @param {string} fileName The file name of interest, this does not include the directory.
     * @returns {object|undefined}    The group key of the entry group, <code>undefined</code> if the file name
     * does not represent an entry group.
     */
    parseFileNameForEntryGroup(fileName) {
        const groupKey = this._fileNameBuilder.parseFileName(fileName);
        if ((groupKey === undefined) || !this._grouper.isValidGroupKey(groupKey)) {
            return undefined;
        }
        return groupKey;
    }


    /**
     * Takes two entry keys and returns a two element array such that the earlier of the two keys is at element
     * 0 and the later at element 1.
     * @protected
     * @param {object} end1 The entry key of one end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getOldestEntryKey} will be used.
     * @param {object} end2 The entry key of the other end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getNewestEntryKey} will be used.
     * @returns {object[]}  The two element array.
     */
    orderEntryKeys(end1, end2) {
        if (end2 === undefined) {
            return [(end1 === undefined) ? this._oldestEntryKey : end1, this._newestEntryKey];
        }
        else if (end1 === undefined) {
            return [this._oldestEntryKey, end2];
        }

        const compare = this._grouper.compareEntryKeys(end1, end2);
        if (compare <= 0) {
            return [end1, end2];
        }
        return [end2, end1];
    }

    /**
     * Loads an entry group if needed.
     * @protected
     * @param {EntryGroup} entryGroup The entry group to load.
     */
    async loadEntryGroup(entryGroup) {
        if (!entryGroup.isLoaded()) {
            const pathName = path.join(this._dir, this.buildEntryGroupFileName(entryGroup.getGroupKey()));
            const entriesForGroup = await this.loadEntriesForGroup(entryGroup.getGroupKey(), pathName);
            const entriesWithKeys = [];
            for (const entry of entriesForGroup) {
                entriesWithKeys.push([this.getEntryKeyFromEntry(entry), entry]);
            }
            this.sortEntriesWithKeys(entriesWithKeys);

            entryGroup.setEntriesWithKeys(entriesWithKeys);
        }
    }

    /**
     * @typedef {Object} EntryGroupFiles~SummaryGroupEntry
     * @property {String}   fileName    The base file name of the entry group.
     * @property {object}   groupKey    The group key of the entry group.
     */

    /**
     * @typedef {Object} EntryGroupFiles~SummaryInfo
     * @property {number}   totalEntryCount   The total number of entries.
     * @property {EntryGroupFiles~SummaryGroupEntry[]}  summaryGroupEntries Array of the group entries.
     */

    /**
     * Writes out the summary file.
     * @protected
     * @param {string} pathName The name of the file to write to.
     * @param {EntryGroupFiles~SummaryGroupEntry[]} summaryGroupEntries The array of the entry group info for the summary.
     */
    async writeSummaryFile(pathName, summaryGroupEntries) {
        return this._entryHandler.writeSummaryFile(this, pathName, {
            totalEntryCount: this._totalEntryCount,
            summaryGroupEntries: summaryGroupEntries,
        });
    }

    /**
     * Reads in the summary file.
     * @protected
     * @param {string} pathName The full path name of the summary file.
     * @returns {EntryGroupFiles~SummaryInfo}   The summary information.
     */
    async readSummaryFile(pathName) {
        return this._entryHandler.readSummaryFile(this, pathName);
    }


    /**
     * Writes out an entry group.
     * @param {EntryGroup} entryGroup The entry group to be written.
     * @param {string} pathName The full path name of the file to write to.
     */
    async writeEntryGroup(entryGroup, pathName) {
        const entries = entryGroup.getEntries();
        return this.writeEntriesForGroup(entryGroup.getGroupKey(), entries, pathName);
    }

    /**
     * Retrieves the entries of an entry group, loading the entry group if needed.
     * @protected
     * @param {EntryGroup} entryGroup The entry group of interest.
     * @param {object[]}    [sortedEnds] An optional two element array whose first element is the earliest
     * entry key wanted, and whose second element is the latest entry key wanted.
     * @returns {object[]}  An array containing the entries from the entry group.
     */
    async getEntryGroupEntries(entryGroup, sortedEnds) {
        await this.loadEntryGroup(entryGroup);
        return entryGroup.getEntries(sortedEnds);
    }

    /**
     * Helper for sorting an array of sub-arrays, the first element of each sub array is an entry key.
     * @protected
     * @param {object[]} entriesWithKeys The array to be sorted.
     */
    sortEntriesWithKeys(entriesWithKeys) {
        entriesWithKeys.sort((a, b) => this._grouper.compareEntryKeys(a[0], b[0]));
    }

    /**
     * Helper that calls a callback for each entry group between and including a pair of entry keys.
     * @protected
     * @param {object} end1 The entry key of one end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getOldestEntryKey} will be used.
     * @param {object} end2 The entry key of the other end of the range of interest, inclusive. If <code>undefined</code> then
     * {@link EntryGroupFiles#getNewestEntryKey} will be used.
     * @param {Function} callback The callback function, this is passed the entry group and an array containing
     * end1 and end2 such that the first element is the earlier of the two and the second the later.
     */
    async applyToEntryGroupsInRange(end1, end2, callback) {
        const orderedEntryKeys = this.orderEntryKeys(end1, end2);
        if ((orderedEntryKeys[0] === undefined) || (orderedEntryKeys[1] === undefined)) {
            return [];
        }

        const earlierGroupKey = this.getGroupKeyForEntryKey(orderedEntryKeys[0]);
        const laterGroupKey = this.getGroupKeyForEntryKey(orderedEntryKeys[1]);

        let i = this.getFirstEntryGroupIndexOnOrAfter(earlierGroupKey);
        for (; i < this._entryGroups.length; ++i) {
            const entryGroup = this._entryGroups[i];
            if (this._grouper.compareGroupKeys(entryGroup.getGroupKey(), laterGroupKey) > 0) {
                break;
            }
            await callback(entryGroup, orderedEntryKeys);
        }
    }


    /**
     * Retrieves the index of the first entry group whose group key is the same as or after a given group key.
     * @protected
     * @param {object} groupKey The group key.
     * @returns {number}    The index, this._entryGroups.length if none found.
     */
    getFirstEntryGroupIndexOnOrAfter(groupKey) {
        const length = this._entryGroups.length;
        let i = 0;
        for (; i < length; ++i) {
            if (this._grouper.compareGroupKeys(this._entryGroups[i].getGroupKey(), groupKey) >= 0) {
                return i;
            }
        }
        return i;
    }

    static _updateGroupModificationsMap(map, groupKey, modifications) {
        let value = map.get(groupKey);
        if (value === undefined) {
            value = [];
            map.set(groupKey, value);
        }
        value.push(modifications);
    }

    /**
     * Adds entry updates. Once added the updated entries are returned by {@link EntryGroupFiles#getEntriesInRange}. The
     * updates are not written out to the files.
     * @param {object[]} entryUpdates Array containing two element arrays, the first element is the new entry, the second
     * element is the entry being replaced. If the first entry is <code>undefined</code> then the entry is being deleted.
     * If the second entry is <code>undefined</code> then the entry is being added.
     */
    async addEntryUpdates(entryUpdates) {
        if (!entryUpdates || !entryUpdates.length) {
            return;
        }

        const groupModificationsMap = new Map();

        for (const [newEntry, oldEntry] of entryUpdates) {
            const newEntryKey = (newEntry) ? this.getEntryKeyFromEntry(newEntry) : undefined;
            const oldEntryKey = (oldEntry) ? this.getEntryKeyFromEntry(oldEntry) : undefined;
            const newGroupKey = (newEntry) ? this.getGroupKeyForEntryKey(newEntryKey) : undefined;
            const oldGroupKey = (oldEntry) ? this.getGroupKeyForEntryKey(oldEntryKey) : undefined;

            if (this._grouper.compareGroupKeys(newGroupKey, oldGroupKey) === 0) {
                if (newGroupKey === undefined) {
                    continue;
                }
                // Straight modification.
                EntryGroupFiles._updateGroupModificationsMap(groupModificationsMap, newGroupKey, [[newEntryKey, newEntry], [oldEntryKey, oldEntry]]);
            }
            else {
                if (newGroupKey !== undefined) {
                    // Add to the new group.
                    EntryGroupFiles._updateGroupModificationsMap(groupModificationsMap, newGroupKey, [[newEntryKey, newEntry]]);
                    ++this._totalEntryCount;
                }
                if (oldGroupKey !== undefined) {
                    // Delete from the old group.
                    EntryGroupFiles._updateGroupModificationsMap(groupModificationsMap, oldGroupKey, [undefined, [oldEntryKey, oldEntry]]);
                    --this._totalEntryCount;
                }
            }
        }

        const groupModificationsEntries = Array.from(groupModificationsMap.entries());
        groupModificationsEntries.sort((a, b) => this._grouper.compareGroupKeys(a[0], b[0]));

        let currentEntryGroupIndex = 0;
        let currentEntryGroup;
        if (!this._entryGroups.length) {
            this._entryGroups[0] = this.createEntryGroup(groupModificationsEntries[0][0]);
            this._entryGroups[0].setIsLoaded(true);
        }
        currentEntryGroup = this._entryGroups[0];

        const modificationsForCurrentEntryGroup = [];

        for (const [groupKey, modifications] of groupModificationsEntries) {
            const previousEntryGroup = currentEntryGroup;

            let compareResult = this._grouper.compareGroupKeys(groupKey, currentEntryGroup.getGroupKey());
            // We're after the current entry group, advance until we have a match or are before it.
            while (compareResult > 0) {
                ++currentEntryGroupIndex;
                if (currentEntryGroupIndex >= this._entryGroups.length) {
                    // Beyond the end...
                    break;
                }

                currentEntryGroup = this._entryGroups[currentEntryGroupIndex];
                compareResult = this._grouper.compareGroupKeys(groupKey, currentEntryGroup.getGroupKey());
            }

            if ((compareResult < 0) || (currentEntryGroupIndex >= this._entryGroups.length)) {
                // We're either before the current entry group, or are past the last one,
                // which means we need to insert a new entry group.
                currentEntryGroup = this.createEntryGroup(groupKey);
                currentEntryGroup.setIsLoaded(true);
                this._entryGroups.splice(currentEntryGroupIndex, 0, currentEntryGroup);
            }

            if ((previousEntryGroup !== currentEntryGroup) && modificationsForCurrentEntryGroup.length) {
                await this.loadEntryGroup(previousEntryGroup);
                previousEntryGroup.addEntryUpdates(modificationsForCurrentEntryGroup);

                modificationsForCurrentEntryGroup.length = 0;
            }

            modifications.forEach((modification) => modificationsForCurrentEntryGroup.push(modification));
        }

        if (modificationsForCurrentEntryGroup.length > 0) {
            await this.loadEntryGroup(currentEntryGroup);
            currentEntryGroup.addEntryUpdates(modificationsForCurrentEntryGroup);
        }

        // Let's clean up. Remove any entry groups that don't have any entries.
        for (let i = 0; i < this._entryGroups.length;) {
            const entryGroup = this._entryGroups[i];
            if (entryGroup.isLoaded() && !entryGroup.hasEntries()) {
                this._entryGroups.splice(i, 1);
            }
            else {
                ++i;
            }
        }

        await this._updateEndEntryKeys();
    }

    /**
     * Updates the oldestEntryKey and newestEntryKeys.
     * @protected
     */
    async _updateEndEntryKeys() {
        if (!this._entryGroups.length) {
            this._oldestEntryKey = undefined;
            this._newestEntryKey = undefined;
        }
        else {
            const oldestEntryGroup = this._entryGroups[0];
            await this.loadEntryGroup(oldestEntryGroup);
            this._oldestEntryKey = oldestEntryGroup.getOldestEntryKey();

            const newestEntryGroup = this._entryGroups[this._entryGroups.length - 1];
            await this.loadEntryGroup(newestEntryGroup);
            this._newestEntryKey = newestEntryGroup.getNewestEntryKey();
        }
    }


    /**
     * Returns the group key associated with an entry key.
     * @protected
     * @param {object} entryKey The entry key.
     * @returns {object}    The group key.
     */
    getGroupKeyForEntryKey(entryKey) {
        return this._grouper.getGroupKeyForEntryKey(entryKey);
    }

    /**
     * Creates a new entry group object.
     * @protected
     * @param {object} groupKey The group key.
     */
    createEntryGroup(groupKey) {
        return new EntryGroup(this, groupKey);
    }
}


/**
 * Interface that can be assigned as an option in {@link EntryGroupFile#constructor} to handle specific details of the entry
 * objects.
 * @interface
 */
export class EntryHandler {
    /**
     * Retrieves the entry key of an entry.
     * @abstract
     * @param {object} entry The entry of interest.
     * @returns {object}    The entry key associated with entry.
     */
    getEntryKeyFromEntry(entry) {
        throw Error('EntryHandler.getEntryKeyFromEntry: Abstract Method!');
    }

    /**
     * Writes out the summary file.
     * @param {EntryGroupFiles} entryGroupFiles The entry group files calling this.
     * @param {string}  pathName    The full path name of the file to write to.
     * @param {object}  summaryInfo The summary info.
     */
    async writeSummaryFile(entryGroupFiles, pathName, summaryInfo) {
        throw Error('EntryHandler.writeSummaryFile: Abstract Method!');
    }


    /**
     * Reads in the summary file.
     * @param {EntryGroupFiles} entryGroupFiles The entry group files calling this.
     * @param {string} pathNamme    The full path name of the summary file.
     * @returns {EntryGroupFiles~SummaryInfo}   The summary information.
     */
    async readSummaryFile(entryGroupFiles, pathName) {
        throw Error('EntryHandler.readSummaryFile: Abstract Method!');
    }


    /**
     * Writes out the entries of an entry group to a file.
     * @param {object} groupKey The group key of the group.
     * @param {object[]} entries The array of entries to be written.
     * @param {string} pathName The full path name of the entry group file.
     */
    async writeEntriesForGroup(groupKey, entries, pathName) {
        throw Error('EntryHandler.writeEntriesForGroup: Abstract Method!');
    }

    /**
     * Retrieves the entries of an entry group from its file.
     * @abstract
     * @protected
     * @param {object} groupKey The group key of the group.
     * @param {string} pathName The full path name of the entry group file.
     * @returns {object[]}  An array containing the entries of the entry group from the file.
     */
    async loadEntriesForGroup(groupKey, pathName) {
        throw Error('EntryHandler.loadEntriesForGroup: Abstract Method!');
    }


    /**
     * Determines if two entries are the same. This one does a <code>===</code> comparison.
     * @protected
     * @param {object} entryA The first entry.
     * @param {object} entryB The second entry.
     * @returns {boolean}   <code>true</code> if entryA is the same as entryB.
     */
    areEntriesTheSame(entryA, entryB) {
        throw Error('EntryHandler.areEntriesTheSame: Abstract Method!');
    }

}



/**
 * Abstract class that handles conversions between entry keys and group keys.
 * @abstract
 */
export class Grouper {

    /**
     * Compares two entry keys.
     * @param {object} a The first entry key.
     * @param {object} b The second entry key.
     * @returns {number}    Returns < 0 if a comes before b, 0 if a equals b, > 0 if a comes after b.
     */
    compareEntryKeys(a, b) {
        if ((typeof a === 'number') && (typeof b === 'number')) {
            return a - b;
        }
        return a.toString().localeCompare(b.toString());
    }

    /**
     * Compares two group keys.
     * @param {object} a The first group key.
     * @param {object} b The second group key.
     * @returns {number}    Returns < 0 if a comes before b, 0 if a equals b, > 0 if a comes after b.
     */
    compareGroupKeys(a, b) {
        return a.toString().localeCompare(b.toString());
    }

    /**
     * Retrieves the group key associated with an entry key.
     * @abstract
     * @param {object} entryKey The entry key of interest.
     * @returns {number}    The key of the group into which entryKey falls.
     */
    getGroupKeyForEntryKey(entryKey) {
        throw Error('Abstract method!');
    }

    /**
     * Retrieves the group key following a group key.
     * @abstract
     * @param {object} groupKey     The group key of interest.
     * @returns {object}    The group key for the group that would immediately follow (be newer) than groupKey
     */
    getFollowingGroupKey(groupKey) {
        throw Error('Abstract method!');
    }

    /**
     * Determines if a group key is valid.
     * @param {object} groupKey The group key of interest.
     * @returns {boolean}
     */
    isValidGroupKey(groupKey) {
        throw Error('Abstract method!');
    }
}


/**
 * Base class implementation of {@link Grouper} whose entry keys are {@link Date}s.
 */
export class DateGrouperBase extends Grouper {
    compareEntryKeys(a, b) {
        return a.valueOf() - b.valueOf();
    }

}



const yearFormatter = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    useGrouping: false,
    minimumIntegerDigits: 4,
});

const BCE = 'BCE';


/**
 * Parses a decimal integer from a string, the string must fully represent a base 10 integer.
 * @param {string} string The string to parse.
 * @returns {number|undefined}  The parsed integer, <code>undefined</code> if the string contained
 * any invalid characters.
 */
export function parseDecimalInteger(string) {
    if ((string === undefined) || (string === null)) {
        return string;
    }

    string = string.trim();

    let value = 0;
    let i = 0;
    const length = string.length;
    let sign = 1;
    if (string.charAt(0) === '-') {
        ++i;
        sign = -1;
    }
    for (; i < length; ++i) {
        const digit = string.charAt(i) - '0';
        if (Number.isNaN(digit)) {
            return undefined;
        }
        value = value * 10 + digit;
    }

    return sign * value;
}

/**
 * Format a year value into a group key.
 * @param {number} year The year to be formatted.
 * @return {string} The group key representation.
 */
export function formatYear(year) {
    if (year < 0) {
        return yearFormatter.format(-year) + BCE;
    }
    return yearFormatter.format(year);
}

/**
 * Parses a group key string into a year number. Note that a year must have at least 4 digits.
 * @param {string} groupKey The group key.
 * @returns {number|undefined}  The year, <code>undefined</code> if groupKey is not valid for a year.
 */
export function parseYear(groupKey) {
    if (typeof groupKey !== 'string') {
        return undefined;
    }
    if (groupKey.length < 4) {
        return undefined;
    }

    const bceIndex = groupKey.indexOf(BCE);
    let yearSign = 1;
    if (bceIndex >= 0) {
        groupKey = groupKey.slice(0, bceIndex);
        yearSign = -1;
    }

    const year = parseDecimalInteger(groupKey);
    return (year === undefined) ? undefined : year * yearSign;
}


/**
 * {@link Grouper} that groups by year.
 */
export class YearGrouper extends DateGrouperBase {
    compareGroupKeys(a, b) {
        const yearA = parseYear(a);
        const yearB = parseYear(b);
        if (yearA === yearB) {
            return 0;
        }
        else if (yearA === undefined) {
            return 1;
        }
        else if (yearB === undefined) {
            return -1;
        }
        return yearA - yearB;
    }

    getGroupKeyForEntryKey(entryKey) {
        return formatYear(entryKey.getFullYear());
    }

    getFollowingGroupKey(groupKey) {
        const year = parseYear(groupKey);
        return (year === undefined) ? undefined : formatYear(year + 1);
    }

    isValidGroupKey(groupKey) {
        return parseYear(groupKey) !== undefined;
    }
}


const quarterSeparator = '_Q';

/**
 * Format a year and a quarter into a group key string.
 * @param {number} year The year of interest.
 * @param {number} quarter The quarter of interest, valid values are 1 through 4.
 * @returns {string}    The group key representation.
 */
export function formatYearAndQuarter(year, quarter) {
    return formatYear(year) + quarterSeparator + quarter;
}

/**
 * Parses a group key string into a year and a quarter.
 * @param {object} groupKey The group key string to parse.
 * @returns {object|undefined}  An object with a year property and a quarter property, <code>undefined</code> if group key
 * does not represent a year/quarter group key.
 */
export function parseYearAndQuarter(groupKey) {
    if (groupKey.length < 7) {
        return undefined;
    }
    const qIndex = groupKey.indexOf(quarterSeparator);
    if (qIndex < 0) {
        return undefined;
    }

    const year = parseYear(groupKey.slice(0, qIndex));
    if (year === undefined) {
        return undefined;
    }

    const quarter = parseDecimalInteger(groupKey.slice(qIndex + quarterSeparator.length));
    if ((quarter === undefined) || (quarter < 1) || (quarter > 4)) {
        return undefined;
    }

    return {
        year: year,
        quarter: quarter,
    };
}


/**
 * {@link Grouper} that groups by year + quarter (Q1 through Q4).
 */
export class QuarterGrouper extends DateGrouperBase {
    compareGroupKeys(a, b) {
        const yqA = parseYearAndQuarter(a);
        const yqB = parseYearAndQuarter(b);
        if (yqA === yqB) {
            return 0;
        }
        else if (yqA === undefined) {
            return 1;
        }
        else if (yqB === undefined) {
            return -1;
        }
        if (yqA.year !== yqB.year) {
            return yqA.year - yqB.year;
        }
        return yqA.quarter - yqB.quarter;
    }

    getGroupKeyForEntryKey(entryKey) {
        const quarter = Math.floor(entryKey.getMonth() / 3) + 1;
        return formatYearAndQuarter(entryKey.getFullYear(), quarter);
    }

    getFollowingGroupKey(groupKey) {
        const yearAndQuarter = parseYearAndQuarter(groupKey);
        if (!yearAndQuarter) {
            return undefined;
        }

        let { year, quarter } = yearAndQuarter;
        if (quarter === 4) {
            quarter = 1;
            ++year;
        }
        else {
            ++quarter;
        }
        return formatYearAndQuarter(year, quarter);
    }

    isValidGroupKey(groupKey) {
        return parseYearAndQuarter(groupKey) !== undefined;
    }
}



/**
 * {@link Grouper} implementation whose keys are indices and group is by multiples of indices.
 * The group keys are actually of the for '0_999' where the first number is the first index
 * in the group and the second number is the last index in the group.
 * @abstract
 */
export class IndexGrouper extends Grouper {
    constructor(options) {
        super();
        options = options || {};
        this._groupSize = options.groupSize || 1000;
    }

    compareEntryKeys(a, b) {
        return a - b;
    }

    compareGroupKeys(a, b) {
        const parseA = this.parseGroupKey(a);
        const parseB = this.parseGroupKey(b);
        if (parseA === parseB) {
            return 0;
        }
        if (parseA === undefined) {
            return -1;
        }
        else if (parseB === undefined) {
            return 1;
        }

        const result = parseA[0] - parseB[0];
        if (result) {
            return result;
        }

        return parseA[1] - parseB[1];
    }

    getGroupKeyForEntryKey(entryKey) {
        const firstIndex = Math.trunc(entryKey / this._groupSize) * this._groupSize;
        const lastIndex = firstIndex + this._groupSize - 1;
        return firstIndex + '_' + lastIndex;
    }

    getFollowingGroupKey(groupKey) {
        const parse = this.parseGroupKey(groupKey);
        if (parse === undefined) {
            return undefined;
        }
        parse[0] += this._groupSize;
        parse[1] += this._groupSize;
        return parse[0] + '_' + parse[1];
    }

    isValidGroupKey(groupKey) {
        return this.parseGroupKey(groupKey) !== undefined;
    }

    parseGroupKey(groupKey) {
        if (typeof groupKey === 'string') {
            const sepIndex = groupKey.indexOf('_');
            if (sepIndex >= 0) {
                const firstIndex = parseDecimalInteger(groupKey.slice(0, sepIndex));
                if (firstIndex !== undefined) {
                    if (Math.trunc(firstIndex * this._groupSize) / this._groupSize === firstIndex) {
                        const lastIndex = parseDecimalInteger(groupKey.slice(sepIndex + 1));
                        if ((lastIndex !== undefined) && ((firstIndex + this._groupSize - 1) === lastIndex)) {
                            return [firstIndex, lastIndex];
                        }
                    }
                }
            }
        }
    }
}
