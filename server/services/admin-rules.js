import {HttpError,requireValue,text} from '../validators.js';
export const roles=['customer','admin','super_admin'];
export const transitions={pending:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:['ready-to-ship','cancelled'],'ready-to-ship':['shipped','completed','cancelled'],shipped:['completed'],completed:[],cancelled:[]};
export function integer(value,min,max,label){const n=Number(value);requireValue((typeof value==='number'||typeof value==='string'&&/^-?\d+$/.test(value))&&Number.isSafeInteger(n)&&n>=min&&n<=max,`${label} must be a whole number between ${min} and ${max}.`);return n;}
export function assertRoleChange(actor,target,role){requireValue(roles.includes(role),'Invalid role.');if(actor.role!=='super_admin')throw new HttpError(403,'Only Super Admins can manage access.');requireValue(Number(actor.id)!==Number(target.id),'You cannot change your own access.');}
export function assertTransition(from,to,delivery){requireValue((transitions[from]||[]).includes(to),'This order status transition is not allowed.');requireValue(!(to==='completed'&&from==='ready-to-ship'&&delivery!=='pickup'),'Delivery orders must be shipped before completion.');requireValue(!(to==='shipped'&&delivery==='pickup'),'Pickup orders should be completed after collection.');}
export function promotionInput(b,{allowBuilds=false}={}){
 const discount_type=b.discount_type;requireValue(['percent','fixed'].includes(discount_type),'Choose a discount type.');
 const list=(v,numeric)=>{requireValue(Array.isArray(v)&&v.length<=200,'Choose at most 200 eligible entries.');return [...new Set(v.map(x=>numeric?integer(x,1,Number.MAX_SAFE_INTEGER,'Product ID'):text(x,'Category',1,30)))];};
 const date=v=>{if(!v)return null;requireValue(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?Z$/.test(v)&&Number.isFinite(Date.parse(v)),'Use a valid UTC date.');return new Date(v).toISOString().slice(0,19).replace('T',' ');};
 const starts_at=date(b.starts_at),ends_at=date(b.ends_at);requireValue(!ends_at||!starts_at||ends_at>starts_at,'End must be after start.');
 const product_ids=list(b.product_ids,true),category_ids=list(b.category_ids,false);requireValue(!b.enabled||product_ids.length+category_ids.length>0||(allowBuilds&&b.include_builds===true),'Choose eligible products or categories before enabling.');
 return {title:text(b.title,'Title',1,100),message:text(b.message,'Message',1,500),discount_type,discount_value:integer(b.discount_value,1,discount_type==='percent'?90:10000000,'Discount'),enabled:b.enabled===true,starts_at,ends_at,product_ids,category_ids};
}
