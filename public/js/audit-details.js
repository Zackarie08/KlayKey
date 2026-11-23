import {productCopy} from './store-copy.js';
import {esc,money} from './core.js';
import {orderStatusLabel} from './order-status.js';

const actions={'delivery.assign':'Delivery assigned','product.create':'Product added','product.update':'Product updated','stock.adjust':'Stock adjusted','category.save':'Category saved','order.status':'Order status changed','order.note':'Order note added','account.access':'Account access changed','promotion.update':'Sale settings updated','promotion.create':'Promotion created'};
const fields={name:'Name',sku:'SKU',slug:'Store URL name',category_id:'Category',description:'Description',short_description:'Short description',price_cents:'Price',low_stock_threshold:'Low-stock alert at',layout:'Keyboard size',switch_type:'Switch type',connection_type:'Connection',material:'Material',rgb_supported:'RGB lighting',is_featured:'Featured product',is_active:'Active',images:'Product photos',compatibility:'Compatible components',title:'Sale title',message:'Sale message',discount_type:'Discount type',discount_value:'Discount',enabled:'Sale enabled',starts_at:'Starts at (UTC)',ends_at:'Ends at (UTC)',product_ids:'Eligible product IDs',category_ids:'Eligible categories',display_type:'Display type',audience:'Eligible customers',theme:'Design',priority:'Display priority',featured_product_id:'Featured product',preview_at:'Preview starts (UTC)',include_builds:'Custom builds eligible',role:'Access level'};
const bools=new Set(['rgb_supported','is_featured','is_active','enabled','include_builds']);
function parse(value){if(typeof value!=='string')return value;try{return JSON.parse(value);}catch{return value;}}
function value(key,input,context={}){
 if(input===null||input===undefined||input==='')return 'Not set';
 if(bools.has(key))return input===true||input===1||input==='1'?'Yes':'No';
 if(key==='description')return productCopy(input);
 if(key==='price_cents')return money(input);
 if(key==='discount_value')return context.discount_type==='percent'?input+'%':context.discount_type==='fixed'?money(input):String(input);
 if(key==='role')return ({customer:'Customer',delivery:'Delivery',admin:'Admin',super_admin:'Super Admin'})[input]||String(input);
 if(key==='discount_type')return input==='percent'?'Percentage':input==='fixed'?'Fixed amount':String(input);
 if(key==='status')return orderStatusLabel(input);
 const decoded=parse(input);
 if(key==='images')return Array.isArray(decoded)?`${decoded.length} photo${decoded.length===1?'':'s'}`:'Photo information unavailable';
 if(key==='compatibility'&&decoded&&typeof decoded==='object'&&!Array.isArray(decoded)){
  const names={layouts:'Keyboard sizes',connections:'Connections',mount:'Switch mount',family:'Case family',keySizes:'Key sizes'};
  return Object.entries(decoded).map(([k,v])=>`${names[k]||k}: ${Array.isArray(v)?v.join(', '):typeof v==='object'?'Recorded':String(v)}`).join(' · ');
 }
 if(Array.isArray(decoded))return decoded.length?decoded.map(v=>typeof v==='object'?'Recorded item':String(v)).join(', '):'None selected';
 if(typeof decoded==='object')return 'Details recorded';
 return String(input);
}
export const auditAction=action=>actions[action]||'Administrative change';
export function auditDetails(entry){
 const d=parse(entry.details);
 if(!d||typeof d!=='object'||Array.isArray(d))return '<p class="muted">No readable details were recorded for this activity.</p>';
 const fact=(label,text)=>`<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`;
 let body='';
 if(entry.action==='stock.adjust')body=fact('Stock change',`${Number(d.delta)>0?'+':''}${d.delta} units`)+fact('Stock after change',`${d.balance} units`);
 else if(entry.action==='order.status')body=fact('Previous status',value('status',d.from))+fact('New status',value('status',d.to));
 else if(entry.action==='delivery.assign')body=fact('Assigned rider',d.rider_name||'Account #'+d.rider_id)+fact('Action',d.retry?'Delivery retry arranged':'Rider assigned');
 else if(entry.action==='order.note')body=fact('Internal note',d.note||'No note recorded');
 else {
  const before=d.before&&typeof d.before==='object'?d.before:{};
  const after=d.after&&typeof d.after==='object'?d.after:entry.action==='category.save'?{name:d.name}:entry.action==='account.access'?{role:d.role,is_active:d.is_active}:{};
  const changes=Object.keys(fields).filter(k=>Object.hasOwn(after,k)).filter(k=>!Object.hasOwn(before,k)||JSON.stringify(parse(before[k]))!==JSON.stringify(parse(after[k])));
  body=changes.length?changes.map(k=>{
   const previous=Object.hasOwn(before,k)?value(k,before[k],before):entry.action==='product.create'?'New product':'Not recorded';
   return `<div class="audit-change"><dt>${esc(fields[k])}</dt><dd><span class="audit-value"><small>Before</small>${esc(previous)}</span><span class="audit-value"><small>After</small>${esc(value(k,after[k],after))}</span></dd></div>`;
  }).join(''):fact('Summary','No field changes were recorded.');
 }
 if(d.reason)body+=fact('Reason',d.reason);
 return `<dl class="audit-details">${body}</dl><p class="muted audit-footnote">Historical values appear only when they were recorded at the time.</p>`;
}
