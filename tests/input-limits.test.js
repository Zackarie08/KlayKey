import test from 'node:test';
import assert from 'node:assert/strict';
import {inputLimit} from '../public/js/input-limits.js';
import {shipping,text} from '../server/validators.js';
import {promotionInput} from '../server/services/admin-rules.js';

test('Text limits distinguish short copy, descriptions, longer messages and fixed formats',()=>{
 for(const name of ['name','first_name','last_name','recipient_name','title','subject','build-name','sku'])assert.equal(inputLimit(name),50);
 for(const name of ['description','short_description','notes'])assert.equal(inputLimit(name),500);
 assert.equal(inputLimit('email'),254);assert.equal(inputLimit('street'),180);
 assert.equal(inputLimit('message',{multiline:true,existing:3000}),3000);
 assert.equal(inputLimit('password',{type:'password'}),72);
 assert.equal(inputLimit('postal_code'),4);assert.equal(inputLimit('cap-hex-alpha'),7);
 assert.equal(inputLimit('new-field'),50);
});
test('Name and title boundaries reject oversized values without truncating',()=>{
 assert.equal(text('a'.repeat(50),'name',1,50).length,50);
 assert.throws(()=>text('a'.repeat(51),'name',1,50));
 const p={title:'a'.repeat(50),message:'b'.repeat(500),discount_type:'percent',discount_value:10,enabled:false,product_ids:[],category_ids:[]};
 assert.equal(promotionInput(p).title.length,50);
 assert.throws(()=>promotionInput({...p,title:'a'.repeat(51)}));
 assert.throws(()=>promotionInput({...p,message:'a'.repeat(501)}));
});
test('Shipping supports the new limits and rejects overlong notes instead of silently slicing',()=>{
 const address={name:'a'.repeat(50),phone:'1'.repeat(50),street:'a'.repeat(180),barangay:'a'.repeat(100),city:'Manila',province:'Metro Manila',postal_code:'1000',email:'buyer@example.com',notes:'a'.repeat(500)};
 assert.equal(shipping(address).notes.length,500);
 for(const [field,length] of [['name',51],['phone',51],['street',181],['barangay',101],['notes',501]])assert.throws(()=>shipping({...address,[field]:'a'.repeat(length)}));
 assert.throws(()=>shipping({...address,postal_code:'10000'}));
});
