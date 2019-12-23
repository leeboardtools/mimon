export class PriceManager {
    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
    }

    getAccountingSystem() { return this._accountingSystem; }

}