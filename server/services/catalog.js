import {rows,json} from '../database/connection.js';
import {HttpError} from '../validators.js';
import {getPromotion,discountedProduct,activePromotion} from './promotions.js';
export const product=p=>{const compatibility=json(p.compatibility);if(p.option_field==='controlModule')compatibility.layouts=compatibility.layouts.filter(l=>l!=='60');return {...p,images:json(p.images).map(src=>src.replace(/(keyboard_60\.webp)(?:\?.*)?$/, '$1?v=3')),compatibility};};
export async function listProducts(q={}){
 const where=['is_active=1'],args=[];
 const promo=await getPromotion();
 const priceArgs=[],eligible=[];
 if(activePromotion(promo)){
  if(promo.product_ids.length){eligible.push(`p.id IN (${promo.product_ids.map(()=>'?').join(',')})`);priceArgs.push(...promo.product_ids);}
  if(promo.category_ids.length){eligible.push(`p.category_id IN (${promo.category_ids.map(()=>'?').join(',')})`);priceArgs.push(...promo.category_ids);}
 }
 const salePrice=eligible.length?`CASE WHEN (${eligible.join(' OR ')}) THEN p.price_cents-LEAST(p.price_cents,${promo.discount_type==='percent'?'FLOOR(p.price_cents*?/100)':'?'}) ELSE p.price_cents END`:'p.price_cents';
 if(eligible.length)priceArgs.push(promo.discount_value);
 const source=`(SELECT p.*,${salePrice} effective_price FROM products p) priced`;
 if(q.sale==='1'){
  if(!activePromotion(promo))where.push('1=0');
  else {const eligible=[];if(promo.product_ids.length){eligible.push(`id IN (${promo.product_ids.map(()=>'?').join(',')})`);args.push(...promo.product_ids);}if(promo.category_ids.length){eligible.push(`category_id IN (${promo.category_ids.map(()=>'?').join(',')})`);args.push(...promo.category_ids);}where.push(eligible.length?'('+eligible.join(' OR ')+')':'1=0');}
 }
 if(q.parts==='1')where.push("category_id<>'prebuilt'");
 for(const [key,column] of Object.entries({category:'category_id',layout:'layout',switch:'switch_type',connection:'connection_type'}))if(q[key]){where.push(`${column}=?`);args.push(String(q[key]));}
 if(q.q){where.push('(name LIKE ? OR short_description LIKE ?)');args.push('%'+String(q.q).slice(0,80)+'%','%'+String(q.q).slice(0,80)+'%');}
 if(q.available==='1')where.push('stock_quantity>0');if(q.featured==='1')where.push('is_featured=1');
 for(const [key,op] of [['min','>='],['max','<=']])if(q[key]!==undefined&&q[key]!==''&&Number.isFinite(Number(q[key]))){where.push(`effective_price${op}?`);args.push(Math.max(0,Math.round(Number(q[key])*100)));}
 const sort={'price-asc':'effective_price ASC,id ASC','price-desc':'effective_price DESC,id ASC',name:'name ASC',newest:'created_at DESC'}[q.sort]||'is_featured DESC,id ASC';
 const page=Math.max(1,Math.min(1000,parseInt(q.page)||1)),limit=12;
 const total=(await rows(`SELECT COUNT(*) n FROM ${source} WHERE `+where.join(' AND '),[...priceArgs,...args]))[0].n;
 const products=(await rows(`SELECT * FROM ${source} WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ${limit} OFFSET ${(page-1)*limit}`,[...priceArgs,...args])).map(product);
 return {products:products.map(p=>discountedProduct(p,promo)),total,page,pages:Math.ceil(total/limit)};
}
export async function getProduct(slug){const p=await rows('SELECT * FROM products WHERE slug=? AND is_active=1',[slug]);if(!p[0])throw new HttpError(404,'Product not found.');return discountedProduct(product(p[0]),await getPromotion());}
