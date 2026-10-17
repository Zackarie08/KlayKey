import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {pool,rows} from './connection.js';
import {root} from '../config.js';
import {categories,catalog} from './seeds/catalog.js';
export async function migrate(){
 const db=await pool.getConnection();
 try{
  const [lock]=await db.query("SELECT GET_LOCK('klaykey_schema_migrations',60) acquired");
  if(lock[0].acquired!==1)throw Error('Migration lock unavailable.');
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  const files=(await fs.readdir(root+'/server/database/migrations')).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
  for(const file of files){
   const sql=await fs.readFile(root+'/server/database/migrations/'+file,'utf8');
   const hash=crypto.createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
   const applied=await rows('SELECT checksum FROM schema_migrations WHERE version=?',[file],db);
   if(applied.length){if(applied[0].checksum!==hash)throw Error('Applied migration checksum changed: '+file);continue;}
   // Guarded DDL can resume after failure; MySQL DDL implicitly commits.
   for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
   await rows('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)',[file,hash],db);
   console.log('Applied migration:',file);
  }
 }finally{await db.query("SELECT RELEASE_LOCK('klaykey_schema_migrations')").catch(()=>{});db.release();}
}
export async function seed(){
 for(const c of categories)await rows('INSERT IGNORE INTO product_categories(id,name) VALUES(?,?)',c);
 for(const p of await catalog())await rows('INSERT IGNORE INTO products(slug,sku,name,category_id,description,short_description,price_cents,stock_quantity,layout,switch_type,connection_type,material,is_featured,images,compatibility,option_field,option_value) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[p.slug,'KK-'+p.slug.toUpperCase(),p.name,p.category,p.description,p.short,p.price,p.stock,p.layout||null,p.switch_type||null,p.connection_type||null,p.material||'',!!p.featured,JSON.stringify(p.images),JSON.stringify(p.compatibility),p.option_field||null,p.option_value||null]);
 console.log('Catalog seed complete; existing prices, inventory and customer data preserved.');
}
