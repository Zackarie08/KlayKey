import {canonicalSpec,switchFilterValues} from './product-options.js';
import {rows,json} from '../database/connection.js';
import {HttpError} from '../validators.js';
import {getOffers,bestProductPrice,activePromotion,availability,HOLIDAY_EDITIONS} from './promotions.js';
export const product=p=>{const compatibility=json(p.compatibility);if(p.option_field==='controlModule')compatibility.layouts=compatibility.layouts.filter(l=>l!=='60');return {...p,layout:canonicalSpec('layout',p.layout)||p.layout,switch_type:canonicalSpec('switch_type',p.option_field==='switch'?p.option_value:p.switch_type)||p.switch_type,connection_type:canonicalSpec('connection_type',p.connection_type)||p.connection_type,images:json(p.images).map(src=>src.replace('/assets/images/noel-75.svg','/assets/images/noel-75.webp').replace(/(keyboard_60\.webp)(?:\?.*)?$/, '$1?v=3')),compatibility};};
export async function listProducts(q={},userId=null){
 const where=['is_active=1'],args=[];
 const context=await getOffers(userId),now=Date.now(),offers=context.offers.filter(p=>activePromotion(p,now));
 const priceArgs=[];
 const eligibility=(p,args)=>{const conditions=[];if(p.product_ids.length){conditions.push(`p.id IN (${p.product_ids.map(()=>'?').join(',')})`);args.push(...p.product_ids);}if(p.category_ids.length){conditions.push(`p.category_id IN (${p.category_ids.map(()=>'?').join(',')})`);args.push(...p.category_ids);}return conditions.length?'('+conditions.join(' OR ')+')':'0';};
 const discounts=offers.map(p=>{const rule=eligibility(p,priceArgs);priceArgs.push(p.discount_value);return `CASE WHEN ${rule} THEN LEAST(p.price_cents,${p.discount_type==='percent'?'FLOOR(p.price_cents*?/100)':'?'}) ELSE 0 END`;});
 const salePrice=discounts.length?'p.price_cents-GREATEST(0,'+discounts.join(',')+')':'p.price_cents';
 const source=`(SELECT p.*,${salePrice} effective_price FROM products p) priced`;
 if(q.sale==='1'||q.sale==='christmas'||/^promo-\d+$/.test(q.sale||'')){
  const chosen=q.sale==='christmas'?offers.filter(p=>p.id===2):q.sale?.startsWith('promo-')?offers.filter(p=>p.id===Number(q.sale.slice(6))):offers;
  where.push(chosen.length?'('+chosen.map(p=>eligibility(p,args).replaceAll('p.','')).join(' OR ')+')':'1=0');
 }
 if(q.sale==='1')where.push('effective_price<price_cents');
 if(q.sale==='0')where.push('effective_price=price_cents');
 if(q.parts==='1')where.push("category_id<>'prebuilt'");
 for(const [key,column] of Object.entries({category:'category_id',layout:'layout',connection:'connection_type'}))if(q[key]){where.push(`${column}=?`);args.push(String(q[key]));}
 if(q.switch){const values=switchFilterValues(q.switch);if(values.length){const slots=values.map(()=>'?').join(',');where.push("(switch_type IN ("+slots+") OR (option_field='switch' AND option_value IN ("+slots+")))");args.push(...values,...values);}else where.push('1=0');}
 if(q.rgb==='1')where.push('rgb_supported=1');if(q.rgb==='0')where.push('rgb_supported=0');
 if(q.q){where.push('(name LIKE ? OR short_description LIKE ?)');args.push('%'+String(q.q).slice(0,100)+'%','%'+String(q.q).slice(0,80)+'%');}
 if(q.available==='1'){where.push('stock_quantity>0');if(!activePromotion(context.campaign,now)){where.push('slug NOT IN ('+HOLIDAY_EDITIONS.map(()=>'?').join(',')+') AND sku NOT IN ('+HOLIDAY_EDITIONS.map(()=>'?').join(',')+')');args.push(...HOLIDAY_EDITIONS.map(e=>e.slug),...HOLIDAY_EDITIONS.map(e=>e.sku));if(context.campaign?.featured_product_id){where.push('id<>?');args.push(context.campaign.featured_product_id);}}}if(q.featured==='1')where.push('is_featured=1');
 for(const [key,op] of [['min','>='],['max','<=']])if(q[key]!==undefined&&q[key]!==''&&Number.isFinite(Number(q[key]))){where.push(`effective_price${op}?`);args.push(Math.max(0,Math.round(Number(q[key])*100)));}
 const sort={'price-asc':'effective_price ASC,id ASC','price-desc':'effective_price DESC,id ASC',name:'name ASC,id ASC',newest:'created_at DESC,id ASC'}[q.sort]||'is_featured DESC,id ASC';
 const page=Math.max(1,Math.min(1000,parseInt(q.page)||1)),limit=q.featured==='1'?100:12;
 const total=(await rows(`SELECT COUNT(*) n FROM ${source} WHERE `+where.join(' AND '),[...priceArgs,...args]))[0].n;
 const products=(await rows(`SELECT * FROM ${source} WHERE ${where.join(' AND ')} ORDER BY (effective_price<price_cents) DESC,${sort} LIMIT ${limit} OFFSET ${(page-1)*limit}`,[...priceArgs,...args])).map(product);
 return {products:products.map(p=>({...bestProductPrice(p,context.offers,now),...availability(p,context.campaign,now)})),total,page,pages:Math.ceil(total/limit)};
}
export async function getProduct(slug,userId=null){const p=await rows('SELECT * FROM products WHERE slug=? AND is_active=1',[slug]);if(!p[0])throw new HttpError(404,'Product not found.');const c=await getOffers(userId);return {...bestProductPrice(product(p[0]),c.offers),...availability(p[0],c.campaign)};}
