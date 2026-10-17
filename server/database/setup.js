import {migrate,seed} from './migrate.js';
import {pool,rows} from './connection.js';
import {config,root} from '../config.js';
import {categories,catalog} from './seeds/catalog.js';
const action=process.argv[2];
try{
 if(action==='reset'){
  if(config.production||!config.db.database.endsWith('_dev')||!process.argv.includes('--confirm-development-reset'))throw Error('Reset requires a *_dev database, development mode, and --confirm-development-reset.');
  const db=await pool.getConnection();try{await db.query('SET FOREIGN_KEY_CHECKS=0');for(const name of ['schema_migrations','sessions','contact_messages','payments','order_items','orders','cart_items','carts','custom_builds','products','product_categories','users'])await db.query(`DROP TABLE IF EXISTS ${name}`);}finally{await db.query('SET FOREIGN_KEY_CHECKS=1');db.release();}
 }
 if(['migrate','setup','reset'].includes(action))await migrate();
 if(['seed','setup'].includes(action))await seed();
 if(!['migrate','seed','setup','reset'].includes(action))throw Error('Use migrate, seed, setup or reset.');
}catch(e){console.error('Database setup failed:',config.production?'Check database availability and migrations.':e.message);process.exitCode=1;}finally{await pool.end();}
