import 'regenerator-runtime/runtime';
import * as Engine from './engine/Engine';

beforeAll(async () => { 
    await Engine.initializeEngine(); 
});
