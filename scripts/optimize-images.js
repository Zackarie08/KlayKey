import sharp from 'sharp';
import fs from 'node:fs/promises';
import {root} from '../server/config.js';
await fs.mkdir(root+'/public/assets/images',{recursive:true});
for(const layout of ['60','75','100']){const output=root+`/public/assets/images/keyboard_${layout}.webp`;await sharp(root+`/keyboard-3d/previews/keyboard_${layout}.png`).resize({width:1200,withoutEnlargement:true}).webp({quality:82}).toFile(output);console.log(layout+': '+(await fs.stat(output)).size+' bytes');}
