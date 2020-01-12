import * as A from './Accounts';


//
//---------------------------------------------------------
//
export function expectAccountState(accountState, ref) {
    accountState = A.getAccountStateDataItem(accountState);
    ref = A.getAccountStateDataItem(ref);

    if (ref.ymdDate) {
        expect(accountState.ymdDate).toEqual(ref.ymdDate);
    }

    if (ref.quantityBaseValue !== undefined) {
        expect(accountState.quantityBaseValue).toEqual(ref.quantityBaseValue);
    }

    if (ref.lots) {
        expect(accountState.lots).toEqual(ref.lots);
    }
}


//
//---------------------------------------------------------
//
export function expectAccount(account, ref) {
    if (ref.localId) {
        expect(account.id).toEqual(ref.id);
    }

    if (ref.type) {
        const type = A.getAccountTypeName(ref.type);
        expect(account.type).toEqual(type);
    }

    if (ref.pricedItemLocalId) {
        expect(account.pricedItemLocalId).toEqual(ref.pricedItemLocalId);
    }

    if (ref.childAccountLocalIds) {
        expect(account.childAccountLocalIds).toEqual(ref.childAccountLocalIds);
    }

}