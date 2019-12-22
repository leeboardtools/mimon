import * as EG from './EntryGroups';
import { createDir, cleanupDir } from './FileTestHelpers';

const fs = require('fs');
const fsPromises = fs.promises;

test('IndexGrouper', () => {
    const grouper = new EG.IndexGrouper({ groupSize: 100 });
    expect(grouper.getGroupKeyForEntryKey(0)).toEqual('0_99');
    expect(grouper.getGroupKeyForEntryKey(99)).toEqual('0_99');
    expect(grouper.getGroupKeyForEntryKey(100)).toEqual('100_199');

    expect(grouper.getFollowingGroupKey('100_199')).toEqual('200_299');
    expect(grouper.isValidGroupKey('100_199')).toBeTruthy();
    expect(grouper.isValidGroupKey('99_100')).toBeFalsy();
    expect(grouper.isValidGroupKey('101_199')).toBeFalsy();

    expect(grouper.compareGroupKeys('100_199', '100_199')).toEqual(0);
    expect(grouper.compareGroupKeys('100_199', '200_299')).toBeLessThan(0);
    expect(grouper.compareGroupKeys('200_299', '100_199')).toBeGreaterThan(0);
});


test('YearGrouper', () => {
    expect(EG.parseYear('2019')).toEqual(2019);
    expect(EG.formatYear(2019)).toEqual('2019');

    expect(EG.parseYear('0079')).toEqual(79);
    expect(EG.formatYear(79)).toEqual('0079');

    expect(EG.parseYear('0100BCE')).toEqual(-100);
    expect(EG.formatYear(-100)).toEqual('0100BCE');

    const grouper = new EG.YearGrouper();
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 9, 8))).toEqual('2019');
    expect(grouper.getFollowingGroupKey('2019')).toEqual('2020');
    expect(grouper.getFollowingGroupKey('0001BCE')).toEqual('0000');
    expect(grouper.isValidGroupKey('12abc')).toBeFalsy();
    expect(grouper.isValidGroupKey('0001BCE')).toBeTruthy();

    expect(grouper.compareGroupKeys('0001BCE', '0002BCE')).toBeGreaterThan(0);
    expect(grouper.compareGroupKeys('0002BCE', '0001BCE')).toBeLessThan(0);
    expect(grouper.compareGroupKeys('0002BCE', '0002BCE')).toEqual(0);

    expect(grouper.compareGroupKeys('2019', '2020')).toBeLessThan(0);
    expect(grouper.compareGroupKeys('2020', '2019')).toBeGreaterThan(0);
    expect(grouper.compareGroupKeys('2019', '2019')).toEqual(0);
});


test('QuarterGrouper', () => {
    expect(EG.parseYearAndQuarter('2019_Q1')).toEqual({ year: 2019, quarter: 1 });
    expect(EG.formatYearAndQuarter(2019, 1)).toEqual('2019_Q1');

    expect(EG.parseYearAndQuarter('0019BCE_Q4')).toEqual({ year: -19, quarter: 4 });
    expect(EG.formatYearAndQuarter(-19, 4)).toEqual('0019BCE_Q4');

    const grouper = new EG.QuarterGrouper();
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 1 - 1, 1))).toEqual('2019_Q1');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 3 - 1, 31))).toEqual('2019_Q1');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 4 - 1, 1))).toEqual('2019_Q2');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 6 - 1, 30))).toEqual('2019_Q2');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 7 - 1, 1))).toEqual('2019_Q3');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 9 - 1, 30))).toEqual('2019_Q3');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 10 - 1, 1))).toEqual('2019_Q4');
    expect(grouper.getGroupKeyForEntryKey(new Date(2019, 12 - 1, 31))).toEqual('2019_Q4');

    expect(grouper.getFollowingGroupKey('2019_Q1')).toEqual('2019_Q2');
    expect(grouper.getFollowingGroupKey('2019_Q4')).toEqual('2020_Q1');
    expect(grouper.getFollowingGroupKey('0001BCE_Q3')).toEqual('0001BCE_Q4');
    expect(grouper.getFollowingGroupKey('0001BCE_Q4')).toEqual('0000_Q1');

    expect(grouper.isValidGroupKey('0001BCE_Q5')).toBeFalsy();
    expect(grouper.isValidGroupKey('0001BCE_Q3')).toBeTruthy();

    expect(grouper.compareGroupKeys('0001BCE_Q1', '0001BCE_Q2')).toBeLessThan(0);
    expect(grouper.compareGroupKeys('0001BCE_Q2', '0001BCE_Q1')).toBeGreaterThan(0);

    expect(grouper.compareGroupKeys('0001BCE_Q1', '0002BCE_Q1')).toBeGreaterThan(0);
    expect(grouper.compareGroupKeys('0002BCE_Q1', '0001BCE_Q1')).toBeLessThan(0);

    expect(grouper.compareGroupKeys('0001BCE_Q1', '0001BCE_Q1')).toEqual(0);

    expect(grouper.compareGroupKeys('2019_Q1', '2019_Q2')).toBeLessThan(0);
    expect(grouper.compareGroupKeys('2019_Q2', '2019_Q1')).toBeGreaterThan(0);
    expect(grouper.compareGroupKeys('2019_Q2', '2019_Q2')).toEqual(0);
});


