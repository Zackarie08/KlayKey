import {rows,json} from '../database/connection.js';
import {HttpError} from '../validators.js';
import {getOffers,bestProductPrice,activePromotion,availability} from './promotions.js';
export const product=p=>{const compatibility=json(p.compatibility);if(p.option_field==='controlModule')compatibility.layouts=compatibility.layouts.filter(l=>l!=='60');return {...p,images:json(p.images).map(src=>src.replace(/(keyboard_60\.webp)(?:\?.*)?$/, '$1?v=3')),compatibility};};
export async function listProducts(q={},userId=null){
 const where=['is_active=1'],args=[];
 const context=await getOffers(userId),now=Date.now(),offers=context.offers.filter(p=>activePromotion(p,now));
 const priceArgs=[];
 const eligibility=(p,args)=>{const conditions=[];if(p.product_ids.length){conditions.push(`p.id IN (${p.product_ids.map(()=>'?').join(',')})`);args.push(...p.product_ids);}if(p.category_ids.length){conditions.push(`p.category_id IN (${p.category_ids.map(()=>'?').join(',')})`);args.push(...p.category_ids);}return conditions.length?'('+conditions.join(' OR ')+')':'0';};
 const discounts=offers.map(p=>{const rule=eligibility(p,priceArgs);priceArgs.push(p.discount_value);return `CASE WHEN ${rule} THEN LEAST(p.price_cents,${p.discount_type==='percent'?'FLOOR(p.price_cents*?/100)':'?'}) ELSE 0 END`;});
 const salePrice=discounts.length?'p.price_cents-GREATEST(0,'+discounts.join(',')+')':'p.price_cents';
 const source=`(SELECT p.*,${salePrice} effective_price FROM products p) priced`;
 if(q.sale==='1'||q.sale==='christmas'){
  const chosen=q.sale==='christmas'?offers.filter(p=>p.id===2):offers;
  where.push(chosen.length?'('+chosen.map(p=>eligibility(p,args).replaceAll('p.','')).join(' OR ')+')':'1=0');
 }
 if(q.parts==='1')where.push("category_id<>'prebuilt'");
 for(const [key,column] of Object.entries({category:'category_id',layout:'layout',switch:'switch_type',connection:'connection_type'}))if(q[key]){where.push(`${column}=?`);args.push(String(q[key]));}
 if(q.q){where.push('(name LIKE ? OR short_description LIKE ?)');args.push('%'+String(q.q).slice(0,80)+'%','%'+String(q.q).slice(0,80)+'%');}
 if(q.available==='1'){where.push('stock_quantity>0');if(!activePromotion(context.campaign,now)){where.push('slug<>?');args.push('noel-75-limited-edition');if(context.campaign?.featured_product_id){where.push('id<>?');args.push(context.campaign.featured_product_id);}}}if(q.featured==='1')where.push('is_featured=1');
 for(const [key,op] of [['min','>='],['max','<=']])if(q[key]!==undefined&&q[key]!==''&&Number.isFinite(Number(q[key]))){where.push(`effective_price${op}?`);args.push(Math.max(0,Math.round(Number(q[key])*100)));}
 const sort={'price-asc':'effective_price ASC,id ASC','price-desc':'effective_price DESC,id ASC',name:'name ASC',newest:'created_at DESC'}[q.sort]||'is_featured DESC,id ASC';
 const page=Math.max(1,Math.min(1000,parseInt(q.page)||1)),limit=12;
 const total=(await rows(`SELECT COUNT(*) n FROM ${source} WHERE `+where.join(' AND '),[...priceArgs,...args]))[0].n;
 const products=(await rows(`SELECT * FROM ${source} WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ${limit} OFFSET ${(page-1)*limit}`,[...priceArgs,...args])).map(product);
 return {products:products.map(p=>({...bestProductPrice(p,context.offers,now),...availability(p,context.campaign,now)})),total,page,pages:Math.ceil(total/limit)};
}
export async function getProduct(slug,userId=null){const p=await rows('SELECT * FROM products WHERE slug=? AND is_active=1',[slug]);if(!p[0])throw new HttpError(404,'Product not found.');const c=await getOffers(userId);return {...bestProductPrice(product(p[0]),c.offers),...availability(p[0],c.campaign)};}
