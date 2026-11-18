import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import sharp from 'sharp';

test('Upload handler streams a real image larger than 5 MB and stores a readable WebP',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'klaykey-photo-test-'));
 const previous=process.env.UPLOAD_DIR;process.env.UPLOAD_DIR=directory;
 const {receiveProductImage}=await import('../server/services/product-images.js?handler-test');
 let saved;
 const send=async buffer=>{
  const req=Readable.from([buffer]);req.is=type=>type==='application/octet-stream';
  const result={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
  await receiveProductImage(req,result);
  return result;
 };
 try{
  const source=await sharp(randomBytes(1600*1200*3),{raw:{width:1600,height:1200,channels:3}}).png({compressionLevel:0}).toBuffer();
  assert.ok(source.length>5*1024*1024);
  const response=await send(source);
  assert.equal(response.statusCode,201,JSON.stringify(response.data));saved=path.join(directory,path.basename(response.data.url));
  const metadata=await sharp(await readFile(saved)).metadata();assert.equal(metadata.format,'webp');
  const invalid=await send(Buffer.from('invalid'));assert.equal(invalid.statusCode,400);assert.match(invalid.data.error,/could not be processed/);
 }finally{if(saved)await unlink(saved);await rmdir(directory);if(previous===undefined)delete process.env.UPLOAD_DIR;else process.env.UPLOAD_DIR=previous;}
});
test('Missing production storage returns an actionable error instead of a generic 500',async()=>{
 const previous={NODE_ENV:process.env.NODE_ENV,UPLOAD_DIR:process.env.UPLOAD_DIR,RAILWAY_VOLUME_MOUNT_PATH:process.env.RAILWAY_VOLUME_MOUNT_PATH};
 process.env.NODE_ENV='production';delete process.env.UPLOAD_DIR;delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
 try{
  const {receiveProductImage}=await import('../server/services/product-images.js?missing-storage-test');
  const req=Readable.from([Buffer.from('test')]);req.is=()=>true;
  const res={status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await receiveProductImage(req,res);assert.equal(res.code,503);assert.match(res.data.error,/Attach a volume/);
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
