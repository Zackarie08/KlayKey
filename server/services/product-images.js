import sharp from 'sharp';
import path from 'node:path';
import {mkdir,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {pipeline} from 'node:stream/promises';
import {randomUUID} from 'node:crypto';
import {root} from '../config.js';
import {HttpError} from '../validators.js';
const persistentDirectory=process.env.UPLOAD_DIR||(process.env.RAILWAY_VOLUME_MOUNT_PATH?path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH,'product-images'):null);
export const uploadDirectory=path.resolve(persistentDirectory||path.join(root,'uploads'));
export async function encodeProductImage(source){
 if(Buffer.isBuffer(source)&&!source.length)throw new HttpError(400,'Choose an image file.');
 try{
  const image=sharp(source,{limitInputPixels:false,animated:false});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error('Unsupported image');
  return await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 }catch{throw new HttpError(400,'This image could not be processed. Choose a non-animated JPG, PNG or WebP file.');}
}
export async function saveProductImage(source){
 if(process.env.NODE_ENV==='production'&&!persistentDirectory)throw new HttpError(503,'Upload storage is not configured. Attach a volume to the web app service and set UPLOAD_DIR to its product-images folder.');
 const image=await encodeProductImage(source),name=randomUUID()+'.webp';
 await mkdir(uploadDirectory,{recursive:true});
 await writeFile(path.join(uploadDirectory,name),image,{flag:'wx'});
 return '/uploads/'+name;
}
// Stream originals to temporary disk without buffering the complete request.
export async function receiveProductImage(req,res,next){
 let directory;
 try{
  if(!req.is('application/octet-stream'))throw new HttpError(415,'Choose an image using the product photo picker.');
  directory=await mkdtemp(path.join(tmpdir(),'klaykey-upload-'));
  const source=path.join(directory,'original');
  await pipeline(req,createWriteStream(source,{flags:'wx'}));
  const url=await saveProductImage(source);
  res.status(201).json({url});
 }catch(error){
  const status=error.status||500;
  const message=error.status?error.message:['ENOSPC','EDQUOT'].includes(error.code)?'Image storage is full. Free space on the upload volume and retry.':['EACCES','EROFS'].includes(error.code)?'Image storage is not writable. Check the web app upload volume.':'Image upload failed. Please retry.';
  if(!req.aborted&&!res.headersSent)res.status(status).json({error:message});
 }finally{
  if(directory){await unlink(path.join(directory,'original')).catch(()=>{});await rmdir(directory).catch(()=>{});}
 }
}
