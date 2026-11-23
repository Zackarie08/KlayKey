import test from 'node:test';
import assert from 'node:assert/strict';
import {quote,manifest} from '../server/services/builds.js';

test('Custom colors persist in quotes and use the same trusted inventory and price as the base set',async()=>{
 const base={...manifest.defaults,layout:'75',connection:'tri-mode',controlModule:'none'};
 const layout=manifest.layouts.find(l=>l.id===base.layout);
 const products=['layout','keycapTheme','switch'].map((field,i)=>({id:i+1,name:field,option_field:field,option_value:base[field],price_cents:10000,stock_quantity:1000,compatibility:{layouts:['75'],mount:layout.switchMount,connections:['tri-mode'],widths:layout.requiredWidths,heights:layout.requiredHeights}}));
 const db={execute:async()=>[products]};
 const preset=await quote(base,db),colors={alpha:'#123456',modifier:'#ABCDEF',accent:'#F01234'};
 const custom=await quote({...base,keycapColorMode:'custom',customKeycapColors:colors,price_cents:1},db);
 assert.deepEqual(custom.configuration.customKeycapColors,colors);
 assert.equal(custom.configuration.keycapColorMode,'custom');
 assert.equal(custom.price_cents,preset.price_cents);assert.deepEqual(custom.components,preset.components);
 const reopened=await quote(JSON.parse(JSON.stringify(custom.configuration)),db);
 assert.deepEqual(reopened.configuration,custom.configuration);
 await assert.rejects(quote({...base,keycapColorMode:'custom',customKeycapColors:{...colors,alpha:'red'}},db),/incompatible or unknown/);
});