class TestEntryGroupFiles extends EG.EntryGroupFiles {
    getEntryKeyFromEntry(entry) {
        return entry.date;
    }

    async loadEntriesForGroup(groupKey, pathName) {
        throw Error('loadEntriesForGroup: ' + groupKey + ' ' + pathName);
    }

    areEntriesTheSame(a, b) {
        return a === b;
    }
}

function compareEntries(a, b) {
    const dateSort = a.date.valueOf() - b.date.valueOf();
    if (dateSort) {
        return dateSort;
    }
    return a.value.localeCompare(b.value);
}

async function expectEntries(files, refEntries) {
    expect(files.getTotalEntryCount()).toEqual(refEntries.length);

    refEntries.sort(compareEntries);

    const testEntries = await files.getEntriesInRange();
    testEntries.sort(compareEntries);

    expect(testEntries).toEqual(refEntries);
    if (refEntries.length) {
        expect(files.getOldestEntryKey()).toEqual(refEntries[0].date);
        expect(files.getNewestEntryKey()).toEqual(refEntries[refEntries.length - 1].date);
    }
    else {
        expect(files.getOldestEntryKey()).toBeUndefined();
        expect(files.getNewestEntryKey()).toBeUndefined();
    }
}


test('EntryGroupFiles.setEntryGroupsFromEntries()', async () => {
    const files = new TestEntryGroupFiles({
        grouper: new EG.YearGrouper(),
        fileNamePrefix: 'Test',
        fileNameExt: 'Txt',
    });

    const entryA = { date: new Date(2019, 2, 3), value: 'A' };
    const entryB = { date: new Date(2019, 3, 5), value: 'B' };
    const entryC = { date: new Date(2019, 3, 5), value: 'C' };
    const entryD = { date: new Date(2016, 4, 5), value: 'D' };

    let refEntries = [entryD, entryA, entryB, entryC];  // 2016-4-5. 2019-2-3, 2019-3-5, 2019-3-5

    files.setEntryGroupsFromEntries([
        entryA,
        entryB,
        entryC,
        entryD,
    ]);

    await expectEntries(files, refEntries);
    expect(files.getTotalEntryCount()).toEqual(4);
    expect(files.getOldestEntryKey()).toEqual(entryD.date);
    expect(files.getNewestEntryKey()).toEqual(entryB.date);

    expect(await files.getEntriesInRange(new Date(2019, 2, 1), new Date(2019, 2, 2))).toEqual([]);
    expect(await files.getEntriesInRange(new Date(2019, 2, 3), new Date(2019, 3, 1))).toEqual([entryA]);
    expect(await files.getEntriesInRange(new Date(2019, 3, 5), new Date(2019, 2, 4))).toEqual([entryB, entryC]);
    expect(await files.getEntriesInRange(new Date(2019, 2, 3), new Date(2016, 4, 4))).toEqual([entryD, entryA]);
    expect(await files.getEntriesInRange(new Date(2019, 3, 6), new Date(2019, 3, 6))).toEqual([]);
    expect(await files.getEntriesInRange(new Date(2016, 4, 6), new Date(2019, 2, 2))).toEqual([]);

    // Test missing ends:
    expect(await files.getEntriesInRange(new Date(2019, 3, 5))).toEqual([entryB, entryC]);
    expect(await files.getEntriesInRange(undefined, new Date(2019, 2, 3))).toEqual([entryD, entryA]);

    // TODO:
    // Test addEntryUpdates().
    // Add entry
    // Delete entry
    // Replace entry, same group.
    // Replace entry, different group.

    // Simple replace entry.
    const entryB1 = { date: new Date(2019, 3, 5), value: 'B1' };
    await files.addEntryUpdates([
        [entryB1, entryB]
    ]);
    expect(await files.getEntriesInRange(new Date(2019, 3, 5), new Date(2019, 2, 4))).toEqual([entryB1, entryC]);
    refEntries = [entryD, entryA, entryB1, entryC];  // 2016-4-5. 2019-2-3, 2019-3-5, 2019-3-5
    await expectEntries(files, refEntries);

    // Add entry
    const entryE = { date: new Date(2017, 5, 2), value: 'E' };
    await files.addEntryUpdates([
        [entryE]
    ]);
    expect(await files.getEntriesInRange(entryE.date, entryE.date)).toEqual([entryE]);
    refEntries = [entryD, entryE, entryA, entryB1, entryC];  // 2016-4-5. 2017-5-2, 2019-2-3, 2019-3-5, 2019-3-5
    await expectEntries(files, refEntries);

    // Add entry oldest.
    const entryF = { date: new Date(2015, 4, 3), value: 'F' };
    await files.addEntryUpdates([
        [entryF]
    ]);
    refEntries = [entryF, entryD, entryE, entryA, entryB1, entryC];  // 2015-4-3, 2016-4-5. 2017-5-2, 2019-2-3, 2019-3-5, 2019-3-5
    await expectEntries(files, refEntries);

    // Add entry newest, existing group.
    const entryG = { date: new Date(2019, 8, 3), value: 'G' };
    await files.addEntryUpdates([
        [entryG]
    ]);
    refEntries = [entryF, entryD, entryE, entryA, entryB1, entryC, entryG];  // 2015-4-3, 2016-4-5. 2017-5-2, 2019-2-3, 2019-3-5, 2019-3-5, 2019-8-3
    await expectEntries(files, refEntries);

    // Replace an entry, same group.
    const entryH = { date: new Date(2019, 7, 4), value: 'H' };
    await files.addEntryUpdates([
        [entryH, entryC]
    ]);
    refEntries = [entryF, entryD, entryE, entryA, entryB1, entryH, entryG];  // 2015-4-3, 2016-4-5. 2017-5-2, 2019-2-3, 2019-3-5, 2019-7-4, 2019-8-3
    await expectEntries(files, refEntries);

    // Replace an entry, different group.
    await files.addEntryUpdates([
        [entryB, entryD]
    ]);
    refEntries = [entryF, entryE, entryA, entryB, entryB1, entryH, entryG];  // 2015-4-3, 2017-5-2, 2019-2-3, 2019-3-5, 2019-3-5, 2019-7-4, 2019-8-3
    await expectEntries(files, refEntries);

    // Delete an entry, group remains.
    await files.addEntryUpdates([
        [undefined, entryB],
    ]);
    refEntries = [entryF, entryE, entryA, entryB1, entryH, entryG];  // 2015-4-3, 2017-5-2, 2019-2-3, 2019-3-5, 2019-7-4, 2019-8-3
    await expectEntries(files, refEntries);

    // Delete an entry, group goes away.
    await files.addEntryUpdates([
        [undefined, entryF],
    ]);
    refEntries = [entryE, entryA, entryB1, entryH, entryG];  // 2017-5-2, 2019-2-3, 2019-3-5, 2019-7-4, 2019-8-3
    await expectEntries(files, refEntries);


    // At this point we have the groups '2015', '2016', '2017', '2019'.
    expect(files.getGroupFileNames().sort()).toEqual([
        'Test2017.Txt', 'Test2019.Txt'
    ]);


});


