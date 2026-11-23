import {Router} from 'express';
import {auth} from '../middleware/security.js';
import {rows} from '../database/connection.js';
import {HttpError,requireValue} from '../validators.js';
import {riderDetail,deliveryAction} from '../services/delivery.js';
import {encodeProductImage,uploadDirectory} from '../services/product-images.js';
import {mkdir,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import rateLimit from 'express-rate-limit';
export const delivery=Router();
export function deliveryOnly(req,res,next){if(req.user?.role!=='delivery')return next(new HttpError(403,'Delivery access required.'));next();}
export const proofDirectory=path.join(uploadDirectory,'.delivery-proofs');
delivery.use(auth,deliveryOnly,(req,res,next)=>{res.set('Cache-Control','no-store');next();});
delivery.get('/',async(req,res)=>{const status=['assigned','out','failed','delivered'].includes(req.query.status)?req.query.status:'assigned';res.json(await rows('SELECT o.id,o.order_number,o.delivery_method,o.total_cents,d.status,d.assigned_at,d.attempts FROM delivery_assignments d JOIN orders o ON o.id=d.order_id WHERE d.rider_id=? AND d.status=? AND o.status<>? ORDER BY d.assigned_at DESC LIMIT 100',[req.user.id,status,'cancelled']));});
delivery.get('/:id',async(req,res)=>res.json(await riderDetail(req.user,req.params.id)));
for(const action of ['start','failed'])delivery.post('/:id/'+action,async(req,res)=>{await deliveryAction(req.user,req.params.id,req.body,action);res.json({ok:true});});
delivery.post('/:id/complete',rateLimit({windowMs:60000,limit:10,standardHeaders:true,legacyHeaders:false}),async(req,res,next)=>{let temp,file,committed=false;try{
 const d=await riderDetail(req.user,req.params.id);requireValue(d.delivery.status==='out','Start delivery before uploading proof.');if(!req.is('application/octet-stream'))throw new HttpError(415,'Select a JPG, PNG or WebP proof photo.');
 if(process.env.NODE_ENV==='production'&&!process.env.UPLOAD_DIR&&!process.env.RAILWAY_VOLUME_MOUNT_PATH)throw new HttpError(503,'Persistent upload storage is not configured.');
 const input={recipient:decodeURIComponent(req.get('x-recipient')||''),revision:Number(req.get('x-revision')),received:req.get('x-received')==='true'};temp=await mkdtemp(path.join(tmpdir(),'klay-proof-'));const source=path.join(temp,'original');await pipeline(req,createWriteStream(source,{flags:'wx'}));const image=await encodeProductImage(source);await mkdir(proofDirectory,{recursive:true});file=randomUUID()+'.webp';await writeFile(path.join(proofDirectory,file),image,{flag:'wx'});await deliveryAction(req.user,req.params.id,input,'complete',file);committed=true;res.json({ok:true});
 }catch(e){if(['EACCES','EROFS','ENOSPC','EDQUOT'].includes(e.code))e=new HttpError(503,'Proof storage is unavailable. Check the upload volume before retrying.');next(e);}finally{if(file&&!committed)await unlink(path.join(proofDirectory,file)).catch(()=>{});if(temp){await unlink(path.join(temp,'original')).catch(()=>{});await rmdir(temp).catch(()=>{});}}});
// Only this authenticated, ownership-checked endpoint may read the private dot-directory.
// Public /uploads keeps dotfiles denied. root plus the filename allowlist prevent traversal.
export async function serveProof(req,res){const result=(await rows('SELECT o.user_id,d.rider_id,d.proof_file FROM orders o JOIN delivery_assignments d ON d.order_id=o.id WHERE o.id=?',[req.params.id]))[0];if(!result||!(Number(result.user_id)===Number(req.user.id)||['admin','super_admin'].includes(req.user.role)||req.user.role==='delivery'&&Number(result.rider_id)===Number(req.user.id))||!result.proof_file)throw new HttpError(404,'Proof not found.');requireValue(/^[a-f0-9-]{36}\.webp$/.test(result.proof_file),'Invalid proof file.');res.set('Cache-Control','private, no-store').type('webp').sendFile(result.proof_file,{root:proofDirectory,dotfiles:'allow',cacheControl:false});}
