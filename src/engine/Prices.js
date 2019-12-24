export class PriceManager {
    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
    }

    async asyncSetupForUse() {
        
    }

    getAccountingSystem() { return this._accountingSystem; }

}