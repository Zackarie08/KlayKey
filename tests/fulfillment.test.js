import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRider,assertDeliveryAction,assertAssignment} from '../server/services/delivery-rules.js';
import {assertRoleChange} from '../server/services/admin-rules.js';
import {checkoutAddress,saveAddress} from '../server/services/addresses.js';
import {orderEvent} from '../server/services/order-events.js';
import {serveProof,deliveryOnly} from '../server/routes/delivery.js';
import {adminOnly} from '../server/routes/admin.js';
import {deliveryAction} from '../server/services/delivery.js';
import {pool} from '../server/database/connection.js';
const rider={id:7,role:'delivery'},order={id:1,user_id:4,order_number:'KK-TEST',status:'ready-to-ship',delivery_method:'standard',payment_method:'cod'},assignment={rider_id:7,status:'assigned',revision:2};
test('Only assigned delivery account may act; delivery role does not grant admin access',()=>{
 for(const u of [{id:8,role:'delivery'},{id:7,role:'customer'},{id:7,role:'admin'},null])assert.throws(()=>assertRider(u,assignment),{status:403});
 assert.doesNotThrow(()=>assertRider(rider,assignment));assert.throws(()=>assertRider(rider,null));let error;adminOnly({user:rider},{},e=>error=e);assert.equal(error.status,403);deliveryOnly({user:{role:'customer'}},{},e=>error=e);assert.equal(error.status,403);
 assert.throws(()=>assertRoleChange({id:2,role:'admin'},{id:7},'delivery'));assert.doesNotThrow(()=>assertRoleChange({id:2,role:'super_admin'},{id:7},'delivery'));
});
test('Rider start is conditional on assignment, revision, status and delivery method',()=>{
 assert.doesNotThrow(()=>assertDeliveryAction(rider,order,assignment,'start',2));
 for(const [o,a,r] of [[order,assignment,1],[{...order,status:'cancelled'},assignment,2],[{...order,delivery_method:'pickup'},assignment,2],[order,{...assignment,status:'failed'},2],[order,{...assignment,status:'out'},2]])assert.throws(()=>assertDeliveryAction(rider,o,a,'start',r));
});
test('Completion cannot skip start or repeat a completed attempt',()=>{
 assert.throws(()=>assertDeliveryAction(rider,order,assignment,'complete',2));
 assert.doesNotThrow(()=>assertDeliveryAction(rider,{...order,status:'shipped'},{...assignment,status:'out'},'complete',2));
 assert.throws(()=>assertDeliveryAction(rider,{...order,status:'completed'},{...assignment,status:'delivered'},'complete',2));
});
test('Admin can retry failed attempts but cannot reassign a delivery in progress',()=>{
 assert.doesNotThrow(()=>assertAssignment(order,null,0));
 assert.doesNotThrow(()=>assertAssignment({...order,status:'shipped'},{...assignment,status:'failed'},2));
 assert.throws(()=>assertAssignment(order,{...assignment,status:'out'},2));
 assert.throws(()=>assertAssignment(order,assignment,1));
 assert.throws(()=>assertAssignment({...order,status:'completed'},null,0));
 assert.throws(()=>assertAssignment({...order,delivery_method:'pickup'},null,0));
});
const address={name:'Test Recipient',phone:'09123456789',email:'customer@example.test',street:'123 Test Street',barangay:'Test Barangay',city:'Manila',province:'Metro Manila',postal_code:'1000'};
function addressDb(phone='09123456789',list=[{id:9,user_id:4,label:'Home',address,is_default:1,revision:1}]){return {async execute(sql,args){if(sql.startsWith('SELECT phone'))return [[{phone}]];assert.ok(sql.includes('saved_addresses'));assert.equal(args[0],4);return [list];}};}
test('Checkout requires valid profile phone and an owned, complete saved address',async()=>{
 const saved=await checkoutAddress(4,{addressId:9,address:{...address,name:'Injected recipient',street:'Injected street',notes:'Ring the bell'}},addressDb());assert.equal(saved.name,address.name);assert.equal(saved.street,address.street);assert.equal(saved.notes,'Ring the bell');
 await assert.rejects(checkoutAddress(4,{addressId:99},addressDb()),/Choose one/);
 await assert.rejects(checkoutAddress(4,{addressId:9},addressDb('')),/phone/);
 await assert.rejects(checkoutAddress(4,{addressId:9},addressDb('09123456789',[])),/Save a delivery address/);
 await assert.rejects(checkoutAddress(4,{addressId:9},addressDb('09123456789',[{id:9,address:{...address,postal_code:'x'}}])));
});
test('Address limit is checked under user lock and does not write a fourth address',async t=>{
 const queries=[];let rollback=false;const db={async beginTransaction(){},async rollback(){rollback=true;},async commit(){assert.fail('Must not commit');},release(){},async execute(sql){queries.push(sql);if(sql.startsWith('SELECT id FROM users'))return [[{id:4}]];if(sql.startsWith('SELECT * FROM saved_addresses'))return [[1,2,3].map(id=>({id,address,revision:1}))];assert.fail('Unexpected write: '+sql);}};
 t.mock.method(pool,'getConnection',async()=>db);await assert.rejects(saveAddress(4,{label:'Fourth',address}),/three addresses/);assert.match(queries[0],/FOR UPDATE/);assert.ok(rollback);
});
test('Editing another user address or a stale address revision rolls back',async t=>{
 let rollback=0;const db={async beginTransaction(){},async rollback(){rollback++;},async commit(){assert.fail('Must not commit');},release(){},async execute(sql){if(sql.startsWith('SELECT id FROM users'))return [[{id:4}]];if(sql.startsWith('SELECT * FROM saved_addresses'))return [[{id:9,address,revision:2}]];assert.fail('Unexpected write');}};
 t.mock.method(pool,'getConnection',async()=>db);await assert.rejects(saveAddress(4,{label:'Home',address,revision:2},88),{status:404});await assert.rejects(saveAddress(4,{label:'Home',address,revision:1},9),/changed/);assert.equal(rollback,2);
});
test('Status notification belongs only to order owner and contains public copy',async()=>{
 const writes=[];await orderEvent({async execute(sql,values){writes.push({sql,values});return [{insertId:1}];}},order,{actorId:7,status:'shipped',message:'Private admin note',publicMessage:'Your order is on delivery.'});
 assert.equal(writes.length,2);assert.equal(writes[1].values[0],4);assert.equal(writes[1].values[1],1);assert.equal(writes[0].values.at(-1),'Your order is on delivery.');assert.ok(!JSON.stringify(writes).includes('Private admin note'));
});
test('Proof route rejects other customers and unassigned riders',async t=>{
 t.mock.method(pool,'execute',async()=>[[{user_id:4,rider_id:7,proof_file:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp'}]]);
 for(const user of [{id:99,role:'customer'},{id:99,role:'delivery'},{id:7,role:'customer'}])await assert.rejects(serveProof({user,params:{id:1}},{}),{status:404});
 for(const user of [{id:4,role:'customer'},rider,{id:99,role:'admin'}]){let file;const res={set(k,v){assert.equal(v,'private, no-store');return this;},type(){return this;},sendFile(v,options){file=options.root;assert.equal(options.dotfiles,'allow');assert.match(v,/^[a-f0-9-]+\.webp$/);}};await serveProof({user,params:{id:1}},res);assert.match(file,/.delivery-proofs/);}
});
test('Completion requires proof and receipt confirmation before committing',async t=>{
 const writes=[];let committed=0,rolled=0;const db={async beginTransaction(){},async rollback(){rolled++;},async commit(){committed++;},release(){},async execute(sql,args){if(sql.startsWith('SELECT * FROM orders'))return [[{...order,status:'shipped'}]];if(sql.startsWith('SELECT * FROM delivery_assignments'))return [[{...assignment,status:'out'}]];if(sql.startsWith('SELECT id,role'))return [[{...rider,is_active:1}]];writes.push({sql,args});return [{affectedRows:1}];}};
 t.mock.method(pool,'getConnection',async()=>db);await assert.rejects(deliveryAction(rider,1,{revision:2,recipient:'Recipient',received:true},'complete'),/proof/);await assert.rejects(deliveryAction(rider,1,{revision:2,recipient:'Recipient'},'complete','proof.webp'),/Confirm parcel/);assert.equal(writes.length,0);assert.equal(rolled,2);
 await deliveryAction(rider,1,{revision:2,recipient:'Recipient',received:true},'complete','proof.webp');assert.equal(committed,1);assert.ok(writes.some(w=>w.sql.includes("status='collected-cod'")));assert.ok(writes.some(w=>w.sql.includes('UPDATE orders')&&w.args[0]==='completed'));assert.ok(writes.some(w=>w.sql.includes('INSERT INTO order_notifications')&&w.args[0]===4));
});
