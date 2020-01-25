
export function cleanLotState(lotState) {
    lotState = Object.assign({}, lotState);
    delete lotState.previousBaseValues;
    return lotState;
}
