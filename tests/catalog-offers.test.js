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
  const query=queries.find(q=>q.sql.includes('ORDER BY (effective_price<price_cents) DESC,effective_price ASC,id ASC'));assert.ok(query);assert.ok(query.args.includes('switch-red'));assert.ok(query.args.includes('switch-cream'));assert.ok(query.args.includes('bluetooth'));assert.match(query.sql,/rgb_supported=1/);
  queries.length=0;await listProducts({featured:'1'});assert.match(queries.find(q=>q.sql.includes('LIMIT 100')).sql,/is_featured=1/);
 }finally{pool.execute=original;}
});


test('Sale-first ordering is applied before pagination for every catalog sort and offer filter',async t=>{
 const queries=[];t.mock.method(pool,'execute',async(sql,args=[])=>{assert.equal((sql.match(/\?/g)||[]).length,args.length);queries.push({sql,args});if(sql.includes('FROM store_promotion'))return [[{id:3,title:'Active',enabled:1,discount_type:'percent',discount_value:10,product_ids:[9],category_ids:[],audience:'everyone'}]];if(sql.startsWith('SELECT COUNT'))return [[{n:25}]];return [[]];});
 for(const [sort,expected] of [['featured','is_featured DESC,id ASC'],['price-asc','effective_price ASC,id ASC'],['price-desc','effective_price DESC,id ASC'],['name','name ASC,id ASC'],['newest','created_at DESC,id ASC']]){
  queries.length=0;await listProducts({sort,page:'2'});const sql=queries.find(q=>q.sql.includes('LIMIT 12')).sql;assert.ok(sql.includes('ORDER BY (effective_price<price_cents) DESC,'+expected+' LIMIT 12 OFFSET 12'));
 }
 queries.length=0;await listProducts({sale:'1',q:'winter',category:'prebuilt'});for(const {sql} of queries.filter(q=>q.sql.includes('FROM (SELECT'))){assert.match(sql,/AND effective_price<price_cents/);assert.match(sql,/category_id=\?/);assert.match(sql,/name LIKE/);}
 queries.length=0;await listProducts({sale:'0'});for(const {sql} of queries.filter(q=>q.sql.includes('FROM (SELECT')))assert.match(sql,/AND effective_price=price_cents/);
});

test('Expired and future offers cannot create an on-sale result or promotion rank',async t=>{
 const queries=[];t.mock.method(pool,'execute',async(sql,args=[])=>{queries.push({sql,args});if(sql.includes('FROM store_promotion'))return [[{id:3,title:'Expired',enabled:1,ends_at:'2000-01-01 00:00:00',discount_type:'percent',discount_value:10,product_ids:[9],category_ids:[],audience:'everyone'},{id:4,title:'Future',enabled:1,starts_at:'2999-01-01 00:00:00',discount_type:'percent',discount_value:10,product_ids:[10],category_ids:[],audience:'everyone'}]];if(sql.startsWith('SELECT COUNT'))return [[{n:0}]];return [[]];});
 const result=await listProducts({sale:'1'});assert.equal(result.total,0);const sql=queries.find(q=>q.sql.includes('LIMIT 12')).sql;assert.match(sql,/p.price_cents effective_price/);assert.match(sql,/1=0/);assert.doesNotMatch(sql,/CASE WHEN/);
});
