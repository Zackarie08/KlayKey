import test from 'node:test';
import assert from 'node:assert/strict';
import {pool} from '../server/database/connection.js';
import {listProducts} from '../server/services/catalog.js';
test('Catalog filters and effective price SQL use all eligible offers with matching bound parameters',async()=>{
 const original=pool.execute,queries=[];
 const offers=[{id:3,title:'Sale',enabled:1,discount_type:'percent',discount_value:15,product_ids:[9],category_ids:[],audience:'everyone'},{id:4,title:'Welcome',enabled:1,discount_type:'fixed',discount_value:20000,product_ids:[],category_ids:['prebuilt'],audience:'first_purchase'}];
 pool.execute=async(sql,args=[])=>{assert.equal((sql.match(/\?/g)||[]).length,args.length);queries.push({sql,args});
  if(sql.includes('FROM store_promotion'))return [offers];
  if(sql.includes('FROM orders'))return [[]];
  if(sql.startsWith('SELECT COUNT'))return [[{n:1}]];
  return [[{id:9,slug:'regular',category_id:'prebuilt',price_cents:100000,stock_quantity:3,layout:'75',switch_type:'switch-red',images:'["/assets/images/keyboard_75.webp"]',compatibility:'{"layouts":["75"]}'}]];
 };
 try{const result=await listProducts({switch:'linear',connection:'bluetooth',rgb:'1',sale:'promo-3',sort:'price-asc'},7);
  assert.equal(result.products[0].price_cents,80000);assert.equal(result.products[0].promotion.id,4);
  const query=queries.find(q=>q.sql.includes('ORDER BY effective_price'));assert.ok(query);assert.ok(query.args.includes('switch-red'));assert.ok(query.args.includes('switch-cream'));assert.ok(query.args.includes('bluetooth'));assert.match(query.sql,/rgb_supported=1/);
  queries.length=0;await listProducts({featured:'1'});assert.match(queries.find(q=>q.sql.includes('LIMIT 100')).sql,/is_featured=1/);
 }finally{pool.execute=original;}
});
