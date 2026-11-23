import test from 'node:test';
import assert from 'node:assert/strict';
import {eventInput} from '../server/services/admin-rules.js';
import {getOffers,bestProductPrice,bestBuildPrice,listPromotions,visibleCampaign} from '../server/services/promotions.js';
import {canonicalSpec,validatedSpec,switchFilterValues,productOptions} from '../server/services/product-options.js';
const base={title:'Weekend offer',message:'Save on selected items.',display_type:'floating',audience:'everyone',theme:'standard',discount_type:'percent',discount_value:15,enabled:true,product_ids:[8],category_ids:[],priority:0};
test('Two display types allow independent audiences, fixed discounts, and build-only events',()=>{
 assert.equal(eventInput(base).display_type,'floating');
 const event=eventInput({...base,display_type:'popup',starts_at:'2026-12-01T00:00Z',ends_at:'2026-12-03T00:00Z',preview_at:'2026-11-25T00:00Z',audience:'first_purchase',discount_type:'fixed',discount_value:25000});
 assert.equal(event.audience,'first_purchase');assert.equal(event.discount_value,25000);
 assert.equal(eventInput({...base,product_ids:[],include_builds:true}).include_builds,true);
 for(const change of [{display_type:'sidebar'},{audience:'staff'},{theme:'unknown'},{priority:101},{discount_value:1.5},{display_type:'popup'},{preview_at:'2026-12-01T00:00Z'}])assert.throws(()=>eventInput({...base,...change}));
 assert.throws(()=>eventInput({...base,display_type:'popup',starts_at:'2026-12-01T00:00Z',ends_at:'2026-12-02T00:00Z',preview_at:'2026-12-03T00:00Z'}));
});
test('Concurrent offers use the largest discount regardless of display priority; builds exclude assembly',()=>{
 const offers=[{...base,id:3,priority:100},{...base,id:4,discount_type:'fixed',discount_value:20000,priority:0},{...base,id:5,enabled:false,discount_value:90}];
 const item={id:8,price_cents:100000};assert.equal(bestProductPrice(item,offers).price_cents,80000);assert.equal(bestProductPrice(item,offers).promotion.id,4);
 const build={price_cents:100000,lines:[{amount:100000}]};const result=bestBuildPrice(build,offers.map(p=>({...p,include_builds:true})),35000);assert.equal(result.price_cents,80000);assert.equal(result.lines.reduce((n,l)=>n+l.amount,0),80000);
 const freeParts=bestBuildPrice(build,[{...base,discount_type:'fixed',discount_value:999999,include_builds:true}],35000);assert.equal(freeParts.price_cents,35000);
});
test('Every first-purchase event is excluded for returning users; regular offers remain eligible',async()=>{
 const records=[{...base,id:1,audience:'first_purchase'},{...base,id:3,audience:'everyone'},{...base,id:4,audience:'first_purchase'}];
 const db={execute:async(sql,args)=>[sql.includes('FROM orders')?(args[0]===9?[{id:77}]:[]):records]};
 assert.deepEqual((await getOffers(9,db)).offers.map(p=>p.id),[3]);
 assert.deepEqual((await getOffers(null,db)).offers.map(p=>p.id),[3]);
 assert.deepEqual((await getOffers(10,db)).offers.map(p=>p.id),[1,3,4]);
});
test('Pre-upgrade campaigns remain readable without the new columns',async()=>{
 const db={execute:async sql=>{if(sql.includes('DATE_FORMAT(preview_at'))throw Object.assign(Error('missing column'),{code:'ER_BAD_FIELD_ERROR'});return [[{id:1,product_ids:'[]',category_ids:'[]'},{id:2,product_ids:'[]',category_ids:'[]'}]];}};
 const records=await listPromotions(db);assert.equal(records[0].audience,'first_purchase');assert.equal(records[1].display_type,'popup');assert.equal(records[1].theme,'christmas');
});
test('Admin and Shop use builder IDs and reject freeform specifications',()=>{
 for(const c of productOptions.connections){assert.equal(canonicalSpec('connection_type',c.name),c.id);assert.equal(validatedSpec('connection_type',c.id),c.id);}
 assert.equal(canonicalSpec('connection_type',' BT '),'bluetooth');
 for(const s of productOptions.switches){assert.equal(validatedSpec('switch_type',s.name),s.id);assert.ok(switchFilterValues(s.type).includes(s.id));assert.deepEqual(switchFilterValues(s.id),[s.id]);}
 assert.equal(canonicalSpec('layout','ANSI 75%'),'75');assert.equal(validatedSpec('layout',''),null);
 assert.throws(()=>validatedSpec('switch_type','super click special'));assert.throws(()=>validatedSpec('connection_type','magic radio'));
});

test('Popup previews are optional and otherwise begin with the sale',()=>{const p={enabled:true,starts_at:'2026-12-01 00:00:00',ends_at:'2026-12-02 00:00:00'};const now=Date.parse('2026-11-30T12:00:00Z');assert.equal(visibleCampaign(p,now),false);assert.equal(visibleCampaign({...p,preview_at:'2026-11-30 00:00:00'},now),true);});
