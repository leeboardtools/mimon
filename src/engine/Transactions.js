import { IdGenerator } from '../util/Ids';


export class TransactionManager {
    constructor(accountingSystem) {
        this._accountingSystem = accountingSystem;
        
        this._idGenerator = new IdGenerator();
    }

    getAccountingSystem() { return this._accountingSystem; }
    
}