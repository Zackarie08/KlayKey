import test from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../server/config.js';
import {pool,rows} from '../server/database/connection.js';
import {migrate} from '../server/database/migrate.js';
import {createApp} from '../server/app.js';
if(config.production||!config.db.database.endsWith('_dev'))throw Error('Tests require a *_dev database.');
test('Production proxy, health, migrations and password rules',async()=>{
 await migrate();const before=await rows('SELECT * FROM schema_migrations');await migrate();assert.deepEqual(await rows('SELECT * FROM schema_migrations'),before);
 const saved={...config};config.production=true;config.trustProxy=1;config.appName='Rename <test>';
 const app=createApp(),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const route of ['/api/health','/api/health/ready']){const r=await fetch(base+route);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);}
  const page=await fetch(base+'/');assert.match(await page.text(),/Rename &lt;test&gt;/);assert.equal(page.headers.get('cache-control'),'no-store');
  const session=await fetch(base+'/api/auth/session',{headers:{'x-forwarded-proto':'https'}});const cookie=session.headers.get('set-cookie');assert.match(cookie,/Secure/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);const data=await session.json();assert.equal(data.brand,'Rename <test>');
  const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'x-forwarded-proto':'https','content-type':'application/json','x-csrf-token':data.csrf,cookie:cookie.split(';')[0]},body:JSON.stringify({first_name:'Test',last_name:'Only',email:'weak@example.test',password:'aaaaaaaaaaaa',confirm_password:'aaaaaaaaaaaa',agree:true})});assert.equal(r.status,400);
  const guest=await fetch(base+'/builder',{redirect:'manual'});assert.equal(guest.status,302);assert.match(guest.headers.get('location'),/^\/login\?returnTo=/);
 }finally{Object.assign(config,saved);server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
});