class TestEntryHandler extends EG.EntryHandler {
    getEntryKeyFromEntry(entry) {
        return entry.date;
    }

    async writeSummaryFile(entryGroupFiles, pathName, summaryInfo) {
        const text = JSON.stringify(summaryInfo);
        await fsPromises.writeFile(pathName, text);
    }

    async readSummaryFile(entryGroupFiles, pathName) {
        const text = await fsPromises.readFile(pathName, 'utf8');
        return JSON.parse(text);
    }

    async loadEntriesForGroup(groupKey, pathName) {
        const text = await fsPromises.readFile(pathName, 'utf8');
        const object = JSON.parse(text);
        object.forEach((entry) => {
            entry.date = new Date(entry.date);
        });
        return object;
    }

    async writeEntriesForGroup(groupKey, entries, pathName) {
        const text = JSON.stringify(entries);
        await fsPromises.writeFile(pathName, text);
    }

    areEntriesTheSame(a, b) {
        return a === b;
    }
}


test('EntryGroupFiles.write()', async () => {
    const baseDir = await createDir('EntryGroupFiles');

    try {
        await cleanupDir(baseDir, true);

        const filesOptions = {
            grouper: new EG.YearGrouper(),
            entryHandler: new TestEntryHandler(),
            fileNamePrefix: 'Test',
            fileNameExt: 'Txt',
        };
        const filesWriter = new EG.EntryGroupFiles(filesOptions);

        const entryA = { date: new Date(2016, 4, 5), value: 'A' };
        const entryB = { date: new Date(2016, 4, 5), value: 'B' };
        const entryC = { date: new Date(2017, 6, 7), value: 'C' };
        const entryD = { date: new Date(2019, 3, 4), value: 'D' };

        let refEntries = [entryA, entryB, entryC, entryD];
        filesWriter.setEntryGroupsFromEntries(refEntries);
        await expectEntries(filesWriter, refEntries);

        await filesWriter.write(baseDir);

        const filesReader = new EG.EntryGroupFiles(filesOptions);
        await filesReader.quickRead(baseDir);
        expect(filesReader.getTotalEntryCount()).toEqual(refEntries.length);
        await expectEntries(filesReader, refEntries);


        const entryE = { date: new Date(2016, 5, 6), value: 'E' };
        const entryF = { date: new Date(2019, 4, 5), value: 'F' };
        await filesWriter.addEntryUpdates([
            [entryE],
            [undefined, entryC],
            [entryF],
        ]);
        refEntries = [entryA, entryB, entryE, entryD, entryF];
        await expectEntries(filesWriter, refEntries);

        await filesWriter.write(baseDir);
        await filesReader.quickRead(baseDir);
        await expectEntries(filesReader, refEntries);

    }
    finally {
        // await cleanupDir(baseDir);
    }
});
