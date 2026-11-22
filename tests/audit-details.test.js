import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDetails,auditAction} from '../public/js/audit-details.js';

test('Activity details format money and distinguish missing historical values',()=>{
 const html=auditDetails({action:'product.update',details:JSON.stringify({before:{price_cents:10000},after:{price_cents:12500,name:'New name',is_active:true}})});
 assert.match(html,/100\.00/);assert.match(html,/125\.00/);assert.match(html,/Not recorded/);assert.match(html,/Yes/);assert.doesNotMatch(html,/<pre>|price_cents|is_active/);
});
test('Activity details handle invalid old records and escape user-authored content',()=>{
 assert.match(auditDetails({details:'{broken'}),/No readable details/);
 const html=auditDetails({action:'order.note',details:{note:'<script>alert(1)</script>'}});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
test('Stock, order and permission details have readable meanings',()=>{
 assert.match(auditDetails({action:'stock.adjust',details:{delta:5,balance:20,reason:'Restocked'}}),/\+5 units/);
 assert.match(auditDetails({action:'order.status',details:{from:'shipped',to:'completed'}}),/On delivery/);
 assert.match(auditDetails({action:'account.access',details:{before:{role:'customer',is_active:1},role:'super_admin',is_active:true,reason:'Store owner'}}),/Super Admin/);
 assert.equal(auditAction('product.update'),'Product updated');
});
