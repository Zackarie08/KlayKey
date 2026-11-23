import {rows,json,pool} from '../database/connection.js';
export const HOLIDAY_SLUG='noel-75-limited-edition';
export const utcTime=v=>v instanceof Date?v.getTime():Date.parse(String(v).replace(' ','T').replace(/Z$/,'')+'Z');
export function activePromotion(p,now=Date.now()){return !!p&&!!p.enabled&&(!p.starts_at||utcTime(p.starts_at)<=now)&&(!p.ends_at||utcTime(p.ends_at)>now);}
export function visibleCampaign(p,now=Date.now()){return !!p&&!!p.enabled&&(!p.preview_at||utcTime(p.preview_at)<=now)&&!!p.ends_at&&utcTime(p.ends_at)>now;}
export function eligibleProduct(p,promo){return !!promo&&(promo.product_ids?.map(Number).includes(Number(p.id))||promo.category_ids?.includes(p.category_id));}
export function discountedProduct(p,promo,now=Date.now()){
 if(!activePromotion(promo,now)||!eligibleProduct(p,promo))return p;
 const discount=Math.min(p.price_cents,promo.discount_type==='percent'?Math.floor(p.price_cents*promo.discount_value/100):promo.discount_value);
 if(!discount)return p;return {...p,original_price_cents:p.price_cents,price_cents:p.price_cents-discount,discount_cents:discount,promotion:{id:promo.id,title:promo.title,revision:promo.revision}};
}
export function bestProductPrice(p,offers,now=Date.now()){return offers.filter(Boolean).reduce((best,offer)=>{const candidate=discountedProduct(p,offer,now);return candidate.price_cents<best.price_cents?candidate:best;},p);}
export function discountedBuild(build,campaign,assemblyCents,now=Date.now()){
 if(!activePromotion(campaign,now)||!campaign.include_builds)return build;
 const eligible=Math.max(0,build.price_cents-assemblyCents),discount=Math.min(eligible,Math.floor(eligible*campaign.discount_value/100));
 if(!discount)return build;
 return {...build,original_price_cents:build.price_cents,price_cents:build.price_cents-discount,discount_cents:discount,promotion:{id:campaign.id,title:campaign.title,revision:campaign.revision},lines:[...build.lines,{name:campaign.title+' discount',quantity:1,amount:-discount}]};
}
export function availability(p,campaign,now=Date.now()){
 const limited=p.slug===HOLIDAY_SLUG||(campaign?.featured_product_id&&Number(p.id)===Number(campaign.featured_product_id));
 if(!limited)return {purchasable:p.stock_quantity>0,availability_message:p.stock_quantity>0?'In stock':'Out of stock'};
 if(!campaign||!campaign.enabled||!Number.isFinite(utcTime(campaign.starts_at))||!Number.isFinite(utcTime(campaign.ends_at)))return {purchasable:false,limited_edition:true,availability_message:'This limited edition is currently unavailable.'};
 const range=new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'});
 const dates=range.format(new Date(utcTime(campaign.starts_at)))+' – '+range.format(new Date(utcTime(campaign.ends_at)-1));
 if(!activePromotion(campaign,now))return {purchasable:false,limited_edition:true,availability_message:now<utcTime(campaign.starts_at)?'Available '+dates:'This limited-edition release has ended.'};
 return {purchasable:p.stock_quantity>0,limited_edition:true,availability_message:p.stock_quantity>0?p.stock_quantity+' left · Limited edition':'Sold out · Limited edition'};
}
export async function getPromotion(db=pool,id=1){
 try{const p=(await rows("SELECT *,DATE_FORMAT(starts_at,'%Y-%m-%d %H:%i:%s') starts_at,DATE_FORMAT(ends_at,'%Y-%m-%d %H:%i:%s') ends_at FROM store_promotion WHERE id=?",[id],db))[0];
 if(!p||Number(p.id)!==id)return null;if(id===2&&p.kind!=='seasonal')return null;
 if(id===2)p.preview_at=(await rows("SELECT DATE_FORMAT(preview_at,'%Y-%m-%d %H:%i:%s') value FROM store_promotion WHERE id=2",[],db))[0]?.value;
 return {...p,...(id===1?{discount_type:'percent',discount_value:10}:{}),product_ids:json(p.product_ids)||[],category_ids:json(p.category_ids)||[]};
 }catch(e){if(e.code==='ER_NO_SUCH_TABLE')return null;throw e;}
}
// Any successfully created order consumes first-purchase eligibility, even after cancellation.
export async function firstPurchaseEligible(userId,db=pool){return !!userId&&!(await rows('SELECT id FROM orders WHERE user_id=? LIMIT 1',[userId],db)).length;}
export async function getOffers(userId,db=pool){const [first,campaign,eligible]=await Promise.all([getPromotion(db),getPromotion(db,2),firstPurchaseEligible(userId,db)]);return {first,campaign,eligible,offers:[campaign,eligible?first:null].filter(Boolean)};}
