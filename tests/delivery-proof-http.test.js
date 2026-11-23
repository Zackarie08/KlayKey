import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import sharp from 'sharp';
import {mkdtemp,mkdir,writeFile,unlink,rmdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';

test('Private proof images are readable by authorized users but never through public uploads',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'klay-proof-http-')),old=process.env.UPLOAD_DIR;process.env.UPLOAD_DIR=directory;
 const {pool}=await import('../server/database/connection.js');const {serveProof,proofDirectory}=await import('../server/routes/delivery.js');
 const filename='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp';const file=path.join(proofDirectory,filename);
 t.mock.method(pool,'execute',async()=>[[{user_id:4,rider_id:7,proof_file:filename}]]);
 const app=express();app.get('/proof',async(req,res)=>{req.user={id:Number(req.get('x-user')),role:req.get('x-role')||'customer'};req.params.id=1;await serveProof(req,res);});app.use('/uploads',express.static(directory,{dotfiles:'deny'}));app.use((e,req,res,next)=>{res.status(e.status||500).json({error:e.message});});
 await mkdir(proofDirectory,{recursive:true});const image=await sharp({create:{width:12,height:12,channels:3,background:'#2f6544'}}).webp().toBuffer();await writeFile(file,image);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const [id,role] of [[4,'customer'],[7,'delivery'],[9,'admin'],[9,'super_admin']]){const response=await fetch(base+'/proof',{headers:{'x-user':String(id),'x-role':role}}).catch(e=>{throw new Error(e.cause?.message||e.message);});assert.equal(response.status,200,'authorized '+role+' must receive the actual image bytes');assert.match(response.headers.get('content-type'),/image\/webp/);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await response.arrayBuffer()),image);}
  for(const [id,role] of [[8,'customer'],[8,'delivery'],[7,'customer']])assert.equal((await fetch(base+'/proof',{headers:{'x-user':String(id),'x-role':role}})).status,404);
  assert.equal((await fetch(base+'/uploads/.delivery-proofs/'+filename)).status,404);
  await unlink(file);assert.equal((await fetch(base+'/proof',{headers:{'x-user':'4'}})).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await unlink(file).catch(()=>{});await rmdir(proofDirectory);await rmdir(directory);if(old===undefined)delete process.env.UPLOAD_DIR;else process.env.UPLOAD_DIR=old;}
});
