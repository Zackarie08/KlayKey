import session from 'express-session';
import crypto from 'node:crypto';
import {rows,json} from '../database/connection.js';
import {HttpError} from '../validators.js';
export class MySQLSessionStore extends session.Store {
 get(sid,cb){rows('SELECT data FROM sessions WHERE sid=? AND expires_at>?',[sid,Date.now()]).then(r=>cb(null,r[0]?json(r[0].data):null)).catch(cb);}
 set(sid,data,cb=()=>{}){rows('INSERT INTO sessions(sid,data,expires_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),expires_at=VALUES(expires_at)',[sid,JSON.stringify(data),Date.now()+(data.cookie?.originalMaxAge||86400000)]).then(()=>cb()).catch(cb);}
 destroy(sid,cb=()=>{}){rows('DELETE FROM sessions WHERE sid=?',[sid]).then(()=>cb()).catch(cb);}
 touch(sid,data,cb=()=>{}){rows('UPDATE sessions SET expires_at=? WHERE sid=?',[Date.now()+(data.cookie?.originalMaxAge||86400000),sid]).then(()=>cb()).catch(cb);}
}
export function csrf(req,res,next){if(!req.session.csrf)req.session.csrf=crypto.randomBytes(24).toString('hex');if(!['GET','HEAD','OPTIONS'].includes(req.method)){
 const origin=req.get('origin');if(origin&&origin!==`${req.protocol}://${req.get('host')}`)return next(new HttpError(403,'Request origin rejected.'));
 const token=req.get('x-csrf-token');if(typeof token!=='string'||token!==req.session.csrf)return next(new HttpError(403,'Your session changed. Refresh the page and try again.'));
 }next();}
export async function auth(req,res,next){try{if(!req.session.userId)throw new HttpError(401,'Please sign in to continue.');const u=await rows('SELECT id,first_name,last_name,email,phone,address,role FROM users WHERE id=? AND is_active=1',[req.session.userId]);if(!u[0])throw new HttpError(401,'Please sign in again.');req.user={...u[0],address:json(u[0].address)};next();}catch(e){next(e);}}
