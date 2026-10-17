import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const production=process.env.NODE_ENV==='production';
const databaseURL=process.env.DATABASE_URL?new URL(process.env.DATABASE_URL):null;
export const config={appName:process.env.APP_NAME||'KlayKey',port:Number(process.env.PORT||3000),production,secret:process.env.SESSION_SECRET,
 cookieName:process.env.SESSION_COOKIE_NAME||'klaykey.sid',sessionMaxAge:Number(process.env.SESSION_MAX_AGE||86400000),trustProxy:process.env.TRUST_PROXY==='1'?1:false,seedOnStart:process.env.SEED_ON_START==='true',
 db:{host:databaseURL?.hostname||process.env.DB_HOST||'127.0.0.1',port:Number(databaseURL?.port||process.env.DB_PORT||3306),user:databaseURL?decodeURIComponent(databaseURL.username):process.env.DB_USER||'klaykeys',password:databaseURL?decodeURIComponent(databaseURL.password):process.env.DB_PASSWORD||'',database:databaseURL?decodeURIComponent(databaseURL.pathname.slice(1)):process.env.DB_NAME||'klaykeys_dev',decimalNumbers:true,connectionLimit:8,charset:'utf8mb4',connectTimeout:10000}};
if(!Number.isFinite(config.sessionMaxAge)||config.sessionMaxAge<60000)throw Error('SESSION_MAX_AGE must be at least 60000 milliseconds.');
if(production&&!databaseURL)throw Error('Production requires DATABASE_URL for the dedicated database.');
