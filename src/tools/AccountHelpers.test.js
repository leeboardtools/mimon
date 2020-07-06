import { createDir, cleanupDir } from '../util/FileTestHelpers';
import * as EATH from './EngineAccessTestHelpers';
import * as AH from './AccountHelpers';
const path = require('path');

test('AccountHelpers', async () => {
    const baseDir = await createDir('AccountHelpers');

    try {
        await cleanupDir(baseDir, true);

        const pathName = path.join(baseDir, 'test');
        const { accessor, sys } = await EATH.asyncSetupTestEngineAccess(pathName);

        const asset = accessor.getAccountDataItemWithId(
            accessor.getRootAssetAccountId());
        const investments = accessor.getAccountDataItemWithId(
            sys.investmentsId);
        const brokerageA = accessor.getAccountDataItemWithId(
            sys.brokerageAId);
        const aaplBrokerageA = accessor.getAccountDataItemWithId(
            sys.aaplBrokerageAId);
        

        expect(AH.getAncestorAccountDataItems(accessor, 10000000)).toEqual([]);
        expect(AH.getAncestorAccountDataItems(accessor, 
            accessor.getRootAssetAccountId())).toEqual([asset]);

        expect(AH.getAncestorAccountDataItems(accessor, sys.investmentsId)).toEqual([
            investments,
            asset,
        ]);
        expect(AH.getAncestorAccountDataItems(accessor, sys.brokerageAId)).toEqual([
            brokerageA,
            investments,
            asset,
        ]);
        expect(AH.getAncestorAccountDataItems(accessor, sys.aaplBrokerageAId)).toEqual([
            aaplBrokerageA,
            brokerageA,
            investments,
            asset,
        ]);


        expect(AH.getAccountAncestorNames(accessor, 10000000)).toEqual('');
        expect(AH.getAccountAncestorNames(accessor,
            accessor.getRootAssetAccountId())).toEqual(asset.name);
        expect(AH.getAccountAncestorNames(accessor, sys.investmentsId)).toEqual(
            asset.name + ':' + investments.name
        );
        expect(AH.getAccountAncestorNames(accessor, sys.brokerageAId)).toEqual(
            asset.name + ':' + investments.name + ':' + brokerageA.name
        );
        expect(AH.getAccountAncestorNames(accessor, sys.brokerageAId, 
            {separator: '-'})).toEqual(
            asset.name + '-' + investments.name + '-' + brokerageA.name
        );
        
        expect(AH.getShortAccountAncestorNames(accessor, 10000000)).toEqual('');
        expect(AH.getShortAccountAncestorNames(accessor,
            accessor.getRootAssetAccountId())).toEqual(asset.name);
        expect(AH.getShortAccountAncestorNames(accessor, sys.investmentsId)).toEqual(
            asset.name + ':' + investments.name
        );
        expect(AH.getShortAccountAncestorNames(accessor, sys.brokerageAId)).toEqual(
            asset.name + ':' + investments.name + ':' + brokerageA.name
        );
        expect(AH.getShortAccountAncestorNames(accessor, sys.aaplBrokerageAId)).toEqual(
            asset.name + ':[...]:' + brokerageA.name + ':' + aaplBrokerageA.name
        );
        expect(AH.getShortAccountAncestorNames(accessor, sys.aaplBrokerageAId,
            {
                separator: '-',
                placeholder: '_'
            })).toEqual(
            asset.name + '_' + brokerageA.name + '-' + aaplBrokerageA.name
        );

        await accessor.asyncCloseAccountingFile();
    }
    finally {
        await cleanupDir(baseDir);
    }
});