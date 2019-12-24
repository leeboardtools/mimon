
export function expectAccount(account, ref) {
    if (ref.localId) {
        expect(account.id).toEqual(ref.id);
    }

    if (ref.type) {
        const type = (typeof ref.type === 'string') ? ref.type : ref.type.name;
        expect(account.type).toEqual(type);
    }

    if (ref.pricedItemLocalId) {
        expect(account.pricedItemLocalId).toEqual(ref.pricedItemLocalId);
    }

    if (ref.childAccountLocalIds) {
        expect(account.childAccountLocalIds).toEqual(ref.childAccountLocalIds);
    }
}