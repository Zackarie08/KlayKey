import {rows,json,pool} from '../database/connection.js';
export function activePromotion(p,now=Date.now()) {return !!p&&!!p.enabled&&(!p.starts_at||Date.parse(String(p.starts_at).replace(' ','T')+'Z')<=now)&&(!p.ends_at||Date.parse(String(p.ends_at).replace(' ','T')+'Z')>now);}
export function discountedProduct(p,promo){
 if(!activePromotion(promo)||!(promo.product_ids.map(Number).includes(Number(p.id))||promo.category_ids.includes(p.category_id)))return p;
 const discount=Math.min(p.price_cents,promo.discount_type==='percent'?Math.floor(p.price_cents*promo.discount_value/100):promo.discount_value);
 if(!discount)return p;return {...p,original_price_cents:p.price_cents,price_cents:p.price_cents-discount,discount_cents:discount,promotion:{id:promo.id,title:promo.title,revision:promo.revision}};
}
export async function getPromotion(db=pool){try{const p=(await rows("SELECT *,DATE_FORMAT(starts_at,'%Y-%m-%d %H:%i:%s') starts_at,DATE_FORMAT(ends_at,'%Y-%m-%d %H:%i:%s') ends_at FROM store_promotion WHERE id=1",[],db))[0];return p?{...p,product_ids:json(p.product_ids),category_ids:json(p.category_ids)}:null;}catch(e){if(e.code==='ER_NO_SUCH_TABLE')return null;throw e;}}
