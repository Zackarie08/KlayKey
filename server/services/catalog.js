import {rows,json} from '../database/connection.js';
import {HttpError} from '../validators.js';
export const product=p=>({...p,images:json(p.images),compatibility:json(p.compatibility)});
export async function listProducts(q={}){
 const where=['is_active=1'],args=[];
 if(q.parts==='1')where.push("category_id<>'prebuilt'");
 for(const [key,column] of Object.entries({category:'category_id',layout:'layout',switch:'switch_type',connection:'connection_type'}))if(q[key]){where.push(`${column}=?`);args.push(String(q[key]));}
 if(q.q){where.push('(name LIKE ? OR short_description LIKE ?)');args.push('%'+String(q.q).slice(0,80)+'%','%'+String(q.q).slice(0,80)+'%');}
 if(q.available==='1')where.push('stock_quantity>0');if(q.featured==='1')where.push('is_featured=1');
 for(const [key,op] of [['min','>='],['max','<=']])if(q[key]!==undefined&&q[key]!==''&&Number.isFinite(Number(q[key]))){where.push(`price_cents${op}?`);args.push(Math.max(0,Math.round(Number(q[key])*100)));}
 const sort={'price-asc':'price_cents ASC','price-desc':'price_cents DESC',name:'name ASC',newest:'created_at DESC'}[q.sort]||'is_featured DESC,id ASC';
 const page=Math.max(1,Math.min(1000,parseInt(q.page)||1)),limit=12;
 const total=(await rows('SELECT COUNT(*) n FROM products WHERE '+where.join(' AND '),args))[0].n;
 const products=(await rows(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ${limit} OFFSET ${(page-1)*limit}`,args)).map(product);
 return {products,total,page,pages:Math.ceil(total/limit)};
}
export async function getProduct(slug){const p=await rows('SELECT * FROM products WHERE slug=? AND is_active=1',[slug]);if(!p[0])throw new HttpError(404,'Product not found.');return product(p[0]);}
