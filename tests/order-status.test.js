import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTransition} from '../server/services/admin-rules.js';
import {orderStatusLabel,orderProgress} from '../public/js/order-status.js';

test('Delivery and pickup can advance through their complete fulfillment paths',()=>{
 for(const delivery of ['standard','express','pickup']){
  const steps=['pending','confirmed','processing','ready-to-ship',...(delivery==='pickup'?[]:['shipped']),'completed'];
  for(let i=1;i<steps.length;i++)assert.doesNotThrow(()=>assertTransition(steps[i-1],steps[i],delivery));
  assert.throws(()=>assertTransition('confirmed','completed',delivery));
  assert.throws(()=>assertTransition('completed','cancelled',delivery));
 }
});
test('Customer labels distinguish courier delivery from store collection',()=>{
 assert.equal(orderStatusLabel('shipped','standard'),'On delivery');
 assert.equal(orderStatusLabel('completed','express'),'Delivered');
 assert.equal(orderStatusLabel('completed','pickup'),'Collected');
 assert.equal(orderStatusLabel('ready-to-ship','pickup'),'Ready for pickup');
 const pickup=orderProgress({status:'completed',delivery_method:'pickup'});
 assert.doesNotMatch(pickup,/On delivery|Ready to ship/);
 assert.match(pickup,/aria-current="step"[^>]*>.*Collected/);
 const cancelled=orderProgress({status:'cancelled',delivery_method:'standard'});
 assert.doesNotMatch(cancelled,/aria-current="step"/);
 assert.match(cancelled,/This order was cancelled/);
});
