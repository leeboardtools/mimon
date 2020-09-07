import * as ASTH from './AccountingSystemTestHelpers';
import * as T from './Transactions';

test('AutoCompleteSplitsManager', async () => {
    const sys = await ASTH.asyncCreateBasicAccountingSystem();
    const acsManager = sys.accountingSystem.getAutoCompleteSplitsManager();

    expect(acsManager.getSplitInfos(sys.checkingId, 'A test')).toEqual([]);
});