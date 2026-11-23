import fs from 'node:fs';
export const HOLIDAY_EDITIONS=JSON.parse(fs.readFileSync(new URL('../../public/assets/christmas-editions.json',import.meta.url),'utf8'));
export const holidayEdition=p=>HOLIDAY_EDITIONS.find(e=>e.slug===p.slug||e.sku===p.sku);
import {rows,json,pool} from '../database/connection.js';
export const HOLIDAY_SLUG='noel-75-limited-edition';
export const utcTime=v=>v instanceof Date?v.getTime():Date.parse(String(v).replace(' ','T').replace(/Z$/,'')+'Z');
export function activePromotion(p,now=Date.now()){return !!p&&!!p.enabled&&(!p.starts_at||utcTime(p.starts_at)<=now)&&(!p.ends_at||utcTime(p.ends_at)>now);}
export function visibleCampaign(p,now=Date.now()){return !!p&&!!p.enabled&&(!(p.preview_at||p.starts_at)||utcTime(p.preview_at||p.starts_at)<=now)&&!!p.ends_at&&utcTime(p.ends_at)>now;}
export function eligibleProduct(p,promo){return !!promo&&(promo.product_ids?.map(Number).includes(Number(p.id))||promo.category_ids?.includes(p.category_id));}
export function discountedProduct(p,promo,now=Date.now()){
 if(!activePromotion(promo,now)||!eligibleProduct(p,promo))return p;
 const discount=Math.min(p.price_cents,promo.discount_type==='percent'?Math.floor(p.price_cents*promo.discount_value/100):promo.discount_value);
 if(!discount)return p;return {...p,original_price_cents:p.price_cents,price_cents:p.price_cents-discount,discount_cents:discount,promotion:{id:promo.id,title:promo.title,revision:promo.revision}};
}
export function bestProductPrice(p,offers,now=Date.now()){return offers.filter(Boolean).reduce((best,offer)=>{const candidate=discountedProduct(p,offer,now);return candidate.price_cents<best.price_cents?candidate:best;},p);}
export function discountedBuild(build,campaign,assemblyCents,now=Date.now()){
 if(!activePromotion(campaign,now)||!campaign.include_builds)return build;
 const eligible=Math.max(0,build.price_cents-assemblyCents),discount=Math.min(eligible,campaign.discount_type==='fixed'?campaign.discount_value:Math.floor(eligible*campaign.discount_value/100));
 if(!discount)return build;
 return {...build,original_price_cents:build.price_cents,price_cents:build.price_cents-discount,discount_cents:discount,promotion:{id:campaign.id,title:campaign.title,revision:campaign.revision},lines:[...build.lines,{name:campaign.title+' discount',quantity:1,amount:-discount}]};
}
export function availability(p,campaign,now=Date.now()){
 const edition=holidayEdition(p);const limited=!!edition||(campaign?.featured_product_id&&Number(p.id)===Number(campaign.featured_product_id));
 if(!limited)return {purchasable:p.stock_quantity>0,availability_message:p.stock_quantity>0?'In stock':'Out of stock'};
 if(!campaign||!campaign.enabled||!Number.isFinite(utcTime(campaign.starts_at))||!Number.isFinite(utcTime(campaign.ends_at)))return {purchasable:false,limited_edition:true,edition_key:edition?.key||'noel-75',availability_message:'This limited edition is currently unavailable.'};
 const range=new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'});
 const dates=range.format(new Date(utcTime(campaign.starts_at)))+' – '+range.format(new Date(utcTime(campaign.ends_at)-1));
 if(!activePromotion(campaign,now))return {purchasable:false,limited_edition:true,edition_key:edition?.key||'noel-75',availability_message:now<utcTime(campaign.starts_at)?'Available '+dates:'This limited-edition release has ended.'};
 return {purchasable:p.stock_quantity>0,limited_edition:true,edition_key:edition?.key||'noel-75',availability_message:p.stock_quantity>0?p.stock_quantity+' left · Limited edition':'Sold out · Limited edition'};
}
export function normalizePromotion(p){return {...p,id:Number(p.id),display_type:p.display_type||(Number(p.id)===2?'popup':'floating'),audience:p.audience||(Number(p.id)===1?'first_purchase':'everyone'),theme:p.theme||(Number(p.id)===2?'christmas':'standard'),priority:Number(p.priority)||0,product_ids:json(p.product_ids)||[],category_ids:json(p.category_ids)||[],preview_at:p.preview_at instanceof Date?p.preview_at.toISOString().slice(0,19).replace('T',' '):p.preview_at};}
export async function listPromotions(db=pool){const base="SELECT *,DATE_FORMAT(starts_at,'%Y-%m-%d %H:%i:%s') starts_at,DATE_FORMAT(ends_at,'%Y-%m-%d %H:%i:%s') ends_at";try{let result;try{result=await rows(base+",DATE_FORMAT(preview_at,'%Y-%m-%d %H:%i:%s') preview_at FROM store_promotion ORDER BY id",[],db);}catch(e){if(e.code!=='ER_BAD_FIELD_ERROR')throw e;result=await rows(base+' FROM store_promotion ORDER BY id',[],db);}return result.map(normalizePromotion);}catch(e){if(e.code==='ER_NO_SUCH_TABLE')return [];throw e;}}
export async function getPromotion(db=pool,id=1){return (await listPromotions(db)).find(p=>p.id===id)||null;}
export function bestBuildPrice(build,offers,assemblyCents,now=Date.now()){return offers.reduce((best,p)=>{const next=discountedBuild(build,p,assemblyCents,now);return next.price_cents<best.price_cents?next:best;},build);}
// Any successfully created order consumes first-purchase eligibility, even after cancellation.
export async function firstPurchaseEligible(userId,db=pool){return !!userId&&!(await rows('SELECT id FROM orders WHERE user_id=? LIMIT 1',[userId],db)).length;}
export async function getOffers(userId,db=pool){const [all,eligible]=await Promise.all([listPromotions(db),firstPurchaseEligible(userId,db)]);return {all,first:all.find(p=>p.id===1),campaign:all.find(p=>p.id===2),eligible,offers:all.filter(p=>p.audience!=='first_purchase'||eligible)};}
