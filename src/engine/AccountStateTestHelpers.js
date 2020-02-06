import * as LSTH from './LotStateTestHelpers';

export function cleanAccountState(accountState) {
    accountState = Object.assign({}, accountState);
    delete accountState.removedLotStates;

    const { lotStates } = accountState;
    if (lotStates) {
        accountState.lotStates = lotStates.map(
            (lotState) => LSTH.cleanLotState(lotState));
    }
    return accountState;
}
