import sharp from 'sharp';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {root} from '../config.js';
import {HttpError} from '../validators.js';
export const uploadDirectory=path.resolve(process.env.UPLOAD_DIR||path.join(root,'uploads'));
export async function encodeProductImage(buffer){
 if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>5*1024*1024)throw new HttpError(400,'Choose an image up to 5 MB.');
 try{
  const image=sharp(buffer,{limitInputPixels:25000000,animated:false});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error('Unsupported image');
  return await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 }catch{throw new HttpError(400,'Use a valid, non-animated JPG, PNG or WebP image (maximum 25 megapixels).');}
}
export async function saveProductImage(buffer){
 if(process.env.NODE_ENV==='production'&&!process.env.UPLOAD_DIR)throw new HttpError(503,'Image storage is not configured. Set UPLOAD_DIR to a persistent volume folder.');
 const image=await encodeProductImage(buffer),name=randomUUID()+'.webp';
 await mkdir(uploadDirectory,{recursive:true});
 await writeFile(path.join(uploadDirectory,name),image,{flag:'wx'});
 return '/uploads/'+name;
}
