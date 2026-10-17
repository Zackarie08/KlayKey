// Optional isolated development MySQL. Never modifies the installed MySQL service.
import fs from 'node:fs/promises';
import {openSync} from 'node:fs';
import path from 'node:path';
import {spawn,execFile} from 'node:child_process';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import {root} from '../server/config.js';
const dir=path.join(root,'.local-mysql'),data=path.join(dir,'data'),exe=process.env.MYSQLD_PATH||'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe',port=3308;
await fs.mkdir(dir,{recursive:true});
const initialized=await fs.stat(data+'/mysql').then(()=>true,()=>false);
if(!initialized){await fs.mkdir(data,{recursive:true});await new Promise((resolve,reject)=>execFile(exe,['--no-defaults','--initialize-insecure','--datadir='+data],{windowsHide:true},(e)=>e?reject(e):resolve()));}
let secrets=await fs.readFile(dir+'/credentials.json','utf8').then(JSON.parse,()=>null);
const connect=()=>mysql.createConnection({host:'127.0.0.1',port,user:'root',password:secrets?.root||'',connectTimeout:2000});
const retryConnection=error=>{if(['ECONNREFUSED','ETIMEDOUT'].includes(error.code))return null;throw error;};
let db=await connect().catch(retryConnection);
if(!db){const log=openSync(dir+'/mysql.log','a');const child=spawn(exe,['--no-defaults','--datadir='+data,'--bind-address=127.0.0.1','--port='+port,'--mysqlx=0','--log-error='+dir+'/error.log'],{windowsHide:true,detached:true,stdio:['ignore',log,log]});child.unref();for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,500));db=await connect().catch(()=>null);if(db)break;}if(!db)throw Error('Local MySQL did not start. See .local-mysql/error.log.');}
if(!secrets){secrets={root:crypto.randomBytes(32).toString('hex'),app:crypto.randomBytes(32).toString('hex'),session:crypto.randomBytes(40).toString('hex')};await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[secrets.root]);await fs.writeFile(dir+'/credentials.json',JSON.stringify(secrets),{mode:0o600});}
await db.query('CREATE DATABASE IF NOT EXISTS klaykeys_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
await db.query("CREATE USER IF NOT EXISTS 'klaykeys'@'127.0.0.1' IDENTIFIED BY ?",[secrets.app]);await db.query("GRANT ALL PRIVILEGES ON klaykeys_dev.* TO 'klaykeys'@'127.0.0.1'");
const hasEnvironment=await fs.stat(root+'/.env').then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
if(!hasEnvironment){try{await fs.writeFile(root+'/.env',`NODE_ENV=development\nPORT=3000\nDB_HOST=127.0.0.1\nDB_PORT=${port}\nDB_USER=klaykeys\nDB_PASSWORD=${secrets.app}\nDB_NAME=klaykeys_dev\nSESSION_SECRET=${secrets.session}\n`,{flag:'wx',mode:0o600});console.log('Created ignored .env for isolated development MySQL.');}catch(e){if(e.code!=='EEXIST')throw e;}}
await db.end();console.log('Isolated development MySQL ready on 127.0.0.1:3308. Existing MySQL service unchanged.');
