import test from 'node:test';
import assert from 'node:assert/strict';
import {activePromotion,visibleCampaign,availability,bestProductPrice,discountedBuild,firstPurchaseEligible,HOLIDAY_SLUG,HOLIDAY_EDITIONS} from '../server/services/promotions.js';
import {snapshot} from '../server/services/cart.js';
import {promotionInput} from '../server/services/admin-rules.js';
const sale={id:2,kind:'seasonal',enabled:1,preview_at:'2026-11-22 16:00:00',starts_at:'2026-11-30 16:00:00',ends_at:'2026-12-31 16:00:00',discount_type:'percent',discount_value:15,include_builds:1,product_ids:[123],category_ids:[],featured_product_id:123,title:'Christmas',revision:1};
const first={id:1,enabled:1,discount_type:'percent',discount_value:10,product_ids:[],category_ids:['prebuilt'],title:'First purchase'};
const board={id:123,slug:HOLIDAY_SLUG,category_id:'prebuilt',price_cents:499000,stock_quantity:50};
const start=Date.parse('2026-12-01T00:00:00+08:00'),end=Date.parse('2027-01-01T00:00:00+08:00');
test('Preview is visible before the December discount, which ends at Philippine midnight',()=>{
 assert.equal(visibleCampaign(sale,start-1),true);assert.equal(activePromotion(sale,start-1),false);
 assert.equal(activePromotion(sale,start),true);assert.equal(activePromotion(sale,end-1),true);
 assert.equal(activePromotion(sale,end),false);assert.equal(visibleCampaign(sale,end),false);
 assert.equal(visibleCampaign({...sale,enabled:0},start),false);
});
test('Limited release fails closed without setup and enforces time and remaining stock',()=>{
 assert.equal(availability(board,null,start).purchasable,false);
 assert.equal(availability(board,{...sale,starts_at:null},start).purchasable,false);
 assert.equal(availability(board,sale,start-1).purchasable,false);
 assert.equal(availability(board,sale,start).purchasable,true);
 assert.equal(availability(board,sale,end).purchasable,false);
 assert.equal(availability({...board,stock_quantity:0},sale,start).purchasable,false);
 assert.equal(availability({...board,slug:'renamed'},sale,end).purchasable,false);
 assert.equal(availability({id:999,slug:'regular',stock_quantity:3},sale,end).purchasable,true);
});
test('Best offer wins per eligible item without stacking or discounting excluded products',()=>{
 const priced=bestProductPrice(board,[sale,first],start);assert.equal(priced.price_cents,424150);assert.equal(priced.discount_cents,74850);assert.equal(priced.promotion.id,2);
 assert.equal(bestProductPrice(board,[sale,first],start-1).price_cents,449100);
 assert.equal(bestProductPrice({...board,id:999,category_id:'accessory'},[sale,first],start).price_cents,499000);
 assert.equal(bestProductPrice(board,[{...sale,discount_value:5},first],start).promotion.id,1);
});
test('Custom discount excludes assembly, preserves stock components and ends with sale',()=>{
 const build={price_cents:100001,components:[{productId:1,quantity:84}],lines:[{name:'Parts',amount:90001},{name:'Assembly',amount:10000}]};
 const result=discountedBuild(build,sale,10000,start);assert.equal(result.discount_cents,13500);assert.equal(result.price_cents,86501);assert.equal(result.lines.reduce((n,l)=>n+l.amount,0),result.price_cents);assert.deepEqual(result.components,build.components);
 assert.equal(discountedBuild(build,sale,10000,end),build);assert.equal(discountedBuild(build,{...sale,include_builds:0},10000,start),build);
});
test('First purchase requires an account and is consumed by every prior successful order',async()=>{
 let calls=0;const db={execute:async(sql,args)=>{calls++;assert.match(sql,/orders WHERE user_id/);return [args[0]===1?[]:[{id:42}]];}};
 assert.equal(await firstPurchaseEligible(null,db),false);assert.equal(calls,0);
 assert.equal(await firstPurchaseEligible(1,db),true);assert.equal(await firstPurchaseEligible(2,db),false);
});
test('Cart revalidation blocks limited inventory with expired or missing campaign',async()=>{
 const db={execute:async()=>[[{...board,images:'["/assets/images/noel-75.svg"]'}]]};
 await assert.rejects(snapshot({product_id:123,quantity:1},db,{offers:[],campaign:null}),/unavailable/);
 await assert.rejects(snapshot({product_id:123,quantity:1},db,{offers:[],campaign:{...sale,ends_at:'2000-01-01 00:00:00'}}),/ended|Available/);
});
test('Only seasonal editor may enable a build-only campaign',()=>{
 const input={title:'Holiday',message:'Holiday offer',discount_type:'percent',discount_value:15,enabled:true,include_builds:true,product_ids:[],category_ids:[]};
 assert.throws(()=>promotionInput(input),/eligible/);assert.equal(promotionInput(input,{allowBuilds:true}).enabled,true);
});


test('All three editions retain their distinct preview identity and December purchase restrictions',()=>{
 assert.deepEqual(HOLIDAY_EDITIONS.map(e=>e.layout),['60','75','100']);
 assert.equal(new Set(HOLIDAY_EDITIONS.map(e=>e.case)).size,3);
 for(const e of HOLIDAY_EDITIONS){const product={id:999,slug:e.slug,sku:e.sku,stock_quantity:50};
  for(const now of [start-1,start,end]){const result=availability(product,sale,now);assert.equal(result.edition_key,e.key);assert.equal(result.limited_edition,true);assert.equal(result.purchasable,now===start);}
  assert.equal(availability({...product,slug:'renamed-product'},sale,start-1).purchasable,false);
  assert.equal(availability(product,null,start).purchasable,false);
  assert.equal(availability({...product,stock_quantity:0},sale,start).purchasable,false);
 }
});
