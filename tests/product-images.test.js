import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {encodeProductImage} from '../server/services/product-images.js';
test('Product uploads normalize real images to bounded WebP',async()=>{
 const source=await sharp({create:{width:2000,height:1000,channels:3,background:'#aabbcc'}}).png().toBuffer();
 const result=await encodeProductImage(source),meta=await sharp(result).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,1800);assert.equal(meta.height,900);assert.equal(meta.exif,undefined);
});
test('Product uploads reject empty, malformed and SVG files',async()=>{
 for(const buffer of [Buffer.alloc(0),Buffer.from('not an image'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')])await assert.rejects(encodeProductImage(buffer),e=>e.status===400);
});
