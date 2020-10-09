import * as LSTH from './LotStateTestHelpers';

export function cleanAccountState(accountState) {
    accountState = Object.assign({}, accountState);
    delete accountState.removedLotStates;

    const { lotStates } = accountState;
    if (lotStates) {
        accountState.lotStates = lotStates.map(
            (lotState) => LSTH.cleanLotState(lotState));
    }
    delete accountState.storedLotChanges;
    delete accountState.previousBaseValues;

    return accountState;
}


export function expectAccountState(test, ref) {
    if (Array.isArray(test)) {
        expect(test.length).toEqual(1);
        test = test[0];
    }
    
    test = cleanAccountState(test);
    ref = cleanAccountState(ref);

    expect(test.ymdDate).toEqual(ref.ymdDate);
    expect(test.quantityBaseValue).toEqual(ref.quantityBaseValue);

    if (ref.lotStates) {
        expect(test.lotStates).toBeDefined();
        expect(test.lotStates.length).toEqual(ref.lotStates.length);
        expect(test.lotStates).toEqual(expect.arrayContaining(ref.lotStates));
    }
    else {
        expect(test.lotStates).toBeUndefined();
    }
}